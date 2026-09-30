import { dom } from './dom.js';

const ACCENT_HOVER_CLASSES = {
    indigo: 'hover:border-indigo-500',
    teal: 'hover:border-teal-500',
    purple: 'hover:border-purple-500',
    amber: 'hover:border-amber-500',
};

export class DashboardView {
    #cards = new Map();
    #belts = new Map();
    #dues = new Map();

    showDashboard() {
        dom.dashboardHome.view.classList.remove('hidden');
        dom.focus.view.classList.add('hidden');
    }

    render(katas) {
        const { grid, cardTemplate } = dom.dashboardHome;
        grid.innerHTML = '';
        this.#cards.clear();
        this.#belts.clear();
        this.#dues.clear();

        katas.forEach((kata, index) => {
            const fragment = cardTemplate.content.cloneNode(true);
            const card = fragment.querySelector('[data-role="card"]');
            card.id = `kata-${kata.id}`;
            card.classList.add(ACCENT_HOVER_CLASSES[kata.accent] ?? ACCENT_HOVER_CLASSES.indigo);
            card.querySelector('[data-role="hotkey"]').textContent = `⇧ + ${index + 1}`;
            card.querySelector('[data-role="name"]').textContent = kata.name;
            card.querySelector('[data-role="subtitle"]').textContent = kata.subtitle;
            const belt = card.querySelector('[data-role="belt"]');
            belt.id = `belt-${kata.id}`;
            grid.appendChild(fragment);

            // Cards/belts live in the dashboard, independent of a kata's own (lazy) focus-section mount.
            this.#cards.set(kata.id, card);
            this.#belts.set(kata.id, belt);
            const due = card.querySelector('[data-role="due"]');
            if (!due) console.warn(`kataCardTemplate is missing [data-role="due"]; due-count badge for "${kata.id}" is disabled`);
            this.#dues.set(kata.id, due);
        });
    }

    getCard(id) {
        return this.#cards.get(id);
    }

    getBelt(id) {
        return this.#belts.get(id);
    }

    showFocusMode() {
        dom.dashboardHome.view.classList.add('hidden');
        dom.focus.view.classList.remove('hidden');
    }

    setDueCount(id, count) {
        const el = this.#dues.get(id);
        if (!el) return;
        el.textContent = `${count} due`;
        el.classList.toggle('hidden', count === 0);
    }
}