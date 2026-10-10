// tests/unit/css-contract.test.js
// The stylesheet promises Tailwind cannot keep on its own: every utility the app
// names must exist in the generated CSS, and app.css must keep painting the
// states and geometry that JS toggles.
//
// Style rules are looked up through `parseCss` rather than matched against the
// source text, so reindenting a rule or reordering its declarations does not
// break a test that never claimed to check formatting.

import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../helpers/bootstrap.js';
import { parseCss } from '../helpers/parse-css.js';

const { loadKatas } = await import('../../assets/js/katas/registry.js');

const toneSource = readFileSync(new URL('../../assets/js/ui/ui-controller.js', import.meta.url), 'utf8');
const tailwindCss = readFileSync(new URL('../../assets/css/tailwind.css', import.meta.url), 'utf8');
const app = parseCss(readFileSync(new URL('../../assets/css/app.css', import.meta.url), 'utf8'));

const RANKS = CONFIG.belts.icons.length;

function escapeCssIdentifier(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
}

/** Tailwind only emits utilities it finds in the scanned sources, so a class the
 *  app names but the build never saw renders as no styling at all. */
function assertTailwindEmits(classNames, because) {
  for (const className of classNames) {
    assert.ok(tailwindCss.includes(`.${escapeCssIdentifier(className)}`), `${because}: no CSS rule for .${className}`);
  }
}

test('every verdict tone utility has a generated CSS selector', () => {
  const declaration = toneSource.match(/const VERDICT_TONE_CLASSES = \{([\s\S]*?)\n\};/);
  assert.ok(declaration, 'verdict tone class map exists');
  const classNames = [...declaration[1].matchAll(/'([^']+)'/g)].flatMap(([, value]) => value.split(/\s+/));
  assertTailwindEmits(classNames, 'verdict tone');
});

test('every dashboard accent class has a generated CSS rule', () => {
  // Without this, a card silently renders its default border.
  assertTailwindEmits(Object.values(CONFIG.accents), 'dashboard accent');
});

test('every registered kata uses an accent that exists', () => {
  // CONFIG.accents is the only source both sides read, so a kata cannot declare
  // a colour the dashboard has no class for.
  for (const kata of loadKatas(document.createElement('div'))) {
    assert.ok(
      Object.hasOwn(CONFIG.accents, kata.accent),
      `kata ${kata.id} declares accent "${kata.accent}", which CONFIG.accents does not define`,
    );
    assert.ok(CONFIG.accents[kata.accent], `kata ${kata.id} resolves to no accent class`);
  }
});

test('app.css paints every answer state, in both themes', () => {
  // answer-marking.js only sets data-answer-state; these rules are the whole
  // visual contract for a right and a wrong answer.
  for (const state of ['correct', 'wrong']) {
    for (const prefix of ['', 'html.dark ']) {
      const rule = app.get(`${prefix}[data-answer-state="${state}"]`);
      assert.ok(rule, `no rule for ${prefix}[data-answer-state="${state}"]`);
      assert.match(rule['border-color'] ?? '', /!important/, `${state} border must beat the kata's own border`);
    }
  }
  // The correction note beside a wrong control needs a colour per state too.
  for (const state of ['correct', 'wrong']) {
    assert.ok(app.get(`.answer-note[data-answer-state="${state}"]`)?.color, `no note colour for ${state}`);
  }
});

