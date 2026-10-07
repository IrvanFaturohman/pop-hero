// Page-level singletons that outlive scene restarts: the input controller and the debug panel.
import Phaser from 'phaser';
import { synth } from '../audio/synth';
import { DebugPanel, type DebugHooks } from '../debug/panel';
import { InputController } from '../input';
import { PAUSE_BTN } from '../view/hud';

const CORNER = 100; // top-left debug hotspot (px)

let input: InputController | null = null;
let debug: DebugPanel | null = null;

export function getInput(): InputController | null {
  return input;
}

export function getDebug(): DebugPanel | null {
  return debug;
}

/**
 * Wires one-finger input + auto-pause for this scene run.
 * Pointer cancel / hidden tab / window blur pause the game without releasing the balloon.
 */
export function setupInput(scene: Phaser.Scene, uiLayer: Phaser.GameObjects.Layer, onPause: () => void): InputController {
  if (!input) input = new InputController(scene.game.canvas);
  const inp = input;
  inp.forget();
  inp.enabled = true;
  inp.blockers = [
    (x, y) => x < CORNER && y < CORNER,
    (x, y) => Math.hypot(x - PAUSE_BTN.x, y - PAUSE_BTN.y) < PAUSE_BTN.r + 18,
  ];
  inp.onGesture = () => synth.unlock();
  inp.onCancel = onPause;
  const onHide = () => {
    if (document.hidden) {
      onPause();
      synth.suspend();
    } else synth.resume();
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('blur', onPause);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('blur', onPause);
  });

  // debug hotspot: tap the top-left corner 3x
  let taps: number[] = [];
  const zone = scene.add.zone(CORNER / 2, CORNER / 2, CORNER, CORNER).setInteractive();
  uiLayer.add(zone);
  zone.on('pointerdown', () => {
    const now = scene.time.now;
    taps = taps.filter((t) => now - t < 1000);
    taps.push(now);
    if (taps.length >= 3) {
      taps = [];
      debug?.toggle();
    }
  });
  return inp;
}

export function setupDebug(hooks: DebugHooks): void {
  if (!debug) {
    debug = new DebugPanel(hooks);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyD') debug?.toggle();
    });
  } else debug.setHooks(hooks);
}
