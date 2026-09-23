// kata/nouns.js
// Self-contained noun kata: elements, local selection state, rendering, validation.

const byId = (id) => document.getElementById(id);

const el = {
    tab: byId('tabNouns'),
    section: byId('nounSection'),
    actions: byId('nounActions'),
    checkBtn: byId('checkNounBtn'),
    skipBtn: byId('skipNounBtn'),
    teachBtn: byId('teachMeNounBtn'),
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
    el,

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