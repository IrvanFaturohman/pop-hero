// Upper battle arena, side view (reference: forest strip + dirt road): teal sky, mountains, layered
// tree trunks, bushes, a grass-edged dirt road where the hero (left) and enemies (right) stand,
// and dark earth below.
import Phaser from 'phaser';
import { config, hex } from '../config';

const MARGIN = 80; // extra area so camera shake/rotation/zoom never shows edges

export class ArenaView {
  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    const L = config.layout;
    const p = config.palette;
    const g = scene.add.graphics();
    layer.add(g);
    const W = L.width + MARGIN * 2;
    const x0 = -MARGIN;
    const roadTop = L.horizonY + 10;
    const roadBot = L.roomTop - 16;

    // sky
    g.fillGradientStyle(hex(p.skyTop), hex(p.skyTop), hex(p.skyBottom), hex(p.skyBottom), 1);
    g.fillRect(x0, -MARGIN - 200, W, roadTop + MARGIN + 200);

    // far mountains
    g.fillStyle(hex(p.mountain), 1);
    const peaks = [-40, 60, 150, 250, 330, 430, 520, 610, 700, 800];
    g.beginPath();
    g.moveTo(x0, roadTop);
    peaks.forEach((x, i) => g.lineTo(x, L.horizonY - 120 - (i % 3) * 40 - (i % 2) * 25));
    g.lineTo(L.width + MARGIN, roadTop);
    g.closePath();
    g.fillPath();

    // far trunks (thin, light) then near trunks (wide, dark) with a few branches
    this.trunks(g, hex(p.treeFar), 18, 26, 95, 20, roadTop);
    this.trunks(g, hex(p.treeNear), 30, 46, 175, 70, roadTop + 4);

    // bushes along the road
    g.fillStyle(hex(p.bush), 1);
    for (let x = x0; x < L.width + MARGIN; x += 70) {
      const h = 26 + ((x * 37) % 22);
      g.fillEllipse(x + 35, roadTop - 4, 90, h * 2);
    }

    // grass edge + road
    g.fillStyle(hex(p.grass), 1);
    g.fillRect(x0, roadTop - 6, W, 14);
    g.fillStyle(hex(p.road), 1);
    g.fillRect(x0, roadTop + 6, W, roadBot - roadTop - 6);
    // wood-grain swirls on the road
    g.lineStyle(3, hex(p.roadLine), 1);
    for (let i = 0; i < 9; i++) {
      const cx = ((i * 173) % (L.width + 100)) - 40;
      const cy = roadTop + 40 + ((i * 61) % (roadBot - roadTop - 70));
      g.beginPath();
      g.arc(cx, cy, 26 + (i % 3) * 14, Math.PI * 1.1, Math.PI * 1.9);
      g.strokePath();
      g.beginPath();
      g.arc(cx + 30, cy + 10, 16 + (i % 2) * 10, Math.PI * 0.1, Math.PI * 0.8);
      g.strokePath();
    }
    // grass tufts on the lower edge
    g.fillStyle(hex(p.grass), 1);
    for (let x = 4; x < L.width; x += 36) {
      g.fillTriangle(x, roadBot + 2, x + 7, roadBot - 12, x + 14, roadBot + 2);
      g.fillTriangle(x + 12, roadBot + 2, x + 18, roadBot - 7, x + 24, roadBot + 2);
    }
    // dark earth below the road (continues around the balloon room)
    g.fillStyle(hex(p.earth), 1);
    g.fillRect(x0, roadBot, W, L.roomTop - roadBot + 4);

  }

  private trunks(g: Phaser.GameObjects.Graphics, color: number, wMin: number, wMax: number, spacing: number, offset: number, bottom: number): void {
    const L = config.layout;
    g.fillStyle(color, 1);
    for (let x = -MARGIN + offset, i = 0; x < L.width + MARGIN; x += spacing, i++) {
      const w = wMin + ((i * 7) % (wMax - wMin + 1));
      const lean = ((i % 3) - 1) * 10;
      g.fillPoints(
        [
          { x: x - w / 2 + lean, y: -MARGIN - 200 },
          { x: x + w / 2 + lean, y: -MARGIN - 200 },
          { x: x + w / 2 + 6, y: bottom },
          { x: x - w / 2 - 6, y: bottom },
        ],
        true,
      );
      if (i % 2 === 0) {
        // a branch
        const by = 120 + (i % 4) * 50;
        const dir = i % 4 === 0 ? 1 : -1;
        g.fillTriangle(x, by, x + dir * w * 1.6, by - 50, x, by + 18);
      }
    }
  }

  update(_dt: number): void {
    // static backdrop (the reference forest does not drift)
  }
}
