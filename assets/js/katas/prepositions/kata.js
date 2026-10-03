// katas/prepositions/kata.js
// Self-contained preposition kata: fill in the preposition together with the
// article it governs, so the case is part of the answer.

import { escapeHtml, createSectionFromTemplate } from '../../services/utility.js';
import { markControl } from '../../ui/answer-view.js';
import {
    CASE_LABELS,
    PREPOSITION_CONTRACTIONS,
    PREPOSITION_GROUP_LABELS,
    PREPOSITION_GROUPS,
    hasOrderedBlankPlaceholders,
    isPrepositionPhraseInCase,
    normalizePhrase,
} from '../../services/grammar.js';
import { matchAnswer, formatAccepted } from '../../services/answer-matcher.js';
import { renderBlankSentence } from '../../services/blank-renderer.js';
import { prepositionsManifest } from './manifest.js';
import { prepositionsTemplate } from './template.js';

// A preposition governs no Nominativ, so an answer may never claim it.
const VALID_CASE_NAMES = Object.keys(CASE_LABELS).filter((c) => c !== 'nom');

/**
 * A phrase is a usable answer only if it starts with a real preposition whose
 * determiner belongs to the case the entry claims. Whether that phrase is
 * correct German is the grammar service's judgement, not this kata's.
 */
const isUsableAnswer = (answer, caseKey) =>
    isPrepositionPhraseInCase(normalizePhrase(answer), caseKey);

export function validatePrepositionDataset(dataset) {
    if (!Array.isArray(dataset) || dataset.length === 0) {
        throw new Error('dataset must be a non-empty array');
    }

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
                input.className = 'blank-input blank-input--inline';
                return input;
            });
        },

        /** @returns {{correct:boolean,fields:{ok:boolean}[]}|{warning:string}} */
        check(item) {
            if (!inputs.length) return { warning: 'Please fill in all blanks before checking.' };

            if (inputs.some((input) => !input.value.trim())) {
                return { warning: 'Please fill in all blanks before checking.' };
            }

            const fields = inputs.map((input, i) => {
                const given = input.value.trim();
                const { ok, accepted } = matchAnswer(given, item.b[i]);
                // accepted[0] is the dataset's own spelling, so the note always
                // shows what the data asked for first. On a miss it lists every
                // accepted spelling, so "zum" and "zu dem" are both visible
                // before the learner retypes one.
                markControl(input, { ok, expected: accepted[0], note: ok ? null : formatAccepted(accepted) });
                return { ok };
            });

            return {
                correct: fields.every((f) => f.ok),
                fields,
            };
        },
    };
}
