// belt-rules.js
// The belt arithmetic, with no state and no storage.
//
// This used to be private methods on GameState, which meant asking "does a
// promotion restart the bar one fifth of the way in?" needed a localStorage
// stub installed before the import. The rules are pure, so they live here
// instead, and this module reaches nothing that touches a host global -- a
// test can import it directly, the way `session.js` can.

import { CONFIG } from './config.js';

const { maxBelt, milestoneInterval: INTERVAL } = CONFIG.rules;

/**
 * The furthest progress a kata can hold: the last belt, plus one full interval
 * past it, so the final belt can still show a full bar rather than an empty one.
 */
export const MAX_PROGRESS = maxBelt * (INTERVAL + 1);

/** Keeps a value inside 0..MAX_PROGRESS, and treats a non-number as 0. */
export function clampProgress(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(value, 0), MAX_PROGRESS);
}

/**
 * Moves progress by `points`, which may be negative to cost progress.
 *
 * Points are fractional, so the result is rounded to two decimals before it is
 * clamped: repeated halves and fifths would otherwise drift into values like
 * 4.700000000000001, which is what would then be written to storage and read
 * back on the next boot.
 */
export function addPoints(progress, points) {
    return clampProgress(Math.round((progress + points) * 100) / 100);
}

/**
 * Which belt a progress value sits in, capped so the last belt is a ceiling
 * rather than a value progress can climb past.
 */
export function beltAt(progress) {
    return Math.min(Math.floor(progress / INTERVAL), maxBelt);
}

/**
 * Restarts a belt from `credit` points in, so it never opens empty.
 *
 * Whatever overflow the crossing answer carried is dropped: a promotion lands
 * one fifth of the way up and a demotion four fifths, so a belt has to be
 * defended and not merely climbed.
 */
export function creditOnChange(belt, credit) {
    return belt * INTERVAL + Math.min(credit, INTERVAL);
}

/**
 * Points earned inside the current belt, so a tick bar can show an exact count
 * instead of a rounded percentage. Rounded, because subtracting belt boundaries
 * from a fifth- or half-point value leaves float dust like 0.20000000000000018.
 */
export function pointsEarnedInBelt(progress) {
    const belt = beltAt(progress);
    if (belt >= maxBelt) return INTERVAL;
    return Math.round((progress - belt * INTERVAL) * 100) / 100;
}
