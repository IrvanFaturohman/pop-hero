// Boss UI: big HP bar at the top (white chip catches up), and the slam telegraph: a red circle
// pulsing under the hero during your turn when the boss will slam on the next enemy turn.
import Phaser from 'phaser';
import { config, hex } from '../config';
import type { BossBrain } from '../logic/boss';
import { TAU } from '../logic/math';
import { strings } from '../strings';
import { fontFamily, fontWeight } from './gui';

const BAR = { x: 360, y: 222, w: 440, h: 20 };

export class BossView {
  private bar: Phaser.GameObjects.Graphics;
  private name: Phaser.GameObjects.Text;
  private warn: Phaser.GameObjects.Graphics;
  private shown = 1;
  private chip = 1;
  private chipWait = 0;
  private lastHp = -1;
  private t = 0;

  constructor(scene: Phaser.Scene, ui: Phaser.GameObjects.Layer, world: Phaser.GameObjects.Layer, textRes: number) {
    this.bar = scene.add.graphics().setVisible(false);
    this.name = scene.add
      .text(BAR.x, BAR.y - 21, '', { fontFamily: fontFamily('sen'), fontSize: '24px', fontStyle: fontWeight(), color: '#ffffff', stroke: config.palette.outline, strokeThickness: 7, resolution: textRes })
      .setOrigin(0.5)
      .setVisible(false);
    ui.add([this.bar, this.name]);
    this.warn = scene.add.graphics();
    world.add(this.warn);
  }

  update(dt: number, boss: BossBrain | null, telegraph: boolean): void {
    this.t += dt;
    const alive = boss !== null && boss.e.alive;
    this.bar.setVisible(boss !== null);
    this.name.setVisible(boss !== null);
    this.warn.clear();
    if (!boss) return;
    const name = strings.bossNames[boss.kind];
    if (this.name.text !== name) this.name.setText(name);
    const e = boss.e;
    const frac = Math.max(0, e.hp / e.maxHp);
    if (e.hp < this.lastHp) this.chipWait = config.juice.hpChipDelay;
    this.lastHp = e.hp;
    this.shown += (frac - this.shown) * Math.min(1, dt * 14);
    if (this.chip < this.shown) this.chip = this.shown;
    if (this.chipWait > 0) this.chipWait -= dt;
    else this.chip += (this.shown - this.chip) * Math.min(1, dt * 5);

    const g = this.bar;
    const x = BAR.x - BAR.w / 2;
    const y = BAR.y - BAR.h / 2;
    g.clear();
    g.fillStyle(hex(config.palette.outline), 1);
    g.fillRoundedRect(x - 4, y - 4, BAR.w + 8, BAR.h + 8, 12);
    g.fillStyle(0x3a2f5c, 1);
    g.fillRoundedRect(x, y, BAR.w, BAR.h, 9);
    if (this.chip > 0.002) {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(x, y, Math.max(8, BAR.w * this.chip), BAR.h, 9);
    }
    if (this.shown > 0.002) {
      g.fillStyle(boss.phase2 ? 0xff3b3b : 0xb06bff, 1);
      g.fillRoundedRect(x, y, Math.max(8, BAR.w * this.shown), BAR.h, 9);
    }
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(x + BAR.w * config.boss.phase2At - 1, y, 3, BAR.h);

    // slam telegraph on the hero
    if (alive && telegraph && boss.slamNext) {
      const L = config.layout;
      const pulse = 0.5 + 0.5 * Math.sin(this.t * TAU * 3);
      this.warn.fillStyle(hex(config.palette.danger), 0.18 + 0.22 * pulse);
      this.warn.fillEllipse(L.heroX, L.groundY + 4, 150 + pulse * 20, 44 + pulse * 6);
      this.warn.lineStyle(4, hex(config.palette.danger), 0.6 + 0.4 * pulse);
      this.warn.strokeEllipse(L.heroX, L.groundY + 4, 150 + pulse * 20, 44 + pulse * 6);
    }
  }
}
