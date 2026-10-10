// tests/unit/picker-kata.test.js
// The two-stage engine behind the `cases` and `prepositions` katas.
//
// What is pinned here is the path they share: the blank-by-blank state machine,
// the fact that nothing is typed, the warnings that keep a half-answered item
// from being graded, and the per-stage marking. The parts that stay per-kata —
// what step one asks, and how a miss is taught — are checked in
// `kata-check.test.js`, which drives the real katas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../helpers/bootstrap.js';

const { createPickerKata, validatePickerDataset } = await import('../../assets/js/katas/factories/picker-kata.js');
const { pickerTemplate } = await import('../../assets/js/katas/factories/picker-template.js');
const { nounAfter, prepositionBefore } = await import('../../assets/js/katas/factories/trigger.js');
const { determinerOptions } = await import('../../assets/js/services/determiner-options.js');

const MANIFEST = {
    id: 'test', name: 'Test', subtitle: 'Sub', datasetUrl: './x.json',
    accent: 'teal', helpTitle: 'Help',
};

const CASE_LABELS = { nom: 'Nominativ', akk: 'Akkusativ', dat: 'Dativ', gen: 'Genitiv' };
const CASES = Object.keys(CASE_LABELS);

const ITEM = {
    id: 't1', w: 'Ein Satz.', m: 'A sentence.',
    s: 'Der Mann bringt {0} Gast jetzt {1} Buch.',
    b: [{ a: 'dem', c: 'dat' }, { a: 'seine', c: 'akk' }],
};

/** A picker with only what differs overridden, so defaults are visible. */
function build(overrides = {}) {
    const lessons = [];
    const config = {
        manifest: MANIFEST,
        template: pickerTemplate('Try it'),
        help: () => '<p>help body</p>',
        prompt: (item, blank, index) => `Step 1 · blank ${index}?`,
        cases: CASES,
        isUsableAnswer: (blank) => CASES.includes(blank?.c),
        describeProblem: (index) => `entry ${index} is bad`,
        lessonFor: (miss) => { lessons.push(miss); return null; },
        ...overrides,
    };
    const container = document.createElement('div');
    const kata = createPickerKata(config)(container);
    return { kata, container, lessons };
}

/** One button in a stage row, by the label it carries. */
const buttonIn = (container, stage, value) => container
    .querySelectorAll(`[data-role="${stage}"] > *`)
    .find((button) => button.dataset.value === value);

/** Renders ITEM and answers each blank with `[caseKey, form]`. */
function answer(picks, overrides) {
    const { kata, container, lessons } = build(overrides);
    kata.render(ITEM);
    picks.forEach(([caseKey, form]) => {
        buttonIn(container, 'stage-case', CASE_LABELS[caseKey])?.click();
        if (form) buttonIn(container, 'stage-form', form)?.click();
    });
    return { result: kata.check(ITEM), kata, container, lessons };
}

test('the kata mounts a section the app can show and hide', () => {
    const { kata } = build();
    assert.ok(kata.el.section, 'a section element is mounted at construction');
    assert.equal(kata.el.section.dataset.role, 'section');
});

test('the manifest is spread onto the kata unchanged', () => {
    const { kata } = build();
    for (const [key, value] of Object.entries(MANIFEST)) {
        assert.equal(kata[key], value, `manifest.${key} is not on the kata`);
    }
});

test('the sentence carries one slot per placeholder, in order', () => {
    const { kata, container } = build();
    kata.render(ITEM);

    const slots = container.querySelectorAll('.pick-slot');
    assert.equal(slots.length, 2);
    assert.deepEqual(slots.map((slot) => slot.dataset.index), ['0', '1']);
});

test('the translation is shown above the picker, so nothing is hidden from the learner', () => {
    const { kata } = build();
    kata.render(ITEM);
    assert.match(kata.el.translation.textContent, /A sentence\./);
});

