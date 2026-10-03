// katas/prepositions/lesson.js
// Why a preposition blank was wrong: the rection group the phrase belongs to,
// read from `grammar.js`, and the one rule that decides it. A pure function, so
// it stays unit testable and never touches the DOM.

import { CASE_LABELS, prepositionGroup } from '../../services/grammar.js';
import { articleRow, lesson } from '../../services/lesson.js';

// One rule per group, and the article rows are generated, so a correction cannot
// quote a form `grammar.js` does not already hold.
const GROUP_RULES = {
    akk: `always this case, never a choice. ${articleRow('akk')}`,
    dat: `always this case, never a choice. ${articleRow('dat')}`,
    gen: `always this case, and the noun after it usually ends in -s or -es, which is the signal for des or eines. ${articleRow('gen')}`,
    two: 'the one group that decides for itself: Dativ where something stays (auf dem Tisch), Akkusativ towards it (auf den Tisch). Read the verb, not the preposition.',
};

/**
 * @param expected the answer the blank wanted, dataset spelling first
 * @returns {import('../../services/lesson.js').Lesson|null} null when the phrase
 *   has no real preposition, so a kata with bad data teaches nothing
 */
export function renderPrepositionLesson({ expected } = {}) {
    const group = prepositionGroup(expected);
    if (!group) return null;

    const label = CASE_LABELS[group] ?? (group === 'two' ? 'Two-way preposition' : '');
    return lesson(expected, `${label}: ${GROUP_RULES[group]}`);
}
