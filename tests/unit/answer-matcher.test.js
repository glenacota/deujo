// tests/unit/answer-matcher.test.js
// Multiple correct answers per blank: the grammar-derived spellings, an explicit
// dataset `alt` list, and the multi-word answer. Pure, so no DOM needed.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  acceptedAnswers,
  formatAccepted,
  matchAnswer,
} from '../../assets/js/services/answer-matcher.js';

test('a contraction and its written-out form are each correct for the other', () => {
  // The dataset may store either spelling, so both blanks must accept both answers.
  for (const answer of ['zum', 'zu dem']) {
    for (const given of ['zum', 'Zu dem', 'ZU  DEM', ' zu dem ']) {
      assert.equal(matchAnswer(given, answer).ok, true, `"${given}" must pass a blank holding "${answer}"`);
    }
  }
  assert.deepEqual(acceptedAnswers('zum'), ['zum', 'zu dem']);
  assert.deepEqual(acceptedAnswers('zu dem'), ['zu dem', 'zum']);
  assert.deepEqual(acceptedAnswers('ins'), ['ins', 'in das']);
  assert.deepEqual(acceptedAnswers('in das'), ['in das', 'ins']);
});

test('a phrase that cannot contract keeps exactly one spelling', () => {
  assert.deepEqual(acceptedAnswers('auf dem'), ['auf dem']);
  assert.deepEqual(acceptedAnswers('durch den'), ['durch den']);
  assert.equal(matchAnswer('auf den', 'auf dem').ok, false);
});

test('an alt entry is accepted but does not widen the other case', () => {
  const blank = { a: 'in die', alt: ['in die Altstadt', 'rein'] };
  assert.equal(matchAnswer('rein', blank).ok, true);
  assert.equal(matchAnswer('In die Altstadt', blank).ok, true);
  assert.equal(matchAnswer('in das', blank).ok, false, 'the alt list must not add a wrong case');
  assert.deepEqual(acceptedAnswers(blank), ['in die', 'in die altstadt', 'rein']);
});

test('a blank without alt still accepts only what the grammar allows', () => {
  assert.deepEqual(acceptedAnswers({ a: 'der' }), ['der']);
  assert.deepEqual(acceptedAnswers('der'), ['der']);
});

test('extra words are only forgivable when the option asks for it', () => {
  const blank = 'der';
  assert.equal(matchAnswer('der Mann', blank).ok, false, 'strict by default');
  assert.equal(matchAnswer('der Mann', blank, { allowExtraWords: true }).ok, true);
  assert.equal(matchAnswer('der', blank, { allowExtraWords: true }).ok, true);
  // The article may be typed with or without its noun, not with a phrase in between.
  assert.equal(matchAnswer('der große Mann', blank, { allowExtraWords: true }).ok, false);
  assert.equal(matchAnswer('ein Mann', blank, { allowExtraWords: true }).ok, false);
});

test('an empty answer is wrong, not an exception', () => {
  assert.deepEqual(matchAnswer('', 'zum'), { ok: false, accepted: ['zum', 'zu dem'] });
  assert.deepEqual(matchAnswer('   ', 'zum').ok, false);
  assert.deepEqual(acceptedAnswers(''), []);
  assert.deepEqual(acceptedAnswers(null), []);
  assert.deepEqual(acceptedAnswers(undefined), []);
});

test('a malformed alt is ignored rather than crashing the grading', () => {
  assert.deepEqual(acceptedAnswers({ a: 'zum', alt: 'zu dem' }), ['zum', 'zu dem'], 'a non-array alt is skipped');
  assert.deepEqual(acceptedAnswers({ a: 'zum', alt: ['', 'zur'] }), ['zum', 'zu dem', 'zur']);
});

test('the accepted list is deduplicated, with the dataset spelling first', () => {
  assert.deepEqual(acceptedAnswers({ a: 'zum', alt: ['zum', 'zu dem'] }), ['zum', 'zu dem']);
});

test('formatAccepted stays short enough for a badge beside an input', () => {
  assert.equal(formatAccepted(['zum', 'zu dem']), 'zum / zu dem');
  assert.equal(formatAccepted([]), '');
  assert.equal(formatAccepted(['a', 'b', 'c']), 'a / b / c');
  assert.equal(formatAccepted(['a', 'b', 'c', 'd', 'e']), 'a / b / c / +2');
  assert.equal(formatAccepted(null), '');
});
