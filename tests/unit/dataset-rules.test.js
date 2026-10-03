// tests/unit/dataset-rules.test.js
// The field checks every kata dataset validator shares. A kata keeps its own
// schema rule; these are the pieces all four agreed on.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertDataset,
  hasAltList,
  hasCoreFields,
  hasValidBlanks,
  isNonEmptyString,
} from '../../assets/js/katas/dataset-rules.js';

test('isNonEmptyString rejects everything that is not a filled string', () => {
  for (const good of ['a', 'der', ' leading and trailing ']) {
    assert.equal(isNonEmptyString(good), true, `${JSON.stringify(good)} should pass`);
  }
  for (const bad of ['', '   ', '\t\n', undefined, null, 0, 1, true, false, [], {}, ['a'], () => {}]) {
    assert.equal(isNonEmptyString(bad), false, `${JSON.stringify(bad)} should fail`);
  }
});

test('assertDataset rejects anything that is not a non-empty array', () => {
  assert.doesNotThrow(() => assertDataset([{ id: 'a' }]));
  assert.throws(() => assertDataset([]), /non-empty array/);
  assert.throws(() => assertDataset(null), /non-empty array/);
  assert.throws(() => assertDataset(undefined), /non-empty array/);
  assert.throws(() => assertDataset({ length: 1 }), /non-empty array/);
  assert.throws(() => assertDataset('nope'), /non-empty array/);
});

test('hasCoreFields requires id, w and m, and s only when asked', () => {
  const entry = { id: 'x_1', w: 'Tag', m: 'day', s: 'Ein {0}' };

  assert.equal(hasCoreFields(entry), true);
  assert.equal(hasCoreFields(entry, { sentence: true }), true);

  for (const field of ['id', 'w', 'm']) {
    assert.equal(hasCoreFields({ ...entry, [field]: '' }), false, `empty ${field} must fail`);
    assert.equal(hasCoreFields({ ...entry, [field]: '   ' }), false, `blank ${field} must fail`);
    assert.equal(hasCoreFields({ ...entry, [field]: 7 }), false, `numeric ${field} must fail`);
    const { [field]: _dropped, ...rest } = entry;
    assert.equal(hasCoreFields(rest), false, `missing ${field} must fail`);
  }

  // The sentence is optional by default and mandatory on request.
  const { s: _noSentence, ...withoutSentence } = entry;
  assert.equal(hasCoreFields(withoutSentence), true);
  assert.equal(hasCoreFields(withoutSentence, { sentence: true }), false);
  assert.equal(hasCoreFields({ ...entry, s: '' }, { sentence: true }), false);

  // A missing entry must not throw; it is simply not usable.
  for (const empty of [null, undefined, 0, '', false]) {
    assert.equal(hasCoreFields(empty), false, `${JSON.stringify(empty)} must fail`);
    assert.equal(hasCoreFields(empty, { sentence: true }), false);
  }
});

test('hasAltList treats alt as optional but strict when present', () => {
  assert.equal(hasAltList(undefined), true, 'alt is optional');
  assert.equal(hasAltList([]), true, 'an empty alt list adds nothing to reject');
  assert.equal(hasAltList(['der Mann']), true);
  assert.equal(hasAltList(['a', 'b']), true);
  for (const bad of [[''], ['  '], [null], [undefined], [0], [{}], [[]], 'der', 7, null, {}]) {
    assert.equal(hasAltList(bad), false, `${JSON.stringify(bad)} must fail`);
  }
});

test('hasValidBlanks needs a non-empty list of answers the kata accepts', () => {
  const always = () => true;
  const isNom = ({ c } = {}) => c === 'nom';

  assert.equal(hasValidBlanks([{ a: 'der', c: 'nom' }], always), true);
  assert.equal(hasValidBlanks([{ a: 'der', c: 'nom' }], isNom), true);
  assert.equal(hasValidBlanks([{ a: 'der', c: 'akk' }], isNom), false, 'the kata rule still applies');

  // An empty list is not "vacuously fine": it would render a sentence with no blank.
  assert.equal(hasValidBlanks([], always), false);
  for (const notAList of [null, undefined, 'der', 7, {}]) {
    assert.equal(hasValidBlanks(notAList, always), false, `${JSON.stringify(notAList)} must fail`);
  }
  assert.equal(hasValidBlanks([{ c: 'nom' }], always), false, 'a blank needs an answer');
  assert.equal(hasValidBlanks([{ a: '  ', c: 'nom' }], always), false, 'a blank answer must be filled');
  assert.equal(hasValidBlanks([null], always), false);
});

test('hasValidBlanks holds an alt to the same rule as its answer', () => {
  // The important invariant: an alternative answer can never be looser than the
  // answer it accompanies, or a wrong entry would validate and then grade wrong.
  // The rule must inspect the answer text, so use one that does.
  const isDer = ({ a } = {}) => a === 'der';
  assert.equal(hasValidBlanks([{ a: 'der', c: 'nom', alt: ['der'] }], isDer), true);
  assert.equal(
    hasValidBlanks([{ a: 'der', c: 'nom', alt: ['in dem'] }], isDer),
    false,
    'an alt the rule rejects must be rejected',
  );
  assert.equal(
    hasValidBlanks([{ a: 'der', c: 'nom', alt: [''] }], isDer),
    false,
    'an empty alt must be rejected',
  );
  assert.equal(
    hasValidBlanks([{ a: 'der', c: 'nom', alt: 'der' }], isDer),
    false,
    'a non-array alt must be rejected',
  );
  // A non-array alt must be rejected without throwing on the alt sweep.
  assert.equal(hasValidBlanks([{ a: 'der', c: 'nom', alt: 7 }], isDer), false);
  assert.equal(hasValidBlanks([{ a: 'der', c: 'nom', alt: null }], isDer), false);
});

test('an alt is judged with its own blank case', () => {
  // The cases kata validates the case key, not the wording, so the alt has to be
  // checked against the same `c` its blank claims rather than a fresh one.
  const seen = [];
  const record = ({ a, c } = {}) => { seen.push({ a, c }); return c === 'nom'; };

  assert.equal(hasValidBlanks([{ a: 'der', c: 'nom', alt: ['die'] }], record), true);
  assert.deepEqual(seen, [
    { a: 'der', c: 'nom' },
    { a: 'die', c: 'nom' },
  ], 'the alt inherits the case from its blank');
});