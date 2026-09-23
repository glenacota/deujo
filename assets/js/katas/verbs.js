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
    modalTitle: null,
    modalTableBody: null,
    word: byId('verbInfinitive'),
    meaning: byId('verbMeaning'),
    tenseButtons: Array.from(document.querySelectorAll('.tense-btn')),
    inputs: PERSONS.map((p) => byId(`conj_${p.key}`)),
};

let tense = 'pres';

function mountConjugationModal() {
    document.body.insertAdjacentHTML('beforeend', `
        <div id="verbModal" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="modalVerbTitle">
            <div class="modal-panel">
                <div class="modal-header">
                    <h3 id="modalVerbTitle" class="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">gehen</h3>
                    <button type="button" data-modal-close data-modal-initial-focus class="modal-close" aria-label="Close conjugation table">✕</button>
                </div>
                <div class="p-6 overflow-y-auto">
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
                            <tbody id="modalTableBody" class="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono"></tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">Press <kbd class="modal-key">Esc</kbd> to close</div>
            </div>
        </div>
    `);

    el.modalTitle = byId('modalVerbTitle');
    el.modalTableBody = byId('modalTableBody');
}

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
    helpModalId: 'verbModal',
    el,

    mount() {
        mountConjugationModal();
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