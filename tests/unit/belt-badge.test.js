// tests/unit/belt-badge.test.js
// Fractional belt points have to survive the render: a half point (a skip) and
// a fresh belt's first fifth must show as a part-filled tick, not as a rounded
// tick count.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { browser, CONFIG } from '../helpers/bootstrap.js';

class FakeElement {
  constructor(tag = 'span') {
    this.tagName = tag;
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.className = '';
    this.textContent = '';
    this.title = '';
    this.vars = {};
    this.style = { setProperty: (name, value) => { this.vars[name] = value; } };
  }

  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(name, value) { this.attributes[name] = value; }
}

globalThis.document.createElement = (tag) => new FakeElement(tag);

const { GameState } = await import('../../assets/js/state.js');
const { renderBeltBadge } = await import('../../assets/js/ui/belt-badge.js');

const { milestoneInterval, promotionCredit } = CONFIG.rules;
const KATA_ID = 'test-kata';

let state;

beforeEach(() => {
  // Belt progress is persisted, so a stale counter would leak into the next test.
  browser.reset();
  state = new GameState([KATA_ID]);
});

const render = () => {
  const el = new FakeElement();
  renderBeltBadge(el, state, KATA_ID);
  return el;
};

/** The tick row is the only child that carries filled flags. */
const ticks = (el) => el.children[1].children[0].children;

test('a tick is filled only by whole points inside the current belt', () => {
  const el = render();

  assert.deepEqual(
    ticks(el).map((tick) => tick.dataset.filled),
    Array(milestoneInterval).fill('false')
  );
});

test('half a point fills the tick being earned to half its width', () => {
  for (let i = 0; i < 3; i++) state.incrementStreak(KATA_ID);
  state.applySkip(KATA_ID);

  const ticksAt = ticks(render());
  assert.deepEqual(
    ticksAt.map((tick) => tick.dataset.filled),
    ['true', 'true', 'partial', 'false', 'false']
  );
  assert.equal(ticksAt[2].vars['--tick-fill'], '50%');
});

test('a promotion renders its opening fifth as one filled tick', () => {
  for (let i = 0; i < milestoneInterval; i++) state.incrementStreak(KATA_ID);

  const el = render();

  assert.equal(state.getBeltPointsEarned(KATA_ID), promotionCredit);
  assert.deepEqual(
    ticks(el).map((tick) => tick.dataset.filled),
    ['true', 'false', 'false', 'false', 'false']
  );
  assert.equal(el.children[1].children[0].attributes['aria-valuenow'], '1');
});

test('a demotion renders the lower belt four fifths in', () => {
  for (let i = 0; i < milestoneInterval; i++) state.incrementStreak(KATA_ID);
  assert.equal(state.getCurrentBelt(KATA_ID), 1);

  // First mistake spends the promotion tick, second one crosses the boundary.
  state.resetStreak(KATA_ID);
  state.resetStreak(KATA_ID);

  const el = render();
  assert.equal(state.getBeltPointsEarned(KATA_ID), 4);
  assert.deepEqual(
    ticks(el).map((tick) => tick.dataset.filled),
    ['true', 'true', 'true', 'true', 'false']
  );
});

test('the hover text and the progressbar label quote the exact fraction', () => {
  for (let i = 0; i < 3; i++) state.incrementStreak(KATA_ID);
  state.applySkip(KATA_ID);

  const el = render();
  const label = 'White belt, 2.5 of 5 points to Yellow belt';

  assert.equal(el.title, label);
  assert.equal(el.children[1].children[0].attributes['aria-label'], label);
});