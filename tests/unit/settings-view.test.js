// tests/unit/settings-view.test.js
// Contract for the settings modal: render() reflects stored preferences, one
// delegated change listener drives the settings, every switch reads "on means
// the feature is on", and clearing data needs a confirmation before it wipes
// the prefixed keys (belt progress included).

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { browser, CONFIG } from '../helpers/bootstrap.js';
import { readFile } from 'node:fs/promises';

globalThis.window.matchMedia = () => ({ matches: false, addEventListener() {} });

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

const { Storage } = await import('../../assets/js/services/storage.js');
const { get, set } = await import('../../assets/js/services/preferences.js');
const { dom } = await import('../../assets/js/ui/dom.js');
const { SettingsView } = await import('../../assets/js/ui/settings-view.js');

const THEME_MODES = ['system', 'light', 'dark'];

class FakePanel {
  #listeners = new Map();

  addEventListener(type, handler) {
    this.#listeners.set(type, handler);
  }

  emit(type, event) {
    this.#listeners.get(type)?.(event);
  }
}

class FakeInput {
  constructor({ name, value, dataset = {} } = {}) {
    this.name = name ?? '';
    this.value = value ?? '';
    this.dataset = dataset;
    this.checked = false;
  }
}

/** Wires a fake settings panel into `dom`, plus a fake audio/theme pair. */
function stubSettingsDom() {
  const panel = new FakePanel();
  const themeInputs = THEME_MODES.map((mode) => new FakeInput({ name: 'theme', value: mode }));
  const switches = {
    sound: new FakeInput({ dataset: { setting: 'sound' } }),
    confetti: new FakeInput({ dataset: { setting: 'confetti' } }),
    animations: new FakeInput({ dataset: { setting: 'animations' } }),
    hotkeys: new FakeInput({ dataset: { setting: 'hotkeys' } }),
  };

  // The confirmation is a nested dialog: hidden means the `hidden` class is set.
  const confirmBox = {
    classList: new FakeClassList(),
    listeners: new Map(),
    focused: false,
    focus() { this.focused = true; },
    addEventListener(type, handler) { this.listeners.set(type, handler); },
    emit(type, event) { this.listeners.get(type)?.(event); },
  };
  confirmBox.classList.add('hidden');
  const makeFocusable = () => ({ focused: false, focus() { this.focused = true; } });
  const clearDataBtn = { attributes: {}, focused: false, focus() { this.focused = true; }, setAttribute(name, value) { this.attributes[name] = value; } };

  Object.assign(dom.modals.settings, {
    root: panel,
    themeInputs,
    switches,
    testSoundBtn: { disabled: false, textContent: '' },
    confirmBox,
    clearDataBtn,
    confirmCancelBtn: makeFocusable(),
    confirmOkBtn: makeFocusable(),
  });

  // The real AudioEngine reads the stored preference once at construction, so
  // the fake reads it on every call to keep the two in step.
  const audio = {
    soundOn: null,
    played: 0,
    isSoundOn() { this.soundOn ??= get('sound'); return this.soundOn; },
    setSoundOn(value) { this.soundOn = value; return value; },
    playCorrect() { this.played += 1; },
  };
  const theme = { applied: [], applyTheme(mode) { this.applied.push(mode); } };

  return {
    panel, themeInputs, switches, audio, theme,
    confirmBox, clearDataBtn,
    confirmCancelBtn: dom.modals.settings.confirmCancelBtn,
    confirmOkBtn: dom.modals.settings.confirmOkBtn,
    testSoundBtn: dom.modals.settings.testSoundBtn,
  };
}

/** A click on a `[data-action]` button, as the delegated listener sees it. */
function clickAction(action) {
  return { target: { closest: (selector) => (selector === '[data-action]' ? { dataset: { action } } : null) } };
}

/** A change on one of the modal inputs, with the real delegated path. */
function changeInput(input, checked) {
  input.checked = checked;
  return { target: input };
}

beforeEach(() => browser.reset());

test('settings modal markup ships every id, switch and action the view expects', async () => {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  const modal = /<div id="settingsModal"([\s\S]*?)<script type="module"/.exec(html);
  assert.ok(modal, 'settingsModal not found in index.html');

  for (const id of ['settingsSoundSwitch', 'settingsConfettiSwitch', 'settingsAnimationsSwitch', 'settingsHotkeysSwitch', 'settingsTestSoundBtn', 'settingsResetBtn', 'settingsClearDataBtn', 'settingsClearConfirm', 'settingsClearCancelBtn', 'settingsClearOkBtn']) {
    assert.match(modal[1], new RegExp(`id="${id}"`), `${id} must live inside the settings modal`);
  }
  for (const action of ['test-sound', 'reset', 'clear-data', 'clear-cancel', 'clear-data-confirm']) {
    assert.match(modal[1], new RegExp(`data-action="${action}"`), `missing data-action="${action}"`);
  }
  assert.equal(THEME_MODES.length, (modal[1].match(/name="theme"/g) ?? []).length, 'a radio per theme mode');
});

