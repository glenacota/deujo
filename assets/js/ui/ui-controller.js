// ui/ui-controller.js

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
        // A pointer toggle must not keep focus, or Enter would toggle again instead of advancing. detail is 0 for a keyboard click.
        dom.verdict.lessons.querySelector('summary').addEventListener('click', (event) => {
            if (event.detail > 0) event.currentTarget.blur();
        });
    }

    /** The streak is global, so one pair of numbers serves every kata and both views. */
    renderStreak(state) {
        dom.header.streak.textContent = state.streak;
        dom.header.max.textContent = state.maxStreak;
    }

    showFatalError(message) {
        dom.modals.error.content.textContent = message;
        this.#modals.open(dom.modals.error.root);
    }

    /** @param {{tone: string, icon: string, title: string, detail: string, lessons: {label?: string, form: string, note: string}[]}} summary */
    showVerdict(summary) {
        const { root, icon, title, detail, lessons: lessonBox, list } = dom.verdict;

        // Geometry and animation live on `.verdict` in app.css; only the tone palette is Tailwind.
        root.className = `verdict ${VERDICT_TONE_CLASSES[summary.tone] ?? VERDICT_TONE_CLASSES.warning}`;
        icon.textContent = summary.icon;
        title.textContent = summary.title;
        detail.textContent = summary.detail;

        // textContent only, so no dataset word reaches the panel as markup.
        const lessons = summary.lessons ?? [];
        list.textContent = '';
        lessons.forEach(({ label, form, note }) => {
            const row = document.createElement('li');
            row.className = 'verdict-lesson';
            [['verdict-label', label], ['verdict-form', form], ['verdict-note', note]].forEach(([className, text]) => {
                if (!text) return;
                const part = document.createElement('span');
                part.className = className;
                part.textContent = text;
                row.appendChild(part);
            });
            list.appendChild(row);
        });
        lessonBox.hidden = lessons.length === 0;
        // Collapsed on every verdict: the learner opens the answers on purpose.
        lessonBox.open = false;

        root.title = HINTS[summary.tone] ?? '';
        root.hidden = false;
        root.scrollIntoView?.({ block: 'nearest' });
    }

    hideVerdict() {
        dom.verdict.root.hidden = true;
    }

    /** Trusted-HTML sink: `html` must already be escaped with escapeHtml(). */
    showHelpContent(title, html) {
        dom.modals.help.title.textContent = title;
        dom.modals.help.content.innerHTML = html;
    }

}
