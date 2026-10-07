// Hitbox overlay: balloon circles, spike capsules/balls, key lines.
import Phaser from 'phaser';
import { config } from '../config';
import type { Balloon } from '../logic/balloon';
import type { SpikeField } from '../logic/spikes';

export class HitboxOverlay {
  private g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.g = scene.add.graphics();
    layer.add(this.g);
  }

  draw(field: SpikeField, balloons: readonly (Balloon | null)[]): void {
    const g = this.g;
    g.clear();
    if (!config.debug.showHitbox) return;
    const L = config.layout;
    const cs = config.spikes;

    g.lineStyle(2, 0xffff00, 0.8);
    g.lineBetween(L.roomLeft, L.roomInnerTop, L.roomRight, L.roomInnerTop); // ceiling (held balloons, chain bulge)
    g.lineStyle(1, 0xffffff, 0.35);
    g.strokeRect(L.roomLeft, L.roomInnerTop, L.roomRight - L.roomLeft, L.roomBottom - L.roomInnerTop);

    if (field.enabled) {
      for (const s of [...field.spikes, ...field.outgoing]) {
        const k = s.scale;
        if (k <= 0.001) continue;
        g.lineStyle(2, 0xff2244, 1);
        const d = s.def;
        if (d.kind === 'spinner') {
          g.strokeCircle(d.px, d.py, cs.hubRadius * k);
          for (let i = 0; i < s.armCount(); i++) {
            const tx = s.tips[i * 2];
            const ty = s.tips[i * 2 + 1];
            g.strokeCircle(tx, ty, cs.ballRadius * k);
            const ang = Math.atan2(ty - d.py, tx - d.px);
            const nx = -Math.sin(ang) * cs.armHalfThickness * k;
            const ny = Math.cos(ang) * cs.armHalfThickness * k;
            g.lineBetween(d.px + nx, d.py + ny, tx + nx, ty + ny);
            g.lineBetween(d.px - nx, d.py - ny, tx - nx, ty - ny);
          }
        } else {
          g.strokeCircle(s.tips[0], s.tips[1], cs.ballRadius * k);
        }
      }
    }

    for (const b of balloons) {
      if (!b || b.state === 'done') continue;
      g.lineStyle(1, 0xffffff, 0.5);
      g.strokeCircle(b.x, b.y, b.r);
      g.lineStyle(2, b.danger > 0 ? 0xffaa00 : 0x44ff66, 1);
      g.strokeCircle(b.x, b.y, b.hitR);
      g.lineStyle(1, 0xffff00, 0.5);
      g.strokeCircle(b.x, b.y, b.r + config.bonus.nearMissDistance);
    }
  }
}
