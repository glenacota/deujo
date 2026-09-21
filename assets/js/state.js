// state/game-state.js
// All mutable app state lives here, plus the pure rules for how it changes

import { CONFIG } from './config.js';
import { Storage } from './services/storage.js';

export class GameState {
  streak;
  maxStreak;
  beltProgress;
  activeTab = '';
  current = {};   // kata id -> current item
  history = {};   // kata id -> recently seen words

  constructor(kataIds = []) {
    this.streak = Storage.getNumber(CONFIG.storage.streak);
    this.maxStreak = Storage.getNumber(CONFIG.storage.maxStreak);
    this.beltProgress = Storage.getNumber(CONFIG.storage.belt, this.streak);

    kataIds.forEach((id) => {
      this.current[id] = null;
      this.history[id] = [];
    });

    this.activeTab = kataIds[0] ?? '';
    const storedTab = Storage.getString(CONFIG.storage.tab, this.activeTab);
    if (kataIds.includes(storedTab)) this.activeTab = storedTab;
  }

  setActiveTab(tab) {
    if (!(tab in this.history)) return;
    this.activeTab = tab;
    Storage.setString(CONFIG.storage.tab, tab);
  }

  #persist() {
    Storage.setNumber(CONFIG.storage.streak, this.streak);
    Storage.setNumber(CONFIG.storage.maxStreak, this.maxStreak);
    Storage.setNumber(CONFIG.storage.belt, this.beltProgress);
  }

  /** @returns {boolean} true if this answer completed a milestone (belt promotion) */
  incrementStreak() {
    this.streak++;
    this.maxStreak = Math.max(this.maxStreak, this.streak);
    this.beltProgress++;
    this.#persist();
    return this.beltProgress % CONFIG.rules.milestoneInterval === 0;
  }

  /** @returns {boolean} true if this mistake dropped the player into a lower belt */
  resetStreak() {
    const prevBelt = this.getCurrentBelt();
    this.streak = 0;
    this.beltProgress = Math.max(0, this.beltProgress - 1);
    this.#persist();
    return this.getCurrentBelt() < prevBelt;
  }

  getCurrentBelt() {
    return Math.min(
      Math.floor(this.beltProgress / CONFIG.rules.milestoneInterval),
      CONFIG.rules.maxBelt
    );
  }

  getBeltProgressPct() {
    return ((this.beltProgress % CONFIG.rules.milestoneInterval) / CONFIG.rules.milestoneInterval) * 100;
  }

  /** Picks a random item the player hasn't seen recently */
  pickNext(dataset, type) {
    if (!dataset?.length) return null;
    let pool = dataset.filter((item) => !this.history[type].includes(item.w));
    if (!pool.length) {
      this.history[type] = this.history[type].slice(-CONFIG.rules.historyRecycle);
      pool = dataset.filter((item) => !this.history[type].includes(item.w));
    }
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    this.history[type].push(chosen.w);
    if (this.history[type].length > CONFIG.rules.historyMax) this.history[type].shift();
    return chosen;
  }
}
