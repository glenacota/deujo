// tests/unit/dashboard-view.test.js
// Contract: kataCardTemplate ships a due-count badge, and DashboardView wires
// it to a real node rather than silently no-opping (see .code_reviews).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { installBrowserStub } from '../helpers/browser-stub.js';
installBrowserStub();

const { dom } = await import('../../assets/js/ui/dom.js');
const { DashboardView } = await import('../../assets/js/ui/dashboard-view.js');

test('kataCardTemplate contains a [data-role="due"] badge', async () => {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  const template = /<template id="kataCardTemplate">([\s\S]*?)<\/template>/.exec(html);
  assert.ok(template, 'kataCardTemplate not found in index.html');
  assert.match(template[1], /data-role="due"/);
});

class FakeClassList {
  #classes = new Set(['hidden']);
  add(name) {
    this.#classes.add(name);
  }
  toggle(name, force) {
    const shouldHave = force ?? !this.#classes.has(name);
    if (shouldHave) this.#classes.add(name);
    else this.#classes.delete(name);
  }
  contains(name) {
    return this.#classes.has(name);
  }
}

class FakeElement {
  constructor() {
    this.textContent = '';
    this.classList = new FakeClassList();
    this.dataset = {};
    this._roles = {};
  }
  querySelector(selector) {
    const role = /data-role="(\w+)"/.exec(selector)?.[1];
    return (role && this._roles[role]) ?? null;
  }
}

/** A stand-in for `cardTemplate.content.cloneNode(true)`: one card with named role children. */
function makeCardFragment(roleNames) {
  const card = new FakeElement();
  for (const role of roleNames) card._roles[role] = new FakeElement();
  const fragment = {
    querySelector(selector) {
      return /data-role="card"/.test(selector) ? card : card.querySelector(selector);
    },
  };
  return { card, fragment };
}

function stubDashboardDom(roleNames) {
  const cards = [];
  dom.dashboardHome.grid = { innerHTML: '', appendChild() {} };
  dom.dashboardHome.cardTemplate = {
    content: {
      cloneNode() {
        const { card, fragment } = makeCardFragment(roleNames);
        cards.push(card);
        return fragment;
      },
    },
  };
  return cards;
}

test('setDueCount writes to the real due node produced by render', () => {
  const cards = stubDashboardDom(['hotkey', 'name', 'subtitle', 'belt', 'due']);
  const view = new DashboardView();

  view.render([{ id: 'nouns', accent: 'indigo', name: 'Nouns', subtitle: 'Genders' }]);
  const due = cards[0]._roles.due;

  assert.notEqual(due, null, 'the due node must be a real element, not the missing-node fallback');

  view.setDueCount('nouns', 3);
  assert.equal(due.textContent, '3 due');
  assert.equal(due.classList.contains('hidden'), false);

  view.setDueCount('nouns', 0);
  assert.equal(due.classList.contains('hidden'), true, 'zero due hides the badge');
});

test('render logs a warning instead of throwing when the due node is missing', () => {
  stubDashboardDom(['hotkey', 'name', 'subtitle', 'belt']); // no "due" role
  const view = new DashboardView();

  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    view.render([{ id: 'nouns', accent: 'indigo', name: 'Nouns', subtitle: 'Genders' }]);
  } finally {
    console.warn = originalWarn;
  }

  assert.ok(warnings.some((w) => w.includes('data-role="due"')), 'missing due node should warn, not fail silently');
  assert.doesNotThrow(() => view.setDueCount('nouns', 5));
});
