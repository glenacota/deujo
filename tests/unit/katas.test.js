// tests/unit/katas.test.js
// Kata contracts: every registered kata must be well formed, and the shipped
// datasets must pass their own validator.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { installBrowserStub } from '../helpers/browser-stub.js';
import { installDomStub } from '../helpers/dom-stub.js';
installBrowserStub();
// Every factory mounts its section, so the DOM stub has to exist before the
// `loadKatas()` call below, which runs at module scope.
installDomStub();

const { loadKatas, validateKata } = await import('../../assets/js/katas/registry.js');
const { CONFIG } = await import('../../assets/js/config.js');
const { validateNounDataset } = await import('../../assets/js/katas/nouns/kata.js');
const { validateCaseDataset } = await import('../../assets/js/katas/cases/kata.js');
const { validatePrepositionDataset } = await import('../../assets/js/katas/prepositions/kata.js');
const { validateVerbDataset } = await import('../../assets/js/katas/verbs/kata.js');
const { PREPOSITION_CONTRACTIONS } = await import('../../assets/js/services/grammar.js');
// The preposition kata grades straight through the shared matcher: both
// spellings of a contractable phrase pass whichever one the dataset stored.
const { matchAnswer } = await import('../../assets/js/services/answer-matcher.js');
const { escapeHtml } = await import('../../assets/js/services/utility.js');

// One container for all six, exactly as app.js does at boot.
const katas = loadKatas(document.createElement('div'));

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
});

test('validateKata rejects a kata whose section was never mounted', () => {
  const base = katas[0];
  // The factory mounts the section, so a null one is a real defect rather than
  // an acceptable shape waiting for a mount() call that no longer exists.
  assert.throws(() => validateKata({ ...base, el: { section: null } }), /requires a mounted el\.section/);
  assert.throws(() => validateKata({ ...base, el: {} }), /requires a mounted el\.section/);
});

test('every kata is mounted into the container from the factory', () => {
  const container = document.createElement('div');
  const mounted = loadKatas(container);

  for (const kata of mounted) {
    assert.ok(kata.el.section, `kata ${kata.id} has no section`);
    assert.ok(container.children.includes(kata.el.section), `kata ${kata.id} was not appended`);
  }
  // Six katas, six live sections: the two verbs-only sections must not collide.
  assert.equal(container.children.length, mounted.length);
});

test('loadKatas refuses to build without a container', () => {
  assert.throws(() => loadKatas(null), /requires the element/);
});

