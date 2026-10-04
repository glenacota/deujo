// ui/ui-controller.js
// Rendering layer: takes state/data in, updates the DOM

import { dom } from './dom.js';

const HINTS = {
    correct: 'Enter for the next word',
    wrong: 'Enter or Skip for the next word',
    warning: 'Fill in the missing answer, then check again',
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

    /** The streak is global, so one pair of numbers serves every kata and both views. */
    renderStreak(state) {
        dom.header.streak.textContent = state.streak;
        dom.header.max.textContent = state.maxStreak;
    }

    /** Shows the on-brand error modal, replacing the bootstrap failure alert(). */
    showFatalError(message) {
        dom.modals.error.content.textContent = message;
        this.#modals.open(dom.modals.error.root);
    }

    /** @param {{tone: string, icon: string, title: string, detail: string, lesson: ?{form: string, note: string}}} summary */
    showVerdict(summary) {
        const { root, icon, title, detail, lesson: lessonBox, form, note } = dom.verdict;

        // Geometry, animation and the transparent base border all live on
        // `.verdict` in app.css; only the tone palette is a Tailwind concern.
        root.className = `verdict ${VERDICT_TONE_CLASSES[summary.tone] ?? VERDICT_TONE_CLASSES.warning}`;
        icon.textContent = summary.icon;
        title.textContent = summary.title;
        detail.textContent = summary.detail;

        // The rule behind a wrong answer, as two plain strings: `textContent`
        // both, so no dataset word can reach the panel as markup.
        form.textContent = summary.lesson?.form ?? '';
        note.textContent = summary.lesson?.note ?? '';
        lessonBox.hidden = !summary.lesson;

        root.title = HINTS[summary.tone] ?? '';
        root.hidden = false;
        root.scrollIntoView?.({ block: 'nearest' });
    }

    hideVerdict() {
        dom.verdict.root.hidden = true;
    }

    /**
     * Sole sink for dynamic HTML: `html` must already be escaped, so callers
     * pre-escape every interpolated value via escapeHtml() first.
     */
    showHelpContent(title, html) {
        dom.modals.help.title.textContent = title;
        dom.modals.help.content.innerHTML = html;
    }

}
