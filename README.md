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
- **Verb Conjugation** katas: train Präsens, Präteritum, and Perfekt, with a worked conjugation example on `?`.
- **Cases**: name the case a blank takes, then pick the matching determiner.
- **Prepositions**: name the case a preposition governs, then pick the determiner, including contracted forms (`zum`, `im`, `aufs`).
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

```sh
git clone https://github.com/glenacota/deujo.git
cd deujo
npx serve .
```

Open the URL printed by `serve`.

## 📜 Add a Kata or Dataset

### Add dataset entries

Append entries to the kata's JSON file in `assets/datasets/`. Match its existing schema; `validateDataset()` enforces required fields and types. Run `npm test` after changing data.

Use `alt` when one blank accepts multiple spellings that grammar rules cannot derive:

```json
{"w":"Name","g":"der","m":"name","p":{"a":"Namen","alt":["Names"]},"id":"n_5b2a8e1a"}
```

`alt` works for noun plurals (`p`) and verb forms (`pres`, `praet`, `perf`). Case and preposition blanks are picked from buttons, so their answers take no `alt`; validation rejects it.

### Add a kata

1. Create `assets/js/katas/<id>/` with `manifest.js`, `template.js`, `kata.js`, `help.js`, and `lesson.js`. Add the dataset at `assets/datasets/<id>.json`.
2. Export a `create...Kata(container)` factory. Mount its section and return `id`, `name`, `subtitle`, `datasetUrl`, `accent`, `el.section`, `render(item)`, `check(item)`, `getHelpContent()`, and `validateDataset(dataset)`. `check()` returns `{ correct, fields }` or `{ warning }`. Keep help answer-blind.
3. Add the factory to `assets/js/katas/registry.js`. Use a unique ID, a site-root-relative `datasetUrl`, and an accent from `CONFIG.accents`.
4. Grade answers with `matchAnswer()` from `assets/js/services/answer-matcher.js`. Use `acceptedAnswers()` and `formatAccepted()` to show accepted spellings.
5. Use literal Tailwind class names. Run `npm test`. After adding Tailwind classes or an accent, run `npm run build:css`.

#### Fill-in-the-blank sentence kata

For dataset sentences with `{0}`, `{1}` placeholders, build on `assets/js/katas/factories/picker-kata.js` instead of writing a grader or template. The learner names the case, then picks the determiner. `katas/cases/kata.js` is a worked example:

```js
export const createMyKata = (container) => createPickerKata({
    manifest: myManifest,
    template: pickerTemplate(),
    help: renderMyHelp,        // answer-blind
    prompt: askCase,           // (item, blank, index) => step-one question
    cases: MY_CASES,
    lessonFor: renderMyLesson,
    describeProblem,
    entryRule,                 // optional extra dataset rule
})(container);
```

`lessonFor` runs on **every** verdict, including a correct one. Read `miss?.given`, not `miss.given`.

## 🧪 Tests

```sh
npm run lint                             # ESLint, hygiene only
npm test                                 # unit tests
npm run test:e2e                         # browser smoke tests
npm run test:all                         # all three, as CI runs them
node --test tests/unit/state.test.js
npx playwright install webkit chromium   # first run only
```

Unit tests use Node's built-in runner. Playwright tests cover critical browser paths, including mobile viewport behavior, and run on WebKit — the engine on iOS — except for the specs that press Tab, since headless WebKit does not implement focus navigation. See `AGENTS.md` for test conventions.

ESLint covers hygiene only. Architectural rules live in `tests/unit/module-boundaries.test.js`, which reads the real import graph: no layer imports sideways or upward, and nothing under `services/` names a host global.

GitHub Actions runs `npm run test:all`, plus a check that `assets/css/tailwind.css` matches `npm run build:css` output. A Tailwind class without a rebuild renders unstyled and nothing else fails.

## 🎨 Rebuilding the stylesheet

`assets/css/tailwind.css` is committed. Rebuild it after changing Tailwind classes or `tailwind.config.cjs`:

```sh
npm run build:css   # one-shot build
npm run watch:css   # rebuild on change
```

## 🤗 OSS!
Forged under the MIT License.
