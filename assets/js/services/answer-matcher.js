// services/answer-matcher.js

import { normalizePhrase, prepositionSpellings } from './grammar.js';

/** A dataset answer is either a plain string or `{ a, alt }`; both are read here. */
const toBlank = (answer) => (typeof answer === 'string' ? { a: answer } : answer ?? {});

/** Normalised and duplicate-free; the dataset's own answer comes first because it is the one shown. */
export function acceptedAnswers(answer) {
    const blank = toBlank(answer);
    const primary = normalizePhrase(blank.a);
    const listed = Array.isArray(blank.alt) ? blank.alt.map(normalizePhrase) : [];
    const all = [primary, ...prepositionSpellings(blank.a), ...listed].filter(Boolean);
    return [...new Set(all)];
}

/** `allowExtraWords` lets "der Mann" answer a blank holding only "der". */
export function matchAnswer(given, answer, { allowExtraWords = false } = {}) {
    const accepted = acceptedAnswers(answer);
    const typed = normalizePhrase(given);
    if (!typed) return { ok: false, accepted };

    const ok = accepted.includes(typed)
        || (allowExtraWords && accepted.some((candidate) => isAnswerPlusOneWord(typed, candidate)));

    return { ok, accepted };
}

/** Exactly one extra word at either end: "der Mann" matches "der", "der große Mann" does not. */
function isAnswerPlusOneWord(typed, answer) {
    if (!answer) return false;
    const typedWords = typed.split(' ');
    const answerWords = answer.split(' ');
    if (typedWords.length !== answerWords.length + 1) return false;

    const withoutFirst = typedWords.slice(1).join(' ');
    const withoutLast = typedWords.slice(0, -1).join(' ');
    return withoutFirst === answer || withoutLast === answer;
}
