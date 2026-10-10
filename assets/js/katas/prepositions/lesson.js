// katas/prepositions/lesson.js
// Why a preposition blank was wrong.

import { CASE_LABELS, prepositionRection } from '../../services/grammar.js';
import { articleRow, lesson } from '../../services/lesson.js';
import { prepositionBefore } from '../factories/trigger.js';

// One rule per group, and the article rows are generated, so a correction cannot
// quote a form `grammar.js` does not already hold.
const GROUP_RULES = {
    akk: `always this case, never a choice. ${articleRow('akk')}`,
    dat: `always this case, never a choice. ${articleRow('dat')}`,
    gen: `always this case, and the noun after it usually ends in -s or -es, which is the signal for des or eines. ${articleRow('gen')}`,
    two: 'the one group that decides for itself: Dativ where something stays (auf dem Tisch), Akkusativ towards it (auf den Tisch). Read the verb, not the preposition.',
};

/**
 * @param blank the dataset blank that was missed
 * @param given what the learner picked, `{caseKey, form}`
 * @param caseOk whether step one was right, which decides which rule applies
 * @param index which blank this is, so the right preposition is found in `item.s`
 * @param item the dataset entry, for its sentence
 * @returns {import('../../services/lesson.js').Lesson|null}
 */
export function renderPrepositionLesson({ blank, given, caseOk, index, item } = {}) {
    const preposition = prepositionBefore(item?.s, index);
    const group = prepositionRection(preposition ?? '');
    if (!group || !blank?.c) return null;

    // A wrong case is the finding: the article follows from it, so correcting
    // the ending alone would leave the learner where they started.
    if (caseOk === false) {
        const named = CASE_LABELS[given?.caseKey] ?? 'another case';
        const label = CASE_LABELS[group] ?? (group === 'two' ? 'Two-way preposition' : '');
        return lesson(blank.a, `${label} for "${preposition}". You named ${named}, but it is ${CASE_LABELS[blank.c]}.`);
    }

    const label = CASE_LABELS[group] ?? (group === 'two' ? 'Two-way preposition' : '');
    return lesson(blank.a, `${label}: ${GROUP_RULES[group]}`);
}