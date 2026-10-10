// Power-ups floating in the balloon room. They are immune to spikes; a released balloon that flies
// through one carries it (one per balloon), which adds one special shot to that balloon's bullets.
// Pure logic.
import { config } from '../config';
import type { Balloon, BalloonType } from './balloon';
import type { Rng } from './rng';

export type PowerKind = Exclude<BalloonType, 'normal'>;
export const POWER_KINDS: readonly PowerKind[] = ['fire', 'ice', 'bomb', 'heal', 'star', 'redstar'];

/** Tries per power-up to find a spot clear of the others before taking the last one. */
const PLACE_TRIES = 12;

let nextId = 1;

export interface PowerUp {
  readonly id: number;
  readonly kind: PowerKind;
  /** Anchor; the power-up bobs around it. */
  readonly baseX: number;
  readonly baseY: number;
  readonly phase: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
}

export class PowerUpField {
  readonly items: PowerUp[] = [];
  /** Kinds that can spawn this wave. */
  pool: PowerKind[] = [];
  private t = 0;

  /** Wave pool from levels.ts ('normal' entries are ignored). */
  setPool(types: readonly BalloonType[]): void {
    this.pool = POWER_KINDS.filter((k) => types.includes(k));
  }

  /** New turn: leftovers vanish and a fresh set spawns below the chain. */
  refill(rng: Rng): void {
    this.items.length = 0;
    if (this.pool.length === 0) return;
    const pc = config.powerUps;
    const L = config.layout;
    for (let n = 0; n < pc.perTurn; n++) {
      let x = 0;
      let y = 0;
      for (let tries = 0; tries < PLACE_TRIES; tries++) {
        x = rng.range(L.roomLeft + pc.margin, L.roomRight - pc.margin);
        y = rng.range(L.ropeY + pc.yMin, L.ropeY + pc.yMax);
        if (this.items.every((o) => Math.hypot(o.baseX - x, o.baseY - y) >= pc.minGap)) break;
      }
      const kind = this.pool.length === 1 ? this.pool[0] : rng.weighted(pc.weights, this.pool);
      this.items.push({ id: nextId++, kind, baseX: x, baseY: y, phase: rng.range(0, Math.PI * 2), x, y, prevX: x, prevY: y });
    }
  }

  step(dt: number): void {
    this.t += dt;
    const pc = config.powerUps;
    for (const p of this.items) {
      p.prevX = p.x;
      p.prevY = p.y;
      p.x = p.baseX + Math.sin(this.t * 0.9 + p.phase) * pc.bobX;
      p.y = p.baseY + Math.sin(this.t * 1.7 + p.phase * 1.3) * pc.bobY;
    }
  }

  /** The power-up a balloon touches, removed from the field (null if none). */
  take(b: Balloon): PowerUp | null {
    const reach = b.r + config.powerUps.radius;
    for (let i = 0; i < this.items.length; i++) {
      const p = this.items[i];
      if (Math.hypot(p.x - b.x, p.y - b.y) > reach) continue;
      this.items.splice(i, 1);
      return p;
    }
    return null;
  }
}
