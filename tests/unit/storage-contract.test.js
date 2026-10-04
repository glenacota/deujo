// tests/unit/storage-contract.test.js
// Two promises the localStorage keys have to keep on their own.
//
// The pre-paint script at the top of index.html cannot import CONFIG: a module
// import is deferred until after parsing, and that script exists precisely to
// run before the first paint so the page never flashes the wrong theme. It
// therefore spells its keys out as string literals, and a literal that drifts
// from CONFIG fails silently -- the page still loads, just with the wrong
// preference, or with a stale one the Settings modal can no longer clear.

import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../helpers/bootstrap.js';

const indexHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

const CONFIGURED_KEYS = new Set(Object.values(CONFIG.storage));

/** Only the inline boot script: `dm_` anywhere else in the document would be
 *  prose about storage, not a key this script actually reads. */
function prePaintKeys() {
  const script = indexHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'index.html still has its inline pre-paint script');
  return new Set([...script.matchAll(/'(dm_[a-z0-9_]+)'/g)].map(([, key]) => key));
}

test('every key CONFIG.storage defines sits under the prefix', () => {
  // The Settings danger zone clears by prefix only, so a key outside the prefix
  // survives a "clear progress" that the learner was told was complete.
  for (const [name, key] of Object.entries(CONFIG.storage)) {
    if (name === 'prefix') continue;
    assert.ok(
      key.startsWith(CONFIG.storage.prefix),
      `CONFIG.storage.${name} is "${key}", which is not under "${CONFIG.storage.prefix}"`,
    );
  }
});

test('the pre-paint script reads only keys CONFIG.storage defines', () => {
  const keys = prePaintKeys();
  assert.ok(keys.size > 0, 'the pre-paint script still reads storage keys');
  for (const key of keys) {
    assert.ok(CONFIGURED_KEYS.has(key), `index.html reads "${key}", which CONFIG.storage does not define`);
  }
});

test('the pre-paint script reads every key it has to, and they are prefixed', () => {
  // Both halves matter: a missing key means the flash this script exists to
  // prevent, and an unprefixed one survives the danger-zone wipe.
  for (const key of prePaintKeys()) {
    assert.ok(key.startsWith(CONFIG.storage.prefix), `"${key}" is outside the app's prefix`);
  }
  assert.ok(prePaintKeys().has(CONFIG.storage.theme), 'the script sets the theme from storage');
  assert.ok(prePaintKeys().has(CONFIG.storage.animations), 'the script sets reduced motion from storage');
});

test('CONFIG.storage holds no duplicate key values', () => {
  // Two names pointing at one key means one of them is a stale alias: the
  // danger-zone wipe cannot tell them apart and a reader cannot tell which is
  // the real one.
  const entries = Object.entries(CONFIG.storage).filter(([name]) => name !== 'prefix');
  const seen = new Map();
  for (const [name, key] of entries) {
    assert.ok(!seen.has(key), `CONFIG.storage.${name} and CONFIG.storage.${seen.get(key)} both use "${key}"`);
    seen.set(key, name);
  }
});
