// Spike visuals: bouncing spiky balls with a motion trail, spinner arms, orbiters with a faint path.
import Phaser from 'phaser';
import { config, hex } from '../config';
import { easeOutBack } from '../juice/ease';
import { Spring } from '../juice/spring';
import { DEG, lerp } from '../logic/math';
import type { Spike, SpikeField } from '../logic/spikes';
import { SPIKE_BALL_TEX } from './texturesChar';

const SHADOW_DX = 6;
const SHADOW_DY = 9;
const SHADOW_ALPHA = 0.3;
const TRAIL = 4;
const TRAIL_EVERY = 0.035;

class SpikeView {
  readonly spike: Spike;
  private main: Phaser.GameObjects.Container;
  private shadow: Phaser.GameObjects.Container;
  private arms: Phaser.GameObjects.Graphics;
  private armsShadow: Phaser.GameObjects.Graphics;
  private balls: Phaser.GameObjects.Image[] = [];
  private ballShadows: Phaser.GameObjects.Image[] = [];
  private path: Phaser.GameObjects.Graphics | null = null;
  private wobble = new Spring(0, 380, 9);
  private builtArms = -1;
  private builtLength = -1;
  private t = Math.random() * 10;
  private trail: Phaser.GameObjects.Image[] = [];
  private trailPos = new Float32Array((TRAIL + 1) * 2);
  private trailT = 0;
  private trailCount = 0;
  private lastBounces = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, spike: Spike) {
    this.spike = spike;
    const d = spike.def;
    if (d.kind === 'orbiter') {
      this.path = scene.add.graphics();
      layer.add(this.path);
      this.drawPath();
    }
    if (d.kind === 'bouncer') {
      for (let i = 0; i < TRAIL; i++) {
        // white motion streak behind the moving spike star (reference look)
        const g = scene.add.image(0, 0, 'p_soft').setTint(0xffffff).setVisible(false);
        layer.add(g);
        this.trail.push(g);
      }
    }
    this.armsShadow = scene.add.graphics();
    this.shadow = scene.add.container(0, 0, [this.armsShadow]).setAlpha(SHADOW_ALPHA);
    this.arms = scene.add.graphics();
    this.main = scene.add.container(0, 0, [this.arms]);
    layer.add(this.shadow);
    layer.add(this.main);
    if (d.kind === 'spinner') {
      const hubS = scene.add.image(0, 0, 'spike_hub').setTintFill(0x000000);
      const hub = scene.add.image(0, 0, 'spike_hub');
      this.shadow.add(hubS);
      this.main.add(hub);
      hub.setDisplaySize(config.spikes.hubRadius * 3, config.spikes.hubRadius * 3);
      hubS.setDisplaySize(config.spikes.hubRadius * 3, config.spikes.hubRadius * 3);
    }
    for (let i = 0; i < 4; i++) {
      const bs = scene.add.image(0, 0, 'spike_ball').setTintFill(0x000000).setVisible(false);
      const b = scene.add.image(0, 0, 'spike_ball').setVisible(false);
      this.shadow.add(bs);
      this.main.add(b);
      this.ballShadows.push(bs);
      this.balls.push(b);
    }
    this.rebuild();
  }

  private drawPath(): void {
    const d = this.spike.def;
    if (d.kind !== 'orbiter' || !this.path) return;
    const g = this.path;
    g.clear();
    g.fillStyle(0xffffff, 0.16);
    const n = 40;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      g.fillCircle(d.cx + Math.cos(a) * d.rx, d.cy + Math.sin(a) * d.ry, 3);
    }
  }

  private rebuild(): void {
    const d = this.spike.def;
    const ballSize = (config.spikes.ballRadius / 18) * SPIKE_BALL_TEX;
    if (d.kind !== 'spinner') {
      this.balls[0].setVisible(true).setDisplaySize(ballSize, ballSize);
      this.ballShadows[0].setVisible(true).setDisplaySize(ballSize, ballSize);
      return;
    }
    const n = this.spike.armCount();
    this.builtArms = n;
    this.builtLength = d.length;
    const L = d.length;
    const body = hex(config.palette.spikeBody);
    const tip = hex(config.palette.spikeTip);
    const g = this.arms;
    const gs = this.armsShadow;
    g.clear();
    gs.clear();
    const th = config.spikes.armHalfThickness;
    for (let i = 0; i < n; i++) {
      const a = ((360 * i) / n) * DEG;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const ex = ca * L;
      const ey = sa * L;
      gs.lineStyle(th * 2 + 6, 0x000000, 1);
      gs.lineBetween(0, 0, ex, ey);
      g.lineStyle(th * 2 + 6, 0xffffff, 1);
      g.lineBetween(0, 0, ex, ey);
      g.lineStyle(th * 2, body, 1);
      g.lineBetween(0, 0, ex, ey);
      // thorns along the arm, alternating sides
      g.fillStyle(tip, 1);
      for (let s = 26, side = 1; s < L - 22; s += 20, side = -side) {
        const bx = ca * s;
        const by = sa * s;
        const px = -sa * side;
        const py = ca * side;
        g.fillTriangle(
          bx - ca * 5 + px * th,
          by - sa * 5 + py * th,
          bx + ca * 5 + px * th,
          by + sa * 5 + py * th,
          bx + px * (th + 8),
          by + py * (th + 8),
        );
      }
      this.balls[i].setVisible(true).setPosition(ex, ey).setDisplaySize(ballSize, ballSize);
      this.ballShadows[i].setVisible(true).setPosition(ex, ey).setDisplaySize(ballSize, ballSize);
    }
    for (let i = n; i < 4; i++) {
      this.balls[i].setVisible(false);
      this.ballShadows[i].setVisible(false);
    }
  }

  hit(): void {
    this.wobble.kick(4);
  }

  /** Fading streak behind a moving ball (readability: shows where it is heading). */
  private updateTrail(x: number, y: number, dt: number, scale: number): void {
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = TRAIL_EVERY;
      for (let i = Math.min(this.trailCount, TRAIL) * 2 + 1; i >= 2; i--) this.trailPos[i] = this.trailPos[i - 2];
      this.trailPos[0] = x;
      this.trailPos[1] = y;
      this.trailCount = Math.min(this.trailCount + 1, TRAIL + 1);
    }
    const size = config.spikes.ballRadius * 2.4 * scale;
    for (let i = 0; i < TRAIL; i++) {
      const g = this.trail[i];
      const idx = i + 1;
      if (idx >= this.trailCount) {
        g.setVisible(false);
        continue;
      }
      const k = 1 - idx / (TRAIL + 1);
      g.setVisible(true)
        .setPosition(this.trailPos[idx * 2], this.trailPos[idx * 2 + 1])
        .setDisplaySize(size * (0.5 + 0.5 * k), size * (0.5 + 0.5 * k))
        .setAlpha(0.35 * k);
    }
  }

  update(alpha: number, dt: number): void {
    this.t += dt;
    const s = this.spike;
    const d = s.def;
    const w = this.wobble.update(dt);
    const grow = s.growDir < 0 ? s.grow * s.grow : easeOutBack(s.grow, 2);
    const scale = Math.max(0.001, grow + w * 0.05);
    const angle = lerp(s.prevAngle, s.angle, alpha);
    const spin = this.t * 2.2;
    if (d.kind === 'spinner') {
      if (this.builtArms !== s.armCount() || this.builtLength !== d.length) this.rebuild();
      const extra = s.growDir > 0 ? (1 - s.grow) * Math.PI : 0;
      const rot = angle * DEG - extra + w * 0.03;
      this.main.setPosition(d.px, d.py).setRotation(rot).setScale(scale);
      this.shadow.setPosition(d.px + SHADOW_DX, d.py + SHADOW_DY).setRotation(rot).setScale(scale);
      for (let i = 0; i < 4; i++) {
        this.balls[i].rotation = spin;
        this.ballShadows[i].rotation = spin;
      }
    } else {
      let x: number;
      let y: number;
      if (d.kind === 'bouncer') {
        x = lerp(s.prevX, s.bx, alpha);
        y = lerp(s.prevY, s.by, alpha);
        if (s.bounces !== this.lastBounces) {
          this.lastBounces = s.bounces;
          this.wobble.kick(5);
        }
        this.updateTrail(x, y, dt, scale);
      } else {
        const a = angle * DEG;
        x = d.cx + Math.cos(a) * d.rx;
        y = d.cy + Math.sin(a) * d.ry;
      }
      this.main.setPosition(x, y).setScale(scale).setRotation(0);
      this.shadow.setPosition(x + SHADOW_DX, y + SHADOW_DY).setScale(scale).setRotation(0);
      this.balls[0].rotation = spin;
      this.ballShadows[0].rotation = spin;
      this.path?.setAlpha(Math.min(1, s.grow));
    }
  }

  destroy(): void {
    this.main.destroy();
    this.shadow.destroy();
    this.path?.destroy();
    for (const g of this.trail) g.destroy();
  }
}

