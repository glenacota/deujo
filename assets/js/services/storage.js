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

  getTheme() {
    return safeGet(CONFIG.storage.theme);
  },

  setTheme(value) {
    safeSet(CONFIG.storage.theme, value);
  },
};
