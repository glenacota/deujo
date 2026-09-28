// services/srs-scheduler.js
// Pure SM-2-style scheduling. Timestamps are unix ms.
//
// Record: { interval (days), ease, dueAt, lapses, step }
//   step !== null -> learning/relearning (short steps, minutes)
//   step === null -> graduated (interval in days)
//   interval > 0 while step !== null means "relearning after a lapse"

export const GRADES = Object.freeze({ AGAIN: 'again', GOOD: 'good' });
export const DAY_MS = 86_400_000;

const GRADE_VALUES = Object.values(GRADES);
const LEARNING_STEPS_MS = [60_000, 600_000]; // 1 min, 10 min
const START_EASE = 2.5;
const MIN_EASE = 1.3;
const GRADUATING_DAYS = 1;
const LAPSE_MULT = 0.5;
const FUZZ_MIN_DAYS = 3;

export function newRecord() {
  return { interval: 0, ease: START_EASE, dueAt: 0, lapses: 0, step: 0 };
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Guards against corrupted/hand-edited localStorage. */
export function isValidRecord(r) {
  return Boolean(r) && typeof r === 'object' &&
    isNum(r.interval) && isNum(r.ease) && isNum(r.dueAt) && isNum(r.lapses) &&
    (r.step === null || (Number.isInteger(r.step) && r.step >= 0 && r.step < LEARNING_STEPS_MS.length));
}

/** @returns a NEW record; never mutates the input. `rng` is injectable for tests. */
export function schedule(grade, record, now = Date.now(), rng = Math.random) {
  if (!GRADE_VALUES.includes(grade)) throw new Error(`Unknown grade "${grade}"`);
  const r = { ...record };

  // Early practice: a correct answer on a not-yet-due graduated item must not inflate its interval.
  if (r.step === null && r.dueAt > now && grade !== GRADES.AGAIN) return r;

  return r.step === null ? review(grade, r, now, rng) : learn(grade, r, now);
}

function graduate(r, now, days) {
  r.step = null;
  r.interval = days;
  r.dueAt = now + days * DAY_MS;
  return r;
}

function learn(grade, r, now) {
  const relearning = r.interval > 0;
  if (grade === GRADES.AGAIN) {
    r.step = 0;
    r.dueAt = now + LEARNING_STEPS_MS[0];
    return r;
  }
  const next = r.step + 1;
  if (next >= LEARNING_STEPS_MS.length) {
    return graduate(r, now, relearning ? r.interval : GRADUATING_DAYS);
  }
  r.step = next;
  r.dueAt = now + LEARNING_STEPS_MS[next];
  return r;
}

function review(grade, r, now, rng) {
  if (grade === GRADES.AGAIN) {
    r.lapses += 1;
    r.ease = Math.max(MIN_EASE, r.ease - 0.2);
    r.interval = Math.max(1, Math.round(r.interval * LAPSE_MULT));
    r.step = 0;
    r.dueAt = now + LEARNING_STEPS_MS[0];
    return r;
  }

  // Only AGAIN and GOOD exist; schedule() rejects anything else before we get here.
  let next = r.interval * r.ease;

  if (next >= FUZZ_MIN_DAYS) next *= 0.95 + rng() * 0.1; // ±5% to avoid pile-ups
  r.interval = Math.max(r.interval + 1, Math.round(next)); // always make progress
  r.dueAt = now + r.interval * DAY_MS;
  return r;
}