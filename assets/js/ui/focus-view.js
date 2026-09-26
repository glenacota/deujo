// ui/focus-view.js

import { renderBeltBadge } from './belt-badge.js';
import { dom } from './dom.js';

export class FocusView {
    renderHeader(kata, state) {
        dom.focus.kataName.textContent = kata.name;
        dom.header.streak.textContent = state.streakByKata[kata.id] ?? 0;
        dom.header.max.textContent = state.maxStreakByKata[kata.id] ?? 0;
        renderBeltBadge(
            dom.header.beltBar,
            state,
            kata.id,
            'text-[10px] px-2 py-0.5 my-1 text-center'
        );
    }

    showStatus(message, type = 'loading') {
        if (!dom.focus.status) return;

        dom.focus.status.textContent = message;
        dom.focus.status.className = type === 'error'
            ? 'mt-3 text-center text-sm font-semibold text-rose-600 dark:text-rose-400'
            : 'mt-3 text-center text-sm font-semibold text-slate-500 dark:text-slate-400';
        dom.focus.status.classList.remove('hidden');
    }

    clearStatus() {
        if (!dom.focus.status) return;
        dom.focus.status.textContent = '';
        dom.focus.status.classList.add('hidden');
    }

    switchKata(katas, activeId) {
        const activeSection = katas.find(({ id }) => id === activeId)?.el.section;
        const sections = new Set(katas.map(({ el }) => el.section).filter(Boolean));
        sections.forEach((section) => section.classList.toggle('hidden', section !== activeSection));
    }
}