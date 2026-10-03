# Deujo 🥋🇩🇪 
[![Built with Claude](https://vibecoded.fyi/badges/flat/llms/claude.svg)](https://vibecoded.fyi/)
[![Coded with GitHub Copilot](https://vibecoded.fyi/badges/flat/agents/github-copilot.svg)](https://vibecoded.fyi/) 
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Step onto the tatami and sharpen your German grammar with [**Deujo** (Deutsch-Dojo)](https://deujo.glenacota.me).
Deujo is a fluff-free training hall designed to build muscle memory for German grammar.

Just pure, disciplined practice.

> 🚨 ***DISCLAIMER**: I created this project with two goals: practice German grammar with this simple app, and practice vibe coding by building it.*


## ⛩️ Features
- **Noun & Plural** sparring ring: practice genders and plural forms side-by-side.
- **Verb Conjugation** katas: train Präsens, Präteritum, and Perfekt, with a full conjugation chart on `?`.
- **Cases**: train Dativ, Genitiv, Akkusativ and Nominativ.
- **Prepositions**: fill in the preposition *and* the case its article takes, including the contracted forms (`zum`, `im`, `aufs`).
- **Just a spoon of gamification**: unlock higher belt levels, hold your streak stance, and celebrate milestones.
- **Leitner spaced repetition**: three boxes space reviews over time, so due items come back and new ones wait. Progress is saved locally.
- **Kiai! Sound FX**.
- **Settings**: press `,` or use the gear button in the footer. Theme, sound effects, confetti, animations and hotkeys. Clearing stored progress sits behind a confirmation in a danger zone.

## ⚔️ Tech Stack
* HTML5 & Tailwind CSS (Night-vision Dark Mode ready 🌙)
* Vanilla JS ES6+ (No heavy dependencies—lightning-fast strikes)
* Web Audio API & HTML5 Canvas (Synthesized sound & visual effects)

## 🥋 Enter the Dojo (Quick Start)
The app fetches its JSON datasets from `./assets/`, so serve it over HTTP — opening `index.html` from the filesystem will fail.

```console
git clone https://github.com/glenacota/deujo.git
cd deujo
npx serve .            # or: python -m http.server 8000
```

Then open http://localhost:8000 and begin your first kata! 🚀

## 📜 Add a Kata or Dataset

To add exercises to an existing kata, append entries to its JSON file in `assets/datasets/`. Each entry must match that kata's existing schema, which its `validateDataset()` defines and enforces.

### Several correct answers for one blank

A blank can have more than one right answer, so a correct variant is never scored wrong. Two mechanisms cover it:

- **Grammar-derived, no data needed.** A contractable preposition phrase accepts both spellings, whichever one the dataset stored: `zum` and `zu dem` are each correct for the other, as are all nine standard contractions in `PREPOSITION_CONTRACTIONS` (`grammar.js`). A phrase that cannot contract (`auf den`, `durch die`) keeps one spelling.
- **`alt` in the data**, for alternatives the grammar service cannot derive. Replace the answer string with `{ "a": "<primary>", "alt": ["<also correct>", ...] }`:

```json
{"w":"Name","g":"der","m":"name","p":{"a":"Namen","alt":["Names"]},"id":"n_5b2a8e1a"}
```

`alt` works on a case or preposition blank, on a noun plural (`p`), and on a verb form inside `pres` / `praet` / `perf`. A malformed `alt` fails at load rather than leaving a blank the learner can never fill, and when an answer is wrong the correction beside the blank lists every accepted spelling.

To add a whole new kata:

1. Add `assets/js/katas/<id>/manifest.js`, `template.js` and `kata.js`, plus `assets/datasets/<id>.json`.
2. The manifest needs a unique `id`, `name`, `subtitle`, `datasetUrl`, `helpTitle` and an `accent` that exists in `CONFIG.accents`. Adding a colour means adding it there *and* running `npm run build:css`.
3. Export a `create...Kata(container)` factory that parses the template, mounts its `[data-role="section"]` into the container and assigns it to `el.section`. There is no separate mount step: every kata is mounted when `loadKatas()` runs, so `el.section` is never null.
4. Return the manifest fields, `el`, and `render(item)`, `check(item)`, `getHelpContent(item)` and `validateDataset(dataset)`. `check()` returns either `{ correct, fields }` or `{ warning }` — never null, and never `correct` alongside a warning.
5. Grade typed text through `matchAnswer()` from `services/answer-matcher.js`, never a direct string compare, so the learner gets every accepted answer. Show the primary spelling with `acceptedAnswers()` and the full list with `formatAccepted()`.
6. Register the factory in `assets/js/katas/registry.js`.

Keep ids unique and dataset paths relative to the site root. Tailwind scans `index.html` and `assets/js/**/*.js`, so use literal class names. `npm test` validates every registered kata and every shipped dataset.

## 🧪 Tests

```console
npm test               # unit tests
npm run test:e2e       # browser smoke tests (chromium, iPhone 13 mini viewport)
npm run test:all       # both
node --test tests/unit/state.test.js          # one unit file
npx playwright install chromium               # first time only
```

`npm test` runs on Node's built-in test runner with no test dependencies. The Playwright layer is a deliberately small smoke test for what Node cannot reach: real focus trapping, real key events, the confetti canvas, and the whole run at phone width. See `AGENTS.md` for the conventions both layers follow.

## 🎨 Rebuilding the stylesheet

`assets/css/tailwind.css` is committed and generated at build time — no CDN compiler runs in the browser. Node is only needed if you change Tailwind classes or `tailwind.config.cjs`.

```console
npm run build:css     # one-shot minified build
npm run watch:css     # rebuild on change while developing
```

## 🤗 OSS!
Forged under the MIT License.