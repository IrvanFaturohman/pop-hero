// Draws the gold chain from the physics rope: outline + gold line + links along the curve. As the
// gathered balloons get close to the lock number the chain glows and trembles (it is about to
// snap); once snapped the two halves are drawn apart.
import Phaser from 'phaser';
import { config, hex } from '../config';
import type { Rope } from '../logic/rope';
import { clamp01 } from '../logic/math';
import { shade } from './color';

export class RopeView {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.g = scene.add.graphics();
    layer.add(this.g);
  }

  /** strain 0..1 = how close the gathered balloons are to the lock number. */
  draw(rope: Rope, strain: number, dt: number): void {
    this.t += dt;
    const g = this.g;
    g.clear();
    const s = clamp01(strain);
    const jitter = s > 0.6 ? (s - 0.6) * 6 : 0;
    const gold = hex(config.palette.gold);
    const color = s > 0.6 ? shade(gold, (s - 0.6) * 1.2) : gold;
    const ol = hex(config.palette.outline);
    for (const pass of [0, 1]) {
      g.lineStyle(pass === 0 ? 10 : 5, pass === 0 ? ol : color, 1);
      g.beginPath();
      let pen = false;
      for (let i = 0; i < rope.n; i++) {
        if (i === rope.breakAt) {
          g.strokePath();
          g.beginPath();
          pen = false;
        }
        const x = rope.x[i] + (i > 0 && i < rope.n - 1 ? Math.sin(this.t * 60 + i * 2.1) * jitter : 0);
        const y = rope.y[i] + (i > 0 && i < rope.n - 1 ? Math.cos(this.t * 55 + i * 1.7) * jitter : 0);
        if (!pen) {
          g.moveTo(x, y);
          pen = true;
        } else g.lineTo(x, y);
      }
      g.strokePath();
    }
    // links, oriented along the chain
    g.fillStyle(shade(color, -0.25), 1);
    for (let i = 1; i < rope.n; i++) {
      if (i === rope.breakAt) continue;
      const mx = (rope.x[i] + rope.x[i - 1]) / 2;
      const my = (rope.y[i] + rope.y[i - 1]) / 2;
      const a = Math.atan2(rope.y[i] - rope.y[i - 1], rope.x[i] - rope.x[i - 1]);
      const ox = Math.cos(a) * 4;
      const oy = Math.sin(a) * 4;
      g.fillCircle(mx - ox, my - oy, 2.6);
      g.fillCircle(mx + ox, my + oy, 2.6);
    }
    // anchor bolts on top of the side walls (the room is open above the chain)
    const L = config.layout;
    for (const ax of [L.roomLeft - 4, L.roomRight + 4]) {
      g.fillStyle(ol, 1);
      g.fillCircle(ax, L.ropeY, 14);
      g.fillStyle(gold, 1);
      g.fillCircle(ax, L.ropeY, 10);
      g.fillStyle(0xffffff, 0.45);
      g.fillCircle(ax - 3, L.ropeY - 4, 3.5);
      g.fillStyle(shade(gold, -0.4), 1);
      g.fillCircle(ax, L.ropeY, 4);
    }
  }
}
