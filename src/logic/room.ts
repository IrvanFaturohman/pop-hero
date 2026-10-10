// The balloon room: tap -> balloon appears at the finger, inflates and can be dragged (spikes pop
// it) -> release -> it floats up (spikes still pop it; flying through a power-up picks it up),
// joins the group pushing the gold chain (now safe: spikes glance off it) and counts toward the
// lock -> lock opens -> chain snaps -> balloons escape upward and burst over the hero.
// Pure logic. Emits events that the scene turns into visuals/sound.
import { config } from '../config';
import { Balloon, bonusAmount, tierFor, type BalloonMods, type BalloonType } from './balloon';
import { clamp01 } from './math';
import type { Rng } from './rng';
import { Claw, clawPoint } from './claw';
import { BalloonPhysics, shoveSpikes } from './physics';
import { PowerUpField, type PowerKind } from './powerups';
import { SpikeField, closest, type SpikePattern } from './spikes';

export type PopCause = 'spikeGrow' | 'spikeFly' | 'overinflate';

export type RoomEvent =
  | { type: 'spawn'; b: Balloon }
  /** A flying balloon picked up a power-up (isNew: first of its kind this run). */
  | { type: 'powerUp'; b: Balloon; kind: PowerKind; x: number; y: number; isNew: boolean }
  /** A bouncing spike glanced off a gathered (safe) balloon. */
  | { type: 'deflect'; b: Balloon; x: number; y: number }
  | { type: 'blowStart'; b: Balloon }
  | { type: 'blowStop'; b: Balloon }
  | { type: 'ammoTick'; b: Balloon; ammo: number }
  | { type: 'tierUp'; b: Balloon; tier: number }
  | { type: 'release'; b: Balloon }
  /** Reached the top: payout locked, it joins the gathered balloons and counts toward the lock. */
  | { type: 'park'; b: Balloon; total: number; perfect: number; greedy: number; lockLeft: number }
  /** The gathered balloons reached the lock number. */
  | { type: 'unlock' }
  /** The chain snapped: the gathered balloons escape upward. */
  | { type: 'snap' }
  /** An escaping balloon bursts over the hero into bullets. */
  | { type: 'arrive'; b: Balloon; total: number }
  /** Lock not opened: a gathered balloon drifts away empty. */
  | { type: 'flyAway'; b: Balloon }
  | { type: 'nearMiss'; b: Balloon; x: number; y: number; bonus: number }
  | { type: 'pop'; b: Balloon; cause: PopCause; lost: number; spike: number; x: number; y: number }
  | { type: 'ghost'; b: Balloon; x: number; y: number }
  | { type: 'shield'; b: Balloon; x: number; y: number }
  | { type: 'patternSwap'; pattern: SpikePattern };

export interface RoomInput {
  held: boolean;
  /** Press edge this step. */
  pressed: boolean;
  /** Release edge this step (a real finger lift, not a cancel). */
  released: boolean;
  /** Finger position in game coords (where a new balloon appears). */
  x: number;
  y: number;
}

/** True if (x, y) is inside the balloon room (taps elsewhere do not spawn balloons). */
export function inRoom(x: number, y: number): boolean {
  const L = config.layout;
  return x >= L.roomLeft && x <= L.roomRight && y >= L.ropeY + 10 && y <= L.roomBottom;
}

export interface RoomMods extends BalloonMods {
  /** Thick Rubber layers per balloon. */
  shields: number;
  /** Greedy stacks (+25% ammo each for tier 3+). */
  greedy: number;
  /** Near-Miss Pro: extra ammo per CLOSE!. */
  nearMissExtra: number;
}

export interface RoomCheats {
  noPop: boolean;
}

export interface RoomStats {
  blown: number;
  arrived: number;
  popGrow: number;
  popFly: number;
  popOver: number;
  releaseAirs: number[];
  close: number;
  perfect: number;
  powerUps: number;
}

