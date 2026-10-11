// tests/unit/option-digits.test.js
// The digit on an option, which is now the same rule in every kata that offers
// a choice: tap the button, or press the digit printed on its left.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../helpers/bootstrap.js';

const { digitiseOptions, optionForDigit } = await import('../../assets/js/platform/dom/option-digits.js');
const { loadKatas } = await import('../../assets/js/katas/registry.js');

const katas = loadKatas(document.createElement('div'));
const byId = (id) => katas.find((kata) => kata.id === id);

/**
 * The buttons of an option row. A picker builds them into a host that carries the
 * role, so its buttons are that host's children; a kata that declares them in its
 * template puts the role on the button itself. Either way this returns buttons.
 */
const buttonsIn = (section, role) => Array.from(
    section.querySelectorAll(`[data-role="${role}"]`),
).flatMap((node) => (node.tagName === 'BUTTON' ? [node] : [...node.children]));

test('a row is numbered from one and named to assistive tech', () => {
    const host = document.createElement('div');
    for (const word of ['der', 'die', 'das']) {
        const button = document.createElement('button');
        button.textContent = word;
        host.appendChild(button);
    }

    digitiseOptions(host.children);

    assert.deepEqual(
        [...host.children].map((button) => button.querySelector('.option-key').textContent),
        ['1', '2', '3'],
    );
    assert.deepEqual(
        [...host.children].map((button) => button.getAttribute('aria-keyshortcuts')),
        ['1', '2', '3'],
    );
    // The digit is decoration: `aria-keyshortcuts` already carries it, and the
    // button's name is the German word a learner wants read aloud.
    for (const button of host.children) {
        assert.equal(button.querySelector('.option-key').getAttribute('aria-hidden'), 'true');
    }
    assert.match(host.children[0].textContent, /der/, 'the form is still on the button');
});

test('the digit is printed before the form, not after it', () => {
    const host = document.createElement('div');
    const button = document.createElement('button');
    button.textContent = 'Dativ';
    host.appendChild(button);

    digitiseOptions(host.children);

    assert.deepEqual(
        [...button.children].map((child) => child.className),
        ['option-key'],
        'the digit leads, and the form needs no wrapper of its own',
    );
});

test('a digit names one button, or none at all', () => {
    const host = document.createElement('div');
    for (const word of ['der', 'die', 'das']) {
        const button = document.createElement('button');
        button.textContent = word;
        host.appendChild(button);
    }

    assert.equal(optionForDigit(host.children, 1)?.textContent, 'der');
    assert.equal(optionForDigit(host.children, 3)?.textContent, 'das');
    // Past the end, before the start, and not a digit at all.
    assert.equal(optionForDigit(host.children, 4), null, 'one past the end of the row');
    assert.equal(optionForDigit(host.children, 0), null, 'before the start of the row');
    assert.equal(optionForDigit(host.children, 1.5), null, 'not a whole digit');
});

// Two rows on screen at once get disjoint ranges, or `3` would name a case in one
// row and a determiner in the other depending on which row the eye had drifted
// to. The picker is the kata that has both rows open at once.
test('two rows on screen at once never share a digit', () => {
    const kata = byId('prepositions');
    kata.render({ id: 'd', w: 'Ein Satz.', m: 'A sentence.', s: 'Ich warte auf {0} Arzt.', b: [{ a: 'den', c: 'akk' }] });
    const section = kata.el.section;

    const caseRow = buttonsIn(section, 'stage-case');
    const caseDigits = caseRow.map((button) => button.getAttribute('aria-keyshortcuts'));
    assert.ok(caseDigits.length > 0, 'step one carries no digits');

    // Open step two without answering, so both rows are on screen together.
    caseRow[0].click();

    const formRow = buttonsIn(section, 'stage-form');
    const formDigits = formRow.map((button) => button.getAttribute('aria-keyshortcuts'));
    assert.ok(formDigits.length > 0, 'step two carries no digits');

    for (const digit of formDigits) {
        assert.ok(!caseDigits.includes(digit), `digit ${digit} is on both rows at once`);
    }
});

// The rule the whole change exists for: every kata that offers a choice numbers
// its options and answers the same digit. Before this only the picker did, so a
// gender button looked like a different control from a case button.
for (const id of ['nouns', 'verbs-perf']) {
    test(`${id} numbers its options and picks them by digit, like a picker`, () => {
        const kata = byId(id);
        const section = kata.el.section;
        const role = id === 'nouns' ? 'gender' : 'aux';
        const buttons = buttonsIn(section, role);
        assert.ok(buttons.length >= 2, `${id} has no option buttons`);

        buttons.forEach((button, position) => {
            const digit = String(position + 1);
            assert.equal(button.getAttribute('aria-keyshortcuts'), digit, `${id} button ${position} carries no digit`);
            assert.equal(button.querySelector('.option-key').textContent, digit, `${id} prints the wrong digit`);
        });

        assert.equal(kata.pickOption(1), true, 'a digit the row does carry is claimed');
        assert.equal(kata.pickOption(buttons.length), true);
        assert.equal(kata.pickOption(buttons.length + 1), false, 'a digit past the end is left to the page');
        assert.equal(kata.pickOption(0), false, 'and one before the start');
    });
}

// A tense with no option buttons claims no digit, so a keypress there is not
// swallowed by a binding that would do nothing.
test('a verb tense with no option buttons claims no digit', () => {
    for (const id of ['verbs-pres', 'verbs-praet']) {
        const kata = byId(id);
        assert.equal(kata.pickOption(1), false, `${id} claims a digit it has no option for`);
    }
});

test('the keyboard funnel still listens to exactly the digits a row can print', () => {
    // `ui/keyboard-shortcut.js` keeps its own list rather than importing the
    // option helpers, so the two layers would be coupled for one array. The
    // agreement between them is watched here instead of built in: a wider row
    // would print a digit no binding claims, and the key would do nothing.
    const funnel = readFileSync(new URL('../../assets/js/ui/keyboard-shortcut.js', import.meta.url), 'utf8');
    const digits = [...funnel.matchAll(/'([1-9])'/g)].map(([, digit]) => Number(digit));
    assert.deepEqual(digits, [1, 2, 3, 4, 5, 6, 7, 8], 'the funnel must reach the widest row in the app');
});

test('a kata that offers no options at all does not print a digit', () => {
    // Nothing to number, so nothing is: a stray badge on a plain field would be
    // furniture the learner cannot use.
    for (const kata of katas.filter((k) => k.id.startsWith('verbs-') && k.id !== 'verbs-perf')) {
        assert.equal(kata.el.section.querySelector('.option-key'), null, `${kata.id} printed a digit on nothing`);
    }
});