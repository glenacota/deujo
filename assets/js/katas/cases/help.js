// katas/cases/help.js
// The case kata's help modal, as pure markup. Pure string work, so it stays
// unit-testable and never touches the DOM.
//
// Answer-blind: the body takes no item, so it cannot print the sentence on screen
// or the case the answer expects. The examples are determiner-plus-noun pairs the
// dataset really ships, which is what a learner has to produce and which
// `tests/unit/katas.test.js` enforces; that makes this kata's modal the mirror
// image of the two-way-prepositions one, where an example must not coincide with
// a shipped item.
//
// What this kata actually asks: every blank is a determiner — an article, a
// possessive or a numeral — and the noun it belongs to is always still visible in
// the sentence. So the gender is never in question, only the case. That is what
// this modal is about.

import { escapeHtml } from '../../services/utility.js';
import { CASE_LABELS, DEFINITE, INDEFINITE, PLURAL_DEFINITE, POSSESSIVE_ENDINGS, PREPOSITION_GROUPS } from '../../services/grammar.js';
import { banner, disclosure, rule, ruleList, wordGroup } from '../help-kit.js';

// ---- tables ---------------------------------------------------------------

/** The definite and indefinite article for every gender and case, as shipped in `grammar.js`. */
function articleMatrix() {
    const rows = [
        { label: 'Masculine', gender: 'der' },
        { label: 'Feminine', gender: 'die' },
        { label: 'Neuter', gender: 'das' },
        { label: 'Plural', gender: null },
    ];
    const cases = Object.keys(CASE_LABELS);

    return `
        <div class="overflow-x-auto">
            <table class="w-full min-w-[34rem] border-collapse text-left text-sm">
                <thead>
                    <tr class="border-b border-slate-200 text-xs font-bold uppercase text-purple-600 dark:border-slate-800 dark:text-purple-400">
                        <th class="px-3 py-2"></th>
                        ${cases.map((caseKey) => `<th class="px-3 py-2">${escapeHtml(CASE_LABELS[caseKey])}</th>`).join('')}
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-mono dark:divide-slate-800/60">
                    ${rows.map(({ label, gender }) => `
                        <tr>
                            <th scope="row" class="px-3 py-2 font-sans font-bold">${escapeHtml(label)}</th>
                            ${cases.map((caseKey) => `
                                <td class="whitespace-nowrap px-3 py-2">
                                    ${gender
                                        ? `${escapeHtml(DEFINITE[gender][caseKey])} / ${escapeHtml(INDEFINITE[gender][caseKey])}`
                                        : `${escapeHtml(PLURAL_DEFINITE[caseKey])} / —`}
                                </td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">Definite / indefinite. — = no plural indefinite article.</p>`;
}

/**
 * The possessive endings per case and gender, straight from the `POSSESSIVE_ENDINGS`
 * table the answer matcher grades against. A quarter of this kata's answers are
 * possessives, and the article table says nothing about them.
 *
 * Showing endings rather than whole words is deliberate: the stem never changes,
 * so `mein` + `em` covers every one of the six at once.
 */
function possessiveMatrix() {
    const cases = Object.keys(CASE_LABELS);
    const genders = [
        { label: 'der', key: 'der' },
        { label: 'die', key: 'die' },
        { label: 'das', key: 'das' },
        { label: 'die (plural)', key: 'plural' },
    ];

    return `
        <div class="overflow-x-auto">
            <table class="w-full min-w-[30rem] border-collapse text-left text-sm">
                <thead>
                    <tr class="border-b border-slate-200 text-xs font-bold uppercase text-purple-600 dark:text-purple-400">
                        <th class="px-3 py-2">Ending</th>
                        ${cases.map((caseKey) => `<th class="px-3 py-2">${escapeHtml(CASE_LABELS[caseKey])}</th>`).join('')}
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-mono dark:divide-slate-800/60">
                    ${genders.map(({ label, key }) => `
                        <tr>
                            <th scope="row" class="whitespace-nowrap px-3 py-2 font-sans font-bold">${escapeHtml(label)}</th>
                            ${cases.map((caseKey) => `
                                <td class="whitespace-nowrap px-3 py-2">${escapeHtml(POSSESSIVE_ENDINGS[key][caseKey] || '—')}</td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">Add the ending to the stem: <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">mein</code> + <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">em</code> = <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">meinem</code>. An em dash means the bare stem.</p>`;
}

// ---- blocks ---------------------------------------------------------------

function roleHelp() {
    const genPrepositions = PREPOSITION_GROUPS.gen.map(escapeHtml).join(', ');

    return [
        disclosure('Ask what the word does in the sentence', ruleList([
            rule('It does the verb, or is the one being described. That is the <strong>Nominativ</strong>, the subject.', 'Der · Die · Das · Ein · Eine · Mein · Sein'),
            rule('It is the thing handed over, moved or said. That is the <strong>Akkusativ</strong>, and most verbs take one object.', 'den Schlüssel · ein Buch · ihre Aufgaben'),
            rule('It is the person who receives it. That is the <strong>Dativ</strong>, and it comes <em>before</em> the Akkusativ.', 'dem Gast · meiner Schwester · seinem Kollegen'),
            rule('It belongs to someone, or it follows a Genitiv preposition. That is the <strong>Genitiv</strong>.', 'des Kindes · wegen des Streiks · trotz des Regens'),
            rule('A verb is what settles it. Look for one that takes a Dativ, because that case is the one you cannot guess from the meaning alone.', 'bringen · schenken · zeigen · geben · helfen · erklären'),
        ]), { open: true }),
        disclosure('Two objects, two cases', `
            <p class="px-1 text-slate-700 dark:text-slate-300">This is the commonest sentence in the kata, and the commonest mistake, because the two objects sit next to each other and get swapped.</p>
            ${ruleList([
                rule('When a verb gives something <em>to</em> someone, the person is <strong>Dativ</strong> and the thing is <strong>Akkusativ</strong>. The person comes first.', 'Die Ärztin gibt <strong>dem Patienten</strong> ein Rezept.'),
                rule('Read the verb twice: the object after <em>an</em> is for the person, the object after <em>and</em> is the thing.', 'Der Busfahrer erklärt <strong>dem Touristen</strong> seinen Weg.'),
                rule('If you know the verb takes a Dativ, the person is never the Akkusativ, however direct the action looks.', 'Eine Ärztin empfiehlt <strong>dem Patienten</strong> eine kurze Pause.'),
            ])}
        `),
        disclosure('Verbs that force a Dativ', ruleList([
            wordGroup('Giving, showing, telling, recommending — the person is the Dativ object.', 'bringen · schenken · zeigen · erklären · empfehlen · geben · leihen · verkaufen'),
            wordGroup('Helping, replying and reactions — the person is the Dativ object.', 'helfen · dienen · folgen · schmecken · gefallen · passen · danken · antworten'),
            rule('The same verb usually takes an Akkusativ, so a learner who only knows English picks the wrong determiner.', 'Ich sehe <strong>ihn</strong>, but I help <strong>ihm</strong>.'),
            rule('After <code>mit</code> it is nearly always the Dativ, whatever the verb means.', 'mit <strong>dem</strong> Zug · mit meiner Schwester · mit den Schülern'),
        ])),
        disclosure('Possessive determiners', `
            ${possessiveMatrix()}
            ${ruleList([
                rule('<strong>die</strong> and <strong>das</strong> hide the difference in the Akkusativ: a feminine noun keeps its <code>-e</code> and a neuter one keeps the bare stem, so both rows read the same as the Nominativ.', 'seine Hausarbeit · ihr Buch · ihr Zimmer'),
                rule('The Dativ plural is the one place the stem grows by more than a case ending, so it is worth memorising as a set.', 'den Kindern · seinen Eltern · seinen Enkeln'),
                rule('<code>ein</code> and <code>kein</code> take the same endings, so <code>einer</code> is the Genitiv and <code>einem</code> the Dativ.', 'einer Schülerin'),
            ])}
        `),
        disclosure('The Genitiv is rare and always telegraphed', ruleList([
            rule('A masculine or neuter noun in the Genitiv ends in <code>-s</code> or <code>-es</code>, and the determiner in front of it is <strong>des</strong>.', 'des Mannes · des Streiks · des Regens · des Busses'),
            rule('A feminine noun keeps its ending and takes <strong>einer</strong>, so look there too.', 'einer Schülerin · einer Leiter'),
            rule(`Every Genitiv preposition takes it, and the list is short: <code>${genPrepositions}</code>.`, 'wegen des Streiks · während des Unterrichts · statt des Busses'),
            rule('There is no other route to the Genitiv in this kata, so the noun itself gives it away and the determiner is only the last step.', 'Wegen <strong>des</strong> Regens · den Schlüssel <strong>einer</strong> Schülerin'),
        ])),
        disclosure('The articles, all four cases', articleMatrix()),
        disclosure('Where it lies to you', ruleList([
            rule('<strong>der</strong> is not a safe guess for a man: the Akkusativ is <strong>den</strong> and the Dativ is <strong>dem</strong>.', 'der Hund → <strong>den</strong> Hund · <strong>dem</strong> Hund'),
            rule('<strong>die</strong> is not a safe guess for a woman: the Dativ is <strong>der</strong>, while Akkusativ and Nominativ both stay <strong>die</strong>.', 'die Mutter → <strong>der</strong> Mutter · die Katze → <strong>der</strong> Katze'),
            rule('The plural is the one row that changes shape across the four cases, so <strong>den</strong> always means Dativ plural here.', 'die Gäste · <strong>den</strong> Schülern'),
            rule('A noun after <code>ein</code> or <code>zwei</code> decides nothing about the case; the verb still does.', 'ein Buch · eine Woche · zwei Brötchen'),
        ])),
    ].join('');
}

/** The case kata's help body. Takes no item, so it can never leak the answer. */
export function renderCaseHelp() {
    return [
        banner(
            'The noun is already in the sentence',
            'Every blank here is an article, a possessive or a numeral, and the noun it belongs to is still there to read. The gender is never the question. Only the case is.',
        ),
        roleHelp(),
    ].join('');
}
