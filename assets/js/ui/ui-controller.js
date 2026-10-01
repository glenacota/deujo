// ui/ui-controller.js
// Rendering layer: takes state/data in, updates the DOM

import { VERDICT_TONE } from '../services/answer-summary.js';
import { renderBeltBadge } from './belt-badge.js';
import { dom } from './dom.js';

const HINTS = {
    [VERDICT_TONE.correct]: 'Enter for the next word',
    [VERDICT_TONE.wrong]: 'Enter or Skip for the next word',
    [VERDICT_TONE.warning]: 'Fill in the missing answer, then check again',
};
const VERDICT_TONE_CLASSES = {
    correct: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-[rgb(6_78_59/0.3)] dark:text-emerald-300',
    wrong: 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-[rgb(136_19_55/0.3)] dark:text-rose-300',
    warning: 'border-amber-300 bg-yellow-100 text-amber-800 dark:border-amber-900 dark:bg-[rgb(120_53_15/0.3)] dark:text-amber-300',
};

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

    /** The streak is global, so one pair of numbers serves every kata and both views. */
    renderStreak(state) {
        dom.header.streak.textContent = state.streak;
        dom.header.max.textContent = state.maxStreak;
    }

    /** Belt tick bar + "n hits to next belt" readout for one kata's dashboard card. */
    renderKataProgress(beltEl, kataId, state) {
        renderBeltBadge(beltEl, state, kataId);
    }

    /** Shows the on-brand error modal, replacing the bootstrap failure alert(). */
    showFatalError(message) {
        dom.modals.error.content.textContent = message;
        this.#modals.open(dom.modals.error.root);
    }

    /** @param {{tone: string, icon: string, title: string, detail: string}} summary */
    showVerdict(summary) {
        const { root, icon, title, detail } = dom.verdict;

        root.className = `verdict grid max-w-xl gap-2 mx-auto mt-4 rounded-2xl border border-transparent px-[1.1rem] py-[0.9rem] text-left animate-[verdict-in_220ms_cubic-bezier(0.2,0.9,0.3,1)] motion-reduce:animate-none ${VERDICT_TONE_CLASSES[summary.tone] ?? VERDICT_TONE_CLASSES.warning}`;
        icon.textContent = summary.icon;
        title.textContent = summary.title;
        detail.textContent = summary.detail;

        root.title = HINTS[summary.tone] ?? '';
        root.hidden = false;
    }

    hideVerdict() {
        dom.verdict.root.hidden = true;
    }

    showHelpContent(title, html) {
        dom.modals.help.title.textContent = title;
        this.#setTrustedHtml(dom.modals.help.content, html);
    }

}
