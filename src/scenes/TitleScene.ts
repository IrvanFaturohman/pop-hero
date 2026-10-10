// Title: logo, colorful balloons bobbing, "HOLD TO PLAY". Holding anywhere fills a ring and opens
// the home screen (and unlocks audio on the first touch).
import Phaser from 'phaser';
import { config } from '../config';
import { sfx } from '../audio/sfx';
import { synth } from '../audio/synth';
import { easeOutBack } from '../juice/ease';
import { TAU } from '../logic/math';
import { strings } from '../strings';
import { ArenaView } from '../view/arenaView';
import { RoomView } from '../view/roomView';
import { Rig } from '../view/rig';
import { FONT, FONT_WEIGHT } from '../view/gui';

const HOLD_TIME = 0.45;

export class TitleScene extends Phaser.Scene {
  private t = 0;
  private hold = 0;
  private holding = false;
  private started = false;
  private balloons: Array<{ img: Phaser.GameObjects.Image; x: number; y: number; ph: number }> = [];
  private logo!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private ring!: Phaser.GameObjects.Graphics;
  /** Layer Lab hero and a goblin facing off on the road (when the art is loaded). */
  private cast: Rig[] = [];

  constructor() {
    super('Title');
  }

  create(): void {
    const rs = (this.registry.get('renderScale') as number) ?? 1;
    const L = config.layout;
    this.t = 0;
    this.hold = 0;
    this.holding = false;
    this.started = false;
    this.cameras.main.setZoom(rs).centerOn(L.width / 2, L.height / 2);
    const bg = this.add.layer();
    const fx = this.add.layer();
    new ArenaView(this, bg);
    new RoomView(this, bg, fx);
    this.balloons = [];
    const spots: Array<[number, number, number, number]> = [
      [190, 930, 0, 70],
      [370, 1010, 2, 105],
      [545, 900, 3, 80],
      [270, 1120, 1, 55],
      [480, 1120, 4, 62],
    ];
    for (const [x, y, tint, r] of spots) {
      const img = this.add.image(x, y, `balloon_n${tint}`).setDisplaySize(r * 2, r * 2);
      fx.add(img);
      this.balloons.push({ img, x, y, ph: Math.random() * TAU });
    }
    const text = (y: number, msg: string, size: number, color: string, stroke: number) =>
      this.add
        .text(L.width / 2, y, msg, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: FONT_WEIGHT, color, stroke: config.palette.outline, strokeThickness: stroke, resolution: rs })
        .setOrigin(0.5);
    this.logo = text(300, strings.title, 112, '#ffffff', 20);
    this.prompt = text(700, strings.holdToPlay, 46, config.palette.gold, 12);
    this.ring = this.add.graphics();
    fx.add([this.logo, this.prompt, this.ring]);
    this.cast = [];
    const hero = Rig.create(this, 'hero');
    const goblin = Rig.create(this, 'brute');
    if (hero && goblin) {
      this.cast = [hero.face(1).setPosition(150, L.groundY + 4), goblin.face(-1).setPosition(560, L.groundY + 4)];
      bg.add(this.cast.map((r) => r.c));
    }

    this.input.on('pointerdown', () => {
      synth.unlock();
      this.holding = true;
    });
    this.input.on('pointerup', () => {
      synth.unlock();
      this.holding = false;
    });
    this.input.keyboard?.on('keydown-SPACE', () => {
      synth.unlock();
      this.holding = true;
    });
    this.input.keyboard?.on('keyup-SPACE', () => (this.holding = false));
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);
    this.t += dt;
    const L = config.layout;
    this.logo.setScale(easeOutBack(Math.min(1, this.t / 0.6), 2)).setAngle(Math.sin(this.t * 1.5) * 2);
    this.prompt.setScale(1 + Math.sin(this.t * 5) * 0.05).setAlpha(this.t > 0.5 ? 1 : 0);
    this.cast.forEach((r, i) => r.pose({ bob: Math.sin(this.t * 7 + i) * 1.5, nod: Math.sin(this.t * 7 + i - 0.6), swing: i === 1 ? Math.sin(this.t * 2) * 10 : 0 }));
    for (const b of this.balloons) {
      b.img.setPosition(b.x + Math.sin(this.t * 1.1 + b.ph) * 8, b.y + Math.sin(this.t * 1.6 + b.ph) * 12).setAngle(Math.sin(this.t * 1.3 + b.ph) * 4);
    }
    // hold to start: a ring fills around the prompt
    this.hold = this.holding ? this.hold + dt : Math.max(0, this.hold - dt * 2);
    const k = Math.min(1, this.hold / HOLD_TIME);
    this.ring.clear();
    if (k > 0) {
      this.ring.lineStyle(10, 0xffffff, 0.9);
      this.ring.beginPath();
      this.ring.arc(L.width / 2, 820, 46, -Math.PI / 2, -Math.PI / 2 + k * TAU);
      this.ring.strokePath();
    }
    if (k >= 1 && !this.started) {
      this.started = true;
      sfx.ui_tap();
      this.cameras.main.fadeOut(220, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Home'));
    }
  }
}
