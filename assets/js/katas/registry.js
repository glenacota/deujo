// kata/registry.js
// The only place that knows which katas exist.
// To add one: drop `<name>.js` in this folder and append its factory call here.
//
// Each factory mounts its own section into the container it is given, so a
// kata's `el.section` exists from the moment `loadKatas` returns and no caller
// has to remember a second step.

import { createNounKata } from './nouns/kata.js';
import { createCaseKata } from './cases/kata.js';
import { createPrepositionKata } from './prepositions/kata.js';
import { createVerbKata } from './verbs/kata.js';

/**
 * @typedef {Object} Kata
 * @property {string} id
 * @property {string} name
 * @property {string} subtitle
 * @property {string} datasetUrl
 * @property {string} accent Tailwind color name driving the dashboard card's hover border.
 * @property {string} helpTitle
 * @property {{section: HTMLElement}} el Populated at construction; read-only afterwards.
 * @property {function(Object): void} render
 * @property {function(Object): Object|null} check
 * @property {function(Object|null): string} getHelpContent
 * @property {function(Array): void} validateDataset
 */

/** @param {Kata} kata */
export function validateKata(kata) {
    const supportedAccents = ['indigo', 'teal', 'purple', 'amber'];
    const requiredStrings = ['id', 'name', 'subtitle', 'datasetUrl', 'accent'];
    const requiredFunctions = ['render', 'check', 'getHelpContent', 'validateDataset'];

    if (!kata || typeof kata !== 'object') {
        throw new Error('Kata must be an object.');
    }

    requiredStrings.forEach((field) => {
        if (typeof kata[field] !== 'string' || !kata[field].trim()) {
            throw new Error(`Kata "${kata.id ?? 'unknown'}" requires non-empty ${field}.`);
        }
    });

    if (!supportedAccents.includes(kata.accent)) {
        throw new Error(`Kata "${kata.id}" requires a supported accent.`);
    }

    requiredFunctions.forEach((field) => {
        if (typeof kata[field] !== 'function') {
            throw new Error(`Kata "${kata.id}" requires ${field}().`);
        }
    });

    // A real element, not just the key: the factory mounts the section, so a
    // kata that forgot to must fail here rather than in a keypress handler.
    if (!kata.el?.section) {
        throw new Error(`Kata "${kata.id}" requires a mounted el.section.`);
    }

    return kata;
}

/**
 * Builds and mounts every kata into `container`.
 * @param {HTMLElement} container the element that holds the kata sections
 * @returns {Kata[]}
 */
export function loadKatas(container) {
    if (!container) {
        throw new Error('loadKatas(container) requires the element that holds the kata sections.');
    }

    return [
        createNounKata(container),
        createCaseKata(container),
        createPrepositionKata(container),
        createVerbKata('pres', container),
        createVerbKata('praet', container),
        createVerbKata('perf', container),
    ].map(validateKata);
}