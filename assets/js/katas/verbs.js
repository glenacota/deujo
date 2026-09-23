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
    actions: byId('verbActions'),
    checkBtn: byId('checkVerbBtn'),
    skipBtn: byId('skipVerbBtn'),
    teachBtn: byId('teachMeVerbBtn'),
    cardBelt: byId('beltVerbs'),
    modalTitle: byId('modalVerbTitle'),
    modalTableBody: byId('modalTableBody'),
    word: byId('verbInfinitive'),
    meaning: byId('verbMeaning'),
    tenseButtons: Array.from(document.querySelectorAll('.tense-btn')),
    inputs: PERSONS.map((p) => byId(`conj_${p.key}`)),
};

let tense = 'pres';

function renderConjugationTable(verb) {
    el.modalTitle.textContent = verb.w;
    el.modalTableBody.innerHTML = PERSONS.map((person, index) => `
            <tr>
                <td class="py-2 px-3 font-bold">${person.label}</td>
                <td class="py-2 px-3">${verb.pres[index] ?? '—'}</td>
                <td class="py-2 px-3">${verb.praet[index] ?? '—'}</td>
                <td class="py-2 px-3">${verb.perf[index] ?? '—'}</td>
            </tr>
        `).join('');
}

export default {
    id: 'verbs',
    datasetUrl: './assets/datasets/verbs.json',
    el,

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
        renderConjugationTable(verb);
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