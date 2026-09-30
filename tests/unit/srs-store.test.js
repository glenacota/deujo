// tests/unit/srs-store.test.js
// SrsStore caches records in module state, so every test starts from
// SrsStore.reset() plus a cleared localStorage.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserStub } from '../helpers/browser-stub.js';

const browser = installBrowserStub();

const { CONFIG } = await import('../../assets/js/config.js');
const { SrsStore } = await import('../../assets/js/services/srs-store.js');

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
});

test('set then get round-trips a record', () => {
  const record = valid({ box: 1, dueAt: 1_700_000_000_000 });
  SrsStore.set(KATA, 'item_a', record);

  assert.equal(SrsStore.get(KATA, 'item_a').box, 1);
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
    assert.deepEqual(Object.keys(SrsStore.getKata(KATA)), [], `raw: ${raw}`);
  }
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
  SrsStore.set(KATA, 'item_b', valid({ box: 0 }));
  browser.emit('pagehide');

  assert.equal(JSON.parse(localStorage.getItem(SRS_KEY))[KATA].item_b.box, 0);
});

test('the pagehide flush is a no-op when nothing changed', () => {
  browser.emit('pagehide');
  assert.equal(localStorage.getItem(SRS_KEY), null, 'a stale flush must not write an empty cache');
});
