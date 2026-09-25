// ui/share-controller.js

import { CONFIG } from '../config.js';
import { dom } from './dom.js';

export class ShareController {
    #modals;

    constructor(modals) {
        this.#modals = modals;
    }

    async shareProgress(state, kataId) {
        const belt = state.getCurrentBelt(kataId);
        const kataName = kataId.charAt(0).toUpperCase() + kataId.slice(1);
        const text = [
            `🥋🇩🇪 I'm a ${CONFIG.belts.labels[belt]} in the ${kataName} kata on Deujo.`,
            `Can you beat my ${state.maxStreakByKata[kataId]}-answer streak of flawless German mastery?`,
            'Join in: https://deujo.glenacota.me'
        ].join('\n');
        try {
            if (navigator.share) {
                await navigator.share({text});
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
            } else {
                dom.modals.share.text.value = text;
                this.#modals.open(dom.modals.share.root, dom.share.btn);
                dom.modals.share.text.select();
            }
        } catch {
            // User cancelled the native share sheet - not an error worth surfacing.
        }
    }
}