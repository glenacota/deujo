// kata/verbs.js
// Self-contained verb-conjugation kata.

const byId = (id) => document.getElementById(id);

const PERSONS = [
    { key: 'ich', label: 'ich' },
    { key: 'du', label: 'du' },
    { key: 'er', label: 'er/sie/es' },
    { key: 'wir', label: 'wir' },
    { key: 'ihr', label: 'ihr' },
    { key: 'sie', label: 'sie/Sie' },
];

const el = {
    tab: byId('tabVerbs'),
    section: byId('verbSection'),
    cardBelt: byId('beltVerbs'),
    word: byId('verbInfinitive'),
    meaning: byId('verbMeaning'),
    tenseButtons: Array.from(document.querySelectorAll('.tense-btn')),
    inputs: PERSONS.map((p) => byId(`conj_${p.key}`)),
};

let tense = 'pres';

export default {
    id: 'verbs',
    datasetUrl: './assets/datasets/verbs.json',
    helpTitle: 'Verb Conjugation',
    el,

    getHelpContent(verb) {
        if (!verb) return '';

        return `
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs lg:text-sm border-collapse">
                    <thead>
                        <tr class="border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                            <th class="py-3 px-3">Person</th>
                            <th class="py-3 px-3">Präsens</th>
                            <th class="py-3 px-3">Präteritum</th>
                            <th class="py-3 px-3">Perfekt</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                        ${PERSONS.map((person, index) => `
                            <tr>
                                <td class="py-2 px-3 font-bold">${person.label}</td>
                                <td class="py-2 px-3">${verb.pres[index] ?? '—'}</td>
                                <td class="py-2 px-3">${verb.praet[index] ?? '—'}</td>
                                <td class="py-2 px-3">${verb.perf[index] ?? '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    mount() {
        el.tenseButtons.forEach((btn) =>
            btn.addEventListener('click', () => {
            tense = btn.dataset.tense;
            el.tenseButtons.forEach((b) => {
                const active = b.dataset.tense === tense;
                b.classList.toggle('bg-purple-600', active);
                b.classList.toggle('text-white', active);
                b.classList.toggle('text-slate-600', !active);
                b.classList.toggle('dark:text-slate-400', !active);
            });
            })
        );
    },

    render(verb) {
        el.word.textContent = verb.w;
        el.meaning.textContent = `🇬🇧 ${verb.m}`;
        el.inputs.forEach((input) => {
            input.value = '';
            input.classList.remove('border-rose-500', 'border-emerald-500');
        });
    },

    check(verb) {
        const targetForms = verb[tense];
        if (!targetForms) return null;

        const correct = el.inputs.every(
            (input, i) => input.value.trim().toLowerCase() === targetForms[i].toLowerCase()
        );

        const message = correct
            ? `Excellent! Perfect conjugation for "${verb.w}"!`
            : 'Correct answer: '
                + PERSONS.map((p, i) => `${p.label} <strong>${targetForms[i]}</strong>`).join(', ')
                + '.';

        return { correct, message };
    },
};