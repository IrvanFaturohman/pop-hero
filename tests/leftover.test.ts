import { describe, expect, it } from 'vitest';
import { Battle } from '../src/logic/battle';
import { Rng } from '../src/logic/rng';

describe('leftover bullets on wave clear', () => {
  it('carry over to the next wave and do not heal', () => {
    const b = new Battle(new Rng(1));
    b.hp = 50;
    b.ammoPool.add('normal', 57);
    b.recordCarry();
    for (let i = 0; i < 120; i++) b.step(1 / 60);
    expect(b.ammo).toBe(57);
    expect(b.hp).toBe(50);
    expect(b.leftoverPerWave).toEqual([57]);
  });
});
