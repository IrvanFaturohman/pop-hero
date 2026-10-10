// Bullet balls that pour out of a popped balloon, spray upward in a fan, then curve into the hero's
// bullet counter. A carried power-up flies out first as one big emblem token. Visual only: timing
// matches Battle.deliver(), which grants the ammo on landing.
import Phaser from 'phaser';
import { easeInQuad } from '../juice/ease';
import type { BalloonType } from '../logic/balloon';
import { powerIconKey } from './gui';
import { tokenCount, tokenDelay } from '../logic/battle';

interface Token {
  img: Phaser.GameObjects.Image;
  active: boolean;
  delay: number;
  t: number;
  dur: number;
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
  /** Display scale (the power-up token is bigger). */
  size: number;
}

const FAN = 0.65; // rad either side of straight up
const RISE_MIN = 170; // px the fan reaches above the burst
const RISE_MAX = 300;

export class TokenFlights {
  private pool: Token[] = [];

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, max = 200) {
    for (let i = 0; i < max; i++) {
      const img = scene.add.image(0, 0, 'ball').setVisible(false);
      layer.add(img);
      this.pool.push({ img, active: false, delay: 0, t: 0, dur: 0.5, x0: 0, y0: 0, cx: 0, cy: 0, x1: 0, y1: 0, size: 1 });
    }
  }

  launch(x: number, y: number, tx: number, ty: number, ammo: number, power: BalloonType = 'normal'): void {
    const n = tokenCount(ammo);
    const first = tokenDelay(0);
    // stars fly to the HUD on their own; every other power-up becomes a shot / heal at the hero
    if (power !== 'normal' && power !== 'star' && power !== 'redstar') {
      const tok = this.pool.find((p) => !p.active);
      if (tok) {
        this.setup(tok, x, y, tx, ty, -Math.PI / 2, RISE_MAX + 40, 0, first);
        tok.img.setTexture(powerIconKey(tok.img.scene, power)).setDepth(1);
        tok.size = 50 / Math.max(tok.img.width, tok.img.height) / 0.6;
      }
    }
    for (let i = 0; i < n; i++) {
      const tok = this.pool.find((p) => !p.active);
      if (!tok) return;
      // spread evenly across the fan with a little jitter
      const a = -Math.PI / 2 + (n > 1 ? (i / (n - 1) - 0.5) * 2 * FAN : 0) + (Math.random() - 0.5) * 0.15;
      const rise = RISE_MIN + Math.random() * (RISE_MAX - RISE_MIN);
      this.setup(tok, x, y, tx, ty, a, rise, tokenDelay(i) - first, first);
      tok.size = 1;
      tok.img.setTexture('ball').setDepth(0);
    }
  }

  private setup(tok: Token, x: number, y: number, tx: number, ty: number, a: number, rise: number, delay: number, dur: number): void {
    tok.active = true;
    tok.delay = delay;
    tok.t = 0;
    tok.dur = dur;
    tok.x0 = x + Math.cos(a) * 12;
    tok.y0 = y + Math.sin(a) * 12;
    tok.cx = x + Math.cos(a) * rise;
    tok.cy = y + Math.sin(a) * rise;
    tok.x1 = tx;
    tok.y1 = ty;
    tok.img.setVisible(false).setPosition(tok.x0, tok.y0).setScale(0.6);
  }

  update(dt: number): void {
    for (const t of this.pool) {
      if (!t.active) continue;
      if (t.delay > 0) {
        t.delay -= dt;
        if (t.delay > 0) continue;
      }
      if (!t.img.visible) t.img.setVisible(true);
      t.t += dt;
      const k = Math.min(1, t.t / t.dur);
      // fast burst out, then accelerate into the counter
      const e = k < 0.45 ? (k / 0.45) * 0.5 : 0.5 + easeInQuad((k - 0.45) / 0.55) * 0.5;
      const u = 1 - e;
      const x = u * u * t.x0 + 2 * u * e * t.cx + e * e * t.x1;
      const y = u * u * t.y0 + 2 * u * e * t.cy + e * e * t.y1;
      t.img.setPosition(x, y).setScale((k < 0.1 ? 0.6 + k * 6 : 1.2 - 0.4 * k) * t.size);
      if (k >= 1) {
        t.active = false;
        t.img.setVisible(false);
      }
    }
  }
}
