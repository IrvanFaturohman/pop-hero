// Balloon physics (reference: Puff Up). Released balloons float up (buoyancy), bump into each other
// (mass ~ size), push the chain into a bulge and, once the chain snaps, escape upward. The balloon
// being blown is kinematic: it shoves the others and the chain but is never pushed itself.
// Position-based dynamics in the fixed 60 Hz step. Pure logic.
import { config } from '../config';
import type { Balloon } from './balloon';
import type { Claw } from './claw';
import { Rope } from './rope';
import type { SpikeField } from './spikes';

/** Released balloons simulated by physics. */
export function isFree(b: Balloon): boolean {
  return b.state === 'flying' || b.state === 'parked' || b.state === 'escaping';
}

export class BalloonPhysics {
  readonly rope = new Rope();

  /** Call after every balloon's prevX/prevY was saved for this step. */
  step(list: readonly Balloon[], attached: Balloon | null, dt: number, claw?: Claw): void {
    const bc = config.balloon;
    const damp = Math.exp(-bc.drag * dt);
    for (const b of list) {
      if (!isFree(b)) continue;
      b.vy -= (b.state === 'escaping' ? bc.escapeBuoyancy : bc.buoyancy) * dt;
      b.vx *= damp;
      b.vy *= damp;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    this.rope.integrate(dt);
    for (let it = 0; it < config.rope.iterations; it++) {
      this.rope.solve();
      for (const b of list) if (b.state === 'flying' || b.state === 'parked') this.rope.collide(b, false);
      if (attached) this.rope.collide(attached, true);
      this.separate(list, attached);
      if (claw?.active) for (const b of list) if (b.state === 'flying' || b.state === 'parked') claw.pushOut(b);
      for (const b of list) if (isFree(b)) this.walls(b);
    }
    // velocities from the solved positions (keeps collisions soft, no teleports)
    for (const b of list) {
      if (!isFree(b)) continue;
      b.vx = (b.x - b.prevX) / dt;
      b.vy = (b.y - b.prevY) / dt;
    }
  }

  /** A rising balloon has reached the group: it touches the chain or a gathered balloon. */
  joined(b: Balloon, list: readonly Balloon[]): boolean {
    if (this.rope.touches(b)) return true;
    const reach = config.balloon.squish - 2;
    for (const o of list) {
      if (o === b || o.state !== 'parked') continue;
      if (Math.hypot(b.x - o.x, b.y - o.y) < b.r + o.r - reach) return true;
    }
    return false;
  }

  /** Circle separation weighted by inverse mass (~1/r^2); the blown balloon never moves. */
  private separate(list: readonly Balloon[], attached: Balloon | null): void {
    const squish = config.balloon.squish;
    const n = list.length;
    for (let i = -1; i < n; i++) {
      const a = i < 0 ? attached : list[i];
      if (!a || (i >= 0 && !isFree(a))) continue;
      const wa = i < 0 ? 0 : 1 / (a.r * a.r);
      for (let j = i + 1; j < n; j++) {
        const b = list[j];
        if (!isFree(b) || b === a) continue;
        if (a.state === 'escaping' !== (b.state === 'escaping')) continue;
        const wb = 1 / (b.r * b.r);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const overlap = a.r + b.r - squish - d;
        if (overlap <= 0) continue;
        const nx = dx / d;
        const ny = dy / d;
        const sa = wa / (wa + wb);
        const sb = wb / (wa + wb);
        a.x -= nx * overlap * sa;
        a.y -= ny * overlap * sa;
        b.x += nx * overlap * sb;
        b.y += ny * overlap * sb;
      }
    }
  }

  private walls(b: Balloon): void {
    const L = config.layout;
    const w = L.roomRight - L.roomLeft;
    b.x = 2 * b.r >= w ? L.roomLeft + w / 2 : Math.max(L.roomLeft + b.r, Math.min(L.roomRight - b.r, b.x));
    b.y = Math.min(L.roomBottom - b.r, b.y);
    if (b.state !== 'escaping') b.y = Math.max(L.roomInnerTop + b.r, b.y);
  }
}

/**
 * Gathered (and escaping) balloons are safe and solid: bouncing spikes glance off them. Rising
 * balloons are not shoved here, the room checks them for pops instead.
 */
export function shoveSpikes(field: SpikeField, list: readonly Balloon[], onDeflect?: (b: Balloon, x: number, y: number) => void): void {
  if (!field.enabled) return;
  for (const s of field.spikes) {
    for (const b of list) {
      if (b.state !== 'parked' && b.state !== 'escaping') continue;
      if (!s.pushFrom(b.x, b.y, b.hitR)) continue;
      // contact point on the balloon's edge, toward the spike
      const d = Math.hypot(s.bx - b.x, s.by - b.y) || 1;
      onDeflect?.(b, b.x + ((s.bx - b.x) / d) * b.r, b.y + ((s.by - b.y) / d) * b.r);
    }
  }
}
