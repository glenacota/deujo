// katas/factories/trigger.js
// The word in a `{n}` sentence that step one asks about: the preposition, or for the case kata the noun.

import { PREPOSITION_GROUPS, normalizePhrase } from '../../services/grammar.js';

const PREPOSITIONS = new Set(Object.values(PREPOSITION_GROUPS).flat());

const PUNCTUATION = /[.,;:?!]+$/;

// Case-preserving: the prompt quotes it back to the learner.
function wordBefore(sentence, index) {
    const head = String(sentence ?? '').split(`{${index}}`)[0].trim();
    if (!head) return null;
    return head.split(/\s+/).at(-1).replace(PUNCTUATION, '') || null;
}

function wordAfter(sentence, index) {
    const tail = String(sentence ?? '').split(`{${index}}`)[1]?.trim();
    if (!tail) return null;
    return tail.split(/\s+/)[0].replace(PUNCTUATION, '') || null;
}

export function prepositionBefore(sentence, index) {
    const word = wordBefore(sentence, index);
    return PREPOSITIONS.has(normalizePhrase(word)) ? word : null;
}

// Read from the sentence, never the answer, so asking about it cannot leak the case.
export function nounAfter(sentence, index) {
    return wordAfter(sentence, index);
}