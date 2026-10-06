// ui/toast-controller.js

import { CONFIG } from '../config.js';
import { dom } from './dom.js';

export class ToastController {
    #timer = null;

    show(isPromotion, belt, streak) {
        const beltIndex = Math.min(belt, CONFIG.belts.labels.length - 1);
        const beltName = `${CONFIG.belts.icons[beltIndex]} ${CONFIG.belts.labels[beltIndex]}`;

        // Only the palette is swapped; the card's geometry lives on `.toast-card` in
        // app.css, and `.animate-bounce` rides on the promotion only.
        dom.toast.card.className = isPromotion
            ? 'toast-card toast-card--promoted animate-bounce'
            : 'toast-card toast-card--demoted';

        if (isPromotion) {
            dom.toast.title.textContent = 'Belt Promoted!';
            dom.toast.text.textContent = `🔥 Streak ${streak}! Promoted to ${beltName}!`;
            dom.toast.effect.textContent = '🎉';
        } else {
            dom.toast.title.textContent = 'Belt Demoted';
            dom.toast.text.textContent = `Progress dropped to ${beltName}.`;
            dom.toast.effect.textContent = '🚧';
        }

        dom.toast.root.classList.remove('hidden');
        clearTimeout(this.#timer);
        this.#timer = setTimeout(() => dom.toast.root.classList.add('hidden'), CONFIG.timing.toastMs);
    }
}
