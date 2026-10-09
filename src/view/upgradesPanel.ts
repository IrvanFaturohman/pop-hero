// Home screen UPGRADES tab (reference): the hero on a podium, rank "APPRENTICE n" with a progress
// bar toward the next rank, and three permanent stat cards (DAMAGE / HEALTH / ARMOR) with their
// level, bonus and coin price. Tapping an affordable card buys a level.
import Phaser from 'phaser';
import { config, hex } from '../config';
import { STATS, buyLevel, rankOf, statBonus, upgradeCost, type MetaState, type StatId } from '../logic/meta';
import { strings } from '../strings';
import { drawCardIcon } from './cardIcons';
import { pressable } from './hud';

const FONT = 'Fredoka, system-ui, sans-serif';
const ICON: Record<StatId, string> = { damage: 'bullet', health: 'heart', armor: 'shield' };
const CARD = { y: 880, w: 180, h: 240, dx: 200 };
const BAR = { x: 130, y: 640, w: 460 };

export class UpgradesPanel {
  readonly root: Phaser.GameObjects.Container;
  private dynamic: Phaser.GameObjects.Container;
  onBuy: (rankReward: number) => void = () => {};
  onDenied: () => void = () => {};

  constructor(
    private scene: Phaser.Scene,
    private textRes: number,
    private meta: MetaState,
  ) {
    const L = config.layout;
    const g = scene.add.graphics();
    // light rays behind the hero + podium
    g.fillStyle(0xffffff, 0.08);
    g.fillTriangle(L.width / 2, 190, 120, 620, 600, 620);
    g.fillStyle(0x2e2a5c, 0.55);
    g.fillEllipse(L.width / 2, 560, 300, 70);
    g.fillStyle(0x4b3f8f, 1);
    g.fillEllipse(L.width / 2, 548, 260, 56);
    const hero = scene.add.image(L.width / 2 - 10, 470, 'hero').setScale(1.6);
    const gun = scene.add.image(L.width / 2 + 16, 486, 'blaster').setOrigin(0.15, 0.55).setScale(1.6);
    this.dynamic = scene.add.container(0, 0);
    this.root = scene.add.container(0, 0, [g, hero, gun, this.dynamic]);
    this.refresh();
  }

  private text(x: number, y: number, msg: string, size: number, color = '#ffffff'): Phaser.GameObjects.Text {
    return this.scene.add
      .text(x, y, msg, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '700', color, stroke: config.palette.outline, strokeThickness: Math.max(5, size / 5), align: 'center', resolution: this.textRes })
      .setOrigin(0.5);
  }

  /** Rebuild the rank bar and the cards (after a purchase). */
  refresh(): void {
    this.dynamic.removeAll(true);
    const L = config.layout;
    const ol = hex(config.palette.outline);
    const r = rankOf(this.meta);
    const g = this.scene.add.graphics();
    g.fillStyle(ol, 1);
    g.fillRoundedRect(BAR.x - 4, BAR.y - 4, BAR.w + 8, 26, 13);
    g.fillStyle(0x3a2f5c, 1);
    g.fillRoundedRect(BAR.x, BAR.y, BAR.w, 18, 9);
    g.fillStyle(hex(config.palette.gold), 1);
    if (r.progress > 0) g.fillRoundedRect(BAR.x, BAR.y, Math.max(18, BAR.w * r.progress), 18, 9);
    for (let k = 1; k < config.meta.levelsPerRank; k++) {
      g.fillStyle(ol, 0.5);
      g.fillRect(BAR.x + (BAR.w * k) / config.meta.levelsPerRank - 1, BAR.y + 3, 2, 12);
    }
    this.dynamic.add([
      g,
      this.text(L.width / 2, 600, strings.rank(r.rank), 30, config.palette.gold),
      this.text(BAR.x + BAR.w + 30, BAR.y + 9, `${r.into}/${config.meta.levelsPerRank}`, 18),
    ]);
    STATS.forEach((stat, i) => this.dynamic.add(this.card(stat, L.width / 2 + (i - 1) * CARD.dx)));
  }

  private card(stat: StatId, x: number): Phaser.GameObjects.Container {
    const s = this.scene;
    const lv = this.meta.levels[stat];
    const cost = upgradeCost(lv);
    const ok = this.meta.coins >= cost;
    const g = s.add.graphics();
    g.fillStyle(hex(config.palette.outline), 1);
    g.fillRoundedRect(-CARD.w / 2 - 5, -CARD.h / 2 - 5, CARD.w + 10, CARD.h + 10, 20);
    g.fillStyle(0xfff4dd, 1);
    g.fillRoundedRect(-CARD.w / 2, -CARD.h / 2, CARD.w, CARD.h, 16);
    g.fillStyle(0xf2dfb8, 1);
    g.fillRoundedRect(-CARD.w / 2, -CARD.h / 2, CARD.w, 40, { tl: 16, tr: 16, bl: 0, br: 0 });
    // price button
    g.fillStyle(hex(config.palette.outline), 1);
    g.fillRoundedRect(-62, CARD.h / 2 - 54, 124, 44, 20);
    g.fillStyle(ok ? 0x3ddc84 : 0x8c8c99, 1);
    g.fillRoundedRect(-58, CARD.h / 2 - 50, 116, 36, 16);
    const icon = s.add.graphics().setPosition(0, -46).setScale(0.6);
    drawCardIcon(icon, ICON[stat]);
    const bonus = statBonus(stat);
    const items = [
      g,
      icon,
      this.text(0, -CARD.h / 2 + 20, strings.level(lv), 20, '#7a5a3a'),
      this.text(0, 14, strings.statNames[stat], 22, '#ffffff'),
      this.text(0, 44, `+${bonus}`, 22, '#3ddc84'),
      s.add.image(-24, CARD.h / 2 - 32, 'ic_coin').setScale(0.45),
      this.text(14, CARD.h / 2 - 31, String(cost), 22, ok ? '#ffffff' : '#ffb0b0'),
    ];
    const c = s.add.container(x, CARD.y, items);
    c.setSize(CARD.w + 10, CARD.h + 10).setInteractive({ useHandCursor: true });
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
