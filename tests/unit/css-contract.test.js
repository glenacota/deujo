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

test('the belt tick bar paints with the current belt gradient', () => {
  // Every rank class must supply both gradient stops, or a filled tick falls
  // back to no background-image and silently renders as an empty tick.
  const rankClasses = [...appCss.matchAll(/^\.belt-label-(\d)\s*\{([^}]*)\}/gm)];
  assert.equal(rankClasses.length, 7, 'one .belt-label-N rule per rank');

  for (const [, rank, body] of rankClasses) {
    assert.match(body, /--belt-fill-from:\s*var\(--belt-\d+-from\)/, `belt ${rank} is missing its from stop`);
    assert.match(body, /--belt-fill-to:\s*var\(--belt-\d+-to\)/, `belt ${rank} is missing its to stop`);
  }

  // Filled ticks paint a flat belt colour, not a two-stop ramp.
  assert.match(appCss, /\.belt-tick\[data-filled='true'\]\s*\{[^}]*background-color:\s*var\(--belt-fill-to\)/);
  // Empty ticks ring in the same belt colour, so the bar reads as one colour.
  assert.match(appCss, /\.belt-tick\s*\{[^}]*var\(--belt-fill-to\)/);
  // Belt colour dots are flat too.
  assert.match(appCss, /\.belt-side\s*\{[^}]*background-color:\s*var\(--belt-fill-to\)/);
  // No gradients anywhere in the widget: every rule must avoid background-image
  // and the linear-gradient function.
  const tickRules = appCss.slice(appCss.indexOf('.belt-ticks {'));
  assert.doesNotMatch(tickRules, /linear-gradient/, 'a gradient crept back into the belt tick bar');
  assert.doesNotMatch(tickRules, /background-image/, 'the tick bar paints with background-color only');
  // The label is a real text node now, so the old clip-path text trick is gone.
  assert.doesNotMatch(appCss, /\.belt-label::before/);
});

test('the settings bottom sheet and reduce-motion override use emitted selectors', () => {
  // Phone layout: the panel docks to the bottom edge with only rounded top corners.
  assert.match(appCss, /@media \(max-width: 639px\)[\s\S]*#settingsModal\s*\{[^}]*align-items: flex-end/);
  assert.match(appCss, /#settingsModal \.modal-panel\s*\{[^}]*border-radius: 1rem 1rem 0 0[^}]*max-height: 85dvh/);

  // Touch targets stay 44px even though the visible switch track is 44x24.
  assert.match(appCss, /\.settings-switch\s*\{[^}]*width: 44px[^}]*height: 44px/);
  assert.match(appCss, /\.settings-switch-track\s*\{[^}]*width: 44px[^}]*height: 18px/);
  assert.match(appCss, /\.settings-row\s*\{[^}]*min-height: 44px/);

  // The user setting mirrors the prefers-reduced-motion media query.
  assert.match(appCss, /html\.reduce-motion canvas#fireworksCanvas/);
});