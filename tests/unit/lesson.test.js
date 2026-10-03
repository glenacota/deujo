// tests/unit/lesson.test.js
// The rule a wrong answer teaches. All pure string and table work, so no DOM
// stub is needed here: every module under test is import-safe on its own.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { articleRow, caseNote, lesson } from '../../assets/js/services/lesson.js';
import { determinerCases, prepositionGroup } from '../../assets/js/services/grammar.js';
import { renderCaseLesson } from '../../assets/js/katas/cases/lesson.js';
import { renderPrepositionLesson } from '../../assets/js/katas/prepositions/lesson.js';
import { renderNounLesson } from '../../assets/js/katas/nouns/lesson.js';
import { renderVerbLesson } from '../../assets/js/katas/verbs/lesson.js';

test('a lesson is two trimmed strings, or nothing at all', () => {
  assert.deepEqual(lesson('  zum ', ' Dativ. '), { form: 'zum', note: 'Dativ.' });
  assert.equal(lesson('', ''), null, 'an empty lesson must stay empty');
  assert.equal(lesson(null, undefined), null);
  assert.deepEqual(lesson('der', ''), { form: 'der', note: '' }, 'one half is enough');
});

test('the article row is generated from the tables, never hand written', () => {
  assert.equal(articleRow('dat'), 'der → dem · die → der · das → dem · plural → den + die');
  assert.equal(articleRow('akk'), 'der → den · die → die · das → das · plural → die');
  assert.equal(articleRow('nom'), '');
  assert.equal(caseNote('gen'), 'Genitiv: der → des · die → der · das → des · plural → der');
  assert.equal(caseNote('vocative'), '');
});

test('a determiner is traced back to the case it belongs to', () => {
  assert.deepEqual(determinerCases('dem'), ['dat']);
  assert.deepEqual(determinerCases('einen'), ['akk']);
  assert.deepEqual(determinerCases('des'), ['gen']);
  // Shared forms belong to two object cases, so no single case can be claimed.
  assert.deepEqual(determinerCases('den'), ['akk', 'dat']);
  assert.deepEqual(determinerCases('der'), ['dat', 'gen']);
  assert.deepEqual(determinerCases('katze'), [], 'not a determiner');
  assert.deepEqual(determinerCases(''), []);
});

test('a preposition phrase is traced back to its rection group', () => {
  assert.equal(prepositionGroup('zum'), 'dat', 'the fused form is still "zu"');
  assert.equal(prepositionGroup('zu dem'), 'dat');
  assert.equal(prepositionGroup('in die'), 'two');
  assert.equal(prepositionGroup('hinsichtlich des'), 'gen');
  assert.equal(prepositionGroup('zwischen'), null, 'no determiner, still the group');
  assert.equal(prepositionGroup('der Hund'), null, 'no preposition at all');
  assert.equal(prepositionGroup(''), null);
});

test('the case lesson names the case and the case the learner reached for', () => {
  const built = renderCaseLesson({ blank: { a: 'dem', c: 'dat' }, given: 'das', expected: 'dem' });

  assert.equal(built.form, 'dem');
  assert.match(built.note, /^Dativ: der → dem · die → der · das → dem · plural → den \+ die\./);
  assert.match(built.note, /You wrote "das", which is Akkusativ\./);
});

test('the case lesson stays quiet about a form that fits two cases', () => {
  const built = renderCaseLesson({ blank: { a: 'den', c: 'akk' }, given: 'den', expected: 'den' });

  assert.match(built.note, /^Akkusativ:/);
  assert.doesNotMatch(built.note, /You wrote/, '"den" is Akkusativ and Dativ, so no case is claimed');
});

test('the case lesson refuses a blank that claims no case', () => {
  assert.equal(renderCaseLesson({ blank: { a: 'dem' }, given: 'das', expected: 'dem' }), null);
  assert.equal(renderCaseLesson(), null);
});

test('the preposition lesson teaches the group, not the phrase again', () => {
  const oneWay = renderPrepositionLesson({ expected: 'zum' });
  assert.equal(oneWay.form, 'zum');
  assert.match(oneWay.note, /^Dativ: always this case, never a choice\./);
  assert.match(oneWay.note, /der → dem/, 'the article row comes from the tables');

  // The two-way group is the one that decides for itself, so it gets the rule
  // instead of a row of articles.
  const twoWay = renderPrepositionLesson({ expected: 'in den' });
  assert.match(twoWay.note, /^Two-way preposition:/);
  assert.match(twoWay.note, /Dativ where something stays/);

  const genitive = renderPrepositionLesson({ expected: 'hinsichtlich des' });
  assert.match(genitive.note, /^Genitiv:/);
  assert.match(genitive.note, /-s or -es/);

  // No preposition, no rule: bad data teaches nothing rather than something wrong.
  assert.equal(renderPrepositionLesson({ expected: 'Hund' }), null);
  assert.equal(renderPrepositionLesson(), null);
});

