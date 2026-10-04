// session.js
// Which phase each kata is in: waiting for an answer, or waiting for the
// learner to acknowledge a verdict.
//
// This was one `#phase` field on the App, shared by all six katas. A single
// field cannot describe six at once, so it was only ever correct by accident:
// entering a kata happened to reset it, which meant the guard that stops a
// graded item from being served again had to read a global that merely agreed
// with the active kata by luck. Per kata, that guard reads the phase of the
// kata it is actually about.
//
// Deliberately pure — no DOM, no storage, no clock — so a test imports it
// statically instead of reaching for the browser stub.

export const Phase = Object.freeze({
  ANSWERING: 'answering',
  REVIEWING: 'reviewing',
});

const KNOWN_PHASES = Object.values(Phase);

export class Session {
  #phases = new Map();

  /** A kata nobody has graded yet is answering: it has an item open. */
  #phaseOf(kataId) {
    return this.#phases.get(kataId) ?? Phase.ANSWERING;
  }

  isAnswering(kataId) {
    return this.#phaseOf(kataId) === Phase.ANSWERING;
  }

  isReviewing(kataId) {
    return this.#phaseOf(kataId) === Phase.REVIEWING;
  }

  /**
   * @param {string} kataId
   * @param {string} phase one of `Phase`
   * @throws {Error} on an unknown phase, so a typo fails here rather than
   *   stranding a kata in a phase no gate recognises: `isAnswering` and
   *   `isReviewing` would both answer false and the section would stay locked.
   */
  setPhase(kataId, phase) {
    if (!KNOWN_PHASES.includes(phase)) {
      throw new Error(`Unknown phase "${phase}": expected one of ${KNOWN_PHASES.join(', ')}.`);
    }
    this.#phases.set(kataId, phase);
  }

  /**
   * Forgets a kata's phase, putting it back to answering. Called wherever a
   * kata stops sitting on a graded item, so a phase can never outlive the item
   * it described and read as "reviewing" over a fresh one.
   */
  reset(kataId) {
    this.#phases.delete(kataId);
  }
}
