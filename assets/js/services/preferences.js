// services/preferences.js
// Single owner of the user's settings: reads, defaults, and writes.
// UI modules (settings-view, keyboard-shortcut) never touch storage directly.

import { CONFIG } from '../config.js';
import { Storage } from './storage.js';

const KEYS = {
  theme: CONFIG.storage.theme,
  sound: CONFIG.storage.sound,
  animations: CONFIG.storage.animations,
  confetti: CONFIG.storage.confetti,
  hotkeys: CONFIG.storage.hotkeys,
};

export const THEME_MODES = CONFIG.themeModes;

// Every setting is stored in its positive form, so "on" always means the
// feature is on. DEFAULTS is what a user with no stored choices gets.
const DEFAULTS = Object.freeze({
  theme: 'system',
  sound: true,
  animations: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  confetti: true,
  hotkeys: true,
});

/** Mirrors what index.html applies before first paint. */
export function applyDocumentPreferences() {
  const reduceMotion = !get('animations');
  document.documentElement.classList.toggle('reduce-motion', reduceMotion);
}

export function get(key) {
  const fallback = DEFAULTS[key];
  if (key === 'theme') {
    const stored = Storage.getTheme();
    return THEME_MODES.includes(stored) ? stored : fallback;
  }
  return Storage.getBoolean(KEYS[key], fallback);
}

export function set(key, value) {
  if (key === 'theme') {
    Storage.setTheme(value);
  } else {
    Storage.setBoolean(KEYS[key], value);
  }
  applyDocumentPreferences();
}

/** Puts every setting back to its default, leaving stored progress untouched. */
export function resetAll() {
  Object.values(KEYS).forEach((storageKey) => Storage.remove(storageKey));
  applyDocumentPreferences();
}

export function defaults() {
  return { ...DEFAULTS };
}