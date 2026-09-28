// config.js
// Central, immutable configuration for the whole app.

export const CONFIG = Object.freeze({
  storage: {
    theme: 'dm_theme',
    mute: 'dm_mute',
    kata: 'dm_active_kata',
    focusMode: 'dm_focus_mode',
    streak: 'dm_streak',
    maxStreak: 'dm_max_streak',
    belt: 'dm_belt_progress',
    srs: 'dm_srs_v1'      // spatial repetition strategy
  },
  rules: {
    recentExclude: 3,     // last N served items are skipped by pickNext 
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
  feedbackType: { Success: 'Success', Error: 'Error', Warning: 'Warning' }
});