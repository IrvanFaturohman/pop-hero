// Circle vs circle / circle vs capsule. Pure functions, no allocation.

export interface Point {
  x: number;
  y: number;
}

/** Distance from point P to segment AB. Writes the closest point into `out` if given. */
export function distPointSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  out?: Point,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 > 0 ? ((px - ax) * abx + (py - ay) * aby) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  if (out) {
    out.x = cx;
    out.y = cy;
  }
  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy);
}

export function circleCircle(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy < r * r;
}

/** Circle (c, cr) vs capsule (segment AB with radius capR). */
export function circleCapsule(
  cx: number,
  cy: number,
  cr: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  capR: number,
): boolean {
  return distPointSegment(cx, cy, ax, ay, bx, by) < cr + capR;
}
