// Balloon visual: gradient body, specular highlight, knot, string, tier glow, danger glow, and the
// bullets inside as balls (no number: one ball = one bullet).
import Phaser from 'phaser';
import { FIXED_DT, config, hex } from '../config';
import { easeOutBack, easeOutElastic, easeOutQuad } from '../juice/ease';
import { Spring } from '../juice/spring';
import type { Balloon, BalloonType } from '../logic/balloon';
import { clamp01, lerp } from '../logic/math';
import { hsv } from './color';
import { powerIconKey } from './gui';
import { balloonColor, balloonTexKey } from './textures';

const TRAIL_EVERY = 0.03;
const STRING_SEGS = 9;

export class BalloonView {
  id = -1;
  private c: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Image;
  private lighten: Phaser.GameObjects.Image;
  private flashDisk: Phaser.GameObjects.Image;
  private hl: Phaser.GameObjects.Image;
  private knot: Phaser.GameObjects.Image;
  private lines: Phaser.GameObjects.Graphics;
  private badge: Phaser.GameObjects.Image;
  /** Emblem of the power-up the balloon carries (fire / ice / bomb / heal / star). */
  private emblem: Phaser.GameObjects.Image;
  private power: BalloonType = 'normal';
  private safeT = 0;
  /** Bullet balls visible inside the balloon (more air = more balls). */
  private balls: Phaser.GameObjects.Image[] = [];
  private ballAge: Float32Array;
  private string: Phaser.GameObjects.Graphics;
  private ghosts: Phaser.GameObjects.Image[] = [];
  private trail = new Float32Array(16);
  private trailCount = 0;
  private trailT = 0;
  private squash = new Spring(0, 260, 9);
  private punchT = 1;
  private releaseT = -1;
  private flashT = 0;
  private flashDur = 0.08;
  private whip = 0;
  private t = 0;
  private tier = 1;
  private lean = 0;
  private solid = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    for (let i = 0; i < config.juice.trailGhosts; i++) {
      const g = scene.add.image(0, 0, 'balloon_n0').setVisible(false);
      layer.add(g);
      this.ghosts.push(g);
    }
    this.string = scene.add.graphics();
    layer.add(this.string);
    this.body = scene.add.image(0, 0, 'balloon_n0');
    this.lighten = scene.add.image(0, 0, 'disk').setAlpha(0);
    this.flashDisk = scene.add.image(0, 0, 'disk').setAlpha(0);
    this.hl = scene.add.image(0, 0, 'balloon_hl').setRotation(-0.55);
    this.knot = scene.add.image(0, 0, 'knot');
    this.lines = scene.add.graphics();
    this.badge = scene.add.image(0, 0, 'badge_star').setVisible(false);
    this.emblem = scene.add.image(0, 0, 'emb_fire').setVisible(false);
    const nBalls = config.juice.innerBalls;
    for (let i = 0; i < nBalls; i++) this.balls.push(scene.add.image(0, 0, 'ball').setVisible(false));
    this.ballAge = new Float32Array(nBalls);
    this.c = scene.add.container(0, 0, [this.knot, this.body, this.lighten, ...this.balls, this.hl, this.lines, this.flashDisk, this.emblem, this.badge]);
    this.c.setVisible(false);
    layer.add(this.c);
  }

  bind(b: Balloon): void {
    this.id = b.id;
    // the skin keeps the balloon's own color; a power-up shows as emblem + special ball inside
    const key = balloonTexKey('normal', b.tint);
    this.body.setTexture(key);
    for (const g of this.ghosts) g.setTexture(key);
    this.setPower(b.type);
    this.safeT = 0;
    const col = balloonColor('normal', b.tint);
    this.knot.setTint(col);
    this.squash.snap(0);
    this.punchT = 1;
    this.releaseT = -1;
    this.flashT = 0;
    this.whip = 0;
    this.trailCount = 0;
    this.tier = 1;
    this.lean = 0;
    this.solid = 0;
    this.ballAge.fill(-1);
    for (const ball of this.balls) ball.setVisible(false);
    this.c.setVisible(true);
  }

  unbind(): void {
    this.id = -1;
    this.c.setVisible(false);
    this.string.clear();
    for (const g of this.ghosts) g.setVisible(false);
  }

  onAmmoTick(): void {
    this.punchT = 0;
    this.squash.kick(0.9);
  }

  onTierUp(tier: number): void {
    this.tier = tier;
    this.flashT = this.flashDur = config.juice.flash.tierUp;
    this.squash.kick(2.2);
  }

  onRelease(): void {
    this.releaseT = 0;
    this.whip = 1;
  }

  onNearMiss(): void {
    this.squash.kick(-1.5);
  }

  onGhost(): void {
    this.flashT = this.flashDur = 0.12;
  }

  /** Flew through a power-up: it pops into the balloon. */
  onPowerUp(): void {
    this.flashT = this.flashDur = 0.16;
    this.squash.kick(2.6);
    this.punchT = 0;
  }

  /** A spike glanced off this gathered balloon. */
  onDeflect(): void {
    this.flashT = this.flashDur = 0.1;
    this.squash.kick(-1.2);
  }

  private setPower(kind: BalloonType): void {
    this.power = kind;
    this.emblem.setVisible(kind !== 'normal');
    if (kind !== 'normal') this.emblem.setTexture(powerIconKey(this.emblem.scene, kind));
  }

  /** Freeze-frame before bursting: white flash + slight swell, then hide (real time). */
  private dying = 0;

  startDying(duration: number): void {
    this.dying = duration;
    this.flashDisk.setAlpha(0.9);
    this.lines.clear();
    this.c.setScale(this.c.scaleX * 1.06, this.c.scaleY * 1.06);
  }

  /** Returns false once the view has been released. */
  updateDying(realDt: number): boolean {
    this.dying -= realDt;
    if (this.dying > 0) return true;
    this.unbind();
    return false;
  }

  update(b: Balloon, alpha: number, dt: number): void {
    this.t += dt;
    const bc = config.balloon;
    const r = lerp(b.prevR, b.r, alpha);
    let x = lerp(b.prevX, b.x, alpha);
    let y = lerp(b.prevY, b.y, alpha);

    // squash & stretch
    let sx = 1;
    let sy = 1;
    const ra = config.juice.releaseAnim;
    if (this.releaseT >= 0) {
      this.releaseT += dt;
      const t = this.releaseT;
      if (t < ra.squashTime) {
        const k = easeOutQuad(t / ra.squashTime);
        sx = lerp(1, 1.2, k);
        sy = lerp(1, 0.75, k);
      } else if (t < ra.squashTime + ra.stretchTime) {
        const k = easeOutQuad((t - ra.squashTime) / ra.stretchTime);
        sx = lerp(1.2, 0.85, k);
        sy = lerp(0.75, 1.2, k);
      } else {
        const k = easeOutElastic(clamp01((t - ra.squashTime - ra.stretchTime) / ra.settleTime));
        sx = lerp(0.85, 1, k);
        sy = lerp(1.2, 1, k);
        if (k >= 1 && t > ra.squashTime + ra.stretchTime + ra.settleTime) this.releaseT = -1;
      }
    } else {
      const s = this.squash.update(dt);
      sx = 1 + s * 0.06;
      sy = 1 - s * 0.06;
    }

    // pop-in at the tap point
    let spawnS = 1;
    if (b.attached && b.spawnT < bc.spawnTime) spawnS = Math.max(0.01, easeOutBack(clamp01(b.spawnT / bc.spawnTime), 2.2));

    // strain jitter + thinning skin
    const strainK = clamp01((b.air - bc.strainStart) / (1 - bc.strainStart));
    const strainProg = clamp01(b.strain / bc.overinflateTime);
    if (b.attached && strainK > 0) {
      const j = 4 * strainK + 3 * strainProg;
      x += (Math.random() * 2 - 1) * j;
      y += (Math.random() * 2 - 1) * j * 0.6;
    }

    // lean into the drag direction while held
    const vx = b.attached ? (b.x - b.prevX) / FIXED_DT : 0;
    const lean = Math.max(-0.3, Math.min(0.3, vx * 0.0006));
    this.lean += (lean - this.lean) * Math.min(1, dt * 12);

    this.c.setPosition(x, y).setRotation(this.lean);
    this.c.setScale(sx * spawnS, sy * spawnS);

    // body
    const d = r * 2;
    // translucent while being blown, solid once released (reference look)
    this.solid += ((b.attached ? 0 : 1) - this.solid) * Math.min(1, dt * 10);
    this.body.setDisplaySize(d, d).setAlpha(lerp(0.72, 1, this.solid) - 0.1 * strainK);
    this.lighten.setDisplaySize(d, d).setAlpha(0.28 * b.air + 0.18 * strainK);
    this.hl.setPosition(-r * 0.36, -r * 0.42).setDisplaySize(r * 0.7, r * 0.4).setAlpha(0.9);
    const kw = Math.max(16, Math.min(30, r * 0.22));
    this.knot.setPosition(0, r - kw * 0.12).setDisplaySize(kw, kw * 0.75);

    if (this.flashT > 0) this.flashT = Math.max(0, this.flashT - dt);
    this.flashDisk.setDisplaySize(d, d).setAlpha(this.flashT > 0 ? 0.3 + 0.6 * (this.flashT / this.flashDur) : 0);

    // bullets inside
    if (b.type !== this.power) this.setPower(b.type);
    const pa = config.juice.ammoPunch;
    this.punchT += dt;
    const punch = this.punchT < pa.time ? lerp(pa.scale, 1, easeOutQuad(this.punchT / pa.time)) : 1;
    this.updateBalls(b, r, dt, punch);
    if (this.emblem.visible) {
      const es = Math.max(30, r * 0.55) * (this.punchT < 0.2 ? lerp(1.6, 1, easeOutQuad(this.punchT / 0.2)) : 1);
      this.emblem.setPosition(0, -r * 0.58).setDisplaySize(es, es).setAngle(Math.sin(this.t * 4) * 8);
    }

    // badge
    const tier = Math.max(this.tier, b.tier);
    if (tier >= 2) {
      const bs = Math.max(26, Math.min(56, r * 0.4));
      this.badge.setVisible(true).setPosition(r * 0.62, -r * 0.66).setDisplaySize(bs, bs);
      this.badge.setAngle(Math.sin(this.t * 3) * 10);
      this.badge.setTint(tier === 2 ? 0xffffff : tier === 3 ? hex(config.palette.gold) : hsv((this.t * 0.6) % 1, 0.6, 1));
    } else this.badge.setVisible(false);

    this.safeT = b.state === 'parked' ? this.safeT + dt : 0;
    this.drawLines(r, b.danger, tier);
    this.updateString(b, x, y, r * sy, dt);
    this.updateTrail(b, x, y, r, dt);
  }

  private drawLines(r: number, danger: number, tier: number): void {
    const g = this.lines;
    g.clear();
    if (tier === 2) {
      g.lineStyle(5, 0xffffff, 0.9);
      g.strokeCircle(0, 0, r + 6);
    } else if (tier === 3) {
      g.lineStyle(12, hex(config.palette.gold), 0.3);
      g.strokeCircle(0, 0, r + 7);
      g.lineStyle(6, hex(config.palette.gold), 1);
      g.strokeCircle(0, 0, r + 5);
    } else if (tier >= 4) {
      const n = 18;
      for (let i = 0; i < n; i++) {
        g.lineStyle(7, hsv((i / n + this.t * 0.5) % 1, 0.75, 1), 1);
        const a0 = (i / n) * Math.PI * 2;
        g.beginPath();
        g.arc(0, 0, r + 6, a0, a0 + (Math.PI * 2) / n + 0.02);
        g.strokePath();
      }
    }
    // thick dark outline, like the Layer Lab art
    g.lineStyle(Math.max(4, Math.min(7, r * 0.06)), hex(config.palette.outline), 1);
    g.strokeCircle(0, 0, r);
    // gathered under the chain = safe: a shield shimmer that flares in when it joins
    if (this.safeT > 0) {
      const flare = Math.max(0, 1 - this.safeT / 0.35);
      g.lineStyle(5 + flare * 8, hex(config.palette.shield), 0.45 + 0.15 * Math.sin(this.t * 5) + flare * 0.4);
      g.strokeCircle(0, 0, r + 3 + flare * 6);
    }
    if (danger > 0.01) {
      const red = hex(config.palette.danger);
      g.lineStyle(14, red, danger * 0.35);
      g.strokeCircle(0, 0, r + 4);
      g.lineStyle(6, red, danger);
      g.strokeCircle(0, 0, r - 2);
    }
  }

  /**
   * Golden-angle spiral sized for a full balloon (ammoMax), so balls fill it evenly and keep their
   * spot as more appear (bonuses beyond that spread it a bit). Balls are the only ammo readout, so
   * they stay big; a bullet gained punches them all.
   */
  private updateBalls(b: Balloon, r: number, dt: number, punch: number): void {
    const n = this.balls.length;
    const visible = Math.min(n, b.shown);
    const size = Math.max(12, Math.min(40, r * 0.3)) * punch;
    const spread = r * 0.72;
    const cap = Math.max(config.balloon.ammoMax, visible);
    for (let i = 0; i < n; i++) {
      const ball = this.balls[i];
      if (i >= visible) {
        if (this.ballAge[i] >= 0) ball.setVisible(false);
        this.ballAge[i] = -1;
        continue;
      }
      if (this.ballAge[i] < 0) this.ballAge[i] = 0;
      this.ballAge[i] += dt;
      const pop = Math.min(1, this.ballAge[i] / 0.12);
      const rr = Math.sqrt((i + 0.5) / cap) * spread;
      const a = i * 2.39996;
      const jx = Math.sin(this.t * 6 + i * 1.7) * size * 0.12;
      const jy = Math.cos(this.t * 5 + i * 2.3) * size * 0.12;
      // the power-up's special shot: one big glowing ball in its color
      const special = this.power !== 'normal' && i === Math.min(1, visible - 1);
      const s = size * pop * (special ? 1.8 : 1);
      ball.setVisible(true).setPosition(Math.cos(a) * rr + jx, Math.sin(a) * rr + jy).setDisplaySize(s, s);
      if (special) ball.setTint(balloonColor(this.power));
      else ball.clearTint();
    }
  }

  private updateString(b: Balloon, x: number, y: number, ry: number, dt: number): void {
    const g = this.string;
    g.clear();
    if (b.attached) return;
    if (b.state === 'parked' || b.state === 'escaping') return;
    this.whip *= Math.exp(-5 * dt);
    const len = 36 + ry * 0.35;
    const amp = 4 + this.whip * 24;
    g.lineStyle(3, hex(config.palette.outline), 0.9);
    g.beginPath();
    let px = x;
    let py = y + ry + 4;
    g.moveTo(px, py);
    for (let i = 1; i <= STRING_SEGS; i++) {
      const k = i / STRING_SEGS;
      px = x + Math.sin(this.t * 11 - i * 0.9) * amp * k;
      py = y + ry + 4 + len * k;
      g.lineTo(px, py);
    }
    g.strokePath();
  }

  private updateTrail(b: Balloon, x: number, y: number, r: number, dt: number): void {
    const n = this.ghosts.length;
    if (b.state !== 'flying') {
      for (const g of this.ghosts) g.setVisible(false);
      this.trailCount = 0;
      return;
    }
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = TRAIL_EVERY;
      for (let i = Math.min(this.trailCount, n) * 2 + 1; i >= 2; i--) this.trail[i] = this.trail[i - 2];
      this.trail[0] = x;
      this.trail[1] = y;
      this.trailCount = Math.min(this.trailCount + 1, n + 1);
    }
    for (let i = 0; i < n; i++) {
      const g = this.ghosts[i];
      const idx = i + 1;
      if (idx >= this.trailCount) {
        g.setVisible(false);
        continue;
      }
      const k = 1 - idx / (n + 1);
      g.setVisible(true)
        .setPosition(this.trail[idx * 2], this.trail[idx * 2 + 1])
        .setDisplaySize(r * 2 * (0.75 + 0.25 * k), r * 2 * (0.75 + 0.25 * k))
        .setAlpha(0.3 * k);
    }
  }
}
