// All textures are generated at boot (no external images).
import type Phaser from 'phaser';
import { config, hex } from '../config';
import { BALLOON_TYPES, type BalloonType } from '../logic/balloon';
import { canvasTex } from './canvasTex';
import { css, shade } from './color';
import { makeCharacterTextures } from './texturesChar';
import { makeEmblemTextures } from './texturesEmblem';
import { makeHandTexture } from './tutorial';
import { makeEnemyTextures } from './texturesEnemy';

export const BALLOON_TEX = 256;

/** Balloon body color: special types have fixed colors, normal balloons are colorful. */
export function balloonColor(type: BalloonType, tint = 0): number {
  const p = config.palette;
  switch (type) {
    case 'fire':
      return hex(p.balloonFire);
    case 'ice':
      return hex(p.balloonIce);
    case 'bomb':
      return hex(p.balloonBomb);
    case 'heal':
      return hex(p.balloonHeal);
    case 'star':
      return hex(p.balloonStar);
    case 'redstar':
      return hex(p.balloonRedStar);
    default:
      return hex(p.balloonColors[tint % p.balloonColors.length]);
  }
}

export function balloonTexKey(type: BalloonType, tint = 0): string {
  return type === 'normal' ? `balloon_n${tint % config.palette.balloonColors.length}` : `balloon_${type}`;
}

function makeBalloon(scene: Phaser.Scene, type: BalloonType, tint = 0): void {
  const col = balloonColor(type, tint);
  const s = BALLOON_TEX;
  canvasTex(scene, balloonTexKey(type, tint), s, s, (c) => {
    const r = s / 2 - 2;
    const g = c.createRadialGradient(s * 0.36, s * 0.3, s * 0.02, s * 0.5, s * 0.5, r);
    g.addColorStop(0, css(shade(col, 0.55)));
    g.addColorStop(0.35, css(shade(col, 0.12)));
    g.addColorStop(0.8, css(col));
    g.addColorStop(1, css(shade(col, -0.28)));
    c.fillStyle = g;
    c.beginPath();
    c.arc(s / 2, s / 2, r, 0, Math.PI * 2);
    c.fill();
    // soft rim light bottom-right
    const rim = c.createRadialGradient(s * 0.62, s * 0.66, r * 0.6, s * 0.5, s * 0.5, r);
    rim.addColorStop(0, 'rgba(255,255,255,0)');
    rim.addColorStop(0.85, 'rgba(255,255,255,0)');
    rim.addColorStop(1, 'rgba(255,255,255,0.18)');
    c.fillStyle = rim;
    c.fill();
  });
}

function makeFx(scene: Phaser.Scene): void {
  canvasTex(scene, 'disk', 256, 256, (c) => {
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(128, 128, 126, 0, Math.PI * 2);
    c.fill();
  });
  canvasTex(scene, 'balloon_hl', 128, 72, (c) => {
    const g = c.createRadialGradient(64, 36, 2, 64, 36, 60);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.save();
    c.translate(64, 36);
    c.scale(1, 0.55);
    c.beginPath();
    c.arc(0, 0, 62, 0, Math.PI * 2);
    c.restore();
    c.fill();
  });
  canvasTex(scene, 'knot', 40, 30, (c) => {
    c.lineJoin = 'round';
    c.lineWidth = 4;
    c.strokeStyle = config.palette.outline;
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(20, 4);
    c.lineTo(33, 25);
    c.quadraticCurveTo(20, 29, 7, 25);
    c.closePath();
    c.stroke();
    c.fill();
  });
  canvasTex(scene, 'ring', 128, 128, (c) => {
    c.strokeStyle = '#fff';
    c.lineWidth = 7;
    c.beginPath();
    c.arc(64, 64, 59, 0, Math.PI * 2);
    c.stroke();
  });
  canvasTex(scene, 'p_dot', 16, 16, (c) => {
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(8, 8, 7.5, 0, Math.PI * 2);
    c.fill();
  });
  canvasTex(scene, 'p_soft', 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  });
  canvasTex(scene, 'p_shard', 28, 22, (c) => {
    c.fillStyle = '#fff';
    c.strokeStyle = 'rgba(34,22,63,0.9)';
    c.lineWidth = 2.5;
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(3, 6);
    c.lineTo(17, 2);
    c.lineTo(26, 11);
    c.lineTo(19, 20);
    c.lineTo(6, 17);
    c.closePath();
    c.fill();
    c.stroke();
  });
  canvasTex(scene, 'p_confetti', 14, 8, (c) => {
    c.fillStyle = '#fff';
    c.fillRect(0, 0, 14, 8);
  });
  canvasTex(scene, 'p_star', 32, 32, (c) => {
    c.fillStyle = '#fff';
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 15 : 4;
      c.lineTo(16 + Math.cos(a) * r, 16 + Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
  });
  canvasTex(scene, 'vignette', 256, 256, (c) => {
    const g = c.createRadialGradient(128, 128, 60, 128, 128, 182);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  });
  canvasTex(scene, 'badge_star', 56, 56, (c) => {
    c.lineJoin = 'round';
    c.lineWidth = 5;
    c.strokeStyle = config.palette.outline;
    c.fillStyle = '#fff';
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 25 : 12;
      c.lineTo(28 + Math.cos(a) * r, 29 + Math.sin(a) * r);
    }
    c.closePath();
    c.stroke();
    c.fill();
  });
  canvasTex(scene, 'token', 30, 30, (c) => {
    c.lineWidth = 3.5;
    c.strokeStyle = config.palette.outline;
    const g = c.createLinearGradient(0, 4, 0, 26);
    g.addColorStop(0, '#FFF1A8');
    g.addColorStop(1, config.palette.gold);
    c.fillStyle = g;
    c.beginPath();
    c.roundRect(8, 3, 14, 24, 7);
    c.fill();
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.fillRect(11, 7, 3, 9);
  });
  // bullet ball (reference: the claw machine's ball pile), drawn inside balloons and poured to the hero
  canvasTex(scene, 'ball', 20, 20, (c) => {
    const g = c.createRadialGradient(7, 7, 1, 10, 10, 9);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.6, '#FFF3D6');
    g.addColorStop(1, '#E8C98A');
    c.fillStyle = g;
    c.strokeStyle = config.palette.outline;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(10, 10, 8.2, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  });
  canvasTex(scene, 'cloud', 180, 90, (c) => {
    c.fillStyle = 'rgba(255,255,255,0.92)';
    const blobs: Array<[number, number, number]> = [
      [50, 58, 30],
      [85, 42, 38],
      [125, 55, 30],
      [150, 66, 20],
      [28, 70, 18],
    ];
    for (const [x, y, r] of blobs) {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    c.fillRect(28, 60, 125, 26);
  });
}

export function makeTextures(scene: Phaser.Scene): void {
  for (const t of BALLOON_TYPES) if (t !== 'normal') makeBalloon(scene, t);
  config.palette.balloonColors.forEach((_, i) => makeBalloon(scene, 'normal', i));
  makeFx(scene);
  makeCharacterTextures(scene);
  makeEnemyTextures(scene);
  makeEmblemTextures(scene);
  makeHandTexture(scene);
}
