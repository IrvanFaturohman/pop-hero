// Turn indicator: a pill on the arena/room border ("YOUR TURN", "FIRE!", "ENEMY TURN") and a dark
// overlay on the balloon room while it is not your turn.
import Phaser from 'phaser';
import { config, hex } from '../config';
import { easeOutBack } from '../juice/ease';
import type { TurnPhase } from '../logic/turns';
import { strings } from '../strings';

const FONT = 'Fredoka, system-ui, sans-serif';

export class TurnUi {
  private dim: Phaser.GameObjects.Rectangle;
  private pill: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private dimTarget = 0;
  private popT = 1;
  private t = 0;
  private pulse = false;
  private phase: TurnPhase = 'intro';
  private left = -1;

  constructor(scene: Phaser.Scene, overlay: Phaser.GameObjects.Layer, ui: Phaser.GameObjects.Layer, textRes: number) {
    const L = config.layout;
    const w = L.roomRight - L.roomLeft;
    const h = L.roomBottom - L.roomOpenTop + 4;
    this.dim = scene.add.rectangle(L.roomLeft + w / 2, L.roomOpenTop - 4 + h / 2, w, h, 0x1a1210, 1).setAlpha(0);
    overlay.add(this.dim);
    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '30px', fontStyle: '700', color: '#ffffff', stroke: config.palette.outline, strokeThickness: 8, resolution: textRes })
      .setOrigin(0.5);
    this.pill = scene.add.container(L.width / 2, L.roomTop + 4, [this.bg, this.label]).setVisible(false);
    ui.add(this.pill);
  }

  setPhase(phase: TurnPhase, left = 0): void {
    this.phase = phase;
    this.left = left;
    const yours = phase === 'blow' || phase === 'unlock' || phase === 'burst' || phase === 'failed' || phase === 'collect';
    this.dimTarget = yours ? 0 : config.turns.roomDim;
    let msg = '';
    let color = '#ffffff';
    if (phase === 'blow') {
      msg = strings.yourTurn(left);
      color = config.palette.gold;
    } else if (phase === 'shoot') msg = strings.fire;
    else if (phase === 'enemy') {
      msg = strings.enemyTurn;
      color = config.palette.danger;
    }
    if (phase === 'collect' || phase === 'burst' || phase === 'unlock' || phase === 'failed') {
      this.pill.setVisible(false);
      return;
    }
    this.pulse = phase === 'blow';
    if (!msg) {
      this.pill.setVisible(false);
      return;
    }
    this.label.setText(msg).setColor(color);
    // your turn: on the room border; battle phases: under the top HUD and boss bar (camera zooms
    // into the battle)
    this.pill.setY(phase === 'blow' ? config.layout.roomBottom - 8 : 262);
    const pw = this.label.width + 36;
    this.bg.clear();
    this.bg.fillStyle(hex(config.palette.outline), 0.92);
    this.bg.fillRoundedRect(-pw / 2, -24, pw, 48, 24);
    this.pill.setVisible(true);
    this.popT = 0;
  }

  /** Live "n LEFT" count while blowing. */
  setLeft(left: number): void {
    if (this.phase !== 'blow' || left === this.left || left < 0) return;
    if (left > 0) this.setPhase('blow', left);
    else {
      this.left = 0;
      this.pill.setVisible(false);
    }
  }

  update(dt: number): void {
    this.t += dt;
    this.dim.alpha += (this.dimTarget - this.dim.alpha) * Math.min(1, dt * 10);
    if (!this.pill.visible) return;
    this.popT += dt;
    const pop = this.popT < 0.3 ? easeOutBack(this.popT / 0.3, 2.5) : 1;
    this.pill.setScale(pop * (this.pulse ? 1 + Math.sin(this.t * 5) * 0.04 : 1));
  }
}
