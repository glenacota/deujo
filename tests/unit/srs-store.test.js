// tests/unit/srs-store.test.js
// SrsStore caches records in module state, so every test starts from
// SrsStore.reset() plus a cleared localStorage.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserStub } from '../helpers/browser-stub.js';

const browser = installBrowserStub();

const { CONFIG } = await import('../../assets/js/config.js');
const { SrsStore } = await import('../../assets/js/services/srs-store.js');
const { DAY_MS } = await import('../../assets/js/services/srs-scheduler.js');

const SRS_KEY = CONFIG.storage.srs;
const KATA = 'store-kata';

const valid = (over = {}) => ({ box: 2, dueAt: 0, ...over });
const seedStorage = (raw) => localStorage.setItem(SRS_KEY, raw);

beforeEach(() => {
  SrsStore.reset();
  browser.reset();
});

test('a fresh kata reads as empty', () => {
  assert.equal(SrsStore.get(KATA, 'anything'), null);
  assert.deepEqual(Object.keys(SrsStore.getKata(KATA)), []);
  assert.equal(SrsStore.countDue(KATA), 0);
});

test('set then get round-trips a record', () => {
  const record = valid({ box: 4, dueAt: 1_700_000_000_000 });
  SrsStore.set(KATA, 'item_a', record);

  assert.equal(SrsStore.get(KATA, 'item_a').box, 4);
  assert.deepEqual(Object.keys(SrsStore.getKata(KATA)), ['item_a']);
  assert.equal(Object.getPrototypeOf(SrsStore.getKata(KATA)), null, 'null prototype');
});

test('corrupted records are dropped on load, valid siblings survive', () => {
  // The whole point of isValidRecord: a hand-edited or truncated dm_srs blob
  // must not feed garbage boxes back into the scheduler.
  seedStorage(JSON.stringify({
    [KATA]: {
      keep: valid(),
      bad_box: valid({ box: 'two' }),
      high_box: valid({ box: 99 }),
      bad_nan: valid({ dueAt: null }),
      bad_shape: 'not-a-record',
    },
    null_kata: null,
    scalar_kata: 42,
  }));

  const loaded = SrsStore.getKata(KATA);
  assert.deepEqual(Object.keys(loaded), ['keep']);
  assert.equal(SrsStore.get(KATA, 'bad_box'), null);
  assert.equal(SrsStore.get(KATA, 'high_box'), null);
  assert.equal(SrsStore.get(KATA, 'bad_shape'), null);
  assert.equal(SrsStore.get('scalar_kata', 'keep'), null);
  assert.equal(SrsStore.get('null_kata', 'keep'), null);
});

test('records from the old SM-2 format are discarded, not misread', () => {
  // dm_srs_v1 stored { interval, ease, lapses, step }. The key moved to v2, but a
  // stray v1-shaped record must still fail validation rather than look like box 0.
  seedStorage(JSON.stringify({ [KATA]: { legacy: { interval: 20, ease: 2.5, dueAt: 0, lapses: 0, step: null } } }));

  assert.equal(SrsStore.get(KATA, 'legacy'), null);
  assert.deepEqual(Object.keys(SrsStore.getKata(KATA)), []);
});

test('a malformed or non-object storage blob yields an empty store', () => {
  for (const raw of ['{ not json', '"a string"', '42', 'null']) {
    SrsStore.reset();
    seedStorage(raw);
    assert.equal(SrsStore.get(KATA, 'keep'), null, `raw: ${raw}`);
    assert.equal(SrsStore.countDue(KATA), 0, `raw: ${raw}`);
  }
});

test('countDue counts only records at or past their due time', () => {
  const now = Date.now();
  SrsStore.set(KATA, 'overdue', valid({ dueAt: now - DAY_MS }));
  SrsStore.set(KATA, 'later', valid({ dueAt: now + DAY_MS }));
  SrsStore.set(KATA, 'future', valid({ dueAt: now + 30 * DAY_MS }));

  assert.equal(SrsStore.countDue(KATA), 1);
  assert.equal(SrsStore.countDue(KATA, now + 2 * DAY_MS), 2, 'the later item becomes due');
  assert.equal(SrsStore.countDue('never-seen-kata'), 0);
});

test('countDue treats a record due at exactly now as due', () => {
  const now = Date.now();
  SrsStore.set(KATA, 'exact', valid({ dueAt: now }));

  assert.equal(SrsStore.countDue(KATA, now), 1, 'the boundary is inclusive');
  assert.equal(SrsStore.countDue(KATA, now - 1), 0, 'one millisecond earlier is not due');
});

test('a debounced save flushes when the page is hidden', () => {
  SrsStore.set(KATA, 'item_a', valid());
  assert.equal(localStorage.getItem(SRS_KEY), null, 'nothing is written before the delay elapses');

  document.visibilityState = 'hidden';
  try {
    browser.emit('visibilitychange');
  } finally {
    document.visibilityState = 'visible';
  }

  const saved = JSON.parse(localStorage.getItem(SRS_KEY));
  assert.equal(saved[KATA].item_a.box, 2, 'the record reached storage on hide');
});

test('a debounced save flushes on pagehide', () => {
  SrsStore.set(KATA, 'item_b', valid({ box: 5 }));
  browser.emit('pagehide');

  assert.equal(JSON.parse(localStorage.getItem(SRS_KEY))[KATA].item_b.box, 5);
});

test('the pagehide flush is a no-op when nothing changed', () => {
  browser.emit('pagehide');
  assert.equal(localStorage.getItem(SRS_KEY), null, 'a stale flush must not write an empty cache');
});
