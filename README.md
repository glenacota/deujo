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
- **Just a spoon of gamification**: Unlock higher belt levels, hold your streak stance, and celebrate milestones.
- **Kiai! Sound FX**.


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

To add a kata:
1. Add `assets/js/katas/<id>/manifest.js`, `template.js`, and `kata.js`, plus `assets/datasets/<id>.json`.
2. Give the manifest a unique `id`, `name`, `subtitle`, `datasetUrl`, and `accent`. Dashboard accents must be `indigo`, `teal`, or `purple`.
3. Export a `create...Kata()` factory from `kata.js`. Return the manifest fields, `el` with `kata`, `section`, and `cardBelt`, and these methods: `mount(container)`, `render(item)`, `check(item)`, `getHelpContent(item)`, and `validateDataset(dataset)`.
4. In `mount`, create and append one `[data-role="section"]` from your template. Set `el.section` and connect `el.kata` to `kata-<id>` and `el.cardBelt` to `belt-<id>`.
5. Make `validateDataset()` reject anything except a non-empty array of entries matching your kata's schema. `check()` returns `{ correct, message }`, `{ warning }`, or `null`; `getHelpContent()` returns an HTML string.
6. Import the factory in `assets/js/katas/registry.js` and add its call to `loadKatas()`.

Use unique IDs and keep dataset paths relative to the site root. Escape dataset text inserted into HTML; prefer `textContent` for plain text. Tailwind scans `index.html` and `assets/js/**/*.js`, so use literal class names and a supported accent.

## 🎨 Rebuilding the stylesheet
The production Tailwind CSS is a committed, static file (`assets/css/tailwind.css`) generated at build time — no CDN compiler runs in the browser. Node is only needed if you change Tailwind classes or `tailwind.config.js`.

```console
npm install
npm run build:css     # one-shot production build (minified)
npm run watch:css      # rebuild on file changes while developing
```

## 🤗 OSS!
Forged under the MIT License.