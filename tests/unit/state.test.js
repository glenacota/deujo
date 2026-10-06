// tests/unit/state.test.js
// Belt progression and review item selection.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { browser, CONFIG } from '../helpers/bootstrap.js';

const { GameState } = await import('../../assets/js/state.js');
const { SrsStore } = await import('../../assets/js/platform/srs-store.js');
const { BOX_COUNT, DAY_MS } = await import('../../assets/js/services/srs-scheduler.js');

const { milestoneInterval, maxBelt, recentExclude, promotionCredit, demotionCredit } = CONFIG.rules;

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

test('the current item is held per kata and ignores unknown katas', () => {
  const { kataId, state } = stateFor();
  assert.equal(state.currentItem(kataId), null);

  const item = { id: 'x_1' };
  state.setCurrentItem(kataId, item);
  assert.equal(state.currentItem(kataId), item);

  state.setCurrentItem(kataId, undefined);
  assert.equal(state.currentItem(kataId), null);

  state.setCurrentItem('nope', item);
  assert.equal(state.currentItem('nope'), null);
});

test('a correct answer promotes exactly once per milestone', () => {
  const { kataId, state } = stateFor();
  const flags = [];
  for (let i = 0; i < milestoneInterval; i++) flags.push(state.incrementStreak(kataId));

  assert.deepEqual(flags, [false, false, false, false, true]);
  assert.equal(state.getCurrentBelt(kataId), 1);
  assert.equal(state.getBeltPointsEarned(kataId), promotionCredit);
  assert.equal(state.maxStreak, milestoneInterval);
});

test('getBeltPointsEarned counts whole points inside the current belt', () => {
  const { kataId, state } = stateFor();
  const earned = [];
  // One extra point past the promotion so the counter restarts at the boundary.
  for (let i = 0; i <= milestoneInterval; i++) {
    earned.push(state.getBeltPointsEarned(kataId));
    state.incrementStreak(kataId);
  }

  assert.deepEqual(earned, [0, 1, 2, 3, 4, promotionCredit], 'the counter restarts on promotion');
});

test('a promotion always starts the new belt one fifth in, overflow discarded', () => {
  const { kataId, state } = stateFor();
  const starts = [];

  // The top rank always reads full, so the rule is only observable below it.
  for (let belt = 0; belt < maxBelt - 1; belt++) {
    // Walk up to the boundary from a fractional position, so the winning answer
    // overshoots it and any carried-over overflow shows up in the next belt.
    // A skip follows a hit, otherwise it would drop back out of the belt.
    while (state.getCurrentBelt(kataId) === belt) {
      state.incrementStreak(kataId);
      if (state.getCurrentBelt(kataId) === belt) state.applySkip(kataId);
    }
    starts.push(state.getBeltPointsEarned(kataId));
  }

  assert.deepEqual(starts, Array(maxBelt - 1).fill(promotionCredit), 'every belt starts at 1/5');
  assert.equal(promotionCredit / milestoneInterval, 0.2, 'one fifth of the belt');
});

test('a skip costs half a point and leaves the streak alone', () => {
  const { kataId, state } = stateFor();
  state.incrementStreak(kataId);
  state.incrementStreak(kataId);

  assert.equal(state.applySkip(kataId), false);
  assert.equal(state.beltProgress[kataId], 1.5);
  assert.equal(state.streak, 2, 'a skipped item is not a wrong answer');
});

test('a skip that crosses a belt boundary reports the drop', () => {
  const { kataId, state } = stateFor();
  for (let i = 0; i < milestoneInterval; i++) state.incrementStreak(kataId);
  assert.equal(state.getCurrentBelt(kataId), 1);
  assert.equal(state.getBeltPointsEarned(kataId), promotionCredit);

  // The promotion credit is the first thing a skip spends, so it takes three of
  // them to cross back over the boundary.
  assert.equal(state.applySkip(kataId), false, '0.5 points into belt 1');
  assert.equal(state.applySkip(kataId), false, '0 points is still belt 1');
  assert.equal(state.applySkip(kataId), true, 'back over the boundary into belt 0');
  assert.equal(state.getCurrentBelt(kataId), 0);
  assert.equal(state.getBeltPointsEarned(kataId), demotionCredit, 'a demotion lands at 80%');
  assert.equal(state.streak, milestoneInterval, 'a skip does not break the streak');
});

test('a demotion always lands the lower belt at four fifths', () => {
  const { kataId, state } = stateFor();
  // Climb to the second belt, then walk it down one point at a time.
  for (let belt = 0; belt < 3; belt++) {
    while (state.getCurrentBelt(kataId) === belt) {
      state.incrementStreak(kataId);
      if (state.getCurrentBelt(kataId) === belt) state.applySkip(kataId);
    }
  }
  assert.equal(state.getCurrentBelt(kataId), 3);

  // A mistake spends the promotion tick, the next one crosses the boundary.
  assert.equal(state.resetStreak(kataId), false);
  assert.equal(state.resetStreak(kataId), true);
  assert.equal(state.getCurrentBelt(kataId), 2);
  assert.equal(state.getBeltPointsEarned(kataId), demotionCredit);
  assert.equal(demotionCredit / milestoneInterval, 0.8, '80% of the belt');
});

test('a skip never pushes belt progress below zero', () => {
  const { kataId, state } = stateFor();
  state.applySkip(kataId);
  state.applySkip(kataId);

  assert.equal(state.beltProgress[kataId], 0);
  assert.equal(state.getCurrentBelt(kataId), 0);
});

test('a skip does not touch the SRS schedule of the skipped item', () => {
  const { kataId, state } = stateFor();
  const record = inBox(3);
  SrsStore.set(kataId, 'item-1', record);

  state.applySkip(kataId);

  assert.deepEqual(SrsStore.get(kataId, 'item-1'), record, 'skipping grades nothing');
});

