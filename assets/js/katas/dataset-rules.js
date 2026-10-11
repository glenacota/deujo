// katas/dataset-rules.js
// Field-level checks shared by every kata's validator; each kata keeps its own schema rule and message.

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

/** `sentence` also requires `s`, which only the blank katas render. */
export function hasCoreFields(entry, { sentence = false } = {}) {
    return Boolean(entry)
        && isNonEmptyString(entry.id)
        && isNonEmptyString(entry.w)
        && isNonEmptyString(entry.m)
        && (!sentence || isNonEmptyString(entry.s));
}

/** `alt` is optional, but an empty or non-string entry would make the blank unsatisfiable. */
export function hasAltList(alt) {
    return alt === undefined
        || (Array.isArray(alt) && alt.every((value) => isNonEmptyString(value)));
}

/** `isValidAnswer` also runs on every `alt`, so an alternative can never be looser than the primary. */
export function hasValidBlanks(blanks, isValidAnswer) {
    return Array.isArray(blanks)
        && blanks.length > 0
        && blanks.every((blank) => isNonEmptyString(blank?.a)
            && isValidAnswer(blank)
            && hasAltList(blank?.alt)
            && (blank.alt ?? []).every((alt) => isValidAnswer({ a: alt, c: blank.c })));
}
