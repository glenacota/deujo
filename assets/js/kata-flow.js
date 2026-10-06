// kata-flow.js
// The learner's path through a kata: enter, answer, review, skip, leave.
//
// Everything that touches the page or a sound goes through `view` and
// `rewards`, so this module names no host global and a test drives it with fakes.

import { summarizeAnswer, summarizeWarning } from './services/answer-summary.js';
import { Phase } from './session.js';

export class KataFlow {
    #state;
    #session;
    #loader;
    #view;
    #rewards;
    #entries = new Map(); // kata id -> { kata, dataset }
    // Kept here, not read back from storage: storage can be unavailable.
    #focusModeActive = false;

    constructor({ state, session, katas, loader, view, rewards }) {
        this.#state = state;
        this.#session = session;
        this.#loader = loader;
        this.#view = view;
        this.#rewards = rewards;
        katas.forEach((kata) => this.#entries.set(kata.id, { kata, dataset: null }));
    }

    get focusModeActive() {
        return this.#focusModeActive;
    }

    get activeKata() {
        return this.#entries.get(this.#state.activeKata)?.kata ?? null;
    }

    isAnswering() {
        return this.#session.isAnswering(this.#state.activeKata);
    }

    /** Resumes the kata the learner left open, or shows the dashboard. */
    async start() {
        const id = this.#state.activeKata;
        if (this.#state.wasFocusModeActive() && id) {
            await this.enter(id);
            return;
        }
        this.#view.showDashboard();
    }

    async enter(id) {
        const entry = this.#entries.get(id);
        if (!entry) return;
        const { kata } = entry;

        this.#discardGradedItem();
        this.#view.clearMarks(kata);
        this.#view.blurActive();
        this.#state.setActiveKata(id);
        this.#view.showKata(id);
        this.#setPhase(id, Phase.ANSWERING);
        this.#view.hideVerdict();
        this.#focusModeActive = true;
        this.#state.setFocusModeActive(true);
        this.#view.renderHeader(kata);
        this.#view.showFocusMode();

        const dataset = await this.#loadDataset(id);
        if (!dataset || this.#state.activeKata !== id) return;
        const open = this.#state.currentItem(id);
        if (open) {
            kata.render(open);
            this.#view.releaseFocus(kata);
        } else {
            this.#loadNext(id);
        }
    }

    exit() {
        this.#discardGradedItem();
        this.#focusModeActive = false;
        this.#state.setFocusModeActive(false);
        this.#view.showDashboard();
    }

    check() {
        const id = this.#state.activeKata;
        if (this.#session.isReviewing(id)) {
            this.#advance(id);
            return;
        }

        const { kata, dataset } = this.#entries.get(id) ?? {};
        if (!dataset) return;
        const item = this.#state.currentItem(id);
        if (!item) return;

        const result = kata.check(item);
        if (result.warning) {
            this.#view.showVerdict(summarizeWarning(result.warning));
            return;
        }

        this.#state.recordAnswer(id, item.id, result.correct);
        const outcome = this.#applyOutcome(id, result.correct);
        // Reviewing is set before any reward runs: a reward that throws must not
        // leave a graded item open to be graded again.
        this.#setPhase(id, Phase.REVIEWING);
        this.#view.renderProgress(kata);
        this.#view.showVerdict(summarizeAnswer(result));
        this.#reward(outcome, id);
    }

    /**
     * Skipping discards the pending answer and moves on without grading it.
     * It still costs half a belt point, so dodging hard items has a price.
     */
    skip() {
        const id = this.#state.activeKata;
        if (!this.#session.isAnswering(id)) return;
        const { kata, dataset } = this.#entries.get(id) ?? {};
        if (!dataset || !this.#state.currentItem(id)) return;

        const isDemoted = this.#state.applySkip(id);
        this.#view.renderProgress(kata);
        if (isDemoted) this.#reward('demoted', id);
        this.#advance(id);
    }

    help() {
        const id = this.#state.activeKata;
        const kata = this.#entries.get(id)?.kata;
        if (!kata) return;
        this.#view.showHelp(kata.helpTitle, kata.getHelpContent(this.#state.currentItem(id)));
    }

    #applyOutcome(id, correct) {
        if (correct) return this.#state.incrementStreak(id) ? 'promoted' : 'correct';
        return this.#state.resetStreak(id) ? 'demoted' : 'wrong';
    }

    #reward(outcome, id) {
        try {
            if (outcome === 'promoted') this.#rewards.promoted(this.#state.getCurrentBelt(id), this.#state.streak);
            else if (outcome === 'demoted') this.#rewards.demoted(this.#state.getCurrentBelt(id));
            else this.#rewards[outcome]();
        } catch (error) {
            console.error('Reward feedback failed:', error);
        }
    }

    async #loadDataset(id) {
        const entry = this.#entries.get(id);
        if (entry.dataset) return entry.dataset;

        this.#view.showStatus('Loading exercises...');
        try {
            const dataset = await this.#loader.load(entry.kata);
            entry.dataset = dataset;
            if (this.#state.activeKata === id) this.#view.clearStatus();
            return dataset;
        } catch (error) {
            console.error(`Error loading dataset for "${id}":`, error);
            if (this.#state.activeKata === id) {
                this.#view.showStatus(`Could not load ${entry.kata.name} exercises.`, 'error');
            }
            return null;
        }
    }

    #loadNext(id) {
        const { kata, dataset } = this.#entries.get(id);
        if (!dataset) return;
        const item = this.#state.pickNext(dataset, id);
        this.#state.setCurrentItem(id, item);
        if (item) kata.render(item);
        this.#view.releaseFocus(kata);
    }

    #setPhase(id, phase) {
        this.#session.setPhase(id, phase);
        const { kata } = this.#entries.get(id);
        const locked = !this.#session.isAnswering(id);
        // Only this kata's section: every kata is mounted from boot, so locking
        // them all would freeze the siblings.
        this.#view.setLocked(kata, locked);
        // The Check/Skip bar is shared chrome, so it can only describe the kata on screen.
        if (this.#state.activeKata !== id) return;
        if (locked) this.#view.releaseFocus(kata);
        this.#view.setActionBar({ locked });
    }

    #advance(id) {
        const { kata } = this.#entries.get(id);
        this.#view.hideVerdict();
        this.#setPhase(id, Phase.ANSWERING);
        this.#view.clearMarks(kata);
        this.#loadNext(id);
        this.#view.restartEnterAnimation(kata);
    }

    /**
     * A graded item must not be shown again unanswered, or it can be re-scored.
     * Keyed to one kata on purpose: leaving never touches a sibling that is
     * still showing a verdict, and a kata left mid-answer keeps its typing.
     */
    #discardGradedItem() {
        const id = this.#state.activeKata;
        if (this.#session.isReviewing(id)) this.#state.setCurrentItem(id, null);
        this.#session.reset(id);
    }
}
