// session.js
// Pure (no DOM, storage or clock), so a test imports it statically without the browser stub.

export const Phase = Object.freeze({
  ANSWERING: 'answering',
  REVIEWING: 'reviewing',
});

const KNOWN_PHASES = Object.values(Phase);

export class Session {
  #phases = new Map();

  #phaseOf(kataId) {
    return this.#phases.get(kataId) ?? Phase.ANSWERING;
  }

  isAnswering(kataId) {
    return this.#phaseOf(kataId) === Phase.ANSWERING;
  }

  isReviewing(kataId) {
    return this.#phaseOf(kataId) === Phase.REVIEWING;
  }

  /** Throws on an unknown phase, which would strand the kata where neither `isAnswering` nor `isReviewing` holds. */
  setPhase(kataId, phase) {
    if (!KNOWN_PHASES.includes(phase)) {
      throw new Error(`Unknown phase "${phase}": expected one of ${KNOWN_PHASES.join(', ')}.`);
    }
    this.#phases.set(kataId, phase);
  }

  /** Call wherever a kata stops sitting on a graded item, so a phase never outlives its item. */
  reset(kataId) {
    this.#phases.delete(kataId);
  }
}
