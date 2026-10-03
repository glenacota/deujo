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

/**
 * The `{n}` blank placeholder, captured. One definition, shared by the dataset
 * validators that count placeholders and by the renderer that splits on them:
 * if the two ever disagreed, a dataset could validate and then render wrongly.
 */
export const BLANK_PLACEHOLDER = /\{(\d+)\}/g;

/**
 * The sentence as alternating literal text and blank indices, where odd
 * positions are blank indices: `'Ich gehe {0} Arzt.'` -> `['Ich gehe ', '0', ' Arzt.', '']`.
 */
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

/** Every preposition mapped back to its rection group, so a phrase can be traced to the table above. */
const PREPOSITION_GROUP_OF = new Map(
    Object.entries(PREPOSITION_GROUPS).flatMap(([group, list]) => list.map((preposition) => [preposition, group]))
);

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

/**
 * The written-out spelling behind each contraction: "zu dem" -> "zum". A dataset
 * may store either spelling, so both directions have to be looked up.
 */
const CONTRACTED_FORMS = Object.fromEntries(
    Object.entries(PREPOSITION_CONTRACTIONS).map(([fused, { preposition, article }]) => [
        `${preposition} ${article}`,
        fused,
    ])
);

/** The six possessive stems; each one takes the endings below. */
const POSSESSIVE_STEMS = ['mein', 'dein', 'sein', 'ihr', 'unser', 'euer'];

/**
 * What a possessive stem takes, per case. Gendered, because that is where the
 * endings split: the Akkusativ of `die` and `das` is the bare stem while `der`
 * grows `-en`, and the Dativ plural is `-en` for every gender.
 */
export const POSSESSIVE_ENDINGS = {
    der: { nom: '', akk: 'en', dat: 'em', gen: 'es' },
    die: { nom: 'e', akk: 'e', dat: 'er', gen: 'er' },
    das: { nom: '', akk: '', dat: 'em', gen: 'es' },
    plural: { nom: 'e', akk: 'e', dat: 'en', gen: 'er' },
};

/** Every possessive form a case allows, deduplicated: "meine" serves three genders. */
export const POSSESSIVE = Object.fromEntries(
    Object.keys(CASE_LABELS)
        .filter((caseKey) => caseKey !== 'nom')
        .map((caseKey) => [
            caseKey,
            [...new Set(POSSESSIVE_STEMS.flatMap((stem) =>
                Object.values(POSSESSIVE_ENDINGS).map((byCase) => stem + byCase[caseKey])))],
        ]),
);

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

/**
 * Every determiner form that can legitimately appear after a preposition in the
 * given case, and no other case. Used to check a dataset's answers, so a wrong
 * case or a malformed contraction is caught before the data ever reaches a
 * learner. "dem" is Dativ and must therefore be rejected as an Akkusativ answer.
 */
const determinersFor = (caseKey) => new Set([
    ...formsInCase(DEFINITE, caseKey),
    ...formsInCase(INDEFINITE, caseKey),
    PLURAL_DEFINITE[caseKey],
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
 * Splits "zum" / "in den" into its determiner, but only when the preposition is
 * the expected one. Returns null when the answer does not belong to it.
 */
export function decomposePrepositionPhrase(answer, preposition) {
    const contracted = PREPOSITION_CONTRACTIONS[answer];
    if (contracted) return contracted.preposition === preposition ? contracted.article : null;
    if (!answer.startsWith(`${preposition} `)) return null;
    return answer.slice(preposition.length + 1);
}

/**
 * Every spelling of a prepositional phrase that is still correct German: the
 * fused contraction and the written-out form, in whichever order the dataset
 * stored them. "zum" also answers a blank whose answer is "zu dem", and the
 * other way round; a phrase that cannot contract keeps its single spelling.
 * @returns normalised, duplicate-free, dataset spelling first
 */
export function prepositionSpellings(answer) {
    const phrase = normalizePhrase(answer);
    if (!phrase) return [];

    // The dataset's own spelling first, then the one standard alternative.
    const variants = [phrase];
    const fused = PREPOSITION_CONTRACTIONS[phrase];
    if (fused) variants.push(`${fused.preposition} ${fused.article}`);
    const contraction = CONTRACTED_FORMS[phrase];
    if (contraction) variants.push(contraction);

    return [...new Set(variants)];
}

function prepositionOf(answer) {
    const contracted = PREPOSITION_CONTRACTIONS[answer];
    if (contracted) return contracted.preposition;
    const head = answer.split(' ')[0];
    return PREPOSITION_GROUP_OF.has(head) ? head : null;
}

/**
 * True when a phrase is a real preposition plus a determiner, and that
 * determiner belongs to `caseKey`. "zum" with `dat` and "in die" with `akk`
 * pass; "beim" with `akk` and a bare "dem" do not.
 *
 * Membership rather than a derived single case, because a determiner form can
 * serve two cases: "mit den" is the correct Dativ answer even though "den" is
 * also the Akkusativ singular. Checking the claimed case keeps that legitimate
 * ambiguity from failing a correct entry.
 * @param answer a phrase, already normalised
 * @param caseKey one of the `CASE_LABELS` keys
 */
export function isPrepositionPhraseInCase(answer, caseKey) {
    const preposition = prepositionOf(answer);
    if (!preposition) return false;

    const rest = decomposePrepositionPhrase(answer, preposition);
    if (!rest) return false;

    // The determiner is the first word, so a longer phrase like "in die Tür"
    // is still usable as an answer.
    return DETERMINERS[caseKey]?.has(rest.split(' ')[0]) ?? false;
}
