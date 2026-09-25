// kata/cases.js
// Self-contained case-declension kata: fill-in-the-blank sentences with inline inputs.

import { escapeHtml } from '../../services/utility.js';
import { CASE_LABELS, DEFINITE, INDEFINITE, PLURAL_DEFINITE } from '../../services/grammar.js';
import { casesManifest } from './manifest.js';

const byId = (id) => document.getElementById(id);

const VALID_CASES = ['nom', 'akk', 'dat', 'gen'];
const VALID_GENDERS = ['der', 'die', 'das'];
const VALID_ARTICLE_TYPES = ['def', 'indef'];

export function validateCaseDataset(dataset) {
    if (!Array.isArray(dataset) || dataset.length === 0) {
        throw new Error('dataset must be a non-empty array');
    }

    dataset.forEach((item, index) => {
        const validBlanks = Array.isArray(item?.b) && item.b.length > 0 && item.b.every((blank) =>
            VALID_CASES.includes(blank?.c) &&
            VALID_GENDERS.includes(blank?.g) &&
            ['sg', 'pl'].includes(blank?.n) &&
            VALID_ARTICLE_TYPES.includes(blank?.a)
        );
        const placeholderCount = typeof item?.s === 'string'
            ? (item.s.match(/\{\d+\}/g) ?? []).length
            : 0;

        if (
            !item ||
            typeof item.w !== 'string' ||
            !item.w.trim() ||
            typeof item.s !== 'string' ||
            !item.s.trim() ||
            typeof item.m !== 'string' ||
            !item.m.trim() ||
            !validBlanks ||
            placeholderCount !== item.b.length
        ) {
            throw new Error(`entry ${index} has invalid sentence, translation, or blank definitions`);
        }
    });
}

function resolveArticle(blank) {
    if (blank.n === 'pl') return PLURAL_DEFINITE[blank.c];
    const table = blank.a === 'indef' ? INDEFINITE : DEFINITE;
    return table[blank.g][blank.c];
}

function renderHelpTable(table, title) {
    const genders = ['der', 'die', 'das'];
    return `
        <h4 class="font-bold text-slate-900 dark:text-white mb-1">${escapeHtml(title)}</h4>
        <table class="w-full text-left text-xs lg:text-sm border-collapse mb-4">
            <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    <th class="py-2 px-3">Fall</th>
                    ${genders.map((g) => `<th class="py-2 px-3">${escapeHtml(g)}</th>`).join('')}
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                ${Object.keys(CASE_LABELS).map((c) => `
                    <tr>
                        <td class="py-2 px-3 font-bold">${escapeHtml(CASE_LABELS[c])}</td>
                        ${genders.map((g) => `<td class="py-2 px-3">${escapeHtml(table[g][c])}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

export function createCaseKata() {
    const el = {
        kata: null,
        section: null,
        cardBelt: null,
        sentence: null,
        translation: null,
    };
    let inputs = [];

    return {
        ...casesManifest,
        validateDataset: validateCaseDataset,
        el,

        getHelpContent() {
            return `
                ${renderHelpTable(DEFINITE, 'Definite Articles')}
                ${renderHelpTable(INDEFINITE, 'Indefinite Articles')}
                <h4 class="font-bold text-slate-900 dark:text-white mb-1">Plural (Definite)</h4>
                <table class="w-full text-left text-xs lg:text-sm border-collapse">
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                        ${Object.keys(CASE_LABELS).map((c) => `
                            <tr>
                                <td class="py-2 px-3 font-bold">${escapeHtml(CASE_LABELS[c])}</td>
                                <td class="py-2 px-3">${escapeHtml(PLURAL_DEFINITE[c])}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        },

        mount() {
            if (el.kata) return;

            const template = byId('caseSectionTemplate');
            const container = byId('caseSections');
            const fragment = template.content.cloneNode(true);
            const section = fragment.querySelector('[data-role="section"]');
            container.appendChild(fragment);

            el.kata = byId('kata-cases');
            el.section = section;
            el.cardBelt = byId('belt-cases');
            el.sentence = section.querySelector('[data-role="sentence"]');
            el.translation = section.querySelector('[data-role="translation"]');
        },

        render(item) {
            el.sentence.textContent = '';
            el.translation.textContent = item.m ? `🇬🇧 ${item.m}` : '';

            const fragment = document.createDocumentFragment();
            inputs = [];
            const parts = item.s.split(/\{(\d+)\}/g);
            parts.forEach((part, i) => {
                if (i % 2 === 0) {
                    if (part) fragment.appendChild(document.createTextNode(part));
                    return;
                }
                const input = document.createElement('input');
                input.type = 'text';
                input.autocomplete = 'off';
                input.spellcheck = false;
                input.dataset.index = part;
                input.size = 6;
                input.className = 'lg:w-20 w-15 case-blank-input inline-block text-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg lg:px-3 px-2 py-1 lg:py-1.5 lg:text-xl text-base text-indigo-700 dark:text-indigo-300 focus:outline-none focus:border-purple-500 lg:leading-[2rem] leading-[1.5rem]';
                inputs.push(input);
                fragment.appendChild(input);
            });

            el.sentence.appendChild(fragment);
        },

        check(item) {
            const targets = item.b.map(resolveArticle);
            if (!inputs.length) return null;

            const correct =
                inputs.length === targets.length &&
                inputs.every((input, i) => input.value.trim().toLowerCase() === targets[i].toLowerCase());

            const message = correct
                ? 'Excellent! Correct declension!'
                : 'Correct answer: '
                    + targets.map((t, i) => `<strong>${escapeHtml(t)}</strong> (${escapeHtml(CASE_LABELS[item.b[i].case])})`).join(', ')
                    + '.';

            return { correct, message };
        },
    };
}
