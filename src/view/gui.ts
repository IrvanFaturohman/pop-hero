// UI kit rebuilt from Layer Lab's GUI Pro-MinimalGame prefabs (Button_02/03, Button_Close_01,
// Button_Pause_01, Title_01, Title_LineDeco_01, Popup_Box_01, ItemFrame_02, ResourceBar, Swich_01,
// Grade_Gem_01, Slider_01, Tab_01): same sprites, tints, sizes and insets as the Unity prefabs.
// Card frames for the ability picker live in guiCards.ts; the primitives in guiCore.ts.
import Phaser from 'phaser';
import { config, hex } from '../config';
import { drawCardIcon } from './cardIcons';
import { U, corner, fill, icon, sprite, text } from './guiCore';
import { pressable } from './hud';

export { FONT, FONT_WEIGHT, INK, LINE, U, dim, fill, icon, sprite, tex, text, type LineColor, type TextOpts } from './guiCore';

export type BtnColor = 'blue' | 'green' | 'yellow' | 'red' | 'orange' | 'plum' | 'pink' | 'mint' | 'gray' | 'dark' | 'brown' | 'offwhite';
/** Button_02_* colors: [Bg, Light] (Dark has no light layer). */
const BTN: Record<BtnColor, [number, number | null]> = {
  blue: [0x5bb0f0, 0x8ddefa],
  green: [0x85d048, 0xc6ef96],
  yellow: [0xffcc00, 0xffec59],
  red: [0xfb5951, 0xfe8d6f],
  orange: [0xff8612, 0xffbb4c],
  plum: [0xc76ef7, 0xe8aefc],
  pink: [0xef6ee7, 0xfa9dff],
  mint: [0x03e4b7, 0xacf6e7],
  gray: [0xa39b9d, 0xc2bdbe],
  dark: [0x464239, null],
  brown: [0xb97a54, 0xdba47a],
  offwhite: [0xfff8e9, 0xffffff],
};

/** Button_02 body (Bg, Light, HighLight dot) at w x h. */
export function buttonBody(scene: Phaser.Scene, w: number, h: number, color: BtnColor): Phaser.GameObjects.GameObject[] {
  const [bg, light] = BTN[color];
  const items = [fill(scene, 'ui_button_02_white_bg', w, h, bg)];
  if (light !== null) items.push(fill(scene, 'ui_button_02_white_light', w, h, light, { dw: -8, dh: -12, dy: 2 }), corner(scene, 'ui_button_02_white_highlight', w, h, 10.06, -9.33, 12, 11));
  return items;
}

export interface ButtonOpts {
  x: number;
  y: number;
  /** Game px; default = the prefab's 322 x 130 button. */
  w?: number;
  h?: number;
  color: BtnColor;
  label?: string;
  /** Prefab font size (default 46). */
  size?: number;
  /** Icon texture drawn left of the label (or centered without one). */
  icon?: string;
  onTap: () => void;
}

/** Button_02 (the pack's standard button) with an outlined label. */
export function button(scene: Phaser.Scene, o: ButtonOpts): Phaser.GameObjects.Container {
  const w = o.w ?? 322 * U;
  const h = o.h ?? 130 * U;
  const items = buttonBody(scene, w, h, o.color);
  let tx = 0;
  if (o.icon) {
    const is = h * 0.55;
    const ix = o.label ? -w / 2 + h * 0.55 : 0;
    items.push(icon(scene, ix, -2.6 * U, o.icon, is));
    if (o.label) tx = is * 0.45;
  }
  if (o.label) items.push(text(scene, tx, -2.6 * U, o.label, o.size ?? 46));
  const c = scene.add.container(o.x, o.y, items).setSize(w, h).setInteractive({ useHandCursor: true });
  pressable(c, o.onTap);
  return c;
}

/** Button_03_Red, the lobby's big START button. */
export function playButton(scene: Phaser.Scene, x: number, y: number, label: string, onTap: () => void): Phaser.GameObjects.Container {
  const w = 448 * U;
  const h = 176 * U;
  const c = scene.add.container(x, y, [
    fill(scene, 'ui_button_03_white_bg', w, h, 0xfb5951),
    fill(scene, 'ui_button_03_white_light', w, h, 0xfe8d6f, { dw: -14, dh: -18, dy: 4 }),
    corner(scene, 'ui_button_03_white_highlight', w, h, 14.5, -11.5, 15, 13),
    fill(scene, 'ui_button_03_white_gradient', w, h, 0xfb6e51, { dw: -14, dh: -100, dy: -37 }),
    fill(scene, 'ui_button_03_white_shadow', w, h, 0xde362e, { dw: -14, dh: -18, dy: 4 }),
    text(scene, 0, -9.1 * U, label, 74),
  ]);
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  pressable(c, onTap);
  return c;
}

