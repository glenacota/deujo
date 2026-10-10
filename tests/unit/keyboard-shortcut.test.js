// tests/unit/keyboard-shortcut.test.js
// Shortcut dispatch: which keypresses are allowed where, and the guarantee that
// a throwing shortcut degrades to a logged no-op instead of killing the loop.
// Uses a tiny DOM stand-in, since there is no jsdom dependency in this project.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../helpers/bootstrap.js';

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
    const body = {};
    globalThis.document = { body, activeElement: body };

    const originalError = console.error;
    console.error = (...args) => errors.push(args);

    const modals = {
        isOpen: () => modalOpen,
        handleKeydown: () => false,
    };
    // Default callbacks just record the call; a test can override one to throw.
    const record = (name) => (callbacks[name] ?? (() => calls.push(name)));

    // Captured rather than discarded, so a test can stage the pointer press
    // that Safari performs on a control without moving focus to it.
    const inputRootListeners = {};
    const inputRoot = {
        addEventListener(type, handler) { inputRootListeners[type] = handler; },
    };

    const { bindKeyboardShortcuts } = await import('../../assets/js/ui/keyboard-shortcut.js');
    bindKeyboardShortcuts({
        modals,
        inputRoot,
        isFocusModeActive: () => focusMode,
        isAnswering: () => true,
        kataCount: () => KATA_COUNT,
        enterKataAtSlot: callbacks.enterKataAtSlot ?? ((slot) => calls.push(`enterKataAtSlot:${slot}`)),
        check: record('check'),
        showHelp: record('showHelp'),
        loadNext: record('loadNext'),
        exitToMenu: record('exitToMenu'),
        openSettings: record('openSettings'),
        // A custom `pickOption` is still recorded, so a test can assert which
    // digit was asked for and what the kata did with it.
    pickOption: callbacks.pickOption
            ? (digit) => {
                calls.push(`pickOption:${digit}`);
                return callbacks.pickOption(digit) === true;
            }
            : (digit) => {
                calls.push(`pickOption:${digit}`);
                // The default stands in for a picker that can use every digit in
                // both of its rows; a test narrows it to model a narrower one.
                return digit <= 8;
            },
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

    return { press, pressControl: () => inputRootListeners.pointerdown?.({}), calls, errors };
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

test('Enter on a button or link is left to the browser', async () => {
    const { press } = await loadModule({ focusMode: true });
    const button = { closest: (sel) => (sel.includes('button') ? button : null) };

    const { calls } = press({ key: 'Enter', target: button });

    assert.deepEqual(calls, [], 'no check(), no preventDefault');
});

test('held keys fire once', async () => {
    const { press } = await loadModule({ focusMode: true });

    assert.deepEqual(press({ key: '/', repeat: true }).calls, []);
});

test('Backspace is claimed but must not exit while a control holds focus', async () => {
    const { press } = await loadModule({ focusMode: true });
    globalThis.document.activeElement = {};

    const { calls } = press({ key: 'Backspace' });

    // Claimed regardless: WebKit's default for Backspace is "go back", so
    // declining to match would navigate the learner out of the drill.
    assert.ok(calls.includes('preventDefault'), 'Backspace must not reach the browser');
    assert.ok(!calls.includes('exitToMenu'), 'a focused control must not cost the answer in progress');
});

test('a tapped control blocks the exit even though Safari leaves focus on body', async () => {
    // Safari does not focus a <button> on click, so activeElement is still body
    // here and cannot report the press on its own.
    const { press, pressControl } = await loadModule({ focusMode: true });
    pressControl();

    const { calls } = press({ key: 'Backspace' });

    assert.equal(globalThis.document.activeElement, globalThis.document.body);
    assert.ok(!calls.includes('exitToMenu'), 'choosing an answer must not throw it away');
});

test('the press blocks exactly one Backspace, not every later one', async () => {
    const { press, pressControl } = await loadModule({ focusMode: true });
    pressControl();
    press({ key: 'Backspace' });

    const { calls } = press({ key: 'Backspace' });

    assert.ok(calls.includes('exitToMenu'), 'with nothing focused and nothing pressed, Backspace leaves');
});

test('Backspace still edits text instead of leaving, while a field has focus', async () => {
    const { press } = await loadModule({ focusMode: true });
    const input = new globalThis.HTMLInputElement();
    globalThis.document.activeElement = input;

    const { calls } = press({ key: 'Backspace', target: input });

    assert.deepEqual(calls, [], 'typing must keep the key so it can delete a character');
});

test('Shift+7 on QWERTZ skips, even with 7+ katas', async () => {
    const { press } = await loadModule({ focusMode: true });

    const { calls } = press({ key: '/', code: 'Digit7', shiftKey: true });

    assert.ok(calls.includes('loadNext'));
    assert.ok(!calls.some((c) => c.startsWith('enterKataAtSlot')));
});

test('Shift+Digit ignores slots past the last kata', async () => {
    const { press } = await loadModule({ focusMode: false });

    const { calls, errors } = press({ key: '#', code: 'Digit9', shiftKey: true });

    assert.deepEqual(calls, [], 'slot 9 does not exist');
    assert.deepEqual(errors, []);
});

test('an open modal suppresses every shortcut', async () => {
    // The modal owns the keyboard. Backspace used to slip through and exit the
    // kata underneath, leaving the learner on the dashboard with the modal still
    // open; `?` used to re-open help on top of help.
    const { press } = await loadModule({ focusMode: true, modalOpen: true });

    for (const { name, key } of FOCUS_SHORTCUTS) {
        assert.deepEqual(press({ key }).calls, [], `${name} must not fire behind a modal`);
    }

    const { calls, errors } = press({ key: '!', code: 'Digit1', shiftKey: true });
    assert.deepEqual(calls, [], 'nor may ⇧+N jump katas behind a modal');
    assert.deepEqual(press({ key: ',' }).calls, [], 'nor may , stack settings on settings');
    assert.deepEqual(errors, []);
});

test('the modal gate holds in both views', async () => {
    // ⇧+N and , are the two bindings reachable from the dashboard, so the gate
    // has to hold there too, not only inside a kata.
    const { press } = await loadModule({ focusMode: false, modalOpen: true });

    assert.deepEqual(press({ key: '!', code: 'Digit1', shiftKey: true }).calls, []);
    assert.deepEqual(press({ key: ',' }).calls, []);
    assert.deepEqual(press({ key: 'Backspace' }).calls, []);
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

test('an unmodified digit picks the option that carries it', async () => {
    // Step one is 1-4 and step two 5-8, so all eight are live somewhere. The
    // picker prints the digit on every option, so this is read off the screen.
    const { press } = await loadModule({ focusMode: true });

    for (const key of ['1', '2', '3', '4', '5', '6', '7', '8']) {
        const { calls, errors } = press({ key });
        assert.ok(calls.includes(`pickOption:${key}`), `${key} should be offered to the kata`);
        assert.ok(calls.includes('preventDefault'), `${key} must not reach the page`);
        assert.deepEqual(errors, []);
    }
});

test('a digit the open stage has no option for is left to the page', async () => {
    // The preposition kata offers three cases, so 4 has nothing to pick in step
    // one, and step two has not opened at all. Swallowing either would be a
    // binding that could only ever do nothing.
    const { press } = await loadModule({
        focusMode: true,
        callbacks: { pickOption: (digit) => digit <= 3 },
    });

    assert.ok(press({ key: '3' }).calls.includes('pickOption:3'), 'and it claims the key when it can act');
    // A fresh module per press, because the recorder accumulates across a run.
    // The kata is still asked — only the key is left alone — so what matters is
    // that preventDefault never fires for a digit it cannot use.
    const { press: unclaimed } = await loadModule({
        focusMode: true,
        callbacks: { pickOption: (digit) => digit <= 3 },
    });
    const { calls, errors } = unclaimed({ key: '4' });
    assert.ok(!calls.includes('preventDefault'), 'nothing to pick, so the key is left to the page');
    assert.deepEqual(errors, [], 'and refusing a digit is not a failure');
});

test('a digit stays inert where a digit has no business being one', async () => {
    const { press } = await loadModule({ focusMode: false });
    assert.deepEqual(press({ key: '1' }).calls, [], 'the dashboard has no options to pick');

    const { press: modal } = await loadModule({ focusMode: true, modalOpen: true });
    assert.deepEqual(modal({ key: '1' }).calls, [], 'nor behind a modal');

    // Typing a number into a field is the commonest reason to press one.
    const { press: typing } = await loadModule({ focusMode: true });
    const input = new globalThis.HTMLInputElement();
    assert.deepEqual(typing({ key: '1', target: input }).calls, [], 'typing keeps its digits');

    // AltGr is how a European layout types a bracket, so a modified digit is not
    // a pick however it reads.
    assert.deepEqual(typing({ key: '1', altKey: true }).calls, []);
    assert.deepEqual(typing({ key: '1', ctrlKey: true }).calls, []);
    assert.deepEqual(typing({ key: '1', metaKey: true }).calls, []);
});

test('Shift+Digit stays the kata jump and never picks an option', async () => {
    // The two must not collide: a learner who holds Shift for the jump must not
    // also answer the item behind it.
    const { press } = await loadModule({ focusMode: false });

    const { calls } = press({ key: '!', code: 'Digit1', shiftKey: true });

    assert.ok(calls.includes('enterKataAtSlot:1'));
    assert.ok(!calls.some((c) => c.startsWith('pickOption')), 'Shift+1 must not also pick an option');
});

test('disabling hotkeys silences the digit picks too', async () => {
    const { press } = await loadModule({ focusMode: true, hotkeysEnabled: false });

    assert.deepEqual(press({ key: '1' }).calls, [], 'a preference off is a preference off');
});

test('a keypress with no physical code is a silent no-op', async () => {
    // Synthesised events (and some IMEs) carry no `code`. Slicing it used to
    // throw out of `find`; the guard keeps that path quiet.
    const { press } = await loadModule({ focusMode: false });

    const { calls, errors } = press({ key: '1', code: undefined, shiftKey: true });

    assert.deepEqual(calls, [], 'nothing to run without a code');
    assert.deepEqual(errors, [], 'and nothing logged, because nothing failed');
});
