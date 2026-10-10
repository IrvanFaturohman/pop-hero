// Home screen UPGRADES tab in the pack's lobby style: the hero on a soft shadow, rank
// "APPRENTICE n" with a level bar (Slider_Level_02: Slider_01 + diamond rank badge) toward the next
// rank, and three permanent stat cards (DAMAGE / HEALTH / ARMOR) as item tiles with level, bonus
// and a coin price button. Tapping an affordable card buys a level.
import Phaser from 'phaser';
import { config } from '../config';
import { STATS, buyLevel, rankOf, statBonus, upgradeCost, type MetaState, type StatId } from '../logic/meta';
import { strings } from '../strings';
import { LevelBar, U, buttonBody, icon, itemFrame, sprite, text, type FrameColor } from './gui';
import { pressable } from './hud';
import { Rig } from './rig';

const STAT: Record<StatId, { icon: string; color: FrameColor }> = {
  damage: { icon: 'ui_gear_weapons_sword_01', color: 'red' },
  health: { icon: 'ui_economy_heart_red', color: 'green' },
  armor: { icon: 'ui_gear_shield_01', color: 'blue' },
};
const HERO_Y = 560;
const BAR = { y: 680, w: 420 * U, h: 49 * U };
const CARD = { y: 870, size: 154 * U, dx: 220 };

export class UpgradesPanel {
  readonly root: Phaser.GameObjects.Container;
  private dynamic: Phaser.GameObjects.Container;
  onBuy: (rankReward: number) => void = () => {};
  onDenied: () => void = () => {};

  constructor(
    private scene: Phaser.Scene,
    _textRes: number,
    private meta: MetaState,
  ) {
    const L = config.layout;
    this.dynamic = scene.add.container(0, 0);
    const items: Phaser.GameObjects.GameObject[] = [sprite(scene, 'ui_image_deco_oval', L.width / 2, HERO_Y, 300, 70, 0x000000, 0.25)];
    const rig = Rig.create(scene, 'hero');
    if (rig) items.push(rig.face(1).setPosition(L.width / 2 - 10, HERO_Y + 6).c);
    else items.push(scene.add.image(L.width / 2 - 10, HERO_Y - 70, 'hero').setScale(1.4), scene.add.image(L.width / 2 + 14, HERO_Y - 56, 'blaster').setOrigin(0.15, 0.55).setScale(1.4));
    this.root = scene.add.container(0, 0, [...items, this.dynamic]);
    this.refresh();
  }

  /** Rebuild the rank bar and the cards (after a purchase). */
  refresh(): void {
    this.dynamic.removeAll(true);
    const L = config.layout;
    const s = this.scene;
    const r = rankOf(this.meta);
    const cx = L.width / 2 + 20;
    const bar = new LevelBar(s, cx, BAR.y, BAR.w, BAR.h);
    bar.set(r.progress);
    const badgeX = cx - BAR.w / 2 - 4;
    this.dynamic.add([
      text(s, L.width / 2, HERO_Y + 50, strings.rank(r.rank), 56, { color: config.palette.gold }),
      bar.c,
      text(s, cx, BAR.y, `${r.into}/${config.meta.levelsPerRank}`, 30),
      sprite(s, 'ui_slider_level_02_icon', badgeX, BAR.y, 90 * U, 90 * U, s.textures.exists('ui_slider_level_02_icon') ? undefined : 0x35a6e1),
      text(s, badgeX, BAR.y, String(r.rank), 44),
    ]);
    STATS.forEach((stat, i) => this.dynamic.add(this.card(stat, L.width / 2 + (i - 1) * CARD.dx)));
  }

  private card(stat: StatId, x: number): Phaser.GameObjects.Container {
    const s = this.scene;
    const lv = this.meta.levels[stat];
    const cost = upgradeCost(lv);
    const ok = this.meta.coins >= cost;
    const def = STAT[stat];
    const S = CARD.size;
    const price = s.add.container(0, S / 2 + 118, [
      ...buttonBody(s, 180, 64, ok ? 'green' : 'gray'),
      icon(s, -34, -2, 'ui_economy_coin_02_gold', 40, 'ic_coin'),
      text(s, 14, -2, String(cost), 40, { color: ok ? '#ffffff' : '#ffd0d0' }),
    ]);
    const items: Phaser.GameObjects.GameObject[] = [
      itemFrame(s, 0, 0, S, def.color, def.icon, strings.level(lv)),
      text(s, 0, S / 2 + 28, strings.statNames[stat], 40),
      text(s, 0, S / 2 + 62, `+${statBonus(stat)}`, 38, { color: '#69ff20' }),
      price,
    ];
    const c = s.add.container(x, CARD.y, items);
    c.setSize(S + 20, S + 280).setInteractive({ useHandCursor: true });
    pressable(c, () => {
      const reward = buyLevel(this.meta, stat);
      if (reward < 0) {
        this.onDenied();
        return;
      }
      this.onBuy(reward);
      this.refresh();
    });
    return c;
  }
}
