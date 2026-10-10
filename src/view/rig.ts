// A Layer Lab character built from its separate sprite parts (layout from the Unity prefab) and
// animated in code, part by part: the art ships without animation clips. The root sits at the
// feet; `pose()` moves the parts by role (legs step, upper body bobs and leans, the front arm /
// weapon swings and recoils, the head lags behind the body).
import type Phaser from 'phaser';
import { rigParts, type RigPart } from './layerlab';

type Role = 'legF' | 'legB' | 'body' | 'head' | 'armF' | 'armB' | 'other';

/** What the caller wants this frame. All fields are optional offsets from the rest pose. */
export interface Pose {
  /** Walk cycle phase (rad); legs lift alternately. Ignored while `stepAmp` is 0. */
  step?: number;
  /** 0..1 how much the legs step. */
  stepAmp?: number;
  /** Upper body up/down (px, native scale; negative = up). */
  bob?: number;
  /** Whole-body lean (deg, positive = toward facing direction). */
  lean?: number;
  /** Squash (>0 = wider and shorter), applied around the feet. */
  squash?: number;
  /** Front arm / weapon swing (deg, positive = forward/down strike). */
  swing?: number;
  /** Weapon kick back (px). */
  recoil?: number;
  /** Head extra nod (px). */
  nod?: number;
}

const ROLE_BY_NAME: Record<string, Role> = {
  leg: 'legF',
  leg1: 'legF',
  leg2: 'legB',
  body: 'body',
  cape: 'body',
  neck: 'body',
  head: 'head',
  mouth: 'head',
  hat: 'head',
  arm: 'armF',
  weapon: 'armF',
  bow: 'armF',
  arrow: 'armF',
  arm2: 'armB',
  shield: 'armB',
};

interface Piece {
  img: Phaser.GameObjects.Image;
  part: RigPart;
  role: Role;
  /** Rest position relative to the feet. */
  x: number;
  y: number;
}

export class Rig {
  readonly c: Phaser.GameObjects.Container;
  private pieces: Piece[] = [];
  /** Native height from the feet to the top of the art (px). */
  readonly height: number;
  readonly width: number;
  private facing = 1;

  /** Returns null when the art for `key` is not loaded. */
  static create(scene: Phaser.Scene, key: string): Rig | null {
    const parts = rigParts(key);
    if (!parts || parts.length === 0) return null;
    for (const p of parts) if (!scene.textures.exists(p.tex)) return null;
    return new Rig(scene, parts);
  }

  private constructor(scene: Phaser.Scene, parts: RigPart[]) {
    let bottom = -Infinity;
    let top = Infinity;
    let left = Infinity;
    let right = -Infinity;
    for (const p of parts) {
      bottom = Math.max(bottom, p.y + p.h / 2);
      top = Math.min(top, p.y - p.h / 2);
      left = Math.min(left, p.x - p.w / 2);
      right = Math.max(right, p.x + p.w / 2);
    }
    // center on the body (a long weapon would pull the bounding box off the character)
    const cx = parts.find((p) => p.name === 'body')?.x ?? (left + right) / 2;
    this.height = bottom - top;
    this.width = right - left;
    this.c = scene.add.container(0, 0);
    for (const p of parts) {
      const img = scene.add.image(0, 0, p.tex).setAngle(p.angle).setScale(p.sx, p.sy);
      this.c.add(img);
      this.pieces.push({ img, part: p, role: ROLE_BY_NAME[p.name] ?? 'other', x: p.x - cx, y: p.y - bottom });
    }
    this.pose({});
  }

  /**
   * Native size (the source art is small: any upscale blurs it). dir 1 = facing right (the art's
   * own facing), -1 = left.
   */
  face(dir: 1 | -1): this {
    this.facing = dir;
    this.c.setScale(dir, 1);
    return this;
  }

  pose(p: Pose): void {
    const amp = p.stepAmp ?? 0;
    const step = p.step ?? 0;
    const bob = p.bob ?? 0;
    const sq = p.squash ?? 0;
    const sx = 1 + sq;
    const sy = 1 - sq;
    for (const pc of this.pieces) {
      let x = pc.x;
      let y = pc.y;
      let angle = pc.part.angle;
      switch (pc.role) {
        case 'legF':
          y -= Math.max(0, Math.sin(step)) * 10 * amp;
          x += Math.cos(step) * 4 * amp;
          break;
        case 'legB':
          y -= Math.max(0, Math.sin(step + Math.PI)) * 10 * amp;
          x += Math.cos(step + Math.PI) * 4 * amp;
          break;
        case 'head':
          y += bob * 1.25 + (p.nod ?? 0);
          break;
        case 'armF':
          y += bob;
          x -= p.recoil ?? 0;
          angle += p.swing ?? 0;
          break;
        case 'armB':
          y += bob * 0.8;
          angle -= (p.swing ?? 0) * 0.3;
          break;
        default:
          y += bob;
      }
      // squash around the feet: x spreads, heights shrink toward the ground
      pc.img.setPosition(x * sx, y * sy).setAngle(angle).setScale(pc.part.sx * sx, pc.part.sy * sy);
    }
    this.c.setAngle((p.lean ?? 0) * this.facing);
  }

  setPosition(x: number, y: number): this {
    this.c.setPosition(x, y);
    return this;
  }

  setVisible(v: boolean): this {
    this.c.setVisible(v);
    return this;
  }

  setDepth(d: number): this {
    this.c.setDepth(d);
    return this;
  }

  setAlpha(a: number): this {
    this.c.setAlpha(a);
    return this;
  }

  /** Solid color flash (hit) or null to restore. */
  fill(color: number | null): void {
    for (const pc of this.pieces) {
      if (color === null) pc.img.clearTint();
      else pc.img.setTintFill(color);
    }
  }

  /** Multiplicative tint (frozen / burning), or null to restore. */
  tint(color: number | null): void {
    for (const pc of this.pieces) {
      if (color === null) pc.img.clearTint();
      else pc.img.setTint(color);
    }
  }

  /** Where a part's center is in world space (e.g. the gun for the muzzle flash). */
  partWorld(name: string, out: { x: number; y: number }): boolean {
    const pc = this.pieces.find((p) => p.part.name === name);
    if (!pc) return false;
    const m = pc.img.getWorldTransformMatrix();
    out.x = m.tx;
    out.y = m.ty;
    return true;
  }

  destroy(): void {
    this.c.destroy();
  }
}
