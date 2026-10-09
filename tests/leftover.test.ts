import { describe, expect, it } from 'vitest';
import { config } from '../src/config';
import { Battle } from '../src/logic/battle';
import { Rng } from '../src/logic/rng';

function runCashIn(b: Battle): void {
  b.startCashIn();
  for (let i = 0; i < 600 && b.cashingIn; i++) b.step(1 / 60);
}

describe('leftover bullets on wave clear', () => {
  it('turn into HP and reset the ammo', () => {
    const b = new Battle(new Rng(1));
    b.hp = 50;
    b.ammoPool.add('normal', 40);
    b.ammoPool.add('fire', 17);
    runCashIn(b);
    expect(b.ammo).toBe(0);
    expect(b.hp).toBe(Math.min(b.maxHp, 50 + Math.floor(57 * config.leftover.hpPerBullet)));
    expect(b.leftoverPerWave).toEqual([57]);
    const done = b.events.filter((e) => e.type === 'cashInDone');
    expect(done).toHaveLength(1);
  });

  it('never heals above max HP', () => {
    const b = new Battle(new Rng(2));
    b.hp = b.maxHp - 3;
    b.ammoPool.add('normal', 200);
    runCashIn(b);
    expect(b.ammo).toBe(0);
    expect(b.hp).toBe(b.maxHp);
    expect(b.hpFromLeftover).toBe(3);
  });

  it('does nothing with an empty pool', () => {
    const b = new Battle(new Rng(3));
    b.startCashIn();
    expect(b.cashingIn).toBe(false);
    expect(b.leftoverPerWave).toEqual([0]);
  });
});
