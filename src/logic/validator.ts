// Spike pattern validator: headless simulation of tap + inflate + release, averaged over
// several tap points and many spike phases.
import { FIXED_DT, config } from '../config';
import { Balloon, defaultMods } from './balloon';
import { SpikeField, patternPeriod, type SpikePattern } from './spikes';

// The brief's thresholds (0.9 / 0.7) were made for spinners with a fixed spawn. With bouncing
// spikes and blind releases even small balloons can be crossed by a ball, so they are lowered.
export const validatorRules = {
  /** air 0.3 survival for early patterns (waves 1-3). */
  smallEarly: 0.6,
  /** air 0.3 survival afterwards. */
  smallLate: 0.4,
  /** air 0.9 survival range: risky but possible. Released balloons are spike-proof now, so only
   * inflating is at risk; the turn's lock number is what pushes players to blow big. */
  bigMin: 0.05,
  bigMax: 0.65,
};

export interface ValidatorRow {
  air: number;
  survived: number;
  total: number;
  pct: number;
}

export interface ValidatorResult {
  id: string;
  name: string;
  period: number;
  rows: ValidatorRow[];
  pass: boolean;
  reasons: string[];
}

function hits(field: SpikeField, b: Balloon): boolean {
  return field.clearance(b.x, b.y) - b.hitR < 0;
}

/**
 * Taps at (tapX, tapY) at spike time `t0` and inflates up to `air` without moving.
 * Returns true if it survived (once released it is spike-proof).
 */
export function simulateRelease(pattern: SpikePattern, air: number, t0: number, tapX: number, tapY: number): boolean {
  const dt = FIXED_DT;
  const field = new SpikeField();
  field.setPattern(pattern, false);
  const warm = Math.round(t0 / dt);
  for (let i = 0; i < warm; i++) field.step(dt);

  const mods = defaultMods();
  const b = new Balloon('normal', tapX, tapY);
  b.setAir(0, mods);
  if (hits(field, b)) return false;
  const rate = config.balloon.inflateRate;
  const steps = Math.max(1, Math.round(air / rate / dt));
  for (let i = 0; i < steps; i++) {
    field.step(dt);
    b.setAir(Math.min(air, b.air + rate * dt), mods);
    if (hits(field, b)) return false;
  }
  // released balloons are spike-proof (spikes bounce off them): only inflating is at risk
  return true;
}

export function validatePattern(pattern: SpikePattern, early: boolean): ValidatorResult {
  const phases = config.spikes.validatorPhases;
  const period = patternPeriod(pattern, config.spikes.speedMult);
  const rows: ValidatorRow[] = [];
  const taps = config.spikes.validatorTaps;
  for (const air of config.spikes.validatorAirs) {
    let survived = 0;
    for (const [tx, ty] of taps) {
      for (let i = 0; i < phases; i++) {
        if (simulateRelease(pattern, air, (i / phases) * period, tx, ty)) survived++;
      }
    }
    const total = phases * taps.length;
    rows.push({ air, survived, total, pct: survived / total });
  }

  const reasons: string[] = [];
  const small = rows.find((r) => Math.abs(r.air - 0.3) < 1e-6);
  const big = rows.find((r) => Math.abs(r.air - 0.9) < 1e-6);
  const minSmall = early ? validatorRules.smallEarly : validatorRules.smallLate;
  if (small && small.pct < minSmall) {
    reasons.push(`air 0.3 survives ${pct(small.pct)} < ${pct(minSmall)}`);
  }
  if (big && (big.pct < validatorRules.bigMin || big.pct > validatorRules.bigMax)) {
    reasons.push(`air 0.9 survives ${pct(big.pct)}, want ${pct(validatorRules.bigMin)}-${pct(validatorRules.bigMax)}`);
  }
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].pct > rows[i - 1].pct) {
      reasons.push(`survival rises from air ${rows[i - 1].air} to ${rows[i].air}`);
    }
  }
  return { id: pattern.id, name: pattern.name, period, rows, pass: reasons.length === 0, reasons };
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
