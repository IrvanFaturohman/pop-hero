// Upper arena logic, turn-based (Claw Master style): the hero fires its whole ammo as a volley
// (bombs first), then every enemy hits the hero (burning ones take damage, frozen / stunned ones
// skip; a boss slams / summons on its own schedule). Hero numbers come from the meta upgrades
// (HeroBase) and the ability cards (HeroMods). Pure logic, deterministic for a given seed.
import { config } from '../config';
import { isBossKind, type BossKind, type EnemyKind } from '../levels';
import { AmmoPool } from './ammo';
import type { BalloonType } from './balloon';
import { baseMods, tokenCount, tokenDelay, type BattleEvent, type Bomb, type Bullet, type Delivery, type HeroMods, type PendingAttack } from './battleTypes';
import { BossBrain } from './boss';
import { Enemy, slotPos } from './enemies';
import type { HeroBase } from './meta';
import type { Rng } from './rng';
import { Weapons } from './weapons';

export { MAX_BULLETS, tokenCount, tokenDelay } from './battleTypes';
export type { BattleEvent, Bullet, HeroMods } from './battleTypes';

/** Second Wind brings the hero back to this HP fraction. */
const SECOND_WIND_HP = 0.4;

export class Battle {
  hp: number;
  dead = false;
  readonly ammoPool = new AmmoPool();
  readonly enemies: Enemy[] = [];
  readonly events: BattleEvent[] = [];
  readonly weapons: Weapons;
  boss: BossBrain | null = null;
  /** From the meta upgrades. */
  bulletDamage: number;
  armor: number;
  private baseMaxHp: number;
  /** From the ability cards. */
  mods: HeroMods = baseMods();
  private secondWindUsed = false;
  damageTaken = 0;
  /** What dealt the last damage to the hero (telemetry: cause of defeat). */
  lastDamageBy: string | null = null;
  private deliveries: Delivery[] = [];
  private attacks: PendingAttack[] = [];
  private slamAt = -1;
  private enemyTurnT = -1;
  private enemyTurnEnd = 0;
  private bossWasMoving = false;
  /** Telemetry: bullets carried into the next wave at each wave clear. */
  readonly leftoverPerWave: number[] = [];

  constructor(rng: Rng, base?: HeroBase) {
    this.bulletDamage = base?.bulletDamage ?? config.hero.bulletDamage;
    this.armor = base?.armor ?? 0;
    this.baseMaxHp = base?.maxHp ?? config.hero.hp;
    this.hp = this.baseMaxHp;
    this.weapons = new Weapons(this, rng);
  }

  get maxHp(): number {
    return Math.round(this.baseMaxHp * this.mods.hpMult);
  }

  /** New card numbers; a bigger max HP also heals by the difference. */
  setMods(m: HeroMods): void {
    const before = this.maxHp;
    this.mods = m;
    const gain = this.maxHp - before;
    if (gain > 0 && !this.dead) this.hp += gain;
    this.hp = Math.min(this.hp, this.maxHp);
  }

  get bullets(): readonly Bullet[] {
    return this.weapons.bullets;
  }

  get bombs(): readonly Bomb[] {
    return this.weapons.bombs;
  }

  /** Hero turn: throw the bombs, then fire the whole ammo as one volley. */
  startVolley(): void {
    this.weapons.startVolley();
  }

  get ammo(): number {
    return this.ammoPool.total;
  }

  drain(): void {
    this.events.length = 0;
  }

  get aliveCount(): number {
    let n = 0;
    for (const e of this.enemies) if (e.alive) n++;
    return n;
  }

  get pendingDeliveries(): number {
    return this.deliveries.length;
  }

  get volleyDone(): boolean {
    return this.weapons.done;
  }

  get enemyTurnBusy(): boolean {
    if (this.enemyTurnT >= 0) return true;
    for (const e of this.enemies) if (e.alive && e.moving) return true;
    return false;
  }

