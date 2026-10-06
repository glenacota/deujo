// tests/unit/sentence-kata.test.js
// The shared engine behind the fill-in-the-blank sentence katas.
//
// What is pinned here is the path `cases` and `prepositions` share:
// the empty-blank guard, the note beside a wrong input, the fixed attributes on
// every blank, and the dataset scaffold. The parts that stay per-kata are
// checked in `kata-check.test.js`, which grades real entries through the real
// katas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../helpers/bootstrap.js';

const { createSentenceKata, validateSentenceDataset } = await import('../../assets/js/katas/factories/sentence-kata.js');
const { sentenceTemplate } = await import('../../assets/js/katas/factories/sentence-template.js');

const MANIFEST = {
    id: 'test', name: 'Test', subtitle: 'Sub', datasetUrl: './x.json',
    accent: 'teal', helpTitle: 'Help',
};

const ITEM = {
    id: 't1', w: 'Ein Satz.', m: 'A sentence.',
    s: 'Er gibt {0} Buch dem {1} Freund.',
    b: [{ a: 'dem', c: 'dat' }, { a: 'den', c: 'akk' }],
};

/** A kata with only what differs overridden, so defaults are visible. */
function build(overrides = {}) {
    const lessons = [];
    const config = {
        manifest: MANIFEST,
        template: sentenceTemplate('Fill it in'),
        help: () => '<p>help body</p>',
        input: { maxLength: 20, size: 6, className: 'blank-input' },
        isUsableAnswer: (blank) => typeof blank?.c === 'string' && blank.c.length === 3,
        describeProblem: (index) => `entry ${index} is bad`,
        lessonFor: (miss) => { lessons.push(miss); return null; },
        ...overrides,
    };
    const container = document.createElement('div');
    const kata = createSentenceKata(config)(container);
    return { kata, container, lessons };
}

/** Renders ITEM and grades it with the given values. */
function grade(values, overrides) {
    const { kata, container, lessons } = build(overrides);
    kata.render(ITEM);
    const inputs = container.querySelectorAll('input');
    inputs.forEach((input, i) => { input.value = values[i] ?? ''; });
    return { result: kata.check(ITEM), inputs, container, lessons };
}

const inputsOf = (container) => container.querySelectorAll('input');

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

test('one input is built per placeholder, in sentence order', () => {
    const { kata, container } = build();
    kata.render(ITEM);

    const inputs = inputsOf(container);
    assert.equal(inputs.length, 2);
    assert.deepEqual(inputs.map((i) => i.dataset.index), ['0', '1']);
});

test('every blank carries the input attributes a German answer needs', () => {
    const { kata, container } = build();
    kata.render(ITEM);

    // Nine lines each kata used to copy: autocorrect would fight a German
    // answer, and spellcheck has nothing useful to say about one. Asserted as
    // properties, which is how they are set; the real DOM reflects them to
    // content attributes and the stub does not.
    for (const input of inputsOf(container)) {
        assert.equal(input.type, 'text');
        assert.equal(input.autocomplete, 'off');
        assert.equal(input.spellcheck, false);
        assert.equal(input.autocapitalize, 'none');
        assert.equal(input.autocorrect, 'off');
        assert.equal(input.lang, 'de');
    }
});

test("the last blank's enterkeyhint is done, so the keyboard closes there", () => {
    const { kata, container } = build();
    kata.render(ITEM);

    const inputs = inputsOf(container);
    assert.equal(inputs[0].getAttribute('enterkeyhint'), 'next');
    assert.equal(inputs.at(-1).getAttribute('enterkeyhint'), 'done');
    assert.equal(inputs[0].getAttribute('aria-label'), 'Blank 1 of 2');
});

test("the kata's own input options are applied, and a placeholder is optional", () => {
    const { kata, container } = build({
        input: { maxLength: 18, size: 12, className: 'blank-input--wide', placeholder: 'e.g. zum' },
    });
    kata.render(ITEM);

    const [input] = inputsOf(container);
    assert.equal(input.maxLength, 18);
    assert.equal(input.size, 12);
    assert.equal(input.className, 'blank-input--wide');
    assert.equal(input.placeholder, 'e.g. zum');
});

test('an omitted placeholder leaves the field unlabelled rather than "undefined"', () => {
    const { kata, container } = build({ input: { maxLength: 20, size: 6, className: 'x' } });
    kata.render(ITEM);

    assert.equal(inputsOf(container)[0].placeholder, undefined);
});

test('an empty blank is reported as unfinished, not graded', () => {
    for (const values of [['', 'den'], ['dem', '']]) {
        const { result } = grade(values);
        assert.match(result.warning, /fill in all blanks/i);
        assert.equal(result.correct, undefined, 'a warning is not a verdict');
    }
});

test('a whitespace-only blank counts as empty', () => {
    const { result } = grade(['   ', 'den']);
    assert.match(result.warning, /fill in all blanks/i);
});

test('checking before rendering warns rather than grading nothing', () => {
    const { kata } = build();
    assert.match(kata.check(ITEM).warning, /fill in all blanks/i);
});

test('a fully correct answer reports one field per blank', () => {
    const { result } = grade(['dem', 'den']);
    assert.equal(result.correct, true);
    assert.deepEqual(result.fields, [{ ok: true }, { ok: true }]);
});

