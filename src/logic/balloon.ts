// Balloon formulas + entity. Pure logic, no Phaser.
import { config } from '../config';
import { applyCurve, clamp, clamp01, lerp } from './math';

/** star / redstar carry normal bullets plus one run currency star (card prices, reference). */
export type BalloonType = 'normal' | 'fire' | 'ice' | 'bomb' | 'heal' | 'star' | 'redstar';
export const BALLOON_TYPES: readonly BalloonType[] = ['normal', 'fire', 'ice', 'bomb', 'heal', 'star', 'redstar'];

/** inflating -> flying (released) -> parked (joined the group under the chain)
 *  -> escaping (chain snapped, flies up) -> done (burst / popped / drifted away) */
export type BalloonState = 'inflating' | 'flying' | 'parked' | 'escaping' | 'done';

/** What a balloon pays out when it bursts (locked when it reaches the top). */
export interface Payout {
  total: number;
  perfect: number;
  greedy: number;
}

/** Upgrade-driven modifiers that change balloon formulas. */
export interface BalloonMods {
  inflateMult: number;
  rMaxMult: number;
  /** Balloon Power: more bullets for the same size. */
  ammoMult: number;
}

export const defaultMods = (): BalloonMods => ({ inflateMult: 1, rMaxMult: 1, ammoMult: 1 });

export function radiusFor(air: number, mods?: BalloonMods): number {
  const b = config.balloon;
  return lerp(b.rMin, b.rMax * (mods?.rMaxMult ?? 1), applyCurve(air, b.curve));
}

/** ammo = floor(1 + (ammoMax - 1) * air^ammoExp). Bigger balloons / Balloon Power raise ammoMax. */
export function ammoFor(air: number, mods?: BalloonMods): number {
  const b = config.balloon;
  const max = b.ammoMax * (mods?.rMaxMult ?? 1) * (mods?.ammoMult ?? 1);
  return Math.floor(1 + (max - 1) * Math.pow(clamp01(air), b.ammoExp));
}

export function tierFor(ammo: number): number {
  const b = config.balloon;
  if (ammo >= b.tierT4) return 4;
  if (ammo >= b.tierT3) return 3;
  if (ammo >= b.tierT2) return 2;
  return 1;
}

/** Big balloons rise slower (more exposure to spikes). */
export function riseFactor(air: number): number {
  const b = config.balloon;
  return lerp(b.riseFactorSmall, b.riseFactorBig, clamp01(air));
}

/** Percentage bonus, at least +1. */
export function bonusAmount(ammo: number, fraction: number): number {
  return fraction > 0 ? Math.max(1, Math.ceil(ammo * fraction)) : 0;
}

let nextId = 1;

export class Balloon {
  readonly id = nextId++;
  type: BalloonType;
  /** Color index for normal balloons (config.palette.balloonColors). */
  tint = 0;
  state: BalloonState = 'inflating';
  /** Where the finger is; the held balloon follows it (pushed off the walls). */
  targetX: number;
  targetY: number;
  x = 0;
  y = 0;
  r: number;
  prevX: number;
  prevY: number;
  prevR: number;
  air = 0;
  ammo = 1;
  /** Ammo gained from CLOSE! etc. while alive (lost if it pops). */
  bonus = 0;
  tier = 1;
  /** s spent at air = 1 while held. */
  strain = 0;
  spawnT = 0;
  /** Velocity while physics-driven (released). */
  vx = 0;
  vy = 0;
  releaseAir = 0;
  /** s since release while still rising (a balloon stuck under the boss claw joins anyway). */
  flyT = 0;
  /** Tutorial: spikes pass through. */
  protected = false;
  /** Thick Rubber layers left. */
  shield = 0;
  /** s of invulnerability after a shield break. */
  invuln = 0;
  /** Currently overlapping a spike without popping (protected / god). */
  ghosting = false;
  nearInZone = false;
  nearAwarded = false;
  nearX = 0;
  nearY = 0;
  /** 0..1 proximity to the nearest spike, for feedback. */
  danger = 0;
  /** Visual-edge clearance to the nearest spike (px). */
  clearance = Infinity;
  /** Set when it reaches the top and joins the gathered balloons. */
  payout: Payout | null = null;

  constructor(type: BalloonType, tapX: number, tapY: number) {
    this.type = type;
    this.targetX = this.x = tapX;
    this.targetY = this.y = tapY;
    this.r = this.prevR = config.balloon.rMin;
    this.clampToRoom();
    this.prevX = this.x;
    this.prevY = this.y;
  }

  get total(): number {
    return this.ammo + this.bonus;
  }

  /** Number shown on the balloon: its payout once parked. */
  get shown(): number {
    return this.payout ? this.payout.total : this.total;
  }

  get attached(): boolean {
    return this.state === 'inflating';
  }

  get hitR(): number {
    return this.r * config.balloon.hitboxScale;
  }

  savePrev(): void {
    this.prevX = this.x;
    this.prevY = this.y;
    this.prevR = this.r;
  }

  /** Sets air and derived radius/ammo; walls push the growing balloon inward. */
  setAir(air: number, mods: BalloonMods): void {
    this.air = clamp01(air);
    this.r = radiusFor(this.air, mods);
    this.ammo = ammoFor(this.air, mods);
    this.clampToRoom();
  }

  /** Held balloon eases toward the finger (dragging), then stays inside the walls. */
  follow(dt: number): void {
    const k = 1 - Math.exp(-config.balloon.dragFollow * dt);
    this.x += (this.targetX - this.x) * k;
    this.y += (this.targetY - this.y) * k;
    this.clampToRoom();
  }

  clampToRoom(): void {
    const L = config.layout;
    this.x = clamp(this.x, L.roomLeft + this.r, L.roomRight - this.r);
    this.y = clamp(this.y, L.roomInnerTop + this.r, L.roomBottom - this.r);
  }

  /** True once the rising balloon touches the rope under the ceiling. */
  get atCeiling(): boolean {
    return this.y - this.r <= config.layout.ropeY + 0.5;
  }

  /** Released: from here on physics moves it (straight up unless it bumps into something). */
  launch(): void {
    this.state = 'flying';
    this.releaseAir = this.air;
    this.vx = 0;
    this.vy = -config.balloon.riseSpeed * riseFactor(this.air);
  }
}
