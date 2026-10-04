# AGENTS.md

Static German-grammar drill app. Vanilla HTML/CSS/JS, ES modules, no bundler,
no backend, no login.

## Setup & commands
- Serve locally: `npx serve .` (the app `fetch()`s local JSON datasets, so it
  needs a real HTTP server — opening `index.html` via `file://` will fail).
- Run unit tests: `npm test`
- Run browser smoke tests: `npm run test:e2e` (first time: `npx playwright
  install webkit`). It boots `tests/e2e/server.mjs` itself — no server needed.
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
- New persisted keys go under the `dm_` prefix (`CONFIG.storage.prefix`) so
  `Storage.removeByPrefix()` — used by the Settings "clear progress" danger
  zone — stays exhaustive.
- No framework, no bundler, no runtime dependency beyond a same-origin JSON
  `fetch()`.
- Services must stay DOM-free and pure.