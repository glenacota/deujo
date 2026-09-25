// ui/toast-controller.js

import { CONFIG } from '../config.js';
import { dom } from './dom.js';

export class ToastController {
    #timer = null;

    show(isPromotion, belt, streak) {
        const beltIndex = Math.min(belt, CONFIG.belts.labels.length - 1);
        const beltName = `${CONFIG.belts.icons[beltIndex]} ${CONFIG.belts.labels[beltIndex]}`;

        if (isPromotion) {
            dom.toast.card.className = 'bg-amber-400 text-slate-950 px-6 py-4 border-4 border-slate-950 shadow-2xl flex items-center space-x-3 animate-bounce';
            dom.toast.title.textContent = 'Belt Promoted!';
            dom.toast.text.textContent = `🔥 Streak ${streak}! Promoted to ${beltName}!`;
            dom.toast.effect.textContent = '🎉';
        } else {
            dom.toast.card.className = 'bg-rose-400 text-rose-950 px-6 py-4 border-4 border-rose-950 shadow-2xl flex items-center space-x-3';
            dom.toast.title.textContent = 'Belt Demoted';
            dom.toast.text.textContent = `Progress dropped to ${beltName}.`;
            dom.toast.effect.textContent = '🚧';
        }

        dom.toast.root.classList.remove('hidden');
        clearTimeout(this.#timer);
        this.#timer = setTimeout(() => dom.toast.root.classList.add('hidden'), CONFIG.timing.toastMs);
    }
}