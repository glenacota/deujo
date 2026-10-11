// services/determiner-options.js
// The button set a stage-two picker offers for one blank: the right form, plus
// the forms a learner reaches for when they picked the wrong case or the wrong
// gender.
//
// Pure and DOM-free, so the picker factory asks this for its buttons and never
// builds them itself. Dataset authoring stays light because no option is hand
// written per item: every one is derived from the grammar tables, so a form can
// never be offered as a distractor against its own case.

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

/** Genders in the order a declension table lists them. */
const GENDERS = ['der', 'die', 'das', 'plural'];

/**
 * Buttons in a stage-two row: the answer plus three distractors.
 *
 * Exported because the picker owns the geometry that goes with it — the digit
 * printed on each button, and the range the keyboard funnel listens for, are
 * both this number's consequences, so a row that grew would move all three
 * rather than quietly leaving two of them behind.
 */
export const OPTION_ROW_SIZE = 4;

/**
 * One determiner resolved to the forms its stem takes.
 *
 * `stem` is what a learner held on to in stage one — "der", "ein", "sein" — and
 * is what the distractor passes vary. `class` is the broader family, so a
 * learner who reached for the wrong kind of determiner is offered the right kind
 * in the right case. `gender` is kept because a bare string is ambiguous: "den"
 * is the Akkusativ of `der` and the Dativ of the plural, so the word alone cannot
 * say which row produced it.
 *
 * A case left as '' is one the row does not cover. It is never shown as a
 * button, which is how "mich" ends up with a Dativ distractor but no Genitiv.
 */
function row(stem, gender, byCase) {
    return {
        stem,
        gender,
        forms: Object.fromEntries(CASE_KEYS.map((caseKey) => [caseKey, byCase[caseKey] ?? ''])),
    };
}

/** The class a stem belongs to, which is its own name unless it collides. */
const classOf = (stem) => (stem === 'der' ? 'definite' : stem === 'ein' ? 'indefinite' : stem);

/**
 * `euer` drops its -r before an -e ending, so "eure Jacke" is not a stem plus a
 * suffix. Its forms are listed rather than derived, using the short spellings
 * Duden prints.
 */
const EUER = {
    der: { nom: 'euer', akk: 'euer', dat: 'euerm', gen: 'eueres' },
    die: { nom: 'eure', akk: 'eure', dat: 'euerer', gen: 'euerer' },
    das: { nom: 'euer', akk: 'euer', dat: 'euerm', gen: 'eueres' },
    plural: { nom: 'eure', akk: 'eure', dat: 'euren', gen: 'euerer' },
};

/**
 * Personal pronouns decline by person, not by gender, so a row here is keyed by
 * the person and holds only the cases that person really has. The third-person
 * plural is its own row: "ihnen" is Dativ plural and belongs to no single-person
 * paradigm, which is why it cannot fall out of the others.
 */
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
 * A count is invariable in the Nominativ and the Akkusativ, so those repeat
 * rather than carrying a distinct form. "drei" therefore yields no case
 * distractor of its own and the picker falls through to the other cases it has.
 *
 * Written out rather than read out of `NUMERALS`: those three lists are
 * membership sets, so index 6 of one is not the same word as index 6 of another
 * (the Akkusativ holds "alle" where the Genitiv holds "aller"), and pairing them
 * by position would pair the wrong words.
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

/**
 * "alles" and "jeder" are written pronouns that decline like articles and keep
 * an allomorph Duden lists separately ("jedes" is the Genitiv, "alles" the
 * Genitiv and the Dativ "allem"), so they get rows of their own rather than
 * being folded into the cardinals.
 */
const PRONOUN_ADJECTIVES = [
    ['alles', { nom: 'alles', akk: 'alles', dat: 'allem', gen: 'alles' }],
    ['jeder', { nom: 'jeder', akk: 'jeden', dat: 'jedem', gen: 'jedes' }],
];

/**
 * Demonstratives and negated determiners. `grammar.js` stores these as flat
 * per-case membership lists, whose members do not line up across cases, so the
 * rows are written out here rather than read back out of those lists.
 */
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
    // The three articles, each its own stem, so "der" is never offered to a
    // feminine noun and "ein" is never offered where an article belongs.
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

