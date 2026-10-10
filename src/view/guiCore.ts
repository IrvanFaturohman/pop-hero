// Primitives of the UI kit (view/gui.ts builds the pack's blocks from them): text in the pack's
// style, 9-sliced pack sprites, icons and the full-screen dim. Sizes in the Layer Lab prefabs are
// canvas units of a 1080-wide reference; `U` maps them onto our 720-wide canvas. Without the art
// every sprite falls back to a flat shape so a clone without the Unity project still runs.
import Phaser from 'phaser';
import { config } from '../config';
import { guiSprite } from './layerlab';

/** Prefab canvas unit -> game px (GUI Pro-MinimalGame: 1080 x 1920 reference, match width). */
export const U = 720 / 1080;

/**
 * The pack's fonts (Afacad Flux / LT Avocado) ship only as TextMeshPro assets, so every text uses
 * the bundled Fredoka in their heavy weight.
 */
export const FONT = 'Fredoka, system-ui, sans-serif';
export const FONT_WEIGHT = '700';

/** Text on the pack's cream panels (labels / dark body text). */
export const INK = { label: '#815942', dark: '#4d3024', soft: '#bb8a63' } as const;

/** Outline colors of the TMP materials (AfacadFlux SDF_OutlineBlack / _OutlineBrown). */
export const LINE = { black: '#000000', brown: '#4e3024' } as const;
export type LineColor = keyof typeof LINE | 'none';

export interface TextOpts {
  line?: LineColor;
  color?: string;
  /** Word wrap width (game px). */
  wrap?: number;
  align?: 'left' | 'center' | 'right';
  originX?: number;
}

/**
 * Text like the pack's TMP materials: `size` is the prefab font size (canvas units); the outlined
 * styles get a thin outline plus a solid drop of the same color under it.
 */
export function text(scene: Phaser.Scene, x: number, y: number, msg: string, size: number, o: TextOpts = {}): Phaser.GameObjects.Text {
  const px = Math.round(size * U);
  const line = o.line ?? 'black';
  const t = scene.add
    .text(x, y, msg, {
      fontFamily: FONT,
      fontSize: `${px}px`,
      fontStyle: FONT_WEIGHT,
      color: o.color ?? '#ffffff',
      align: o.align ?? 'center',
      resolution: (scene.registry.get('renderScale') as number) ?? 1,
    })
    .setOrigin(o.originX ?? 0.5, 0.5);
  if (line !== 'none') {
    const c = LINE[line];
    t.setStroke(c, Math.max(2, px * 0.14));
    t.setShadow(0, Math.max(1.5, px * 0.08), c, 0, true, true);
  }
  if (o.wrap) t.setWordWrapWidth(o.wrap, true);
  return t;
}

/** `key` when loaded, else `fallback` (procedural texture). */
export function tex(scene: Phaser.Scene, key: string, fallback: string): string {
  return scene.textures.exists(key) ? key : fallback;
}

/**
 * A pack sprite at w x h centered on (x, y): 9-sliced with the Unity borders (corners scaled by U,
 * like the canvas does) when it has borders, stretched otherwise. `tint` = the Image color.
 */
export function sprite(scene: Phaser.Scene, key: string, x: number, y: number, w: number, h: number, tint?: number, alpha = 1): Phaser.GameObjects.Image | Phaser.GameObjects.NineSlice | Phaser.GameObjects.Graphics {
  const g = guiSprite(key);
  if (!g || !scene.textures.exists(key)) {
    const r = scene.add.graphics();
    r.fillStyle(tint ?? 0x3a3c58, alpha);
    r.fillRoundedRect(x - w / 2, y - h / 2, w, h, Math.min(w, h, 24) / 4);
    return r;
  }
  let obj: Phaser.GameObjects.Image | Phaser.GameObjects.NineSlice;
  if (!g.border) obj = scene.add.image(x, y, key).setDisplaySize(w, h);
  else {
    let [l, r, t, b] = g.border;
    // a border spanning the whole texture leaves no stretch strip: take 2 px off the borders,
    // proportionally, so the strip stays where Unity stretches it
    [l, r] = fitBorders(l, r, g.w);
    [t, b] = fitBorders(t, b, g.h);
    // built at w/U x h/U (canvas units) and scaled by U; never smaller than its corners
    const nw = Math.max(l + r + 2, w / U);
    const nh = Math.max(t + b + 2, h / U);
    obj = scene.add.nineslice(x, y, key, undefined, nw, nh, l, r, t, b).setScale(w / nw, h / nh);
  }
  if (tint !== undefined) obj.setTint(tint);
  return obj.setAlpha(alpha);
}

function fitBorders(a: number, b: number, size: number): [number, number] {
  const excess = a + b - (size - 2);
  if (excess <= 0 || a + b === 0) return [a, b];
  return [Math.max(0, Math.floor(a - (excess * a) / (a + b))), Math.max(0, Math.floor(b - (excess * b) / (a + b)))];
}

/** Offsets of a child stretched over its parent (Unity anchors 0..1): canvas units, y up. */
export interface Inset {
  dw?: number;
  dh?: number;
  dx?: number;
  dy?: number;
  alpha?: number;
}

/** `key` stretched over a w x h parent centered on (0, 0), like a full-stretch RectTransform. */
export function fill(scene: Phaser.Scene, key: string, w: number, h: number, tint?: number, o: Inset = {}): Phaser.GameObjects.GameObject {
  return sprite(scene, key, (o.dx ?? 0) * U, -(o.dy ?? 0) * U, w + (o.dw ?? 0) * U, h + (o.dh ?? 0) * U, tint, o.alpha ?? 1);
}

/** A small piece pinned to the parent's top-left corner (the buttons' HighLight dot). */
export function corner(scene: Phaser.Scene, key: string, w: number, h: number, dx: number, dy: number, pw: number, ph: number, tint = 0xffffff): Phaser.GameObjects.GameObject {
  return sprite(scene, key, -w / 2 + dx * U, -h / 2 - dy * U, pw * U, ph * U, tint);
}

/** Icon image of `size` px (longest side), or the fallback texture. */
export function icon(scene: Phaser.Scene, x: number, y: number, key: string, size: number, fallback?: string): Phaser.GameObjects.Image {
  const k = scene.textures.exists(key) ? key : fallback && scene.textures.exists(fallback) ? fallback : '__WHITE';
  const img = scene.add.image(x, y, k);
  return img.setScale(size / Math.max(img.width, img.height));
}

/** Full-screen dim (the prefabs' "Dimmed" image, #12131a at 85 %) that swallows taps. */
export function dim(scene: Phaser.Scene, alpha = 1): Phaser.GameObjects.Rectangle {
  const L = config.layout;
  return scene.add.rectangle(L.width / 2, L.height / 2, L.width + 400, L.height + 600, 0x12131a, 0.85 * alpha).setInteractive();
}
