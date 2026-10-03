// katas/cases/kata.js
// Self-contained case-declension kata: fill-in-the-blank sentences with inline inputs.

import { createSectionFromTemplate } from '../../services/utility.js';
import { markControl } from '../../ui/answer-view.js';
import { CASE_LABELS, hasOrderedBlankPlaceholders } from '../../services/grammar.js';
import { formatAccepted, matchAnswer } from '../../services/answer-matcher.js';
import { renderBlankSentence } from '../../services/blank-renderer.js';
import { assertDataset, hasCoreFields, hasValidBlanks } from '../dataset-rules.js';
import { casesManifest } from './manifest.js';
import { renderCaseHelp } from './help.js';
import { renderCaseLesson } from './lesson.js';
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

        /**
         * Answer-blind: the body takes no item, so it cannot print the sentence on
         * screen or the case the blank expects.
         */
        getHelpContent() {
            return renderCaseHelp();
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

            const misses = [];
            const fields = inputs.map((input, i) => {
                const given = input.value.trim();
                // The learner may type the article with the noun that follows it
                // ("der Mann"), which is the same answer, not a different one.
                const { ok, accepted } = matchAnswer(given, item.b[i], { allowExtraWords: true });
                // The dataset spelling, not the whole answer object, goes on show.
                const expected = accepted[0] ?? item.b[i].a;
                markControl(input, { ok, expected, note: ok ? null : formatAccepted(accepted) });
                if (!ok) misses.push({ blank: item.b[i], given, expected });
                return { ok };
            });

            return {
                correct: fields.every((f) => f.ok),
                fields,
                // The first miss teaches: a two-blank sentence has two rules, and
                // the panel has room for one.
                lesson: renderCaseLesson(misses[0]),
            };
        },
    };
}
