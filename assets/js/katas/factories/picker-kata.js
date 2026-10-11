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
import { determinerOptions, OPTION_ROW_SIZE } from '../../services/determiner-options.js';
import { assertDataset, hasCoreFields } from '../dataset-rules.js';

/**
 * A blank the learner has only part-answered is unfinished, not wrong. "Finish"
 * rather than "answer", because a case picked with no form behind it has been
 * answered as far as the learner knows and still is not checkable.
 */
const NOT_READY = 'Finish every blank before checking.';

/** The two steps of one blank, in the order they are taken. */
const Step = Object.freeze({ CASE: 'case', FORM: 'form', DONE: 'done' });

/**
 * The hover treatment of the noun kata's gender buttons, so a picker option and a
 * gender button answer a tap the same way. Tailwind only emits the classes it
 * finds in a scanned file, which is why they live on the string the factory
 * builds rather than in app.css.
 */
const OPTION_CLASS = 'pick-option hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40';

/**
 * A review chip is a value the learner gave, not a control they can use. It is
 * its own class rather than a `.pick-option` variant because a disabled button
 * still needs none of a live option's furniture: no 44px tap target it can never
 * be tapped on, and no hover treatment. `[data-answer-state]` is class-agnostic,
 * so the correct/wrong palette still reaches it unchanged.
 */
const VALUE_CLASS = 'pick-value';

/**
 * The digit each stage starts at. Step one opens at 1 and step two starts one row
 * further on, so the two get disjoint ranges on purpose: both rows are on screen
 * at once — step one's stays on show with the chosen case pressed, so the learner
 * can see what they picked — and a shared range would mean `3` could stand for
 * Nominativ or for a determiner depending on which row the eye had drifted to.
 * Disjoint ranges make every digit mean exactly one button.
 */
const DIGITS = Object.freeze({
    [Step.CASE]: 1,
    [Step.FORM]: 1 + OPTION_ROW_SIZE,
});

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
 * @param entryRule (item) => boolean, this kata's own extra rule. A kata whose
 *   step one asks about something its sentence has to contain states so here,
 *   rather than degrading to a vaguer question when it does not.
 */
