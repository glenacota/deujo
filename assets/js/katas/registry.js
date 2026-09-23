// kata/registry.js
// The only place that knows which katas exist.
// To add one: drop `<name>.js` in this folder and append its path here.

import { createVerbKata } from './verbs.js';

const MODULES = ['./nouns.js', './cases.js'];

export async function loadKatas() {
    const loaded = await Promise.all(MODULES.map((path) => import(path)));
    return [
        ...loaded.map((m) => m.default),
        createVerbKata('pres'),
        createVerbKata('praet'),
        createVerbKata('perf'),
    ].filter((p) => p?.id && p?.el?.tab);
}