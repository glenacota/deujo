// ui/belt-badge.js
// Two bars per kata. The upper bar is always full and wears the current belt's
// colour: it says which belt you hold. The lower bar tracks the points earned
// toward the next belt, each earned tick wearing the next belt's colour and
// each unearned one the neutral empty trough. The rank is a real text node, so
// the value never rides on colour alone.

import { CONFIG } from '../config.js';

const TICKS = CONFIG.rules.milestoneInterval;

/**
 * @param {HTMLElement} el container, rebuilt on every call
 * @param {import('../state.js').default} state
 * @param {string} kataId
 * @param {{compact?: boolean}} [options] compact: header variant, no rank label
 */
export function renderBeltBadge(el, state, kataId, options = {}) {
    if (!el) return;
    const { compact = false } = options;

    const belt = state.getCurrentBelt(kataId);
    const earned = state.getBeltPointsEarned(kataId);
    const isMaxBelt = belt >= CONFIG.rules.maxBelt;
    const rank = CONFIG.belts.labels[belt];
    // Black belt has no next rank, so its earned ticks stay on the current colour.
    const nextBelt = Math.min(belt + 1, CONFIG.rules.maxBelt);
    const nextRank = CONFIG.belts.labels[belt + 1] ?? null;
    const progressText = isMaxBelt
        ? `${rank} belt, top rank`
        : `${rank} belt, ${earned} of ${TICKS} points to ${nextRank} belt`;

    el.className = `belt-ticks belt-label-${belt} belt-next-${nextBelt}`
        + (compact ? ' belt-ticks-compact' : '');
    el.dataset.label = `${rank} belt`;
    // Hover text follows the render; index.html's static value is only a
    // placeholder for the first paint.
    el.title = progressText;

    // Upper bar: the belt you already hold, so it is always 100% and needs no
    // value semantics of its own.
    const held = document.createElement('span');
    held.className = 'belt-tick-held';
    held.setAttribute('aria-hidden', 'true');

    const track = document.createElement('span');
    track.className = 'belt-tick-track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(TICKS));
    track.setAttribute('aria-valuenow', String(earned));
    track.setAttribute('aria-label', progressText);

    for (let index = 0; index < TICKS; index += 1) {
        const tick = document.createElement('span');
        tick.className = 'belt-tick';
        tick.dataset.filled = String(index < earned);
        tick.setAttribute('aria-hidden', 'true');
        track.append(tick);
    }

    // Lower bar: the tick track on its own. The belt colours now come from the
    // upper bar and from the earned ticks, so no flanking dots are needed.
    const bar = document.createElement('span');
    bar.className = 'belt-tick-bar';
    bar.append(track);

    if (compact) {
        el.replaceChildren(held, bar);
        return;
    }

    const label = document.createElement('span');
    label.className = 'belt-ticks-label';

    const name = document.createElement('span');
    name.className = 'belt-rank';
    name.textContent = `${rank} belt`;

    label.append(name);
    el.replaceChildren(held, bar, label);
}