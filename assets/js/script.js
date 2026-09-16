// script.js
'use strict';

import { CONFIG } from './config.js';
import { AudioEngine } from './services/audio-engine.js';
import { FxEngine } from './services/fx-engine.js';
import { Storage } from './services/storage.js';
import { dom } from './ui/dom.js';
import { UiController } from './ui/ui-controller.js';

/* ==================================================================
 * CONFIGURATION & CONSTANTS
 * ================================================================== */

// e.g. { ich: 0, du: 1, er: 2, wir: 3, ihr: 4, sie: 5 }
const PERSON_INDEX = Object.fromEntries(CONFIG.persons.map((person, index) => [person.key, index]));

const FEEDBACK_STYLE = {
    success: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800',
    error: 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800',
    warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800',
};

const INPUT_ERROR_CLASS = 'border-rose-500';
const INPUT_SUCCESS_CLASS = 'border-emerald-500';

const TAB_BUTTON_CLASS = {
    active: {
        nouns: 'flex-1 px-5 py-2 lg:py-3 rounded-lg text-base font-semibold transition-all flex items-center justify-center space-x-2 bg-indigo-600 text-white shadow-md',
        verbs: 'flex-1 px-5 py-2 lg:py-3 rounded-lg text-base font-semibold transition-all flex items-center justify-center space-x-2 bg-purple-600 text-white shadow-md',
    },
    inactive: 'flex-1 px-5 py-2 lg:py-3 rounded-lg text-base font-semibold transition-all flex items-center justify-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
};


const audio = new AudioEngine();
const fx = new FxEngine("fireworksCanvas");
const ui = new UiController();

/* ==================================================================
 * APPLICATION STATE
 * ================================================================== */

/** @type {Array<{w:string,g:string,m:string,p:string}>} */
let nounsData = [];
/** @type {Array<{w:string,m:string,pres:string[],praet:string[],perf:string[]}>} */
let verbsData = [];

const state = {
    streak: Storage.getNumber(CONFIG.storage.streak),
    maxStreak: Storage.getNumber(CONFIG.storage.maxStreak),
    beltProgress: Storage.getNumber(CONFIG.storage.beltProgress, Storage.getNumber(CONFIG.storage.streak)),

    selectedGender: null,
    selectedTense: 'pres',

    currentNoun: null,
    currentVerb: null,

    activeTab: 'nouns',
    isVerbModalOpen: false,
    isNounModalOpen: false,
    feedbackNext: null,

    nounHistory: [],
    verbHistory: [],
};

/* ==================================================================
 * PERSISTENCE (STREAK)
 * ================================================================== */

function saveProgress() {
    Storage.setNumber(CONFIG.storage.streak, state.streak);
    Storage.setNumber(CONFIG.storage.maxStreak, state.maxStreak);
    Storage.setNumber(CONFIG.storage.beltProgress, state.beltProgress);
}

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
    updateDashboardUI();
    bindEvents();
    nextNoun();
    nextVerb();
}

/* ==================================================================
 * SPACED-REPETITION SELECTION
 * ================================================================== */

function pickNextWithSpacedHistory(dataset, history) {
    let available = dataset.filter((item) => !history.includes(item.w));

    if (available.length === 0) {
        history.splice(0, history.length - CONFIG.rules.historyRecycle);
        available = dataset.filter((item) => !history.includes(item.w));
    }

    const chosen = available[Math.floor(Math.random() * available.length)];

    history.push(chosen.w);
    if (history.length > CONFIG.rules.historyMax) {
        history.shift();
    }

    return chosen;
}

/* ==================================================================
 * STREAK & MILESTONE HANDLING
 * ================================================================== */

function handleStreakIncrement() {
    state.streak += 1;
    state.maxStreak = Math.max(state.maxStreak, state.streak);
    state.beltProgress += 1;

    saveProgress();
    updateDashboardUI();

    if (state.beltProgress > 0 && state.beltProgress % CONFIG.rules.milestoneInterval === 0) {
        triggerMilestoneReward();
    } else {
        audio.playCorrect();
    }
}

