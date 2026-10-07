// Turn flow (Claw Master style), alternating:
//   blow (up to N balloons push the chain; together they must reach the lock number)
//   -> unlock (the chain strains) -> burst (it snaps; balloons escape up and pop over the hero)
//      or, out of balloons with the lock still shut -> failed (they drift away, no bullets)
//   -> collect (bullets land on the hero)
//   -> shoot (hero fires the whole volley) -> enemy (enemies step/attack, new ones walk in) -> blow
// Wave cleared -> clear -> cards (pick an upgrade) -> next wave ... after the last wave the boss
// drops in; boss dead -> victory. Hero HP 0 -> defeat. Pure logic.
import { config } from '../config';
import type { Battle } from './battle';
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
  | { type: 'waveIntro'; wave: number }
  | { type: 'waveClear'; wave: number }
  /** Out of balloons with the lock still shut. */
  | { type: 'locked' }
  /** Show 3 upgrade cards; the game waits for pickCard(). */
  | { type: 'cards' }
  | { type: 'bossIntro' }
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
  /** Fighting the boss (after the last wave). */
  bossStage = false;
  locksOpened = 0;
  locksFailed = 0;

  constructor(
    private waves: WaveRunner,
    private battle: Battle,
    private room: BalloonRoom,
  ) {
    this.events.push({ type: 'waveIntro', wave: 0 });
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

  /** Debug: jump straight to the boss. */
  goBoss(): void {
    if (this.bossStage || this.phase === 'victory' || this.phase === 'defeat') return;
    while (this.waves.nextWave()) {
      // skip to the last wave
    }
    this.waves.skipGroups();
    this.battle.killAll();
    this.bossStage = true;
    this.events.push({ type: 'bossIntro' });
    this.go('intro');
  }

  /** The player picked an upgrade card: next wave, or the boss after the last one. */
  pickCard(): void {
    if (this.phase !== 'cards') return;
    if (this.waves.nextWave()) {
      this.events.push({ type: 'waveIntro', wave: this.waves.index });
    } else {
      this.bossStage = true;
      this.events.push({ type: 'bossIntro' });
    }
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
          if (this.bossStage) this.battle.spawnBoss();
          else this.spawnGroup();
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
        } else if (this.used >= t.balloonsPerTurn) {
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
        }
        else if (this.timer >= t.enemyDelay && !b.enemyTurnBusy) {
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
    // up to N balloons per player turn, none once the lock is open
    r.armed = this.phase === 'blow' && this.used < t.balloonsPerTurn && !r.lockOpen;
  }

  /** Balloons still to blow this turn (for the UI). */
  get balloonsLeft(): number {
    return this.phase === 'blow' ? Math.max(0, config.turns.balloonsPerTurn - this.used) : 0;
  }

  private waveDone(): boolean {
    if (this.bossStage) return this.battle.boss !== null && !this.battle.boss.e.alive;
    return this.battle.aliveCount === 0 && !this.waves.hasMoreGroups;
  }

  private clear(): void {
    if (this.bossStage) {
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
      this.room.setLock(this.bossStage ? config.boss.lock : this.waves.wave.lock);
    }
    this.phase = p;
    this.timer = 0;
    this.events.push({ type: 'phase', phase: p });
  }
}
