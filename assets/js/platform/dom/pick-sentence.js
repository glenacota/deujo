// platform/dom/pick-sentence.js
// The sentence half of a picker kata: the same `{n}` placeholders the shared
// sentence renderer splits on, but each blank becomes a slot rather than a text
// input, so a learner picks a form instead of spelling one.

import { splitBlanks } from '../../services/grammar.js';

/**
 * Writes the translation and appends text nodes plus one slot per blank to
 * `el.sentence`. Returns the slots in blank order, which is the order the
 * factory answers them in.
 *
 * A slot is a `<span>`, not an `<input>`, because nothing is typed here: it
 * holds the form the learner picked, or an underscore while the blank is still
 * open. `aria-live` is on the slot rather than the sentence, so a screen reader
 * announces "seinem" as the answer to the blank and not the whole line again.
 *
 * @param {{sentence: HTMLElement, translation: HTMLElement}} el
 * @param {{s: string, m?: string}} item
 * @returns {HTMLElement[]} the slots, in blank order
 */
export function renderPickSentence(el, item) {
    el.sentence.textContent = '';
    el.translation.textContent = item.m ? `🇬🇧 ${item.m}` : '';

    const fragment = document.createDocumentFragment();
    const slots = [];

    splitBlanks(item.s).forEach((part, i) => {
        if (i % 2 === 0) {
            if (part) fragment.appendChild(document.createTextNode(part));
            return;
        }
        const slot = createSlot(part, slots.length);
        slots.push(slot);
        fragment.appendChild(slot);
    });

    el.sentence.appendChild(fragment);
    return slots;
}

/**
 * One blank in the sentence. `data-index` keeps the placeholder order the
 * factory grades against, and `data-open` marks the blank the learner is on so
 * the CSS can underline exactly that one.
 */
function createSlot(index, position) {
    const slot = document.createElement('span');
    slot.className = 'pick-slot';
    slot.dataset.index = index;
    slot.setAttribute('aria-label', `Blank ${position + 1}`);
    slot.setAttribute('aria-live', 'polite');
    return slot;
}

/**
 * Puts a form in a slot, or leaves it open when `form` is empty. Text via
 * `textContent`, so no dataset word can arrive as markup, and `classList` for
 * the open/closed styling rather than a string swap that would drop the state
 * the answer marking writes.
 *
 * @param {HTMLElement} slot
 * @param {string} form the picked form, empty while the blank is still open
 * @param {boolean} open true while this is the blank the learner is on
 */
export function setSlot(slot, form, open) {
    slot.textContent = form || '___';
    slot.classList.toggle('pick-slot--open', Boolean(open));
    slot.dataset.open = String(Boolean(open));
}