// katas/cases/kata.js
// Self-contained case-declension kata: fill-in-the-blank sentences with inline inputs.

import { escapeHtml, createSectionFromTemplate } from '../../services/utility.js';
import { markControl } from '../../ui/answer-view.js';
import { CASE_LABELS, DEFINITE, hasOrderedBlankPlaceholders, INDEFINITE, PLURAL_DEFINITE } from '../../services/grammar.js';
import { formatAccepted, matchAnswer } from '../../services/answer-matcher.js';
import { renderBlankSentence } from '../../services/blank-renderer.js';
import { assertDataset, hasCoreFields, hasValidBlanks } from '../dataset-rules.js';
import { casesManifest } from './manifest.js';
import { casesTemplate } from './template.js';

const VALID_CASE_NAMES = Object.keys(CASE_LABELS);

export function validateCaseDataset(dataset) {
    assertDataset(dataset);

    dataset.forEach((item, index) => {
        const ok = hasCoreFields(item, { sentence: true })
            && hasValidBlanks(item?.b, (blank) => VALID_CASE_NAMES.includes(blank?.c))
            && hasOrderedBlankPlaceholders(item?.s, item?.b?.length);

        if (!ok) {
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

/** Mounts the case kata's section, so `el` is populated for the caller. */
export function createCaseKata(container) {
    let inputs = [];

    const section = createSectionFromTemplate(casesTemplate);
    container.appendChild(section);

    const el = {
        section,
        sentence: section.querySelector('[data-role="sentence"]'),
        translation: section.querySelector('[data-role="translation"]'),
    };

    return {
        ...casesManifest,
        validateDataset: validateCaseDataset,
        el,

        getHelpContent() {
            return renderHelpMatrix();
        },

        render(item) {
            inputs = renderBlankSentence(el, item, () => {
                const input = document.createElement('input');
                input.type = 'text';
                input.autocomplete = 'off';
                input.maxLength = '20'
                input.spellcheck = false;
                input.autocapitalize = 'none';
                input.autocorrect = 'off';
                input.lang = 'de';
                input.size = 6;
                input.className = 'blank-input blank-input--inline blank-input--narrow';
                return input;
            });
        },

        check(item) {
            if (!inputs.length || inputs.some((input) => !input.value.trim())) {
                return { warning: 'Please fill in all blanks before checking.' };
            }

            const fields = inputs.map((input, i) => {
                const given = input.value.trim();
                // The learner may type the article with the noun that follows it
                // ("der Mann"), which is the same answer, not a different one.
                const { ok, accepted } = matchAnswer(given, item.b[i], { allowExtraWords: true });
                // The dataset spelling, not the whole answer object, goes on show.
                const expected = accepted[0] ?? item.b[i].a;
                markControl(input, { ok, expected, note: ok ? null : formatAccepted(accepted) });
                return { ok };
            });

            return {
                correct: fields.every((f) => f.ok),
                fields,
            };
        },
    };
}
