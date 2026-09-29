// services/srs-store.js
// In-memory review records ({ kataId: { itemId: record } }) with debounced persistence.
// Only items the user has answered are stored; "no record" == new item.

import { CONFIG } from '../config.js';
import { isValidRecord } from './srs-scheduler.js';
import { Storage } from './storage.js';

const SAVE_DELAY_MS = 500;
const EMPTY = Object.freeze(Object.create(null));

let data = null;
let saveTimer = null;

function load() {
  if (data) return data;
  data = Object.create(null); // null prototype: ids can never collide with Object.prototype
  const stored = Storage.getJSON(CONFIG.storage.srs, {});
  for (const [kataId, items] of Object.entries(stored ?? {})) {
    if (!items || typeof items !== 'object') continue;
    const clean = Object.create(null);
    for (const [id, rec] of Object.entries(items)) {
      if (isValidRecord(rec)) clean[id] = rec;
    }
    data[kataId] = clean;
  }
  return data;
}

function flush() {
  if (saveTimer === null) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  Storage.setJSON(CONFIG.storage.srs, data);
}

function scheduleSave() {
  if (saveTimer === null) saveTimer = setTimeout(flush, SAVE_DELAY_MS);
}

window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});

export const SrsStore = {
  reset() {
    data = null;
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  },

  get(kataId, itemId) {
    return load()[kataId]?.[itemId] ?? null;
  },

  /** Read-only map of itemId -> record for one kata. */
  getKata(kataId) {
    return load()[kataId] ?? EMPTY;
  },

  set(kataId, itemId, record) {
    const all = load();
    (all[kataId] ??= Object.create(null))[itemId] = record;
    scheduleSave();
  },

  countDue(kataId, now = Date.now()) {
    let n = 0;
    for (const rec of Object.values(load()[kataId] ?? EMPTY)) {
      if (rec.dueAt <= now) n++;
    }
    return n;
  },
};