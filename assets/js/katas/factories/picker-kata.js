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
 * @param lessonFor (miss) -> `Lesson` or null. Runs once per wrong blank.
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

        // The buttons stay in the DOM behind the hidden block, so DONE keeps a stray digit from re-answering a blank.
        function finish() {
            step = Step.DONE;
            dom.steps.hidden = true;
        }

        function settle() {
            finish();
            slots.forEach((slot, index) => setSlot(slot, answers[index].form, false));
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
                // Checking from a reopened blank would otherwise leave the step rows up.
                finish();
                // A slot holds the form only, so it is ok when both stages were; the verdict names the stage that missed.
                graded.forEach(({ index, caseOk, formOk }) => markControl(slots[index], { ok: caseOk && formOk, inside: true }));

                return {
                    correct: graded.every(({ caseOk, formOk }) => caseOk && formOk),
                    fields: graded.map(({ caseOk, formOk }) => ({ ok: caseOk && formOk })),
                    lessons: lessonsFor(graded),
                };
            },
        };

        // One pass: verdict, slot marks and lessons all read this, so they cannot disagree.
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
        function lessonsFor(graded) {
            return graded
                .filter(({ caseOk, formOk }) => !caseOk || !formOk)
                .map(({ blank, index, given, caseOk }) => {
                    const built = lessonFor({ blank, index, item, given, caseOk });
                    // Only a multi-blank sentence needs telling which blank a row is about.
                    return built && (item.b.length > 1 ? { label: `Blank ${index + 1}`, ...built } : built);
                })
                .filter(Boolean);
        }
    };
}