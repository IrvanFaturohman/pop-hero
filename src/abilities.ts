// Ability cards between waves (reference: "Select a new ability"). Nine abilities with 3 levels
// each; taking a card again levels it up. Level 1 is free, levels 2-3 cost yellow stars, and a
// maxed ability can evolve (red card, red stars). Stars come from star balloons during the run.
// "Claw Size" from the reference becomes Balloon Power (more bullets per balloon).
import { config } from './config';
import { baseMods, type HeroMods } from './logic/battleTypes';
import type { Rng } from './logic/rng';

export type AbilityId = 'multishot' | 'attack' | 'bounce' | 'lifesteal' | 'power' | 'critChance' | 'critDamage' | 'health' | 'knockback';
export type EvoId = 'execution' | 'ricochet' | 'secondWind';

export const MAX_LEVEL = 3;

export interface AbilityDef {
  id: AbilityId;
  name: string;
  /** Icon drawn on the card (see view/cardIcons.ts). */
  icon: string;
  /** Description of levels 1..3. */
  desc: [string, string, string];
}

export interface EvoDef {
  id: EvoId;
  from: AbilityId;
  name: string;
  icon: string;
  desc: string;
}

/** Values per level (index 0 = not taken). */
export const values = {
  extraShots: [0, 1, 2, 2],
  extraMult: [0, 0.3, 0.3, 0.5],
  attack: [0, 0.15, 0.3, 0.5],
  bounces: [0, 1, 2, 2],
  bounceMult: [0, 0.3, 0.3, 0.5],
  lifesteal: [0, 0.03, 0.05, 0.08],
  power: [0, 0.1, 0.2, 0.3],
  critChance: [0, 0.05, 0.1, 0.15],
  critDamage: [0, 0.2, 0.35, 0.5],
  health: [0, 0.2, 0.4, 0.6],
  stun: [0, 0.1, 0.2, 0.3],
};

const pct = (v: number) => `${Math.round(v * 100)}%`;
const per = (k: keyof typeof values, f: (v: number, l: number) => string): [string, string, string] => [
  f(values[k][1], 1),
  f(values[k][2], 2),
  f(values[k][3], 3),
];

export const abilities: AbilityDef[] = [
  { id: 'multishot', name: 'Multishot', icon: 'twin', desc: [1, 2, 3].map((l) => `${values.extraShots[l]} extra bullet shot(s). Extra shots deal ${pct(values.extraMult[l])} damage`) as [string, string, string] },
  { id: 'attack', name: 'Attack Damage', icon: 'bullet', desc: per('attack', (v) => `Damage of all attacks +${pct(v)}`) },
  { id: 'bounce', name: 'Bounce', icon: 'arrow', desc: [1, 2, 3].map((l) => `Bullets bounce ${values.bounces[l]} time(s). Each bounce deals ${pct(values.bounceMult[l])} damage`) as [string, string, string] },
  { id: 'lifesteal', name: 'Lifesteal', icon: 'heart', desc: per('lifesteal', (v) => `Hero restores ${pct(v)} health upon enemy death`) },
  { id: 'power', name: 'Balloon Power', icon: 'gauge', desc: per('power', (v) => `Balloons carry +${pct(v)} bullets`) },
  { id: 'critChance', name: 'Crit Chance', icon: 'crit', desc: per('critChance', (v) => `Bullet crit chance +${pct(v)}`) },
  { id: 'critDamage', name: 'Crit Damage', icon: 'bolt', desc: per('critDamage', (v) => `Critical damage +${pct(v)}`) },
  { id: 'health', name: 'Health Boost', icon: 'shield', desc: per('health', (v) => `Max health +${pct(v)}`) },
  { id: 'knockback', name: 'Knockback', icon: 'wind', desc: per('stun', (v) => `Bullets knock back small enemies: ${pct(v)} chance they lose their next attack`) },
];

export const evolutions: EvoDef[] = [
  { id: 'execution', from: 'critChance', name: 'Execution', icon: 'crit', desc: 'Critical hits execute enemies under 30% health' },
  { id: 'ricochet', from: 'bounce', name: 'Ricochet', icon: 'arrow', desc: 'Bullets bounce 4 times. Each bounce deals 80% damage' },
  { id: 'secondWind', from: 'health', name: 'Second Wind', icon: 'shield', desc: 'Once per run, survive a fatal hit with 40% health' },
];

export function abilityDef(id: AbilityId): AbilityDef {
  return abilities.find((a) => a.id === id)!;
}

/** Stars collected this run (reference HUD: red and yellow star counters). */
export interface Wallet {
  stars: number;
  redStars: number;
}

