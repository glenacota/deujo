// katas/cases/kata.js

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

/** Asks about the noun behind the blank, not the blank, so step one is answerable from German alone. */
function askCase(item, blank, index) {
    const noun = nounAfter(item?.s, index);
    return noun
        ? `Select the case of "${noun}"`
        : 'Select the case of this blank';
}

export function validateCaseDataset(dataset) {
    return validatePickerDataset(dataset, describeProblem, CASES);
}

export const createCaseKata = (container) => createPickerKata({
    manifest: casesManifest,
    template: pickerTemplate(),
    help: renderCaseHelp,
    prompt: askCase,
    cases: CASES,
    lessonFor: renderCaseLesson,
    describeProblem,
})(container);