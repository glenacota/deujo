// tests/unit/kata-check.test.js
// End-to-end grading through a kata's own `check()`, using the existing browser
// stub. This is where a multi-answer blank has to behave, not just the matcher.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserStub } from '../helpers/browser-stub.js';
installBrowserStub();

/**
 * Enough element surface for a kata to mount, render its inputs, and grade
 * them. Not a DOM: only the handful of members the two katas actually touch.
 */
/** A classList with the DOMList methods the app calls, not just Set's. */
class StubClassList extends Set {
  contains(name) { return this.has(name); }
  add(...names) { super.add(...names); }
  remove(...names) { names.forEach((name) => this.delete(name)); }
  toggle(name, force) {
    const on = force ?? !this.has(name);
    if (on) this.add(name);
    else this.delete(name);
    return on;
  }
}

class StubElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.classList = new StubClassList();
    this.dataset = {};
    this.attributes = {};
    this.textContent = '';
    this.value = '';
    this.disabled = false;
  }

  get className() { return [...this.classList].join(' '); }
  set className(value) { this.classList = new StubClassList(value.split(/\s+/).filter(Boolean)); }

  appendChild(child) {
    if (child instanceof StubFragment) {
      // Copy first: moving a node reparents it, which empties `child.children`
      // mid-iteration and would silently drop the rest of the fragment.
      const nodes = [...child.children];
      nodes.forEach((node) => this.appendChild(node));
      return child;
    }
    child.remove();
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  before(node) { this.parentElement?.insertBefore(node, this); }

  insertBefore(node, ref) {
    node.remove();
    node.parentElement = this;
    const index = ref ? this.children.indexOf(ref) : this.children.length;
    this.children.splice(index < 0 ? this.children.length : index, 0, node);
    return node;
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

  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }

  matchesTag(tag) { return this.tagName === tag.toUpperCase(); }

  descendants() { return this.children.flatMap((child) => [child, ...child.descendants()]); }

  /** Handles the tag lists, single classes, and `.class > [attr]` shapes used here. */
  querySelectorAll(selector) {
    const [combinator, rest] = selector.trim().includes('>')
      ? selector.split('>').map((part) => part.trim())
      : [null, selector.trim()];
    const scope = combinator ? this.children : this.descendants();
    return scope.filter((el) => rest.split(',').map((part) => part.trim()).some((part) => {
      if (part.startsWith('.')) return el.classList.has(part.slice(1));
      // `[data-answer-state]` is a presence test; `[data-role="x"]` is a match.
      if (part === '[data-answer-state]') return 'answerState' in el.dataset;
      if (part.startsWith('[')) return el.dataset.role === part.match(/="([^"]+)"/)?.[1];
      return el.matchesTag(part);
    }));
  }

  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}

class StubFragment extends StubElement {}

/**
 * A template only has to hand back the one `[data-role="section"]` element its
 * markup contains, so the parser tracks only that tag and its nesting. Anything
 * else is skipped, which is enough for a kata to mount and find its own nodes.
 */
class StubTemplate extends StubElement {
  set innerHTML(html) {
    const open = /<([a-zA-Z][\w-]*)(\s[^>]*?)?>/g;
    const stack = [];
    let match;
    while ((match = open.exec(html)) !== null) {
      const [tag, name, attrs = ''] = match;
      const selfClosing = tag.endsWith('/>');
      const element = new StubElement(name);
      for (const attr of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) {
        if (attr[1] === 'data-role') element.dataset.role = attr[2];
        else element.setAttribute(attr[1], attr[2]);
      }
      (stack.at(-1) ?? this.content).appendChild(element);
      if (!selfClosing) stack.push(element);
    }
  }
}

beforeEach(() => {
  globalThis.document = {
    ...globalThis.document,
    createElement: (tag) => {
      if (tag === 'template') {
        const template = new StubTemplate();
        template.content = new StubFragment();
        return template;
      }
      return new StubElement(tag);
    },
    createDocumentFragment: () => new StubFragment(),
    createTextNode: (text) => {
      const node = new StubElement('#text');
      node.textContent = text;
      return node;
    },
  };
});

const { createPrepositionKata } = await import('../../assets/js/katas/prepositions/kata.js');
const { createCaseKata } = await import('../../assets/js/katas/cases/kata.js');

/**
 * Mounts and renders once per kata, then grades the same rendered inputs with
 * different values. A kata's `mount` is a one-time setup, so a fresh kata per
 * case would be the only way to avoid the section being reused.
 */
