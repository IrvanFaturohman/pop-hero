// Battle event + projectile types and the token timing shared by logic and views.
import { config } from '../config';
import type { AmmoKind } from './ammo';
import type { Enemy } from './enemies';

export type BattleEvent =
  | { type: 'shoot'; x: number; y: number; kind: AmmoKind }
  | { type: 'hit'; e: Enemy; x: number; y: number; dmg: number; crit: boolean; kind: AmmoKind }
  | { type: 'kill'; e: Enemy }
  | { type: 'spawn'; e: Enemy }
  | { type: 'attackStart'; e: Enemy }
  | { type: 'attack'; e: Enemy; dmg: number }
  | { type: 'frozenSkip'; e: Enemy }
  | { type: 'burn'; e: Enemy; dmg: number }
  | { type: 'bombThrow'; x: number; y: number; tx: number; ty: number }
  | { type: 'bombBoom'; x: number; y: number; r: number }
  | { type: 'heal'; amount: number }
  | { type: 'bossLand'; e: Enemy }
  | { type: 'bossSlam'; e: Enemy; dmg: number }
  | { type: 'bossPhase2'; e: Enemy }
  | { type: 'heroDead' }
  /** Wave clear: a chunk of leftover bullets flowed into the HP bar / all of it is done. */
  | { type: 'cashIn'; amount: number; index: number }
  | { type: 'cashInDone'; bullets: number; hp: number }
  | { type: 'empty' }
  /** One bullet-ball token from an arrived balloon reached the hero. */
  | { type: 'ammoLand'; index: number; amount: number };

export interface Bullet {
  active: boolean;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  dmg: number;
  kind: AmmoKind;
  pierce: number;
  lastHit: number;
}

export interface Bomb {
  t: number;
  x0: number;
  y0: number;
  tx: number;
  ty: number;
  dmg: number;
}

export const MAX_BULLETS = 200;

export interface Delivery {
  t: number;
  amount: number;
  index: number;
  kind: AmmoKind | 'bomb' | 'heal';
}

export interface PendingAttack {
  t: number;
  e: Enemy;
  started: boolean;
}

/** Splits `total` ammo into at most `maxTokens` tokens (shared by logic and the token view). */
export function tokenCount(total: number): number {
  return Math.max(1, Math.min(config.juice.tokens.max, total));
}

/** Arrival delay of token i (s). Deterministic so the view can match it exactly. */
export function tokenDelay(i: number): number {
  const tk = config.juice.tokens;
  return tk.flightTime + i * tk.stagger;
}

