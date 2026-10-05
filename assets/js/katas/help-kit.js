// katas/help-kit.js
// Markup helpers shared by the kata help modals. Pure string work: no DOM, no
// state, so a kata's help body stays unit-testable and `showHelpContent` keeps
// receiving HTML that is escaped before it gets here.
//
// Every helper takes prose as plain text and escapes it. The one exception is a
// `rule` pattern, which is a module literal and may embed `code()` calls.

import { escapeHtml } from '../services/escape-html.js';

const CODE_CLASS = 'bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono';

/** A German word, ending or ending-group, inlined into a sentence. */
export const code = (value) => `<code class="${CODE_CLASS}">${escapeHtml(value)}</code>`;

/**
 * The warning that opens every kata's help: the mistake a learner is about to
 * make. Plain text on both sides, so the copy cannot smuggle markup.
 */
export function banner(headline, body) {
    return `
        <div class="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 font-medium text-indigo-900 dark:text-indigo-200">
            <strong class="text-indigo-600 dark:text-indigo-400">${escapeHtml(headline)}</strong>. ${escapeHtml(body)}
        </div>`;
}

/**
 * A collapsible block, so a phone opens one idea at a time instead of scrolling
 * a wall. Native `<details>`: no JS, no focus juggling, keyboard reachable. The
 * first block of a help opens by default, since on a phone a closed first block
 * reads as "this help is empty".
 */
export function disclosure(title, bodyHtml, { open = false } = {}) {
    return `
        <details class="group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60"${open ? ' open' : ''}>
            <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
                <span>${escapeHtml(title)}</span>
                <span class="shrink-0 text-slate-400 transition-transform group-open:rotate-90" aria-hidden="true">›</span>
            </summary>
            <div class="px-4 pb-4 space-y-2 text-sm">${bodyHtml}</div>
        </details>`;
}

/**
 * One rule: the pattern in prose, the forms it produces underneath. `patternHtml`
 * is markup by design, so a caller may wrap an ending in `code()`; it must come
 * from module literals, never from a dataset. `forms` is plain text and escaped.
 */
export function rule(patternHtml, forms) {
    return `
        <li class="px-1 py-1.5">
            <span class="block text-slate-700 dark:text-slate-300">${patternHtml}</span>
            <span class="block font-mono text-xs text-slate-500 dark:text-slate-400">${escapeHtml(forms)}</span>
        </li>`;
}

/** Rules, or numbered steps when their order is part of the rule. */
export function ruleList(rules, { ordered = false } = {}) {
    const tag = ordered ? 'ol' : 'ul';
    const listClass = ordered ? 'space-y-1 list-decimal pl-4' : 'space-y-1';
    return `<${tag} class="${listClass}">${rules.join('')}</${tag}>`;
}

/** A labelled list of German words, for the verb groups and the noun exceptions. */
export function wordGroup(labelHtml, words) {
    return `
        <li class="px-1 py-1.5">
            <span class="block text-slate-700 dark:text-slate-300">${labelHtml}</span>
            <span class="block font-mono text-xs text-slate-500 dark:text-slate-400">${escapeHtml(words)}</span>
        </li>`;
}
