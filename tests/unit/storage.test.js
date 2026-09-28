// tests/unit/storage.test.js
// Typed localStorage wrapper, including the "storage unavailable" path.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserStub, installThrowingStorage } from '../helpers/browser-stub.js';

const browser = installBrowserStub();

// Storage must be imported after the stub exists.
const { Storage } = await import('../../assets/js/services/storage.js');

beforeEach(() => browser.reset());

test('numbers round-trip and fall back on garbage', () => {
  Storage.setNumber('dm_test_num', 42);
  assert.equal(Storage.getNumber('dm_test_num'), 42);
  assert.equal(Storage.getNumber('dm_test_missing', 7), 7);

  localStorage.setItem('dm_test_num', 'not-a-number');
  assert.equal(Storage.getNumber('dm_test_num', 3), 3);
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

test('reads and writes never throw when localStorage is unavailable', () => {
  const restore = installThrowingStorage();
  try {
    assert.equal(Storage.getNumber('dm_test_num', 5), 5);
    assert.equal(Storage.getJSON('dm_test_json', null), null);
    Storage.setNumber('dm_test_num', 1);
  } finally {
    restore();
  }
});