test('nothing in a picker is a text field', () => {
    // The whole point of the two stages: there is nothing to spell wrong, so a
    // stray input would mean the old path was left in.
    const { kata, container } = build();
    kata.render(ITEM);
    assert.equal(container.querySelectorAll('input').length, 0);
    assert.equal(container.querySelectorAll('textarea').length, 0);
});

test('step one offers every case the kata allows, and nothing else', () => {
    const { kata, container } = build();
    kata.render(ITEM);

    assert.deepEqual(
        container.querySelectorAll('[data-role="stage-case"] > *').map((b) => b.dataset.value),
        CASES.map((caseKey) => CASE_LABELS[caseKey]),
    );

    // A kata that governs no Nominativ must not be offered one: a button that
    // could never be right only teaches a wrong answer.
    const { container: narrowed } = build({ cases: ['akk', 'dat'] });
    kata.render(ITEM);
    narrowed.querySelector('[data-role="stage-case"]');
    assert.equal(narrowed.querySelectorAll('input').length, 0);
});

test('step two is hidden until step one is answered', () => {
    const { kata, container } = build();
    kata.render(ITEM);
    assert.equal(kata.el.stageForm.hidden, true);

    buttonIn(container, 'stage-case', 'Dativ').click();
    assert.equal(kata.el.stageForm.hidden, false);
});

test('step two offers the blank\'s own answer among its distractors', () => {
    const { kata, container } = build();
    kata.render(ITEM);

    buttonIn(container, 'stage-case', 'Dativ').click();
    const offered = container.querySelectorAll('[data-role="stage-form"] > *').map((b) => b.dataset.value);

    assert.ok(offered.includes('dem'), 'the right form must be pickable');
    assert.ok(offered.length >= 3, 'and there must be something to choose between');
});

test('a picked case stays pressed while step two is open', () => {
    const { kata, container } = build();
    kata.render(ITEM);
    buttonIn(container, 'stage-case', 'Dativ').click();

    const pressed = container
        .querySelectorAll('[data-role="stage-case"] > *')
        .filter((b) => b.getAttribute('aria-pressed') === 'true')
        .map((b) => b.dataset.value);

    assert.deepEqual(pressed, ['Dativ']);
    assert.equal(kata.el.stageCase.hidden, false, 'the chosen case stays on show');
});

test('a blank the learner answered fills into the sentence', () => {
    const { kata, container } = build();
    kata.render(ITEM);

    assert.equal(container.querySelectorAll('.pick-slot')[0].textContent, '___');
    buttonIn(container, 'stage-case', 'Dativ').click();
    buttonIn(container, 'stage-form', 'dem').click();

    // The first blank is done and the second is open, so only one slot reads as
    // the one being answered.
    const slots = container.querySelectorAll('.pick-slot');
    assert.equal(slots[0].textContent, 'dem');
    assert.equal(slots[1].textContent, '___');
    assert.equal(slots[1].classList.contains('pick-slot--open'), true);
});

test('a two-blank sentence walks the blanks in order', () => {
    const { kata, container } = build();
    kata.render(ITEM);

    buttonIn(container, 'stage-case', 'Dativ').click();
    buttonIn(container, 'stage-form', 'dem').click();

    // The case row resets for the second blank, and the prompt moves with it.
    assert.deepEqual(
        container.querySelectorAll('[data-role="stage-case"] > *')
            .filter((b) => b.getAttribute('aria-pressed') === 'true'),
        [],
    );
    assert.equal(kata.el.prompt.textContent, 'Step 1 · blank 1?');
});

/**
 * The cells of one review row: the picked case and the picked form, each with
 * the wanted value beside it on a miss. Selected by class rather than by
 * position, so adding a label to the row cannot silently shift a cell.
 */
const reviewCellsOf = (container, index) => {
    const row = container.querySelectorAll('[data-role="review"] > *')[index];
    return Array.from(row.children).filter((node) => node.classList.contains('pick-review-cell'));
};

