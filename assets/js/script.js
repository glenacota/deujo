// script.js
'use strict';

import { CONFIG } from './config.js';
import { AudioEngine } from './services/audio-engine.js';
import { FxEngine } from './services/fx-engine.js';

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

/* ==================================================================
 * APPLICATION STATE
 * ================================================================== */

/** @type {Array<{w:string,g:string,m:string,p:string}>} */
let nounsData = [];
/** @type {Array<{w:string,m:string,pres:string[],praet:string[],perf:string[]}>} */
let verbsData = [];

const state = {
    streak: parseInt(localStorage.getItem(CONFIG.storage.streak) || '0', 10),
    maxStreak: parseInt(localStorage.getItem(CONFIG.storage.maxStreak) || '0', 10),
    beltProgress: parseInt(
        localStorage.getItem(CONFIG.storage.beltProgress) || localStorage.getItem(CONFIG.storage.streak) || '0',
        10,
    ),

    selectedGender: null,
    selectedTense: 'pres', // 'pres' | 'praet' | 'perf'

    currentNoun: null,
    currentVerb: null,

    activeTab: 'nouns', // 'nouns' | 'verbs'
    isVerbModalOpen: false,
    isNounModalOpen: false,
    feedbackNext: null,

    nounHistory: [],
    verbHistory: [],
};

/* ==================================================================
 * DOM ELEMENT CACHE
 * ================================================================== */

