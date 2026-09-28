// state/game-state.js
// All mutable app state lives here, plus the pure rules for how it changes

import { CONFIG } from './config.js';
import { Storage } from './services/storage.js';
import { SrsStore } from './services/srs-store.js';
import { GRADES, newRecord, schedule } from './services/srs-scheduler.js';

export class GameState {
  streakByKata = {};
  maxStreakByKata = {};
  beltProgress = {};
  activeKata = '';
  current = {};   // kata id -> current item
  recent = {};    // kata id -> ids served most recently (session only)

  constructor(kataIds = []) {
    kataIds.forEach((id) => {
      this.current[id] = null;
      this.recent[id] = [];
      this.beltProgress[id] = Storage.getNumber(this.#beltKey(id));
      this.streakByKata[id] = Storage.getNumber(this.#streakKey(id));
      this.maxStreakByKata[id] = Storage.getNumber(this.#maxStreakKey(id));
    });

    this.activeKata = kataIds[0] ?? '';
    const storedKata = Storage.getString(CONFIG.storage.kata, this.activeKata);
    if (kataIds.includes(storedKata)) this.activeKata = storedKata;
  }

  #beltKey(kataId) { return `${CONFIG.storage.belt}_${kataId}`; }
  #streakKey(kataId) { return `${CONFIG.storage.streak}_${kataId}`; }
  #maxStreakKey(kataId) { return `${CONFIG.storage.maxStreak}_${kataId}`; }

  setActiveKata(kata) {
    if (!(kata in this.current)) return;
    this.activeKata = kata;
    Storage.setString(CONFIG.storage.kata, kata);
  }

  setFocusModeActive(isActive) { Storage.setBoolean(CONFIG.storage.focusMode, isActive); }
  wasFocusModeActive() { return Storage.getBoolean(CONFIG.storage.focusMode); }

  #persist(kataId) {
    Storage.setNumber(this.#streakKey(kataId), this.streakByKata[kataId]);
    Storage.setNumber(this.#maxStreakKey(kataId), this.maxStreakByKata[kataId]);
    Storage.setNumber(this.#beltKey(kataId), this.beltProgress[kataId]);
  }

  /** @returns {boolean} true if this answer completed a milestone (belt promotion) */
  incrementStreak(kataId) {
    const previousBelt = this.getCurrentBelt(kataId);
    this.streakByKata[kataId]++;
    this.maxStreakByKata[kataId] = Math.max(this.maxStreakByKata[kataId], this.streakByKata[kataId]);
    const maxProgress = CONFIG.rules.maxBelt * (CONFIG.rules.milestoneInterval + 1);
    this.beltProgress[kataId] = Math.min(this.beltProgress[kataId] + 1, maxProgress);
    this.#persist(kataId);
    return this.getCurrentBelt(kataId) > previousBelt;
  }

  /** @returns {boolean} true if this mistake dropped the player into a lower belt */
  resetStreak(kataId) {
    const prevBelt = this.getCurrentBelt(kataId);
    this.streakByKata[kataId] = 0;
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

  // ---- Spaced repetition -------------------------------------------------

  /**
   * Priority: (1) most overdue item, (2) first unseen item in dataset order,
   * (3) soonest-due item (practice ahead). Single O(n) pass.
   */
  pickNext(dataset, kataId) {
    if (!dataset?.length) return null;

    const now = Date.now();
    const records = SrsStore.getKata(kataId);
    const recent = this.recent[kataId];
    const skip = dataset.length > CONFIG.rules.recentExclude ? new Set(recent) : null;

    let due = null, dueAt = Infinity;
    let fresh = null;
    let upcoming = null, upcomingAt = Infinity;

    for (const item of dataset) {
      if (skip?.has(item.id)) continue;
      const rec = records[item.id];
      if (!rec) { fresh ??= item; continue; }
      if (rec.dueAt <= now) {
        if (rec.dueAt < dueAt) { due = item; dueAt = rec.dueAt; }
      } else if (rec.dueAt < upcomingAt) {
        upcoming = item; upcomingAt = rec.dueAt;
      }
    }

    const chosen = due ?? fresh ?? upcoming ?? dataset[0];
    recent.push(chosen.id);
    if (recent.length > CONFIG.rules.recentExclude) recent.shift();
    return chosen;
  }

  /** Records correct=Good / wrong=Again. Returns a ticket so the UI can re-grade it. */
  recordAnswer(kataId, itemId, correct) {
    const previous = SrsStore.get(kataId, itemId) ?? newRecord();
    SrsStore.set(kataId, itemId, schedule(correct ? GRADES.GOOD : GRADES.AGAIN, previous));
  }

  getDueCount(kataId) {
    return SrsStore.countDue(kataId);
  }
}