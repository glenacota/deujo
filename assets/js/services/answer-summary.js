// services/answer-summary.js

// Keyed by tone; `ui-controller.js` owns the class list and hover hint for each.
const ICONS = {
    correct: '✅',
    wrong: '❌',
    warning: '⚠️',
};

/** @param {{correct?: boolean, fields?: {ok: boolean}[]}|null} result a kata's `check()` result */
export function summarizeAnswer(result) {
    const fields = Array.isArray(result?.fields) ? result.fields : [];
    const wrong = fields.filter((field) => !field.ok);
    const correct = Boolean(result?.correct) && wrong.length === 0;

    return {
        tone: correct ? 'correct' : 'wrong',
        icon: ICONS[correct ? 'correct' : 'wrong'],
        title: correct
            ? 'Correct!'
            : wrong.length > 1
                ? `${wrong.length} wrong answers.`
                : 'Wrong answer.',
        detail: correct
            ? 'Well done.'
            : 'Review, learn, and continue.',
        // Passed through from the kata, which owns the grammar; a correct answer carries none.
        lesson: correct ? null : (result?.lesson ?? null),
    };
}

/** A blocking complaint (empty field, missing choice) is not an answer: no grading, never advances. */
export function summarizeWarning(message) {
    return {
        tone: 'warning',
        icon: ICONS.warning,
        title: String(message ?? '').trim() || '—',
        detail: '',
        lesson: null,
    };
}
