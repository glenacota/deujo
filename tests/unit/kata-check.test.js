// tests/unit/kata-check.test.js
// End-to-end grading through a kata's own `check()`, using the existing browser
// stub. This is where a kata has to behave on real interaction, not just through
// its pure parts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../helpers/bootstrap.js';

const { createPrepositionKata } = await import('../../assets/js/katas/prepositions/kata.js');
const { createCaseKata } = await import('../../assets/js/katas/cases/kata.js');
const { createVerbKata } = await import('../../assets/js/katas/verbs/kata.js');

/** Step one shows case labels, so a test has to name cases the way the DOM does. */
const CASE_LABELS = { nom: 'Nominativ', akk: 'Akkusativ', dat: 'Dativ', gen: 'Genitiv' };

/**
 * Builds a picker kata on a fresh container, renders one item, and returns a
 * function that answers it and grades it. A fresh container per run, so picks
 * can never leak from one answer into the next.
 */
const graderFor = (createKata, item) => {
    const container = document.createElement('div');
    const kata = createKata(container);
    kata.render(item);

    /** The button in a stage row carrying this exact label, or null. */
    const buttonIn = (stage, value) => container
        .querySelectorAll(`[data-role="${stage}"] > *`)
        .find((candidate) => candidate.dataset.value === value);

    /**
     * @param picks one `[case, form]` per blank. A bare string accepts the
     *   blank's own case, and a null form answers step one only.
     */
    const answer = (picks) => {
        picks.forEach((pick, index) => {
            if (!pick) return;
            const [caseKey, form] = Array.isArray(pick) ? pick : [item.b[index].c, pick];
            buttonIn('stage-case', CASE_LABELS[caseKey])?.click();
            if (form) buttonIn('stage-form', form)?.click();
        });
        return kata.check(item);
    };

    answer.container = container;
    return answer;
};

/** Builds, renders, answers and grades in one step, for a single-shot check. */
const grade = (createKata, item, picks) => graderFor(createKata, item)(picks);

/**
 * The review list the picker shows once every blank is answered: one row per
 * blank, each holding the picked case and the picked form, with the wanted value
 * beside it on a miss. Read from the rendered DOM rather than the `check()`
 * payload, because the correction reaching the learner is the thing worth
 * pinning. Cells are found by class, not by position, so adding a label to a
 * review row cannot silently shift what a test is asserting about.
 */
const reviewOf = (container) => container
    .querySelectorAll('[data-role="review"] > *')
    .map((row) => Array.from(row.children)
        .filter((node) => node.classList.contains('pick-review-cell'))
        .map((cell) => Array.from(cell.children).map((button) => button.textContent)));

test('the preposition kata grades the case, then the form that case calls for', () => {
    const item = {
        id: 'p_test', w: 'Ich warte auf den Zug.', m: 'I am waiting for the train.',
        s: 'Ich warte auf {0} Zug.', b: [{ a: 'den', c: 'akk' }],
    };

    const answer = graderFor(createPrepositionKata, item);

    assert.equal(answer([['akk', 'den']]).correct, true);
    assert.equal(answer([['akk', 'dem']]).correct, false);
});

test('a wrong pick shows the wanted form beside the one taken', () => {
    const item = {
        id: 'p_test2', w: 'Ich gehe zu dem Arzt.', m: 'I am going to the doctor.',
        s: 'Ich gehe zu {0} Arzt.', b: [{ a: 'dem', c: 'dat' }],
    };

    const wrongGrader = graderFor(createPrepositionKata, item);
    const wrong = wrongGrader([['dat', 'der']]);
    assert.equal(wrong.correct, false);
    // Dativ named and correct, so only the form is corrected beside it.
    assert.deepEqual(reviewOf(wrongGrader.container), [[['Dativ'], ['der', 'dem']]]);

    // Answered right, the row carries the badge only, with no repeated text.
    const cleanGrader = graderFor(createPrepositionKata, item);
    assert.equal(cleanGrader([['dat', 'dem']]).correct, true);
    assert.deepEqual(reviewOf(cleanGrader.container), [[['Dativ'], ['dem']]]);
});

test('a wrong case is a miss even when the form is right for another case', () => {
    const item = {
        id: 'p_test3', w: 'Die Katze schläft in der Kammer.', m: 'The cat sleeps in the room.',
        s: 'Die Katze schläft in {0} Kammer.', b: [{ a: 'der', c: 'dat' }],
    };

    // "die" is the Akkusativ answer to a Dativ blank. Accepting it would make step
    // one free and teach the two-way prepositions nothing, so both stages are
    // graded and both are corrected.
    const grader = graderFor(createPrepositionKata, item);
    assert.equal(grader([['akk', 'die']]).correct, false);
    assert.deepEqual(reviewOf(grader.container), [[['Akkusativ', 'Dativ'], ['die', 'der']]]);
});

