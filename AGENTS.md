# AGENTS.md

Static German-grammar drill app. Vanilla HTML/CSS/JS, ES modules, no bundler,
no backend, no login.

## Setup & commands
- Serve locally: `npx serve .` (the app `fetch()`s local JSON datasets, so it
  needs a real HTTP server — opening `index.html` via `file://` will fail).
- Run unit tests: `npm test`
- Run the linter: `npm run lint` (`npm run lint:fix` to apply). ESLint covers
  hygiene only; structural rules live in `tests/unit/module-boundaries.test.js`.
- Run browser smoke tests: `npm run test:e2e` (first time: `npx playwright
  install webkit chromium` — both engines are needed, see the `@tab-navigation`
  rule). It boots `tests/e2e/server.mjs` itself.
- Run one test file: `node --test tests/unit/<name>.test.js`,
  `npx playwright test -g "<name>"`
- Everything CI runs: `npm run test:all`
- Rebuild Tailwind after changing class names: `npm run build:css` (or
  `npm run watch:css` while developing).

## Testing expectations
- Tests live in `tests/unit/*.test.js` on Node's built-in test runner — no
  jsdom. `tests/helpers/browser-stub.js` installs minimal
  `localStorage`/`window`/`document` globals; call it before dynamically
  importing any module that touches those globals.
- Changing a kata or dataset requires: (1) the dataset still passes its
  `validate*Dataset()`, (2) `tests/unit/katas.test.js` stays green, (3) any
  new grammar-dependent entry is manually cross-checked against
  `grammar.js`'s preposition/case tables — schema validation checks *shape*,
  not grammatical correctness.

## Rules (non-negotiable)

- Prefer small, localized edits that match the existing ES module style.
- Any dynamic string reaching `innerHTML` must be pre-escaped with
  `escapeHtml()` first. The one trusted-HTML sink is
  `UiController#showHelpContent` — its `html` argument must already be escaped,
  so it does not escape for you.
- Every kata ships a `validateDataset()`, and `npm test` must exercise it
  against that kata's shipped JSON (see `tests/unit/katas.test.js`). A new
  kata or dataset without this is incomplete.
- A fill-in-the-blank kata (dataset sentences using `{n}` placeholders) builds
  on `katas/factories/picker-kata.js` and `pickerTemplate()`, and declares only
  what differs: `cases` (which cases step one offers), `prompt` (what it asks),
  `lessonFor`, `describeProblem`, and `entryRule` when its step one needs
  something its sentence has to contain — the preposition kata rejects an entry
  with no preposition in front of a blank rather than falling back at runtime to
  the case kata's question, which a learner cannot tell apart.
  Do not copy a grader or a section template out of `cases/` or
  `prepositions/`. `tests/unit/picker-kata.test.js` covers the shared path.
  `lessonFor` runs once per wrong blank, so read `miss?.given`, not `miss.given`.
- A picker grades its two stages **separately**: a learner who names Dativ and
  then picks "seinen" has two mistakes. `check()` compares the picked `caseKey`
  against `blank.c` *and* the picked form against `blank.a`; never collapse them
  into one string match. Grade once: `grade()` builds the verdicts, and
  `check()`, the slot marks and the verdict lessons all read that one result.
  `blank.c` is off limits to `prompt`, or step one would print its own answer.
- A picker blank holds a **determiner**, never a whole prepositional phrase: the
  preposition stays in the sentence, so step one is answerable from German alone.
  `determinerOptions()` in `services/` generates the step-two buttons from the
  grammar tables, so no distractor is hand-authored. `validatePickerDataset`
  refuses any answer the picker cannot put on a button: a form from the wrong
  case, a noun, or an `alt` list.
- Every option, in every kata, is picked by tap or by the digit printed on its
  left. Step one is 1–4 and step two 5–8, disjoint because both rows are on
  screen at once. `OPTION_ROW_SIZE` in `services/determiner-options.js` is the row
  width; step two's range starts one row further on.
  `platform/dom/option-digits.js` owns the digit pairing, `ui/keyboard-shortcut.js`
  binds it, and `KataFlow.pickOption` routes it to the kata's `pickOption`
  (`ui/` and `katas/` are peers and may not import each other). `pickOption`
  **must** return false when no option carries the digit — one from the other
  stage, or past the end of the row — so the key stays with the page. The funnel
  keeps its own digit list; `picker-kata.test.js` fails when it disagrees with
  `OPTION_ROW_SIZE`.
