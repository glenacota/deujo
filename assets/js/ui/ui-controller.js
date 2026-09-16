// ui/ui-controller.js
// Rendering layer: takes state/data in, updates the DOM

import { CONFIG } from '../config.js';
import { Storage } from '../services/storage.js';
import { dom } from './dom.js';

export class UiController {

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
  
}
