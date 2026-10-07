// Enemy visuals: walk-in with a hop, idle wobble, hit flash/squash, attack dash to the hero and back
// ("!" while attacking), small HP bar, depth by lane.
import Phaser from 'phaser';
import { config, hex } from '../config';
import { easeOutQuad } from '../juice/ease';
import { Spring } from '../juice/spring';
import type { Enemy } from '../logic/enemies';
import { TAU, lerp } from '../logic/math';
import { ENEMY_TEX_SCALE } from './texturesEnemy';

class EnemySprite {
  id = -1;
  body: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  alert: Phaser.GameObjects.Image;
  hpBar: Phaser.GameObjects.Graphics;
  squash = new Spring(0, 380, 12);
  flashT = 0;
  /** Attack dash: time since start (>= attackTime = idle) and distance to the hero. */
  dashT = 99;
  dashDist = 0;
  phase = Math.random() * TAU;
  dyingT = -1;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.shadow = scene.add.ellipse(0, 0, 60, 16, 0x000000, 0.18).setVisible(false);
    this.body = scene.add.image(0, 0, 'enemy_grunt').setVisible(false);
    this.alert = scene.add.image(0, 0, 'alert').setVisible(false).setScale(0.8);
    this.hpBar = scene.add.graphics().setVisible(false);
    layer.add([this.shadow, this.body, this.hpBar, this.alert]);
  }

  bind(e: Enemy): void {
    this.id = e.id;
    this.body.setTexture(`enemy_${e.kind}`).setVisible(true).clearTint().setAlpha(1);
    this.shadow.setVisible(true).setSize(e.stats.radius * 2, e.stats.radius * 0.5);
    this.squash.snap(0);
    this.flashT = 0;
    this.dashT = 99;
    this.dyingT = -1;
    // depth by lane: lower on screen = in front
    const d = e.y;
    this.shadow.setDepth(d - 1);
    this.body.setDepth(d);
    this.hpBar.setDepth(d + 0.1);
    this.alert.setDepth(d + 0.2);
  }

  hide(): void {
    this.id = -1;
    this.body.setVisible(false);
    this.shadow.setVisible(false);
    this.alert.setVisible(false);
    this.hpBar.setVisible(false);
  }
}

export class EnemyView {
  private pool: EnemySprite[] = [];
  private byId = new Map<number, EnemySprite>();
  private t = 0;

  constructor(
    private scene: Phaser.Scene,
    private layer: Phaser.GameObjects.Layer,
  ) {
    for (let i = 0; i < 24; i++) this.pool.push(new EnemySprite(scene, layer));
  }

  onSpawn(e: Enemy): void {
    let s = this.pool.find((p) => p.id === -1 && p.dyingT < 0);
    if (!s) {
      s = new EnemySprite(this.scene, this.layer);
      this.pool.push(s);
    }
    s.bind(e);
    this.byId.set(e.id, s);
  }

  onHit(e: Enemy): void {
    const s = this.byId.get(e.id);
    if (!s) return;
    s.flashT = 0.06;
    s.squash.kick(-2.4);
  }

  /** Dash in toward the hero (hits at `attackHit`), then run back to the slot. */
  onAttackStart(e: Enemy): void {
    const s = this.byId.get(e.id);
    if (!s) return;
    s.dashT = 0;
    s.dashDist = Math.max(0, e.x - (config.layout.heroX + 70 + e.stats.radius));
  }

  /** Boss slam: a big leap at the hero and back. */
  onBossSlam(e: Enemy): void {
    const s = this.byId.get(e.id);
    if (!s) return;
    s.dashT = 0;
    s.dashDist = Math.max(0, e.x - (config.layout.heroX + 80 + e.stats.radius));
  }

  /** Swell + white flash, then hide (the burst is particles). */
  onKill(e: Enemy): void {
    const s = this.byId.get(e.id);
    if (!s) return;
    this.byId.delete(e.id);
    s.dyingT = 0;
    s.alert.setVisible(false);
    s.hpBar.setVisible(false);
  }

  update(enemies: readonly Enemy[], alpha: number, dt: number): void {
    this.t += dt;
    for (const e of enemies) {
      const s = this.byId.get(e.id);
      if (!s || !e.alive) continue;
      this.draw(s, e, alpha, dt);
    }
    for (const s of this.pool) {
      if (s.dyingT < 0) continue;
      s.dyingT += dt;
      s.body.setScale(s.body.scaleX * (1 + dt * 3)).setTintFill(0xffffff);
      if (s.dyingT >= 0.08) {
        s.dyingT = -1;
        s.hide();
      }
    }
  }

  private draw(s: EnemySprite, e: Enemy, alpha: number, dt: number): void {
    const r = e.stats.radius;
    let x = lerp(e.prevX, e.x, alpha);
    let y = e.y;
    const texSize = r * ENEMY_TEX_SCALE;
    // hop while stepping, gentle wobble while waiting
    const hop = e.moving ? Math.abs(Math.sin(this.t * 14 + s.phase)) : 0;
    const wobble = Math.sin(this.t * 3 + s.phase) * 4;
    // attack dash: fast in (ease-in), short hold at the hero, run back
    const ec = config.enemies;
    s.dashT += dt;
    let dash = 0;
    if (s.dashT < ec.attackTime) {
      const tIn = ec.attackHit;
      const hold = 0.05;
      if (s.dashT < tIn) dash = Math.pow(s.dashT / tIn, 2);
      else if (s.dashT < tIn + hold) dash = 1;
      else dash = 1 - easeOutQuad((s.dashT - tIn - hold) / (ec.attackTime - tIn - hold));
    }
    x -= dash * s.dashDist;
    y -= hop * r * 0.3 + Math.sin(dash * Math.PI) * 18;
    const breathe = Math.sin(this.t * 4 + s.phase) * 0.03;
    const sq = s.squash.update(dt) * 0.05 + (e.moving ? (hop - 0.5) * 0.1 : breathe);
    s.body
      .setPosition(x, y)
      .setDisplaySize(texSize * (1 - sq), texSize * (1 + sq))
      .setAngle(wobble + (e.moving ? -6 : 0));
    s.flashT = Math.max(0, s.flashT - dt);
    if (s.flashT > 0) s.body.setTintFill(0xffffff);
    else if (e.frozen) s.body.setTint(0x8fe3ff);
    else if (e.burn > 0) s.body.setTint(Math.sin(this.t * 12) > 0 ? 0xffa060 : 0xffd0a0);
    else s.body.clearTint();
    s.shadow.setPosition(x, e.y + r * 0.85).setScale(1 - hop * 0.3, 1);

    // "!" above an attacking enemy
    const attacking = s.dashT < ec.attackTime;
    s.alert.setVisible(attacking);
    if (attacking) s.alert.setPosition(x, y - r * 1.3);

    // small HP bar once damaged
    const hpK = e.hp / e.maxHp;
    s.hpBar.setVisible(hpK < 1);
    if (hpK < 1) {
      const w = r * 1.6;
      const g = s.hpBar;
      g.clear();
      g.fillStyle(hex(config.palette.outline), 0.85);
      g.fillRoundedRect(x - w / 2 - 2, y - r * 1.05 - 2, w + 4, 10, 4);
      g.fillStyle(hex(config.palette.danger), 1);
      g.fillRoundedRect(x - w / 2, y - r * 1.05, Math.max(2, w * hpK), 6, 3);
    }
  }
}
