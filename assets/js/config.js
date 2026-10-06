// config.js
// Central, immutable configuration for the whole app.

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
    // Belt points per outcome. Negative values cost progress, so a belt has to
    // be defended, not just climbed.
    correctPoints: 1,
    wrongPoints: -1,
    skipPoints: -0.5,
    // A promotion never lands on an empty bar: it starts one fifth of the way
    // into the new belt, which is one whole point, one filled tick, 20% of the
    // bar. Whatever overflow the winning answer carried is dropped.
    promotionCredit: 1,
    // A demotion is not a reset: the belt you drop into starts four fifths of the
    // way in, so a mistake costs the gap plus the tick above the boundary.
    demotionCredit: 4,
  },
  timing: {
    toastMs: 3500,
  },
  links: {
    support: 'https://ko-fi.com/A6C827EN29',
  },
  // Leitner spaced repetition. Grouped next to the belt points rather than in
  // `timing`, because the box ladder and the reward schedule are tuned
  // together: both decide what a correct answer is worth.
  srs: {
    boxes: 3,             // Learning, Review, Mastered
    // Days an item waits before it counts as due again, indexed by the box it
    // landed in. Index 0 is the first box, so a mistake is due straight away.
    delaysDays: [0, 2, 9],
    dayMs: 86_400_000,
    // One debounced write for a burst of answers, rather than one per answer.
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
