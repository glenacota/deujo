// tests/unit/srs-scheduler.test.js
// Pure box rules. `now` is injected, so no clock or Math.random stubbing.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BOX_COUNT, DAY_MS, newRecord, isValidRecord, schedule, weight,
} from '../../assets/js/services/srs-scheduler.js';

const NOW = 1_700_000_000_000;
const inBox = (box) => ({ box, dueAt: NOW });

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
  assert.equal(schedule(true, inBox(3), NOW).box, 4);
});

test('a correct answer makes the item due later the higher the box', () => {
  const low = schedule(true, inBox(0), NOW);
  const high = schedule(true, inBox(4), NOW);
  assert.equal(low.dueAt, NOW + DAY_MS);
  assert.ok(high.dueAt > low.dueAt, 'a higher box waits longer');
});

test('Leitner box delays are 0, 1, 3, 7, 16, and 30 days', () => {
  const dueAt = [
    schedule(false, inBox(0), NOW).dueAt,
    ...Array.from({ length: BOX_COUNT - 1 }, (_, box) => schedule(true, inBox(box), NOW).dueAt),
  ];

  assert.deepEqual(dueAt, [0, 1, 3, 7, 16, 30].map((days) => NOW + days * DAY_MS));
});

test('the last box is the ceiling', () => {
  const top = schedule(true, inBox(BOX_COUNT - 1), NOW);
  assert.equal(top.box, BOX_COUNT - 1);
  assert.equal(schedule(true, top, NOW).box, BOX_COUNT - 1, 'it cannot climb higher');
});

test('a mistake drops the item to the first box and makes it due immediately', () => {
  assert.deepEqual(schedule(false, inBox(4), NOW), { box: 0, dueAt: NOW });
  assert.deepEqual(schedule(false, inBox(0), NOW), { box: 0, dueAt: NOW });
});

test('weight favours low boxes, and an unseen item outranks every box', () => {
  assert.equal(weight(null), BOX_COUNT, 'an unseen item is treated as box 0');
  assert.equal(weight(newRecord()), BOX_COUNT);
  assert.equal(weight(inBox(BOX_COUNT - 1)), 1, 'the top box still comes up, just rarely');
  for (let box = 1; box < BOX_COUNT; box++) {
    assert.ok(weight(inBox(box)) < weight(inBox(box - 1)), `box ${box} is not rarer than ${box - 1}`);
  }
});

test('isValidRecord accepts real records and rejects corrupted ones', () => {
  assert.equal(isValidRecord(newRecord()), true);
  assert.equal(isValidRecord(inBox(3)), true);

  assert.equal(isValidRecord(null), false);
  assert.equal(isValidRecord({ ...inBox(3), dueAt: 'soon' }), false);
  assert.equal(isValidRecord({ ...inBox(3), dueAt: Number.NaN }), false);
  assert.equal(isValidRecord({ ...inBox(3), box: 1.5 }), false);
  assert.equal(isValidRecord({ ...inBox(3), box: BOX_COUNT }), false, 'box is out of range');
  assert.equal(isValidRecord({ ...inBox(3), box: -1 }), false);
  assert.equal(isValidRecord({ box: 1 }), false, 'dueAt is required');
  assert.equal(isValidRecord({ interval: 3, ease: 2.5, dueAt: 0, lapses: 0, step: null }), false,
    'an old SM-2 record is not silently reused');
});
