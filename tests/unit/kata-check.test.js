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
 * What the sentence slots show after a check: the state and the badge of each
 * blank, read from the rendered DOM. The wanted answers are not on the slots;
 * they arrive as `lessons` in the verdict.
 */
const marksOf = (container) => container
    .querySelectorAll('.pick-slot')
    .map((slot) => [
        slot.dataset.answerState,
        slot.children.find((child) => child.classList.has('answer-badge'))?.textContent,
    ]);

const RIGHT = ['correct', '✅'];
const WRONG = ['wrong', '❌'];

test('the preposition kata grades the case, then the form that case calls for', () => {
    const item = {
        id: 'p_test', w: 'Ich warte auf den Zug.', m: 'I am waiting for the train.',
        s: 'Ich warte auf {0} Zug.', b: [{ a: 'den', c: 'akk' }],
    };

    const answer = graderFor(createPrepositionKata, item);

    assert.equal(answer([['akk', 'den']]).correct, true);
    assert.equal(answer([['akk', 'dem']]).correct, false);
});

test('a wrong pick marks its slot and puts the wanted form in the verdict only', () => {
    const item = {
        id: 'p_test2', w: 'Ich gehe zu dem Arzt.', m: 'I am going to the doctor.',
        s: 'Ich gehe zu {0} Arzt.', b: [{ a: 'dem', c: 'dat' }],
    };

    const wrongGrader = graderFor(createPrepositionKata, item);
    const wrong = wrongGrader([['dat', 'der']]);
    assert.equal(wrong.correct, false);
    assert.deepEqual(marksOf(wrongGrader.container), [WRONG]);
    assert.deepEqual(wrong.lessons.map((lesson) => lesson.form), ['dem']);
    assert.ok(wrong.lessons[0].note, 'the answer comes with the rule behind it');
    assert.equal(wrong.lessons[0].label, undefined, 'one blank needs no label');

    // Answered right, the slot carries the badge and nothing is taught.
    const cleanGrader = graderFor(createPrepositionKata, item);
    const clean = cleanGrader([['dat', 'dem']]);
    assert.equal(clean.correct, true);
    assert.deepEqual(marksOf(cleanGrader.container), [RIGHT]);
    assert.deepEqual(clean.lessons, []);
});

test('a wrong case is a miss even when the form is right for another case', () => {
    const item = {
        id: 'p_test3', w: 'Die Katze schläft in der Kammer.', m: 'The cat sleeps in the room.',
        s: 'Die Katze schläft in {0} Kammer.', b: [{ a: 'der', c: 'dat' }],
    };

    // "die" is the Akkusativ answer to a Dativ blank. Accepting it would make step
    // one free and teach the two-way prepositions nothing, so both stages are
    // graded and the lesson names the case that was missed.
    const grader = graderFor(createPrepositionKata, item);
    const result = grader([['akk', 'die']]);
    assert.equal(result.correct, false);
    assert.deepEqual(marksOf(grader.container), [WRONG]);
    assert.deepEqual(result.lessons.map((lesson) => lesson.form), ['der']);
    assert.match(result.lessons[0].note, /Akkusativ/);
});

test('the case kata marks every blank and teaches the wrong blank only', () => {
    const item = {
        id: 'c_test3', w: 'Der Mann liest den Roman.', m: 'The man reads the novel.',
        s: '{0} Mann liest {1} Roman.', b: [{ a: 'Der', c: 'nom' }, { a: 'den', c: 'akk' }],
    };

    const grader = graderFor(createCaseKata, item);
    // "der" beside "den" is the gender trap: the sentence says "Roman", and the
    // masculine article is a real button, so the pick has to be a miss.
    const result = grader([['nom', 'Der'], ['akk', 'der']]);
    assert.equal(result.correct, false);
    assert.deepEqual(marksOf(grader.container), [RIGHT, WRONG]);
    assert.deepEqual(result.lessons.map(({ label, form }) => [label, form]), [['Blank 2', 'den']]);
});

test('every wrong blank gets its own lesson, in sentence order', () => {
    const item = {
        id: 'c_test5', w: 'Der Mann liest den Roman.', m: 'The man reads the novel.',
        s: '{0} Mann liest {1} Roman.', b: [{ a: 'Der', c: 'nom' }, { a: 'den', c: 'akk' }],
    };

    const grader = graderFor(createCaseKata, item);
    const result = grader([['akk', 'Der'], ['nom', 'den']]);
    assert.deepEqual(marksOf(grader.container), [WRONG, WRONG]);
    assert.deepEqual(result.lessons.map(({ label, form }) => [label, form]), [['Blank 1', 'Der'], ['Blank 2', 'den']]);
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
    assert.deepEqual(marksOf(cleanGrader.container), [RIGHT, RIGHT]);

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
    assert.equal(answer([['akk', null]]).warning, 'Finish every blank before checking.');
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
test('the Perfekt kata teaches every wrong field and reveals no answer on a control', () => {
  const container = document.createElement('div');
  const kata = createVerbKata('perf', container);
  kata.render(GEHEN);
  container.querySelectorAll('[data-role="aux"]').find((btn) => btn.dataset.aux === 'haben').click();
  container.querySelector('[data-role="participle"]').value = 'gehen';

  const result = kata.check(GEHEN);
  assert.deepEqual(result.lessons.map((lesson) => lesson.form), ['sein', 'gegangen']);
  assert.equal(container.querySelectorAll('[data-role="aux"]').find((btn) => btn.dataset.aux === 'sein').dataset.answerState, undefined);
});

test('the conjugation kata marks each input and teaches every wrong person', () => {
  const verb = {
    id: 'v_4', w: 'gehen', m: 'to go',
    pres: ['gehe', 'gehst', 'geht', 'gehen', 'geht', 'gehen'],
  };
  const container = document.createElement('div');
  const kata = createVerbKata('pres', container);
  kata.render(verb);

  // Persons 0, 2 and 5 are wrong; the rest are right.
  const given = ['gehst', 'gehst', 'gehe', 'gehen', 'geht', 'geht'];
  kata.el.inputs.forEach((input, i) => { input.value = given[i]; });

  const result = kata.check(verb);
  assert.equal(result.correct, false);
  assert.deepEqual(result.fields.map((f) => f.ok), [false, true, false, true, true, false]);
  assert.deepEqual(
    kata.el.inputs.map((input) => input.dataset.answerState),
    ['wrong', 'correct', 'wrong', 'correct', 'correct', 'wrong'],
  );
  assert.deepEqual(result.lessons.map((lesson) => lesson.form), ['gehe', 'geht', 'gehen']);
  assert.ok(result.lessons.every((lesson) => lesson.label && lesson.note), 'each row names its person and its rule');
});
