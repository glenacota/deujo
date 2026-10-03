// tests/unit/answer-view.test.js
// Inline marking: colour, emoji, and the corrections that travel with them.
// Uses the shared DOM stub, since there is no jsdom dependency in this project.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import '../helpers/bootstrap.js';

const mountInput = (parent, tag = 'input') => {
  const input = document.createElement(tag);
  parent.appendChild(input);
  return input;
};

const loadModule = async () => import('../../assets/js/ui/answer-view.js');

const badgeOf = (wrapper) => wrapper.children.find((c) => c.classList.has('answer-badge'));
const noteOf = (wrapper) => wrapper.children.find((c) => c.classList.has('answer-note'));

test('a wrong control is flagged red and shows the expected value inline', async () => {
  const { markControl } = await loadModule();
  const parent = document.createElement('div');
  const input = mountInput(parent);

  markControl(input, { ok: false, expected: 'die Bäume' });

  const wrapper = input.parentElement;
  assert.ok(wrapper.classList.has('answer-field'), 'the control is wrapped for the badge');
  assert.equal(input.dataset.answerState, 'wrong');
  assert.equal(noteOf(wrapper).dataset.answerState, 'wrong');
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(badgeOf(wrapper).textContent, '❌');
  assert.match(noteOf(wrapper).textContent, /die Bäume/);
});

test('a correct control shows the badge and no repeating note', async () => {
  const { markControl } = await loadModule();
  const parent = document.createElement('div');
  const input = mountInput(parent);

  markControl(input, { ok: true, expected: 'die Bäume' });

  const wrapper = input.parentElement;
  assert.equal(input.dataset.answerState, 'correct');
  assert.equal(badgeOf(wrapper).textContent, '✅');
  assert.equal(noteOf(wrapper), undefined, 'a correct answer needs no inline correction');
});

test('note: false suppresses the correction on a wrong control', async () => {
  const { markControl } = await loadModule();
  const parent = document.createElement('div');
  const input = mountInput(parent);

  markControl(input, { ok: false, expected: 'geht', note: false });

  assert.equal(input.dataset.answerState, 'wrong');
  assert.equal(badgeOf(input.parentElement).textContent, '❌');
  assert.equal(noteOf(input.parentElement), undefined);
});

test('re-marking the same control does not stack wrappers, badges, or notes', async () => {
  const { markControl } = await loadModule();
  const parent = document.createElement('div');
  const input = mountInput(parent);

  markControl(input, { ok: false, expected: 'a' });
  markControl(input, { ok: false, expected: 'b' });
  markControl(input, { ok: true });

  const wrapper = input.parentElement;
  assert.equal(parent.children.length, 1, 'still a single wrapper');
  assert.equal(wrapper.children.filter((c) => c.classList.has('answer-badge')).length, 1);
  assert.equal(wrapper.children.filter((c) => c.classList.has('answer-note')).length, 0, 'stale note removed');
  assert.equal(input.dataset.answerState, 'correct');
});

test('a button takes the badge as a child, so its grid cell keeps its width', async () => {
  const { markControl } = await loadModule();
  const parent = document.createElement('div');
  const button = mountInput(parent, 'button');

  markControl(button, { ok: false, expected: 'der', inside: true });

  assert.equal(parent.children.length, 1, 'no wrapper around a grid button');
  assert.equal(parent.children[0], button);
  assert.equal(badgeOf(button).textContent, '❌');
  assert.equal(noteOf(button).textContent, 'der');
});

test('clearAnswerMarks also strips marks living inside a button', async () => {
  const { markControl, clearAnswerMarks } = await loadModule();
  const parent = document.createElement('div');
  const button = mountInput(parent, 'button');

  markControl(button, { ok: false, expected: 'der', inside: true });
  clearAnswerMarks(parent);

  assert.equal(button.children.length, 0, 'badge and note removed from the button');
  assert.equal('answerState' in button.dataset, false);
  assert.equal(parent.children.length, 1);
  assert.equal(parent.children[0], button);
});

test('clearAnswerMarks unwraps controls and strips the state', async () => {
  const { markControl, clearAnswerMarks } = await loadModule();
  const parent = document.createElement('div');
  const a = mountInput(parent);
  const b = mountInput(parent);

  markControl(a, { ok: false, expected: 'x' });
  markControl(b, { ok: true });
  clearAnswerMarks(parent);

  assert.equal(parent.children.length, 2, 'controls are back where they started');
  assert.ok(parent.children.every((c) => c.matchesTag('input')));
  assert.equal('answerState' in a.dataset, false);
  assert.equal('aria-invalid' in a.attributes, false);
});

test('clearAnswerMarks survives being called on a fresh, unmarked section', async () => {
  const { clearAnswerMarks } = await loadModule();
  const parent = document.createElement('div');
  const input = mountInput(parent);

  assert.doesNotThrow(() => clearAnswerMarks(parent));
  assert.equal(parent.children.length, 1);
  assert.equal(input.parentElement, parent);
});

test('locking preserves controls that the kata itself had disabled', async () => {
  const { setSectionLocked } = await loadModule();
  // The argument is the kata's own section, not a container of sections: every
  // kata is mounted from boot, so locking a container would freeze them all.
  const section = document.createElement('div');
  const open = mountInput(section);
  const closed = mountInput(section);
  closed.disabled = true; // a noun with no plural

  setSectionLocked(section, true);
  assert.equal(open.disabled, true);
  assert.equal(closed.disabled, true);

  setSectionLocked(section, false);
  assert.equal(open.disabled, false, 'the usable field comes back');
  assert.equal(closed.disabled, true, 'the kata own rule still applies');
});

test('locking is a no-op when there is no section', async () => {
  const { setSectionLocked } = await loadModule();
  assert.doesNotThrow(() => setSectionLocked(null, true));
  assert.doesNotThrow(() => setSectionLocked(undefined, false));
});
