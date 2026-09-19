// ui/dom.js
// Single place that knows about element IDs

const byId = (id) => document.getElementById(id);

export const dom = {
  theme: {
    toggleBtn: byId('themeToggleBtn'),
    icon: byId('themeIcon'),
    label: byId('themeLabel'),
  },

  mute: {
    toggleBtn: byId('muteToggleBtn'),
    icon: byId('muteIcon'),
    label: byId('muteLabel'),
  },

  dashboard: {
    streak: byId('streakDisplay'),
    max: byId('maxStreakDisplay'),
    tier: byId('tierLabel'),
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
