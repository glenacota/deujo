// ui/share-shortcut.js

function isTypingTarget(target) {
    return target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
}

export function bindKeyboardShortcuts({
    modals,
    isFocusModeActive,
    kataCount,
    enterKataAtSlot,
    check,
    showHelp,
    loadNext,
    exitToMenu,
}) {
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