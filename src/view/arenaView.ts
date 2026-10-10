// Upper battle arena, side view. With the Layer Lab art: the monster pack's flat battlefield. The
// procedural fallback is the reference forest strip (teal sky, mountains, tree trunks, bushes, a
// grass-edged dirt road) over dark earth.
import Phaser from 'phaser';
import { config, hex } from '../config';

const MARGIN = 80; // extra area so camera shake/rotation/zoom never shows edges

export class ArenaView {
  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    if (scene.textures.exists('ui_bg_stone')) {
      this.flat(scene, layer);
      return;
    }
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

  /**
   * The monster pack's battlefield: flat backdrop color, a sand road with stones and weed tufts at
   * native size, and the goblin fortress at the right edge behind the enemies.
   */
  private flat(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer): void {
    const L = config.layout;
    const p = config.palette;
    const roadTop = L.horizonY + 10;
    const roadBot = L.roomTop - 16;
    const g = scene.add.graphics();
    g.fillStyle(hex(p.field), 1);
    g.fillRect(-MARGIN, -MARGIN - 400, L.width + MARGIN * 2, roadTop + MARGIN + 400);
    // soft far hills in a lighter / darker shade of the backdrop
    g.fillStyle(0x7cc2ab, 1);
    for (let i = 0; i < 6; i++) g.fillEllipse(i * 150 - 20, roadTop + 10, 260, 150 + (i % 2) * 40);
    g.fillStyle(0x5aa58f, 1);
    for (let i = 0; i < 7; i++) g.fillEllipse(i * 120 + 40, roadTop + 14, 170, 70 + (i % 3) * 18);
    g.fillStyle(hex(p.road), 1);
    g.fillRect(-MARGIN, roadTop, L.width + MARGIN * 2, roadBot - roadTop + 8);
    g.fillStyle(hex(p.roadLine), 1);
    g.fillRect(-MARGIN, roadTop, L.width + MARGIN * 2, 6);
    // earth band down to the room (the room view continues it around the balloon room)
    g.fillStyle(hex(p.earth), 1);
    g.fillRect(-MARGIN, roadBot, L.width + MARGIN * 2, L.roomTop - roadBot + 4);
    layer.add(g);
    const fort = scene.add.image(L.width + 8, L.groundY + 16, 'ui_fortress_goblin').setOrigin(1, 1);
    layer.add(fort);
    // props on the road: fixed spots so every run looks the same
    const stones: Array<[number, number]> = [[60, 600], [300, 612], [520, 470], [650, 590]];
    const weeds: Array<[number, number]> = [[30, 450], [180, 470], [250, 585], [420, 610], [470, 452], [610, 520], [700, 455]];
    for (const [x, y] of stones) layer.add(scene.add.image(x, y, 'ui_bg_stone'));
    for (const [x, y] of weeds) layer.add(scene.add.image(x, y, 'ui_bg_weed'));
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