function resetStreak() {
    const previousTier = Math.floor(state.beltProgress / CONFIG.rules.milestoneInterval);
    state.streak = 0;
    state.beltProgress = Math.max(0, state.beltProgress - 1);
    saveProgress();
    updateDashboardUI();

    const currentTier = Math.floor(state.beltProgress / CONFIG.rules.milestoneInterval);
    if (currentTier < previousTier) {
        triggerBeltDemotion(currentTier);
    } else {
        audio.playWrong();
    }
}

function triggerMilestoneReward() {
    audio.playMilestone();
    fx.triggerShow();

    const currentTier = Math.floor(state.beltProgress / CONFIG.rules.milestoneInterval);
    const beltName = CONFIG.belts[Math.min(currentTier, CONFIG.belts.length - 1)];
    dom.toast.card.className = 'bg-amber-400 text-slate-950 text-base px-6 py-4 rounded-none border-4 border-slate-950 shadow-2xl flex items-center space-x-3 animate-bounce';
    dom.toast.icon.textContent = '🥋';
    dom.toast.title.textContent = 'Belt Promoted!';
    dom.toast.text.textContent = `🔥 Streak ${state.streak}! Promoted to ${beltName}!`;
    dom.toast.effect.textContent = '🎉';
    dom.toast.root.classList.remove('hidden');

    setTimeout(() => {
        dom.toast.root.classList.add('hidden');
    }, CONFIG.timing.toastMs);
}

function triggerBeltDemotion(currentTier) {
    const beltName = CONFIG.belts[Math.min(currentTier, CONFIG.belts.length - 1)];
    audio.playDemotion();
    dom.toast.card.className = 'bg-rose-400 text-rose-950 text-base px-6 py-4 rounded-none border-4 border-rose-950 shadow-2xl flex items-center space-x-3';
    dom.toast.icon.textContent = '🥋';
    dom.toast.title.textContent = 'Belt Demoted';
    dom.toast.text.textContent = `Belt progress dropped to ${beltName}.`;
    dom.toast.effect.textContent = '🚧';
    dom.toast.root.classList.remove('hidden');

    setTimeout(() => {
        dom.toast.root.classList.add('hidden');
    }, CONFIG.timing.toastMs);
}

/* ==================================================================
 * DASHBOARD RENDERING
 * ================================================================== */

function updateDashboardUI() {
    dom.dashboard.streak.textContent = state.streak;
    dom.dashboard.max.textContent = state.maxStreak;

    const progressInTier = state.beltProgress % CONFIG.rules.milestoneInterval;
    const currentTier = Math.floor(state.beltProgress / CONFIG.rules.milestoneInterval);
    const progressPercent = (progressInTier / CONFIG.rules.milestoneInterval) * 100;

    dom.dashboard.bar.style.width = `${progressPercent}%`;

    const beltName = CONFIG.belts[Math.min(currentTier, CONFIG.belts.length - 1)];
    dom.dashboard.tier.textContent = beltName;
    dom.dashboard.tier.className = `text-xs px-2 py-0.5 rounded-full belt-label-${Math.min(currentTier, CONFIG.rules.maxTier)} font-semibold uppercase tracking-wider`;

    const tierClass = `belt-${Math.min(currentTier, CONFIG.rules.maxTier)}`;
    dom.dashboard.bar.className = `h-full rounded-full transition-all duration-500 ease-out ${tierClass}`;
}

/* ==================================================================
 * NOUN PRACTICE
 * ================================================================== */

