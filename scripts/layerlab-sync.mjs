// Copies the Layer Lab art used by the game out of the Unity project into public/assets/layerlab/
// (gitignored: the raw files of a paid asset must not land in the public repo) and writes
// manifest.json: every character assembled from the CharacterMaker parts (layerlab-chars.mjs) and
// the GUI sprites with their 9-slice borders (read from the Unity .meta files).
// Usage: node scripts/layerlab-sync.mjs [layerLabDir]   (default: ../pop-hero-unity/Assets/StorePackages/Layer Lab)
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncChars } from './layerlab-chars.mjs';
import { guiFiles } from './layerlab-gui.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(process.argv[2] ?? process.env.LAYERLAB_DIR ?? join(ROOT, '../pop-hero-unity/Assets/StorePackages/Layer Lab'));
const OUT = join(ROOT, 'public/assets/layerlab');

function pngSize(file) {
  const b = readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

function syncGui() {
  mkdirSync(join(OUT, 'gui'), { recursive: true });
  const out = [];
  for (const [key, file] of guiFiles(SRC)) {
    copyFileSync(file, join(OUT, 'gui', `${key}.png`));
    const { w, h } = pngSize(file);
    const entry = { key, file: `${key}.png`, w, h };
    // Unity spriteBorder is {x: left, y: bottom, z: right, w: top}
    const meta = `${file}.meta`;
    const b = existsSync(meta) && readFileSync(meta, 'utf8').match(/spriteBorder: \{x: (\S+), y: (\S+), z: (\S+), w: (\S+)\}/);
    if (b && b.slice(1).some((v) => +v > 0)) entry.border = [+b[1], +b[3], +b[4], +b[2]];
    out.push(entry);
  }
  console.log(`gui: ${out.length} sprites`);
  return out;
}

if (!existsSync(SRC)) {
  console.error(`Layer Lab folder not found: ${SRC}\nPass it as the first argument or set LAYERLAB_DIR.`);
  process.exit(1);
}
// start clean: art from an earlier pack must not linger next to the new one
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ rigs: syncChars(SRC, OUT), gui: syncGui() }, null, 1));
console.log(`wrote ${join(OUT, 'manifest.json')}`);
