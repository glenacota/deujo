// katas/nouns/kata.js

import { createSectionFromTemplate } from '../../platform/dom/template.js';
import { acceptedAnswers, matchAnswer } from '../../services/answer-matcher.js';
import { markControl } from '../../platform/dom/answer-marking.js';
import { digitiseOptions, optionForDigit } from '../../platform/dom/option-digits.js';
import { assertDataset, hasAltList, hasCoreFields } from '../dataset-rules.js';
import { nounsManifest } from './manifest.js';
import { renderNounHelp } from './help.js';
import { renderNounLesson } from './lesson.js';
import { nounsTemplate } from './template.js';

export function validateNounDataset(dataset) {
    assertDataset(dataset);

    dataset.forEach((noun, index) => {
        const validGender = ['der', 'die', 'das'].includes(noun?.g);
        // A plural is a string or `{a, alt}`; an empty string means the noun has no plural.
        const validPlural = typeof noun?.p === 'string'
            || (noun?.p && typeof noun.p === 'object'
                && typeof noun.p.a === 'string'
                && hasAltList(noun.p.alt));

        if (!hasCoreFields(noun) || !validGender || !validPlural) {
            throw new Error(`entry ${index} must contain non-empty w and m strings, string or {a, alt} p, and valid g`);
        }
    });
}

// app.css paints the pressed state from aria-pressed.
function setGenderActive(btn, active) {
    btn.setAttribute('aria-pressed', String(active));
}

export function createNounKata(container) {
    let gender = null;

    const section = createSectionFromTemplate(nounsTemplate);
    container.appendChild(section);

    const el = {
        section,
        word: section.querySelector('[data-role="word"]'),
        meaning: section.querySelector('[data-role="meaning"]'),
        plural: section.querySelector('[data-role="plural"]'),
        genderButtons: Array.from(section.querySelectorAll('[data-role="gender"]')),
    };

    el.genderButtons.forEach((btn) => btn.addEventListener('click', () => {
        gender = btn.dataset.gender;
        el.genderButtons.forEach((b) => setGenderActive(b, b.dataset.gender === gender));
    }));
    digitiseOptions(el.genderButtons);

    return {
        ...nounsManifest,
        validateDataset: validateNounDataset,
        el,

        getHelpContent() {
            return renderNounHelp();
        },

        // Returns false when no gender carries the digit, so the key stays with the page.
        pickOption(digit) {
            const button = optionForDigit(el.genderButtons, digit);
            if (!button) return false;
            button.click();
            return true;
        },

        render(noun) {
            gender = null;
            el.word.textContent = noun.w;
            el.meaning.textContent = `🇬🇧 ${noun.m}`;
            el.plural.value = '';

            const hasPlural = Boolean(noun.p);
            el.plural.disabled = !hasPlural;
            el.plural.placeholder = hasPlural ? 'e.g. Kinder' : 'no plural';

            el.genderButtons.forEach((btn) => setGenderActive(btn, false));
        },

        check(noun) {
            if (!gender) return { warning: 'Please select a gender (der, die, or das).' };

            const userPlural = el.plural.value.trim();
            const hasNoPlural = !noun.p;
            const genderOk = gender === noun.g;
            // The article is optional in the input.
            const pluralOk = hasNoPlural
                || matchAnswer(userPlural, noun.p, { allowExtraWords: true }).ok;

            const genderButtonsByValue = new Map(el.genderButtons.map((btn) => [btn.dataset.gender, btn]));
            markControl(genderButtonsByValue.get(gender), { ok: genderOk, inside: true, note: false });
            if (!genderOk) markControl(genderButtonsByValue.get(noun.g), { ok: true, inside: true });

            const pluralAnswer = hasNoPlural ? 'no plural' : `die ${acceptedAnswers(noun.p)[0]}`;
            markControl(el.plural, { ok: pluralOk, expected: pluralAnswer });

            // A wrong gender outranks a wrong plural: the plural rules depend on it.
            const lesson = !genderOk
                ? renderNounLesson({ noun, field: 'gender', expected: noun.g })
                : !pluralOk
                    ? renderNounLesson({ noun, field: 'plural', expected: pluralAnswer })
                    : null;

            return {
                correct: genderOk && pluralOk,
                fields: [{ ok: genderOk }, { ok: pluralOk }],
                lesson,
            };
        },
    };
}
