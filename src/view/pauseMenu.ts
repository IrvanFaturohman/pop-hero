// Pause menu in the pack's Settings popup layout: cream popup with the brown "PAUSED" title, one row
// per setting (brown icon, label, on/off switch), RESUME / RESTART / HOME buttons, and the red
// close button under the popup (= resume). HOME leaves the run without rewards. Settings persist.
import Phaser from 'phaser';
import { synth } from '../audio/synth';
import { config } from '../config';
import { saveSettings } from '../storage';
import { strings } from '../strings';
import { INK, U, button, closeButton, dim, icon, popup, switchToggle, text } from './gui';
import { pressable } from './hud';

interface Toggle {
  label: string;
  icon: string;
  get(): boolean;
  set(v: boolean): void;
}

/** The Settings popup is 865 canvas units wide; rows follow its list spacing (120 apart). */
const PW = 865 * U;
const PH = 1000 * U;
const CY = 640 + 21.5 * U;
const ROW0 = -PH / 2 + 175 * U;
const ROW_DY = 120 * U;

export class PauseMenu {
  private root: Phaser.GameObjects.Container;
  private rows: Phaser.GameObjects.Container;
  private toggles: Toggle[];
  onResume: () => void = () => {};
  onRestart: () => void = () => {};
  onHome: () => void = () => {};
  onTap: () => void = () => {};

  constructor(
    private scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    _textRes: number,
  ) {
    const L = config.layout;
    const box = popup(scene, L.width / 2, CY, PW, PH, strings.paused);
    const tap = (fn: () => void) => () => {
      this.onTap();
      fn();
    };
    this.toggles = [
      { label: strings.sound, icon: 'ui_sound', get: () => !config.audio.muted, set: (v) => ((config.audio.muted = !v), synth.applyVolume()) },
      { label: strings.music, icon: 'ui_music', get: () => config.audio.musicOn, set: (v) => (config.audio.musicOn = v) },
      { label: strings.haptics, icon: 'ui_vibration', get: () => config.haptics.enabled, set: (v) => (config.haptics.enabled = v) },
      { label: strings.reducedMotion, icon: 'ui_swirl', get: () => config.juice.reducedMotion, set: (v) => (config.juice.reducedMotion = v) },
    ];
    this.rows = scene.add.container(0, 0);
    box.add(this.rows);
    const bw = 322 * U;
    const gap = 47 * U;
    box.add([
      button(scene, { x: 0, y: -PH / 2 + 700 * U, w: 2 * bw + gap, color: 'green', label: strings.resume, onTap: tap(() => this.onResume()) }),
      button(scene, { x: -bw / 2 - gap / 2, y: -PH / 2 + 860 * U, w: bw, color: 'blue', label: strings.restart, onTap: tap(() => this.onRestart()) }),
      button(scene, { x: bw / 2 + gap / 2, y: -PH / 2 + 860 * U, w: bw, color: 'orange', label: strings.home, onTap: tap(() => this.onHome()) }),
    ]);
    this.root = scene.add.container(0, 0, [dim(scene), box, closeButton(scene, L.width / 2, CY + PH / 2 + 90 * U, tap(() => this.onResume()))]).setVisible(false);
    layer.add(this.root);
  }

  get visible(): boolean {
    return this.root.visible;
  }

  show(v: boolean): void {
    this.refresh();
    this.root.setVisible(v);
  }

  /** One row per toggle: icon, label, switch (rebuilt on every change). */
  private refresh(): void {
    this.scene.tweens.killTweensOf(this.rows.list);
    this.rows.removeAll(true);
    this.toggles.forEach((tg, i) => {
      const y = ROW0 + i * ROW_DY;
      const on = tg.get();
      const sw = switchToggle(this.scene, 229 * U, 0, on, [strings.on, strings.off]);
      sw.setSize(210 * U, 85 * U).setInteractive({ useHandCursor: true });
      pressable(sw, () => {
        this.onTap();
        tg.set(!tg.get());
        saveSettings({ muted: config.audio.muted, music: config.audio.musicOn, haptics: config.haptics.enabled, reducedMotion: config.juice.reducedMotion });
        // rebuild after the tap handler returns (the switch is still in use inside it)
        this.scene.time.delayedCall(0, () => this.refresh());
      });
      const ic = icon(this.scene, -320 * U, 0, tg.icon, 64 * U).setTint(Number.parseInt(INK.label.slice(1), 16));
      const row = this.scene.add.container(0, y, [ic, text(this.scene, -270 * U, 0, tg.label, 40, { originX: 0, align: 'left', line: 'none', color: INK.label }), sw]);
      this.rows.add(row);
    });
  }
}
