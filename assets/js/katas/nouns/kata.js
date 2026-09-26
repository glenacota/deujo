// katas/nouns/kata.js
// Self-contained noun kata: elements, local selection state, rendering, validation.

import { escapeHtml, createSectionFromTemplate } from '../../services/utility.js';
import { nounsManifest } from './manifest.js';
import { nounsTemplate } from './template.js';

export function validateNounDataset(dataset) {
    if (!Array.isArray(dataset) || dataset.length === 0) {
        throw new Error('dataset must be a non-empty array');
    }

    dataset.forEach((noun, index) => {
        const validGender = ['der', 'die', 'das'].includes(noun?.g);
        const validPlural = typeof noun?.p === 'string';
        if (
            !noun ||
            typeof noun.w !== 'string' ||
            !noun.w.trim() ||
            typeof noun.m !== 'string' ||
            !noun.m.trim() ||
            !validGender ||
            !validPlural
        ) {
            throw new Error(`entry ${index} must contain non-empty w and m strings, string p, and valid g`);
        }
    });
}

function setGenderActive(btn, active) {
    btn.setAttribute('aria-pressed', String(active));
    btn.classList.toggle('ring-2', active);
    btn.classList.toggle('ring-indigo-500', active);
    btn.classList.toggle('bg-indigo-100', active);
    btn.classList.toggle('dark:bg-indigo-950/60', active);
}

export function createNounKata() {
    const el = {
        kata: null,
        section: null,
        cardBelt: null,
        word: null,
        meaning: null,
        plural: null,
        genderButtons: [],
    };

    let gender = null;

    return {
        ...nounsManifest,
        validateDataset: validateNounDataset,
        el,

        getHelpContent() {
            return `
                <div class="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 font-medium text-indigo-900 dark:text-indigo-200">
                    ☠️ <strong class="text-indigo-600 dark:text-indigo-400">No single rule applies to all nouns</strong>. Every German noun has a specific plural form that must be learned along with its gender and singular form.
                </div>
                <ul>
                    <li class="px-4 py-2">Feminine nouns usually take <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-en</code> (or <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-n</code> if ending in <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-e</code>, <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-el</code>, <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-er</code>); almost none take an umlaut. <span class="italic text-slate-500">(e.g., die Frau → die Frauen)</span>.</li>
                    <li class="px-4 py-2">Masculine & neuter nouns usually take <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-e</code>, frequently with an umlaut on <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">a, o, u</code> <span class="italic text-slate-500">(e.g., der Baum → die Bäume)</span>.</li>
                    <li class="px-4 py-2">-er, -el, -en endings usually take no extra ending; masculine/neuter often add an umlaut <span class="italic text-slate-500">(e.g., der Apfel → die Äpfel; das Zimmer → die Zimmer)</span>.</li>
                    <li class="px-4 py-2">Vowels (<code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">a, o, u, i, y</code>) endings & many foreign words usually take an <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-s</code> with no umlaut <span class="italic text-slate-500">(e.g., das Auto → die Autos)</span>.</li>
                    <li class="px-4 py-2">Short neuter nouns usually take <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-er</code> with an umlaut <span class="italic text-slate-500">(e.g., das Kind → die Kinder; das Buch → die Bücher)</span>.</li>
                    <li class="px-4 py-2">Nouns ending in <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-e</code>, <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-ant</code>, <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-ent</code>, <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-ist</code>, <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-or</code> for people/occupations almost always add <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-n</code> or <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-en</code> <span class="italic text-slate-500">(e.g., der Student → die Studenten)</span>.</li>
                </ul>
            `;
        },

        /** One-time wiring of controls owned by this kata only. */
        mount(container) {
            if (el.section) return;

            const section = createSectionFromTemplate(nounsTemplate);
            container.appendChild(section);

            el.section = section;
            el.word = section.querySelector('[data-role="word"]');
            el.meaning = section.querySelector('[data-role="meaning"]');
            el.plural = section.querySelector('[data-role="plural"]');
            el.genderButtons = Array.from(section.querySelectorAll('[data-role="gender"]'));

            el.genderButtons.forEach((btn) =>
                btn.addEventListener('click', () => {
                    gender = btn.dataset.gender;
                    el.genderButtons.forEach((b) => setGenderActive(b, b.dataset.gender === gender));
                })
            );
        },

        render(noun) {
            gender = null;
            el.word.textContent = noun.w;
            el.meaning.textContent = `🇬🇧 ${noun.m}`;
            el.plural.value = '';

            const hasPlural = Boolean(noun.p);
            el.plural.disabled = !hasPlural;
            el.plural.placeholder = hasPlural ? 'e.g. Kinder' : 'no plural';

            el.plural.classList.remove('border-rose-500', 'border-emerald-500');
            el.genderButtons.forEach((btn) => setGenderActive(btn, false));
        },

        /** @returns {{correct:boolean,message:string}|{warning:string}} */
        check(noun) {
            if (!gender) return { warning: '⚠️ Please select a gender (der, die, or das).' };

            const userPlural = el.plural.value.trim();
            const hasNoPlural = !noun.p;
            const correct =
                gender === noun.g && (hasNoPlural || userPlural.toLowerCase() === noun.p.toLowerCase());

            const pluralText = hasNoPlural ? 'no plural' : `die ${noun.p}`;
            const answer = `<span class="font-extrabold underline">${escapeHtml(noun.g)}</span> ${escapeHtml(noun.w)}, Plural: <span class="font-extrabold underline">${escapeHtml(pluralText)}</span>`;

            return { correct, message: `${correct ? 'Excellent' : 'Correct answer'}: ${answer}` };
        },
    };
}
