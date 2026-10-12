// katas/factories/choice-text-kata.js
// Shape: pick one option button, then type a free-text answer.

import { createSectionFromTemplate } from '../../platform/dom/template.js';
import { markControl } from '../../platform/dom/answer-marking.js';
import { digitiseOptions, optionForDigit } from '../../platform/dom/option-digits.js';

/**
 * `choice` and `text` name the template's `data-role`s; `choice.key` is the
 * button's dataset key and `elKey` the name each control takes on `kata.el`.
 * `grade(item, {choice, given})` returns `{warning}` or
 * `{choiceOk, textOk, correctChoices, expectedText, lesson}`.
 */
export function createChoiceTextKata({
    container, template, manifest, validateDataset, getHelpContent,
    choice, text, renderText, grade,
}) {
    let chosen = null;

    const section = createSectionFromTemplate(template);
    container.appendChild(section);

    const buttons = Array.from(section.querySelectorAll(`[data-role="${choice.role}"]`));
    const input = section.querySelector(`[data-role="${text.role}"]`);
    const el = {
        section,
        word: section.querySelector('[data-role="word"]'),
        meaning: section.querySelector('[data-role="meaning"]'),
        [choice.elKey]: buttons,
        [text.elKey]: input,
    };

    // app.css paints the pressed state from aria-pressed.
    const select = (value) => {
        chosen = value;
        buttons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset[choice.key] === value)));
    };

    buttons.forEach((btn) => btn.addEventListener('click', () => select(btn.dataset[choice.key])));
    digitiseOptions(buttons);

    const buttonFor = (value) => buttons.find((btn) => btn.dataset[choice.key] === value);

    return {
        ...manifest,
        validateDataset,
        el,
        getHelpContent,

        // Returns false when no button carries the digit, so the key stays with the page.
        pickOption(digit) {
            const button = optionForDigit(buttons, digit);
            if (!button) return false;
            button.click();
            return true;
        },

        render(item) {
            select(null);
            el.word.textContent = item.w;
            el.meaning.textContent = `🇬🇧 ${item.m}`;
            input.value = '';
            renderText?.(item, input);
        },

        check(item) {
            const verdict = grade(item, { choice: chosen, given: input.value.trim() });
            if (verdict.warning) return { warning: verdict.warning };

            const { choiceOk, textOk, correctChoices, expectedText, lesson } = verdict;
            markControl(buttonFor(chosen), { ok: choiceOk, inside: true, note: false });
            if (!choiceOk) {
                for (const value of correctChoices) markControl(buttonFor(value), { ok: true, inside: true });
            }
            markControl(input, { ok: textOk, expected: expectedText });

            return {
                correct: choiceOk && textOk,
                fields: [{ ok: choiceOk }, { ok: textOk }],
                lesson,
            };
        },
    };
}
