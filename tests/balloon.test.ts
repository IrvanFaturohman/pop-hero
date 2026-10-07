import { describe, expect, it } from 'vitest';
import { config } from '../src/config';
import { Balloon, ammoFor, bonusAmount, defaultMods, radiusFor, tierFor } from '../src/logic/balloon';
import { Rng } from '../src/logic/rng';
import { BalloonRoom } from '../src/logic/room';
import { Spike } from '../src/logic/spikes';
import { patterns } from '../src/levels';

describe('balloon formulas', () => {
  it('ammo = floor(1 + (ammoMax-1) * air^ammoExp)', () => {
    expect(ammoFor(0)).toBe(1);
    expect(ammoFor(1)).toBe(config.balloon.ammoMax);
    expect(ammoFor(0.5)).toBe(Math.floor(1 + 39 * Math.pow(0.5, 1.5))); // 14
    expect(ammoFor(0.9)).toBe(Math.floor(1 + 39 * Math.pow(0.9, 1.5))); // 34
  });

  it('ammo grows monotonically', () => {
    let prev = 0;
    for (let a = 0; a <= 1; a += 0.01) {
      const v = ammoFor(a);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('tiers at 10 / 20 / 30', () => {
    expect(tierFor(9)).toBe(1);
    expect(tierFor(10)).toBe(2);
    expect(tierFor(19)).toBe(2);
    expect(tierFor(20)).toBe(3);
    expect(tierFor(30)).toBe(4);
    expect(tierFor(40)).toBe(4);
  });

  it('radius spans rMin..rMax', () => {
    expect(radiusFor(0)).toBe(config.balloon.rMin);
    expect(radiusFor(1)).toBe(config.balloon.rMax);
    expect(radiusFor(1, { inflateMult: 1, rMaxMult: 1.1 })).toBeCloseTo(config.balloon.rMax * 1.1);
  });

  it('bonus is at least +1', () => {
    expect(bonusAmount(3, 0.1)).toBe(1);
    expect(bonusAmount(34, 0.1)).toBe(4);
    expect(bonusAmount(34, 0)).toBe(0);
  });
});

describe('room geometry', () => {
  const L = config.layout;

  it('a balloon tapped anywhere in the room stays inside the walls as it grows', () => {
    for (const [tx, ty] of [[L.roomLeft + 1, L.roomBottom - 1], [L.roomRight - 1, L.roomInnerTop + 1], [360, 900]]) {
      const b = new Balloon('normal', tx, ty);
      for (let air = 0; air <= 1; air += 0.05) {
        b.setAir(air, defaultMods());
        expect(b.x - b.r).toBeGreaterThanOrEqual(L.roomLeft - 1e-9);
        expect(b.x + b.r).toBeLessThanOrEqual(L.roomRight + 1e-9);
        expect(b.y - b.r).toBeGreaterThanOrEqual(L.roomInnerTop - 1e-9);
        expect(b.y + b.r).toBeLessThanOrEqual(L.roomBottom + 1e-9);
      }
    }
  });

  it('released balloons float up, push the chain into a bulge, and escape once it snaps', () => {
    const rng = new Rng(1);
    const room = new BalloonRoom(rng);
    room.field.enabled = false;
    room.setLock(999);
    const b = new Balloon('normal', 360, 1100);
    b.setAir(0.6, defaultMods());
    b.launch();
    room.flying.push(b);
    for (let i = 0; i < 180; i++) room.step(1 / 60, { held: false, pressed: false, released: false, x: 0, y: 0 });
    expect(b.state).toBe('parked');
    const rope = room.physics.rope;
    expect(rope.y[rope.mid]).toBeLessThan(L.ropeY - 5); // bulged up by the balloon
    expect(Math.abs(b.x - 360)).toBeLessThan(12); // rose straight up (then settles a little on the curved chain)
    room.snap();
    for (let i = 0; i < 180 && b.state !== 'done'; i++) room.step(1 / 60, { held: false, pressed: false, released: false, x: 0, y: 0 });
    expect(b.state).toBe('done'); // escaped above the hero and burst
  });

  it('a held balloon follows the finger but never leaves the room', () => {
    const b = new Balloon('normal', 360, 1000);
    b.setAir(0.5, defaultMods());
    b.targetX = 2000;
    b.targetY = -500;
    for (let i = 0; i < 120; i++) b.follow(1 / 60);
    expect(b.x + b.r).toBeCloseTo(L.roomRight, 6);
    expect(b.y - b.r).toBeCloseTo(L.roomInnerTop, 6); // can be held up to the ceiling
  });

  it('bouncing spikes stay inside the room for a minute', () => {
    const R = config.spikes.ballRadius;
    for (const p of Object.values(patterns)) {
      for (const def of p.spikes) {
        const s = new Spike(def);
        for (let i = 0; i < 3600; i++) {
          s.step(1 / 60, p.speedMult);
          expect(s.tips[0]).toBeGreaterThanOrEqual(L.roomLeft + R - 1e-6);
          expect(s.tips[0]).toBeLessThanOrEqual(L.roomRight - R + 1e-6);
          expect(s.tips[1]).toBeGreaterThanOrEqual(L.roomInnerTop + R - 1e-6);
          expect(s.tips[1]).toBeLessThanOrEqual(L.roomBottom - R + 1e-6);
        }
      }
    }
  });
});
