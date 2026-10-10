// katas/factories/trigger.js
// The grammatical trigger step one asks about: the word already in the German
// sentence that settles which case a blank takes.
//
// For a preposition that word is the preposition itself, sitting in the
// sentence. For the case kata there is no preposition, so the trigger is the
// noun whose case is in question — the word the determiner in front of it
// belongs to. Naming it is what makes step one answerable from German alone:
// "dem Gast" asks about *Gast*, and a learner reads that noun's role, not the
// English.
//
// Pure string work over a `{n}` sentence, so it stays unit testable.

import { PREPOSITION_GROUPS, normalizePhrase } from '../../services/grammar.js';

/** Every preposition the grammar tables know, so a lookup is one pass. */
const PREPOSITIONS = new Set(Object.values(PREPOSITION_GROUPS).flat());

/** Sentence-final punctuation, stripped off the noun a blank stands in front of. */
const PUNCTUATION = /[.,;:?!]+$/;

/**
 * The word before the `{index}` placeholder, or null when the blank opens the
 * sentence. Case-preserving: it is quoted back to the learner in the prompt.
 */
function wordBefore(sentence, index) {
    const head = String(sentence ?? '').split(`{${index}}`)[0].trim();
    if (!head) return null;
    return head.split(/\s+/).at(-1).replace(PUNCTUATION, '') || null;
}

/** The word after the `{index}` placeholder: the noun the blank goes in front of. */
function wordAfter(sentence, index) {
    const tail = String(sentence ?? '').split(`{${index}}`)[1]?.trim();
    if (!tail) return null;
    return tail.split(/\s+/)[0].replace(PUNCTUATION, '') || null;
}

/**
 * The preposition governing a blank, or null when the sentence has none in front
 * of it. Case-preserving, because the prompt quotes it.
 *
 * @param sentence the `{n}` sentence from the dataset
 * @param index which blank to look at
 */
export function prepositionBefore(sentence, index) {
    const word = wordBefore(sentence, index);
    return PREPOSITIONS.has(normalizePhrase(word)) ? word : null;
}

/**
 * The noun a blank stands in front of, or null when the blank ends the sentence.
 * The noun is never read from the answer, so asking about it cannot leak the
 * case.
 */
export function nounAfter(sentence, index) {
    return wordAfter(sentence, index);
}