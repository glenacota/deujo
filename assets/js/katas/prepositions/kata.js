// katas/prepositions/kata.js
// Self-contained preposition kata: fill in the preposition together with the
// article it governs, so the case is part of the answer.

import { escapeHtml, createSectionFromTemplate } from '../../services/utility.js';
import { markControl } from '../../ui/answer-view.js';
import {
    CASE_LABELS,
    DETERMINERS,
    PREPOSITION_CONTRACTIONS,
    PREPOSITION_GROUP_LABELS,
    PREPOSITION_GROUPS,
    decomposePrepositionPhrase,
    hasOrderedBlankPlaceholders,
    normalizePhrase,
} from '../../services/grammar.js';
import { matchAnswer, formatAccepted } from '../../services/answer-matcher.js';
import { renderBlankSentence } from '../../services/blank-renderer.js';
import { prepositionsManifest } from './manifest.js';
import { prepositionsTemplate } from './template.js';

const VALID_CASE_NAMES = Object.keys(CASE_LABELS).filter((c) => c !== 'nom');

const GROUP_OF = new Map();
for (const [group, list] of Object.entries(PREPOSITION_GROUPS)) {
    for (const preposition of list) GROUP_OF.set(preposition, group);
}

/** "zum" / "in den" -> the preposition it belongs to, or null when unrecognised. */
function prepositionOf(answer) {
    const contracted = PREPOSITION_CONTRACTIONS[answer];
    if (contracted) return contracted.preposition;
    const head = answer.split(' ')[0];
    return GROUP_OF.has(head) ? head : null;
}

export function validatePrepositionDataset(dataset) {
    if (!Array.isArray(dataset) || dataset.length === 0) {
        throw new Error('dataset must be a non-empty array');
    }

    /**
     * A phrase is a usable answer only if it starts with a real preposition whose
     * determiner exists in the claimed case. The determiner is the first word, so
     * a longer phrase like "in die Tür" is still accepted as an answer.
     */
    const isUsableAnswer = (answer, caseKey) => {
        const phrase = normalizePhrase(answer);
        const preposition = prepositionOf(phrase);
        const determiner = preposition ? decomposePrepositionPhrase(phrase, preposition)?.split(' ')[0] : null;
        return preposition !== null && determiner !== null && Boolean(DETERMINERS[caseKey]?.has(determiner));
    };

    dataset.forEach((item, index) => {
        const validBlanks = Array.isArray(item?.b) && item.b.length > 0 && item.b.every((blank) => {
            const validAlt = blank?.alt === undefined
                || (Array.isArray(blank.alt) && blank.alt.every((alt) => (
                    typeof alt === 'string' && alt.trim() && isUsableAnswer(alt, blank.c)
                )));
            return (
                typeof blank?.a === 'string' &&
                blank.a.trim() &&
                VALID_CASE_NAMES.includes(blank.c) &&
                // The answer must really be a preposition plus a determiner...
                isUsableAnswer(blank.a, blank.c) &&
                // ...and so must every extra accepted answer.
                validAlt
            );
        });
        const placeholdersMatch = hasOrderedBlankPlaceholders(item?.s, item?.b?.length);

        if (
            !item ||
            typeof item.id !== 'string' ||
            !item.id.trim() ||
            typeof item.w !== 'string' ||
            !item.w.trim() ||
            typeof item.s !== 'string' ||
            !item.s.trim() ||
            typeof item.m !== 'string' ||
            !item.m.trim() ||
            !validBlanks ||
            !placeholdersMatch
        ) {
            throw new Error(`entry ${index} has an invalid sentence, translation, or preposition answers`);
        }
    });
}

