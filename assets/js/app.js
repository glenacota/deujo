// app.js
'use strict';

import { AudioEngine } from './platform/audio-engine.js';
import { CONFIG } from './config.js';
import { createDatasetLoader } from './platform/dataset-loader.js';
import { FxEngine } from './platform/fx-engine.js';
import { GameState } from './state.js';
import { KataFlow } from './kata-flow.js';
import { Session } from './session.js';
import { loadKatas } from './katas/registry.js';
import { applyDocumentPreferences, get } from './platform/preferences.js';
import { clearAnswerMarks, setSectionLocked } from './platform/dom/answer-marking.js';
import { renderBeltBadge } from './ui/belt-badge.js';
import { DashboardView } from './ui/dashboard-view.js';
import { dom } from './ui/dom.js';
import { FocusView } from './ui/focus-view.js';
import { bindKeyboardShortcuts } from './ui/keyboard-shortcut.js';
import { ModalController } from './ui/modal-controller.js';
import { RewardPresenter } from './ui/reward-presenter.js';
import { ShareController } from './ui/share-controller.js';
import { SettingsView } from './ui/settings-view.js';
import { ThemeController } from './ui/theme-controller.js';
import { ToastController } from './ui/toast-controller.js';
import { UiController } from './ui/ui-controller.js';

class App {
    #audio;
    #state;
    #ui;
    #dashboard;
    #focus;
    #theme;
    #rewards;
    #share;
    #modals;
    #settings;
    #katas = [];
    #flow;

    constructor() {
        this.#audio = new AudioEngine();
        this.#modals = new ModalController();
        this.#modals.bind();
        this.#ui = new UiController(this.#modals);
        this.#dashboard = new DashboardView();
        this.#focus = new FocusView();
        this.#theme = new ThemeController();
        this.#rewards = new RewardPresenter({
            audio: this.#audio,
            fx: new FxEngine('fireworksCanvas'),
            toast: new ToastController(),
            isConfettiEnabled: () => get('confetti'),
        });
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
            this.#state = new GameState(this.#katas.map((p) => p.id));
            this.#flow = new KataFlow({
                state: this.#state,
                session: new Session(),
                katas: this.#katas,
                loader: createDatasetLoader(),
                view: this.#buildView(),
                rewards: this.#rewards,
            });
            this.#init();
        } catch (error) {
            console.error('App failed to start:', error);
            this.#ui.showFatalError('The app could not start. See the browser console for details.');
        }
    }

    #init() {
        applyDocumentPreferences();
        this.#theme.initTheme();
        this.#dashboard.render(this.#katas);
        this.#ui.renderStreak(this.#state);
        this.#katas.forEach(({ id }) => renderBeltBadge(this.#dashboard.getBelt(id), this.#state, id));
        this.#bindEvents();
        this.#report(this.#flow.start());
    }

    /** Datasets load lazily, so a rejected `enter` is a runtime failure, not a boot one. */
    #report(promise) {
        promise.catch((error) => console.error('Kata action failed:', error));
    }

    /** The page operations `KataFlow` drives, composed from the UI pieces. */
    #buildView() {
        const focus = this.#focus;
        const ui = this.#ui;
        const state = this.#state;
        return {
            showStatus: (message, type) => focus.showStatus(message, type),
            clearStatus: () => focus.clearStatus(),
            renderHeader: (kata) => focus.renderHeader(kata, state),
            renderProgress: (kata) => {
                ui.renderStreak(state);
                // Belt badges live on the dashboard card, independent of the kata's own focus-section mount.
                renderBeltBadge(this.#dashboard.getBelt(kata.id), state, kata.id);
                if (state.activeKata === kata.id) focus.renderHeader(kata, state);
            },
            showKata: (id) => focus.switchKata(this.#katas, id),
            showFocusMode: () => this.#dashboard.showFocusMode(),
            showDashboard: () => this.#dashboard.showDashboard(),
            showVerdict: (summary) => ui.showVerdict(summary),
            hideVerdict: () => ui.hideVerdict(),
            showHelp: (title, html) => {
                ui.showHelpContent(title, html);
                this.#modals.open(dom.modals.help.root, dom.actions.helpBtn);
            },
            setLocked: (kata, locked) => setSectionLocked(kata.el.section, locked),
            clearMarks: (kata) => clearAnswerMarks(kata.el.section),
            setActionBar: (options) => focus.setActionBar(options),
            releaseFocus: (kata) => focus.releaseFocus(kata.el.section),
            blurActive: () => focus.blurActive(),
            restartEnterAnimation: (kata) => focus.restartEnterAnimation(kata.el.section),
        };
    }

    #openSettings() {
        this.#settings.render();
        this.#modals.open(dom.modals.settings.root, dom.settings.btn);
    }

    #bindEvents() {
        const flow = this.#flow;
        // One command surface, shared by every click and every shortcut.
        const actions = {
            enter: (id) => this.#report(flow.enter(id)),
            exit: () => flow.exit(),
            check: () => flow.check(),
            skip: () => flow.skip(),
            help: () => flow.help(),
            settings: () => this.#openSettings(),
        };

        this.#katas.forEach(({ id }) => {
            this.#dashboard.getCard(id).addEventListener('click', () => actions.enter(id));
        });

        dom.actions.checkBtn.addEventListener('click', actions.check);
        dom.actions.skipBtn.addEventListener('click', actions.skip);
        dom.actions.helpBtn.addEventListener('click', actions.help);

        dom.settings.btn.addEventListener('click', actions.settings);

        dom.share.btn.addEventListener('click', () => {
            const kata = flow.activeKata;
            if (kata) this.#share.shareProgress(this.#state, kata);
        });
        dom.focus.backBtn.addEventListener('click', actions.exit);
        dom.logo.addEventListener('click', actions.exit);

        dom.buyMeCoffee.btn.addEventListener('click', () => window.open(CONFIG.links.support, '_blank', 'noopener,noreferrer'));

        bindKeyboardShortcuts({
            modals: this.#modals,
            inputRoot: dom.focus.sections,
            isFocusModeActive: () => flow.focusModeActive,
            isAnswering: () => flow.isAnswering(),
            kataCount: () => this.#katas.length,
            enterKataAtSlot: (slot) => actions.enter(this.#katas[slot - 1].id),
            check: actions.check,
            showHelp: actions.help,
            loadNext: actions.skip,
            exitToMenu: actions.exit,
            openSettings: actions.settings,
            areHotkeysEnabled: () => get('hotkeys'),
        });
    }
}

const app = new App();
app.bootstrap();