test('the belt tick bar paints from the rank colour tokens', () => {
  // A token must resolve to a real colour. A self-reference such as
  // `--belt-5-to: var(--belt-5-to)` passes every lookup below and then paints
  // nothing, so the token definitions are checked on their own.
  const root = app.get(':root') ?? {};
  for (let rank = 0; rank < RANKS; rank++) {
    assert.match(
      root[`--belt-${rank}-to`] ?? '',
      /^#[0-9a-f]{3,8}$|^rgba?\(/i,
      `--belt-${rank}-to must be a literal colour`,
    );
  }

  // Every rank must supply its held colour, its next colour and its ink, or a
  // belt renders as an empty trough and its name as invisible text.
  for (let rank = 0; rank < RANKS; rank++) {
    assert.equal(
      app.get(`.belt-label-${rank}`)?.['--belt-fill-to'],
      `var(--belt-${rank}-to)`,
      `belt ${rank} is missing its held colour`,
    );
    assert.equal(
      app.get(`.belt-next-${rank}`)?.['--belt-next-to'],
      `var(--belt-${rank}-to)`,
      `belt ${rank} is missing its next colour`,
    );
    assert.ok(app.get(`.belt-ticks.belt-label-${rank}`)?.['--belt-ink'], `belt ${rank} is missing its ink`);
  }

  // The held bar wears the current belt, always at 100%.
  assert.equal(app.get('.belt-tick-held')?.['background-color'], 'var(--belt-fill-to)');
  // Earned ticks wear the NEXT belt's colour, unearned ones stay transparent.
  assert.equal(app.get(".belt-tick[data-filled='true']")?.['background-color'], 'var(--belt-next-to)');
  assert.equal(app.get('.belt-tick')?.['background-color'], 'transparent');
  // A part-filled tick is that same flat colour clipped to --tick-fill, so half
  // points and a promotion's fifth stay visible.
  const partial = app.get(".belt-tick[data-filled='partial']") ?? {};
  assert.equal(partial['background-color'], 'var(--belt-next-to)');
  assert.match(partial['clip-path'] ?? '', /^inset\(0 calc\(100% - var\(--tick-fill/);
  // The rank name lives inside the held bar, so it cannot drift from its colour.
  assert.equal(app.get('.belt-tick-held .belt-rank')?.color, 'var(--belt-ink)');
});

test('the belt tick bar paints with flat fills, never gradients', () => {
  // A gradient here would reintroduce the low-contrast fill the ink tokens exist
  // to fix, so the check covers every belt rule rather than one slice of source.
  for (const [selector, declarations] of app) {
    if (!selector.includes('belt')) continue;
    assert.ok(!('background-image' in declarations), `${selector} sets background-image`);
    for (const property of ['background', 'background-color']) {
      assert.doesNotMatch(declarations[property] ?? '', /gradient/, `${selector} uses a gradient in ${property}`);
    }
  }
});

test('reduced motion silences the verdict, the toast bounce and the confetti canvas', () => {
  const silenced = (selector) => assert.match(
    app.get(selector)?.animation ?? '', /none/, `${selector} must switch its animation off`,
  );
  silenced('@media (prefers-reduced-motion: reduce) .verdict');
  silenced('@media (prefers-reduced-motion: reduce) .animate-bounce');
  silenced('html.reduce-motion .verdict');
  silenced('html.reduce-motion .animate-bounce');

  // The canvas is hidden rather than animated, and the user's setting has to
  // mirror the media query.
  assert.equal(app.get('@media (prefers-reduced-motion: reduce) canvas#fireworksCanvas')?.display, 'none');
  assert.equal(app.get('html.reduce-motion canvas#fireworksCanvas')?.display, 'none');
});

test('the settings panel is a bottom sheet on a phone and 44px everywhere', () => {
  const sheet = app.get('@media (max-width: 639px) #settingsModal');
  assert.equal(sheet?.['align-items'], 'flex-end', 'the panel docks to the bottom edge');

  const panel = app.get('@media (max-width: 639px) #settingsModal .modal-panel') ?? {};
  assert.equal(panel['border-radius'], '1rem 1rem 0 0', 'only the top corners stay rounded');
  assert.match(panel['max-height'] ?? '', /dvh$/, 'a sheet must size to the viewport, not to a fixed height');

  // Touch targets stay 44px even though the visible switch track is 44x18.
  assert.equal(app.get('.settings-switch')?.width, '44px');
  assert.equal(app.get('.settings-switch')?.height, '44px');
  assert.equal(app.get('.settings-switch-track')?.height, '18px');
  assert.equal(app.get('.settings-row')?.['min-height'], '44px');
});

// A picker option is a <button>, so the correct/wrong palette above reaches it
// through the same `[data-answer-state]` rules. What app.css owns is the geometry:
// a tap target a thumb can hit, and a pressed state a learner can see.
test('the picker paints a 44px tap target, a pressed state, and a visible open slot', () => {
    const option = app.get('.pick-option') ?? {};
    assert.equal(option['min-height'], '44px', 'a phone tap target');
    // Without a pressed background the chosen case is invisible, and step one
    // reads as unanswered while the learner is halfway through it.
    assert.ok(app.get('.pick-option[aria-pressed="true"]'), 'the pressed state has no rule');

  // The open slot is the one blank being answered, so it needs a colour of its
  // own rather than inheriting the closed one.
  assert.ok(app.get('.pick-slot--open')?.['border-bottom-color'], 'the open blank has no underline');
  assert.ok(app.get('html.dark .pick-slot--open'), 'the open blank has no dark-mode rule');
});

test('the picker stands still when the learner asked for less motion', () => {
  assert.match(
    app.get('@media (prefers-reduced-motion: reduce) .pick-option')?.transition ?? '',
    /none/,
    'the option transition must switch off',
  );
});

// The digit on an option is how a learner finds the hotkey, so it has to be
// legible in both themes rather than a dark smudge on a dark button.
test('the picker hotkey badge is legible in both themes, and sits left of the form', () => {
  const key = app.get('.pick-key') ?? {};
  assert.ok(key.background, 'the digit has no background of its own');
  assert.ok(key.color, 'and no colour to sit on it');
  assert.ok(app.get('html.dark .pick-key')?.color, 'the digit is unreadable in dark mode');

  // It is printed before the form, so the gap belongs on its right. A left
  // margin here would push the digit away from the word it picks.
  assert.equal(key['margin-right'], '0.4rem');
  assert.equal(key['margin-left'], undefined, 'the digit leads, so it must not trail');
});

// The options hover exactly as the noun kata's gender buttons do. Those classes
// are named in picker-kata.js rather than app.css, so Tailwind has to have
// emitted them from that string.
test('a picker option hovers exactly like a noun gender button', () => {
  const picker = readFileSync(new URL('../../assets/js/katas/factories/picker-kata.js', import.meta.url), 'utf8');
  const nouns = readFileSync(new URL('../../assets/js/katas/nouns/template.js', import.meta.url), 'utf8');

  const genderButton = nouns.match(/<button[^>]*data-role="gender"[^>]*>/)[0];
  const hovers = [...new Set([...genderButton.matchAll(/(?:dark:)?hover:[a-z0-9]+(?:\/[0-9]+)?/g)].map((m) => m[0]))];

  assert.ok(hovers.length >= 3, `the gender button should carry a hover treatment, found ${hovers}`);
  for (const hover of hovers) {
    assert.ok(picker.includes(hover), `a picker option does not carry ${hover}`);
    assertTailwindEmits([hover], 'picker option hover');
  }

  // A hover rule in app.css would outrank those utilities and quietly win, so
  // the two treatments would drift without anything failing. There must be one
  // source for the hover, and it is the class string.
  assert.equal(app.get('.pick-option:hover'), undefined, 'app.css must not also define the hover');
});

test('the shared kata input class carries the values the katas depend on', () => {
  // P5 consolidated nine copies of this into app.css; if a declaration is dropped
  // here the blanks silently lose their size or their focus ring.
  const input = app.get('.blank-input') ?? {};
  assert.equal(input.width, '100%');
  assert.equal(input['border-radius'], '0.5rem');
  assert.equal(app.get('.blank-input:focus')?.['border-color'], 'rgb(168 85 247)');
  assert.equal(app.get('.blank-input--inline')?.display, 'inline-block');
  // The lg step is where the block variant grows its padding and the inline one
  // grows its text.
  assert.equal(app.get('@media (min-width: 1024px) .blank-input')?.['padding-top'], '0.375rem');
  assert.equal(app.get('@media (min-width: 1024px) .blank-input--inline')?.['font-size'], '1.25rem');
});

test('the toast card geometry is shared and only the palette is per variant', () => {
  const card = app.get('.toast-card') ?? {};
  for (const property of ['display', 'align-items', 'gap', 'padding', 'border']) {
    assert.ok(property in card, `.toast-card is missing ${property}`);
  }
  // Both variants must paint; a variant with no background is an invisible toast.
  for (const variant of ['promoted', 'demoted']) {
    const rule = app.get(`.toast-card--${variant}`) ?? {};
    assert.ok(rule.background, `.toast-card--${variant} has no background`);
    assert.ok(rule.color, `.toast-card--${variant} has no text colour`);
  }
});
