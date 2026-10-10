// A Layer Lab character built from its separate sprite parts (CharacterMaker parts laid out by the
// Unity prefab, see scripts/layerlab-chars.mjs) and animated in code, part by part. The characters
// have no legs: the root sits at the feet and `pose()` moves the parts by role (the whole body hops
// while walking, the upper body bobs and leans, the weapon swings around the hand and recoils, the
// head lags behind the body).
import type Phaser from 'phaser';
import { rigDef, type RigPart } from './layerlab';

type Role = 'body' | 'head' | 'armF' | 'armB' | 'other';

/** What the caller wants this frame. All fields are optional offsets from the rest pose. */
export interface Pose {
  /** Walk cycle phase (rad); the character hops once per half cycle. Ignored while `stepAmp` is 0. */
  step?: number;
  /** 0..1 how much the character hops. */
  stepAmp?: number;
  /** Upper body up/down (px, native scale; negative = up). */
  bob?: number;
  /** Whole-body lean (deg, positive = toward facing direction). */
  lean?: number;
  /** Squash (>0 = wider and shorter), applied around the feet. */
  squash?: number;
  /** Weapon swing around the hand (deg, positive = forward/down strike). */
  swing?: number;
  /** Weapon kick back (px). */
  recoil?: number;
  /** Head extra nod (px). */
  nod?: number;
}

function roleOf(name: string): Role {
  if (name.startsWith('weapon')) return 'armF';
  if (name === 'shield') return 'armB';
  if (name === 'body' || name === 'chest') return 'body';
  if (['head', 'eye', 'hair', 'helmethair', 'beard', 'helmet'].includes(name)) return 'head';
  return 'other';
}

/** Per-channel product of two 0xRRGGBB colors (a tint over the part's own skin tone). */
function mulColor(a: number, b: number): number {
  const ch = (s: number) => Math.round((((a >> s) & 255) * ((b >> s) & 255)) / 255) << s;
  return ch(16) | ch(8) | ch(0);
}

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
  /** Height from the feet to the top of the art, at the drawn scale (px). */
  readonly height: number;
  readonly width: number;
  private facing = 1;
  private readonly scale: number;
  /** Where the weapon turns (the front of the body), relative to the feet. */
  private gripX = 0;
  private gripY = 0;

  /** Returns null when the art for `key` is not loaded. */
  static create(scene: Phaser.Scene, key: string): Rig | null {
    const def = rigDef(key);
    if (!def || def.parts.length === 0) return null;
    for (const p of def.parts) if (!scene.textures.exists(p.tex)) return null;
    return new Rig(scene, def.parts, def.scale);
  }

  private constructor(scene: Phaser.Scene, parts: RigPart[], scale: number) {
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
    // stand on the body and center on it (a long weapon would pull the bounding box off the character)
    const body = parts.find((p) => p.name === 'body');
    const cx = body?.x ?? (left + right) / 2;
    if (body) bottom = body.y + body.h / 2;
    this.scale = scale;
    this.height = (bottom - top) * scale;
    this.width = (right - left) * scale;
    if (body) {
      this.gripX = body.x + body.w * 0.3 - cx;
      this.gripY = body.y - bottom;
    }
    this.c = scene.add.container(0, 0);
    for (const p of parts) {
      const img = scene.add.image(0, 0, p.tex).setAngle(p.angle).setScale(p.sx, p.sy);
      if (p.tint !== undefined) img.setTint(p.tint);
      this.c.add(img);
      this.pieces.push({ img, part: p, role: roleOf(p.name), x: p.x - cx, y: p.y - bottom });
    }
    this.c.setScale(scale);
    this.pose({});
  }

  /** dir 1 = facing right (the art's own facing), -1 = left. */
  face(dir: 1 | -1): this {
    this.facing = dir;
    this.c.setScale(dir * this.scale, this.scale);
    return this;
  }

  pose(p: Pose): void {
    const amp = p.stepAmp ?? 0;
    const hop = -Math.abs(Math.sin(p.step ?? 0)) * 7 * amp;
    const bob = p.bob ?? 0;
    const sq = p.squash ?? 0;
    const sx = 1 + sq;
    const sy = 1 - sq;
    const swing = p.swing ?? 0;
    const rad = (swing * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    for (const pc of this.pieces) {
      let x = pc.x;
      let y = pc.y + hop;
      let angle = pc.part.angle;
      switch (pc.role) {
        case 'head':
          y += bob * 1.25 + (p.nod ?? 0);
          break;
        case 'armF': {
          // the weapon parts turn together around the hand
          const dx = pc.x - this.gripX;
          const dy = pc.y - this.gripY;
          x = this.gripX + dx * cos - dy * sin - (p.recoil ?? 0);
          y = this.gripY + dx * sin + dy * cos + hop + bob;
          angle += swing;
          break;
        }
        case 'armB':
          y += bob * 0.8;
          angle -= swing * 0.3;
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
      if (color === null) this.restore(pc);
      else pc.img.setTintFill(color);
    }
  }

  /** Multiplicative tint (frozen / burning) over the parts' own colors, or null to restore. */
  tint(color: number | null): void {
    for (const pc of this.pieces) {
      if (color === null) this.restore(pc);
      else pc.img.setTint(pc.part.tint === undefined ? color : mulColor(pc.part.tint, color));
    }
  }

  private restore(pc: Piece): void {
    if (pc.part.tint === undefined) pc.img.clearTint();
    else pc.img.setTint(pc.part.tint);
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