/** Levels and evolutions owned this run. */
export class AbilitySet {
  readonly levels = new Map<AbilityId, number>();
  readonly evos = new Set<EvoId>();
  /** Pick order for telemetry, e.g. "attack:2", "evo:execution". */
  readonly history: string[] = [];

  level(id: AbilityId): number {
    return this.levels.get(id) ?? 0;
  }

  has(evo: EvoId): boolean {
    return this.evos.has(evo);
  }

  /** Owned abilities in pick order (HUD icons). */
  owned(): AbilityId[] {
    return [...this.levels.keys()];
  }
}

export type Card =
  | { kind: 'level'; def: AbilityDef; level: number; stars: number; redStars: number }
  | { kind: 'evo'; def: EvoDef; level: number; stars: number; redStars: number };

export function cardName(c: Card): string {
  return c.def.name;
}

export function cardDesc(c: Card): string {
  return c.kind === 'level' ? c.def.desc[c.level - 1] : c.def.desc;
}

export function canAfford(c: Card, w: Wallet): boolean {
  return w.stars >= c.stars && w.redStars >= c.redStars;
}

function candidates(set: AbilitySet): Array<{ card: Card; weight: number }> {
  const cc = config.cards;
  const out: Array<{ card: Card; weight: number }> = [];
  for (const def of abilities) {
    const lv = set.level(def.id);
    if (lv >= MAX_LEVEL) continue;
    const next = lv + 1;
    out.push({ card: { kind: 'level', def, level: next, stars: cc.price[next] ?? 0, redStars: 0 }, weight: lv > 0 ? cc.upgradeWeight : 1 });
  }
  for (const def of evolutions) {
    if (set.level(def.from) < MAX_LEVEL || set.has(def.id)) continue;
    out.push({ card: { kind: 'evo', def, level: 1, stars: 0, redStars: cc.evoPrice }, weight: cc.evoWeight });
  }
  return out;
}

/**
 * Three different cards, weighted (level-ups and evolutions a bit more likely). At least one is
 * affordable whenever any affordable card exists; otherwise the picker offers a skip.
 */
export function rollOffer(rng: Rng, set: AbilitySet, wallet: Wallet, count = 3): Card[] {
  const pool = candidates(set);
  const out: Card[] = [];
  while (out.length < count && pool.length > 0) {
    let total = 0;
    for (const p of pool) total += p.weight;
    let roll = rng.next() * total;
    let pick = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      roll -= pool[i].weight;
      if (roll < 0) {
        pick = i;
        break;
      }
    }
    out.push(pool[pick].card);
    pool.splice(pick, 1);
  }
  if (out.length > 0 && !out.some((c) => canAfford(c, wallet))) {
    const cheap = pool.map((p) => p.card).filter((c) => canAfford(c, wallet));
    if (cheap.length > 0) out[out.length - 1] = cheap[Math.floor(rng.next() * cheap.length)];
  }
  return out;
}

/** Pays for the card and records it. Returns false if it can't be afforded. */
export function takeCard(c: Card, set: AbilitySet, w: Wallet): boolean {
  if (!canAfford(c, w)) return false;
  w.stars -= c.stars;
  w.redStars -= c.redStars;
  if (c.kind === 'level') {
    set.levels.set(c.def.id, c.level);
    set.history.push(`${c.def.id}:${c.level}`);
  } else {
    set.evos.add(c.def.id);
    set.history.push(`evo:${c.def.id}`);
  }
  return true;
}

/** Hero numbers for the owned levels and evolutions (recomputed after every pick). */
export function heroMods(set: AbilitySet): HeroMods {
  const m = baseMods();
  const v = values;
  const lv = (id: AbilityId) => set.level(id);
  m.damageMult = 1 + v.attack[lv('attack')];
  m.critChance = v.critChance[lv('critChance')];
  m.critMult += v.critDamage[lv('critDamage')];
  m.extraShots = v.extraShots[lv('multishot')];
  m.extraMult = v.extraMult[lv('multishot')];
  m.bounces = v.bounces[lv('bounce')];
  m.bounceMult = v.bounceMult[lv('bounce')];
  if (set.has('ricochet')) {
    m.bounces = 4;
    m.bounceMult = 0.8;
  }
  m.lifesteal = v.lifesteal[lv('lifesteal')];
  m.stunChance = v.stun[lv('knockback')];
  m.hpMult = 1 + v.health[lv('health')];
  m.execution = set.has('execution');
  m.secondWind = set.has('secondWind');
  return m;
}

/** Balloon Power: bullets per balloon multiplier. */
export function balloonAmmoMult(set: AbilitySet): number {
  return 1 + values.power[set.level('power')];
}