export function validatePickerDataset(dataset, describeProblem, cases, entryRule = () => true) {
    assertDataset(dataset);

    dataset.forEach((item, index) => {
        const ok = entryRule(item)
            && hasCoreFields(item, { sentence: true })
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
 * @param entryRule (item) -> boolean, this kata's own extra dataset rule
 */
export function createPickerKata({
    manifest,
    template,
    help,
    prompt,
    cases = Object.keys(CASE_LABELS),
    lessonFor,
    describeProblem,
    entryRule,
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

        // The render targets stay in the closure. `section` is the whole of what
        // the app asks a kata for — it shows, locks, releases and clears marks
        // through it, and `registry.js` fails a kata that mounts no section. A
        // wider public handle would read as an interface the rest of the code
        // depends on, and nothing would notice when it stopped meaning one.
        const dom = {
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

        // Each row is described by the question printed above it, so a screen
        // reader hears the sentence's own wording before the buttons rather than
        // a generic "Which case?". Ids are namespaced by kata because every kata
        // is mounted at boot, and two sections sharing one id would leave the
        // second row pointing at the first kata's question.
        dom.prompt.id = `${manifest.id}-prompt`;
        dom.promptForm.id = `${manifest.id}-prompt-form`;
        dom.stageCase.setAttribute('aria-describedby', dom.prompt.id);
        dom.stageForm.setAttribute('aria-describedby', dom.promptForm.id);

        /**
         * One row of buttons, rebuilt per blank. Rebuilt rather than reused
         * because the option set is per blank, and a stale button left over from
         * the previous blank would offer a form this sentence cannot take.
         *
         * Each button carries its digit, so the hotkey is visible rather than a
         * trick to memorise, and `aria-keyshortcuts` names it to a screen reader.
         *
         * @param firstDigit the digit on the first button, so step one and step
         *   two each print the range the keyboard actually listens for
         */
        const buildRow = (host, values, onPick, firstDigit) => {
            host.textContent = '';
            const fragment = document.createDocumentFragment();
            values.forEach((value, position) => {
                const digit = firstDigit + position;
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.value = String(value);
                button.className = OPTION_CLASS;
                button.setAttribute('aria-pressed', 'false');
                button.setAttribute('aria-keyshortcuts', String(digit));
                // Digit before the word, so the key reads as the key to press
                // beside the thing it picks rather than as a footnote after it.
                button.appendChild(hotkey(digit));
                button.appendChild(optionLabel(String(value)));
                button.addEventListener('click', () => onPick(String(value)));
                fragment.appendChild(button);
            });
            host.appendChild(fragment);
            return Array.from(host.children);
        };

        /**
         * The digit printed on an option. Hidden from assistive tech, because
         * `aria-keyshortcuts` already carries it and the button's own name is the
         * German form, which is what a learner wants read aloud.
         */
        function hotkey(digit) {
            const key = document.createElement('kbd');
            key.className = 'pick-key';
            key.textContent = String(digit);
            key.setAttribute('aria-hidden', 'true');
            return key;
        }

        /** The German form on an option, in its own element so the digit can precede it. */
        function optionLabel(text) {
            const label = document.createElement('span');
            label.className = 'pick-option-label';
            label.textContent = text;
            return label;
        }

        /** Step one's chosen case stays pressed while step two is open. */
        const pressCase = (chosen) => Array.from(dom.stageCase.children)
            .forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.value === chosen)));

        /** Fills the step-two row for one blank. */
        const showFormsFor = (index) => buildRow(
            dom.stageForm,
            determinerOptions(item.b[index]),
            (form) => pickForm(form),
            DIGITS[Step.FORM],
        );

        /** Paints the sentence slots, the prompt and the progress line. */
        function paint() {
            slots.forEach((slot, index) => setSlot(slot, answers[index]?.form, index === open));

            dom.prompt.textContent = prompt(item, item.b[open], open);
            dom.stageCase.hidden = false;
            // Step two carries its own label. Without it the second row of
            // buttons reads as four more cases, and the learner cannot tell
            // which question the forms are answering.
            dom.stageForm.hidden = step !== Step.FORM;
            dom.promptForm.hidden = step !== Step.FORM;
            pressCase(CASE_LABELS[answers[open]?.caseKey] ?? '');

            dom.progress.textContent = item.b.length > 1
                ? `Blank ${open + 1} of ${item.b.length}`
                : '';
        }

        /**
         * Every blank answered: the buttons step aside for a review list, one row
         * per blank, so a two-blank sentence can be graded without the case row
         * for the last blank standing in for the first.
         */
        function showReview() {
            // DONE, so a digit that arrives after the last pick finds nothing to
            // press. The buttons are still in the DOM behind the hidden step
            // block, and without this a stray key would re-answer a graded blank.
            step = Step.DONE;
            dom.steps.hidden = true;
            dom.review.hidden = false;
            dom.progress.textContent = '';
            slots.forEach((slot, index) => setSlot(slot, answers[index].form, false));

            dom.review.textContent = '';
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
            dom.review.appendChild(fragment);
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
            picked.className = VALUE_CLASS;
            picked.disabled = true;
            picked.textContent = given ?? '—';
            cell.appendChild(picked);

            if (wanted && normalizePhrase(wanted) !== normalizePhrase(given)) {
                const expected = document.createElement('button');
                expected.type = 'button';
                expected.className = VALUE_CLASS;
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
                buildRow(dom.stageForm, [], () => {}, DIGITS[Step.FORM]);
                paint();
                return;
            }
            showReview();
        }

        return {
            ...manifest,
            validateDataset: (dataset) => validatePickerDataset(dataset, describeProblem, cases, entryRule),
            // The section and nothing else: it is what `registry.js` checks for
            // and what the app shows, locks and releases the kata through.
            el: { section },

            /**
             * Answer-blind: `help` takes no item, so the body cannot print the
             * sentence on screen or the answer to the blank in front of it.
             */
            getHelpContent() {
                return help();
            },

            /**
             * Picks the option the digit names, on whichever stage is open, for
             * the number hotkeys the keyboard funnel routes here.
             *
             * @param {number} digit the key pressed, in the open stage's own
             *   range: 1-4 for the case row, 5-8 for the form row
             * @returns {boolean} false when no option carries that digit, so the
             *   key is left to the page rather than swallowed by a no-op
             */
            pickOption(digit) {
                // Nothing to pick once every blank is answered, or before an item
                // is on screen at all.
                if (!item || step === Step.DONE) return false;

                // A digit from the other stage is refused rather than guessed at:
                // both rows are on screen, and `3` must mean one button only.
                const first = DIGITS[step];
                const position = digit - first;
                if (!Number.isInteger(position) || position < 0 || position >= OPTION_ROW_SIZE) return false;

                const host = step === Step.FORM ? dom.stageForm : dom.stageCase;
                const button = host.children[position];
                if (!button) return false;

                button.click();
                return true;
            },

            render(next) {
                item = next;
                answers = (next?.b ?? []).map(() => ({ caseKey: null, form: null }));
                slots = renderPickSentence(dom, next);
                open = 0;
                step = Step.CASE;
                dom.steps.hidden = false;
                dom.review.hidden = true;
                dom.review.textContent = '';
                dom.promptForm.hidden = true;

                buildRow(dom.stageCase, cases.map((caseKey) => CASE_LABELS[caseKey]), (label) => pickCase(label), DIGITS[Step.CASE]);
                buildRow(dom.stageForm, [], () => {}, DIGITS[Step.FORM]);
                paint();
            },

            /** @returns a verdict `{ correct, fields, lesson }`, or `{ warning }`. */
            check() {
                if (!item || !answers.length || answers.some((a) => !a.caseKey || !a.form)) {
                    return { warning: NOT_READY };
                }

                const graded = grade();
                markReview(graded);

                return {
                    correct: graded.every(({ caseOk, formOk }) => caseOk && formOk),
                    fields: graded.map(({ caseOk, formOk }) => ({ ok: caseOk && formOk })),
                    // The first miss teaches: a two-blank sentence has two rules,
                    // and the panel has room for one.
                    lesson: lessonFor(firstMiss(graded)),
                };
            },
        };

        /**
         * Both stages of every blank, graded once.
         *
         * One pass, one result. The verdict, the correction panel and the review
         * list are all built from this, so a cell and the sentence explaining it
         * cannot come from two comparisons that happened to agree this time.
         */
        function grade() {
            return item.b.map((blank, index) => {
                const given = answers[index];
                return {
                    blank,
                    index,
                    given,
                    // Case graded on what was named in step one, form on what was
                    // picked in step two, so the correction names the stage that
                    // went wrong rather than one verdict for the pair.
                    caseOk: given.caseKey === blank.c,
                    formOk: normalizePhrase(given.form) === normalizePhrase(blank.a),
                };
            });
        }

        /**
         * The first blank that went wrong, as the correction panel wants it, or
         * `undefined` on a clean verdict.
         *
         * `lessonFor` runs on every verdict, so it has to be able to cope with
         * there being no miss. `item` and `index` travel with it because the
         * preposition kata's panel reads the sentence to name the preposition the
         * blank sits behind; the case kata's panel needs neither.
         */
        function firstMiss(graded) {
            const miss = graded.find(({ caseOk, formOk }) => !caseOk || !formOk);
            if (!miss) return undefined;
            const { blank, index, given, caseOk } = miss;
            return { blank, index, item, given, caseOk };
        }

        /**
         * Paints the two stages of each graded row. The picked control is marked
         * as picked, and the one the blank wanted is marked right beside it, the
         * way the noun kata marks the gender it meant: a wrong pick with no right
         * one next to it teaches nothing.
         *
         * Reads the verdicts it is handed rather than comparing again, so what a
         * cell shows and what the panel explains are the same finding.
         */
        function markReview(graded) {
            Array.from(dom.review.children).forEach((row, index) => {
                const { caseOk, formOk } = graded[index];
                // The row is [label, caseCell, label, formCell], and painting
                // reads the cells rather than trusting their position in the row.
                const cells = Array.from(row.children).filter((node) => node.classList.contains('pick-review-cell'));
                const [caseCell, formCell] = cells;

                markControl(caseCell.children[0], { ok: caseOk, inside: true, note: false });
                markControl(formCell.children[0], { ok: formOk, inside: true, note: false });
                // The wanted control is the second child, present only on a miss.
                if (formCell.children[1]) markControl(formCell.children[1], { ok: true, inside: true, note: false });
                if (caseCell.children[1]) markControl(caseCell.children[1], { ok: true, inside: true, note: false });
            });
        }
    };
}