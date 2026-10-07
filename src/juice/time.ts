// Hitstop (freeze game logic for N seconds) and slow-motion with eased in/out.
import { config } from '../config';
import { clamp01 } from '../logic/math';
import { easeInOutSine } from './ease';

export class TimeControl {
  /** Remaining freeze time (real seconds). */
  hitstop = 0;
  /** Current slow-mo factor (1 = normal). */
  slowmo = 1;
  private slowTarget = 1;
  private slowHold = 0;
  private phase: 'idle' | 'in' | 'hold' | 'out' = 'idle';
  private phaseT = 0;
  private from = 1;

  freeze(seconds: number): void {
    this.hitstop = Math.max(this.hitstop, seconds);
  }

  /** Slow time to `scale` for `duration` real seconds (eases in and out). */
  slow(scale: number, duration: number): void {
    this.from = this.slowmo;
    this.slowTarget = scale;
    this.slowHold = duration;
    this.phase = 'in';
    this.phaseT = 0;
  }

  /** Real dt in -> scaled game dt out (0 while frozen). */
  update(realDt: number): number {
    const j = config.juice.slowmo;
    this.phaseT += realDt;
    if (this.phase === 'in') {
      const t = clamp01(this.phaseT / j.easeIn);
      this.slowmo = this.from + (this.slowTarget - this.from) * easeInOutSine(t);
      if (t >= 1) this.next('hold');
    } else if (this.phase === 'hold') {
      this.slowmo = this.slowTarget;
      if (this.phaseT >= this.slowHold) {
        this.from = this.slowmo;
        this.next('out');
      }
    } else if (this.phase === 'out') {
      const t = clamp01(this.phaseT / j.easeOut);
      this.slowmo = this.from + (1 - this.from) * easeInOutSine(t);
      if (t >= 1) this.next('idle');
    }
    if (this.hitstop > 0) {
      this.hitstop -= realDt;
      return 0;
    }
    return realDt * this.slowmo * config.debug.timeScale;
  }

  private next(p: 'idle' | 'in' | 'hold' | 'out'): void {
    this.phase = p;
    this.phaseT = 0;
  }
}
