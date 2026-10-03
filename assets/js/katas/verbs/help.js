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
// Every dynamic string is escaped here. `UiController#showHelpContent` is the one
// trusted-HTML sink and does not escape for its caller.

import { escapeHtml } from '../../services/utility.js';
import { PERSONS } from '../../services/grammar.js';

// ---- markup helpers -------------------------------------------------------

const CODE_CLASS = 'bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono';

/** A German word or ending. All input to it is escaped. */
const code = (value) => `<code class="${CODE_CLASS}">${escapeHtml(value)}</code>`;

/** The warning that opens every kata's help: what a learner would get wrong. */
function banner(headline, body) {
    return `
        <div class="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 font-medium text-indigo-900 dark:text-indigo-200">
            <strong class="text-indigo-600 dark:text-indigo-400">${escapeHtml(headline)}</strong>. ${escapeHtml(body)}
        </div>`;
}

/**
 * A collapsible block, so a phone opens one idea at a time instead of a long
 * scroll. Native `<details>`: no JS, no focus juggling, keyboard reachable.
 */
function disclosure(title, bodyHtml, { open = false } = {}) {
    return `
        <details class="group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60"${open ? ' open' : ''}>
            <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
                <span>${escapeHtml(title)}</span>
                <span class="shrink-0 text-slate-400 transition-transform group-open:rotate-90" aria-hidden="true">›</span>
            </summary>
            <div class="px-4 pb-4 space-y-2 text-sm">${bodyHtml}</div>
        </details>`;
}

/** One rule: the pattern in prose, the forms it produces underneath. */
function rule(patternHtml, forms) {
    return `
        <li class="px-1 py-1.5">
            <span class="block text-slate-700 dark:text-slate-300">${patternHtml}</span>
            <span class="block font-mono text-xs text-slate-500 dark:text-slate-400">${escapeHtml(forms)}</span>
        </li>`;
}

