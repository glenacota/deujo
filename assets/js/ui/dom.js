// ui/dom.js
// Single place that knows about element IDs

const byId = (id) => document.getElementById?.(id) ?? null;
const ACTIVE_SECTION_SELECTOR = '[data-role="section"]:not(.hidden)';

export function getActiveInputs(root) {
  const section = root?.matches?.(ACTIVE_SECTION_SELECTOR)
    ? root
    : root?.querySelector?.(ACTIVE_SECTION_SELECTOR);
  if (!section) return [];
  return Array.from(section.querySelectorAll('input')).filter((input) => !input.disabled);
}

export const dom = {
  logo: byId('logo'),

  settings: {
    btn: byId('settingsBtn'),
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
  },

  focus: {
    view: byId('focusView'),
    backBtn: byId('backToMenuBtn'),
    kataName: byId('focusKataName'),
    beltBar: byId('focusBeltBar'),
    status: byId('kataStatus'),
    sections: byId('kataSections'),
  },

  actions: {
    checkBtn: byId('checkAnswerBtn'),
    checkLabel: document.querySelector?.('#checkAnswerBtn [data-role="label"]') ?? null,
    skipBtn: byId('skipBtn'),
    helpBtn: byId('helpBtn'),
  },

  verdict: {
    root: byId('answerVerdict'),
    icon: byId('answerVerdictIcon'),
    title: byId('answerVerdictTitle'),
    detail: byId('answerVerdictDetail'),
    lesson: byId('answerVerdictLesson'),
    form: byId('answerVerdictForm'),
    note: byId('answerVerdictNote'),
  },

  toast: {
    root: byId('milestoneToast'),
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
    settings: {
      root: byId('settingsModal'),
      themeInputs: Array.from(document.querySelectorAll?.('#settingsModal input[name="theme"]') ?? []),
      switches: {
        sound: byId('settingsSoundSwitch'),
        confetti: byId('settingsConfettiSwitch'),
        animations: byId('settingsAnimationsSwitch'),
        hotkeys: byId('settingsHotkeysSwitch'),
      },
      testSoundBtn: byId('settingsTestSoundBtn'),
      resetBtn: byId('settingsResetBtn'),
      clearDataBtn: byId('settingsClearDataBtn'),
      confirmBox: byId('settingsClearConfirm'),
      confirmCancelBtn: byId('settingsClearCancelBtn'),
      confirmOkBtn: byId('settingsClearOkBtn'),
    },
  },

  share: {
    btn: byId('progressShareBtn'),
  },
};
