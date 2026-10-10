// katas/factories/picker-kata.js
// The engine behind the two-stage picker katas (cases and prepositions).
//
// A learner answers each blank in two steps. Step one names the case, from the
// trigger the sentence already contains — a preposition, or the verb — and step
// two picks the whole determiner from a short button row. Nothing is typed, so
// no answer can be lost to spelling, and the two stages are graded separately: a
// learner who names Dativ correctly and then reaches for "seinen" has two
// separate things to correct, and the panel can say which.
//
// The state machine walks the blanks in order, one open at a time, because 215
// of the 246 case entries carry two blanks and a phone has one column.
//
// Katas differ only in what step one asks and how a miss is taught.

import { createSectionFromTemplate } from '../../platform/dom/template.js';
import { renderPickSentence, setSlot } from '../../platform/dom/pick-sentence.js';
import { markControl } from '../../platform/dom/answer-marking.js';
import { CASE_LABELS, determinerBelongsTo, hasOrderedBlankPlaceholders, normalizePhrase } from '../../services/grammar.js';
import { determinerOptions } from '../../services/determiner-options.js';
import { assertDataset, hasCoreFields } from '../dataset-rules.js';

/** A blank the learner has only part-answered is unfinished, not wrong. */
const NOT_READY = 'Answer every blank before checking.';

/** The two steps of one blank, in the order they are taken. */
const Step = Object.freeze({ CASE: 'case', FORM: 'form' });

/**
 * The dataset check both picker katas share: a sentence carrying one `{n}`
 * placeholder per blank, a blank list that lines up with them, and an answer
 * that is a determiner the case really takes.
 *
 * The last rule is the one free typing never had to state and a picker always
 * has to: a form the learner cannot be shown as a button is an unanswerable
 * blank, so it fails here rather than as a missing option.
 *
 * @param describeProblem words this kata's own failure message for entry `index`
 * @param cases the case keys this kata allows, so a preposition kata cannot ship
 *   a Nominativ answer that no preposition governs
 */
export function validatePickerDataset(dataset, describeProblem, cases) {
    assertDataset(dataset);

    dataset.forEach((item, index) => {
        const ok = hasCoreFields(item, { sentence: true })
            && Array.isArray(item?.b)
            && item.b.length > 0
            && hasOrderedBlankPlaceholders(item?.s, item.b.length)
            && item.b.every((blank) => cases.includes(blank?.c)
                // `alt` widens a typed answer. A picker can only put the forms
                // it generates on a button, so a second spelling here would be
                // a blank the learner can satisfy on screen but never see.
                && blank.alt === undefined
                && determinerBelongsTo(blank?.a, blank.c));

        if (!ok) throw new Error(describeProblem(index));
    });
}

/**
 * Builds a two-stage picker kata from what actually differs between katas.
 *
 * @param manifest spreads onto the kata: `id`, `name`, `subtitle`, `datasetUrl`,
 *   `accent`, `helpTitle`
 * @param template the section markup, from `pickerTemplate`
 * @param help answer-blind body, called with no item
 * @param prompt (item, blank, index) -> the question step one asks. Reads the
 *   German sentence only, never the answer, or it would print the case on screen.
 * @param cases the case keys this kata offers in step one
 * @param lessonFor (miss) -> the correction panel's `Lesson`, or null. Called on
 *   every verdict including a clean one, so it must tolerate an absent miss.
 * @param describeProblem (index) -> this kata's validation failure message
 */
