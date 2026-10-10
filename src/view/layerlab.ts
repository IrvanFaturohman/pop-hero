// Layer Lab art (copied out of the Unity project by scripts/layerlab-sync.mjs into
// public/assets/layerlab/, gitignored). When the files are missing, every view falls back to the
// procedural textures, so a fresh clone still runs.
import type Phaser from 'phaser';

const BASE = 'assets/layerlab/';

/** One sprite part of a character, as laid out in its Unity prefab (px, y down, pivot centered). */
export interface RigPart {
  name: string;
  tex: string;
  x: number;
  y: number;
  angle: number;
  sx: number;
  sy: number;
  w: number;
  h: number;
}

/** A GUI sprite; 9-slice borders (px) when the Unity sprite has them. */
export interface GuiSprite {
  key: string;
  file: string;
  w: number;
  h: number;
  border?: [left: number, right: number, top: number, bottom: number];
}

interface Manifest {
  rigs: Record<string, RigPart[]>;
  gui: GuiSprite[];
}

let manifest: Manifest | null = null;
let fontsLoaded = false;

/** The pack's text fonts (Sen ExtraBold, Cairo Black), registered as "LL Sen" / "LL Cairo". */
export async function loadLayerLabFonts(): Promise<void> {
  if (typeof FontFace === 'undefined' || !document.fonts) return;
  try {
    const faces = [new FontFace('LL Sen', `url(${BASE}fonts/Sen-ExtraBold.ttf)`), new FontFace('LL Cairo', `url(${BASE}fonts/Cairo-Black.ttf)`)];
    for (const f of await Promise.all(faces.map((f) => f.load()))) document.fonts.add(f);
    fontsLoaded = true;
  } catch {
    // missing art: the bundled Fredoka stays
  }
}

export function hasLayerLabFonts(): boolean {
  return fontsLoaded;
}

/** Boot preload: the manifest first, then every texture it lists. */
export function preloadLayerLab(scene: Phaser.Scene): void {
  scene.load.json('ll_manifest', `${BASE}manifest.json`);
  scene.load.on('filecomplete-json-ll_manifest', (_key: string, _type: string, data: Manifest) => {
    manifest = data;
    for (const parts of Object.values(data.rigs)) {
      for (const p of parts) if (!scene.textures.exists(p.tex)) scene.load.image(p.tex, `${BASE}chars/${p.tex}.png`);
    }
    for (const g of data.gui) scene.load.image(g.key, `${BASE}gui/${g.file}`);
  });
  // missing art is not an error: the procedural look takes over
  scene.load.on('loaderror', (file: Phaser.Loader.File) => {
    if (file.key === 'll_manifest') manifest = null;
  });
}

/** True once the Layer Lab art loaded (checked by every view that can use it). */
export function hasLayerLab(): boolean {
  return manifest !== null;
}

export function rigParts(key: string): RigPart[] | null {
  return manifest?.rigs[key] ?? null;
}

export function guiSprite(key: string): GuiSprite | null {
  return manifest?.gui.find((g) => g.key === key) ?? null;
}
