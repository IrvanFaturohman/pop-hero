// Spike obstacles: bouncers (spiky balls bouncing off the room walls), plus spinners (arms around
// a pivot) and orbiters (ball on an ellipse) kept as optional pattern kinds.
import { config } from '../config';
import { distPointSegment, type Point } from './collision';
import { DEG, TAU, clamp01, smoothstep } from './math';

export interface SpeedWave {
  /** deg/s magnitude range; direction comes from the sign of `omega`. */
  min: number;
  max: number;
  /** s */
  period: number;
}

export interface SpinnerDef {
  kind: 'spinner';
  px: number;
  py: number;
  arms: number; // 1..4
  length: number; // px, pivot to ball center
  omega: number; // deg/s, negative = counter-clockwise
  phase?: number; // deg, starting angle of arm 0
  speedWave?: SpeedWave;
}

export interface OrbiterDef {
  kind: 'orbiter';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  omega: number; // deg/s
  phase?: number; // deg
  speedWave?: SpeedWave;
}

export interface BouncerDef {
  kind: 'bouncer';
  /** Start position (px). */
  x: number;
  y: number;
  /** Start direction in degrees (0 = right, 90 = down). */
  angle: number;
  /** px/s */
  speed: number;
}

export type SpikeDef = SpinnerDef | OrbiterDef | BouncerDef;

export interface SpikePattern {
  id: string;
  name: string;
  /** Multiplies every spike's angular speed in this pattern (e.g. boss phase 2 = 1.25). */
  speedMult: number;
  spikes: SpikeDef[];
}

const MAX_ARMS = 4;

/** Closest point on the last spike queried (scratch, avoids allocation). */
export const closest: Point = { x: 0, y: 0 };
const tmp: Point = { x: 0, y: 0 };

export class Spike {
  readonly def: SpikeDef;
  /** deg */
  angle = 0;
  prevAngle = 0;
  time = 0;
  /** Transition progress 0..1 (grow in / shrink out). */
  grow = 1;
  growDir = 0;
  /** Arm tip positions (spinner) or ball position (orbiter, index 0). */
  readonly tips = new Float64Array(MAX_ARMS * 2);
  /** Collision scale derived from `grow`. */
  scale = 1;
  /** Bouncer state: position, previous position (interpolation), unit direction, wall hits. */
  bx = 0;
  by = 0;
  prevX = 0;
  prevY = 0;
  dirX = 1;
  dirY = 0;
  bounces = 0;

  constructor(def: SpikeDef) {
    this.def = def;
    if (def.kind === 'bouncer') {
      this.bx = this.prevX = def.x;
      this.by = this.prevY = def.y;
      this.dirX = Math.cos(def.angle * DEG);
      this.dirY = Math.sin(def.angle * DEG);
    } else {
      this.angle = this.prevAngle = def.phase ?? 0;
    }
    this.updateGeometry();
  }

  get dead(): boolean {
    return this.growDir < 0 && this.grow <= 0;
  }

  /** Current angular speed in deg/s (before multipliers). */
  omegaNow(): number {
    const d = this.def;
    if (d.kind === 'bouncer') return d.speed * 1.4; // visual spin only
    if (!d.speedWave) return d.omega;
    const w = d.speedWave;
    const mid = (w.min + w.max) / 2;
    const amp = (w.max - w.min) / 2;
    const sign = d.omega < 0 ? -1 : 1;
    return sign * (mid + amp * Math.sin((TAU * this.time) / Math.max(0.01, w.period)));
  }

  step(dt: number, speedMult: number): void {
    this.prevAngle = this.angle;
    this.angle += this.omegaNow() * speedMult * dt;
    this.time += dt;
    if (this.def.kind === 'bouncer') this.moveBouncer(this.def.speed * speedMult * dt);
    if (this.growDir !== 0) {
      const dur = this.growDir > 0 ? config.spikes.transitionIn : config.spikes.transitionOut;
      this.grow = clamp01(this.grow + (this.growDir * dt) / Math.max(0.01, dur));
      if (this.growDir > 0 && this.grow >= 1) this.growDir = 0;
    }
    this.updateGeometry();
  }

