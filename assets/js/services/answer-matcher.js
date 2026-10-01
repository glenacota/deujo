// services/answer-matcher.js
// One place that decides whether a typed answer is right. A blank can have more
// than one correct answer, so grading never compares a single string.
//
// Three kinds of alternative exist, and a blank may use all of them at once:
//   - spelling variants the grammar service derives ("zum" <-> "zu dem")
//   - a dataset `alt` list for answers the grammar cannot derive
//   - multi-word answers: the learner may type "der Mann" where the blank holds
//     only "der", so the extra words in the sentence are accepted too
//
// No DOM here, so it stays unit testable.

import { normalizePhrase, prepositionSpellings } from './grammar.js';

/** Derives the grammar-based alternatives for one answer. */
const deriveSpellings = (answer) => prepositionSpellings(answer);

/** A dataset answer is either a plain string or `{ a, alt }`; both are read here. */
const toBlank = (answer) => (typeof answer === 'string' ? { a: answer } : answer ?? {});

/**
 * Every answer that counts as correct for one blank, normalised and without
 * duplicates. The dataset's own answer comes first so it stays the one shown.
 * @param {string|{a?: string, alt?: string[]}} answer
 * @returns {string[]}
 */
export function acceptedAnswers(answer) {
    const blank = toBlank(answer);
    const primary = normalizePhrase(blank.a);
    const listed = Array.isArray(blank.alt) ? blank.alt.map(normalizePhrase) : [];
    const all = [primary, ...deriveSpellings(blank.a), ...listed].filter(Boolean);
    return [...new Set(all)];
}

/**
 * Grades one blank.
 * @param {string} given raw input from the learner
 * @param {string|{a?: string, alt?: string[]}} answer the dataset answer
 * @param {{allowExtraWords?: boolean}} [options] when true, "der Mann" answers a
 *   blank whose answer is "der", so a whole-phrase answer is still right
 * @returns {{ok: boolean, accepted: string[]}}
 */
export function matchAnswer(given, answer, { allowExtraWords = false } = {}) {
    const accepted = acceptedAnswers(answer);
    const typed = normalizePhrase(given);
    if (!typed) return { ok: false, accepted };

    const ok = accepted.includes(typed)
        || (allowExtraWords && accepted.some((candidate) => isAnswerPlusOneWord(typed, candidate)));

    return { ok, accepted };
}

/**
 * True when `typed` is the answer plus exactly one extra word at either end, so
 * the noun that sits in the sentence may be typed along with its article:
 * "der" answers "der Mann", but "der große Mann" is a different answer.
 */
function isAnswerPlusOneWord(typed, answer) {
    if (!answer) return false;
    const typedWords = typed.split(' ');
    const answerWords = answer.split(' ');
    if (typedWords.length !== answerWords.length + 1) return false;

    const withoutFirst = typedWords.slice(1).join(' ');
    const withoutLast = typedWords.slice(0, -1).join(' ');
    return withoutFirst === answer || withoutLast === answer;
}

/**
 * The accepted answers as one short string, for the note shown next to a wrong
 * control. Capped, because the note sits in a nowrap badge beside the input and
 * must not push the sentence apart on a phone.
 * @param {string[]} accepted
 * @param {number} [max]
 */
export function formatAccepted(accepted, max = 3) {
    const list = Array.isArray(accepted) ? accepted.filter(Boolean) : [];
    if (list.length <= max) return list.join(' / ');
    return `${list.slice(0, max).join(' / ')} / +${list.length - max}`;
}
