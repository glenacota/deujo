// ui/belt-badge.js

import { CONFIG } from '../config.js';

export function renderBeltBadge(el, state, kataId, sizeClasses) {
    if (!el) return;

    const belt = state.getCurrentBelt(kataId);
    const pct = state.getBeltProgressPct(kataId);
    el.textContent = `${CONFIG.belts.labels[belt]}\xa0\xa0\xa0belt`;
    el.dataset.label = `${CONFIG.belts.icons[belt]}\xa0\xa0\xa0belt`;
    el.className = `belt-label rounded-full belt-label-${belt} font-semibold uppercase tracking-wider ${sizeClasses}`;
    el.style.setProperty('--belt-progress', `${pct}%`);
}