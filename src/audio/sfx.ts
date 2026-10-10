// One function per sound. Recipes follow the brief (§9).
import { synth, vary } from './synth';

const C6 = 1046.5;
const G6 = 1568;

function semis(n: number): number {
  return Math.pow(2, n / 12);
}

export const sfx = {
  inflate_start(): void {
    const o = synth.allow('inflate_start', 2, 0.1) && synth.bus('inflate_start');
    if (!o) return;
    synth.noise(o, { dur: 0.08, filter: 'bandpass', f0: 600 * vary(), q: 2, attack: 0.005 });
    synth.tone(o, { f0: 180, f1: 120, dur: 0.06, peak: 0.5 });
  },

  ammo_tick(ammo: number): void {
    const o = synth.allow('ammo_tick', 3, 0.05) && synth.bus('ammo_tick');
    if (!o) return;
    synth.tone(o, { f0: 600 + 20 * ammo, dur: 0.04, attack: 0.002 });
  },

  tier_up(tier: number): void {
    const o = synth.allow('tier_up', 2, 0.2) && synth.bus('tier_up');
    if (!o) return;
    const k = semis((tier - 2) * 5);
    synth.tone(o, { type: 'triangle', f0: C6 * k, dur: 0.18, peak: 0.8 });
    synth.tone(o, { type: 'triangle', f0: G6 * k, dur: 0.18, at: 0.05, peak: 0.8 });
    synth.tone(o, { type: 'sine', f0: C6 * 2 * k, dur: 0.22, at: 0.1, peak: 0.4 });
  },

  danger_tick(): void {
    const o = synth.allow('danger_tick', 2, 0.03) && synth.bus('danger_tick');
    if (!o) return;
    synth.tone(o, { type: 'square', f0: 2000, dur: 0.012, attack: 0.001, filter: { type: 'highpass', f: 1200 } });
  },

  release_boing(): void {
    const o = synth.allow('release_boing', 2, 0.15) && synth.bus('release_boing');
    if (!o) return;
    const v = vary();
    synth.tone(o, { f0: 300 * v, f1: 700 * v, dur: 0.12, vibratoHz: 28, vibratoDepth: 30 });
  },

  whoosh(): void {
    const o = synth.allow('whoosh', 2, 0.26) && synth.bus('whoosh');
    if (!o) return;
    synth.noise(o, { dur: 0.25, filter: 'bandpass', f0: 400, f1: 2500, q: 1.4, attack: 0.06 });
  },

  arrival_pop(): void {
    const o = synth.allow('arrival_pop', 2, 0.12) && synth.bus('arrival_pop');
    if (!o) return;
    synth.noise(o, { dur: 0.06, filter: 'highpass', f0: 1000, q: 0.7 });
    synth.tone(o, { f0: 120, f1: 60, dur: 0.1, peak: 0.9 });
  },

  ammo_collect(i: number): void {
    const o = synth.allow('ammo_collect', 4, 0.05) && synth.bus('ammo_collect');
    if (!o) return;
    synth.tone(o, { f0: 880 * semis(Math.min(i, 24) * 0.75), dur: 0.045, attack: 0.002 });
  },

  spike_pop(big = false): void {
    const name = big ? 'overinflate_pop' : 'spike_pop';
    const o = synth.allow(name, 2, 0.5) && synth.bus(name);
    if (!o) return;
    synth.noise(o, { dur: 0.09, filter: 'highpass', f0: 700, q: 0.5, peak: 1 });
    synth.tone(o, { f0: 160, f1: 50, dur: 0.12, peak: 0.9 });
    // crackle
    for (let i = 0; i < 5; i++) {
      synth.noise(o, { dur: 0.012, at: 0.02 + Math.random() * 0.08, filter: 'bandpass', f0: 2500 + Math.random() * 3000, q: 3, peak: 0.6 });
    }
    // "pfff" deflate
    synth.noise(o, { dur: 0.4, at: 0.06, filter: 'lowpass', f0: 1500, f1: 200, q: 1.2, attack: 0.03, peak: 0.45 });
    if (big) synth.tone(o, { f0: 70, f1: 40, dur: 0.35, peak: 1 });
  },

  near_miss(): void {
    const o = synth.allow('near_miss', 2, 0.3) && synth.bus('near_miss');
    if (!o) return;
    synth.noise(o, { dur: 0.16, filter: 'bandpass', f0: 2500, f1: 900, q: 1.5, attack: 0.02, peak: 0.7 });
    synth.tone(o, { type: 'sine', f0: 2093, dur: 0.25, at: 0.05, peak: 0.6 });
    synth.tone(o, { type: 'sine', f0: 3136, dur: 0.3, at: 0.1, peak: 0.4 });
  },

  power_up(): void {
    const o = synth.allow('power_up', 2, 0.12) && synth.bus('power_up');
    if (!o) return;
    synth.tone(o, { type: 'triangle', f0: C6 * semis(-5), dur: 0.1, peak: 0.8 });
    synth.tone(o, { type: 'triangle', f0: C6, dur: 0.12, at: 0.06, peak: 0.8 });
    synth.tone(o, { type: 'sine', f0: G6 * 2, dur: 0.2, at: 0.12, peak: 0.4 });
  },

  /** A spike glances off a gathered balloon: a short metallic tink. */
  deflect(): void {
    const o = synth.allow('deflect', 2, 0.08) && synth.bus('deflect');
    if (!o) return;
    synth.tone(o, { type: 'sine', f0: 2600 * vary(), dur: 0.08, attack: 0.001, peak: 0.6 });
    synth.noise(o, { dur: 0.03, filter: 'highpass', f0: 3000, q: 0.7, peak: 0.4 });
  },

  plop(): void {
    const o = synth.allow('plop', 2, 0.07) && synth.bus('plop');
    if (!o) return;
    synth.tone(o, { f0: 250 * vary(), f1: 400, dur: 0.06, attack: 0.003 });
  },

  shoot(): void {
    const o = synth.allow('shoot', 4, 0.045) && synth.bus('shoot');
    if (!o) return;
    const v = vary(0.08);
    synth.tone(o, { type: 'square', f0: 900 * v, f1: 400 * v, dur: 0.04, attack: 0.001 });
  },

  empty_click(): void {
    const o = synth.allow('empty_click', 1, 0.03) && synth.bus('empty_click');
    if (!o) return;
    synth.noise(o, { dur: 0.015, filter: 'bandpass', f0: 3000, q: 2, attack: 0.001 });
    synth.tone(o, { type: 'square', f0: 1400, dur: 0.012, peak: 0.4 });
  },

  hit(): void {
    const o = synth.allow('hit', 4, 0.03) && synth.bus('hit');
    if (!o) return;
    synth.noise(o, { dur: 0.02, filter: 'bandpass', f0: 1800 * vary(), q: 1.5, attack: 0.001 });
    synth.tone(o, { f0: 200 * vary(), f1: 150, dur: 0.05, peak: 0.7 });
  },

  lock_tick(): void {
    const o = synth.allow('lock_tick', 3, 0.04) && synth.bus('lock_tick');
    if (!o) return;
    synth.tone(o, { type: 'square', f0: 1800 * vary(0.03), dur: 0.02, attack: 0.001, filter: { type: 'bandpass', f: 2200, q: 2 } });
  },

  unlock(): void {
    const o = synth.allow('unlock', 1, 0.5) && synth.bus('unlock');
    if (!o) return;
    synth.noise(o, { dur: 0.05, filter: 'bandpass', f0: 2600, q: 3 });
    synth.tone(o, { type: 'square', f0: 900, f1: 1400, dur: 0.06, peak: 0.4, filter: { type: 'lowpass', f: 3000 } });
    synth.tone(o, { type: 'triangle', f0: 1318.5, dur: 0.3, at: 0.06, peak: 0.7 });
    synth.tone(o, { type: 'triangle', f0: 1975.5, dur: 0.4, at: 0.12, peak: 0.6 });
  },

  locked(): void {
    const o = synth.allow('locked', 1, 0.5) && synth.bus('locked');
    if (!o) return;
    synth.tone(o, { type: 'square', f0: 220, dur: 0.12, peak: 0.6, filter: { type: 'lowpass', f: 1200 } });
    synth.tone(o, { type: 'square', f0: 165, dur: 0.22, at: 0.14, peak: 0.6, filter: { type: 'lowpass', f: 1000 } });
  },

  chain_snap(): void {
    const o = synth.allow('chain_snap', 1, 0.5) && synth.bus('chain_snap');
    if (!o) return;
    synth.noise(o, { dur: 0.08, filter: 'highpass', f0: 2000, q: 0.7, peak: 1 });
    synth.tone(o, { type: 'square', f0: 1200, f1: 400, dur: 0.12, peak: 0.5, filter: { type: 'bandpass', f: 1800, q: 3 } });
    // links rattling
    for (let i = 0; i < 6; i++) synth.tone(o, { type: 'triangle', f0: 2200 + Math.random() * 1500, dur: 0.03, at: 0.05 + i * 0.04, peak: 0.35 });
    synth.noise(o, { dur: 0.35, at: 0.05, filter: 'bandpass', f0: 600, f1: 2400, q: 1.2, attack: 0.05, peak: 0.5 });
  },

  deflate(): void {
    const o = synth.allow('deflate', 2, 0.4) && synth.bus('deflate');
    if (!o) return;
    synth.noise(o, { dur: 0.45, filter: 'lowpass', f0: 1800, f1: 250, q: 1.5, attack: 0.02, peak: 0.6 });
    synth.tone(o, { f0: 520, f1: 180, dur: 0.4, peak: 0.3, vibratoHz: 18, vibratoDepth: 40 });
  },

  ui_tap(): void {
    const o = synth.allow('ui_tap', 2, 0.05) && synth.bus('ui_tap');
    if (!o) return;
    synth.tone(o, { f0: 700, f1: 500, dur: 0.05, attack: 0.002 });
  },
};

