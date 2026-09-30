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
const { validatePrepositionDataset, gradeBlank } = await import('../../assets/js/katas/prepositions/kata.js');
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

test('kata ids are unique', () => {
  const ids = katas.map((k) => k.id);
  assert.equal(new Set(ids).size, ids.length, `duplicate kata id in ${ids.join(', ')}`);
});

// dataset urls are deliberately shared: the three verb katas read one file.
test('every kata points at a dataset that exists on disk', async () => {
  for (const url of new Set(katas.map((k) => k.datasetUrl))) {
    const dataset = await loadDataset(url);
    assert.ok(Array.isArray(dataset), `${url} is not a JSON array`);
  }
});

test('validateKata rejects a kata with a missing field', () => {
  const base = katas[0];
  assert.throws(() => validateKata(null), /must be an object/);
  assert.throws(() => validateKata({ ...base, id: '' }), /requires non-empty id/);
  assert.throws(() => validateKata({ ...base, render: undefined }), /requires render\(\)/);
  assert.throws(() => validateKata({ ...base, check: undefined }), /requires check\(\)/);
  assert.throws(() => validateKata({ ...base, el: {} }), /requires el\.section/);
});

test('validateKata accepts supported accents and rejects unknown accents', () => {
  const base = katas[0];
  assert.doesNotThrow(() => validateKata({ ...base, accent: 'amber' }));
  assert.throws(() => validateKata({ ...base, accent: 'chartreuse' }), /requires a supported accent/);
});

// validateXDataset already rejects an empty array, so length needs no separate check.
test('the shipped noun dataset is valid', async () => {
  const dataset = await loadDataset(katas.find((k) => k.id === 'nouns').datasetUrl);
  assert.doesNotThrow(() => validateNounDataset(dataset));
});

test('the shipped case dataset is valid', async () => {
  const dataset = await loadDataset(katas.find((k) => k.id === 'cases').datasetUrl);
  assert.doesNotThrow(() => validateCaseDataset(dataset));
});

test('the shipped preposition dataset is valid', async () => {
  const dataset = await loadDataset(katas.find((k) => k.id === 'prepositions').datasetUrl);
  assert.doesNotThrow(() => validatePrepositionDataset(dataset));
});

test('the shipped verb dataset is valid', async () => {
  const dataset = await loadDataset(katas.find((k) => k.id === 'verbs-pres').datasetUrl);
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
  assert.throws(() => validateCaseDataset([{ ...goodCase, s: '{0} und {1}' }]), /entry 0/, 'placeholder count mismatch');
  // No placeholders AND no blanks, so the placeholder-count check cannot fire.
  // This isolates the "blanks must be a non-empty array" rule.
  assert.throws(() => validateCaseDataset([{ ...goodCase, s: 'der Mann', b: [] }]), /entry 0/, 'no blanks');
  assert.throws(() => validateCaseDataset([{ ...goodCase, b: [{ a: 'der', c: 'vocative' }] }]), /entry 0/);
});

const goodPreposition = { id: 'p_1', w: 'Ich warte beim Arzt.', m: 'I am waiting at the doctor.', s: 'Ich warte {0} Arzt.', b: [{ a: 'beim', c: 'dat' }] };

test('validatePrepositionDataset requires a real preposition plus a case-correct determiner', () => {
  assert.doesNotThrow(() => validatePrepositionDataset([goodPreposition]));
  assert.throws(() => validatePrepositionDataset([]), /non-empty array/);
  // The determiner must belong to the case the entry declares.
  assert.throws(() => validatePrepositionDataset([{ ...goodPreposition, b: [{ a: 'beim', c: 'akk' }] }]), /entry 0/);
  assert.throws(() => validatePrepositionDataset([{ ...goodPreposition, b: [{ a: 'beim', c: 'nom' }] }]), /entry 0/);
  // A bare determiner is not an answer, and a noun is not a preposition.
  assert.throws(() => validatePrepositionDataset([{ ...goodPreposition, b: [{ a: 'dem', c: 'dat' }] }]), /entry 0/);
  assert.throws(() => validatePrepositionDataset([{ ...goodPreposition, b: [{ a: 'Hause', c: 'dat' }] }]), /entry 0/);
  // The written-out contraction is equally valid.
  assert.doesNotThrow(() => validatePrepositionDataset([{ ...goodPreposition, b: [{ a: 'bei dem', c: 'dat' }] }]));
  assert.throws(() => validatePrepositionDataset([{ ...goodPreposition, s: 'Ich warte beim Arzt.', b: [] }]), /entry 0/);
  assert.throws(() => validatePrepositionDataset([{ ...goodPreposition, s: '{0} Arzt {1}' }]), /entry 0/);
  // A repeated placeholder would send both blanks to the same answer.
  assert.throws(() => validatePrepositionDataset([{ ...goodPreposition, s: '{0} Arzt und {0}' }]), /entry 0/);
  // ...and a placeholder with no matching blank must be rejected too.
  assert.throws(
    () => validatePrepositionDataset([{ ...goodPreposition, s: '{0} Arzt und {1} Bahnhof.' }]),
    /entry 0/,
    'two placeholders but only one blank',
  );
  assert.doesNotThrow(
    () => validatePrepositionDataset([{ ...goodPreposition, s: '{0} Arzt und {1} Bahnhof.', b: [goodPreposition.b[0], { a: 'zum', c: 'dat' }] }]),
    'two blanks numbered 0 and 1 are valid',
  );
});

test('gradeBlank accepts the contraction and its written-out form, in any case or spacing', () => {
  const blank = { a: 'zum', c: 'dat' };
  for (const given of ['zum', 'Zu dem', 'ZU  DEM', ' zu dem ']) {
    assert.equal(gradeBlank(given, blank).ok, true, `expected "${given}" to be accepted`);
  }
  for (const given of ['zu', 'zur', 'zum Bahnhof', 'in dem', '']) {
    assert.equal(gradeBlank(given, blank).ok, false, `expected "${given}" to be rejected`);
  }
  assert.deepEqual(gradeBlank('zum', blank).accepted, ['zum', 'zu dem']);
  // A non-contracted answer has no alternative spelling.
  assert.deepEqual(gradeBlank('auf dem', { a: 'auf dem', c: 'dat' }).accepted, ['auf dem']);
  // Case matters: "auf" + Dativ is a location, + Akkusativ a movement.
  assert.equal(gradeBlank('auf dem', { a: 'auf den', c: 'akk' }).ok, false);
  assert.equal(gradeBlank('auf den', { a: 'auf den', c: 'akk' }).ok, true);
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
});
