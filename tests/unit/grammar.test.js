// tests/unit/grammar.test.js
// The grammar tables and the queries built on them. These are pure functions
// over the German rules, so they are tested here rather than through a kata.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    BLANK_PLACEHOLDER,
    PREPOSITION_CONTRACTIONS,
    hasOrderedBlankPlaceholders,
    isPrepositionPhraseInCase,
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

test('a phrase is only in a case when its determiner is', () => {
  assert.equal(isPrepositionPhraseInCase('zum', 'dat'), true, 'the fused Dativ');
  assert.equal(isPrepositionPhraseInCase('zu dem', 'dat'), true, 'its written-out form');
  assert.equal(isPrepositionPhraseInCase('in die', 'akk'), true);
  assert.equal(isPrepositionPhraseInCase('in dem', 'dat'), true, 'the same preposition, the other case');
  assert.equal(isPrepositionPhraseInCase('beim', 'akk'), false, '"beim" is Dativ');
  assert.equal(isPrepositionPhraseInCase('dem', 'dat'), false, 'a determiner alone is not a phrase');
  assert.equal(isPrepositionPhraseInCase('Hause', 'dat'), false, 'a noun is not a preposition');
  assert.equal(isPrepositionPhraseInCase('zum', 'nom'), false, 'no preposition governs the nominative');
});

test('a determiner that serves two cases still passes in the right one', () => {
  // "den" is both the Akkusativ singular and the Dativ plural, so "mit den" is
  // the correct Dativ answer even though the form is not Dativ-exclusive.
  assert.equal(isPrepositionPhraseInCase('mit den', 'dat'), true);
  assert.equal(isPrepositionPhraseInCase('mit den', 'akk'), true, 'the same form reads as Akkusativ');
  assert.equal(isPrepositionPhraseInCase('mit den', 'gen'), false);
});

test('a longer phrase is judged by its determiner, not by what follows', () => {
  assert.equal(isPrepositionPhraseInCase('in die Tür', 'akk'), true);
  assert.equal(isPrepositionPhraseInCase('zum Bahnhof', 'akk'), false, 'still Dativ, whatever follows');
  // The determiner must sit directly after the preposition: an intervening
  // adjective is not a determiner form this service models.
  assert.equal(isPrepositionPhraseInCase('zum großen Arzt', 'dat'), false);
});

test('a phrase built from an unknown preposition belongs to no case', () => {
  assert.equal(isPrepositionPhraseInCase('hinsichtlich des', 'gen'), true, 'a known genitive preposition');
  assert.equal(isPrepositionPhraseInCase('zwischens dem', 'dat'), false, 'a preposition we do not model');
  assert.equal(isPrepositionPhraseInCase('', 'dat'), false);
});

test('every standard contraction is accepted in the case its article takes', () => {
  // Guards the round trip the dataset relies on: only "das" is Akkusativ, so
  // that is the only case those phrases can carry.
  for (const [fused, { preposition, article }] of Object.entries(PREPOSITION_CONTRACTIONS)) {
    const caseKey = article === 'das' ? 'akk' : 'dat';
    assert.equal(isPrepositionPhraseInCase(fused, caseKey), true, fused);
    assert.equal(isPrepositionPhraseInCase(`${preposition} ${article}`, caseKey), true, fused);
  }
});
