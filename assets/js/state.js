// state/game-state.js
// All mutable app state lives here, plus the pure rules for how it changes

import { CONFIG } from './config.js';
import { Storage } from './services/storage.js';

export class GameState {
  streak;
  maxStreak;
  beltProgress = {};
  activeTab = '';
  current = {};   // kata id -> current item
  history = {};   // kata id -> recently seen words

  constructor(kataIds = []) {
    this.streak = Storage.getNumber(CONFIG.storage.streak);
    this.maxStreak = Storage.getNumber(CONFIG.storage.maxStreak);

    kataIds.forEach((id) => {
      this.current[id] = null;
      this.history[id] = [];
      this.beltProgress[id] = Storage.getNumber(this.#beltKey(id));
    });

    this.activeTab = kataIds[0] ?? '';
    const storedTab = Storage.getString(CONFIG.storage.tab, this.activeTab);
    if (kataIds.includes(storedTab)) this.activeTab = storedTab;
  }

  #beltKey(kataId) {
    return `${CONFIG.storage.belt}_${kataId}`;
  }

  setActiveTab(tab) {
    if (!(tab in this.history)) return;
    this.activeTab = tab;
    Storage.setString(CONFIG.storage.tab, tab);
  }

  #persist(kataId) {
    Storage.setNumber(CONFIG.storage.streak, this.streak);
    Storage.setNumber(CONFIG.storage.maxStreak, this.maxStreak);
    Storage.setNumber(this.#beltKey(kataId), this.beltProgress[kataId]);
  }

  /** @returns {boolean} true if this answer completed a milestone (belt promotion) */
  incrementStreak(kataId) {
    this.streak++;
    this.maxStreak = Math.max(this.maxStreak, this.streak);
    this.beltProgress[kataId]++;
    this.#persist(kataId);
    return this.beltProgress[kataId] % CONFIG.rules.milestoneInterval === 0;
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
    return ((this.beltProgress[kataId] % CONFIG.rules.milestoneInterval) / CONFIG.rules.milestoneInterval) * 100;
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
