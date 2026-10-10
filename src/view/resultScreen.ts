// End-of-run screen in the pack's PopupDim_Play_Result_Victory / Defeat layout: badge art with a
// rotating glow, VICTORY (sky ribbon) or DEFEAT (red ribbon), REWARDS divider with the coin tile,
// a compact run-stats card, CONTINUE (to the home screen) and COPY STATS.
import Phaser from 'phaser';
import { abilities, evolutions } from '../abilities';
import { config } from '../config';
import { easeOutBack } from '../juice/ease';
import type { RunStats } from '../logic/telemetry';
import { strings } from '../strings';
import { U, button, dim, dividerTitle, itemFrame, sprite, text } from './gui';

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Prefab y (canvas units, center = 0, up) -> game y. */
const Y = (y: number) => 640 - y * U;

export class ResultScreen {
  private root: Phaser.GameObjects.Container;
  private glow: Phaser.GameObjects.GameObject | null = null;
  private t = 0;
  onContinue: () => void = () => {};
  onTap: () => void = () => {};

  constructor(
    private scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    _textRes: number,
  ) {
    this.root = scene.add.container(0, 0).setVisible(false);
    layer.add(this.root);
  }

  get visible(): boolean {
    return this.root.visible;
  }

  show(stats: RunStats, coins: number): void {
    const s = this.scene;
    const L = config.layout;
    const cx = L.width / 2;
    this.root.removeAll(true);
    this.t = 0;
    const won = stats.result === 'victory';
    const items: Phaser.GameObjects.GameObject[] = [dim(s)];
    if (won) {
      this.glow = sprite(s, 'ui_image_effect_rotate', cx, Y(437), 270 * U * 1.6, 275 * U * 1.6, 0xfffa77);
      items.push(this.glow, sprite(s, 'ui_image_bagde_wing1', cx, Y(533.8), 536 * U, 449 * U), sprite(s, 'ui_image_bagde_wing2', cx, Y(451.4), 296 * U, 228 * U));
      items.push(s.add.container(cx, Y(291), [sprite(s, 'ui_title_ribbon01_sky', 0, 0, 690 * U, 143 * U, s.textures.exists('ui_title_ribbon01_sky') ? undefined : 0x1fb8ff), text(s, 0, -11 * U, strings.stageClear, 67, { line: 'blue' })]));
    } else {
      this.glow = null;
      items.push(sprite(s, 'ui_image_badge_skull', cx - 8.6 * U, Y(521.1), 562 * U, 329 * U));
      items.push(s.add.container(cx, Y(291), [sprite(s, 'ui_title_ribbon04_red', 0, 0, 690 * U, 143 * U, s.textures.exists('ui_title_ribbon04_red') ? undefined : 0xff3b5c), text(s, 0, -11 * U, strings.gameOver, 67, { line: 'red' })]));
    }
    items.push(dividerTitle(s, cx, Y(11), strings.rewards, 1, 40));
    items.push(itemFrame(s, cx, Y(-150), 190 * U, 'white', 'ui_itemicon_money_coin', String(coins), 'ic_coin'));

    // compact run stats (our addition: the pack's result screen has none)
    const names = stats.upgrades.map((key) => {
      const [id, lv] = key.split(':');
      if (id === 'evo') return evolutions.find((e) => e.id === lv)?.name ?? lv;
      return `${abilities.find((a) => a.id === id)?.name ?? id} ${lv}`;
    });
    const rows: Array<[string, string]> = [
      [strings.statWave, stats.waveReached],
      [strings.statTime, fmtTime(stats.durationSec)],
      [strings.statTurns, String(stats.turns)],
      [strings.statDamage, String(stats.damageTaken)],
      [strings.statBalloons, `${stats.balloons.blown} / ${stats.balloons.collected}`],
      [strings.statStars, `${stats.starsCollected.stars} / ${stats.starsCollected.redStars}`],
    ];
    if (!won && stats.causeOfDefeat) rows.push([strings.statCause, stats.causeOfDefeat.toUpperCase()]);
    const top = Y(-300);
    const rowH = 34;
    const boxH = rows.length * rowH + 70;
    const bw = 900 * U;
    items.push(sprite(s, 'ui_borderframe_round20_white_bg', cx, top + boxH / 2, bw, boxH, 0x343549));
    items.push(sprite(s, 'ui_borderframe_round20_white_light', cx, top + 12, bw - 11 * U, 12 * U, 0xffffff, 0.12));
    rows.forEach(([k, v], i) => {
      const y = top + 26 + i * rowH;
      items.push(text(s, cx - bw / 2 + 26, y, k, 30, { originX: 0, align: 'left', color: '#b8b9d7', line: 'none' }), text(s, cx + bw / 2 - 26, y, v, 32, { originX: 1, align: 'right', font: 'cairo' }));
    });
    items.push(text(s, cx, top + rows.length * rowH + 40, names.length ? names.join(', ') : strings.statNoUpgrades, 28, { color: config.palette.gold, wrap: bw - 40, line: 'none' }));

    const tap = (fn: () => void) => () => {
      this.onTap();
      fn();
    };
    const by = Math.max(Y(-644), top + boxH + 70);
    items.push(button(s, { x: cx - 120, y: by, w: 300 * U, color: 'sky', label: strings.continue, onTap: tap(() => this.onContinue()) }));
    const copy = button(s, {
      x: cx + 120,
      y: by,
      w: 300 * U,
      color: 'darkgray',
      label: strings.copyStats,
      size: 34,
      onTap: tap(() => {
        const json = JSON.stringify(stats, null, 2);
        navigator.clipboard?.writeText(json).catch(() => {});
        console.log('[stats]', json);
        copyLabel.setText(strings.copied);
      }),
    });
    const copyLabel = copy.list.find((o) => o instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text;
    items.push(copy);
    this.root.add(items);
    this.root.setVisible(true);
  }

  update(dt: number): void {
    if (!this.root.visible) return;
    this.t += dt;
    const k = Math.min(1, this.t / 0.4);
    this.root.setAlpha(k).setY((1 - easeOutBack(k)) * 80);
    (this.glow as Phaser.GameObjects.Components.Transform | null)?.setAngle?.(this.t * 40);
  }
}
