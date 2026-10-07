// Pure math helpers shared by logic and view.
import type { InflateCurve } from '../config';

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function invLerp(a: number, b: number, v: number): number {
  return a === b ? 0 : (v - a) / (b - a);
}

export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** Maps inflation progress (air 0..1) to radius progress 0..1. */
export function applyCurve(air: number, curve: InflateCurve): number {
  const a = clamp01(air);
  switch (curve) {
    case 'easeIn':
      return a * a;
    case 'easeOut':
      return 1 - (1 - a) * (1 - a);
    case 'smooth':
      return a * a * (3 - 2 * a);
    default:
      return a;
  }
}

/** Exponential approach factor, frame-rate independent. */
export function damp(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}

/** Smooth start and stop (sine), t in 0..1. */
export function easeInOut(t: number): number {
  return -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;
}