function nextNoun() {
    state.currentNoun = pickNextWithSpacedHistory(nounsData, state.nounHistory);
    state.selectedGender = null;

    dom.noun.word.textContent = state.currentNoun.w;
    dom.noun.meaning.textContent = `🇬🇧 ${state.currentNoun.m}`;
    
    const hasPlural = Boolean(state.currentNoun.p);
    dom.noun.plural.value = '';
    dom.noun.plural.disabled = !hasPlural;
    dom.noun.plural.placeholder = hasPlural ? 'e.g. Kinder' : 'no plural';
    dom.noun.plural.classList.toggle('opacity-50', !hasPlural);
    dom.noun.plural.classList.toggle('cursor-not-allowed', !hasPlural);

    dom.noun.genderButtons.forEach((btn) => {
        btn.setAttribute('aria-pressed', 'false');
        btn.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-100', 'dark:bg-indigo-950/60');
    });
}

function handleAnswerResult({ isCorrect, message, nextQuestion }) {
    showFeedback(message, isCorrect ? FEEDBACK_STYLE.success : FEEDBACK_STYLE.error, nextQuestion);

    if (isCorrect) {
        handleStreakIncrement();
    } else {
        resetStreak();
    }
}

function checkNounAnswer() {
    if (!state.currentNoun) return;

    const userGender = state.selectedGender;
    const userPlural = dom.noun.plural.value.trim();

    if (!userGender) {
        showFeedback('⚠️ Please select a gender (der, die, or das).', FEEDBACK_STYLE.warning, nextNoun);
        return;
    }

    const isGenderCorrect = userGender === state.currentNoun.g;
    
    // Determine if the noun has no plural and validate accordingly
    const hasNoPlural = !state.currentNoun.p;
    const isPluralCorrect = hasNoPlural || (userPlural.toLowerCase() === state.currentNoun.p.toLowerCase());

    const pluralText = hasNoPlural ? 'no plural' : `die ${state.currentNoun.p}`;
    const answer = `<span class="font-extrabold underline">${state.currentNoun.g}</span> ${state.currentNoun.w}, Plural: <span class="font-extrabold underline">${pluralText}</span>`;
    const message = isGenderCorrect && isPluralCorrect
        ? `Excellent: ${answer}`
        : `Correct answer: ${answer}`;

    handleAnswerResult({
        isCorrect: isGenderCorrect && isPluralCorrect,
        message,
        nextQuestion: nextNoun,
    });
}

/* ==================================================================
 * VERB PRACTICE
 * ================================================================== */

function nextVerb() {
    state.currentVerb = pickNextWithSpacedHistory(verbsData, state.verbHistory);

    dom.verb.word.textContent = state.currentVerb.w;
    dom.verb.meaning.textContent = `🇬🇧 ${state.currentVerb.m}`;
    Object.values(dom.verb.inputs).forEach((input) => {
        input.value = '';
        input.classList.remove(INPUT_ERROR_CLASS, INPUT_SUCCESS_CLASS);
    });

    if (state.isVerbModalOpen) {
        renderConjugationModal();
    }
}

function checkVerbAnswer() {
    if (!state.currentVerb) return;

    const targetForms = state.currentVerb[state.selectedTense];
    if (!targetForms) return;

    let allCorrect = true;

    Object.entries(dom.verb.inputs).forEach(([person, input]) => {
        const userValue = input.value.trim().toLowerCase();
        const expected = targetForms[PERSON_INDEX[person]].toLowerCase();
        const isCorrect = userValue === expected;

        input.classList.toggle(INPUT_SUCCESS_CLASS, isCorrect);
        input.classList.toggle(INPUT_ERROR_CLASS, !isCorrect);

        if (!isCorrect) allCorrect = false;
    });

    const message = allCorrect
        ? `Excellent! Perfect conjugation for "${state.currentVerb.w}"!`
        : 'Correct answer: '
            + CONFIG.persons.map((p) => `${p.label} <strong>${targetForms[PERSON_INDEX[p.key]]}</strong>`).join(', ')
            + '.';

    handleAnswerResult({ isCorrect: allCorrect, message, nextQuestion: nextVerb });
}

/* ==================================================================
 * CONJUGATION & NOUN TABLE MODALS ("Teach Me!")
 * ================================================================== */

