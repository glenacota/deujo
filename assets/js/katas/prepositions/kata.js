// katas/prepositions/kata.js
// Prepositions: name the case the preposition governs, then pick the article that
// case takes.

import { CASE_LABELS, prepositionRection } from '../../services/grammar.js';
import { createPickerKata, validatePickerDataset } from '../factories/picker-kata.js';
import { pickerTemplate } from '../factories/picker-template.js';
import { nounAfter, prepositionBefore } from '../factories/trigger.js';
import { prepositionsManifest } from './manifest.js';
import { renderPrepositionHelp } from './help.js';
import { renderPrepositionLesson } from './lesson.js';

// A preposition governs no Nominativ, so step one offers no Nominativ: a button
// that could never be right is a button that only teaches a wrong answer.
const CASES = Object.keys(CASE_LABELS).filter((caseKey) => caseKey !== 'nom');

const describeProblem = (index) =>
    `entry ${index} has an invalid sentence, translation, or determiner answers`;

/**
 * Step one, keyed to the preposition already sitting in the sentence.
 *
 * @param item the dataset entry, for its `s`
 * @param blank the blank being answered, for its position only
 * @param index which blank this is, so the right preposition is found
 */
function askCase(item, blank, index) {
    const preposition = prepositionBefore(item?.s, index);

    if (prepositionRection(preposition ?? '') === 'two') {
        return `Step 1 · "${preposition}" takes two cases. Which one here?`;
    }
    if (preposition) {
        return `Step 1 · "${preposition}" always takes which case?`;
    }

    // No preposition governs this blank, so there is no table to name: ask about
    // the noun instead, which is the case kata's question and is just as
    // answerable from German.
    const noun = nounAfter(item?.s, index);
    return noun
        ? `Step 1 · which case does "${noun}" take here?`
        : 'Step 1 · which case does this blank take?';
}

export function validatePrepositionDataset(dataset) {
    return validatePickerDataset(dataset, describeProblem, CASES);
}

/** Mounts the preposition kata's section, so `el` is populated for the caller. */
export const createPrepositionKata = (container) => createPickerKata({
    manifest: prepositionsManifest,
    template: pickerTemplate('Try it — two steps'),
    help: renderPrepositionHelp,
    prompt: askCase,
    cases: CASES,
    lessonFor: renderPrepositionLesson,
    describeProblem,
})(container);