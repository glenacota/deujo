// tests/unit/answer-view.test.js
// Inline marking: colour, emoji, and the corrections that travel with them.
// Uses a tiny DOM stand-in, since there is no jsdom dependency in this project.

import { test } from 'node:test';
import assert from 'node:assert/strict';

class FakeClassList extends Set {
  contains(name) { return this.has(name); }
  add(...names) { super.add(...names); }
  toggle(name, force) {
    const on = force ?? !this.has(name);
    if (on) this.add(name);
    else this.delete(name);
    return on;
  }
}

class FakeElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.classList = new FakeClassList();
    this.dataset = {};
    this.attributes = {};
    this.textContent = '';
    this.disabled = false;
  }

  get className() { return [...this.classList].join(' '); }
  set className(value) { this.classList = new FakeClassList(value.split(/\s+/).filter(Boolean)); }

  appendChild(child) { return this.insertBefore(child, null); }
  insertBefore(child, ref) {
    // Real DOM reparents: the child leaves its old parent.
    child.remove();
    child.parentElement = this;
    const index = ref ? this.children.indexOf(ref) : this.children.length;
    this.children.splice(index < 0 ? this.children.length : index, 0, child);
    return child;
  }
  remove() {
    if (!this.parentElement) return;
    const siblings = this.parentElement.children;
    siblings.splice(siblings.indexOf(this), 1);
    this.parentElement = null;
  }
  replaceWith(node) {
    const parent = this.parentElement;
    if (!parent) return;
    parent.children[parent.children.indexOf(this)] = node;
    node.parentElement = parent;
    this.parentElement = null;
  }
  before(node) { this.parentElement?.insertBefore(node, this); }

  descendants() { return this.children.flatMap((c) => [c, ...c.descendants()]); }

  /** Supports the selector shapes this module actually uses: tag lists, single classes, and `.class > [attr]`. */
  querySelectorAll(selector) {
    const source = selector.trim();
    const [combinator, rest] = source.includes('>')
      ? source.split('>').map((s) => s.trim())
      : [null, source];
    if (combinator) assert.ok(combinator.startsWith('.'), `stub only handles a leading class, got "${combinator}"`);
    // A direct-child combinator restricts the search to this element's children.
    const scope = combinator ? this.children : this.descendants();

    return scope.filter((el) => rest.split(',').map((s) => s.trim()).some((part) => {
      if (part.startsWith('.')) return el.classList.has(part.slice(1));
      if (part.startsWith('[')) return part === '[data-answer-state]' ? 'answerState' in el.dataset : false;
      return el.matchesTag(part);
    }));
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  matchesTag(tag) { return this.tagName === tag.toUpperCase(); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }
}

const mountInput = (parent, tag = 'input') => {
  const input = new FakeElement(tag);
  parent.appendChild(input);
  return input;
};

const loadModule = async () => {
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  return import('../../assets/js/ui/answer-view.js');
};

const badgeOf = (wrapper) => wrapper.children.find((c) => c.classList.has('answer-badge'));
const noteOf = (wrapper) => wrapper.children.find((c) => c.classList.has('answer-note'));

test('a wrong control is flagged red and shows the expected value inline', async () => {
  const { markControl } = await loadModule();
  const parent = new FakeElement();
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
  const parent = new FakeElement();
  const input = mountInput(parent);

  markControl(input, { ok: true, expected: 'die Bäume' });

  const wrapper = input.parentElement;
  assert.equal(input.dataset.answerState, 'correct');
  assert.equal(badgeOf(wrapper).textContent, '✅');
  assert.equal(noteOf(wrapper), undefined, 'a correct answer needs no inline correction');
});

test('note: false suppresses the correction on a wrong control', async () => {
  const { markControl } = await loadModule();
  const parent = new FakeElement();
  const input = mountInput(parent);

  markControl(input, { ok: false, expected: 'geht', note: false });

  assert.equal(input.dataset.answerState, 'wrong');
  assert.equal(badgeOf(input.parentElement).textContent, '❌');
  assert.equal(noteOf(input.parentElement), undefined);
});

test('re-marking the same control does not stack wrappers, badges, or notes', async () => {
  const { markControl } = await loadModule();
  const parent = new FakeElement();
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
  const parent = new FakeElement();
  const button = mountInput(parent, 'button');

  markControl(button, { ok: false, expected: 'der', inside: true });

  assert.equal(parent.children.length, 1, 'no wrapper around a grid button');
  assert.equal(parent.children[0], button);
  assert.equal(badgeOf(button).textContent, '❌');
  assert.equal(noteOf(button).textContent, 'der');
});

test('clearAnswerMarks also strips marks living inside a button', async () => {
  const { markControl, clearAnswerMarks } = await loadModule();
  const parent = new FakeElement();
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
  const parent = new FakeElement();
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
  const parent = new FakeElement();
  const input = mountInput(parent);

  assert.doesNotThrow(() => clearAnswerMarks(parent));
  assert.equal(parent.children.length, 1);
  assert.equal(input.parentElement, parent);
});

test('locking preserves controls that the kata itself had disabled', async () => {
  const { setSectionLocked } = await loadModule();
  const parent = new FakeElement();
  const open = mountInput(parent);
  const closed = mountInput(parent);
  closed.disabled = true; // a noun with no plural

  setSectionLocked(parent, true);
  assert.equal(open.disabled, true);
  assert.equal(closed.disabled, true);

  setSectionLocked(parent, false);
  assert.equal(open.disabled, false, 'the usable field comes back');
  assert.equal(closed.disabled, true, 'the kata own rule still applies');
});
