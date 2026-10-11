// katas/factories/picker-kata.js
// Engine for the two-stage picker katas: step one names the case, step two picks the determiner.
// One blank is open at a time (a phone has one column); any blank can be reopened out of order.

import { createSectionFromTemplate } from '../../platform/dom/template.js';
import { renderPickSentence, setSlot } from '../../platform/dom/pick-sentence.js';
import { markControl } from '../../platform/dom/answer-marking.js';
import { digitiseOptions, optionForDigit } from '../../platform/dom/option-digits.js';
import { CASE_LABELS, determinerBelongsTo, hasOrderedBlankPlaceholders, normalizePhrase } from '../../services/grammar.js';
import { determinerOptions, OPTION_ROW_SIZE } from '../../services/determiner-options.js';
import { assertDataset, hasCoreFields } from '../dataset-rules.js';

// "Finish", not "answer": a case picked with no form is not yet checkable.
const NOT_READY = 'Finish every blank before checking.';

const Step = Object.freeze({ CASE: 'case', FORM: 'form', DONE: 'done' });

// A disabled review chip is not a `.kata-option`: no tap target or hover. `[data-answer-state]` still colours it.
const VALUE_CLASS = 'pick-value';

// Disjoint ranges: both rows are on screen at once, so each digit must name exactly one button.
const DIGITS = Object.freeze({
    [Step.CASE]: 1,
    [Step.FORM]: 1 + OPTION_ROW_SIZE,
});

