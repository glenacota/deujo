// tests/unit/reward-presenter.test.js
// Each outcome fires the right sound, show and toast, and nothing else.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RewardPresenter } from '../../assets/js/ui/reward-presenter.js';

const build = ({ confetti = true } = {}) => {
  const log = [];
  const audio = Object.fromEntries(
    ['playCorrect', 'playWrong', 'playMilestone', 'playDemotion'].map((name) => [name, () => log.push(name)]),
  );
  const fx = { triggerShow: () => log.push('triggerShow') };
  const toast = { show: (...args) => log.push(['toast', ...args]) };
  const rewards = new RewardPresenter({ audio, fx, toast, isConfettiEnabled: () => confetti });
  return { rewards, log };
};

test('correct and wrong only play their sound', () => {
  const { rewards, log } = build();
  rewards.correct();
  rewards.wrong();
  assert.deepEqual(log, ['playCorrect', 'playWrong']);
});

test('promotion plays the milestone, fires the show and toasts the belt and streak', () => {
  const { rewards, log } = build();
  rewards.promoted('blue', 5);
  assert.deepEqual(log, ['playMilestone', 'triggerShow', ['toast', true, 'blue', 5]]);
});

test('promotion skips the show when confetti is off', () => {
  const { rewards, log } = build({ confetti: false });
  rewards.promoted('blue', 5);
  assert.deepEqual(log, ['playMilestone', ['toast', true, 'blue', 5]]);
});

test('demotion plays its sound and toasts the belt without a streak', () => {
  const { rewards, log } = build();
  rewards.demoted('white');
  assert.deepEqual(log, ['playDemotion', ['toast', false, 'white']]);
});
