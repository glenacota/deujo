// ui/ui-controller.js
// Rendering layer: takes state/data in, updates the DOM

import { CONFIG } from '../config.js';
import { renderBeltBadge } from './belt-badge.js';
import { dom } from './dom.js';

export class UiController {
    #modals;

    constructor(modals) {
        this.#modals = modals;
        dom.modals.error.reloadBtn.addEventListener('click', () => window.location.reload());
    }

    /** Sole sink for dynamic HTML: callers must pre-escape any interpolated values via escapeHtml(). */
    #setTrustedHtml(el, html) {
        el.innerHTML = html;
    }

    renderKataBelt(beltEl, kataId, state) {
        renderBeltBadge(
            beltEl,
            state,
            kataId,
            'block text-[10px] px-2 py-0.5'
        );
    }

    /** Shows the on-brand error modal, replacing the bootstrap failure alert(). */
    showFatalError(message) {
        dom.modals.error.content.textContent = message;
        this.#modals.open(dom.modals.error.root);
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

}
