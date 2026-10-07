// Pause menu: RESUME, RESTART and toggles (sound, music, haptics, reduced motion). Settings persist.
import Phaser from 'phaser';
import { config, hex } from '../config';
import { synth } from '../audio/synth';
import { saveSettings } from '../storage';
import { strings } from '../strings';
import { pressable } from './hud';

const FONT = 'Fredoka, system-ui, sans-serif';

interface Toggle {
  label: string;
  get(): boolean;
  set(v: boolean): void;
}

export class PauseMenu {
  private root: Phaser.GameObjects.Container;
  private toggleTexts: Array<{ t: Phaser.GameObjects.Text; tg: Toggle }> = [];
  onResume: () => void = () => {};
  onRestart: () => void = () => {};
  onTap: () => void = () => {};

  constructor(
    private scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private textRes: number,
  ) {
    const L = config.layout;
    const dim = scene.add.rectangle(L.width / 2, L.height / 2, L.width + 200, L.height + 200, 0x120a2e, 0.8).setInteractive();
    const title = this.text(L.width / 2, 300, strings.paused, 96, '#ffffff');
    const items: Phaser.GameObjects.GameObject[] = [dim, title];
    items.push(this.button(L.width / 2, 450, strings.resume, 0xffd23f, () => this.onResume()));
    items.push(this.button(L.width / 2, 560, strings.restart, 0x52c2ff, () => this.onRestart()));
    const toggles: Toggle[] = [
      { label: strings.sound, get: () => !config.audio.muted, set: (v) => ((config.audio.muted = !v), synth.applyVolume()) },
      { label: strings.music, get: () => config.audio.musicOn, set: (v) => (config.audio.musicOn = v) },
      { label: strings.haptics, get: () => config.haptics.enabled, set: (v) => (config.haptics.enabled = v) },
      { label: strings.reducedMotion, get: () => config.juice.reducedMotion, set: (v) => (config.juice.reducedMotion = v) },
    ];
    toggles.forEach((tg, i) => {
      const c = this.button(L.width / 2, 700 + i * 96, '', 0x3a2f5c, () => {
        tg.set(!tg.get());
        this.refresh();
        saveSettings({ muted: config.audio.muted, music: config.audio.musicOn, haptics: config.haptics.enabled, reducedMotion: config.juice.reducedMotion });
      }, 0.85);
      this.toggleTexts.push({ t: c.getAt(1) as Phaser.GameObjects.Text, tg });
      items.push(c);
    });
    this.root = scene.add.container(0, 0, items).setVisible(false);
    layer.add(this.root);
  }

  get visible(): boolean {
    return this.root.visible;
  }

  show(v: boolean): void {
    this.refresh();
    this.root.setVisible(v);
  }

  private refresh(): void {
    for (const { t, tg } of this.toggleTexts) t.setText(`${tg.label}: ${tg.get() ? strings.on : strings.off}`);
  }

  private text(x: number, y: number, msg: string, size: number, color: string): Phaser.GameObjects.Text {
    return this.scene.add
      .text(x, y, msg, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '700', color, stroke: config.palette.outline, strokeThickness: Math.max(6, size / 6), resolution: this.textRes })
      .setOrigin(0.5);
  }

  private button(x: number, y: number, label: string, color: number, onTap: () => void, scale = 1): Phaser.GameObjects.Container {
    const w = 360 * scale;
    const h = 80 * scale;
    const g = this.scene.add.graphics();
    g.fillStyle(hex(config.palette.outline), 1);
    g.fillRoundedRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, h / 2 + 5);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.fillStyle(0xffffff, 0.25);
    g.fillRoundedRect(-w / 2 + 16, -h / 2 + 6, w - 32, 12, 6);
    const t = this.text(0, 2, label, 32 * scale, '#ffffff');
    const c = this.scene.add.container(x, y, [g, t]).setSize(w + 10, h + 10).setInteractive({ useHandCursor: true });
    pressable(c, () => {
      this.onTap();
      onTap();
    });
    return c;
  }
}
