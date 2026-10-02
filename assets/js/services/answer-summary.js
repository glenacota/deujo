// services/answer-summary.js
// Pure grading-to-display logic. No DOM here, so it stays unit testable.

export const VERDICT_TONE = Object.freeze({
    correct: 'correct',
    wrong: 'wrong',
    warning: 'warning',
});

const ICONS = {
    [VERDICT_TONE.correct]: '✅',
    [VERDICT_TONE.wrong]: '❌',
    [VERDICT_TONE.warning]: '⚠️',
};

/**
 * Turns a kata's `check()` result into everything the verdict panel needs.
 * @param {{correct?: boolean, fields?: {ok: boolean}[]}|null} result
 */
export function summarizeAnswer(result) {
    const fields = Array.isArray(result?.fields) ? result.fields : [];
    const wrong = fields.filter((field) => !field.ok);
    const correct = Boolean(result?.correct) && wrong.length === 0;

    return {
        tone: correct ? VERDICT_TONE.correct : VERDICT_TONE.wrong,
        icon: ICONS[correct ? VERDICT_TONE.correct : VERDICT_TONE.wrong],
        title: correct
            ? 'Correct!'
            : wrong.length > 1
                ? `${wrong.length} wrong answers.`
                : 'Wrong answer.',
        detail: correct
            ? 'Well done.'
            : 'Review, learn, and continue.',
    };
}

/**
 * A blocking complaint (empty field, missing choice) is not an answer: it gets
 * an amber panel, no grading, and never advances on its own. "—", so a missing
 * message never renders as an empty title.
 * @param {string} message
 */
export function summarizeWarning(message) {
    return {
        tone: VERDICT_TONE.warning,
        icon: ICONS[VERDICT_TONE.warning],
        title: String(message ?? '').trim() || '—',
        detail: '',
    };
}
