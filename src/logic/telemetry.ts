// Per-run playtest stats (brief §12): shown on the result screen, logged as JSON, copyable.
import type { RoomStats } from './room';

export interface RunStats {
  result: 'victory' | 'defeat';
  durationSec: number;
  waveReached: string;
  causeOfDefeat: string | null;
  turns: number;
  balloons: { blown: number; collected: number; poppedWhileBlowing: number; poppedOverinflate: number };
  avgAirAtRelease: number;
  airHistogram: number[];
  close: number;
  perfect: number;
  locksOpened: number;
  locksFailed: number;
  damageTaken: number;
  /** Bullets left at each wave clear (turned into HP). */
  leftoverPerWave: number[];
  hpFromLeftover: number;
  upgrades: string[];
}

export interface RunInfo {
  won: boolean;
  seconds: number;
  wave: string;
  cause: string | null;
  turns: number;
  locksOpened: number;
  locksFailed: number;
  damageTaken: number;
  leftoverPerWave: readonly number[];
  hpFromLeftover: number;
  upgrades: readonly string[];
}

export function buildStats(room: RoomStats, info: RunInfo): RunStats {
  const airs = room.releaseAirs;
  const hist = new Array<number>(10).fill(0);
  for (const a of airs) hist[Math.min(9, Math.floor(a * 10))]++;
  const avg = airs.length > 0 ? airs.reduce((s, a) => s + a, 0) / airs.length : 0;
  return {
    result: info.won ? 'victory' : 'defeat',
    durationSec: Math.round(info.seconds),
    waveReached: info.wave,
    causeOfDefeat: info.won ? null : info.cause,
    turns: info.turns,
    balloons: { blown: room.blown, collected: room.arrived, poppedWhileBlowing: room.popGrow, poppedOverinflate: room.popOver },
    avgAirAtRelease: Math.round(avg * 100) / 100,
    airHistogram: hist,
    close: room.close,
    perfect: room.perfect,
    locksOpened: info.locksOpened,
    locksFailed: info.locksFailed,
    damageTaken: Math.round(info.damageTaken),
    leftoverPerWave: [...info.leftoverPerWave],
    hpFromLeftover: Math.round(info.hpFromLeftover),
    upgrades: [...info.upgrades],
  };
}
