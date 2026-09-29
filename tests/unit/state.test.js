// tests/unit/state.test.js
// Belt progression and review item selection.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserStub } from '../helpers/browser-stub.js';

const browser = installBrowserStub();

const { CONFIG } = await import('../../assets/js/config.js');
const { GameState } = await import('../../assets/js/state.js');
const { SrsStore } = await import('../../assets/js/services/srs-store.js');
const { BOX_COUNT, DAY_MS } = await import('../../assets/js/services/srs-scheduler.js');

const { milestoneInterval, maxBelt, recentExclude } = CONFIG.rules;

// SrsStore.reset() in beforeEach drops its module cache, so a fixed kata id is
// safe now -- no counter needed.
const KATA_ID = 'test-kata';

beforeEach(() => {
  SrsStore.reset();
  browser.reset();
});

const stateFor = (id = KATA_ID) => ({ kataId: id, state: new GameState([id]) });

/** A stored record for an item sitting in the given box. */
const inBox = (box) => ({ box, dueAt: 0 });

/**
 * Draws `times` times with a sweep of evenly spaced tickets instead of real
 * randomness, so the distribution assertions below are deterministic: every
 * point of the [0,1) range gets exercised, and the only way to reach an item
 * is for its slice of the range to be non-empty.
 */
const sweep = (times) => {
  let i = 0;
  return () => (i++ % times) / times + 0.5 / times;
};

/** Draws `times` times and returns how often each id came up. */
const drawMany = (state, dataset, kataId, times = 100) => {
  const rng = sweep(times);
  const counts = new Map(dataset.map(({ id }) => [id, 0]));
  for (let i = 0; i < times; i++) {
    const id = state.pickNext(dataset, kataId, rng).id;
    counts.set(id, counts.get(id) + 1);
  }
  return counts;
};

test('a correct answer promotes exactly once per milestone', () => {
  const { kataId, state } = stateFor();
  const flags = [];
  for (let i = 0; i < milestoneInterval; i++) flags.push(state.incrementStreak(kataId));

  assert.deepEqual(flags, [false, false, false, false, true]);
  assert.equal(state.getCurrentBelt(kataId), 1);
  assert.equal(state.getBeltProgressPct(kataId), 0);
  assert.equal(state.maxStreak, milestoneInterval);
});

test('belt progress is capped and the final belt is always full', () => {
  const { kataId, state } = stateFor();
  for (let i = 0; i < (maxBelt + 1) * milestoneInterval * 2; i++) state.incrementStreak(kataId);

  // Assert the raw counter, not just the clamped belt, otherwise the cap in
  // incrementStreak() is unobservable.
  assert.equal(state.beltProgress[kataId], maxBelt * (milestoneInterval + 1));
  assert.equal(state.getCurrentBelt(kataId), maxBelt);
  assert.equal(state.getBeltProgressPct(kataId), 100, 'the final belt is always full');
});

test('a mistake steps belt progress back and reports the belt drop', () => {
  const { kataId, state } = stateFor();
  for (let i = 0; i < milestoneInterval; i++) state.incrementStreak(kataId);
  assert.equal(state.getCurrentBelt(kataId), 1);
  assert.equal(state.beltProgress[kataId], milestoneInterval);

  assert.equal(state.resetStreak(kataId), true, 'promotion reversed, back to belt 0');
  assert.equal(state.getCurrentBelt(kataId), 0);
  assert.equal(state.streak, 0);
  assert.equal(state.resetStreak(kataId), false, 'already at the first belt');
});

test('belt progress never drops below zero', () => {
  const { kataId, state } = stateFor();
  for (let i = 0; i < milestoneInterval + 2; i++) state.resetStreak(kataId);
  assert.equal(state.beltProgress[kataId], 0);
});

test('belt progress is persisted per kata', () => {
  const { kataId, state } = stateFor();
  state.incrementStreak(kataId);
  state.incrementStreak(kataId);

  const restored = new GameState([kataId]);
  assert.equal(restored.beltProgress[kataId], 2);
});