function renderHelpMatrix() {
    return `
        <div class="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 font-medium text-indigo-900 dark:text-indigo-200">
            ☠️ <strong class="text-indigo-600 dark:text-indigo-400">Most prepositions decide the case for you</strong>. Learn each group by heart and only the nine two-way prepositions need real thought: Dativ for a place, Akkusativ for a movement towards it.
        </div>
        <div class="mt-4 space-y-4">
            ${Object.entries(PREPOSITION_GROUPS).map(([group, list]) => `
                <div>
                    <h3 class="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 px-1">
                        ${escapeHtml(PREPOSITION_GROUP_LABELS[group])}
                    </h3>
                    <p class="mt-1.5 font-mono text-sm text-slate-700 dark:text-slate-300 px-1">
                        ${list.map(escapeHtml).join(' · ')}
                    </p>
                </div>
            `).join('')}
        </div>
        <div class="mt-5">
            <h3 class="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 px-1">Short forms</h3>
            <div class="mt-1.5 font-mono text-sm text-slate-700 dark:text-slate-300 px-1 grid grid-cols-2 gap-x-4 gap-y-1">
                ${Object.entries(PREPOSITION_CONTRACTIONS).map(([form, { preposition, article }]) => `
                    <span>${escapeHtml(form)} = ${escapeHtml(`${preposition} ${article}`)}</span>
                `).join('')}
            </div>
        </div>
        <p class="mt-4 text-xs text-slate-500 dark:text-slate-400">Both spellings count as correct, so "zum" and "zu dem" are equally right.</p>
    `;
}

/**
 * Grades one blank. Both spellings of a contractable phrase are correct German,
 * so "zum" and "zu dem" each pass whichever one the dataset happens to store.
 * @param {string} given raw input from the learner
 * @param {{a: string, c: string, alt?: string[]}} blank
 * @returns {{preposition: string|null, determiner: string|null, accepted: string[], ok: boolean}}
 */
export function gradeBlank(given, blank) {
    const expected = normalizePhrase(blank?.a);
    const preposition = prepositionOf(expected);
    const determiner = preposition ? decomposePrepositionPhrase(expected, preposition) : null;

    const { accepted, ok } = matchAnswer(given, blank);

    return { preposition, determiner, accepted, ok };
}

/**
 * Builds the preposition kata and mounts its section into `container` straight
 * away, so `el` is fully populated for the caller and never null.
 * @param {HTMLElement} container
 */
export function createPrepositionKata(container) {
    let inputs = [];

    const section = createSectionFromTemplate(prepositionsTemplate);
    container.appendChild(section);

    const el = {
        section,
        sentence: section.querySelector('[data-role="sentence"]'),
        translation: section.querySelector('[data-role="translation"]'),
    };

    return {
        ...prepositionsManifest,
        validateDataset: validatePrepositionDataset,
        el,

        getHelpContent() {
            return renderHelpMatrix();
        },

        render(item) {
            inputs = renderBlankSentence(el, item, () => {
                const input = document.createElement('input');
                input.type = 'text';
                input.autocomplete = 'off';
                // "hinsichtlich des" is the longest answer, so allow for it.
                input.maxLength = '18';
                input.spellcheck = false;
                input.autocapitalize = 'none';
                input.autocorrect = 'off';
                input.lang = 'de';
                input.size = '12';
                input.placeholder = 'e.g. zum';
                input.className = 'inline-xl inline-block text-center bg-white dark:bg-slate-950 border placeholder-slate-400 dark:placeholder-slate-600 border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 lg:px-3 lg:py-1.5 text-base lg:text-xl text-indigo-700 dark:text-indigo-300 focus:outline-none focus:border-purple-500 leading-[1.5rem] lg:leading-[2rem]';
                return input;
            });
        },

        check(item) {
            if (!inputs.length) return null;

            if (inputs.some((input) => !input.value.trim())) {
                return { warning: 'Please fill in all blanks before checking.' };
            }

            const fields = inputs.map((input, i) => {
                const given = input.value.trim();
                const caseKey = item.b[i].c;
                const { preposition, ok, accepted } = gradeBlank(given, item.b[i]);
                // accepted[0] is the dataset's own spelling, so the note and the
                // summary always show what the data asked for first.
                const expected = accepted[0] ?? item.b[i].a;

                // On a miss the note lists every accepted spelling, so "zum" and
                // "zu dem" are both visible before the learner retypes one.
                markControl(input, { ok, expected, note: ok ? null : formatAccepted(accepted) });
                return {
                    label: preposition ? `${preposition} + ${CASE_LABELS[caseKey]}` : `Blank ${i + 1}`,
                    expected,
                    accepted,
                    given,
                    ok,
                };
            });

            return {
                correct: fields.every((f) => f.ok),
                fields,
            };
        },
    };
}
