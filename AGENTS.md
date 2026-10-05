# AGENTS.md

Static German-grammar drill app. Vanilla HTML/CSS/JS, ES modules, no bundler,
no backend, no login.

## Setup & commands
- Serve locally: `npx serve .` (the app `fetch()`s local JSON datasets, so it
  needs a real HTTP server — opening `index.html` via `file://` will fail).
- Run unit tests: `npm test`
- Run browser smoke tests: `npm run test:e2e` (first time: `npx playwright
  install webkit chromium` — both engines are needed, see Testing expectations).
  It boots `tests/e2e/server.mjs` itself — no server needed.
- Run one test file: `node --test tests/unit/<name>.test.js`,
  `npx playwright test -g "<name>"`
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
  not grammatical correctness (see Known Issues).

## Rules (non-negotiable)

- Prefer small, localized edits that match the existing ES module style.
- Any dynamic string reaching `innerHTML` must be pre-escaped with
  `escapeHtml()` first. The one trusted-HTML sink is
  `UiController#showHelpContent` — its `html` argument must already be escaped,
  so it does not escape for you.
- Every kata ships a `validateDataset()`, and `npm test` must exercise it
  against that kata's shipped JSON (see `tests/unit/katas.test.js`). A new
  kata or dataset without this is incomplete.
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
  WebKit implements no sequential focus navigation — on a bare page with three
  buttons, Tab moves focus nowhere and `document.hasFocus()` goes false — so
  those specs run in the `iphone-13-mini-chromium` project and the WebKit one
  skips them. WebKit stays the default because it is the engine on iOS and the
  only one that deviates from the others.
- New persisted keys go under the `dm_` prefix (`CONFIG.storage.prefix`) so
  `Storage.removeByPrefix()` — used by the Settings "clear progress" danger
  zone — stays exhaustive. `tests/unit/storage-contract.test.js` enforces the
  prefix, and keeps the key literals in `index.html`'s pre-paint script in sync
  with `CONFIG.storage` — that script cannot import a module, so nothing else
  can catch it drifting.
- A kata's phase (answering vs reviewing) belongs to that kata and lives in
  `Session` (`assets/js/session.js`). Do not reintroduce a single app-wide phase
  field: the Check/Skip bar is global chrome, so a global phase makes the "a
  graded item is never served again" guard agree with the active kata by
  accident rather than by construction.
- Belt arithmetic lives in `assets/js/belt-rules.js`, not on `GameState`. It is
  pure and touches no host global, which is what lets
  `tests/unit/belt-rules.test.js` pin a promotion landing one fifth into the new
  belt without standing up a `localStorage` stub first. Reach for those
  functions rather than re-deriving `progress / milestoneInterval` inline; the
  rounding in `addPoints` is what keeps float dust out of storage.
- A shortcut that must not act still has to claim its key. Backspace decides in
  `run` whether to leave a kata, but `matches` always claims it: Safari's
  default for an unclaimed Backspace is "go back", which navigates the learner
  out of the drill. It also cannot rely on `document.activeElement` alone,
  because Safari does not focus a `<button>` on click — hence the separate
  "pressed since the last key" signal.
- No framework, no bundler, no runtime dependency beyond a same-origin JSON
  `fetch()`.
- Services must stay DOM-free and pure.