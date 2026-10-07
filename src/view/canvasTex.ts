// Draw a texture with the 2D canvas API (gradients etc.).
import type Phaser from 'phaser';

export function canvasTex(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (c: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const c = tex.getContext();
  c.clearRect(0, 0, w, h);
  draw(c);
  tex.refresh();
}
