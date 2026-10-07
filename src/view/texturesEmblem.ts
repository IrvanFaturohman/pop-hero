// Emblems drawn on special balloons (fire / ice / bomb / heal), plus the bomb projectile.
import type Phaser from 'phaser';
import { config } from '../config';
import { canvasTex } from './canvasTex';

type Ctx = CanvasRenderingContext2D;

function flame(c: Ctx): void {
  c.fillStyle = '#FFD23F';
  c.beginPath();
  c.moveTo(32, 6);
  c.bezierCurveTo(48, 22, 54, 34, 48, 46);
  c.bezierCurveTo(44, 56, 20, 56, 16, 46);
  c.bezierCurveTo(12, 36, 20, 28, 24, 22);
  c.bezierCurveTo(26, 30, 30, 32, 32, 6);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = '#FF3B3B';
  c.beginPath();
  c.moveTo(32, 30);
  c.bezierCurveTo(40, 38, 40, 48, 32, 50);
  c.bezierCurveTo(24, 48, 24, 40, 32, 30);
  c.fill();
}

function snowflake(c: Ctx): void {
  c.strokeStyle = '#ffffff';
  c.lineWidth = 6;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI;
    c.beginPath();
    c.moveTo(32 + Math.cos(a) * 24, 32 + Math.sin(a) * 24);
    c.lineTo(32 - Math.cos(a) * 24, 32 - Math.sin(a) * 24);
    c.stroke();
  }
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(32, 32, 6, 0, Math.PI * 2);
  c.fill();
}

function bomb(c: Ctx): void {
  c.fillStyle = '#2B2B36';
  c.beginPath();
  c.arc(30, 36, 18, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.4)';
  c.beginPath();
  c.arc(24, 30, 5, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = config.palette.outline;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(40, 22);
  c.quadraticCurveTo(48, 12, 54, 14);
  c.stroke();
  c.fillStyle = '#FF3B3B';
  c.beginPath();
  c.arc(54, 12, 5, 0, Math.PI * 2);
  c.fill();
}

function heart(c: Ctx): void {
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.moveTo(32, 52);
  c.bezierCurveTo(8, 36, 10, 14, 24, 14);
  c.bezierCurveTo(30, 14, 32, 20, 32, 22);
  c.bezierCurveTo(32, 20, 34, 14, 40, 14);
  c.bezierCurveTo(54, 14, 56, 36, 32, 52);
  c.closePath();
  c.fill();
  c.stroke();
}

export function makeEmblemTextures(scene: Phaser.Scene): void {
  const draws: Record<string, (c: Ctx) => void> = { fire: flame, ice: snowflake, bomb, heal: heart };
  for (const [k, fn] of Object.entries(draws)) {
    canvasTex(scene, `emb_${k}`, 64, 64, (c) => {
      c.lineJoin = 'round';
      c.lineCap = 'round';
      c.strokeStyle = config.palette.outline;
      c.lineWidth = 4;
      fn(c);
    });
  }
  canvasTex(scene, 'bomb', 48, 48, (c) => {
    c.lineJoin = 'round';
    c.strokeStyle = config.palette.outline;
    c.lineWidth = 4;
    c.translate(-6, -6);
    c.scale(0.9, 0.9);
    bomb(c);
  });
}
