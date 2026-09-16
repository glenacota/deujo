// script.js
'use strict';

import { CONFIG } from './config.js';
import { AudioEngine } from './services/audio-engine.js';
import { FxEngine } from './services/fx-engine.js';
import { GameState } from './state.js';
import { dom } from './ui/dom.js';
import { UiController } from './ui/ui-controller.js';

/* ==================================================================
 * CONFIGURATION & CONSTANTS
 * ================================================================== */

// e.g. { ich: 0, du: 1, er: 2, wir: 3, ihr: 4, sie: 5 }
const PERSON_INDEX = Object.fromEntries(CONFIG.persons.map((person, index) => [person.key, index]));

const audio = new AudioEngine();
const fx = new FxEngine("fireworksCanvas");

const state = new GameState();
const ui = new UiController();

/* ==================================================================
 * APPLICATION STATE
 * ================================================================== */

/** @type {Array<{w:string,g:string,m:string,p:string}>} */
let nounsData = [];
/** @type {Array<{w:string,m:string,pres:string[],praet:string[],perf:string[]}>} */
let verbsData = [];

/* ==================================================================
 * DATA LOADING & BOOTSTRAP
 * ================================================================== */

async function loadVocabularyData() {
    try {
        const [nounsResponse, verbsResponse] = await Promise.all([
            fetch(CONFIG.urls.nouns),
            fetch(CONFIG.urls.verbs),
        ]);

        if (!nounsResponse.ok || !verbsResponse.ok) {
            throw new Error('Failed to load JSON datasets.');
        }

        nounsData = await nounsResponse.json();
        verbsData = await verbsResponse.json();

        initApp();
    } catch (error) {
        console.error('Error loading language datasets:', error);
        alert('Could not load vocabulary data. Please check your network or local server.');
    }
}

function initApp() {
    ui.initTheme();
    ui.renderDashboard(state);
    bindEvents();
    loadNextNoun();
    loadNextVerb();
}

/* ==================================================================
 * STREAK & MILESTONE HANDLING
 * ================================================================== */

function handleStreakIncrement() {
    const isPromoted = state.incrementStreak();
    ui.renderDashboard(state);

    if (isPromoted) {
        audio.playMilestone();
        fx.triggerShow();
        ui.showToast(true, state.getCurrentTier(), state.streak);
    } else {
        audio.playCorrect();
    }
}

function resetStreak() {
    const isDemoted = state.resetStreak();
    ui.renderDashboard(state);

    if (isDemoted) {
        audio.playDemotion();
        ui.showToast(false, state.getCurrentTier());
    } else {
        audio.playWrong();
    }
}

/* ==================================================================
 * NOUN PRACTICE
 * ================================================================== */

function loadNextNoun() {
    const noun = state.pickNext(nounsData, 'nouns');
    state.current.noun = noun;
    state.current.gender = null;
    if (noun) ui.renderNoun(noun);
}

function checkNounAnswer() {
    if (!state.current.noun) return;

    const userGender = state.current.gender;
    const userPlural = dom.noun.plural.value.trim();

    if (!userGender) {
        handleAnswerResult(CONFIG.feedbackType.Warning,  '⚠️ Please select a gender (der, die, or das).')
        return;
    }

    const isGenderCorrect = userGender === state.current.noun.g;
    /* determine if the noun has no plural and validate accordingly */
    const hasNoPlural = !state.current.noun.p;
    const isPluralCorrect = hasNoPlural || (userPlural.toLowerCase() === state.current.noun.p.toLowerCase());
    const pluralText = hasNoPlural ? 'no plural' : `die ${state.current.noun.p}`;
    /* evaluate answer */
    const isCorrect = isGenderCorrect && isPluralCorrect;
    const answer = `<span class="font-extrabold underline">${state.current.noun.g}</span> ${state.current.noun.w}, Plural: <span class="font-extrabold underline">${pluralText}</span>`;
    const message = isCorrect ? `Excellent: ${answer}` : `Correct answer: ${answer}`;

    handleAnswerResult(isCorrect ? CONFIG.feedbackType.Success : CONFIG.feedbackType.Error, message);
    loadNextNoun();
}

/* ==================================================================
 * VERB PRACTICE
 * ================================================================== */

function loadNextVerb() {
    const verb = state.pickNext(verbsData, 'verbs');
    state.current.verb = verb;
    if (verb) {
        ui.renderVerb(verb);
        ui.renderConjugationTable(verb);
    }
}

