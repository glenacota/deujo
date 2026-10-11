// katas/help-kit.js
// Pure markup helpers for the help modals. Prose is escaped here; only a `rule` pattern is trusted HTML.

import { escapeHtml } from '../services/escape-html.js';

const CODE_CLASS = 'bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono';

export const code = (value) => `<code class="${CODE_CLASS}">${escapeHtml(value)}</code>`;

export function banner(headline, body) {
    return `
        <div class="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 font-medium text-indigo-900 dark:text-indigo-200">
            <strong class="text-indigo-600 dark:text-indigo-400">${escapeHtml(headline)}</strong>. ${escapeHtml(body)}
        </div>`;
}

// Native `<details>`; the first block opens by default so a closed first block doesn't read as empty help.
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

// `patternHtml` is trusted markup (may embed `code()`): module literals only, never dataset text.
export function rule(patternHtml, forms) {
    return `
        <li class="px-1 py-1.5">
            <span class="block text-slate-700 dark:text-slate-300">${patternHtml}</span>
            <span class="block font-mono text-xs text-slate-500 dark:text-slate-400">${escapeHtml(forms)}</span>
        </li>`;
}

export function ruleList(rules, { ordered = false } = {}) {
    const tag = ordered ? 'ol' : 'ul';
    const listClass = ordered ? 'space-y-1 list-decimal pl-4' : 'space-y-1';
    return `<${tag} class="${listClass}">${rules.join('')}</${tag}>`;
}

export function wordGroup(labelHtml, words) {
    return `
        <li class="px-1 py-1.5">
            <span class="block text-slate-700 dark:text-slate-300">${labelHtml}</span>
            <span class="block font-mono text-xs text-slate-500 dark:text-slate-400">${escapeHtml(words)}</span>
        </li>`;
}
