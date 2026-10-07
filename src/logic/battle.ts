// Upper arena logic, turn-based (Claw Master style): the hero fires its whole ammo as a volley
// (bombs first), then every enemy hits the hero (burning ones take damage, frozen ones skip; the
// boss slams / summons on its own schedule). Pure logic, deterministic for a given seed.
import { config } from '../config';
import type { EnemyKind } from '../levels';
import { AmmoPool, type AmmoKind } from './ammo';
import type { BalloonType } from './balloon';
import { tokenCount, tokenDelay, type BattleEvent, type Bomb, type Bullet, type Delivery, type PendingAttack } from './battleTypes';
import { BossBrain } from './boss';
import { Enemy, slotPos } from './enemies';
import type { Rng } from './rng';
import { Weapons } from './weapons';

export { MAX_BULLETS, tokenCount, tokenDelay } from './battleTypes';
export type { BattleEvent, Bullet } from './battleTypes';

export class Battle {
  hp = config.hero.hp;
  dead = false;
  readonly ammoPool = new AmmoPool();
  readonly enemies: Enemy[] = [];
  readonly events: BattleEvent[] = [];
  readonly weapons: Weapons;
  boss: BossBrain | null = null;
  /** Upgrades. */
  damageBonus = 0;
  critChance = 0;
  pierce = 0;
  twin = 0;
  vampire = 0;
  damageTaken = 0;
  /** What dealt the last damage to the hero (telemetry: cause of defeat). */
  lastDamageBy: string | null = null;
  private deliveries: Delivery[] = [];
  private attacks: PendingAttack[] = [];
  private slamAt = -1;
  private enemyTurnT = -1;
  private enemyTurnEnd = 0;
  private bossWasMoving = false;
  private cash = { left: 0, timer: 0, chunk: 1, bullets: 0, healed: 0, index: 0 };
  /** Telemetry: leftover bullets at each wave clear and the HP they turned into. */
  readonly leftoverPerWave: number[] = [];
  hpFromLeftover = 0;

  constructor(rng: Rng) {
    this.weapons = new Weapons(this, rng);
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
    for (const o of this.enemies) if (o.alive && o.kind !== 'boss') i++;
    const slot = slotPos(i, kind);
    const e = new Enemy(kind, slot.y);
    e.moveTo(slot.x, slot.y, config.enemies.moveTime * 1.6);
    this.enemies.push(e);
    this.events.push({ type: 'spawn', e });
    return e;
  }

