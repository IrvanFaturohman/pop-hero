// "Select a new ability" overlay in the pack's Play_UI_ChoiceSkill layout: dark dim, star pills on
// top, the divider title, and three dark banner cards (skill frame + art, name, description of the
// level you'd get, level gems) with a price button (FREE / yellow stars / red stars, gray when you
// can't pay). Evolutions get a red frame and an EVOLVE tag. If nothing is affordable a SKIP button
// appears. The picked card flies to the hero, the others fall away.
import Phaser from 'phaser';
import { MAX_LEVEL, canAfford, cardDesc, cardName, type Card, type Wallet } from '../abilities';
import { config } from '../config';
import { easeInQuad, easeOutBack } from '../juice/ease';
import { strings } from '../strings';
import { ResourcePill, U, bannerCard, button, dim, dividerTitle, gems, icon, skillFrame, sprite, text, type BtnColor } from './gui';

/** BannerFrame04_Divided is 850 x 275 canvas units; the cards sit at prefab y 131 / -167 / -467. */
const W = 850 * U;
const H = 275 * U;
const YS = [131, -167, -467].map((y) => 640 - y * U);
const TITLE_Y = 640 - 337.7 * U;

interface CardObj {
  c: Phaser.GameObjects.Container;
  btn: Phaser.GameObjects.Container;
  card: Card;
  ok: boolean;
  i: number;
  shakeT: number;
}

export class CardPicker {
  private root: Phaser.GameObjects.Container;
  private shade: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
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
    this.title = dividerTitle(scene, config.layout.width / 2, TITLE_Y, strings.selectAbility, 2, 40);
    this.wallet = scene.add.container(config.layout.width / 2, TITLE_Y - 80);
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
    const pw = 168 * U;
    const red = new ResourcePill(this.scene, -pw / 2 - 8, 0, pw, 'ui_itemicon_star_red', 'ic_redstar');
    const yellow = new ResourcePill(this.scene, pw / 2 + 8, 0, pw, 'ui_itemicon_star_gold', 'ic_star');
    red.set(String(w.redStars));
    yellow.set(String(w.stars));
    this.wallet.add([red.c, yellow.c]);
  }

  /** Price button: FREE, or a star icon + amount; gray when unaffordable. */
  private priceButton(card: Card, ok: boolean): Phaser.GameObjects.Container {
    const s = this.scene;
    const free = card.stars === 0 && card.redStars === 0;
    const color: BtnColor = !ok ? 'gray' : card.kind === 'evo' ? 'yellow' : free ? 'green' : 'sky';
    const bw = 190 * U;
    const bh = 96 * U;
    const items: Phaser.GameObjects.GameObject[] = [sprite(s, `ui_button01_s_${color}`, 0, 0, bw, bh)];
    if (free) items.push(text(s, 0, -2, strings.free, 36, { line: color === 'gray' ? 'black' : 'green' }));
    else {
      const red = card.redStars > 0;
      items.push(icon(s, -22, -3, red ? 'ui_itemicon_star_red' : 'ui_itemicon_star_gold', 40, red ? 'ic_redstar' : 'ic_star'));
      items.push(text(s, 18, -2, String(red ? card.redStars : card.stars), 40, { font: 'cairo', color: ok ? '#ffffff' : '#ff6b6b' }));
    }
    return s.add.container(W / 2 - bw / 2 - 18 * U, -H / 2 + bh / 2 + 18 * U, items);
  }

  private makeCard(card: Card, i: number, ok: boolean): CardObj {
    const s = this.scene;
    const evo = card.kind === 'evo';
    const fs = 187 * U;
    const textX = -181 * U;
    const items: Phaser.GameObjects.GameObject[] = [
      ...bannerCard(s, W, H),
      skillFrame(s, -W / 2 + 116 * U, -20.8 * U, fs, evo ? 'red' : 'blue', card.def.icon),
      evo ? gems(s, -308.9 * U, 100.5 * U, 1, 1) : gems(s, -308.9 * U, 100.5 * U, card.level, MAX_LEVEL),
      text(s, textX, -70.7 * U, cardName(card), 50, { originX: 0, align: 'left' }),
      text(s, textX, 38 * U, cardDesc(card), 32, { originX: 0, align: 'left', color: '#b8b9d7', line: 'none', wrap: 560 * U }),
    ];
    const btn = this.priceButton(card, ok);
    items.push(btn);
    if (evo) items.push(text(s, -W / 2 + 116 * U, -H / 2 - 4, strings.evolve, 30, { line: 'red', color: config.palette.gold }));
    const c = s.add.container(config.layout.width / 2, YS[i], items);
    if (!ok) c.setAlpha(0.8);
    c.setSize(W, H).setInteractive({ useHandCursor: ok });
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
      y: YS[2] + H / 2 + 90,
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
    const cx = L.width / 2;
    this.title.setScale(Math.min(1, easeOutBack(Math.min(1, this.t / 0.3))));
    this.wallet.setAlpha(Math.min(1, this.t / 0.3));
    const done = this.picked >= 0 || this.skipping;
    for (const card of this.cards) {
      const y0 = YS[card.i];
      const enter = Math.max(0, Math.min(1, (this.t - card.i * config.cards.stagger) / 0.35));
      card.shakeT += dt;
      card.btn.setAngle(card.shakeT < 0.3 ? Math.sin(card.shakeT * 60) * 8 * (1 - card.shakeT / 0.3) : 0);
      if (!done) {
        // slide in from the right, one after the other
        card.c.setPosition(cx + (1 - easeOutBack(enter)) * 700, y0).setAlpha(enter * (card.ok ? 1 : 0.8));
        continue;
      }
      const k = Math.min(1, this.pickT / 0.6);
      if (card.i === this.picked) {
        // fly to the hero and shrink
        const e = easeInQuad(k);
        card.c.setPosition(cx + (L.heroX - cx) * e, y0 + (L.heroY - y0) * e - Math.sin(k * Math.PI) * 120).setScale(1 + 0.1 * Math.sin(k * Math.PI) - 0.9 * e);
      } else card.c.setX(cx + easeInQuad(k) * 800 * (card.i % 2 === 0 ? 1 : -1));
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
