// Tiny Web Audio synth: per-sound gain -> master gain -> compressor -> output.
import { config } from '../config';

type Wave = OscillatorType;

export interface ToneOpts {
  type?: Wave;
  f0: number;
  f1?: number; // glide target (exponential)
  dur: number;
  at?: number; // start offset (s)
  attack?: number;
  peak?: number; // 0..1 envelope peak
  vibratoHz?: number;
  vibratoDepth?: number; // Hz
  filter?: { type: BiquadFilterType; f: number; q?: number };
}

export interface NoiseOpts {
  dur: number;
  at?: number;
  attack?: number;
  peak?: number;
  filter: BiquadFilterType;
  f0: number;
  f1?: number;
  q?: number;
}

class Synth {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private voices = new Map<string, number[]>();

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** Must be called from a user gesture (pointerdown/up). Safe to call repeatedly. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        const ctx = new Ctor({ latencyHint: 'interactive' });
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.knee.value = 10;
        comp.ratio.value = 6;
        comp.attack.value = 0.003;
        comp.release.value = 0.15;
        comp.connect(ctx.destination);
        this.master = ctx.createGain();
        this.master.connect(comp);
        this.ctx = ctx;
        this.noiseBuf = this.makeNoise(ctx);
        this.applyVolume();
      }
      if (this.ctx.state !== 'running') void this.ctx.resume();
      // iOS: play one silent buffer inside the gesture.
      const src = this.ctx.createBufferSource();
      src.buffer = this.ctx.createBuffer(1, 1, 22050);
      src.connect(this.ctx.destination);
      src.start(0);
    } catch {
      // Audio unavailable: game stays silent.
    }
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  applyVolume(): void {
    if (!this.master || !this.ctx) return;
    const v = config.audio.muted ? 0 : config.audio.master;
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /** Voice limiting: returns false if `name` already has `limit` voices playing. */
  allow(name: string, limit: number, dur: number): boolean {
    if (!this.ready) return false;
    const t = this.now();
    let list = this.voices.get(name);
    if (!list) {
      list = [];
      this.voices.set(name, list);
    }
    for (let i = list.length - 1; i >= 0; i--) if (list[i] <= t) list.splice(i, 1);
    if (list.length >= limit) return false;
    list.push(t + dur);
    return true;
  }

  /** Output node for one sound instance at its configured volume. */
  bus(name: string, gainMult = 1): GainNode | null {
    if (!this.ctx || !this.master || !this.ready) return null;
    const g = this.ctx.createGain();
    g.gain.value = (config.audio.volumes[name] ?? 0.3) * gainMult;
    g.connect(this.master);
    return g;
  }

  tone(dest: AudioNode, o: ToneOpts): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.at ?? 0);
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.f0, t0);
    if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + o.dur);
    const env = this.envelope(t0, o.dur, o.attack ?? 0.004, o.peak ?? 1);
    let node: AudioNode = osc;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = o.filter.type;
      f.frequency.value = o.filter.f;
      f.Q.value = o.filter.q ?? 0.7;
      node.connect(f);
      node = f;
    }
    node.connect(env);
    env.connect(dest);
    if (o.vibratoHz) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = o.vibratoHz;
      depth.gain.value = o.vibratoDepth ?? 10;
      lfo.connect(depth);
      depth.connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(t0 + o.dur + 0.05);
    }
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.05);
  }

  noise(dest: AudioNode, o: NoiseOpts): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuf) return;
    const t0 = ctx.currentTime + (o.at ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.filter;
    f.Q.value = o.q ?? 1;
    f.frequency.setValueAtTime(o.f0, t0);
    if (o.f1 !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + o.dur);
    const env = this.envelope(t0, o.dur, o.attack ?? 0.002, o.peak ?? 1);
    src.connect(f);
    f.connect(env);
    env.connect(dest);
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + o.dur + 0.05);
  }

  /** Looping filtered noise for continuous sounds. */
  noiseLoop(dest: AudioNode, filter: BiquadFilterType, f: number, q: number): { src: AudioBufferSourceNode; filter: BiquadFilterNode } | null {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuf) return null;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const bf = ctx.createBiquadFilter();
    bf.type = filter;
    bf.frequency.value = f;
    bf.Q.value = q;
    src.connect(bf);
    bf.connect(dest);
    src.start();
    return { src, filter: bf };
  }

  private envelope(t0: number, dur: number, attack: number, peak: number): GainNode {
    const g = this.ctx!.createGain();
    const a = Math.min(attack, dur * 0.5);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    return g;
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
}

export const synth = new Synth();

/** Random pitch multiplier (+-pct). */
export function vary(pct = 0.05): number {
  return 1 + (Math.random() * 2 - 1) * pct;
}