/** Keeps one SpikeView per live Spike in the field (including ones shrinking away). */
export class SpikeLayerView {
  private views = new Map<Spike, SpikeView>();
  private seen = new Set<Spike>();

  constructor(
    private scene: Phaser.Scene,
    private layer: Phaser.GameObjects.Layer,
  ) {}

  update(field: SpikeField, alpha: number, dt: number): void {
    this.seen.clear();
    const visible = field.enabled;
    for (const s of field.spikes) this.sync(s, alpha, dt, visible);
    for (const s of field.outgoing) this.sync(s, alpha, dt, visible);
    for (const [s, v] of this.views) {
      if (!this.seen.has(s)) {
        v.destroy();
        this.views.delete(s);
      }
    }
    this.layer.setVisible(visible);
  }

  /** Wobble the spike that hit a balloon. */
  hit(field: SpikeField, index: number): void {
    const s = field.spikes[index];
    if (s) this.views.get(s)?.hit();
  }

  private sync(s: Spike, alpha: number, dt: number, visible: boolean): void {
    if (s.dead) return;
    this.seen.add(s);
    let v = this.views.get(s);
    if (!v) {
      v = new SpikeView(this.scene, this.layer, s);
      this.views.set(s, v);
    }
    if (visible) v.update(alpha, dt);
  }
}
