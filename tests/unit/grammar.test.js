// tests/unit/grammar.test.js
// The grammar tables and the queries built on them. These are pure functions
// over the German rules, so they are tested here rather than through a kata.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    BLANK_PLACEHOLDER,
    CASE_KEYS,
    PREPOSITION_CONTRACTIONS,
    PREPOSITION_GROUPS,
    determinerBelongsTo,
    hasOrderedBlankPlaceholders,
    prepositionRection,
    splitBlanks,
} from '../../assets/js/services/grammar.js';

test('splitBlanks alternates literal text and blank index', () => {
  // No trailing empty string unless the sentence ends with a blank.
  assert.deepEqual(splitBlanks('Ich gehe {0} Arzt.'), ['Ich gehe ', '0', ' Arzt.']);
  assert.deepEqual(splitBlanks('Ich gehe {0}.'), ['Ich gehe ', '0', '.']);
  assert.deepEqual(splitBlanks('{0} Mann und {1} Frau.'), ['', '0', ' Mann und ', '1', ' Frau.']);
  assert.deepEqual(splitBlanks('Kein Platzhalter.'), ['Kein Platzhalter.']);
  assert.deepEqual(splitBlanks(''), ['']);
});

test('splitBlanks returns nothing usable for a non-string', () => {
  // A validator can be handed a missing field, so this must not throw.
  for (const value of [undefined, null, 42, {}]) {
    assert.deepEqual(splitBlanks(value), []);
  }
});

test('the renderer and the validator agree on what a placeholder is', () => {
  // Same regex, so a dataset cannot pass validation and then render differently.
  const sentence = 'Der Kellner bringt {0} Gast {1} Getränke.';
  const fromSplit = splitBlanks(sentence).filter((_, i) => i % 2 === 1);
  const fromScan = [...sentence.matchAll(BLANK_PLACEHOLDER)].map((m) => m[1]);

  assert.deepEqual(fromSplit, fromScan);
  assert.deepEqual(fromScan, ['0', '1']);
});

test('hasOrderedBlankPlaceholders requires every blank once, in order', () => {
  assert.equal(hasOrderedBlankPlaceholders('{0} a {1} b', 2), true);
  assert.equal(hasOrderedBlankPlaceholders('{0} a b', 1), true);
  assert.equal(hasOrderedBlankPlaceholders('no blanks', 1), false);
  assert.equal(hasOrderedBlankPlaceholders('{0} und {0}', 2), false, 'repeated index');
  assert.equal(hasOrderedBlankPlaceholders('{1} und {0}', 2), false, 'reversed');
  assert.equal(hasOrderedBlankPlaceholders('{0} a {2} b', 2), false, 'skips an index');
  assert.equal(hasOrderedBlankPlaceholders('{0} a', 2), false, 'fewer placeholders than blanks');
  assert.equal(hasOrderedBlankPlaceholders(undefined, 1), false);
  assert.equal(hasOrderedBlankPlaceholders('{0}', 0), false, 'a dataset needs at least one blank');
});

test('a determiner is only in a case when the case really takes it', () => {
  assert.equal(determinerBelongsTo('dem', 'dat'), true);
  assert.equal(determinerBelongsTo('den', 'akk'), true);
  assert.equal(determinerBelongsTo('des', 'gen'), true);
  assert.equal(determinerBelongsTo('der', 'nom'), true, 'the picker katas check the Nominativ too');

  assert.equal(determinerBelongsTo('dem', 'akk'), false, 'a form from another case');
  assert.equal(determinerBelongsTo('einen', 'dat'), false);
  assert.equal(determinerBelongsTo('Hause', 'dat'), false, 'a noun is not a determiner');
  assert.equal(determinerBelongsTo('', 'dat'), false);
  assert.equal(determinerBelongsTo('der', 'vocative'), false, 'an unknown case has no forms');
});

test('a determiner that serves two cases still passes in the right one', () => {
  // "den" is both the Akkusativ singular and the Dativ plural, so "mit den" is
  // the correct Dativ answer even though the form is not Dativ-exclusive. This
  // is what membership rather than a derived single case buys.
  assert.equal(determinerBelongsTo('den', 'dat'), true);
  assert.equal(determinerBelongsTo('den', 'akk'), true, 'the same form reads as Akkusativ');
  assert.equal(determinerBelongsTo('den', 'gen'), false);
});

test('every case has the determiner forms a picker offers buttons for', () => {
  // The picker builds its step-two row out of these tables, so a case missing a
  // whole determiner family would leave blanks the learner cannot answer.
  const perCase = {
    der: { nom: 'der', akk: 'den', dat: 'dem', gen: 'des' },
    die: { nom: 'die', akk: 'die', dat: 'der', gen: 'der' },
    ein: { nom: 'ein', akk: 'einen', dat: 'einem', gen: 'eines' },
    mein: { nom: 'mein', akk: 'meinen', dat: 'meinem', gen: 'meines' },
  };

  for (const [stem, byCase] of Object.entries(perCase)) {
    for (const caseKey of CASE_KEYS) {
      assert.ok(
        determinerBelongsTo(byCase[caseKey], caseKey),
        `${stem} has no ${caseKey} form the picker could offer`,
      );
    }
  }
});

test('a preposition word is traced back to its rection group', () => {
  // The picker asks step one about the preposition standing in the sentence, so
  // the rection has to be readable from that one word.
  assert.equal(prepositionRection('bei'), 'dat');
  assert.equal(prepositionRection('durch'), 'akk');
  assert.equal(prepositionRection('Wegen'), 'gen', 'a sentence-initial preposition keeps its capital');
  assert.equal(prepositionRection('auf'), 'two');
  assert.equal(prepositionRection('der'), null, 'a determiner is not a preposition');
  assert.equal(prepositionRection('Hund'), null);
  assert.equal(prepositionRection(''), null);
});

test('every listed preposition is traceable to a rection group', () => {
  // Guards the round trip the dataset relies on: the prompt names a preposition
  // and the lesson names its group, so both must resolve from the same table.
  for (const [group, list] of Object.entries(PREPOSITION_GROUPS)) {
    for (const preposition of list) {
      assert.equal(prepositionRection(preposition), group, preposition);
    }
  }
});

test('every standard contraction is recognised as its preposition', () => {
  // Only "das" is Akkusativ, so those are the only contractions a movement takes.
  for (const [fused, { preposition }] of Object.entries(PREPOSITION_CONTRACTIONS)) {
    assert.ok(prepositionRection(preposition), `${fused} has no group via ${preposition}`);
  }
});
