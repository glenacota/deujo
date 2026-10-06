// tests/unit/storage.test.js
// Typed localStorage wrapper, including the "storage unavailable" path.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { browser, CONFIG } from '../helpers/bootstrap.js';
import { installThrowingStorage } from '../helpers/browser-stub.js';

// Storage must be imported after the stub exists.
const { Storage } = await import('../../assets/js/platform/storage.js');

beforeEach(() => browser.reset());

test('numbers round-trip and fall back on garbage', () => {
  Storage.setNumber('dm_test_num', 42);
  assert.equal(Storage.getNumber('dm_test_num'), 42);
  assert.equal(Storage.getNumber('dm_test_missing', 7), 7);

  localStorage.setItem('dm_test_num', 'not-a-number');
  assert.equal(Storage.getNumber('dm_test_num', 3), 3);
});

test('numbers keep their fraction, so half belt points survive a reload', () => {
  Storage.setNumber('dm_test_frac', 5.2);
  assert.equal(Storage.getNumber('dm_test_frac'), 5.2);

  localStorage.setItem('dm_test_frac', '4.7');
  assert.equal(Storage.getNumber('dm_test_frac'), 4.7, 'not truncated to 4');
});

test('booleans round-trip and treat anything but "true" as false', () => {
  Storage.setBoolean('dm_test_bool', true);
  assert.equal(Storage.getBoolean('dm_test_bool'), true);

  localStorage.setItem('dm_test_bool', 'TRUE');
  assert.equal(Storage.getBoolean('dm_test_bool', true), false);
  assert.equal(Storage.getBoolean('dm_test_bool_missing'), false);
  assert.equal(Storage.getBoolean('dm_test_bool_missing', true), true);
});

test('strings round-trip and fall back on a missing key', () => {
  Storage.setString('dm_test_str', 'nouns');
  assert.equal(Storage.getString('dm_test_str'), 'nouns');
  assert.equal(Storage.getString('dm_test_absent', 'cases'), 'cases');
});

test('JSON falls back on malformed content', () => {
  Storage.setJSON('dm_test_json', { a: 1 });
  assert.deepEqual(Storage.getJSON('dm_test_json', {}), { a: 1 });

  localStorage.setItem('dm_test_json', '{ broken');
  assert.equal(Storage.getJSON('dm_test_json', 'fallback'), 'fallback');
  assert.equal(Storage.getJSON('dm_test_json'), null);
});

test('getJSON returns the fallback for a missing key', () => {
  // Without an explicit null check this accidentally passes, because
  // JSON.parse(null) is null -- the fallback itself was never applied.
  assert.deepEqual(Storage.getJSON('dm_test_absent', { fallback: true }), { fallback: true });
  assert.equal(Storage.getJSON('dm_test_absent', 'cases'), 'cases');
  assert.equal(Storage.getJSON('dm_test_absent'), null);
});

test('theme helpers use the configured theme key', () => {
  assert.equal(Storage.getTheme(), null, 'an unset theme reads as null');

  Storage.setTheme('dark');
  assert.equal(localStorage.getItem(CONFIG.storage.theme), 'dark');
  assert.equal(Storage.getTheme(), 'dark');
});

test('no getter or setter throws when localStorage is unavailable', () => {
  const restore = installThrowingStorage();
  try {
    assert.equal(Storage.getNumber('dm_test_num', 5), 5);
    assert.equal(Storage.getBoolean('dm_test_bool', true), true);
    assert.equal(Storage.getString('dm_test_str', 'cases'), 'cases');
    assert.equal(Storage.getJSON('dm_test_json', null), null);
    assert.equal(Storage.getTheme(), null);

    Storage.setNumber('dm_test_num', 1);
    Storage.setBoolean('dm_test_bool', true);
    Storage.setString('dm_test_str', 'nouns');
    Storage.setJSON('dm_test_json', { a: 1 });
    Storage.setTheme('dark');
  } finally {
    restore();
  }
});
