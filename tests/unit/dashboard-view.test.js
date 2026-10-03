// tests/unit/dashboard-view.test.js
// Contract: kataCardTemplate ships the nodes DashboardView wires up (see
// .code_reviews).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import '../helpers/bootstrap.js';

const { dom } = await import('../../assets/js/ui/dom.js');
const { DashboardView } = await import('../../assets/js/ui/dashboard-view.js');

test('kataCardTemplate contains a [data-role="belt"] label', async () => {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  const template = /<template id="kataCardTemplate">([\s\S]*?)<\/template>/.exec(html);
  assert.ok(template, 'kataCardTemplate not found in index.html');
  assert.match(template[1], /data-role="belt"/);
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

test('render wires a real card and belt node for every kata', () => {
  const cards = stubDashboardDom(['hotkey', 'name', 'subtitle', 'belt']);
  const view = new DashboardView();

  view.render([
    { id: 'nouns', accent: 'indigo', name: 'Nouns', subtitle: 'Genders' },
    { id: 'verbs', accent: 'teal', name: 'Verbs', subtitle: 'Tenses' },
  ]);

  assert.deepEqual(cards[0]._roles.name.textContent, 'Nouns');
  assert.notEqual(view.getCard('nouns'), null, 'the card node must be a real element');
  assert.notEqual(view.getBelt('verbs'), null, 'the belt node must be a real element');
  assert.equal(view.getCard('nouns')._roles.hotkey.textContent, '⇧ + 1');
  assert.equal(view.getCard('verbs')._roles.hotkey.textContent, '⇧ + 2');
});
