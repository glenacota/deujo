// kata/nouns.js
// Self-contained noun kata: elements, local selection state, rendering, validation.

const byId = (id) => document.getElementById(id);

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

function setGenderActive(btn, active) {
    btn.setAttribute('aria-pressed', String(active));
    btn.classList.toggle('ring-2', active);
    btn.classList.toggle('ring-indigo-500', active);
    btn.classList.toggle('bg-indigo-100', active);
    btn.classList.toggle('dark:bg-indigo-950/60', active);
}

export default {
    id: 'nouns',
    name: 'Nouns',
    datasetUrl: './assets/datasets/nouns.json',
    validateDataset: validateNounDataset,
    helpTitle: 'Plural Rules',
    el,

    getHelpContent() {
        return `
            <div class="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 font-medium text-indigo-900 dark:text-indigo-200">
                ☠️ <strong class="text-indigo-600 dark:text-indigo-400">No single rule applies to all nouns</strong>. Every Italian noun has a specific plural form that must be learned along with its gender and plural form.
            </div>
            <ul>
                <li class="px-4 py-2"><code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-o</code> endings are usually masculine (e.g., il libro, il ragazzo. Exceptions: la mano, la foto).</li>
                <li class="px-4 py-2"><code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-a</code> endings are usually feminine (e.g., la casa, la sedia. Exceptions: il problema, il clima).</li>
                <li class="px-4 py-2"><code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-e</code> endings could be anything (e.g., il pane, la notte).</li>
                <li class="px-4 py-2"><code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-zione</code> endings are usually feminine (e.g., la stazione, la superstizione).</li>
                <li class="px-4 py-2"><code class="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono">-ismo, -ore</code> endings are usually masculine (e.g., il turismo, il colore).</li>
                <li class="px-4 py-2">Days, months, seas, rivers, mountains, trees are usually masculine.</li>
                <li class="px-4 py-2">Cities, countries, continents are usually feminine.</li>
                <li class="px-4 py-2">Foreign words are usually masculine.</li>
            </ul>
        `;
    },

    /** One-time wiring of controls owned by this kata only. */
    mount() {
        if (el.kata) return;

        el.kata = byId('kataNouns');
        el.section = byId('nounSection');
        el.cardBelt = byId('beltNouns');
        el.word = byId('nounWord');
        el.meaning = byId('nounMeaning');
        el.plural = byId('pluralInput');
        el.genderButtons = Array.from(document.querySelectorAll('.gender-btn'));

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