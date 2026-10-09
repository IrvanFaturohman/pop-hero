// Digger Mole claw (chapter boss, reference: the boss reaches into the machine): every player turn
// it digs through a side wall of the balloon room at a new height. Balloons being blown pop on it,
// released balloons and bouncing spikes bump off it. Shape: a capsule (the arm) from inside the
// wall to the tip, plus a bigger circle at the tip (the claws). Pure logic.
import { config } from '../config';
import type { Balloon } from './balloon';
import { distPointSegment, type Point } from './collision';
import type { Rng } from './rng';
import type { Spike } from './spikes';

/** Closest claw point of the last `clearance` query (scratch). */
export const clawPoint: Point = { x: 0, y: 0 };
const tmp: Point = { x: 0, y: 0 };
/** px per physics iteration a balloon under the arm slides toward the tip (~16 iterations/step). */
const SLIDE = 0.25;

export class Claw {
  /** -1 = digs in from the left wall, 1 = from the right wall. */
  side: -1 | 1 = 1;
  y = 0;
  /** Full reach in px for the current dig. */
  reach = 0;
  /** 0 hidden .. 1 fully dug in. */
  grow = 0;
  prevGrow = 0;
  private growDir = 0;
  private pending: { side: -1 | 1; y: number; reach: number } | null = null;

  get active(): boolean {
    return this.grow > 0.001;
  }

  get baseX(): number {
    const L = config.layout;
    return this.side < 0 ? L.roomLeft - 30 : L.roomRight + 30;
  }

  get tipX(): number {
    return this.baseX - this.side * this.reach * this.grow;
  }

  /** Dig in at a new random spot (pulls out of the old one first). */
  dig(rng: Rng, phase2: boolean): void {
    const c = config.claw;
    const L = config.layout;
    const w = L.roomRight - L.roomLeft;
    const next = {
      side: (this.active ? -this.side : rng.next() < 0.5 ? -1 : 1) as -1 | 1,
      y: rng.range(c.yMin, c.yMax),
      reach: w * (phase2 ? c.reachPhase2 : c.reach) + 30,
    };
    if (this.active) {
      this.pending = next;
      this.growDir = -1;
    } else this.start(next);
  }

  retract(): void {
    this.pending = null;
    if (this.active) this.growDir = -1;
  }

  step(dt: number): void {
    const c = config.claw;
    this.prevGrow = this.grow;
    if (this.growDir > 0) {
      this.grow = Math.min(1, this.grow + dt / c.growTime);
      if (this.grow >= 1) this.growDir = 0;
    } else if (this.growDir < 0) {
      this.grow = Math.max(0, this.grow - dt / c.retractTime);
      if (this.grow <= 0) {
        this.growDir = 0;
        if (this.pending) this.start(this.pending);
      }
    }
  }

  /** Distance from (x, y) to the claw surface (negative = inside). Sets `clawPoint`. */
  clearance(x: number, y: number): number {
    if (!this.active) return Infinity;
    const c = config.claw;
    const arm = distPointSegment(x, y, this.baseX, this.y, this.tipX, this.y, tmp) - c.radius;
    const tip = Math.hypot(x - this.tipX, y - this.y) - c.tipRadius * this.grow;
    if (arm < tip) {
      clawPoint.x = tmp.x;
      clawPoint.y = this.y + (y < this.y ? -c.radius : c.radius);
      return arm;
    }
    clawPoint.x = this.tipX;
    clawPoint.y = this.y;
    return tip;
  }

  /** Released balloons are pushed out of the claw (it is solid, they are light). One under the
   *  arm slides toward the tip so buoyancy can carry it around instead of pinning it there. */
  pushOut(b: Balloon): void {
    if (!this.active) return;
    const r = b.r - config.balloon.squish;
    if (b.y > this.y && this.clearance(b.x, b.y) < r + 1) b.x -= this.side * SLIDE;
    this.pushCircle(b, r);
  }

  /** Bouncing spikes reflect off the claw. */
  bounce(s: Spike): void {
    if (!this.active || s.def.kind !== 'bouncer') return;
    const c = config.claw;
    distPointSegment(s.bx, s.by, this.baseX, this.y, this.tipX, this.y, tmp);
    s.pushFrom(tmp.x, tmp.y, c.radius);
    s.pushFrom(this.tipX, this.y, c.tipRadius * this.grow);
  }

  private pushCircle(b: Balloon, r: number): void {
    const c = config.claw;
    const shapes: Array<[number, number, number]> = [];
    distPointSegment(b.x, b.y, this.baseX, this.y, this.tipX, this.y, tmp);
    shapes.push([tmp.x, tmp.y, c.radius], [this.tipX, this.y, c.tipRadius * this.grow]);
    for (const [cx, cy, cr] of shapes) {
      const dx = b.x - cx;
      const dy = b.y - cy;
      const d = Math.hypot(dx, dy);
      const min = r + cr;
      if (d >= min) continue;
      // dead center: float out upward (balloons rise)
      const nx = d > 0.5 ? dx / d : 0;
      const ny = d > 0.5 ? dy / d : -1;
      b.x = cx + nx * min;
      b.y = cy + ny * min;
    }
  }

  private start(p: { side: -1 | 1; y: number; reach: number }): void {
    this.side = p.side;
    this.y = p.y;
    this.reach = p.reach;
    this.pending = null;
    this.growDir = 1;
  }
}
