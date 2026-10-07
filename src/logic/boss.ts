// Boss brain, turn-based version of the brief: slams the hero every N enemy turns (telegraphed
// during the player's turn before), summons grunts, enters phase 2 at half HP. Pure logic.
import { config } from '../config';
import type { Enemy } from './enemies';

export interface BossActions {
  slam: boolean;
  summon: number;
}

export class BossBrain {
  readonly e: Enemy;
  enemyTurns = 0;
  phase2 = false;
  private actions: BossActions = { slam: false, summon: 0 };

  constructor(e: Enemy) {
    this.e = e;
  }

  private get slamEvery(): number {
    return this.phase2 ? config.boss.slamEveryPhase2 : config.boss.slamEvery;
  }

  /** The coming enemy turn will be a slam (show the warning circle on the hero). */
  get slamNext(): boolean {
    return this.e.alive && (this.enemyTurns + 1) % this.slamEvery === 0;
  }

  /** Start of an enemy turn: what the boss does. */
  act(): BossActions {
    this.enemyTurns++;
    this.actions.slam = this.enemyTurns % this.slamEvery === 0;
    this.actions.summon = this.enemyTurns % config.boss.summonEvery === 0 ? config.boss.summonCount : 0;
    return this.actions;
  }

  /** True once, when HP drops to the phase-2 threshold. */
  checkPhase2(): boolean {
    if (this.phase2 || this.e.hp > this.e.maxHp * config.boss.phase2At) return false;
    this.phase2 = true;
    return true;
  }
}
