// services/determiner-options.js

import {
    CASE_KEYS,
    DEFINITE,
    INDEFINITE,
    PLURAL_DEFINITE,
    POSSESSIVE_EUER,
    POSSESSIVE_ENDINGS,
    POSSESSIVE_STEMS,
    normalizePhrase,
} from './grammar.js';

const GENDERS = ['der', 'die', 'das', 'plural'];

/** Buttons per stage-two row; the printed digits and the keyboard funnel's range follow from it. */
export const OPTION_ROW_SIZE = 4;

/**
 * `gender` is kept because a bare form is ambiguous: "den" is the Akkusativ of `der` and the Dativ plural.
 * A case left as '' is not covered by the row and is never shown as a button.
 */
function row(stem, gender, byCase) {
    return {
        stem,
        gender,
        forms: Object.fromEntries(CASE_KEYS.map((caseKey) => [caseKey, byCase[caseKey] ?? ''])),
    };
}

const classOf = (stem) => (stem === 'der' ? 'definite' : stem === 'ein' ? 'indefinite' : stem);

/** `euer` drops its -r before an -e ending, so its forms are listed (short Duden spellings) rather than derived. */
const EUER = {
    der: { nom: 'euer', akk: 'euer', dat: 'euerm', gen: 'eueres' },
    die: { nom: 'eure', akk: 'eure', dat: 'euerer', gen: 'euerer' },
    das: { nom: 'euer', akk: 'euer', dat: 'euerm', gen: 'eueres' },
    plural: { nom: 'eure', akk: 'eure', dat: 'euren', gen: 'euerer' },
};

/** Keyed by person, not gender, holding only the cases that person has. */
const PERSONAL_PRONOUNS = [
    ['ich', { akk: 'mich', dat: 'mir' }],
    ['du', { akk: 'dich', dat: 'dir' }],
    ['er', { akk: 'ihn', dat: 'ihm' }],
    ['sie', { akk: 'sie', dat: 'ihr' }],
    ['es', { akk: 'es', dat: 'ihm' }],
    ['wir', { akk: 'uns', dat: 'uns' }],
    ['ihr', { akk: 'euch', dat: 'euch' }],
    ['Sie', { akk: 'sie', dat: 'ihnen' }],
];

/**
 * Nominativ and Akkusativ repeat because counts are invariable there.
 * Written out, not read from `NUMERALS`: those lists are membership sets that do not line up by index.
 */
const NUMERAL_ROWS = [
    ['eins', { nom: 'eins', akk: 'eins', dat: 'einem', gen: 'eines' }],
    ['zwei', { nom: 'zwei', akk: 'zwei', dat: 'zweien', gen: 'zweier' }],
    ['drei', { nom: 'drei', akk: 'drei', dat: 'dreien', gen: 'dreier' }],
    ['vier', { nom: 'vier', akk: 'vier', dat: 'vieren', gen: 'vierer' }],
    ['fünf', { nom: 'fünf', akk: 'fünf', dat: 'fünfen', gen: 'fünfer' }],
    ['sechs', { nom: 'sechs', akk: 'sechs', dat: 'sechsen', gen: 'sechser' }],
    ['beide', { nom: 'beide', akk: 'beide', dat: 'beiden', gen: 'beider' }],
    ['alle', { nom: 'alle', akk: 'alle', dat: 'allen', gen: 'aller' }],
];

const PRONOUN_ADJECTIVES = [
    ['alles', { nom: 'alles', akk: 'alles', dat: 'allem', gen: 'alles' }],
    ['jeder', { nom: 'jeder', akk: 'jeden', dat: 'jedem', gen: 'jedes' }],
];

/** Written out: `grammar.js` stores these as per-case membership lists that do not line up. */
const DEMONSTRATIVES = [
    ['dieser', { nom: 'dieser', akk: 'diesen', dat: 'diesem', gen: 'dieses' }],
    ['diese', { nom: 'diese', akk: 'diese', dat: 'dieser', gen: 'dieser' }],
    ['dieses', { nom: 'dieses', akk: 'dieses', dat: 'diesem', gen: 'dieses' }],
    ['dieser:plural', { nom: 'diese', akk: 'diese', dat: 'diesen', gen: 'dieser' }],
];

const NEGATIVES = [
    ['kein', { nom: 'kein', akk: 'keinen', dat: 'keinem', gen: 'keines' }],
    ['keine', { nom: 'keine', akk: 'keine', dat: 'keiner', gen: 'keiner' }],
    ['kein:das', { nom: 'kein', akk: 'kein', dat: 'keinem', gen: 'keines' }],
    ['keine:plural', { nom: 'keine', akk: 'keine', dat: 'keinen', gen: 'keiner' }],
];

