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

/** Every kata's own markup, keyed by kata. The picker builds its buttons in JS. */
const TEMPLATES = Object.fromEntries(
    Object.entries({
        nouns: '../../assets/js/katas/nouns/template.js',
        verbs: '../../assets/js/katas/verbs/template.js',
        picker: '../../assets/js/katas/factories/picker-template.js',
    }).map(([kata, path]) => [kata, readFileSync(new URL(path, import.meta.url), 'utf8')]),
);

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

// An option is a <button>, so the correct/wrong palette above reaches it through
// the same `[data-answer-state]` rules. What app.css owns is the geometry: a tap
// target a thumb can hit, and a pressed state a learner can see.
test('an option paints a 44px tap target and a visible pressed state', () => {
    const option = app.get('.kata-option') ?? {};
    assert.equal(option['min-height'], '44px', 'a phone tap target');
    // Without a pressed background the chosen case is invisible, and step one
    // reads as unanswered while the learner is halfway through it.
    assert.ok(app.get('.kata-option[aria-pressed="true"]'), 'the pressed state has no rule');
    assert.ok(app.get('html.dark .kata-option'), 'an option has no dark-mode rule');

    // The open slot is the one blank being answered, so it needs a colour of its
    // own rather than inheriting the closed one.
    assert.ok(app.get('.pick-slot--open')?.['border-bottom-color'], 'the open blank has no underline');
    assert.ok(app.get('html.dark .pick-slot--open'), 'the open blank has no dark-mode rule');
});

test('an option stands still when the learner asked for less motion', () => {
    assert.match(
        app.get('@media (prefers-reduced-motion: reduce) .kata-option')?.transition ?? '',
        /none/,
        'the option transition must switch off',
    );
});

// The digit on an option is how a learner finds the hotkey, so it has to be
// legible in both themes rather than a dark smudge on a dark button. Every kata
// that offers options prints one, so the class is not picker-specific any more.
test('an option digit is legible in both themes, and sits left of the form', () => {
    const key = app.get('.option-key') ?? {};
    assert.ok(key.background, 'the digit has no background of its own');
    assert.ok(key.color, 'and no colour to sit on it');
    assert.ok(app.get('html.dark .option-key')?.color, 'the digit is unreadable in dark mode');

    // It is printed before the form, so the gap belongs on its right. A left
    // margin here would push the digit away from the word it picks.
    assert.equal(key['margin-right'], '0.4rem');
    assert.equal(key['margin-left'], undefined, 'the digit leads, so it must not trail');
});

// One option class for every kata. This is the consistency the whole surface
// rests on: the noun kata's gender buttons, the Perfekt auxiliaries and a
// picker's cases and forms are one control, so a padding or a colour changes in
// exactly one place. Before this, each kata carried its own Tailwind string and
// the three treatments drifted apart with nothing failing.
test('every kata renders its options through the one shared class', () => {
    // The picker builds its buttons rather than declaring them, so its class
    // assignment counts as its declaration and its source is read too.
    const built = readFileSync(new URL('../../assets/js/katas/factories/picker-kata.js', import.meta.url), 'utf8');

    for (const [kata, source] of Object.entries(TEMPLATES)) {
        // Every option button, not just one of them: a kata with a hand-styled
        // button beside a shared one is exactly the drift this removes.
        const source2 = kata === 'picker' ? built : source;
        const declared = (source2.match(/<button[^>]*>/g) ?? []).filter((tag) => /data-role="(gender|aux)"/.test(tag));
        // An assignment to a `button` counts as its declaration.
        const assigned = [...source2.matchAll(/button\.className = '([^']*)'/g)].map(([, name]) => name);
        assert.ok(
            declared.length + assigned.length > 0,
            `${kata} renders no option buttons`,
        );

        for (const tag of declared) {
            assert.match(tag, /class="[^"]*\bkata-option\b/, `${kata} has an option outside the shared class: ${tag}`);
            // A stray colour, radius or padding utility on the button would
            // override app.css and put that kata back out of step with the rest.
            assert.doesNotMatch(
                tag,
                /class="[^"]*\b(?:bg-|text-|rounded-|py-|px-|ring-|border-(?!slate))/,
                `${kata} hand-styles an option instead of leaving it to app.css: ${tag}`,
            );
        }
        for (const name of assigned) {
            assert.equal(name, 'kata-option', `${kata} assigns an option class other than the shared one`);
        }
    }

    // The hover has one source, and it is the class: no per-button utility, and
    // no leftover rule that could outrank the one that is there.
    assert.ok(app.get('.kata-option:hover'), 'the shared option has no hover treatment');
    assert.equal(app.get('.pick-option'), undefined, 'the old picker-only option class is gone');
});

