// platform/dom/option-digits.js

/** aria-hidden: `aria-keyshortcuts` already carries the digit, and the button's name is the German form. */
function hotkey(digit) {
    const key = document.createElement('kbd');
    key.className = 'option-key';
    key.textContent = String(digit);
    key.setAttribute('aria-hidden', 'true');
    return key;
}

// Rows open at once need disjoint `firstDigit` ranges, or one digit would name two buttons.
export function digitiseOptions(buttons, firstDigit = 1) {
    Array.from(buttons).forEach((button, position) => {
        const digit = firstDigit + position;
        // Not prepend(): the unit tests' DOM stub lacks it.
        button.insertBefore(hotkey(digit), button.firstChild);
        button.setAttribute('aria-keyshortcuts', String(digit));
    });
}

// null, not a guess: a digit from another row or past the end must reach the page.
export function optionForDigit(buttons, digit, firstDigit = 1) {
    if (!Number.isInteger(digit)) return null;
    const button = Array.from(buttons)[digit - firstDigit];
    return button ?? null;
}