// app.js
'use strict';

import { CONFIG } from './config.js';
import { AudioEngine } from './services/audio-engine.js';
import { FxEngine } from './services/fx-engine.js';
import { GameState } from './state.js';
import { loadKatas } from './katas/registry.js';
import { DashboardView } from './ui/dashboard-view.js';
import { dom } from './ui/dom.js';
import { FocusView } from './ui/focus-view.js';
import { bindKeyboardShortcuts } from './ui/keyboard-shortcut.js';
import { ModalController } from './ui/modal-controller.js';
import { ShareController } from './ui/share-controller.js';
import { ThemeController } from './ui/theme-controller.js';
import { ToastController } from './ui/toast-controller.js';
import { UiController } from './ui/ui-controller.js';

class App {
    #audio;
    #fx;
    #state;
    #ui;
    #dashboard;
    #focus;
    #theme;
    #toast;
    #share;
    #modals;
    #katas = [];
    #entries = new Map(); // kata id -> { kata, dataset }
    #focusModeActive = false;

    constructor() {
        this.#audio = new AudioEngine();
        this.#fx = new FxEngine('fireworksCanvas');
        this.#modals = new ModalController();
        this.#ui = new UiController(this.#modals);
        this.#dashboard = new DashboardView();
        this.#focus = new FocusView();
        this.#theme = new ThemeController();
        this.#toast = new ToastController();
        this.#share = new ShareController(this.#modals);
    }

    async bootstrap() {
        try {
            this.#katas = loadKatas();
            this.#katas.forEach((kata) => this.#entries.set(kata.id, { kata, dataset: null, loading: null }));
            this.#state = new GameState(this.#katas.map((p) => p.id));
            this.#init();
        } catch (error) {
            console.error('Error loading language datasets:', error);
            this.#ui.showFatalError('Could not load vocabulary data. Please check your network or local server.');
        }
    }

    #init() {
        this.#theme.initTheme();
        this.#theme.toggleMute(this.#audio.isMuted());
        this.#dashboard.render(this.#katas);
        this.#katas.forEach((kata) => {
            kata.mount(dom.focus.sections);
            this.#loadNext(kata.id);
        });
        this.#ui.renderKataBelts(this.#katas, this.#state);
        this.#bindEvents();
        this.#dashboard.showDashboard();
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
                this.#toast.show(true, this.#state.getCurrentBelt(id), this.#state.streakByKata[id]);
            } else {
                this.#audio.playCorrect();
            }
        } else {
            const isDemoted = this.#state.resetStreak(id);
            this.#renderProgress(id);

            if (isDemoted) {
                this.#audio.playDemotion();
                this.#toast.show(false, this.#state.getCurrentBelt(id));
            } else {
                this.#audio.playWrong();
            }
        }
    }

    async #loadDataset(id) {
        const entry = this.#entries.get(id);
        if (!entry) return null;
        if (entry.dataset) return entry.dataset;
        if (entry.loading) return entry.loading;

        this.#focus.showStatus('Loading exercises...');
        const request = fetch(entry.kata.datasetUrl)
            .then((response) => {
                if (!response.ok) throw new Error(`Failed to load dataset for "${id}".`);
                return response.json();
            })
            .then((dataset) => {
                try {
                    entry.kata.validateDataset(dataset);
                } catch (error) {
                    throw new Error(`Invalid dataset for "${id}": ${error.message}`);
                }
                entry.dataset = dataset;
                if (this.#state.activeKata === id) this.#focus.clearStatus();
                return dataset;
            })
            .catch((error) => {
                console.error(`Error loading dataset for "${id}":`, error);
                if (this.#state.activeKata === id) {
                    this.#focus.showStatus(`Could not load ${entry.kata.name} exercises.`, 'error');
                }
                return null;
            })
            .finally(() => {
                if (entry.loading === request) entry.loading = null;
            });

        entry.loading = request;
        return request;
    }

    #renderProgress(id) {
        this.#ui.renderKataBelt(this.#entries.get(id).kata, this.#state);
        if (this.#state.activeKata === id) {
            this.#focus.renderHeader(this.#entries.get(id).kata, this.#state);
        }
    }

    #loadNext(id) {
        const { kata, dataset } = this.#entries.get(id);
        if (!dataset) return;
        const item = this.#state.pickNext(dataset, id);
        this.#state.current[id] = item;
        if (item) kata.render(item);
    }

    #check(id) {
        const { kata, dataset } = this.#entries.get(id);
        if (!dataset) return;
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

        this.#ui.showHelpContent(kata.helpTitle, kata.getHelpContent(this.#state.current[id]));
        this.#modals.open(dom.modals.help.root, dom.actions.helpBtn);
    }

    #setKata(kata) {
        this.#state.setActiveKata(kata);
        this.#focus.switchKata(this.#katas, kata);
    }

    async #enterKata(id) {
        this.#setKata(id);
        this.#focusModeActive = true;
        const { kata } = this.#entries.get(id);
        this.#focus.renderHeader(kata, this.#state);
        this.#dashboard.showFocusMode();

        const dataset = await this.#loadDataset(id);
        if (!dataset || this.#state.activeKata !== id) return;
        if (this.#state.current[id]) {
            kata.render(this.#state.current[id]);
        } else {
            this.#loadNext(id);
        }
    }

    #exitToMenu() {
        this.#focusModeActive = false;
        this.#dashboard.showDashboard();
    }

    #bindEvents() {
        dom.theme.toggleBtn.addEventListener('click', () => this.#theme.toggleTheme());
        dom.mute.toggleBtn.addEventListener('click', () => {
            const isMuted = this.#audio.toggleMute();
            this.#theme.toggleMute(isMuted);
        });
        this.#modals.bind();

        this.#katas.forEach(({ id, el }) => {
            el.kata.addEventListener('click', () => this.#enterKata(id));
        });

        dom.actions.checkBtn.addEventListener('click', () => this.#check(this.#state.activeKata));
        dom.actions.skipBtn.addEventListener('click', () => this.#loadNext(this.#state.activeKata));
        dom.actions.helpBtn.addEventListener('click', () => this.#showHelpModal(this.#state.activeKata));

        dom.share.btn.addEventListener('click', () => this.#share.shareProgress(this.#state, this.#state.activeKata));
        dom.focus.backBtn.addEventListener('click', () => this.#exitToMenu());
        dom.logo.addEventListener('click', () => this.#exitToMenu());
        
        dom.buyMeCoffee.btn.addEventListener('click', () => window.open('https://ko-fi.com/A6C827EN29', '_blank', 'noopener,noreferrer'));

        bindKeyboardShortcuts({
            modals: this.#modals,
            inputRoot: dom.focus.sections,
            isFocusModeActive: () => this.#focusModeActive,
            kataCount: () => this.#katas.length,
            enterKataAtSlot: (slot) => this.#enterKata(this.#katas[slot - 1].id),
            check: () => this.#check(this.#state.activeKata),
            showHelp: () => dom.actions.helpBtn.click(),
            loadNext: () => this.#loadNext(this.#state.activeKata),
            exitToMenu: () => this.#exitToMenu(),
        });
    }
}

window.addEventListener('load', () => {
    const app = new App();
    app.bootstrap();
});