// Pool of balloon views bound to live balloons, plus freeze-frame "dying" views.
import type Phaser from 'phaser';
import type { Balloon } from '../logic/balloon';
import type { BalloonRoom } from '../logic/room';
import { BalloonView } from './balloonView';

export class BalloonLayer {
  private views: BalloonView[] = [];
  private byId = new Map<number, BalloonView>();
  private dying: BalloonView[] = [];

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, pool = 6) {
    for (let i = 0; i < pool; i++) this.views.push(new BalloonView(scene, layer));
  }

  bind(b: Balloon): BalloonView | null {
    const v = this.views.find((x) => x.id === -1);
    if (!v) return null;
    v.bind(b);
    this.byId.set(b.id, v);
    return v;
  }

  view(id: number): BalloonView | undefined {
    return this.byId.get(id);
  }

  /** Hide now, or after `delay` real seconds of white freeze-frame. */
  release(id: number, delay = 0): void {
    const v = this.byId.get(id);
    if (!v) return;
    this.byId.delete(id);
    if (delay > 0) {
      v.startDying(delay);
      this.dying.push(v);
    } else v.unbind();
  }

  /** Draws all live balloons; returns the highest spike danger (0..1) for room feedback. */
  update(room: BalloonRoom, alpha: number, gameDt: number, realDt: number): number {
    let danger = 0;
    const a = room.attached;
    if (a) {
      this.byId.get(a.id)?.update(a, alpha, gameDt);
      danger = a.danger;
    }
    for (const b of room.flying) {
      if (b.state === 'done') continue;
      this.byId.get(b.id)?.update(b, alpha, gameDt);
      danger = Math.max(danger, b.danger);
    }
    for (let i = this.dying.length - 1; i >= 0; i--) {
      if (!this.dying[i].updateDying(realDt)) this.dying.splice(i, 1);
    }
    return room.field.enabled ? danger : 0;
  }
}