  /** Straight-line motion with perfect reflection off the room walls. */
  private moveBouncer(dist: number): void {
    const L = config.layout;
    const R = config.spikes.ballRadius;
    this.prevX = this.bx;
    this.prevY = this.by;
    this.bx += this.dirX * dist;
    this.by += this.dirY * dist;
    const minX = L.roomLeft + R;
    const maxX = L.roomRight - R;
    const minY = L.ropeY + R; // spikes stay below the rope
    const maxY = L.roomBottom - R;
    if (this.bx < minX) {
      this.bx = 2 * minX - this.bx;
      this.dirX = Math.abs(this.dirX);
      this.bounces++;
    } else if (this.bx > maxX) {
      this.bx = 2 * maxX - this.bx;
      this.dirX = -Math.abs(this.dirX);
      this.bounces++;
    }
    if (this.by < minY) {
      this.by = 2 * minY - this.by;
      this.dirY = Math.abs(this.dirY);
      this.bounces++;
    } else if (this.by > maxY) {
      this.by = 2 * maxY - this.by;
      this.dirY = -Math.abs(this.dirY);
      this.bounces++;
    }
  }

  /**
   * Released balloons push bouncing spikes: if the ball overlaps the circle (cx, cy, radius), move it
   * out along the normal and reflect its direction. Returns true if it was pushed.
   */
  pushFrom(cx: number, cy: number, radius: number): boolean {
    if (this.def.kind !== 'bouncer' || this.scale <= 0.001) return false;
    const minD = radius + config.spikes.ballRadius * this.scale;
    const dx = this.bx - cx;
    const dy = this.by - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= minD * minD) return false;
    const d = Math.sqrt(d2) || 0.001;
    const nx = dx / d;
    const ny = dy / d;
    this.bx = cx + nx * minD;
    this.by = cy + ny * minD;
    const dot = this.dirX * nx + this.dirY * ny;
    if (dot < 0) {
      this.dirX -= 2 * dot * nx;
      this.dirY -= 2 * dot * ny;
    }
    this.updateGeometry();
    return true;
  }

  updateGeometry(): void {
    this.scale = smoothstep(this.grow);
    const d = this.def;
    if (d.kind === 'bouncer') {
      this.tips[0] = this.bx;
      this.tips[1] = this.by;
    } else if (d.kind === 'spinner') {
      const n = Math.min(MAX_ARMS, Math.max(1, Math.round(d.arms)));
      const len = d.length * this.scale;
      for (let i = 0; i < n; i++) {
        const a = (this.angle + (360 * i) / n) * DEG;
        this.tips[i * 2] = d.px + Math.cos(a) * len;
        this.tips[i * 2 + 1] = d.py + Math.sin(a) * len;
      }
    } else {
      const a = this.angle * DEG;
      this.tips[0] = d.cx + Math.cos(a) * d.rx;
      this.tips[1] = d.cy + Math.sin(a) * d.ry;
    }
  }

  armCount(): number {
    return this.def.kind === 'spinner' ? Math.min(MAX_ARMS, Math.max(1, Math.round(this.def.arms))) : 0;
  }

  /**
   * Distance from (x, y) to the spike's deadly surface (negative = inside).
   * Writes the closest spike point into the exported `closest` scratch.
   */
  clearance(x: number, y: number): number {
    const s = this.scale;
    if (s <= 0.001) return Infinity;
    const cs = config.spikes;
    const d = this.def;
    let best = Infinity;
    if (d.kind === 'spinner') {
      best = Math.hypot(x - d.px, y - d.py) - cs.hubRadius * s;
      closest.x = d.px;
      closest.y = d.py;
      const n = this.armCount();
      for (let i = 0; i < n; i++) {
        const tx = this.tips[i * 2];
        const ty = this.tips[i * 2 + 1];
        const ball = Math.hypot(x - tx, y - ty) - cs.ballRadius * s;
        if (ball < best) {
          best = ball;
          closest.x = tx;
          closest.y = ty;
        }
        const arm = distPointSegment(x, y, d.px, d.py, tx, ty, tmp) - cs.armHalfThickness * s;
        if (arm < best) {
          best = arm;
          closest.x = tmp.x;
          closest.y = tmp.y;
        }
      }
    } else {
      best = Math.hypot(x - this.tips[0], y - this.tips[1]) - cs.ballRadius * s;
      closest.x = this.tips[0];
      closest.y = this.tips[1];
    }
    return best;
  }
}

