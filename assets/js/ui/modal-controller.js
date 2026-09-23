// ui/modal-controller.js
const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

export class ModalController {
    #activeModal = null;
    #trigger = null;

    bind() {
        document.querySelectorAll('[data-modal-open]').forEach((trigger) => {
            trigger.addEventListener('click', () => this.open(trigger.dataset.modalOpen, trigger));
        });

        document.querySelectorAll('.modal-backdrop').forEach((modal) => {
            modal.addEventListener('click', (event) => {
                if (event.target === modal || event.target.closest('[data-modal-close]')) {
                    this.close(modal);
                }
            });
        });
    }

    open(modal, trigger = document.activeElement) {
        const modalElement = this.#resolveModal(modal);
        if (!modalElement) return;

        if (this.#activeModal && this.#activeModal !== modalElement) {
            this.#hide(this.#activeModal);
        }

        this.#activeModal = modalElement;
        this.#trigger = trigger instanceof HTMLElement ? trigger : null;
        modalElement.classList.remove('hidden');
        this.#focusInitialElement(modalElement);
    }

    close(modal = this.#activeModal) {
        const modalElement = this.#resolveModal(modal);
        if (!modalElement || modalElement !== this.#activeModal) return;

        this.#hide(modalElement);
        this.#activeModal = null;

        const trigger = this.#trigger;
        this.#trigger = null;
        trigger?.focus();
    }

    isOpen() {
        return Boolean(this.#activeModal);
    }

    handleKeydown(event) {
        if (!this.#activeModal) return false;

        if (event.key === 'Escape') {
            event.preventDefault();
            this.close();
            return true;
        }

        if (event.key === 'Tab') {
            this.#trapFocus(event);
            return true;
        }

        return false;
    }

    #resolveModal(modal) {
        if (modal instanceof HTMLElement) return modal;
        return typeof modal === 'string' ? document.getElementById(modal) : null;
    }

    #hide(modal) {
        modal.classList.add('hidden');
    }

    #focusInitialElement(modal) {
        const initialFocus = modal.querySelector('[data-modal-initial-focus]')
            ?? modal.querySelector(FOCUSABLE_SELECTOR);
        initialFocus?.focus();
    }

    #trapFocus(event) {
        const focusable = Array.from(this.#activeModal.querySelectorAll(FOCUSABLE_SELECTOR));
        if (!focusable.length) {
            event.preventDefault();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
}