/** Continuous inflate hiss whose band rises with air, plus occasional rubber squeaks. */
export class InflateLoop {
  private loop: { src: AudioBufferSourceNode; filter: BiquadFilterNode } | null = null;
  private out: GainNode | null = null;
  private squeakT = 0;

  start(): void {
    if (this.loop) return;
    const o = synth.bus('inflate_loop');
    if (!o || !synth.ctx) return;
    this.out = o;
    const vol = o.gain.value;
    o.gain.setValueAtTime(0, synth.now());
    o.gain.linearRampToValueAtTime(vol, synth.now() + 0.05);
    this.loop = synth.noiseLoop(o, 'bandpass', 800, 3);
    this.squeakT = 0.2;
  }

  update(air: number, dt: number): void {
    if (!this.loop || !synth.ctx) return;
    this.loop.filter.frequency.setTargetAtTime(800 + 800 * air, synth.now(), 0.03);
    this.squeakT -= dt;
    if (this.squeakT <= 0 && this.out) {
      this.squeakT = 0.25 + Math.random() * 0.45;
      synth.tone(this.out, { f0: 1200 + Math.random() * 800, f1: 1400 + Math.random() * 600, dur: 0.03, peak: 0.6 + air });
    }
  }

  stop(): void {
    if (!this.loop || !this.out || !synth.ctx) return;
    const t = synth.now();
    this.out.gain.setTargetAtTime(0, t, 0.02);
    this.loop.src.stop(t + 0.12);
    this.loop = null;
    this.out = null;
  }
}

