// katas/prepositions/kata.js
// Prepositions: fill in the preposition together with the article it governs,
// so the case is part of the answer. Mounting, rendering and grading are the
// shared sentence path; only what makes an answer legal and what a mistake
// teaches are declared here.

import {
    CASE_LABELS,
    isPrepositionPhraseInCase,
    normalizePhrase,
} from '../../services/grammar.js';
import { createSentenceKata, validateSentenceDataset } from '../factories/sentence-kata.js';
import { prepositionsManifest } from './manifest.js';
import { renderPrepositionHelp } from './help.js';
import { renderPrepositionLesson } from './lesson.js';
import { prepositionsTemplate } from './template.js';

// A preposition governs no Nominativ, so an answer may never claim it.
const VALID_CASE_NAMES = Object.keys(CASE_LABELS).filter((c) => c !== 'nom');

/**
 * A phrase is a usable answer only if it starts with a real preposition whose
 * determiner belongs to the case the entry claims. Whether that phrase is
 * correct German is the grammar service's judgement, not this kata's.
 */
const isUsableAnswer = ({ a, c } = {}) =>
    VALID_CASE_NAMES.includes(c) && isPrepositionPhraseInCase(normalizePhrase(a), c);

const describeProblem = (index) => `entry ${index} has an invalid sentence, translation, or preposition answers`;

export function validatePrepositionDataset(dataset) {
    validateSentenceDataset(dataset, isUsableAnswer, describeProblem);
}

/** Mounts the preposition kata's section, so `el` is populated for the caller. */
export const createPrepositionKata = (container) => createSentenceKata({
    manifest: prepositionsManifest,
    template: prepositionsTemplate,
    help: renderPrepositionHelp,
    input: {
        // "hinsichtlich des" is the longest answer, so allow for it.
        maxLength: 18,
        size: 12,
        placeholder: 'e.g. zum',
        className: 'blank-input blank-input--inline',
    },
    lessonFor: (miss) => renderPrepositionLesson({ expected: miss?.expected }),
    isUsableAnswer,
    describeProblem,
})(container);
