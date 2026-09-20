// app.js
'use strict';

import { CONFIG } from './config.js';
import { AudioEngine } from './services/audio-engine.js';
import { FxEngine } from './services/fx-engine.js';
import { GameState } from './state.js';
import { loadKatas } from './katas/registry.js';
import { dom } from './ui/dom.js';
import { UiController } from './ui/ui-controller.js';

class App {
    #audio;
    #fx;
    #state;
    #ui;
    #katas = [];
    #entries = new Map(); // kata id -> { kata, dataset }
    #focusModeActive = false;

    constructor() {
        this.#audio = new AudioEngine();
        this.#fx = new FxEngine('fireworksCanvas');
        this.#ui = new UiController();
    }

    async bootstrap() {
        try {
            this.#katas = await loadKatas();
            const datasets = await Promise.all(
                this.#katas.map(async (kata) => {
                    const response = await fetch(kata.datasetUrl);
                    if (!response.ok) throw new Error(`Failed to load dataset for "${kata.id}".`);
                    return response.json();
                })
            );
            this.#katas.forEach((kata, i) =>
                this.#entries.set(kata.id, { kata: kata, dataset: datasets[i] })
            );
            this.#state = new GameState(this.#katas.map((p) => p.id));
            this.#init();
        } catch (error) {
            console.error('Error loading language datasets:', error);
            alert('Could not load vocabulary data. Please check your network or local server.');
        }
    }

    #init() {
        this.#ui.initTheme();
        this.#ui.toggleMute(this.#audio.isMuted());
        this.#ui.renderDashboard(this.#state);
        this.#katas.forEach((kata) => kata.mount?.());
        this.#bindEvents();
        this.#ui.showDashboard();
        this.#katas.forEach((kata) => this.#loadNext(kata.id));
    }

    #handleFeedback(isCorrect, message) {
        const feedbackType = isCorrect ? CONFIG.feedbackType.Success : CONFIG.feedbackType.Error;
        this.#ui.showFeedback(feedbackType, message);

        if (isCorrect) {
            const isPromoted = this.#state.incrementStreak();
            this.#ui.renderDashboard(this.#state);

            if (isPromoted) {
                this.#audio.playMilestone();
                this.#fx.triggerShow();
                this.#ui.showToast(true, this.#state.getCurrentTier(), this.#state.streak);
            } else {
                this.#audio.playCorrect();
            }
        } else {
            const isDemoted = this.#state.resetStreak();
            this.#ui.renderDashboard(this.#state);

            if (isDemoted) {
                this.#audio.playDemotion();
                this.#ui.showToast(false, this.#state.getCurrentTier());
            } else {
                this.#audio.playWrong();
            }
        }
    }

    #loadNext(id) {
        const { kata, dataset } = this.#entries.get(id);
        const item = this.#state.pickNext(dataset, id);
        this.#state.current[id] = item;
        if (item) kata.render(item);
    }

    #check(id) {
        const { kata } = this.#entries.get(id);
        const item = this.#state.current[id];
        if (!item) return;

        const result = kata.check(item);
        if (!result) return;
        if (result.warning) {
            this.#ui.showFeedback(CONFIG.feedbackType.Warning, result.warning);
            return;
        }

        this.#handleFeedback(result.correct, result.message);
        this.#loadNext(id);
    }

    #setTab(tab) {
        this.#state.setActiveTab(tab);
        this.#ui.switchTab(this.#katas, tab);
    }

    #enterKata(id) {
        this.#setTab(id);
        this.#focusModeActive = true;
        this.#ui.showFocusMode();
    }

    #exitToMenu() {
        this.#focusModeActive = false;
        this.#ui.showDashboard();
    }

    #handleEnterKey(event) {
        event.preventDefault();
        const openModal = this.#ui.getOpenModal();

        if (!openModal) {
            this.#check(this.#state.activeTab);
        } else {
            this.#ui.closeModal(openModal);
        }
    }

    #bindEvents() {
        dom.theme.toggleBtn.addEventListener('click', () => this.#ui.toggleTheme());
        dom.mute.toggleBtn.addEventListener('click', () => {
            const isMuted = this.#audio.toggleMute();
            this.#ui.toggleMute(isMuted);
        });

        this.#katas.forEach(({ id, el }) => {
            el.tab.addEventListener('click', () => this.#enterKata(id));
            el.checkBtn.addEventListener('click', () => this.#check(id));
            el.skipBtn.addEventListener('click', () => this.#loadNext(id));

            if (!el.modal) return;
            el.teachBtn?.addEventListener('click', () => this.#ui.openModal(el.modal));
            el.modalCloseBtn?.addEventListener('click', () => this.#ui.closeModal(el.modal));
            el.modal.addEventListener('click', (e) => {
                if (e.target === el.modal) this.#ui.closeModal(el.modal);
            });
        });

        dom.modals.feedback.root.addEventListener('click', (e) => {
            if (e.target === dom.modals.feedback.root) this.#ui.closeModal(dom.modals.feedback.root);
        });
        dom.modals.feedback.continueBtn.addEventListener('click', () => this.#ui.closeModal(dom.modals.feedback.root));
        dom.share.btn.addEventListener('click', () => this.#ui.shareProgress(this.#state));
        dom.focus.backBtn.addEventListener('click', () => this.#exitToMenu());

        window.addEventListener('keydown', (e) => {
            const slot = Number(e.key);
            if (slot >= 1 && slot <= this.#katas.length) this.#enterKata(this.#katas[slot - 1].id);
            if (!this.#focusModeActive) return;
            if (e.key === '?') this.#entries.get(this.#state.activeTab)?.kata.el.teachBtn?.click();
            if (e.key === '/') this.#loadNext(this.#state.activeTab);
            if (e.key === 'Enter' || e.key === 'Return') {
                this.#handleEnterKey(e);
            }
            if (e.key === 'Escape') this.#exitToMenu();
        });
    }
}

window.addEventListener('load', () => {
    const app = new App();
    app.bootstrap();
});