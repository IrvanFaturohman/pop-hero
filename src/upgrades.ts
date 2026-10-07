// Upgrade cards offered after each wave (pick 1 of 3). Stackable unless `unique`.
// Brief list, adapted to the turn-based battle: "Rapid Fire" (volley speed only) became
// "Critical Shot", the crit-chance ability from the reference.
import { config } from './config';
import type { Battle } from './logic/battle';
import type { Rng } from './logic/rng';
import type { BalloonRoom } from './logic/room';

export type Rarity = 'common' | 'rare' | 'epic';

export interface UpgradeCtx {
  room: BalloonRoom;
  battle: Battle;
}

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  rarity: Rarity;
  /** Icon drawn on the card (see view/cardIcons.ts). */
  icon: string;
  unique?: boolean;
  apply(c: UpgradeCtx): void;
}

export const upgrades: UpgradeDef[] = [
  { id: 'sharp', name: 'Sharp Bullets', desc: '+1 bullet damage', rarity: 'common', icon: 'bullet', apply: (c) => (c.battle.damageBonus += 1) },
  { id: 'crit', name: 'Critical Shot', desc: '+15% chance a bullet deals double damage', rarity: 'common', icon: 'crit', apply: (c) => (c.battle.critChance += 0.15) },
  { id: 'lungs', name: 'Big Lungs', desc: 'Blow balloons 20% faster', rarity: 'common', icon: 'wind', apply: (c) => (c.room.mods.inflateMult *= 1.2) },
  { id: 'nearpro', name: 'Near-Miss Pro', desc: 'CLOSE! gives +5 extra bullets', rarity: 'common', icon: 'bolt', apply: (c) => (c.room.mods.nearMissExtra += 5) },
  { id: 'vampire', name: 'Vampire Air', desc: 'Heal 1 HP for every 10 bullets you collect', rarity: 'common', icon: 'heart', apply: (c) => (c.battle.vampire += 0.1) },
  { id: 'rubber', name: 'Thick Rubber', desc: 'Each balloon survives one spike touch', rarity: 'rare', icon: 'shield', apply: (c) => (c.room.mods.shields += 1) },
  { id: 'greedy', name: 'Greedy', desc: '+25% bullets from tier 3+ balloons', rarity: 'rare', icon: 'coins', apply: (c) => (c.room.mods.greedy += 1) },
  { id: 'gears', name: 'Slow Gears', desc: 'All spikes move 15% slower', rarity: 'rare', icon: 'gear', apply: (c) => (c.room.field.modMult *= 0.85) },
  { id: 'pierce', name: 'Pierce', desc: 'Bullets go through 1 more enemy', rarity: 'rare', icon: 'arrow', apply: (c) => (c.battle.pierce += 1) },
  { id: 'pressure', name: 'Max Pressure', desc: 'Balloons grow 10% bigger (more bullets)', rarity: 'rare', icon: 'gauge', apply: (c) => (c.room.mods.rMaxMult *= 1.1) },
  { id: 'twin', name: 'Twin Shot', desc: 'Every bullet fires twice', rarity: 'epic', icon: 'twin', apply: (c) => (c.battle.twin += 1) },
];

/** Three different cards, weighted by rarity; unique cards already taken are skipped. */
export function rollCards(rng: Rng, taken: readonly string[], count = 3): UpgradeDef[] {
  const w = config.cards.rarityWeights;
  const pool = upgrades.filter((u) => !(u.unique && taken.includes(u.id)));
  const out: UpgradeDef[] = [];
  while (out.length < count && pool.length > 0) {
    let total = 0;
    for (const u of pool) total += w[u.rarity];
    let roll = rng.next() * total;
    let pick = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      roll -= w[pool[i].rarity];
      if (roll < 0) {
        pick = i;
        break;
      }
    }
    out.push(pool[pick]);
    pool.splice(pick, 1);
  }
  return out;
}
