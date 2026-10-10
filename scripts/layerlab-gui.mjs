// GUI sprites for layerlab-sync.mjs, from Layer Lab's "GUI Pro-MinimalGame". Most frames are white
// sprites that the pack's prefabs tint; view/gui.ts rebuilds those prefabs with the same tints.
// Texture key = "ui_" + the file name in lower case ("~" becomes "-").
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PACK = 'GUI Pro-MinimalGame';

const TITLE_COLORS = ['Blue', 'Green', 'Red', 'Sky', 'Tangerine', 'Plum', 'Yellow', 'LightDark'];
const ICONS = [
  // abilities, stats, power-ups, currencies (UniqueIcon)
  'Gear_Bow_01', 'Stat_Attack_01', 'Item_Horseshoe_01_Silver', 'Economy_Heart_02_Red', 'Misc_Baloon_01', 'UI_ETC_Target_01', 'Misc_Fist_01_Gold',
  'Gear_Shield_03_Gold', 'Item_Feather_02_Blue', 'Gear_Weapons_Sword_01', 'Economy_Heart_Red', 'Gear_Shield_01', 'Misc_Fire_01_Red', 'Misc_Snowflake_01',
  'Consumable_Explosives_Bomb_01_Black', 'Economy_Star_01_Yellow', 'Economy_Star_01_Red', 'Economy_Coin_02_Gold', 'UI_Rewards_Trophy_01_Gold',
  'UI_Play_Skull_01', 'UI_Play_Battle_01_Color', 'Gear_Helmet_04', 'UI_Common_Lock_01_Silver', 'Economy_Crown_01_Gold',
  // settings rows (PictoIcon, white: tinted by the popup)
  'sound', 'music', 'vibration', 'swirl', 'setting_1',
];

/** Sprite names the game uses (file names without .png, found anywhere in the pack). */
const NAMES = [
  'Button_02_White_Bg', 'Button_02_White_Light', 'Button_02_White_HighLight',
  'Button_03_White_Bg', 'Button_03_White_Light', 'Button_03_White_HighLight', 'Button_03_White_Gradient', 'Button_03_White_Shadow',
  'Icon_Close', 'Icon_Pause', 'Icon_Btn_Ad',
  ...TITLE_COLORS.map((c) => `Title_01_NoDeco_${c}`),
  'Title_Tapered_01', 'Title_LineDeco_01_s_White', 'Title_LineDeco_01_l_White',
  'Popup_Box_01~03_White_Bg', 'Popup_Box_01~03_White_Border', 'Popup_Box_01_White_InnerBorder',
  'CardFrame_01_White_Bg', 'CardFrame_01_White_InnerBorder1', 'CardFrame_01_White_InnerBorder1HighLight', 'CardFrame_01_White_InnerBorder2',
  'CardFrame_01_White_RoofBg', 'CardFrame_01_White_RoofLine',
  'Label_Tapered_02_White_Bg', 'Label_Tapered_02_White_Border',
  'ItemFrame_02_White_Bg', 'ItemFrame_02_White_Deco', 'ItemFrame_02_White_Border',
  'BasicFrame_SquareSharpEdge_01_l_White_Bg', 'BasicFrame_SquareSharpEdge_01_l_White_Border',
  'BasicFrame_Rectangle_01~04_Bg', 'BasicFrame_Rectangle_01~04_Border1', 'BasicFrame_Rectangle_01~04_InnerBorder2',
  'ResourceBar_Bg', 'ResourceBar_Icon_Gold',
  'Swich_01_Bg_On', 'Swich_01_Bg_Off', 'Swich_01_handle',
  'Grade_Gem_01', 'Grade_Gem_01_Empty',
  'Slider_01_White_Bg', 'Slider_01_White_Fill_HighLight', 'Slider_Level_02_Icon',
  'Tab_01_White_Bg', 'Tab_01_White_Border', 'Tab_01_White_Light1', 'Tab_01_White_Light2',
  'TutorialHand_01', 'Image_Deco_Oval', 'Illust_Victory', 'Illust_Lose', 'Effect_Light_01_512', 'SampleEffect_Confetti',
  ...ICONS,
];

/** Folder preference when a name exists more than once (theme over shared, 256 px icons). */
function rank(path) {
  if (path.includes('/UniqueIcon/256/') || path.includes('/PictoIcon/128/')) return 0;
  if (path.includes('/Icons/')) return 3;
  if (path.includes('Theme_Light')) return 1;
  return 2;
}

function walk(dir, out) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (f.toLowerCase().endsWith('.png')) {
      const name = f.slice(0, -4).toLowerCase();
      if (!out.has(name) || rank(p) < rank(out.get(name))) out.set(name, p);
    }
  }
  return out;
}

/** [texture key, absolute file] for every sprite the game uses; warns about missing ones. */
export function guiFiles(src) {
  const root = join(src, PACK);
  if (!existsSync(root)) return [];
  const index = walk(root, new Map());
  const out = [];
  for (const n of NAMES) {
    const file = index.get(n.toLowerCase());
    if (!file) console.warn(`gui: missing ${n}`);
    else out.push([`ui_${n.toLowerCase().replace(/~/g, '-')}`, file]);
  }
  return out;
}
