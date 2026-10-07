// Big center banners: "WAVE 1", "WAVE CLEAR", "BOSS", "STAGE CLEAR" / "DEFEATED".
import Phaser from 'phaser';
import { config } from '../config';
import { easeOutBack } from '../juice/ease';

const FONT = 'Fredoka, system-ui, sans-serif';

export class Banner {
  private text: Phaser.GameObjects.Text;
  private t = 0;
  private hold = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, textRes: number) {
    const L = config.layout;
    this.text = scene.add
      .text(L.width / 2, 300, '', { fontFamily: FONT, fontSize: '92px', fontStyle: '700', color: '#ffffff', stroke: config.palette.outline, strokeThickness: 16, resolution: textRes })
      .setOrigin(0.5)
      .setVisible(false);
    layer.add(this.text);
  }

  /** Enters with easeOutBack, holds, fades. */
  show(msg: string, color = '#ffffff', hold = 1.1): void {
    this.t = 0;
    this.hold = hold;
    this.text.setText(msg).setColor(color).setVisible(true).setAlpha(1);
  }

  update(dt: number): void {
    if (!this.text.visible) return;
    this.t += dt;
    const inT = Math.min(1, this.t / 0.35);
    const s = easeOutBack(inT, 2.2);
    this.text.setScale(s).setAngle(Math.sin(this.t * 3) * 2 * (1 - inT));
    if (this.t > this.hold) {
      const k = (this.t - this.hold) / 0.3;
      this.text.setAlpha(1 - k).setScale(s * (1 + k * 0.2));
      if (k >= 1) this.text.setVisible(false);
    }
  }
}
