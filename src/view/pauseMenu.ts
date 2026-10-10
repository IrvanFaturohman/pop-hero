// Pause menu in the pack's Settings popup layout: blue top-bar popup "PAUSED", one row per setting
// (icon, label, on/off switch), RESUME / RESTART / HOME buttons, and the round close button under
// the popup (= resume). HOME leaves the run without rewards. Settings persist.
import Phaser from 'phaser';
import { synth } from '../audio/synth';
import { config } from '../config';
import { saveSettings } from '../storage';
import { strings } from '../strings';
import { U, button, closeButton, dim, icon, popup, switchToggle, text } from './gui';
import { pressable } from './hud';

interface Toggle {
  label: string;
  icon: string;
  get(): boolean;
  set(v: boolean): void;
}

/** Popup08_Topbar_Divided is 978 x 1288 canvas units; rows follow the Settings list spacing. */
const PW = 978 * U;
const PH = 1080 * U;
const CY = 600;
const ROW0 = -PH / 2 + 110 * U + 95 * U;
const ROW_DY = 128 * U;

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
    const box = popup(scene, L.width / 2, CY, PW, PH, strings.paused, 'ui_icon_setting');
    const tap = (fn: () => void) => () => {
      this.onTap();
      fn();
    };
    this.toggles = [
      { label: strings.sound, icon: 'ui_icon_megaphone', get: () => !config.audio.muted, set: (v) => ((config.audio.muted = !v), synth.applyVolume()) },
      { label: strings.music, icon: 'ui_icon_music', get: () => config.audio.musicOn, set: (v) => (config.audio.musicOn = v) },
      { label: strings.haptics, icon: 'ui_icon_phone', get: () => config.haptics.enabled, set: (v) => (config.haptics.enabled = v) },
      { label: strings.reducedMotion, icon: 'ui_icon_bell', get: () => config.juice.reducedMotion, set: (v) => (config.juice.reducedMotion = v) },
    ];
    this.rows = scene.add.container(0, 0);
    box.add(this.rows);
    const bw = 380 * U;
    box.add([
      button(scene, { x: 0, y: PH / 2 - 287 * U - 30 * U, w: 2 * bw + 34 * U, h: 124 * U, color: 'green', label: strings.resume, size: 46, onTap: tap(() => this.onResume()) }),
      button(scene, { x: -bw / 2 - 17 * U, y: PH / 2 - 135 * U, w: bw, color: 'blue', label: strings.restart, onTap: tap(() => this.onRestart()) }),
      button(scene, { x: bw / 2 + 17 * U, y: PH / 2 - 135 * U, w: bw, color: 'sky', label: strings.home, onTap: tap(() => this.onHome()) }),
    ]);
    this.root = scene.add.container(0, 0, [dim(scene), box, closeButton(scene, L.width / 2, CY + PH / 2 + 80, tap(() => this.onResume()))]).setVisible(false);
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
      const sw = switchToggle(this.scene, 273 * U, 0, on, [strings.on, strings.off]);
      sw.setSize(260 * U, 88 * U).setInteractive({ useHandCursor: true });
      pressable(sw, () => {
        this.onTap();
        tg.set(!tg.get());
        saveSettings({ muted: config.audio.muted, music: config.audio.musicOn, haptics: config.haptics.enabled, reducedMotion: config.juice.reducedMotion });
        // rebuild after the tap handler returns (the switch is still in use inside it)
        this.scene.time.delayedCall(0, () => this.refresh());
      });
      const row = this.scene.add.container(0, y, [icon(this.scene, -380 * U, 4 * U, tg.icon, 58 * U), text(this.scene, -330 * U, 0, `${tg.label} :`, 38, { originX: 0, align: 'left' }), sw]);
      this.rows.add(row);
    });
  }
}
