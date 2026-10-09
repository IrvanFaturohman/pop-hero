// Turn flow (Claw Master style), alternating:
//   blow (balloons push the chain until together they reach the lock number; no balloon limit
//   by default, `turns.balloonsPerTurn` > 0 brings one back)
//   -> unlock (the chain strains) -> burst (it snaps; balloons escape up and pop over the hero)
//      or, with a limit, out of balloons with the lock still shut -> failed (no bullets)
//   -> collect (bullets land on the hero)
//   -> shoot (hero fires the whole volley) -> enemy (enemies step/attack, new ones walk in) -> blow
// A chapter is 10 waves (reference): an elite boss drops in at wave 5, the chapter boss at wave 10.
// Wave cleared -> clear -> cards (pick an ability) -> next wave; the last wave cleared -> victory.
// Hero HP 0 -> defeat. Pure logic.
import { config } from '../config';
import type { BossKind } from '../levels';
import type { Battle } from './battle';
import type { Rng } from './rng';
import type { BalloonRoom } from './room';
import type { WaveRunner } from './waves';

export type TurnPhase =
  | 'intro'
  | 'blow'
  | 'unlock'
  | 'burst'
  | 'failed'
  | 'collect'
  | 'shoot'
  | 'enemy'
  | 'clear'
  | 'cards'
  | 'victory'
  | 'defeat';

export type TurnEvent =
  | { type: 'phase'; phase: TurnPhase }
  /** A wave starts; `boss` is set on the elite / boss waves. */
  | { type: 'waveIntro'; wave: number; boss: BossKind | null }
  | { type: 'waveClear'; wave: number }
  /** Out of balloons with the lock still shut. */
  | { type: 'locked' }
  /** Show the ability cards; the game waits for pickCard(). */
  | { type: 'cards' }
  | { type: 'victory' }
  | { type: 'defeat' };

export class TurnRunner {
  phase: TurnPhase = 'intro';
  /** Turns played this run (telemetry). */
  turn = 0;
  readonly events: TurnEvent[] = [];
  private timer = 0;
  /** Balloons blown this turn (popped ones count too). */
  private used = 0;
  private lastBalloonId = -1;
  /** enemy phase started by the intro walk-in only (enemies don't act). */
  private walkInOnly = false;
  /** Survivors already slid forward after this volley. */
  private reformed = false;
  locksOpened = 0;
  locksFailed = 0;
  /** Waves cleared this run (meta coins). */
  wavesCleared = 0;

  constructor(
    private waves: WaveRunner,
    private battle: Battle,
    private room: BalloonRoom,
    private rng: Rng,
  ) {
    this.introEvent();
  }

  get cleared(): boolean {
    return this.phase === 'clear' || this.phase === 'victory';
  }

  drain(): void {
    this.events.length = 0;
  }

  /** Debug: end the current wave now. */
  skipWave(): void {
    if (this.phase === 'clear' || this.phase === 'cards' || this.phase === 'victory' || this.phase === 'defeat') return;
    this.waves.skipGroups();
    this.battle.killAll();
    this.clear();
  }

  /** Debug: jump to wave i (0-based), e.g. the elite or the boss. */
  goWave(i: number): void {
    if (this.phase === 'victory' || this.phase === 'defeat') return;
    this.waves.skipGroups();
    this.battle.killAll();
    this.battle.boss = null;
    this.room.claw.retract();
    this.waves.goTo(i);
    this.introEvent();
    this.go('intro');
  }

  /** The player picked an ability card: on to the next wave. */
  pickCard(): void {
    if (this.phase !== 'cards') return;
    if (this.waves.nextWave()) this.introEvent();
    this.go('intro');
  }

