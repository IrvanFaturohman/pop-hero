// Seeded RNG (mulberry32) so runs can be replayed while debugging.

export class Rng {
  private s: number;
  readonly seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.s = this.seed;
  }

  reset(seed = this.seed): void {
    this.s = seed >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, maxInclusive: number): number {
    return min + Math.floor(this.next() * (maxInclusive - min + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  /** Picks a key by weight. */
  weighted<K extends string>(weights: Readonly<Record<K, number>>, keys: readonly K[]): K {
    let total = 0;
    for (const k of keys) total += Math.max(0, weights[k]);
    let roll = this.next() * total;
    for (const k of keys) {
      roll -= Math.max(0, weights[k]);
      if (roll < 0) return k;
    }
    return keys[keys.length - 1];
  }
}
