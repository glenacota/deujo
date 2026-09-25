// app.js
'use strict';

import { CONFIG } from './config.js';
import { AudioEngine } from './services/audio-engine.js';
import { FxEngine } from './services/fx-engine.js';
import { GameState } from './state.js';
import { loadKatas } from './katas/registry.js';
import { dom } from './ui/dom.js';
import { ModalController } from './ui/modal-controller.js';
import { UiController } from './ui/ui-controller.js';

class App {
    #audio;
    #fx;
    #state;
    #ui;
    #modals;
    #katas = [];
    #entries = new Map(); // kata id -> { kata, dataset }
    #focusModeActive = false;

    constructor() {
        this.#audio = new AudioEngine();
        this.#fx = new FxEngine('fireworksCanvas');
        this.#modals = new ModalController();
        this.#ui = new UiController(this.#modals);
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
        this.#ui.renderKataBelts(this.#katas, this.#state);
        this.#katas.forEach((kata) => {
            kata.mount?.();
            this.#loadNext(kata.id);
        });
        this.#bindEvents();
        this.#ui.showDashboard();
    }

    #handleFeedback(id, isCorrect, message) {
        const feedbackType = isCorrect ? CONFIG.feedbackType.Success : CONFIG.feedbackType.Error;
        this.#ui.showFeedback(feedbackType, message);

        if (isCorrect) {
            const isPromoted = this.#state.incrementStreak(id);
            this.#renderProgress(id);

            if (isPromoted) {
                this.#audio.playMilestone();
                this.#fx.triggerShow();
                this.#ui.showToast(true, this.#state.getCurrentBelt(id), this.#state.streak);
            } else {
                this.#audio.playCorrect();
            }
        } else {
            const isDemoted = this.#state.resetStreak(id);
            this.#renderProgress(id);

            if (isDemoted) {
                this.#audio.playDemotion();
                this.#ui.showToast(false, this.#state.getCurrentBelt(id));
            } else {
                this.#audio.playWrong();
            }
        }
    }

    #renderProgress(id) {
        this.#ui.renderKataBelts(this.#katas, this.#state);
        if (this.#state.activeTab === id) {
            this.#ui.renderFocusHeader(this.#entries.get(id).kata, this.#state);
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

        this.#handleFeedback(id, result.correct, result.message);
        this.#loadNext(id);
    }

    #showHelpModal(id) {
        const kata = this.#entries.get(id)?.kata;
        if (!kata?.getHelpContent) return;

        dom.modals.help.title.textContent = kata.helpTitle ?? 'Help';
        dom.modals.help.content.innerHTML = kata.getHelpContent(this.#state.current[id]);
        this.#modals.open(dom.modals.help.root, dom.actions.helpBtn);
    }

    #setTab(tab) {
        this.#state.setActiveTab(tab);
        this.#ui.switchTab(this.#katas, tab);
    }

    #enterKata(id) {
        this.#setTab(id);
        this.#focusModeActive = true;
        const { kata } = this.#entries.get(id);
        kata.render(this.#state.current[id]);
        this.#ui.renderFocusHeader(kata, this.#state);
        this.#ui.showFocusMode();
    }

    #exitToMenu() {
        this.#focusModeActive = false;
        this.#ui.showDashboard();
    }

    #bindEvents() {
        dom.theme.toggleBtn.addEventListener('click', () => this.#ui.toggleTheme());
        dom.mute.toggleBtn.addEventListener('click', () => {
            const isMuted = this.#audio.toggleMute();
            this.#ui.toggleMute(isMuted);
        });
        this.#modals.bind();

        this.#katas.forEach(({ id, el }) => {
            el.tab.addEventListener('click', () => this.#enterKata(id));
        });

        dom.actions.checkBtn.addEventListener('click', () => this.#check(this.#state.activeTab));
        dom.actions.skipBtn.addEventListener('click', () => this.#loadNext(this.#state.activeTab));
        dom.actions.helpBtn.addEventListener('click', () => this.#showHelpModal(this.#state.activeTab));

        dom.share.btn.addEventListener('click', () => this.#ui.shareProgress(this.#state, this.#state.activeTab));
        dom.focus.backBtn.addEventListener('click', () => this.#exitToMenu());
        dom.logo.addEventListener('click', () => this.#exitToMenu());
        
        dom.buyMeCoffee.btn.addEventListener('click', () => window.open('https://ko-fi.com/A6C827EN29', '_blank', 'noopener,noreferrer'));

        window.addEventListener('keydown', (e) => {
            if (this.#modals.handleKeydown(e)) return;

            if (e.key === 'Enter' || e.key === 'Return') {
                if (this.#focusModeActive && !this.#modals.isOpen()) {
                    e.preventDefault();
                    this.#check(this.#state.activeTab);
                }
            }

            if (e.key === '?' && this.#focusModeActive) {
                dom.actions.helpBtn.click();
            }

            const target = e.target;
            const isTyping =
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target.isContentEditable;

            if (e.shiftKey && e.code.startsWith('Digit')) {
                const slot = Number(e.code.slice(5));

                if (!isTyping && slot >= 1 && slot <= this.#katas.length) {
                    e.preventDefault();
                    this.#enterKata(this.#katas[slot - 1].id);
                }
            }

            if (e.key === '/' && !isTyping) {
                this.#loadNext(this.#state.activeTab);
            }

            if (e.key === 'Backspace' && this.#focusModeActive && !isTyping) {
                e.preventDefault();
                this.#exitToMenu();
            }
        });
    }
}

window.addEventListener('load', () => {
    const app = new App();
    app.bootstrap();
});