// Cameras for the game scene: the main camera shows the logical 720x1280 world at the render
// scale, zooms into the battle while the hero fires / enemies act (reference) and applies the
// screen shake; a second, unzoomed camera draws only the UI layer.
import type Phaser from 'phaser';
import { config } from '../config';
import type { Shake } from '../juice/shake';

export class CameraRig {
  private zoom = 1;
  private cy: number;
  private targetZoom = 1;
  private targetCY: number;

  constructor(
    private scene: Phaser.Scene,
    private rs: number,
    ui: Phaser.GameObjects.Layer,
    world: Phaser.GameObjects.Layer[],
  ) {
    const L = config.layout;
    this.cy = this.targetCY = config.camera.blowCenterY;
    const cam = scene.cameras.main;
    cam.setZoom(rs).centerOn(L.width / 2, L.height / 2);
    const uiCam = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height);
    uiCam.setZoom(rs).centerOn(L.width / 2, L.height / 2);
    cam.ignore(ui);
    uiCam.ignore(world);
  }

  /** Zoom into the battle strip (true) or pan down onto the balloon room (false). */
  battle(on: boolean): void {
    this.targetZoom = on ? config.camera.battleZoom : 1;
    this.targetCY = on ? config.camera.battleCenterY : config.camera.blowCenterY;
  }

  /** World y minus screen y at zoom 1 (taps in the room are converted with it). */
  get offsetY(): number {
    return this.cy - config.layout.height / 2;
  }

  update(realDt: number, shake: Shake): void {
    const L = config.layout;
    const k = Math.min(1, realDt * config.camera.speed);
    this.zoom += (this.targetZoom - this.zoom) * k;
    this.cy += (this.targetCY - this.cy) * k;
    const cam = this.scene.cameras.main;
    cam.setZoom(this.rs * this.zoom);
    cam.centerOn(L.width / 2 - shake.offsetX, this.cy - shake.offsetY);
    cam.setRotation(shake.rotation);
  }
}