export const newRoomStats = (): RoomStats => ({
  blown: 0,
  arrived: 0,
  popGrow: 0,
  popFly: 0,
  popOver: 0,
  releaseAirs: [],
  close: 0,
  perfect: 0,
  powerUps: 0,
});

export class BalloonRoom {
  readonly field = new SpikeField();
  readonly physics = new BalloonPhysics();
  readonly mods: RoomMods = { inflateMult: 1, rMaxMult: 1, ammoMult: 1, shields: 0, greedy: 0, nearMissExtra: 0 };
  /** Digger Mole claw (boss wave only). */
  readonly claw = new Claw();
  readonly cheats: RoomCheats = { noPop: false };
  readonly events: RoomEvent[] = [];
  readonly flying: Balloon[] = [];
  stats = newRoomStats();
  attached: Balloon | null = null;
  readonly powerUps = new PowerUpField();
  readonly seenPowers = new Set<PowerKind>();
  /** Cooldown before the next balloon can be blown (s). */
  spawnTimer = 0;
  /** Turn gate: a new balloon may only appear while armed. */
  armed = true;
  /** This turn's lock: gathered balloons must add up to `lockTarget` to open it. */
  lockTarget = 0;
  lockLeft = 0;
  holdValid = false;
  blowing = false;
  protectedLeft = 0;
  private heldNow = false;
  private lastTint = 0;
  private rng: Rng;

  constructor(rng: Rng) {
    this.rng = rng;
  }

  /** Clears events; call after the scene has consumed them. */
  drain(): void {
    this.events.length = 0;
  }

  requestPattern(p: SpikePattern, immediate = false): void {
    if (immediate || !this.field.pattern) {
      this.field.setPattern(p, !immediate);
      this.events.push({ type: 'patternSwap', pattern: p });
    } else {
      this.field.pending = p;
    }
  }

  /** Power-up kinds that can spawn this wave (takes effect on the next turn). */
  setTypePool(types: readonly BalloonType[]): void {
    this.powerUps.setPool(types);
  }

  step(dt: number, input: RoomInput): void {
    for (let i = this.flying.length - 1; i >= 0; i--) {
      if (this.flying[i].state === 'done') this.flying.splice(i, 1);
    }
    this.attached?.savePrev();
    for (const b of this.flying) b.savePrev();

    this.heldNow = input.held;
    this.field.step(dt);
    this.powerUps.step(dt);
    this.claw.step(dt);
    if (this.claw.active) for (const s of this.field.spikes) this.claw.bounce(s);
    if (input.pressed) this.holdValid = true;

    // Pattern swaps wait until no balloon is inflating or still rising through the room.
    if (this.field.pending && this.canSwap()) {
      const p = this.field.pending;
      this.field.setPattern(p, true);
      this.events.push({ type: 'patternSwap', pattern: p });
    }
    this.spawnTimer -= dt;
    const swapBlocked = this.field.pending !== null;
    const canSpawn = this.armed && !this.attached && !swapBlocked && this.spawnTimer <= 0;
    if (canSpawn && input.held && this.holdValid && inRoom(input.x, input.y)) {
      this.spawn(input.x, input.y);
    }

    const a = this.attached;
    if (a) {
      if (input.released && a.air > 0) this.release(a);
      else {
        if (input.held) {
          a.targetX = input.x;
          a.targetY = input.y;
        }
        a.follow(dt);
        this.stepAttached(a, dt, input.held);
      }
    }
    this.physics.step(this.flying, this.attached, dt, this.claw);
    const burstY = config.layout.burstY;
    for (const b of this.flying) {
      if (b.state === 'flying') this.stepFlying(b, dt);
      if (b.state === 'flying' && (this.physics.joined(b, this.flying) || b.flyT > config.balloon.stuckTime)) this.park(b);
      else if (b.state === 'escaping' && b.y < burstY) {
        b.state = 'done';
        this.events.push({ type: 'arrive', b, total: b.payout ? b.payout.total : b.total });
      }
    }
    if (this.attached) this.checkSpikes(this.attached);
    shoveSpikes(this.field, this.flying, (b, x, y) => this.events.push({ type: 'deflect', b, x, y }));
  }

