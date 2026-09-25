// kata/registry.js
// The only place that knows which katas exist.
// To add one: drop `<name>.js` in this folder and append its path here.

import { createNounKata } from './nouns/kata.js';
import { createCaseKata } from './cases/kata.js';
import { createVerbKata } from './verbs/verb.js';

/**
 * @typedef {Object} Kata
 * @property {string} id
 * @property {string} name
 * @property {string} subtitle
 * @property {string} datasetUrl
 * @property {string} accent Tailwind color name driving the dashboard card's hover border.
 * @property {{kata: HTMLElement|null, section: HTMLElement|null, cardBelt: HTMLElement|null}} el
 * @property {function(): void} mount
 * @property {function(Object): void} render
 * @property {function(Object): Object|null} check
 * @property {function(Object|null): string} getHelpContent
 * @property {function(Array): void} validateDataset
 */

/** @param {Kata} kata */
export function validateKata(kata) {
    const requiredStrings = ['id', 'name', 'subtitle', 'datasetUrl', 'accent'];
    const requiredFunctions = ['mount', 'render', 'check', 'getHelpContent', 'validateDataset'];

    if (!kata || typeof kata !== 'object') {
        throw new Error('Kata must be an object.');
    }

    requiredStrings.forEach((field) => {
        if (typeof kata[field] !== 'string' || !kata[field].trim()) {
            throw new Error(`Kata "${kata.id ?? 'unknown'}" requires non-empty ${field}.`);
        }
    });

    requiredFunctions.forEach((field) => {
        if (typeof kata[field] !== 'function') {
            throw new Error(`Kata "${kata.id}" requires ${field}().`);
        }
    });

    ['kata', 'section', 'cardBelt'].forEach((field) => {
        if (!Object.hasOwn(kata.el ?? {}, field)) {
            throw new Error(`Kata "${kata.id}" requires el.${field}.`);
        }
    });

    return kata;
}

export function loadKatas() {
    return [
        createNounKata(),
        createCaseKata(),
        createVerbKata('pres'),
        createVerbKata('praet'),
        createVerbKata('perf'),
    ].map(validateKata);
}