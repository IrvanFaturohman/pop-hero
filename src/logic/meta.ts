// Out-of-run progression (reference home screen, without energy): runs pay coins, coins buy
// permanent Damage / Health / Armor levels, total levels rank the hero up. Pure logic; storage.ts
// persists the state.
import { config } from '../config';

export type StatId = 'damage' | 'health' | 'armor';
export const STATS: readonly StatId[] = ['damage', 'health', 'armor'];

export interface MetaState {
  coins: number;
  levels: Record<StatId, number>;
  /** Upgrades tab unlocks after the first finished run ("NEW FEATURE!"). */
  upgradesUnlocked: boolean;
  /** The unlock popup was shown. */
  upgradesSeen: boolean;
  runs: number;
  wins: number;
  /** Highest wave reached (1-based). */
  bestWave: number;
}

export function newMeta(): MetaState {
  return { coins: 0, levels: { damage: 0, health: 0, armor: 0 }, upgradesUnlocked: false, upgradesSeen: false, runs: 0, wins: 0, bestWave: 0 };
}

/** Coins for the next level of a stat. */
export function upgradeCost(level: number): number {
  const m = config.meta;
  return m.costBase + m.costGrowth * level + Math.round(2 * level * level);
}

export function totalLevels(meta: MetaState): number {
  return STATS.reduce((n, s) => n + meta.levels[s], 0);
}

/** Rank 1, 2, ... (every `levelsPerRank` levels) and progress toward the next one (0..1). */
export function rankOf(meta: MetaState): { rank: number; progress: number; into: number } {
  const per = config.meta.levelsPerRank;
  const n = totalLevels(meta);
  return { rank: 1 + Math.floor(n / per), progress: (n % per) / per, into: n % per };
}

/** Buys one level; returns the coins of a rank-up reward (0 if none), or -1 if unaffordable. */
export function buyLevel(meta: MetaState, stat: StatId): number {
  const cost = upgradeCost(meta.levels[stat]);
  if (meta.coins < cost) return -1;
  const before = rankOf(meta).rank;
  meta.coins -= cost;
  meta.levels[stat]++;
  const reward = rankOf(meta).rank > before ? config.meta.rankReward : 0;
  meta.coins += reward;
  return reward;
}

/** Coins paid at the end of a run. */
export function runReward(wavesCleared: number, won: boolean): number {
  const m = config.meta;
  return wavesCleared * m.coinsPerWave + (won ? m.winBonus : 0);
}

/** Records a finished run (coins, counters, unlocks) and returns the coins earned. */
export function finishRun(meta: MetaState, wavesCleared: number, waveReached: number, won: boolean): number {
  const coins = runReward(wavesCleared, won);
  meta.coins += coins;
  meta.runs++;
  if (won) meta.wins++;
  meta.bestWave = Math.max(meta.bestWave, waveReached);
  meta.upgradesUnlocked = true;
  return coins;
}

/** Hero numbers at the start of a run. */
export interface HeroBase {
  bulletDamage: number;
  maxHp: number;
  armor: number;
}

export function heroBase(meta: MetaState): HeroBase {
  const m = config.meta;
  return {
    bulletDamage: config.hero.bulletDamage + meta.levels.damage * m.damagePerLevel,
    maxHp: config.hero.hp + meta.levels.health * m.healthPerLevel,
    armor: meta.levels.armor * m.armorPerLevel,
  };
}

/** Per-level bonus text for the upgrade cards. */
export function statBonus(stat: StatId): number {
  const m = config.meta;
  return stat === 'damage' ? m.damagePerLevel : stat === 'health' ? m.healthPerLevel : m.armorPerLevel;
}
