// app.js
'use strict';

import { summarizeAnswer, summarizeWarning } from './services/answer-summary.js';
import { AudioEngine } from './services/audio-engine.js';
import { FxEngine } from './services/fx-engine.js';
import { GameState } from './state.js';
import { loadKatas } from './katas/registry.js';
import { clearAnswerMarks, setSectionLocked } from './ui/answer-view.js';
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
    #datasets = new Map(); // dataset URL -> Promise<dataset>
    #focusModeActive = false;
    #phase = 'answering';

    constructor() {
        this.#audio = new AudioEngine();
        this.#fx = new FxEngine('fireworksCanvas');
        this.#modals = new ModalController();
        this.#modals.bind();
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
            this.#ui.showFatalError('Please check your network, local server, or console logs.');
        }
    }

    #init() {
        this.#theme.initTheme();
        this.#theme.toggleMute(this.#audio.isMuted());
        this.#dashboard.render(this.#katas);
        this.#ui.renderStreak(this.#state);
        this.#katas.forEach((kata) => this.#renderBeltProgress(kata.id));
        this.#refreshAllDue();
        this.#bindEvents();

        if (this.#state.wasFocusModeActive() && this.#state.activeKata) {
            this.#enterKata(this.#state.activeKata);
        } else {
            this.#dashboard.showDashboard();
        }
    }

    #handleFeedback(id, isCorrect) {
        if (isCorrect) {
            const isPromoted = this.#state.incrementStreak(id);
            this.#renderProgress(id);

            if (isPromoted) {
                this.#audio.playMilestone();
                this.#fx.triggerShow();
                this.#toast.show(true, this.#state.getCurrentBelt(id), this.#state.streak);
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
        const datasetUrl = entry.kata.datasetUrl;
        let datasetPromise = this.#datasets.get(datasetUrl);
        if (!datasetPromise) {
            datasetPromise = fetch(datasetUrl)
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
                    return dataset;
                })
                .catch((error) => {
                    if (this.#datasets.get(datasetUrl) === datasetPromise) {
                        this.#datasets.delete(datasetUrl);
                    }
                    throw error;
                });
            this.#datasets.set(datasetUrl, datasetPromise);
        }

        const request = datasetPromise
            .then((dataset) => {
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
        this.#ui.renderStreak(this.#state);
        this.#renderBeltProgress(id);
        if (this.#state.activeKata === id) {
            this.#focus.renderHeader(this.#entries.get(id).kata, this.#state);
        }
    }

    /** Belt badges live on the dashboard card, independent of the kata's own (lazy) focus-section mount. */
    #renderBeltProgress(id) {
        this.#ui.renderKataProgress(
            this.#dashboard.getBelt(id),
            id,
            this.#state
        );
    }

    #loadNext(id) {
        const { kata, dataset } = this.#entries.get(id);
        if (!dataset) return;
        const item = this.#state.pickNext(dataset, id);
        this.#state.current[id] = item;
        if (item) kata.render(item);
        this.#focus.releaseFocus(kata.el.section);
    }

    #setPhase(id, phase) {
        this.#phase = phase;
        const section = this.#entries.get(id)?.kata.el.section;
        const locked = phase !== 'answering';
        if (locked) this.#focus.releaseFocus(section);
        setSectionLocked(dom.focus.sections, locked);
        dom.actions.checkLabel.textContent = locked ? 'Next' : 'Check';
        // Skipping a graded answer would let the learner dodge the streak reset.
        dom.actions.skipBtn.classList.toggle('hidden', locked);
    }

    #advance(id) {
        const section = this.#entries.get(id)?.kata.el.section;
        if (!section) return;

        this.#ui.hideVerdict();
        this.#setPhase(id, 'answering');
        clearAnswerMarks(section);
        this.#loadNext(id);

        section.classList.remove('motion-safe:animate-kata-enter');
        void section.offsetWidth;
        section.classList.add('motion-safe:animate-kata-enter');
    }

    #check(id) {
        if (this.#phase === 'reviewing') {
            this.#advance(id);
            return;
        }

        const { kata, dataset } = this.#entries.get(id) ?? {};
        if (!dataset) return;
        const item = this.#state.current[id];
        if (!item) return;

        const result = kata.check(item);
        if (!result) return;

        // A complaint about an unfinished answer is not a verdict: it grades
        // nothing, leaves the section editable, and stays put until dismissed.
        if (result.warning) {
            this.#ui.showVerdict(summarizeWarning(result.warning));
            return;
        }

        this.#state.recordAnswer(id, item.id, result.correct);
        this.#handleFeedback(id, result.correct);
        this.#refreshDue(id);

        const summary = summarizeAnswer(result);
        this.#ui.showVerdict(summary);
        this.#setPhase(id, 'reviewing');
    }

    /** Skipping discards the pending answer and moves on without grading it. */
    #skip(id) {
        if (!this.#entries.has(id) || this.#phase !== 'answering') return;
        this.#advance(id);
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
        const { kata } = this.#entries.get(id);
        kata.mount(dom.focus.sections);
        clearAnswerMarks(kata.el.section);
        this.#focus.blurActive();
        this.#setKata(id);
        this.#setPhase(id, 'answering');
        this.#ui.hideVerdict();
        this.#focusModeActive = true;
        this.#state.setFocusModeActive(true);
        this.#focus.renderHeader(kata, this.#state);
        this.#dashboard.showFocusMode();

        const dataset = await this.#loadDataset(id);
        if (!dataset || this.#state.activeKata !== id) return;
        if (this.#state.current[id]) {
            kata.render(this.#state.current[id]);
            this.#focus.releaseFocus(kata.el.section);
        } else {
            this.#loadNext(id);
        }
    }

    #exitToMenu() {
        this.#focusModeActive = false;
        this.#state.setFocusModeActive(false);
        this.#dashboard.showDashboard();
        this.#refreshAllDue();
    }

    #refreshDue(id) {
        this.#dashboard.setDueCount(id, this.#state.getDueCount(id));
    }

    #refreshAllDue() {
        this.#katas.forEach(({ id }) => this.#refreshDue(id));
    }

    #bindEvents() {
        dom.theme.toggleBtn.addEventListener('click', () => this.#theme.toggleTheme());
        dom.mute.toggleBtn.addEventListener('click', () => {
            const isMuted = this.#audio.toggleMute();
            this.#theme.toggleMute(isMuted);
        });
        this.#katas.forEach(({ id }) => {
            this.#dashboard.getCard(id).addEventListener('click', () => this.#enterKata(id));
        });

        dom.actions.checkBtn.addEventListener('click', () => this.#check(this.#state.activeKata));
        dom.actions.skipBtn.addEventListener('click', () => this.#skip(this.#state.activeKata));
        dom.actions.helpBtn.addEventListener('click', () => this.#showHelpModal(this.#state.activeKata));

        dom.share.btn.addEventListener('click', () => {
            const kata = this.#entries.get(this.#state.activeKata)?.kata;
            if (kata) this.#share.shareProgress(this.#state, kata);
        });
        dom.focus.backBtn.addEventListener('click', () => this.#exitToMenu());
        dom.logo.addEventListener('click', () => this.#exitToMenu());
        
        dom.buyMeCoffee.btn.addEventListener('click', () => window.open('https://ko-fi.com/A6C827EN29', '_blank', 'noopener,noreferrer'));

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') this.#refreshAllDue();
        });

        bindKeyboardShortcuts({
            modals: this.#modals,
            inputRoot: dom.focus.sections,
            isFocusModeActive: () => this.#focusModeActive,
            isAnswering: () => this.#phase === 'answering',
            kataCount: () => this.#katas.length,
            enterKataAtSlot: (slot) => this.#enterKata(this.#katas[slot - 1].id),
            check: () => this.#check(this.#state.activeKata),
            showHelp: () => dom.actions.helpBtn.click(),
            loadNext: () => this.#skip(this.#state.activeKata),
            exitToMenu: () => this.#exitToMenu(),
        });
    }
}

const app = new App();
app.bootstrap();