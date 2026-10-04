// ui/keyboard-shortcut.js
// One funnel for every binding: a single window keydown listener with the gates
// applied in a fixed order before dispatch, so a new shortcut cannot forget one.

import { getActiveInputs } from './dom.js';

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
    areHotkeysEnabled = () => true,
}) {
    // Safari does not move focus to a <button> when it is clicked, so after a
    // learner picks a gender on iOS `document.activeElement` is still <body> and
    // focus alone cannot answer "are they holding a control?". Track the press
    // itself: a pointer press since the last key means mid-interaction, not a
    // request to leave. Chromium needs this not at all -- it focuses the button
    // -- which is exactly why the bug only ever showed up on WebKit.
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
                !event.target?.closest?.('button, a'),
            run: (event) => {
                event.preventDefault();
                const target = event.target;
                // While a verdict is up, the section is locked, so Enter means
                // "next" rather than "check the next blank".
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
            // Claimed whenever a kata is open and the learner is not typing,
            // even when it will not act. Declining to match would hand the key
            // back to the browser, and WebKit's default for Backspace is
            // "go back", which walks the learner out of the drill entirely.
            matches: (event, { typing }) => event.key === 'Backspace' && isFocusModeActive() && !typing,
            run: (event, { pressed }) => {
                event.preventDefault();
                // Exiting also costs the answer in progress, so it needs nothing
                // focused and nothing just pressed. `pressed` is what carries
                // that on WebKit, where a clicked button leaves focus on <body>
                // and would otherwise read as idle.
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
        // A throwing shortcut must not take down the turn loop: log it and let
        // the keypress be a no-op.
        try {
            // Read and cleared first, so `pressed` always means "since the last
            // key" no matter which gate below returns.
            const pressed = pressedSinceLastKey;
            pressedSinceLastKey = false;

            if (modals.handleKeydown(event)) return;
            if (!areHotkeysEnabled()) return;
            // One gate for every shortcut, so a new binding cannot forget it.
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