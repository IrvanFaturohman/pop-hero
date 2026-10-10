// "Select a new ability" overlay in the pack's Play_Perk_Selection_01 layout: dark dim, the title
// ribbon, star pills, and three cream cards side by side (grade tag, framed art, name, description
// of the level you'd get, level gems) with a price button under each (FREE / yellow stars / red
// stars, gray when you can't pay). The card color follows the price; evolutions are gold cards
// with an EVOLVE tag. If nothing is affordable a SKIP button appears. The picked card flies to the
// hero, the others fall away.
import Phaser from 'phaser';
import { MAX_LEVEL, canAfford, cardDesc, cardName, type Card, type Wallet } from '../abilities';
import { config } from '../config';
import { easeInQuad, easeOutBack } from '../juice/ease';
import { strings } from '../strings';
import { INK, ResourcePill, U, button, buttonBody, dim, gems, icon, ribbon, skillFrame, text, type BtnColor, type FrameColor } from './gui';
import { cardFrame, tag, type CardColor, type TagColor } from './guiCards';

/** CardFrame_01 is 308 x 640 canvas units; the cards sit 370.84 apart around prefab y -41. */
const W = 308 * U;
const H = 640 * U;
const XS = [-370.84, 0, 370.84].map((x) => 360 + x * U);
const CARD_Y = 640 + 41 * U;
const TITLE_Y = 640 - 518 * U;
const WALLET_Y = 640 - 413 * U;
/** Price button under the card. */
const BTN = { y: H / 2 + 72 * U, w: 236 * U, h: 100 * U };

interface CardObj {
  c: Phaser.GameObjects.Container;
  btn: Phaser.GameObjects.Container;
  card: Card;
  ok: boolean;
  i: number;
  shakeT: number;
}

/** Card look by price: [card, art frame, tag]. */
function look(card: Card): [CardColor, FrameColor, TagColor] {
  if (card.kind === 'evo') return ['red', 'red', 'red'];
  if (card.redStars > 0) return ['plum', 'plum', 'plum'];
  if (card.stars > 0) return ['blue', 'blue', 'blue'];
  return ['green', 'green', 'green'];
}