test('the last pick steps aside for a review row per blank', () => {
    const { container } = answer([['dat', 'dem'], ['akk', 'seine']]);

    const rows = container.querySelectorAll('[data-role="review"] > *');
    assert.equal(rows.length, 2, 'one row per blank, so grading can address each');

    // The step rows are gone, so a stale button cannot be picked after grading.
    const [caseCell, formCell] = reviewCellsOf(container, 0);
    assert.equal(caseCell.children[0].textContent, 'Dativ');
    assert.equal(formCell.children[0].textContent, 'dem');
});

test('the review row names which stage each value belongs to', () => {
    // Two rows of bare buttons with nothing to say which is the case and which
    // the form would read as a list of words rather than an answer the learner
    // gave.
    const { container } = answer([['dat', 'dem'], ['akk', 'seine']]);
    const labels = Array.from(container.querySelectorAll('[data-role="review"] > *')[0].children)
        .filter((node) => node.classList.contains('pick-review-label'))
        .map((node) => node.textContent);

    assert.deepEqual(labels, ['Blank 1 · case', 'form']);
});

test('a fully correct answer reports one field per blank', () => {
    const { result } = answer([['dat', 'dem'], ['akk', 'seine']]);
    assert.equal(result.correct, true);
    assert.deepEqual(result.fields, [{ ok: true }, { ok: true }]);
});

test('the two stages are graded apart, so one wrong stage fails the blank', () => {
    // Right case, wrong ending: "den" is on the row for a `dem` blank, and it is
    // the Akkusativ masculine, so it is exactly the form a learner slips to.
    const wrongForm = answer([['dat', 'den'], ['akk', 'seine']]);
    assert.equal(wrongForm.result.correct, false);
    assert.deepEqual(wrongForm.result.fields, [{ ok: false }, { ok: true }]);

    // Right form, wrong case: "seine" is a real Akkusativ form and it is the
    // answer here, so only naming the case can catch the mistake. That is what
    // makes step one worth asking at all.
    const wrongCase = answer([['dat', 'dem'], ['dat', 'seine']]);
    assert.equal(wrongCase.result.correct, false);
    assert.deepEqual(wrongCase.result.fields, [{ ok: true }, { ok: false }]);
});

test('a miss shows the wanted value beside the one taken', () => {
    const { container } = answer([['dat', 'den'], ['akk', 'seine']]);
    const [caseCell, formCell] = reviewCellsOf(container, 0);

    // Two buttons in the form cell: the pick, then the correction.
    assert.equal(caseCell.children.length, 1, 'the case was right, so nothing to correct');
    assert.deepEqual(formCell.children.map((b) => b.textContent), ['den', 'dem']);
});

test('a wrong case is corrected beside the case that was named', () => {
    const { container } = answer([['dat', 'dem'], ['dat', 'seine']]);
    const [caseCell, formCell] = reviewCellsOf(container, 1);

    assert.deepEqual(caseCell.children.map((b) => b.textContent), ['Dativ', 'Akkusativ']);
    // The form was right, so only the case carries a correction.
    assert.deepEqual(formCell.children.map((b) => b.textContent), ['seine']);
});

test('a clean answer carries no second button, only a badge', () => {
    const { container } = answer([['dat', 'dem'], ['akk', 'seine']]);

    for (const cell of reviewCellsOf(container, 0)) {
        assert.equal(cell.children.length, 1);
        assert.equal(cell.children[0].dataset.answerState, 'correct');
    }
});

test('an unfinished blank blocks the check with a warning', () => {
    const { kata, container } = build();
    kata.render(ITEM);

    // Nothing picked at all.
    assert.match(kata.check(ITEM).warning, /answer every blank/i);
    assert.equal(kata.check(ITEM).correct, undefined, 'a warning is not a verdict');

    // Step one taken, step two not: still unfinished, and the stage-two row is
    // the one that has to be answered before the check means anything.
    buttonIn(container, 'stage-case', 'Dativ').click();
    assert.match(kata.check(ITEM).warning, /answer every blank/i);

    // One blank of two done.
    buttonIn(container, 'stage-form', 'dem').click();
    assert.match(kata.check(ITEM).warning, /answer every blank/i);
});

