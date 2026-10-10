// Home screen UPGRADES tab in the pack's lobby style: the hero on a soft shadow, rank
// "APPRENTICE n" with a level bar (Slider_Level02 + rank badge) toward the next rank, and three
// permanent stat cards (DAMAGE / HEALTH / ARMOR) as item tiles with level, bonus and a coin price
// button. Tapping an affordable card buys a level.
import Phaser from 'phaser';
import { config } from '../config';
import { STATS, buyLevel, rankOf, statBonus, upgradeCost, type MetaState, type StatId } from '../logic/meta';
import { strings } from '../strings';
import { LevelBar, U, icon, itemFrame, sprite, text, type FrameColor } from './gui';
import { pressable } from './hud';
import { Rig } from './rig';

const STAT: Record<StatId, { icon: string; color: FrameColor }> = {
  damage: { icon: 'ui_icon_sword01', color: 'red' },
  health: { icon: 'ui_icon_heart', color: 'green' },
  armor: { icon: 'ui_icon_shield', color: 'blue' },
};
const HERO_Y = 560;
const BAR = { y: 680, w: 296 * U * 1.6, h: 70 * U };
const CARD = { y: 880, size: 190 * U * 0.95, dx: 220 };

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
    const items: Phaser.GameObjects.GameObject[] = [sprite(scene, 'ui_image_oval', L.width / 2, HERO_Y, 300, 70, 0x000000, 0.25)];
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
    const badgeX = cx - BAR.w / 2 - 6;
    this.dynamic.add([
      text(s, L.width / 2, HERO_Y + 50, strings.rank(r.rank), 56, { color: config.palette.gold }),
      bar.c,
      text(s, cx, BAR.y - 1, `${r.into}/${config.meta.levelsPerRank}`, 38, { font: 'cairo' }),
      sprite(s, 'ui_slider_level02_icon_badge_blue', badgeX, BAR.y, 102 * U, 107 * U),
      text(s, badgeX, BAR.y + 1, String(r.rank), 52, { font: 'cairo' }),
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
    const items: Phaser.GameObjects.GameObject[] = [
      itemFrame(s, 0, 0, S, def.color, def.icon, strings.level(lv)),
      text(s, 0, S / 2 + 26, strings.statNames[stat], 40),
      text(s, 0, S / 2 + 58, `+${statBonus(stat)}`, 38, { font: 'cairo', color: '#3ddc84' }),
      sprite(s, `ui_button01_s_${ok ? 'green' : 'gray'}`, 0, S / 2 + 112, 180, 64),
      icon(s, -30, S / 2 + 109, 'ui_itemicon_money_coin', 40, 'ic_coin'),
      text(s, 16, S / 2 + 109, String(cost), 40, { font: 'cairo', color: ok ? '#ffffff' : '#ffb0b0' }),
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
