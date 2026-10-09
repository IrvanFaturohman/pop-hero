// Entry: Phaser game at 720x1280 logical, FIT scaling, render resolution capped at DPR 2.
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import Phaser from 'phaser';
import { config } from './config';
import { clamp } from './logic/math';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HomeScene } from './scenes/HomeScene';
import { TitleScene } from './scenes/TitleScene';

const L = config.layout;
const parent = document.getElementById('game')!;
const dpr = Math.min(window.devicePixelRatio || 1, L.maxDpr);
const fit = Math.min(parent.clientWidth / L.width, parent.clientHeight / L.height) || 1;
// Render buffer = on-screen CSS size x DPR (<= 2), quantized to keep things crisp but cheap.
const renderScale = clamp(Math.round(fit * dpr * 4) / 4, 0.75, 2);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: L.width * renderScale,
  height: L.height * renderScale,
  backgroundColor: config.palette.earth,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, powerPreference: 'high-performance' },
  input: { activePointers: 1 },
  disableContextMenu: true,
  banner: false,
  scene: [BootScene, TitleScene, HomeScene, GameScene],
});
game.registry.set('renderScale', renderScale);
