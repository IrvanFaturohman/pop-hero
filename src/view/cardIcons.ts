// Simple icons for the upgrade cards, drawn with Graphics around (0, 0), ~80 px.
import type Phaser from 'phaser';
import { config, hex } from '../config';

type G = Phaser.GameObjects.Graphics;

const OL = () => hex(config.palette.outline);
const GOLD = () => hex(config.palette.gold);

function bullet(g: G, x: number, y: number, s = 1): void {
  g.fillStyle(OL(), 1);
  g.fillRoundedRect(x - 12 * s, y - 30 * s, 24 * s, 60 * s, 12 * s);
  g.fillStyle(GOLD(), 1);
  g.fillRoundedRect(x - 8 * s, y - 26 * s, 16 * s, 52 * s, 8 * s);
  g.fillStyle(0xffffff, 0.6);
  g.fillRect(x - 4 * s, y - 20 * s, 4 * s, 22 * s);
}

const draw: Record<string, (g: G) => void> = {
  bullet: (g) => {
    bullet(g, 0, 0);
    g.fillStyle(0xff3b3b, 1);
    g.fillTriangle(16, -30, 30, -30, 23, -42);
    g.fillRect(20, -30, 6, 14);
  },
  crit: (g) => {
    g.lineStyle(6, 0xff3b3b, 1);
    g.strokeCircle(0, 0, 30);
    g.strokeCircle(0, 0, 14);
    g.lineBetween(-40, 0, -18, 0);
    g.lineBetween(18, 0, 40, 0);
    g.lineBetween(0, -40, 0, -18);
    g.lineBetween(0, 18, 0, 40);
    g.fillStyle(GOLD(), 1);
    g.fillCircle(0, 0, 6);
  },
  wind: (g) => {
    g.lineStyle(7, 0xffffff, 1);
    for (const [y, w] of [[-18, 50], [0, 64], [18, 44]]) {
      g.beginPath();
      g.arc(-30 + w, y - 8, 8, Math.PI / 2, -Math.PI / 2, true);
      g.strokePath();
      g.lineBetween(-34, y, -30 + w, y);
    }
  },
  bolt: (g) => {
    g.fillStyle(OL(), 1);
    g.fillPoints([{ x: 8, y: -42 }, { x: -24, y: 6 }, { x: -2, y: 6 }, { x: -10, y: 42 }, { x: 26, y: -8 }, { x: 4, y: -8 }], true);
    g.fillStyle(GOLD(), 1);
    g.fillPoints([{ x: 6, y: -34 }, { x: -18, y: 2 }, { x: 2, y: 2 }, { x: -4, y: 32 }, { x: 20, y: -4 }, { x: 0, y: -4 }], true);
  },
  heart: (g) => {
    g.fillStyle(0xff3b6b, 1);
    g.fillCircle(-14, -8, 18);
    g.fillCircle(14, -8, 18);
    g.fillTriangle(-31, 0, 31, 0, 0, 34);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(-18, -14, 6);
  },
  shield: (g) => {
    g.fillStyle(OL(), 1);
    g.fillPoints([{ x: 0, y: -40 }, { x: 34, y: -26 }, { x: 28, y: 14 }, { x: 0, y: 40 }, { x: -28, y: 14 }, { x: -34, y: -26 }], true);
    g.fillStyle(0x5be7ff, 1);
    g.fillPoints([{ x: 0, y: -32 }, { x: 26, y: -21 }, { x: 22, y: 11 }, { x: 0, y: 32 }, { x: -22, y: 11 }, { x: -26, y: -21 }], true);
  },
  coins: (g) => {
    for (const [x, y] of [[-14, 12], [10, 4], [-4, -14]]) {
      g.fillStyle(OL(), 1);
      g.fillCircle(x, y, 20);
      g.fillStyle(GOLD(), 1);
      g.fillCircle(x, y, 16);
      g.fillStyle(0xffffff, 0.5);
      g.fillRect(x - 4, y - 9, 4, 12);
    }
  },
  gear: (g) => {
    g.fillStyle(0xc9d3e6, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillCircle(Math.cos(a) * 28, Math.sin(a) * 28, 9);
    }
    g.fillCircle(0, 0, 28);
    g.fillStyle(OL(), 1);
    g.fillCircle(0, 0, 10);
  },
  arrow: (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(-36, -5, 50, 10);
    g.fillTriangle(10, -18, 10, 18, 38, 0);
    g.lineStyle(6, 0xff3b3b, 1);
    g.strokeCircle(-4, 0, 16);
  },
  gauge: (g) => {
    g.lineStyle(8, 0xffffff, 1);
    g.beginPath();
    g.arc(0, 10, 32, Math.PI, 0);
    g.strokePath();
    g.lineStyle(6, 0xff3b3b, 1);
    g.lineBetween(0, 10, 22, -14);
    g.fillStyle(OL(), 1);
    g.fillCircle(0, 10, 7);
  },
  twin: (g) => {
    bullet(g, -14, 4, 0.8);
    bullet(g, 14, -4, 0.8);
  },
};

export function drawCardIcon(g: G, icon: string): void {
  (draw[icon] ?? draw.bullet)(g);
}
