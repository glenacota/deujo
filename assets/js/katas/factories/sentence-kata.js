// katas/factories/sentence-kata.js
// The engine behind every fill-in-the-blank sentence kata: mount a section,
// render `item.s` with one input per `{n}`, and grade what was typed.
//
// Katas differ only in what counts as a legal answer, what the note says, and
// what the correction panel teaches. Those are the three this asks for.

import { createSectionFromTemplate } from '../../platform/dom/template.js';
import { createBlankInput, renderBlankSentence } from '../../platform/dom/blank-renderer.js';
import { markControl } from '../../platform/dom/answer-marking.js';
import { formatAccepted, matchAnswer } from '../../services/answer-matcher.js';
import { hasOrderedBlankPlaceholders } from '../../services/grammar.js';
import { assertDataset, hasCoreFields, hasValidBlanks } from '../dataset-rules.js';

// One blank left empty is an unfinished answer, not a wrong one: retyping is
// cheaper than guessing which of two the learner meant.
const NOT_READY = 'Please fill in all blanks before checking.';

/**
 * The dataset check every sentence kata shares: a sentence carrying one `{n}`
 * placeholder per blank, and a blank list that lines up with them.
 *
 * `isUsableAnswer` stays the kata's own rule, so two katas agree on the shared
 * parts and differ only where they mean to.
 *
 * @param describeProblem words this kata's own failure message for entry `index`
 */
export function validateSentenceDataset(dataset, isUsableAnswer, describeProblem) {
    assertDataset(dataset);

    dataset.forEach((item, index) => {
        const ok = hasCoreFields(item, { sentence: true })
            && hasValidBlanks(item?.b, isUsableAnswer)
            && hasOrderedBlankPlaceholders(item?.s, item?.b?.length);

        if (!ok) {
            throw new Error(describeProblem(index));
        }
    });
}

/**
 * Builds a sentence kata from what actually differs between katas.
 *
 * @param manifest spreads onto the kata: `id`, `name`, `subtitle`, `datasetUrl`,
 *   `accent`, `helpTitle`
 * @param template the section markup, from `sentenceTemplate`
 * @param help answer-blind body, called with no item
 * @param input passed to `createBlankInput`
 * @param matchOptions passed to `matchAnswer`
 * @param expectedFor (blank, accepted) -> the spelling shown on a wrong input
 * @param lessonFor (miss) -> the correction panel's `Lesson`, or null. Called on
 *   every verdict including a clean one, so it must tolerate an absent miss.
 * @param isUsableAnswer what counts as a legal answer, for validation
 * @param describeProblem (index) -> this kata's validation failure message
 */
export function createSentenceKata({
    manifest,
    template,
    help,
    input,
    matchOptions = {},
    expectedFor = (blank, accepted) => accepted[0],
    lessonFor,
    isUsableAnswer,
    describeProblem,
}) {
    return (container) => {
        // Rebuilt per item, so a kata that answered is graded against its own
        // inputs rather than whatever the previous render left behind.
        let inputs = [];

        const section = createSectionFromTemplate(template);
        container.appendChild(section);

        const el = {
            section,
            sentence: section.querySelector('[data-role="sentence"]'),
            translation: section.querySelector('[data-role="translation"]'),
        };

        return {
            ...manifest,
            validateDataset: (dataset) => validateSentenceDataset(dataset, isUsableAnswer, describeProblem),
            el,

            /**
             * Answer-blind: `help` takes no item, so the body cannot print the
             * sentence on screen or the answer to the blank in front of it.
             */
            getHelpContent() {
                return help();
            },

            render(item) {
                inputs = renderBlankSentence(el, item, () => createBlankInput(input));
            },

            /** @returns a verdict `{ correct, fields, lesson }`, or `{ warning }`. */
            check(item) {
                if (!inputs.length || inputs.some((field) => !field.value.trim())) {
                    return { warning: NOT_READY };
                }

                const misses = [];
                const fields = inputs.map((field, i) => {
                    const blank = item.b[i];
                    const given = field.value.trim();
                    const { ok, accepted } = matchAnswer(given, blank, matchOptions);
                    // The dataset's own spelling leads the note; on a miss every
                    // accepted spelling is listed, so "zum" and "zu dem" are
                    // both visible before the learner retypes one.
                    const expected = expectedFor(blank, accepted);
                    markControl(field, { ok, expected, note: ok ? null : formatAccepted(accepted) });
                    if (!ok) misses.push({ blank, given, expected });
                    return { ok };
                });

                return {
                    correct: fields.every((f) => f.ok),
                    fields,
                    // The first miss teaches: a two-blank sentence has two rules,
                    // and the panel has room for one.
                    lesson: lessonFor(misses[0]),
                };
            },
        };
    };
}
