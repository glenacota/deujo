// katas/verbs/help.js
// The three verb katas' help modal, as pure markup. One pure function per tense
// so the content stays unit-testable and never touches the DOM.
//
// Answer-blind on purpose. The modal used to print the current verb's whole
// conjugation table, which handed over all six blanks (or the participle) and
// made the kata's own "no note on a miss" note honest for the wrong reason. It
// now teaches the rule and works one fixed verb, so opening help still costs the
// learner the part that has to be thought about: which person, which ending,
// which auxiliary.
//
// Every dynamic string is escaped before it reaches `UiController#showHelpContent`,
// which is the one trusted-HTML sink and does not escape for its caller.

import { escapeHtml } from '../../services/utility.js';
import { PERSONS } from '../../services/grammar.js';
import { banner, code, disclosure, rule, ruleList } from '../help-kit.js';

// ---- tables ---------------------------------------------------------------

/** The six persons against one ending each, built from `PERSONS` so it cannot drift. */
function endingsTable(endings) {
    return `
        <div class="overflow-x-auto">
            <table class="w-full border-collapse text-left text-sm">
                <tbody class="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                    ${PERSONS.map((person, index) => `
                        <tr>
                            <th scope="row" class="py-1.5 pr-3 font-bold text-slate-600 dark:text-slate-400">${escapeHtml(person.label)}</th>
                            <td class="py-1.5">${code(endings[index])}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

/** The worked verb, written out, so the method lands on a real sentence. */
function exampleTable(forms) {
    return `
        <div class="overflow-x-auto">
            <table class="w-full border-collapse text-left text-sm font-mono">
                <tbody class="divide-y divide-slate-200 dark:divide-slate-800/60">
                    ${PERSONS.map((person, index) => `
                        <tr>
                            <th scope="row" class="py-1.5 pr-3 font-sans font-bold text-slate-600 dark:text-slate-400">${escapeHtml(person.label)}</th>
                            <td class="py-1.5">${escapeHtml(forms[index])}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <p class="px-1 text-xs text-slate-500 dark:text-slate-400">A fixed verb, never the one on screen.</p>`;
}

// ---- Präsens --------------------------------------------------------------

const PRES_ENDINGS = ['-e', '-st', '-t', '-en', '-t', '-en'];

function presHelp() {
    return [
        banner(
            'Only wir, ihr and sie/Sie never change',
            'Those three take the infinitive stem and an ending, so every stem change in this kata lands in ich, du or er/sie/es.',
        ),
        disclosure('Endings', `
            ${ruleList([
                rule('Add the ending to the stem, which is the infinitive minus <code>-en</code>.', 'machen → mach- · geh- · lern-'),
                rule('wir, ihr and sie/Sie get an ending and nothing else.', 'ich mache · wir machen · sie machen'),
            ])}
            ${endingsTable(PRES_ENDINGS)}
        `, { open: true }),
        disclosure('Stem changes, in du and er/sie/es only', ruleList([
            rule('<code>a, o, u</code> take an umlaut.', 'du fährst · er löst · ich führe'),
            rule('<code>au</code> becomes <code>äu</code>.', 'du läufst · er läuft'),
            rule('<code>e</code> becomes <code>i</code>.', 'du liest · er nimmt'),
            rule('<code>ei, ie</code> becomes <code>i</code>.', 'du bleibst · er schreibt'),
            rule('Stems in <code>-eln</code> and <code>-ern</code> never change.', 'du sammelst · er wandert'),
            rule('An inseparable prefix stays unstressed, so the stem holds.', 'du verstehst · er bearbeitet'),
            rule('A stem in <code>-s</code>, <code>-ß</code> or <code>-x</code> drops the <code>-st</code>.', 'du heißt · er heißt'),
            rule('A stem in <code>-t</code>, <code>-d</code>, <code>-n</code> or <code>-m</code> inserts <code>e</code>.', 'du rechnest · er findet'),
            rule('A short vowel before consonants takes no <code>e</code>.', 'du tust · er tut'),
        ])),
        disclosure('Read the sentence first', ruleList([
            rule('The verb comes second, so the subject gives the person.', 'Heute <b>kaufe ich</b> ein Brot.'),
            rule('A separable prefix jumps to the end of the clause.', 'ich kauf<b>en</b>… → ich kaufe ein Brot <b>ein</b>'),
            rule('The last row is <code>sie</code> (they) with a plural noun, and <code>Sie</code> (polite you) otherwise.', 'sie kaufen · Sie kaufen'),
        ])),
        disclosure('Worked example: fahren', exampleTable(['fahre', 'fährst', 'fährt', 'fahren', 'fahrt', 'fahren'])),
    ].join('');
}

// ---- Präteritum -----------------------------------------------------------

const PRAET_WEAK_ENDINGS = ['-te', '-test', '-te', '-ten', '-tet', '-ten'];

function praetHelp() {
    return [
        banner(
            'Most verbs are weak',
            'A weak verb adds -te and the ending, and nothing in the stem moves. Only strong verbs change the vowel, and they follow no rule.',
        ),
        disclosure('Weak verbs', `
            ${ruleList([
                rule('Stem + <code>-te</code> + ending.', 'lernen → ich lerne · du lernst · wir lernen'),
                rule('A stem in <code>-t</code> or <code>-d</code> keeps the <code>e</code> in front of the <code>-te</code>.', 'arbeiten → ich arbeitete · ihr arbeitet'),
            ])}
            ${endingsTable(PRAET_WEAK_ENDINGS)}
        `, { open: true }),
        disclosure('Strong verbs', ruleList([
            rule('The stem vowel changes and has to be learned per verb; there is no dependable pattern.', 'nehmen → ich nahm · trinken → ich trank · singen → ich sang'),
            rule('Verbs in <code>-ieren</code>, <code>-eln</code> and <code>-ern</code> are almost always weak.', 'studieren → ich studierte · sammeln → ich sammelte'),
            rule('Three verbs run their own course, so learn all six forms of each.', 'ich war · ich hatte · ich wurde'),
        ])),
        disclosure('Two spelling traps', ruleList([
            rule('Weak verb with a short vowel: <code>ss</code> becomes <code>s</code>.', 'wissen → ich wusste'),
            rule('Strong verb: <code>-h</code> becomes <code>ch</code>.', 'gehen → ich ging · sehen → ich sah'),
        ])),
        disclosure('Read the sentence first', ruleList([
            rule('The verb comes second, so the subject gives the person.', 'Letztes Jahr <b>besuchte ich</b> meine Oma.'),
            rule('A separable prefix jumps to the end of the clause.', 'ich kam <b>an</b> · ich <b>kam</b> pünktlich <b>an</b>'),
        ])),
        disclosure('Worked example: nehmen', exampleTable(['nahm', 'nahmst', 'nahm', 'nahmen', 'nahmt', 'nahmen'])),
    ].join('');
}

// ---- Perfekt --------------------------------------------------------------

function perfHelp() {
    return [
        banner(
            'Auxiliary first, participle last',
            'Almost every Perfekt form is a conjugated auxiliary plus a participle at the end. The auxiliary carries the person, the participle the meaning.',
        ),
        disclosure('Word order', ruleList([
            rule('The auxiliary is the second thing in the sentence, the participle the last word of the clause.', 'Ich <b>habe</b> das Buch <b>gelesen</b>.'),
            rule('The auxiliary is conjugated exactly like the Präsens of sein or haben.', 'ich habe · du hast · er hat · wir haben · ihr habt · sie haben'),
        ]), { open: true }),
        disclosure('The participle', ruleList([
            rule('Stem vowel unchanged: <code>ge-</code> + stem + <code>-t</code>.', 'lernen → gelernt · machen → gemacht'),
            rule('Stem vowel changed: <code>ge-</code> + changed stem + <code>-en</code>.', 'gehen → gegangen · nehmen → genommen'),
            rule('A separable verb keeps its <code>ge-</code>.', 'einkaufen → eingekauft'),
            rule('No <code>ge-</code> after an inseparable prefix or after <code>-ieren</code>, <code>-eln</code>, <code>-ern</code>.', 'verstehen → verstanden · studieren → studiert · sammeln → gesammelt'),
        ])),
        disclosure('sein or haben', ruleList([
            rule('Movement from here to there: <strong>sein</strong>.', 'gehen · kommen · fahren · laufen · fliegen · aufstehen · einschlafen'),
            rule('A new state begins, or something stays: <strong>sein</strong>.', 'aufwachen · bleiben · werden · wachsen · sterben'),
            rule('The verb takes an object: <strong>haben</strong>.', 'kaufen · lesen · essen · schreiben · sehen · nehmen'),
            rule('Neither of those? <code>haben</code> is the default, so guess <code>haben</code>.', 'arbeiten · lernen · warten · tanzen · regnen'),
        ], { ordered: true })),
        disclosure('Where the two verbs mix', ruleList([
            rule('Modal verbs and <code>lassen</code> form one word and take no participle of their own.', 'ich habe gemusst · ich habe das Auto gelassen'),
            rule('A verb plus <code>zu</code> forms no participle.', 'ich habe vorzulesen'),
            rule('One verb has two participles, but this kata wants only one of them.', 'schwimmen → ich bin geschwommen'),
            rule('An object can flip the verb over to <code>haben</code>.', 'ich bin gefahren · ich habe ein Auto gefahren'),
        ])),
        disclosure('Worked examples', ruleList([
            rule('Movement, so <code>sein</code>.', 'gehen → ich bin gegangen'),
            rule('An object, so <code>haben</code>.', 'machen → ich habe gemacht'),
            rule('A new state, so <code>sein</code>.', 'bleiben → ich bin geblieben'),
        ])),
    ].join('');
}

/** The help body for one tense. Takes no item, so it can never leak the answer. */
export function renderVerbHelp(tenseKey) {
    if (tenseKey === 'perf') return perfHelp();
    if (tenseKey === 'praet') return praetHelp();
    return presHelp();
}
