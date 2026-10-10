// Power-ups floating in the balloon room: a small framed tile (the pack's skill frame + icon) over a
// soft glow in the power-up's color, gently rocking. They pop in when a new set spawns; pickup
// bursts are in scenes/feedback.ts.
import type Phaser from 'phaser';
import { easeOutBack } from '../juice/ease';
import { clamp01, lerp } from '../logic/math';
import type { PowerUpField } from '../logic/powerups';
import { powerTile } from './gui';
import { balloonColor } from './textures';

const SIZE = 64;
const GLOW = 120;
const POP_IN = 0.3;

interface Slot {
  age: number;
  glow: Phaser.GameObjects.Image;
  tile: Phaser.GameObjects.Container;
}

export class PowerUpView {
  private slots = new Map<number, Slot>();
  private t = 0;

  constructor(
    private scene: Phaser.Scene,
    private layer: Phaser.GameObjects.Layer,
  ) {}

  update(field: PowerUpField, alpha: number, dt: number): void {
    this.t += dt;
    for (const [id, s] of this.slots) {
      if (field.items.some((p) => p.id === id)) continue;
      s.glow.destroy();
      s.tile.destroy();
      this.slots.delete(id);
    }
    field.items.forEach((p, i) => {
      let s = this.slots.get(p.id);
      if (!s) {
        const glow = this.scene.add.image(0, 0, 'p_soft').setBlendMode('ADD').setTint(balloonColor(p.kind)).setAlpha(0.6);
        const tile = powerTile(this.scene, 0, 0, SIZE, p.kind);
        this.layer.add([glow, tile]);
        s = { age: 0, glow, tile };
        this.slots.set(p.id, s);
      }
      s.age += dt;
      const pop = easeOutBack(clamp01(s.age / POP_IN), 2.4);
      const x = lerp(p.prevX, p.x, alpha);
      const y = lerp(p.prevY, p.y, alpha);
      const pulse = 1 + Math.sin(this.t * 4 + i * 2) * 0.08;
      s.glow.setPosition(x, y).setDisplaySize(GLOW * pop * pulse, GLOW * pop * pulse);
      s.tile.setPosition(x, y).setScale(pop).setAngle(Math.sin(this.t * 2.2 + i) * 8);
    });
  }
}
