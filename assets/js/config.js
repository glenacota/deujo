// config.js
// Central, immutable configuration for the whole app.

export const CONFIG = Object.freeze({
  urls: {
    nouns: './assets/datasets/nouns.json',
    verbs: './assets/datasets/verbs.json',
  },
  storage: {
    theme: 'dm_theme',
    mute: 'dm_mute',
    streak: 'dm_streak',
    maxStreak: 'dm_max_streak',
    belt: 'dm_belt_progress',
  },
  rules: {
    historyMax: 30,       // how many recently-seen words we remember, per topic
    historyRecycle: 5,    // how much history survives once the pool is exhausted
    milestoneInterval: 5, // belt points needed to advance one tier
    maxTier: 6,           // index of the last belt (Black Belt)
  },
  timing: {
    toastMs: 3500,
  },
  belts: ['White Belt', 'Yellow Belt', 'Orange Belt', 'Green Belt', 'Blue Belt', 'Brown Belt', 'Black Belt'],
  persons: [
    { key: 'ich', label: 'ich' },
    { key: 'du', label: 'du' },
    { key: 'er', label: 'er/sie/es' },
    { key: 'wir', label: 'wir' },
    { key: 'ihr', label: 'ihr' },
    { key: 'sie', label: 'sie/Sie' },
  ],
  feedbackType: { Success: 'Success', Error: 'Error', Warning: 'Warning' }
});