// tests/unit/belt-rules.test.js
// The belt arithmetic on its own: how points move, which belt a value sits in,
// and where a crossing answer lands.
//
// This module imports no browser stub and calls no `bootstrap`. That is the
// point of the extraction: these rules used to be private methods on GameState,
// so pinning "a demotion lands four fifths of the way up" meant standing up a
// fake localStorage first. Now it is a plain import, like `session.test.js`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    MAX_PROGRESS,
    addPoints,
    beltAt,
    clampProgress,
    creditOnChange,
    pointsEarnedInBelt,
} from '../../assets/js/belt-rules.js';

const INTERVAL = 5;
const MAX_BELT = 6;

test('the furthest progress is the last belt plus a full interval past it', () => {
    assert.equal(MAX_PROGRESS, MAX_BELT * (INTERVAL + 1));
});

test('clampProgress holds a value inside 0..MAX_PROGRESS', () => {
    assert.equal(clampProgress(0), 0);
    assert.equal(clampProgress(MAX_PROGRESS), MAX_PROGRESS);
    assert.equal(clampProgress(3.5), 3.5, 'a value in range is untouched');
    assert.equal(clampProgress(-1), 0);
    assert.equal(clampProgress(MAX_PROGRESS + 50), MAX_PROGRESS);
});

test('clampProgress reads a non-number as no progress at all', () => {
    // What a hand-edited or truncated storage value decodes to. Treating it as
    // NaN here would poison every later sum with NaN.
    for (const junk of [Number.NaN, undefined, null, 'twelve', {}, []]) {
        assert.equal(clampProgress(junk), 0, `${String(junk)} should not be progress`);
    }
});

test('addPoints adds and costs, and never leaves the range', () => {
    assert.equal(addPoints(2, 1), 3);
    assert.equal(addPoints(2, -1), 1);
    assert.equal(addPoints(0, -5), 0, 'progress cannot go negative');
    assert.equal(addPoints(MAX_PROGRESS, 1), MAX_PROGRESS, 'progress cannot exceed the ceiling');
});

test('addPoints keeps halves and fifths exact', () => {
    // The reason for the rounding: 4.2 + 0.5 is 4.700000000000001 in binary
    // floating point, and that exact value would be what got persisted.
    assert.equal(addPoints(4.2, 0.5), 4.7);
    assert.equal(addPoints(0, 0.5), 0.5);
    assert.equal(addPoints(0.5, 0.5), 1);
    assert.equal(addPoints(1.2, 1.2), 2.4);
});

test('a run of skip-sized penalties stays exact and floors at zero', () => {
    // What a learner skipping repeatedly would have stored. Without the
    // two-decimal rounding these steps drift off the halves.
    let progress = 4;
    const steps = [];
    for (let i = 0; i < 8; i++) {
        progress = addPoints(progress, -0.5);
        steps.push(progress);
    }
    assert.deepEqual(steps, [3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0]);

    let floored = 0;
    for (let i = 0; i < 10; i++) floored = addPoints(floored, -0.5);
    assert.equal(floored, 0, 'progress cannot be pushed below the floor');
});

test('beltAt maps a boundary value to the belt it has entered', () => {
    assert.equal(beltAt(0), 0);
    assert.equal(beltAt(4.99), 0, 'a hair short of five is still White');
    assert.equal(beltAt(5), 1, 'exactly five has entered the next belt');
    assert.equal(beltAt(9.99), 1);
    assert.equal(beltAt(MAX_BELT * INTERVAL), MAX_BELT);
});

test('beltAt is a ceiling, not a value progress can climb past', () => {
    // Progress can reach MAX_PROGRESS, which is past the last belt's start.
    assert.equal(beltAt(MAX_PROGRESS), MAX_BELT);
    assert.equal(beltAt(MAX_PROGRESS * 10), MAX_BELT);
});

test('a promotion lands one fifth of the way into the new belt', () => {
    const crossed = beltAt(5);            // Yellow, having just been promoted
    const progress = creditOnChange(crossed, 1);

    assert.equal(progress, 6);
    assert.equal(pointsEarnedInBelt(progress), 1);
    assert.equal(pointsEarnedInBelt(progress) / INTERVAL, 0.2, 'one whole point, one tick, 20%');
});

test('a demotion lands four fifths of the way into the belt below', () => {
    const crossed = beltAt(4);            // dropped back to White
    const progress = creditOnChange(crossed, 4);

    assert.equal(progress, 4);
    assert.equal(pointsEarnedInBelt(progress), 4);
    assert.equal(pointsEarnedInBelt(progress) / INTERVAL, 0.8);
});

test('a crossing is measured from the belt boundary, not from where progress landed', () => {
    // The function only receives the belt, so whatever overflow the crossing
    // answer carried is structurally dropped: entering Green always opens the
    // same fifth of the way up, however far past the boundary the points went.
    assert.equal(creditOnChange(2, 1), 11, 'promotion: one point into Green');
    assert.equal(creditOnChange(2, 4), 14, 'demotion: four points into Green');
});

test('a credit larger than one interval is capped at one', () => {
    assert.equal(creditOnChange(2, 99), 15, 'belt start plus one interval, never more');
    assert.equal(creditOnChange(2, 6), 15, 'six points would overflow the belt, so it is cut');
    // Pinned because it is a real edge: a credit of exactly one interval lands
    // on the *next* boundary, so the belt it belongs to reads as empty rather
    // than full. Unreachable with the shipped credits (1 and 4), but if someone
    // ever tunes a credit up to the interval this is what they get.
    assert.equal(pointsEarnedInBelt(creditOnChange(2, 5)), 0);
});

test('pointsEarnedInBelt leaves no float dust behind', () => {
    // 25.2 - 25 is 0.20000000000000018 in binary floating point. A tick bar
    // showing that would be visibly wrong.
    assert.equal(pointsEarnedInBelt(25.2), 0.2);
    assert.equal(pointsEarnedInBelt(14.5), 4.5);
    assert.equal(pointsEarnedInBelt(0.5), 0.5);
    assert.equal(pointsEarnedInBelt(0), 0);
});

test('pointsEarnedInBelt reports a full bar once the last belt is reached', () => {
    // Black belt has nothing above it to fill, so the bar reads full rather
    // than showing more than one interval of points.
    assert.equal(pointsEarnedInBelt(MAX_BELT * INTERVAL), INTERVAL);
    assert.equal(pointsEarnedInBelt(MAX_PROGRESS), INTERVAL);
});

test('five correct answers climb exactly one belt', () => {
    // The number the e2e promotion test relies on.
    let progress = 0;
    for (let i = 0; i < INTERVAL; i++) progress = addPoints(progress, 1);
    assert.equal(beltAt(progress), 1, 'five points is one belt, no more');
    assert.equal(progress, 5);
});

test('a belt is defended, not merely climbed: one mistake back down four fifths', () => {
    let progress = 0;
    for (let i = 0; i < INTERVAL; i++) progress = addPoints(progress, 1);
    const before = beltAt(progress);

    progress = creditOnChange(beltAt(addPoints(progress, -1)), 4);

    assert.equal(beltAt(progress), before - 1, 'a mistake at a boundary drops a belt');
    assert.equal(pointsEarnedInBelt(progress), 4);
});