  /** Rising balloon: spikes can still pop it; the first power-up it touches rides along. */
  private stepFlying(b: Balloon, dt: number): void {
    b.flyT += dt;
    this.checkSpikes(b);
    if (b.state !== 'flying' || b.type !== 'normal') return;
    const p = this.powerUps.take(b);
    if (!p) return;
    b.type = p.kind;
    this.stats.powerUps++;
    const isNew = !this.seenPowers.has(p.kind);
    this.seenPowers.add(p.kind);
    this.events.push({ type: 'powerUp', b, kind: p.kind, x: p.x, y: p.y, isNew });
  }

  /** Lock open: the chain snaps and every gathered balloon escapes upward. */
  snap(): void {
    this.physics.rope.snap();
    for (const b of this.flying) {
      if (b.state !== 'parked') continue;
      b.state = 'escaping';
      b.vy -= 250;
    }
    this.events.push({ type: 'snap' });
  }

  /** Balloons still flying up after the snap. */
  escaping(): boolean {
    for (const b of this.flying) if (b.state === 'escaping') return true;
    return false;
  }

  /** New turn: a fresh chain with this lock number drops in, and a fresh set of power-ups. */
  setLock(n: number): void {
    this.lockTarget = n;
    this.lockLeft = n;
    this.physics.rope.reset();
    this.powerUps.refill(this.rng);
  }

  get lockOpen(): boolean {
    return this.lockTarget > 0 && this.lockLeft <= 0;
  }

  /** Lock not opened: the gathered balloons drift away empty. */
  releaseGathered(): void {
    for (const b of this.flying) {
      if (b.state !== 'parked') continue;
      b.state = 'done';
      this.events.push({ type: 'flyAway', b });
    }
  }

  canSwap(): boolean {
    return !this.attached && !this.anyInRoom();
  }

  /** A balloon is being blown or is still in the air (hanging ones don't count). */
  busy(): boolean {
    return this.attached !== null || this.anyInRoom();
  }

  /** True while a released balloon is still rising through the room (spikes can pop it). */
  anyInRoom(): boolean {
    for (const b of this.flying) if (b.state === 'flying') return true;
    return false;
  }

  private stepAttached(a: Balloon, dt: number, held: boolean): void {
    a.spawnT += dt;
    if (a.invuln > 0) a.invuln -= dt;
    const wantBlow = held && this.holdValid;
    this.setBlowing(wantBlow, a);
    if (!wantBlow) return;

    const prevAmmo = a.ammo;
    if (a.air < 1) {
      a.setAir(a.air + config.balloon.inflateRate * this.mods.inflateMult * dt, this.mods);
    } else {
      a.strain += dt;
      if (a.strain >= config.balloon.overinflateTime && !this.cheats.noPop && !a.protected) {
        this.pop(a, 'overinflate', -1);
        return;
      }
    }
    if (a.ammo !== prevAmmo) this.events.push({ type: 'ammoTick', b: a, ammo: a.total });
    this.updateTier(a);
  }

