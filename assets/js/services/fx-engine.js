// services/fx-engine.js
// Canvas confetti burst used to celebrate belt promotions

const COLORS = ['#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#ffffff'];
const PARTICLES_PER_BURST = 60;
const BURSTS_PER_SHOW = 6;
const BURST_DELAY_MS = 220;

export class FxEngine {
  #canvas;
  #ctx;
  #particles = [];
  #frameId = null;
  #resizeHandler;

  constructor(canvasId) {
    this.#canvas = document.getElementById(canvasId);
    this.#ctx = this.#canvas.getContext('2d');
    this.#resizeHandler = () => this.#resize();
    this.#resize();
    window.addEventListener('resize', this.#resizeHandler);
  }

  #resize() {
    this.#canvas.width = window.innerWidth;
    this.#canvas.height = window.innerHeight;
  }

  triggerShow() {
    for (let i = 0; i < BURSTS_PER_SHOW; i++) {
      setTimeout(() => {
        const x = Math.random() * (this.#canvas.width * 0.7) + this.#canvas.width * 0.15;
        const y = Math.random() * (this.#canvas.height * 0.4) + this.#canvas.height * 0.1;
        this.#createBurst(x, y);
      }, i * BURST_DELAY_MS);
    }
  }

  #createBurst(x, y) {
    for (let i = 0; i < PARTICLES_PER_BURST; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLES_PER_BURST + Math.random() * 0.2;
      const speed = Math.random() * 7 + 2;
      this.#particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() > 0.5 ? 4 : 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015,
        gravity: 0.12,
      });
    }
    if (!this.#frameId) this.#animate();
  }

  #animate() {
    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    for (let i = this.#particles.length - 1; i >= 0; i--) {
      const p = this.#particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.#particles.splice(i, 1);
        continue;
      }
      this.#ctx.fillStyle = p.color;
      this.#ctx.globalAlpha = Math.max(0, p.alpha);
      this.#ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
    }
    this.#frameId = this.#particles.length > 0 ? requestAnimationFrame(() => this.#animate()) : null;
  }
}
