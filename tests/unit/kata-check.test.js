// tests/unit/kata-check.test.js
// End-to-end grading through a kata's own `check()`, using the existing browser
// stub. This is where a multi-answer blank has to behave, not just the matcher.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../helpers/bootstrap.js';

const { createPrepositionKata } = await import('../../assets/js/katas/prepositions/kata.js');
const { createCaseKata } = await import('../../assets/js/katas/cases/kata.js');
const { createVerbKata } = await import('../../assets/js/katas/verbs/kata.js');

/**
 * Builds a kata on a fresh container, renders once, then grades the same
 * rendered inputs with different values. Each kata gets its own container so
 * the mounted sections never clash.
 */
const graderFor = (createKata, item) => {
  const container = document.createElement('div');
  const kata = createKata(container);
  kata.render(item);
  const answer = (values) => {
    container.querySelectorAll('input').forEach((input, i) => { input.value = values[i]; });
    return kata.check(item);
  };
  answer.container = container;
  return answer;
};

/** Builds, renders, and grades in one step, for a single-shot check. */
const grade = (createKata, item, values) => graderFor(createKata, item)(values);

/**
 * The correction note beside the nth input, which is where the expected
 * answers actually reach the learner. `.answer-note` is what `markControl`
 * writes, so this asserts the rendered text rather than the check() payload.
 * Notes are looked up per input rather than by index, because a right-hand
 * blank has no note at all and would shift every later one.
 */
const noteFor = (grader, index) => {
  const input = grader.container.querySelectorAll('input')[index];
  const wrapper = input?.parentElement;
  const note = wrapper?.querySelectorAll?.('.answer-note')[0];
  return note?.textContent ?? null;
};

test('the preposition kata accepts the fused form for a written-out answer', () => {
  const item = {
    id: 'p_test', w: 'Ich warte auf den Zug.', m: 'I am waiting for the train.',
    s: 'Ich warte {0} Zug.', b: [{ a: 'auf den', c: 'akk' }],
  };

  const answer = graderFor(createPrepositionKata, item);

  // "auf" + Akkusativ cannot contract, so exactly one spelling is right.
  assert.equal(answer(['auf den']).correct, true);
  assert.equal(answer(['auf dem']).correct, false);
});

test('a wrong blank names every accepted spelling beside the input', () => {
  const item = {
    id: 'p_test2', w: 'Ich gehe zum Arzt.', m: 'I am going to the doctor.',
    s: 'Ich gehe {0} Arzt.', b: [{ a: 'zum', c: 'dat' }],
  };

  const grade = graderFor(createPrepositionKata, item);

  assert.equal(grade(['zu der']).correct, false);
  // The correction lives in the note, not in the field object, so this reads
  // what the learner actually sees: both spellings side by side.
  assert.equal(noteFor(grade, 0), 'zum / zu dem');

  // The same blank answered right carries the badge only, no repeated text.
  assert.equal(noteFor(graderFor(createPrepositionKata, item), 0), null);
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
  // The correction reaches the learner beside the input: the dataset spelling,
  // the fused form the matcher derives, and the explicit alt.
  assert.equal(noteFor(answer, 0), 'in das / ins / ins büro');
});

test('the case kata names its correction beside the wrong blank only', () => {
  const item = {
    id: 'c_test3', w: 'Der Mann liest den Roman.', m: 'The man reads the novel.',
    s: '{0} Mann liest {1} Roman.', b: [{ a: 'der', c: 'nom' }, { a: 'den', c: 'akk' }],
  };

  const answer = graderFor(createCaseKata, item);

  assert.equal(answer(['der', 'das']).correct, false);
  // Blank 1 is right and carries no note; only the miss explains itself.
  assert.equal(noteFor(answer, 0), null);
  assert.equal(noteFor(answer, 1), 'den');
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

test('a kata checked before it has rendered reports instead of returning null', () => {
  // check() has two result shapes: a verdict or a complaint. app.js reads
  // result.warning with no null guard, so this must not be null.
  for (const createKata of [createPrepositionKata, createCaseKata]) {
    const kata = createKata(document.createElement('div'));
    const item = {
      id: 'x', w: 'Der Mann.', m: 'the man', s: '{0} Mann.', b: [{ a: 'der', c: 'nom' }],
    };

    const result = kata.check(item);
    assert.notEqual(result, null, 'a pre-render check must still return something');
    assert.equal(typeof result.warning, 'string');
    assert.equal(result.correct, undefined, 'and it must not grade');
  }
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

/** Perfekt kata mounted on its own container, with its choice buttons clickable. */
const perfekt = (verb) => {
  const container = document.createElement('div');
  const kata = createVerbKata('perf', container);
  kata.render(verb);
  return (aux, participle) => {
    container.querySelectorAll('[data-role="aux"]').find((btn) => btn.dataset.aux === aux).click();
    container.querySelector('[data-role="participle"]').value = participle;
    return kata.check(verb);
  };
};

const GEHEN = {
  id: 'v_1', w: 'gehen', m: 'to go',
  perf: ['bin gegangen', 'bist gegangen', 'ist gegangen', 'sind gegangen', 'seid gegangen', 'sind gegangen'],
};

test('the Perfekt kata grades the auxiliary choice and the participle', () => {
  // The auxiliary is a choice and the participle the only typed answer.
  assert.equal(perfekt(GEHEN)('sein', 'gegangen').correct, true);
  assert.equal(perfekt(GEHEN)('haben', 'gegangen').correct, false);
  assert.equal(perfekt(GEHEN)('sein', 'gehen').correct, false);
});

test('the Perfekt kata reads "haben" verbs as haben, not sein', () => {
  const verb = {
    id: 'v_2', w: 'machen', m: 'to make',
    perf: ['habe gemacht', 'hast gemacht', 'hat gemacht', 'haben gemacht', 'habt gemacht', 'haben gemacht'],
  };

  assert.equal(perfekt(verb)('haben', 'gemacht').correct, true);
  assert.equal(perfekt(verb)('sein', 'gemacht').correct, false);
});

test('the Perfekt kata warns before an answer is ready', () => {
  const kata = createVerbKata('perf', document.createElement('div'));
  kata.render(GEHEN);

  // No auxiliary chosen: the check reports instead of grading.
  const noChoice = kata.check(GEHEN);
  assert.equal(noChoice.correct, undefined);
  assert.match(noChoice.warning, /sein or haben/);

  // Auxiliary chosen, nothing typed.
  const noWord = perfekt(GEHEN)('sein', '   ');
  assert.equal(noWord.correct, undefined);
  assert.match(noWord.warning, /participle/);
});
