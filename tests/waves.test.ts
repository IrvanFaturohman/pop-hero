import { describe, expect, it } from 'vitest';
import { stage1 } from '../src/levels';
import { Rng } from '../src/logic/rng';
import { buildGroups } from '../src/logic/waves';

describe('wave spawning', () => {
  it('is deterministic for a seed', () => {
    for (const w of stage1.waves) expect(buildGroups(w, new Rng(42))).toEqual(buildGroups(w, new Rng(42)));
  });

  it('contains exactly the listed enemies, at most perTurn per group', () => {
    for (const w of stage1.waves) {
      const groups = buildGroups(w, new Rng(7));
      const all = groups.flat();
      const count = (k: string) => all.filter((x) => x === k).length;
      expect(count('grunt')).toBe(w.enemies.grunt ?? 0);
      expect(count('runner')).toBe(w.enemies.runner ?? 0);
      expect(count('tank')).toBe(w.enemies.tank ?? 0);
      for (const g of groups) expect(g.length).toBeLessThanOrEqual(w.perTurn);
    }
  });
});
