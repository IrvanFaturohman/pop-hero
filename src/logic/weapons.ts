// The hero's weapons: one volley per turn (power-up shots first: bombs, then fire / ice bullets,
// then every normal bullet), shaped by the ability cards (damage, crit + Execution, Multishot
// extra shots, Bounce / Ricochet, Knockback stuns). Pure logic.
import { config } from '../config';
import { isBossKind } from '../levels';
import type { AmmoKind, AmmoPool } from './ammo';
import { MAX_BULLETS, type BattleEvent, type Bomb, type Bullet, type HeroMods, type SpecialShot } from './battleTypes';
import type { Enemy } from './enemies';
import { clamp } from './math';
import type { Rng } from './rng';

/** Execution (crit evolution) finishes non-boss enemies below this HP fraction. */
const EXECUTE_BELOW = 0.3;

export interface WeaponHost {
  readonly enemies: Enemy[];
  readonly events: BattleEvent[];
  readonly ammoPool: AmmoPool;
  readonly mods: HeroMods;
  bulletDamage: number;
  target(): Enemy | null;
  damage(e: Enemy, dmg: number): void;
  muzzleX(): number;
  muzzleY(): number;
}

export class Weapons {
  readonly bullets: Bullet[] = [];
  readonly bombs: Bomb[] = [];
  /** Power-up shots waiting for the next volley (the hero view shows them next to the counter). */
  readonly specials: SpecialShot[] = [];
  /** Fire / ice shots of the current volley, fired before the normal bullets. */
  private specialShots: AmmoKind[] = [];
  private firing = false;
  private fireTimer = 0;
  private fireRate = 8;
  private volleyLeft = 0;
  private volley = 0;

  constructor(
    private host: WeaponHost,
    private rng: Rng,
  ) {
    for (let i = 0; i < MAX_BULLETS; i++) {
      this.bullets.push({ active: false, x: 0, y: 0, prevX: 0, prevY: 0, vx: 0, vy: 0, dmg: 1, base: 1, kind: 'normal', bounces: 0, lastHit: -1 });
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
    this.volley++;
    for (const s of this.specials) {
      if (s === 'bomb') this.throwBomb(config.effects.bombDamage);
      else this.specialShots.push(s);
    }
    this.specials.length = 0;
    const shots = (config.debug.infiniteAmmo ? 30 : h.ammoPool.total) + this.specialShots.length;
    if (shots <= 0) {
      if (h.target() && this.bombs.length === 0) h.events.push({ type: 'empty' });
      return;
    }
    const hc = config.hero;
    this.firing = true;
    this.fireTimer = this.bombs.length > 0 ? config.effects.bombFlight * 0.5 : 0;
    this.volleyLeft = shots;
    this.fireRate = clamp((shots * (1 + h.mods.extraShots)) / hc.volleyTime, hc.minFireRate, hc.maxFireRate);
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
      const dmg = Math.round(b.dmg * h.mods.damageMult);
      for (const e of h.enemies) {
        if (!e.alive || Math.hypot(e.x - b.tx, e.y - b.ty) > R + e.stats.radius) continue;
        h.events.push({ type: 'hit', e, x: e.x, y: e.y - e.stats.radius * 0.5, dmg, crit: false, kind: 'normal', exec: false });
        h.damage(e, dmg);
      }
    }
  }

  private stepFire(dt: number): void {
    if (!this.firing) return;
    const h = this.host;
    const t = h.target();
    if (!t || this.volleyLeft <= 0) {
      this.stopFiring();
      return;
    }
    const extra = h.mods.extraShots;
    this.fireTimer -= dt;
    while (this.fireTimer <= 0 && this.volleyLeft > 0) {
      const kind: AmmoKind = this.specialShots.shift() ?? (config.debug.infiniteAmmo && h.ammoPool.total <= 0 ? 'normal' : h.ammoPool.take());
      for (let k = 0; k <= extra; k++) this.fire(t, kind, k);
      this.volleyLeft--;
      this.fireTimer += (1 + extra) / this.fireRate;
    }
    if (this.volleyLeft <= 0) this.stopFiring();
  }

