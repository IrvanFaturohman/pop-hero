import { describe, expect, it } from 'vitest';
import { patterns, stage1 } from '../src/levels';
import { validatePattern } from '../src/logic/validator';

describe('spike pattern validator', () => {
  for (const id of Object.keys(patterns)) {
    it(`pattern ${id} passes`, () => {
      const res = validatePattern(patterns[id], stage1.earlyPatterns.includes(id));
      const line = res.rows.map((r) => `${r.air}:${Math.round(r.pct * 100)}%`).join(' ');
      console.log(`${id.padEnd(6)} period=${res.period.toFixed(2)}s  ${line}  ${res.reasons.join('; ')}`);
      expect(res.reasons).toEqual([]);
    });
  }
});
