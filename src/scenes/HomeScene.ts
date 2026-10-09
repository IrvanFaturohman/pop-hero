// Home screen (reference flow, without energy): coin counter, the chapter card with START, and a
// bottom nav (BATTLE / UPGRADES; the other slots are locked). After the first finished run a
// "NEW FEATURE!" popup unlocks UPGRADES and a hand points at the tab until it is opened.
import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { config, hex } from '../config';
import { stage1 } from '../levels';
import type { MetaState } from '../logic/meta';
import { loadMeta, saveMeta } from '../storage';
import { strings } from '../strings';
import { ArenaView } from '../view/arenaView';
import { drawCardIcon } from '../view/cardIcons';
import { pressable } from '../view/hud';
import { UpgradesPanel } from '../view/upgradesPanel';

const FONT = 'Fredoka, system-ui, sans-serif';
const NAV_Y = 1206;
const SLOTS = [72, 216, 360, 504, 648];

type Tab = 'battle' | 'upgrades';

export class HomeScene extends Phaser.Scene {
  private rs = 1;
  private t = 0;
  private meta!: MetaState;
  private coinText!: Phaser.GameObjects.Text;
  private battleTab!: Phaser.GameObjects.Container;
  private upgrades!: UpgradesPanel;
  private navG!: Phaser.GameObjects.Graphics;
  private hand: Phaser.GameObjects.Image | null = null;
  private popup: Phaser.GameObjects.Container | null = null;
  private startBtn!: Phaser.GameObjects.Container;
  private tab: Tab = 'battle';
  private leaving = false;

  constructor() {
    super('Home');
  }

