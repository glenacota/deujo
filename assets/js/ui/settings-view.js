// ui/settings-view.js
// Renders the settings modal and owns every listener inside it: one delegated
// `change` listener for the inputs, plus the panel's button clicks.

import { CONFIG } from '../config.js';
import { SrsStore } from '../platform/srs-store.js';
import { Storage } from '../platform/storage.js';
import { defaults, get, resetAll, set } from '../platform/preferences.js';
import { dom } from './dom.js';

export class SettingsView {
    #audio;
    #theme;
    #onClearData;

    constructor({ audio, theme, onClearData = () => {} }) {
        this.#audio = audio;
        this.#theme = theme;
        this.#onClearData = onClearData;

        this.#bind();
        this.#bindConfirm();
    }

    render() {
        const themeMode = get('theme');
        dom.modals.settings.themeInputs.forEach((input) => {
            input.checked = input.value === themeMode;
        });

        // Every switch reads "on means the feature is on".
        const { switches } = dom.modals.settings;
        switches.sound.checked = this.#audio.isSoundOn();
        switches.confetti.checked = get('confetti');
        switches.animations.checked = get('animations');
        switches.hotkeys.checked = get('hotkeys');

        // Sound off means there is nothing to preview, so the button says so.
        const { testSoundBtn } = dom.modals.settings;
        testSoundBtn.disabled = !this.#audio.isSoundOn();
        testSoundBtn.textContent = this.#audio.isSoundOn() ? 'Test sound' : 'Sound is off';
    }

    #bind() {
        const { root } = dom.modals.settings;

        // One listener for all inputs: the markup says which setting changed.
        root.addEventListener('change', (event) => this.#onChange(event));

        root.addEventListener('click', (event) => {
            const action = event.target.closest('[data-action]')?.dataset.action;
            if (action === 'test-sound') this.#testSound();
            if (action === 'reset') this.#reset();
            if (action === 'clear-data') this.#askClearData();
            if (action === 'clear-cancel') this.#hideConfirm();
            if (action === 'clear-data-confirm') this.#clearData();
        });
    }

    /**
     * The confirmation is a nested dialog, not a ModalController modal, so it
     * has to dismiss itself. Esc and a backdrop click both cancel; the modal
     * controller would otherwise close the whole settings panel instead.
     */
    #bindConfirm() {
        const { confirmBox } = dom.modals.settings;

        confirmBox.addEventListener('click', (event) => {
            if (event.target === confirmBox) this.#hideConfirm();
        });

        confirmBox.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                // Swallow it, or the settings panel behind also closes.
                event.preventDefault();
                event.stopPropagation();
                this.#hideConfirm();
                return;
            }
            if (event.key === 'Tab') this.#trapConfirmFocus(event);
        });
    }

    /** Keeps Tab inside the confirmation, so it cannot reach the panel behind. */
    #trapConfirmFocus(event) {
        const { confirmBox, confirmCancelBtn, confirmOkBtn } = dom.modals.settings;
        const first = confirmCancelBtn;
        const last = confirmOkBtn;
        // Focus starts on the dialog itself, so the first Tab must land on Cancel.
        const atDialog = document.activeElement === confirmBox;

        if (event.shiftKey && (document.activeElement === first || atDialog)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    #onChange(event) {
        const input = event.target;

        if (input.name === 'theme' && input.value) {
            set('theme', input.value);
            this.#theme.applyTheme(input.value);
            return;
        }

        const setting = input.dataset.setting;
        if (!setting) return;

        set(setting, input.checked);
        if (setting === 'sound') this.#audio.setSoundOn(input.checked);
        this.render();
    }

    #testSound() {
        if (!this.#audio.isSoundOn()) return;
        this.#audio.playCorrect();
    }

    #reset() {
        resetAll();
        this.#audio.setSoundOn(defaults().sound);
        this.#theme.applyTheme(get('theme'));
        this.#hideConfirm();
        this.render();
    }

    /** Deleting is destructive, so it takes an explicit second confirmation. */
    #askClearData() {
        const { confirmBox, clearDataBtn } = dom.modals.settings;
        confirmBox.classList.remove('hidden');
        clearDataBtn.setAttribute('aria-expanded', 'true');
        // Focus the dialog itself, not the destructive button, so Enter or
        // Space cannot delete by reflex.
        confirmBox.focus();
    }

    #hideConfirm() {
        const { confirmBox, clearDataBtn } = dom.modals.settings;
        confirmBox.classList.add('hidden');
        clearDataBtn.setAttribute('aria-expanded', 'false');
        clearDataBtn.focus();
    }

    #clearData() {
        this.#hideConfirm();
        // Belt progress, streak and SRS records all live under the dm_ prefix;
        // removing the prefix key alone would leave the per-kata ones behind.
        Storage.removeByPrefix(CONFIG.storage.prefix);
        SrsStore.reset();
        this.#onClearData();
    }
}