import { describe, expect, it } from 'vitest';
import { AbilitySet, MAX_LEVEL, abilities, canAfford, heroMods, rollOffer, takeCard, type Card, type Wallet } from '../src/abilities';
import { config } from '../src/config';
import { Rng } from '../src/logic/rng';

const levelCard = (set: AbilitySet, id: string): Card => {
  const def = abilities.find((a) => a.id === id)!;
  const level = set.level(def.id) + 1;
  return { kind: 'level', def, level, stars: config.cards.price[level], redStars: 0 };
};

describe('ability cards', () => {
  it('level 1 is free, levels 2 and 3 cost yellow stars', () => {
    const set = new AbilitySet();
    const w: Wallet = { stars: 0, redStars: 0 };
    expect(takeCard(levelCard(set, 'attack'), set, w)).toBe(true);
    expect(set.level('attack')).toBe(1);
    expect(canAfford(levelCard(set, 'attack'), w)).toBe(false);
    w.stars = 4;
    expect(takeCard(levelCard(set, 'attack'), set, w)).toBe(true);
    expect(w.stars).toBe(4 - config.cards.price[2]);
    expect(takeCard(levelCard(set, 'attack'), set, w)).toBe(true);
    expect(set.level('attack')).toBe(MAX_LEVEL);
    expect(w.stars).toBe(4 - config.cards.price[2] - config.cards.price[3]);
  });

  it('offers 3 different cards, at least one affordable, evolutions only after level 3', () => {
    const set = new AbilitySet();
    const w: Wallet = { stars: 0, redStars: 0 };
    for (let seed = 1; seed < 40; seed++) {
      const offer = rollOffer(new Rng(seed), set, w);
      expect(offer).toHaveLength(3);
      expect(new Set(offer.map((c) => c.def.id)).size).toBe(3);
      expect(offer.some((c) => canAfford(c, w))).toBe(true);
      expect(offer.every((c) => c.kind === 'level')).toBe(true);
    }
    set.levels.set('critChance', MAX_LEVEL);
    let sawEvo = false;
    for (let seed = 1; seed < 60; seed++) sawEvo ||= rollOffer(new Rng(seed), set, { stars: 9, redStars: 1 }).some((c) => c.kind === 'evo');
    expect(sawEvo).toBe(true);
  });

  it('turns levels into hero numbers', () => {
    const set = new AbilitySet();
    set.levels.set('attack', 2);
    set.levels.set('multishot', 1);
    set.levels.set('health', 1);
    set.evos.add('execution');
    const m = heroMods(set);
    expect(m.damageMult).toBeCloseTo(1.3);
    expect(m.extraShots).toBe(1);
    expect(m.extraMult).toBeCloseTo(0.3);
    expect(m.hpMult).toBeCloseTo(1.2);
    expect(m.execution).toBe(true);
  });
});
