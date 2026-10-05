// tests/unit/srs-scheduler.test.js
// Pure box rules. `now` is injected, so no clock or Math.random stubbing.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BOX_COUNT, DAY_MS, newRecord, isValidRecord, schedule,
} from '../../assets/js/services/srs-scheduler.js';
import { CONFIG } from '../helpers/bootstrap.js';

const NOW = 1_700_000_000_000;
const inBox = (box) => ({ box, dueAt: NOW });

test('every box the scheduler can reach has a delay to schedule it with', () => {
  // The delay ladder moved into CONFIG.srs next to the box count, and the two
  // have to stay the same length. Raising `boxes` without adding a delay makes
  // `delaysDays[box]` undefined, so `dueAt` becomes NaN, `isValidRecord`
  // rejects the record it just wrote, and every answer in the top box silently
  // forgets itself.
  assert.equal(
    CONFIG.srs.delaysDays.length,
    BOX_COUNT,
    `CONFIG.srs has ${BOX_COUNT} boxes but ${CONFIG.srs.delaysDays.length} delays`,
  );
});

test('every delay is a real, non-negative number of days', () => {
  CONFIG.srs.delaysDays.forEach((days, box) => {
    assert.ok(Number.isFinite(days), `box ${box} has a non-finite delay`);
    assert.ok(days >= 0, `box ${box} has a negative delay`);
  });
  assert.equal(CONFIG.srs.dayMs, 24 * 60 * 60 * 1000, 'dayMs is a day in milliseconds');
});

test('a mistake is due again straight away', () => {
  // Index 0 is the box a wrong answer drops to, so its delay has to be zero or
  // every mistake would sit unseen for days.
  assert.equal(CONFIG.srs.delaysDays[0], 0);
  assert.equal(schedule(false, inBox(BOX_COUNT - 1), NOW).dueAt, NOW);
});

test('newRecord starts in the first box', () => {
  assert.deepEqual(newRecord(), { box: 0, dueAt: 0 });
});

test('schedule never mutates its input record', () => {
  const before = inBox(2);
  const snapshot = { ...before };
  schedule(true, before, NOW);
  assert.deepEqual(before, snapshot);
});

test('a correct answer moves the item up exactly one box', () => {
  assert.equal(schedule(true, inBox(0), NOW).box, 1);
  assert.equal(schedule(true, inBox(1), NOW).box, 2);
});

test('a correct answer makes the item due later the higher the box', () => {
  const low = schedule(true, inBox(0), NOW);
  const high = schedule(true, inBox(1), NOW);
  assert.equal(low.dueAt, NOW + 2 * DAY_MS);
  assert.ok(high.dueAt > low.dueAt, 'a higher box waits longer');
});

test('box delays are 0, 2, and 9 days', () => {
  const dueAt = [
    schedule(false, inBox(0), NOW).dueAt,
    ...Array.from({ length: BOX_COUNT - 1 }, (_, box) => schedule(true, inBox(box), NOW).dueAt),
  ];

  assert.deepEqual(dueAt, [0, 2, 9].map((days) => NOW + days * DAY_MS));
});

test('the last box is the ceiling', () => {
  const top = schedule(true, inBox(BOX_COUNT - 1), NOW);
  assert.equal(top.box, BOX_COUNT - 1);
  assert.equal(schedule(true, top, NOW).box, BOX_COUNT - 1, 'it cannot climb higher');
});

test('a mistake drops the item to the first box and makes it due immediately', () => {
  assert.deepEqual(schedule(false, inBox(2), NOW), { box: 0, dueAt: NOW });
  assert.deepEqual(schedule(false, inBox(0), NOW), { box: 0, dueAt: NOW });
});

test('isValidRecord accepts real records and rejects corrupted ones', () => {
  assert.equal(isValidRecord(newRecord()), true);
  assert.equal(isValidRecord(inBox(1)), true);

  assert.equal(isValidRecord(null), false);
  assert.equal(isValidRecord({ ...inBox(1), dueAt: 'soon' }), false);
  assert.equal(isValidRecord({ ...inBox(1), dueAt: Number.NaN }), false);
  assert.equal(isValidRecord({ ...inBox(1), box: 1.5 }), false);
  assert.equal(isValidRecord({ ...inBox(3), box: BOX_COUNT }), false, 'box is out of range');
  assert.equal(isValidRecord({ ...inBox(3), box: -1 }), false);
  assert.equal(isValidRecord({ box: 1 }), false, 'dueAt is required');
  assert.equal(isValidRecord({ interval: 3, ease: 2.5, dueAt: 0, lapses: 0, step: null }), false,
    'an old SM-2 record is not silently reused');
});
