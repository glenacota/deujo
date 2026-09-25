// ui/share-shortcut.js

function isTypingTarget(target) {
    return target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
}

export function bindKeyboardShortcuts({
    modals,
    inputRoot,
    isFocusModeActive,
    kataCount,
    enterKataAtSlot,
    check,
    showHelp,
    loadNext,
    exitToMenu,
}) {
    inputRoot.addEventListener('beforeinput', (event) => {
        if (event.inputType !== 'insertText' || event.data !== ':' || event.isComposing) return;

        const input = event.target;
        if (!(input instanceof HTMLInputElement) || input.type !== 'text' || input.readOnly || input.disabled) return;

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
            matches: (event) => event.key === 'Enter' && isFocusModeActive() && !modals.isOpen(),
            run: (event) => {
                event.preventDefault();
                check();
            },
        },
        {
            matches: (event, typing) => event.key === '?' && isFocusModeActive() && !typing,
            run: showHelp,
        },
        {
            matches: (event, typing) => {
                const slot = Number(event.code.slice(5));
                return event.shiftKey && event.code.startsWith('Digit') && !modals.isOpen() &&
                    !typing && slot >= 1 && slot <= kataCount();
            },
            run: (event) => {
                event.preventDefault();
                enterKataAtSlot(Number(event.code.slice(5)));
            },
        },
        {
            matches: (event, typing) => event.key === '/' && !typing && !modals.isOpen(),
            run: (event) => {
                event.preventDefault();
                loadNext();
            },
        },
        {
            matches: (event, typing) => event.key === 'Backspace' && isFocusModeActive() && !typing,
            run: (event) => {
                event.preventDefault();
                exitToMenu();
            },
        },
    ];

    window.addEventListener('keydown', (event) => {
        if (modals.handleKeydown(event)) return;

        const typing = isTypingTarget(event.target);
        const shortcut = shortcuts.find(({ matches }) => matches(event, typing));
        shortcut?.run(event);
    });
}