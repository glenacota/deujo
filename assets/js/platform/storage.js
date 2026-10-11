// platform/storage.js

import { CONFIG } from '../config.js';

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode, quota): the app works but won't remember progress.
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage unavailable: nothing to remove.
  }
}

// Progress keys like `dm_belt_progress_<kataId>` can only be found by scanning.
function safeRemoveByPrefix(prefix) {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    keys.forEach(safeRemove);
  } catch {
    // Storage unavailable - nothing to clear.
  }
}

export const Storage = {
  getNumber(key, fallback = 0) {
    // parseFloat, not parseInt: belt points are fractional (a skip costs half).
    const parsed = parseFloat(safeGet(key));
    return Number.isNaN(parsed) ? fallback : parsed;
  },

  setNumber(key, value) {
    safeSet(key, String(value));
  },

  getBoolean(key, fallback = false) {
    const value = safeGet(key);
    if (value === null) return fallback;
    return value === 'true';
  },

  setBoolean(key, value) {
    safeSet(key, String(Boolean(value)));
  },

  getString(key, fallback = '') {
    return safeGet(key) ?? fallback;
  },

  setString(key, value) {
    safeSet(key, value);
  },

  getJSON(key, fallback = null) {
    const raw = safeGet(key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  },

  setJSON(key, value) {
    safeSet(key, JSON.stringify(value));
  },

  remove(key) {
    safeRemove(key);
  },


  removeByPrefix(prefix) {
    safeRemoveByPrefix(prefix);
  },

  getTheme() {
    return safeGet(CONFIG.storage.theme);
  },

  setTheme(value) {
    if (value === 'system') {
      safeRemove(CONFIG.storage.theme);
      return;
    }
    safeSet(CONFIG.storage.theme, value);
  },
};
