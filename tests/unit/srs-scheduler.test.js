// tests/unit/srs-scheduler.test.js
// Pure scheduling rules. `now` and `rng` are injected, so no clock or Math.random stubbing.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  GRADES, DAY_MS, newRecord, isValidRecord, schedule,
} from '../../assets/js/services/srs-scheduler.js';

const NOW = 1_700_000_000_000;
const noFuzz = () => 0.5; // keeps the ±5% multiplier at exactly 1.0

function graduated(interval, ease = 2.5) {
  return { interval, ease, dueAt: NOW - DAY_MS, lapses: 0, step: null };
}

test('newRecord starts in the first learning step', () => {
  assert.deepEqual(newRecord(), { interval: 0, ease: 2.5, dueAt: 0, lapses: 0, step: 0 });
});

test('schedule rejects an unknown grade', () => {
  assert.throws(() => schedule('easy', newRecord(), NOW), /Unknown grade "easy"/);
});

test('schedule never mutates its input record', () => {
  const before = newRecord();
  const snapshot = { ...before };
  schedule(GRADES.GOOD, before, NOW, noFuzz);
  assert.deepEqual(before, snapshot);
});

test('a good answer walks the learning steps then graduates after one day', () => {
  const step1 = schedule(GRADES.GOOD, newRecord(), NOW);
  assert.equal(step1.step, 1);
  assert.equal(step1.dueAt, NOW + 600_000);

  const graduatedRec = schedule(GRADES.GOOD, step1, NOW);
  assert.equal(graduatedRec.step, null);
  assert.equal(graduatedRec.interval, 1);
  assert.equal(graduatedRec.dueAt, NOW + DAY_MS);
});

test('an again answer resets to the first learning step', () => {
  const relearning = schedule(GRADES.AGAIN, graduated(10), NOW);
  assert.equal(relearning.step, 0);
  assert.equal(relearning.dueAt, NOW + 60_000);
});

test('relearning after a lapse returns to the shortened interval, not to one day', () => {
  const lapsed = schedule(GRADES.AGAIN, graduated(10), NOW);
  assert.equal(lapsed.interval, 5, 'a lapse halves the interval');

  const relearning = schedule(GRADES.GOOD, lapsed, NOW);
  assert.equal(relearning.step, 1);

  const back = schedule(GRADES.GOOD, relearning, NOW);
  assert.equal(back.step, null);
  assert.equal(back.interval, 5, 'relearning restores the lapsed interval instead of graduating at one day');
  assert.equal(back.lapses, 1, 'the lapse is remembered');
});

test('a good answer on a not-yet-due graduated item does not inflate the interval', () => {
  const future = { ...graduated(10), dueAt: NOW + 5 * DAY_MS };
  const result = schedule(GRADES.GOOD, future, NOW, noFuzz);
  assert.deepEqual(result, future);
});

test('a lapse halves the interval, cuts ease by 0.2, and never drops below one day', () => {
  const lapse = schedule(GRADES.AGAIN, graduated(10), NOW);
  assert.equal(lapse.lapses, 1);
  assert.equal(lapse.ease, 2.3);
  assert.equal(lapse.interval, 5);

  const floored = schedule(GRADES.AGAIN, graduated(1, 1.3), NOW);
  assert.equal(floored.ease, 1.3, 'ease floors at 1.3');
  assert.equal(floored.interval, 1, 'interval floors at one day');
});

test('a good answer multiplies the interval by ease', () => {
  const result = schedule(GRADES.GOOD, graduated(4, 2.5), NOW, noFuzz);
  assert.equal(result.interval, 10);
  assert.equal(result.dueAt, NOW + 10 * DAY_MS);
});

test('the interval always advances by at least one day', () => {
  const result = schedule(GRADES.GOOD, graduated(1, 1.3), NOW, noFuzz);
  assert.equal(result.interval, 2);
});

test('fuzz stays within ±5% and only applies from three days up', () => {
  const low = schedule(GRADES.GOOD, graduated(4, 2.5), NOW, () => 0);
  const high = schedule(GRADES.GOOD, graduated(4, 2.5), NOW, () => 1);
  assert.equal(low.interval, Math.round(4 * 2.5 * 0.95));
  assert.equal(high.interval, Math.round(4 * 2.5 * 1.05));

  const short = schedule(GRADES.GOOD, graduated(2, 1.5), NOW, () => 0);
  assert.equal(short.interval, 3, 'a two-day interval is never fuzzed');
});

test('isValidRecord accepts real records and rejects corrupted ones', () => {
  assert.equal(isValidRecord(newRecord()), true);
  assert.equal(isValidRecord(graduated(3)), true);
  assert.equal(isValidRecord({ ...graduated(3), step: 1 }), true);

  assert.equal(isValidRecord(null), false);
  assert.equal(isValidRecord({ ...graduated(3), ease: '2.5' }), false);
  assert.equal(isValidRecord({ ...graduated(3), dueAt: Number.NaN }), false);
  assert.equal(isValidRecord({ ...graduated(3), step: 1.5 }), false);
  assert.equal(isValidRecord({ ...graduated(3), step: 2 }), false, 'step is out of range');
  assert.equal(isValidRecord({ ...graduated(3), step: -1 }), false);
});