const dom = {
    // Dashboard
    streakDisplay: document.getElementById('streakDisplay'),
    maxStreakDisplay: document.getElementById('maxStreakDisplay'),
    progressBar: document.getElementById('progressBar'),
    tierLabel: document.getElementById('tierLabel'),

    // Tabs & sections
    tabNouns: document.getElementById('tabNouns'),
    tabVerbs: document.getElementById('tabVerbs'),
    nounSection: document.getElementById('nounSection'),
    verbSection: document.getElementById('verbSection'),

    // Noun practice
    nounWord: document.getElementById('nounWord'),
    nounMeaning: document.getElementById('nounMeaning'),
    pluralInput: document.getElementById('pluralInput'),
    checkNounBtn: document.getElementById('checkNounBtn'),
    skipNounBtn: document.getElementById('skipNounBtn'),
    toggleNounTableBtn: document.getElementById('toggleNounTableBtn'),
    genderBtns: document.querySelectorAll('.gender-btn'),

    // Noun modal
    nounModal: document.getElementById('nounModal'),
    closeNounModalBtn: document.getElementById('closeNounModalBtn'),

    // Verb practice
    verbInfinitive: document.getElementById('verbInfinitive'),
    verbMeaning: document.getElementById('verbMeaning'),
    checkVerbBtn: document.getElementById('checkVerbBtn'),
    skipVerbBtn: document.getElementById('skipVerbBtn'),
    toggleVerbTableBtn: document.getElementById('toggleTableBtn'),
    tenseBtns: document.querySelectorAll('.tense-btn'),
    conjInputs: {
        ich: document.getElementById('conj_ich'),
        du: document.getElementById('conj_du'),
        er: document.getElementById('conj_er'),
        wir: document.getElementById('conj_wir'),
        ihr: document.getElementById('conj_ihr'),
        sie: document.getElementById('conj_sie'),
    },

    // Conjugation modal
    verbModal: document.getElementById('verbModal'),
    closeVerbModalBtn: document.getElementById('closeVerbModalBtn'),
    modalVerbTitle: document.getElementById('modalVerbTitle'),
    modalVerbMeaning: document.getElementById('modalVerbMeaning'),
    modalTableBody: document.getElementById('modalTableBody'),

    // Misc
    milestoneToast: document.getElementById('milestoneToast'),
    milestoneToastCard: document.getElementById('milestoneToastCard'),
    milestoneToastIcon: document.getElementById('milestoneToastIcon'),
    milestoneToastTitle: document.getElementById('milestoneToastTitle'),
    milestoneToastText: document.getElementById('milestoneToastText'),
    milestoneToastEffect: document.getElementById('milestoneToastEffect'),
    progressShareBtn: document.getElementById('progressShareBtn'),
    shareStatus: document.getElementById('shareStatus'),
    feedbackModal: document.getElementById('feedbackModal'),
    feedbackModalPanel: document.getElementById('feedbackModalPanel'),
    feedbackModalTitle: document.getElementById('feedbackModalTitle'),
    feedbackModalContent: document.getElementById('feedbackModalContent'),
    feedbackContinueBtn: document.getElementById('feedbackContinueBtn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
    themeLabel: document.getElementById('themeLabel'),
};

/* ==================================================================
 * THEME (LIGHT / DARK MODE)
 * ================================================================== */

function initTheme() {
    const storedTheme = localStorage.getItem(CONFIG.storage.theme);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = storedTheme === 'dark' || (!storedTheme && prefersDark);

    document.documentElement.classList.toggle('dark', isDark);
    updateThemeUI(isDark);
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(CONFIG.storage.theme, isDark ? 'dark' : 'light');
    updateThemeUI(isDark);
}

function updateThemeUI(isDark) {
    dom.themeIcon.textContent = isDark ? '🌙' : '☀️';
    dom.themeLabel.textContent = isDark ? 'Dark Mode' : 'Light Mode';
}

/* ==================================================================
 * PERSISTENCE (STREAK)
 * ================================================================== */

function saveProgress() {
    localStorage.setItem(CONFIG.storage.streak, state.streak);
    localStorage.setItem(CONFIG.storage.maxStreak, state.maxStreak);
    localStorage.setItem(CONFIG.storage.beltProgress, state.beltProgress);
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
    initTheme();
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
    dom.milestoneToastCard.className = 'bg-amber-400 text-slate-950 text-base px-6 py-4 rounded-none border-4 border-slate-950 shadow-2xl flex items-center space-x-3 animate-bounce';
    dom.milestoneToastIcon.textContent = '🥋';
    dom.milestoneToastTitle.textContent = 'Belt Promoted!';
    dom.milestoneToastText.textContent = `🔥 Streak ${state.streak}! Promoted to ${beltName}!`;
    dom.milestoneToastEffect.textContent = '🎉';
    dom.milestoneToast.classList.remove('hidden');

    setTimeout(() => {
        dom.milestoneToast.classList.add('hidden');
    }, CONFIG.timing.toastMs);
}

function triggerBeltDemotion(currentTier) {
    const beltName = CONFIG.belts[Math.min(currentTier, CONFIG.belts.length - 1)];
    audio.playDemotion();
    dom.milestoneToastCard.className = 'bg-rose-400 text-rose-950 text-base px-6 py-4 rounded-none border-4 border-rose-950 shadow-2xl flex items-center space-x-3';
    dom.milestoneToastIcon.textContent = '🥋';
    dom.milestoneToastTitle.textContent = 'Belt Demoted';
    dom.milestoneToastText.textContent = `Belt progress dropped to ${beltName}.`;
    dom.milestoneToastEffect.textContent = '🚧';
    dom.milestoneToast.classList.remove('hidden');

    setTimeout(() => {
        dom.milestoneToast.classList.add('hidden');
    }, CONFIG.timing.toastMs);
}

/* ==================================================================
 * DASHBOARD RENDERING
 * ================================================================== */

function updateDashboardUI() {
    dom.streakDisplay.textContent = state.streak;
    dom.maxStreakDisplay.textContent = state.maxStreak;

    const progressInTier = state.beltProgress % CONFIG.rules.milestoneInterval;
    const currentTier = Math.floor(state.beltProgress / CONFIG.rules.milestoneInterval);
    const progressPercent = (progressInTier / CONFIG.rules.milestoneInterval) * 100;

    dom.progressBar.style.width = `${progressPercent}%`;

    const beltName = CONFIG.belts[Math.min(currentTier, CONFIG.belts.length - 1)];
    dom.tierLabel.textContent = beltName;
    dom.tierLabel.className = `text-xs px-2 py-0.5 rounded-full belt-label-${Math.min(currentTier, CONFIG.rules.maxTier)} font-semibold uppercase tracking-wider`;

    const tierClass = `belt-${Math.min(currentTier, CONFIG.rules.maxTier)}`;
    dom.progressBar.className = `h-full rounded-full transition-all duration-500 ease-out ${tierClass}`;
}

/* ==================================================================
 * NOUN PRACTICE
 * ================================================================== */

function nextNoun() {
    state.currentNoun = pickNextWithSpacedHistory(nounsData, state.nounHistory);
    state.selectedGender = null;

    dom.nounWord.textContent = state.currentNoun.w;
    dom.nounMeaning.textContent = `🇬🇧 ${state.currentNoun.m}`;
    
    const hasPlural = Boolean(state.currentNoun.p);
    dom.pluralInput.value = '';
    dom.pluralInput.disabled = !hasPlural;
    dom.pluralInput.placeholder = hasPlural ? 'e.g. Kinder' : 'no plural';
    dom.pluralInput.classList.toggle('opacity-50', !hasPlural);
    dom.pluralInput.classList.toggle('cursor-not-allowed', !hasPlural);

    dom.genderBtns.forEach((btn) => {
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
    const userPlural = dom.pluralInput.value.trim();

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

    dom.verbInfinitive.textContent = state.currentVerb.w;
    dom.verbMeaning.textContent = `🇬🇧 ${state.currentVerb.m}`;
    Object.values(dom.conjInputs).forEach((input) => {
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

    Object.entries(dom.conjInputs).forEach(([person, input]) => {
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
    dom.modalVerbTitle.childNodes[0].textContent = `${verb.w} `;
    dom.modalVerbMeaning.textContent = `🇬🇧 ${verb.m}`;

    const pres = verb.pres || [];
    const praet = verb.praet || [];
    const perf = verb.perf || [];

    dom.modalTableBody.innerHTML = CONFIG.persons.map((person, index) => `
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
    setModalVisibility(dom.verbModal, true);
    state.isVerbModalOpen = true;
}

function closeModal() {
    setModalVisibility(dom.verbModal, false);
    state.isVerbModalOpen = false;
}

function toggleModal() {
    state.isVerbModalOpen ? closeModal() : openModal();
}

function openNounModal() {
    if (state.activeTab !== 'nouns') return;
    setModalVisibility(dom.nounModal, true);
    state.isNounModalOpen = true;
}

function closeNounModal() {
    setModalVisibility(dom.nounModal, false);
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
    dom.feedbackModalTitle.textContent = colorClasses === FEEDBACK_STYLE.success ? '✅ Correct!' : '❌ Try again!';
    dom.feedbackModalContent.innerHTML = htmlContent;
    dom.feedbackModalPanel.className = `w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${colorClasses}`;
    state.feedbackNext = nextQuestion;
    setModalVisibility(dom.feedbackModal, true);
}

function getShareMessage() {
    return [
        `🥋🇩🇪 I'm a ${dom.tierLabel.textContent} in the Deujo now.`,
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
            dom.shareStatus.textContent = 'Result shared!';
            return;
        }

        await copyShareText(shareData.text);
        dom.shareStatus.textContent = 'Result copied to clipboard!';
    } catch (error) {
        if (error.name !== 'AbortError') {
            dom.shareStatus.textContent = 'Sharing is unavailable right now.';
        }
    }
}

function closeFeedbackModal() {
    setModalVisibility(dom.feedbackModal, false);
    const nextQuestion = state.feedbackNext;
    state.feedbackNext = null;
    if (nextQuestion) nextQuestion();
}

function switchTab(tab) {
    state.activeTab = tab;
    const isNouns = tab === 'nouns';

    dom.tabNouns.className = isNouns ? TAB_BUTTON_CLASS.active.nouns : TAB_BUTTON_CLASS.inactive;
    dom.tabVerbs.className = isNouns ? TAB_BUTTON_CLASS.inactive : TAB_BUTTON_CLASS.active.verbs;
    dom.nounSection.classList.toggle('hidden', !isNouns);
    dom.verbSection.classList.toggle('hidden', isNouns);

    closePracticeModals();
}

function handleEnterKey(event) {
    event.preventDefault();

    const feedbackIsOpen = !dom.feedbackModal.classList.contains('hidden');
    const practiceModalIsOpen = state.isVerbModalOpen || state.isNounModalOpen;

    closePracticeModals();
    if (feedbackIsOpen) {
        closeFeedbackModal();
    } else if (!practiceModalIsOpen) {
        const checkButton = state.activeTab === 'nouns' ? dom.checkNounBtn : dom.checkVerbBtn;
        checkButton.click();
    }
}

/* ==================================================================
 * EVENT BINDING
 * ================================================================== */

function bindEvents() {
    dom.themeToggleBtn.addEventListener('click', toggleTheme);

    dom.tabNouns.addEventListener('click', () => switchTab('nouns'));
    dom.tabVerbs.addEventListener('click', () => switchTab('verbs'));

    dom.toggleVerbTableBtn.addEventListener('click', toggleModal);
    dom.closeVerbModalBtn.addEventListener('click', closeModal);
    dom.verbModal.addEventListener('click', (e) => {
        if (e.target === dom.verbModal) closeModal();
    });

    dom.toggleNounTableBtn.addEventListener('click', toggleNounModal);
    dom.closeNounModalBtn.addEventListener('click', closeNounModal);
    dom.nounModal.addEventListener('click', (e) => {
        if (e.target === dom.nounModal) closeNounModal();
    });

    dom.feedbackModal.addEventListener('click', (e) => {
        if (e.target === dom.feedbackModal) closeFeedbackModal();
    });
    dom.feedbackContinueBtn.addEventListener('click', closeFeedbackModal);
    dom.progressShareBtn.addEventListener('click', shareResult);

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

    dom.tenseBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            dom.tenseBtns.forEach((b) => {
                b.classList.remove('bg-purple-600', 'text-white');
                b.classList.add('text-slate-600', 'dark:text-slate-400');
            });

            const selectedBtn = e.currentTarget;
            selectedBtn.classList.add('bg-purple-600', 'text-white');
            selectedBtn.classList.remove('text-slate-600', 'dark:text-slate-400');

            state.selectedTense = selectedBtn.dataset.tense;
        });
    });

    dom.genderBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            dom.genderBtns.forEach((b) => {
                b.setAttribute('aria-pressed', 'false');
                b.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-100', 'dark:bg-indigo-950/60');
            });

            const selectedBtn = e.currentTarget;
            selectedBtn.setAttribute('aria-pressed', 'true');
            selectedBtn.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-100', 'dark:bg-indigo-950/60');
            state.selectedGender = selectedBtn.dataset.gender;
        });
    });

    dom.checkNounBtn.addEventListener('click', checkNounAnswer);
    dom.skipNounBtn.addEventListener('click', nextNoun);

    dom.checkVerbBtn.addEventListener('click', checkVerbAnswer);
    dom.skipVerbBtn.addEventListener('click', nextVerb);
}

/* ==================================================================
 * BOOTSTRAP
 * ================================================================== */

window.addEventListener('load', loadVocabularyData);