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

const TENSES = {
    pres: { id: 'verbs-pres', label: 'Präsens' },
    praet: { id: 'verbs-praet', label: 'Präteritum' },
    perf: { id: 'verbs-perf', label: 'Perfekt' },
};

export function validateVerbDataset(dataset) {
    if (!Array.isArray(dataset) || dataset.length === 0) {
        throw new Error('dataset must be a non-empty array');
    }

    dataset.forEach((verb, index) => {
        const validTenses = Object.keys(TENSES).every((tense) =>
            Array.isArray(verb?.[tense]) &&
            verb[tense].length === PERSONS.length &&
            verb[tense].every((form) => typeof form === 'string' && form.trim())
        );
        if (
            !verb ||
            typeof verb.w !== 'string' ||
            !verb.w.trim() ||
            typeof verb.m !== 'string' ||
            !verb.m.trim() ||
            !validTenses
        ) {
            throw new Error(`entry ${index} must contain non-empty w, m, and six forms for each tense`);
        }
    });
}

function createElements(tenseKey) {
    const suffix = tenseKey.charAt(0).toUpperCase() + tenseKey.slice(1);

    // Each tense gets its own cloned DOM subtree (no shared ids), so multiple
    // tenses can coexist/be visible simultaneously in the future.
    const template = byId('verbSectionTemplate');
    const container = byId('verbSections');
    const fragment = template.content.cloneNode(true);
    const section = fragment.querySelector('[data-role="section"]');
    section.dataset.tense = tenseKey;
    container.appendChild(fragment);

    return {
        kata: byId(`kataVerbs${suffix}`),
        section,
        cardBelt: byId(`beltVerbs${suffix}`),
        word: section.querySelector('[data-role="word"]'),
        meaning: section.querySelector('[data-role="meaning"]'),
        inputs: PERSONS.map((p) => section.querySelector(`[data-role="conj_${p.key}"]`)),
    };
}

export function createVerbKata(tenseKey) {
    const tense = TENSES[tenseKey];
    const el = createElements(tenseKey);

    return {
        id: tense.id,
        name: `${tense.label}`,
        datasetUrl: './assets/datasets/verbs.json',
        validateDataset: validateVerbDataset,
        helpTitle: `${tense.label} Conjugation`,
        el,

    getHelpContent(verb) {
        if (!verb) return '';

        return `
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs lg:text-sm border-collapse">
                    <thead>
                        <tr class="border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                            <th class="py-3 px-3">Person</th>
                            <th class="py-3 px-3">${tense.label}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                        ${PERSONS.map((person, index) => `
                            <tr>
                                <td class="py-2 px-3 font-bold">${person.label}</td>
                                <td class="py-2 px-3">${verb[tenseKey][index] ?? '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

        mount() {},

    render(verb) {
        el.word.textContent = verb.w;
        el.meaning.textContent = `🇬🇧 ${verb.m}`;
        el.inputs.forEach((input) => {
            input.value = '';
            input.classList.remove('border-rose-500', 'border-emerald-500');
        });
    },

    check(verb) {
            const targetForms = verb[tenseKey];
            if (!targetForms) return null;

        const correct = el.inputs.every(
            (input, i) => input.value.trim().toLowerCase() === targetForms[i].toLowerCase()
        );

            const message = correct
                ? `Excellent! Perfect ${tense.label} conjugation for "${verb.w}"!`
                : 'Correct answer: '
                    + PERSONS.map((p, i) => `${p.label} <strong>${targetForms[i]}</strong>`).join(', ')
                    + '.';

            return { correct, message };
        },
    };
}