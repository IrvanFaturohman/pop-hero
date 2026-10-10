// End-of-run screen in the pack's Play_Result_Win_01 / Play_Result_Lose layout: the victory
// illustration on a soft glow with the tangerine VICTORY ribbon (or the defeat illustration with a
// GAME OVER ribbon), the "REWARDS" line title with the coin tile, a compact run-stats card,
// CONTINUE (to the home screen) and COPY STATS.
import Phaser from 'phaser';
import { abilities, evolutions } from '../abilities';
import { config } from '../config';
import { easeOutBack } from '../juice/ease';
import type { RunStats } from '../logic/telemetry';
import { strings } from '../strings';
import { U, button, dim, dividerTitle, fill, itemFrame, ribbon, sprite, text } from './gui';

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
      if (s.textures.exists('ui_sampleeffect_confetti')) items.push(sprite(s, 'ui_sampleeffect_confetti', cx, 757.7 * U, 1058 * U, 1487 * U));
      this.glow = sprite(s, 'ui_effect_light_01_512', cx, Y(448), 512 * U * 1.3, 512 * U * 1.3, 0xffff5f, 0.3);
      items.push(this.glow, sprite(s, 'ui_illust_victory', cx, Y(448), 670 * U, 271 * U));
      items.push(ribbon(s, cx, Y(296.5), 656 * U, 'tangerine', strings.stageClear, 55));
    } else {
      this.glow = null;
      items.push(sprite(s, 'ui_illust_lose', cx, Y(472), 406 * U, 236 * U));
      items.push(ribbon(s, cx, Y(296.5), 656 * U, 'lightdark', strings.gameOver, 55));
    }
    items.push(dividerTitle(s, cx, Y(170), strings.rewards));
    items.push(itemFrame(s, cx, Y(30), 151 * U, 'dark', 'ui_economy_coin_02_gold', String(coins), 'ic_coin'));

    // compact run stats (our addition: the pack's result screen has none), on the teal list frame
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
    const top = Y(-120);
    const rowH = 32;
    const boxH = rows.length * rowH + 84;
    const bw = 912 * U;
    const box = s.add.container(cx, top + boxH / 2, [
      fill(s, 'ui_basicframe_rectangle_01-04_bg', bw, boxH, 0x4e6772, { dw: -2, dh: -2 }),
      fill(s, 'ui_basicframe_rectangle_01-04_innerborder2', bw, boxH, 0x425760, { dw: -26, dh: -26 }),
      fill(s, 'ui_basicframe_rectangle_01-04_border1', bw, boxH, 0x000000),
    ]);
    items.push(box);
    rows.forEach(([k, v], i) => {
      const y = top + 30 + i * rowH;
      items.push(text(s, cx - bw / 2 + 30, y, k, 30, { originX: 0, align: 'left', color: '#c6eaf6', line: 'none' }), text(s, cx + bw / 2 - 30, y, v, 32, { originX: 1, align: 'right' }));
    });
    items.push(text(s, cx, top + rows.length * rowH + 44, names.length ? names.join(', ') : strings.statNoUpgrades, 28, { color: config.palette.gold, wrap: bw - 50, line: 'none' }));

    const tap = (fn: () => void) => () => {
      this.onTap();
      fn();
    };
    const by = Math.max(Y(-570), top + boxH + 60);
    items.push(button(s, { x: cx - 112, y: by, w: 325 * U, color: 'blue', label: strings.continue, onTap: tap(() => this.onContinue()) }));
    const copy = button(s, {
      x: cx + 112,
      y: by,
      w: 325 * U,
      color: 'dark',
      label: strings.copyStats,
      size: 36,
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