  private checkSpikes(b: Balloon): void {
    let c = this.field.clearance(b.x, b.y);
    let spikeIndex = this.field.lastIndex;
    const cc = this.claw.clearance(b.x, b.y);
    if (cc < c) {
      c = cc;
      closest.x = clawPoint.x;
      closest.y = clawPoint.y;
      spikeIndex = -1;
    }
    const vis = c - b.r;
    b.clearance = vis;
    b.danger = clamp01(1 - vis / config.bonus.dangerDistance);
    if (c - b.hitR < 0) {
      if (b.invuln > 0) return;
      if (b.attached && b.spawnT < config.balloon.spawnGrace) return;
      if (this.cheats.noPop || b.protected) {
        if (!b.ghosting) {
          b.ghosting = true;
          b.nearAwarded = true;
          this.events.push({ type: 'ghost', b, x: closest.x, y: closest.y });
        }
        return;
      }
      if (b.shield > 0) {
        b.shield--;
        b.invuln = 0.35;
        this.events.push({ type: 'shield', b, x: closest.x, y: closest.y });
        return;
      }
      this.pop(b, b.attached ? 'spikeGrow' : 'spikeFly', spikeIndex);
      return;
    }
    b.ghosting = false;
    if (b.nearAwarded) return;
    if (vis < config.bonus.nearMissDistance) {
      b.nearInZone = true;
      b.nearX = closest.x;
      b.nearY = closest.y;
    } else if (b.nearInZone) {
      b.nearInZone = false;
      b.nearAwarded = true;
      const bonus = bonusAmount(b.ammo, config.bonus.nearMissBonus) + this.mods.nearMissExtra;
      b.bonus += bonus;
      this.stats.close++;
      this.events.push({ type: 'nearMiss', b, x: b.nearX, y: b.nearY, bonus });
      this.updateTier(b);
    }
  }

  private updateTier(b: Balloon): void {
    const t = tierFor(b.total);
    if (t > b.tier) {
      b.tier = t;
      this.events.push({ type: 'tierUp', b, tier: t });
    }
  }

  private setBlowing(v: boolean, b: Balloon): void {
    if (v === this.blowing) return;
    this.blowing = v;
    this.events.push({ type: v ? 'blowStart' : 'blowStop', b });
  }

  private release(a: Balloon): void {
    this.setBlowing(false, a);
    a.launch();
    this.flying.push(a);
    this.attached = null;
    this.spawnTimer = config.spawn.cooldownAfterRelease;
    this.stats.releaseAirs.push(a.air);
    this.events.push({ type: 'release', b: a });
  }

  /** Reached the top: lock the payout, join the gathered balloons, count toward the lock. */
  private park(b: Balloon): void {
    const perfect = b.releaseAir >= config.bonus.perfectThreshold ? bonusAmount(b.ammo, config.bonus.perfectBonus) : 0;
    const greedy = b.tier >= 3 ? bonusAmount(b.ammo, 0.25 * this.mods.greedy) : 0;
    const total = b.total + perfect + greedy;
    b.payout = { total, perfect, greedy };
    b.state = 'parked';
    b.danger = 0;
    this.stats.arrived++;
    if (perfect > 0) this.stats.perfect++;
    const wasClosed = this.lockLeft > 0;
    this.lockLeft = Math.max(0, this.lockLeft - total);
    this.events.push({ type: 'park', b, total, perfect, greedy, lockLeft: this.lockLeft });
    if (wasClosed && this.lockLeft <= 0) this.events.push({ type: 'unlock' });
  }

  private pop(b: Balloon, cause: PopCause, spike: number): void {
    const wasAttached = b === this.attached;
    b.state = 'done';
    if (cause === 'spikeGrow') this.stats.popGrow++;
    else if (cause === 'spikeFly') this.stats.popFly++;
    else this.stats.popOver++;
    this.events.push({ type: 'pop', b, cause, lost: b.total, spike, x: closest.x, y: closest.y });
    if (!wasAttached) return;
    this.setBlowing(false, b);
    this.attached = null;
    this.spawnTimer = config.spawn.cooldownAfterPop;
    if (this.heldNow && config.spawn.requireFreshPressAfterPop) this.holdValid = false;
  }

  private spawn(x: number, y: number): void {
    const b = new Balloon('normal', x, y);
    // colorful: a different color than the previous balloon
    const nColors = config.palette.balloonColors.length;
    b.tint = (this.lastTint + 1 + this.rng.int(0, nColors - 2)) % nColors;
    this.lastTint = b.tint;
    b.setAir(0, this.mods);
    this.stats.blown++;
    if (this.protectedLeft > 0) {
      b.protected = true;
      this.protectedLeft--;
    }
    b.shield = this.mods.shields;
    this.attached = b;
    this.events.push({ type: 'spawn', b });
  }
}
