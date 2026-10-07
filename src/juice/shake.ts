// Trauma-based screen shake: offset = maxOffset * trauma^2 * smoothNoise(t).
import { config } from '../config';

function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

/** Smooth 1D value noise in [-1, 1]. */
function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return (hash(i) * (1 - u) + hash(i + 1) * u) * 2 - 1;
}

export class Shake {
  trauma = 0;
  offsetX = 0;
  offsetY = 0;
  rotation = 0; // radians
  private t = 0;

  add(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt: number): void {
    const s = config.juice.shake;
    this.trauma = Math.max(0, this.trauma - s.traumaDecay * dt);
    this.t += dt * s.noiseFreq;
    const mult = config.juice.shakeMult * (config.juice.reducedMotion ? config.juice.reducedMotionShake : 1);
    const k = this.trauma * this.trauma * mult;
    this.offsetX = s.maxOffset * k * noise1(this.t);
    this.offsetY = s.maxOffset * k * noise1(this.t + 100);
    this.rotation = ((s.maxRotationDeg * Math.PI) / 180) * k * noise1(this.t + 200);
  }
}
