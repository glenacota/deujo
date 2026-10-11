// platform/preferences.js

import { CONFIG } from '../config.js';
import { Storage } from './storage.js';

export const THEME_MODES = CONFIG.themeModes;

// Settings are stored in positive form: true always means the feature is on.
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
  return Storage.getBoolean(CONFIG.storage[key], fallback);
}

export function set(key, value) {
  if (key === 'theme') {
    Storage.setTheme(value);
  } else {
    Storage.setBoolean(CONFIG.storage[key], value);
  }
  applyDocumentPreferences();
}

/** Puts every setting back to its default, leaving stored progress untouched. */
export function resetAll() {
  Object.keys(DEFAULTS).forEach((key) => Storage.remove(CONFIG.storage[key]));
  applyDocumentPreferences();
}

export function defaults() {
  return { ...DEFAULTS };
}