test('the noun lesson leads with the gender and its ending', () => {
  const reliable = renderNounLesson({ noun: { w: 'Wohnung', g: 'die', p: 'Wohnungen' }, field: 'gender', expected: 'die' });
  assert.equal(reliable.form, 'die');
  assert.match(reliable.note, /-ung .* are always die/);

  // The interesting case: the ending lies, and the correction says so instead of
  // quoting a rule the word breaks.
  const liar = renderNounLesson({ noun: { w: 'Nummer', g: 'die', p: 'Nummern' }, field: 'gender', expected: 'die' });
  assert.match(liar.note, /Nummer is feminine, not der/);
  assert.match(liar.note, /-er rule/);

  // No rule left: say so rather than inventing one.
  const ruleless = renderNounLesson({ noun: { w: 'Tag', g: 'der', p: 'Tage' }, field: 'gender', expected: 'der' });
  assert.match(ruleless.note, /no ending that gives its gender away/);
  assert.match(ruleless.note, /learn it with the article/i);
});

test('the plural lesson follows the gender, and an unknown field teaches nothing', () => {
  const feminine = renderNounLesson({ noun: { w: 'Wohnung', g: 'die', p: 'Wohnungen' }, field: 'plural', expected: 'die Wohnungen' });
  assert.equal(feminine.form, 'die Wohnungen');
  assert.match(feminine.note, /-n or -en, with no umlaut/);

  const neuter = renderNounLesson({ noun: { w: 'Buch', g: 'das', p: 'Bücher' }, field: 'plural', expected: 'die Bücher' });
  assert.match(neuter.note, /die Bücher/, 'the umlaut rule with its example');

  assert.equal(renderNounLesson({ noun: { w: 'Haus', g: 'das' }, field: 'gender' }), null);
  assert.equal(renderNounLesson({ noun: { w: 'Haus', g: 'das' }, field: 'sex' }), null);
});

test('the Präsens lesson names the person and the ending', () => {
  const built = renderVerbLesson({ verb: { w: 'gehen' }, tenseKey: 'pres', index: 1, expected: 'gehst' });

  assert.equal(built.form, 'gehst');
  assert.match(built.note, /^du takes -st\./);
  assert.match(built.note, /stem change shows up in du and er\/sie\/es only/);

  // The Präteritum reads the shipped form, so it can tell weak from strong.
  const weak = renderVerbLesson({ verb: { w: 'lernen' }, tenseKey: 'praet', index: 0, expected: 'lernte' });
  assert.match(weak.note, /^ich takes -te\./);
  assert.match(weak.note, /lernen is weak/);

  const strong = renderVerbLesson({ verb: { w: 'nehmen' }, tenseKey: 'praet', index: 3, expected: 'nahmen' });
  assert.match(strong.note, /^wir takes -ten\./);
  assert.match(strong.note, /nehmen is strong: the stem vowel changes \(nehmen → nah\)/);

  assert.equal(renderVerbLesson({ verb: { w: 'gehen' }, tenseKey: 'pres' }), null);
});

test('the Perfekt lesson covers the auxiliary and the participle', () => {
  const sein = renderVerbLesson({ verb: { w: 'gehen' }, tenseKey: 'perf', index: null, expected: 'sein' });
  assert.equal(sein.form, 'sein');
  assert.match(sein.note, /movement and a new state/);

  const haben = renderVerbLesson({ verb: { w: 'machen' }, tenseKey: 'perf', index: null, expected: 'haben' });
  assert.match(haben.note, /default when neither applies/);

  // The participle rule is read off the shipped forms, not asserted per verb.
  const weak = renderVerbLesson({ verb: { w: 'machen' }, tenseKey: 'perf', index: 0, expected: 'gemacht' });
  assert.equal(weak.form, 'gemacht');
  assert.match(weak.note, /machen is weak: ge- \+ the stem \+ -t/);

  const strong = renderVerbLesson({ verb: { w: 'gehen' }, tenseKey: 'perf', index: 0, expected: 'gegangen' });
  assert.match(strong.note, /gehen changes its stem vowel/);
  assert.match(strong.note, /ge- \+ the changed stem \+ -en/);

  assert.equal(renderVerbLesson({ verb: { w: 'gehen' }, tenseKey: 'perf', index: null, expected: 'werden' }), null);
});
