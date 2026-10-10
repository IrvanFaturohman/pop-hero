// Hero (chibi soldier facing right) with rifle, HP bar + bullet count pill under the feet
// (reference layout), muzzle flash, recoil, hurt blink, and the bullet sprites.
import Phaser from 'phaser';
import { config, hex } from '../config';
import { easeOutQuad } from '../juice/ease';
import { Spring } from '../juice/spring';
import { MAX_BULLETS, type Battle } from '../logic/battle';
import { TAU, lerp } from '../logic/math';
import { powerIconKey } from './gui';
import { Rig } from './rig';
import { FONT, FONT_WEIGHT } from './gui';

const BAR_W = 96;
const BAR_H = 14;
const SPECIAL_ICONS = 5;

export class HeroView {
  private hero: Phaser.GameObjects.Image;
  private blaster: Phaser.GameObjects.Image;
  /** Layer Lab soldier (null = procedural hero + blaster). */
  private rig: Rig | null;
  private muzzle: Phaser.GameObjects.Image;
  private bars: Phaser.GameObjects.Graphics;
  private hpText: Phaser.GameObjects.Text;
  private ammoText: Phaser.GameObjects.Text;
  private ammoIcon: Phaser.GameObjects.Image;
  private bullets: Phaser.GameObjects.Image[] = [];
  private bombs: Phaser.GameObjects.Image[] = [];
  /** Power-up shots waiting for the next volley, right of the bullet counter. */
  private specialIcons: Phaser.GameObjects.Image[] = [];
  private heroSquash = new Spring(0, 300, 12);
  private barShake = new Spring(0, 500, 10);
  private t = 0;
  private recoilT = 1;
  private muzzleT = 1;
  private hurtT = 0;
  private punchT = 1;
  private emptyT = -1;
  private hpShown = 1;
  private chip = 1;
  private chipWait = 0;
  /** Displayed ammo (rolls toward the real value, never jumps). */
  display = 0;
  private shownInt = -1;
  private shownHp = -1;
  private shownColor = '#ffffff';

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, textRes: number) {
    const L = config.layout;
    for (let i = 0; i < MAX_BULLETS; i++) {
      const b = scene.add.image(0, 0, 'bullet').setVisible(false);
      layer.add(b);
      this.bullets.push(b);
    }
    for (let i = 0; i < 6; i++) {
      const b = scene.add.image(0, 0, 'bomb').setVisible(false);
      layer.add(b);
      this.bombs.push(b);
    }
    const shadow = scene.add.ellipse(L.heroX, L.groundY + 2, 84, 18, 0x000000, 0.2);
    this.hero = scene.add.image(L.heroX, L.heroY, 'hero').setOrigin(0.5, 80 / 140);
    this.blaster = scene.add.image(L.heroX + 16, L.heroY + 6, 'blaster').setOrigin(0.15, 0.55);
    this.muzzle = scene.add.image(0, 0, 'muzzle').setVisible(false);
    this.bars = scene.add.graphics();
    const txt = (size: number) => ({ fontFamily: FONT, fontSize: `${size}px`, fontStyle: FONT_WEIGHT, color: '#ffffff', stroke: config.palette.outline, strokeThickness: 6, resolution: textRes });
    this.hpText = scene.add.text(L.heroX, L.heroBarY - 1, '', txt(18)).setOrigin(0.5);
    this.ammoIcon = scene.add.image(L.ammoCounterX - 22, L.ammoCounterY, 'ball').setScale(1.1);
    this.ammoText = scene.add.text(L.ammoCounterX - 8, L.ammoCounterY, '0', txt(26)).setOrigin(0, 0.52);
    this.rig = Rig.create(scene, 'hero');
    if (this.rig) {
      this.hero.setVisible(false);
      this.blaster.setVisible(false);
      this.rig.face(1).setPosition(L.heroX, L.groundY + 2);
    }
    layer.add([shadow, this.hero, this.blaster, ...(this.rig ? [this.rig.c] : []), this.muzzle, this.bars, this.hpText, this.ammoIcon, this.ammoText]);
    for (let i = 0; i < SPECIAL_ICONS; i++) {
      const img = scene.add.image(0, 0, 'emb_fire').setVisible(false);
      layer.add(img);
      this.specialIcons.push(img);
    }
  }

  onShoot(): void {
    this.recoilT = 0;
    this.muzzleT = 0;
  }

  /** Hero took damage: red blink, squash, HP bar shake (white chip catches up later). */
  onHurt(): void {
    this.hurtT = 0.3;
    this.heroSquash.kick(-2.5);
    this.barShake.kick(40);
    this.chipWait = config.juice.hpChipDelay;
  }

  onEmpty(): void {
    this.emptyT = 0;
    this.heroSquash.kick(-1.5);
  }

  /** A bullet token landed on the counter. */
  onTokenLand(): void {
    this.punchT = 0;
    this.heroSquash.kick(1.2);
  }

  /** Where bullet tokens fly to. */
  counterX(): number {
    return config.layout.ammoCounterX - 22;
  }

  counterY(): number {
    return config.layout.ammoCounterY;
  }

  update(battle: Battle, alpha: number, dt: number, targetAmmo: number): void {
    const L = config.layout;
    this.t += dt;

    // idle bob + squash + recoil (kick back to the left)
    const bob = Math.sin(this.t * TAU * 1.2) * 2;
    this.recoilT += dt;
    const recoil = this.recoilT < 0.06 ? config.hero.recoil * (1 - this.recoilT / 0.06) : 0;
    const sq = this.heroSquash.update(dt);
    this.hero.setPosition(L.heroX - recoil * 0.4, L.heroY + bob).setScale(1 + sq * 0.05, 1 - sq * 0.05);
    let emptyShake = 0;
    if (this.emptyT >= 0) {
      this.emptyT += dt;
      emptyShake = this.emptyT < 0.25 ? Math.sin(this.emptyT * 60) * 3 * (1 - this.emptyT / 0.25) : 0;
    }
    this.blaster.setPosition(L.heroX + 16 - recoil, L.heroY + 6 + bob + emptyShake).setAngle(recoil * -1.5);
    if (this.rig) {
      // breathe, kick the gun back on every shot, squash when hurt
      this.rig.pose({ bob: Math.sin(this.t * TAU * 1.2) * 1.5, recoil: recoil * 0.8, swing: -recoil * 0.6 + emptyShake * 2, squash: sq * 0.05, nod: Math.sin(this.t * TAU * 1.2 - 0.6) * 1 });
      this.rig.setPosition(L.heroX - recoil * 0.3, L.groundY + 2);
    }
    this.muzzleT += dt;
    this.muzzle.setVisible(this.muzzleT < 0.05);
    if (this.muzzleT < 0.05) {
      this.muzzle.setPosition(battle.muzzleX(), battle.muzzleY() + bob).setRotation(Math.random() * TAU).setScale(0.7 + Math.random() * 0.4);
    }
    if (this.hurtT > 0) {
      this.hurtT -= dt;
      const blink = Math.floor(this.hurtT * 20) % 2 === 0 && this.hurtT > 0;
      if (blink) this.hero.setTintFill(hex(config.palette.danger));
      else this.hero.clearTint();
      this.rig?.fill(blink ? hex(config.palette.danger) : null);
    }

    this.updateBars(battle, dt);
    this.updateAmmo(dt, targetAmmo);
    this.updateSpecials(battle);

    // bullets
    for (let i = 0; i < battle.bullets.length; i++) {
      const b = battle.bullets[i];
      const img = this.bullets[i];
      if (!b.active) {
        img.setVisible(false);
        continue;
      }
      img
        .setVisible(true)
        .setPosition(lerp(b.prevX, b.x, alpha), lerp(b.prevY, b.y, alpha))
        .setRotation(Math.atan2(b.vy, b.vx) + Math.PI / 2)
        .setTint(b.kind === 'fire' ? 0xff8a3d : b.kind === 'ice' ? 0x7fe9ff : 0xffffff);
    }
    // bombs fly in an arc to the densest group
    const flight = config.effects.bombFlight;
    for (let i = 0; i < this.bombs.length; i++) {
      const img = this.bombs[i];
      const bb = battle.bombs[i];
      if (!bb) {
        img.setVisible(false);
        continue;
      }
      const k = Math.min(1, bb.t / flight);
      img
        .setVisible(true)
        .setPosition(bb.x0 + (bb.tx - bb.x0) * k, bb.y0 + (bb.ty - bb.y0) * k - Math.sin(k * Math.PI) * 140)
        .setRotation(k * 8);
    }
  }

  /** HP bar under the hero: fill eases down, a white chip follows after a delay, shakes when hit. */
  private updateBars(battle: Battle, dt: number): void {
    const L = config.layout;
    const hpFrac = battle.hp / battle.maxHp;
    this.hpShown += (hpFrac - this.hpShown) * Math.min(1, dt * 18);
    if (this.chip < this.hpShown) this.chip = this.hpShown;
    if (this.chipWait > 0) this.chipWait -= dt;
    else this.chip += (this.hpShown - this.chip) * Math.min(1, dt * 6);
    const sx = this.barShake.update(dt) * 0.08;
    const x = L.heroX - BAR_W / 2 + sx;
    const y = L.heroBarY - BAR_H / 2;
    const g = this.bars;
    g.clear();
    g.fillStyle(hex(config.palette.outline), 1);
    g.fillRoundedRect(x - 3, y - 3, BAR_W + 6, BAR_H + 6, 7);
    g.fillStyle(0x1e1e2a, 1);
    g.fillRoundedRect(x, y, BAR_W, BAR_H, 5);
    if (this.chip > 0.001) {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(x, y, Math.max(6, BAR_W * this.chip), BAR_H, 5);
    }
    if (this.hpShown > 0.001) {
      g.fillStyle(this.hpShown < config.juice.lowHp ? hex(config.palette.danger) : hex(config.palette.hpBar), 1);
      g.fillRoundedRect(x, y, Math.max(6, BAR_W * this.hpShown), BAR_H, 5);
    }
    // bullet count pill
    g.fillStyle(0x1a1420, 0.85);
    g.fillRoundedRect(L.ammoCounterX - 40, L.ammoCounterY - 15, 80, 30, 15);
    const hp = Math.ceil(battle.hp);
    if (hp !== this.shownHp) {
      this.hpText.setText(String(hp));
      this.shownHp = hp;
    }
    this.hpText.setX(L.heroX + sx);
  }

  private updateSpecials(battle: Battle): void {
    const L = config.layout;
    const list = battle.weapons.specials;
    for (let i = 0; i < this.specialIcons.length; i++) {
      const img = this.specialIcons[i];
      const kind = list[i];
      img.setVisible(kind !== undefined);
      if (!kind) continue;
      const key = powerIconKey(img.scene, kind);
      if (img.texture.key !== key) img.setTexture(key);
      img.setPosition(L.ammoCounterX + 62 + i * 32, L.ammoCounterY + Math.sin(this.t * 4 + i) * 2).setDisplaySize(30, 30);
    }
  }

  /** Bullet count rolls toward its target, punches when tokens land, blinks red when empty. */
  private updateAmmo(dt: number, targetAmmo: number): void {
    const diff = targetAmmo - this.display;
    if (Math.abs(diff) < 0.01) this.display = targetAmmo;
    else this.display += Math.sign(diff) * Math.max(Math.abs(diff) * Math.min(1, dt * 14), Math.min(Math.abs(diff), dt * 20));
    const shown = Math.round(this.display);
    if (shown !== this.shownInt) {
      this.ammoText.setText(String(shown));
      this.shownInt = shown;
    }
    this.punchT += dt;
    const punch = this.punchT < 0.14 ? lerp(1.35, 1, easeOutQuad(this.punchT / 0.14)) : 1;
    this.ammoText.setScale(punch);
    this.ammoIcon.setScale(1.1 * punch);
    const empty = shown <= 0 && !config.debug.infiniteAmmo;
    const blink = empty && this.emptyT >= 0 && this.emptyT < 1 && Math.floor(this.t * 6) % 2 === 0;
    const color = blink ? config.palette.danger : '#ffffff';
    if (color !== this.shownColor) {
      // setColor re-renders the text texture: only when it changes
      this.ammoText.setColor(color);
      this.shownColor = color;
    }
  }
}
