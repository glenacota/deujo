// services/storage.js
// Thin wrapper around localStorage

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
    // Storage unavailable (private mode, quota, etc). Silently no-op -
    // the app still works, it just won't remember progress this session.
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Same as safeSet: nothing to do if storage is unavailable.
  }
}

/**
 * Removes every key starting with `prefix`. Progress keys are namespaced this
 * way (`dm_belt_progress_<kataId>`), so a prefix scan is the only way to find
 * them all - `removeItem` on the prefix alone would leave them behind.
 */
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
    const parsed = parseInt(safeGet(key), 10);
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

  /** Wipes all app-owned keys, including prefixed ones like `dm_belt_progress_<id>`. */
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
