// ui/belt-badge.js
// Belt progress as tick marks: one tick per CONFIG.rules.milestoneInterval
// point. Filled ticks wear the current belt's gradient, so the bar keeps the
// belt colour; the rank and the exact count are real text nodes, so the value
// is never encoded by a gradient edge alone.

import { CONFIG } from '../config.js';

const TICKS = CONFIG.rules.milestoneInterval;

/**
 * @param {HTMLElement} el container, rebuilt on every call
 * @param {import('../state.js').default} state
 * @param {string} kataId
 * @param {{compact?: boolean}} [options] compact: header variant, ticks only
 */
export function renderBeltBadge(el, state, kataId, options = {}) {
    if (!el) return;
    const { compact = false } = options;

    const belt = state.getCurrentBelt(kataId);
    const earned = state.getBeltPointsEarned(kataId);
    const isMaxBelt = belt >= CONFIG.rules.maxBelt;
    const rank = CONFIG.belts.labels[belt];
    const nextRank = CONFIG.belts.labels[belt + 1] ?? null;
    const progressText = isMaxBelt
        ? `${rank} belt, top rank`
        : `${rank} belt, ${earned} of ${TICKS} points to ${nextRank} belt`;

    el.className = `belt-ticks belt-label-${belt}${compact ? ' belt-ticks-compact' : ''}`;
    el.dataset.label = `${rank} belt`;
    // Hover text follows the render; index.html's static value is only a
    // placeholder for the first paint.
    el.title = progressText;

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

    // Focus header: belt colour dot, bar, next belt colour dot.
    if (compact) {
        const dots = [sideDot(belt, `${rank} belt`)];
        if (!isMaxBelt) dots.push(sideDot(belt + 1, `${nextRank} belt`));
        el.replaceChildren(...dots.slice(0, 1), track, ...dots.slice(1));
        return;
    }

    const label = document.createElement('span');
    label.className = 'belt-ticks-label';

    const name = document.createElement('span');
    name.className = 'belt-rank';
    name.textContent = `${rank} belt`;

    label.append(name);
    el.replaceChildren(label, track);
}

/** A small dot in a belt's own colour, decorative: the track carries the value. */
function sideDot(belt, label) {
    const dot = document.createElement('span');
    dot.className = `belt-side belt-label-${belt}`;
    dot.title = label;
    dot.setAttribute('aria-hidden', 'true');
    return dot;
}