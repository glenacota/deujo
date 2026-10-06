// ui/theme-controller.js

import { get } from '../platform/preferences.js';

export class ThemeController {
    #media = null;

    initTheme() {
        this.#media = window.matchMedia('(prefers-color-scheme: dark)');
        this.applyTheme(get('theme'));

        // "System" must follow the OS while the app is open, not just at boot.
        this.#media.addEventListener?.('change', () => {
            if (get('theme') === 'system') this.applyTheme('system');
        });
    }

    /** Resolves a mode ('system' | 'light' | 'dark') and paints the document. */
    applyTheme(mode) {
        const isDark = mode === 'dark' || (mode === 'system' && this.#prefersDark());
        document.documentElement.classList.toggle('dark', isDark);
    }

    #prefersDark() {
        return this.#media?.matches ?? window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
}