const ROWS = [
    // Each article is its own stem, so "der" is never offered where "ein" belongs.
    ...GENDERS.map((g) => row('der', g, { plural: PLURAL_DEFINITE, ...DEFINITE }[g])),
    ...['der', 'die', 'das'].map((g) => row('ein', g, INDEFINITE[g])),
    ...POSSESSIVE_STEMS.flatMap((stem) => GENDERS.map((g) => row(
        stem,
        g,
        Object.fromEntries(CASE_KEYS.map((caseKey) => [caseKey, stem + POSSESSIVE_ENDINGS[g][caseKey]])),
    ))),
    ...GENDERS.map((g) => row('euer', g, EUER[g])),
    ...PERSONAL_PRONOUNS.map(([person, byCase]) => row(person, person, byCase)),
    ...NUMERAL_ROWS.map(([numeral, byCase]) => row(numeral, numeral, byCase)),
    ...PRONOUN_ADJECTIVES.map(([word, byCase]) => row(word, word, byCase)),
    ...DEMONSTRATIVES.map(([word, byCase]) => row(word, word, byCase)),
    ...NEGATIVES.map(([word, byCase]) => row(word, word, byCase)),
];

/** Normalised form -> every row that produces it. */
const FORM_INDEX = new Map();
for (const entry of ROWS) {
    for (const [caseKey, form] of Object.entries(entry.forms)) {
        const key = normalizePhrase(form);
        if (!key) continue;
        const matches = FORM_INDEX.get(key) ?? [];
        matches.push({ ...entry, class: classOf(entry.stem), matchedCase: caseKey });
        FORM_INDEX.set(key, matches);
    }
}

const EUER_VARIANTS = new Set(Object.values(POSSESSIVE_EUER).flat());

/**
 * A form can belong to several rows ("die"); the declared case narrows it, and if it still
 * cannot, every candidate contributes so the answer is never left out of its own row.
 */
function rowsFor(form, caseKey) {
    const matches = FORM_INDEX.get(normalizePhrase(form)) ?? [];
    const inCase = matches.filter((entry) => entry.matchedCase === caseKey);
    return inCase.length ? inCase : matches;
}

function push(options, form, size) {
    if (options.length >= size) return;
    const value = String(form ?? '');
    if (!value) return;
    if (options.some((existing) => normalizePhrase(existing) === normalizePhrase(value))) return;
    options.push(value);
}

/** Deterministic, so a reload, a test and a screenshot agree, yet the answer's position varies per item. */
function rotate(options, seed) {
    if (options.length < 2) return options;
    let hash = 0;
    for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    const offset = hash % options.length;
    return [...options.slice(offset), ...options.slice(0, offset)];
}

/**
 * Distractor passes, in order: the answer's stem in other cases; the same stem in other genders
 * of the answer's case; any other stem in that case.
 * Options take the answer's capitalisation, or a sentence-initial "Der" would be offered "der" too.
 * @param {{a: string, c: string}} blank the dataset blank being answered
 */
export function determinerOptions(blank, size = OPTION_ROW_SIZE) {
    const answer = String(blank?.a ?? '');
    if (!answer) return [];

    const rows = rowsFor(answer, blank?.c);
    const options = [answer];
    const stems = new Set(rows.map((entry) => entry.stem));
    const asSpelled = (form) => matchCase(answer, form);

    for (const caseKey of CASE_KEYS) {
        if (caseKey === blank?.c) continue;
        for (const entry of rows) push(options, asSpelled(entry.forms[caseKey]), size);
    }

    // Same stem, other genders: "seine" beside "seinen".
    for (const entry of ROWS) {
        if (!stems.has(entry.stem)) continue;
        if (rows.some((r) => r.stem === entry.stem && r.gender === entry.gender)) continue;
        push(options, asSpelled(entry.forms[blank?.c]), size);
    }

    // Other stems in the answer's case; also the fallback for a form with no row.
    for (const entry of ROWS) {
        if (stems.has(entry.stem)) continue;
        push(options, asSpelled(entry.forms[blank?.c]), size);
    }

    return rotate(options.slice(0, size), `${answer} ${blank?.c ?? ''}`);
}

/** Only the first letter can differ: a sentence-initial determiner is the one capitalised non-noun. */
function matchCase(answer, form) {
    const value = String(form ?? '');
    if (!value || !answer || answer === value) return value;
    const capitalised = answer.charAt(0) === answer.charAt(0).toUpperCase();
    return capitalised ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** `euer` variants are checked apart because Duden allows two spellings of one row. */
export function isSelectableDeterminer(form) {
    const word = normalizePhrase(form);
    return FORM_INDEX.has(word) || EUER_VARIANTS.has(word);
}