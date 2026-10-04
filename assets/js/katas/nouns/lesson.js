// katas/nouns/lesson.js
// Why a noun answer was wrong. Gender first: every plural rule hangs off it, so
// a wrong gender gets the panel and a wrong plural only gets it once the gender
// is right. Pure, so it stays unit testable and never touches the DOM.

import { lesson } from '../../services/lesson.js';

const GENDER_LABELS = { der: 'masculine', die: 'feminine', das: 'neuter' };

/**
 * Endings that give the gender away, most reliable first. `usually` in a rule
 * means exactly what it says: a word that breaks it is the interesting case, and
 * the correction below says so instead of pretending the rule held.
 */
const GENDER_ENDINGS = [
    { pattern: /(ung|heit|keit|schaft|tion|zion|ei|ie)$/, gender: 'die', rule: 'Nouns ending in -ung and the endings -heit, -keit, -schaft, -tion, -zion, -ei and -ie usually take die.' },
    { pattern: /(chen|lein|nis)$/, gender: 'das', rule: 'Nouns ending in -chen, -lein and -nis usually take das.' },
    { pattern: /(er|ling|ismus|or)$/, gender: 'der', rule: '-er, -ling, -ismus and -or are usually der, but die and das exist.' },
    { pattern: /(um|on|us|so)$/, gender: 'das', rule: 'A loanword in -um, -on, -us or -so is usually das.' },
];

/** The plural rule per gender, since that is what the gender decides. */
const PLURAL_RULES = {
    die: 'die usually adds -n or -en, with no umlaut.',
    der: 'der usually adds -e or -en, often with an umlaut, and in -er or -en often nothing at all.',
    das: 'das usually adds -e with an umlaut (die Bücher), or -s when the stem already has a full vowel (die Autos).',
};

/** The ending a rule matched, as the learner would recognise it: `-ung`. */
function endingOf(word, pattern) {
    const match = String(word).match(pattern);
    return match ? `-${match[1]}` : '';
}

/** `der Tag: no ending gives it away, so it has to be learned with the article.` */
function genderLesson(noun) {
    const word = String(noun?.w ?? '');
    const gender = noun?.g;
    const matched = GENDER_ENDINGS.find((entry) => entry.pattern.test(word));

    if (!matched) {
        return lesson(gender, `${word} has no ending that gives its gender away. Learn it with the article.`);
    }
    if (matched.gender === gender) {
        return lesson(gender, `${matched.rule} ${word} is ${GENDER_LABELS[gender]}.`);
    }
    return lesson(
        gender,
        `${word} is ${GENDER_LABELS[gender]}, not ${matched.gender}, so it breaks the ${endingOf(word, matched.pattern)} rule: ${matched.rule}`,
    );
}

/** `die Tage: der usually adds -e or -en, …` */
function pluralLesson(noun, expected) {
    return lesson(expected, PLURAL_RULES[noun?.g] ?? '');
}

/**
 * @param noun the dataset entry on screen
 * @param field `'gender'` or `'plural'`, so the caller states which one failed
 * @param expected the answer that belongs beside the wrong control
 * @returns {import('../../services/lesson.js').Lesson|null}
 */
export function renderNounLesson({ noun, field, expected } = {}) {
    if (typeof expected !== 'string' || !expected.trim()) return null;
    if (field === 'gender') return genderLesson(noun);
    if (field === 'plural') return pluralLesson(noun, expected);
    return null;
}
