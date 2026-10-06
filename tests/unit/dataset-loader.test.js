// tests/unit/dataset-loader.test.js
// URL-keyed caching, schema check and eviction of failed loads.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDatasetLoader } from '../../assets/js/platform/dataset-loader.js';

const DATA = [{ id: 'a' }];
const ok = (body = DATA) => ({ ok: true, json: async () => body });

const kataAt = (id, datasetUrl, validateDataset = () => {}) => ({ id, datasetUrl, validateDataset });

/** A fetch stub that serves queued responses and counts calls. */
const stubFetch = (...responses) => {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    const next = responses.length > 1 ? responses.shift() : responses[0];
    if (next instanceof Error) throw next;
    return next;
  };
  fn.calls = calls;
  return fn;
};

test('katas sharing a URL share one request', async () => {
  const fetchImpl = stubFetch(ok());
  const loader = createDatasetLoader(fetchImpl);

  const [a, b] = await Promise.all([
    loader.load(kataAt('v1', '/verbs.json')),
    loader.load(kataAt('v2', '/verbs.json')),
  ]);

  assert.equal(fetchImpl.calls.length, 1);
  assert.equal(a, b);
  assert.deepEqual(a, DATA);
});

test('different URLs are fetched separately', async () => {
  const fetchImpl = stubFetch(ok());
  const loader = createDatasetLoader(fetchImpl);

  await loader.load(kataAt('n', '/nouns.json'));
  await loader.load(kataAt('c', '/cases.json'));

  assert.deepEqual(fetchImpl.calls, ['/nouns.json', '/cases.json']);
});

test('a failed load is evicted so the next attempt refetches', async () => {
  const fetchImpl = stubFetch({ ok: false }, ok());
  const loader = createDatasetLoader(fetchImpl);
  const kata = kataAt('n', '/nouns.json');

  await assert.rejects(loader.load(kata), /Failed to load dataset for "n"/);
  assert.deepEqual(await loader.load(kata), DATA);
  assert.equal(fetchImpl.calls.length, 2);
});

test('a network error is evicted too', async () => {
  const fetchImpl = stubFetch(new Error('offline'), ok());
  const loader = createDatasetLoader(fetchImpl);
  const kata = kataAt('n', '/nouns.json');

  await assert.rejects(loader.load(kata), /offline/);
  assert.deepEqual(await loader.load(kata), DATA);
});

test('a schema failure names the kata, keeps the cause and is evicted', async () => {
  const fetchImpl = stubFetch(ok());
  const loader = createDatasetLoader(fetchImpl);
  const bad = kataAt('n', '/nouns.json', () => { throw new Error('entry 0 is bad'); });

  await assert.rejects(loader.load(bad), /Invalid dataset for "n": entry 0 is bad/);
  assert.deepEqual(await loader.load(kataAt('n', '/nouns.json')), DATA);
  assert.equal(fetchImpl.calls.length, 2);
});