const graderFor = (kata, item) => {
  const container = document.createElement('div');
  kata.mount(container);
  kata.render(item);
  return (values) => {
    container.querySelectorAll('input').forEach((input, i) => { input.value = values[i]; });
    return kata.check(item);
  };
};

/** Mounts, renders, and grades in one step, for a single-shot check. */
const grade = (kata, item, values) => graderFor(kata, item)(values);

test('the preposition kata accepts the fused form for a written-out answer', () => {
  const kata = createPrepositionKata();
  const item = {
    id: 'p_test', w: 'Ich warte auf den Zug.', m: 'I am waiting for the train.',
    s: 'Ich warte {0} Zug.', b: [{ a: 'auf den', c: 'akk' }],
  };

  const answer = graderFor(kata, item);

  // "auf" + Akkusativ cannot contract, so exactly one spelling is right.
  assert.equal(answer(['auf den']).correct, true);
  assert.equal(answer(['auf dem']).correct, false);
  assert.deepEqual(answer(['auf den']).fields[0].accepted, ['auf den']);
});

test('the preposition kata reports every accepted spelling on a wrong blank', () => {
  const kata = createPrepositionKata();
  const item = {
    id: 'p_test2', w: 'Ich gehe zum Arzt.', m: 'I am going to the doctor.',
    s: 'Ich gehe {0} Arzt.', b: [{ a: 'zum', c: 'dat' }],
  };

  const wrong = grade(kata, item, ['zu der']);
  assert.equal(wrong.correct, false);
  // The correction names both spellings, so the learner sees the alternative.
  assert.deepEqual(wrong.fields[0].accepted, ['zum', 'zu dem']);
  assert.equal(wrong.fields[0].expected, 'zum');
});

test('the preposition kata honours a dataset alt list', () => {
  const kata = createPrepositionKata();
  const item = {
    id: 'p_test3', w: 'Ich fahre ins Büro.', m: 'I drive to the office.',
    s: 'Ich fahre {0} Büro.', b: [{ a: 'in das', c: 'akk', alt: ['ins Büro'] }],
  };

  const answer = graderFor(kata, item);

  assert.equal(answer(['ins']).correct, true, 'the fused form of a written-out answer');
  assert.equal(answer(['in das']).correct, true);
  assert.equal(answer(['ins Büro']).correct, true, 'an explicit alternative');
  assert.equal(answer(['im']).correct, false, 'a wrong case is still wrong');
  assert.equal(answer(['in der']).correct, false);
});

test('the case kata accepts the noun typed with its article', () => {
  const kata = createCaseKata();
  const item = {
    id: 'c_test', w: 'Der Mann liest den Roman.', m: 'The man reads the novel.',
    s: '{0} Mann liest {1} Roman.', b: [{ a: 'der', c: 'nom' }, { a: 'den', c: 'akk' }],
  };

  const answer = graderFor(kata, item);

  assert.equal(answer(['der', 'den']).correct, true);
  // The article plus its noun is the same answer, not a wrong one.
  assert.equal(answer(['der Mann', 'den Roman']).correct, true);
  // A different article, or an extra word in the middle, is still wrong.
  assert.equal(answer(['den', 'den']).correct, false);
  assert.equal(answer(['der', 'das']).correct, false);
  assert.equal(answer(['der große Mann', 'den Roman']).correct, false);
});

test('the case kata accepts an explicit alt list', () => {
  const kata = createCaseKata();
  const item = {
    id: 'c_test2', w: 'Das Kind sieht die Katze.', m: 'The child sees the cat.',
    s: 'Das Kind sieht {0} Katze.', b: [{ a: 'die', c: 'akk', alt: ['jede'] }],
  };

  const answer = graderFor(kata, item);

  assert.equal(answer(['die']).correct, true);
  assert.equal(answer(['jede']).correct, true);
  assert.equal(answer(['das']).correct, false);
});

test('an unfilled blank still blocks the check with a warning', () => {
  const kata = createPrepositionKata();
  const item = {
    id: 'p_test4', w: 'Ich warte auf dich.', m: 'I am waiting for you.',
    s: 'Ich warte {0}.', b: [{ a: 'auf dich', c: 'akk' }],
  };

  const result = grade(kata, item, ['  ']);
  assert.equal(result.warning, 'Please fill in all blanks before checking.');
  assert.equal(result.correct, undefined, 'a warning is not a verdict');
});
