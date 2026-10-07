// Generated textures for spikes (red spike stars), the hero (chibi soldier, side view) and bullets.
import type Phaser from 'phaser';
import { config } from '../config';
import { canvasTex } from './canvasTex';

type Ctx = CanvasRenderingContext2D;

/** Spike star texture size. Collision radius (18) sits mid-spike. */
export const SPIKE_BALL_TEX = 64;

function star(c: Ctx, cx: number, cy: number, points: number, rOut: number, rIn: number, rot = -Math.PI / 2): void {
  c.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 + rot;
    const r = i % 2 === 0 ? rOut : rIn;
    c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  c.closePath();
}

function makeSpikes(scene: Phaser.Scene): void {
  const p = config.palette;
  const s = SPIKE_BALL_TEX;
  const m = s / 2;
  canvasTex(scene, 'spike_ball', s, s, (c) => {
    c.lineJoin = 'round';
    star(c, m, m, 8, 25, 13);
    c.lineWidth = 5;
    c.strokeStyle = '#ffffff';
    c.stroke();
    const g = c.createRadialGradient(m - 5, m - 6, 2, m, m, 25);
    g.addColorStop(0, p.spikeTip);
    g.addColorStop(0.55, p.spikeBody);
    g.addColorStop(1, p.spikeCore);
    c.fillStyle = g;
    c.fill();
    c.fillStyle = p.spikeCore;
    c.beginPath();
    c.arc(m, m, 8, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath();
    c.ellipse(m - 4, m - 5, 4, 2.5, -0.6, 0, Math.PI * 2);
    c.fill();
  });
  canvasTex(scene, 'spike_hub', 60, 60, (c) => {
    c.lineJoin = 'round';
    star(c, 30, 30, 8, 26, 19);
    c.lineWidth = 5;
    c.strokeStyle = '#fff';
    c.stroke();
    c.fillStyle = p.spikeBody;
    c.fill();
    c.fillStyle = p.spikeCore;
    c.beginPath();
    c.arc(30, 30, 10, 0, Math.PI * 2);
    c.fill();
  });
}

/** Chibi soldier facing right: big head with helmet, backpack, boots. No weapon (separate sprite). */
function makeHero(scene: Phaser.Scene): void {
  const ol = config.palette.outline;
  canvasTex(scene, 'hero', 120, 140, (c) => {
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.strokeStyle = ol;
    c.lineWidth = 4;
    const shape = (fill: string, draw: () => void) => {
      c.fillStyle = fill;
      c.beginPath();
      draw();
      c.fill();
      c.stroke();
    };
    // backpack (behind, left)
    shape('#6B5A3A', () => c.roundRect(14, 62, 26, 40, 8));
    // legs + boots
    shape('#4A5A34', () => c.roundRect(42, 100, 14, 24, 5));
    shape('#4A5A34', () => c.roundRect(62, 100, 14, 24, 5));
    shape('#3A2A20', () => c.roundRect(38, 118, 22, 12, 5));
    shape('#3A2A20', () => c.roundRect(60, 118, 22, 12, 5));
    // body (olive jacket)
    shape('#6E8B47', () => c.roundRect(34, 64, 50, 44, 14));
    c.fillStyle = '#5A7439';
    c.fillRect(36, 84, 46, 6);
    // head
    shape('#F7C8A0', () => c.arc(62, 44, 26, 0, Math.PI * 2));
    // eye + brow (looking right)
    c.fillStyle = ol;
    c.beginPath();
    c.ellipse(76, 46, 4, 5.5, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(77.5, 44, 1.6, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(70, 36);
    c.lineTo(82, 38);
    c.stroke();
    // cheek + mouth
    c.fillStyle = 'rgba(255,120,120,0.45)';
    c.beginPath();
    c.ellipse(70, 56, 6, 4, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(82, 56, 4, 0.2 * Math.PI, 0.9 * Math.PI);
    c.stroke();
    // helmet
    c.lineWidth = 4;
    shape('#5E7A3C', () => {
      c.ellipse(60, 32, 30, 22, 0, Math.PI, 0);
      c.closePath();
    });
    shape('#4D6630', () => c.roundRect(28, 30, 66, 9, 4));
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath();
    c.ellipse(50, 20, 9, 4, -0.4, 0, Math.PI * 2);
    c.fill();
  });

  // Rifle, horizontal, pointing right. Origin is the grip (left-center).
  canvasTex(scene, 'blaster', 76, 30, (c) => {
    c.lineJoin = 'round';
    c.strokeStyle = ol;
    c.lineWidth = 3.5;
    c.fillStyle = '#5B4636';
    c.beginPath();
    c.roundRect(2, 10, 26, 14, 5);
    c.fill();
    c.stroke();
    c.fillStyle = '#3B3F47';
    c.beginPath();
    c.roundRect(22, 7, 34, 13, 4);
    c.fill();
    c.stroke();
    c.fillStyle = '#2B2E35';
    c.beginPath();
    c.roundRect(52, 10, 22, 7, 3);
    c.fill();
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(26, 9, 24, 3);
  });
}

function makeBullets(scene: Phaser.Scene): void {
  canvasTex(scene, 'bullet', 18, 40, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 40);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.5, '#FFF3A0');
    g.addColorStop(1, 'rgba(255,210,63,0)');
    c.fillStyle = g;
    c.beginPath();
    c.roundRect(3, 0, 12, 40, 6);
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.roundRect(5, 2, 8, 14, 4);
    c.fill();
  });
  canvasTex(scene, 'muzzle', 48, 48, (c) => {
    c.fillStyle = '#FFF6B0';
    star(c, 24, 24, 5, 23, 9);
    c.fill();
  });
}

export function makeCharacterTextures(scene: Phaser.Scene): void {
  makeSpikes(scene);
  makeHero(scene);
  makeBullets(scene);
}
