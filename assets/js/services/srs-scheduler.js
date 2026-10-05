// services/srs-scheduler.js
// Three-stage Leitner boxes: Learning, Review, Mastered. An item moves up one
// box per correct answer and falls back to the first box on a mistake. Wrong
// answers come back soon, right answers earn more breathing room.
//
// The ladder lives in CONFIG.srs, beside the belt points it shares a reward
// schedule with. Still pure: `now` is injected, so no clock and no random.

import { CONFIG } from '../config.js';

const { boxes, delaysDays, dayMs } = CONFIG.srs;

export const BOX_COUNT = boxes;
export const DAY_MS = dayMs;

export function newRecord() {
  return { box: 0, dueAt: 0 };
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Guards against corrupted/hand-edited localStorage. */
export function isValidRecord(r) {
  return Boolean(r) && typeof r === 'object' &&
    Number.isInteger(r.box) && r.box >= 0 && r.box < BOX_COUNT &&
    isNum(r.dueAt);
}

/** @returns a NEW record; never mutates the input. */
export function schedule(correct, record, now = Date.now()) {
  const box = correct
    ? Math.min((record?.box ?? 0) + 1, BOX_COUNT - 1)
    : 0;
  return { box, dueAt: now + delaysDays[box] * DAY_MS };
}
