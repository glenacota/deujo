// tests/unit/katas.test.js
// Kata contracts: every registered kata must be well formed, and the shipped
// datasets must pass their own validator.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { installBrowserStub } from '../helpers/browser-stub.js';
installBrowserStub();

const { loadKatas, validateKata } = await import('../../assets/js/katas/registry.js');
const { validateNounDataset } = await import('../../assets/js/katas/nouns/kata.js');
const { validateCaseDataset } = await import('../../assets/js/katas/cases/kata.js');
const { validateVerbDataset } = await import('../../assets/js/katas/verbs/kata.js');
const { escapeHtml } = await import('../../assets/js/services/utility.js');

const katas = loadKatas();

const loadDataset = (url) =>
  readFile(new URL(`../../${url.replace('./', '')}`, import.meta.url), 'utf8').then(JSON.parse);

test('every registered kata passes validateKata', () => {
  for (const kata of katas) {
    assert.doesNotThrow(() => validateKata(kata), `kata ${kata.id} is malformed`);
  }
});

test('kata ids and dataset urls are unique', () => {
  const ids = katas.map((k) => k.id);
  assert.equal(new Set(ids).size, ids.length, `duplicate kata id in ${ids.join(', ')}`);
});

test('validateKata rejects a kata with a missing field', () => {
  const base = katas[0];
  assert.throws(() => validateKata(null), /must be an object/);
  assert.throws(() => validateKata({ ...base, id: '' }), /requires non-empty id/);
  assert.throws(() => validateKata({ ...base, render: undefined }), /requires render\(\)/);
  assert.throws(() => validateKata({ ...base, el: {} }), /requires el\.kata/);
});

test('the shipped noun dataset is valid', async () => {
  const dataset = await loadDataset(katas.find((k) => k.id === 'nouns').datasetUrl);
  assert.ok(dataset.length > 0);
  assert.doesNotThrow(() => validateNounDataset(dataset));
});

test('the shipped case dataset is valid', async () => {
  const dataset = await loadDataset(katas.find((k) => k.id === 'cases').datasetUrl);
  assert.ok(dataset.length > 0);
  assert.doesNotThrow(() => validateCaseDataset(dataset));
});

test('the shipped verb dataset is valid', async () => {
  const dataset = await loadDataset(katas.find((k) => k.id === 'verbs-pres').datasetUrl);
  assert.ok(dataset.length > 0);
  assert.doesNotThrow(() => validateVerbDataset(dataset));
});

test('dataset ids are unique within each dataset', async () => {
  for (const url of new Set(katas.map((k) => k.datasetUrl))) {
    const dataset = await loadDataset(url);
    const ids = dataset.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length, `duplicate item id in ${url}`);
  }
});

const goodNoun = { id: 'n_1', w: 'Tag', m: 'day', p: 'Tage', g: 'der' };

test('validateNounDataset rejects malformed entries', () => {
  assert.throws(() => validateNounDataset([]), /non-empty array/);
  assert.throws(() => validateNounDataset([{ ...goodNoun, g: 'x' }]), /entry 0/);
  assert.throws(() => validateNounDataset([{ ...goodNoun, w: '  ' }]), /entry 0/);
  assert.throws(() => validateNounDataset([{ ...goodNoun, p: 12 }]), /entry 0/);
  assert.doesNotThrow(() => validateNounDataset([{ ...goodNoun, p: '' }]), 'an empty plural means "no plural"');
});

const goodCase = { id: 'c_1', w: 'der Mann', m: 'the man', s: '{0} Mann', b: [{ a: 'der', c: 'nom' }] };

test('validateCaseDataset requires one blank per placeholder', () => {
  assert.doesNotThrow(() => validateCaseDataset([goodCase]));
  assert.throws(() => validateCaseDataset([{ ...goodCase, s: 'Mann' }]), /entry 0/, 'missing placeholder');
  assert.throws(() => validateCaseDataset([{ ...goodCase, b: [] }]), /entry 0/, 'no blanks');
  assert.throws(() => validateCaseDataset([{ ...goodCase, b: [{ a: 'der', c: 'vocative' }] }]), /entry 0/);
  assert.throws(() => validateCaseDataset([{ ...goodCase, s: '{0} und {1}' }]), /entry 0/);
});

const sixForms = ['a', 'b', 'c', 'd', 'e', 'f'];
const goodVerb = { id: 'v_1', w: 'gehen', m: 'to go', pres: sixForms, praet: sixForms, perf: sixForms };

test('validateVerbDataset requires six forms per tense', () => {
  assert.doesNotThrow(() => validateVerbDataset([goodVerb]));
  assert.throws(() => validateVerbDataset([{ ...goodVerb, pres: sixForms.slice(1) }]), /entry 0/);
  assert.throws(() => validateVerbDataset([{ ...goodVerb, perf: [...sixForms.slice(1), ' '] }]), /entry 0/);
  assert.throws(() => validateVerbDataset([{ ...goodVerb, praet: undefined }]), /entry 0/);
});

test('escapeHtml neutralises markup in dataset strings', () => {
  assert.equal(escapeHtml('<img src=x onerror="a">&\''), '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;');
  assert.equal(escapeHtml(42), '42');
});