  /** Unfired power-up shots (no target left) wait for the next volley. */
  private stopFiring(): void {
    this.firing = false;
    for (const k of this.specialShots) if (k !== 'normal') this.specials.push(k);
    this.specialShots.length = 0;
  }

  /** Shot k = 0 is the bullet itself; k >= 1 are Multishot extras (weaker, fanned out). */
  private fire(t: Enemy, kind: AmmoKind, k: number): void {
    const b = this.bullets.find((x) => !x.active);
    if (!b) return;
    const h = this.host;
    const mx = h.muzzleX();
    const my = h.muzzleY() + (k > 0 ? (k % 2 === 1 ? -10 : 10) * Math.ceil(k / 2) : 0);
    const dmg = h.bulletDamage * h.mods.damageMult * (k > 0 ? h.mods.extraMult : 1);
    b.active = true;
    b.x = b.prevX = mx;
    b.y = b.prevY = my;
    this.aim(b, t.x, t.y);
    b.dmg = b.base = dmg;
    b.kind = k > 0 ? 'normal' : kind;
    b.bounces = h.mods.bounces;
    b.lastHit = -1;
    h.events.push({ type: 'shoot', x: mx, y: my, kind: b.kind });
  }

  private aim(b: Bullet, tx: number, ty: number): void {
    const sp = config.hero.bulletSpeed;
    const dx = tx - b.x;
    const dy = ty - b.y;
    const len = Math.hypot(dx, dy) || 1;
    b.vx = (dx / len) * sp;
    b.vy = (dy / len) * sp;
  }

  private stepBullets(dt: number): void {
    const h = this.host;
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x > config.layout.width + 60 || b.x < -60 || b.y < -60 || b.y > config.layout.roomTop) {
        b.active = false;
        continue;
      }
      for (const e of h.enemies) {
        if (!e.alive || e.id === b.lastHit) continue;
        const r = e.stats.radius;
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        if (dx * dx + dy * dy > r * r) continue;
        this.hit(b, e);
        break;
      }
    }
  }

  private hit(b: Bullet, e: Enemy): void {
    const h = this.host;
    const m = h.mods;
    const crit = m.critChance > 0 && this.rng.next() < m.critChance;
    let dmg = Math.max(1, Math.round(crit ? b.dmg * m.critMult : b.dmg));
    const boss = isBossKind(e.kind);
    const exec = crit && m.execution && !boss && e.hp - dmg > 0 && e.hp - dmg < e.maxHp * EXECUTE_BELOW;
    if (exec) dmg = e.hp;
    if (b.kind === 'fire') e.burn = config.effects.burnTurns;
    if (b.kind === 'ice') e.frozen = true;
    if (e.stats.knockback > 0) e.knock(e.stats.knockback * (1 + m.stunChance * 3));
    // Knockback: one roll per enemy per volley, small enemies only
    if (m.stunChance > 0 && e.stats.small && e.lastVolley !== this.volley) {
      e.lastVolley = this.volley;
      if (!e.stunned && this.rng.next() < m.stunChance) {
        e.stunned = true;
        h.events.push({ type: 'stun', e });
      }
    }
    h.events.push({ type: 'hit', e, x: b.x, y: b.y, dmg, crit, kind: b.kind, exec });
    h.damage(e, dmg);
    b.lastHit = e.id;
    const next = b.bounces > 0 ? this.bounceTarget(e) : null;
    if (!next) {
      b.active = false;
      return;
    }
    b.bounces--;
    b.dmg = b.base * m.bounceMult;
    this.aim(b, next.x, next.y);
  }

  /** Bounce: the closest other living enemy. */
  private bounceTarget(from: Enemy): Enemy | null {
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const o of this.host.enemies) {
      if (!o.alive || o === from) continue;
      const d = Math.hypot(o.x - from.x, o.y - from.y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }
}
