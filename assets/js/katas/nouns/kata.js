// katas/nouns/kata.js

import { acceptedAnswers, matchAnswer } from '../../services/answer-matcher.js';
import { assertDataset, hasAltList, hasCoreFields } from '../dataset-rules.js';
import { createChoiceTextKata } from '../factories/choice-text-kata.js';
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

export function createNounKata(container) {
    return createChoiceTextKata({
        container,
        template: nounsTemplate,
        manifest: nounsManifest,
        validateDataset: validateNounDataset,
        getHelpContent: () => renderNounHelp(),
        choice: { role: 'gender', key: 'gender', elKey: 'genderButtons' },
        text: { role: 'plural', elKey: 'plural' },

        renderText(noun, input) {
            const hasPlural = Boolean(noun.p);
            input.disabled = !hasPlural;
            input.placeholder = hasPlural ? 'e.g. Kinder' : 'no plural';
        },

        grade(noun, { choice: gender, given }) {
            if (!gender) return { warning: 'Please select a gender (der, die, or das).' };

            const hasNoPlural = !noun.p;
            const choiceOk = gender === noun.g;
            // The article is optional in the input.
            const textOk = hasNoPlural || matchAnswer(given, noun.p, { allowExtraWords: true }).ok;
            const expectedText = hasNoPlural ? 'no plural' : `die ${acceptedAnswers(noun.p)[0]}`;

            // A wrong gender outranks a wrong plural: the plural rules depend on it.
            const lesson = !choiceOk
                ? renderNounLesson({ noun, field: 'gender', expected: noun.g })
                : !textOk
                    ? renderNounLesson({ noun, field: 'plural', expected: expectedText })
                    : null;

            return { choiceOk, textOk, correctChoices: [noun.g], expectedText, lesson };
        },
    });
}
