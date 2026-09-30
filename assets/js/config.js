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
  },
  timing: {
    toastMs: 3500,
  },
  belts: {
    icons: ['⚪️', '🟡', '🟠', '🟢', '🔵', '🟤', '⚫️'],
    labels: ["White", "Yellow", "Orange", "Green", "Blue", "Brown", "Black"],
  },
});