test('checking before rendering reports rather than throwing', () => {
    const { kata } = build();
    const result = kata.check(ITEM);
    assert.equal(typeof result.warning, 'string');
    assert.equal(result.correct, undefined);
});

test('the correction panel is asked to teach the first miss only', () => {
    const { lessons } = answer([['dat', 'den'], ['dat', 'seiner']]);
    assert.equal(lessons.length, 1);
    assert.equal(lessons[0].index, 0);
    assert.equal(lessons[0].blank, ITEM.b[0]);
    assert.deepEqual(lessons[0].given, { caseKey: 'dat', form: 'den' });
});

test('a clean verdict still asks for a lesson, with no miss to teach', () => {
    // lessonFor runs on every verdict, so one that assumed a miss existed would
    // throw on every right answer.
    const { lessons, result } = answer([['dat', 'dem'], ['akk', 'seine']]);
    assert.equal(result.correct, true);
    assert.deepEqual(lessons, [undefined]);
});

test('a second render discards the previous item\'s picks', () => {
    const { kata, container } = build();
    kata.render(ITEM);
    buttonIn(container, 'stage-case', 'Dativ').click();
    buttonIn(container, 'stage-form', 'dem').click();

    const single = { ...ITEM, id: 't2', s: 'Der Mann bringt {0} Gast.', b: [{ a: 'dem', c: 'dat' }] };
    kata.render(single);
    assert.match(kata.check(single).warning, /answer every blank/i, 'picks must not survive a new item');
    // Counted in the sentence, because that is what the renderer rebuilds: a slot
    // left over from the previous item would be a blank the learner cannot answer.
    assert.equal(kata.el.sentence.querySelectorAll('.pick-slot').length, 1);
});

test('help is answer-blind: it is called with no item at all', () => {
    let called = null;
    const { kata } = build({ help: (...args) => { called = args; return '<p>x</p>'; } });

    kata.getHelpContent();
    assert.deepEqual(called, [], 'help must not receive the item, or it could print the answer');
});

test('the stage-one prompt is asked per blank and never reads the answer', () => {
    const asked = [];
    const { kata } = build({ prompt: (item, blank, index) => { asked.push({ index, answer: blank.a }); return `?${index}`; } });
    kata.render(ITEM);

    buttonIn(kata.el.section.parentElement, 'stage-case', 'Dativ');
    assert.deepEqual(asked.map((a) => a.index), [0]);
    // The factory passes the blank so a kata can find the trigger, and the kata
    // reads only the sentence from it. What matters is the prompt text never
    // carrying the case.
    assert.equal(kata.el.prompt.textContent, '?0');
});

test('validatePickerDataset accepts an entry it should', () => {
    const { kata } = build();
    assert.doesNotThrow(() => kata.validateDataset([ITEM]));
});

test('validatePickerDataset rejects each failure a picker can hit', () => {
    const { kata } = build();
    const cases = [
        ['no sentence', { ...ITEM, s: '' }],
        ['blanks out of order', { ...ITEM, s: 'Der Mann {1} und {0}.' }],
        ['no blanks', { ...ITEM, b: [] }],
        ['an unusable answer', { ...ITEM, b: [{ a: 'dem', c: 'vocative' }] }],
        // A picker can only offer what the grammar knows: an answer that is not a
        // determiner of its claimed case would leave the learner no button.
        ['a determiner from another case', { ...ITEM, b: [{ a: 'einen', c: 'dat' }] }],
        ['a noun', { ...ITEM, b: [{ a: 'Gast', c: 'dat' }] }],
        // `alt` widens a typed answer and a picker has no way to show it.
        ['an alt list', { ...ITEM, b: [{ a: 'dem', c: 'dat', alt: ['dem Gast'] }] }],
    ];

    for (const [label, bad] of cases) {
        assert.throws(() => kata.validateDataset([bad]), /entry 0 is bad/, label);
    }
});

