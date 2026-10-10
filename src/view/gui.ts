// UI kit rebuilt from Layer Lab's GUI Pro-SuperCasual demo panels (Settings, Lobby, Play_UI_*,
// PopupDim_Play_Result_*): same sprites, tints, sizes and text styles as the Unity prefabs. Sizes in
// the prefabs are canvas units of a 1048-wide reference; `U` maps them onto our 720-wide canvas.
// Without the art every block falls back to a flat shape so a clone without the Unity project
// still runs.
import Phaser from 'phaser';
import { config, hex } from '../config';
import { drawCardIcon } from './cardIcons';
import { pressable } from './hud';
import { guiSprite, hasLayerLabFonts } from './layerlab';

/** Prefab canvas unit -> game px (reference resolution 1048 wide, match width). */
export const U = 720 / 1048;

export const FONT = 'Fredoka, system-ui, sans-serif';
/** Layer Lab text fonts (TMP "Sen" / "Cairo" assets), falling back to Fredoka. */
export function fontFamily(kind: 'sen' | 'cairo'): string {
  if (!hasLayerLabFonts()) return FONT;
  return kind === 'sen' ? 'LL Sen, Fredoka, sans-serif' : 'LL Cairo, Fredoka, sans-serif';
}

/** fontStyle for Phaser texts: the Layer Lab fonts are already heavy (no synthetic bold). */
export function fontWeight(): string {
  return hasLayerLabFonts() ? '' : '700';
}

/** Outline colors of the TMP materials (Sen_Line_s_* / Cairo_Line_*). */
export const LINE = {
  black: '#000000',
  blue: '#264991',
  green: '#024e42',
  red: '#820b39',
  navy: '#3e11af',
  orange: '#cb4104',
  purple: '#7a13a5',
  brown: '#af570f',
} as const;
export type LineColor = keyof typeof LINE | 'none';

export interface TextOpts {
  font?: 'sen' | 'cairo';
  line?: LineColor;
  color?: string;
  /** Word wrap width (game px). */
  wrap?: number;
  align?: 'left' | 'center' | 'right';
  originX?: number;
}

/**
 * Text like the pack's TMP materials: `size` is the prefab font size (canvas units); a thin outline
 * plus a solid drop of the same color under it.
 */
export function text(scene: Phaser.Scene, x: number, y: number, msg: string, size: number, o: TextOpts = {}): Phaser.GameObjects.Text {
  const px = Math.round(size * U);
  const line = o.line ?? 'black';
  const t = scene.add
    .text(x, y, msg, {
      fontFamily: fontFamily(o.font ?? 'sen'),
      fontSize: `${px}px`,
      fontStyle: hasLayerLabFonts() ? '' : '700',
      color: o.color ?? '#ffffff',
      align: o.align ?? 'center',
      resolution: (scene.registry.get('renderScale') as number) ?? 1,
    })
    .setOrigin(o.originX ?? 0.5, 0.5);
  if (line !== 'none') {
    const c = LINE[line];
    t.setStroke(c, Math.max(2, px * 0.13));
    t.setShadow(0, Math.max(1.5, px * 0.07), c, 0, true, true);
  }
  if (o.wrap) t.setWordWrapWidth(o.wrap, true);
  return t;
}

export function hasTex(scene: Phaser.Scene, key: string): boolean {
  return scene.textures.exists(key) && guiSprite(key) !== null;
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
    r.fillRoundedRect(x - w / 2, y - h / 2, w, h, Math.min(w, h) / 4);
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

/** Icon image of `size` px (longest side), or the fallback texture. */
export function icon(scene: Phaser.Scene, x: number, y: number, key: string, size: number, fallback?: string): Phaser.GameObjects.Image {
  const k = scene.textures.exists(key) ? key : fallback && scene.textures.exists(fallback) ? fallback : '__WHITE';
  const img = scene.add.image(x, y, k);
  return img.setScale(size / Math.max(img.width, img.height));
}

/** Full-screen dim (panal_dim_Black) that swallows taps. */
export function dim(scene: Phaser.Scene, alpha = 1): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
  const L = config.layout;
  const d = scene.textures.exists('ui_panal_dim_black')
    ? scene.add.image(L.width / 2, L.height / 2, 'ui_panal_dim_black').setDisplaySize(L.width + 400, L.height + 600).setAlpha(alpha)
    : scene.add.rectangle(L.width / 2, L.height / 2, L.width + 400, L.height + 600, 0x0a0618, 0.78 * alpha);
  d.setInteractive();
  return d;
}

export type BtnColor = 'blue' | 'sky' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'mint' | 'gray' | 'darkgray';

