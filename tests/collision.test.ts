import { describe, expect, it } from 'vitest';
import { circleCapsule, circleCircle, distPointSegment } from '../src/logic/collision';

describe('collision', () => {
  it('point-segment distance', () => {
    expect(distPointSegment(0, 5, -10, 0, 10, 0)).toBeCloseTo(5);
    expect(distPointSegment(13, 4, -10, 0, 10, 0)).toBeCloseTo(5); // past the end cap
    expect(distPointSegment(3, 4, 0, 0, 0, 0)).toBeCloseTo(5); // degenerate segment
  });

  it('circle vs circle', () => {
    expect(circleCircle(0, 0, 5, 9, 0, 5)).toBe(true);
    expect(circleCircle(0, 0, 5, 10, 0, 5)).toBe(false); // touching is not overlapping
    expect(circleCircle(0, 0, 5, 7, 7, 5)).toBe(true);
  });

  it('circle vs capsule: side, end cap, and miss', () => {
    // capsule from (0,0) to (100,0), radius 5
    expect(circleCapsule(50, 14, 10, 0, 0, 100, 0, 5)).toBe(true);
    expect(circleCapsule(50, 16, 10, 0, 0, 100, 0, 5)).toBe(false);
    expect(circleCapsule(112, 0, 10, 0, 0, 100, 0, 5)).toBe(true);
    expect(circleCapsule(116, 0, 10, 0, 0, 100, 0, 5)).toBe(false);
    expect(circleCapsule(110, 10, 10, 0, 0, 100, 0, 5)).toBe(true); // diagonal to end cap (14.1 < 15)
    expect(circleCapsule(112, 12, 10, 0, 0, 100, 0, 5)).toBe(false); // 16.9 > 15
  });
});
