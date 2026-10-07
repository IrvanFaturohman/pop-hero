// Easing helpers (t in 0..1).

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeInQuad(t: number): number {
  return t * t;
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function easeOutBack(t: number, s = 1.70158): number {
  const c3 = s + 1;
  const x = t - 1;
  return 1 + c3 * x * x * x + s * x * x;
}

export function easeInBack(t: number, s = 1.70158): number {
  return (s + 1) * t * t * t - s * t * t;
}

export function easeOutElastic(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeOutCubic(t: number): number {
  const x = 1 - t;
  return 1 - x * x * x;
}
