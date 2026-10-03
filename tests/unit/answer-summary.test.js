// tests/unit/answer-summary.test.js
// Grading-to-display logic for the inline verdict. Pure, so no DOM needed.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { summarizeAnswer, summarizeWarning } from '../../assets/js/services/answer-summary.js';

const field = (over = {}) => ({ ok: true, ...over });

test('a fully correct answer reads as ✅ Correct!', () => {
  const summary = summarizeAnswer({ correct: true, fields: [field(), field()] });
  assert.equal(summary.tone, 'correct');
  assert.equal(summary.icon, '✅');
  assert.equal(summary.title, 'Correct!');
});

test('a wrong field flips the tone to ❌ and counts', () => {
  const summary = summarizeAnswer({ correct: false, fields: [field(), field({ ok: false })] });
  assert.equal(summary.tone, 'wrong');
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
  assert.equal(summary.tone, 'wrong', 'the fields outrank the kata own claim');
});

test('the summary needs nothing from a field but its ok flag', () => {
  // The expected answer and the learner's input are painted inline by
  // markControl, so a field carrying only `ok` must grade exactly the same.
  const bare = [{ ok: true }, { ok: false }];
  const decorated = [
    { label: 'Gender', given: 'der', expected: 'das', ok: true },
    { label: 'Plural', given: '—', expected: 'die Hunde', ok: false },
  ];

  assert.deepEqual(summarizeAnswer({ correct: false, fields: bare }),
    summarizeAnswer({ correct: false, fields: decorated }));
});

test('a result with no fields still grades on the kata verdict alone', () => {
  assert.equal(summarizeAnswer({ correct: true }).tone, 'correct');
});

test('a null result is wrong rather than an exception', () => {
  const summary = summarizeAnswer(null);
  assert.equal(summary.tone, 'wrong');
});

test('warnings are amber, carry no grading, and never show an empty title', () => {
  const summary = summarizeWarning('Please select a gender (der, die, or das).');
  assert.equal(summary.tone, 'warning');
  assert.equal(summary.icon, '⚠️');
  assert.equal(summary.title, 'Please select a gender (der, die, or das).');
  assert.equal(summary.detail, '');
  assert.equal(summarizeWarning('   ').title, '—');
});
