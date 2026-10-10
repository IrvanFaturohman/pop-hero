// Card pieces of the UI kit from GUI Pro-MinimalGame's perk selection (Play_Perk_Selection_01):
// CardFrame_01 (cream card with a colored roof) and the grade tag on its top edge
// (Label_Tapered_02), plus Tab_01 for the home screen's bottom menu.
import type Phaser from 'phaser';
import { U, fill, sprite, text } from './guiCore';

export type CardColor = 'red' | 'blue' | 'plum' | 'green' | 'yellow' | 'brown';

interface CardTints {
  inner1: number;
  inner2: number;
  roof: number;
  roofLine: number;
  roofLight: number;
  /** Gold cards (red / yellow) have a bright band low on the inner border. */
  glow?: number;
}

/** CardFrame_01_* colors. */
const CARD: Record<CardColor, CardTints> = {
  red: { inner1: 0xeed755, inner2: 0xf5ad17, roof: 0xeb4c4d, roofLine: 0xb63138, roofLight: 0xf56465, glow: 0xffffaa },
  yellow: { inner1: 0xeed755, inner2: 0xf5ad17, roof: 0xf2ae17, roofLine: 0xbe7534, roofLight: 0xf8ca22, glow: 0xffffaa },
  blue: { inner1: 0xbedadd, inner2: 0xaac88c, roof: 0x0096e5, roofLine: 0x0076d2, roofLight: 0x00aff0 },
  plum: { inner1: 0xedced7, inner2: 0xcfa1bb, roof: 0xdf64e2, roofLine: 0xbc46d8, roofLight: 0xee79e6 },
  green: { inner1: 0xe0ef9b, inner2: 0xaac88c, roof: 0x2ac857, roofLine: 0x189a3d, roofLight: 0x54df7d },
  brown: { inner1: 0xedc696, inner2: 0xd1a978, roof: 0xc08e53, roofLine: 0x846148, roofLight: 0xc99b5e },
};

/** CardFrame_01 at w x h centered on (0, 0) (the prefab card is 308 x 640). */
export function cardFrame(scene: Phaser.Scene, w: number, h: number, color: CardColor): Phaser.GameObjects.GameObject[] {
  const c = CARD[color];
  const top = -h / 2;
  // roof pieces hang from the top edge (pivot at their top)
  const roof = (key: string | null, tint: number, y: number, rh: number) =>
    key ? sprite(scene, key, 0, top + (y + rh / 2) * U, w - 14 * U, rh * U, tint) : scene.add.rectangle(0, top + (y + rh / 2) * U, w - 14 * U, rh * U, tint);
  const items = [fill(scene, 'ui_cardframe_01_white_bg', w, h, 0xf5eabe), fill(scene, 'ui_cardframe_01_white_innerborder1', w, h, c.inner1, { dw: -14, dh: -14, dy: 3 })];
  if (c.glow !== undefined) items.push(sprite(scene, 'ui_cardframe_01_white_innerborder1highlight', 0, h / 2 - 175.7 * U, w - 14 * U, 126 * U, c.glow));
  items.push(
    fill(scene, 'ui_cardframe_01_white_innerborder2', w, h, c.inner2, { dw: -34, dh: -30, dy: 3 }),
    roof('ui_cardframe_01_white_roofbg', c.roof, 4, 164),
    roof('ui_cardframe_01_white_roofline', c.roofLine, 122, 45),
    roof(null, c.roofLight, 13, 19),
  );
  return items;
}

export type TagColor = 'red' | 'blue' | 'plum' | 'green' | 'yellow';
/** Label_Tapered_02_* colors: [Bg, Border]. */
const TAG: Record<TagColor, [number, number]> = {
  red: [0xde3434, 0xfbc5c5],
  blue: [0x0077d4, 0xaafcff],
  plum: [0xc049dc, 0xf1b3ff],
  green: [0x1f9e45, 0xb6f5a6],
  yellow: [0xe08a00, 0xffe58a],
};

/** Grade tag (Label_Tapered_02, 42 tall) sized around its label, centered on (x, y). */
export function tag(scene: Phaser.Scene, x: number, y: number, msg: string, color: TagColor): Phaser.GameObjects.Container {
  const t = text(scene, 0, 0, msg, 26, { line: 'none' });
  const w = Math.max(140 * U, t.width + 44 * U);
  const [bg, border] = TAG[color];
  return scene.add.container(x, y, [sprite(scene, 'ui_label_tapered_02_white_bg', 0, 0, w, 42 * U, bg), sprite(scene, 'ui_label_tapered_02_white_border', 0, 0, w, 42 * U, border), t]);
}

/** Tab_01 (the lobby's bottom menu slot): slate when idle, lighter and 16 units taller when focused. */
export function tabBody(scene: Phaser.Scene, w: number, h: number, focus: boolean): Phaser.GameObjects.GameObject[] {
  const th = h + (focus ? 16 * U : 0);
  const y = focus ? -8 * U : 0;
  const lh = focus ? 30 : 24;
  return [
    sprite(scene, 'ui_tab_01_white_bg', 0, y + 0.5 * U, w - 2 * U, th - 1 * U, focus ? 0x7c9ea1 : 0x415760),
    sprite(scene, 'ui_tab_01_white_border', 0, y, w, th, 0x202c31),
    sprite(scene, focus ? 'ui_tab_01_white_light2' : 'ui_tab_01_white_light1', 0, y - th / 2 + (6 + lh / 2) * U, w - 12 * U, lh * U, focus ? 0xa7c6c9 : 0x556e76),
  ];
}
