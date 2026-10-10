// Copies the Layer Lab art used by the game out of the Unity project into public/assets/layerlab/
// (gitignored: the raw files of a paid asset must not land in the public repo) and writes
// manifest.json: the part layout of every character (read from the Unity prefabs) and the GUI sprites
// with their 9-slice borders (read from the Unity .meta files).
// Usage: node scripts/layerlab-sync.mjs [layerLabDir]   (default: ../Pop-Hero/Assets/StorePackages/Layer Lab)
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(process.argv[2] ?? process.env.LAYERLAB_DIR ?? join(ROOT, '../Pop-Hero/Assets/StorePackages/Layer Lab'));
const OUT = join(ROOT, 'public/assets/layerlab');
const MIN = '2D Characters-MinimalCharacters';
const MON = '2D Characters-CasualMonsters';
/** Unity pixels per unit of every Layer Lab PSB. */
const PPU = 100;

/** Game character -> Unity prefab (part layout) + folder with the part PNGs. */
const RIGS = {
  hero: { prefab: `${MIN}/Prefabs/Man_08.prefab`, png: `${MIN}/Character/character_8` },
  // the yellow goblin export lacks its front foot and back hand: reuse the other foot, skip the hand
  grunt: { prefab: `${MON}/Prefabs/goblin.prefab`, png: `${MON}/PNG/Goblin/goblin/goblin`, fallback: { leg: 'leg2' } },
  runner: { prefab: `${MON}/Prefabs/green_goblin.prefab`, png: `${MON}/PNG/Goblin/goblin_green/goblin` },
  tank: { prefab: `${MON}/Prefabs/green_stone_slime.prefab`, png: `${MON}/PNG/Slime/slime_green/slime_stone` },
  flier: { prefab: `${MON}/Prefabs/skull_archer.prefab`, png: `${MON}/PNG/Skull/skull/skull_archer` },
  brute: { prefab: `${MON}/Prefabs/goblin_warrior.prefab`, png: `${MON}/PNG/Goblin/goblin/goblin_warrior` },
  ratking: { prefab: `${MON}/Prefabs/green_slime_king.prefab`, png: `${MON}/PNG/Slime/slime_green/slime_king` },
  // there is no orange prefab: the green king's layout with the orange parts
  mole: { prefab: `${MON}/Prefabs/green_slime_king.prefab`, png: `${MON}/PNG/Slime/slime_orange/slime_king` },
};

/** Prefab object name -> PNG name, where the export renamed a part. */
const ALIASES = { leg: ['leg', 'leg1'], leg1: ['leg1', 'leg'] };