test('one wrong blank fails the verdict but still reports every field', () => {
    const { result } = grade(['den', 'den']);
    assert.equal(result.correct, false);
    assert.deepEqual(result.fields, [{ ok: false }, { ok: true }]);
});

test('a wrong blank shows the expected spelling beside the input', () => {
    const { container } = grade(['den', 'den']);
    const [input] = inputsOf(container);
    const note = input.parentElement.querySelectorAll('.answer-note')[0];

    assert.equal(note.textContent, 'dem');
    assert.equal(input.dataset.answerState, 'wrong');
    assert.equal(input.getAttribute('aria-invalid'), 'true');
});

test('a correct blank shows a badge and no note, to keep the row readable', () => {
    const { container } = grade(['den', 'den']);
    const [, second] = inputsOf(container);

    assert.equal(second.dataset.answerState, 'correct');
    assert.equal(second.parentElement.querySelectorAll('.answer-note').length, 0);
});

test('expectedFor defaults to the dataset spelling', () => {
    const { container } = grade(['den', 'den']);
    const note = inputsOf(container)[0].parentElement.querySelectorAll('.answer-note')[0];
    assert.equal(note.textContent, 'dem');
});

test('expectedFor decides what the correction panel is taught, not the note', () => {
    // The note beside the input always lists the accepted spellings, so
    // `expectedFor` is what a kata's own rule changes: the form the panel
    // quotes back.
    const { lessons } = grade(['den', 'den'], {
        expectedFor: (blank) => `${blank.c}:${blank.a}`,
    });
    assert.equal(lessons[0].expected, 'dat:dem');
});

test('matchOptions reach the matcher, so a kata can accept extra words', () => {
    const lenient = grade(['dem Buch', 'den'], { matchOptions: { allowExtraWords: true } });
    assert.equal(lenient.result.correct, true, 'the noun may be typed along with the article');

    const strict = grade(['dem Buch', 'den'], { matchOptions: {} });
    assert.equal(strict.result.correct, false, 'without the option the extra word is a miss');
});

test('the correction panel is asked to teach the first miss only', () => {
    const { lessons } = grade(['den', 'ihr']);
    assert.equal(lessons.length, 1);
    assert.deepEqual(lessons[0], { blank: ITEM.b[0], given: 'den', expected: 'dem' });
});

test('a clean verdict still asks for a lesson, with no miss to teach', () => {
    // Every verdict builds a lesson, so lessonFor has to tolerate an absent
    // miss. A kata that assumed one existed would throw on every right answer.
    const { lessons, result } = grade(['dem', 'den']);
    assert.equal(result.correct, true);
    assert.equal(lessons.length, 1);
    assert.equal(lessons[0], undefined);
});

test('help is answer-blind: it is called with no item at all', () => {
    let called = null;
    const { kata } = build({ help: (...args) => { called = args; return '<p>x</p>'; } });

    kata.getHelpContent();
    assert.deepEqual(called, [], 'help must not receive the item, or it could print the answer');
});

test('validateSentenceDataset accepts an entry it should', () => {
    const { kata } = build();
    assert.doesNotThrow(() => kata.validateDataset([ITEM]));
});

test('validateSentenceDataset rejects each of the three shared failures', () => {
    const { kata } = build();
    const cases = [
        ['no sentence', { ...ITEM, s: '' }],
        ['blanks out of order', { ...ITEM, s: 'Er gibt {1} Buch dem {0} Freund.' }],
        ['unusable answer', { ...ITEM, b: [{ a: 'dem', c: 'nope' }, ITEM.b[1]] }],
    ];

    for (const [label, bad] of cases) {
        assert.throws(() => kata.validateDataset([bad]), /entry 0 is bad/, label);
    }
});

test('the failure message is the kata\'s own wording, with the offending index', () => {
    const { kata } = build({ describeProblem: (index) => `entry ${index} lacks a preposition` });
    assert.throws(() => kata.validateDataset([ITEM, { ...ITEM, id: 't2', s: '' }]), /entry 1 lacks a preposition/);
});

test('validateSentenceDataset refuses an empty or non-array dataset', () => {
    assert.throws(() => validateSentenceDataset([], () => true, () => 'x'), /non-empty array/);
    assert.throws(() => validateSentenceDataset({}, () => true, () => 'x'), /non-empty array/);
});

test('the shared template carries the kata\'s instruction and the two render targets', () => {
    const html = sentenceTemplate('Fill in the preposition');

    assert.match(html, /Fill in the preposition/);
    assert.match(html, /data-role="section"/);
    assert.match(html, /data-role="sentence"/);
    assert.match(html, /data-role="translation"/);
});

test('two katas using the template differ only in their instruction', () => {
    // The reason it is a factory: a copied template would copy its Tailwind
    // classes too, and Tailwind only emits what a scanned file contains.
    const a = sentenceTemplate('First');
    const b = sentenceTemplate('Second');

    assert.equal(a.replace('First', ''), b.replace('Second', ''));
});

test('createBlankInput and renderBlankSentence are what the engine is built from', () => {
    // Guards the wiring rather than the behaviour: if the engine ever stopped
    // going through the shared renderer, the dedup would silently be undone.
    const source = createSentenceKata.toString();
    assert.match(source, /createBlankInput/);
    assert.match(source, /renderBlankSentence/);
});