/** Button_Close_01: red square button with the dark red X. */
export function closeButton(scene: Phaser.Scene, x: number, y: number, onTap: () => void): Phaser.GameObjects.Container {
  const w = 103 * U;
  const h = 106 * U;
  const c = scene.add.container(x, y, [
    fill(scene, 'ui_button_02_white_bg', w, h, 0xec2231),
    fill(scene, 'ui_button_02_white_light', w, h, 0xff3e58, { dw: -9, dh: -12.1, dx: -0.2, dy: 2.2 }),
    corner(scene, 'ui_button_02_white_highlight', w, h, 10.3, -9.4, 12, 11, 0xff7183),
    fill(scene, 'ui_icon_close', w, h, 0x940d16, { dw: -43, dh: -45, dy: 1.6 }),
  ]);
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  pressable(c, onTap);
  return c;
}

/** Button_Pause_01: gray-blue square icon button (the in-game pause button). */
export function roundButton(scene: Phaser.Scene, x: number, y: number, iconKey: string, onTap: () => void, fallback?: string): Phaser.GameObjects.Container {
  const w = 96 * U;
  const h = 95 * U;
  const c = scene.add.container(x, y, [
    fill(scene, 'ui_button_02_white_bg', w, h, 0x9096b5),
    fill(scene, 'ui_button_02_white_light', w, h, 0xb8c1d9, { dw: -9, dh: -12.1, dx: -0.2, dy: 2.2 }),
    corner(scene, 'ui_button_02_white_highlight', w, h, 10.3, -9.4, 12, 11),
    icon(scene, 0, 0, iconKey, 44 * U, fallback),
  ]);
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  pressable(c, onTap);
  return c;
}

export type RibbonColor = 'sky' | 'blue' | 'red' | 'yellow' | 'green' | 'tangerine' | 'plum' | 'lightdark';
const RIBBON_FLAT: Record<RibbonColor, number> = { sky: 0x4fc5fa, blue: 0x3f7bff, red: 0xfb5951, yellow: 0xffcc00, green: 0x85d048, tangerine: 0xffb347, plum: 0xc76ef7, lightdark: 0x6b6575 };

/**
 * Title ribbon (Title_01_NoDeco_*, 115 tall, pre-colored) with its label (prefab size 52). It grows
 * past `w` when the label needs it (the prefab keeps 110 units of tail on each side).
 */
export function ribbon(scene: Phaser.Scene, x: number, y: number, w: number, color: RibbonColor, msg: string, size = 52): Phaser.GameObjects.Container {
  const key = `ui_title_01_nodeco_${color}`;
  const t = text(scene, 0, -10.3 * U, msg, size);
  const rw = Math.max(w, 280 * U, t.width + 220 * U);
  return scene.add.container(x, y, [sprite(scene, key, 0, 0, rw, 115 * U, scene.textures.exists(key) ? undefined : RIBBON_FLAT[color]), t]);
}

/** Section title over the pack's line deco (Title_LineDeco_01_s / _l), centered on its text. */
export function dividerTitle(scene: Phaser.Scene, x: number, y: number, msg: string, size = 36, long = false): Phaser.GameObjects.Container {
  const key = long ? 'ui_title_linedeco_01_l_white' : 'ui_title_linedeco_01_s_white';
  const [lw, lh] = long ? [448, 39] : [280, 31];
  return scene.add.container(x, y, [sprite(scene, key, 0, 47.5 * U, lw * U, lh * U, scene.textures.exists(key) ? undefined : 0xffffff), text(scene, 0, 0, msg, size)]);
}

/** Popup_Box_01_InnerBorder with the brown Title_Tapered_01 on its top edge. Body center at y = 0. */
export function popup(scene: Phaser.Scene, cx: number, cy: number, w: number, h: number, title: string): Phaser.GameObjects.Container {
  const t = text(scene, 0, -h / 2 + 3.97 * U - 1.9 * U, title, 50);
  const tw = Math.max(554 * U, t.width + 124 * U + 40);
  return scene.add.container(cx, cy, [
    fill(scene, 'ui_popup_box_01-03_white_bg', w, h, 0xf5e9d0, { dw: -4, dh: -4 }),
    fill(scene, 'ui_popup_box_01-03_white_border', w, h, 0x311c19),
    fill(scene, 'ui_popup_box_01_white_innerborder', w, h, 0xfff8e9, { dw: -14, dh: -17, dy: 1.5 }),
    sprite(scene, 'ui_title_tapered_01', 0, -h / 2 + 3.97 * U, tw, 98 * U, scene.textures.exists('ui_title_tapered_01') ? undefined : 0xc08e53),
    t,
  ]);
}

