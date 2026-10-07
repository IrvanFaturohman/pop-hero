// HUD: pause button + shared button behaviour.
import Phaser from 'phaser';
import { config, hex } from '../config';
import { easeOutBack } from '../juice/ease';

export const PAUSE_BTN = { x: 664, y: 58, r: 34 };

/**
 * Button feedback: press = 0.92, release = small overshoot, then `onTap`. Only fires when the
 * press also started on this button (a finger already down elsewhere can't trigger it).
 */
export function pressable(obj: Phaser.GameObjects.Container, onTap: () => void): void {
  const scene = obj.scene;
  let armed = false;
  obj.on('pointerdown', () => {
    armed = true;
    scene.tweens.add({ targets: obj, scale: 0.92, duration: 60, ease: 'Quad.easeOut' });
  });
  const release = (fire: boolean) => {
    scene.tweens.add({ targets: obj, scale: 1, duration: 260, ease: (t: number) => easeOutBack(t, 3) });
    if (fire && armed) onTap();
    armed = false;
  };
  obj.on('pointerup', () => release(true));
  obj.on('pointerout', () => release(false));
}

/** In-game HUD button: pause (the pause menu itself is view/pauseMenu.ts). */
export class Hud {
  onPause: () => void = () => {};

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    const ol = hex(config.palette.outline);
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.25);
    g.fillCircle(0, 4, PAUSE_BTN.r);
    g.fillStyle(0xffffff, 1);
    g.lineStyle(4, ol, 1);
    g.fillCircle(0, 0, PAUSE_BTN.r);
    g.strokeCircle(0, 0, PAUSE_BTN.r);
    g.fillStyle(ol, 1);
    g.fillRoundedRect(-12, -13, 8, 26, 3);
    g.fillRoundedRect(4, -13, 8, 26, 3);
    const btn = scene.add.container(PAUSE_BTN.x, PAUSE_BTN.y, [g]);
    btn.setSize(PAUSE_BTN.r * 2 + 16, PAUSE_BTN.r * 2 + 16).setInteractive({ useHandCursor: true });
    pressable(btn, () => this.onPause());
    layer.add(btn);
  }
}