/** Text outline per button color (the prefabs pair Button01_s_Blue/Sky with Sen_Line_s_Blue, ...). */
const BTN_LINE: Record<BtnColor, LineColor> = {
  blue: 'blue',
  sky: 'blue',
  green: 'green',
  yellow: 'brown',
  red: 'red',
  purple: 'purple',
  pink: 'purple',
  mint: 'green',
  gray: 'black',
  darkgray: 'black',
};
const BTN_FLAT: Record<BtnColor, number> = {
  blue: 0x2f6bff,
  sky: 0x1fb8ff,
  green: 0x2fd65a,
  yellow: 0xffc21f,
  red: 0xff3b5c,
  purple: 0xa04dff,
  pink: 0xff6ad5,
  mint: 0x23d3b0,
  gray: 0x8c8c99,
  darkgray: 0x55546a,
};

export interface ButtonOpts {
  x: number;
  y: number;
  /** Game px; default = the prefab's 330 x 124 small button. */
  w?: number;
  h?: number;
  color: BtnColor;
  label?: string;
  /** Prefab font size (default 42). */
  size?: number;
  /** Icon texture drawn left of the label (or centered without one). */
  icon?: string;
  onTap: () => void;
}

/** Button01_s (the pack's standard pill button) with a Sen label outlined in the button's color. */
export function button(scene: Phaser.Scene, o: ButtonOpts): Phaser.GameObjects.Container {
  const w = o.w ?? 330 * U;
  const h = o.h ?? 124 * U;
  const key = `ui_button01_s_${o.color}`;
  const items: Phaser.GameObjects.GameObject[] = [sprite(scene, key, 0, 0, w, h, scene.textures.exists(key) ? undefined : BTN_FLAT[o.color])];
  let tx = 0;
  if (o.icon) {
    const is = h * 0.5;
    const ix = o.label ? -w / 2 + h * 0.6 : 0;
    items.push(icon(scene, ix, -h * 0.04, o.icon, is));
    if (o.label) tx = is * 0.45;
  }
  if (o.label) items.push(text(scene, tx, -h * 0.03, o.label, o.size ?? 42, { line: BTN_LINE[o.color] }));
  const c = scene.add.container(o.x, o.y, items).setSize(w, h).setInteractive({ useHandCursor: true });
  pressable(c, o.onTap);
  return c;
}

/** The lobby's big tapered yellow PLAY button (black Sen text, no outline). */
export function playButton(scene: Phaser.Scene, x: number, y: number, label: string, onTap: () => void): Phaser.GameObjects.Container {
  const w = 455 * U;
  const h = 194 * U;
  const key = 'ui_button_tapered_yellow';
  const c = scene.add.container(x, y, [sprite(scene, key, 0, 0, w, h, scene.textures.exists(key) ? undefined : 0xffc21f), text(scene, 0, 4 * U, label, 88, { line: 'none', color: '#000000' })]);
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  pressable(c, onTap);
  return c;
}

/** Round close button (Button_Circle118 + Icon_Close02). */
export function closeButton(scene: Phaser.Scene, x: number, y: number, onTap: () => void): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y, [sprite(scene, 'ui_button_circle118', 0, 0, 117 * U, 118 * U), icon(scene, 0, 0, 'ui_icon_close02', 62 * U)]);
  c.setSize(117 * U, 118 * U).setInteractive({ useHandCursor: true });
  pressable(c, onTap);
  return c;
}

/** Dark rounded icon button (Button_Round03_Dark), e.g. the in-game menu / pause button. */
export function roundButton(scene: Phaser.Scene, x: number, y: number, iconKey: string, onTap: () => void, fallback?: string): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y, [sprite(scene, 'ui_button_round03_dark', 0, 0, 130 * U, 122 * U, scene.textures.exists('ui_button_round03_dark') ? undefined : 0x2c2a44), icon(scene, 0, -2, iconKey, 66 * U, fallback)]);
  c.setSize(130 * U, 122 * U).setInteractive({ useHandCursor: true });
  pressable(c, onTap);
  return c;
}

export type RibbonColor = 'sky' | 'blue' | 'red' | 'yellow' | 'green' | 'orange' | 'purple';
const RIBBON_LINE: Record<RibbonColor, LineColor> = { sky: 'blue', blue: 'blue', red: 'red', yellow: 'brown', green: 'green', orange: 'orange', purple: 'purple' };
const RIBBON_FLAT: Record<RibbonColor, number> = { sky: 0x1fb8ff, blue: 0x3f5bff, red: 0xff3b5c, yellow: 0xffc21f, green: 0x2fd65a, orange: 0xff8a1f, purple: 0xa04dff };