test('getBeltPointsEarned fills the final belt', () => {
  const { kataId, state } = stateFor();
  for (let i = 0; i < maxBelt * (milestoneInterval + 1); i++) state.incrementStreak(kataId);

  assert.equal(state.getCurrentBelt(kataId), maxBelt);
  assert.equal(state.getBeltPointsEarned(kataId), milestoneInterval, 'top rank reads as full, not 0');
});

test('belt progress is capped and the final belt is always full', () => {
  const { kataId, state } = stateFor();
  for (let i = 0; i < (maxBelt + 1) * milestoneInterval * 2; i++) state.incrementStreak(kataId);

  // Assert the raw counter, not just the clamped belt, otherwise the cap in
  // incrementStreak() is unobservable.
  assert.equal(state.beltProgress[kataId], maxBelt * (milestoneInterval + 1));
  assert.equal(state.getCurrentBelt(kataId), maxBelt);
  assert.equal(state.getBeltPointsEarned(kataId), milestoneInterval, 'the final belt is always full');
});

test('a mistake steps belt progress back and reports the belt drop', () => {
  const { kataId, state } = stateFor();
  for (let i = 0; i < milestoneInterval; i++) state.incrementStreak(kataId);
  assert.equal(state.getCurrentBelt(kataId), 1);
  assert.equal(state.beltProgress[kataId], milestoneInterval + promotionCredit);

  // The promotion credit absorbs the first mistake, so the second one demotes.
  assert.equal(state.resetStreak(kataId), false, 'still exactly on the boundary');
  assert.equal(state.getCurrentBelt(kataId), 1);
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

test('hand-edited belt progress is clamped on load', () => {
  const { kataId } = stateFor();
  const max = maxBelt * (milestoneInterval + 1);

  browser.storage.setItem(`${CONFIG.storage.belt}_${kataId}`, '-7');
  assert.equal(new GameState([kataId]).beltProgress[kataId], 0);
  assert.equal(new GameState([kataId]).getCurrentBelt(kataId), 0);

  browser.storage.setItem(`${CONFIG.storage.belt}_${kataId}`, '9999');
  assert.equal(new GameState([kataId]).beltProgress[kataId], max);
});

test('setActiveKata ignores inherited property names', () => {
  const { state } = stateFor();
  state.setActiveKata('constructor');
  assert.equal(state.activeKata, KATA_ID);
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

test('pickNext draws due items uniformly, whatever box they sit in', () => {
  const { kataId, state } = stateFor();
  const dataset = [{ id: 'fresh' }, { id: 'top' }];
  SrsStore.set(kataId, 'top', inBox(BOX_COUNT - 1));

  // A 100-step sweep of [0,1) splits evenly between two candidates: 50 vs 50.
  const counts = drawMany(state, dataset, kataId);
  assert.equal(counts.get('fresh'), 50, `fresh was drawn ${counts.get('fresh')} times`);
  assert.equal(counts.get('top'), 50, `top was drawn ${counts.get('top')} times`);
});

test('pickNext gives an unseen item the same odds as a due record', () => {
  const { kataId, state } = stateFor();
  const dataset = [{ id: 'unseen' }, { id: 'top' }];
  SrsStore.set(kataId, 'top', inBox(BOX_COUNT - 1));

  const counts = drawMany(state, dataset, kataId);
  assert.equal(counts.get('unseen'), 50, 'an unseen item is due, so it competes on equal odds');
});

test('pickNext spreads a dataset of equally weighted items', () => {
  // Selection is a random draw, not a fixed order, so every item must come up.
  const { kataId, state } = stateFor();
  const dataset = Array.from({ length: 4 }, (_, i) => ({ id: `n_${i}` }));

  // Four candidates, one quarter of the [0,1) range each: 25 out of 100.
  const counts = drawMany(state, dataset, kataId);
  for (const [id, count] of counts) {
    assert.equal(count, 25, `item ${id} was drawn ${count} times, expected 25`);
  }
});

test('pickNext skips known items whose due time is in the future', () => {
  const { kataId, state } = stateFor();
  const now = 1_700_000_000_000;
  const dataset = [{ id: 'due' }, { id: 'future' }];
  SrsStore.set(kataId, 'due', { box: 0, dueAt: now });
  SrsStore.set(kataId, 'future', { box: 0, dueAt: now + 30 * DAY_MS });

  assert.equal(state.pickNext(dataset, kataId, () => 0.99, now).id, 'due');
});

test('pickNext always makes unseen items eligible alongside future records', () => {
  const { kataId, state } = stateFor();
  const now = 1_700_000_000_000;
  const dataset = [{ id: 'unseen' }, { id: 'future' }];
  SrsStore.set(kataId, 'future', { box: 0, dueAt: now + 30 * DAY_MS });

  assert.equal(state.pickNext(dataset, kataId, () => 0.99, now).id, 'unseen');
});

test('pickNext falls back to the available pool when no item is due', () => {
  const { kataId, state } = stateFor();
  const now = 1_700_000_000_000;
  const dataset = [{ id: 'future-a' }, { id: 'future-b' }];
  for (const { id } of dataset) {
    SrsStore.set(kataId, id, { box: 0, dueAt: now + 30 * DAY_MS });
  }

  assert.ok(dataset.some(({ id }) => id === state.pickNext(dataset, kataId, () => 0.99, now).id));
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

  SrsStore.set(kataId, itemId, inBox(1));
  state.recordAnswer(kataId, itemId, true);

  // 1 -> 2. A fresh record would have landed on box 1.
  assert.equal(SrsStore.get(kataId, itemId).box, 2);
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
