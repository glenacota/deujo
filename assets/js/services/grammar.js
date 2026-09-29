// services/grammar.js

export const CASE_LABELS = { nom: 'Nominativ', akk: 'Akkusativ', dat: 'Dativ', gen: 'Genitiv' };

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

// ---- Prepositions ---------------------------------------------------------

/**
 * The four rection groups. `akk`/`dat`/`gen` prepositions fix the case of their
 * noun phrase; the `two` group (Wechselpräpositionen) takes Dativ for a
 * location and Akkusativ for a movement towards a goal.
 * `wegen` and `trotz` also accept Dativ, but only colloquially (Duden), so they
 * live in `gen` here and the dataset uses the Genitiv form exclusively.
 */
export const PREPOSITION_GROUPS = {
    akk: ['durch', 'für', 'gegen', 'ohne', 'um'],
    dat: ['aus', 'bei', 'gegenüber', 'mit', 'nach', 'seit', 'von', 'zu'],
    gen: ['anlässlich', 'angesichts', 'bezüglich', 'hinsichtlich', 'infolge', 'mittels', 'statt', 'trotz', 'während', 'wegen'],
    two: ['an', 'auf', 'hinter', 'in', 'neben', 'über', 'unter', 'vor', 'zwischen'],
};

export const PREPOSITION_GROUP_LABELS = {
    akk: 'Akkusativ',
    dat: 'Dativ',
    gen: 'Genitiv',
    two: 'Dativ = Lage · Akkusativ = Ziel',
};

/** The nine standard contractions of a preposition plus the definite article. */
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

/** Possessive determiners per case; only the forms that can actually occur. */
const POSSESSIVE = {
    akk: ['meinen', 'meine', 'mein', 'seinen', 'seine', 'sein', 'ihren', 'ihre', 'ihr', 'unseren', 'unsere', 'unser', 'deinen', 'deine', 'dein'],
    dat: ['meinem', 'meiner', 'meinen', 'seinem', 'seiner', 'seinen', 'ihrem', 'ihrer', 'ihren', 'unserem', 'unserer', 'unseren', 'deinem', 'deiner', 'deinen'],
    gen: ['meines', 'meiner', 'seines', 'seiner', 'ihres', 'ihrer', 'unseres', 'unserer', 'deines', 'deiner'],
};

/** Personal pronouns in the object cases ("ohne mich", "mit mir"). */
const PERSONAL = {
    akk: ['mich', 'dich', 'ihn', 'sie', 'es', 'uns', 'euch'],
    dat: ['mir', 'dir', 'ihm', 'ihr', 'uns', 'ihnen'],
};

/** Cardinals, "all/both" and the adverbial "lange" used after seit. */
const NUMERALS = {
    akk: ['eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'beide', 'alle'],
    dat: ['einem', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'beiden', 'allen', 'langem'],
    gen: ['eines', 'zweier', 'dreier', 'vierer', 'fünfer', 'sechser', 'beider', 'aller', 'allem', 'alledem'],
};

/** Demonstratives; note that the dative plural is "diesen", not "diese". */
const DEMONSTRATIVE = {
    akk: ['diesen', 'diese', 'dieses'],
    dat: ['diesem', 'dieser', 'diesen'],
    gen: ['dieses', 'dieser'],
};

/** Negated determiners ("für keinen Kunden"). */
const NEGATIVE = {
    akk: ['kein', 'keinen', 'keine'],
    dat: ['kein', 'keinem', 'keiner', 'keinen'],
    gen: ['kein', 'keines', 'keiner', 'keinen'],
};

/** Pulls one case out of the gender-keyed article tables. */
const formsInCase = (table, caseKey) => Object.values(table).map((forms) => forms[caseKey]);

/** PLURAL_DEFINITE is already keyed by case, so it is read directly. */
const pluralFormInCase = (caseKey) => PLURAL_DEFINITE[caseKey];

/**
 * Every determiner form that can legitimately appear after a preposition in the
 * given case, and no other case. Used to check a dataset's answers, so a wrong
 * case or a malformed contraction is caught before the data ever reaches a
 * learner. "dem" is Dativ and must therefore be rejected as an Akkusativ answer.
 */
const determinersFor = (caseKey) => new Set([
    ...formsInCase(DEFINITE, caseKey),
    ...formsInCase(INDEFINITE, caseKey),
    pluralFormInCase(caseKey),
    ...POSSESSIVE[caseKey],
    ...(PERSONAL[caseKey] ?? []),
    ...NUMERALS[caseKey],
    ...DEMONSTRATIVE[caseKey],
    ...NEGATIVE[caseKey],
]);

export const DETERMINERS = Object.freeze({
    akk: determinersFor('akk'),
    dat: determinersFor('dat'),
    gen: determinersFor('gen'),
});

/** Normalises typed input so `Im` / `im ` / `in  dem` all compare cleanly. */
export function normalizePhrase(value) {
    return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Splits "zum" / "in den" into its preposition and determiner, but only when the
 * preposition is the expected one. Returns the determiner, or null when the
 * answer does not belong to that preposition.
 * @param {string} answer
 * @param {string} preposition
 * @returns {string|null}
 */
export function decomposePrepositionPhrase(answer, preposition) {
    const contracted = PREPOSITION_CONTRACTIONS[answer];
    if (contracted) return contracted.preposition === preposition ? contracted.article : null;
    if (!answer.startsWith(`${preposition} `)) return null;
    return answer.slice(preposition.length + 1);
}

/**
 * The contracted form is the standard spelling, but the written-out version is
 * still correct German, so both count as a correct answer.
 * @param {string} answer
 * @param {string} preposition
 * @returns {string[]}
 */
export function acceptedPrepositionForms(answer, preposition) {
    const forms = [answer];
    const contracted = PREPOSITION_CONTRACTIONS[answer];
    if (contracted) forms.push(`${preposition} ${contracted.article}`);
    return forms;
}
