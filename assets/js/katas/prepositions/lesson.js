// katas/prepositions/lesson.js

import { CASE_LABELS, prepositionRection } from '../../services/grammar.js';
import { articleRow, lesson } from '../../services/lesson.js';
import { prepositionBefore } from '../factories/trigger.js';

// Article rows come from grammar.js, so a correction cannot quote a form it doesn't hold.
const GROUP_RULES = {
    akk: `always this case, never a choice. ${articleRow('akk')}`,
    dat: `always this case, never a choice. ${articleRow('dat')}`,
    gen: `always this case, and the noun after it usually ends in -s or -es, which is the signal for des or eines. ${articleRow('gen')}`,
    two: 'the one group that decides for itself: Dativ where something stays (auf dem Tisch), Akkusativ towards it (auf den Tisch). Read the verb, not the preposition.',
};

/** @returns {import('../../services/lesson.js').Lesson|null} */
export function renderPrepositionLesson({ blank, given, caseOk, index, item } = {}) {
    const preposition = prepositionBefore(item?.s, index);
    const group = prepositionRection(preposition ?? '');
    if (!group || !blank?.c) return null;

    // A wrong case is the finding; correcting only the ending would leave the learner where they started.
    if (caseOk === false) {
        const named = CASE_LABELS[given?.caseKey] ?? 'another case';
        const label = CASE_LABELS[group] ?? (group === 'two' ? 'Two-way preposition' : '');
        return lesson(blank.a, `${label} for "${preposition}". You named ${named}, but it is ${CASE_LABELS[blank.c]}.`);
    }

    const label = CASE_LABELS[group] ?? (group === 'two' ? 'Two-way preposition' : '');
    return lesson(blank.a, `${label}: ${GROUP_RULES[group]}`);
}