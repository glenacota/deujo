// katas/cases/lesson.js
// Why a case blank was wrong.

import { CASE_LABELS, determinerCases } from '../../services/grammar.js';
import { caseNote, lesson } from '../../services/lesson.js';

/**
 * @param blank the dataset blank that was missed, so its claimed case is the rule
 * @param given what the learner picked, `{caseKey, form}`
 * @param caseOk whether step one was right, which decides which of the two
 *   mistakes this panel explains
 * @returns {import('../../services/lesson.js').Lesson|null}
 */
export function renderCaseLesson({ blank, given, caseOk } = {}) {
    const note = caseNote(blank?.c);
    if (!note) return null;

    // A wrong case is the finding. Correcting the ending alone would leave the
    // learner exactly where they started.
    if (caseOk === false) {
        const named = CASE_LABELS[given?.caseKey] ?? 'another case';
        return lesson(blank.a, `${note}. You named ${named}, but this blank is ${CASE_LABELS[blank.c]}.`);
    }

    // Only a form that belongs to exactly one object case can be pinned down.
    // "den" belongs to two, so the correction stays with the case it does know.
    const slipped = determinerCases(given?.form);
    const slip = slipped.length === 1
        ? ` "${String(given?.form).trim()}" is ${CASE_LABELS[slipped[0]]}; this blank is ${CASE_LABELS[blank.c]}.`
        : '';

    return lesson(blank.a, `${note}.${slip}`);
}