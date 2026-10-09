// Generated textures for enemies (rat, bunny, boar, Rat King facing the hero; bat, bear and the
// Digger Mole in texturesCreatures.ts), the "!" alert and coins.
import type Phaser from 'phaser';
import { config, hex } from '../config';
import type { EnemyKind } from '../levels';
import { canvasTex } from './canvasTex';
import { css, shade } from './color';
import { bat, bear, blob, mole } from './texturesCreatures';

/** Texture size relative to the enemy radius (body fills ~radius*2 wide). */
export const ENEMY_TEX_SCALE = 2.6;

type Ctx = CanvasRenderingContext2D;

/** Critters facing left (toward the hero). r = body radius in texture px. */
function critter(c: Ctx, s: number, kind: EnemyKind): void {
  const ol = config.palette.outline;
  const cx = s / 2;
  const cy = s / 2 + s * 0.06;
  const r = s / ENEMY_TEX_SCALE;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.strokeStyle = ol;
  c.lineWidth = Math.max(3, r * 0.1);
  const body = css(enemyColor(kind));
  const dark = css(shade(enemyColor(kind), -0.3));
  const light = css(shade(enemyColor(kind), 0.25));
  if (kind === 'flier') bat(c, cx, cy, r);
  else if (kind === 'brute') bear(c, cx, cy, r);
  else if (kind === 'mole') mole(c, cx, cy, r);
  else if (kind === 'grunt' || kind === 'ratking') {
    // rat: pink tail, round body, pointed snout, red eye (the boss is a big rat king)
    c.strokeStyle = '#E58FA0';
    c.lineWidth = r * 0.12;
    c.beginPath();
    c.moveTo(cx + r * 0.85, cy + r * 0.2);
    c.quadraticCurveTo(cx + r * 1.35, cy - r * 0.1, cx + r * 1.15, cy - r * 0.6);
    c.stroke();
    c.strokeStyle = ol;
    c.lineWidth = Math.max(3, r * 0.1);
    blob(c, dark, () => c.ellipse(cx - r * 0.3, cy + r * 0.62, r * 0.18, r * 0.12, 0, 0, Math.PI * 2));
    blob(c, dark, () => c.ellipse(cx + r * 0.45, cy + r * 0.62, r * 0.18, r * 0.12, 0, 0, Math.PI * 2));
    blob(c, body, () => c.ellipse(cx + r * 0.1, cy + r * 0.1, r * 0.95, r * 0.62, 0, 0, Math.PI * 2));
    blob(c, body, () => {
      c.moveTo(cx - r * 0.25, cy - r * 0.45);
      c.quadraticCurveTo(cx - r * 1.0, cy - r * 0.35, cx - r * 1.2, cy + r * 0.05);
      c.quadraticCurveTo(cx - r * 0.9, cy + r * 0.35, cx - r * 0.2, cy + r * 0.3);
      c.closePath();
    });
    blob(c, body, () => c.arc(cx - r * 0.35, cy - r * 0.55, r * 0.26, 0, Math.PI * 2));
    c.fillStyle = '#E58FA0';
    c.beginPath();
    c.arc(cx - r * 0.35, cy - r * 0.55, r * 0.13, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#E58FA0';
    c.beginPath();
    c.arc(cx - r * 1.2, cy + r * 0.04, r * 0.1, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#FF3B3B';
    c.beginPath();
    c.arc(cx - r * 0.68, cy - r * 0.12, r * 0.11, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = light;
    c.beginPath();
    c.ellipse(cx + r * 0.2, cy - r * 0.2, r * 0.35, r * 0.12, -0.2, 0, Math.PI * 2);
    c.fill();
    if (kind === 'ratking') {
      // crown + angry brow + scar
      c.strokeStyle = ol;
      c.lineWidth = Math.max(3, r * 0.06);
      c.fillStyle = '#FFD23F';
      c.beginPath();
      const bx = cx - r * 0.55;
      const by = cy - r * 0.62;
      c.moveTo(bx - r * 0.3, by);
      c.lineTo(bx - r * 0.3, by - r * 0.32);
      c.lineTo(bx - r * 0.15, by - r * 0.18);
      c.lineTo(bx, by - r * 0.4);
      c.lineTo(bx + r * 0.15, by - r * 0.18);
      c.lineTo(bx + r * 0.3, by - r * 0.32);
      c.lineTo(bx + r * 0.3, by);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = '#FF3B3B';
      c.beginPath();
      c.arc(bx, by - r * 0.12, r * 0.05, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = r * 0.06;
      c.beginPath();
      c.moveTo(cx - r * 0.9, cy - r * 0.32);
      c.lineTo(cx - r * 0.55, cy - r * 0.22);
      c.stroke();
      c.strokeStyle = '#E58FA0';
      c.lineWidth = r * 0.03;
      c.beginPath();
      c.moveTo(cx + r * 0.1, cy - r * 0.4);
      c.lineTo(cx + r * 0.35, cy - r * 0.1);
      c.stroke();
    }
  } else if (kind === 'runner') {
    // bunny: long ears, round body, puff tail
    blob(c, '#ffffff', () => c.arc(cx + r * 0.95, cy + r * 0.05, r * 0.22, 0, Math.PI * 2));
    for (const [ex, a] of [[-0.25, -0.25], [-0.55, -0.45]] as Array<[number, number]>) {
      blob(c, body, () => c.ellipse(cx + r * ex, cy - r * 0.95, r * 0.18, r * 0.55, a, 0, Math.PI * 2));
      c.fillStyle = '#F6A9BE';
      c.beginPath();
      c.ellipse(cx + r * ex, cy - r * 0.95, r * 0.08, r * 0.38, a, 0, Math.PI * 2);
      c.fill();
    }
    blob(c, body, () => c.ellipse(cx + r * 0.25, cy + r * 0.2, r * 0.8, r * 0.6, 0, 0, Math.PI * 2));
    blob(c, body, () => c.arc(cx - r * 0.45, cy - r * 0.2, r * 0.55, 0, Math.PI * 2));
    c.fillStyle = '#F6A9BE';
    c.beginPath();
    c.arc(cx - r * 0.98, cy - r * 0.12, r * 0.1, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#E2304A';
    c.beginPath();
    c.arc(cx - r * 0.62, cy - r * 0.32, r * 0.12, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(cx - r * 0.66, cy - r * 0.36, r * 0.04, 0, Math.PI * 2);
    c.fill();
  } else {
    // boar: big brown body, spiky mane, snout, white tusk
    c.fillStyle = dark;
    c.beginPath();
    for (let i = 0; i <= 6; i++) {
      const x = cx - r * 0.3 + i * r * 0.22;
      c.moveTo(x - r * 0.12, cy - r * 0.5);
      c.lineTo(x, cy - r * 0.88);
      c.lineTo(x + r * 0.12, cy - r * 0.5);
    }
    c.fill();
    c.stroke();
    blob(c, dark, () => c.roundRect(cx - r * 0.55, cy + r * 0.45, r * 0.25, r * 0.35, r * 0.08));
    blob(c, dark, () => c.roundRect(cx + r * 0.45, cy + r * 0.45, r * 0.25, r * 0.35, r * 0.08));
    blob(c, body, () => c.ellipse(cx + r * 0.15, cy + r * 0.05, r * 1.0, r * 0.68, 0, 0, Math.PI * 2));
    blob(c, body, () => c.arc(cx - r * 0.62, cy, r * 0.5, 0, Math.PI * 2));
    blob(c, '#D99A86', () => c.ellipse(cx - r * 1.08, cy + r * 0.1, r * 0.2, r * 0.24, 0, 0, Math.PI * 2));
    c.fillStyle = ol;
    c.beginPath();
    c.arc(cx - r * 1.12, cy + r * 0.04, r * 0.04, 0, Math.PI * 2);
    c.arc(cx - r * 1.04, cy + r * 0.16, r * 0.04, 0, Math.PI * 2);
    c.fill();
    blob(c, '#FFF7E6', () => {
      c.moveTo(cx - r * 0.95, cy + r * 0.32);
      c.quadraticCurveTo(cx - r * 1.2, cy + r * 0.3, cx - r * 1.15, cy + r * 0.05);
      c.quadraticCurveTo(cx - r * 1.05, cy + r * 0.25, cx - r * 0.85, cy + r * 0.22);
      c.closePath();
    });
    blob(c, dark, () => c.ellipse(cx - r * 0.4, cy - r * 0.42, r * 0.14, r * 0.22, -0.4, 0, Math.PI * 2));
    c.fillStyle = '#FFD23F';
    c.beginPath();
    c.arc(cx - r * 0.75, cy - r * 0.15, r * 0.1, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = ol;
    c.lineWidth = r * 0.08;
    c.beginPath();
    c.moveTo(cx - r * 0.92, cy - r * 0.32);
    c.lineTo(cx - r * 0.6, cy - r * 0.24);
    c.stroke();
    c.fillStyle = light;
    c.beginPath();
    c.ellipse(cx + r * 0.3, cy - r * 0.25, r * 0.4, r * 0.12, -0.15, 0, Math.PI * 2);
    c.fill();
  }
}

export function enemyColor(kind: EnemyKind): number {
  return hex(config.palette[kind]);
}

export function makeEnemyTextures(scene: Phaser.Scene): void {
  for (const kind of ['grunt', 'runner', 'tank', 'flier', 'brute', 'ratking', 'mole'] as EnemyKind[]) {
    const s = Math.ceil(config.enemies[kind].radius * ENEMY_TEX_SCALE);
    canvasTex(scene, `enemy_${kind}`, s, s, (c) => critter(c, s, kind));
  }
  canvasTex(scene, 'alert', 40, 52, (c) => {
    c.lineJoin = 'round';
    c.fillStyle = config.palette.danger;
    c.strokeStyle = config.palette.outline;
    c.lineWidth = 4;
    c.beginPath();
    c.roundRect(10, 2, 20, 32, 9);
    c.fill();
    c.stroke();
    c.beginPath();
    c.arc(20, 44, 6, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  });
  canvasTex(scene, 'coin', 22, 22, (c) => {
    c.fillStyle = config.palette.gold;
    c.strokeStyle = config.palette.outline;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(11, 11, 8.5, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.fillRect(8, 6, 3, 8);
  });
}
