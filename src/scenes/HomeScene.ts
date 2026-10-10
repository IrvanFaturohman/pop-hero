// Home screen in the pack's Lobby_Default layout (reference flow, without energy): the coin
// resource bar, "CHAPTER 1" over the blue line deco with the stage name under it, the chapter boss
// on its shadow, the big red START button, and the bottom tab bar (BATTLE / UPGRADES; the other
// slots are locked). After the first finished run a "NEW FEATURE!" popup unlocks UPGRADES and a
// hand points at the tab until it is opened.
import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { config } from '../config';
import { stage1 } from '../levels';
import type { MetaState } from '../logic/meta';
import { loadMeta, saveMeta } from '../storage';
import { strings } from '../strings';
import { ArenaView } from '../view/arenaView';
import { INK, ResourcePill, U, button, dim, icon, playButton, popup, sprite, text } from '../view/gui';
import { tabBody } from '../view/guiCards';
import { pressable } from '../view/hud';
import { Rig } from '../view/rig';
import { UpgradesPanel } from '../view/upgradesPanel';

/** Lobby bottom bar (Tab_01_BottomFlushMenu): 162 canvas units tall, five equal tabs. */
const NAV_H = 162 * U;
const NAV_Y = 1280 - NAV_H / 2;
const SLOT_W = 720 / 5;
const SLOTS = [0, 1, 2, 3, 4].map((i) => SLOT_W * (i + 0.5));

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

    // coin resource bar, top-left (ResourceBar_Group)
    this.coins = new ResourcePill(this, 151 * U, 54 * U, 250 * U, 'ui_resourcebar_icon_gold', 'ic_coin');
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

  /** Chapter line title, stage name, the chapter boss on a soft shadow, its name, START. */
  private makeBattleTab(): Phaser.GameObjects.Container {
    const L = config.layout;
    const cx = L.width / 2;
    const items: Phaser.GameObjects.GameObject[] = [
      sprite(this, 'ui_title_linedeco_01_l_white', cx, 365.5 * U + 39 * U, 448 * U, 39 * U, 0x1d91bb),
      text(this, cx, 365.5 * U - 19 * U, strings.chapter(1), 40),
      text(this, cx, 470.5 * U, stage1.name.toUpperCase(), 66),
    ];
    if (this.meta.bestWave > 0) {
      items.push(icon(this, cx - 44, 560 * U, 'ui_ui_rewards_trophy_01_gold', 52), text(this, cx + 6, 560 * U, `${this.meta.bestWave}/${stage1.waves.length}`, 44, { originX: 0, align: 'left' }));
    }
    const groundY = 720;
    items.push(sprite(this, 'ui_image_deco_oval', cx, groundY, 420, 110, 0x000000, 0.25));
    this.boss = Rig.create(this, 'mole');
    if (this.boss) items.push(this.boss.face(-1).setPosition(cx, groundY + 10).c);
    else items.push(icon(this, cx, groundY - 80, 'ui_ui_play_skull_01', 160));
    items.push(text(this, cx, groundY + 70, strings.bossNames.mole, 56));
    this.startBtn = playButton(this, cx, 640 + 456 * U, strings.start, () => {
      sfx.ui_tap();
      this.start();
    });
    items.push(this.startBtn);
    return this.add.container(0, 0, items);
  }

  /** Bottom tab bar (Tab_01): locked slots, BATTLE, UPGRADES (locked until the first run). */
  private makeNav(): void {
    const L = config.layout;
    // the bar runs past the canvas edges on tall screens
    this.add.rectangle(L.width / 2, NAV_Y + 200, L.width + 400, NAV_H + 400, 0x415760);
    this.navLayer = this.add.container(0, 0);
    SLOTS.forEach((x, i) => {
      if (i === 2) this.navButton(x, 'battle', strings.battle, 'ui_ui_play_battle_01_color');
      else if (i === 3 && this.meta.upgradesUnlocked) this.navButton(x, 'upgrades', strings.upgrades, 'ui_gear_helmet_04');
      else this.navLayer.add(this.add.container(x, NAV_Y, [...tabBody(this, SLOT_W, NAV_H, false), icon(this, 0, 0, 'ui_ui_common_lock_01_silver', 60).setAlpha(0.6)]));
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

  /** The focused tab rises and lightens (icon up, label); the others show just the icon. */
  private drawNav(): void {
    for (const [tab, c] of this.navItems) {
      c.removeAll(true);
      const focus = tab === this.tab;
      c.add(tabBody(this, SLOT_W, NAV_H, focus));
      if (focus) c.add([icon(this, 0, -26 * U, c.getData('icon'), 128 * 1.2 * U * 0.75), text(this, 0, NAV_H / 2 - 29.8 * U, c.getData('label'), 30)]);
      else c.add(icon(this, 0, 0, c.getData('icon'), 128 * U * 0.75));
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
    const box = popup(this, L.width / 2, 600, 865 * U, 700 * U, strings.newFeature);
    box.add([icon(this, 0, -40, 'ui_gear_helmet_04', 150), text(this, 0, 70, strings.unlockedUpgrades, 46, { line: 'none', color: INK.label })]);
    const close = (): void => {
      this.popupC?.destroy();
      this.popupC = null;
      this.meta.upgradesSeen = true;
      saveMeta(this.meta);
      const gloved = this.textures.exists('ui_tutorialhand_01');
      this.handY = NAV_Y - 50;
      // TutorialHand_01 points up: pivot on the fingertip and turn it over to point at the tab
      this.hand = gloved
        ? this.add.image(SLOTS[3], this.handY, 'ui_tutorialhand_01').setOrigin(0.31, 0.03).setDisplaySize(98, 128).setAngle(180)
        : this.add.image(SLOTS[3] + 30, NAV_Y - 110, 'hand').setAngle(180);
      if (!gloved) this.handY = NAV_Y - 110;
    };
    const ok = button(this, { x: 0, y: 700 * U * 0.5 - 120 * U, color: 'blue', label: 'OK', onTap: close });
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
