// katas/cases/kata.js
// Case declension: name the case the blank takes, then pick the determiner that case and gender produce.

import { CASE_LABELS } from '../../services/grammar.js';
import { createPickerKata, validatePickerDataset } from '../factories/picker-kata.js';
import { pickerTemplate } from '../factories/picker-template.js';
import { nounAfter } from '../factories/trigger.js';
import { casesManifest } from './manifest.js';
import { renderCaseHelp } from './help.js';
import { renderCaseLesson } from './lesson.js';

const CASES = Object.keys(CASE_LABELS);

const describeProblem = (index) =>
    `entry ${index} has an invalid sentence, translation, or determiner answers`;

/**
 * Step one, asked about the noun standing behind the blank.
 *
 * @param item the dataset entry, for its `s`
 * @param blank the blank being answered
 * @param index which blank this is, so the right noun is found
 */
function askCase(item, blank, index) {
    const noun = nounAfter(item?.s, index);
    return noun
        ? `Which case does "${noun}" take here?`
        : 'Which case does this blank take?';
}

export function validateCaseDataset(dataset) {
    return validatePickerDataset(dataset, describeProblem, CASES);
}

/** Mounts the case kata's section, so `el` is populated for the caller. */
export const createCaseKata = (container) => createPickerKata({
    manifest: casesManifest,
    template: pickerTemplate(),
    // Answer-blind: the body takes no item, so it cannot print the sentence on
    // screen or the case the blank expects.
    help: renderCaseHelp,
    prompt: askCase,
    cases: CASES,
    lessonFor: renderCaseLesson,
    describeProblem,
})(container);