  /** The boss drops in from above behind the formation. */
  spawnBoss(): Enemy {
    const L = config.layout;
    const r = config.enemies.boss.radius;
    const e = new Enemy('boss', -r * 2);
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
      if (!e.alive || e.kind === 'boss') continue;
      const p = slotPos(i++, e.kind);
      e.moveTo(p.x, p.y, config.enemies.moveTime);
    }
  }

  /** A balloon burst over the hero: bullets land token by token; bombs/heals arrive as one. */
  deliver(total: number, type: BalloonType): void {
    if (type === 'bomb' || type === 'heal') {
      this.deliveries.push({ t: tokenDelay(0), amount: total, index: 0, kind: type });
      return;
    }
    const kind: AmmoKind = type === 'fire' || type === 'ice' ? type : 'normal';
    const n = tokenCount(total);
    const base = Math.floor(total / n);
    let extra = total - base * n;
    for (let i = 0; i < n; i++) {
      this.deliveries.push({ t: tokenDelay(i), amount: base + (extra-- > 0 ? 1 : 0), index: i, kind });
    }
  }

  heal(n: number): void {
    if (n <= 0 || this.dead) return;
    const before = this.hp;
    this.hp = Math.min(config.hero.hp, this.hp + n);
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

  /** Enemy turn: burns tick, then everyone hits the hero (frozen ones skip), the boss acts. */
  startEnemyTurn(): void {
    const ec = config.enemies;
    for (const e of this.enemies) {
      if (!e.alive || e.burn <= 0) continue;
      e.burn--;
      this.damage(e, config.effects.burnDamage);
      this.events.push({ type: 'burn', e, dmg: config.effects.burnDamage });
    }
    const order = this.enemies.filter((e) => e.alive && e.kind !== 'boss').sort((a, b) => a.x - b.x);
    const stagger = Math.min(ec.attackStagger, ec.attackTurnMax / Math.max(1, order.length));
    let k = 0;
    for (const e of order) {
      if (e.frozen) {
        e.frozen = false;
        this.events.push({ type: 'frozenSkip', e });
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

  /** Debug / boss death: remove every enemy. */
  killAll(): void {
    for (const e of this.enemies) if (e.alive) this.kill(e);
  }

  step(dt: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) if (!this.enemies[i].alive) this.enemies.splice(i, 1);
    for (const e of this.enemies) e.savePrev();
    this.weapons.savePrev();
    this.stepDeliveries(dt);
    this.stepCashIn(dt);
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
      if (dl.kind === 'bomb') this.weapons.bombsReady.push(Math.round(dl.amount * config.effects.bombDamageMult));
      else if (dl.kind === 'heal') this.heal(Math.round(dl.amount * config.effects.healMult));
      else {
        this.ammoPool.add(dl.kind, dl.amount);
        if (this.vampire > 0) this.heal(dl.amount * this.vampire);
      }
      this.events.push({ type: 'ammoLand', index: dl.index, amount: dl.amount });
    }
  }

  /**
   * Wave clear: bullets carry over between turns (reference) but not between waves. Every leftover
   * bullet flows into the HP bar (`leftover.bulletsPerHp` per HP), a chunk at a time so the view
   * can animate it; the ammo ends at 0.
   */
  startCashIn(): void {
    const n = this.ammoPool.total;
    const c = this.cash;
    this.leftoverPerWave.push(n);
    c.left = n;
    c.timer = config.leftover.delay;
    c.chunk = Math.max(1, Math.ceil(n / config.leftover.steps));
    c.bullets = 0;
    c.healed = 0;
    c.index = 0;
  }

  get cashingIn(): boolean {
    return this.cash.left > 0;
  }

  private stepCashIn(dt: number): void {
    const c = this.cash;
    if (c.left <= 0) return;
    c.timer -= dt;
    while (c.timer <= 0 && c.left > 0) {
      const n = Math.min(c.left, c.chunk);
      const before = Math.floor(c.bullets / config.leftover.bulletsPerHp);
      this.ammoPool.drop(n);
      c.left -= n;
      c.bullets += n;
      const gain = Math.floor(c.bullets / config.leftover.bulletsPerHp) - before;
      // silent heal: the view shows one "+N HP" at the end instead of a popup per chunk
      const hp = this.dead ? this.hp : Math.min(config.hero.hp, this.hp + gain);
      c.healed += hp - this.hp;
      this.hp = hp;
      this.events.push({ type: 'cashIn', amount: n, index: c.index++ });
      c.timer += config.leftover.interval;
    }
    if (c.left <= 0) {
      this.hpFromLeftover += c.healed;
      this.events.push({ type: 'cashInDone', bullets: c.bullets, hp: c.healed });
    }
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
      this.hurt(a.e.stats.damage);
      this.events.push({ type: 'attack', e: a.e, dmg: a.e.stats.damage });
    }
    if (this.slamAt >= 0 && this.enemyTurnT >= this.slamAt && this.boss) {
      this.slamAt = -1;
      const dmg = config.enemies.boss.damage;
      if (this.boss.e.alive && !this.dead) {
        this.lastDamageBy = 'boss slam';
        this.hurt(dmg);
        this.events.push({ type: 'bossSlam', e: this.boss.e, dmg });
      }
    }
    if (this.enemyTurnT >= this.enemyTurnEnd && this.attacks.length === 0 && this.slamAt < 0) this.enemyTurnT = -1;
  }

  private hurt(dmg: number): void {
    if (config.debug.godMode) return;
    this.hp = Math.max(0, this.hp - dmg);
    this.damageTaken += dmg;
    if (this.hp <= 0 && !this.dead) {
      this.dead = true;
      this.events.push({ type: 'heroDead' });
    }
  }

  damage(e: Enemy, dmg: number): void {
    if (!e.alive) return;
    e.hp -= dmg;
    if (this.boss && e === this.boss.e && this.boss.checkPhase2()) this.events.push({ type: 'bossPhase2', e });
    if (e.hp <= 0) this.kill(e);
  }

  private kill(e: Enemy): void {
    e.alive = false;
    this.events.push({ type: 'kill', e });
  }
}
