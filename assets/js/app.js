// app.js
'use strict';

import { summarizeAnswer, summarizeWarning } from './services/answer-summary.js';
import { AudioEngine } from './services/audio-engine.js';
import { FxEngine } from './services/fx-engine.js';
import { GameState } from './state.js';
import { loadKatas } from './katas/registry.js';
import { applyDocumentPreferences, get } from './services/preferences.js';
import { clearAnswerMarks, setSectionLocked } from './ui/answer-view.js';
import { renderBeltBadge } from './ui/belt-badge.js';
import { DashboardView } from './ui/dashboard-view.js';
import { dom } from './ui/dom.js';
import { FocusView } from './ui/focus-view.js';
import { bindKeyboardShortcuts } from './ui/keyboard-shortcut.js';
import { ModalController } from './ui/modal-controller.js';
import { ShareController } from './ui/share-controller.js';
import { SettingsView } from './ui/settings-view.js';
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
    #settings;
    #katas = [];
    #entries = new Map(); // kata id -> { kata, dataset }
    #datasets = new Map(); // dataset URL -> Promise<dataset>, shared by katas on one file
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
        this.#settings = new SettingsView({
            audio: this.#audio,
            theme: this.#theme,
            // Stored state is gone, so a reload rebuilds state from the defaults.
            onClearData: () => window.location.reload(),
        });
    }

    async bootstrap() {
        try {
            this.#katas = loadKatas(dom.focus.sections);
            this.#katas.forEach((kata) => this.#entries.set(kata.id, { kata, dataset: null }));
            this.#state = new GameState(this.#katas.map((p) => p.id));
            this.#init();
        } catch (error) {
            console.error('Error loading language datasets:', error);
            this.#ui.showFatalError('Please check your network, local server, or console logs.');
        }
    }

    #init() {
        applyDocumentPreferences();
        this.#theme.initTheme();
        this.#dashboard.render(this.#katas);
        this.#ui.renderStreak(this.#state);
        this.#katas.forEach(({ id }) => renderBeltBadge(this.#dashboard.getBelt(id), this.#state, id));
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
                if (get('confetti')) this.#fx.triggerShow();
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

        this.#focus.showStatus('Loading exercises...');

        // The three verb katas share one file, so the fetch and the schema check
        // are cached by URL rather than per kata: entering all six katas costs
        // four requests, not six. A failure evicts the entry so the next attempt
        // really refetches instead of replaying the same rejection forever.
        const { datasetUrl } = entry.kata;
        if (!this.#datasets.has(datasetUrl)) {
            this.#datasets.set(datasetUrl, fetch(datasetUrl)
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
                    this.#datasets.delete(datasetUrl);
                    throw error;
                }));
        }

        try {
            const dataset = await this.#datasets.get(datasetUrl);
            entry.dataset = dataset;
            if (this.#state.activeKata === id) this.#focus.clearStatus();
            return dataset;
        } catch (error) {
            console.error(`Error loading dataset for "${id}":`, error);
            if (this.#state.activeKata === id) {
                this.#focus.showStatus(`Could not load ${entry.kata.name} exercises.`, 'error');
            }
            return null;
        }
    }

    #renderProgress(id) {
        this.#ui.renderStreak(this.#state);
        // Belt badges live on the dashboard card, independent of the kata's own
        // (lazy) focus-section mount.
        renderBeltBadge(this.#dashboard.getBelt(id), this.#state, id);
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
        this.#focus.releaseFocus(kata.el.section);
    }

    #setPhase(id, phase) {
        this.#phase = phase;
        const section = this.#entries.get(id)?.kata.el.section;
        const locked = phase !== 'answering';
        if (locked) this.#focus.releaseFocus(section);
        // Only the active kata's section: every kata is mounted from boot, so
        // locking the whole container would freeze all of them.
        setSectionLocked(section, locked);
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
        if (result.warning) {
            this.#ui.showVerdict(summarizeWarning(result.warning));
            return;
        }

        this.#state.recordAnswer(id, item.id, result.correct);
        this.#handleFeedback(id, result.correct);

        const summary = summarizeAnswer(result);
        this.#ui.showVerdict(summary);
        this.#setPhase(id, 'reviewing');
    }

    /**
     * Skipping discards the pending answer and moves on without grading it.
     * It still costs half a belt point, so dodging hard items has a price.
     */
    #skip(id) {
        if (!this.#entries.has(id) || this.#phase !== 'answering') return;
        const isDemoted = this.#state.applySkip(id);
        this.#renderProgress(id);
        if (isDemoted) {
            this.#audio.playDemotion();
            this.#toast.show(false, this.#state.getCurrentBelt(id));
        }
        this.#advance(id);
    }

    #showHelpModal(id) {
        const kata = this.#entries.get(id)?.kata;
        if (!kata) return;

        this.#ui.showHelpContent(kata.helpTitle, kata.getHelpContent(this.#state.current[id]));
        this.#modals.open(dom.modals.help.root, dom.actions.helpBtn);
    }

    #openSettings() {
        this.#settings.render();
        this.#modals.open(dom.modals.settings.root, dom.settings.btn);
    }

    #setKata(kata) {
        this.#state.setActiveKata(kata);
        this.#focus.switchKata(this.#katas, kata);
    }

    async #enterKata(id) {
        const { kata } = this.#entries.get(id);
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
    }

    #bindEvents() {
        this.#katas.forEach(({ id }) => {
            this.#dashboard.getCard(id).addEventListener('click', () => this.#enterKata(id));
        });

        dom.actions.checkBtn.addEventListener('click', () => this.#check(this.#state.activeKata));
        dom.actions.skipBtn.addEventListener('click', () => this.#skip(this.#state.activeKata));
        dom.actions.helpBtn.addEventListener('click', () => this.#showHelpModal(this.#state.activeKata));

        dom.settings.btn.addEventListener('click', () => this.#openSettings());

        dom.share.btn.addEventListener('click', () => {
            const kata = this.#entries.get(this.#state.activeKata)?.kata;
            if (kata) this.#share.shareProgress(this.#state, kata);
        });
        dom.focus.backBtn.addEventListener('click', () => this.#exitToMenu());
        dom.logo.addEventListener('click', () => this.#exitToMenu());
        
        dom.buyMeCoffee.btn.addEventListener('click', () => window.open('https://ko-fi.com/A6C827EN29', '_blank', 'noopener,noreferrer'));

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
            openSettings: () => this.#openSettings(),
            areHotkeysEnabled: () => get('hotkeys'),
        });
    }
}

const app = new App();
app.bootstrap();