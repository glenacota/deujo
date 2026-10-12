// katas/nouns/lesson.js

import { lesson } from '../../services/lesson.js';

const GENDER_LABELS = { der: 'masculine', die: 'feminine', das: 'neuter' };

// Most reliable first; the first matching entry wins.
const GENDER_ENDINGS = [
    { pattern: /(ung|heit|keit|schaft|tion|zion|ei|ie)$/, gender: 'die', rule: 'Nouns ending in -ung and the endings -heit, -keit, -schaft, -tion, -zion, -ei and -ie usually take die.' },
    { pattern: /(chen|lein|nis)$/, gender: 'das', rule: 'Nouns ending in -chen, -lein and -nis usually take das.' },
    { pattern: /(er|ling|ismus|or)$/, gender: 'der', rule: '-er, -ling, -ismus and -or are usually der, but die and das exist.' },
    { pattern: /(um|on|us|so)$/, gender: 'das', rule: 'A loanword in -um, -on, -us or -so is usually das, though a few native words in -us are not: die Maus.' },
];

const PLURAL_RULES = {
    die: 'die usually adds -n or -en, with no umlaut.',
    der: 'der usually adds -e or -en, often with an umlaut, and in -er or -en often nothing at all.',
    das: 'das usually adds -e with an umlaut (die Bücher), or -s when the stem already has a full vowel (die Autos).',
};

function endingOf(word, pattern) {
    const match = String(word).match(pattern);
    return match ? `-${match[1]}` : '';
}

function genderLesson(noun, expected) {
    const word = String(noun?.w ?? '');
    const gender = noun?.g;
    const matched = GENDER_ENDINGS.find((entry) => entry.pattern.test(word));

    if (!matched) {
        return lesson(expected, `${word} has no ending that gives its gender away. Learn it with the article.`);
    }
    if (matched.gender === gender) {
        return lesson(expected, `${matched.rule} ${word} is ${GENDER_LABELS[gender]}.`);
    }
    return lesson(
        expected,
        `${word} is ${GENDER_LABELS[gender]}, not ${matched.gender}, so it breaks the ${endingOf(word, matched.pattern)} rule: ${matched.rule}`,
    );
}

function pluralLesson(noun, expected) {
    return lesson(expected, PLURAL_RULES[noun?.g] ?? '');
}

export function renderNounLesson({ noun, field, expected } = {}) {
    if (typeof expected !== 'string' || !expected.trim()) return null;
    if (field === 'gender') return genderLesson(noun, expected);
    if (field === 'plural') return pluralLesson(noun, expected);
    return null;
}
