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

## 📜 Expand your Kataset
Add new fuel to your arsenal by extending `./assets/nouns.json` , `./assets/verbs.json`, or  `./assets/cases.json`.

## 🎨 Rebuilding the stylesheet
The production Tailwind CSS is a committed, static file (`assets/css/tailwind.css`) generated at build time — no CDN compiler runs in the browser. Node is only needed if you change Tailwind classes or `tailwind.config.js`.

```console
npm install
npm run build:css     # one-shot production build (minified)
npm run watch:css      # rebuild on file changes while developing
```

## 🤗 OSS!
Forged under the MIT License.