export type FrameColor = 'dark' | 'red' | 'blue' | 'plum' | 'green' | 'yellow' | 'brown';
/** ItemFrame_02_* colors: [Bg, Deco, Border]. */
const ITEM_FRAME: Record<Exclude<FrameColor, 'dark'>, [number, number, number]> = {
  red: [0xffbab8, 0xf79694, 0xf77378],
  blue: [0xaafcff, 0x3de6ff, 0x00aff0],
  plum: [0xf4bdff, 0xe7a1ff, 0xd17fff],
  green: [0x99ff79, 0x3ef26d, 0x31d75b],
  yellow: [0xf8ec73, 0xffcf3b, 0xffbf3c],
  brown: [0xfbbd74, 0xe7a252, 0xad7147],
};

/** A colored ItemFrame_02 (154 canvas units in the prefabs), or the dark reward tile (151). */
export function frame(scene: Phaser.Scene, size: number, color: FrameColor): Phaser.GameObjects.GameObject[] {
  if (color === 'dark') {
    return [
      sprite(scene, 'ui_basicframe_squaresharpedge_01_l_white_bg', 0, 0, size - 2 * U, size - 2 * U, 0x13151d, 0.8),
      sprite(scene, 'ui_basicframe_squaresharpedge_01_l_white_border', 0, 0, size, size, 0x15161c),
    ];
  }
  const [bg, deco, border] = ITEM_FRAME[color];
  // tiles smaller than the 9-slice corners shrink as a whole (see sprite())
  return [fill(scene, 'ui_itemframe_02_white_bg', size, size, bg), fill(scene, 'ui_itemframe_02_white_deco', size, size, deco), fill(scene, 'ui_itemframe_02_white_border', size, size, border)];
}

/** Reward / item tile: frame, icon and an outlined count along the bottom edge. */
export function itemFrame(scene: Phaser.Scene, x: number, y: number, size: number, color: FrameColor, iconKey: string, count?: string, iconFallback?: string): Phaser.GameObjects.Container {
  const k = size / (151 * U);
  const items = [...frame(scene, size, color), icon(scene, 0, -5.1 * U * k, iconKey, 128 * 1.1 * U * k, iconFallback)];
  if (count !== undefined) items.push(text(scene, 0, size / 2 - 28.6 * U * k, count, 36 * k));
  return scene.add.container(x, y, items);
}

/** Ability / power art in a colored ItemFrame_02 (the perk cards' icon frame). */
export function skillFrame(scene: Phaser.Scene, x: number, y: number, size: number, color: FrameColor, iconName: string): Phaser.GameObjects.Container {
  return scene.add.container(x, y, [...frame(scene, size, color), abilityIcon(scene, 0, 0, iconName, size * (128 / 154))]);
}

/** ResourceBar: translucent dark pill, icon on the left, outlined value. */
export class ResourcePill {
  readonly c: Phaser.GameObjects.Container;
  readonly iconImg: Phaser.GameObjects.Image;
  private value: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, iconKey: string, iconFallback?: string) {
    const h = 65 * U;
    this.iconImg = icon(scene, -w / 2 + 32.4 * U, 0, iconKey, 60 * U, iconFallback);
    this.value = text(scene, 27 * U, -1 * U, '0', 39);
    this.c = scene.add.container(x, y, [sprite(scene, 'ui_resourcebar_bg', 0, 0, w, h, 0x1e1e1f, 0.75), this.iconImg, this.value]);
  }

  set(v: string): void {
    if (this.value.text !== v) this.value.setText(v);
  }
}

/** Swich_01 (210 x 85): orange with the handle right when on, tan with it left when off. */
export function switchToggle(scene: Phaser.Scene, x: number, y: number, on: boolean, labels: [string, string]): Phaser.GameObjects.Container {
  const w = 210 * U;
  const h = 85 * U;
  const hx = (on ? 71.5 : -64.5) * U;
  return scene.add.container(x, y, [
    sprite(scene, on ? 'ui_swich_01_bg_on' : 'ui_swich_01_bg_off', 0, 0, w, h, scene.textures.exists('ui_swich_01_bg_on') ? undefined : on ? 0xffb347 : 0xc49a6c),
    text(scene, (on ? -26.9 : 35.5) * U, 0, on ? labels[0] : labels[1], 36, { line: 'none', color: on ? '#ffffff' : '#f5e9d0' }),
    sprite(scene, 'ui_swich_01_handle', hx, 0, 81 * U, h, scene.textures.exists('ui_swich_01_handle') ? undefined : 0xfff8e9),
  ]);
}

