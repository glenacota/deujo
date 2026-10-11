// katas/prepositions/kata.js

import { CASE_LABELS, prepositionRection } from '../../services/grammar.js';
import { createPickerKata, validatePickerDataset } from '../factories/picker-kata.js';
import { pickerTemplate } from '../factories/picker-template.js';
import { prepositionBefore } from '../factories/trigger.js';
import { prepositionsManifest } from './manifest.js';
import { renderPrepositionHelp } from './help.js';
import { renderPrepositionLesson } from './lesson.js';

// No preposition governs Nominativ, so offering it would be a button that can only teach a wrong answer.
const CASES = Object.keys(CASE_LABELS).filter((caseKey) => caseKey !== 'nom');

const describeProblem = (index) =>
    `entry ${index} has an invalid sentence, translation, or determiner answers`;

/**
 * A dataset rule rather than a runtime fallback: the fallback question would be the
 * case kata's, which a learner cannot tell apart and would read as a wrong answer.
 */
const governedByItsSentence = (item) =>
    Array.isArray(item?.b) && item.b.every((_, index) => prepositionBefore(item?.s, index));

function askCase(item, blank, index) {
    const preposition = prepositionBefore(item?.s, index);

    return prepositionRection(preposition ?? '') === 'two'
        ? `"${preposition}" takes two cases. Select the one used here`
        : `Select the case "${preposition}" takes`;
}

export function validatePrepositionDataset(dataset) {
    return validatePickerDataset(dataset, describeProblem, CASES, governedByItsSentence);
}

export const createPrepositionKata = (container) => createPickerKata({
    manifest: prepositionsManifest,
    template: pickerTemplate(),
    help: renderPrepositionHelp,
    prompt: askCase,
    cases: CASES,
    lessonFor: renderPrepositionLesson,
    describeProblem,
    entryRule: governedByItsSentence,
})(container);