/**
 * A form that cannot be shown as a button is an unanswerable blank, so it fails
 * here rather than as a missing option.
 *
 * @param cases the case keys this kata allows
 * @param entryRule (item) => boolean, this kata's own extra per-entry rule
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
                // `alt` widens a typed answer; a picker cannot show a second spelling.
                && blank.alt === undefined
                && determinerBelongsTo(blank?.a, blank.c));

        if (!ok) throw new Error(describeProblem(index));
    });
}

/**
 * @param prompt (item, blank, index) -> step one's question. Reads the sentence
 *   only, never `blank.c`, or it would print the answer.
 * @param lessonFor (miss) -> `Lesson` or null. Runs on every verdict, so `miss`
 *   may be undefined.
 * @param entryRule (item) -> boolean, extra per-entry dataset rule
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
        let item = null;
        let answers = [];
        let slots = [];
        let open = 0;
        let step = Step.CASE;
        let checked = false;

        const section = createSectionFromTemplate(template);
        container.appendChild(section);

        const dom = {
            sentence: section.querySelector('[data-role="sentence"]'),
            translation: section.querySelector('[data-role="translation"]'),
            steps: section.querySelector('[data-role="steps"]'),
            prompt: section.querySelector('[data-role="prompt"]'),
            promptForm: section.querySelector('[data-role="prompt-form"]'),
            stageCase: section.querySelector('[data-role="stage-case"]'),
            caseChip: section.querySelector('[data-role="case-chip"]'),
            stageForm: section.querySelector('[data-role="stage-form"]'),
            review: section.querySelector('[data-role="review"]'),
        };

        // Namespaced ids: every kata is mounted at boot, so shared ids would aim
        // `aria-describedby` at the first kata's prompt.
        dom.prompt.id = `${manifest.id}-prompt`;
        dom.promptForm.id = `${manifest.id}-prompt-form`;
        dom.stageCase.setAttribute('aria-describedby', dom.prompt.id);
        dom.stageForm.setAttribute('aria-describedby', dom.promptForm.id);

        // Rebuilt per blank: a stale button would offer a form this sentence cannot take.
        const buildRow = (host, values, onPick, firstDigit) => {
            host.textContent = '';
            const fragment = document.createDocumentFragment();
            values.forEach((value) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.value = String(value);
                button.className = 'kata-option';
                button.setAttribute('aria-pressed', 'false');
                button.textContent = String(value);
                button.addEventListener('click', () => onPick(String(value)));
                fragment.appendChild(button);
            });
            host.appendChild(fragment);
            digitiseOptions(host.children, firstDigit);
            return Array.from(host.children);
        };

        const pressCase = (chosen) => Array.from(dom.stageCase.children)
            .forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.value === chosen)));

        const showFormsFor = (index) => {
            const buttons = buildRow(
                dom.stageForm,
                determinerOptions(item.b[index]),
                (form) => pickForm(form),
                DIGITS[Step.FORM],
            );
            buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.value === answers[index].form)));
        };

        function goTo(index) {
            open = index;
            dom.steps.hidden = false;
            dom.review.hidden = true;
            dom.review.textContent = '';
            if (answers[index].caseKey) {
                step = Step.FORM;
                showFormsFor(index);
            } else {
                step = Step.CASE;
                buildRow(dom.stageForm, [], () => {}, DIGITS[Step.FORM]);
            }
            paint();
        }

        dom.caseChip.addEventListener('click', () => {
            if (!item || checked) return;
            step = Step.CASE;
            paint();
        });

        function reopen(index) {
            if (!item || checked || !answers[index]) return;
            goTo(index);
        }

        function paint() {
            slots.forEach((slot, index) => setSlot(slot, answers[index]?.form, index === open));

            dom.prompt.textContent = prompt(item, item.b[open], open);
            dom.stageCase.hidden = false;
            // Own label, or the form row reads as four more cases.
            dom.stageForm.hidden = step !== Step.FORM;
            dom.promptForm.hidden = step !== Step.FORM;
            pressCase(CASE_LABELS[answers[open]?.caseKey] ?? '');
            // On a phone the chosen case folds into a chip, freeing a row for the forms.
            dom.stageCase.dataset.collapsed = String(step === Step.FORM);
            dom.caseChip.hidden = step !== Step.FORM;
            const chosen = CASE_LABELS[answers[open]?.caseKey];
            dom.caseChip.textContent = chosen ? `${chosen} ✎` : '';
            dom.caseChip.setAttribute('aria-label', chosen ? `Case: ${chosen}. Change.` : '');
        }

        function settle() {
            // DONE: the buttons are still in the DOM behind the hidden block, so a
            // stray digit would otherwise re-answer a blank.
            step = Step.DONE;
            dom.steps.hidden = true;
            dom.review.hidden = true;
            slots.forEach((slot, index) => setSlot(slot, answers[index].form, false));
        }

        function showReview() {
            // Checking from a reopened blank would otherwise leave the step rows up.
            step = Step.DONE;
            dom.steps.hidden = true;
            dom.review.hidden = false;

            dom.review.textContent = '';
            const fragment = document.createDocumentFragment();
            item.b.forEach((blank, index) => {
                const row = document.createElement('div');
                row.className = 'pick-review-row';
                // Labelled per stage so two rows of bare buttons don't read as a word list.
                row.appendChild(reviewLabel(`Blank ${index + 1} · case`));
                // Each cell carries what the blank wanted, so a wrong case is corrected beside it like a wrong form.
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

        // Its own element: a screen reader reads a bare "form" as content, not as the value's name.
        function reviewLabel(text) {
            const label = document.createElement('span');
            label.className = 'pick-review-label';
            label.textContent = text;
            return label;
        }

        // The wanted value sits beside the pick only when it differs.
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

        function pickCase(label) {
            const caseKey = cases.find((key) => CASE_LABELS[key] === label);
            if (!caseKey) return;
            // A form picked under the old case is no longer an answer to this one.
            if (answers[open].caseKey !== caseKey) answers[open].form = null;
            answers[open].caseKey = caseKey;
            step = Step.FORM;
            showFormsFor(open);
            paint();
        }

        function pickForm(form) {
            answers[open].form = form;
            const next = answers.findIndex((a) => !a.form);
            if (next === -1) {
                settle();
                return;
            }
            goTo(next);
        }

        return {
            ...manifest,
            validateDataset: (dataset) => validatePickerDataset(dataset, describeProblem, cases, entryRule),
            // The section is the whole public surface; `registry.js` checks for it.
            el: { section },

            getHelpContent() {
                return help();
            },

            /** @returns {boolean} false when no option carries the digit, so the key stays with the page */
            pickOption(digit) {
                if (!item || step === Step.DONE) return false;

                // A digit from the other stage is refused: both rows are on screen, so `3` must mean one button.
                const host = step === Step.FORM ? dom.stageForm : dom.stageCase;
                const button = optionForDigit(host.children, digit, DIGITS[step]);
                if (!button) return false;

                button.click();
                return true;
            },

            render(next) {
                item = next;
                answers = (next?.b ?? []).map(() => ({ caseKey: null, form: null }));
                slots = renderPickSentence(dom, next, reopen);
                open = 0;
                step = Step.CASE;
                checked = false;
                dom.steps.hidden = false;
                dom.review.hidden = true;
                dom.review.textContent = '';
                dom.promptForm.hidden = true;

                buildRow(dom.stageCase, cases.map((caseKey) => CASE_LABELS[caseKey]), (label) => pickCase(label), DIGITS[Step.CASE]);
                buildRow(dom.stageForm, [], () => {}, DIGITS[Step.FORM]);
                paint();
            },

            check() {
                if (!item || !answers.length || answers.some((a) => !a.caseKey || !a.form)) {
                    return { warning: NOT_READY };
                }

                const graded = grade();
                checked = true;
                showReview();
                markReview(graded);

                return {
                    correct: graded.every(({ caseOk, formOk }) => caseOk && formOk),
                    fields: graded.map(({ caseOk, formOk }) => ({ ok: caseOk && formOk })),
                    // The first miss teaches: a two-blank sentence has two rules and the panel has room for one.
                    lesson: lessonFor(firstMiss(graded)),
                };
            },
        };

        // One pass: verdict, correction panel and review list all read this, so they cannot disagree.
        function grade() {
            return item.b.map((blank, index) => {
                const given = answers[index];
                return {
                    blank,
                    index,
                    given,
                    // Graded per stage so the correction names the stage that went wrong.
                    caseOk: given.caseKey === blank.c,
                    formOk: normalizePhrase(given.form) === normalizePhrase(blank.a),
                };
            });
        }

        // `item` and `index` travel with the miss because the preposition lesson reads the sentence.
        function firstMiss(graded) {
            const miss = graded.find(({ caseOk, formOk }) => !caseOk || !formOk);
            if (!miss) return undefined;
            const { blank, index, given, caseOk } = miss;
            return { blank, index, item, given, caseOk };
        }

        // Marks the wanted control beside a wrong pick; reads `graded` rather than re-comparing.
        function markReview(graded) {
            Array.from(dom.review.children).forEach((row, index) => {
                const { caseOk, formOk } = graded[index];
                // The row is [label, caseCell, label, formCell]; select cells by class, not position.
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