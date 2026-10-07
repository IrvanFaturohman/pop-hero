// End-of-run screen: STAGE CLEAR / DEFEATED, run stats (brief §12), PLAY AGAIN and COPY STATS.
import Phaser from 'phaser';
import { config, hex } from '../config';
import { easeOutBack } from '../juice/ease';
import type { RunStats } from '../logic/telemetry';
import { strings } from '../strings';
import { upgrades } from '../upgrades';
import { pressable } from './hud';

const FONT = 'Fredoka, system-ui, sans-serif';

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export class ResultScreen {
  private root: Phaser.GameObjects.Container;
  private t = 0;
  onPlayAgain: () => void = () => {};
  onTap: () => void = () => {};

  constructor(
    private scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private textRes: number,
  ) {
    this.root = scene.add.container(0, 0).setVisible(false);
    layer.add(this.root);
  }

  get visible(): boolean {
    return this.root.visible;
  }

  show(stats: RunStats): void {
    const s = this.scene;
    const L = config.layout;
    this.root.removeAll(true);
    this.t = 0;
    const won = stats.result === 'victory';
    const dim = s.add.rectangle(L.width / 2, L.height / 2, L.width + 200, L.height + 200, 0x0a0618, 0.8).setInteractive();
    const text = (x: number, y: number, msg: string, size: number, color = '#ffffff', origin = 0.5) =>
      s.add
        .text(x, y, msg, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '700', color, stroke: config.palette.outline, strokeThickness: Math.max(6, size / 6), resolution: this.textRes })
        .setOrigin(origin, 0.5);
    const title = text(L.width / 2, 260, won ? strings.stageClear : strings.gameOver, 84, won ? config.palette.gold : config.palette.danger);
    const panel = s.add.graphics();
    panel.fillStyle(hex(config.palette.outline), 0.95);
    panel.fillRoundedRect(70, 360, 580, 560, 28);
    panel.lineStyle(4, 0xffffff, 0.15);
    panel.strokeRoundedRect(70, 360, 580, 560, 28);
    const names = stats.upgrades.map((id) => upgrades.find((u) => u.id === id)?.name ?? id);
    const rows: Array<[string, string]> = [
      [strings.statWave, stats.waveReached],
      [strings.statTime, fmtTime(stats.durationSec)],
      [strings.statTurns, String(stats.turns)],
      [strings.statBalloons, `${stats.balloons.blown} / ${stats.balloons.collected}`],
      [strings.statPopped, `${stats.balloons.poppedWhileBlowing} / ${stats.balloons.poppedOverinflate}`],
      [strings.statAir, stats.avgAirAtRelease.toFixed(2)],
      [strings.statBonus, `${stats.close} / ${stats.perfect}`],
      [strings.statLocks, `${stats.locksOpened} / ${stats.locksFailed}`],
      [strings.statDamage, String(stats.damageTaken)],
    ];
    if (!won && stats.causeOfDefeat) rows.push([strings.statCause, stats.causeOfDefeat.toUpperCase()]);
    const items: Phaser.GameObjects.GameObject[] = [dim, title, panel];
    rows.forEach(([k, v], i) => {
      const y = 400 + i * 44;
      items.push(text(100, y, k, 24, '#cfc8e6', 0), text(620, y, v, 26, '#ffffff', 1));
    });
    const up = text(L.width / 2, 400 + rows.length * 44 + 14, names.length ? names.join(', ') : strings.statNoUpgrades, 20, config.palette.gold);
    up.setWordWrapWidth(540).setAlign('center');
    items.push(up);
    items.push(this.button(L.width / 2 - 150, 1010, strings.playAgain, 0xffd23f, () => this.onPlayAgain()));
    const copy = this.button(L.width / 2 + 150, 1010, strings.copyStats, 0x52c2ff, () => {
      const json = JSON.stringify(stats, null, 2);
      navigator.clipboard?.writeText(json).catch(() => {});
      console.log('[stats]', json);
      copyLabel.setText(strings.copied);
    });
    const copyLabel = copy.getAt(1) as Phaser.GameObjects.Text;
    items.push(copy);
    this.root.add(items);
    this.root.setVisible(true);
  }

  private button(x: number, y: number, label: string, color: number, onTap: () => void): Phaser.GameObjects.Container {
    const s = this.scene;
    const g = s.add.graphics();
    g.fillStyle(hex(config.palette.outline), 1);
    g.fillRoundedRect(-130, -40, 260, 80, 40);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-124, -34, 248, 68, 34);
    g.fillStyle(0xffffff, 0.3);
    g.fillRoundedRect(-110, -28, 220, 14, 7);
    const t = s.add
      .text(0, 2, label, { fontFamily: FONT, fontSize: '30px', fontStyle: '700', color: '#ffffff', stroke: config.palette.outline, strokeThickness: 8, resolution: this.textRes })
      .setOrigin(0.5);
    const c = s.add.container(x, y, [g, t]).setSize(260, 80).setInteractive({ useHandCursor: true });
    pressable(c, () => {
      this.onTap();
      onTap();
    });
    return c;
  }

  update(dt: number): void {
    if (!this.root.visible) return;
    this.t += dt;
    const k = Math.min(1, this.t / 0.4);
    this.root.setAlpha(k).setY((1 - easeOutBack(k)) * 80);
  }
}
