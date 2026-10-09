// "Select a new ability" overlay (reference layout): star counters on top, 3 tall cards with name,
// icon, 3 level gems, the description of the level you'd get, and a price button under each card
// (FREE / yellow stars / red stars, gray when you can't pay). Evolutions are red cards. If nothing
// is affordable a SKIP button appears. The picked card flies to the hero, the others fall away.
import Phaser from 'phaser';
import { config, hex } from '../config';
import { easeInQuad, easeOutBack } from '../juice/ease';
import { MAX_LEVEL, canAfford, cardDesc, cardName, type Card, type Wallet } from '../abilities';
import { strings } from '../strings';
import { drawCardIcon } from './cardIcons';

const FONT = 'Fredoka, system-ui, sans-serif';
const W = 200;
const H = 300;
const XS = [140, 360, 580];
const Y = 640;

interface CardObj {
  c: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Graphics;
  btn: Phaser.GameObjects.Container;
  card: Card;
  ok: boolean;
  i: number;
  shakeT: number;
}

export class CardPicker {
  private root: Phaser.GameObjects.Container;
  private dim: Phaser.GameObjects.Graphics;
  private title: Phaser.GameObjects.Text;
  private wallet: Phaser.GameObjects.Container;
  private skip: Phaser.GameObjects.Container | null = null;
  private cards: CardObj[] = [];
  private t = 0;
  private picked = -1;
  private pickT = 0;
  private skipping = false;
  private onPick: (c: Card | null) => void = () => {};
  onSelect: () => void = () => {};
  onDenied: () => void = () => {};

  constructor(
    private scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private textRes: number,
  ) {
    const L = config.layout;
    this.dim = scene.add.graphics();
    this.dim.fillGradientStyle(0x0e1a3a, 0x0e1a3a, 0x050a1a, 0x050a1a, 0.92);
    this.dim.fillRect(-100, -100, L.width + 200, L.height + 200);
    this.title = this.text(L.width / 2, 400, strings.selectAbility, 40);
    this.wallet = scene.add.container(L.width / 2, 300);
    this.root = scene.add.container(0, 0, [this.dim, this.title, this.wallet]).setVisible(false);
    layer.add(this.root);
    // swallow taps on the overlay so nothing behind reacts
    this.dim.setInteractive(new Phaser.Geom.Rectangle(-100, -100, L.width + 200, L.height + 200), Phaser.Geom.Rectangle.Contains);
  }

  get visible(): boolean {
    return this.root.visible;
  }

  show(cards: Card[], wallet: Wallet, onPick: (c: Card | null) => void): void {
    for (const c of this.cards) c.c.destroy();
    this.skip?.destroy();
    this.skip = null;
    this.drawWallet(wallet);
    this.cards = cards.map((d, i) => this.makeCard(d, i, canAfford(d, wallet)));
    if (!this.cards.some((c) => c.ok)) this.skip = this.makeSkip();
    this.onPick = onPick;
    this.picked = -1;
    this.skipping = false;
    this.t = 0;
    this.root.setVisible(true).setAlpha(1);
  }

