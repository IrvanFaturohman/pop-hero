// Gold padlock hanging on the rope (reference: Puff Up's lock). Shows the number the gathered
// balloons still need, plus this turn's balloon icons. Opens with a pop when the number hits 0,
// shakes red when you run out of balloons.
import Phaser from 'phaser';
import { config, hex } from '../config';
import { easeInQuad, easeOutBack, easeOutQuad } from '../juice/ease';
import { lerp } from '../logic/math';
import { FONT, FONT_WEIGHT } from './gui';

const BODY_W = 84;
const BODY_H = 62;

export class LockView {
  private c: Phaser.GameObjects.Container;
  private shackle: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private icons: Phaser.GameObjects.Image[] = [];
  private shown = 0;
  private lastShown = -1;
  private punchT = 1;
  private popT = 1;
  private openT = -1;
  private failT = -1;
  private t = 0;
  private color = '#ffffff';
  /** Called each time the shown number ticks down (sound hook). */
  onTick: () => void = () => {};

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, textRes: number) {
    const ol = hex(config.palette.outline);
    const gold = hex(config.palette.gold);
    this.shackle = scene.add.graphics();
    this.shackle.lineStyle(14, ol, 1);
    this.shackle.beginPath();
    this.shackle.arc(0, -BODY_H / 2 + 4, 24, Math.PI, 0);
    this.shackle.strokePath();
    this.shackle.lineStyle(8, 0xc9d3e6, 1);
    this.shackle.beginPath();
    this.shackle.arc(0, -BODY_H / 2 + 4, 24, Math.PI, 0);
    this.shackle.strokePath();
    const body = scene.add.graphics();
    body.fillStyle(ol, 1);
    body.fillRoundedRect(-BODY_W / 2 - 4, -BODY_H / 2 - 4, BODY_W + 8, BODY_H + 8, 16);
    body.fillStyle(gold, 1);
    body.fillRoundedRect(-BODY_W / 2, -BODY_H / 2, BODY_W, BODY_H, 13);
    body.fillStyle(0xffffff, 0.4);
    body.fillRoundedRect(-BODY_W / 2 + 6, -BODY_H / 2 + 5, BODY_W - 12, 8, 4);
    this.text = scene.add
      .text(0, 4, '0', { fontFamily: FONT, fontSize: '36px', fontStyle: FONT_WEIGHT, color: '#ffffff', stroke: config.palette.outline, strokeThickness: 8, resolution: textRes })
      .setOrigin(0.5);
    this.c = scene.add.container(config.layout.width / 2, config.layout.ropeY + BODY_H / 2 + 6, [this.shackle, body, this.text]);
    this.c.setVisible(false);
    layer.add(this.c);
    // this turn's balloons ("moves") when the debug balloon limit is on, right of the lock
    const n = config.turns.balloonsPerTurn;
    for (let i = 0; i < n; i++) {
      const img = scene.add.image(0, 0, 'balloon_n0').setDisplaySize(30, 30).setVisible(false);
      layer.add(img);
      this.icons.push(img);
    }
  }

  /** setColor re-renders the text texture: only when it changes. */
  private setColor(c: string): void {
    if (c === this.color) return;
    this.color = c;
    this.text.setColor(c);
  }

  /** New turn: lock pops in showing the full number. */
  reset(target: number): void {
    this.shown = target;
    this.lastShown = -1;
    this.popT = 0;
    this.openT = -1;
    this.failT = -1;
    this.setColor('#ffffff');
    this.c.setVisible(true).setAlpha(1).setAngle(0);
    this.shackle.setPosition(0, 0).setAngle(0);
  }

  open(): void {
    this.openT = 0;
  }

  fail(): void {
    this.failT = 0;
  }

  /** Lock center (for effects). */
  get x(): number {
    return this.c.x;
  }

  get y(): number {
    return this.c.y;
  }

  /** (ax, ay) = chain midpoint the lock hangs from; strain 0..1 makes it shake before the snap. */
  update(dt: number, lockLeft: number, movesLeft: number, active: boolean, ax: number, ay: number, strain: number): void {
    this.t += dt;
    // number counts down toward what is still needed
    if (this.shown > lockLeft) this.shown = Math.max(lockLeft, this.shown - Math.max(1, (this.shown - lockLeft) * dt * 10));
    const n = Math.ceil(this.shown);
    if (n !== this.lastShown) {
      this.text.setText(String(n));
      if (this.lastShown >= 0) {
        this.punchT = 0;
        this.onTick();
      }
      this.lastShown = n;
    }
    this.punchT += dt;
    const punch = this.punchT < 0.12 ? lerp(1.25, 1, easeOutQuad(this.punchT / 0.12)) : 1;
    this.text.setScale(punch);

    const L = config.layout;
    this.popT += dt;
    let scale = this.popT < 0.35 ? easeOutBack(Math.min(1, this.popT / 0.35), 2.4) : 1;
    let y = ay + BODY_H / 2 + 6 + Math.sin(this.t * 2.5) * 2;
    const tremble = strain > 0.6 && this.openT < 0 ? (strain - 0.6) * 20 : 0;
    let angle = Math.sin(this.t * 1.8) * 3 + Math.sin(this.t * 47) * tremble;
    this.c.setX(ax);
    if (this.openT >= 0) {
      // shackle pops open, then the lock flies up and fades
      this.openT += dt;
      const k = Math.min(1, this.openT / 0.15);
      this.shackle.setPosition(10 * k, -14 * k).setAngle(-35 * k);
      const fly = Math.max(0, this.openT - 0.2) / 0.35;
      y -= easeInQuad(Math.min(1, fly)) * 160;
      angle += fly * 40;
      this.c.setAlpha(1 - Math.min(1, fly));
      scale *= 1 + Math.min(1, this.openT / 0.15) * 0.15;
      if (fly >= 1) this.c.setVisible(false);
    }
    if (this.failT >= 0) {
      this.failT += dt;
      const k = Math.max(0, 1 - this.failT / 0.6);
      angle += Math.sin(this.failT * 50) * 14 * k;
      this.setColor(this.failT < 0.6 && Math.floor(this.failT * 12) % 2 === 0 ? config.palette.danger : '#ffffff');
    }
    this.c.setY(y).setScale(scale).setAngle(angle);

    // balloon icons: full = still to blow, faded = used (hidden with no limit)
    const total = this.icons.length;
    for (let i = 0; i < total; i++) {
      const img = this.icons[i];
      img.setVisible(active && this.c.visible && movesLeft >= 0);
      if (!img.visible) continue;
      const left = i >= total - movesLeft;
      img.setTexture(`balloon_n${(i * 2) % config.palette.balloonColors.length}`);
      img.setPosition(L.roomRight - 30 - (total - 1 - i) * 34, L.roomBottom - 70 + Math.sin(this.t * 3 + i) * 2);
      img.setAlpha(left ? 1 : 0.25).setDisplaySize(left ? 30 : 24, left ? 30 : 24);
    }
  }
}
