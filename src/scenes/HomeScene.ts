// Home screen in the pack's Lobby layout (reference flow, without energy): top bar with the coin
// pill, the chapter banner, the chapter boss on its shadow, the tapered START button, and the bottom
// menu bar (BATTLE / UPGRADES; the other slots are locked). After the first finished run a
// "NEW FEATURE!" popup unlocks UPGRADES and a hand points at the tab until it is opened.
import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { config } from '../config';
import { stage1 } from '../levels';
import type { MetaState } from '../logic/meta';
import { loadMeta, saveMeta } from '../storage';
import { strings } from '../strings';
import { ArenaView } from '../view/arenaView';
import { ResourcePill, U, button, dim, icon, playButton, popup, sprite, text } from '../view/gui';
import { pressable } from '../view/hud';
import { Rig } from '../view/rig';
import { UpgradesPanel } from '../view/upgradesPanel';

/** Lobby bottom bar: 179.7 canvas units tall, five equal slots. */
const NAV_H = 179.7 * U;
const NAV_Y = 1280 - NAV_H / 2;
const SLOT_W = 720 / 5;
const SLOTS = [0, 1, 2, 3, 4].map((i) => SLOT_W * (i + 0.5));
const TOP_H = 117.7 * U;

type Tab = 'battle' | 'upgrades';

export class HomeScene extends Phaser.Scene {
  private t = 0;
  private meta!: MetaState;
  private coins!: ResourcePill;
  private battleTab!: Phaser.GameObjects.Container;
  private upgrades!: UpgradesPanel;
  private navLayer!: Phaser.GameObjects.Container;
  private navItems = new Map<Tab, Phaser.GameObjects.Container>();
  private hand: Phaser.GameObjects.Image | null = null;
  private handY = 0;
  private boss: Rig | null = null;
  private popupC: Phaser.GameObjects.Container | null = null;
  private startBtn!: Phaser.GameObjects.Container;
  private tab: Tab = 'battle';
  private leaving = false;

  constructor() {
    super('Home');
  }