function renderConjugationModal() {
    if (!state.currentVerb) return;

    const verb = state.currentVerb;
    dom.modals.verb.title.childNodes[0].textContent = `${verb.w} `;
    dom.modals.verb.meaning.textContent = `🇬🇧 ${verb.m}`;

    const pres = verb.pres || [];
    const praet = verb.praet || [];
    const perf = verb.perf || [];

    dom.modals.verb.tableBody.innerHTML = CONFIG.persons.map((person, index) => `
        <tr class="hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors">
            <td class="py-2.5 px-3 font-sans font-bold text-slate-500 dark:text-slate-400 text-xs">${person.label}</td>
            <td class="py-2.5 px-3 text-emerald-600 dark:text-emerald-300 font-medium">${pres[index] || '-'}</td>
            <td class="py-2.5 px-3 text-cyan-600 dark:text-cyan-300 font-medium">${praet[index] || '-'}</td>
            <td class="py-2.5 px-3 text-purple-600 dark:text-purple-300 font-medium">${perf[index] || '-'}</td>
        </tr>
    `).join('');
}

function openModal() {
    if (state.activeTab !== 'verbs') return;
    renderConjugationModal();
    setModalVisibility(dom.modals.verb.root, true);
    state.isVerbModalOpen = true;
}

function closeModal() {
    setModalVisibility(dom.modals.verb.root, false);
    state.isVerbModalOpen = false;
}

function toggleModal() {
    state.isVerbModalOpen ? closeModal() : openModal();
}

function openNounModal() {
    if (state.activeTab !== 'nouns') return;
    setModalVisibility(dom.modals.noun.root, true);
    state.isNounModalOpen = true;
}

function closeNounModal() {
    setModalVisibility(dom.modals.noun.root, false);
    state.isNounModalOpen = false;
}

function toggleNounModal() {
    state.isNounModalOpen ? closeNounModal() : openNounModal();
}

function closePracticeModals() {
    closeModal();
    closeNounModal();
}

function setModalVisibility(modal, isVisible) {
    modal.classList.toggle('hidden', !isVisible);
}

/* ==================================================================
 * SHARED UI HELPERS
 * ================================================================== */

function showFeedback(htmlContent, colorClasses, nextQuestion) {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    dom.modals.feedback.title.textContent = colorClasses === FEEDBACK_STYLE.success ? '✅ Correct!' : '❌ Try again!';
    dom.modals.feedback.content.innerHTML = htmlContent;
    dom.modals.feedback.panel.className = `w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${colorClasses}`;
    state.feedbackNext = nextQuestion;
    setModalVisibility(dom.modals.feedback.root, true);
}

function getShareMessage() {
    return [
        `🥋🇩🇪 I'm a ${dom.dashboard.tier.textContent} in the Deujo now.`,
        `Can you beat my ${state.maxStreak} streak of flawless German mastery?`,
        'Join in: https://deujo.glenacota.me'
    ].join('\n');
}

async function copyShareText(text) {
    if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
}

async function shareResult() {
    const shareData = {
        text: `${getShareMessage()}`,
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
            dom.share.status.textContent = 'Result shared!';
            return;
        }

        await copyShareText(shareData.text);
        dom.share.status.textContent = 'Result copied to clipboard!';
    } catch (error) {
        if (error.name !== 'AbortError') {
            dom.share.status.textContent = 'Sharing is unavailable right now.';
        }
    }
}

function closeFeedbackModal() {
    setModalVisibility(dom.modals.feedback.root, false);
    const nextQuestion = state.feedbackNext;
    state.feedbackNext = null;
    if (nextQuestion) nextQuestion();
}

function switchTab(tab) {
    state.activeTab = tab;
    const isNouns = tab === 'nouns';

    dom.tabs.nouns.className = isNouns ? TAB_BUTTON_CLASS.active.nouns : TAB_BUTTON_CLASS.inactive;
    dom.tabs.verbs.className = isNouns ? TAB_BUTTON_CLASS.inactive : TAB_BUTTON_CLASS.active.verbs;
    dom.tabs.nounSection.classList.toggle('hidden', !isNouns);
    dom.tabs.verbSection.classList.toggle('hidden', isNouns);

    closePracticeModals();
}

