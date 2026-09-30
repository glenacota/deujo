import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const toneSource = readFileSync(new URL('../../assets/js/ui/ui-controller.js', import.meta.url), 'utf8');
const tailwindCss = readFileSync(new URL('../../assets/css/tailwind.css', import.meta.url), 'utf8');
const appCss = readFileSync(new URL('../../assets/css/app.css', import.meta.url), 'utf8');

function escapeCssIdentifier(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
}

test('every verdict tone utility has a generated CSS selector', () => {
  const declaration = toneSource.match(/const VERDICT_TONE_CLASSES = \{([\s\S]*?)\n\};/);
  assert.ok(declaration, 'verdict tone class map exists');
  const classNames = [...declaration[1].matchAll(/'([^']+)'/g)]
    .flatMap(([, value]) => value.split(/\s+/));

  for (const className of classNames) {
    assert.ok(tailwindCss.includes(`.${escapeCssIdentifier(className)}`), `missing CSS rule for .${className}`);
  }
});

test('answer-state colors and reduced-motion selectors use emitted attributes and classes', () => {
  assert.match(appCss, /\[data-answer-state="correct"\]/);
  assert.match(appCss, /\[data-answer-state="wrong"\]/);
  assert.match(appCss, /html\.dark \[data-answer-state="correct"\]/);
  assert.match(appCss, /html\.dark \[data-answer-state="wrong"\]/);
  assert.match(appCss, /\.animate-bounce/);
  assert.match(appCss, /canvas#fireworksCanvas/);
});