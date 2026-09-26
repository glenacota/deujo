// state/game-state.js
// All mutable app state lives here, plus the pure rules for how it changes

import { CONFIG } from './config.js';
import { Storage } from './services/storage.js';

export class GameState {
  streakByKata = {};
  maxStreakByKata = {};
  beltProgress = {};
  activeKata = '';
  current = {};   // kata id -> current item
  history = {};   // kata id -> recently seen words

  constructor(kataIds = []) {
    kataIds.forEach((id) => {
      this.current[id] = null;
      this.history[id] = new Set();
      this.beltProgress[id] = Storage.getNumber(this.#beltKey(id));
      this.streakByKata[id] = Storage.getNumber(this.#streakKey(id));
      this.maxStreakByKata[id] = Storage.getNumber(this.#maxStreakKey(id));
    });

    this.activeKata = kataIds[0] ?? '';
    const storedKata = Storage.getString(CONFIG.storage.kata, this.activeKata);
    if (kataIds.includes(storedKata)) this.activeKata = storedKata;
  }

  #beltKey(kataId) {
    return `${CONFIG.storage.belt}_${kataId}`;
  }

  #streakKey(kataId) {
    return `${CONFIG.storage.streak}_${kataId}`;
  }

  #maxStreakKey(kataId) {
    return `${CONFIG.storage.maxStreak}_${kataId}`;
  }

  setActiveKata(kata) {
    if (!(kata in this.history)) return;
    this.activeKata = kata;
    Storage.setString(CONFIG.storage.kata, kata);
  }

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

  /** Picks a random item the player hasn't seen recently */
  pickNext(dataset, type) {
    if (!dataset?.length) return null;

    const history = this.history[type];
    let pool = dataset.filter((item) => !history.has(item.w));

    if (!pool.length) {
      const kept = Array.from(history).slice(-CONFIG.rules.historyRecycle);
      history.clear();
      kept.forEach((w) => history.add(w));
      pool = dataset.filter((item) => !history.has(item.w));
    }

    if (!pool.length) {
      history.clear();
      pool = dataset;
    }

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    history.add(chosen.w);

    if (history.size > CONFIG.rules.historyMax) {
      const oldest = history.values().next().value;
      history.delete(oldest);
    }

    return chosen;
  }
}
