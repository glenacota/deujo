// tests/unit/choice-text-kata.test.js
// The shared "pick one option, then type an answer" path, with a config of its own.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../helpers/bootstrap.js';

const { createChoiceTextKata } = await import('../../assets/js/katas/factories/choice-text-kata.js');

const TEMPLATE = `
    <section class="kata-section hidden" data-role="section">
        <h2 data-role="word"></h2>
        <p data-role="meaning"></p>
        <div>
            <button type="button" data-role="pick" data-pick="a" aria-pressed="false">a</button>
            <button type="button" data-role="pick" data-pick="b" aria-pressed="false">b</button>
        </div>
        <input type="text" data-role="typed">
    </section>
`;

const ITEM = { w: 'wort', m: 'word', answer: 'a', typed: 'ja' };

const build = (overrides = {}) => {
    const container = document.createElement('div');
    const calls = [];
    const kata = createChoiceTextKata({
        container,
        template: TEMPLATE,
        manifest: { id: 'demo' },
        validateDataset: () => {},
        getHelpContent: () => 'help',
        choice: { role: 'pick', key: 'pick', elKey: 'pickButtons' },
        text: { role: 'typed', elKey: 'typed' },
        grade(item, input) {
            calls.push(input);
            if (!input.choice) return { warning: 'pick one' };
            return {
                choiceOk: input.choice === item.answer,
                textOk: input.given === item.typed,
                choiceLesson: { form: item.answer, note: 'choice rule' },
                textLesson: { form: item.typed, note: 'text rule' },
            };
        },
        ...overrides,
    });
    kata.render(ITEM);
    return { kata, container, calls };
};

const button = (container, value) => container
    .querySelectorAll('[data-role="pick"]')
    .find((btn) => btn.dataset.pick === value);

test('the factory exposes the manifest, its section and the named controls on el', () => {
    const { kata } = build();
    assert.equal(kata.id, 'demo');
    assert.ok(kata.el.section);
    assert.equal(kata.el.pickButtons.length, 2);
    assert.ok(kata.el.typed);
    assert.equal(kata.getHelpContent(), 'help');
});

test('render fills the prompt, clears the input and the selection', () => {
    const { kata, container } = build();
    button(container, 'a').click();
    kata.el.typed.value = 'stale';

    kata.render({ ...ITEM, w: 'neu', m: 'new' });

    assert.equal(kata.el.word.textContent, 'neu');
    assert.equal(kata.el.meaning.textContent, '🇬🇧 new');
    assert.equal(kata.el.typed.value, '');
    assert.equal(button(container, 'a').getAttribute('aria-pressed'), 'false');
});

test('a click selects one option and unpresses the other', () => {
    const { container } = build();
    button(container, 'a').click();
    button(container, 'b').click();
    assert.equal(button(container, 'a').getAttribute('aria-pressed'), 'false');
    assert.equal(button(container, 'b').getAttribute('aria-pressed'), 'true');
});

test('the grader sees the chosen value and the trimmed text, and a warning is no verdict', () => {
    const { kata, container, calls } = build();
    assert.equal(kata.check(ITEM).warning, 'pick one');
    assert.equal(kata.check(ITEM).correct, undefined);

    button(container, 'a').click();
    kata.el.typed.value = '  ja ';
    kata.check(ITEM);
    assert.deepEqual(calls.at(-1), { choice: 'a', given: 'ja' });
});

test('both stages are graded separately and reported as fields', () => {
  const { kata, container } = build();
  button(container, 'b').click();
  kata.el.typed.value = 'ja';
  const wrongChoice = kata.check(ITEM);
  assert.equal(wrongChoice.correct, false);
  assert.deepEqual(wrongChoice.fields, [{ ok: false }, { ok: true }]);
  assert.deepEqual(wrongChoice.lessons, [{ form: 'a', note: 'choice rule' }], 'only the wrong field is taught');

  button(container, 'a').click();
  kata.el.typed.value = 'nein';
  const wrongText = kata.check(ITEM);
  assert.deepEqual(wrongText.fields, [{ ok: true }, { ok: false }]);
  assert.deepEqual(wrongText.lessons, [{ form: 'ja', note: 'text rule' }]);

  button(container, 'b').click();
  const bothWrong = kata.check(ITEM);
  assert.deepEqual(bothWrong.lessons.map((l) => l.form), ['a', 'ja'], 'every wrong field gets its answer');

  button(container, 'a').click();
  kata.el.typed.value = 'ja';
  const clean = kata.check(ITEM);
  assert.equal(clean.correct, true);
  assert.deepEqual(clean.lessons, []);
});

test('only the picked button and the input are marked, each with a badge', () => {
    const { kata, container } = build();
    button(container, 'b').click();
    kata.el.typed.value = 'nein';
    kata.check(ITEM);

    const badge = (node) => node.children.find((c) => c.classList.has('answer-badge'))?.textContent;
    assert.equal(button(container, 'b').dataset.answerState, 'wrong');
    assert.equal(badge(button(container, 'b')), '❌');
    assert.equal('answerState' in button(container, 'a').dataset, false, 'the right answer is not revealed on a button');
    assert.equal(button(container, 'a').children.find((c) => c.classList.has('answer-badge')), undefined);

    assert.equal(kata.el.typed.dataset.answerState, 'wrong');
    assert.equal(badge(kata.el.typed.parentElement), '❌');
    assert.equal(kata.el.typed.parentElement.children.length, 2, 'no inline correction beside the input');
});

test('a right choice and a right text each carry a check badge', () => {
    const { kata, container } = build();
    button(container, 'a').click();
    kata.el.typed.value = 'ja';
    kata.check(ITEM);

    const badge = (node) => node.children.find((c) => c.classList.has('answer-badge'))?.textContent;
    assert.equal(badge(button(container, 'a')), '✅');
    assert.equal(badge(kata.el.typed.parentElement), '✅');
});

test('pickOption clicks the digit-matched button and returns false for any other digit', () => {
    const { kata, container } = build();
    assert.equal(kata.pickOption(2), true);
    assert.equal(button(container, 'b').getAttribute('aria-pressed'), 'true');
    assert.equal(kata.pickOption(9), false);
});

test('renderText runs after the input is cleared', () => {
    const { kata } = build({ renderText: (item, input) => { input.placeholder = item.w; } });
    kata.render(ITEM);
    assert.equal(kata.el.typed.placeholder, 'wort');
});

test('noun kata verdict names the gender and the plural separately', async () => {
  const { createNounKata } = await import('../../assets/js/katas/nouns/kata.js');
  const kata = createNounKata(document.createElement('div'));
  const noun = { w: 'Tag', g: 'der', m: 'day', p: 'Tage' };
  kata.render(noun);
  kata.el.genderButtons.find((btn) => btn.dataset.gender === 'das').click();
  kata.el.plural.value = 'tage';
  const wrongGender = kata.check(noun);
  assert.deepEqual(wrongGender.lessons.map((l) => l.form), ['der']);

  kata.el.genderButtons.find((btn) => btn.dataset.gender === 'der').click();
  kata.el.plural.value = 'Tagen';
  assert.deepEqual(kata.check(noun).lessons.map((l) => l.form), ['die Tage']);

  kata.el.genderButtons.find((btn) => btn.dataset.gender === 'die').click();
  assert.deepEqual(kata.check(noun).lessons.map((l) => l.form), ['der', 'die Tage']);
});