test('the delete confirmation spells out the consequences before any OK', async () => {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  const warning = /id="settingsClearWarning"[^>]*>([\s\S]*?)<\/p>/.exec(html);

  assert.ok(warning, 'the confirmation must state the consequences');
  const text = warning[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  for (const consequence of ['belt', 'streak', 'spaced-repetition', 'cannot be undone']) {
    assert.ok(text.includes(consequence), `the warning must mention "${consequence}"`);
  }
});

test('render reflects the stored preferences', () => {
  set('theme', 'dark');
  set('sound', false);
  set('confetti', false);
  set('animations', false);
  set('hotkeys', false);

  const stubs = stubSettingsDom();
  new SettingsView({ audio: stubs.audio, theme: stubs.theme }).render();

  assert.equal(stubs.themeInputs.find((input) => input.value === 'dark').checked, true);
  assert.equal(stubs.themeInputs.filter((input) => input.checked).length, 1, 'exactly one theme mode');
  assert.equal(stubs.switches.sound.checked, false);
  assert.equal(stubs.switches.confetti.checked, false);
  assert.equal(stubs.switches.animations.checked, false);
  assert.equal(stubs.switches.hotkeys.checked, false);
});

test('each switch is on exactly when its feature is on', () => {
  const stubs = stubSettingsDom();
  const view = new SettingsView({ audio: stubs.audio, theme: stubs.theme });

  // Sound on: the switch reads on, and audio agrees.
  view.render();
  assert.equal(stubs.switches.sound.checked, true);
  assert.equal(stubs.audio.isSoundOn(), true);

  stubs.panel.emit('change', changeInput(stubs.switches.sound, false));
  assert.equal(stubs.audio.isSoundOn(), false, 'switch off means sound off');
  assert.equal(stubs.switches.sound.checked, false, 'render keeps the switch matching the engine');

  // Animations off: reduce-motion is applied, not removed.
  stubs.panel.emit('change', changeInput(stubs.switches.animations, false));
  assert.equal(document.documentElement.classList.contains('reduce-motion'), true);
  stubs.panel.emit('change', changeInput(stubs.switches.animations, true));
  assert.equal(document.documentElement.classList.contains('reduce-motion'), false);
});

test('the test-sound button follows the sound switch', () => {
  const stubs = stubSettingsDom();
  const view = new SettingsView({ audio: stubs.audio, theme: stubs.theme });

  view.render();
  assert.equal(stubs.testSoundBtn.disabled, false);
  assert.equal(stubs.testSoundBtn.textContent, 'Test sound');

  stubs.audio.setSoundOn(false);
  view.render();
  assert.equal(stubs.testSoundBtn.disabled, true);
  assert.equal(stubs.testSoundBtn.textContent, 'Sound is off');
});

test('one change listener routes every switch to storage and the engines', () => {
  const stubs = stubSettingsDom();
  new SettingsView({ audio: stubs.audio, theme: stubs.theme });

  stubs.panel.emit('change', changeInput(stubs.switches.confetti, false));
  assert.equal(Storage.getBoolean(CONFIG.storage.confetti, true), false);

  stubs.panel.emit('change', changeInput(stubs.switches.hotkeys, false));
  assert.equal(Storage.getBoolean(CONFIG.storage.hotkeys, true), false);

  stubs.panel.emit('change', changeInput(stubs.switches.sound, false));
  assert.equal(Storage.getBoolean(CONFIG.storage.sound, true), false, 'the stored value is the positive form');
});

test('choosing a theme mode stores it and repaints the document', () => {
  const stubs = stubSettingsDom();
  new SettingsView({ audio: stubs.audio, theme: stubs.theme });

  const light = stubs.themeInputs.find((input) => input.value === 'light');
  stubs.panel.emit('change', changeInput(light, true));

  assert.equal(Storage.getTheme(), 'light');
  assert.deepEqual(stubs.theme.applied, ['light']);
});

test('test sound plays only when sound is on', () => {
  const stubs = stubSettingsDom();
  new SettingsView({ audio: stubs.audio, theme: stubs.theme });

  stubs.panel.emit('click', clickAction('test-sound'));
  assert.equal(stubs.audio.played, 1);

  stubs.audio.setSoundOn(false);
  stubs.panel.emit('click', clickAction('test-sound'));
  assert.equal(stubs.audio.played, 1, 'a silent app stays silent');
});

test('reset restores every default without touching progress', () => {
  Storage.setNumber(`${CONFIG.storage.belt}_nouns`, 12);
  set('theme', 'dark');
  set('sound', false);
  set('confetti', false);
  set('animations', false);
  set('hotkeys', false);
  const stubs = stubSettingsDom();
  new SettingsView({ audio: stubs.audio, theme: stubs.theme });

  stubs.panel.emit('click', clickAction('reset'));

  assert.equal(Storage.getTheme(), null);
  assert.equal(Storage.getBoolean(CONFIG.storage.sound, true), true);
  assert.equal(Storage.getBoolean(CONFIG.storage.confetti, true), true);
  assert.equal(Storage.getBoolean(CONFIG.storage.hotkeys, true), true);
  assert.equal(Storage.getNumber(`${CONFIG.storage.belt}_nouns`), 12, 'belts survive a settings reset');
  assert.equal(stubs.audio.isSoundOn(), true);
});

test('clear data needs the second click, and cancelling deletes nothing', () => {
  Storage.setNumber(`${CONFIG.storage.belt}_nouns`, 12);
  let reloaded = false;
  const stubs = stubSettingsDom();
  new SettingsView({
    audio: stubs.audio,
    theme: stubs.theme,
    onClearData: () => { reloaded = true; },
  });

  stubs.panel.emit('click', clickAction('clear-data'));
  assert.equal(stubs.confirmBox.classList.contains('hidden'), false, 'the confirmation dialog appears');
  assert.equal(stubs.confirmBox.focused, true, 'focus lands on the dialog, not the delete button');
  assert.equal(stubs.clearDataBtn.attributes['aria-expanded'], 'true');
  assert.equal(localStorage.getItem(`${CONFIG.storage.belt}_nouns`), '12', 'the first click deletes nothing');
  assert.equal(reloaded, false);

  stubs.panel.emit('click', clickAction('clear-cancel'));
  assert.equal(stubs.confirmBox.classList.contains('hidden'), true);
  assert.equal(stubs.clearDataBtn.focused, true, 'focus returns to the trigger');
  assert.equal(localStorage.getItem(`${CONFIG.storage.belt}_nouns`), '12');
  assert.equal(reloaded, false);
});

test('Esc and a backdrop click dismiss the confirmation without deleting', () => {
  Storage.setNumber(`${CONFIG.storage.belt}_nouns`, 12);
  let reloaded = false;
  const stubs = stubSettingsDom();
  new SettingsView({
    audio: stubs.audio,
    theme: stubs.theme,
    onClearData: () => { reloaded = true; },
  });

  // Esc inside the nested dialog must not reach the modal controller, or the
  // whole settings panel would close too.
  stubs.panel.emit('click', clickAction('clear-data'));
  let stopped = false;
  stubs.confirmBox.emit('keydown', {
    key: 'Escape',
    preventDefault() {},
    stopPropagation() { stopped = true; },
  });
  assert.equal(stopped, true, 'Esc is swallowed by the nested dialog');
  assert.equal(stubs.confirmBox.classList.contains('hidden'), true);

  stubs.panel.emit('click', clickAction('clear-data'));
  stubs.confirmBox.emit('click', { target: stubs.confirmBox });
  assert.equal(stubs.confirmBox.classList.contains('hidden'), true, 'clicking the backdrop cancels');

  assert.equal(localStorage.getItem(`${CONFIG.storage.belt}_nouns`), '12', 'no accidental delete');
  assert.equal(reloaded, false);
});

test('confirming clears the prefixed belt keys, then asks the app to reload', () => {
  Storage.setNumber(`${CONFIG.storage.belt}_nouns`, 12);
  Storage.setNumber(`${CONFIG.storage.belt}_verbs`, 7);
  Storage.setNumber(CONFIG.storage.streak, 9);
  Storage.setString('unrelated_key', 'keep me');

  let reloaded = false;
  const stubs = stubSettingsDom();
  new SettingsView({
    audio: stubs.audio,
    theme: stubs.theme,
    onClearData: () => { reloaded = true; },
  });

  stubs.panel.emit('click', clickAction('clear-data'));
  stubs.panel.emit('click', clickAction('clear-data-confirm'));

  assert.equal(localStorage.getItem(`${CONFIG.storage.belt}_nouns`), null);
  assert.equal(localStorage.getItem(`${CONFIG.storage.belt}_verbs`), null);
  assert.equal(localStorage.getItem(CONFIG.storage.streak), null);
  assert.equal(localStorage.getItem('unrelated_key'), 'keep me');
  assert.equal(reloaded, true, 'in-memory state must be rebuilt, so the app reloads');
  assert.equal(stubs.confirmBox.classList.contains('hidden'), true);
});