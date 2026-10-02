// katas/verbs/kata.js
// Self-contained verb-conjugation kata.

import { escapeHtml, createSectionFromTemplate } from '../../services/utility.js';
import { acceptedAnswers, matchAnswer } from '../../services/answer-matcher.js';
import { markControl } from '../../ui/answer-view.js';
import { PERSONS, TENSES } from '../../services/grammar.js';
import { getVerbManifest } from './manifest.js';
import { verbsTemplate } from './template.js';

// Tense-neutral placeholders (from "gehen"), one per person, so the hint never leaks the current verb's answer.
const TENSE_PLACEHOLDERS = {
    pres: ['e.g. gehe', 'e.g. gehst', 'e.g. geht', 'e.g. gehen', 'e.g. geht', 'e.g. gehen'],
    praet: ['e.g. ging', 'e.g. gingst', 'e.g. ging', 'e.g. gingen', 'e.g. gingt', 'e.g. gingen'],
    perf: ['e.g. bin gegangen', 'e.g. bist gegangen', 'e.g. ist gegangen', 'e.g. sind gegangen', 'e.g. seid gegangen', 'e.g. sind gegangen'],
};

/** A conjugated form is a string, or `{a, alt}` when two spellings are correct. */
function isUsableForm(form) {
    if (typeof form === 'string') return Boolean(form.trim());
    if (!form || typeof form !== 'object' || typeof form.a !== 'string' || !form.a.trim()) return false;
    return form.alt === undefined
        || (Array.isArray(form.alt) && form.alt.every((alt) => typeof alt === 'string' && alt.trim()));
}

export function validateVerbDataset(dataset) {
    if (!Array.isArray(dataset) || dataset.length === 0) {
        throw new Error('dataset must be a non-empty array');
    }

    dataset.forEach((verb, index) => {
        const validTenses = Object.keys(TENSES).every((tense) =>
            Array.isArray(verb?.[tense]) &&
            verb[tense].length === PERSONS.length &&
            verb[tense].every(isUsableForm)
        );
        if (
            !verb ||
            typeof verb.id !== 'string' ||
            !verb.id.trim() ||
            typeof verb.w !== 'string' ||
            !verb.w.trim() ||
            typeof verb.m !== 'string' ||
            !verb.m.trim() ||
            !validTenses
        ) {
            throw new Error(`entry ${index} must contain non-empty w, m, and six forms for each tense`);
        }
    });
}

/**
 * Builds the kata for one verb tense and mounts its section into `container`
 * straight away, so `el` is fully populated for the caller and never null.
 *
 * Each tense gets its own parsed section, so three verb katas coexist without
 * clashing.
 * @param {string} tenseKey one of the keys of `TENSES`
 * @param {HTMLElement} container
 */
export function createVerbKata(tenseKey, container) {
    const tense = TENSES[tenseKey];
    const manifest = getVerbManifest(tenseKey);

    const section = createSectionFromTemplate(verbsTemplate);
    container.appendChild(section);

    const el = {
        section,
        word: section.querySelector('[data-role="word"]'),
        meaning: section.querySelector('[data-role="meaning"]'),
        inputs: PERSONS.map((p) => section.querySelector(`[data-role="conj_${p.key}"]`)),
    };

    return {
        ...manifest,
        validateDataset: validateVerbDataset,
        el,

    getHelpContent(verb) {
            if (!verb) return '';

            return `
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs lg:text-sm border-collapse">
                        <thead>
                            <tr class="border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                <th class="py-3 px-3">Person</th>
                                <th class="py-3 px-3">${escapeHtml(tense.label)}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                            ${PERSONS.map((person, index) => `
                                <tr>
                                    <td class="py-2 px-3 font-bold">${escapeHtml(person.label)}</td>
                                    <td class="py-2 px-3">${escapeHtml(acceptedAnswers(verb[tenseKey][index]).join(' / ') || '—')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        },

        render(verb) {
            el.word.textContent = verb.w;
            el.meaning.textContent = `🇬🇧 ${verb.m}`;
            el.inputs.forEach((input, i) => {
                input.value = '';
                input.placeholder = TENSE_PLACEHOLDERS[tenseKey][i];
            });
        },

        /** @returns {{correct:boolean,fields:{ok:boolean}[]}|{warning:string}} */
        check(verb) {
            const targetForms = verb[tenseKey];
            if (!targetForms) return { warning: 'This exercise has no conjugations to fill in.' };

            if (el.inputs.some((input) => !input.value.trim())) {
                return { warning: 'Please fill in all six conjugations before checking.' };
            }

            const fields = el.inputs.map((input, i) => {
                const given = input.value.trim();
                // A form may carry `alt` for the second accepted spelling, e.g. a
                // Perfekt participle written with or without the "ge-" infix.
                const { ok } = matchAnswer(given, targetForms[i]);
                // No note: six verdicts in a row would bury the sentence, and the
                // help modal already lists the full conjugation chart.
                markControl(input, { ok, note: false });
                return { ok };
            });

            return { correct: fields.every((f) => f.ok), fields };
        },
    };
}