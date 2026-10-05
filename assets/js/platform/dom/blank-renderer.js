// platform/dom/blank-renderer.js
// Shared fill-in-the-blank sentence renderer for katas whose dataset sentences
// use `{n}` placeholders (cases, prepositions, and any future kata of this shape).
//
// A DOM renderer, so it belongs to platform/dom rather than services/: services
// are DOM-free by rule.

import { splitBlanks } from '../../services/grammar.js';

/**
 * The blank input a sentence kata builds. Nine attributes are the same for all
 * of them -- someone typing German wants no autocorrect, no spellcheck, and a
 * German keyboard -- so a kata only states the four that genuinely differ: how
 * long its longest answer is, how wide the field is, its classes, and an
 * example.
 */
export function createBlankInput({ maxLength, size, className, placeholder } = {}) {
    const input = document.createElement('input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.maxLength = maxLength;
    input.spellcheck = false;
    input.autocapitalize = 'none';
    input.autocorrect = 'off';
    input.lang = 'de';
    input.size = size;
    if (placeholder) input.placeholder = placeholder;
    input.className = className;
    return input;
}

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