test('the streak carries across kata switches and is stored once, globally', () => {
  const [first, second] = [KATA_ID, 'test-kata-two'];
  const state = new GameState([first, second]);
  state.incrementStreak(first);
  state.incrementStreak(first);
  // A different kata must extend the same run, not start a parallel counter.
  state.incrementStreak(second);

  assert.equal(state.streak, 3);
  assert.equal(state.beltProgress[first], 2, 'belt progress stays per kata');
  assert.equal(state.beltProgress[second], 1, 'belt progress stays per kata');

  const restored = new GameState([first, second]);
  assert.equal(restored.streak, 3, 'one global streak, not one per kata');
  assert.equal(restored.maxStreak, 3);
});

test('a mistake in one kata breaks the global streak without touching another kata\'s belt', () => {
  const [first, second] = [KATA_ID, 'test-kata-two'];
  const state = new GameState([first, second]);
  for (let i = 0; i < milestoneInterval; i++) state.incrementStreak(first);
  assert.equal(state.getCurrentBelt(first), 1);

  // Wrong answer in the *other* kata: the streak dies, the earned belt stands.
  state.resetStreak(second);

  assert.equal(state.streak, 0, 'the streak is global, so any mistake resets it');
  assert.equal(state.getCurrentBelt(first), 1, 'belts are earned per kata and are not forfeit');
  assert.equal(state.beltProgress[second], 0);
});

test('legacy per-kata streak counters are folded into one global streak', () => {
  // What the app wrote before the streak became global: dm_streak_<kataId>.
  browser.storage.setItem(`${CONFIG.storage.streak}_nouns`, '3');
  browser.storage.setItem(`${CONFIG.storage.streak}_verbs`, '5');
  browser.storage.setItem(`${CONFIG.storage.maxStreak}_nouns`, '4');
  browser.storage.setItem(`${CONFIG.storage.maxStreak}_verbs`, '9');

  const state = new GameState(['nouns', 'verbs']);

  assert.equal(state.streak, 5, 'the best live run carries over');
  assert.equal(state.maxStreak, 9, 'the best record carries over');
  assert.equal(browser.storage.getItem(CONFIG.storage.streak), '5', 'migrated into the global key');
  assert.equal(browser.storage.getItem(CONFIG.storage.maxStreak), '9');

  // A later session must keep its own numbers, not re-run the migration.
  state.incrementStreak('nouns');
  const restored = new GameState(['nouns', 'verbs']);
  assert.equal(restored.streak, 6);
  assert.equal(restored.maxStreak, 9);
});

test('the active kata is restored from storage and rejects unknown ids', () => {
  const [first, second] = [KATA_ID, 'test-kata-two'];
  const state = new GameState([first, second]);
  assert.equal(state.activeKata, first);

  state.setActiveKata(second);
  assert.equal(new GameState([first, second]).activeKata, second);

  state.setActiveKata('not-a-kata');
  assert.equal(state.activeKata, second, 'an unknown kata is ignored');
});

test('pickNext returns null for an empty dataset', () => {
  const { kataId, state } = stateFor();
  assert.equal(state.pickNext([], kataId), null);
  assert.equal(state.pickNext(null, kataId), null);
});

test('pickNext draws low-box items far more often than top-box ones', () => {
  const { kataId, state } = stateFor();
  const dataset = [{ id: 'fresh' }, { id: 'top' }];
  SrsStore.set(kataId, 'top', inBox(BOX_COUNT - 1));

  // With BOX_COUNT boxes, box 0 takes the first 6/7 of the ticket range and the
  // top box the last 1/7. A 100-step sweep lands 86 vs 14.
  const counts = drawMany(state, dataset, kataId);
  assert.equal(counts.get('fresh'), 86, `fresh was drawn ${counts.get('fresh')} times`);
  assert.equal(counts.get('top'), 14, `top was drawn ${counts.get('top')} times`);
  assert.ok(counts.get('top') > 0, 'the top box is not locked away, only rarer');
});

test('pickNext gives an unseen item the same odds as the first box', () => {
  const { kataId, state } = stateFor();
  const dataset = [{ id: 'unseen' }, { id: 'top' }];
  SrsStore.set(kataId, 'top', inBox(BOX_COUNT - 1));

  const counts = drawMany(state, dataset, kataId);
  assert.equal(counts.get('unseen'), 86, 'no record must read as box 0, not as the top box');
});

