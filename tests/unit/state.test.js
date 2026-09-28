// tests/unit/state.test.js
// Belt progression and spaced-repetition item selection.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserStub } from '../helpers/browser-stub.js';

const browser = installBrowserStub();

const { CONFIG } = await import('../../assets/js/config.js');
const { GameState } = await import('../../assets/js/state.js');
const { SrsStore } = await import('../../assets/js/services/srs-store.js');
const { newRecord, DAY_MS } = await import('../../assets/js/services/srs-scheduler.js');

const { milestoneInterval, maxBelt, recentExclude } = CONFIG.rules;

// SrsStore keeps its records in module state, so every test uses its own kata id.
let kataCounter = 0;
const freshKataId = () => `test-kata-${kataCounter++}`;

beforeEach(() => browser.reset());

const stateFor = (id = freshKataId()) => ({ kataId: id, state: new GameState([id]) });

test('a new kata starts on the first belt with no progress', () => {
  const { kataId, state } = stateFor();
  assert.equal(state.getCurrentBelt(kataId), 0);
  assert.equal(state.getBeltProgressPct(kataId), 0);
});

test('a correct answer promotes exactly once per milestone', () => {
  const { kataId, state } = stateFor();
  const flags = [];
  for (let i = 0; i < milestoneInterval; i++) flags.push(state.incrementStreak(kataId));

  assert.deepEqual(flags, [false, false, false, false, true]);
  assert.equal(state.getCurrentBelt(kataId), 1);
  assert.equal(state.getBeltProgressPct(kataId), 0);
  assert.equal(state.maxStreakByKata[kataId], milestoneInterval);
});

test('belt progress never exceeds the last belt', () => {
  const { kataId, state } = stateFor();
  for (let i = 0; i < (maxBelt + 1) * milestoneInterval * 2; i++) state.incrementStreak(kataId);

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
  assert.equal(state.streakByKata[kataId], 0);
  assert.equal(state.resetStreak(kataId), false, 'already at the first belt');
});

test('belt progress never drops below zero', () => {
  const { kataId, state } = stateFor();
  for (let i = 0; i < milestoneInterval + 2; i++) state.resetStreak(kataId);
  assert.equal(state.beltProgress[kataId], 0);
});

test('belt progress and streak are persisted per kata', () => {
  const { kataId, state } = stateFor();
  state.incrementStreak(kataId);
  state.incrementStreak(kataId);

  const restored = new GameState([kataId]);
  assert.equal(restored.beltProgress[kataId], 2);
  assert.equal(restored.streakByKata[kataId], 2);
  assert.equal(restored.maxStreakByKata[kataId], 2);
});

test('the active kata is restored from storage and rejects unknown ids', () => {
  const [first, second] = [freshKataId(), freshKataId()];
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

test('pickNext prefers an overdue item over a new one', () => {
  const { kataId, state } = stateFor();
  const overdue = { id: 'overdue', w: 'Tag' };
  const fresh = { id: 'fresh', w: 'Frau' };
  SrsStore.set(kataId, 'overdue', { ...newRecord(), dueAt: Date.now() - DAY_MS, step: null, interval: 3 });

  assert.equal(state.pickNext([fresh, overdue], kataId).id, 'overdue');
});

test('pickNext prefers a new item over one that is not due yet', () => {
  const { kataId, state } = stateFor();
  const fresh = { id: 'fresh', w: 'Frau' };
  SrsStore.set(kataId, 'later', {
    ...newRecord(), dueAt: Date.now() + DAY_MS, step: null, interval: 1,
  });

  assert.equal(state.pickNext([{ id: 'later' }, fresh], kataId).id, 'fresh');
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

test('pickNext does not exclude anything when the dataset is small', () => {
  const kataId = freshKataId();
  const state = new GameState([kataId]);
  const dataset = [{ id: 'only' }];
  for (let i = 0; i < recentExclude + 2; i++) {
    assert.equal(state.pickNext(dataset, kataId).id, 'only');
  }
});

test('recordAnswer schedules good answers and re-schedules on failure', () => {
  const kataId = freshKataId();
  const state = new GameState([kataId]);
  const itemId = 'n_1';

  state.recordAnswer(kataId, itemId, true);
  const afterGood = SrsStore.get(kataId, itemId);
  assert.equal(afterGood.step, 1, 'a correct answer advances the learning step');

  state.recordAnswer(kataId, itemId, false);
  const afterBad = SrsStore.get(kataId, itemId);
  assert.equal(afterBad.step, 0, 'a wrong answer returns to the first step');
  assert.equal(afterBad.dueAt, Date.now() + 60_000);
});

test('getDueCount counts only items due now', () => {
  const kataId = freshKataId();
  const state = new GameState([kataId]);
  assert.equal(state.getDueCount(kataId), 0);

  SrsStore.set(kataId, 'due', { ...newRecord(), step: null, interval: 4, dueAt: Date.now() - 1 });
  SrsStore.set(kataId, 'later', {
    ...newRecord(), step: null, interval: 4, dueAt: Date.now() + 4 * DAY_MS,
  });
  assert.equal(state.getDueCount(kataId), 1);
});
