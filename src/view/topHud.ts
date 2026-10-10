// Top HUD in the pack's Play_Type1 layout: resource bars top-left (red / yellow stars), the wave
// slider top-center (Slider_Level_02: diamond badge with the current wave, Slider_01 progress, the
// next wave's badge, a crown before an elite and a skull before the boss, "WAVE n/10"), the owned
// abilities as small item frames with level gems, and the low-HP red pulse. The hero's HP bar lives
// under the hero.
import Phaser from 'phaser';
import { MAX_LEVEL, abilityDef, evolutions, type AbilitySet, type Wallet } from '../abilities';
import { config, hex } from '../config';
import { TAU } from '../logic/math';
import { strings } from '../strings';
import { LevelBar, ResourcePill, U, gems, icon, skillFrame, sprite, text } from './gui';

const PILL = { x: 24, y: 40, w: 200 * U, gap: 12 };
const WAVE = { y: 128, w: 400 * U, h: 49 * U, badge: 75 * U };
const ICONS = { x: 40, y: 150, dx: 58, size: 50 };

export interface WaveNodes {
  index: number;
  count: number;
  /** Wave indices with an elite / the chapter boss. */
  elite: readonly number[];
  boss: number;
  cleared: boolean;
}

export class TopHud {
  private red: ResourcePill;
  private yellow: ResourcePill;
  private wave: Phaser.GameObjects.Container;
  private waveBar: LevelBar;
  private waveText: Phaser.GameObjects.Text;
  private leftNum: Phaser.GameObjects.Text;
  private rightNum: Phaser.GameObjects.Text;
  private rightBadge: ReturnType<typeof sprite>;
  private nextMark: Phaser.GameObjects.Image;
  private icons: Phaser.GameObjects.Container;
  private vignette: Phaser.GameObjects.Image;
  private t = 0;
  private shown = { red: -1, yellow: -1, icons: '', wave: '' };
  private punch = { red: 1, yellow: 1 };
  private iconScale = { red: 1, yellow: 1 };

  constructor(
    private scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    _textRes: number,
  ) {
    const L = config.layout;
    this.vignette = scene.add.image(L.width / 2, L.height / 2, 'vignette').setDisplaySize(L.width + 80, L.height + 80);
    this.vignette.setTint(hex(config.palette.danger)).setAlpha(0);
    this.red = new ResourcePill(scene, PILL.x + PILL.w / 2, PILL.y, PILL.w, 'ui_economy_star_01_red', 'ic_redstar');
    this.yellow = new ResourcePill(scene, PILL.x + PILL.w * 1.5 + PILL.gap, PILL.y, PILL.w, 'ui_economy_star_01_yellow', 'ic_star');
    this.iconScale.red = this.red.iconImg.scale;
    this.iconScale.yellow = this.yellow.iconImg.scale;

    // wave slider: diamond badges on both ends, the bar in between, caption under it
    const bx = WAVE.w / 2;
    const diamond = (x: number) => sprite(scene, 'ui_slider_level_02_icon', x, 0, WAVE.badge, WAVE.badge, scene.textures.exists('ui_slider_level_02_icon') ? undefined : 0x35a6e1);
    this.waveBar = new LevelBar(scene, 0, 0, WAVE.w - WAVE.badge, WAVE.h);
    this.rightBadge = diamond(bx);
    this.leftNum = text(scene, -bx, 0, '1', 36);
    this.rightNum = text(scene, bx, 0, '2', 36);
    this.nextMark = icon(scene, bx + 4, -WAVE.badge * 0.62, 'ui_ui_play_skull_01', 40).setVisible(false);
    this.waveText = text(scene, 0, WAVE.h / 2 + 18, '', 30);
    this.wave = scene.add.container(L.width / 2, WAVE.y, [this.waveBar.c, diamond(-bx), this.rightBadge, this.leftNum, this.rightNum, this.nextMark, this.waveText]);
    this.icons = scene.add.container(0, 0);
    layer.add([this.vignette, this.red.c, this.yellow.c, this.wave, this.icons]);
  }

  /** Where a collected star flies to. */
  starTarget(red: boolean): { x: number; y: number } {
    const p = red ? this.red : this.yellow;
    return { x: p.c.x + p.iconImg.x, y: PILL.y };
  }

  /** Bump a counter when a star lands. */
  starLanded(red: boolean): void {
    if (red) this.punch.red = 1.5;
    else this.punch.yellow = 1.5;
  }

  update(dt: number, hpFrac: number, nodes: WaveNodes, wallet: Wallet, set: AbilitySet): void {
    this.t += dt;
    this.red.set(String(wallet.redStars));
    this.yellow.set(String(wallet.stars));
    this.punch.red += (1 - this.punch.red) * Math.min(1, dt * 10);
    this.punch.yellow += (1 - this.punch.yellow) * Math.min(1, dt * 10);
    this.red.iconImg.setScale(this.iconScale.red * this.punch.red);
    this.yellow.iconImg.setScale(this.iconScale.yellow * this.punch.yellow);
    this.drawWave(nodes);
    this.drawIcons(set);

    // low HP: red pulsing vignette
    const low = config.juice.lowHp;
    const k = hpFrac > 0 && hpFrac < low ? 1 - hpFrac / low : 0;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * TAU * 1.1);
    this.vignette.setAlpha(k > 0 ? (0.25 + 0.35 * pulse) * (0.5 + 0.5 * k) : 0);
  }

  private drawWave(n: WaveNodes): void {
    const key = `${n.index},${n.cleared}`;
    if (key === this.shown.wave) return;
    this.shown.wave = key;
    const cur = n.index + 1;
    const next = Math.min(n.count, cur + 1);
    this.leftNum.setText(String(cur));
    this.rightNum.setText(String(next));
    // a crown / skull over the next badge warns about the elite / boss wave
    const nextIdx = next - 1;
    const boss = nextIdx === n.boss;
    const elite = n.elite.includes(nextIdx);
    this.nextMark.setVisible(boss || elite);
    if (boss || elite) {
      const key = boss ? 'ui_ui_play_skull_01' : 'ui_economy_crown_01_gold';
      if (this.scene.textures.exists(key)) this.nextMark.setTexture(key).setScale(40 / Math.max(this.nextMark.width, this.nextMark.height));
    }
    if (!(this.rightBadge instanceof Phaser.GameObjects.Graphics)) this.rightBadge.setTint(boss ? 0xff7070 : elite ? 0xffc070 : 0xffffff);
    this.waveText.setText(strings.wave(cur, n.count));
    this.waveBar.set((n.index + (n.cleared ? 1 : 0)) / Math.max(1, n.count));
  }

  /** Owned abilities: a small skill frame with the art and level gems (red frame once evolved). */
  private drawIcons(set: AbilitySet): void {
    const owned = set.owned();
    const key = owned.map((id) => `${id}${set.level(id)}`).join(',') + [...set.evos].join(',');
    if (key === this.shown.icons) return;
    this.shown.icons = key;
    this.icons.removeAll(true);
    owned.forEach((id, i) => {
      const evolved = evolutions.some((e) => e.from === id && set.has(e.id));
      const x = ICONS.x + i * ICONS.dx;
      this.icons.add([skillFrame(this.scene, x, ICONS.y, ICONS.size, evolved ? 'red' : 'blue', abilityDef(id).icon), gems(this.scene, x, ICONS.y + ICONS.size / 2 + 6, set.level(id), MAX_LEVEL, 0.4)]);
    });
  }
}
