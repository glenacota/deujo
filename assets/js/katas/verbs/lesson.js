// katas/verbs/lesson.js
// Why a verb answer was wrong: the ending the person takes, and whether this
// verb is weak or strong — read off the shipped forms rather than asserted, so
// the correction cannot call a strong verb weak. Pure, so it stays unit
// testable and never touches the DOM.

import { PERSONS } from '../../services/grammar.js';
import { lesson } from '../../services/lesson.js';

// The endings per tense, built once. They are the help tables' endings, minus
// the leading dash: the real ending is the entry without it.
const ENDINGS = {
    pres: ['-e', '-st', '-t', '-en', '-t', '-en'],
    praet: ['-te', '-test', '-te', '-ten', '-tet', '-ten'],
};

/** The infinitive stem: `gehen` → `geh`, `lernen` → `lern`. */
const infinitiveStem = (verb) => String(verb?.w ?? '').replace(/en$/, '');

/**
 * The stem of a conjugated form, by taking the ending off the end.
 * `gehst` minus `st` is `geh`; the leading dash is not part of the form.
 */
function formStem(form, ending) {
    const text = String(form ?? '');
    return text.slice(0, Math.max(0, text.length - (ending.length - 1)));
}

/** `ich nehme`: the person, the ending, and the fact that this verb is strong. */
function conjugatedLesson(verb, tenseKey, index, expected) {
    const ending = ENDINGS[tenseKey]?.[index];
    const person = PERSONS[index]?.label;
    if (!ending || !person) return null;

    if (tenseKey !== 'praet') {
        // Only du and er/sie/es show a stem change, so the Präsens has one rule.
        return lesson(expected, `${person} takes ${ending}. A stem change shows up in du and er/sie/es only.`);
    }

    const stem = formStem(expected, ending);
    const tense = stem === infinitiveStem(verb)
        ? `${verb?.w} is weak: the stem never changes, so it is stem + -te + the ending.`
        : `${verb?.w} is strong: the stem vowel changes (${verb?.w} → ${stem}), and no pattern predicts it.`;

    return lesson(expected, `${person} takes ${ending}. ${tense}`);
}

/**
 * A Perfekt participle: `-t` on an unchanged stem, `-en` on a changed one. The
 * comparison is against the shipped infinitive, so it holds for verbs the kata
 * has never seen.
 */
function participleLesson(verb, expected) {
    const participle = String(expected ?? '');
    const plain = participle.replace(/^ge-/, '').replace(/t$/, '');
    const rule = plain === infinitiveStem(verb)
        ? `${verb?.w} is weak: ge- + the stem + -t.`
        : `${verb?.w} changes its stem vowel, so the participle is ge- + the changed stem + -en.`;

    return lesson(participle, rule);
}

/**
 * @param verb the dataset entry on screen
 * @param tenseKey one of the `TENSES` keys
 * @param index which blank was missed, or null when the auxiliary choice was
 * @param expected the answer that belongs beside the wrong control
 */
export function renderVerbLesson({ verb, tenseKey, index, expected } = {}) {
    if (tenseKey === 'perf') {
        return index === null
            ? renderAuxLesson({ expected })
            : participleLesson(verb, expected);
    }
    if (!Number.isInteger(index)) return null;
    return conjugatedLesson(verb, tenseKey, index, expected);
}

/** The auxiliary is a choice, so the correction teaches the choice, not a form. */
export function renderAuxLesson({ expected } = {}) {
    if (expected !== 'sein' && expected !== 'haben') return null;
    return lesson(
        expected,
        expected === 'sein'
            ? 'sein takes movement and a new state: gehen, bleiben, aufwachen.'
            : 'haben takes an object, and it is the default when neither applies: machen, lernen, warten.',
    );
}
