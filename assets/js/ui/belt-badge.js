// ui/belt-badge.js
// The rank is a real text node so the value never rides on colour alone.

import { CONFIG } from '../config.js';

const TICKS = CONFIG.rules.milestoneInterval;

/** Belt points render as "2.5", not "2.5000000000000004" and not "2.5000001". */
const formatPoints = (points) => String(Math.round(points * 100) / 100);

export function renderBeltBadge(el, state, kataId, options = {}) {
    if (!el) return;
    const { compact = false } = options;

    const belt = state.getCurrentBelt(kataId);
    const earned = state.getBeltPointsEarned(kataId);
    const rank = CONFIG.belts.labels[belt];
    const progressText = belt >= CONFIG.rules.maxBelt
        ? `${rank} belt, top rank`
        : `${rank} belt, ${formatPoints(earned)} of ${TICKS} points to ${CONFIG.belts.labels[belt + 1]} belt`;

    // Black belt has no next rank, so its earned ticks stay on the current colour.
    el.className = `belt-ticks belt-label-${belt} belt-next-${Math.min(belt + 1, CONFIG.rules.maxBelt)}${compact ? ' belt-ticks-compact' : ''}`;
    el.dataset.label = `${rank} belt`;
    // index.html's static title is only a first-paint placeholder.
    el.title = progressText;

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
        // The tick being earned is clipped to its share, so a half point is not rounded away.
        const fill = Math.min(Math.max(earned - index, 0), 1);
        tick.dataset.filled = fill >= 1 ? 'true' : (fill > 0 ? 'partial' : 'false');
        if (fill > 0 && fill < 1) tick.style.setProperty('--tick-fill', `${Math.round(fill * 100)}%`);
        tick.setAttribute('aria-hidden', 'true');
        track.append(tick);
    }

    const bar = document.createElement('span');
    bar.className = 'belt-tick-bar';
    bar.append(track);

    if (compact) {
        held.setAttribute('aria-hidden', 'true');
        el.replaceChildren(held, bar);
        return;
    }

    // Printed on the held belt itself, so the label cannot drift from its colour.
    const name = document.createElement('span');
    name.className = 'belt-rank';
    name.textContent = `${rank} belt`;
    held.append(name);

    el.replaceChildren(held, bar);
}
