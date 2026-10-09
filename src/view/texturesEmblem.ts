// Emblems drawn on special balloons (fire / ice / bomb / heal / star / red star), the bomb
// projectile, and the star / coin icons used by the HUD, cards and home screen.
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

/** Five-point star centered at (32, 32). */
function starShape(c: Ctx, fill: string, r = 26): void {
  c.fillStyle = fill;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.48;
    c.lineTo(32 + Math.cos(a) * rr, 33 + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
  c.stroke();
}

function shine(c: Ctx): void {
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.beginPath();
  c.ellipse(26, 24, 5, 3, -0.6, 0, Math.PI * 2);
  c.fill();
}

function coin(c: Ctx): void {
  c.fillStyle = config.palette.coin;
  c.beginPath();
  c.arc(32, 32, 24, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.strokeStyle = '#E09A00';
  c.lineWidth = 4;
  c.beginPath();
  c.arc(32, 32, 15, 0, Math.PI * 2);
  c.stroke();
  shine(c);
}

export function makeEmblemTextures(scene: Phaser.Scene): void {
  const draws: Record<string, (c: Ctx) => void> = {
    fire: flame,
    ice: snowflake,
    bomb,
    heal: heart,
    star: (c) => starShape(c, '#ffffff', 24),
    redstar: (c) => starShape(c, config.palette.redStar, 24),
  };
  for (const [k, fn] of Object.entries(draws)) {
    canvasTex(scene, `emb_${k}`, 64, 64, (c) => {
      c.lineJoin = 'round';
      c.lineCap = 'round';
      c.strokeStyle = config.palette.outline;
      c.lineWidth = 4;
      fn(c);
    });
  }
  const icons: Record<string, (c: Ctx) => void> = {
    ic_star: (c) => {
      starShape(c, config.palette.star);
      shine(c);
    },
    ic_redstar: (c) => {
      starShape(c, config.palette.redStar);
      shine(c);
    },
    ic_coin: coin,
  };
  for (const [k, fn] of Object.entries(icons)) {
    canvasTex(scene, k, 64, 64, (c) => {
      c.lineJoin = 'round';
      c.strokeStyle = config.palette.outline;
      c.lineWidth = 5;
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
