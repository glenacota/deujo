// tests/unit/preferences.test.js
// Settings defaults, the three-way theme, and clearing stored data - including
// the prefixed belt keys, which a plain removeItem would miss.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserStub } from '../helpers/browser-stub.js';

/** Stands in for the OS setting, so the 'animations' default can be flipped. */
const REDUCED_MOTION = { matches: false };

const browser = installBrowserStub();

// Node has no matchMedia, and preferences reads it to default 'animations'.
globalThis.window.matchMedia = (query) => ({
  matches: query.includes('prefers-reduced-motion') && REDUCED_MOTION.matches,
  addEventListener() {},
});

class FakeClassList {
  #classes = new Set();
  add(name) { this.#classes.add(name); }
  remove(name) { this.#classes.delete(name); }
  toggle(name, force) {
    const shouldHave = force ?? !this.#classes.has(name);
    if (shouldHave) this.#classes.add(name);
    else this.#classes.delete(name);
    return shouldHave;
  }
  contains(name) { return this.#classes.has(name); }
}

globalThis.document.documentElement = { classList: new FakeClassList() };

const { CONFIG } = await import('../../assets/js/config.js');
const { Storage } = await import('../../assets/js/services/storage.js');
const { applyDocumentPreferences, defaults, get, resetAll, set } = await import('../../assets/js/services/preferences.js');

beforeEach(() => browser.reset());

test('unset settings fall back to their defaults', () => {
  assert.deepEqual(get('theme'), 'system');
  assert.equal(get('sound'), true);
  assert.equal(get('confetti'), true);
  assert.equal(get('animations'), true);
  assert.equal(get('hotkeys'), true);
});

test('every boolean setting is stored positive: on means the feature is on', () => {
  // The switch must never mean the opposite of its label, so a value of
  // "true" always means sound, confetti, animations or hotkeys are enabled.
  for (const key of ['sound', 'confetti', 'animations', 'hotkeys']) {
    set(key, true);
    assert.equal(Storage.getString(CONFIG.storage[key]), 'true', `${key} stored as true when on`);
    assert.equal(get(key), true);

    set(key, false);
    assert.equal(Storage.getString(CONFIG.storage[key]), 'false', `${key} stored as false when off`);
    assert.equal(get(key), false);
  }
});

test('animations default to off when the OS asks for reduced motion', async () => {
  // The default is read at import time, so re-import with a cache-busting
  // query while the matchMedia stub reports reduced motion.
  REDUCED_MOTION.matches = true;
  const { defaults: reducedDefaults } = await import('../../assets/js/services/preferences.js?reduced=1');

  assert.equal(reducedDefaults().animations, false, 'reduced-motion users get animations off by default');
  REDUCED_MOTION.matches = false;
});

test('theme accepts system, light and dark, and system stores no key', () => {
  set('theme', 'dark');
  assert.equal(get('theme'), 'dark');

  set('theme', 'system');
  assert.equal(get('theme'), 'system');
  assert.equal(localStorage.getItem(CONFIG.storage.theme), null, 'system must not pin a theme key');
});

test('an unrecognised stored theme reads as system', () => {
  localStorage.setItem(CONFIG.storage.theme, 'chartreuse');
  assert.equal(get('theme'), 'system');
});

test('animations on means motion, so the reduce-motion class is absent', () => {
  set('animations', true);
  assert.equal(document.documentElement.classList.contains('reduce-motion'), false);

  applyDocumentPreferences();
  set('animations', false);
  assert.equal(document.documentElement.classList.contains('reduce-motion'), true, 'animations off reduces motion');

  set('animations', true);
  assert.equal(document.documentElement.classList.contains('reduce-motion'), false);
});

test('resetAll restores every setting to its default', () => {
  set('theme', 'dark');
  set('sound', false);
  set('confetti', false);
  set('animations', false);
  set('hotkeys', false);

  resetAll();

  assert.deepEqual(
    {
      theme: get('theme'),
      sound: get('sound'),
      confetti: get('confetti'),
      animations: get('animations'),
      hotkeys: get('hotkeys'),
    },
    defaults()
  );
  assert.equal(document.documentElement.classList.contains('reduce-motion'), false, 'animations default back on');
});

test('resetAll leaves stored progress alone', () => {
  // The settings reset and the "clear progress" action are separate: one drops
  // preferences, the other drops dm_ progress keys. Only the settings go.
  const progress = [
    CONFIG.storage.belt + '_nouns',
    CONFIG.storage.streak,
    CONFIG.storage.maxStreak,
    CONFIG.storage.srs,
    CONFIG.storage.kata,
    CONFIG.storage.focusMode,
  ];
  for (const key of progress) localStorage.setItem(key, 'keep-me');

  set('sound', false);
  set('theme', 'dark');
  resetAll();

  assert.equal(get('sound'), true, 'the setting was reset');
  for (const key of progress) {
    assert.equal(localStorage.getItem(key), 'keep-me', `resetAll must not touch ${key}`);
  }
});

test('every setting has a dm_ storage key behind it', () => {
  // DEFAULTS is the list of settings, so each one needs a CONFIG.storage entry
  // or it would read and write `undefined` as a key.
  for (const key of Object.keys(defaults())) {
    assert.equal(typeof CONFIG.storage[key], 'string', `setting "${key}" has no CONFIG.storage key`);
    assert.ok(CONFIG.storage[key].startsWith(CONFIG.storage.prefix),
      `setting "${key}" is stored as "${CONFIG.storage[key]}", outside the ${CONFIG.storage.prefix} prefix`);
  }
});

test('removeByPrefix clears the prefixed belt keys, not just the prefix', () => {
  // Belt progress only exists as dm_belt_progress_<kataId>; there is no bare key.
  Storage.setNumber(`${CONFIG.storage.belt}_nouns`, 12);
  Storage.setNumber(`${CONFIG.storage.belt}_verbs`, 7);
  Storage.setNumber(CONFIG.storage.streak, 9);
  Storage.setString('unrelated_key', 'keep me');

  Storage.removeByPrefix(CONFIG.storage.prefix);

  assert.equal(localStorage.getItem(`${CONFIG.storage.belt}_nouns`), null);
  assert.equal(localStorage.getItem(`${CONFIG.storage.belt}_verbs`), null);
  assert.equal(localStorage.getItem(CONFIG.storage.streak), null);
  assert.equal(localStorage.getItem('unrelated_key'), 'keep me', 'foreign keys must survive');
});

test('getTheme and setTheme agree with the raw key', () => {
  assert.equal(Storage.getTheme(), null);
  Storage.setTheme('dark');
  assert.equal(localStorage.getItem(CONFIG.storage.theme), 'dark');
  Storage.setTheme('system');
  assert.equal(localStorage.getItem(CONFIG.storage.theme), null);
});