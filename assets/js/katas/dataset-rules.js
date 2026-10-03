// katas/dataset-rules.js
// The dataset checks that every kata shares. Each kata keeps its own schema rule
// and its own error message; the field-level plumbing lives here so four
// validators cannot drift apart on what a usable entry means.
//
// Every one of these is pure, so a validator stays unit testable without a DOM.

/** Non-empty after trimming: what every required field is checked for. */
export function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '';
}

/** Rejects anything that is not a non-empty array, before an entry is read. */
export function assertDataset(dataset) {
    if (!Array.isArray(dataset) || dataset.length === 0) {
        throw new Error('dataset must be a non-empty array');
    }
}

/**
 * The fields every kata entry carries: an id, the word, and its translation.
 * `sentence` also requires the `s` sentence, which only the blank katas render.
 */
export function hasCoreFields(entry, { sentence = false } = {}) {
    return Boolean(entry)
        && isNonEmptyString(entry.id)
        && isNonEmptyString(entry.w)
        && isNonEmptyString(entry.m)
        && (!sentence || isNonEmptyString(entry.s));
}

/**
 * `alt` is optional, but when present every entry must be a real answer string,
 * or the learner can never satisfy the blank.
 */
export function hasAltList(alt) {
    return alt === undefined
        || (Array.isArray(alt) && alt.every((value) => isNonEmptyString(value)));
}

/**
 * The `b` blank list the sentence katas share. `isValidAnswer(blank)` is the
 * kata's own rule, applied to the primary answer and to every `alt` as well, so
 * an alternative answer can never be looser than the answer it accompanies.
 */
export function hasValidBlanks(blanks, isValidAnswer) {
    return Array.isArray(blanks)
        && blanks.length > 0
        && blanks.every((blank) => isNonEmptyString(blank?.a)
            && isValidAnswer(blank)
            && hasAltList(blank?.alt)
            && (blank.alt ?? []).every((alt) => isValidAnswer({ a: alt, c: blank.c })));
}