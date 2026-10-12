// ui/keyboard-shortcut.js
// One window keydown listener applies every gate before dispatch, so a binding cannot skip one.

import { getActiveInputs } from './dom.js';

/** Step one is 1-4 and step two 5-8: disjoint, since both rows are on screen at once. */
const DIGIT_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8'];

function isTypingTarget(target) {
    return target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
}

export function bindKeyboardShortcuts({
    modals,
    inputRoot,
    isFocusModeActive,
    isAnswering,
    kataCount,
    enterKataAtSlot,
    check,
    showHelp,
    loadNext,
    exitToMenu,
    openSettings,
    pickOption = () => false,
    areHotkeysEnabled = () => true,
}) {
    // Safari does not focus a <button> on click, so activeElement stays <body>;
    // track the press itself to tell mid-interaction from idle. Chromium focuses it.
    let pressedSinceLastKey = false;
    inputRoot.addEventListener('pointerdown', () => { pressedSinceLastKey = true; });

    // The umlaut replacement is typing behaviour, not a shortcut, so it stays
    // live even when hotkeys are off.
    inputRoot.addEventListener('beforeinput', (event) => {
        if (event.inputType !== 'insertText' || event.data !== ':' || event.isComposing) return;

        const input = event.target;
        if (!(input instanceof HTMLInputElement) || input.type !== 'text' || input.disabled) return;

        const start = input.selectionStart;
        const end = input.selectionEnd;
        if (start === null || start !== end) return;

        const match = input.value.slice(0, start).match(/(ss|[aou])$/i);
        if (!match) return;

        const shortcut = match[0].toLowerCase();
        const replacements = { a: 'ä', o: 'ö', u: 'ü', ss: 'ß' };
        const replacement = match[0] === 'SS'
            ? 'ẞ'
            : match[0] === match[0].toUpperCase()
                ? replacements[shortcut].toUpperCase()
                : replacements[shortcut];

        event.preventDefault();
        input.setRangeText(replacement, start - match[0].length, start, 'end');
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const shortcuts = [
        {
            matches: (event) => event.key === 'Enter' && isFocusModeActive() &&
                !event.target?.closest?.('button, a, summary'),
            run: (event) => {
                event.preventDefault();
                const target = event.target;
                // A verdict locks the section, so Enter means next, not check.
                if (!isAnswering()) return check();
                if (target instanceof HTMLInputElement) {
                    const inputs = getActiveInputs(inputRoot);
                    const index = inputs.indexOf(target);
                    if (index !== -1 && index !== inputs.length - 1) {
                        const next = inputs.slice(index + 1).find((input) => !input.value.trim())
                            ?? inputs.find((input) => !input.value.trim());
                        if (next) {
                            next.focus();
                            return;
                        }
                    }
                }
                check();
            },
        },
        {
            // Unmodified digits pick an option; shift+digit is the kata jump.
            matches: (event, { typing }) => {
                if (typing || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return false;
                if (!isFocusModeActive() || !isAnswering()) return false;
                return DIGIT_OPTIONS.includes(event.key);
            },
            run: (event) => {
                // Claim the key only if an option uses it, so other digits stay with the page.
                if (!pickOption(Number(event.key))) return;
                event.preventDefault();
            },
        },
        {
            matches: (event, { typing }) => event.key === '?' && isFocusModeActive() && !typing,
            run: showHelp,
        },
        {
            matches: (event, { typing }) => event.key === '/' && isFocusModeActive() && !typing,
            run: (event) => {
                event.preventDefault();
                loadNext();
            },
        },
        {
            matches: (event, { typing }) => {
                if (!event.shiftKey || !event.code?.startsWith('Digit')) return false;
                const slot = Number(event.code.slice(5));
                return !typing && slot >= 1 && slot <= kataCount();
            },
            run: (event) => {
                event.preventDefault();
                enterKataAtSlot(Number(event.code.slice(5)));
            },
        },
        {
            // Claimed even when it will not act: WebKit's default for an
            // unclaimed Backspace is "go back".
            matches: (event, { typing }) => event.key === 'Backspace' && isFocusModeActive() && !typing,
            run: (event, { pressed }) => {
                event.preventDefault();
                // Exiting loses the answer in progress, so require nothing focused and
                // nothing just pressed; `pressed` covers WebKit, where a clicked button
                // leaves focus on <body>.
                if (pressed || document.activeElement !== document.body) return;
                exitToMenu();
            },
        },
        {
            // Settings is reachable from both views, like the ⇧+N kata jump.
            matches: (event, { typing }) => event.key === ',' && !typing,
            run: (event) => {
                event.preventDefault();
                openSettings();
            },
        },
    ];

    window.addEventListener('keydown', (event) => {
        // A throwing shortcut must not break later keys.
        try {
            // Cleared first, so `pressed` means "since the last key" whichever gate returns.
            const pressed = pressedSinceLastKey;
            pressedSinceLastKey = false;

            if (modals.handleKeydown(event)) return;
            if (!areHotkeysEnabled()) return;
            if (modals.isOpen()) return;
            if (event.repeat) return;

            const context = { typing: isTypingTarget(event.target), pressed };
            const shortcut = shortcuts.find(({ matches }) => matches(event, context));
            shortcut?.run(event, context);
        } catch (error) {
            console.error('Keyboard shortcut failed:', error);
        }
    });
}
