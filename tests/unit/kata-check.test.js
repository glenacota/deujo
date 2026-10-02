// tests/unit/kata-check.test.js
// End-to-end grading through a kata's own `check()`, using the existing browser
// stub. This is where a multi-answer blank has to behave, not just the matcher.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserStub } from '../helpers/browser-stub.js';
import { installDomStub } from '../helpers/dom-stub.js';
installBrowserStub();
installDomStub();

const { createPrepositionKata } = await import('../../assets/js/katas/prepositions/kata.js');
const { createCaseKata } = await import('../../assets/js/katas/cases/kata.js');

/**
 * Builds a kata on a fresh container, renders once, then grades the same
 * rendered inputs with different values. Each kata gets its own container so
 * the mounted sections never clash.
 */
const graderFor = (createKata, item) => {
  const container = document.createElement('div');
  const kata = createKata(container);
  kata.render(item);
  return (values) => {
    container.querySelectorAll('input').forEach((input, i) => { input.value = values[i]; });
    return kata.check(item);
  };
};

/** Builds, renders, and grades in one step, for a single-shot check. */
const grade = (createKata, item, values) => graderFor(createKata, item)(values);

test('the preposition kata accepts the fused form for a written-out answer', () => {
  const item = {
    id: 'p_test', w: 'Ich warte auf den Zug.', m: 'I am waiting for the train.',
    s: 'Ich warte {0} Zug.', b: [{ a: 'auf den', c: 'akk' }],
  };

  const answer = graderFor(createPrepositionKata, item);

  // "auf" + Akkusativ cannot contract, so exactly one spelling is right.
  assert.equal(answer(['auf den']).correct, true);
  assert.equal(answer(['auf dem']).correct, false);
  assert.deepEqual(answer(['auf den']).fields[0].accepted, ['auf den']);
});

test('the preposition kata reports every accepted spelling on a wrong blank', () => {
  const item = {
    id: 'p_test2', w: 'Ich gehe zum Arzt.', m: 'I am going to the doctor.',
    s: 'Ich gehe {0} Arzt.', b: [{ a: 'zum', c: 'dat' }],
  };

  const wrong = grade(createPrepositionKata, item, ['zu der']);
  assert.equal(wrong.correct, false);
  // The correction names both spellings, so the learner sees the alternative.
  assert.deepEqual(wrong.fields[0].accepted, ['zum', 'zu dem']);
  assert.equal(wrong.fields[0].expected, 'zum');
});

test('the preposition kata honours a dataset alt list', () => {
  const item = {
    id: 'p_test3', w: 'Ich fahre ins Büro.', m: 'I drive to the office.',
    s: 'Ich fahre {0} Büro.', b: [{ a: 'in das', c: 'akk', alt: ['ins Büro'] }],
  };

  const answer = graderFor(createPrepositionKata, item);

  assert.equal(answer(['ins']).correct, true, 'the fused form of a written-out answer');
  assert.equal(answer(['in das']).correct, true);
  assert.equal(answer(['ins Büro']).correct, true, 'an explicit alternative');
  assert.equal(answer(['im']).correct, false, 'a wrong case is still wrong');
  assert.equal(answer(['in der']).correct, false);
});

test('the case kata accepts the noun typed with its article', () => {
  const item = {
    id: 'c_test', w: 'Der Mann liest den Roman.', m: 'The man reads the novel.',
    s: '{0} Mann liest {1} Roman.', b: [{ a: 'der', c: 'nom' }, { a: 'den', c: 'akk' }],
  };

  const answer = graderFor(createCaseKata, item);

  assert.equal(answer(['der', 'den']).correct, true);
  // The article plus its noun is the same answer, not a wrong one.
  assert.equal(answer(['der Mann', 'den Roman']).correct, true);
  // A different article, or an extra word in the middle, is still wrong.
  assert.equal(answer(['den', 'den']).correct, false);
  assert.equal(answer(['der', 'das']).correct, false);
  assert.equal(answer(['der große Mann', 'den Roman']).correct, false);
});

test('the case kata accepts an explicit alt list', () => {
  const item = {
    id: 'c_test2', w: 'Das Kind sieht die Katze.', m: 'The child sees the cat.',
    s: 'Das Kind sieht {0} Katze.', b: [{ a: 'die', c: 'akk', alt: ['jede'] }],
  };

  const answer = graderFor(createCaseKata, item);

  assert.equal(answer(['die']).correct, true);
  assert.equal(answer(['jede']).correct, true);
  assert.equal(answer(['das']).correct, false);
});

test('an unfilled blank still blocks the check with a warning', () => {
  const item = {
    id: 'p_test4', w: 'Ich warte auf dich.', m: 'I am waiting for you.',
    s: 'Ich warte {0}.', b: [{ a: 'auf dich', c: 'akk' }],
  };

  const result = grade(createPrepositionKata, item, ['  ']);
  assert.equal(result.warning, 'Please fill in all blanks before checking.');
  assert.equal(result.correct, undefined, 'a warning is not a verdict');
});
