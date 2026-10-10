// Top HUD in the pack's Play_UI_Idle layout: resource pills top-left (red / yellow stars), the
// wave slider top-center (current wave badge, progress fill, next wave badge: orange = elite, red =
// boss, "WAVE n/10"), the owned abilities as small skill frames with level gems, and the low-HP
// red pulse. The hero's HP bar lives under the hero.
import Phaser from 'phaser';
import { MAX_LEVEL, abilityDef, evolutions, type AbilitySet, type Wallet } from '../abilities';
import { config, hex } from '../config';
import { TAU } from '../logic/math';
import { strings } from '../strings';
import { ResourcePill, U, gems, skillFrame, sprite, text } from './gui';

const PILL = { x: 38, y: 40, w: 168 * U, gap: 14 };
const WAVE = { y: 204 * U, w: 434 * U, h: 65 * U };
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
  private waveFill: Phaser.GameObjects.GameObject | null = null;
  private waveText: Phaser.GameObjects.Text;
  private leftNum: Phaser.GameObjects.Text;
  private rightNum: Phaser.GameObjects.Text;
  private rightBadge: Phaser.GameObjects.GameObject & { setTint?(c: number): unknown };
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
    this.red = new ResourcePill(scene, PILL.x + PILL.w / 2, PILL.y, PILL.w, 'ui_itemicon_star_red', 'ic_redstar');
    this.yellow = new ResourcePill(scene, PILL.x + PILL.w * 1.5 + PILL.gap, PILL.y, PILL.w, 'ui_itemicon_star_gold', 'ic_star');
    this.iconScale.red = this.red.iconImg.scale;
    this.iconScale.yellow = this.yellow.iconImg.scale;

    // wave slider (Slider_Wave): badges on both ends, fill in between, caption under it
    const bw = 98 * U;
    const barW = WAVE.w - bw * 2 + 30 * U;
    this.wave = scene.add.container(L.width / 2, WAVE.y, [sprite(scene, 'ui_slider_wave_bg', 0, 0, barW, WAVE.h - 34 * U, 0x556579)]);
    const lb = sprite(scene, 'ui_slider_wave_badge1', -WAVE.w / 2 + bw / 2, 0, bw, 60 * U, 0x1956ce);
    this.rightBadge = sprite(scene, 'ui_slider_wave_badge1', WAVE.w / 2 - bw / 2, 0, bw, 60 * U, 0x000000);
    this.leftNum = text(scene, -WAVE.w / 2 + bw / 2 - 2, -1, '1', 34, { font: 'cairo' });
    this.rightNum = text(scene, WAVE.w / 2 - bw / 2 - 2, -1, '2', 34, { font: 'cairo' });
    this.waveText = text(scene, 0, 37 * U, '', 31, { font: 'cairo', line: 'none', color: '#000000' });
    this.wave.add([lb, sprite(scene, 'ui_slider_wave_badge2', -WAVE.w / 2 + bw / 2, 0, bw - 7 * U, 60 * U - 9 * U, 0xffffff, 0.31), this.rightBadge, this.leftNum, this.rightNum, this.waveText]);
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
    // the next badge warns about the elite / boss wave
    const nextIdx = next - 1;
    const tint = nextIdx === n.boss ? 0xe8243b : n.elite.includes(nextIdx) ? 0xff8a1f : 0x000000;
    this.rightBadge.setTint?.(tint);
    this.waveText.setText(strings.wave(cur, n.count));
    const bw = 98 * U;
    const barW = WAVE.w - bw * 2 + 30 * U;
    const fh = WAVE.h - 34 * U - 9 * U;
    const frac = (n.index + (n.cleared ? 1 : 0)) / Math.max(1, n.count);
    this.waveFill?.destroy();
    this.waveFill = null;
    if (frac > 0) {
      const w = Math.max(fh, (barW - 4) * frac);
      this.waveFill = sprite(this.scene, 'ui_slider_wave_fill', -barW / 2 + 2 + w / 2, 0, w, fh, 0x31b9ff);
      this.wave.addAt(this.waveFill, 1);
    }
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
      this.icons.add([skillFrame(this.scene, x, ICONS.y, ICONS.size, evolved ? 'red' : 'blue', abilityDef(id).icon), gems(this.scene, x, ICONS.y + ICONS.size / 2 + 6, set.level(id), MAX_LEVEL, 0.55)]);
    });
  }
}
