// Characters for layerlab-sync.mjs, assembled from Layer Lab's "2D Minimal-CharacterMaker": every
// character (hero and enemies alike) is the pack's one Character prefab with a pick of parts
// (helmet, chest, weapon, ...) and skin / hair colors, the way the pack's own maker builds them.
// Part positions come from the prefab hierarchy; every part sprite has a centered pivot.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CM = '2D Minimal-CharacterMaker';
const PREFAB = `${CM}/Common/Prefabs/Character.prefab`;
const PARTS = `${CM}/Extenstions/Parts Pack Base`;
/** Unity pixels per unit of every part sprite. */
const PPU = 100;

/**
 * Slot -> prefab node (path below the root), sprite folder and color target. Weapon slots list
 * every node the weapon is drawn with (the crossbow has a stock, a bow, strings and a bolt).
 */
const SLOTS = {
  body: { nodes: ['Body'], dir: 'Character/Default', color: 'skin' },
  chest: { nodes: ['Body/Chest'], dir: 'Parts/Chest' },
  head: { nodes: ['Body/Head'], dir: 'Character/Default', color: 'skin' },
  eye: { nodes: ['Body/Head/Eye'], dir: 'Character/Eye' },
  hair: { nodes: ['Body/Head/Hair'], dir: 'Character/Hair', color: 'hair' },
  helmetHair: { nodes: ['Body/Head/Hair_Helmet'], dir: 'Character/Helmet_Hair', color: 'hair' },
  beard: { nodes: ['Body/Head/Beard'], dir: 'Character/Beard', color: 'hair' },
  helmet: { nodes: ['Body/Head/Helmet'], dir: 'Parts/Helmet' },
  shield: { nodes: ['HandLeft/Shield'], dir: 'Parts/HandLeft/Shield' },
  sword: { nodes: ['HandRight/Sword'], dir: 'Parts/HandRight/Sword' },
  axe: { nodes: ['HandRight/Axe'], dir: 'Parts/HandRight/Axe' },
  blunt: { nodes: ['HandRight/Blunt'], dir: 'Parts/HandRight/Blunt' },
  spear: { nodes: ['HandRight/Spear'], dir: 'Parts/HandRight/Spear' },
  staff: { nodes: ['HandRight/Staff'], dir: 'Parts/HandRight/Staff' },
  wand: { nodes: ['HandRight/Wand'], dir: 'Parts/HandRight/Wand' },
  bow: { nodes: ['HandRight/Bow/Bow_Line_Up', 'HandRight/Bow/Bow_Line_Down', 'HandRight/Bow/Bow', 'HandRight/Bow/Arrow'], dir: 'Parts/HandRight/Bow' },
  crossbow: {
    nodes: ['HandRight/Crossbow/Crossbow_Down', 'HandRight/Crossbow/Crossbow_Line_Up', 'HandRight/Crossbow/Crossbow_Line_Down', 'HandRight/Crossbow/Crossbow', 'HandRight/Crossbow/Bolt'],
    dir: 'Parts/HandRight/Crossbow',
  },
};

/** Skin tones (Unity sprite colors) shared by several characters. */
const SKIN = { human: 'fac9ac', goblin: '9ed36a', orc: '6fa85a', undead: 'd9dde6', beast: 'a7795a', stone: 'a3b39a' };

/**
 * Game character -> parts. `weapon` is [slot, sprite]; `arrow` is the bow's arrow / crossbow's
 * bolt; `hairStyle` is a Body_Hair sprite (its helmet variant under a helmet), `hair` its color.
 * `aim` turns the weapon around its hand (deg, clockwise): the maker holds bows and crossbows
 * pointing down. `scale` is the size the game draws the character at (the parts are small).
 */