/** Title ribbon (Title_Ribbon01_*, 143 tall) with its label (prefab size 67). */
export function ribbon(scene: Phaser.Scene, x: number, y: number, w: number, color: RibbonColor, msg: string, size = 67): Phaser.GameObjects.Container {
  const key = `ui_title_ribbon01_${color}`;
  return scene.add.container(x, y, [sprite(scene, key, 0, 0, w, 143 * U, scene.textures.exists(key) ? undefined : RIBBON_FLAT[color]), text(scene, 0, -11 * U, msg, size, { line: RIBBON_LINE[color] })]);
}

/** Section title between two divider lines ("REWARDS" style 1, "SELECT A SKILL" style 2). */
export function dividerTitle(scene: Phaser.Scene, x: number, y: number, msg: string, style: 1 | 2 = 1, size = 40): Phaser.GameObjects.Container {
  const t = text(scene, 0, 0, msg, size, { line: 'none' });
  const gap = t.width / 2 + 24 * U;
  const lw = (style === 1 ? 174 : 163) * U;
  const lh = (style === 1 ? 42 : 18) * U;
  return scene.add.container(x, y, [
    sprite(scene, `ui_title_line0${style}_divider_left`, -gap - lw / 2, 0, lw, lh, scene.textures.exists(`ui_title_line0${style}_divider_left`) ? undefined : 0xffffff),
    sprite(scene, `ui_title_line0${style}_divider_right`, gap + lw / 2, 0, lw, lh, scene.textures.exists(`ui_title_line0${style}_divider_right`) ? undefined : 0xffffff),
    t,
  ]);
}

/** Popup with a top bar (Popup08_Topbar_Divided, Settings colors). Body center is at y = 0. */
export function popup(scene: Phaser.Scene, cx: number, cy: number, w: number, h: number, title: string, iconKey?: string): Phaser.GameObjects.Container {
  const top = 110 * U;
  const side = 12 * U;
  const c = scene.add.container(cx, cy, [
    sprite(scene, 'ui_popup02-09_topber_white_bg', 0, 0, w, h, 0x0a61d3),
    scene.add.rectangle(0, top / 2 + 2 * U, w - side * 2, h - top - 46 * U, 0x033fa4),
    sprite(scene, 'ui_popup02-09_topber_white_bgtop', 0, -h / 2 + top / 2 + side / 2, w - side, top, 0x0e7ff2),
    sprite(scene, 'ui_popup02-09_topber_white_bgtoplight', 0, -h / 2 + 30 * U, w - side * 2, 48 * U, 0xffffff, 0.27),
    scene.add.rectangle(0, -h / 2 + top + side / 2 + 3 * U, w - side * 2, 6 * U, 0x022f7b),
  ]);
  const t = text(scene, 0, -h / 2 + top / 2 + side / 2, title, 50);
  if (iconKey) {
    const ic = icon(scene, 0, t.y, iconKey, 84 * U);
    const total = ic.displayWidth + 12 + t.width;
    ic.setX(-total / 2 + ic.displayWidth / 2);
    t.setX(-total / 2 + ic.displayWidth + 12 + t.width / 2);
    c.add(ic);
  }
  c.add(t);
  return c;
}

export type FrameColor = 'white' | 'navy' | 'gray' | 'green' | 'blue' | 'purple' | 'yellow' | 'red';
/** ItemFrame02 colors: [bg, light, border]. */
const ITEM_FRAME: Record<FrameColor, [number, number, number]> = {
  white: [0xf1f7fe, 0xffffff, 0x1a1b2c],
  navy: [0x4e4e87, 0x7878c4, 0x181834],
  gray: [0x617e8a, 0x82a0ab, 0x181834],
  green: [0x53d804, 0xb2f11f, 0x024e42],
  blue: [0x00c0ff, 0x35fbff, 0x1d3fb1],
  purple: [0xc855ff, 0xff8aff, 0x4400a0],
  yellow: [0xffd850, 0xfefd4e, 0x8c1703],
  red: [0xff364d, 0xff8f9c, 0x640725],
};

