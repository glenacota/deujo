// katas/nouns/kata.js
// Self-contained noun kata: elements, local selection state, rendering, validation.

import { createSectionFromTemplate } from '../../services/utility.js';
import { acceptedAnswers, matchAnswer } from '../../services/answer-matcher.js';
import { markControl } from '../../ui/answer-view.js';
import { assertDataset, hasAltList, hasCoreFields } from '../dataset-rules.js';
import { nounsManifest } from './manifest.js';
import { renderNounHelp } from './help.js';
import { renderNounLesson } from './lesson.js';
import { nounsTemplate } from './template.js';

export function validateNounDataset(dataset) {
    assertDataset(dataset);

    dataset.forEach((noun, index) => {
        const validGender = ['der', 'die', 'das'].includes(noun?.g);
        // A plural is a string, or `{a, alt}` when more than one spelling is
        // correct. An empty string still means "this noun has no plural".
        const validPlural = typeof noun?.p === 'string'
            || (noun?.p && typeof noun.p === 'object'
                && typeof noun.p.a === 'string'
                && hasAltList(noun.p.alt));

        if (!hasCoreFields(noun) || !validGender || !validPlural) {
            throw new Error(`entry ${index} must contain non-empty w and m strings, string or {a, alt} p, and valid g`);
        }
    });
}

function setGenderActive(btn, active) {
    btn.setAttribute('aria-pressed', String(active));
    btn.classList.toggle('ring-2', active);
    btn.classList.toggle('ring-indigo-500', active);
    btn.classList.toggle('bg-indigo-100', active);
    btn.classList.toggle('dark:bg-indigo-950/60', active);
}

/** Mounts the noun kata's section, so `el` is populated for the caller. `el` is read-only afterwards: only `gender` changes between items. */
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

    return {
        ...nounsManifest,
        validateDataset: validateNounDataset,
        el,

        /**
         * Answer-blind: the body takes no noun, so it cannot print the word on
         * screen or the plural the answer expects.
         */
        getHelpContent() {
            return renderNounHelp();
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

        /** @returns a verdict `{ correct, fields }`, or `{ warning }` when the answer is not ready to grade. */
        check(noun) {
            if (!gender) return { warning: 'Please select a gender (der, die, or das).' };

            const userPlural = el.plural.value.trim();
            const hasNoPlural = !noun.p;
            const genderOk = gender === noun.g;
            // "p" may be a plain string or {a, alt} for plurals with two
            // accepted spellings, and the article is optional in the input.
            const pluralOk = hasNoPlural
                || matchAnswer(userPlural, noun.p, { allowExtraWords: true }).ok;

            const genderButtonsByValue = new Map(el.genderButtons.map((btn) => [btn.dataset.gender, btn]));
            markControl(genderButtonsByValue.get(gender), { ok: genderOk, inside: true, note: false });
            if (!genderOk) markControl(genderButtonsByValue.get(noun.g), { ok: true, inside: true });

            const pluralAnswer = hasNoPlural ? 'no plural' : `die ${acceptedAnswers(noun.p)[0]}`;
            markControl(el.plural, { ok: pluralOk, expected: pluralAnswer });

            // Gender first, because every plural rule hangs off it: a learner who
            // has the gender wrong cannot use the plural rule yet.
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
