// Top HUD: wave progress (the hero's HP bar lives under the hero) + low-HP red pulse.
import Phaser from 'phaser';
import { config, hex } from '../config';
import { TAU } from '../logic/math';
import { strings } from '../strings';

const FONT = 'Fredoka, system-ui, sans-serif';
const WAVE = { x: 330, y: 62, w: 260 };

export class TopHud {
  private g: Phaser.GameObjects.Graphics;
  private waveText: Phaser.GameObjects.Text;
  private vignette: Phaser.GameObjects.Image;
  private progShown = 0;
  private t = 0;
  private lastWaveLabel = '';

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, textRes: number) {
    const L = config.layout;
    this.vignette = scene.add.image(L.width / 2, L.height / 2, 'vignette').setDisplaySize(L.width + 80, L.height + 80);
    this.vignette.setTint(hex(config.palette.danger)).setAlpha(0);
    this.g = scene.add.graphics();
    this.waveText = scene.add
      .text(WAVE.x, WAVE.y - 30, '', { fontFamily: FONT, fontSize: '30px', fontStyle: '700', color: '#ffffff', stroke: config.palette.outline, strokeThickness: 8, resolution: textRes })
      .setOrigin(0.5);
    layer.add([this.vignette, this.g, this.waveText]);
  }

  update(dt: number, hpFrac: number, waveIndex: number, waveCount: number, progress: number, boss = false): void {
    this.t += dt;
    this.progShown += (progress - this.progShown) * Math.min(1, dt * 5);
    const label = boss ? strings.boss : strings.wave(Math.min(waveIndex + 1, waveCount), waveCount);
    if (label !== this.lastWaveLabel) {
      this.waveText.setText(label);
      this.lastWaveLabel = label;
    }
    this.draw(waveCount);

    // low HP: red pulsing vignette
    const low = config.juice.lowHp;
    const k = hpFrac > 0 && hpFrac < low ? 1 - hpFrac / low : 0;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * TAU * 1.1);
    this.vignette.setAlpha(k > 0 ? (0.25 + 0.35 * pulse) * (0.5 + 0.5 * k) : 0);
  }

  private draw(waveCount: number): void {
    const g = this.g;
    const ol = hex(config.palette.outline);
    const wx = WAVE.x - WAVE.w / 2;
    const wy = WAVE.y;
    g.clear();
    g.fillStyle(ol, 1);
    g.fillRoundedRect(wx - 4, wy - 4, WAVE.w + 8, 16, 8);
    g.fillStyle(0x3a2f5c, 1);
    g.fillRoundedRect(wx, wy, WAVE.w, 8, 4);
    g.fillStyle(hex(config.palette.gold), 1);
    if (this.progShown > 0.01) g.fillRoundedRect(wx, wy, Math.max(8, WAVE.w * this.progShown), 8, 4);
    for (let i = 1; i <= waveCount; i++) {
      const dx = wx + (WAVE.w * i) / waveCount;
      const done = this.progShown >= i / waveCount - 0.001;
      g.fillStyle(ol, 1);
      g.fillCircle(dx, wy + 4, 11);
      g.fillStyle(done ? hex(config.palette.gold) : 0x3a2f5c, 1);
      g.fillCircle(dx, wy + 4, 7);
    }
  }
}
