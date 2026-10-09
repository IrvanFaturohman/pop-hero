// Generated textures for the later enemies, all facing left (toward the hero): bat (flier), bear
// (brute) and the Digger Mole (chapter boss: miner helmet, big digging claws). Original designs.
import { config } from '../config';
import { css, shade } from './color';

type Ctx = CanvasRenderingContext2D;

/** Fill + outline helper. */
export function blob(c: Ctx, fill: string, draw: () => void): void {
  c.fillStyle = fill;
  c.beginPath();
  draw();
  c.fill();
  c.stroke();
}

function dot(c: Ctx, color: string, x: number, y: number, r: number): void {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

/** Bat: round purple body, scalloped wings, big ears, one fang. */
export function bat(c: Ctx, cx: number, cy: number, r: number): void {
  const col = config.palette.flier;
  const body = css(parseInt(col.slice(1), 16));
  const dark = css(shade(parseInt(col.slice(1), 16), -0.3));
  const wing = (dir: number) =>
    blob(c, dark, () => {
      c.moveTo(cx + dir * r * 0.3, cy - r * 0.3);
      c.quadraticCurveTo(cx + dir * r * 1.2, cy - r * 1.0, cx + dir * r * 1.25, cy - r * 0.05);
      c.quadraticCurveTo(cx + dir * r * 1.05, cy + r * 0.05, cx + dir * r * 0.95, cy + r * 0.3);
      c.quadraticCurveTo(cx + dir * r * 0.75, cy + r * 0.1, cx + dir * r * 0.6, cy + r * 0.35);
      c.quadraticCurveTo(cx + dir * r * 0.45, cy + r * 0.1, cx + dir * r * 0.3, cy + r * 0.3);
      c.closePath();
    });
  wing(-1);
  wing(1);
  for (const ex of [-0.38, 0.12]) {
    blob(c, body, () => {
      c.moveTo(cx + r * (ex - 0.14), cy - r * 0.45);
      c.lineTo(cx + r * ex, cy - r * 0.98);
      c.lineTo(cx + r * (ex + 0.2), cy - r * 0.42);
      c.closePath();
    });
  }
  blob(c, body, () => c.arc(cx - r * 0.08, cy - r * 0.05, r * 0.6, 0, Math.PI * 2));
  dot(c, '#FFD23F', cx - r * 0.34, cy - r * 0.15, r * 0.14);
  dot(c, '#FFD23F', cx + r * 0.02, cy - r * 0.15, r * 0.14);
  dot(c, config.palette.outline, cx - r * 0.38, cy - r * 0.15, r * 0.06);
  dot(c, config.palette.outline, cx - r * 0.02, cy - r * 0.15, r * 0.06);
  blob(c, '#ffffff', () => {
    c.moveTo(cx - r * 0.3, cy + r * 0.18);
    c.lineTo(cx - r * 0.22, cy + r * 0.38);
    c.lineTo(cx - r * 0.14, cy + r * 0.18);
    c.closePath();
  });
}

/** Bear: big brown body, round ears, light muzzle, angry brow, claws. */
export function bear(c: Ctx, cx: number, cy: number, r: number): void {
  const col = parseInt(config.palette.brute.slice(1), 16);
  const body = css(col);
  const dark = css(shade(col, -0.3));
  const light = css(shade(col, 0.35));
  const ol = config.palette.outline;
  blob(c, dark, () => c.roundRect(cx - r * 0.55, cy + r * 0.35, r * 0.3, r * 0.45, r * 0.1));
  blob(c, dark, () => c.roundRect(cx + r * 0.4, cy + r * 0.35, r * 0.3, r * 0.45, r * 0.1));
  blob(c, body, () => c.ellipse(cx + r * 0.18, cy, r * 0.95, r * 0.7, 0, 0, Math.PI * 2));
  blob(c, light, () => c.ellipse(cx + r * 0.15, cy + r * 0.2, r * 0.5, r * 0.35, 0, 0, Math.PI * 2));
  blob(c, body, () => c.arc(cx - r * 0.25, cy - r * 0.95, r * 0.2, 0, Math.PI * 2));
  blob(c, body, () => c.arc(cx - r * 0.62, cy - r * 0.42, r * 0.52, 0, Math.PI * 2));
  dot(c, dark, cx - r * 0.25, cy - r * 0.95, r * 0.1);
  blob(c, light, () => c.ellipse(cx - r * 0.98, cy - r * 0.28, r * 0.26, r * 0.2, 0, 0, Math.PI * 2));
  dot(c, ol, cx - r * 1.14, cy - r * 0.34, r * 0.08);
  dot(c, ol, cx - r * 0.8, cy - r * 0.52, r * 0.07);
  c.lineWidth = r * 0.07;
  c.beginPath();
  c.moveTo(cx - r * 0.95, cy - r * 0.68);
  c.lineTo(cx - r * 0.66, cy - r * 0.6);
  c.stroke();
  c.lineWidth = Math.max(3, r * 0.06);
  // claws on the front paw
  c.fillStyle = '#FFF7E6';
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    const x = cx - r * 0.62 + i * r * 0.1;
    c.moveTo(x, cy + r * 0.78);
    c.lineTo(x - r * 0.06, cy + r * 0.92);
    c.lineTo(x + r * 0.05, cy + r * 0.8);
    c.fill();
  }
}

