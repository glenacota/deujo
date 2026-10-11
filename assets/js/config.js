// config.js

export const CONFIG = Object.freeze({
  storage: {
    prefix: 'dm_',
    theme: 'dm_theme',
    sound: 'dm_sound',
    animations: 'dm_animations',
    confetti: 'dm_confetti',
    hotkeys: 'dm_hotkeys',
    kata: 'dm_active_kata',
    focusMode: 'dm_focus_mode',
    streak: 'dm_streak',
    maxStreak: 'dm_max_streak',
    streakMigration: 'dm_streak_global_v1',
    belt: 'dm_belt_progress',
    srs: 'dm_srs_v2'
  },
  themeModes: ['system', 'light', 'dark'],
  rules: {
    recentExclude: 10,    // last N served items are skipped by pickNext
    milestoneInterval: 5, // belt points needed to advance one belt
    maxBelt: 6,           // index of the last belt (Black Belt)
    // Negative values cost progress.
    correctPoints: 1,
    wrongPoints: -1,
    skipPoints: -0.5,
    // A promotion starts one fifth into the new belt; the winning answer's overflow is dropped.
    promotionCredit: 1,
    // A demotion is not a reset: the lower belt starts four fifths in.
    demotionCredit: 4,
  },
  timing: {
    toastMs: 3500,
  },
  links: {
    support: 'https://ko-fi.com/A6C827EN29',
  },
  // Leitner spaced repetition. Kept beside the belt points, not in `timing`: both are tuned together.
  srs: {
    boxes: 3,             // Learning, Review, Mastered
    // Days until due again, indexed by the box landed in; a mistake (box 0) is due at once.
    delaysDays: [0, 2, 9],
    dayMs: 86_400_000,
    // One debounced write per burst of answers.
    saveDebounceMs: 500,
  },
  belts: {
    icons: ['⚪️', '🟡', '🟠', '🟢', '🔵', '🟤', '⚫️'],
    labels: ["White", "Yellow", "Orange", "Green", "Blue", "Brown", "Black"],
  },
  // Dashboard card accent colours: kata `accent` -> the hover border class.
  accents: {
    indigo: 'hover:border-indigo-500',
    teal: 'hover:border-teal-500',
    purple: 'hover:border-purple-500',
    amber: 'hover:border-amber-500',
  },
});
