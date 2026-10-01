// tests/unit/answer-summary.test.js
// Grading-to-display logic for the inline verdict. Pure, so no DOM needed.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { summarizeAnswer, summarizeWarning, VERDICT_TONE } from '../../assets/js/services/answer-summary.js';

const field = (over = {}) => ({ label: 'Gender', given: 'der', expected: 'der', ok: true, ...over });

test('a fully correct answer reads as ✅ Correct!', () => {
  const summary = summarizeAnswer({ correct: true, fields: [field(), field({ label: 'Plural' })] });
  assert.equal(summary.tone, VERDICT_TONE.correct);
  assert.equal(summary.icon, '✅');
  assert.equal(summary.title, 'Correct!');
});

test('a wrong field flips the tone to ❌ and counts', () => {
  const summary = summarizeAnswer({ correct: false, fields: [field(), field({ given: 'die', expected: 'das', ok: false })] });
  assert.equal(summary.tone, VERDICT_TONE.wrong);
  assert.equal(summary.icon, '❌');
  assert.equal(summary.title, 'Wrong answer.');
});

test('the title pluralises with the number of wrong answers', () => {
  const summary = summarizeAnswer({
    correct: false,
    fields: [field({ ok: false }), field({ ok: false }), field()],
  });
  assert.equal(summary.title, '2 wrong answers.');
});

test('a kata cannot claim success while a field is still wrong', () => {
  const summary = summarizeAnswer({ correct: true, fields: [field({ ok: false })] });
  assert.equal(summary.tone, VERDICT_TONE.wrong, 'the fields outrank the kata own claim');
});

test('a result with no fields still grades on the kata verdict alone', () => {
  assert.equal(summarizeAnswer({ correct: true }).tone, VERDICT_TONE.correct);
});

test('a null result is wrong rather than an exception', () => {
  const summary = summarizeAnswer(null);
  assert.equal(summary.tone, VERDICT_TONE.wrong);
});

test('warnings are amber, carry no grading, and never show an empty title', () => {
  const summary = summarizeWarning('Please select a gender (der, die, or das).');
  assert.equal(summary.tone, VERDICT_TONE.warning);
  assert.equal(summary.icon, '⚠️');
  assert.equal(summary.title, 'Please select a gender (der, die, or das).');
  assert.equal(summary.detail, '');
  assert.equal(summarizeWarning('   ').title, '—');
});
