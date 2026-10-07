// Boot: wait for the bundled font, generate all textures, then start the game.
import Phaser from 'phaser';
import { makeTextures } from '../view/textures';

async function loadFonts(): Promise<void> {
  if (!document.fonts) return;
  const timeout = new Promise<void>((r) => setTimeout(r, 2500));
  const load = Promise.all([document.fonts.load('700 48px Fredoka'), document.fonts.load('600 48px Fredoka')]).then(() => undefined);
  await Promise.race([load, timeout]).catch(() => undefined);
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    void loadFonts().then(() => {
      makeTextures(this);
      this.scene.start('Title');
      document.getElementById('boot')?.remove();
    });
  }
}