  step(dt: number): void {
    const b = this.battle;
    const r = this.room;
    const t = config.turns;
    this.timer += dt;
    switch (this.phase) {
      case 'intro':
        if (this.timer >= t.introTime) {
          const boss = this.waves.wave.boss;
          if (boss) b.spawnBoss(boss.kind);
          else b.boss = null;
          this.spawnGroup();
          this.walkInOnly = true;
          this.go('enemy');
        }
        break;
      case 'blow': {
        const a = r.attached;
        if (a && a.id !== this.lastBalloonId) {
          this.lastBalloonId = a.id;
          this.used++;
        }
        if (r.busy()) break;
        if (r.lockOpen) {
          this.locksOpened++;
          this.go('unlock');
        } else if (t.balloonsPerTurn > 0 && this.used >= t.balloonsPerTurn) {
          this.locksFailed++;
          r.releaseGathered();
          this.events.push({ type: 'locked' });
          this.go('failed');
        }
        break;
      }
      case 'unlock':
        if (this.timer >= t.unlockDelay) {
          r.snap();
          this.go('burst');
        }
        break;
      case 'failed':
        if (this.timer >= t.failDelay) this.go('collect');
        break;
      case 'burst':
        if (!r.escaping()) this.go('collect');
        break;
      case 'collect':
        if (b.pendingDeliveries > 0) this.timer = 0;
        else if (this.timer >= t.collectDelay) {
          b.startVolley();
          this.reformed = false;
          this.go('shoot');
        }
        break;
      case 'shoot':
        if (!b.volleyDone) this.timer = 0;
        else if (this.waveDone()) this.clear();
        else if (!this.reformed) {
          b.reform();
          this.reformed = true;
        } else if (this.timer >= t.enemyDelay && !b.enemyTurnBusy) {
          b.startEnemyTurn();
          this.spawnGroup();
          this.walkInOnly = false;
          this.go('enemy');
        }
        break;
      case 'enemy':
        if (b.enemyTurnBusy) break;
        if (b.dead) {
          this.go('defeat');
          this.events.push({ type: 'defeat' });
        } else if (this.waveDone()) this.clear();
        else {
          if (!this.walkInOnly) this.turn++;
          this.go('blow');
        }
        break;
      case 'clear':
        if (this.timer >= t.clearTime && !b.cashingIn) {
          this.go('cards');
          this.events.push({ type: 'cards' });
        }
        break;
      default:
        break;
    }
    // balloons until the lock opens (up to N per turn if a limit is set)
    const limited = t.balloonsPerTurn > 0;
    r.armed = this.phase === 'blow' && (!limited || this.used < t.balloonsPerTurn) && !r.lockOpen;
  }

  /** Balloons still to blow this turn (for the UI); -1 = no limit. */
  get balloonsLeft(): number {
    if (this.phase !== 'blow') return 0;
    const n = config.turns.balloonsPerTurn;
    return n > 0 ? Math.max(0, n - this.used) : -1;
  }

  private introEvent(): void {
    this.events.push({ type: 'waveIntro', wave: this.waves.index, boss: this.waves.wave.boss?.kind ?? null });
  }

  private waveDone(): boolean {
    return this.battle.aliveCount === 0 && !this.waves.hasMoreGroups;
  }

  private clear(): void {
    this.wavesCleared++;
    this.room.claw.retract();
    if (this.waves.isLast) {
      this.battle.killAll();
      this.go('victory');
      this.events.push({ type: 'victory' });
      return;
    }
    this.go('clear');
    this.battle.startCashIn();
    this.events.push({ type: 'waveClear', wave: this.waves.index });
  }

  private spawnGroup(): void {
    for (const kind of this.waves.takeGroup()) this.battle.spawnEnemy(kind);
  }

  private go(p: TurnPhase): void {
    if (p === 'blow') {
      this.used = 0;
      this.room.setLock(this.waves.wave.lock);
      // the Digger Mole digs its claw into the balloon room at a new spot every turn
      const boss = this.battle.boss;
      if (boss && boss.e.alive && boss.kind === 'mole') this.room.claw.dig(this.rng, boss.phase2);
      else this.room.claw.retract();
    }
    this.phase = p;
    this.timer = 0;
    this.events.push({ type: 'phase', phase: p });
  }
}
