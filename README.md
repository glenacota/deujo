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

`alt` works for case and preposition answers, noun plurals (`p`), and verb forms (`pres`, `praet`, `perf`). Preposition contractions are accepted automatically when valid. Invalid `alt` data fails validation.

### Add a kata

1. Create `assets/js/katas/<id>/` with `manifest.js`, `template.js`, `kata.js`, `help.js`, and `lesson.js`. Add the dataset at `assets/datasets/<id>.json`.
2. Export a `create...Kata(container)` factory. Mount its section and return `id`, `name`, `subtitle`, `datasetUrl`, `accent`, `el.section`, `render(item)`, `check(item)`, `getHelpContent()`, and `validateDataset(dataset)`. `check()` returns `{ correct, fields }` or `{ warning }`. Keep help answer-blind.
3. Add the factory to `assets/js/katas/registry.js`. Use a unique ID, a site-root-relative `datasetUrl`, and an accent from `CONFIG.accents`.
4. Grade answers with `matchAnswer()` from `assets/js/services/answer-matcher.js`. Use `acceptedAnswers()` and `formatAccepted()` to show accepted spellings.
5. Use literal Tailwind class names. Run `npm test`. If you add Tailwind classes or an accent, update `CONFIG.accents` if needed, then run `npm run build:css`.

#### Or, if it is a fill-in-the-blank sentence kata

If your dataset sentences carry `{0}`, `{1}` placeholders and each blank has an answer, you do not need a grader or a template of your own. `assets/js/katas/factories/` already has the whole path: mounting, the blank inputs, the empty-blank guard, the note beside a wrong answer, and the dataset check.

Write `template.js` as one line and `kata.js` as configuration. `katas/cases/` is a 43-line worked example:

```js
// katas/<id>/template.js
export const myTemplate = sentenceTemplate('Fill in the article');

// katas/<id>/kata.js
export const createMyKata = (container) => createSentenceKata({
    manifest: myManifest,
    template: myTemplate,
    help: renderMyHelp,                    // answer-blind
    input: { maxLength: 20, size: 6, className: 'blank-input blank-input--inline' },
    isUsableAnswer: (blank) => MY_CASES.includes(blank?.c),
    describeProblem: (index) => `entry ${index} has an invalid blank`,
    lessonFor: (miss) => renderMyLesson(miss),
})(container);
```

Only three things are yours to decide: what counts as a legal answer, what the correction panel teaches, and how the inputs look. `expectedFor` overrides which spelling a miss shows, and `matchOptions` reaches `matchAnswer` — `cases` uses `{ allowExtraWords: true }` so the learner may type the noun along with the article.

One trap worth knowing: `lessonFor` is called on **every** verdict, including a correct one, where there is no miss to teach. Read `miss?.expected` rather than `miss.expected`.

## 🧪 Tests

```sh
npm test                                  # unit tests
npm run test:e2e                          # browser smoke tests
npm run test:all                          # both
node --test tests/unit/state.test.js
npx playwright install webkit chromium    # first run only
```

Unit tests use Node's built-in runner. Playwright tests cover critical browser paths, including mobile viewport behavior, and run on WebKit — the engine on iOS — except for the specs that press Tab, since headless WebKit does not implement focus navigation. See `AGENTS.md` for test conventions.

GitHub Actions runs `npm test`, the browser tests, and a check that `assets/css/tailwind.css` still matches what `npm run build:css` produces. That last one exists because Tailwind only emits the utilities it finds in a scanned file: a class you name but never rebuild renders as no styling, and nothing else fails.

## 🎨 Rebuilding the stylesheet

`assets/css/tailwind.css` is committed. Rebuild it after changing Tailwind classes or `tailwind.config.cjs`:

```sh
npm run build:css   # one-shot build
npm run watch:css   # rebuild on change
```

## 🤗 OSS!
Forged under the MIT License.