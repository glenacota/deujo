// ui/ui-controller.js
// Rendering layer: takes state/data in, updates the DOM

import { CONFIG } from '../config.js';
import { Storage } from '../services/storage.js';
import { dom } from './dom.js';

export class UiController {
    #shareStatusTimer = null;
  
    initTheme() {
        const stored = Storage.getTheme();
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = stored ? stored === 'dark' : prefersDark;
        document.documentElement.classList.toggle('dark', isDark);
        this.#applyTheme(isDark);
    }

    toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        Storage.setTheme(isDark ? 'dark' : 'light');
        this.#applyTheme(isDark);
    }

    #applyTheme(isDark) {
        dom.theme.icon.textContent = isDark ? '🌙' : '☀️';
        if (dom.theme.label) dom.theme.label.textContent = isDark ? 'Dark Mode' : 'Light Mode';
    }

    renderDashboard(state) {
        const tier = state.getCurrentTier();
        dom.dashboard.streak.textContent = state.streak;
        dom.dashboard.max.textContent = state.maxStreak;
        dom.dashboard.tier.textContent = CONFIG.belts[tier];
        dom.dashboard.tier.className = `text-xs px-2 py-0.5 rounded-full belt-label-${tier} font-semibold uppercase tracking-wider`;
        dom.dashboard.bar.style.width = `${state.getTierProgressPct()}%`;
        dom.dashboard.bar.className = `h-full rounded-full transition-all duration-500 ease-out belt-${tier}`;
    }

    switchTab(tab) {
        const isNouns = tab === 'nouns';
        dom.tabs.nounSection.classList.toggle('hidden', !isNouns);
        dom.tabs.verbSection.classList.toggle('hidden', isNouns);
        this.#applyTabStyle(dom.tabs.nouns, isNouns);
        this.#applyTabStyle(dom.tabs.verbs, !isNouns);
    }

    #applyTabStyle(btn, active) {
        const base = 'flex-1 px-5 py-2 lg:py-3 rounded-lg text-base font-semibold transition-all flex items-center justify-center space-x-2';
        btn.className = active
        ? `${base} bg-indigo-600 text-white shadow-md`
        : `${base} text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200`;
    }

    renderNoun(noun) {
        dom.noun.word.textContent = noun.w;
        dom.noun.meaning.textContent = `🇬🇧 ${noun.m}`;

        dom.noun.plural.value = '';
        
        const hasPlural = Boolean(noun.p);
        dom.noun.plural.disabled = !hasPlural;
        dom.noun.plural.placeholder = hasPlural ? 'e.g. Kinder' : 'no plural';
        
        dom.noun.plural.classList.remove('border-rose-500', 'border-emerald-500');
        dom.noun.genderButtons.forEach((btn) => this.#setGenderActive(btn, false));
    }

    setGenderSelection(gender) {
        dom.noun.genderButtons.forEach((btn) => this.#setGenderActive(btn, btn.dataset.gender === gender));
    }

    #setGenderActive(btn, active) {
        btn.setAttribute('aria-pressed', String(active));
        btn.classList.toggle('ring-2', active);
        btn.classList.toggle('ring-offset-2', active);
        btn.classList.toggle('ring-indigo-500', active);
        btn.classList.toggle('bg-indigo-100', active);
        btn.classList.toggle('dark:bg-indigo-950/60', active);
    }

    markNounPluralResult(isCorrect) {
        dom.noun.plural.classList.toggle('border-emerald-500', isCorrect);
        dom.noun.plural.classList.toggle('border-rose-500', !isCorrect);
    }

    renderVerb(verb) {
        dom.verb.word.textContent = verb.w;
        dom.verb.meaning.textContent = `🇬🇧 ${verb.m}`;
        Object.values(dom.verb.inputs).forEach((input) => {
        input.value = '';
        input.classList.remove('border-rose-500', 'border-emerald-500');
        });
    }

    setTenseSelection(tense) {
        dom.verb.tenseButtons.forEach((btn) => {
        const active = btn.dataset.tense === tense;
        btn.classList.toggle('bg-purple-600', active);
        btn.classList.toggle('text-white', active);
        btn.classList.toggle('text-slate-600', !active);
        btn.classList.toggle('dark:text-slate-400', !active);
        });
    }

    markVerbInputResult(personKey, isCorrect) {
        const input = dom.verb.inputs[personKey];
        input.classList.toggle('border-emerald-500', isCorrect);
        input.classList.toggle('border-rose-500', !isCorrect);
    }

    renderConjugationTable(verb) {
        dom.modals.verb.title.textContent = verb.w;
        dom.modals.verb.meaning.textContent = `🇬🇧 ${verb.m}`;
        dom.modals.verb.tableBody.innerHTML = CONFIG.persons.map((person, index) => `
            <tr>
                <td class="py-2 px-3 font-bold">${person.label}</td>
                <td class="py-2 px-3">${verb.pres[index] ?? '—'}</td>
                <td class="py-2 px-3">${verb.praet[index] ?? '—'}</td>
                <td class="py-2 px-3">${verb.perf[index] ?? '—'}</td>
            </tr>
        `).join('');
    }

    async shareProgress(state) {
        const tier = state.getCurrentTier();
        const text = [
            `🥋🇩🇪 I'm a ${CONFIG.belts[tier]} on Deujo.`,
            `Can you beat my ${state.maxStreak}-answer streak of flawless German mastery?`,
            'Join in: https://deujo.glenacota.me'
        ].join('\n');
        try {
        if (navigator.share) {
            await navigator.share({text});
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            this.#announceShare('Copied to clipboard!');
        }
        } catch {
        // User cancelled the native share sheet - not an error worth surfacing.
        }
    }

    #announceShare(message) {
        dom.share.status.textContent = message;
        clearTimeout(this.#shareStatusTimer);
        this.#shareStatusTimer = setTimeout(() => { dom.share.status.textContent = ''; }, CONFIG.timing.toastMs);
    }
  
}
