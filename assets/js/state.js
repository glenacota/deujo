// state/game-state.js
// All mutable app state lives here, plus the pure rules for how it changes

import { CONFIG } from './config.js';
import { Storage } from './services/storage.js';
import { SrsStore } from './services/srs-store.js';
import { newRecord, schedule, weight } from './services/srs-scheduler.js';

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

  getBeltProgressPct(kataId) {
    if (this.getCurrentBelt(kataId) >= CONFIG.rules.maxBelt) return 100;
    return ((this.beltProgress[kataId] % CONFIG.rules.milestoneInterval) / CONFIG.rules.milestoneInterval) * 100;
  }

  /**
   * Weighted random draw: the lower an item's box, the more often it comes up.
   * The most recently served `recentExclude` ids are skipped whenever the
   * dataset is large enough to leave a choice
   */
  pickNext(dataset, kataId, rng = Math.random) {
    if (!dataset?.length) return null;

    const records = SrsStore.getKata(kataId);
    const recent = this.recent[kataId];
    const skip = dataset.length > CONFIG.rules.recentExclude ? new Set(recent) : null;

    const pool = skip ? dataset.filter((item) => !skip.has(item.id)) : dataset;
    const candidates = pool.length ? pool : dataset; // everything is recent: fall back

    // Walk the list once, subtracting each item's weight until the ticket runs out.
    const total = candidates.reduce((sum, item) => sum + weight(records[item.id]), 0);
    let ticket = rng() * total;
    let chosen = candidates[candidates.length - 1]; // guards against float drift
    for (const item of candidates) {
      ticket -= weight(records[item.id]);
      if (ticket < 0) { chosen = item; break; }
    }

    recent.push(chosen.id);
    if (recent.length > CONFIG.rules.recentExclude) recent.shift();
    return chosen;
  }

  /** Moves the item up a box on a correct answer, back to the first box on a mistake. */
  recordAnswer(kataId, itemId, correct) {
    const previous = SrsStore.get(kataId, itemId) ?? newRecord();
    SrsStore.set(kataId, itemId, schedule(correct, previous));
  }

  getDueCount(kataId) {
    return SrsStore.countDue(kataId);
  }
}