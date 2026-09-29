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

// SrsStore.reset() in beforeEach drops its module cache, so a fixed kata id is
// safe now -- no counter needed.
const KATA_ID = 'test-kata';

beforeEach(() => {
  SrsStore.reset();
  browser.reset();
});

const stateFor = (id = KATA_ID) => ({ kataId: id, state: new GameState([id]) });

// A test that needs two SRS stores alive at once needs a second id.
let uniqueCounter = 0;
const freshUniqueId = () => `${KATA_ID}-${uniqueCounter++}`;

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

test('no item is excluded when the dataset fits inside the recent window', () => {
  const kataId = KATA_ID;
  const state = new GameState([kataId]);
  // One item fewer than recentExclude, so the skip set must be disabled.
  // dataset[0] can never mask a wrongly-skipped item here, because the due item
  // is not first: if exclusion were active the fresh items would win instead.
  const due = { id: 's_due' };
  const fresh = Array.from({ length: recentExclude - 1 }, (_, i) => ({ id: `s_${i}` }));
  const dataset = [...fresh, due];
  SrsStore.set(kataId, due.id, { ...newRecord(), step: null, interval: 3, dueAt: Date.now() - DAY_MS });

  for (let i = 0; i < recentExclude + 2; i++) {
    assert.equal(state.pickNext(dataset, kataId).id, due.id, 'the due item stays servable');
  }
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

test('pickNext treats an item due exactly now as due', () => {
  const kataId = KATA_ID;
  const state = new GameState([kataId]);
  const now = 1_700_000_000_000;
  SrsStore.set(kataId, 'exact', { ...newRecord(), step: null, interval: 4, dueAt: now });
  SrsStore.set(kataId, 'later', { ...newRecord(), step: null, interval: 4, dueAt: now + DAY_MS });
  const scheduled = [{ id: 'later' }, { id: 'exact' }];

  assert.equal(state.pickNext(scheduled, kataId, now).id, 'exact', 'the boundary is inclusive');
  // One millisecond earlier nothing is due yet, so the soonest upcoming item wins.
  assert.equal(state.pickNext(scheduled, kataId, now - 1).id, 'exact');
  // Same one millisecond, but now an unseen item is available to beat the
  // merely-upcoming 'exact'. This is what pins the boundary as inclusive.
  assert.equal(state.pickNext([{ id: 'exact' }, { id: 'newcomer' }], kataId, now).id, 'exact');
  assert.equal(state.pickNext([{ id: 'exact' }, { id: 'newcomer' }], kataId, now - 1).id, 'newcomer');
});

test('pickNext spreads tied items instead of always returning the first', () => {
  // Equal dueAt values must not pile up on one item, so ties are broken at
  // random. Over many calls every tied item must come up.
  const tied = ['tie_a', 'tie_b', 'tie_c'].map((id) => ({ id }));
  const now = 1_700_000_000_000;

  for (const dueAt of [now - DAY_MS, now + DAY_MS]) {
    const kataId = freshUniqueId();
    const state = new GameState([kataId]);
    tied.forEach(({ id }) => SrsStore.set(kataId, id, { ...newRecord(), step: null, interval: 3, dueAt }));

    const seen = new Set();
    for (let i = 0; i < 200; i++) seen.add(state.pickNext(tied, kataId, now).id);
    assert.equal(seen.size, tied.length, `dueAt ${dueAt} kept repeating one tied item`);
  }
});

test('pickNext prefers the most overdue item when several are due', () => {
  const kataId = KATA_ID;
  const state = new GameState([kataId]);
  const now = 1_700_000_000_000;
  SrsStore.set(kataId, 'slightly', { ...newRecord(), step: null, interval: 4, dueAt: now - DAY_MS });
  SrsStore.set(kataId, 'very', { ...newRecord(), step: null, interval: 9, dueAt: now - 9 * DAY_MS });
  SrsStore.set(kataId, 'recent', { ...newRecord(), step: null, interval: 2, dueAt: now - 1 });

  const dataset = [{ id: 'slightly' }, { id: 'recent' }, { id: 'very' }];
  assert.equal(state.pickNext(dataset, kataId, now).id, 'very');
});

test('recordAnswer schedules from the stored record, not a fresh one', () => {
  const kataId = KATA_ID;
  const state = new GameState([kataId]);
  const itemId = 'n_1';

  SrsStore.set(kataId, itemId, { interval: 20, ease: 2.5, dueAt: 0, lapses: 2, step: null });
  state.recordAnswer(kataId, itemId, true);

  // 20 * ease 2.5 = 50 days, then the ±5% fuzz. A fresh record would give 1 day.
  const after = SrsStore.get(kataId, itemId);
  assert.ok(after.interval >= 47 && after.interval <= 53, `interval was ${after.interval}, expected ~50`);
  assert.equal(after.lapses, 2, 'the lapse history carried over');
});

test('recordAnswer schedules good answers and re-schedules on failure', () => {
  const kataId = KATA_ID;
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
  const kataId = KATA_ID;
  const state = new GameState([kataId]);

  SrsStore.set(kataId, 'due', { ...newRecord(), step: null, interval: 4, dueAt: Date.now() - 1 });
  SrsStore.set(kataId, 'later', {
    ...newRecord(), step: null, interval: 4, dueAt: Date.now() + 4 * DAY_MS,
  });
  assert.equal(state.getDueCount(kataId), 1);
});