// The same argument for the shell around the controls. A kata's template is
// allowed to say what is different about it and nothing else: the section, the
// headline, the gloss and the caption come from the shared classes, so moving
// between katas cannot change the padding or the type scale under the learner.
test('every kata builds its shell from the shared classes', () => {
    for (const [kata, source] of Object.entries(TEMPLATES)) {
        assert.match(source, /class="kata-section[^"]*"/, `${kata} does not use the shared section`);
        assert.match(source, /class="kata-head"/, `${kata} does not use the shared headline block`);
        assert.match(source, /class="kata-prompt kata-prompt--/, `${kata} does not use the shared prompt`);
        assert.match(source, /class="kata-gloss"/, `${kata} does not use the shared gloss`);
        assert.match(source, /class="kata-field/, `${kata} does not use the shared control block`);
        assert.match(source, /class="kata-label/, `${kata} does not use the shared caption`);

        // Nothing left over from the per-kata Tailwind: a stray `p-6`,
        // `mt-4` or `mb-8` on the section would silently override the rhythm.
        const section = source.match(/<section[^>]*>/)[0];
        assert.doesNotMatch(
            section,
            /class="[^"]*\b(?:p-|px-|py-|m[trblxy]?-|max-w-|text-center|leading-|tracking-|font-(?:black|bold|extrabold))/,
            `${kata} still hand-styles its section or headline: ${section}`,
        );
    }

    // A label bound to its control, not floating beside it: `for` on the caption
    // and `id` on the blank, so a tap on the caption focuses the field.
    for (const [kata, source] of Object.entries(TEMPLATES)) {
        const fors = [...source.matchAll(/<label[^>]*\sfor="([^"]+)"/g)].map(([, id]) => id);
        const ids = new Set([...source.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id));
        for (const id of fors) {
            assert.ok(ids.has(id), `${kata} has a label pointing at no control: ${id}`);
        }
    }
});

// A review chip is a disabled button holding what the learner gave. It is not a
// control they can use, so it must not be sized as one: the option's 44px tap
// target on a chip nobody can tap makes the review list taller than the answers
// it holds, and a hover would do nothing at all. The correct/wrong palette still
// reaches it, because `[data-answer-state]` names no class.
test('a review chip is sized as a value, not as a tappable option', () => {
    const chip = app.get('.pick-value') ?? {};
    assert.ok(chip.padding, 'a chip has no padding of its own');
    assert.equal(chip['min-height'], undefined, 'a disabled chip pays for a tap target it cannot be tapped on');
    assert.equal(app.get('.pick-value:hover'), undefined, 'and for a hover it can never be hovered');
    // A chip is its own thing rather than a smaller option, so the compact variant
    // that used to bridge the two has nothing left to bridge.
    assert.equal(app.get('.kata-option--compact'), undefined, 'a chip is not a small option');
});

// Every kata has one caption style and no variants. Uppercase micro-labels at
// 12px are the least legible thing in the UI and read no faster, and the old
// sentence-case exception for the picker is gone with them: nothing shouts a
// German noun now, because nothing shouts at all.
test('the caption is one style, in sentence case, for every kata', () => {
    const caption = app.get('.kata-label') ?? {};

    assert.equal(caption['text-transform'], undefined, 'a caption is not shouted');
    assert.equal(caption.color, 'rgb(100 116 139)', 'a caption is slate-500');
    assert.equal(caption['font-size'], '0.75rem');

    // No variant survives. A second caption class would put the katas back into
    // two groups, which is what the shared surface exists to prevent.
    assert.equal(app.get('.kata-label--step'), undefined);
    for (const [kata, source] of Object.entries(TEMPLATES)) {
        const variants = [...source.matchAll(/class="([^"]*\bkata-label\b[^"]*)"/g)];
        assert.ok(variants.length > 0, `${kata} carries no caption`);
        for (const [, classes] of variants) {
            // `--` here is only ever the column modifier (`kata-options--4`), so
            // the check is on the caption's own token list.
            const tokens = classes.split(/\s+/).filter((name) => name.startsWith('kata-label'));
            assert.deepEqual(tokens, ['kata-label'], `${kata} stacks caption variants: ${tokens}`);
        }
    }

    // And the stylesheet is not relied on to lower anything: no caption in a
    // template is written in caps, so the sentence case is the source text.
    for (const [kata, source] of Object.entries(TEMPLATES)) {
        for (const [, label] of source.matchAll(/class="kata-label"[^>]*>([^<]+)</g)) {
            assert.doesNotMatch(
                label.trim(),
                /^[^a-z]*[A-Z]{2,}/,
                `${kata} has a shouted caption: ${label.trim()}`,
            );
        }
    }
});

// The katas sit in one column, so their vertical rhythm has to be one rhythm:
// the same section padding, the same gap under the headline, the same caption
// offset, and the same gap between control blocks. Three private rhythms meant
// the action bar sat at a different height in each kata.
test('every kata sits in the same measure and the same vertical rhythm', () => {
    assert.equal(app.get('.kata-section')?.padding, '1.5rem');
    assert.equal(app.get('.kata-field')?.['max-width'], '36rem');
    assert.equal(app.get('.kata-field')?.margin, '0 auto 1.5rem');
    assert.equal(app.get('.kata-label')?.['margin-bottom'], '0.5rem');
    assert.equal(app.get('.kata-head')?.margin, '1rem 0 1.5rem');
    assert.equal(app.get('.kata-head')?.['text-align'], 'center');
});

// A labelled blank is a grid row, not a flex line: the label keeps its own
// column so the six conjugation inputs line up, and the input column is
// `minmax(0, 1fr)` so a long placeholder cannot push the row off a phone.
test('a labelled blank gives its label a column and its input the rest', () => {
    const row = app.get('.kata-row') ?? {};
    assert.equal(row.display, 'grid');
    assert.match(row['grid-template-columns'] ?? '', /minmax\(0, 1fr\)/, 'the input column must be able to shrink');
    assert.ok(app.get('.kata-row-label'), 'a row has no label class');
    assert.ok(app.get('html.dark .kata-row'), 'a row has no dark-mode rule');
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
