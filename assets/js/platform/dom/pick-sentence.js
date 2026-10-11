// platform/dom/pick-sentence.js

import { splitBlanks } from '../../services/grammar.js';

export function renderPickSentence(el, item, onSlot = () => {}) {
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
        const position = slots.length;
        slot.addEventListener('click', () => onSlot(position));
        slots.push(slot);
        fragment.appendChild(slot);
    });

    el.sentence.appendChild(fragment);
    return slots;
}

// `data-index` is the placeholder order the factory grades against.
function createSlot(index, position) {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'pick-slot';
    slot.dataset.index = index;
    slot.dataset.label = `Blank ${position + 1}`;
    slot.setAttribute('aria-label', slot.dataset.label);
    // On the slot, not the sentence, so a screen reader announces the picked form rather than the whole line.
    slot.setAttribute('aria-live', 'polite');
    return slot;
}

// classList rather than a className swap, which would drop the state answer marking writes.
export function setSlot(slot, form, open) {
    slot.textContent = form || '___';
    // The label carries the form, or a screen reader hears only "Blank 1".
    slot.setAttribute('aria-label', form ? `${slot.dataset.label}: ${form}. Change.` : slot.dataset.label);
    slot.classList.toggle('pick-slot--open', Boolean(open));
    slot.dataset.open = String(Boolean(open));
}