// tests/unit/answer-marking.test.js
// Inline marking: colour and emoji only; corrections live in the verdict panel.
// Uses the shared DOM stub, since there is no jsdom dependency in this project.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import '../helpers/bootstrap.js';

const mountInput = (parent, tag = 'input') => {
  const input = document.createElement(tag);
  parent.appendChild(input);
  return input;
};

const loadModule = async () => import('../../assets/js/platform/dom/answer-marking.js');

const badgeOf = (wrapper) => wrapper.children.find((c) => c.classList.has('answer-badge'));

test('a wrong control is flagged red with a badge and no inline correction', async () => {
  const { markControl } = await loadModule();
  const parent = document.createElement('div');
  const input = mountInput(parent);

  markControl(input, { ok: false });

  const wrapper = input.parentElement;
  assert.ok(wrapper.classList.has('answer-field'), 'the control is wrapped for the badge');
  assert.equal(input.dataset.answerState, 'wrong');
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(badgeOf(wrapper).textContent, '❌');
  assert.equal(wrapper.children.length, 2, 'the control and its badge, nothing else');
});

test('a correct control shows the badge only', async () => {
  const { markControl } = await loadModule();
  const parent = document.createElement('div');
  const input = mountInput(parent);

  markControl(input, { ok: true });

  const wrapper = input.parentElement;
  assert.equal(input.dataset.answerState, 'correct');
  assert.equal(badgeOf(wrapper).textContent, '✅');
  assert.equal(wrapper.children.length, 2);
});

test('re-marking the same control does not stack wrappers or badges', async () => {
  const { markControl } = await loadModule();
  const parent = document.createElement('div');
  const input = mountInput(parent);

  markControl(input, { ok: false });
  markControl(input, { ok: false });
  markControl(input, { ok: true });

  const wrapper = input.parentElement;
  assert.equal(parent.children.length, 1, 'still a single wrapper');
  assert.equal(wrapper.children.filter((c) => c.classList.has('answer-badge')).length, 1);
  assert.equal(badgeOf(wrapper).textContent, '✅');
  assert.equal(input.dataset.answerState, 'correct');
});

test('a button takes the badge as a child, so its grid cell keeps its width', async () => {
  const { markControl } = await loadModule();
  const parent = document.createElement('div');
  const button = mountInput(parent, 'button');

  markControl(button, { ok: false, inside: true });

  assert.equal(parent.children.length, 1, 'no wrapper around a grid button');
  assert.equal(parent.children[0], button);
  assert.equal(badgeOf(button).textContent, '❌');
  assert.equal(button.children.length, 1, 'the badge only');
});

test('clearAnswerMarks also strips marks living inside a button', async () => {
  const { markControl, clearAnswerMarks } = await loadModule();
  const parent = document.createElement('div');
  const button = mountInput(parent, 'button');

  markControl(button, { ok: false, inside: true });
  clearAnswerMarks(parent);

  assert.equal(button.children.length, 0, 'badge removed from the button');
  assert.equal('answerState' in button.dataset, false);
  assert.equal(parent.children.length, 1);
  assert.equal(parent.children[0], button);
});

test('clearAnswerMarks unwraps controls and strips the state', async () => {
  const { markControl, clearAnswerMarks } = await loadModule();
  const parent = document.createElement('div');
  const a = mountInput(parent);
  const b = mountInput(parent);

  markControl(a, { ok: false });
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
  setSectionLocked(section, true);
  assert.equal(section.inert, true);
  assert.equal(open.readOnly, true);
  assert.equal(open.disabled, false, 'locking never disables, so iOS keeps the colours');
  assert.equal(closed.disabled, true);

  setSectionLocked(section, false);
  assert.equal(section.inert, false);
  assert.equal(open.readOnly, false, 'the usable field comes back');
  assert.equal(closed.disabled, true, 'the kata own rule still applies');
});

test('locking is a no-op when there is no section', async () => {
  const { setSectionLocked } = await loadModule();
  assert.doesNotThrow(() => setSectionLocked(null, true));
  assert.doesNotThrow(() => setSectionLocked(undefined, false));
});