function handleEnterKey(event) {
    event.preventDefault();

    const feedbackIsOpen = !dom.modals.feedback.root.classList.contains('hidden');
    const practiceModalIsOpen = state.isVerbModalOpen || state.isNounModalOpen;

    closePracticeModals();
    if (feedbackIsOpen) {
        closeFeedbackModal();
    } else if (!practiceModalIsOpen) {
        const checkButton = state.activeTab === 'nouns' ? dom.noun.checkBtn : dom.verb.checkBtn;
        checkButton.click();
    }
}

/* ==================================================================
 * EVENT BINDING
 * ================================================================== */

function bindEvents() {
    dom.theme.toggleBtn.addEventListener('click', ui.toggleTheme);

    dom.tabs.nouns.addEventListener('click', () => switchTab('nouns'));
    dom.tabs.verbs.addEventListener('click', () => switchTab('verbs'));

    dom.verb.teachBtn.addEventListener('click', toggleModal);
    dom.modals.verb.closeBtn.addEventListener('click', closeModal);
    dom.modals.verb.root.addEventListener('click', (e) => {
        if (e.target === dom.modals.verb.root) closeModal();
    });

    dom.noun.teachBtn.addEventListener('click', toggleNounModal);
    dom.modals.noun.closeBtn.addEventListener('click', closeNounModal);
    dom.modals.noun.root.addEventListener('click', (e) => {
        if (e.target === dom.modals.noun.root) closeNounModal();
    });

    dom.modals.feedback.root.addEventListener('click', (e) => {
        if (e.target === dom.modals.feedback.root) closeFeedbackModal();
    });
    dom.modals.feedback.continueBtn.addEventListener('click', closeFeedbackModal);
    dom.share.btn.addEventListener('click', shareResult);

    window.addEventListener('keydown', (e) => {
        if (e.key === '1' || e.key === '2') {
            e.preventDefault();
            switchTab(e.key === '1' ? 'nouns' : 'verbs');
            return;
        }

        if (e.key === '?') {
            e.preventDefault();
            if (state.activeTab === 'verbs') toggleModal();
            if (state.activeTab === 'nouns') toggleNounModal();
        }
        if (e.key === 'Enter' || e.key === 'Return') {
            handleEnterKey(e);
        }
    });

    dom.verb.tenseButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            dom.verb.tenseButtons.forEach((b) => {
                b.classList.remove('bg-purple-600', 'text-white');
                b.classList.add('text-slate-600', 'dark:text-slate-400');
            });

            const selectedBtn = e.currentTarget;
            selectedBtn.classList.add('bg-purple-600', 'text-white');
            selectedBtn.classList.remove('text-slate-600', 'dark:text-slate-400');

            state.selectedTense = selectedBtn.dataset.tense;
        });
    });

    dom.noun.genderButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            dom.noun.genderButtons.forEach((b) => {
                b.setAttribute('aria-pressed', 'false');
                b.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-100', 'dark:bg-indigo-950/60');
            });

            const selectedBtn = e.currentTarget;
            selectedBtn.setAttribute('aria-pressed', 'true');
            selectedBtn.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-100', 'dark:bg-indigo-950/60');
            state.selectedGender = selectedBtn.dataset.gender;
        });
    });

    dom.noun.checkBtn.addEventListener('click', checkNounAnswer);
    dom.noun.skipBtn.addEventListener('click', nextNoun);

    dom.verb.checkBtn.addEventListener('click', checkVerbAnswer);
    dom.verb.skipBtn.addEventListener('click', nextVerb);
}

/* ==================================================================
 * BOOTSTRAP
 * ================================================================== */

window.addEventListener('load', loadVocabularyData);