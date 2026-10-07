// Enemies: critters that walk in from the right into a formation slot in front of the hero and
// attack on every enemy turn. Pure logic.
import { config } from '../config';
import type { EnemyKind } from '../levels';
import { easeInOut } from './math';

export interface EnemyStats {
  hp: number;
  damage: number; // per attack, every enemy turn
  radius: number; // px
  knockback: number; // px per hit (pushed back to the right)
}

export function enemyStats(kind: EnemyKind): EnemyStats {
  return config.enemies[kind];
}

/** Formation slot i -> position: columns from the hero outward, 3 lanes per column. */
export function slotPos(i: number, kind: EnemyKind): { x: number; y: number } {
  const ec = config.enemies;
  const lanes = ec.laneOffsets.length;
  const col = Math.floor(i / lanes);
  const lane = i % lanes;
  return {
    // back lanes sit a little further right so the group reads as a crowd, not a stack
    x: ec.slotX0 + col * ec.slotDX + (lane - (lanes - 1) / 2) * 16,
    y: config.layout.groundY - enemyStats(kind).radius * 0.8 + ec.laneOffsets[lane],
  };
}

let nextId = 1;

export class Enemy {
  readonly id = nextId++;
  readonly kind: EnemyKind;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  hp: number;
  readonly maxHp: number;
  alive = true;
  /** Enemy turns of burn left (fire bullets). */
  burn = 0;
  /** Frozen by ice bullets: skips its next attack. */
  frozen = false;
  /** Movement tween (walk-in / formation slide). */
  private fromX = 0;
  private fromY = 0;
  private toX = 0;
  private toY = 0;
  private moveT = 1;
  private moveDur = 1;

  constructor(kind: EnemyKind, y: number) {
    this.kind = kind;
    this.hp = this.maxHp = enemyStats(kind).hp;
    this.x = this.prevX = config.layout.width + enemyStats(kind).radius + 10;
    this.y = this.prevY = y;
  }

  get stats(): EnemyStats {
    return enemyStats(this.kind);
  }

  get moving(): boolean {
    return this.moveT < 1;
  }

  moveTo(x: number, y: number, duration: number): void {
    if (Math.abs(x - this.x) < 0.5 && Math.abs(y - this.y) < 0.5) return;
    this.fromX = this.x;
    this.fromY = this.y;
    this.toX = x;
    this.toY = y;
    this.moveT = 0;
    this.moveDur = Math.max(0.01, duration);
  }

  savePrev(): void {
    this.prevX = this.x;
    this.prevY = this.y;
  }

  step(dt: number): void {
    if (this.moveT >= 1) return;
    this.moveT = Math.min(1, this.moveT + dt / this.moveDur);
    const k = easeInOut(this.moveT);
    this.x = this.fromX + (this.toX - this.fromX) * k;
    this.y = this.fromY + (this.toY - this.fromY) * k;
  }

  /** Pushed back by a bullet (a running slide still ends at its slot). */
  knock(px: number): void {
    this.x += px;
    if (this.moveT < 1) this.fromX += px;
    else this.moveTo(this.x - px, this.y, 0.2);
  }
}
