// ui/ui-controller.js
// Rendering layer: takes state/data in, updates the DOM

import { CONFIG } from '../config.js';
import { Storage } from '../services/storage.js';
import { dom } from './dom.js';

export class UiController {
    #toastTimer = null;
    #shareStatusTimer = null;
    #modals;

    constructor(modals) {
        this.#modals = modals;
    }

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

    showDashboard() {
        dom.dashboardHome.view.classList.remove('hidden');
        dom.focus.view.classList.add('hidden');
    }

    renderHeaderStats(kataId, state) {
        dom.header.streak.textContent = state.streakByKata[kataId] ?? 0;
        dom.header.max.textContent = state.maxStreakByKata[kataId] ?? 0;
        this.#applyBeltBadge(
            dom.header.beltBar,
            state.getCurrentBelt(kataId),
            state.getBeltProgressPct(kataId),
            'text-[10px] px-2 py-0.5 my-1 text-center'
        );
    }

    /** Sole sink for dynamic HTML: callers must pre-escape any interpolated values via escapeHtml(). */
    #setTrustedHtml(el, html) {
        el.innerHTML = html;
    }

    #applyBeltBadge(el, belt, pct, sizeClasses) {
        if (!el) return;
        el.textContent = `${CONFIG.belts.labels[belt]}\xa0\xa0\xa0belt`;
        el.dataset.label = `${CONFIG.belts.icons[belt]}\xa0\xa0\xa0belt`;
        el.className = `belt-label rounded-full belt-label-${belt} font-semibold uppercase tracking-wider ${sizeClasses}`;
        el.style.setProperty('--belt-progress', `${pct}%`);
    }

    /** Updates the belt badge shown on every kata card in the dashboard. */
    renderKataBelts(katas, state) {
        katas.forEach((kata) => {
            this.renderKataBelt(kata, state);
        });
    }

    renderKataBelt(kata, state) {
        this.#applyBeltBadge(
            kata.el.cardBelt,
            state.getCurrentBelt(kata.id),
            state.getBeltProgressPct(kata.id),
            'block text-[10px] px-2 py-0.5'
        );
    }

    /** Shows the on-brand error modal, replacing the bootstrap failure alert(). */
    showFatalError(message) {
        dom.modals.error.content.textContent = message;
        this.#modals.open(dom.modals.error.root);
    }

    /** Updates the kata name in focus mode and the belt/streak stats in the header. */
    renderFocusHeader(kata, state) {
        dom.focus.kataName.textContent = kata.name;
        this.renderHeaderStats(kata.id, state);
     }

    showFocusMode() {
        dom.dashboardHome.view.classList.add('hidden');
        dom.focus.view.classList.remove('hidden');
    }

    showKataStatus(message, type = 'loading') {
        if (!dom.focus.status) return;

        dom.focus.status.textContent = message;
        dom.focus.status.className = type === 'error'
            ? 'mt-3 text-center text-sm font-semibold text-rose-600 dark:text-rose-400'
            : 'mt-3 text-center text-sm font-semibold text-slate-500 dark:text-slate-400';
        dom.focus.status.classList.remove('hidden');
    }

    clearKataStatus() {
        if (!dom.focus.status) return;
        dom.focus.status.textContent = '';
        dom.focus.status.classList.add('hidden');
    }

    switchKata(katas, activeId) {
        const activeSection = katas.find(({ id }) => id === activeId)?.el.section;
        const sections = new Set(katas.map(({ el }) => el.section));
        sections.forEach((section) => section.classList.toggle('hidden', section !== activeSection));
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
        const titles = {
            [CONFIG.feedbackType.Success]: '✅ Correct!',
            [CONFIG.feedbackType.Error]: '❌ Try again!',
            [CONFIG.feedbackType.Warning]: '⚠️ Check your answer',
        };
        dom.modals.feedback.title.textContent = titles[result] ?? titles[CONFIG.feedbackType.Warning];
        this.#setTrustedHtml(dom.modals.feedback.content, message);

        this.#modals.open(dom.modals.feedback.root);
    }

    showHelpContent(title, html) {
        dom.modals.help.title.textContent = title;
        this.#setTrustedHtml(dom.modals.help.content, html);
    }

    showToast(isPromotion, belt, streak) {
        const beltIndex = Math.min(belt, CONFIG.belts.labels.length - 1);
        const beltName = `${CONFIG.belts.icons[beltIndex]} ${CONFIG.belts.labels[beltIndex]}`;

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

    async shareProgress(state, kataId) {
        const belt = state.getCurrentBelt(kataId);
        const kataName = kataId.charAt(0).toUpperCase() + kataId.slice(1);
        const text = [
            `🥋🇩🇪 I'm a ${CONFIG.belts.labels[belt]} in the ${kataName} kata on Deujo.`,
            `Can you beat my ${state.maxStreakByKata[kataId]}-answer streak of flawless German mastery?`,
            'Join in: https://deujo.glenacota.me'
        ].join('\n');
        try {
        if (navigator.share) {
            await navigator.share({text});
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
        }
        } catch {
        // User cancelled the native share sheet - not an error worth surfacing.
        }
    }

   
  
}
