// belt-rules.js

import { CONFIG } from './config.js';

const { maxBelt, milestoneInterval: INTERVAL } = CONFIG.rules;

/** The last belt plus one full interval, so the final belt can still show a full bar. */
export const MAX_PROGRESS = maxBelt * (INTERVAL + 1);

export function clampProgress(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(value, 0), MAX_PROGRESS);
}

/** Rounded before clamping: repeated halves and fifths drift (4.700000000000001) and would be persisted. */
export function addPoints(progress, points) {
    return clampProgress(Math.round((progress + points) * 100) / 100);
}

export function beltAt(progress) {
    return Math.min(Math.floor(progress / INTERVAL), maxBelt);
}

/** Overflow from the crossing answer is dropped, so a belt has to be defended, not merely climbed. */
export function creditOnChange(belt, credit) {
    return belt * INTERVAL + Math.min(credit, INTERVAL);
}

/** Rounded: subtracting belt boundaries leaves float dust like 0.20000000000000018. */
export function pointsEarnedInBelt(progress) {
    const belt = beltAt(progress);
    if (belt >= maxBelt) return INTERVAL;
    return Math.round((progress - belt * INTERVAL) * 100) / 100;
}