/** Every form every row holds, lowercased, so a word can be traced back to its row. */
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

/** Every spelling Duden allows for `euer`, which the picker has to be able to accept. */
const EUER_VARIANTS = new Set(Object.values(POSSESSIVE_EUER).flat());

/**
 * The rows that produce `form` in `caseKey`. A form can belong to more than one
 * ("die" is the Nominativ of a woman and of a plural), and the case the dataset
 * declares is what narrows it; when it still cannot, every candidate
 * contributes, so the answer is never left out of its own row.
 */
function rowsFor(form, caseKey) {
    const matches = FORM_INDEX.get(normalizePhrase(form)) ?? [];
    const inCase = matches.filter((entry) => entry.matchedCase === caseKey);
    return inCase.length ? inCase : matches;
}

/** Appends a form unless it is blank, already on show, or there is no room. */
function push(options, form, size) {
    if (options.length >= size) return;
    const value = String(form ?? '');
    if (!value) return;
    if (options.some((existing) => normalizePhrase(existing) === normalizePhrase(value))) return;
    options.push(value);
}

/**
 * A stable per-blank rotation, so the answer is not always the first button.
 * Deterministic on purpose: a reload, a test and a screenshot all land on the
 * same order, and the position still moves from item to item.
 */
function rotate(options, seed) {
    if (options.length < 2) return options;
    let hash = 0;
    for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    const offset = hash % options.length;
    return [...options.slice(offset), ...options.slice(0, offset)];
}

/**
 * The buttons for one blank, answer included.
 *
 * Distractors come from three passes, in the order they are worth:
 *
 *   1. the answer's own stem in the other cases — the learner named a case in
 *      stage one and then spelled the wrong ending for it;
 *   2. the same stem in the other genders of the answer's case — "ihr" offered
 *      where "ihren" belongs, which is the trap the noun's gender sets;
 *   3. any other stem in the answer's case — a learner who reached for the wrong
 *      determiner altogether, and the fallback for a form with no row of its own.
 *
 * Every option takes the answer's capitalisation. The tables are lowercase
 * throughout, and a sentence-initial blank ("Der Mann") would otherwise be
 * offered "der" as a distractor to "Der", which is the same answer spelled
 * differently and would make a correct pick look wrong.
 *
 * @param {{a: string, c: string}} blank the dataset blank being answered
 * @param {number} size how many buttons to offer
 * @returns {string[]} distinct forms, the dataset's own spelling among them
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

    // The answer's own determiner in the other genders, which is the trap the
    // noun's gender sets: "seine" beside "seinen" and "sein".
    for (const entry of ROWS) {
        if (!stems.has(entry.stem)) continue;
        if (rows.some((r) => r.stem === entry.stem && r.gender === entry.gender)) continue;
        push(options, asSpelled(entry.forms[blank?.c]), size);
    }

    // Then any other determiner in the answer's case, for a learner who reached
    // for the wrong kind altogether and for a form with no row of its own.
    for (const entry of ROWS) {
        if (stems.has(entry.stem)) continue;
        push(options, asSpelled(entry.forms[blank?.c]), size);
    }

    return rotate(options.slice(0, size), `${answer} ${blank?.c ?? ''}`);
}

/**
 * A table form spelled the way the answer is. Only the first letter can differ,
 * so that is all this changes: German capitalises a noun and nothing else, and a
 * determiner at the head of a sentence is the one place a lowercase form has to
 * follow suit.
 */
function matchCase(answer, form) {
    const value = String(form ?? '');
    if (!value || !answer || answer === value) return value;
    const capitalised = answer.charAt(0) === answer.charAt(0).toUpperCase();
    return capitalised ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/**
 * True when a dataset answer is a determiner the picker can put on a button.
 * The `euer` variants are listed separately because Duden allows two spellings
 * of one row, and an authored answer may use either.
 */
export function isSelectableDeterminer(form) {
    const word = normalizePhrase(form);
    return FORM_INDEX.has(word) || EUER_VARIANTS.has(word);
}