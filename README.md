# Deujo 🥋🇩🇪 
[![Built with Claude](https://vibecoded.fyi/badges/flat/llms/claude.svg)](https://vibecoded.fyi/)
[![Coded with GitHub Copilot](https://vibecoded.fyi/badges/flat/agents/github-copilot.svg)](https://vibecoded.fyi/) 
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Step onto the tatami and sharpen your German grammar with [**Deujo** (Deutsch-Dojo)](https://deujo.glenacota.me).
Deujo is a fluff-free training hall designed to build muscle memory for German grammar.

Just pure, disciplined practice.

> 🚨 ***DISCLAIMER**: I created this project with two goals: practice German grammar with this simple app, and practice vibe coding by building it.*


## ⛩️ Features
- **Noun & Plural** sparring ring: Practice genders and plural forms side-by-side.
- **Verb Conjugation** katas: Train Präsens, Präteritum, and Perfekt tenses.
- **Verb Charts**: Strike the `?` key to instantly view the complete conjugation chart.
- **Cases**: Train Dativ, Genitiv, Akkusativ, and Nominativ cases.
- **Prepositions**: Fill in the preposition *and* the case its article takes, including the contracted forms (`zum`, `im`, `aufs`). A contraction and its written-out form are both correct: `zum` and `zu dem`, `ins` and `in das`.
- **Just a spoon of gamification**: Unlock higher belt levels, hold your streak stance, and celebrate milestones.
- **Leitner spaced repetition**: Three boxes space reviews over time. New items and due items are eligible; due items are selected uniformly, with the 10 most recently shown items skipped when possible. Correct answers move items up one box: box 0 waits 2 days, while boxes 1 and 2 wait 9 days. Box 2 is the maximum. Wrong answers reset items to box 0 and make them due immediately. If no item is due, selection falls back to the available pool. Progress is saved locally.
- **Kiai! Sound FX**.
- **Settings**: press `,` or use the gear button in the footer. Theme (System / Light / Dark), sound effects with a test tone, confetti, animations, and hotkeys. Clearing the progress stored in this browser is behind a confirmation in a danger zone.


## ⚔️ Tech Stack
* HTML5 & Tailwind CSS (Night-vision Dark Mode ready 🌙)
* Vanilla JS ES6+ (No heavy dependencies—lightning-fast strikes)
* Web Audio API & HTML5 Canvas (Synthesized sound & visual effects)

## 🥋 Enter the Dojo (Quick Start)
Because the app fetches local JSON datasets (in `./assets/`), serve it via a local HTTP server instead of opening index.html directly.

```console
# 1. Enter the training ground
git clone https://github.com/glenacota/deujo.git
cd deujo

# 2. Open the dojo doors (Node or Python)
npx serve .
# ...or
python -m http.server 8000
```

Point your browser to http://localhost:8000 and begin your first kata! 🚀

## 📜 Add a Kata or Dataset
To add exercises to an existing kata, append entries to its JSON file in `assets/datasets/`. Keep each entry in that kata's existing schema; its `validateDataset()` function defines required fields and constraints.

### Several correct answers for one blank
A blank can have more than one right answer, so a correct variant is never scored wrong. Two mechanisms cover it:

- **Grammar-derived, no data needed.** A contractable preposition phrase accepts both spellings, whichever one the dataset stored: `zum` and `zu dem` are each correct for the other. Same for `im`/`in dem`, `ins`/`in das`, `am`/`an dem`, `ans`/`an das`, `beim`/`bei dem`, `vom`/`von dem`, `aufs`/`auf das`, and `zur`/`zu der`. A phrase that cannot contract (`auf den`, `durch die`) keeps one spelling.
- **`alt` in the data**, for alternatives the grammar service cannot derive. Replace the answer string with `{ "a": "<primary>", "alt": ["<also correct>", ...] }`:

```json
{"w":"Name","g":"der","m":"name","p":{"a":"Namen","alt":["Names"]},"id":"n_5b2a8e1a"}
```

`alt` works on a case or preposition blank (`{"a":"in das","c":"akk","alt":["ins Büro"]}`), on a noun plural (`p`), and on a verb form inside `pres` / `praet` / `perf`. `validateDataset()` checks every entry, so a malformed `alt` fails at load instead of leaving a blank the learner can never fill. When an answer is wrong, the correction next to the blank lists every accepted spelling.

`cases` and `nouns` also accept the article typed with the noun that follows it (`der Mann` for a blank holding `der`), and the noun kata accepts the plural with or without its article (`die Bäume` or `Bäume`).

To add a kata:
1. Add `assets/js/katas/<id>/manifest.js`, `template.js`, and `kata.js`, plus `assets/datasets/<id>.json`.
2. Give the manifest a unique `id`, `name`, `subtitle`, `datasetUrl`, `helpTitle`, and `accent`. `accent` must be one of the keys in `CONFIG.accents` (`assets/js/config.js`). To add a colour, add it there and run `npm run build:css` — `tests/unit/css-contract.test.js` fails until the class is in the generated stylesheet.
3. Export a `create...Kata(container)` factory from `kata.js`. It takes the element that holds the kata sections and **mounts the kata itself**: parse your template, append the `[data-role="section"]` it produces, and assign it to `el.section`. There is no separate `mount()` step — every kata is mounted when `loadKatas()` runs at boot, so `el.section` is never null. Any event listeners your controls need are wired in the factory too.
4. Return the manifest fields, `el`, and these methods: `render(item)`, `check(item)`, `getHelpContent(item)`, and `validateDataset(dataset)`.
5. Make `validateDataset()` reject anything except a non-empty array of entries matching your kata's schema. `check()` returns `{ correct, fields }`, `{ warning }`, or `null`; `getHelpContent()` returns an HTML string.
6. Import the factory in `assets/js/katas/registry.js` and add its call to `loadKatas()`, passing `container` through.
7. Grade typed text through `matchAnswer(given, answer, options)` from `assets/js/services/answer-matcher.js`, not with a direct string compare, so the learner gets every accepted answer the blank allows. Use `acceptedAnswers(answer)` to show the primary spelling, and `formatAccepted(accepted)` to render the list in a note.

`el` is populated at construction and read-only afterwards; only per-item selection state (like the selected gender) changes. `validateKata` asserts `el.section` is a real element, so a factory that forgets to mount fails at boot rather than on a keypress.

Use unique IDs and keep dataset paths relative to the site root. Escape dataset text inserted into HTML; prefer `textContent` for plain text. Tailwind scans `index.html` and `assets/js/**/*.js`, so use literal class names and a supported accent. `npm test` checks every registered kata contract and validates all shipped datasets.

## 🧪 Tests
Unit tests run on the Node.js built-in test runner. No test dependencies. A thin Playwright layer covers the few things Node cannot reach: real focus trapping, real key events, the confetti canvas, and the whole run at phone width.

```console
npm test               # unit tests
npm run test:e2e       # browser smoke tests (chromium, iPhone 13 mini viewport)
npm run test:all       # both
node --test tests/unit/state.test.js   # run one unit file
npx playwright test --headed           # watch the browser run
```

Rules of the harness:
- Unit tests live in `tests/unit/*.test.js` and are picked up by `npm test`.
- `tests/helpers/browser-stub.js` installs minimal `localStorage`, `window`, and `document` globals so DOM-adjacent modules import in Node. Call it before the dynamic `import()` of any module that touches those globals.
- `tests/helpers/browser-stub.js` is import-only: it has no `createElement`. Tests that need elements use `installDomStub()` from `tests/helpers/dom-stub.js`, which adds `createElement` / `createDocumentFragment` / `createTextNode` immediately rather than in a `beforeEach` — kata factories run at module scope in `tests/unit/katas.test.js`. It is enough to mount, render, and grade a kata end to end.
- Browser tests live in `tests/e2e/*.spec.js`, run from `playwright.config.js`, and start `tests/e2e/server.mjs` automatically. One-time setup: `npm install && npx playwright install chromium`.
- The browser layer is deliberately a smoke test, not a second coverage suite. Keep it to the critical path; anything expressible as a pure function belongs in a unit test.
- `Math.random` is seeded before the app boots, so a kata and its answers are reproducible. Never mock a module there: drive the real UI.

## 🎨 Rebuilding the stylesheet
The production Tailwind CSS is a committed, static file (`assets/css/tailwind.css`) generated at build time — no CDN compiler runs in the browser. Node is only needed if you change Tailwind classes or `tailwind.config.cjs`.
Tailwind provides utility classes; `assets/css/app.css` owns answer-state colors through `data-answer-state` attributes.

```console
npm install
npm run build:css     # one-shot production build (minified)
npm run watch:css      # rebuild on file changes while developing
```

## 🤗 OSS!
Forged under the MIT License.