/** Reward / item tile (ItemFrame02): framed square with an icon and a Cairo count. */
export function itemFrame(scene: Phaser.Scene, x: number, y: number, size: number, color: FrameColor, iconKey: string, count?: string, iconFallback?: string): Phaser.GameObjects.Container {
  const [bg, light, border] = ITEM_FRAME[color];
  const k = size / (190 * U);
  const items: Phaser.GameObjects.GameObject[] = [
    sprite(scene, 'ui_itemframe00-03_bg', 0, 0, size - 3 * U * k, size - 3 * U * k, bg),
    sprite(scene, 'ui_itemframe00-03_bglight', 0, 0, size - 10 * U * k, size - 10 * U * k, light),
    sprite(scene, 'ui_itemframe00-03_border', 0, 0, size, size, border),
    icon(scene, 0, -4 * U * k, iconKey, 150 * U * k, iconFallback),
  ];
  if (count !== undefined) items.push(text(scene, size / 2 - 12 * k, size / 2 - 24 * U * k, count, 38 * k, { font: 'cairo', originX: 1 }));
  return scene.add.container(x, y, items);
}

export type SkillColor = 'blue' | 'purple' | 'red' | 'mint';
/** SkillFrame colors: [bg, border]. */
const SKILL_FRAME: Record<SkillColor, [number, number]> = {
  blue: [0x461cc3, 0x1dfcff],
  purple: [0x5d21c2, 0xf956ff],
  red: [0xab0f25, 0xff4a5e],
  mint: [0x009387, 0x59ffc2],
};

/** Square skill frame (SkillFrame_l~m) around an icon. */
export function skillFrame(scene: Phaser.Scene, x: number, y: number, size: number, color: SkillColor, iconName: string): Phaser.GameObjects.Container {
  const [bg, border] = SKILL_FRAME[color];
  return scene.add.container(x, y, [sprite(scene, 'ui_skillframe_l-m_bg', 0, 0, size - 4 * U, size - 4 * U, bg), abilityIcon(scene, 0, 0, iconName, size * 0.875), sprite(scene, 'ui_skillframe_l-m_border', 0, 0, size, size, border)]);
}

/** Dark banner card (BannerFrame04_Divided, the "SELECT A SKILL" rows). */
export function bannerCard(scene: Phaser.Scene, w: number, h: number): Phaser.GameObjects.GameObject[] {
  return [
    sprite(scene, 'ui_bannerframe00_04-06_bg', 0, 0, w - 4 * U, h - 4 * U, 0x2c2d44),
    scene.add.rectangle(-w / 2 + (w * 0.169) / 2 + 3 * U, 0, w * 0.169, h - 12 * U, 0x181826),
    sprite(scene, 'ui_bannerframe00_04-06_bglight', 0, -h / 2 + 26 * U, w - 14 * U, 42 * U, 0xffffff, 0.08),
    sprite(scene, 'ui_bannerframe00_04-06_border', 0, 0, w, h, 0x000000),
  ];
}

/** Dark resource pill (ResourceBar_Single): icon on the left edge, Cairo value. */
export class ResourcePill {
  readonly c: Phaser.GameObjects.Container;
  readonly iconImg: Phaser.GameObjects.Image;
  private value: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, iconKey: string, iconFallback?: string) {
    const h = 56 * U;
    this.iconImg = icon(scene, -w / 2 + 6 * U, 0, iconKey, 76 * U, iconFallback);
    this.value = text(scene, 10 * U, -1, '0', 36, { font: 'cairo' });
    this.c = scene.add.container(x, y, [sprite(scene, 'ui_resourcebar_single_bg', 0, 0, w, h, 0x1e1d26), this.iconImg, this.value]);
  }

  set(v: string): void {
    if (this.value.text !== v) this.value.setText(v);
  }
}

/** On/off switch (Switch_Single): yellow fill and handle on the right when on. */
export function switchToggle(scene: Phaser.Scene, x: number, y: number, on: boolean, labels: [string, string]): Phaser.GameObjects.Container {
  const w = 260 * U;
  const h = 88 * U;
  const hx = (on ? 56 : -56) * U;
  const items: Phaser.GameObjects.GameObject[] = [sprite(scene, 'ui_switch_single_bg', 0, 0, w, 86 * U, on ? 0x292a3a : 0xffffff)];
  if (on) items.push(sprite(scene, 'ui_switch_single_fill', 0, 0, w - 20 * U, 86 * U - 21 * U, scene.textures.exists('ui_switch_single_fill') ? undefined : 0xffd23f));
  items.push(sprite(scene, 'ui_switch_single_handle', hx, 0, 148 * U, h, scene.textures.exists('ui_switch_single_handle') ? undefined : 0xffffff));
  items.push(text(scene, hx, 1, on ? labels[0] : labels[1], 42, { line: 'none', color: '#04192d' }));
  return scene.add.container(x, y, items);
}

