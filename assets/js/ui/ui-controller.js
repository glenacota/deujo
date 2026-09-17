// ui/ui-controller.js
// Rendering layer: takes state/data in, updates the DOM

import { CONFIG } from '../config.js';
import { Storage } from '../services/storage.js';
import { dom } from './dom.js';

export class UiController {
    #toastTimer = null;
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

    toggleMute(isMuted) {
        if (!dom.mute?.toggleBtn) return;

        dom.mute.icon.textContent = isMuted ? '🔇' : '🔊';
        if (dom.mute.label) {
            dom.mute.label.textContent = isMuted ? 'Muted' : 'Sound On';
        }
        dom.mute.toggleBtn.setAttribute('aria-label', isMuted ? 'Enable sound' : 'Mute sound');
        dom.mute.toggleBtn.title = isMuted ? 'Enable sound' : 'Mute sound';
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
        dom.actions.nouns.classList.toggle('hidden', !isNouns);
        dom.actions.verbs.classList.toggle('hidden', isNouns);
        this.#applyTabStyle(dom.tabs.nouns, isNouns);
        this.#applyTabStyle(dom.tabs.verbs, !isNouns);
    }

    #applyTabStyle(buttonElement, isActive) {
        const activeClasses = ['bg-indigo-600', 'text-white', 'shadow-md'];
        const inactiveClasses = ['text-slate-600', 'dark:text-slate-400', 'hover:text-slate-900', 'dark:hover:text-slate-200'];

        if (isActive) {
            buttonElement.classList.remove(...inactiveClasses);
            buttonElement.classList.add(...activeClasses);
        } else {
            buttonElement.classList.remove(...activeClasses);
            buttonElement.classList.add(...inactiveClasses);
        }
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
        dom.noun.genderButtons.forEach((btn) => 
            this.#setGenderActive(btn, btn.dataset.gender === gender)
        );
    }

    #setGenderActive(btn, active) {
        btn.setAttribute('aria-pressed', String(active));
        btn.classList.toggle('ring-2', active);
        btn.classList.toggle('ring-indigo-500', active);
        btn.classList.toggle('bg-indigo-100', active);
        btn.classList.toggle('dark:bg-indigo-950/60', active);
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

    renderConjugationTable(verb) {
        dom.modals.verb.title.textContent = verb.w;
        dom.modals.verb.tableBody.innerHTML = CONFIG.persons.map((person, index) => `
            <tr>
                <td class="py-2 px-3 font-bold">${person.label}</td>
                <td class="py-2 px-3">${verb.pres[index] ?? '—'}</td>
                <td class="py-2 px-3">${verb.praet[index] ?? '—'}</td>
                <td class="py-2 px-3">${verb.perf[index] ?? '—'}</td>
            </tr>
        `).join('');
    }

    openModal(modalElement) {
        modalElement.classList.remove('hidden');
    }

    closeModal(modalElement) {
        modalElement.classList.add('hidden');
    }

    /** @returns {HTMLElement|null} the currently open modal root, if any */
    getOpenModal() {
        return Object.values(dom.modals)
            .map((m) => m.root)
            .find((root) => root && !root.classList.contains('hidden')) ?? null;
    }

    showFeedback(result, message) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

        const basePanelClasses = 'w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ';
        const themeStyles = {
            [CONFIG.feedbackType.Success]: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100',
            [CONFIG.feedbackType.Error]: 'bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100',
            [CONFIG.feedbackType.Warning]: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800',
        };

        dom.modals.feedback.panel.className = basePanelClasses + (themeStyles[result] ?? themeStyles[CONFIG.feedbackType.Warning]);
        dom.modals.feedback.title.textContent = result === CONFIG.feedbackType.Success ? '✅ Correct!' : '❌ Try again!';
        dom.modals.feedback.content.innerHTML = message;

        this.openModal(dom.modals.feedback.root);
        dom.modals.feedback.continueBtn.focus();
    }

    showToast(isPromotion, tier, streak) {
        const beltName = CONFIG.belts[Math.min(tier, CONFIG.belts.length - 1)];

        if (isPromotion) {
            dom.toast.card.className = 'bg-amber-400 text-slate-950 px-6 py-4 border-4 border-slate-950 shadow-2xl flex items-center space-x-3 animate-bounce';
            dom.toast.title.textContent = 'Belt Promoted!';
            dom.toast.text.textContent = `🔥 Streak ${streak}! Promoted to ${beltName}!`;
            dom.toast.effect.textContent = '🎉';
        } else {
            dom.toast.card.className = 'bg-rose-400 text-rose-950 px-6 py-4 border-4 border-rose-950 shadow-2xl flex items-center space-x-3';
            dom.toast.title.textContent = 'Belt Demoted';
            dom.toast.text.textContent = `Progress dropped to ${beltName}.`;
            dom.toast.effect.textContent = '🚧';
        }
        
        dom.toast.root.classList.remove('hidden');
        clearTimeout(this.#toastTimer);
        this.#toastTimer = setTimeout(() => dom.toast.root.classList.add('hidden'), CONFIG.timing.toastMs);
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
        this.#shareStatusTimer = setTimeout(() => {
            dom.share.status.textContent = '';
        }, CONFIG.timing.toastMs);
    }
  
}