/** Time after which a spike's motion repeats (approx. for speed waves). */
export function spikePeriod(def: SpikeDef, speedMult: number): number {
  if (def.kind === 'bouncer') return config.spikes.validatorWindow;
  if (def.speedWave) return def.speedWave.period;
  const sym = def.kind === 'spinner' ? 360 / Math.max(1, Math.round(def.arms)) : 360;
  const w = Math.abs(def.omega * speedMult);
  return w > 0 ? sym / w : 1;
}

/**
 * Joint period of all spikes in a pattern: the smallest multiple (up to 12x) of the longest
 * single period that every other period divides evenly. Falls back to the longest period.
 */
export function patternPeriod(p: SpikePattern, globalMult = 1): number {
  // Bouncers never repeat exactly: sample a fixed window instead.
  if (p.spikes.some((s) => s.kind === 'bouncer')) return config.spikes.validatorWindow;
  const periods = p.spikes.map((s) => spikePeriod(s, p.speedMult * globalMult));
  const longest = Math.max(0.01, ...periods);
  for (let k = 1; k <= 12; k++) {
    const t = longest * k;
    const fits = periods.every((pi) => {
      const ratio = t / pi;
      return Math.abs(ratio - Math.round(ratio)) < 1e-3 * ratio;
    });
    if (fits) return t;
  }
  return longest;
}

/** Active spikes + pattern transitions. */
export class SpikeField {
  spikes: Spike[] = [];
  outgoing: Spike[] = [];
  pattern: SpikePattern | null = null;
  pending: SpikePattern | null = null;
  enabled = true;
  /** Multiplier from upgrades (Slow Gears); config.spikes.speedMult is applied on top. */
  modMult = 1;
  /** Index of the spike (in `spikes`) that produced the last `clearance` minimum. */
  lastIndex = -1;

  setPattern(p: SpikePattern, animate: boolean): void {
    for (const s of this.spikes) {
      s.growDir = -1;
      if (!animate) s.grow = 0;
      this.outgoing.push(s);
    }
    this.spikes = p.spikes.map((d) => {
      const sp = new Spike(d);
      if (animate) {
        sp.grow = 0;
        sp.growDir = 1;
        sp.updateGeometry();
      }
      return sp;
    });
    this.pattern = p;
    this.pending = null;
  }

  speedMult(): number {
    return (this.pattern?.speedMult ?? 1) * this.modMult * config.spikes.speedMult;
  }

  step(dt: number): void {
    const mult = this.speedMult();
    for (const s of this.spikes) s.step(dt, mult);
    for (const s of this.outgoing) s.step(dt, mult);
    if (this.outgoing.length > 0 && this.outgoing.every((s) => s.dead)) this.outgoing.length = 0;
  }

  /** Minimum clearance to any live spike; sets `lastIndex` and the `closest` scratch point. */
  clearance(x: number, y: number): number {
    this.lastIndex = -1;
    if (!this.enabled) return Infinity;
    let best = Infinity;
    let bx = 0;
    let by = 0;
    for (let i = 0; i < this.spikes.length; i++) {
      const c = this.spikes[i].clearance(x, y);
      if (c < best) {
        best = c;
        bx = closest.x;
        by = closest.y;
        this.lastIndex = i;
      }
    }
    for (const s of this.outgoing) {
      const c = s.clearance(x, y);
      if (c < best) {
        best = c;
        bx = closest.x;
        by = closest.y;
      }
    }
    closest.x = bx;
    closest.y = by;
    return best;
  }
}
