// katas/prepositions/help.js
// The preposition kata's help modal, as pure markup. Pure string work, so it
// stays unit-testable and never touches the DOM.
//
// Answer-blind: the body takes no item, so it cannot print the sentence on screen
// or the phrase the blank expects. It will also not quote a shipped sentence, so
// no example here can coincide with the item on screen.
//
// What this kata actually asks: the answer is the preposition *and* the article it
// governs, so the case is part of the answer. Three of the four rection groups
// come straight from the `PREPOSITION_GROUPS` table, which is generated into the
// second block. The real work is the nine two-way prepositions, and the second
// real trap is that a Genitiv preposition almost always arrives with a noun in
// `-s` or `-es`.

import { escapeHtml } from '../../services/utility.js';
import { PREPOSITION_CONTRACTIONS, PREPOSITION_GROUP_LABELS, PREPOSITION_GROUPS } from '../../services/grammar.js';
import { banner, code, disclosure, rule, ruleList, wordGroup } from '../help-kit.js';

/** The three one-way groups, generated so a table change cannot miss the modal. */
function groupLists() {
    return Object.entries(PREPOSITION_GROUPS).map(([group, list]) => `
        <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 px-1">
                ${escapeHtml(PREPOSITION_GROUP_LABELS[group])}
            </h3>
            <p class="mt-1.5 font-mono text-sm text-slate-700 dark:text-slate-300 px-1">
                ${list.map(escapeHtml).join(' · ')}
            </p>
        </div>
    `).join('');
}

function locationTable() {
    // One row per two-way preposition, each pair taken from the kata's own
    // sentences: a state (Dativ) and a movement (Akkusativ) side by side, so the
    // difference is a word rather than a rule to hold in the head.
    const pairs = [
        { preposition: 'an', place: 'Die Laterne hängt an der Decke.', move: 'Die Vase hängt an den Haken.' },
        { preposition: 'auf', place: 'Der Brief liegt auf dem Tisch.', move: 'Die Katze springt auf den Schrank.' },
        { preposition: 'hinter', place: 'Der Hund wartet hinter dem Sofa.', move: 'Die Katze schläft hinter dem Vorhang.' },
        { preposition: 'in', place: 'Die Katze schläft in der Küche.', move: 'Der Hund läuft in den Garten.' },
        { preposition: 'neben', place: 'Die Lampe steht neben dem Bett.', move: 'Der Hund wartet neben die Tür.' },
        { preposition: 'unter', place: 'Der Hund schläft unter dem Tisch.', move: 'Das Kind kriecht unter die Bank.' },
        { preposition: 'vor', place: 'Die Katze wartet vor der Haustür.', move: 'Ein Hund läuft vor das Haus.' },
        { preposition: 'zwischen', place: 'Zwischen den Vorhängen steht ein Bild.', move: 'Er stellt die Karte zwischen die Bücher.' },
    ];

    return `
        <div class="overflow-x-auto">
            <table class="w-full min-w-[26rem] border-collapse text-left text-sm">
                <thead>
                    <tr class="border-b border-slate-200 text-xs font-bold uppercase text-purple-600 dark:text-purple-400">
                        <th class="px-2 py-2">Dativ = where</th>
                        <th class="px-2 py-2">Akkusativ = to where</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
                    ${pairs.map(({ place, move }) => `
                        <tr>
                            <td class="px-2 py-2 font-mono text-slate-700 dark:text-slate-300">${escapeHtml(place)}</td>
                            <td class="px-2 py-2 font-mono text-slate-700 dark:text-slate-300">${escapeHtml(move)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">Every row is the same preposition. Only the case changes, and the case is in the answer.</p>`;
}

function contractionList() {
    return `
        <div class="font-mono text-sm text-slate-700 dark:text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            ${Object.entries(PREPOSITION_CONTRACTIONS).map(([form, { preposition, article }]) => `
                <span>${escapeHtml(form)} = ${escapeHtml(`${preposition} ${article}`)}</span>
            `).join('')}
        </div>
        <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">Both spellings count as correct, so "zum" and "zu dem" are equally right. Only a definite article fuses; with <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">ein</code> the phrase stays written out, as in "mit einem".</p>`;
}

export function renderPrepositionHelp() {
    return [
        banner(
            'The preposition decides the case for you',
            'Almost none of this is a choice. Learn each group and the article follows. Only the nine two-way prepositions need real thought: Dativ for a place, Akkusativ for a movement towards it.',
        ),
        disclosure('Where, or towards where', `
            <p class="px-1 text-slate-700 dark:text-slate-300">Nine prepositions take both cases, and this is the only part of the kata that cannot be looked up. Read the verb, not the preposition.</p>
            ${ruleList([
                rule('Something stays, lies, hangs or waits: <strong>Dativ</strong>.', 'liegen · hängen · schlafen · warten · stehen'),
                rule('Something moves, goes, jumps or puts itself: <strong>Akkusativ</strong>.', 'gehen · laufen · springen · fahren · klettern · stellen · legen'),
                rule('Two clauses about the same preposition are the fastest way to see it. Only the verb moves.', 'Der Brief liegt <strong>auf dem</strong> Tisch, aber die Kinder klettern <strong>auf den</strong> Tisch.'),
                rule('The contrast is often spelled out in the sentence itself, with <em>nicht</em>, <em>aber</em> or <em>danach</em> between the two halves.', 'Die Katze schläft <strong>in der</strong> Küche, aber der Hund läuft <strong>in den</strong> Garten.'),
            ])}
            ${locationTable()}
        `, { open: true }),
        disclosure('The three groups that never move', `
            <p class="px-1 text-slate-700 dark:text-slate-300">Pick the preposition, and the case is already decided. These are the ones a learner gets right by memorising the list.</p>
            <div class="space-y-4">
                ${groupLists()}
            </div>
        `),
        disclosure('When it looks Akkusativ but is Dativ', ruleList([
            wordGroup('A few verbs take a Dativ even though they sound transitive. With these the thing is <em>auf</em>, not <em>an</em>, and the case stays Dativ.', 'warten auf · sich freuen auf · teilnehmen an · aufhören mit'),
            wordGroup('<code>von</code> and <code>zu</code> are Dativ even when the sentence is about motion.', 'Der Brief ist von der Rezeption, nicht vom Chef.'),
            wordGroup('After <code>bis</code> the missing article is supplied, which is why it behaves like a Dativ preposition.', 'bis zum Bahnhof · bis an die Tür'),
            rule('The Genitiv prepositions <code>wegen</code> and <code>trotz</code> also accept Dativ in speech, but this kata stores the written form, so answer <code>des</code> or <code>der</code>.', 'Trotz <strong>dem</strong> Regen is heard; the kata wants <strong>des</strong> Regens.'),
        ])),
        disclosure('A Genitiv is telegraphed too', ruleList([
            rule('The noun after a Genitiv preposition usually ends in <code>-s</code> or <code>-es</code>, and that is the signal to reach for <code>des</code> or <code>eines</code>.', 'Wegen <strong>des</strong> Regens · wegen <strong>eines</strong> Streiks'),
            rule('The same is true without a preposition, when a noun shows who owns what.', 'die Jacke <strong>seines</strong> Bruders'),
            rule('So the Genitiv is never a leap: the word ending already told you, and the article is only the last step.', 'Anlässlich <strong>des</strong> Jubiläums · während <strong>der</strong> Sitzung'),
        ])),
        disclosure('Short forms', contractionList()),
    ].join('');
}
