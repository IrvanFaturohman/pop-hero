// Top HUD (reference layout): red / yellow star counters, the chapter's wave nodes (green check =
// cleared, white ring = current, orange = elite wave, red skull = boss), the owned abilities with
// their level gems, and the low-HP red pulse. The hero's HP bar lives under the hero.
import Phaser from 'phaser';
import { MAX_LEVEL, abilityDef, evolutions, type AbilitySet, type Wallet } from '../abilities';
import { config, hex } from '../config';
import { TAU } from '../logic/math';
import { drawCardIcon } from './cardIcons';

const FONT = 'Fredoka, system-ui, sans-serif';
const STARS_Y = 40;
const RED_X = 280;
const YELLOW_X = 420;
const NODES = { y: 96, dx: 38 };
const ICONS = { x: 42, y: 150, dx: 52, size: 42 };

export interface WaveNodes {
  index: number;
  count: number;
  /** Wave indices with an elite / the chapter boss. */
  elite: readonly number[];
  boss: number;
  cleared: boolean;
}

export class TopHud {
  private g: Phaser.GameObjects.Graphics;
  private icons: Phaser.GameObjects.Container;
  private redText: Phaser.GameObjects.Text;
  private yellowText: Phaser.GameObjects.Text;
  private redIcon: Phaser.GameObjects.Image;
  private yellowIcon: Phaser.GameObjects.Image;
  private vignette: Phaser.GameObjects.Image;
  private t = 0;
  private shown = { red: -1, yellow: -1, icons: '' };
  private punch = { red: 1, yellow: 1 };

  constructor(
    private scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    textRes: number,
  ) {
    const L = config.layout;
    this.vignette = scene.add.image(L.width / 2, L.height / 2, 'vignette').setDisplaySize(L.width + 80, L.height + 80);
    this.vignette.setTint(hex(config.palette.danger)).setAlpha(0);
    this.g = scene.add.graphics();
    const txt = (x: number) =>
      scene.add
        .text(x, STARS_Y + 2, '0', { fontFamily: FONT, fontSize: '28px', fontStyle: '700', color: '#ffffff', stroke: config.palette.outline, strokeThickness: 7, resolution: textRes })
        .setOrigin(0, 0.5);
    this.redIcon = scene.add.image(RED_X, STARS_Y, 'ic_redstar').setScale(0.6);
    this.yellowIcon = scene.add.image(YELLOW_X, STARS_Y, 'ic_star').setScale(0.6);
    this.redText = txt(RED_X + 28);
    this.yellowText = txt(YELLOW_X + 28);
    this.icons = scene.add.container(0, 0);
    layer.add([this.vignette, this.g, this.redIcon, this.yellowIcon, this.redText, this.yellowText, this.icons]);
  }

  /** Where a collected star flies to. */
  starTarget(red: boolean): { x: number; y: number } {
    return { x: red ? RED_X : YELLOW_X, y: STARS_Y };
  }

  /** Bump a counter when a star lands. */
  starLanded(red: boolean): void {
    if (red) this.punch.red = 1.5;
    else this.punch.yellow = 1.5;
  }

