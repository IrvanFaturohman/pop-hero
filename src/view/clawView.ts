// Digger Mole claw in the balloon room: a velvet arm breaking through a side wall with three pale
// digging claws at the tip, a dirt hole where it comes in, and dust while it digs.
import type Phaser from 'phaser';
import { config, hex } from '../config';
import type { Claw } from '../logic/claw';
import { lerp } from '../logic/math';
import { shade } from './color';

export class ClawView {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.g = scene.add.graphics();
    layer.add(this.g);
  }

  update(claw: Claw, alpha: number, dt: number): void {
    this.t += dt;
    const g = this.g;
    g.clear();
    const grow = lerp(claw.prevGrow, claw.grow, alpha);
    if (grow <= 0.001) return;
    const c = config.claw;
    const ol = hex(config.palette.outline);
    const body = hex(config.palette.mole);
    const s = claw.side;
    const L = config.layout;
    const wallX = s < 0 ? L.roomLeft : L.roomRight;
    const y = claw.y + Math.sin(this.t * 3) * 3 * grow;
    const tipX = claw.baseX - s * claw.reach * grow;
    const r = c.radius;

    // dirt hole in the wall
    g.fillStyle(hex(config.palette.earth), 1);
    g.fillEllipse(wallX, y, 34, r * 2.6);
    g.fillStyle(0x2a1f1c, 1);
    g.fillEllipse(wallX, y, 22, r * 2.1);

    // arm: outline, body, lighter top stripe, velvet rings
    const x0 = Math.min(wallX, tipX);
    const w = Math.abs(tipX - wallX);
    g.fillStyle(ol, 1);
    g.fillRoundedRect(x0 - 4, y - r - 4, w + 8, r * 2 + 8, r + 4);
    g.fillStyle(body, 1);
    g.fillRoundedRect(x0, y - r, w, r * 2, r);
    g.fillStyle(shade(body, 0.25), 1);
    g.fillRoundedRect(x0 + 6, y - r + 6, Math.max(0, w - 12), r * 0.6, r * 0.3);
    g.lineStyle(3, shade(body, -0.3), 1);
    for (let k = 1; k * 46 < w - 20; k++) {
      const x = wallX - s * k * 46;
      g.lineBetween(x, y - r + 8, x, y + r - 8);
    }

    // paw + three claws pointing into the room
    const pawR = c.tipRadius * 0.75 * grow;
    g.fillStyle(ol, 1);
    g.fillCircle(tipX, y, pawR + 4);
    g.fillStyle(shade(body, 0.35), 1);
    g.fillCircle(tipX, y, pawR);
    for (let i = -1; i <= 1; i++) {
      const by = y + i * pawR * 0.6;
      const len = c.tipRadius * 0.9 * grow;
      const bx = tipX - s * pawR * 0.6;
      const tx = bx - s * len;
      const ty = by + i * 6;
      g.fillStyle(ol, 1);
      g.fillTriangle(bx, by - 11, bx, by + 11, tx - s * 4, ty);
      g.fillStyle(0xf4ede4, 1);
      g.fillTriangle(bx, by - 7, bx, by + 7, tx, ty);
    }

    // dust while digging in
    if (claw.grow < 1 && claw.grow > claw.prevGrow) {
      g.fillStyle(0xd8cbb8, 0.5);
      for (let i = 0; i < 5; i++) {
        const a = this.t * 9 + i * 1.3;
        g.fillCircle(wallX - s * (10 + (i * 7) % 20), y + Math.sin(a) * r * 1.2, 5 + (i % 3) * 2);
      }
    }
  }
}
