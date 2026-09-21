// config.js
// Central, immutable configuration for the whole app.

export const CONFIG = Object.freeze({
  storage: {
    theme: 'dm_theme',
    mute: 'dm_mute',
    tab: 'dm_active_tab',
    streak: 'dm_streak',
    maxStreak: 'dm_max_streak',
    belt: 'dm_belt_progress',
  },
  rules: {
    historyMax: 30,       // how many recently-seen words we remember, per topic
    historyRecycle: 5,    // how much history survives once the pool is exhausted
    milestoneInterval: 5, // belt points needed to advance one belt
    maxBelt: 6,           // index of the last belt (Black Belt)
  },
  timing: {
    toastMs: 3500,
  },
  belts: ['White Belt', 'Yellow Belt', 'Orange Belt', 'Green Belt', 'Blue Belt', 'Brown Belt', 'Black Belt'],
  feedbackType: { Success: 'Success', Error: 'Error', Warning: 'Warning' }
});