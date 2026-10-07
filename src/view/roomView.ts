// Lower balloon room (reference: gray play area with cyan side walls, open at the top where the
// chain hangs) dug into the dark earth below the road, plus the red danger vignette near spikes.
import Phaser from 'phaser';
import { config, hex } from '../config';
import { clamp01 } from '../logic/math';
import { shade } from './color';

const MARGIN = 80;
const WALL = 12; // cyan wall thickness

export class RoomView {
  private vignette: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, bg: Phaser.GameObjects.Layer, overlay: Phaser.GameObjects.Layer) {
    const L = config.layout;
    const p = config.palette;
    const g = scene.add.graphics();
    bg.add(g);

    // dark earth with darker spots
    g.fillStyle(hex(p.earth), 1);
    g.fillRect(-MARGIN, L.roomTop, L.width + MARGIN * 2, L.height - L.roomTop + MARGIN);
    g.fillStyle(hex(p.earthSpot), 1);
    for (let i = 0; i < 26; i++) {
      const x = ((i * 131) % (L.width + 60)) - 30;
      const y = L.roomTop + 20 + ((i * 89) % (L.height - L.roomTop));
      g.fillEllipse(x, y, 40 + (i % 4) * 16, 30 + (i % 3) * 12);
    }

    const x0 = L.roomLeft;
    const y0 = L.roomOpenTop;
    const w = L.roomRight - L.roomLeft;
    const h = L.roomBottom - y0;
    const ol = hex(p.outline);
    // U-shaped cyan walls: no top wall, the gold chain spans the open top (see RopeView)
    g.fillStyle(ol, 1);
    g.fillRoundedRect(x0 - WALL - 4, y0 - 4, w + (WALL + 4) * 2, h + WALL + 8, { tl: 8, tr: 8, bl: 30, br: 30 });
    g.fillStyle(hex(p.roomWall), 1);
    g.fillRoundedRect(x0 - WALL, y0, w + WALL * 2, h + WALL, { tl: 5, tr: 5, bl: 26, br: 26 });
    g.fillStyle(0xffffff, 0.35);
    g.fillRect(x0 - WALL + 3, y0 + 4, 4, h - 20);
    g.fillRect(x0 + w + 3, y0 + 4, 4, h - 20);
    // gray interior, open at the top (cuts through the wall outline there)
    g.fillStyle(ol, 1);
    g.fillRoundedRect(x0 - 4, y0 - 4, w + 8, h + 8, { tl: 0, tr: 0, bl: 22, br: 22 });
    g.fillStyle(hex(p.room), 1);
    g.fillRoundedRect(x0, y0 - 4, w, h + 4, { tl: 0, tr: 0, bl: 18, br: 18 });
    g.fillStyle(shade(hex(p.room), -0.12), 1);
    g.fillRect(x0 + 6, y0, 18, h - 12);
    // shade under the open top: the room reads as a pit dug into the earth
    g.fillGradientStyle(ol, ol, ol, ol, 0.4, 0.4, 0, 0);
    g.fillRect(x0, y0 - 4, w, 46);
    // danger vignette over the room
    this.vignette = scene.add.image(x0 + w / 2, y0 + h / 2, 'vignette');
    this.vignette.setDisplaySize(w, h).setTint(hex(p.danger)).setAlpha(0);
    overlay.add(this.vignette);
  }

  update(dt: number, danger: number): void {
    const target = clamp01(danger) * config.juice.dangerVignette;
    this.vignette.alpha += (target - this.vignette.alpha) * Math.min(1, dt * 14);
  }
}