test('the case kata names its correction beside the wrong blank only', () => {
    const item = {
        id: 'c_test3', w: 'Der Mann liest den Roman.', m: 'The man reads the novel.',
        s: '{0} Mann liest {1} Roman.', b: [{ a: 'Der', c: 'nom' }, { a: 'den', c: 'akk' }],
    };

    const grader = graderFor(createCaseKata, item);
    // "der" beside "den" is the gender trap: the sentence says "Roman", and the
    // masculine article is a real button, so the pick has to be a miss.
    assert.equal(grader([['nom', 'Der'], ['akk', 'der']]).correct, false);
    assert.deepEqual(reviewOf(grader.container), [
        [['Nominativ'], ['Der']],
        [['Akkusativ'], ['der', 'den']],
    ]);
});

test('a two-blank case sentence is answered one blank at a time', () => {
    const item = {
        id: 'c_test', w: 'Der Kellner bringt dem Gast seine kalten Getränke.',
        m: 'The waiter brings the guest his cold drinks.',
        s: 'Der Kellner bringt {0} Gast jetzt {1} kalten Getränke.',
        b: [{ a: 'dem', c: 'dat' }, { a: 'seine', c: 'akk' }],
    };

    const answer = graderFor(createCaseKata, item);

    // The sentence this kata exists for: the two objects are the two cases.
    const cleanGrader = graderFor(createCaseKata, item);
    const clean = cleanGrader([['dat', 'dem'], ['akk', 'seine']]);
    assert.equal(clean.correct, true);
    assert.deepEqual(reviewOf(cleanGrader.container), [[['Dativ'], ['dem']], [['Akkusativ'], ['seine']]]);

    // The same sentence with the two objects swapped fails, because the Dativ
    // person and the Akkusativ thing are not interchangeable.
    assert.equal(answer([['akk', 'den'], ['dat', 'seinen']]).correct, false);
});

test('the two stages are graded apart, so a shared form cannot pass on its own', () => {
    const item = {
        id: 'c_test4', w: 'Das Kind sieht die Katze.', m: 'The child sees the cat.',
        s: 'Das Kind sieht {0} Katze.', b: [{ a: 'die', c: 'akk' }],
    };

    assert.equal(grade(createCaseKata, item, [['akk', 'die']]).correct, true);
    // "die" is both the Nominativ and the Akkusativ of a woman, so only naming
    // the case can tell the two apart. Naming the wrong one is the miss.
    assert.equal(grade(createCaseKata, item, [['nom', 'die']]).correct, false);
});

test('a picker reports rather than grading when it has not rendered', () => {
    // check() has two result shapes: a verdict or a complaint. kata-flow reads
    // result.warning with no null guard, so this must not be null.
    for (const createKata of [createPrepositionKata, createCaseKata]) {
        const kata = createKata(document.createElement('div'));
        const result = kata.check({ id: 'x', w: 'Der Mann.', m: 'the man', s: 'Der {0} liest.', b: [] });

        assert.notEqual(result, null, 'a pre-render check must still return something');
        assert.equal(typeof result.warning, 'string');
        assert.equal(result.correct, undefined, 'and it must not grade');
    }
});

test('a half-answered blank blocks the check with a warning', () => {
    const item = {
        id: 'p_test4', w: 'Ich warte auf dich.', m: 'I am waiting for you.',
        s: 'Ich warte auf {0}.', b: [{ a: 'dich', c: 'akk' }],
    };

    // A case named and no form picked is unfinished, not wrong: choosing again is
    // cheaper than guessing which of the two the learner meant.
    const answer = graderFor(createPrepositionKata, item);
    assert.equal(answer([['akk', null]]).warning, 'Answer every blank before checking.');
    assert.equal(answer([['akk', null]]).correct, undefined, 'a warning is not a verdict');
    assert.equal(answer([['akk', 'dich']]).correct, true);
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

// Duden prints both auxiliaries for verbs like fahren ("habe/bin gefahren"), so
// the dataset carries the second one as an `alt`. Both buttons must then pass,
// and the note has to admit the other reading was right.
test('the Perfekt kata accepts either auxiliary when the dataset lists both', () => {
  const fahren = {
    id: 'v_3', w: 'fahren', m: 'to drive',
    perf: [
      { a: 'bin gefahren', alt: ['habe gefahren'] },
      { a: 'bist gefahren', alt: ['hast gefahren'] },
      { a: 'ist gefahren', alt: ['hat gefahren'] },
      { a: 'sind gefahren', alt: ['haben gefahren'] },
      { a: 'seid gefahren', alt: ['habt gefahren'] },
      { a: 'sind gefahren', alt: ['haben gefahren'] },
    ],
  };

  assert.equal(perfekt(fahren)('sein', 'gefahren').correct, true);
  assert.equal(perfekt(fahren)('haben', 'gefahren').correct, true);

  // The participle is still the only thing typed, so it stays graded.
  assert.equal(perfekt(fahren)('haben', 'gefahlen').correct, false);

  // No verb ships three readings, so the two-button contract is unchanged.
  const kata = createVerbKata('perf', document.createElement('div'));
  kata.render(fahren);
  assert.equal(kata.el.auxButtons.length, 2);
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