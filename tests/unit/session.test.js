// tests/unit/session.test.js
// Session phases are per kata. The regression that matters: two katas holding
// different phases at the same time, which the single `#phase` field on App
// could not represent, and the reason a graded item could be re-served.
//
// This is the one app test that imports its subject statically. Everything else
// needs `await import()` after the browser stub, because the module under test
// touches `localStorage` or `document` as it loads. session.js touches neither,
// so ESM hoisting is fine here and that is worth keeping true.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Phase, Session } from '../../assets/js/session.js';

test('a kata nobody has graded is answering, so it has an item open', () => {
  const session = new Session();
  assert.equal(session.isAnswering('nouns'), true);
  assert.equal(session.isReviewing('nouns'), false);
});

test('a kata reaches reviewing only by being put there', () => {
  const session = new Session();
  session.setPhase('nouns', Phase.REVIEWING);
  assert.equal(session.isReviewing('nouns'), true);
  assert.equal(session.isAnswering('nouns'), false);
});

test('two katas can sit in different phases at once', () => {
  // The case a single shared field cannot express: nouns is showing a verdict
  // while cases is still taking an answer.
  const session = new Session();
  session.setPhase('nouns', Phase.REVIEWING);
  session.setPhase('cases', Phase.ANSWERING);

  assert.equal(session.isReviewing('nouns'), true);
  assert.equal(session.isAnswering('cases'), true);
});

test('grading one kata leaves every other kata answering', () => {
  // Guards the asymmetry that mattered: the old global was written by whichever
  // kata graded last, so this kata's phase was never its own to begin with.
  const session = new Session();
  session.setPhase('pres', Phase.REVIEWING);

  for (const id of ['nouns', 'cases', 'prepositions', 'praet', 'perf']) {
    assert.equal(session.isAnswering(id), true, `${id} should be untouched by pres being graded`);
  }
});

test('reset returns one kata to answering and spares its siblings', () => {
  const session = new Session();
  session.setPhase('nouns', Phase.REVIEWING);
  session.setPhase('cases', Phase.REVIEWING);

  session.reset('nouns');

  assert.equal(session.isAnswering('nouns'), true);
  assert.equal(session.isReviewing('cases'), true);
});

test('reset is safe for a kata that was never graded', () => {
  const session = new Session();
  assert.doesNotThrow(() => session.reset('nouns'));
  assert.equal(session.isAnswering('nouns'), true);
});

test('resetting twice, then grading again, behaves like a first grading', () => {
  // `#discardGradedItem` runs on every kata switch, so the reset path is hit
  // repeatedly and must not leave the kata stuck.
  const session = new Session();
  session.setPhase('nouns', Phase.REVIEWING);
  session.reset('nouns');
  session.reset('nouns');
  session.setPhase('nouns', Phase.REVIEWING);

  assert.equal(session.isReviewing('nouns'), true);
});

test('setPhase rejects a phase no gate recognises', () => {
  // A typo would leave both predicates false: the section locked itself and no
  // path could unlock it, so this has to throw rather than store the value.
  const session = new Session();
  assert.throws(() => session.setPhase('nouns', 'review'), /Unknown phase "review"/);
  assert.throws(() => session.setPhase('nouns', undefined), /Unknown phase "undefined"/);
  assert.equal(session.isAnswering('nouns'), true, 'a rejected phase must not be stored');
});

test('Phase is frozen, so no caller can invent a third phase', () => {
  assert.throws(() => { Phase.GRADE = 'grade'; }, TypeError);
  assert.deepEqual(Object.values(Phase), ['answering', 'reviewing']);
});
