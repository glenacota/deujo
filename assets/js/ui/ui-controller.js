// ui/ui-controller.js
// Rendering layer: takes state/data in, updates the DOM

import { Storage } from '../services/storage.js';
import { dom } from './dom.js';

export class UiController {

    initTheme() {
        const stored = Storage.getTheme();
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = stored ? stored === 'dark' : prefersDark;
        document.documentElement.classList.toggle('dark', isDark);
        this.#applyTheme(isDark);
    }

    toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        Storage.setTheme(isDark ? 'dark' : 'light');
        this.#applyTheme(isDark);
    }

    #applyTheme(isDark) {
        dom.theme.icon.textContent = isDark ? '🌙' : '☀️';
        if (dom.theme.label) dom.theme.label.textContent = isDark ? 'Dark Mode' : 'Light Mode';
    }
  
}
