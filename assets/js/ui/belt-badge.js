// ui/belt-badge.js
// Two bars per kata. The upper bar is always full and wears the current belt's
// colour: it says which belt you hold. The lower bar tracks the points earned
// toward the next belt, each earned tick wearing the next belt's colour and
// each unearned one the neutral empty trough. Points are fractional (a skip
// costs half, a fresh belt starts a fifth in), so the tick being earned can be
// part-filled. The rank is a real text node, so the value never rides on colour
// alone.

import { CONFIG } from '../config.js';

const TICKS = CONFIG.rules.milestoneInterval;

/** Belt points render as "2.5", not "2.5000000000000004" and not "2.5000001". */
const formatPoints = (points) => String(Math.round(points * 100) / 100);

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
        : `${rank} belt, ${formatPoints(earned)} of ${TICKS} points to ${nextRank} belt`;

    el.className = `belt-ticks belt-label-${belt} belt-next-${nextBelt}`
        + (compact ? ' belt-ticks-compact' : '');
    el.dataset.label = `${rank} belt`;
    // Hover text follows the render; index.html's static value is only a
    // placeholder for the first paint.
    el.title = progressText;

    // Upper bar: the belt you already hold, so it is always 100% and carries no
    // progress value of its own.
    const held = document.createElement('span');
    held.className = 'belt-tick-held';

    const track = document.createElement('span');
    track.className = 'belt-tick-track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(TICKS));
    track.setAttribute('aria-valuenow', formatPoints(earned));
    track.setAttribute('aria-label', progressText);

    for (let index = 0; index < TICKS; index += 1) {
        const tick = document.createElement('span');
        tick.className = 'belt-tick';
        // Whole ticks fill; the one being earned is clipped to its share, so a
        // half point reads as a half tick instead of rounding away.
        const fill = Math.min(Math.max(earned - index, 0), 1);
        tick.dataset.filled = fill >= 1 ? 'true' : (fill > 0 ? 'partial' : 'false');
        if (fill > 0 && fill < 1) tick.style.setProperty('--tick-fill', `${Math.round(fill * 100)}%`);
        tick.setAttribute('aria-hidden', 'true');
        track.append(tick);
    }

    // Lower bar: the tick track on its own. The belt colours now come from the
    // upper bar and from the earned ticks, so no flanking dots are needed.
    const bar = document.createElement('span');
    bar.className = 'belt-tick-bar';
    bar.append(track);

    // Focus header has no room for a label, so the bar stays purely decorative.
    if (compact) {
        held.setAttribute('aria-hidden', 'true');
        el.replaceChildren(held, bar);
        return;
    }

    // The rank name is printed on the held belt itself, so the label and the
    // colour it describes cannot drift apart.
    const name = document.createElement('span');
    name.className = 'belt-rank';
    name.textContent = `${rank} belt`;
    held.append(name);

    el.replaceChildren(held, bar);
}