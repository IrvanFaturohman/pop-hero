// The gold chain across the balloon room: a verlet rope pinned to both walls. Released balloons
// push it up (it bulges, limited by its slack); when the lock opens it snaps in the middle and the
// halves swing down. Pure logic.
import { config } from '../config';
import type { Balloon } from './balloon';

export class Rope {
  readonly n: number;
  readonly x: Float64Array;
  readonly y: Float64Array;
  private px: Float64Array;
  private py: Float64Array;
  private rest = 0;
  /** Index of the broken link (between i-1 and i); -1 while intact. */
  breakAt = -1;

  constructor() {
    this.n = config.rope.points;
    this.x = new Float64Array(this.n);
    this.y = new Float64Array(this.n);
    this.px = new Float64Array(this.n);
    this.py = new Float64Array(this.n);
    this.reset();
  }

  get snapped(): boolean {
    return this.breakAt >= 0;
  }

  get mid(): number {
    return Math.floor(this.n / 2);
  }

  /** Lay a fresh, straight chain across the room (its slack lets it sag a little). */
  reset(): void {
    const L = config.layout;
    const span = L.roomRight - L.roomLeft;
    this.rest = (span / (this.n - 1)) * config.rope.slack;
    for (let i = 0; i < this.n; i++) {
      this.x[i] = this.px[i] = L.roomLeft + (span * i) / (this.n - 1);
      this.y[i] = this.py[i] = L.ropeY;
    }
    this.breakAt = -1;
  }

  /** Break the middle link; the halves get a little kick so they visibly whip apart. */
  snap(): void {
    if (this.snapped) return;
    const m = this.mid;
    this.breakAt = m;
    for (let k = 1; k <= 3; k++) {
      if (m - k >= 0) this.px[m - k] = this.x[m - k] + 6 * (4 - k);
      if (m - 1 + k < this.n) this.px[m - 1 + k] = this.x[m - 1 + k] - 6 * (4 - k);
    }
  }

  /** Verlet integrate (gravity + damping). Constraints are solved by `solve`. */
  integrate(dt: number): void {
    const rc = config.rope;
    const g = rc.gravity * dt * dt;
    for (let i = 0; i < this.n; i++) {
      const vx = (this.x[i] - this.px[i]) * rc.damping;
      const vy = (this.y[i] - this.py[i]) * rc.damping;
      this.px[i] = this.x[i];
      this.py[i] = this.y[i];
      this.x[i] += vx;
      this.y[i] += vy + g;
    }
  }

  /** One relaxation pass: keep link lengths, pin the ends to the walls. */
  solve(): void {
    const L = config.layout;
    for (let i = 1; i < this.n; i++) {
      if (i === this.breakAt) continue;
      const dx = this.x[i] - this.x[i - 1];
      const dy = this.y[i] - this.y[i - 1];
      const d = Math.hypot(dx, dy) || 0.0001;
      // links only resist stretching (a chain can go slack)
      if (d <= this.rest) continue;
      const k = ((d - this.rest) / d) * 0.5;
      this.x[i - 1] += dx * k;
      this.y[i - 1] += dy * k;
      this.x[i] -= dx * k;
      this.y[i] -= dy * k;
    }
    if (!this.snapped) {
      const top = L.roomInnerTop + 6;
      for (let i = 1; i < this.n - 1; i++) if (this.y[i] < top) this.y[i] = top;
    }
    this.x[0] = L.roomLeft;
    this.y[0] = L.ropeY;
    this.x[this.n - 1] = L.roomRight;
    this.y[this.n - 1] = L.ropeY;
  }

  /** Closest point on link (i-1, i) to (cx, cy): writes t (0..1) and the distance. */
  private nearest(i: number, cx: number, cy: number): { t: number; d: number; qx: number; qy: number } {
    const ax = this.x[i - 1];
    const ay = this.y[i - 1];
    const ex = this.x[i] - ax;
    const ey = this.y[i] - ay;
    const len2 = ex * ex + ey * ey || 0.0001;
    let t = ((cx - ax) * ex + (cy - ay) * ey) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = ax + ex * t;
    const qy = ay + ey * t;
    const h = this.hit;
    h.t = t;
    h.qx = qx;
    h.qy = qy;
    h.d = Math.hypot(cx - qx, cy - qy);
    return h;
  }

  private hit = { t: 0, d: 0, qx: 0, qy: 0 };

  /**
   * Links and balloons push each other out: the chain gives way most (it bulges up), the balloon
   * is pushed back a little. Link-based so even small balloons can't slip between links.
   */
  collide(b: Balloon, kinematic: boolean): void {
    const share = kinematic ? 1 : config.rope.pointShare;
    const r = b.r - 2;
    for (let i = 1; i < this.n; i++) {
      if (i === this.breakAt) continue;
      const h = this.nearest(i, b.x, b.y);
      if (h.d >= r) continue;
      const d = h.d || 0.0001;
      // normal from the balloon center to the chain
      const nx = (h.qx - b.x) / d;
      const ny = (h.qy - b.y) / d;
      const push = r - d;
      const wa = 1 - h.t;
      const wb = h.t;
      if (i - 1 > 0) {
        this.x[i - 1] += nx * push * share * wa;
        this.y[i - 1] += ny * push * share * wa;
      }
      if (i < this.n - 1) {
        this.x[i] += nx * push * share * wb;
        this.y[i] += ny * push * share * wb;
      }
      b.x -= nx * push * (1 - share);
      b.y -= ny * push * (1 - share);
    }
  }

  /** True if the balloon is touching the chain. */
  touches(b: Balloon): boolean {
    for (let i = 1; i < this.n; i++) {
      if (i === this.breakAt) continue;
      if (this.nearest(i, b.x, b.y).d < b.r + 3) return true;
    }
    return false;
  }
}
