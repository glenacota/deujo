// katas/verbs/kata.js
// Self-contained verb-conjugation kata.

import { escapeHtml, createSectionFromTemplate } from '../../services/utility.js';
import { acceptedAnswers, matchAnswer } from '../../services/answer-matcher.js';
import { markControl } from '../../ui/answer-view.js';
import { PERSONS, TENSES, normalizePhrase } from '../../services/grammar.js';
import { assertDataset, hasAltList, hasCoreFields } from '../dataset-rules.js';
import { getVerbManifest } from './manifest.js';
import { verbsTemplate } from './template.js';

// Tense-neutral placeholders (from "gehen"), one per person, so the hint never leaks the current verb's answer.
const TENSE_PLACEHOLDERS = {
    pres: ['e.g. gehe', 'e.g. gehst', 'e.g. geht', 'e.g. gehen', 'e.g. geht', 'e.g. gehen'],
    praet: ['e.g. ging', 'e.g. gingst', 'e.g. ging', 'e.g. gingen', 'e.g. gingt', 'e.g. gingen'],
};

// The conjugated Perfekt auxiliaries; every other one-part form is "sein".
const HABEN_AUXILIARIES = ['habe', 'hast', 'hat', 'haben', 'habt'];

/**
 * Splits one Perfekt form into its two answers: `"ist gegangen"` and any `alt`
 * spelling split the same way, so the kata grades a choice plus a typed word.
 */
function splitPerfekt(form) {
    const [auxiliary, ...participle] = normalizePhrase(form).split(' ');
    return {
        aux: HABEN_AUXILIARIES.includes(auxiliary) ? 'haben' : 'sein',
        participle: participle.join(' '),
    };
}

/** Pressed-state styling for the Perfekt auxiliary buttons. */
function markSelected(btn, active) {
    btn.setAttribute('aria-pressed', String(active));
    ['ring-2', 'ring-purple-500', 'bg-purple-100', 'dark:bg-purple-950/60']
        .forEach((cls) => btn.classList.toggle(cls, active));
}

/** A conjugated form is a string, or `{a, alt}` when two spellings are correct. */
function isUsableForm(form) {
    if (typeof form === 'string') return Boolean(form.trim());
    if (!form || typeof form !== 'object' || typeof form.a !== 'string' || !form.a.trim()) return false;
    return hasAltList(form.alt);
}

export function validateVerbDataset(dataset) {
    assertDataset(dataset);

    dataset.forEach((verb, index) => {
        const validTenses = Object.keys(TENSES).every((tense) =>
            Array.isArray(verb?.[tense]) &&
            verb[tense].length === PERSONS.length &&
            verb[tense].every(isUsableForm)
        );

        if (!hasCoreFields(verb) || !validTenses) {
            throw new Error(`entry ${index} must contain non-empty w, m, and six forms for each tense`);
        }
    });
}

/**
 * Mounts one verb tense's section, so `el` is populated for the caller. Each
 * tense gets its own parsed section, so the three verb katas coexist.
 * @param tenseKey one of the keys of `TENSES`
 */
export function createVerbKata(tenseKey, container) {
    const tense = TENSES[tenseKey];
    const manifest = getVerbManifest(tenseKey);
    // Perfekt asks for one auxiliary choice and one participle, not six forms.
    const isPerf = tenseKey === 'perf';

    const section = createSectionFromTemplate(verbsTemplate);
    container.appendChild(section);

    if (isPerf) {
        section.querySelector('[data-role="six"]').classList.add('hidden');
        section.querySelector('[data-role="perf"]').classList.remove('hidden');
    }

    const el = {
        section,
        word: section.querySelector('[data-role="word"]'),
        meaning: section.querySelector('[data-role="meaning"]'),
        inputs: PERSONS.map((p) => section.querySelector(`[data-role="conj_${p.key}"]`)),
        participle: section.querySelector('[data-role="participle"]'),
        auxButtons: Array.from(section.querySelectorAll('[data-role="aux"]')),
    };

    let auxiliary = null;
    el.auxButtons.forEach((btn) => btn.addEventListener('click', () => {
        auxiliary = btn.dataset.aux;
        el.auxButtons.forEach((b) => markSelected(b, b.dataset.aux === auxiliary));
    }));

    /**
     * Perfekt grading: the auxiliary is a choice, the participle the only typed
     * answer. The participle is the same in all six forms, so one is enough.
     */
    function checkPerfekt(verb) {
        if (!auxiliary) return { warning: 'Please select sein or haben.' };

        const targets = [...new Set(acceptedAnswers(verb.perf[0]).map(splitPerfekt))];
        const given = el.participle.value.trim();
        if (!given) return { warning: 'Please type the participle before checking.' };

        const auxOk = auxiliary === targets[0].aux;
        const partOk = targets.some((target) => matchAnswer(given, target.participle).ok);

        const btnByAux = new Map(el.auxButtons.map((btn) => [btn.dataset.aux, btn]));
        markControl(btnByAux.get(auxiliary), { ok: auxOk, inside: true, note: false });
        if (!auxOk) markControl(btnByAux.get(targets[0].aux), { ok: true, inside: true });
        markControl(el.participle, { ok: partOk, expected: targets[0].participle });

        return {
            correct: auxOk && partOk,
            fields: [{ ok: auxOk }, { ok: partOk }],
        };
    }

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

            if (isPerf) {
                auxiliary = null;
                el.auxButtons.forEach((btn) => markSelected(btn, false));
                el.participle.value = '';
                return;
            }

            el.inputs.forEach((input, i) => {
                input.value = '';
                input.placeholder = TENSE_PLACEHOLDERS[tenseKey][i];
            });
        },

        /** @returns a verdict `{ correct, fields }`, or `{ warning }` when the answer is not ready to grade. */
        check(verb) {
            if (isPerf) return checkPerfekt(verb);

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