export const CHARS = {
  hero: { scale: 1.25, skin: SKIN.human, hair: '7a4a2a', eye: 'Body_Eye_002_Blue', hairStyle: 'Body_Hair_003', helmet: 'FA_Helmet_024_GrayBlue', chest: 'FA_Chest_014_BlueGold', weapon: ['crossbow', 'FA_WP_Main_Crossbow_001_WoodWhite'], aim: -30, arrow: 'FA_Consumable_Arrow_002_SilverBlue' },
  grunt: { scale: 1, skin: SKIN.goblin, eye: 'Body_Eye_009', helmet: 'FA_Helmet_026_Brown', chest: 'FA_Chest_008_Brown', weapon: ['blunt', 'FA_WP_Main_Blunt_001_Wood'] },
  runner: { scale: 0.85, skin: SKIN.goblin, eye: 'Body_Eye_001', helmet: 'FA_Helmet_025_Blue', chest: 'FA_Chest_013_Green', weapon: ['sword', 'FA_WP_Main_Sword_010_WoodSilver'] },
  tank: { scale: 1.3, skin: SKIN.stone, eye: 'Body_Eye_018', helmet: 'FA_Helmet_032_DarkRed', chest: 'FA_Chest_015_GrayBlack', shield: 'FA_WP_Sub_Shield_004_Silver', weapon: ['blunt', 'FA_WP_Main_Blunt_008_Gray'] },
  flier: { scale: 1, skin: SKIN.undead, eye: 'Body_Eye_018', helmet: 'FA_Helmet_039_BrownPink', chest: 'FA_Chest_017_Gray', weapon: ['bow', 'FA_WP_Main_Bow_006_Brown'], aim: -90, arrow: 'FA_Consumable_Arrow_001_YellowWood' },
  brute: { scale: 1.55, skin: SKIN.orc, eye: 'Body_Eye_009', helmet: 'FA_Helmet_021_Dark', chest: 'FA_Chest_015_RedSilver', weapon: ['axe', 'FA_WP_Main_Axe_011_RedDark'] },
  ratking: { scale: 2.1, skin: SKIN.beast, eye: 'Body_Eye_018', helmet: 'FA_Helmet_030_Wood', chest: 'FA_Chest_015_RedGold', weapon: ['staff', 'FA_WP_Main_Staff_007_Black'] },
  mole: { scale: 2.4, skin: SKIN.beast, eye: 'Body_Eye_018', helmet: 'FA_Helmet_038_RedGold', chest: 'FA_Chest_028_BlackGold', weapon: ['blunt', 'FA_WP_Main_Blunt_006_OrangeGray'] },
};

/** Prefab: every transform with its world layout (Unity units, y up) and sorting order by path. */
function parsePrefab(file) {
  const objects = new Map();
  const transforms = new Map();
  const orders = new Map();
  for (const d of readFileSync(file, 'utf8').split(/^--- /m)) {
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
      transforms.set(id, { go, father, x: +p[1], y: +p[2], a: 2 * Math.atan2(+r[1], +r[2]), sx: +s[1], sy: +s[2] });
    } else if (type === '212') {
      const go = d.match(/m_GameObject: \{fileID: (-?\d+)\}/)[1];
      orders.set(go, +(d.match(/m_SortingOrder: (-?\d+)/)?.[1] ?? 0));
    }
  }
  const world = new Map();
  const resolveNode = (id) => {
    const t = transforms.get(id);
    const name = objects.get(t.go);
    if (t.father === '0') return { path: '', x: 0, y: 0, a: 0, sx: 1, sy: 1 };
    const p = resolveNode(t.father);
    const lx = t.x * p.sx;
    const ly = t.y * p.sy;
    const c = Math.cos(p.a);
    const s = Math.sin(p.a);
    const w = { path: p.path ? `${p.path}/${name}` : name, x: p.x + c * lx - s * ly, y: p.y + s * lx + c * ly, a: p.a + t.a, sx: p.sx * t.sx, sy: p.sy * t.sy, order: orders.get(t.go) ?? 0 };
    world.set(w.path, w);
    return w;
  };
  for (const id of transforms.keys()) resolveNode(id);
  return world;
}

