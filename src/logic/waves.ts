// Waves for the turn-based battle: each wave's enemies are shuffled (seeded) and split into groups
// that walk in one group per enemy turn (perTurn 0 = the whole wave walks in at once, reference).
// Pure logic.
import { MINION_KINDS, type EnemyKind, type StageDef, type WaveDef } from '../levels';
import type { Rng } from './rng';

/** Shuffled enemy groups for a wave, `perTurn` each. Deterministic for a seed. */
export function buildGroups(wave: WaveDef, rng: Rng): EnemyKind[][] {
  const kinds: EnemyKind[] = [];
  for (const k of MINION_KINDS) {
    for (let i = 0; i < (wave.enemies[k] ?? 0); i++) kinds.push(k);
  }
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  const groups: EnemyKind[][] = [];
  const per = wave.perTurn > 0 ? wave.perTurn : Math.max(1, kinds.length);
  for (let i = 0; i < kinds.length; i += per) groups.push(kinds.slice(i, i + per));
  return groups;
}

export class WaveRunner {
  /** 0-based index of the current wave. */
  index = 0;
  groups: EnemyKind[][] = [];
  private next = 0;
  private total = 0;

  constructor(
    readonly stage: StageDef,
    private rng: Rng,
  ) {
    this.load(0);
  }

  get wave(): WaveDef {
    return this.stage.waves[this.index];
  }

  get waveCount(): number {
    return this.stage.waves.length;
  }

  get hasMoreGroups(): boolean {
    return this.next < this.groups.length;
  }

  /** Enemies of the next group to walk in (empty if none left). */
  takeGroup(): EnemyKind[] {
    return this.hasMoreGroups ? this.groups[this.next++] : [];
  }

  get isLast(): boolean {
    return this.index >= this.waveCount - 1;
  }

  /** Advance to the next wave; false if the stage is done. */
  nextWave(): boolean {
    if (this.index + 1 >= this.waveCount) return false;
    this.load(this.index + 1);
    return true;
  }

  /** Debug: jump to wave i (0-based). */
  goTo(i: number): void {
    this.load(Math.max(0, Math.min(this.waveCount - 1, i)));
  }

  /** Debug: drop the remaining groups of this wave. */
  skipGroups(): void {
    this.next = this.groups.length;
  }

  /** Fraction of the stage done, for the HUD progress bar. */
  progress(alive: number, cleared: boolean): number {
    let spawned = 0;
    for (let i = 0; i < this.next; i++) spawned += this.groups[i].length;
    const killed = Math.max(0, spawned - alive);
    const inWave = cleared ? 1 : this.total > 0 ? killed / this.total : 0;
    return (this.index + inWave) / this.waveCount;
  }

  private load(i: number): void {
    this.index = i;
    this.groups = buildGroups(this.wave, this.rng);
    this.next = 0;
    this.total = this.groups.reduce((n, g) => n + g.length, 0);
  }
}