/** Card / stat icon names -> the pack's demo skill art. */
const SKILL_ART: Record<string, string> = {
  twin: 'ui_skillicon01_4',
  bullet: 'ui_skillicon02_3',
  arrow: 'ui_skillicon01_3',
  heart: 'ui_skillicon02_1',
  gauge: 'ui_skillicon01_6',
  crit: 'ui_skillicon01_2',
  bolt: 'ui_skillicon01_5',
  shield: 'ui_icon_shield',
  wind: 'ui_skillicon02_2',
  sword: 'ui_icon_sword01',
  life: 'ui_icon_heart',
};

/** An ability / stat icon of `size` px: the pack's skill art, or the procedural drawing. */
export function abilityIcon(scene: Phaser.Scene, x: number, y: number, name: string, size: number): Phaser.GameObjects.GameObject {
  const key = SKILL_ART[name];
  if (key && scene.textures.exists(key)) return icon(scene, x, y, key, size);
  const g = scene.add.graphics().setPosition(x, y).setScale(size / 90);
  drawCardIcon(g, name);
  return g;
}

/** Level gems row (GradeIcon_Gem_On / Off), centered on (x, y). */
export function gems(scene: Phaser.Scene, x: number, y: number, on: number, total: number, scale = 1): Phaser.GameObjects.Container {
  const w = 29 * U * scale;
  const h = 38 * U * scale;
  const items: Phaser.GameObjects.GameObject[] = [];
  for (let i = 0; i < total; i++) {
    const gx = (i - (total - 1) / 2) * (w + 2);
    if (scene.textures.exists('ui_gradeicon_gem_on')) items.push(scene.add.image(gx, 0, i < on ? 'ui_gradeicon_gem_on' : 'ui_gradeicon_gem_off').setDisplaySize(w, h));
    else items.push(scene.add.circle(gx, 0, w / 2, i < on ? hex(config.palette.gold) : 0x9aa3c7));
  }
  return scene.add.container(x, y, items);
}

/** Level bar (Slider_Level02): dark background + blue fill. */
export class LevelBar {
  readonly c: Phaser.GameObjects.Container;
  private fill: Phaser.GameObjects.GameObject | null = null;
  private fw: number;

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    private h: number,
  ) {
    this.c = scene.add.container(x, y, [sprite(scene, 'ui_slider_level02_bg_single', 0, 0, w, h, scene.textures.exists('ui_slider_level02_bg_single') ? undefined : 0x1e1e2a)]);
    this.fw = w - 11 * U;
  }

  set(frac: number): void {
    frac = Math.max(0, Math.min(1, frac));
    this.fill?.destroy();
    this.fill = null;
    if (frac <= 0) return;
    const fh = this.h - 10 * U;
    const w = Math.max(fh, this.fw * frac);
    const key = 'ui_slider_level02_fill01_blue';
    this.fill = sprite(this.scene, key, -this.fw / 2 + w / 2, 0, w, fh, this.scene.textures.exists(key) ? undefined : 0x31b9ff);
    this.c.add(this.fill);
  }
}

/** Power-up kind -> the pack icon that stands for it (emblem texture as the fallback). */
const POWER_ICON: Record<string, string> = {
  fire: 'ui_icon_fire02',
  ice: 'ui_pictoicon_freezee',
  bomb: 'ui_pictoicon_bomb_1',
  heal: 'ui_icon_heart',
  star: 'ui_itemicon_star_gold',
  redstar: 'ui_itemicon_star_red',
};
/** Power-up kind -> small skill frame tint [bg, border]. */
const POWER_FRAME: Record<string, [number, number]> = {
  fire: [0xab0f25, 0xff4a5e],
  ice: [0x1d6fd8, 0x1dfcff],
  bomb: [0x5d21c2, 0xf956ff],
  heal: [0x009387, 0x59ffc2],
  star: [0xc77700, 0xffe14a],
  redstar: [0x8d1401, 0xff4646],
};

export function powerIconKey(scene: Phaser.Scene, kind: string): string {
  const k = POWER_ICON[kind];
  return k && scene.textures.exists(k) ? k : `emb_${kind}`;
}

/** A power-up as a small framed tile (SkillFrame_s + icon), centered on (x, y). */
export function powerTile(scene: Phaser.Scene, x: number, y: number, size: number, kind: string): Phaser.GameObjects.Container {
  const [bg, border] = POWER_FRAME[kind] ?? [0x2c2d44, 0xffffff];
  return scene.add.container(x, y, [
    sprite(scene, 'ui_skillframe_s_bg', 0, 0, size - 3, size - 3, bg),
    icon(scene, 0, 0, powerIconKey(scene, kind), size * 0.72),
    sprite(scene, 'ui_skillframe_s_border', 0, 0, size, size, border),
  ]);
}
