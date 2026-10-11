// services/grammar.js

export const CASE_LABELS = { nom: 'Nominativ', akk: 'Akkusativ', dat: 'Dativ', gen: 'Genitiv' };

export const CASE_KEYS = Object.keys(CASE_LABELS);

export const DEFINITE = {
    der: { nom: 'der', akk: 'den', dat: 'dem', gen: 'des' },
    die: { nom: 'die', akk: 'die', dat: 'der', gen: 'der' },
    das: { nom: 'das', akk: 'das', dat: 'dem', gen: 'des' },
};

export const INDEFINITE = {
    der: { nom: 'ein', akk: 'einen', dat: 'einem', gen: 'eines' },
    die: { nom: 'eine', akk: 'eine', dat: 'einer', gen: 'einer' },
    das: { nom: 'ein', akk: 'ein', dat: 'einem', gen: 'eines' },
};

export const PLURAL_DEFINITE = { nom: 'die', akk: 'die', dat: 'den', gen: 'der' };

export const PERSONS = [
    { key: 'ich', label: 'ich' },
    { key: 'du', label: 'du' },
    { key: 'er', label: 'er/sie/es' },
    { key: 'wir', label: 'wir' },
    { key: 'ihr', label: 'ihr' },
    { key: 'sie', label: 'sie/Sie' },
];

export const TENSES = {
    pres: { id: 'verbs-pres', label: 'Präsens' },
    praet: { id: 'verbs-praet', label: 'Präteritum' },
    perf: { id: 'verbs-perf', label: 'Perfekt' },
};

/** Shared by validators and renderer, so a dataset cannot validate and then render differently. */
export const BLANK_PLACEHOLDER = /\{(\d+)\}/g;

/** `'Ich gehe {0} Arzt.'` -> `['Ich gehe ', '0', ' Arzt.', '']`; odd positions are blank indices. */
export function splitBlanks(sentence) {
    return typeof sentence === 'string' ? sentence.split(BLANK_PLACEHOLDER) : [];
}

export function hasOrderedBlankPlaceholders(sentence, blankCount) {
    if (typeof sentence !== 'string' || !Number.isInteger(blankCount) || blankCount < 1) return false;

    const placeholders = [...sentence.matchAll(BLANK_PLACEHOLDER)].map((match) => Number(match[1]));
    return placeholders.length === blankCount && placeholders.every((index, position) => index === position);
}

// ---- Prepositions ---------------------------------------------------------

/**
 * `two` (Wechselpräpositionen) takes Dativ for a location, Akkusativ for a goal.
 * `wegen` and `trotz` take Dativ only colloquially (Duden), so they stay in `gen`.
 */
export const PREPOSITION_GROUPS = {
    akk: ['durch', 'für', 'gegen', 'ohne', 'um'],
    dat: ['aus', 'bei', 'gegenüber', 'mit', 'nach', 'seit', 'von', 'zu'],
    gen: ['anlässlich', 'angesichts', 'bezüglich', 'hinsichtlich', 'infolge', 'mittels', 'statt', 'trotz', 'während', 'wegen'],
    two: ['an', 'auf', 'hinter', 'in', 'neben', 'über', 'unter', 'vor', 'zwischen'],
};

const PREPOSITION_GROUP_OF = new Map(
    Object.entries(PREPOSITION_GROUPS).flatMap(([group, list]) => list.map((preposition) => [preposition, group]))
);

export const PREPOSITION_GROUP_LABELS = {
    akk: 'Akkusativ',
    dat: 'Dativ',
    gen: 'Genitiv',
    two: 'Dativ = Lage · Akkusativ = Ziel',
};

export const PREPOSITION_CONTRACTIONS = {
    zum: { preposition: 'zu', article: 'dem' },
    zur: { preposition: 'zu', article: 'der' },
    im: { preposition: 'in', article: 'dem' },
    ins: { preposition: 'in', article: 'das' },
    am: { preposition: 'an', article: 'dem' },
    ans: { preposition: 'an', article: 'das' },
    beim: { preposition: 'bei', article: 'dem' },
    vom: { preposition: 'von', article: 'dem' },
    aufs: { preposition: 'auf', article: 'das' },
};

/** Reverse lookup ("zu dem" -> "zum"): a dataset may store either spelling. */
const CONTRACTED_FORMS = Object.fromEntries(
    Object.entries(PREPOSITION_CONTRACTIONS).map(([fused, { preposition, article }]) => [
        `${preposition} ${article}`,
        fused,
    ])
);

/** `euer` is listed apart below. */
export const POSSESSIVE_STEMS = ['mein', 'dein', 'sein', 'ihr', 'unser'];

/** Masculine Nominativ and neuter Nominativ/Akkusativ take the bare stem. */
export const POSSESSIVE_ENDINGS = {
    der: { nom: '', akk: 'en', dat: 'em', gen: 'es' },
    die: { nom: 'e', akk: 'e', dat: 'er', gen: 'er' },
    das: { nom: '', akk: '', dat: 'em', gen: 'es' },
    plural: { nom: 'e', akk: 'e', dat: 'en', gen: 'er' },
};

