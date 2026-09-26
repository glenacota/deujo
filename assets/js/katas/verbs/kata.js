// katas/verbs/kata.js
// Self-contained verb-conjugation kata.

import { escapeHtml, createSectionFromTemplate } from '../../services/utility.js';
import { PERSONS, TENSES } from '../../services/grammar.js';
import { getVerbManifest } from './manifest.js';
import { verbsTemplate } from './template.js';

export function validateVerbDataset(dataset) {
    if (!Array.isArray(dataset) || dataset.length === 0) {
        throw new Error('dataset must be a non-empty array');
    }

    dataset.forEach((verb, index) => {
        const validTenses = Object.keys(TENSES).every((tense) =>
            Array.isArray(verb?.[tense]) &&
            verb[tense].length === PERSONS.length &&
            verb[tense].every((form) => typeof form === 'string' && form.trim())
        );
        if (
            !verb ||
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

function mountElements(el, tenseKey, manifest, container) {
    // Each tense gets its own parsed section (no shared ids), so multiple
    // tenses can coexist/be visible simultaneously in the future.
    const section = createSectionFromTemplate(verbsTemplate);
    section.dataset.tense = tenseKey;
    container.appendChild(section);

    el.section = section;
    el.word = section.querySelector('[data-role="word"]');
    el.meaning = section.querySelector('[data-role="meaning"]');
    el.inputs = PERSONS.map((p) => section.querySelector(`[data-role="conj_${p.key}"]`));
}

export function createVerbKata(tenseKey) {
    const tense = TENSES[tenseKey];
    const manifest = getVerbManifest(tenseKey);
    const el = { kata: null, section: null, cardBelt: null, word: null, meaning: null, inputs: [] };

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
                                <td class="py-2 px-3">${escapeHtml(verb[tenseKey][index] ?? '—')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

        mount(container) {
            if (el.section) return;
            mountElements(el, tenseKey, manifest, container);
        },

    render(verb) {
        el.word.textContent = verb.w;
        el.meaning.textContent = `🇬🇧 ${verb.m}`;
        el.inputs.forEach((input) => {
            input.value = '';
            input.classList.remove('border-rose-500', 'border-emerald-500');
        });
    },

    check(verb) {
            const targetForms = verb[tenseKey];
            if (!targetForms) return null;

        const correct = el.inputs.every(
            (input, i) => input.value.trim().toLowerCase() === targetForms[i].toLowerCase()
        );

            const message = correct
                ? `Excellent! Perfect ${escapeHtml(tense.label)} conjugation for "${escapeHtml(verb.w)}"!`
                : 'Correct answer: '
                    + PERSONS.map((p, i) => `${escapeHtml(p.label)} <strong>${escapeHtml(targetForms[i])}</strong>`).join(', ')
                    + '.';

            return { correct, message };
        },
    };
}