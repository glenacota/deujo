// app.js
'use strict';

import { CONFIG } from './config.js';
import { AudioEngine } from './services/audio-engine.js';
import { FxEngine } from './services/fx-engine.js';
import { GameState } from './state.js';
import { dom } from './ui/dom.js';
import { UiController } from './ui/ui-controller.js';

class App {
    #audio;
    #fx;
    #state;
    #ui;
    #datasets = { nouns: [], verbs: [] };
    #personIndex;

    constructor() {
        this.#audio = new AudioEngine();
        this.#fx = new FxEngine('fireworksCanvas');
        this.#state = new GameState();
        this.#ui = new UiController();
        this.#personIndex = Object.fromEntries(
            CONFIG.persons.map((person, index) => [person.key, index])
        );
    }

    async bootstrap() {
        try {
            const [nounsResponse, verbsResponse] = await Promise.all([
                fetch(CONFIG.urls.nouns),
                fetch(CONFIG.urls.verbs),
            ]);
            if (!nounsResponse.ok || !verbsResponse.ok) {
                throw new Error('Failed to load JSON datasets.');
            }
            this.#datasets.nouns = await nounsResponse.json();
            this.#datasets.verbs = await verbsResponse.json();
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
        this.#bindEvents();
        this.#loadNextNoun();
        this.#loadNextVerb();
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

    #loadNextNoun() {
        const noun = this.#state.pickNext(this.#datasets.nouns, 'nouns');
        this.#state.current.noun = noun;
        this.#state.current.gender = null;
        if (noun) this.#ui.renderNoun(noun);
    }

    #checkNounAnswer() {
        const noun = this.#state.current.noun;
        if (!noun) return;

        const userGender = this.#state.current.gender;
        const userPlural = dom.noun.plural.value.trim();

        if (!userGender) {
            this.#ui.showFeedback(CONFIG.feedbackType.Warning, '⚠️ Please select a gender (der, die, or das).');
            return;
        }

        const isGenderCorrect = userGender === noun.g;
        const hasNoPlural = !noun.p;
        const isPluralCorrect = hasNoPlural || (userPlural.toLowerCase() === noun.p.toLowerCase());
        const pluralText = hasNoPlural ? 'no plural' : `die ${noun.p}`;

        const isCorrect = isGenderCorrect && isPluralCorrect;
        const answer = `<span class="font-extrabold underline">${noun.g}</span> ${noun.w}, Plural: <span class="font-extrabold underline">${pluralText}</span>`;
        const message = isCorrect ? `Excellent: ${answer}` : `Correct answer: ${answer}`;

        this.#handleFeedback(isCorrect, message);
        this.#loadNextNoun();
    }

    #loadNextVerb() {
        const verb = this.#state.pickNext(this.#datasets.verbs, 'verbs');
        this.#state.current.verb = verb;
        if (verb) {
            this.#ui.renderVerb(verb);
            this.#ui.renderConjugationTable(verb);
        }
    }

    #checkVerbAnswer() {
        const verb = this.#state.current.verb;
        if (!verb) return;

        const targetForms = verb[this.#state.current.tense];
        if (!targetForms) return;

        let allCorrect = true;
        Object.entries(dom.verb.inputs).forEach(([person, input]) => {
            const userValue = input.value.trim().toLowerCase();
            const expected = targetForms[this.#personIndex[person]].toLowerCase();
            if (userValue !== expected) allCorrect = false;
        });

        const message = allCorrect
            ? `Excellent! Perfect conjugation for "${verb.w}"!`
            : 'Correct answer: '
                + CONFIG.persons.map((p) => `${p.label} <strong>${targetForms[this.#personIndex[p.key]]}</strong>`).join(', ')
                + '.';

        this.#handleFeedback(allCorrect, message);
        this.#loadNextVerb();
    }

    #setTab(tab) {
        this.#state.activeTab = tab;
        this.#ui.switchTab(tab);
    }

    #handleEnterKey(event) {
        event.preventDefault();
        const openModal = this.#ui.getOpenModal();

        if (!openModal) {
            if (this.#state.activeTab === 'nouns') {
                this.#checkNounAnswer();
            } else {
                this.#checkVerbAnswer();
            }
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

        dom.tabs.nouns.addEventListener('click', () => this.#setTab('nouns'));
        dom.tabs.verbs.addEventListener('click', () => this.#setTab('verbs'));

        dom.verb.teachBtn.addEventListener('click', () => this.#ui.openModal(dom.modals.verb.root));
        dom.modals.verb.closeBtn.addEventListener('click', () => this.#ui.closeModal(dom.modals.verb.root));
        dom.modals.verb.root.addEventListener('click', (e) => {
            if (e.target === dom.modals.verb.root) this.#ui.closeModal(dom.modals.verb.root);
        });

        dom.noun.teachBtn.addEventListener('click', () => this.#ui.openModal(dom.modals.noun.root));
        dom.modals.noun.closeBtn.addEventListener('click', () => this.#ui.closeModal(dom.modals.noun.root));
        dom.modals.noun.root.addEventListener('click', (e) => {
            if (e.target === dom.modals.noun.root) this.#ui.closeModal(dom.modals.noun.root);
        });

        dom.modals.feedback.root.addEventListener('click', (e) => {
            if (e.target === dom.modals.feedback.root) this.#ui.closeModal(dom.modals.feedback.root);
        });
        dom.modals.feedback.continueBtn.addEventListener('click', () => this.#ui.closeModal(dom.modals.feedback.root));
        dom.share.btn.addEventListener('click', () => this.#ui.shareProgress(this.#state));

        window.addEventListener('keydown', (e) => {
            if (e.key === '1') this.#setTab('nouns');
            if (e.key === '2') this.#setTab('verbs');
            if (e.key === '?') {
                const btn = this.#state.activeTab === 'nouns' ? dom.noun.teachBtn : dom.verb.teachBtn;
                btn.click();
            }
            if (e.key === 'Enter' || e.key === 'Return') {
                this.#handleEnterKey(e);
            }
        });

        dom.verb.tenseButtons.forEach((btn) =>
            btn.addEventListener('click', () => {
                this.#state.current.tense = btn.dataset.tense;
                this.#ui.setTenseSelection(btn.dataset.tense);
            })
        );

        dom.noun.genderButtons.forEach((btn) =>
            btn.addEventListener('click', () => {
                this.#state.current.gender = btn.dataset.gender;
                this.#ui.setGenderSelection(btn.dataset.gender);
            })
        );

        dom.noun.checkBtn.addEventListener('click', () => this.#checkNounAnswer());
        dom.noun.skipBtn.addEventListener('click', () => this.#loadNextNoun());

        dom.verb.checkBtn.addEventListener('click', () => this.#checkVerbAnswer());
        dom.verb.skipBtn.addEventListener('click', () => this.#loadNextVerb());
    }
}

window.addEventListener('load', () => {
    const app = new App();
    app.bootstrap();
});