// Full-screen white flash (UI layer). Disabled by Reduced Motion / flash toggle.
import Phaser from 'phaser';
import { config } from '../config';

export class ScreenFlash {
  private rect: Phaser.GameObjects.Rectangle;
  private t = 0;
  private dur = 0;
  private peak = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    const L = config.layout;
    this.rect = scene.add.rectangle(L.width / 2, L.height / 2, L.width + 200, L.height + 200, 0xffffff, 1);
    this.rect.setAlpha(0).setVisible(false);
    layer.add(this.rect);
  }

  flash(duration: number, alpha = 0.7, color = 0xffffff): void {
    if (!config.juice.flashEnabled || config.juice.reducedMotion) return;
    this.rect.setFillStyle(color, 1);
    this.dur = duration;
    this.t = 0;
    this.peak = alpha;
    this.rect.setVisible(true).setAlpha(alpha);
  }

  update(dt: number): void {
    if (this.dur <= 0) return;
    this.t += dt;
    const k = this.t / this.dur;
    if (k >= 1) {
      this.dur = 0;
      this.rect.setVisible(false);
      return;
    }
    this.rect.setAlpha(this.peak * (1 - k));
  }
}
