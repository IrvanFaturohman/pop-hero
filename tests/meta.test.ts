import { describe, expect, it } from 'vitest';
import { config } from '../src/config';
import { Battle } from '../src/logic/battle';
import { baseMods } from '../src/logic/battleTypes';
import { buyLevel, finishRun, heroBase, newMeta, rankOf, runReward, upgradeCost } from '../src/logic/meta';
import { Rng } from '../src/logic/rng';

describe('meta progression', () => {
  it('pays coins per wave cleared plus a win bonus (reference: ~90 at wave 5, ~350 on a win)', () => {
    expect(runReward(4, false)).toBe(4 * config.meta.coinsPerWave);
    expect(runReward(10, true)).toBe(10 * config.meta.coinsPerWave + config.meta.winBonus);
    const m = newMeta();
    const coins = finishRun(m, 4, 5, false);
    expect(m.coins).toBe(coins);
    expect(m.upgradesUnlocked).toBe(true);
    expect(m.bestWave).toBe(5);
  });

  it('buys levels with growing prices and ranks up every 10 levels', () => {
    const m = newMeta();
    m.coins = 100000;
    expect(upgradeCost(1)).toBeGreaterThan(upgradeCost(0));
    let reward = 0;
    for (let i = 0; i < config.meta.levelsPerRank; i++) reward += buyLevel(m, 'health');
    expect(rankOf(m).rank).toBe(2);
    expect(reward).toBe(config.meta.rankReward);
    const poor = newMeta();
    expect(buyLevel(poor, 'damage')).toBe(-1);
  });

  it('feeds the battle: damage, max HP, armor', () => {
    const m = newMeta();
    m.levels = { damage: 2, health: 3, armor: 1 };
    const base = heroBase(m);
    const b = new Battle(new Rng(1), base);
    expect(b.bulletDamage).toBe(config.hero.bulletDamage + 2 * config.meta.damagePerLevel);
    expect(b.maxHp).toBe(config.hero.hp + 3 * config.meta.healthPerLevel);
    expect(b.armor).toBe(config.meta.armorPerLevel);
  });

  it('Health Boost raises max HP and heals the difference; Second Wind saves one fatal hit', () => {
    const b = new Battle(new Rng(1));
    b.hp = 100;
    const m = baseMods();
    m.hpMult = 1.2;
    m.secondWind = true;
    b.setMods(m);
    expect(b.maxHp).toBe(Math.round(config.hero.hp * 1.2));
    expect(b.hp).toBe(100 + b.maxHp - config.hero.hp);
    b.spawnEnemy('brute');
    b.hp = 5;
    b.startEnemyTurn();
    for (let i = 0; i < 120; i++) b.step(1 / 60);
    expect(b.dead).toBe(false);
    expect(b.events.some((e) => e.type === 'secondWind')).toBe(true);
  });
});