/** Rubber creak when nearly full: sawtooth 90 Hz + 12 Hz vibrato, lowpass. */
export class StrainLoop {
  private osc: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;
  private out: GainNode | null = null;
  private base = 0;

  /** level 0..1 */
  set(level: number): void {
    if (level <= 0.001) {
      this.stop();
      return;
    }
    const ctx = synth.ctx;
    if (!ctx) return;
    if (!this.osc) {
      const o = synth.bus('strain');
      if (!o) return;
      this.base = o.gain.value;
      o.gain.value = 0;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 90;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 12;
      const depth = ctx.createGain();
      depth.gain.value = 9;
      lfo.connect(depth);
      depth.connect(osc.frequency);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      lp.Q.value = 4;
      osc.connect(lp);
      lp.connect(o);
      osc.start();
      lfo.start();
      this.osc = osc;
      this.lfo = lfo;
      this.out = o;
    }
    this.out!.gain.setTargetAtTime(this.base * level, ctx.currentTime, 0.03);
    this.osc.frequency.setTargetAtTime(90 + 40 * level, ctx.currentTime, 0.05);
  }

  stop(): void {
    if (!this.osc || !this.out) return;
    const t = synth.now();
    this.out.gain.setTargetAtTime(0, t, 0.02);
    this.osc.stop(t + 0.1);
    this.lfo?.stop(t + 0.1);
    this.osc = null;
    this.lfo = null;
    this.out = null;
  }
}