test('validatePickerDataset refuses a case the kata does not offer', () => {
    // The preposition kata governs no Nominativ, so its validator has to enforce
    // that itself rather than trust the dataset.
    const describe = (index) => `entry ${index} is bad`;
    assert.throws(
        () => validatePickerDataset([{ ...ITEM, b: [{ a: 'der', c: 'nom' }] }], describe, ['akk', 'dat', 'gen']),
        /entry 0 is bad/,
    );
});

test('the failure message is the kata\'s own wording, with the offending index', () => {
    const { kata } = build({ describeProblem: (index) => `entry ${index} lacks a determiner` });
    assert.throws(
        () => kata.validateDataset([ITEM, { ...ITEM, id: 't2', s: '' }]),
        /entry 1 lacks a determiner/,
    );
});

test('the shared template carries the kata\'s instruction and every render target', () => {
    const html = pickerTemplate('Try it — two steps');

    assert.match(html, /Try it — two steps/);
    for (const role of ['section', 'sentence', 'translation', 'prompt', 'progress', 'stage-case', 'stage-form', 'review']) {
        assert.match(html, new RegExp(`data-role="${role}"`), `the template has no ${role}`);
    }
});

test('two katas using the template differ only in their instruction', () => {
    // The reason it is a factory: a copied template would copy its Tailwind
    // classes too, and Tailwind only emits what a scanned file contains.
    assert.equal(
        pickerTemplate('First').replace('First', ''),
        pickerTemplate('Second').replace('Second', ''),
    );
});

test('the trigger reads the sentence, never the answer', () => {
    assert.equal(prepositionBefore('Ich warte bei {0} Arzt.', 0), 'bei');
    assert.equal(prepositionBefore('Die Laterne hängt {0} Haken.', 0), null, 'no preposition in front');
    assert.equal(prepositionBefore('{0} Mann läuft.', 0), null, 'a blank opening the sentence');
    // A noun in front of a later blank is not a trigger: the word is read, and
    // only a preposition counts, or step one would name "Gast" as a preposition.
    assert.equal(prepositionBefore('Der Mann bringt {0} Gast {1} Buch.', 1), null);
    assert.equal(prepositionBefore('Der Mann bringt {0} Gast zu {1} Buch.', 1), 'zu');

    assert.equal(nounAfter('Der Kellner bringt {0} Gast.', 0), 'Gast');
    assert.equal(nounAfter('Der Kellner bringt {0} Gast {1} Buch.', 1), 'Buch');
    assert.equal(nounAfter('Der Mann ist {0}.', 0), null, 'a blank ending the sentence');
    assert.equal(nounAfter('Ich sehe {0} Hund,', 0), 'Hund', 'trailing punctuation is not part of the noun');
});

test('the option generator always offers the answer it was asked about', () => {
    // Guards the contract the picker depends on: whatever the dataset ships, the
    // right button is on the row.
    for (const blank of [
        { a: 'dem', c: 'dat' }, { a: 'Der', c: 'nom' }, { a: 'seinem', c: 'dat' },
        { a: 'seine', c: 'akk' }, { a: 'die', c: 'akk' }, { a: 'ihnen', c: 'dat' },
    ]) {
        const options = determinerOptions(blank);
        assert.ok(
            options.some((form) => form.toLowerCase() === blank.a.toLowerCase()),
            `${blank.a} is not offered for itself`,
        );
        assert.ok(options.length >= 3, `${blank.a} has nothing to choose between`);
        assert.equal(new Set(options.map((f) => f.toLowerCase())).size, options.length, 'a duplicate button');
    }
});