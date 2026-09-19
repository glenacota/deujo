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
        dom.dashboard.tier.dataset.label = CONFIG.belts[tier];
        dom.dashboard.tier.className = `w-full tier-label text-xs px-2 py-0.5 rounded-full belt-label-${tier} font-semibold uppercase tracking-wider`;
        dom.dashboard.tier.style.setProperty('--tier-progress', `${state.getTierProgressPct()}%`);
    }

    switchTab(katas, activeId) {
        katas.forEach(({ id, el }) => {
            const isActive = id === activeId;
            el.section.classList.toggle('hidden', !isActive);
            el.actions.classList.toggle('hidden', !isActive);
            this.#applyTabStyle(el.tab, isActive);
        });
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

    openModal(modalElement) {
        modalElement.classList.remove('hidden');
    }

    closeModal(modalElement) {
        modalElement.classList.add('hidden');
    }

    /** @returns {HTMLElement|null} the currently open modal root, if any */
    getOpenModal() {
        return Array.from(document.querySelectorAll('.modal-backdrop'))
            .find((root) => !root.classList.contains('hidden')) ?? null;
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
