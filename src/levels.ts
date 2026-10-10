// Stage definitions: waves, spike patterns, bosses. Structured so more stages (chapters) can be added.
import type { BalloonType } from './logic/balloon';
import type { SpikePattern } from './logic/spikes';

/** Rat, bunny, boar, bat, bear, Rat King (elite boss), Digger Mole (chapter boss). */
export type EnemyKind = 'grunt' | 'runner' | 'tank' | 'flier' | 'brute' | 'ratking' | 'mole';
export type BossKind = 'ratking' | 'mole';

export const BOSS_KINDS: readonly EnemyKind[] = ['ratking', 'mole'];
export const MINION_KINDS: readonly EnemyKind[] = ['grunt', 'runner', 'tank', 'flier', 'brute'];

export function isBossKind(kind: EnemyKind): kind is BossKind {
  return kind === 'ratking' || kind === 'mole';
}

export interface WaveBoss {
  kind: BossKind;
  /** Spike pattern once the boss is below half HP. */
  phase2Pattern: string;
}

export interface WaveDef {
  /** Enemies in this wave (shuffled), arriving `perTurn` at a time on enemy turns. */
  enemies: Partial<Record<EnemyKind, number>>;
  /** Enemies walking in per enemy turn; 0 = the whole wave at once (reference). */
  perTurn: number;
  /** Lock number each turn: your balloons must add up to at least this to open it and fire. */
  lock: number;
  pattern: string;
  /** Power-up kinds that can spawn in the balloon room this wave ('normal' adds nothing). */
  balloonTypes: BalloonType[];
  /** Elite / boss wave: the boss drops in behind the group. */
  boss?: WaveBoss;
}

export interface StageDef {
  id: string;
  name: string;
  waves: WaveDef[];
  /** Validator strictness: patterns used by the first waves use the stricter small-balloon rule. */
  earlyPatterns: string[];
}

/** Bouncing spike start points/directions (spread around the room). */
const B = {
  a: { x: 130, y: 760, angle: 35 },
  b: { x: 590, y: 880, angle: 148 },
  c: { x: 250, y: 1160, angle: 302 },
  d: { x: 520, y: 1170, angle: 222 },
  e: { x: 360, y: 960, angle: 74 },
};

function bouncers(speed: number, ...starts: Array<{ x: number; y: number; angle: number }>): SpikePattern['spikes'] {
  return starts.map((s) => ({ kind: 'bouncer' as const, ...s, speed }));
}

// Spikes are balls bouncing off the room walls (player request, replaces the brief's spinners).
// Validator (9 tap points x 24 phases, inflating only: it does not model spikes popping released
// balloons on the way up, so real survival is lower),
// survival at air 0.3/0.5/0.7/0.9 in comments.
export const patterns: Record<string, SpikePattern> = {
  w1: { id: 'w1', name: 'Wave 1', speedMult: 1, spikes: bouncers(200, B.a, B.b) }, // 86/76/66/53
  w2: { id: 'w2', name: 'Wave 2', speedMult: 1, spikes: bouncers(180, B.a, B.b, B.c) }, // 80/69/58/43
  w3: { id: 'w3', name: 'Wave 3', speedMult: 1, spikes: bouncers(210, B.a, B.b, B.c) }, // 81/69/54/40
  w4: { id: 'w4', name: 'Wave 4', speedMult: 1, spikes: bouncers(220, B.a, B.b, B.c, B.d) }, // 74/57/38/24
  w5: { id: 'w5', name: 'Wave 5', speedMult: 1, spikes: bouncers(230, B.a, B.b, B.c, B.d, B.e) }, // 71/49/28/17
  boss1: { id: 'boss1', name: 'Boss phase 1', speedMult: 1, spikes: bouncers(210, B.a, B.b, B.c) }, // 81/69/54/40
  boss2: { id: 'boss2', name: 'Boss phase 2', speedMult: 1.25, spikes: bouncers(200, B.a, B.b, B.c, B.d, B.e) }, // 68/46/28/16
};

const specials: BalloonType[] = ['normal', 'star', 'fire', 'ice', 'bomb', 'heal'];
const allTypes: BalloonType[] = [...specials, 'redstar'];

/**
 * Chapter 1, following the reference walkthrough: 10 short waves of small groups that walk in
 * together, an elite (Rat King) at wave 5 and the chapter boss (Digger Mole) at wave 10. A card
 * pick follows every wave except the last.
 */
export const stage1: StageDef = {
  id: 'stage1',
  name: 'Whisper Woods',
  waves: [
    { enemies: { grunt: 1 }, perTurn: 0, lock: 7, pattern: 'w1', balloonTypes: ['normal', 'star'] },
    { enemies: { grunt: 3 }, perTurn: 0, lock: 8, pattern: 'w1', balloonTypes: specials },
    { enemies: { grunt: 2, tank: 1 }, perTurn: 0, lock: 9, pattern: 'w2', balloonTypes: specials },
    { enemies: { tank: 3 }, perTurn: 0, lock: 10, pattern: 'w2', balloonTypes: allTypes },
    { enemies: { grunt: 4 }, perTurn: 0, lock: 11, pattern: 'w3', balloonTypes: allTypes, boss: { kind: 'ratking', phase2Pattern: 'w4' } },
    { enemies: { tank: 2, flier: 1 }, perTurn: 0, lock: 11, pattern: 'w3', balloonTypes: allTypes },
    { enemies: { grunt: 4, brute: 1 }, perTurn: 0, lock: 12, pattern: 'w3', balloonTypes: allTypes },
    { enemies: { grunt: 3, tank: 2, flier: 2 }, perTurn: 0, lock: 12, pattern: 'w4', balloonTypes: allTypes },
    { enemies: { grunt: 2, tank: 2, brute: 1, runner: 1 }, perTurn: 0, lock: 13, pattern: 'w4', balloonTypes: allTypes },
    // the claw already crowds the room: boss1 spikes (3 balls), phase 2 adds one
    { enemies: { grunt: 3 }, perTurn: 0, lock: 13, pattern: 'boss1', balloonTypes: allTypes, boss: { kind: 'mole', phase2Pattern: 'w4' } },
  ],
  earlyPatterns: ['w1', 'w2', 'w3'],
};

export const stages: StageDef[] = [stage1];
