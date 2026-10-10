// Boot: load the Layer Lab art (optional), wait for the bundled font, generate the procedural
// textures, then start the game.
import Phaser from 'phaser';
import { loadLayerLabFonts, preloadLayerLab } from '../view/layerlab';
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

  preload(): void {
    preloadLayerLab(this);
  }

  create(): void {
    void Promise.all([loadFonts(), loadLayerLabFonts()]).then(() => {
      makeTextures(this);
      this.scene.start('Title');
      document.getElementById('boot')?.remove();
    });
  }
}
