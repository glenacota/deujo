// state/game-state.js
// All mutable app state lives here, plus the pure rules for how it changes

import { CONFIG } from './config.js';
import { Storage } from './services/storage.js';
import { SrsStore } from './services/srs-store.js';
import { newRecord, schedule } from './services/srs-scheduler.js';

export class GameState {
  /** Correct answers in a row, across every kata. Any mistake resets it. */
  streak = 0;
  /** The longest streak ever run, across all katas and all sessions. */
  maxStreak = 0;
  beltProgress = {};  // per kata: mastery points, unaffected by the global streak
  activeKata = '';
  current = {};   // kata id -> current item
  recent = {};    // kata id -> ids served most recently (session only)

  constructor(kataIds = []) {
    kataIds.forEach((id) => {
      this.current[id] = null;
      this.recent[id] = [];
      this.beltProgress[id] = Storage.getNumber(this.#beltKey(id));
    });

    this.#loadStreak(kataIds);

    this.activeKata = kataIds[0] ?? '';
    const storedKata = Storage.getString(CONFIG.storage.kata, this.activeKata);
    if (kataIds.includes(storedKata)) this.activeKata = storedKata;
  }

  #beltKey(kataId) { return `${CONFIG.storage.belt}_${kataId}`; }
  #streakKey(kataId) { return `${CONFIG.storage.streak}_${kataId}`; }
  #maxStreakKey(kataId) { return `${CONFIG.storage.maxStreak}_${kataId}`; }

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

    this.streak = Math.max(0, ...kataIds.map((id) => Storage.getNumber(this.#streakKey(id))));
    this.maxStreak = Math.max(this.streak, ...kataIds.map((id) => Storage.getNumber(this.#maxStreakKey(id))));
    this.#persistStreak();
    Storage.setString(CONFIG.storage.streakMigration, '1');
  }

  setActiveKata(kata) {
    if (!(kata in this.current)) return;
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

  /** @returns {boolean} true if this answer completed a milestone (belt promotion) */
  incrementStreak(kataId) {
    const previousBelt = this.getCurrentBelt(kataId);
    this.streak++;
    this.maxStreak = Math.max(this.maxStreak, this.streak);
    const maxProgress = CONFIG.rules.maxBelt * (CONFIG.rules.milestoneInterval + 1);
    this.beltProgress[kataId] = Math.min(this.beltProgress[kataId] + 1, maxProgress);
    this.#persist(kataId);
    return this.getCurrentBelt(kataId) > previousBelt;
  }

  /** @returns {boolean} true if this mistake dropped the player into a lower belt */
  resetStreak(kataId) {
    const prevBelt = this.getCurrentBelt(kataId);
    this.streak = 0;
    this.beltProgress[kataId] = Math.max(0, this.beltProgress[kataId] - 1);
    this.#persist(kataId);
    return this.getCurrentBelt(kataId) < prevBelt;
  }

  getCurrentBelt(kataId) {
    return Math.min(
      Math.floor(this.beltProgress[kataId] / CONFIG.rules.milestoneInterval),
      CONFIG.rules.maxBelt
    );
  }

  /**
   * Correct-answer points earned inside the current belt. Integer, so the tick
   * bar can show an exact count instead of a rounded percentage.
   * @returns {number} 0..milestoneInterval
   */
  getBeltPointsEarned(kataId) {
    const interval = CONFIG.rules.milestoneInterval;
    if (this.getCurrentBelt(kataId) >= CONFIG.rules.maxBelt) return interval;
    return this.beltProgress[kataId] % interval;
  }

  getBeltProgressPct(kataId) {
    return (this.getBeltPointsEarned(kataId) / CONFIG.rules.milestoneInterval) * 100;
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

  /** Moves the item up a box on a correct answer, back to the first box on a mistake. */
  recordAnswer(kataId, itemId, correct) {
    const previous = SrsStore.get(kataId, itemId) ?? newRecord();
    SrsStore.set(kataId, itemId, schedule(correct, previous));
  }
}