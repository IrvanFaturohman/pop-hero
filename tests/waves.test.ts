import { describe, expect, it } from 'vitest';
import { MINION_KINDS, stage1 } from '../src/levels';
import { Rng } from '../src/logic/rng';
import { buildGroups } from '../src/logic/waves';

describe('wave spawning', () => {
  it('is deterministic for a seed', () => {
    for (const w of stage1.waves) expect(buildGroups(w, new Rng(42))).toEqual(buildGroups(w, new Rng(42)));
  });

  it('contains exactly the listed enemies, perTurn per group (0 = the whole wave at once)', () => {
    for (const w of stage1.waves) {
      const groups = buildGroups(w, new Rng(7));
      const all = groups.flat();
      for (const k of MINION_KINDS) expect(all.filter((x) => x === k).length).toBe(w.enemies[k] ?? 0);
      if (w.perTurn === 0) expect(groups).toHaveLength(1);
      else for (const g of groups) expect(g.length).toBeLessThanOrEqual(w.perTurn);
    }
  });

  it('has 10 waves with the elite at 5 and the boss at 10 (reference chapter)', () => {
    expect(stage1.waves).toHaveLength(10);
    expect(stage1.waves[4].boss?.kind).toBe('ratking');
    expect(stage1.waves[9].boss?.kind).toBe('mole');
  });
});
