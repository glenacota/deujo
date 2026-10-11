// katas/prepositions/kata.js
// Prepositions: name the case the preposition governs, then pick the determiner
// that case and the noun's gender produce.

import { CASE_LABELS, prepositionRection } from '../../services/grammar.js';
import { createPickerKata, validatePickerDataset } from '../factories/picker-kata.js';
import { pickerTemplate } from '../factories/picker-template.js';
import { prepositionBefore } from '../factories/trigger.js';
import { prepositionsManifest } from './manifest.js';
import { renderPrepositionHelp } from './help.js';
import { renderPrepositionLesson } from './lesson.js';

// A preposition governs no Nominativ, so step one offers no Nominativ: a button
// that could never be right is a button that only teaches a wrong answer.
const CASES = Object.keys(CASE_LABELS).filter((caseKey) => caseKey !== 'nom');

const describeProblem = (index) =>
    `entry ${index} has an invalid sentence, translation, or determiner answers`;

/**
 * Every blank has to sit behind a preposition the sentence actually prints,
 * because step one asks about that preposition by name.
 *
 * Enforced as a dataset rule rather than survived at runtime: a fallback question
 * would be the case kata's, which a learner in this kata cannot tell from the one
 * they should have been asked, and the mistake would read as a wrong answer.
 */
const governedByItsSentence = (item) =>
    Array.isArray(item?.b) && item.b.every((_, index) => prepositionBefore(item?.s, index));

/**
 * Step one, keyed to the preposition already sitting in the sentence.
 *
 * @param item the dataset entry, for its `s`
 * @param blank the blank being answered, for its position only
 * @param index which blank this is, so the right preposition is found
 */
function askCase(item, blank, index) {
    const preposition = prepositionBefore(item?.s, index);

    return prepositionRection(preposition ?? '') === 'two'
        ? `"${preposition}" takes two cases. Which one here?`
        : `"${preposition}" always takes which case?`;
}

export function validatePrepositionDataset(dataset) {
    return validatePickerDataset(dataset, describeProblem, CASES, governedByItsSentence);
}

/** Mounts the preposition kata's section, so `el` is populated for the caller. */
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