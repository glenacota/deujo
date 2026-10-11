// state.js

import { CONFIG } from './config.js';
import { addPoints, beltAt, clampProgress, creditOnChange, pointsEarnedInBelt } from './belt-rules.js';
import { Storage } from './platform/storage.js';
import { SrsStore } from './platform/srs-store.js';
import { newRecord, schedule } from './services/srs-scheduler.js';

export class GameState {
  /** Across every kata; any mistake resets it. */
  streak = 0;
  maxStreak = 0;
  beltProgress = {};  // per kata: fractional mastery points, unaffected by the global streak
  activeKata = '';
  #current = new Map();   // kata id -> current item
  recent = {};    // kata id -> ids served most recently (session only)

  constructor(kataIds = []) {
    kataIds.forEach((id) => {
      this.#current.set(id, null);
      this.recent[id] = [];
      this.beltProgress[id] = clampProgress(Storage.getNumber(this.#beltKey(id)));
    });

    this.#loadStreak(kataIds);

    this.activeKata = kataIds[0] ?? '';
    const storedKata = Storage.getString(CONFIG.storage.kata, this.activeKata);
    if (kataIds.includes(storedKata)) this.activeKata = storedKata;
  }

  #beltKey(kataId) { return `${CONFIG.storage.belt}_${kataId}`; }

  /** One-time migration of the old per-kata counters: best live run becomes the streak, best record the max. */
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
    if (!this.#current.has(kata)) return;
    this.activeKata = kata;
    Storage.setString(CONFIG.storage.kata, kata);
  }

  currentItem(kataId) { return this.#current.get(kataId) ?? null; }

  setCurrentItem(kataId, item) {
    if (this.#current.has(kataId)) this.#current.set(kataId, item ?? null);
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

  /** Both crossing directions are reported, not assumed, so a rule change cannot skip a credit. */
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

  /** Not graded: SRS is left alone and the streak survives, since a skip is not a wrong answer. */
  applySkip(kataId) {
    const { demoted } = this.#applyOutcome(kataId, CONFIG.rules.skipPoints);
    this.#persist(kataId);
    return demoted;
  }

  getCurrentBelt(kataId) {
    return beltAt(this.beltProgress[kataId]);
  }

  /** Fractional, so the tick bar shows an exact count rather than a rounded percentage. */
  getBeltPointsEarned(kataId) {
    return pointsEarnedInBelt(this.beltProgress[kataId]);
  }

  /**
   * Uniform draw from due items (new items are always due), else from the full pool.
   * The last `recentExclude` served ids are skipped when the dataset is larger than that.
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
