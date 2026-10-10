// Big center banners: "WAVE 1", "WAVE CLEAR", "BOSS", "STAGE CLEAR" / "DEFEATED", on the pack's
// title ribbon (Title_01_NoDeco, colored by the message).
import Phaser from 'phaser';
import { config } from '../config';
import { easeOutBack } from '../juice/ease';
import { U, ribbon, text, type RibbonColor } from './gui';

const Y = 300;
const SIZE = 80;

export class Banner {
  private c: Phaser.GameObjects.Container;
  private t = 0;
  private hold = 0;
  /** Long messages shrink to fit the screen width. */
  private fit = 1;

  constructor(
    private scene: Phaser.Scene,
    private layer: Phaser.GameObjects.Layer,
    _textRes: number,
  ) {
    this.c = scene.add.container(config.layout.width / 2, Y).setVisible(false);
    layer.add(this.c);
  }

  /** Enters with easeOutBack, holds, fades. The ribbon color follows the message color. */
  show(msg: string, color = '#ffffff', hold = 1.1): void {
    this.t = 0;
    this.hold = hold;
    this.c.removeAll(true);
    const p = config.palette;
    const rc: RibbonColor = color === p.danger ? 'red' : color === p.gold ? 'yellow' : color === '#FF9F1C' ? 'tangerine' : color === '#3DDC84' ? 'green' : 'sky';
    // measure the label to size the ribbon around it
    const probe = text(this.scene, 0, 0, msg, SIZE);
    const w = probe.width + 260 * U;
    probe.destroy();
    this.c.add(ribbon(this.scene, 0, 0, w, rc, msg, SIZE));
    this.fit = Math.min(1, (config.layout.width - 16) / w);
    this.c.setScale(1).setVisible(true).setAlpha(1);
    this.layer.bringToTop(this.c);
  }

  update(dt: number): void {
    if (!this.c.visible) return;
    this.t += dt;
    const inT = Math.min(1, this.t / 0.35);
    const s = easeOutBack(inT, 2.2) * this.fit;
    this.c.setScale(s).setAngle(Math.sin(this.t * 3) * 2 * (1 - inT));
    if (this.t > this.hold) {
      const k = (this.t - this.hold) / 0.3;
      this.c.setAlpha(1 - k).setScale(s * (1 + k * 0.2));
      if (k >= 1) this.c.setVisible(false);
    }
  }
}