  create(): void {
    const rs = (this.registry.get('renderScale') as number) ?? 1;
    const L = config.layout;
    this.t = 0;
    this.leaving = false;
    this.tab = 'battle';
    this.hand = null;
    this.popupC = null;
    this.navItems.clear();
    this.meta = loadMeta();
    this.cameras.main.setZoom(rs).centerOn(L.width / 2, L.height / 2);
    const bg = this.add.layer();
    new ArenaView(this, bg);
    const shade = this.add.graphics();
    shade.fillGradientStyle(0x0e3a3c, 0x0e3a3c, 0x120a2e, 0x120a2e, 0.2, 0.2, 0.8, 0.8);
    shade.fillRect(-200, -400, L.width + 400, L.height + 800);

    // top bar: a solid band with the coin pill (Lobby Topbar)
    this.add.rectangle(L.width / 2, TOP_H / 2 - 200, L.width + 400, TOP_H + 400, 0x424fcc);
    this.coins = new ResourcePill(this, 38 + (227 * U) / 2, TOP_H / 2, 227 * U, 'ui_resourcebar_single_icon_coin', 'ic_coin');
    this.coins.set(String(this.meta.coins));

    this.battleTab = this.makeBattleTab();
    this.upgrades = new UpgradesPanel(this, rs, this.meta);
    this.upgrades.onBuy = (reward) => {
      sfx.tier_up(2);
      saveMeta(this.meta);
      this.coins.set(String(this.meta.coins));
      if (reward > 0) this.toast(strings.rankUp(reward));
    };
    this.upgrades.onDenied = () => sfx.empty_click();
    this.makeNav();
    this.showTab('battle');
    if (this.meta.upgradesUnlocked && !this.meta.upgradesSeen) this.showPopup();
    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  /** Chapter banner (dark BannerFrame), the chapter boss on a soft shadow, its name, START. */
  private makeBattleTab(): Phaser.GameObjects.Container {
    const L = config.layout;
    const cx = L.width / 2;
    const bw = 1010 * U;
    const bh = 117 * U;
    const by = TOP_H + 30 + bh / 2;
    const items: Phaser.GameObjects.GameObject[] = [
      sprite(this, 'ui_bannerframe00_04-06_bg', cx, by, bw - 4 * U, bh - 4 * U, 0x343549),
      sprite(this, 'ui_bannerframe00_04-06_border', cx, by, bw, bh, 0x000000),
      text(this, cx - bw / 2 + 30, by - 2, strings.chapter(1, stage1.name.toUpperCase()), 44, { originX: 0, align: 'left' }),
    ];
    if (this.meta.bestWave > 0) {
      items.push(icon(this, cx + bw / 2 - 150, by, 'ui_itemicon_trophy_gold', 64), text(this, cx + bw / 2 - 30, by - 2, `${this.meta.bestWave}/${stage1.waves.length}`, 46, { font: 'cairo', originX: 1 }));
    }
    const groundY = 700;
    items.push(sprite(this, 'ui_image_oval', cx, groundY, 420, 110, 0x000000, 0.2));
    this.boss = Rig.create(this, 'mole');
    if (this.boss) items.push(this.boss.face(-1).setPosition(cx, groundY + 10).c);
    else items.push(icon(this, cx, groundY - 80, 'ui_itemicon_skull', 160));
    items.push(text(this, cx, groundY + 80, strings.bossNames.mole, 64));
    this.startBtn = playButton(this, cx, 930, strings.start, () => {
      sfx.ui_tap();
      this.start();
    });
    items.push(this.startBtn);
    return this.add.container(0, 0, items);
  }

  /** Bottom menu bar (Menu_BottomBtn): locked slots, BATTLE, UPGRADES (locked until the first run). */
  private makeNav(): void {
    const L = config.layout;
    // Menu_BottomBtn_Bg is a black sprite tinted #1e2440 in the prefab: a plain fill reads the same
    this.add.rectangle(L.width / 2, NAV_Y + 200, L.width + 400, NAV_H + 400, 0x1e2440);
    this.navLayer = this.add.container(0, 0);
    SLOTS.forEach((x, i) => {
      if (i === 2) this.navButton(x, 'battle', strings.battle, 'ui_itemicon_battle');
      else if (i === 3 && this.meta.upgradesUnlocked) this.navButton(x, 'upgrades', strings.upgrades, 'ui_itemicon_gear_armor_top');
      else icon(this, x, NAV_Y, 'ui_icon_lock01_s', 52).setAlpha(0.45);
    });
  }

  private navButton(x: number, tab: Tab, label: string, iconKey: string): void {
    const c = this.add.container(x, NAV_Y);
    c.setSize(SLOT_W, NAV_H).setInteractive({ useHandCursor: true });
    pressable(c, () => {
      sfx.ui_tap();
      this.showTab(tab);
    });
    this.navItems.set(tab, c);
    this.navLayer.add(c);
    c.setData('label', label).setData('icon', iconKey);
  }

  /** The focused slot rises (TabFocus + light, icon up, label); the others show just the icon. */
  private drawNav(): void {
    for (const [tab, c] of this.navItems) {
      c.removeAll(true);
      const focus = tab === this.tab;
      if (focus) {
        c.add([
          sprite(this, 'ui_menu_bottombtn_tabfocus', 0, -5, SLOT_W + 6, 189 * U, 0x4452d5),
          sprite(this, 'ui_menu_bottombtn_tabfocus_light', 0, -7, SLOT_W - 2, 184 * U, 0x6d85fd),
          icon(this, 0, -34 * U - 6, c.getData('icon'), 104 * U),
          text(this, 0, 46 * U - 4, c.getData('label'), 32),
        ]);
      } else c.add(icon(this, 0, 8 * U, c.getData('icon'), 96 * U));
    }
  }

  private showTab(tab: Tab): void {
    this.tab = tab;
    this.battleTab.setVisible(tab === 'battle');
    this.upgrades.root.setVisible(tab === 'upgrades');
    if (tab === 'upgrades' && this.hand) {
      this.hand.destroy();
      this.hand = null;
    }
    this.drawNav();
  }

  /** "NEW FEATURE!" popup, tap to continue, then a hand points at the UPGRADES tab. */
  private showPopup(): void {
    const L = config.layout;
    const box = popup(this, L.width / 2, 600, 900 * U, 700 * U, strings.newFeature);
    box.add([icon(this, 0, -30, 'ui_itemicon_gear_armor_top', 150), text(this, 0, 90, strings.unlockedUpgrades, 46, { color: config.palette.gold })]);
    const close = (): void => {
      this.popupC?.destroy();
      this.popupC = null;
      this.meta.upgradesSeen = true;
      saveMeta(this.meta);
      const gloved = this.textures.exists('ui_tutorial_hand_2');
      this.handY = NAV_Y - 70;
      this.hand = gloved
        ? this.add.image(SLOTS[3] + 10, this.handY, 'ui_tutorial_hand_2').setOrigin(0.18, 0.16).setDisplaySize(118, 118).setAngle(208)
        : this.add.image(SLOTS[3] + 30, NAV_Y - 110, 'hand').setAngle(180);
      if (!gloved) this.handY = NAV_Y - 110;
    };
    const ok = button(this, { x: 0, y: 700 * U * 0.5 - 90 * U, color: 'sky', label: 'OK', onTap: close });
    box.add(ok);
    const shade = dim(this);
    // ignore the release of the press that opened the home screen
    this.time.delayedCall(350, () => shade.once('pointerup', close));
    this.popupC = this.add.container(0, 0, [shade, box]);
    sfx.tier_up(3);
  }

  private toast(msg: string): void {
    const t = text(this, config.layout.width / 2, 1040, msg, 48, { color: config.palette.gold });
    this.tweens.add({ targets: t, y: 980, alpha: 0, delay: 700, duration: 600, onComplete: () => t.destroy() });
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
    if (this.tab === 'battle') this.startBtn.setAngle(Math.sin(this.t * 3) * 1.2);
    if (this.hand) this.hand.setY(this.handY + Math.sin(this.t * 6) * 12);
    if (this.boss && this.tab === 'battle') this.boss.pose({ bob: Math.sin(this.t * 2.4) * 2, swing: Math.sin(this.t * 1.2) * 8 });
    if (this.popupC) this.popupC.setAlpha(Math.min(1, this.t / 0.3));
  }
}