  update(dt: number, hpFrac: number, nodes: WaveNodes, wallet: Wallet, set: AbilitySet): void {
    this.t += dt;
    if (wallet.redStars !== this.shown.red) {
      this.redText.setText(String(wallet.redStars));
      this.shown.red = wallet.redStars;
    }
    if (wallet.stars !== this.shown.yellow) {
      this.yellowText.setText(String(wallet.stars));
      this.shown.yellow = wallet.stars;
    }
    this.punch.red += (1 - this.punch.red) * Math.min(1, dt * 10);
    this.punch.yellow += (1 - this.punch.yellow) * Math.min(1, dt * 10);
    this.redIcon.setScale(0.6 * this.punch.red);
    this.yellowIcon.setScale(0.6 * this.punch.yellow);
    this.drawNodes(nodes);
    this.drawIcons(set);

    // low HP: red pulsing vignette
    const low = config.juice.lowHp;
    const k = hpFrac > 0 && hpFrac < low ? 1 - hpFrac / low : 0;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * TAU * 1.1);
    this.vignette.setAlpha(k > 0 ? (0.25 + 0.35 * pulse) * (0.5 + 0.5 * k) : 0);
  }

  private drawNodes(n: WaveNodes): void {
    const g = this.g;
    const ol = hex(config.palette.outline);
    const x0 = config.layout.width / 2 - ((n.count - 1) * NODES.dx) / 2;
    const y = NODES.y;
    g.clear();
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(x0 - 26, y - 22, (n.count - 1) * NODES.dx + 52, 44, 22);
    g.fillStyle(ol, 1);
    g.fillRect(x0, y - 4, (n.count - 1) * NODES.dx, 8);
    const doneUpTo = n.cleared ? n.index : n.index - 1;
    g.fillStyle(0x3ddc84, 1);
    if (doneUpTo >= 0) g.fillRect(x0, y - 2, Math.min(n.count - 1, doneUpTo + 0.5) * NODES.dx, 4);
    for (let i = 0; i < n.count; i++) {
      const x = x0 + i * NODES.dx;
      const done = i <= doneUpTo;
      const special = i === n.boss ? 'boss' : n.elite.includes(i) ? 'elite' : '';
      const r = special ? 15 : 11;
      const fill = done ? 0x3ddc84 : special === 'boss' ? 0xff3b3b : special === 'elite' ? 0xff9f1c : 0x3a2f5c;
      g.fillStyle(ol, 1);
      g.fillCircle(x, y, r + 3);
      g.fillStyle(fill, 1);
      g.fillCircle(x, y, r);
      if (done) {
        g.lineStyle(4, 0xffffff, 1);
        g.beginPath();
        g.moveTo(x - 6, y);
        g.lineTo(x - 2, y + 5);
        g.lineTo(x + 6, y - 5);
        g.strokePath();
      } else if (special) {
        // tiny skull
        g.fillStyle(0xffffff, 1);
        g.fillCircle(x, y - 2, 7);
        g.fillRect(x - 4, y + 2, 8, 5);
        g.fillStyle(fill, 1);
        g.fillCircle(x - 3, y - 2, 2.2);
        g.fillCircle(x + 3, y - 2, 2.2);
      }
      if (i === n.index && !n.cleared) {
        const p = 0.5 + 0.5 * Math.sin(this.t * TAU);
        g.lineStyle(3, 0xffffff, 0.6 + 0.4 * p);
        g.strokeCircle(x, y, r + 6 + p * 2);
      }
    }
  }

  /** Owned abilities: a tile with the card icon and level gems (red tile once evolved). */
  private drawIcons(set: AbilitySet): void {
    const owned = set.owned();
    const key = owned.map((id) => `${id}${set.level(id)}`).join(',') + [...set.evos].join(',');
    if (key === this.shown.icons) return;
    this.shown.icons = key;
    this.icons.removeAll(true);
    const ol = hex(config.palette.outline);
    const S = ICONS.size;
    owned.forEach((id, i) => {
      const evolved = evolutions.some((e) => e.from === id && set.has(e.id));
      const x = ICONS.x + i * ICONS.dx;
      const g = this.scene.add.graphics();
      g.fillStyle(ol, 1);
      g.fillRoundedRect(x - S / 2 - 3, ICONS.y - S / 2 - 3, S + 6, S + 6, 10);
      g.fillStyle(evolved ? 0xe2445a : 0x3f7fe0, 1);
      g.fillRoundedRect(x - S / 2, ICONS.y - S / 2, S, S, 8);
      const lv = set.level(id);
      for (let k = 1; k <= MAX_LEVEL; k++) {
        g.fillStyle(k <= lv ? 0xffd23f : 0x9aa3c7, 1);
        g.fillCircle(x + (k - 2) * 11, ICONS.y + S / 2 + 6, 4);
      }
      const icon = this.scene.add.graphics().setPosition(x, ICONS.y).setScale(0.36);
      drawCardIcon(icon, abilityDef(id).icon);
      this.icons.add([g, icon]);
    });
  }
}
