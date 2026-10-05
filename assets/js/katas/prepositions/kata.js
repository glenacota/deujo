// katas/prepositions/kata.js
// Self-contained preposition kata: fill in the preposition together with the
// article it governs, so the case is part of the answer.

import { createSectionFromTemplate } from '../../platform/dom/template.js';
import { markControl } from '../../platform/dom/answer-marking.js';
import {
    CASE_LABELS,
    hasOrderedBlankPlaceholders,
    isPrepositionPhraseInCase,
    normalizePhrase,
} from '../../services/grammar.js';
import { matchAnswer, formatAccepted } from '../../services/answer-matcher.js';
import { renderBlankSentence } from '../../platform/dom/blank-renderer.js';
import { assertDataset, hasCoreFields, hasValidBlanks } from '../dataset-rules.js';
import { prepositionsManifest } from './manifest.js';
import { renderPrepositionHelp } from './help.js';
import { renderPrepositionLesson } from './lesson.js';
import { prepositionsTemplate } from './template.js';

// A preposition governs no Nominativ, so an answer may never claim it.
const VALID_CASE_NAMES = Object.keys(CASE_LABELS).filter((c) => c !== 'nom');

/**
 * A phrase is a usable answer only if it starts with a real preposition whose
 * determiner belongs to the case the entry claims. Whether that phrase is
 * correct German is the grammar service's judgement, not this kata's.
 */
const isUsableAnswer = ({ a, c } = {}) =>
    VALID_CASE_NAMES.includes(c) && isPrepositionPhraseInCase(normalizePhrase(a), c);

export function validatePrepositionDataset(dataset) {
    assertDataset(dataset);

    dataset.forEach((item, index) => {
        const ok = hasCoreFields(item, { sentence: true })
            && hasValidBlanks(item?.b, isUsableAnswer)
            && hasOrderedBlankPlaceholders(item?.s, item?.b?.length);

        if (!ok) {
            throw new Error(`entry ${index} has an invalid sentence, translation, or preposition answers`);
        }
    });
}

/** Mounts the preposition kata's section, so `el` is populated for the caller. */
export function createPrepositionKata(container) {
    let inputs = [];

    const section = createSectionFromTemplate(prepositionsTemplate);
    container.appendChild(section);

    const el = {
        section,
        sentence: section.querySelector('[data-role="sentence"]'),
        translation: section.querySelector('[data-role="translation"]'),
    };

    return {
        ...prepositionsManifest,
        validateDataset: validatePrepositionDataset,
        el,

        getHelpContent() {
            return renderPrepositionHelp();
        },

        render(item) {
            inputs = renderBlankSentence(el, item, () => {
                const input = document.createElement('input');
                input.type = 'text';
                input.autocomplete = 'off';
                // "hinsichtlich des" is the longest answer, so allow for it.
                input.maxLength = '18';
                input.spellcheck = false;
                input.autocapitalize = 'none';
                input.autocorrect = 'off';
                input.lang = 'de';
                input.size = '12';
                input.placeholder = 'e.g. zum';
                input.className = 'blank-input blank-input--inline';
                return input;
            });
        },

        /** @returns a verdict `{ correct, fields }`, or `{ warning }` when the answer is not ready to grade. */
        check(item) {
            if (!inputs.length || inputs.some((input) => !input.value.trim())) {
                return { warning: 'Please fill in all blanks before checking.' };
            }

            const misses = [];
            const fields = inputs.map((input, i) => {
                const given = input.value.trim();
                const { ok, accepted } = matchAnswer(given, item.b[i]);
                // accepted[0] is the dataset's own spelling, so the note always
                // shows what the data asked for first. On a miss it lists every
                // accepted spelling, so "zum" and "zu dem" are both visible
                // before the learner retypes one.
                markControl(input, { ok, expected: accepted[0], note: ok ? null : formatAccepted(accepted) });
                if (!ok) misses.push(accepted[0]);
                return { ok };
            });

            return {
                correct: fields.every((f) => f.ok),
                fields,
                // The rection group of the first miss, named from grammar.js.
                lesson: renderPrepositionLesson({ expected: misses[0] }),
            };
        },
    };
}
