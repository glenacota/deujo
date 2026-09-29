// ui/dom.js
// Single place that knows about element IDs

const byId = (id) => document.getElementById(id);

export const dom = {
  logo: byId('logo'),
  
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

  buyMeCoffee: {
    btn: byId('buyMeCoffee'),
  },

  dashboardHome: {
    view: byId('dashboardView'),
    grid: byId('dashboardGrid'),
    cardTemplate: byId('kataCardTemplate'),
  },

  header: {
    streak: byId('streakDisplay'),
    max: byId('maxStreakDisplay'),
    beltBar: byId('headerBeltBar'),
  },

  focus: {
    view: byId('focusView'),
    backBtn: byId('backToMenuBtn'),
    kataName: byId('focusKataName'),
    status: byId('kataStatus'),
    sections: byId('kataSections'),
  },

  actions: {
    checkBtn: byId('checkAnswerBtn'),
    checkLabel: document.querySelector('#checkAnswerBtn [data-role="label"]'),
    skipBtn: byId('skipBtn'),
    helpBtn: byId('helpBtn'),
  },

  verdict: {
    root: byId('answerVerdict'),
    icon: byId('answerVerdictIcon'),
    title: byId('answerVerdictTitle'),
    detail: byId('answerVerdictDetail'),
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
    help: {
      root: byId('helpModal'),
      title: byId('helpModalTitle'),
      content: byId('helpModalContent'),
    },
    error: {
      root: byId('errorModal'),
      content: byId('errorModalContent'),
      reloadBtn: byId('errorModalReloadBtn'),
    },
    share: {
      root: byId('shareModal'),
      text: byId('shareModalText'),
    },
  },

  share: {
    btn: byId('progressShareBtn'),
  },
};