export function createPickerKata({
    manifest,
    template,
    help,
    prompt,
    cases = Object.keys(CASE_LABELS),
    lessonFor,
    describeProblem,
}) {
    return (container) => {
        // Rebuilt per item, so a graded answer is compared against its own picks
        // rather than whatever the previous render left behind.
        let item = null;
        let answers = [];
        let slots = [];
        let open = 0;
        let step = Step.CASE;

        const section = createSectionFromTemplate(template);
        container.appendChild(section);

        const el = {
            section,
            sentence: section.querySelector('[data-role="sentence"]'),
            translation: section.querySelector('[data-role="translation"]'),
            steps: section.querySelector('[data-role="steps"]'),
            prompt: section.querySelector('[data-role="prompt"]'),
            promptForm: section.querySelector('[data-role="prompt-form"]'),
            progress: section.querySelector('[data-role="progress"]'),
            stageCase: section.querySelector('[data-role="stage-case"]'),
            stageForm: section.querySelector('[data-role="stage-form"]'),
            review: section.querySelector('[data-role="review"]'),
        };

        /**
         * One row of buttons, rebuilt per blank. Rebuilt rather than reused
         * because the option set is per blank, and a stale button left over from
         * the previous blank would offer a form this sentence cannot take.
         */
        const buildRow = (host, values, onPick) => {
            host.textContent = '';
            const fragment = document.createDocumentFragment();
            values.forEach((value) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = String(value);
                button.dataset.value = String(value);
                button.className = 'pick-option';
                button.setAttribute('aria-pressed', 'false');
                button.addEventListener('click', () => onPick(String(value)));
                fragment.appendChild(button);
            });
            host.appendChild(fragment);
            return Array.from(host.children);
        };

        /** Step one's chosen case stays pressed while step two is open. */
        const pressCase = (chosen) => Array.from(el.stageCase.children)
            .forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.value === chosen)));

        /** Fills the step-two row for one blank. */
        const showFormsFor = (index) => buildRow(
            el.stageForm,
            determinerOptions(item.b[index]),
            (form) => pickForm(form),
        );

        /** Paints the sentence slots, the prompt and the progress line. */
        function paint() {
            slots.forEach((slot, index) => setSlot(slot, answers[index]?.form, index === open));

            el.prompt.textContent = prompt(item, item.b[open], open);
            el.stageCase.hidden = false;
            // Step two carries its own label. Without it the second row of
            // buttons reads as four more cases, and the learner cannot tell
            // which question the forms are answering.
            el.stageForm.hidden = step !== Step.FORM;
            el.promptForm.hidden = step !== Step.FORM;
            pressCase(CASE_LABELS[answers[open]?.caseKey] ?? '');

            el.progress.textContent = item.b.length > 1
                ? `Blank ${open + 1} of ${item.b.length}`
                : '';
        }

        /**
         * Every blank answered: the buttons step aside for a review list, one row
         * per blank, so a two-blank sentence can be graded without the case row
         * for the last blank standing in for the first.
         */
        function showReview() {
            el.steps.hidden = true;
            el.review.hidden = false;
            el.progress.textContent = '';
            slots.forEach((slot, index) => setSlot(slot, answers[index].form, false));

            el.review.textContent = '';
            const fragment = document.createDocumentFragment();
            item.b.forEach((blank, index) => {
                const row = document.createElement('div');
                row.className = 'pick-review-row';
                // Named per stage: two rows of bare buttons with nothing to say
                // which is the case and which the form would read as a list of
                // words rather than an answer the learner gave.
                row.appendChild(reviewLabel(`Blank ${index + 1} · case`));
                // Both cells carry the form the blank wanted, so a wrong case is
                // corrected beside it exactly as a wrong form is.
                row.appendChild(reviewCell(
                    answers[index].caseKey && CASE_LABELS[answers[index].caseKey],
                    CASE_LABELS[blank.c],
                ));
                row.appendChild(reviewLabel('form'));
                row.appendChild(reviewCell(answers[index].form, blank.a));
                fragment.appendChild(row);
            });
            el.review.appendChild(fragment);
        }

        /**
         * A short label inside a review row. Its own element rather than part of
         * the cell text, because a screen reader reads a bare "form" as content
         * rather than as the name of the value beside it.
         */
        function reviewLabel(text) {
            const label = document.createElement('span');
            label.className = 'pick-review-label';
            label.textContent = text;
            return label;
        }

        /**
         * One answered cell in the review list: the value the learner picked and,
         * when it differs, the one the blank wanted. A clean answer therefore
         * reads as a single button and a miss reads as the correction beside it.
         */
        function reviewCell(given, wanted) {
            const cell = document.createElement('span');
            cell.className = 'pick-review-cell';

            const picked = document.createElement('button');
            picked.type = 'button';
            picked.className = 'pick-option pick-option--compact';
            picked.disabled = true;
            picked.textContent = given ?? '—';
            cell.appendChild(picked);

            if (wanted && normalizePhrase(wanted) !== normalizePhrase(given)) {
                const expected = document.createElement('button');
                expected.type = 'button';
                expected.className = 'pick-option pick-option--compact';
                expected.disabled = true;
                expected.textContent = wanted;
                cell.appendChild(expected);
            }
            return cell;
        }

        /**
         * Step one. The buttons carry case labels rather than keys, so the lookup
         * is by label and a kata that renames a case cannot silently break it.
         */
        function pickCase(label) {
            const caseKey = cases.find((key) => CASE_LABELS[key] === label);
            if (!caseKey) return;
            answers[open].caseKey = caseKey;
            step = Step.FORM;
            showFormsFor(open);
            paint();
        }

        /**
         * Step two. A pick closes the blank and opens the next; the last one
         * ends on the review list, so the learner never has to track which blank
         * the buttons belong to.
         */
        function pickForm(form) {
            answers[open].form = form;
            if (open < answers.length - 1) {
                open += 1;
                step = Step.CASE;
                buildRow(el.stageForm, [], () => {});
                paint();
                return;
            }
            showReview();
        }

        return {
            ...manifest,
            validateDataset: (dataset) => validatePickerDataset(dataset, describeProblem, cases),
            el,

            /**
             * Answer-blind: `help` takes no item, so the body cannot print the
             * sentence on screen or the answer to the blank in front of it.
             */
            getHelpContent() {
                return help();
            },

            render(next) {
                item = next;
                answers = (next?.b ?? []).map(() => ({ caseKey: null, form: null }));
                slots = renderPickSentence(el, next);
                open = 0;
                step = Step.CASE;
                el.steps.hidden = false;
                el.review.hidden = true;
                el.review.textContent = '';
                el.promptForm.hidden = true;

                buildRow(el.stageCase, cases.map((caseKey) => CASE_LABELS[caseKey]), (label) => pickCase(label));
                buildRow(el.stageForm, [], () => {});
                paint();
            },

            /** @returns a verdict `{ correct, fields, lesson }`, or `{ warning }`. */
            check() {
                if (!item || !answers.length || answers.some((a) => !a.caseKey || !a.form)) {
                    return { warning: NOT_READY };
                }

                const misses = [];
                const fields = item.b.map((blank, index) => {
                    const given = answers[index];
                    // Case graded on what was named in step one, form on what was
                    // picked in step two, so the correction names the stage that
                    // went wrong rather than one verdict for the pair.
                    const caseOk = given.caseKey === blank.c;
                    const formOk = normalizePhrase(given.form) === normalizePhrase(blank.a);
                    if (!caseOk || !formOk) misses.push({ blank, index, item, given, caseOk, formOk });
                    return { ok: caseOk && formOk };
                });

                markReview();

                return {
                    correct: fields.every((field) => field.ok),
                    fields,
                    // The first miss teaches: a two-blank sentence has two rules,
                    // and the panel has room for one.
                    lesson: lessonFor(misses[0]),
                };
            },
        };

        /**
         * Grades the two stages separately and paints them. The picked control is
         * marked as picked, and the one the blank wanted is marked right beside
         * it, the way the noun kata marks the gender it meant: a wrong pick with
         * no right one next to it teaches nothing.
         *
         * Graded from the picks rather than from a passed-in miss list, so a cell
         * and the verdict it explains cannot drift apart.
         */
        function markReview() {
            Array.from(el.review.children).forEach((row, index) => {
                const given = answers[index];
                const wanted = item.b[index];
                // The row is [label, caseCell, label, formCell], and grading
                // reads the cells rather than trusting their position in the row.
                const cells = Array.from(row.children).filter((node) => node.classList.contains('pick-review-cell'));
                const [caseCell, formCell] = cells;

                markControl(caseCell.children[0], {
                    ok: given.caseKey === wanted.c,
                    inside: true,
                    note: false,
                });
                markControl(formCell.children[0], {
                    ok: normalizePhrase(given.form) === normalizePhrase(wanted.a),
                    inside: true,
                    note: false,
                });
                // The wanted control is the second child, present only on a miss.
                if (formCell.children[1]) markControl(formCell.children[1], { ok: true, inside: true, note: false });
                if (caseCell.children[1]) markControl(caseCell.children[1], { ok: true, inside: true, note: false });
            });
        }
    };
}