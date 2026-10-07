// Stage definitions: waves, spike patterns, boss. Structured so more stages can be added.
import type { BalloonType } from './logic/balloon';
import type { SpikePattern } from './logic/spikes';

export type EnemyKind = 'grunt' | 'runner' | 'tank' | 'boss';

export interface WaveDef {
  /** Enemies in this wave (shuffled), arriving `perTurn` at a time on enemy turns. */
  enemies: Partial<Record<EnemyKind, number>>;
  perTurn: number;
  /** Lock number each turn: your balloons must add up to at least this to open it and fire. */
  lock: number;
  pattern: string;
  /** Balloon types that can roll this wave. */
  balloonTypes: BalloonType[];
}

export interface BossDef {
  phase1Pattern: string;
  phase2Pattern: string;
  balloonTypes: BalloonType[];
}

export interface StageDef {
  id: string;
  name: string;
  waves: WaveDef[];
  boss: BossDef;
  /** Validator strictness: patterns used by waves 1-3 use the stricter small-balloon rule. */
  earlyPatterns: string[];
}

/** Bouncing spike start points/directions (spread around the room). */
const B = {
  a: { x: 130, y: 760, angle: 35 },
  b: { x: 590, y: 880, angle: 148 },
  c: { x: 250, y: 1160, angle: 302 },
  d: { x: 520, y: 1200, angle: 222 },
  e: { x: 360, y: 960, angle: 74 },
};

function bouncers(speed: number, ...starts: Array<{ x: number; y: number; angle: number }>): SpikePattern['spikes'] {
  return starts.map((s) => ({ kind: 'bouncer' as const, ...s, speed }));
}

// Spikes are balls bouncing off the room walls (player request, replaces the brief's spinners).
// Validator (9 tap points x 24 phases, inflating only: released balloons are spike-proof),
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

const allTypes: BalloonType[] = ['normal', 'fire', 'ice', 'bomb', 'heal'];

export const stage1: StageDef = {
  id: 'stage1',
  name: 'Stage 1',
  // Turn-based (Claw Master style): smaller than the brief's real-time waves so a run stays ~3-5 min.
  waves: [
    // Hordes: 3 balloons per turn give ~3x the bullets, so enemies come in bigger groups.
    // perTurn tuned so a good turn's bullets get used up (bot telemetry, waves 3-4 had surplus).
    { enemies: { grunt: 12 }, perTurn: 4, lock: 30, pattern: 'w1', balloonTypes: ['normal'] },
    { enemies: { grunt: 12, runner: 6 }, perTurn: 5, lock: 40, pattern: 'w2', balloonTypes: allTypes },
    { enemies: { grunt: 12, runner: 8, tank: 2 }, perTurn: 6, lock: 50, pattern: 'w3', balloonTypes: allTypes },
    { enemies: { grunt: 16, runner: 8, tank: 4 }, perTurn: 8, lock: 55, pattern: 'w4', balloonTypes: allTypes },
    { enemies: { grunt: 20, runner: 12, tank: 4 }, perTurn: 8, lock: 60, pattern: 'w5', balloonTypes: allTypes },
  ],
  boss: { phase1Pattern: 'boss1', phase2Pattern: 'boss2', balloonTypes: allTypes },
  earlyPatterns: ['w1', 'w2', 'w3'],
};

export const stages: StageDef[] = [stage1];
