// ui/reward-presenter.js

/** Sound, fireworks and toast for a graded answer, so no caller repeats the pairing. */
export class RewardPresenter {
    #audio;
    #fx;
    #toast;
    #isConfettiEnabled;

    constructor({ audio, fx, toast, isConfettiEnabled }) {
        this.#audio = audio;
        this.#fx = fx;
        this.#toast = toast;
        this.#isConfettiEnabled = isConfettiEnabled;
    }

    correct() {
        this.#audio.playCorrect();
    }

    wrong() {
        this.#audio.playWrong();
    }

    promoted(belt, streak) {
        this.#audio.playMilestone();
        if (this.#isConfettiEnabled()) this.#fx.triggerShow();
        this.#toast.show(true, belt, streak);
    }

    demoted(belt) {
        this.#audio.playDemotion();
        this.#toast.show(false, belt);
    }
}