const ruleList = (rules) => `<ul class="space-y-1">${rules.join('')}</ul>`;

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
        <p class="px-1 text-xs text-slate-500 dark:text-slate-400">A fixed example verb, not the one on screen.</p>`;
}

// ---- Präsens --------------------------------------------------------------

const PRES_ENDINGS = ['-e', '-st', '-t', '-en', '-t', '-en'];

function presHelp() {
    return [
        banner(
            'Only du and er/sie/es change',
            'The wir, ihr and sie/Sie forms are the infinitive stem with an ending, so a stem change shows up in the singular alone.',
        ),
        disclosure('Endings', `
            ${ruleList([
                rule('Add the ending to the stem (infinitive minus <code>-en</code>).', 'machen → mach- · geh- · lern-'),
                rule('No ending at all on wir, ihr and sie/Sie.', 'ich mache · wir machen · sie machen'),
            ])}
            ${endingsTable(PRES_ENDINGS)}
        `, { open: true }),
        disclosure('Stem changes, in du and er/sie/es only', ruleList([
            rule('<code>a, o, u</code> take an umlaut.', 'du fährst · er löst · ich führe'),
            rule('<code>au</code> takes <code>äu</code>.', 'du läufst · er läuft'),
            rule('<code>e</code> becomes <code>i</code>.', 'du liest · er nimmt'),
            rule('<code>ei, ie</code> becomes <code>i</code>.', 'du bleibst · er schreibt'),
            rule('Stems in <code>-eln</code> and <code>-ern</code> never change.', 'du sammelst · er wandert'),
            rule('An inseparable prefix stays unstressed.', 'du verstehst · er bearbeitet'),
            rule('A stem ending in <code>-s</code>, <code>-ß</code> or <code>-x</code> drops the <code>-st</code>.', 'du heißt · er tut'),
            rule('A stem ending in <code>-t</code>, <code>-d</code>, <code>-n</code> or <code>-m</code> inserts <code>-e</code>.', 'du rechnest · er findet'),
        ])),
        disclosure('Read the sentence first', ruleList([
            rule('The verb is the second thing in the sentence, so the subject gives the person.', 'Heute <b>kaufe ich</b> ein Brot.'),
            rule('A separable prefix jumps to the end of the clause.', 'ich kauf<b>en</b>… → ich kaufe ein Brot <b>ein</b>'),
            rule('The last row is <code>sie</code> (they) when a plural follows, and <code>Sie</code> (you, polite) otherwise.', 'sie kaufen · Sie kaufen'),
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
            'A weak verb takes the stem + -te + the ending, and nothing in the stem moves. Only strong verbs change the vowel, and they follow no rule.',
        ),
        disclosure('Weak verbs', `
            ${ruleList([
                rule('Stem + <code>-te</code> + ending.', 'lernen → ich lerne · du lernst · wir lernen'),
                rule('A stem ending in <code>-t</code> or <code>-d</code> keeps the <code>-te</code> audible instead.', 'ich lerne · du arbeitest · ihr arbeitet'),
            ])}
            ${endingsTable(PRAET_WEAK_ENDINGS)}
        `, { open: true }),
        disclosure('Strong verbs', ruleList([
            rule('The stem vowel changes and has to be learned per verb; there is no dependable pattern.', 'nehmen → ich nahm · trinken → ich trank · singen → ich sang'),
            rule('Verbs in <code>-ieren</code>, <code>-eln</code> and <code>-ern</code> are almost always weak.', 'studieren → ich studierte · sammeln → ich sammelte'),
            rule('Three verbs do their own thing, so learn all six forms.', 'ich war · ich hatte · ich wurde'),
        ])),
        disclosure('Spelling after h and t', ruleList([
            rule('A stem ending in <code>-t</code> or <code>-h</code> after a vowel turns to <code>s</code> or <code>ch</code>.', 'gehen → ich ging · machen → ich machte · wissen → ich wusste'),
        ])),
        disclosure('Read the sentence first', ruleList([
            rule('The verb is the second thing in the sentence, so the subject gives the person.', 'Letztes Jahr <b>besuchte ich</b> meine Oma.'),
            rule('A separable prefix jumps to the end of the clause.', 'ich kam <b>an</b> · ich <b>kam</b> pünktlich <b>an</b>'),
        ])),
        disclosure('Worked example: nehmen', exampleTable(['nahm', 'nahmst', 'nahm', 'nahmen', 'nahmt', 'nahmen'])),
    ].join('');
}

// ---- Perfekt --------------------------------------------------------------

function perfHelp() {
    return [
        banner(
            'Auxiliary first, then participle at the end',
            'The auxiliary carries the person and the tense; the participle carries the meaning.',
        ),
        disclosure('Word order', ruleList([
            rule('The auxiliary is the second thing in the sentence, the participle the last word of the clause.', 'Ich <b>habe</b> das Buch <b>gelesen</b>.'),
            rule('The auxiliary is conjugated exactly like the Präsens of sein or haben.', 'ich habe · du hast · er hat · wir haben · ihr habt · sie haben'),
        ]), { open: true }),
        disclosure('The participle', ruleList([
            rule('Regular verb: <code>ge-</code> + stem + <code>-t</code>.', 'lernen → gelernt · machen → gemacht'),
            rule('A verb whose stem vowel changes: <code>ge-</code> + changed stem + <code>-en</code>.', 'gehen → gegangen · lesen → gelesen · nehmen → genommen'),
            rule('A separable verb keeps its <code>ge-</code>.', 'einkaufen → eingekauft'),
            rule('No <code>ge-</code> after an inseparable prefix or after <code>-ieren</code>, <code>-eln</code>, <code>-ern</code>.', 'verstehen → verstanden · studieren → studiert · sammeln → gesammelt'),
        ])),
        disclosure('sein or haben', `
            <ol class="space-y-1 list-decimal pl-4">
                <li class="px-1 py-1.5">
                    <span class="block text-slate-700 dark:text-slate-300">Movement from here to there: <code>sein</code>.</span>
                    <span class="block font-mono text-xs text-slate-500 dark:text-slate-400">gehen · kommen · fahren · laufen · fliegen · aufstehen · einschlafen</span>
                </li>
                <li class="px-1 py-1.5">
                    <span class="block text-slate-700 dark:text-slate-300">A new state begins, or something stays: <code>sein</code>.</span>
                    <span class="block font-mono text-xs text-slate-500 dark:text-slate-400">aufwachen · bleiben · werden · wachsen · sterben</span>
                </li>
                <li class="px-1 py-1.5">
                    <span class="block text-slate-700 dark:text-slate-300">The verb takes an object: <code>haben</code>.</span>
                    <span class="block font-mono text-xs text-slate-500 dark:text-slate-400">kaufen · lesen · essen · schreiben · sehen · nehmen</span>
                </li>
                <li class="px-1 py-1.5">
                    <span class="block text-slate-700 dark:text-slate-300">Neither of those? <code>haben</code> is the default, so guess <code>haben</code>.</span>
                    <span class="block font-mono text-xs text-slate-500 dark:text-slate-400">arbeiten · lernen · warten · tanzen · regnen</span>
                </li>
            </ol>
        `),
        disclosure('Where the two verbs mix', ruleList([
            rule('Modal verbs and <code>lassen</code> form one word and take no participle of their own.', 'ich habe gemusst · ich habe gekonnt · ich habe das Auto gelassen'),
            rule('A verb plus <code>zu</code> forms no participle.', 'ich habe vorzulesen'),
            rule('A few verbs accept either auxiliary.', 'schwimmen → geschwimmt or geschwommen'),
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