  create(): void {
    this.rs = (this.registry.get('renderScale') as number) ?? 1;
    const L = config.layout;
    this.t = 0;
    this.leaving = false;
    this.tab = 'battle';
    this.hand = null;
    this.popup = null;
    this.meta = loadMeta();
    this.cameras.main.setZoom(this.rs).centerOn(L.width / 2, L.height / 2);
    const bg = this.add.layer();
    new ArenaView(this, bg);
    const shade = this.add.graphics();
    shade.fillGradientStyle(0x0e3a3c, 0x0e3a3c, 0x120a2e, 0x120a2e, 0.35, 0.35, 0.85, 0.85);
    shade.fillRect(0, 0, L.width, L.height);

    // coins
    const pill = this.add.graphics();
    pill.fillStyle(0x000000, 0.4);
    pill.fillRoundedRect(L.width / 2 - 90, 28, 180, 48, 24);
    this.add.image(L.width / 2 - 60, 52, 'ic_coin').setScale(0.62);
    this.coinText = this.text(L.width / 2 + 14, 54, String(this.meta.coins), 30);

    this.battleTab = this.makeBattleTab();
    this.upgrades = new UpgradesPanel(this, this.rs, this.meta);
    this.upgrades.onBuy = (reward) => {
      sfx.tier_up(2);
      saveMeta(this.meta);
      this.coinText.setText(String(this.meta.coins));
      if (reward > 0) this.toast(strings.rankUp(reward));
    };
    this.upgrades.onDenied = () => sfx.empty_click();
    this.makeNav();
    this.showTab('battle');
    if (this.meta.upgradesUnlocked && !this.meta.upgradesSeen) this.showPopup();
    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  private text(x: number, y: number, msg: string, size: number, color = '#ffffff'): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, msg, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '700', color, stroke: config.palette.outline, strokeThickness: Math.max(5, size / 5), align: 'center', resolution: this.rs })
      .setOrigin(0.5);
  }

  /** Chapter ribbon, a mole burrow with a warning sign (the chapter boss lives there), START. */
  private makeBattleTab(): Phaser.GameObjects.Container {
    const L = config.layout;
    const ol = hex(config.palette.outline);
    const g = this.add.graphics();
    // ribbon
    g.fillStyle(ol, 1);
    g.fillRoundedRect(L.width / 2 - 230, 312, 460, 64, 14);
    g.fillStyle(0x1f8a7a, 1);
    g.fillRoundedRect(L.width / 2 - 225, 317, 450, 54, 11);
    // burrow mound
    g.fillStyle(0x2e6b3f, 1);
    g.fillEllipse(L.width / 2, 650, 460, 90);
    g.fillStyle(ol, 1);
    g.fillEllipse(L.width / 2, 600, 330, 210);
    g.fillStyle(0x8a5a3c, 1);
    g.fillEllipse(L.width / 2, 600, 320, 200);
    g.fillStyle(0xa8714b, 1);
    g.fillEllipse(L.width / 2 - 30, 570, 200, 110);
    g.fillStyle(ol, 1);
    g.fillEllipse(L.width / 2, 640, 150, 110);
    g.fillStyle(0x1a1214, 1);
    g.fillEllipse(L.width / 2, 644, 138, 98);
    // two glowing eyes in the dark
    const blink = 1;
    g.fillStyle(0xffd23f, blink);
    g.fillCircle(L.width / 2 - 18, 640, 6);
    g.fillCircle(L.width / 2 + 18, 640, 6);
    // warning sign
    g.fillStyle(ol, 1);
    g.fillRect(L.width / 2 + 150, 520, 12, 130);
    g.fillRoundedRect(L.width / 2 + 104, 492, 104, 70, 10);
    g.fillStyle(0xd9a066, 1);
    g.fillRoundedRect(L.width / 2 + 109, 497, 94, 60, 8);
    g.fillStyle(ol, 1);
    g.fillCircle(L.width / 2 + 156, 520, 14);
    g.fillRect(L.width / 2 + 147, 528, 18, 12);
    g.fillStyle(0xd9a066, 1);
    g.fillCircle(L.width / 2 + 150, 519, 4);
    g.fillCircle(L.width / 2 + 162, 519, 4);
    const items: Phaser.GameObjects.GameObject[] = [g, this.text(L.width / 2, 345, strings.chapter(1, stage1.name.toUpperCase()), 30)];
    if (this.meta.bestWave > 0) items.push(this.text(L.width / 2, 730, strings.best(this.meta.bestWave), 22, '#cfe9e6'));
    this.startBtn = this.bigButton(L.width / 2, 850, strings.start, 0xffc21f, () => this.start());
    items.push(this.startBtn);
    return this.add.container(0, 0, items);
  }

  private bigButton(x: number, y: number, label: string, color: number, onTap: () => void): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(hex(config.palette.outline), 1);
    g.fillRoundedRect(-150, -52, 300, 104, 26);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-144, -46, 288, 92, 22);
    g.fillStyle(0xffffff, 0.35);
    g.fillRoundedRect(-128, -38, 256, 18, 9);
    const c = this.add.container(x, y, [g, this.text(0, 2, label, 46)]);
    c.setSize(300, 104).setInteractive({ useHandCursor: true });
    pressable(c, () => {
      sfx.ui_tap();
      onTap();
    });
    return c;
  }

  /** Bottom nav: locked slots, BATTLE, UPGRADES (locked until the first run is done). */
  private makeNav(): void {
    const L = config.layout;
    const bar = this.add.graphics();
    bar.fillStyle(0x15102a, 0.95);
    bar.fillRect(0, NAV_Y - 64, L.width, L.height - NAV_Y + 64);
    // the selected-tab highlight sits on the bar, under the tab buttons
    this.navG = this.add.graphics();
    SLOTS.forEach((x, i) => {
      if (i === 2) this.navButton(x, 'battle', strings.battle, 'bullet');
      else if (i === 3 && this.meta.upgradesUnlocked) this.navButton(x, 'upgrades', strings.upgrades, 'gauge');
      else this.padlock(x);
    });
  }

  private navButton(x: number, tab: Tab, label: string, icon: string): void {
    const icg = this.add.graphics().setScale(0.45);
    drawCardIcon(icg, icon);
    const c = this.add.container(x, NAV_Y, [icg, this.text(0, 44, label, 18)]);
    c.setSize(140, 120).setInteractive({ useHandCursor: true });
    pressable(c, () => {
      sfx.ui_tap();
      this.showTab(tab);
    });
  }

  private padlock(x: number): void {
    const g = this.add.graphics();
    g.lineStyle(7, 0x6c6788, 1);
    g.strokeCircle(x, NAV_Y - 12, 14);
    g.fillStyle(0x6c6788, 1);
    g.fillRoundedRect(x - 20, NAV_Y - 8, 40, 32, 6);
  }

  private showTab(tab: Tab): void {
    this.tab = tab;
    this.battleTab.setVisible(tab === 'battle');
    this.upgrades.root.setVisible(tab === 'upgrades');
    if (tab === 'upgrades' && this.hand) {
      this.hand.destroy();
      this.hand = null;
    }
    const g = this.navG;
    g.clear();
    const x = SLOTS[tab === 'battle' ? 2 : 3];
    g.fillStyle(0xffc21f, 1);
    g.fillRoundedRect(x - 68, NAV_Y - 62, 136, 124, 16);
    g.fillStyle(0xffffff, 0.25);
    g.fillRoundedRect(x - 60, NAV_Y - 56, 120, 16, 8);
  }

  /** "NEW FEATURE! UPGRADES UNLOCKED", tap to continue, then a hand points at the tab. */
  private showPopup(): void {
    const L = config.layout;
    const dim = this.add.rectangle(L.width / 2, L.height / 2, L.width + 200, L.height + 200, 0x0a0618, 0.85).setInteractive();
    const g = this.add.graphics();
    g.fillStyle(hex(config.palette.outline), 1);
    g.fillRoundedRect(L.width / 2 - 200, 420, 400, 80, 16);
    g.fillStyle(0xe2445a, 1);
    g.fillRoundedRect(L.width / 2 - 194, 426, 388, 68, 12);
    const icon = this.add.graphics().setPosition(L.width / 2, 600).setScale(1.1);
    drawCardIcon(icon, 'gauge');
    this.popup = this.add.container(0, 0, [
      dim,
      g,
      this.text(L.width / 2, 462, strings.newFeature, 40),
      icon,
      this.text(L.width / 2, 720, strings.unlockedUpgrades, 36, config.palette.gold),
      this.text(L.width / 2, 1000, strings.tapToContinue, 24, '#cfc8e6'),
    ]);
    sfx.tier_up(3);
    dim.once('pointerup', () => {
      this.popup?.destroy();
      this.popup = null;
      this.meta.upgradesSeen = true;
      saveMeta(this.meta);
      this.hand = this.add.image(SLOTS[3] + 30, NAV_Y - 110, 'hand').setAngle(180);
    });
  }

  private toast(msg: string): void {
    const t = this.text(config.layout.width / 2, 1060, msg, 34, config.palette.gold);
    this.tweens.add({ targets: t, y: 1000, alpha: 0, delay: 700, duration: 600, onComplete: () => t.destroy() });
  }

  private start(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game'));
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);
    this.t += dt;
    if (this.tab === 'battle') this.startBtn.setAngle(Math.sin(this.t * 3) * 1.5);
    if (this.hand) this.hand.setY(NAV_Y - 110 + Math.sin(this.t * 6) * 12);
    if (this.popup) this.popup.setAlpha(Math.min(1, this.t / 0.3));
  }
}
