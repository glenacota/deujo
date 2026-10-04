// services/lesson.js
// The correction panel that appears under a wrong verdict: the answer the blank
// wanted, and the rule that produces it. A red cross alone teaches nothing, so
// every kata works out why its answer was right.
//
// Two plain strings, never markup: the verdict panel fills them with
// `textContent`, which keeps this service free of any escaping question and
// keeps a screen reader down to one short correction instead of a paragraph.

import { CASE_LABELS, DEFINITE, PLURAL_DEFINITE } from './grammar.js';

/**
 * @typedef {{form: string, note: string}} Lesson
 *   `form` is the answer the blank wanted, `note` the rule behind it. Both are
 *   plain text and already sentence-cased.
 */

/**
 * A lesson with both halves trimmed, or null when there is nothing to say, so a
 * kata can pass its best guess straight through and the panel stays empty.
 */
export function lesson(form, note) {
    const text = { form: String(form ?? '').trim(), note: String(note ?? '').trim() };
    return text.form || text.note ? text : null;
}

/**
 * The definite articles of one case, generated from the tables rather than
 * written out, so a correction cannot quote a form the grammar service does not
 * already know: `der → dem · die → der · das → dem · plural → den + die`.
 */
export function articleRow(caseKey) {
    if (!(caseKey in CASE_LABELS)) return '';
    const gendered = Object.entries(DEFINITE).map(([gender, forms]) => `${gender} → ${forms[caseKey]}`);
    const plural = caseKey === 'dat' ? 'den + die' : PLURAL_DEFINITE[caseKey];
    return [...gendered, `plural → ${plural}`].join(' · ');
}

/** The case named and its whole article row: `Dativ: der → dem · …`. */
export function caseNote(caseKey) {
    const label = CASE_LABELS[caseKey];
    return label ? `${label}: ${articleRow(caseKey)}` : '';
}
