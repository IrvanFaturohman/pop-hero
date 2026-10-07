// The hero's weapons: one volley per turn (bombs first, then every bullet), with the card upgrades
// (damage, crit, pierce, twin) and fire/ice bullet effects. Pure logic.
import { config } from '../config';
import type { AmmoKind, AmmoPool } from './ammo';
import { MAX_BULLETS, type BattleEvent, type Bomb, type Bullet } from './battleTypes';
import type { Enemy } from './enemies';
import { clamp } from './math';
import type { Rng } from './rng';

export interface WeaponHost {
  readonly enemies: Enemy[];
  readonly events: BattleEvent[];
  readonly ammoPool: AmmoPool;
  damageBonus: number;
  critChance: number;
  pierce: number;
  twin: number;
  target(): Enemy | null;
  damage(e: Enemy, dmg: number): void;
  muzzleX(): number;
  muzzleY(): number;
}

export class Weapons {
  readonly bullets: Bullet[] = [];
  readonly bombs: Bomb[] = [];
  /** Bomb damages waiting to be thrown on the next volley. */
  readonly bombsReady: number[] = [];
  private firing = false;
  private fireTimer = 0;
  private fireRate = 8;
  private volleyLeft = 0;

  constructor(
    private host: WeaponHost,
    private rng: Rng,
  ) {
    for (let i = 0; i < MAX_BULLETS; i++) {
      this.bullets.push({ active: false, x: 0, y: 0, prevX: 0, prevY: 0, vx: 0, vy: 0, dmg: 1, kind: 'normal', pierce: 0, lastHit: -1 });
    }
  }

  /** Nothing left to fire and every bullet / bomb resolved. */
  get done(): boolean {
    if (this.firing || this.bombs.length > 0) return false;
    for (const b of this.bullets) if (b.active) return false;
    return true;
  }

  savePrev(): void {
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.prevX = b.x;
      b.prevY = b.y;
    }
  }

  /** Hero turn: throw the bombs, then fire the whole ammo as one volley. */
  startVolley(): void {
    const h = this.host;
    for (const dmg of this.bombsReady) this.throwBomb(dmg);
    this.bombsReady.length = 0;
    const shots = config.debug.infiniteAmmo ? 30 : h.ammoPool.total;
    if (shots <= 0) {
      if (h.target() && this.bombs.length === 0) h.events.push({ type: 'empty' });
      return;
    }
    const hc = config.hero;
    this.firing = true;
    this.fireTimer = this.bombs.length > 0 ? config.effects.bombFlight * 0.5 : 0;
    this.volleyLeft = shots;
    this.fireRate = clamp((shots * (1 + h.twin)) / hc.volleyTime, hc.minFireRate, hc.maxFireRate);
  }

  step(dt: number): void {
    this.stepBombs(dt);
    this.stepFire(dt);
    this.stepBullets(dt);
  }

  /** Bomb flies to the densest group of enemies. */
  private throwBomb(dmg: number): void {
    const h = this.host;
    const R = config.effects.bombRadius;
    let best: Enemy | null = null;
    let bestN = -1;
    for (const e of h.enemies) {
      if (!e.alive) continue;
      let n = 0;
      for (const o of h.enemies) if (o.alive && Math.hypot(o.x - e.x, o.y - e.y) <= R) n++;
      if (n > bestN) {
        bestN = n;
        best = e;
      }
    }
    if (!best) return;
    const b: Bomb = { t: 0, x0: h.muzzleX(), y0: h.muzzleY() - 20, tx: best.x, ty: best.y, dmg };
    this.bombs.push(b);
    h.events.push({ type: 'bombThrow', x: b.x0, y: b.y0, tx: b.tx, ty: b.ty });
  }

  private stepBombs(dt: number): void {
    const h = this.host;
    const R = config.effects.bombRadius;
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.t += dt;
      if (b.t < config.effects.bombFlight) continue;
      this.bombs.splice(i, 1);
      h.events.push({ type: 'bombBoom', x: b.tx, y: b.ty, r: R });
      for (const e of h.enemies) {
        if (!e.alive || Math.hypot(e.x - b.tx, e.y - b.ty) > R + e.stats.radius) continue;
        h.events.push({ type: 'hit', e, x: e.x, y: e.y - e.stats.radius * 0.5, dmg: b.dmg, crit: false, kind: 'normal' });
        h.damage(e, b.dmg);
      }
    }
  }

  private stepFire(dt: number): void {
    if (!this.firing) return;
    const h = this.host;
    const t = h.target();
    if (!t || this.volleyLeft <= 0) {
      this.firing = false;
      return;
    }
    this.fireTimer -= dt;
    while (this.fireTimer <= 0 && this.volleyLeft > 0) {
      const kind: AmmoKind = config.debug.infiniteAmmo && h.ammoPool.total <= 0 ? 'normal' : h.ammoPool.take();
      for (let k = 0; k <= h.twin; k++) this.fire(t, kind, k);
      this.volleyLeft--;
      this.fireTimer += (1 + h.twin) / this.fireRate;
    }
    if (this.volleyLeft <= 0) this.firing = false;
  }

  private fire(t: Enemy, kind: AmmoKind, twinIndex: number): void {
    let b: Bullet | null = null;
    for (const x of this.bullets) {
      if (!x.active) {
        b = x;
        break;
      }
    }
    if (!b) return;
    const h = this.host;
    const mx = h.muzzleX();
    const my = h.muzzleY() + (twinIndex > 0 ? (twinIndex % 2 === 1 ? -9 : 9) : 0);
    const sp = config.hero.bulletSpeed;
    const dx = t.x - mx;
    const dy = t.y - my;
    const len = Math.hypot(dx, dy) || 1;
    b.active = true;
    b.x = b.prevX = mx;
    b.y = b.prevY = my;
    b.vx = (dx / len) * sp;
    b.vy = (dy / len) * sp;
    b.dmg = config.hero.bulletDamage + h.damageBonus;
    b.kind = kind;
    b.pierce = h.pierce;
    b.lastHit = -1;
    h.events.push({ type: 'shoot', x: mx, y: my, kind });
  }

  private stepBullets(dt: number): void {
    const h = this.host;
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x > config.layout.width + 60 || b.y < -60 || b.y > config.layout.roomTop) {
        b.active = false;
        continue;
      }
      for (const e of h.enemies) {
        if (!e.alive || e.id === b.lastHit) continue;
        const r = e.stats.radius;
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        if (dx * dx + dy * dy > r * r) continue;
        const crit = h.critChance > 0 && this.rng.next() < h.critChance;
        const dmg = crit ? b.dmg * 2 : b.dmg;
        if (b.kind === 'fire') e.burn = config.effects.burnTurns;
        if (b.kind === 'ice') e.frozen = true;
        if (e.stats.knockback > 0) e.knock(e.stats.knockback);
        h.events.push({ type: 'hit', e, x: b.x, y: b.y, dmg, crit, kind: b.kind });
        h.damage(e, dmg);
        b.lastHit = e.id;
        if (b.pierce > 0) b.pierce--;
        else b.active = false;
        break;
      }
    }
  }
}
