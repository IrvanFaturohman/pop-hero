// "Select a new ability" overlay (reference: Claw Master): 3 tall cards with name, icon, description
// and a PICK button. Cards enter staggered, float, glow by rarity; the picked one flies to the hero,
// the others fall away.
import Phaser from 'phaser';
import { config, hex } from '../config';
import { easeInQuad, easeOutBack } from '../juice/ease';
import type { Rarity, UpgradeDef } from '../upgrades';
import { strings } from '../strings';
import { drawCardIcon } from './cardIcons';

const FONT = 'Fredoka, system-ui, sans-serif';
const W = 200;
const H = 300;
const XS = [140, 360, 580];
const Y = 640;
const RARITY_COLOR: Record<Rarity, number> = { common: 0xffffff, rare: 0x4d9dff, epic: 0xb06bff };

interface CardObj {
  c: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Graphics;
  def: UpgradeDef;
  i: number;
}

export class CardPicker {
  private root: Phaser.GameObjects.Container;
  private dim: Phaser.GameObjects.Graphics;
  private title: Phaser.GameObjects.Text;
  private cards: CardObj[] = [];
  private t = 0;
  private picked = -1;
  private pickT = 0;
  private onPick: (u: UpgradeDef) => void = () => {};
  onAppear: () => void = () => {};
  onSelect: () => void = () => {};

  constructor(
    private scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private textRes: number,
  ) {
    const L = config.layout;
    this.dim = scene.add.graphics();
    this.dim.fillGradientStyle(0x0e1a3a, 0x0e1a3a, 0x050a1a, 0x050a1a, 0.92);
    this.dim.fillRect(-100, -100, L.width + 200, L.height + 200);
    this.title = scene.add
      .text(L.width / 2, 400, strings.selectAbility, { fontFamily: FONT, fontSize: '40px', fontStyle: '700', color: '#ffffff', stroke: config.palette.outline, strokeThickness: 10, resolution: textRes })
      .setOrigin(0.5);
    this.root = scene.add.container(0, 0, [this.dim, this.title]).setVisible(false);
    layer.add(this.root);
    // swallow taps on the overlay so nothing behind reacts
    this.dim.setInteractive(new Phaser.Geom.Rectangle(-100, -100, L.width + 200, L.height + 200), Phaser.Geom.Rectangle.Contains);
  }

  get visible(): boolean {
    return this.root.visible;
  }

  show(defs: UpgradeDef[], onPick: (u: UpgradeDef) => void): void {
    for (const c of this.cards) c.c.destroy();
    this.cards = defs.map((d, i) => this.makeCard(d, i));
    this.onPick = onPick;
    this.picked = -1;
    this.t = 0;
    this.root.setVisible(true).setAlpha(1);
    this.onAppear();
  }

  private makeCard(def: UpgradeDef, i: number): CardObj {
    const s = this.scene;
    const rc = RARITY_COLOR[def.rarity];
    const glow = s.add.graphics();
    const g = s.add.graphics();
    g.fillStyle(hex(config.palette.outline), 1);
    g.fillRoundedRect(-W / 2 - 5, -H / 2 - 5, W + 10, H + 10, 22);
    g.fillGradientStyle(0x3f7fe0, 0x3f7fe0, 0x1f4aa8, 0x1f4aa8, 1);
    g.fillRoundedRect(-W / 2, -H / 2, W, H, 18);
    g.fillStyle(0xffffff, 0.12);
    g.fillRoundedRect(-W / 2 + 8, -H / 2 + 8, W - 16, 40, 12);
    g.fillStyle(0x0e2a66, 0.8);
    g.fillCircle(0, -20, 54);
    const icon = s.add.graphics().setPosition(0, -20);
    drawCardIcon(icon, def.icon);
    const txt = (y: number, msg: string, size: number, color = '#ffffff', wrap = W - 24) =>
      s.add
        .text(0, y, msg, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '700', color, stroke: config.palette.outline, strokeThickness: 6, align: 'center', wordWrap: { width: wrap }, resolution: this.textRes })
        .setOrigin(0.5);
    const name = txt(-H / 2 + 28, def.name, 22);
    const desc = txt(70, def.desc, 18);
    const rar = txt(H / 2 - 22, def.rarity.toUpperCase(), 16, `#${rc.toString(16).padStart(6, '0')}`);
    // PICK button under the card
    const btnG = s.add.graphics();
    btnG.fillStyle(hex(config.palette.outline), 1);
    btnG.fillRoundedRect(-62, H / 2 + 22, 124, 52, 26);
    btnG.fillStyle(0x52c2ff, 1);
    btnG.fillRoundedRect(-58, H / 2 + 26, 116, 44, 22);
    const btnT = txt(H / 2 + 48, strings.pick, 24);
    const c = s.add.container(XS[i], Y, [glow, g, icon, name, desc, rar, btnG, btnT]);
    // Container hit areas are measured from its top-left (size centered on the container), so a
    // symmetric size is used: it covers the whole card plus the PICK button below it.
    c.setSize(W + 20, H + 170).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => {
      if (this.picked < 0) c.setScale(0.95);
    });
    c.on('pointerout', () => {
      if (this.picked < 0) c.setScale(1);
    });
    c.on('pointerup', () => this.pick(i));
    this.root.add(c);
    return { c, glow, def, i };
  }

  private pick(i: number): void {
    if (this.picked >= 0 || this.t < 0.45) return;
    this.picked = i;
    this.pickT = 0;
    this.onSelect();
  }

  update(dt: number): void {
    if (!this.root.visible) return;
    this.t += dt;
    const L = config.layout;
    this.title.setScale(Math.min(1, easeOutBack(Math.min(1, this.t / 0.3))));
    for (const card of this.cards) {
      const enter = Math.max(0, Math.min(1, (this.t - card.i * config.cards.stagger) / 0.35));
      const float = Math.sin(this.t * 2.2 + card.i) * 6;
      const rc = RARITY_COLOR[card.def.rarity];
      card.glow.clear();
      card.glow.fillStyle(rc, card.def.rarity === 'common' ? 0.12 : 0.28 + 0.12 * Math.sin(this.t * 5));
      card.glow.fillRoundedRect(-W / 2 - 16, -H / 2 - 16, W + 32, H + 32, 28);
      if (this.picked < 0) {
        card.c.setPosition(XS[card.i], Y + float + (1 - easeOutBack(enter)) * 500).setAlpha(enter);
        continue;
      }
      const k = Math.min(1, this.pickT / 0.6);
      if (card.i === this.picked) {
        // fly to the hero and shrink
        const e = easeInQuad(k);
        card.c.setPosition(XS[card.i] + (L.heroX - XS[card.i]) * e, Y + (L.heroY - Y) * e - Math.sin(k * Math.PI) * 120).setScale(1 + 0.15 * Math.sin(k * Math.PI) - 0.8 * e).setAngle(k * 360);
      } else card.c.setY(Y + float + easeInQuad(k) * 900).setAngle((card.i - this.picked) * 20 * k);
    }
    if (this.picked >= 0) {
      this.pickT += dt;
      this.dim.setAlpha(1 - Math.min(1, this.pickT / 0.6));
      this.title.setAlpha(1 - Math.min(1, this.pickT / 0.3));
      if (this.pickT >= 0.65) {
        this.root.setVisible(false);
        this.dim.setAlpha(1);
        this.title.setAlpha(1);
        const def = this.cards[this.picked].def;
        this.picked = -1;
        this.onPick(def);
      }
    }
  }
}