  private text(x: number, y: number, msg: string, size: number, color = '#ffffff', wrap = 0): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, msg, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '700', color, stroke: config.palette.outline, strokeThickness: Math.max(6, size / 5), align: 'center', resolution: this.textRes })
      .setOrigin(0.5);
    if (wrap > 0) t.setWordWrapWidth(wrap);
    return t;
  }

  private drawWallet(w: Wallet): void {
    this.wallet.removeAll(true);
    const s = this.scene;
    const pill = (x: number, icon: string, n: number) => {
      const g = s.add.graphics();
      g.fillStyle(0x000000, 0.35);
      g.fillRoundedRect(x - 10, -22, 110, 44, 22);
      this.wallet.add([g, s.add.image(x + 8, 0, icon).setScale(0.62), this.text(x + 62, 2, String(n), 30)]);
    };
    pill(-120, 'ic_redstar', w.redStars);
    pill(20, 'ic_star', w.stars);
  }

  /** Price pill: FREE, or a star icon + amount; gray when unaffordable. */
  private priceButton(card: Card, ok: boolean): Phaser.GameObjects.Container {
    const s = this.scene;
    const evo = card.kind === 'evo';
    const free = card.stars === 0 && card.redStars === 0;
    const col = !ok ? 0x8c8c99 : evo ? 0xffc21f : free ? 0x52c2ff : 0x52c2ff;
    const g = s.add.graphics();
    g.fillStyle(hex(config.palette.outline), 1);
    g.fillRoundedRect(-66, -28, 132, 56, 26);
    g.fillStyle(col, 1);
    g.fillRoundedRect(-62, -24, 124, 48, 22);
    g.fillStyle(0xffffff, 0.3);
    g.fillRoundedRect(-52, -19, 104, 10, 5);
    const items: Phaser.GameObjects.GameObject[] = [g];
    if (free) items.push(this.text(0, 2, strings.free, 26));
    else {
      items.push(s.add.image(-20, 0, card.redStars > 0 ? 'ic_redstar' : 'ic_star').setScale(0.55));
      items.push(this.text(18, 2, String(card.redStars > 0 ? card.redStars : card.stars), 28, ok ? '#ffffff' : '#ff6b6b'));
    }
    return s.add.container(0, H / 2 + 48, items);
  }

  private makeCard(card: Card, i: number, ok: boolean): CardObj {
    const s = this.scene;
    const evo = card.kind === 'evo';
    const glow = s.add.graphics();
    const g = s.add.graphics();
    const top = evo ? 0xe2445a : 0x3f7fe0;
    const bottom = evo ? 0xa81d3a : 0x1f4aa8;
    g.fillStyle(hex(config.palette.outline), 1);
    g.fillRoundedRect(-W / 2 - 5, -H / 2 - 5, W + 10, H + 10, 22);
    g.fillGradientStyle(top, top, bottom, bottom, 1);
    g.fillRoundedRect(-W / 2, -H / 2, W, H, 18);
    g.fillStyle(0xffffff, 0.12);
    g.fillRoundedRect(-W / 2 + 8, -H / 2 + 8, W - 16, 44, 12);
    g.fillStyle(0x0e2a66, evo ? 0.35 : 0.8);
    g.fillCircle(0, -42, 50);
    // level gems: filled up to the level this card gives (the new one glows)
    g.fillStyle(0x000000, 0.3);
    g.fillRect(-W / 2, 18, W, 34);
    if (evo) {
      g.fillStyle(0xff3b3b, 1);
      this.gem(g, 0, 35, 12, 0xff4d5e);
    } else {
      for (let k = 1; k <= MAX_LEVEL; k++) this.gem(g, (k - 2) * 34, 35, 11, k <= card.level ? 0xffd23f : 0x9aa3c7);
    }
    const icon = s.add.graphics().setPosition(0, -42).setScale(0.82);
    drawCardIcon(icon, card.def.icon);
    const name = this.text(0, -H / 2 + 30, cardName(card), 22, '#ffffff', W - 16);
    const desc = this.text(0, 100, cardDesc(card), 17, '#ffffff', W - 24);
    const btn = this.priceButton(card, ok);
    const items: Phaser.GameObjects.GameObject[] = [glow, g, icon, name, desc, btn];
    if (evo) items.push(this.text(0, -H / 2 - 12, strings.evolve, 20, config.palette.gold));
    const c = s.add.container(XS[i], Y, items);
    if (!ok) g.setAlpha(0.75);
    // Container hit areas are measured from its top-left (size centered on the container), so a
    // symmetric size is used: it covers the whole card plus the price button below it.
    c.setSize(W + 20, H + 170).setInteractive({ useHandCursor: ok });
    const obj: CardObj = { c, glow, btn, card, ok, i, shakeT: 1 };
    c.on('pointerdown', () => {
      if (this.picked < 0 && ok) c.setScale(0.95);
    });
    c.on('pointerout', () => {
      if (this.picked < 0) c.setScale(1);
    });
    c.on('pointerup', () => this.pick(obj));
    this.root.add(c);
    return obj;
  }

  private gem(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number): void {
    g.fillStyle(hex(config.palette.outline), 1);
    g.fillTriangle(x, y - r - 3, x + r + 3, y, x, y + r + 3);
    g.fillTriangle(x, y - r - 3, x - r - 3, y, x, y + r + 3);
    g.fillStyle(color, 1);
    g.fillTriangle(x, y - r, x + r, y, x, y + r);
    g.fillTriangle(x, y - r, x - r, y, x, y + r);
  }

  private makeSkip(): Phaser.GameObjects.Container {
    const s = this.scene;
    const g = s.add.graphics();
    g.fillStyle(hex(config.palette.outline), 1);
    g.fillRoundedRect(-90, -32, 180, 64, 30);
    g.fillStyle(0x8c8c99, 1);
    g.fillRoundedRect(-85, -27, 170, 54, 26);
    const c = s.add.container(config.layout.width / 2, 1000, [g, this.text(0, 2, strings.skip, 28)]);
    c.setSize(180, 64).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => {
      if (this.picked >= 0 || this.skipping || this.t < 0.45) return;
      this.skipping = true;
      this.pickT = 0;
      this.onSelect();
    });
    this.root.add(c);
    return c;
  }

  private pick(obj: CardObj): void {
    if (this.picked >= 0 || this.skipping || this.t < 0.45) return;
    if (!obj.ok) {
      obj.shakeT = 0;
      this.onDenied();
      return;
    }
    this.picked = obj.i;
    this.pickT = 0;
    this.onSelect();
  }

  update(dt: number): void {
    if (!this.root.visible) return;
    this.t += dt;
    const L = config.layout;
    this.title.setScale(Math.min(1, easeOutBack(Math.min(1, this.t / 0.3))));
    this.wallet.setAlpha(Math.min(1, this.t / 0.3));
    const done = this.picked >= 0 || this.skipping;
    for (const card of this.cards) {
      const enter = Math.max(0, Math.min(1, (this.t - card.i * config.cards.stagger) / 0.35));
      const float = Math.sin(this.t * 2.2 + card.i) * 6;
      card.shakeT += dt;
      card.btn.setX(card.shakeT < 0.3 ? Math.sin(card.shakeT * 60) * 8 * (1 - card.shakeT / 0.3) : 0);
      card.glow.clear();
      if (card.ok) {
        card.glow.fillStyle(card.card.kind === 'evo' ? 0xff4d5e : 0x9fd4ff, 0.18 + 0.1 * Math.sin(this.t * 5));
        card.glow.fillRoundedRect(-W / 2 - 16, -H / 2 - 16, W + 32, H + 32, 28);
      }
      if (!done) {
        card.c.setPosition(XS[card.i], Y + float + (1 - easeOutBack(enter)) * 500).setAlpha(enter);
        continue;
      }
      const k = Math.min(1, this.pickT / 0.6);
      if (card.i === this.picked) {
        // fly to the hero and shrink
        const e = easeInQuad(k);
        card.c.setPosition(XS[card.i] + (L.heroX - XS[card.i]) * e, Y + (L.heroY - Y) * e - Math.sin(k * Math.PI) * 120).setScale(1 + 0.15 * Math.sin(k * Math.PI) - 0.8 * e).setAngle(k * 360);
      } else card.c.setY(Y + float + easeInQuad(k) * 900).setAngle((card.i - (this.picked >= 0 ? this.picked : 1)) * 20 * k);
    }
    if (!done) return;
    this.pickT += dt;
    this.dim.setAlpha(1 - Math.min(1, this.pickT / 0.6));
    this.title.setAlpha(1 - Math.min(1, this.pickT / 0.3));
    this.wallet.setAlpha(1 - Math.min(1, this.pickT / 0.3));
    this.skip?.setAlpha(1 - Math.min(1, this.pickT / 0.3));
    if (this.pickT >= 0.65) {
      this.root.setVisible(false);
      this.dim.setAlpha(1);
      this.title.setAlpha(1);
      const card = this.picked >= 0 ? this.cards[this.picked].card : null;
      this.picked = -1;
      this.skipping = false;
      this.onPick(card);
    }
  }
}
