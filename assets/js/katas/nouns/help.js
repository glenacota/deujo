// katas/nouns/help.js
// The noun kata's help modal, as pure markup. Pure string work, so it stays
// unit-testable and never touches the DOM.
//
// Answer-blind: the body takes no item, so it cannot print the noun on screen or
// the plural it expects.
//
// The order is the teaching. Gender first, then the plural, because every plural
// rule below depends on the gender: `das` + `-er` takes the umlaut (die Bücher)
// while `der` + `-er` usually does not (die Lehrer). A plural rule taught before
// the gender is a rule the learner cannot apply.

import { banner, disclosure, rule, ruleList, wordGroup } from '../help-kit.js';

function genderHelp() {
    return [
        disclosure('Gender by ending', ruleList([
            rule('<code>-ung, -heit, -keit, -schaft, -ion, -ei</code> are <strong>die</strong>, with no known exception.', 'die Wohnung · die Sicherheit · die Krankheit · die Mannschaft · die Information · die Bäckerei'),
            rule('<code>-chen, -lein, -nis</code> are <strong>das</strong>.', 'das Mädchen · das Brötchen · das Ereignis'),
            rule('<code>-er, -ling</code> are usually <strong>der</strong>, but some are <strong>die</strong>.', 'der Lehrer · der Frühling · der Computer — but die Nummer · die Kammer'),
            rule('An activity, a quality or a manner is <strong>das</strong>, whatever the ending looks like.', 'das Essen · das Trinken · das Wissen · das Glück'),
            rule('A loanword in <code>-e, -a, -o, -i, -um, -on</code> is usually <strong>das</strong>.', 'das Auto · das Sofa · das Klima · das Museum · das Telefon'),
            rule('Everything else has to be learned with its gender. There is no rule left to fall back on.', 'der Tisch · die Lampe · das Haus'),
        ]), { open: true }),
        disclosure('Where the ending lies to you', ruleList([
            wordGroup('A person, an animal or a trade is <strong>die</strong> far more often than the ending suggests, even in <code>-er</code>.', 'die Katze · der Nachbar → die Nachbarn · der Kollege → die Kollegen'),
            wordGroup('Some <strong>das</strong> words take the <strong>der</strong> plural ending, so the umlaut comes with the ending rather than with the gender.', 'das Ei → die Eier · das Museum → die Museen'),
            wordGroup('Family words take <strong>die</strong> and an umlaut, the feminine pattern that looks backwards.', 'die Mutter → die Mütter · die Tochter → die Töchter'),
        ])),
    ].join('');
}

function pluralHelp() {
    return [
        disclosure('The plural, once you know the gender', `
            ${ruleList([
                rule('<strong>die</strong> is the commonest gender: <code>-n</code> or <code>-en</code>, with no umlaut.', 'die Frage → die Fragen · die Zeitung → die Zeitungen · die Tasche → die Taschen'),
                rule('<strong>der</strong> takes <code>-e</code> or <code>-en</code>, very often with an umlaut.', 'der Stuhl → die Stühle · der Tag → die Tage · der Garten → die Gärten'),
                rule('<strong>der</strong> in <code>-er</code> or <code>-en</code> often takes no ending at all.', 'der Lehrer → die Lehrer · der Finger → die Finger · der Rücken → die Rücken'),
                rule('<strong>das</strong> in <code>-er</code> or <code>-en</code> takes an umlaut and no extra ending, unless the vowel already is one.', 'das Buch → die Bücher · das Kind → die Kinder · das Haus → die Häuser'),
                rule('<strong>das</strong> with a stem vowel takes <code>-s</code> and no umlaut.', 'das Auto → die Autos · das Sofa → die Sofas · das Baby → die Babys'),
                rule('<strong>das</strong> in <code>-chen</code> or <code>-lein</code> does not change at all.', 'das Mädchen → die Mädchen · das Brötchen → die Brötchen'),
                rule('A <strong>der</strong> word for a person, a trade or a young animal takes <code>-n</code> or <code>-en</code>.', 'der Student → die Studenten · der Junge → die Jungen · der Mensch → die Menschen'),
            ])}
            <p class="px-1 text-xs text-slate-500 dark:text-slate-400">An umlaut needs a free slot to sit in. <strong>die</strong> already fills the syllable with <code>-en</code>, so on a feminine noun the umlaut is the exception, not the rule.</p>
        `),
        disclosure('No plural at all', `
            <p class="px-1 text-slate-700 dark:text-slate-300">These nouns have no plural. Their input is switched off, so the whole answer is the gender on its own: <strong>der Schnee</strong>, not an empty field.</p>
            ${ruleList([
                rule('Things there is only ever one of, or that get counted some other way.', 'der Schnee · der Regen · das Blut · das Gold · der Schlaf · der Lärm · die Ruhe · der Sport'),
                rule('Food and meals, which are counted by the portion.', 'das Essen · das Fleisch · das Obst · der Reis · die Butter'),
                rule('Nouns only ever used in the plural, so they are already plural and take no ending of their own.', 'die Eltern · die Leute · die Ferien · die Kosten · die Daten'),
            ])}
        `),
        disclosure('Where the rules break', ruleList([
            rule('A long <code>e</code> becomes <code>ie</code>, and <code>ei</code> becomes <code>eier</code>.', 'der See → die Seen · das Ei → die Eier'),
            rule('A <code>-l</code> before the added ending disappears.', 'das Regal → die Regale'),
            rule('A few <strong>die</strong> nouns take an umlaut anyway.', 'die Stadt → die Städte · die Nacht → die Nächte'),
            rule('A <strong>das</strong> loanword in <code>-um</code> or <code>-on</code> takes <code>-e</code> or <code>-en</code>.', 'das Museum → die Museen · das Telefon → die Telefone'),
            rule('A <strong>das</strong> loanword in <code>-o</code> takes <code>-s</code> instead, which is the exception to the line above.', 'das Kino → die Kinos · das Auto → die Autos'),
            rule('One noun in this dataset has two plurals, and the kata accepts either.', 'der Name → die Namen or die Names'),
            rule('A few everyday plurals follow no pattern and are learned as they come.', 'der Chef → die Chefs · der Laptop → die Laptops'),
        ])),
    ].join('');
}

/** The noun kata's help body. Takes no item, so it can never leak the answer. */
export function renderNounHelp() {
    return [
        banner(
            'Learn the gender first',
            'No single rule covers all nouns, and the gender decides the plural. A gender guessed from the ending is usually right; a plural guessed without the gender usually is not.',
        ),
        genderHelp(),
        pluralHelp(),
    ].join('');
}
