// Pooled particles (Phaser Images). No allocation inside update().
import Phaser from 'phaser';
import { config } from '../config';
import { TAU } from '../logic/math';

export interface ParticleOpts {
  vx?: number;
  vy?: number;
  gravity?: number; // px/s^2
  drag?: number; // 1/s
  life?: number; // s
  scale0?: number;
  scale1?: number;
  alpha0?: number;
  alpha1?: number;
  rot?: number; // rad
  spin?: number; // rad/s
  tint?: number;
  /** Confetti-style flip (scaleY oscillation, Hz). */
  flutter?: number;
  additive?: boolean;
  /** Delay before it appears (s). */
  delay?: number;
}

class Particle {
  img: Phaser.GameObjects.Image;
  active = false;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  g = 0;
  drag = 0;
  rot = 0;
  spin = 0;
  t = 0;
  life = 1;
  s0 = 1;
  s1 = 1;
  a0 = 1;
  a1 = 0;
  flutter = 0;
  delay = 0;

  constructor(img: Phaser.GameObjects.Image) {
    this.img = img;
  }
}

export class Particles {
  private pool: Particle[] = [];
  private cursor = 0;
  active = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, max = config.juice.particles.max) {
    for (let i = 0; i < max; i++) {
      const img = scene.add.image(0, 0, 'p_dot').setVisible(false);
      layer.add(img);
      this.pool.push(new Particle(img));
    }
  }

  emit(key: string, x: number, y: number, o: ParticleOpts = {}): void {
    const p = this.take();
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = o.vx ?? 0;
    p.vy = o.vy ?? 0;
    p.g = o.gravity ?? 0;
    p.drag = o.drag ?? 0;
    p.life = Math.max(0.01, o.life ?? 0.6);
    p.s0 = o.scale0 ?? 1;
    p.s1 = o.scale1 ?? p.s0;
    p.a0 = o.alpha0 ?? 1;
    p.a1 = o.alpha1 ?? 0;
    p.rot = o.rot ?? 0;
    p.spin = o.spin ?? 0;
    p.flutter = o.flutter ?? 0;
    p.delay = o.delay ?? 0;
    p.t = 0;
    const img = p.img;
    img.setTexture(key);
    img.setTint(o.tint ?? 0xffffff);
    img.setBlendMode(o.additive ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    img.setPosition(x, y).setRotation(p.rot).setScale(p.s0).setAlpha(p.a0);
    img.setVisible(p.delay <= 0);
  }

  /** Radial burst of `count` particles. */
  burst(key: string, x: number, y: number, count: number, speedMin: number, speedMax: number, o: ParticleOpts = {}, spawnRadius = 0): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const sp = speedMin + Math.random() * (speedMax - speedMin);
      const r = spawnRadius * (0.7 + Math.random() * 0.3);
      o.vx = Math.cos(a) * sp;
      o.vy = Math.sin(a) * sp;
      o.rot = Math.random() * TAU;
      this.emit(key, x + Math.cos(a) * r, y + Math.sin(a) * r, o);
    }
  }

  /** Expanding shockwave ring (texture 'ring' is 128 px wide). */
  ring(x: number, y: number, r0: number, r1: number, life: number, tint = 0xffffff, alpha = 0.9): void {
    this.emit('ring', x, y, { scale0: r0 / 64, scale1: r1 / 64, life, tint, alpha0: alpha, alpha1: 0 });
  }

  update(dt: number): void {
    let n = 0;
    for (const p of this.pool) {
      if (!p.active) continue;
      n++;
      if (p.delay > 0) {
        p.delay -= dt;
        if (p.delay <= 0) p.img.setVisible(true);
        continue;
      }
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) {
        p.active = false;
        p.img.setVisible(false);
        continue;
      }
      if (p.drag > 0) {
        const d = Math.exp(-p.drag * dt);
        p.vx *= d;
        p.vy *= d;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      const s = p.s0 + (p.s1 - p.s0) * k;
      const img = p.img;
      img.x = p.x;
      img.y = p.y;
      img.rotation = p.rot;
      if (p.flutter > 0) img.setScale(s, s * Math.cos(p.t * p.flutter * TAU));
      else img.setScale(s);
      img.alpha = p.a0 + (p.a1 - p.a0) * k;
    }
    this.active = n;
  }

  private take(): Particle {
    // Prefer a free slot; otherwise recycle the oldest in round-robin order.
    const len = this.pool.length;
    for (let i = 0; i < len; i++) {
      const idx = (this.cursor + i) % len;
      if (!this.pool[idx].active) {
        this.cursor = (idx + 1) % len;
        return this.pool[idx];
      }
    }
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % len;
    return p;
  }
}