export class CardPicker {
  private root: Phaser.GameObjects.Container;
  private shade: Phaser.GameObjects.Rectangle;
  private title: Phaser.GameObjects.Container;
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
    _textRes: number,
  ) {
    this.shade = dim(scene);
    this.title = ribbon(scene, config.layout.width / 2, TITLE_Y, 656 * U, 'tangerine', strings.selectAbility, 46);
    this.wallet = scene.add.container(config.layout.width / 2, WALLET_Y);
    this.root = scene.add.container(0, 0, [this.shade, this.title, this.wallet]).setVisible(false);
    layer.add(this.root);
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

  private drawWallet(w: Wallet): void {
    this.wallet.removeAll(true);
    const pw = 220 * U;
    const red = new ResourcePill(this.scene, -pw / 2 - 10, 0, pw, 'ui_economy_star_01_red', 'ic_redstar');
    const yellow = new ResourcePill(this.scene, pw / 2 + 10, 0, pw, 'ui_economy_star_01_yellow', 'ic_star');
    red.set(String(w.redStars));
    yellow.set(String(w.stars));
    this.wallet.add([red.c, yellow.c]);
  }

  /** Price button: FREE, or a star icon + amount; gray when unaffordable. */
  private priceButton(card: Card, ok: boolean): Phaser.GameObjects.Container {
    const s = this.scene;
    const free = card.stars === 0 && card.redStars === 0;
    const color: BtnColor = !ok ? 'gray' : card.kind === 'evo' ? 'orange' : free ? 'green' : 'blue';
    const items = buttonBody(s, BTN.w, BTN.h, color);
    if (free) items.push(text(s, 0, -2, strings.free, 42));
    else {
      const red = card.redStars > 0;
      items.push(icon(s, -24, -2, red ? 'ui_economy_star_01_red' : 'ui_economy_star_01_yellow', 38, red ? 'ic_redstar' : 'ic_star'));
      items.push(text(s, 18, -2, String(red ? card.redStars : card.stars), 44, { color: ok ? '#ffffff' : '#ffd0d0' }));
    }
    return s.add.container(0, BTN.y, items);
  }

  private makeCard(card: Card, i: number, ok: boolean): CardObj {
    const s = this.scene;
    const evo = card.kind === 'evo';
    const [cardColor, frameColor, tagColor] = look(card);
    const top = -H / 2;
    const items: Phaser.GameObjects.GameObject[] = [
      ...cardFrame(s, W, H, cardColor),
      skillFrame(s, 0, top + 149 * U, 154 * U, frameColor, card.def.icon),
      text(s, 0, -25.2 * U, cardName(card), 33, { line: 'none', color: INK.dark, wrap: W - 50 * U }),
      text(s, 0, 70 * U, cardDesc(card), 24, { line: 'none', color: INK.label, wrap: W - 60 * U }),
      evo ? gems(s, 0, H / 2 - 70.3 * U, 1, 1) : gems(s, 0, H / 2 - 70.3 * U, card.level, MAX_LEVEL),
      tag(s, 0, top + 8.5 * U, evo ? strings.evolve : strings.level(card.level), tagColor),
    ];
    const btn = this.priceButton(card, ok);
    items.push(btn);
    const c = s.add.container(XS[i], CARD_Y, items);
    if (!ok) c.setAlpha(0.8);
    c.setSize(W, H + BTN.h * 2).setInteractive({ useHandCursor: ok });
    const obj: CardObj = { c, btn, card, ok, i, shakeT: 1 };
    c.on('pointerdown', () => {
      if (this.picked < 0 && ok) c.setScale(0.96);
    });
    c.on('pointerout', () => {
      if (this.picked < 0) c.setScale(1);
    });
    c.on('pointerup', () => this.pick(obj));
    this.root.add(c);
    return obj;
  }

  private makeSkip(): Phaser.GameObjects.Container {
    const c = button(this.scene, {
      x: config.layout.width / 2,
      y: 640 + 709 * U,
      color: 'gray',
      label: strings.skip,
      onTap: () => {
        if (this.picked >= 0 || this.skipping || this.t < 0.45) return;
        this.skipping = true;
        this.pickT = 0;
        this.onSelect();
      },
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
      const x0 = XS[card.i];
      const enter = Math.max(0, Math.min(1, (this.t - card.i * config.cards.stagger) / 0.35));
      card.shakeT += dt;
      card.btn.setAngle(card.shakeT < 0.3 ? Math.sin(card.shakeT * 60) * 8 * (1 - card.shakeT / 0.3) : 0);
      if (!done) {
        // rise in from below, one after the other
        card.c.setPosition(x0, CARD_Y + (1 - easeOutBack(enter)) * 700).setAlpha(enter * (card.ok ? 1 : 0.8));
        continue;
      }
      const k = Math.min(1, this.pickT / 0.6);
      if (card.i === this.picked) {
        // fly to the hero and shrink
        const e = easeInQuad(k);
        card.c.setPosition(x0 + (L.heroX - x0) * e, CARD_Y + (L.heroY - CARD_Y) * e - Math.sin(k * Math.PI) * 120).setScale(1 + 0.1 * Math.sin(k * Math.PI) - 0.9 * e);
      } else card.c.setY(CARD_Y + easeInQuad(k) * 900);
    }
    if (!done) return;
    this.pickT += dt;
    this.shade.setAlpha(1 - Math.min(1, this.pickT / 0.6));
    this.title.setAlpha(1 - Math.min(1, this.pickT / 0.3));
    this.wallet.setAlpha(1 - Math.min(1, this.pickT / 0.3));
    this.skip?.setAlpha(1 - Math.min(1, this.pickT / 0.3));
    if (this.pickT >= 0.65) {
      this.root.setVisible(false);
      this.shade.setAlpha(1);
      this.title.setAlpha(1);
      const card = this.picked >= 0 ? this.cards[this.picked].card : null;
      this.picked = -1;
      this.skipping = false;
      this.onPick(card);
    }
  }
}
