import { describe, expect, it } from 'vitest';
import { config } from '../src/config';
import { Balloon } from '../src/logic/balloon';
import { Claw } from '../src/logic/claw';
import { Rng } from '../src/logic/rng';

function dug(): Claw {
  const c = new Claw();
  c.dig(new Rng(3), false);
  for (let i = 0; i < 120; i++) c.step(1 / 60);
  return c;
}

describe('Digger Mole claw', () => {
  it('digs in from a side wall and reaches into the room', () => {
    const c = dug();
    const L = config.layout;
    expect(c.grow).toBe(1);
    expect(c.y).toBeGreaterThanOrEqual(config.claw.yMin);
    expect(c.y).toBeLessThanOrEqual(config.claw.yMax);
    const reachIn = c.side < 0 ? c.tipX - L.roomLeft : L.roomRight - c.tipX;
    expect(reachIn).toBeGreaterThan(200);
    expect(c.clearance(c.tipX, c.y)).toBeLessThan(0);
    expect(c.clearance(L.width / 2, L.roomBottom - 5)).toBeGreaterThan(0);
  });

  it('pushes released balloons out and moves to the other wall next turn', () => {
    const c = dug();
    const b = new Balloon('normal', c.tipX, c.y);
    b.setAir(0.5, { inflateMult: 1, rMaxMult: 1, ammoMult: 1 });
    c.pushOut(b);
    expect(c.clearance(b.x, b.y)).toBeGreaterThanOrEqual(b.r - config.balloon.squish - 0.5);
    const side = c.side;
    c.dig(new Rng(9), false);
    for (let i = 0; i < 120; i++) c.step(1 / 60);
    expect(c.side).toBe(-side);
  });
});
