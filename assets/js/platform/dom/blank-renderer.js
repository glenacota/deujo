// platform/dom/blank-renderer.js
// Shared fill-in-the-blank sentence renderer for katas whose dataset sentences
// use `{n}` placeholders (cases, prepositions, and any future kata of this shape).
//
// A DOM renderer, so it belongs to platform/dom rather than services/: services
// are DOM-free by rule.

import { splitBlanks } from '../../services/grammar.js';

/**
 * Splits `item.s` on `{n}` placeholders, writes the translation, and appends
 * text nodes + one input per blank to `el.sentence`. Each input is built by
 * `createInput(index)` so callers keep control of size/maxLength/placeholder/
 * className; this helper only wires the placeholder index, enterkeyhint, and
 * aria-label that every blank-renderer kata needs identically.
 * @param {{sentence: HTMLElement, translation: HTMLElement}} el
 * @param {{s: string, m?: string}} item
 * @param {(index: string) => HTMLInputElement} createInput
 * @returns {HTMLInputElement[]} the inputs, in blank order
 */
export function renderBlankSentence(el, item, createInput) {
    el.sentence.textContent = '';
    el.translation.textContent = item.m ? `🇬🇧 ${item.m}` : '';

    const fragment = document.createDocumentFragment();
    const inputs = [];
    const parts = splitBlanks(item.s);
    parts.forEach((part, i) => {
        if (i % 2 === 0) {
            if (part) fragment.appendChild(document.createTextNode(part));
            return;
        }
        const input = createInput(part);
        input.dataset.index = part;
        inputs.push(input);
        fragment.appendChild(input);
    });

    inputs.forEach((input, i) => {
        input.setAttribute('enterkeyhint', i === inputs.length - 1 ? 'done' : 'next');
        input.setAttribute('aria-label', `Blank ${i + 1} of ${inputs.length}`);
    });

    el.sentence.appendChild(fragment);
    return inputs;
}
