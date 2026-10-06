// tests/unit/parse-css.test.js
// The parser the style contracts are written against. If it silently loses a
// rule, every assertion built on it passes for the wrong reason.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { parseCss } from '../helpers/parse-css.js';

test('it reads declarations out of a flat rule', () => {
  const rules = parseCss('.a { color: red; margin: 0 }');
  assert.deepEqual(rules.get('.a'), { color: 'red', margin: '0' });
});

test('it splits grouped selectors and merges a repeated selector', () => {
  const rules = parseCss('.a, .b { color: red } .a { margin: 0 }');
  assert.deepEqual(rules.get('.a'), { color: 'red', margin: '0' });
  assert.deepEqual(rules.get('.b'), { color: 'red' });
});

test('it keys a nested rule by its media condition', () => {
  const rules = parseCss('@media (max-width: 10px) { .a { color: red } }');
  assert.deepEqual(rules.get('@media (max-width: 10px) .a'), { color: 'red' });
  assert.equal(rules.get('.a'), undefined, 'the bare selector must not also be registered');
});

test('it ignores comments and normalises whitespace', () => {
  const rules = parseCss('/* hi */\n.a {\n  color : red ;\n}');
  assert.deepEqual(rules.get('.a'), { color: 'red' });
});

test('it does not mistake a brace inside a string for a rule end', () => {
  const rules = parseCss('.a { content: "}"; color: red } .b { color: blue }');
  assert.equal(rules.get('.a')?.color, 'red');
  assert.equal(rules.get('.b')?.color, 'blue');
});

test('it skips @keyframes, whose body is declarations rather than selectors', () => {
  const rules = parseCss('@keyframes spin { from { opacity: 0 } to { opacity: 1 } } .a { color: red }');
  assert.equal(rules.size, 1);
  assert.deepEqual(rules.get('.a'), { color: 'red' });
});

test('it returns an empty map for empty or declaration-less input', () => {
  assert.equal(parseCss('').size, 0);
  assert.equal(parseCss('.a {}').get('.a') !== undefined, true);
  assert.deepEqual(parseCss('.a {}').get('.a'), {});
});

test('it finds every rule the real stylesheet declares', () => {
  const app = parseCss(readFileSync(new URL('../../assets/css/app.css', import.meta.url), 'utf8'));
  // A parser that quietly stopped early would make the style contracts vacuous,
  // so pin the selectors the app depends on rather than a bare count.
  for (const selector of [
    '.verdict',
    '.answer-badge',
    '.blank-input',
    '.toast-card',
    '.modal-backdrop',
    '.settings-switch-track',
    '.belt-tick-held',
    '@media (max-width: 639px) #settingsModal',
    'html.dark .modal-panel',
  ]) {
    assert.ok(app.has(selector), `parseCss lost ${selector}`);
  }
});
