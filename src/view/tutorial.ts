// First-run hints (brief §6 FTUE), no long text: a hand presses "HOLD", lifts on "RELEASE!",
// an arrow points at the first close spike "AVOID", and the lock gets "FILL THE LOCK!".
import Phaser from 'phaser';
import { config, hex } from '../config';
import type { BalloonRoom } from '../logic/room';
import { closest } from '../logic/spikes';
import { markFtueDone } from '../storage';
import { strings } from '../strings';
import { canvasTex } from './canvasTex';
import { fontFamily, fontWeight } from './gui';


export function makeHandTexture(scene: Phaser.Scene): void {
  canvasTex(scene, 'hand', 80, 96, (c) => {
    c.lineJoin = 'round';
    c.strokeStyle = config.palette.outline;
    c.lineWidth = 5;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.roundRect(28, 6, 18, 50, 9); // pointing finger
    c.fill();
    c.stroke();
    c.beginPath();
    c.roundRect(14, 40, 56, 48, 18); // palm + folded fingers
    c.fill();
    c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.08)';
    c.fillRect(20, 60, 44, 6);
  });
}

type Step = 'hold' | 'release' | 'done';

export class Tutorial {
  active: boolean;
  private step: Step = 'hold';
  private hand: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private lockHint: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Graphics;
  private avoid: Phaser.GameObjects.Text;
  private avoidShown = false;
  private gloved: boolean;
  private avoidT = 0;
  private t = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, textRes: number, enabled: boolean) {
    this.active = enabled;
    const txt = (msg: string, size: number, color: string) =>
      scene.add
        .text(0, 0, msg, { fontFamily: fontFamily('sen'), fontSize: `${size}px`, fontStyle: fontWeight(), color, stroke: config.palette.outline, strokeThickness: 9, resolution: textRes })
        .setOrigin(0.5)
        .setVisible(false);
    // Layer Lab hand: fingertip at the top-left, pivot on it and turn it to point up
    this.gloved = scene.textures.exists('ui_tutorial_hand_2');
    this.hand = scene.add.image(0, 0, this.gloved ? 'ui_tutorial_hand_2' : 'hand').setVisible(false);
    if (this.gloved) this.hand.setOrigin(0.18, 0.16).setDisplaySize(118, 118);
    this.label = txt(strings.hold, 40, '#ffffff');
    this.lockHint = txt(strings.fillLock, 28, config.palette.gold);
    this.avoid = txt(strings.avoid, 32, config.palette.danger);
    this.arrow = scene.add.graphics();
    layer.add([this.arrow, this.hand, this.label, this.lockHint, this.avoid]);
  }

  /** Called when the chain snaps the first time: the tutorial is over. */
  finish(): void {
    if (!this.active) return;
    this.active = false;
    markFtueDone();
    for (const o of [this.hand, this.label, this.lockHint, this.avoid]) o.setVisible(false);
    this.arrow.clear();
  }

  update(dt: number, room: BalloonRoom, blowPhase: boolean, lockX: number, lockY: number): void {
    if (!this.active) return;
    this.t += dt;
    const a = room.attached;
    if (this.step === 'hold' && a && a.total >= 10) this.step = 'release';
    if (this.step === 'release' && !a) this.step = 'done';
    if (this.step === 'done' && blowPhase && !a && !room.busy()) this.step = 'hold';

    const L = config.layout;
    const showHand = blowPhase && (this.step === 'hold' ? !a : this.step === 'release');
    this.hand.setVisible(showHand);
    this.label.setVisible(showHand);
    if (showHand) {
      const bx = a ? a.x : L.width / 2;
      const by = a ? a.y + a.r + 40 : L.roomBottom - 180;
      const press = this.step === 'hold' ? Math.max(0, Math.sin(this.t * 4)) * 14 : -Math.abs(Math.sin(this.t * 4)) * 24;
      if (this.gloved) this.hand.setPosition(bx + 20, by - 42 + press).setAngle(28);
      else this.hand.setPosition(bx + 20, by + press).setAngle(-15);
      this.label.setText(this.step === 'hold' ? strings.hold : strings.release).setPosition(bx, by + 80);
      this.label.setScale(1 + Math.sin(this.t * 6) * 0.06);
    }
    // under the lock, or under the balloons gathered there so their numbers stay readable
    let hintY = lockY + 70;
    for (const b of room.flying) if (b.state === 'parked') hintY = Math.max(hintY, b.y + b.r + 30);
    this.lockHint.setVisible(blowPhase).setPosition(lockX, hintY).setScale(1 + Math.sin(this.t * 4) * 0.05);

    // first time a spike gets close to the balloon being blown: point at it
    this.arrow.clear();
    if (!this.avoidShown && a && a.danger > 0.3) {
      this.avoidShown = true;
      this.avoidT = 1.8;
    }
    if (this.avoidT > 0) {
      this.avoidT -= dt;
      if (a) room.field.clearance(a.x, a.y);
      const sx = closest.x;
      const sy = closest.y;
      const ox = sx + 70;
      const oy = sy - 70;
      this.arrow.lineStyle(8, hex(config.palette.danger), 1);
      this.arrow.lineBetween(ox, oy, sx + 26, sy - 26);
      this.arrow.fillStyle(hex(config.palette.danger), 1);
      this.arrow.fillTriangle(sx + 16, sy - 16, sx + 40, sy - 22, sx + 22, sy - 40);
      this.avoid.setVisible(true).setPosition(ox + 30, oy - 24);
    } else this.avoid.setVisible(false);
  }
}
