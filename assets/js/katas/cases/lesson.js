// katas/cases/lesson.js
// Why a case blank was wrong: the case the dataset entry claims, its whole
// article row, and the case the learner slipped into when that is unambiguous.
// Pure, so it stays unit testable and touches no DOM.

import { CASE_LABELS, determinerCases } from '../../services/grammar.js';
import { caseNote, lesson } from '../../services/lesson.js';

/**
 * @param blank the dataset blank that was missed, so its claimed case is the rule
 * @param given what the learner typed, read only to name the case they reached for
 * @param expected the answer, already shown beside the input
 * @returns {import('../../services/lesson.js').Lesson|null}
 */
export function renderCaseLesson({ blank, given, expected } = {}) {
    const note = caseNote(blank?.c);
    if (!note) return null;

    // Only a form that belongs to exactly one object case can be pinned down.
    // "den" belongs to two, so the correction stays with the case it does know.
    const slipped = determinerCases(given);
    const slip = slipped.length === 1
        ? ` You wrote "${String(given).trim()}", which is ${CASE_LABELS[slipped[0]]}.`
        : '';

    return lesson(expected, `${note}.${slip}`);
}
