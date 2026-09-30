// tests/unit/keyboard-shortcut.test.js
// Shortcut dispatch: which keypresses are allowed where, and the guarantee that
// a throwing shortcut degrades to a logged no-op instead of killing the loop.
// Uses a tiny DOM stand-in, since there is no jsdom dependency in this project.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserStub } from '../helpers/browser-stub.js';

// Only needed so ui/dom.js can be imported (keyboard-shortcut.js pulls in
// getActiveInputs); the test's own fakes below take over from here.
installBrowserStub();

class FakeInputElement {}
class FakeTextAreaElement {}

const KATA_COUNT = 3;

/**
 * Installs a fake window/document and imports the module fresh, so each test
 * gets its own listener registry. `focusMode` flips the one predicate that
 * decides whether we are on the dashboard or inside a kata.
 */
const loadModule = async ({ focusMode = false, modalOpen = false, hotkeysEnabled = true, callbacks = {} } = {}) => {
    const listeners = [];
    const calls = [];
    const errors = [];

    // A fresh window per call, so each test's listener list is its own and
    // `press` only ever dispatches to the binding under test.
    globalThis.window = {
        addEventListener(type, handler) {
            if (type === 'keydown') listeners.push(handler);
        },
    };
    globalThis.HTMLInputElement = FakeInputElement;
    globalThis.HTMLTextAreaElement = FakeTextAreaElement;

    const originalError = console.error;
    console.error = (...args) => errors.push(args);

    const modals = {
        isOpen: () => modalOpen,
        handleKeydown: () => false,
    };
    // Default callbacks just record the call; a test can override one to throw.
    const record = (name) => (callbacks[name] ?? (() => calls.push(name)));

    const { bindKeyboardShortcuts } = await import('../../assets/js/ui/keyboard-shortcut.js');
    bindKeyboardShortcuts({
        modals,
        inputRoot: { addEventListener() {} },
        isFocusModeActive: () => focusMode,
        isAnswering: () => true,
        kataCount: () => KATA_COUNT,
        enterKataAtSlot: callbacks.enterKataAtSlot ?? ((slot) => calls.push(`enterKataAtSlot:${slot}`)),
        check: record('check'),
        showHelp: record('showHelp'),
        loadNext: record('loadNext'),
        exitToMenu: record('exitToMenu'),
        openSettings: record('openSettings'),
        areHotkeysEnabled: () => hotkeysEnabled,
    });

    console.error = originalError;

    /** Presses a key on a plain (non-typing) target and reports what happened. */
    const press = (init) => {
        const event = { target: {}, preventDefault() { calls.push('preventDefault'); }, ...init };
        const originalError = console.error;
        console.error = (...args) => errors.push(args);
        try {
            listeners.forEach((handler) => handler(event));
        } finally {
            console.error = originalError;
        }
        return { calls: [...calls], errors: [...errors] };
    };

    return { press, calls, errors };
};

// The four shortcuts that operate on the kata in focus. `run` is the callback
// each maps to, named so a failure points straight at the wiring.
const FOCUS_SHORTCUTS = [
    { name: 'Enter', key: 'Enter', run: 'check' },
    { name: '?', key: '?', run: 'showHelp' },
    { name: '/', key: '/', run: 'loadNext' },
    { name: 'Backspace', key: 'Backspace', run: 'exitToMenu' },
];

for (const { name, key, run } of FOCUS_SHORTCUTS) {
    test(`${name} is inert on the dashboard, where isFocusModeActive() is false`, async () => {
        const { press } = await loadModule({ focusMode: false });

        const { calls, errors } = press({ key });

        assert.deepEqual(calls, [], `${name} must not match, let alone run`);
        assert.deepEqual(errors, [], `${name} must not log an error`);
    });

    test(`${name} matches once focus mode is active`, async () => {
        const { press } = await loadModule({ focusMode: true });

        const { calls, errors } = press({ key });

        assert.ok(calls.includes(run), `${name} should reach ${run}`);
        assert.deepEqual(errors, []);
    });
}