- A kata's public surface is its `el.section` and nothing else. `registry.js`
  fails a kata without it, and `focus-view.js` and `app.js` reach a kata through
  that one field. Keep every other render target in the factory's closure.
- Every kata shows a verdict the same way. A control (option button, text
  input, picker `.pick-slot`) gets `markControl()`: the `[data-answer-state]`
  palette plus a ✅/❌ badge, inside the control. Nothing else marks a control: no
  correct answer beside a wrong one, no inline note, no review list. The wanted
  answer of **each** wrong field goes to the verdict panel only, as one entry of
  `check()`'s `lessons` (`{label?, form, note}`: the answer, and the short rule
  behind it). A right answer yields no lesson. The panel fills them with
  `textContent`.
- One kata surface, in `app.css`: section padding, headline, gloss, caption,
  control block and option button are `.kata-*` classes, so a template says only
  what differs. Do not hand-style a button with a Tailwind utility;
  `css-contract.test.js` fails any option outside `.kata-option`.
- The prompt uses two type sizes: a word takes the display size, a sentence the
  prose size, one step apart. One size would wrap long sentences to many lines on
  a phone. The caption is one sentence-case class with **no variants**.
- A kata's help body lives in `<id>/help.js` as a pure function and is built from
  the helpers in `katas/help-kit.js`. Help must be **answer-blind**: it takes no
  item, or ignores it, so the modal cannot print the answer to the question on
  screen. Worked examples are fixed nouns/verbs, never the current item, and a
  `der X → die Y` example in the help has to be one the shipped dataset actually
  contains.
- The Playwright layer in `tests/e2e/` is a smoke test for the critical path,
  not a parallel coverage effort. It stays small: `critical-path.spec.js` for
  the main loop, `regression-path.spec.js` for the destructive and
  negative-feedback paths. Anything expressible as a pure function belongs in
  a unit test instead. No module mocking there: drive the real UI, and seed
  `Math.random` for repeatability.
- A spec that presses Tab must carry `@tab-navigation` in its title. Headless
  WebKit implements no sequential focus navigation, so those specs run in the
  `iphone-13-mini-chromium` project and the WebKit project skips them. WebKit
  stays the default because it is the engine on iOS.
- New persisted keys go under the `dm_` prefix (`CONFIG.storage.prefix`) so
  `Storage.removeByPrefix()` — used by the Settings "clear progress" danger
  zone — stays exhaustive. `tests/unit/storage-contract.test.js` enforces the
  prefix, and keeps the key literals in `index.html`'s pre-paint script (which
  cannot import a module) in sync with `CONFIG.storage`.
- A kata's phase (answering vs reviewing) belongs to that kata and lives in
  `Session` (`assets/js/session.js`). Do not add an app-wide phase field: the
  Check/Skip bar is global chrome, so a global phase would guard "a graded item
  is never served again" only by accident.
- Belt arithmetic lives in `assets/js/belt-rules.js`, not on `GameState`. It is
  pure, so `tests/unit/belt-rules.test.js` needs no `localStorage` stub. Use its
  functions rather than re-deriving `progress / milestoneInterval` inline.
- A shortcut that must not act still has to claim its key. Backspace decides in
  `run` whether to leave a kata, but `matches` always claims it: Safari's default
  for an unclaimed Backspace is "go back". It cannot rely on
  `document.activeElement` alone, because Safari does not focus a `<button>` on
  click — hence the separate "pressed since the last key" signal.
- No framework, no bundler, no runtime dependency beyond a same-origin JSON
  `fetch()`.
- Services must stay DOM-free and pure: no `document`, `window`, `localStorage`,
  or any other host global. Anything that reaches one is a host adapter, and
  belongs in `platform/`.
- The layer order is `services/` → `platform/` → `ui/` and `katas/`, with
  `app.js` as the only module allowed to see every layer. `ui/` and `katas/`
  are peers: they must not import each other, which is why answer marking lives
  in `platform/dom/` rather than in `ui/`. A DOM primitive both peers need goes
  in `platform/dom/`; a pure function goes in `services/`; anything reaching a
  host global goes in `platform/`.
  `tests/unit/module-boundaries.test.js` enforces this: it fails on a sideways
  or upward import, a cycle, an unresolved specifier, or a host global in
  `services/`.
