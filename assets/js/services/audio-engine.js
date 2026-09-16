// services/audio-engine.js

// Wraps the WebAudio API for the app's short sound effects. Lazily creates
// the AudioContext on first use, since browsers refuse to start one before
// a user gesture - and resumes it if the tab suspended it in the background

export class AudioEngine {
  #ctx = null;

  #ensureContext() {
    if (!this.#ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.#ctx = AudioCtx ? new AudioCtx() : null;
    }
    if (this.#ctx?.state === 'suspended') {
      this.#ctx.resume().catch(() => {});
    }
    return this.#ctx;
  }

  #playTone(type, freq, rampTo, duration, gainStart) {
    const ctx = this.#ensureContext();
    if (!ctx) return; // WebAudio unsupported - sound is decoration, fail silently

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    if (Array.isArray(freq)) {
      freq.forEach((f, i) => osc.frequency.setValueAtTime(f, now + i * 0.1));
    } else {
      osc.frequency.setValueAtTime(freq, now);
      if (rampTo) osc.frequency.exponentialRampToValueAtTime(rampTo, now + duration);
    }

    gain.gain.setValueAtTime(gainStart, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playCorrect() { this.#playTone('sine', [523.25, 659.25], null, 0.35, 0.15); }
  playWrong() { this.#playTone('sawtooth', 180, 110, 0.25, 0.15); }
  playDemotion() { this.#playTone('sine', 330, 165, 0.45, 0.15); }

  playMilestone() {
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      setTimeout(() => this.#playTone('square', freq, null, 0.3, 0.12), i * 80);
    });
  }
}