test('validateKata accepts configured accents and rejects unknown ones', () => {
  const base = katas[0];
  for (const accent of Object.keys(CONFIG.accents)) {
    assert.doesNotThrow(() => validateKata({ ...base, accent }), `accent ${accent} should be accepted`);
  }
  assert.throws(() => validateKata({ ...base, accent: 'chartreuse' }), /requires an accent from CONFIG\.accents/);
  // The old hardcoded list is gone, so a key that used to be rejected is now
  // accepted only if CONFIG.accents actually defines it.
  assert.throws(() => validateKata({ ...base, accent: 'toString' }), /requires an accent from CONFIG\.accents/);
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

test('validateNounDataset accepts a plural with a second correct spelling', () => {
  assert.doesNotThrow(() => validateNounDataset([{ ...goodNoun, p: { a: 'Tage', alt: ['Tagen'] } }]));
  assert.throws(() => validateNounDataset([{ ...goodNoun, p: { alt: ['Tage'] } }]), /entry 0/, 'no primary answer');
  assert.throws(() => validateNounDataset([{ ...goodNoun, p: { a: 'Tage', alt: [''] } }]), /entry 0/);
  assert.throws(() => validateNounDataset([{ ...goodNoun, p: { a: 'Tage', alt: 'Tagen' } }]), /entry 0/);
});

const goodCase = { id: 'c_1', w: 'der Mann', m: 'the man', s: '{0} Mann', b: [{ a: 'der', c: 'nom' }] };

test('validateCaseDataset requires ordered placeholders for every blank', () => {
  assert.doesNotThrow(() => validateCaseDataset([goodCase]));
  assert.throws(() => validateCaseDataset([{ ...goodCase, s: 'Mann' }]), /entry 0/, 'missing placeholder');
  assert.throws(() => validateCaseDataset([{ ...goodCase, s: '{0} und {1}' }]), /entry 0/, 'placeholder count mismatch');
  assert.throws(() => validateCaseDataset([{ ...goodCase, s: '{1} Mann' }]), /entry 0/, 'out-of-order index');
  assert.throws(() => validateCaseDataset([{ ...goodCase, s: '{0} und {0}', b: [goodCase.b[0], goodCase.b[0]] }]), /entry 0/, 'repeated index');
  assert.throws(() => validateCaseDataset([{ ...goodCase, s: '{1} und {0}', b: [goodCase.b[0], goodCase.b[0]] }]), /entry 0/, 'reversed indices');
  // No placeholders AND no blanks, so the placeholder-count check cannot fire.
  // This isolates the "blanks must be a non-empty array" rule.
  assert.throws(() => validateCaseDataset([{ ...goodCase, s: 'der Mann', b: [] }]), /entry 0/, 'no blanks');
  assert.throws(() => validateCaseDataset([{ ...goodCase, b: [{ a: 'der', c: 'vocative' }] }]), /entry 0/);
});

test('validateCaseDataset accepts an alt list and rejects a malformed one', () => {
  assert.doesNotThrow(() => validateCaseDataset([{ ...goodCase, b: [{ a: 'der', c: 'nom', alt: ['der Mann'] }] }]));
  assert.throws(() => validateCaseDataset([{ ...goodCase, b: [{ a: 'der', c: 'nom', alt: [''] }] }]), /entry 0/);
  assert.throws(() => validateCaseDataset([{ ...goodCase, b: [{ a: 'der', c: 'nom', alt: 'der Mann' }] }]), /entry 0/);
});

const goodPreposition = { id: 'p_1', w: 'Ich warte beim Arzt.', m: 'I am waiting at the doctor.', s: 'Ich warte {0} Arzt.', b: [{ a: 'beim', c: 'dat' }] };

/** Puts the answers back into a blanked sentence, so it can be compared to `w`. */
const refill = (item) => {
  let sentence = item.s;
  item.b.forEach((blank, index) => {
    sentence = sentence.replace(`{${index}}`, blank.a);
  });
  return sentence;
};

// `w` is the finished sentence and `s` the blanked one, so filling the blanks
// has to reproduce `w` exactly. A sentence-initial answer is the easy thing to
// get wrong: German capitalises it, and a lowercase preposition there is
// rejected as the correction shown to the learner.
for (const id of ['cases', 'prepositions']) {
  test(`the shipped ${id} dataset keeps its sentences and answers consistent`, async () => {
    const dataset = await loadDataset(katas.find((k) => k.id === id).datasetUrl);

    for (const item of dataset) {
      assert.equal(refill(item), item.w, `entry ${item.id} does not rebuild its own sentence`);
    }

    // A blank in first position carries the capital of the sentence it opens.
    for (const item of dataset.filter((i) => /^\{0\}/.test(i.s))) {
      const answer = item.b[0].a;
      assert.equal(
        answer,
        answer.charAt(0).toUpperCase() + answer.slice(1),
        `entry ${item.id} opens a sentence with a lowercase answer`,
      );
    }
  });
}

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

// Grading a preposition blank goes straight through the shared matcher; the
// grammar half (which case a phrase really produces) is tested in
// grammar.test.js. These stay here because they run through the kata's data
// shape, `{a, c}`, as the shipped dataset supplies it.
test('matchAnswer accepts the contraction and its written-out form, in any case or spacing', () => {
  const blank = { a: 'zum', c: 'dat' };
  for (const given of ['zum', 'Zu dem', 'ZU  DEM', ' zu dem ']) {
    assert.equal(matchAnswer(given, blank).ok, true, `expected "${given}" to be accepted`);
  }
  for (const given of ['zu', 'zur', 'zum Bahnhof', 'in dem', '']) {
    assert.equal(matchAnswer(given, blank).ok, false, `expected "${given}" to be rejected`);
  }
  assert.deepEqual(matchAnswer('zum', blank).accepted, ['zum', 'zu dem']);
  // A non-contracted answer has no alternative spelling.
  assert.deepEqual(matchAnswer('auf dem', { a: 'auf dem', c: 'dat' }).accepted, ['auf dem']);
  // Case matters: "auf" + Dativ is a location, + Akkusativ a movement.
  assert.equal(matchAnswer('auf dem', { a: 'auf den', c: 'akk' }).ok, false);
  assert.equal(matchAnswer('auf den', { a: 'auf den', c: 'akk' }).ok, true);
});

test('matchAnswer accepts both spellings whichever one the dataset stored', () => {
  // A dataset entry may spell the phrase out, and the learner may still type the
  // fused form; the reverse must hold too.
  const writtenOut = { a: 'zu dem', c: 'dat' };
  assert.equal(matchAnswer('zum', writtenOut).ok, true);
  assert.equal(matchAnswer('zu dem', writtenOut).ok, true);
  assert.deepEqual(matchAnswer('zum', writtenOut).accepted, ['zu dem', 'zum']);

  // Every standard contraction round-trips in both directions. Only "das" is
  // Akkusativ here, so that is the only case the phrase can carry.
  for (const [fused, { preposition, article }] of Object.entries(PREPOSITION_CONTRACTIONS)) {
    const caseKey = article === 'das' ? 'akk' : 'dat';
    for (const answer of [fused, `${preposition} ${article}`]) {
      for (const given of [fused, `${preposition} ${article}`]) {
        assert.equal(matchAnswer(given, { a: answer, c: caseKey }).ok, true, `"${given}" vs stored "${answer}"`);
      }
    }
  }
});

test('matchAnswer honours an explicit alt list, and a bad one fails validation', () => {
  const blank = { a: 'in die', c: 'akk', alt: ['in die Tür'] };
  assert.equal(matchAnswer('in die Tür', blank).ok, true);
  assert.equal(matchAnswer('ins', blank).ok, false, 'an alt list must not license a wrong case');
  assert.deepEqual(matchAnswer('in die', blank).accepted, ['in die', 'in die tür']);

  // The alt list itself is held to the same rules as the main answer.
  assert.doesNotThrow(() => validatePrepositionDataset([{ ...goodPreposition, b: [{ a: 'in die', c: 'akk', alt: ['in die Tür'] }] }]));
  assert.throws(
    () => validatePrepositionDataset([{ ...goodPreposition, b: [{ a: 'in die', c: 'akk', alt: ['in dem'] }] }]),
    /entry 0/,
    'an alt in the wrong case must be rejected',
  );
  assert.throws(
    () => validatePrepositionDataset([{ ...goodPreposition, b: [{ a: 'in die', c: 'akk', alt: [''] }] }]),
    /entry 0/,
    'an empty alt must be rejected',
  );
  assert.throws(
    () => validatePrepositionDataset([{ ...goodPreposition, b: [{ a: 'in die', c: 'akk', alt: 'in der' }] }]),
    /entry 0/,
    'a non-array alt must be rejected',
  );
});

const sixForms = ['a', 'b', 'c', 'd', 'e', 'f'];
const goodVerb = { id: 'v_1', w: 'gehen', m: 'to go', pres: sixForms, praet: sixForms, perf: sixForms };

test('validateVerbDataset requires six forms per tense', () => {
  assert.doesNotThrow(() => validateVerbDataset([goodVerb]));
  assert.throws(() => validateVerbDataset([{ ...goodVerb, pres: sixForms.slice(1) }]), /entry 0/);
  assert.throws(() => validateVerbDataset([{ ...goodVerb, perf: [...sixForms.slice(1), ' '] }]), /entry 0/);
  assert.throws(() => validateVerbDataset([{ ...goodVerb, praet: undefined }]), /entry 0/);
});

test('validateVerbDataset accepts a form with a second correct spelling', () => {
  const forms = sixForms.map((form) => ({ a: form, alt: [`${form}!`] }));
  assert.doesNotThrow(() => validateVerbDataset([{ ...goodVerb, perf: forms }]));
  assert.throws(() => validateVerbDataset([{ ...goodVerb, pres: [...sixForms.slice(1), { alt: ['x'] }] }]), /entry 0/);
  assert.throws(() => validateVerbDataset([{ ...goodVerb, pres: [...sixForms.slice(1), { a: 'x', alt: [''] }] }]), /entry 0/);
  assert.throws(() => validateVerbDataset([{ ...goodVerb, pres: [...sixForms.slice(1), { a: 'x', alt: 'y' }] }]), /entry 0/);
});

test('escapeHtml neutralises markup in dataset strings', () => {
  assert.equal(escapeHtml('<img src=x onerror="a">&\''), '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;');
});
