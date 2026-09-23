// kata/cases.js
// Self-contained case-declension kata: fill-in-the-blank sentences with inline inputs.

const byId = (id) => document.getElementById(id);

const el = {
    tab: byId('tabCases'),
    section: byId('caseSection'),
    cardBelt: byId('beltCases'),
    sentence: byId('caseSentence'),
    translation: byId('caseTranslation'),
    inputs: [],
};

const CASE_LABELS = { nom: 'Nominativ', akk: 'Akkusativ', dat: 'Dativ', gen: 'Genitiv' };

const DEFINITE = {
    der: { nom: 'der', akk: 'den', dat: 'dem', gen: 'des' },
    die: { nom: 'die', akk: 'die', dat: 'der', gen: 'der' },
    das: { nom: 'das', akk: 'das', dat: 'dem', gen: 'des' },
};

const INDEFINITE = {
    der: { nom: 'ein', akk: 'einen', dat: 'einem', gen: 'eines' },
    die: { nom: 'eine', akk: 'eine', dat: 'einer', gen: 'einer' },
    das: { nom: 'ein', akk: 'ein', dat: 'einem', gen: 'eines' },
};

const PLURAL_DEFINITE = { nom: 'die', akk: 'die', dat: 'den', gen: 'der' };

function resolveArticle(blank) {
    if (blank.number === 'pl') return PLURAL_DEFINITE[blank.case];
    const table = blank.articleType === 'indef' ? INDEFINITE : DEFINITE;
    return table[blank.gender][blank.case];
}

function renderHelpTable(table, title) {
    const genders = ['der', 'die', 'das'];
    return `
        <h4 class="font-bold text-slate-900 dark:text-white mb-1">${title}</h4>
        <table class="w-full text-left text-xs lg:text-sm border-collapse mb-4">
            <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    <th class="py-2 px-3">Fall</th>
                    ${genders.map((g) => `<th class="py-2 px-3">${g}</th>`).join('')}
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                ${Object.keys(CASE_LABELS).map((c) => `
                    <tr>
                        <td class="py-2 px-3 font-bold">${CASE_LABELS[c]}</td>
                        ${genders.map((g) => `<td class="py-2 px-3">${table[g][c]}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

export default {
    id: 'cases',
    datasetUrl: './assets/datasets/cases.json',
    helpTitle: 'Declension Chart',
    el,

    getHelpContent() {
        return `
            ${renderHelpTable(DEFINITE, 'Definite Articles')}
            ${renderHelpTable(INDEFINITE, 'Indefinite Articles')}
            <h4 class="font-bold text-slate-900 dark:text-white mb-1">Plural (Definite)</h4>
            <table class="w-full text-left text-xs lg:text-sm border-collapse">
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    ${Object.keys(CASE_LABELS).map((c) => `
                        <tr>
                            <td class="py-2 px-3 font-bold">${CASE_LABELS[c]}</td>
                            <td class="py-2 px-3">${PLURAL_DEFINITE[c]}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    mount() {},

    render(item) {
        el.sentence.innerHTML = '';
        el.translation.textContent = item.translation ? `🇬🇧 ${item.translation}` : '';

        const parts = item.sentence.split(/\{(\d+)\}/g);
        parts.forEach((part, i) => {
            if (i % 2 === 0) {
                if (part) el.sentence.appendChild(document.createTextNode(part));
                return;
            }
            const input = document.createElement('input');
            input.type = 'text';
            input.autocomplete = 'off';
            input.spellcheck = false;
            input.dataset.index = part;
            input.size = 6;
            input.className = 'case-blank-input inline-block w-20 mx-1 text-center bg-transparent border-b-2 border-indigo-400 dark:border-indigo-500 focus:outline-none focus:border-indigo-600 font-mono text-indigo-700 dark:text-indigo-300';
            el.sentence.appendChild(input);
        });

        el.inputs = Array.from(el.sentence.querySelectorAll('.case-blank-input'));
    },

    check(item) {
        const targets = item.blanks.map(resolveArticle);
        const inputs = el.inputs;
        if (!inputs.length) return null;

        const correct =
            inputs.length === targets.length &&
            inputs.every((input, i) => input.value.trim().toLowerCase() === targets[i].toLowerCase());

        const message = correct
            ? 'Excellent! Correct declension!'
            : 'Correct answer: '
                + targets.map((t, i) => `<strong>${t}</strong> (${CASE_LABELS[item.blanks[i].case]})`).join(', ')
                + '.';

        return { correct, message };
    },
};