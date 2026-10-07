// Tiny procedural loop (brief §9, low priority): cheerful 100 BPM, bass + plucked chords + hats.
// Scheduled a little ahead on the audio clock; toggled from the pause menu.
import { config } from '../config';
import { synth } from './synth';

const BPM = 100;
const STEP = 60 / BPM / 4; // 16th note
const ROOTS = [130.81, 110.0, 87.31, 98.0]; // C3 A2 F2 G2
const CHORDS = [
  [523.25, 659.25, 783.99],
  [440.0, 523.25, 659.25],
  [349.23, 440.0, 523.25],
  [392.0, 493.88, 587.33],
];

export class Music {
  private next = 0;
  private step = 0;

  update(): void {
    const ctx = synth.ctx;
    if (!ctx || !synth.ready || !config.audio.musicOn || config.audio.muted) {
      this.next = 0;
      return;
    }
    const now = ctx.currentTime;
    if (this.next < now) this.next = now + 0.05;
    while (this.next < now + 0.15) {
      this.play(this.step, this.next - now);
      this.next += STEP;
      this.step = (this.step + 1) % 64;
    }
  }

  private play(i: number, at: number): void {
    const o = synth.bus('music');
    if (!o) return;
    const bar = Math.floor(i / 16);
    const s = i % 16;
    if (s % 4 === 0) synth.tone(o, { type: 'triangle', f0: ROOTS[bar], dur: STEP * 3, at, peak: 0.9 });
    if (s === 2 || s === 6 || s === 10 || s === 14) {
      const note = CHORDS[bar][((s / 4) | 0) % 3];
      synth.tone(o, { type: 'square', f0: note, dur: STEP * 1.5, at, peak: 0.25, filter: { type: 'lowpass', f: 1800 } });
    }
    if (s % 2 === 1) synth.noise(o, { dur: 0.03, at, filter: 'highpass', f0: 7000, q: 0.7, peak: 0.25 });
  }
}
