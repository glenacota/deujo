// services/srs-scheduler.js
// Three-stage Leitner boxes: Learning, Review, Mastered. An item moves up one
// box per correct answer and falls back to the first box on a mistake. Wrong
// answers come back soon, right answers earn more breathing room.

export const BOX_COUNT = 3;
export const DAY_MS = 86_400_000;

// How long an item waits after a correct answer before it counts as due again.
const BOX_DELAY_DAYS = [0, 2, 9];

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
  return { box, dueAt: now + BOX_DELAY_DAYS[box] * DAY_MS };
}
