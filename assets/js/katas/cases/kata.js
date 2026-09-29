// katas/cases/kata.js
// Self-contained case-declension kata: fill-in-the-blank sentences with inline inputs.

import { escapeHtml, createSectionFromTemplate } from '../../services/utility.js';
import { CASE_LABELS, DEFINITE, INDEFINITE, PLURAL_DEFINITE } from '../../services/grammar.js';
import { casesManifest } from './manifest.js';
import { casesTemplate } from './template.js';

const VALID_CASE_NAMES = Object.keys(CASE_LABELS);

export function validateCaseDataset(dataset) {
    if (!Array.isArray(dataset) || dataset.length === 0) {
        throw new Error('dataset must be a non-empty array');
    }

    dataset.forEach((item, index) => {
        const validBlanks = Array.isArray(item?.b) && item.b.length > 0 && item.b.every((blank) =>
            typeof blank?.a === 'string' &&
            blank.a.trim() &&
            VALID_CASE_NAMES.includes(blank.c)
        );
        const placeholderCount = typeof item?.s === 'string'
            ? (item.s.match(/\{\d+\}/g) ?? []).length
            : 0;

        if (
            !item ||
            typeof item.id !== 'string' ||
            !item.id.trim() ||
            typeof item.w !== 'string' ||
            !item.w.trim() ||
            typeof item.s !== 'string' ||
            !item.s.trim() ||
            typeof item.m !== 'string' ||
            !item.m.trim() ||
            !validBlanks ||
            placeholderCount !== item.b.length
        ) {
            throw new Error(`entry ${index} has invalid sentence, translation, or blank answers`);
        }
    });
}

function renderHelpMatrix() {
    const rows = [
        { label: 'Masculine', gender: 'der' },
        { label: 'Feminine', gender: 'die' },
        { label: 'Neuter', gender: 'das' },
        { label: 'Plural', gender: null },
    ];
    const cases = Object.keys(CASE_LABELS);
    return `
        <div class="overflow-x-auto">
            <table class="w-full min-w-[34rem] border-collapse text-left text-sm">
                <thead>
                    <tr class="border-b border-slate-200 text-xs font-bold uppercase text-purple-600 dark:border-slate-800 dark:text-purple-400">
                        <th class="px-3 py-2"></th>
                        ${cases.map((c) => `<th class="px-3 py-2">${escapeHtml(CASE_LABELS[c])}</th>`).join('')}
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-mono dark:divide-slate-800/60">
                    ${rows.map(({ label, gender }) => `
                        <tr>
                            <th scope="row" class="px-3 py-2 font-sans font-bold">${escapeHtml(label)}</th>
                            ${cases.map((c) => `
                                <td class="whitespace-nowrap px-3 py-2">
                                    ${gender
                                        ? `${escapeHtml(DEFINITE[gender][c])} / ${escapeHtml(INDEFINITE[gender][c])}`
                                        : `${escapeHtml(PLURAL_DEFINITE[c])} / —`}
                                </td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">Definite / indefinite. — = no plural indefinite article.</p>
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
            return renderHelpMatrix();
        },

        mount(container) {
            if (el.section) return;

            const section = createSectionFromTemplate(casesTemplate);
            container.appendChild(section);

            el.section = section;
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
                input.maxLength = '20'
                input.spellcheck = false;
                input.autocapitalize = 'none';
                input.autocorrect = 'off';
                input.lang = 'de';
                input.dataset.index = part;
                input.size = 6;
                input.className = 'lg:w-24 w-20 case-blank-input inline-block text-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg lg:px-3 px-2 py-1 lg:py-1.5 lg:text-xl text-base text-indigo-700 dark:text-indigo-300 focus:outline-none focus:border-purple-500 lg:leading-[2rem] leading-[1.5rem]';
                inputs.push(input);
                fragment.appendChild(input);
            });

            inputs.forEach((input, i) => {
                input.setAttribute('enterkeyhint', i === inputs.length - 1 ? 'done' : 'next');
                input.setAttribute('aria-label', `Blank ${i + 1} of ${inputs.length}`);
            });

            el.sentence.appendChild(fragment);
        },

        check(item) {
            const targets = item.b.map((blank) => blank.a);
            if (!inputs.length) return null;

            if (inputs.some((input) => !input.value.trim())) {
                return { warning: 'Please fill in all blanks before checking.' };
            }

            const fields = inputs.map((input, i) => {
                const given = input.value.trim();
                const expected = targets[i];
                const ok = given.toLowerCase() === expected.toLowerCase();
                input.setAttribute('aria-invalid', String(!ok));
                input.classList.toggle('border-rose-500', !ok);
                input.classList.toggle('border-emerald-500', ok);
                return { label: `#${i + 1}`, expected, given, ok };
            });

            const correct = fields.every((f) => f.ok);
            const message = (correct
                ? 'Excellent! Correct declension.'
                : 'Not quite. Review the blanks below.')
                + `<br/><br/><span class="text-xs italic">Full sentence: "${escapeHtml(item.w)}"</span>.`;

            return { correct, message, fields };
        },
    };
}
