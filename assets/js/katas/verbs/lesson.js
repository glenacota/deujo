// katas/verbs/lesson.js

import { PERSONS } from '../../services/grammar.js';
import { lesson } from '../../services/lesson.js';

const ENDINGS = {
    pres: ['-e', '-st', '-t', '-en', '-t', '-en'],
    praet: ['-te', '-test', '-te', '-ten', '-tet', '-ten'],
};
const NO_GE_PREFIXES = ['be', 'emp', 'ent', 'er', 'ge', 'miss', 'ver', 'zer'];

const infinitiveStem = (verb) => String(verb?.w ?? '').replace(/en$/, '');

// `ending` carries its leading dash ('-st'), so only length - 1 characters belong to the form.
function formStem(form, ending) {
    const text = String(form ?? '');
    return text.slice(0, Math.max(0, text.length - (ending.length - 1)));
}

function conjugatedLesson(verb, tenseKey, index, expected) {
    const ending = ENDINGS[tenseKey]?.[index];
    const person = PERSONS[index]?.label;
    if (!ending || !person) return null;

    if (tenseKey !== 'praet') {
        return lesson(expected, `${person} takes ${ending}. A stem change shows up in du and er/sie/es only.`);
    }

    const stem = formStem(expected, ending);
    const tense = stem === infinitiveStem(verb)
        ? `${verb?.w} is weak: the stem never changes, so it is stem + -te + the ending.`
        : `${verb?.w} is strong: the stem vowel changes (${verb?.w} → ${stem}), and no pattern predicts it.`;

    return lesson(expected, `${person} takes ${ending}. ${tense}`);
}

function participleLesson(verb, expected) {
    const participle = String(expected ?? '');
    const ending = participle.endsWith('en') ? 'en' : participle.endsWith('t') ? 't' : '';
    if (!ending) return lesson(participle, `${verb?.w} has the irregular participle ${participle}.`);

    const infinitive = String(verb?.w ?? '');
    const inseparablePrefix = NO_GE_PREFIXES.find((prefix) => infinitive.startsWith(prefix));
    const hasNoGe = Boolean(inseparablePrefix) || infinitive.endsWith('ieren');
    let plain = participle.slice(0, -ending.length);
    if (!hasNoGe && plain.startsWith('ge')) plain = plain.slice(2);
    const changed = plain !== infinitiveStem(verb);
    const rule = !changed
        ? `${infinitive} is weak: ${hasNoGe ? 'the stem without ge-' : `ge- + the stem`} + -${ending}.`
        : `${infinitive} changes its stem vowel, so the participle is ${hasNoGe
            ? `${inseparablePrefix ? `${inseparablePrefix}- + ` : ''}the changed stem`
            : 'ge- + the changed stem'} + -${ending}.`;

    return lesson(participle, rule);
}

// `index` is null when the Perfekt auxiliary was missed; `accepted` lists every other valid answer.
export function renderVerbLesson({ verb, tenseKey, index, expected, accepted } = {}) {
    if (tenseKey === 'perf') {
        return index === null
            ? renderAuxLesson({ expected, accepted })
            : participleLesson(verb, expected);
    }
    if (!Number.isInteger(index)) return null;
    return conjugatedLesson(verb, tenseKey, index, expected);
}

// Duden lists both auxiliaries for verbs like fahren, so the note must admit the rejected one was defensible.
function renderAuxLesson({ expected, accepted = [] } = {}) {
    if (expected !== 'sein' && expected !== 'haben') return null;
    if (accepted.length > 1) {
        const both = ['haben', 'sein'].filter((aux) => accepted.includes(aux));
        return lesson(
            expected,
            `This verb takes ${both.join(' or ')} here — Duden lists both, so the other one is right too.`,
        );
    }
    return lesson(
        expected,
        expected === 'sein'
            ? 'sein takes movement and a new state: gehen, bleiben, aufwachen.'
            : 'haben takes an object, and it is the default when neither applies: machen, lernen, warten.',
    );
}
