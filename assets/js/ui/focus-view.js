// ui/focus-view.js

import { renderBeltBadge } from './belt-badge.js';
import { dom } from './dom.js';

export class FocusView {
    releaseFocus(section) {
        if (section?.contains(document.activeElement)) document.activeElement.blur();
    }

    blurActive() {
        document.activeElement?.blur();
    }

    renderHeader(kata, state) {
        dom.focus.kataName.textContent = kata.name;
        renderBeltBadge(dom.focus.beltBar, state, kata.id, { compact: true });
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

    /** Every kata is mounted from boot, so this only shows one and hides the rest. */
    switchKata(katas, activeId) {
        const activeSection = katas.find(({ id }) => id === activeId)?.el.section;
        katas.forEach(({ el }) => el.section.classList.toggle('hidden', el.section !== activeSection));
    }
}