/** Card / stat icon names -> the pack's icon art. */
const SKILL_ART: Record<string, string> = {
  twin: 'ui_gear_bow_01',
  bullet: 'ui_stat_attack_01',
  arrow: 'ui_item_horseshoe_01_silver',
  heart: 'ui_economy_heart_02_red',
  gauge: 'ui_misc_baloon_01',
  crit: 'ui_ui_etc_target_01',
  bolt: 'ui_misc_fist_01_gold',
  shield: 'ui_gear_shield_03_gold',
  wind: 'ui_item_feather_02_blue',
  sword: 'ui_gear_weapons_sword_01',
  life: 'ui_economy_heart_red',
  armor: 'ui_gear_shield_01',
};

export function abilityIconKey(name: string): string | undefined {
  return SKILL_ART[name];
}

/** An ability / stat icon of `size` px: the pack's art, or the procedural drawing. */
export function abilityIcon(scene: Phaser.Scene, x: number, y: number, name: string, size: number): Phaser.GameObjects.GameObject {
  const key = SKILL_ART[name];
  if (key && scene.textures.exists(key)) return icon(scene, x, y, key, size);
  const g = scene.add.graphics().setPosition(x, y).setScale(size / 90);
  drawCardIcon(g, name);
  return g;
}

/** Grade_Gem_01 row (44 x 47 each, empty ones tinted dark), centered on (x, y). */
export function gems(scene: Phaser.Scene, x: number, y: number, on: number, total: number, scale = 1): Phaser.GameObjects.Container {
  const w = 44 * U * scale;
  const h = 47 * U * scale;
  const items: Phaser.GameObjects.GameObject[] = [];
  for (let i = 0; i < total; i++) {
    const gx = (i - (total - 1) / 2) * (50 * U * scale);
    if (scene.textures.exists('ui_grade_gem_01')) items.push(i < on ? scene.add.image(gx, 0, 'ui_grade_gem_01').setDisplaySize(w, h) : scene.add.image(gx, 0, 'ui_grade_gem_01_empty').setDisplaySize(w, h).setTint(0x403130));
    else items.push(scene.add.circle(gx, 0, w / 2, i < on ? hex(config.palette.gold) : 0x403130));
  }
  return scene.add.container(x, y, items);
}

/** Slider_01: dark slate bar with a flat fill (lighter strip on top, highlight dot). */
export class LevelBar {
  readonly c: Phaser.GameObjects.Container;
  private fill: Phaser.GameObjects.Container | null = null;
  private fw: number;
  private fh: number;

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    private colors: [fill: number, light: number] = [0x35a6e1, 0x50cbee],
  ) {
    this.c = scene.add.container(x, y, [sprite(scene, 'ui_slider_01_white_bg', 0, 0, w, h, 0x585f74)]);
    this.fw = w - 8 * U;
    this.fh = h - 8 * U;
  }

  set(frac: number): void {
    frac = Math.max(0, Math.min(1, frac));
    this.fill?.destroy();
    this.fill = null;
    if (frac <= 0) return;
    const s = this.scene;
    const w = Math.max(this.fh * 0.5, this.fw * frac);
    const top = -this.fh / 2;
    this.fill = s.add.container(-this.fw / 2 + w / 2, 0, [
      s.add.rectangle(0, 0, w, this.fh, this.colors[0]),
      s.add.rectangle(0, top + 5 * U + 4.45 * U, w, 8.9 * U, this.colors[1]),
      sprite(s, 'ui_slider_01_white_fill_highlight', -w / 2 + 8 * U + 8 * U, top + 5 * U + 5 * U, 16 * U, 10 * U),
    ]);
    this.c.add(this.fill);
  }
}

/** Power-up kind -> the pack icon that stands for it (emblem texture as the fallback). */
const POWER_ICON: Record<string, string> = {
  fire: 'ui_misc_fire_01_red',
  ice: 'ui_misc_snowflake_01',
  bomb: 'ui_consumable_explosives_bomb_01_black',
  heal: 'ui_economy_heart_red',
  star: 'ui_economy_star_01_yellow',
  redstar: 'ui_economy_star_01_red',
};
/** Power-up kind -> its tile color. */
const POWER_FRAME: Record<string, FrameColor> = { fire: 'red', ice: 'blue', bomb: 'plum', heal: 'green', star: 'yellow', redstar: 'red' };

export function powerIconKey(scene: Phaser.Scene, kind: string): string {
  const k = POWER_ICON[kind];
  return k && scene.textures.exists(k) ? k : `emb_${kind}`;
}

/** A power-up as a small framed tile (ItemFrame_02 + icon), centered on (x, y). */
export function powerTile(scene: Phaser.Scene, x: number, y: number, size: number, kind: string): Phaser.GameObjects.Container {
  return scene.add.container(x, y, [...frame(scene, size, POWER_FRAME[kind] ?? 'brown'), icon(scene, 0, 0, powerIconKey(scene, kind), size * 0.74)]);
}
