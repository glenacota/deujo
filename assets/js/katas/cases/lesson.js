// katas/cases/lesson.js

import { CASE_LABELS, determinerCases } from '../../services/grammar.js';
import { caseNote, lesson } from '../../services/lesson.js';

/** @returns {import('../../services/lesson.js').Lesson|null} */
export function renderCaseLesson({ blank, given, caseOk } = {}) {
    const note = caseNote(blank?.c);
    if (!note) return null;

    // A wrong case is the finding; correcting only the ending would leave the learner where they started.
    if (caseOk === false) {
        const named = CASE_LABELS[given?.caseKey] ?? 'another case';
        return lesson(blank.a, `${note}. You named ${named}, but this blank is ${CASE_LABELS[blank.c]}.`);
    }

    // Only a form that belongs to exactly one case can be pinned down; "den" belongs to two.
    const slipped = determinerCases(given?.form);
    const slip = slipped.length === 1
        ? ` "${String(given?.form).trim()}" is ${CASE_LABELS[slipped[0]]}; this blank is ${CASE_LABELS[blank.c]}.`
        : '';

    return lesson(blank.a, `${note}.${slip}`);
}