test('Shift+Digit is a dashboard shortcut and must still work there', async () => {
    // The dashboard cards advertise a "⇧ + N" badge, so this one is
    // deliberately the inverse of the others: it requires focus mode to be OFF.
    const { press } = await loadModule({ focusMode: false });

    const { calls, errors } = press({ key: '!', code: 'Digit1', shiftKey: true });

    assert.ok(calls.includes('enterKataAtSlot:1'), 'Shift+1 should enter the first kata');
    assert.deepEqual(errors, []);
});

test('Shift+Digit ignores slots past the last kata', async () => {
    const { press } = await loadModule({ focusMode: false });

    const { calls, errors } = press({ key: '#', code: 'Digit9', shiftKey: true });

    assert.deepEqual(calls, [], 'slot 9 does not exist');
    assert.deepEqual(errors, []);
});

test('an open modal suppresses the shortcuts that gate on it', async () => {
    // Enter, / and ⇧+N check `modals.isOpen()` directly. `?` and Backspace do
    // not, so they stay out of scope here rather than papering over the gap.
    const { press } = await loadModule({ focusMode: true, modalOpen: true });

    for (const key of ['Enter', '/']) {
        assert.deepEqual(press({ key }).calls, [], `${key} must not fire behind a modal`);
    }
    const { calls, errors } = press({ key: '!', code: 'Digit1', shiftKey: true });
    assert.deepEqual(calls, [], 'nor may ⇧+N jump katas behind a modal');
    assert.deepEqual(errors, []);
});

test('a shortcut that throws is logged, and the next keypress still works', async () => {
    // The turn loop lives in the keydown listener, so an uncaught throw would
    // strand the learner mid-exercise. Containment, not rollback: preventDefault
    // has already fired by the time `run` throws, and that is fine.
    let exited = false;
    const { press, errors: logged } = await loadModule({
        focusMode: true,
        callbacks: {
            check: () => { throw new Error('boom'); },
            exitToMenu: () => { exited = true; },
        },
    });

    assert.doesNotThrow(() => press({ key: 'Enter' }), 'Enter must not escape the listener');
    assert.equal(logged.length, 1, 'the failure is reported exactly once');
    assert.match(String(logged[0][0]), /Keyboard shortcut failed/);
    assert.equal(logged[0][1].message, 'boom', 'the original error is passed through');

    press({ key: 'Backspace' });
    assert.equal(exited, true, 'the listener is still live after the failure');
    assert.equal(logged.length, 1, 'the healthy keypress logs nothing');
});

test(', opens settings from both views, like the ⇧+N kata jump', async () => {
    for (const focusMode of [true, false]) {
        const { press } = await loadModule({ focusMode });

        const { calls, errors } = press({ key: ',' });

        assert.ok(calls.includes('openSettings'), `, should open settings (focusMode ${focusMode})`);
        assert.deepEqual(errors, []);
    }
});

test(', is inert while typing and behind a modal', async () => {
    const { press } = await loadModule({ focusMode: false, modalOpen: true });

    assert.deepEqual(press({ key: ',' }).calls, [], 'no modal may stack behind another');
    assert.deepEqual(press({ key: ',', target: {} }).calls, []);
});

test('disabling hotkeys silences every shortcut but not modal handling', async () => {
    const { press } = await loadModule({ focusMode: true, hotkeysEnabled: false });

    for (const key of ['Enter', '?', '/', 'Backspace', ',']) {
        assert.deepEqual(press({ key }).calls, [], `${key} must not run with hotkeys off`);
    }

    const { press: shifting } = await loadModule({ focusMode: false, hotkeysEnabled: false });
    assert.deepEqual(shifting({ key: '!', code: 'Digit1', shiftKey: true }).calls, [], 'nor may ⇧+1 jump katas');
});

test('a keypress with no physical code is a silent no-op', async () => {
    // Synthesised events (and some IMEs) carry no `code`. Slicing it used to
    // throw out of `find`; the guard keeps that path quiet.
    const { press } = await loadModule({ focusMode: false });

    const { calls, errors } = press({ key: '1', code: undefined, shiftKey: true });

    assert.deepEqual(calls, [], 'nothing to run without a code');
    assert.deepEqual(errors, [], 'and nothing logged, because nothing failed');
});