function checkVerbAnswer() {
    if (!state.current.verb) return;

    const targetForms = state.current.verb[state.current.tense];
    if (!targetForms) return;

    /* evaluate answer */
    let allCorrect = true;
    Object.entries(dom.verb.inputs).forEach(([person, input]) => {
        const userValue = input.value.trim().toLowerCase();
        const expected = targetForms[PERSON_INDEX[person]].toLowerCase();
        const isCorrect = userValue === expected;

        if (!isCorrect) allCorrect = false;
    });

    const message = allCorrect
        ? `Excellent! Perfect conjugation for "${state.current.verb.w}"!`
        : 'Correct answer: '
            + CONFIG.persons.map((p) => `${p.label} <strong>${targetForms[PERSON_INDEX[p.key]]}</strong>`).join(', ')
            + '.';

    handleAnswerResult(allCorrect ? CONFIG.feedbackType.Success : CONFIG.feedbackType.Error, message);
    loadNextVerb();
}

/* ==================================================================
 * SHARED UI HELPERS
 * ================================================================== */

function handleAnswerResult(answerResult, answerMessage) {
    ui.showFeedback(answerResult, answerMessage);
    if (answerResult === CONFIG.feedbackType.Success) {
        handleStreakIncrement();
    } else {
        resetStreak();
    }
}

function setTab(tab) {
    state.activeTab = tab;
    ui.switchTab(tab);
}

function handleEnterKey(event) {
    event.preventDefault();
    const openModal = ui.getOpenModal();

    if (!openModal) {
        const checkButton = state.activeTab === 'nouns' ? dom.noun.checkBtn : dom.verb.checkBtn;
        checkButton.click();
    } else {
        ui.closeModal(openModal);
    }
}

/* ==================================================================
 * EVENT BINDING
 * ================================================================== */

function bindEvents() {
    dom.theme.toggleBtn.addEventListener('click', ui.toggleTheme);

    dom.tabs.nouns.addEventListener('click', () => setTab('nouns'));
    dom.tabs.verbs.addEventListener('click', () => setTab('verbs'));

    dom.verb.teachBtn.addEventListener('click', () => ui.openModal(dom.modals.verb.root));
    dom.modals.verb.closeBtn.addEventListener('click', () => ui.closeModal(dom.modals.verb.root));
    dom.modals.verb.root.addEventListener('click', (e) => {
        if (e.target === dom.modals.verb.root) ui.closeModal(dom.modals.verb.root);
    });

    dom.noun.teachBtn.addEventListener('click', () => ui.openModal(dom.modals.noun.root));
    dom.modals.noun.closeBtn.addEventListener('click', () => ui.closeModal(dom.modals.noun.root));
    dom.modals.noun.root.addEventListener('click', (e) => {
        if (e.target === dom.modals.noun.root) ui.closeModal(dom.modals.noun.root);
    });

    dom.modals.feedback.root.addEventListener('click', (e) => {
        if (e.target === dom.modals.feedback.root) ui.closeModal(dom.modals.feedback.root);
    });
    dom.modals.feedback.continueBtn.addEventListener('click', () => ui.closeModal(dom.modals.feedback.root));
    dom.share.btn.addEventListener('click', () => ui.shareProgress(state));

    window.addEventListener('keydown', (e) => {
        if (e.key === '1') setTab('nouns');
        if (e.key === '2') setTab('verbs');
        if (e.key === '?') {
            const btn = state.activeTab === 'nouns' ? dom.noun.teachBtn : dom.verb.teachBtn;
            btn.click();
        }
        if (e.key === 'Enter' || e.key === 'Return') {
            handleEnterKey(e);
        }
    });

    dom.verb.tenseButtons.forEach((btn) =>
      btn.addEventListener('click', () => {
        state.current.tense = btn.dataset.tense;
        ui.setTenseSelection(btn.dataset.tense);
      })
    );

    dom.noun.genderButtons.forEach((btn) =>
      btn.addEventListener('click', () => {
        state.current.gender = btn.dataset.gender;
        ui.setGenderSelection(btn.dataset.gender);
      })
    );

    dom.noun.checkBtn.addEventListener('click', checkNounAnswer);
    dom.noun.skipBtn.addEventListener('click', loadNextNoun);

    dom.verb.checkBtn.addEventListener('click', checkVerbAnswer);
    dom.verb.skipBtn.addEventListener('click', loadNextVerb);
}

/* ==================================================================
 * BOOTSTRAP
 * ================================================================== */

window.addEventListener('load', loadVocabularyData);