/** `euer` drops its -r before an -e ending, so its forms are listed, short Duden spellings included. */
export const POSSESSIVE_EUER = {
    nom: ['euer', 'eure'],
    akk: ['euer', 'eure', 'euren'],
    dat: ['eurem', 'euerm', 'euerem', 'euerer', 'euren'],
    gen: ['eures', 'euerer', 'eurer'],
};

/** Deduplicated across genders ("meine" serves three); Nominativ included because possessives introduce subjects too. */
const POSSESSIVE = Object.fromEntries(
    CASE_KEYS.map((caseKey) => [
        caseKey,
        [...new Set([
            ...POSSESSIVE_STEMS.flatMap((stem) =>
                Object.values(POSSESSIVE_ENDINGS).map((byCase) => stem + byCase[caseKey])),
            ...POSSESSIVE_EUER[caseKey],
        ])],
    ]),
);

/** Personal pronouns in the object cases ("ohne mich", "mit mir"). */
export const PERSONAL = {
    akk: ['mich', 'dich', 'ihn', 'sie', 'es', 'uns', 'euch'],
    dat: ['mir', 'dir', 'ihm', 'ihr', 'uns', 'ihnen'],
};

export const NUMERALS = {
    akk: ['eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'beide', 'alle'],
    dat: ['einem', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'beiden', 'allen'],
    gen: ['eines', 'zweier', 'dreier', 'vierer', 'fünfer', 'sechser', 'beider', 'aller', 'allem', 'alledem'],
};

/** The dative plural is "diesen", not "diese". */
export const DEMONSTRATIVE = {
    akk: ['diesen', 'diese', 'dieses'],
    dat: ['diesem', 'dieser', 'diesen'],
    gen: ['dieses', 'dieser'],
};

export const NEGATIVE = {
    akk: ['kein', 'keinen', 'keine'],
    dat: ['kein', 'keinem', 'keiner', 'keinen'],
    gen: ['kein', 'keines', 'keiner', 'keinen'],
};

const formsInCase = (table, caseKey) => Object.values(table).map((forms) => forms[caseKey]);

/** Forms valid after a preposition in exactly this case: "dem" is Dativ, so it is rejected as an Akkusativ answer. */
const determinersFor = (caseKey) => new Set([
    ...formsInCase(DEFINITE, caseKey),
    ...formsInCase(INDEFINITE, caseKey),
    PLURAL_DEFINITE[caseKey],
    ...(POSSESSIVE[caseKey] ?? []),
    ...(PERSONAL[caseKey] ?? []),
    ...(NUMERALS[caseKey] ?? []),
    ...(DEMONSTRATIVE[caseKey] ?? []),
    ...(NEGATIVE[caseKey] ?? []),
]);

/** Includes the Nominativ, for checking a dataset's own answers. */
const DETERMINERS_BY_CASE = Object.freeze({
    nom: determinersFor('nom'),
    akk: determinersFor('akk'),
    dat: determinersFor('dat'),
    gen: determinersFor('gen'),
});

/** Object cases only: a definite article is Nominativ of one noun as readily as Dativ of another, so `determinerCases` could not say much. */
const DETERMINERS = Object.freeze({
    akk: DETERMINERS_BY_CASE.akk,
    dat: DETERMINERS_BY_CASE.dat,
    gen: DETERMINERS_BY_CASE.gen,
});

/** Membership, not a derived single case: "den" is the Akkusativ of `der` and the Dativ plural. */
export function determinerBelongsTo(form, caseKey) {
    const word = normalizePhrase(form);
    return Boolean(word) && Boolean(DETERMINERS_BY_CASE[caseKey]?.has(word));
}

/** Empty for a non-determiner; two entries for shared forms ("den"). */
export function determinerCases(form) {
    const word = normalizePhrase(form);
    return word ? Object.keys(DETERMINERS).filter((caseKey) => DETERMINERS[caseKey].has(word)) : [];
}

export function normalizePhrase(value) {
    return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Contracted and written-out spellings, both directions ("zum" <-> "zu dem"); dataset spelling first, duplicate-free. */
export function prepositionSpellings(answer) {
    const phrase = normalizePhrase(answer);
    if (!phrase) return [];

    const variants = [phrase];
    const fused = PREPOSITION_CONTRACTIONS[phrase];
    if (fused) variants.push(`${fused.preposition} ${fused.article}`);
    const contraction = CONTRACTED_FORMS[phrase];
    if (contraction) variants.push(contraction);

    return [...new Set(variants)];
}

/** A `PREPOSITION_GROUPS` key for the first word, or null when it is not a preposition. */
export function prepositionRection(word) {
    const head = normalizePhrase(word).split(' ')[0];
    return PREPOSITION_GROUP_OF.get(head) ?? null;
}
