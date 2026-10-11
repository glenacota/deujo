// services/lesson.js
// Plain strings, never markup: the verdict panel fills them with `textContent`.

import { CASE_LABELS, DEFINITE, PLURAL_DEFINITE } from './grammar.js';

/** @typedef {{form: string, note: string}} Lesson `form` is the answer wanted, `note` the rule behind it. */

/** Null when both halves are empty, so a kata can pass its best guess straight through. */
export function lesson(form, note) {
    const text = { form: String(form ?? '').trim(), note: String(note ?? '').trim() };
    return text.form || text.note ? text : null;
}

/** Generated from the tables so a correction cannot quote a form the grammar service lacks. */
export function articleRow(caseKey) {
    if (!(caseKey in CASE_LABELS)) return '';
    const gendered = Object.entries(DEFINITE).map(([gender, forms]) => `${gender} → ${forms[caseKey]}`);
    const plural = caseKey === 'dat' ? 'den + die' : PLURAL_DEFINITE[caseKey];
    return [...gendered, `plural → ${plural}`].join(' · ');
}

export function caseNote(caseKey) {
    const label = CASE_LABELS[caseKey];
    return label ? `${label}: ${articleRow(caseKey)}` : '';
}