test('pickNext spreads a dataset of equally weighted items', () => {
  // Selection is a random draw, not a fixed order, so every item must come up.
  const { kataId, state } = stateFor();
  const dataset = Array.from({ length: 4 }, (_, i) => ({ id: `n_${i}` }));

  // Equal weights split the range four ways: 25 tickets each out of 100.
  const counts = drawMany(state, dataset, kataId);
  for (const [id, count] of counts) {
    assert.equal(count, 25, `item ${id} was drawn ${count} times, expected 25`);
  }
});

test('pickNext ignores due times entirely', () => {
  // dueAt only feeds the badge. A not-yet-due item is as drawable as an overdue one.
  const { kataId, state } = stateFor();
  const dataset = [{ id: 'overdue' }, { id: 'future' }];
  SrsStore.set(kataId, 'overdue', { box: 0, dueAt: Date.now() - 30 * DAY_MS });
  SrsStore.set(kataId, 'future', { box: 0, dueAt: Date.now() + 30 * DAY_MS });

  // Same box, so an even 50/50 split. Any due-date bias would skew this.
  const counts = drawMany(state, dataset, kataId);
  assert.equal(counts.get('overdue'), 50, 'an overdue item is not privileged');
  assert.equal(counts.get('future'), 50, 'a future item is not skipped');
});

test('pickNext serves every item once before repeating when the dataset is large', () => {
  const { kataId, state } = stateFor();
  const dataset = Array.from({ length: recentExclude + 1 }, (_, i) => ({ id: `n_${i}` }));
  const served = new Set();

  for (let i = 0; i < dataset.length; i++) {
    const item = state.pickNext(dataset, kataId);
    assert.ok(!served.has(item.id), `item ${item.id} was served twice inside the recent window`);
    served.add(item.id);
  }
  assert.equal(served.size, dataset.length);
});

test('no item is excluded when the dataset fits inside the recent window', () => {
  const kataId = KATA_ID;
  const state = new GameState([kataId]);
  // Exactly recentExclude items, so the skip set must be disabled. The last item
  // in the list is the canary: if exclusion were active it would never be drawn.
  const dataset = Array.from({ length: recentExclude }, (_, i) => ({ id: `s_${i}` }));
  const canary = dataset[dataset.length - 1].id;

  const counts = drawMany(state, dataset, kataId);
  assert.ok(counts.get(canary) > 0, 'the last item is still servable');
});

test('max streak survives a mistake', () => {
  const { kataId, state } = stateFor();
  for (let i = 0; i < 3; i++) state.incrementStreak(kataId);
  state.resetStreak(kataId);

  assert.equal(state.streak, 0);
  assert.equal(state.maxStreak, 3, 'the best run is remembered');

  // A later run must not lower the record, so increment past the old best.
  state.incrementStreak(kataId);
  assert.equal(state.maxStreak, 3, 'a short new run does not erase the old best');

  const restored = new GameState([kataId]);
  assert.equal(restored.maxStreak, 3, 'the best run is persisted');
});

test('recordAnswer moves the item up from its stored box, not from a fresh one', () => {
  const kataId = KATA_ID;
  const state = new GameState([kataId]);
  const itemId = 'n_1';

  SrsStore.set(kataId, itemId, inBox(3));
  state.recordAnswer(kataId, itemId, true);

  // 3 -> 4. A fresh record would have landed on box 1.
  assert.equal(SrsStore.get(kataId, itemId).box, 4);
});

test('recordAnswer promotes on a correct answer and resets on a mistake', () => {
  const kataId = KATA_ID;
  const state = new GameState([kataId]);
  const itemId = 'n_1';

  state.recordAnswer(kataId, itemId, true);
  assert.equal(SrsStore.get(kataId, itemId).box, 1, 'a correct answer climbs one box');

  state.recordAnswer(kataId, itemId, true);
  state.recordAnswer(kataId, itemId, false);
  const afterBad = SrsStore.get(kataId, itemId);
  assert.equal(afterBad.box, 0, 'a mistake drops the item to the first box');
  assert.ok(afterBad.dueAt <= Date.now(), 'and makes it due right away');
});

test('getDueCount counts only items due now', () => {
  const kataId = KATA_ID;
  const state = new GameState([kataId]);

  SrsStore.set(kataId, 'due', { box: 1, dueAt: Date.now() - 1 });
  SrsStore.set(kataId, 'later', { box: 1, dueAt: Date.now() + 4 * DAY_MS });
  assert.equal(state.getDueCount(kataId), 1);
});
