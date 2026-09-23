// kata/nouns.js
// Self-contained noun kata: elements, local selection state, rendering, validation.

const byId = (id) => document.getElementById(id);

const el = {
    tab: byId('tabNouns'),
    section: byId('nounSection'),
    cardBelt: byId('beltNouns'),
    word: byId('nounWord'),
    meaning: byId('nounMeaning'),
    plural: byId('pluralInput'),
    genderButtons: Array.from(document.querySelectorAll('.gender-btn')),
};

let gender = null;

function setGenderActive(btn, active) {
    btn.setAttribute('aria-pressed', String(active));
    btn.classList.toggle('ring-2', active);
    btn.classList.toggle('ring-indigo-500', active);
    btn.classList.toggle('bg-indigo-100', active);
    btn.classList.toggle('dark:bg-indigo-950/60', active);
}

export default {
    id: 'nouns',
    datasetUrl: './assets/datasets/nouns.json',
    helpTitle: 'Plural Rules',
    el,

    getHelpContent() {
        return `
            <div class="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 font-medium text-indigo-900 dark:text-indigo-200">
                ☠️ <strong class="text-indigo-600 dark:text-indigo-400">No single rule applies to all nouns</strong>. Every German noun has a specific plural form that must be learned along with its gender and singular form.
            </div>
            <ul>
                <li class="px-4 py-2">Feminine nouns usually take <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-en</code> (or <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-n</code> if ending in <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-e</code>, <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-el</code>, <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-er</code>); almost none take an umlaut. <span class="italic text-slate-500">(e.g., die Frau → die Frauen)</span>.</li>
                <li class="px-4 py-2">Masculine &amp; neuter nouns usually take <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-e</code>, frequently with an umlaut on <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">a, o, u</code> <span class="italic text-slate-500">(e.g., der Baum → die Bäume)</span>.</li>
                <li class="px-4 py-2">-er, -el, -en endings usually take no extra ending; masculine/neuter often add an umlaut <span class="italic text-slate-500">(e.g., der Apfel → die Äpfel; das Zimmer → die Zimmer)</span>.</li>
                <li class="px-4 py-2">Vowels (<code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">a, o, u, i, y</code>) endings &amp; many foreign words usually take an <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-s</code> with no umlaut <span class="italic text-slate-500">(e.g., das Auto → die Autos)</span>.</li>
                <li class="px-4 py-2">Short neuter nouns usually take <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-er</code> with an umlaut <span class="italic text-slate-500">(e.g., das Kind → die Kinder; das Buch → die Bücher)</span>.</li>
                <li class="px-4 py-2">Nouns ending in <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-e</code>, <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-ant</code>, <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-ent</code>, <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-ist</code>, <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-or</code> for people/occupations almost always add <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-n</code> or <code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-en</code> <span class="italic text-slate-500">(e.g., der Student → die Studenten)</span>.</li>
            </ul>
        `;
    },

    /** One-time wiring of controls owned by this kata only. */
    mount() {
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
        const answer = `<span class="font-extrabold underline">${noun.g}</span> ${noun.w}, Plural: <span class="font-extrabold underline">${pluralText}</span>`;

        return { correct, message: `${correct ? 'Excellent' : 'Correct answer'}: ${answer}` };
    },
};