// katas/verbs/kata.js

import { createSectionFromTemplate } from '../../platform/dom/template.js';
import { createChoiceTextKata } from '../factories/choice-text-kata.js';
import { acceptedAnswers, matchAnswer } from '../../services/answer-matcher.js';
import { markControl } from '../../platform/dom/answer-marking.js';
import { PERSONS, TENSES, normalizePhrase } from '../../services/grammar.js';
import { assertDataset, hasAltList, hasCoreFields } from '../dataset-rules.js';
import { getVerbManifest } from './manifest.js';
import { renderVerbHelp } from './help.js';
import { renderVerbLesson } from './lesson.js';
import { conjugationTemplate, perfektTemplate } from './template.js';

// Placeholders come from "gehen", so a hint never leaks the current verb's answer.
const TENSE_PLACEHOLDERS = {
    pres: ['e.g. gehe', 'e.g. gehst', 'e.g. geht', 'e.g. gehen', 'e.g. geht', 'e.g. gehen'],
    praet: ['e.g. ging', 'e.g. gingst', 'e.g. ging', 'e.g. gingen', 'e.g. gingt', 'e.g. gingen'],
};

// Any other auxiliary form counts as "sein".
const HABEN_AUXILIARIES = ['habe', 'hast', 'hat', 'haben', 'habt'];

/** Splitting `alt` spellings the same way lets the kata grade a choice plus a typed word. */
function splitPerfekt(form) {
    const [auxiliary, ...participle] = normalizePhrase(form).split(' ');
    return {
        aux: HABEN_AUXILIARIES.includes(auxiliary) ? 'haben' : 'sein',
        participle: participle.join(' '),
    };
}

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

function createPerfektKata(container) {
    return createChoiceTextKata({
        container,
        template: perfektTemplate,
        manifest: getVerbManifest('perf'),
        validateDataset: validateVerbDataset,
        getHelpContent: () => renderVerbHelp('perf'),
        choice: { role: 'aux', key: 'aux', elKey: 'auxButtons' },
        text: { role: 'participle', elKey: 'participle' },

        grade(verb, { choice: auxiliary, given }) {
            if (!auxiliary) return { warning: 'Please select sein or haben.' };
            if (!given) return { warning: 'Please type the participle before checking.' };

            // The participle is identical in all six forms, so perf[0] suffices.
            const targets = [...new Set(acceptedAnswers(verb.perf[0]).map(splitPerfekt))];

            // Both auxiliaries can be right; the dataset lists the other as an `alt`.
            const choiceOk = targets.some((target) => target.aux === auxiliary);
            const textOk = targets.some((target) => matchAnswer(given, target.participle).ok);

            // The note admits a rejected auxiliary was defensible when the dataset lists both.
            return {
                choiceOk,
                textOk,
                choiceLesson: renderVerbLesson({ verb, tenseKey: 'perf', index: null, expected: targets[0].aux, accepted: targets.map((t) => t.aux) }),
                textLesson: renderVerbLesson({ verb, tenseKey: 'perf', index: 0, expected: targets[0].participle }),
            };
        },
    });
}

function createVerbConjugationKata(tenseKey, container) {
    const manifest = getVerbManifest(tenseKey);

    const section = createSectionFromTemplate(conjugationTemplate);
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

        getHelpContent() {
            return renderVerbHelp(tenseKey);
        },

        // No option buttons here, so the key always stays with the page.
        pickOption() {
            return false;
        },

        render(verb) {
            el.word.textContent = verb.w;
            el.meaning.textContent = `🇬🇧 ${verb.m}`;
            el.inputs.forEach((input, i) => {
                input.value = '';
                input.placeholder = TENSE_PLACEHOLDERS[tenseKey][i];
            });
        },

        check(verb) {
            const targetForms = verb[tenseKey];
            if (!targetForms) return { warning: 'This exercise has no conjugations to fill in.' };

            if (el.inputs.some((input) => !input.value.trim())) {
                return { warning: 'Please fill in all six conjugations before checking.' };
            }

            const lessons = [];
            const fields = el.inputs.map((input, i) => {
                const given = input.value.trim();
                const { ok, accepted } = matchAnswer(given, targetForms[i]);
                markControl(input, { ok });
                if (!ok) {
                    const miss = renderVerbLesson({ verb, tenseKey, index: i, expected: accepted[0] });
                    if (miss) lessons.push({ label: PERSONS[i].label, ...miss });
                }
                return { ok };
            });

            return {
                correct: fields.every((f) => f.ok),
                fields,
                lessons,
            };
        },
    };
}

export function createVerbKata(tenseKey, container) {
    return tenseKey === 'perf'
        ? createPerfektKata(container)
        : createVerbConjugationKata(tenseKey, container);
}