/** Digger Mole: velvet body, yellow miner helmet with a lamp, pink nose, buck teeth, huge claws. */
export function mole(c: Ctx, cx: number, cy: number, r: number): void {
  const col = parseInt(config.palette.mole.slice(1), 16);
  const body = css(col);
  const dark = css(shade(col, -0.35));
  const light = css(shade(col, 0.3));
  blob(c, dark, () => c.ellipse(cx + r * 0.75, cy + r * 0.25, r * 0.22, r * 0.12, 0.6, 0, Math.PI * 2));
  blob(c, body, () => c.ellipse(cx + r * 0.1, cy + r * 0.05, r * 0.95, r * 0.8, 0, 0, Math.PI * 2));
  blob(c, light, () => c.ellipse(cx - r * 0.1, cy + r * 0.3, r * 0.55, r * 0.4, 0, 0, Math.PI * 2));
  // helmet
  blob(c, '#FFC21F', () => {
    c.moveTo(cx - r * 0.85, cy - r * 0.42);
    c.quadraticCurveTo(cx - r * 0.2, cy - r * 1.25, cx + r * 0.55, cy - r * 0.55);
    c.closePath();
  });
  blob(c, '#E09A00', () => c.roundRect(cx - r * 0.95, cy - r * 0.5, r * 1.55, r * 0.14, r * 0.07));
  blob(c, '#F2F2F7', () => c.arc(cx - r * 0.42, cy - r * 0.78, r * 0.17, 0, Math.PI * 2));
  dot(c, '#FFF6A8', cx - r * 0.42, cy - r * 0.78, r * 0.1);
  // squinty eyes, nose, teeth
  c.lineWidth = r * 0.06;
  c.beginPath();
  c.moveTo(cx - r * 0.7, cy - r * 0.22);
  c.lineTo(cx - r * 0.52, cy - r * 0.27);
  c.moveTo(cx - r * 0.25, cy - r * 0.27);
  c.lineTo(cx - r * 0.08, cy - r * 0.22);
  c.stroke();
  c.lineWidth = Math.max(3, r * 0.05);
  blob(c, '#FF8FB1', () => c.ellipse(cx - r * 0.95, cy - r * 0.02, r * 0.22, r * 0.17, 0, 0, Math.PI * 2));
  blob(c, '#ffffff', () => c.roundRect(cx - r * 0.75, cy + r * 0.12, r * 0.22, r * 0.2, r * 0.04));
  // digging claws
  for (const [ox, oy] of [[-1.05, 0.5], [-0.55, 0.62]] as Array<[number, number]>) {
    blob(c, light, () => c.ellipse(cx + r * ox + r * 0.2, cy + r * oy, r * 0.28, r * 0.2, 0, 0, Math.PI * 2));
    c.fillStyle = '#F4EDE4';
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      const y = cy + r * (oy - 0.12 + i * 0.12);
      c.moveTo(cx + r * ox, y - r * 0.05);
      c.lineTo(cx + r * (ox - 0.3), y + r * 0.03);
      c.lineTo(cx + r * ox, y + r * 0.06);
      c.closePath();
      c.fill();
      c.stroke();
    }
  }
}
