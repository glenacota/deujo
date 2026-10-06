// state/game-state.js
// All mutable app state lives here, plus the pure rules for how it changes

import { CONFIG } from './config.js';
import { addPoints, beltAt, clampProgress, creditOnChange, pointsEarnedInBelt } from './belt-rules.js';
import { Storage } from './platform/storage.js';
import { SrsStore } from './platform/srs-store.js';
import { newRecord, schedule } from './services/srs-scheduler.js';

export class GameState {
  /** Correct answers in a row, across every kata. Any mistake resets it. */
  streak = 0;
  /** The longest streak ever run, across all katas and all sessions. */
  maxStreak = 0;
  beltProgress = {};  // per kata: fractional mastery points, unaffected by the global streak
  activeKata = '';
  current = {};   // kata id -> current item
  recent = {};    // kata id -> ids served most recently (session only)

  constructor(kataIds = []) {
    kataIds.forEach((id) => {
      this.current[id] = null;
      this.recent[id] = [];
      this.beltProgress[id] = clampProgress(Storage.getNumber(this.#beltKey(id)));
    });

    this.#loadStreak(kataIds);

    this.activeKata = kataIds[0] ?? '';
    const storedKata = Storage.getString(CONFIG.storage.kata, this.activeKata);
    if (kataIds.includes(storedKata)) this.activeKata = storedKata;
  }

  #beltKey(kataId) { return `${CONFIG.storage.belt}_${kataId}`; }

  /**
   * The streak counts correct answers across every kata, so it no longer hangs
   * off a kata id. One migration folds the per-kata counters written before
   * this change into a single pair: the best live run becomes the streak and
   * the best record becomes the max, so returning players keep their history.
   */
  #loadStreak(kataIds) {
    if (Storage.getString(CONFIG.storage.streakMigration)) {
      this.streak = Storage.getNumber(CONFIG.storage.streak);
      this.maxStreak = Storage.getNumber(CONFIG.storage.maxStreak);
      return;
    }

    const legacyStreak = (baseKey) => Math.max(0, ...kataIds.map((id) => Storage.getNumber(`${baseKey}_${id}`)));
    this.streak = legacyStreak(CONFIG.storage.streak);
    this.maxStreak = Math.max(this.streak, legacyStreak(CONFIG.storage.maxStreak));
    this.#persistStreak();
    Storage.setString(CONFIG.storage.streakMigration, '1');
  }

  setActiveKata(kata) {
    if (!Object.hasOwn(this.current, kata)) return;
    this.activeKata = kata;
    Storage.setString(CONFIG.storage.kata, kata);
  }

  setFocusModeActive(isActive) { Storage.setBoolean(CONFIG.storage.focusMode, isActive); }
  wasFocusModeActive() { return Storage.getBoolean(CONFIG.storage.focusMode); }

  #persistStreak() {
    Storage.setNumber(CONFIG.storage.streak, this.streak);
    Storage.setNumber(CONFIG.storage.maxStreak, this.maxStreak);
  }

  #persist(kataId) {
    this.#persistStreak();
    Storage.setNumber(this.#beltKey(kataId), this.beltProgress[kataId]);
  }

  /**
   * Moves one kata's progress by `points` and reports which way, if either, it
   * crossed a belt boundary.
   *
   * The three outcomes differ only in their points and in whether they also
   * touch the streak, so the crossing test lives here once. Only one direction
   * is reachable per outcome in practice -- points are signed and `beltAt`
   * never falls as progress grows -- but both are reported rather than assumed,
   * so a future rule change cannot quietly skip a credit that a crossing earns.
   */
  #applyOutcome(kataId, points) {
    const before = beltAt(this.beltProgress[kataId]);
    const moved = addPoints(this.beltProgress[kataId], points);
    const after = beltAt(moved);
    const promoted = after > before;
    const demoted = after < before;

    this.beltProgress[kataId] = promoted
      ? creditOnChange(after, CONFIG.rules.promotionCredit)
      : demoted
        ? creditOnChange(after, CONFIG.rules.demotionCredit)
        : moved;

    return { promoted, demoted };
  }

  incrementStreak(kataId) {
    this.streak++;
    this.maxStreak = Math.max(this.maxStreak, this.streak);
    const { promoted } = this.#applyOutcome(kataId, CONFIG.rules.correctPoints);
    this.#persist(kataId);
    return promoted;
  }

  resetStreak(kataId) {
    this.streak = 0;
    const { demoted } = this.#applyOutcome(kataId, CONFIG.rules.wrongPoints);
    this.#persist(kataId);
    return demoted;
  }

  /**
   * A skipped exercise costs half a point, and the SRS schedule is left alone:
   * the item was never graded. The streak survives, because the streak counts
   * answers and a skipped item is not a wrong one.
   */
  applySkip(kataId) {
    const { demoted } = this.#applyOutcome(kataId, CONFIG.rules.skipPoints);
    this.#persist(kataId);
    return demoted;
  }

  getCurrentBelt(kataId) {
    return beltAt(this.beltProgress[kataId]);
  }

  /**
   * Points earned inside the current belt, so the tick bar can show an exact
   * count instead of a rounded percentage. Fractional: a skip leaves half a
   * point and a fresh belt starts with a fifth.
   */
  getBeltPointsEarned(kataId) {
    return pointsEarnedInBelt(this.beltProgress[kataId]);
  }

  /**
   * Uniform random draw from due items. New items are always due; if none of
   * the available items are due, draw from the full pool.
   * The most recently served `recentExclude` ids are skipped when possible.
   */
  pickNext(dataset, kataId, rng = Math.random, now = Date.now()) {
    if (!dataset?.length) return null;

    const records = SrsStore.getKata(kataId);
    const recent = this.recent[kataId];
    const skip = dataset.length > CONFIG.rules.recentExclude ? new Set(recent) : null;

    const pool = skip ? dataset.filter((item) => !skip.has(item.id)) : dataset;
    const due = pool.filter((item) => {
      const record = records[item.id];
      return !record || record.dueAt <= now;
    });
    const candidates = due.length ? due : pool;

    const chosen = candidates[Math.floor(rng() * candidates.length)];

    recent.push(chosen.id);
    if (recent.length > CONFIG.rules.recentExclude) recent.shift();
    return chosen;
  }

  recordAnswer(kataId, itemId, correct) {
    const previous = SrsStore.get(kataId, itemId) ?? newRecord();
    SrsStore.set(kataId, itemId, schedule(correct, previous));
  }
}