  /** A new enemy walks in from the right edge into the next free formation slot. */
  spawnEnemy(kind: EnemyKind): Enemy {
    let i = 0;
    for (const o of this.enemies) if (o.alive && !isBossKind(o.kind)) i++;
    const slot = slotPos(i, kind);
    const e = new Enemy(kind, slot.y);
    e.moveTo(slot.x, slot.y, config.enemies.moveTime * 1.6);
    this.enemies.push(e);
    this.events.push({ type: 'spawn', e });
    return e;
  }

  /** The boss drops in from above behind the formation. */
  spawnBoss(kind: BossKind): Enemy {
    const L = config.layout;
    const r = config.enemies[kind].radius;
    const e = new Enemy(kind, -r * 2);
    e.x = e.prevX = config.boss.x;
    e.moveTo(config.boss.x, L.groundY - r * 0.8, 0.55);
    this.enemies.push(e);
    this.boss = new BossBrain(e);
    this.bossWasMoving = true;
    this.events.push({ type: 'spawn', e });
    return e;
  }

  /** Survivors slide forward to fill the slots of fallen enemies (oldest in front). */
  reform(): void {
    let i = 0;
    for (const e of this.enemies) {
      if (!e.alive || isBossKind(e.kind)) continue;
      const p = slotPos(i++, e.kind);
      e.moveTo(p.x, p.y, config.enemies.moveTime);
    }
  }

  /**
   * A balloon burst over the hero: its normal bullets land token by token. A power-up it carried
   * lands first as one special shot (fire / ice / bomb) or an instant heal; stars are run currency
   * and handled by the scene.
   */
  deliver(total: number, power: BalloonType): void {
    if (power === 'fire' || power === 'ice' || power === 'bomb' || power === 'heal') {
      this.deliveries.push({ t: tokenDelay(0), amount: 1, index: 0, kind: power });
    }
    const n = tokenCount(total);
    const base = Math.floor(total / n);
    let extra = total - base * n;
    for (let i = 0; i < n; i++) {
      this.deliveries.push({ t: tokenDelay(i), amount: base + (extra-- > 0 ? 1 : 0), index: i, kind: 'normal' });
    }
  }

