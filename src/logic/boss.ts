// Boss brain, turn-based: slams the hero every N enemy turns (telegraphed during the player's turn
// before), summons rats, enters phase 2 at half HP. Used by the elite (Rat King, wave 5) and the
// chapter boss (Digger Mole, wave 10, which also digs a claw into the balloon room). Pure logic.
import { config } from '../config';
import type { BossKind } from '../levels';
import type { Enemy } from './enemies';

export interface BossActions {
  slam: boolean;
  summon: number;
}

export class BossBrain {
  readonly e: Enemy;
  readonly kind: BossKind;
  enemyTurns = 0;
  phase2 = false;
  private actions: BossActions = { slam: false, summon: 0 };

  constructor(e: Enemy) {
    this.e = e;
    this.kind = e.kind as BossKind;
  }

  private get cfg() {
    return config.bosses[this.kind];
  }

  private get slamEvery(): number {
    return this.phase2 ? this.cfg.slamEveryPhase2 : this.cfg.slamEvery;
  }

  /** The coming enemy turn will be a slam (show the warning circle on the hero). */
  get slamNext(): boolean {
    return this.e.alive && (this.enemyTurns + 1) % this.slamEvery === 0;
  }

  /** Start of an enemy turn: what the boss does. */
  act(): BossActions {
    this.enemyTurns++;
    this.actions.slam = this.enemyTurns % this.slamEvery === 0;
    this.actions.summon = this.enemyTurns % this.cfg.summonEvery === 0 ? this.cfg.summonCount : 0;
    return this.actions;
  }

  /** True once, when HP drops to the phase-2 threshold. */
  checkPhase2(): boolean {
    if (this.phase2 || this.e.hp > this.e.maxHp * config.boss.phase2At) return false;
    this.phase2 = true;
    return true;
  }
}
