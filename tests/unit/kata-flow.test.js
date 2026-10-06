// tests/unit/kata-flow.test.js
// The answer / review / skip / leave loop, driven through fakes.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { browser, CONFIG } from '../helpers/bootstrap.js';

const { GameState } = await import('../../assets/js/state.js');
const { SrsStore } = await import('../../assets/js/platform/srs-store.js');
const { Session } = await import('../../assets/js/session.js');
const { KataFlow } = await import('../../assets/js/kata-flow.js');

const { milestoneInterval } = CONFIG.rules;

beforeEach(() => {
  SrsStore.reset();
  browser.reset();
});

const ITEMS = [{ id: 'a' }, { id: 'b' }];

const fakeKata = (id, { correct = true, warning = null } = {}) => {
  const kata = {
    id,
    name: id,
    helpTitle: `${id} help`,
    datasetUrl: `/${id}.json`,
    el: { section: { id } },
    rendered: [],
    outcome: { correct, warning },
    render: (item) => kata.rendered.push(item.id),
    check: () => kata.outcome,
    getHelpContent: (item) => `help:${item?.id}`,
  };
  return kata;
};

/** Builds a flow whose view and rewards record every call by name. */
const build = ({ kata = fakeKata('k'), extra = [], rewards: rewardOverrides = {}, load } = {}) => {
  const katas = [kata, ...extra];
  const calls = [];
  const record = (name) => (...args) => calls.push([name, ...args.map((a) => a?.id ?? a)]);

  const view = new Proxy({}, { get: (_, name) => record(name) });
  const rewards = {
    correct: record('correct'),
    wrong: record('wrong'),
    promoted: record('promoted'),
    demoted: record('demoted'),
    ...rewardOverrides,
  };
  const loader = { load: load ?? (async () => ITEMS) };
  const state = new GameState(katas.map((k) => k.id));
  const session = new Session();
  const flow = new KataFlow({ state, session, katas, loader, view, rewards });

  const names = () => calls.map(([name]) => name);
  return { flow, state, session, kata, calls, names };
};

test('entering loads the dataset and renders the first item', async () => {
  const { flow, kata, state, session } = build();
  await flow.enter('k');

  assert.equal(kata.rendered.length, 1);
  assert.equal(state.currentItem('k').id, kata.rendered[0]);
  assert.equal(flow.focusModeActive, true);
  assert.equal(session.isAnswering('k'), true);
});

test('entering an unknown kata does nothing', async () => {
  const { flow, calls } = build();
  await flow.enter('nope');
  assert.deepEqual(calls, []);
});

test('checking grades once, then review turns Check into Next', async () => {
  const { flow, kata, session, names } = build();
  await flow.enter('k');
  flow.check();

  assert.equal(session.isReviewing('k'), true);
  assert.ok(names().includes('showVerdict'));
  assert.ok(names().includes('correct'));

  const shown = kata.rendered.length;
  flow.check();
  assert.equal(session.isAnswering('k'), true);
  assert.equal(kata.rendered.length, shown + 1);
});

test('a warning is shown without grading or changing phase', async () => {
  const { flow, session, names, state } = build({ kata: fakeKata('k', { warning: 'Fill the blank.' }) });
  await flow.enter('k');
  flow.check();

  assert.equal(session.isAnswering('k'), true);
  assert.ok(names().includes('showVerdict'));
  assert.equal(names().includes('correct'), false);
  assert.equal(state.streak, 0);
});

test('a reward that throws still leaves the kata reviewing', async (t) => {
  t.mock.method(console, 'error', () => {});
  const { flow, session, state } = build({
    rewards: { correct: () => { throw new Error('audio failed'); } },
  });
  await flow.enter('k');
  flow.check();

  assert.equal(session.isReviewing('k'), true);
  assert.equal(state.streak, 1);
});

test('the fifth correct answer rewards a promotion with belt and streak', async () => {
  const { flow, calls } = build();
  await flow.enter('k');
  for (let i = 0; i < milestoneInterval; i++) {
    flow.check();
    flow.check();
  }
  // The promotion fires on the fifth check, before its Next.
  assert.equal(calls.filter(([name]) => name === 'promoted').length, 1);
  assert.deepEqual(calls.find(([name]) => name === 'promoted').slice(1), [1, milestoneInterval]);
});

test('a wrong answer resets the streak and rewards wrong', async () => {
  const { flow, state, names } = build({ kata: fakeKata('k', { correct: false }) });
  await flow.enter('k');
  flow.check();

  assert.equal(state.streak, 0);
  assert.ok(names().includes('wrong'));
});

test('skip is a no-op while reviewing', async () => {
  const { flow, session, kata } = build();
  await flow.enter('k');
  flow.check();
  const shown = kata.rendered.length;
  flow.skip();

  assert.equal(session.isReviewing('k'), true);
  assert.equal(kata.rendered.length, shown);
});

test('skip serves the next item without grading', async () => {
  const { flow, kata, names, state } = build();
  await flow.enter('k');
  flow.skip();

  assert.equal(kata.rendered.length, 2);
  assert.equal(names().includes('correct'), false);
  assert.equal(state.streak, 0);
});

test('leaving while reviewing discards the graded item', async () => {
  const { flow, state, session, names } = build();
  await flow.enter('k');
  flow.check();
  flow.exit();

  assert.equal(state.currentItem('k'), null);
  assert.equal(session.isAnswering('k'), true);
  assert.equal(flow.focusModeActive, false);
  assert.ok(names().includes('showDashboard'));
});

test('leaving mid-answer keeps the open item', async () => {
  const { flow, state } = build();
  await flow.enter('k');
  const open = state.currentItem('k');
  flow.exit();

  assert.equal(state.currentItem('k'), open);
});

test('a dataset that loads after the learner moved on is not rendered', async () => {
  let release;
  const slow = new Promise((resolve) => { release = resolve; });
  const other = fakeKata('o');
  const { flow, kata } = build({
    extra: [other],
    load: (k) => (k.id === 'k' ? slow : Promise.resolve(ITEMS)),
  });

  const first = flow.enter('k');
  await flow.enter('o');
  release(ITEMS);
  await first;

  assert.equal(kata.rendered.length, 0);
  assert.equal(other.rendered.length, 1);
});

test('a failed load shows an error status and renders nothing', async (t) => {
  t.mock.method(console, 'error', () => {});
  const { flow, kata, calls } = build({ load: async () => { throw new Error('offline'); } });
  await flow.enter('k');

  assert.equal(kata.rendered.length, 0);
  assert.deepEqual(calls.filter(([name]) => name === 'showStatus').at(-1), ['showStatus', 'Could not load k exercises.', 'error']);
});

test('help passes the open item to the kata and shows it', async () => {
  const { flow, calls, state } = build();
  await flow.enter('k');
  flow.help();

  assert.deepEqual(calls.at(-1), ['showHelp', 'k help', `help:${state.currentItem('k').id}`]);
});

test('start resumes the kata left open, else shows the dashboard', async () => {
  const first = build();
  await first.flow.enter('k');

  const resumed = build();
  await resumed.flow.start();
  assert.equal(resumed.flow.focusModeActive, true);

  first.flow.exit();
  const fresh = build();
  await fresh.flow.start();
  assert.equal(fresh.flow.focusModeActive, false);
  assert.ok(fresh.names().includes('showDashboard'));
});