  heal(n: number): void {
    if (n <= 0 || this.dead) return;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + n);
    if (this.hp > before) this.events.push({ type: 'heal', amount: this.hp - before });
  }

  muzzleX(): number {
    return config.layout.heroX + 84;
  }

  muzzleY(): number {
    return config.layout.heroY + 6;
  }

  /** The enemy closest to the hero (most dangerous). */
  target(): Enemy | null {
    let best: Enemy | null = null;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (!best || e.x < best.x) best = e;
    }
    return best;
  }

  /** Enemy turn: burns tick, then everyone hits the hero (frozen / stunned skip), the boss acts. */
  startEnemyTurn(): void {
    const ec = config.enemies;
    for (const e of this.enemies) {
      if (!e.alive || e.burn <= 0) continue;
      e.burn--;
      this.events.push({ type: 'burn', e, dmg: config.effects.burnDamage });
      this.damage(e, config.effects.burnDamage);
    }
    const order = this.enemies.filter((e) => e.alive && !isBossKind(e.kind)).sort((a, b) => a.x - b.x);
    const stagger = Math.min(ec.attackStagger, ec.attackTurnMax / Math.max(1, order.length));
    let k = 0;
    for (const e of order) {
      if (e.frozen || e.stunned) {
        this.events.push({ type: e.frozen ? 'frozenSkip' : 'stunSkip', e });
        e.frozen = false;
        e.stunned = false;
        continue;
      }
      this.attacks.push({ t: k++ * stagger, e, started: false });
    }
    this.slamAt = -1;
    let end = k > 0 ? (k - 1) * stagger + ec.attackTime : 0;
    if (this.boss && this.boss.e.alive) {
      const act = this.boss.act();
      if (act.slam && !this.boss.e.frozen) {
        this.slamAt = end + 0.15;
        end = this.slamAt + 0.5;
      }
      this.boss.e.frozen = false;
      for (let i = 0; i < act.summon; i++) this.spawnEnemy('grunt');
    }
    this.enemyTurnT = 0;
    this.enemyTurnEnd = end;
  }

  /** Debug: remove every enemy. */
  killAll(): void {
    for (const e of this.enemies) if (e.alive) this.kill(e, false);
  }

  step(dt: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) if (!this.enemies[i].alive) this.enemies.splice(i, 1);
    for (const e of this.enemies) e.savePrev();
    this.weapons.savePrev();
    this.stepDeliveries(dt);
    for (const e of this.enemies) e.step(dt);
    if (this.boss && this.bossWasMoving && !this.boss.e.moving) {
      this.bossWasMoving = false;
      this.events.push({ type: 'bossLand', e: this.boss.e });
    }
    this.stepEnemyTurn(dt);
    this.weapons.step(dt);
  }

  private stepDeliveries(dt: number): void {
    for (let i = this.deliveries.length - 1; i >= 0; i--) {
      const dl = this.deliveries[i];
      dl.t -= dt;
      if (dl.t > 0) continue;
      this.deliveries.splice(i, 1);
      if (dl.kind === 'heal') this.heal(config.effects.heal);
      else if (dl.kind === 'normal') this.ammoPool.add('normal', dl.amount);
      else this.weapons.specials.push(dl.kind);
      this.events.push({ type: 'ammoLand', index: dl.index, amount: dl.amount });
    }
  }

  /** Wave clear: leftover bullets stay with the hero for the next wave (reference). */
  recordCarry(): void {
    this.leftoverPerWave.push(this.ammoPool.total);
  }

  private stepEnemyTurn(dt: number): void {
    if (this.enemyTurnT < 0) return;
    this.enemyTurnT += dt;
    const hitDelay = config.enemies.attackHit;
    for (let i = this.attacks.length - 1; i >= 0; i--) {
      const a = this.attacks[i];
      if (!a.started && a.t <= this.enemyTurnT) {
        a.started = true;
        if (a.e.alive) this.events.push({ type: 'attackStart', e: a.e });
      }
      if (a.t + hitDelay > this.enemyTurnT) continue;
      this.attacks.splice(i, 1);
      if (!a.e.alive || this.dead) continue;
      this.lastDamageBy = a.e.kind;
      const dmg = this.hurt(a.e.stats.damage);
      this.events.push({ type: 'attack', e: a.e, dmg });
    }
    if (this.slamAt >= 0 && this.enemyTurnT >= this.slamAt && this.boss) {
      this.slamAt = -1;
      if (this.boss.e.alive && !this.dead) {
        this.lastDamageBy = `${this.boss.kind} slam`;
        const dmg = this.hurt(this.boss.e.stats.damage);
        this.events.push({ type: 'bossSlam', e: this.boss.e, dmg });
      }
    }
    if (this.enemyTurnT >= this.enemyTurnEnd && this.attacks.length === 0 && this.slamAt < 0) this.enemyTurnT = -1;
  }

  /** Armor takes a flat bite out of every hit (at least 1 gets through). Returns the damage dealt. */
  private hurt(raw: number): number {
    if (config.debug.godMode) return 0;
    const dmg = Math.max(1, raw - this.armor);
    this.hp = Math.max(0, this.hp - dmg);
    this.damageTaken += dmg;
    if (this.hp <= 0 && !this.dead) {
      if (this.mods.secondWind && !this.secondWindUsed) {
        this.secondWindUsed = true;
        this.hp = Math.round(this.maxHp * SECOND_WIND_HP);
        this.events.push({ type: 'secondWind', hp: this.hp });
        return dmg;
      }
      this.dead = true;
      this.events.push({ type: 'heroDead' });
    }
    return dmg;
  }

  damage(e: Enemy, dmg: number): void {
    if (!e.alive) return;
    e.hp -= dmg;
    if (this.boss && e === this.boss.e && this.boss.checkPhase2()) this.events.push({ type: 'bossPhase2', e });
    if (e.hp <= 0) this.kill(e, true);
  }

  private kill(e: Enemy, byHero: boolean): void {
    e.alive = false;
    this.events.push({ type: 'kill', e });
    if (byHero && this.mods.lifesteal > 0) this.heal(Math.max(1, Math.round(this.maxHp * this.mods.lifesteal)));
  }
}