function pngSize(file) {
  const b = readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/** Flat Layer Lab prefab: every part is a child of the root with a SpriteRenderer. */
function parsePrefab(file) {
  const docs = readFileSync(file, 'utf8').split(/^--- /m);
  const objects = new Map();
  const transforms = new Map();
  const renderers = new Map();
  for (const d of docs) {
    const head = d.match(/^!u!(\d+) &(-?\d+)/);
    if (!head) continue;
    const [, type, id] = head;
    if (type === '1') objects.set(id, d.match(/m_Name: (.*)/)[1].trim());
    else if (type === '4') {
      const p = d.match(/m_LocalPosition: \{x: (\S+), y: (\S+), z: \S+\}/);
      const r = d.match(/m_LocalRotation: \{x: \S+, y: \S+, z: (\S+), w: (\S+)\}/);
      const s = d.match(/m_LocalScale: \{x: (\S+), y: (\S+), z: \S+\}/);
      const go = d.match(/m_GameObject: \{fileID: (-?\d+)\}/)[1];
      const father = d.match(/m_Father: \{fileID: (-?\d+)\}/)[1];
      transforms.set(go, { x: +p[1], y: +p[2], rz: +r[1], rw: +r[2], sx: +s[1], sy: +s[2], father });
    } else if (type === '212') {
      const go = d.match(/m_GameObject: \{fileID: (-?\d+)\}/)[1];
      const order = +(d.match(/m_SortingOrder: (-?\d+)/)?.[1] ?? 0);
      const flipX = d.match(/m_FlipX: (\d)/)?.[1] === '1';
      const enabled = d.match(/m_Enabled: (\d)/)?.[1] !== '0';
      renderers.set(go, { order, flipX, enabled });
    }
  }
  const parts = [];
  for (const [go, rend] of renderers) {
    const t = transforms.get(go);
    if (!t || !rend.enabled) continue;
    parts.push({ name: objects.get(go), order: rend.order, flipX: rend.flipX, ...t });
  }
  return parts;
}

function findPng(dir, name) {
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png'));
  for (const n of ALIASES[name.toLowerCase()] ?? [name.toLowerCase()]) {
    const f = files.find((x) => x.toLowerCase() === `${n}.png`);
    if (f) return join(dir, f);
  }
  return null;
}

const GUI = 'GUI Pro-SuperCasual/ResourcesData/Sprites';
const FONTS = 'GUI Pro-SuperCasual/ResourcesData/Fonts';
const COLORS = ['Blue', 'Sky', 'Green', 'Yellow', 'Red', 'Purple', 'Pink', 'Mint', 'Gray', 'DarkGray'];

/**
 * GUI sprites the screens use (paths under ResourcesData/Sprites), picked from the pack's demo
 * panels (Settings, Lobby, Play_UI_*, PopupDim_Play_Result_*). Texture key = "ui_" + file name.
 */
function guiList() {
  const C = 'Components';
  const list = [];
  for (const c of COLORS) list.push(`${C}/Button/Button01_s_${c}`);
  list.push(
    `${C}/Button/Button_Tapered_Yellow`,
    `${C}/Button/Button_Circle118`,
    `${C}/Button/Button_Round03_Dark`,
    `${C}/Button/Button_Round04_Bg`,
    `${C}/Button/Menu_BottomBtn_Bg`,
    `${C}/Button/Menu_BottomBtn_TabFocus`,
    `${C}/Button/Menu_BottomBtn_TabFocus_Light`,
    `${C}/Popup/Popup02~09_Topber_White_Bg`,
    `${C}/Popup/Popup02~09_Topber_White_BgTop`,
    `${C}/Popup/Popup02~09_Topber_White_BgTopLight`,
    `${C}/Label/Title_Line01_Divider_Left`,
    `${C}/Label/Title_Line01_Divider_Right`,
    `${C}/Label/Title_Line02_Divider_Left`,
    `${C}/Label/Title_Line02_Divider_Right`,
    `${C}/Label/Title_Ribbon04_Red`,
    `${C}/Frame/ItemFrame00~03_Bg`,
    `${C}/Frame/ItemFrame00~03_BgLight`,
    `${C}/Frame/ItemFrame00~03_Border`,
    `${C}/Frame/BannerFrame00_04~06_Bg`,
    `${C}/Frame/BannerFrame00_04~06_BgLight`,
    `${C}/Frame/BannerFrame00_04~06_Border`,
    `${C}/Frame/SkillFrame_l~m_Bg`,
    `${C}/Frame/SkillFrame_l~m_Border`,
    `${C}/Frame/BorderFrame_Round20_White_Bg`,
    `${C}/Frame/BorderFrame_Round20_White_Light`,
    `${C}/Slider/Slider_Wave_Bg`,
    `${C}/Slider/Slider_Wave_Fill`,
    `${C}/Slider/Slider_Wave_Badge1`,
    `${C}/Slider/Slider_Wave_Badge2`,
    `${C}/Slider/Slider_Level02_Bg_Single`,
    `${C}/Slider/Slider_Level02_Fill01_Blue`,
    `${C}/Slider/Slider_Level02_Icon_Badge_Blue`,
    `${C}/UI_Etc/ResourceBar_Single_Bg`,
    `${C}/UI_Etc/ResourceBar_Single_Icon_Coin`,
    `${C}/UI_Etc/Switch_Single_Bg`,
    `${C}/UI_Etc/Switch_Single_Fill`,
    `${C}/UI_Etc/Switch_Single_Handle`,
    `${C}/Icon_TutorialHand/256/tutorial_hand_2`,
  );
  for (const c of ['Sky', 'Blue', 'Red', 'Yellow', 'Green', 'Orange', 'Purple']) list.push(`${C}/Label/Title_Ribbon01_${c}`);
  for (const n of ['Money_Coin', 'Star_Gold', 'Star_Red', 'Battle', 'Trophy_Gold', 'Chest_Gold', 'Gear_Armor_Top', 'Damage', 'Heart_Red', 'Skull']) list.push(`${C}/Icon_ItemIcons/256/ItemIcon_${n}`);
  list.push(
    'Demo/Demo_Background/panal_dim_Black',
    'Demo/Demo_Image/Image_Effect_Rotate',
    'Demo/Demo_Image/Image_Bagde_Wing1',
    'Demo/Demo_Image/Image_Bagde_Wing2',
    'Demo/Demo_Image/Image_Badge_Skull',
    'Demo/Demo_Image/Image_Oval',
  );
  list.push(
    `${C}/Icon_PictoIcons/128/PictoIcon_Bomb_1`,
    `${C}/Icon_PictoIcons/128/PictoIcon_Freezee`,
    `${C}/Slider/Slider_Play01_Bg`,
    `${C}/Slider/Slider_Play01_Fill`,
    `${C}/Frame/SkillFrame_s_Bg`,
    `${C}/Frame/SkillFrame_s_Border`,
  );
  const icons = ['Icon_Fire02', 'Icon_Lock03', 'Icon_Setting', 'Icon_Close02', 'Icon_Music', 'Icon_Bell', 'Icon_Phone', 'Icon_Megaphone', 'Icon_Pause', 'Icon_Menu_Hamburger', 'Icon_Heart', 'Icon_Shield', 'Icon_Sword01', 'Icon_Lock01_s', 'Icon_Back', 'Icon_Castle', 'Icon_Check01', 'Icon_Skip', 'Icon_Crown', 'Icon_Coin', 'GradeIcon_Gem_On', 'GradeIcon_Gem_Off'];
  for (const n of icons) list.push(`Demo/Demo_Icon/${n}`);
  for (let i = 1; i <= 7; i++) list.push(`Demo/Demo_Icon/SkillIcon01_${i}`);
  for (let i = 1; i <= 3; i++) list.push(`Demo/Demo_Icon/SkillIcon02_${i}`);
  return list.map((rel) => [`ui_${rel.split('/').pop().toLowerCase().replace(/~/g, '-')}`, rel]);
}

/** Case-insensitive file lookup (the pack mixes .png and .Png). */
function findFile(path) {
  const dir = dirname(path);
  if (!existsSync(dir)) return null;
  const want = path.slice(dir.length + 1).toLowerCase();
  const f = readdirSync(dir).find((x) => x.toLowerCase() === want);
  return f ? join(dir, f) : null;
}

function syncGui() {
  mkdirSync(join(OUT, 'gui'), { recursive: true });
  const out = [];
  for (const [key, rel] of guiList()) {
    const file = findFile(join(SRC, GUI, `${rel}.png`));
    if (!file) {
      console.warn(`gui: missing ${rel}`);
      continue;
    }
    copyFileSync(file, join(OUT, 'gui', `${key}.png`));
    const { w, h } = pngSize(file);
    const entry = { key, file: `${key}.png`, w, h };
    // Unity spriteBorder is {x: left, y: bottom, z: right, w: top}
    const meta = findFile(`${file}.meta`);
    const b = meta && readFileSync(meta, 'utf8').match(/spriteBorder: \{x: (\S+), y: (\S+), z: (\S+), w: (\S+)\}/);
    if (b && b.slice(1).some((v) => +v > 0)) entry.border = [+b[1], +b[3], +b[4], +b[2]];
    out.push(entry);
  }
  // the monster pack's battlefield props (flat colors are sampled from its 4x4 swatches)
  for (const n of ['bg_stone', 'bg_weed', 'fortress_goblin', 'fortress_slime', 'fortress_skull']) {
    const file = join(SRC, MON, 'PNG/Bg', `${n}.png`);
    if (!existsSync(file)) continue;
    copyFileSync(file, join(OUT, 'gui', `ui_${n}.png`));
    const { w, h } = pngSize(file);
    out.push({ key: `ui_${n}`, file: `ui_${n}.png`, w, h });
  }
  console.log(`gui: ${out.length} sprites`);
  mkdirSync(join(OUT, 'fonts'), { recursive: true });
  for (const f of ['Sen-ExtraBold.ttf', 'Cairo-Black.ttf']) copyFileSync(join(SRC, FONTS, f), join(OUT, 'fonts', f));
  return out;
}

if (!existsSync(SRC)) {
  console.error(`Layer Lab folder not found: ${SRC}\nPass it as the first argument or set LAYERLAB_DIR.`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
const rigs = {};
for (const [key, def] of Object.entries(RIGS)) {
  const dir = join(SRC, def.png);
  const parts = [];
  for (const p of parsePrefab(join(SRC, def.prefab)).sort((a, b) => a.order - b.order)) {
    if (p.name.toLowerCase() === 'shadow') continue; // the game draws its own ground shadow
    const png = findPng(dir, p.name) ?? (def.fallback?.[p.name.toLowerCase()] ? findPng(dir, def.fallback[p.name.toLowerCase()]) : null);
    if (!png) {
      console.warn(`${key}: no PNG for part "${p.name}"`);
      continue;
    }
    const tex = `ll_${key}_${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    mkdirSync(join(OUT, 'chars'), { recursive: true });
    copyFileSync(png, join(OUT, 'chars', `${tex}.png`));
    const { w, h } = pngSize(png);
    // Unity y points up; the game's y points down. Rotation is the z quaternion as degrees.
    const angle = (-2 * Math.atan2(p.rz, p.rw) * 180) / Math.PI;
    parts.push({ name: p.name.toLowerCase(), tex, x: +(p.x * PPU).toFixed(1), y: +(-p.y * PPU).toFixed(1), angle: +angle.toFixed(2), sx: p.sx * (p.flipX ? -1 : 1), sy: p.sy, w, h });
  }
  rigs[key] = parts;
  console.log(`${key}: ${parts.map((p) => p.name).join(', ')}`);
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ rigs, gui: syncGui() }, null, 1));
console.log(`wrote ${join(OUT, 'manifest.json')}`);
