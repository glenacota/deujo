// katas/verbs/kata.js

import { createSectionFromTemplate } from '../../platform/dom/template.js';
import { acceptedAnswers, matchAnswer } from '../../services/answer-matcher.js';
import { markControl } from '../../platform/dom/answer-marking.js';
import { digitiseOptions, optionForDigit } from '../../platform/dom/option-digits.js';
import { PERSONS, TENSES, normalizePhrase } from '../../services/grammar.js';
import { assertDataset, hasAltList, hasCoreFields } from '../dataset-rules.js';
import { getVerbManifest } from './manifest.js';
import { renderVerbHelp } from './help.js';
import { renderVerbLesson } from './lesson.js';
import { verbsTemplate } from './template.js';

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

// app.css paints the pressed state from aria-pressed.
function markSelected(btn, active) {
    btn.setAttribute('aria-pressed', String(active));
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

export function createVerbKata(tenseKey, container) {
    const manifest = getVerbManifest(tenseKey);
    const isPerf = tenseKey === 'perf';

    const section = createSectionFromTemplate(verbsTemplate(isPerf));
    container.appendChild(section);

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
    // Same tap-or-digit rule as a picker row; tenses without aux buttons get none.
    digitiseOptions(el.auxButtons);

    function checkPerfekt(verb) {
        if (!auxiliary) return { warning: 'Please select sein or haben.' };

        // The participle is identical in all six forms, so perf[0] suffices.
        const targets = [...new Set(acceptedAnswers(verb.perf[0]).map(splitPerfekt))];
        const given = el.participle.value.trim();
        if (!given) return { warning: 'Please type the participle before checking.' };

        // Both auxiliaries can be right; the dataset lists the other as an `alt`.
        const auxOk = targets.some((target) => target.aux === auxiliary);
        const partOk = targets.some((target) => matchAnswer(given, target.participle).ok);

        const btnByAux = new Map(el.auxButtons.map((btn) => [btn.dataset.aux, btn]));
        markControl(btnByAux.get(auxiliary), { ok: auxOk, inside: true, note: false });
        if (!auxOk) {
            for (const { aux } of targets) markControl(btnByAux.get(aux), { ok: true, inside: true });
        }
        markControl(el.participle, { ok: partOk, expected: targets[0].participle });

        return {
            correct: auxOk && partOk,
            fields: [{ ok: auxOk }, { ok: partOk }],
            // A wrong auxiliary outranks a wrong participle: it carries the rule.
            lesson: !auxOk
                ? renderVerbLesson({ verb, tenseKey, index: null, expected: targets[0].aux, accepted: targets.map((t) => t.aux) })
                : !partOk
                    ? renderVerbLesson({ verb, tenseKey, index: 0, expected: targets[0].participle })
                    : null,
        };
    }

    return {
        ...manifest,
        validateDataset: validateVerbDataset,
        el,

        getHelpContent() {
            return renderVerbHelp(tenseKey);
        },

        // Returns false when no button carries the digit (non-Perfekt tenses have none), so the key stays with the page.
        pickOption(digit) {
            const button = optionForDigit(el.auxButtons, digit);
            if (!button) return false;
            button.click();
            return true;
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

        check(verb) {
            if (isPerf) return checkPerfekt(verb);

            const targetForms = verb[tenseKey];
            if (!targetForms) return { warning: 'This exercise has no conjugations to fill in.' };

            if (el.inputs.some((input) => !input.value.trim())) {
                return { warning: 'Please fill in all six conjugations before checking.' };
            }

            const misses = [];
            const fields = el.inputs.map((input, i) => {
                const given = input.value.trim();
                const { ok, accepted } = matchAnswer(given, targetForms[i]);
                markControl(input, { ok, note: false });
                if (!ok) misses.push({ index: i, expected: accepted[0] });
                return { ok };
            });

            return {
                correct: fields.every((f) => f.ok),
                fields,
                // Only the first miss gets a lesson; one panel is already on screen.
                lesson: renderVerbLesson({ verb, tenseKey, ...misses[0] }),
            };
        },
    };
}