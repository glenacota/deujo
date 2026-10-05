// katas/cases/kata.js
// Case declension: fill in the article each blank needs, so the case is part of
// the answer. Mounting, rendering and grading are the shared sentence path; only
// what makes an answer legal and what a mistake teaches are declared here.

import { CASE_LABELS } from '../../services/grammar.js';
import { createSentenceKata, validateSentenceDataset } from '../factories/sentence-kata.js';
import { casesManifest } from './manifest.js';
import { renderCaseHelp } from './help.js';
import { renderCaseLesson } from './lesson.js';
import { casesTemplate } from './template.js';

const VALID_CASE_NAMES = Object.keys(CASE_LABELS);

/** A blank is usable when it names one of the four cases. */
const isUsableAnswer = (blank) => VALID_CASE_NAMES.includes(blank?.c);

const describeProblem = (index) => `entry ${index} has invalid sentence, translation, or blank answers`;

export function validateCaseDataset(dataset) {
    validateSentenceDataset(dataset, isUsableAnswer, describeProblem);
}

/** Mounts the case kata's section, so `el` is populated for the caller. */
export const createCaseKata = (container) => createSentenceKata({
    manifest: casesManifest,
    template: casesTemplate,
    // Answer-blind: the body takes no item, so it cannot print the sentence on
    // screen or the case the blank expects.
    help: renderCaseHelp,
    input: {
        maxLength: 20,
        size: 6,
        className: 'blank-input blank-input--inline blank-input--narrow',
    },
    // The learner may type the article with the noun that follows it
    // ("der Mann"), which is the same answer, not a different one.
    matchOptions: { allowExtraWords: true },
    // The dataset spelling, not the whole answer object, goes on show.
    expectedFor: (blank, accepted) => accepted[0] ?? blank.a,
    lessonFor: renderCaseLesson,
    isUsableAnswer,
    describeProblem,
})(container);