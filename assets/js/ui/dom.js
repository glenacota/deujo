// ui/dom.js
// Single place that knows about element IDs

import { CONFIG } from '../config.js';

const byId = (id) => document.getElementById(id);

export const dom = {
  theme: {
    toggleBtn: byId('themeToggleBtn'),
    icon: byId('themeIcon'),
    label: byId('themeLabel'),
  },

  dashboard: {
    streak: byId('streakDisplay'),
    max: byId('maxStreakDisplay'),
    bar: byId('progressBar'),
    tier: byId('tierLabel'),
  },

  tabs: {
    nouns: byId('tabNouns'),
    verbs: byId('tabVerbs'),
    nounSection: byId('nounSection'),
    verbSection: byId('verbSection'),
  },

  noun: {
    word: byId('nounWord'),
    meaning: byId('nounMeaning'),
    plural: byId('pluralInput'),
    genderButtons: Array.from(document.querySelectorAll('.gender-btn')),
    checkBtn: byId('checkNounBtn'),
    skipBtn: byId('skipNounBtn'),
    teachBtn: byId('toggleNounTableBtn'),
  },

  verb: {
    word: byId('verbInfinitive'),
    meaning: byId('verbMeaning'),
    tenseButtons: Array.from(document.querySelectorAll('.tense-btn')),
    inputs: Object.fromEntries(CONFIG.persons.map((p) => [p.key, byId(`conj_${p.key}`)])),
    checkBtn: byId('checkVerbBtn'),
    skipBtn: byId('skipVerbBtn'),
    teachBtn: byId('toggleTableBtn'),
  },

  toast: {
    root: byId('milestoneToast'),
    icon: byId('milestoneToastIcon'),
    card: byId('milestoneToastCard'),
    title: byId('milestoneToastTitle'),
    text: byId('milestoneToastText'),
    effect: byId('milestoneToastEffect'),
  },

  modals: {
    verb: {
      root: byId('verbModal'),
      title: byId('modalVerbTitle'),
      closeBtn: byId('closeVerbModalBtn'),
      tableBody: byId('modalTableBody'),
      meaning: byId('modalVerbMeaning'),
    },
    noun: {
      root: byId('nounModal'),
      closeBtn: byId('closeNounModalBtn'),
    },
    feedback: {
      root: byId('feedbackModal'),
      panel: byId('feedbackModalPanel'),
      title: byId('feedbackModalTitle'),
      content: byId('feedbackModalContent'),
      continueBtn: byId('feedbackContinueBtn'),
    },
  },

  share: {
    btn: byId('progressShareBtn'),
    status: byId('shareStatus'),
  },
};
