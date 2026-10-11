// platform/dom/option-digits.js
// The digit an option is picked by, shared by every kata that offers options.
//
// One rule across the app: an option is picked by tapping it or by pressing the
// digit printed on its left. This is what makes that true, so a kata with a row
// of buttons gets the digits and the hotkey without repeating the range
// arithmetic, and two rows on screen at once cannot end up claiming one digit
// for two different buttons.

/**
 * The digit printed on an option. Hidden from assistive tech, because
 * `aria-keyshortcuts` already carries it and the button's own name is the German
 * form, which is what a learner wants read aloud.
 */
function hotkey(digit) {
    const key = document.createElement('kbd');
    key.className = 'option-key';
    key.textContent = String(digit);
    key.setAttribute('aria-hidden', 'true');
    return key;
}

/**
 * Prints each button's picking digit, in order, and names it to a screen reader.
 *
 * Digit before the word, so the key reads as the key to press beside the thing
 * it picks rather than as a footnote after it.
 *
 * @param buttons the row's buttons, in reading order
 * @param firstDigit the digit on the first button. Two rows open at once are
 *   given disjoint ranges, or one digit would name Nominativ in one row and a
 *   determiner in the other depending on which row the eye had drifted to.
 */
export function digitiseOptions(buttons, firstDigit = 1) {
    Array.from(buttons).forEach((button, position) => {
        const digit = firstDigit + position;
        // insertBefore rather than prepend: the DOM stub the unit tests mount
        // against has no `prepend`, and this says the same thing.
        button.insertBefore(hotkey(digit), button.firstChild);
        button.setAttribute('aria-keyshortcuts', String(digit));
    });
}

/**
 * The button a digit names on one row.
 *
 * `null` rather than a guess: a digit belonging to another row, or one past the
 * end of this one, must reach the page instead of answering something the
 * learner did not point at.
 *
 * @param buttons the row's buttons, in reading order
 * @param digit the key pressed
 * @param firstDigit the digit this row prints on its first button
 * @returns {HTMLElement|null}
 */
export function optionForDigit(buttons, digit, firstDigit = 1) {
    if (!Number.isInteger(digit)) return null;
    const button = Array.from(buttons)[digit - firstDigit];
    return button ?? null;
}