function pngSize(file) {
  const b = readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/** Sprite file for a node of a slot: weapons pair the main sprite with "_Down" and fixed strings. */
function spriteFor(slot, node, pick, arrow) {
  const leaf = node.split('/').pop();
  if (slot === 'crossbow') {
    if (leaf === 'Crossbow') return ['Crossbow', pick];
    if (leaf === 'Crossbow_Down') return ['Crossbow', `${pick}_Down`];
    if (leaf === 'Bolt') return arrow ? ['Arrow', arrow] : null;
    return ['Crossbow', leaf];
  }
  if (slot === 'bow') {
    if (leaf === 'Bow') return ['Bow', pick];
    if (leaf === 'Arrow') return arrow ? ['Arrow', arrow] : null;
    return ['Bow', leaf];
  }
  return [null, pick];
}

/** Copies the parts of every character into out/chars and returns the manifest's rigs. */
export function syncChars(src, out) {
  const world = parsePrefab(join(src, PREFAB));
  const rigs = {};
  mkdirSync(join(out, 'chars'), { recursive: true });
  for (const [key, def] of Object.entries(CHARS)) {
    const picks = [['body', 'Body'], ['head', 'Head'], ['chest', def.chest], ['eye', def.eye], ['beard', def.beard]];
    // like the maker: under a helmet the hair switches to its short "helmet hair" variant
    const hair = def.hairStyle && (def.helmet ? def.hairStyle.replace('Body_Hair_', 'Body_Helmet_Hair_') : def.hairStyle);
    picks.push([def.helmet ? 'helmetHair' : 'hair', hair]);
    picks.push(['helmet', def.helmet], ['shield', def.shield]);
    if (def.weapon) picks.push(def.weapon);
    const parts = [];
    for (const [slot, pick] of picks) {
      if (!pick) continue;
      const s = SLOTS[slot];
      // the weapon's own node (HandRight/Crossbow, ...) is the hand it turns around
      const hand = world.get(s.nodes[0].split('/').slice(0, 2).join('/'));
      for (const node of s.nodes) {
        const w = slot === def.weapon?.[0] && def.aim ? turn(world.get(node), hand, def.aim) : world.get(node);
        const sp = spriteFor(slot, node, pick, def.arrow);
        if (!w || !sp) continue;
        const dir = sp[0] ? join(src, PARTS, 'Parts/HandRight', sp[0]) : join(src, PARTS, s.dir);
        const png = join(dir, `${sp[1]}.png`);
        if (!existsSync(png)) {
          console.warn(`${key}: no sprite ${sp[1]} for ${node}`);
          continue;
        }
        const leaf = node.split('/').pop().toLowerCase();
        const name = s.nodes.length === 1 || leaf === slot ? slotName(slot) : `${slotName(slot)}_${leaf}`;
        const tex = `ll_${key}_${name}`;
        copyFileSync(png, join(out, 'chars', `${tex}.png`));
        const { w: pw, h: ph } = pngSize(png);
        const color = s.color === 'skin' ? def.skin : s.color === 'hair' ? def.hair : undefined;
        // Unity y points up; the game's y points down (angles flip with it)
        parts.push({ name, tex, order: w.order, x: +(w.x * PPU).toFixed(1), y: +(-w.y * PPU).toFixed(1), angle: +((-w.a * 180) / Math.PI).toFixed(2), sx: w.sx, sy: w.sy, w: pw, h: ph, ...(color ? { tint: parseInt(color, 16) } : {}) });
      }
    }
    parts.sort((a, b) => a.order - b.order);
    rigs[key] = { scale: def.scale, parts: parts.map(({ order, ...p }) => p) };
    console.log(`${key}: ${parts.map((p) => p.name).join(', ')}`);
  }
  return rigs;
}

/** `w` turned by `deg` (clockwise on screen) around `pivot`, both in Unity units. */
function turn(w, pivot, deg) {
  if (!w) return w;
  const a = (-deg * Math.PI) / 180;
  const dx = w.x - pivot.x;
  const dy = w.y - pivot.y;
  return { ...w, x: pivot.x + Math.cos(a) * dx - Math.sin(a) * dy, y: pivot.y + Math.sin(a) * dx + Math.cos(a) * dy, a: w.a + a };
}

/** Rig part names the game animates by (weapons are all "weapon", the left hand is "shield"). */
function slotName(slot) {
  if (SLOTS[slot].nodes[0].startsWith('HandRight')) return 'weapon';
  return slot.toLowerCase();
}
