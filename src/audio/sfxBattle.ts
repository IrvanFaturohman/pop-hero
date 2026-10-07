// Battle sounds (brief §9): enemy death, hero hurt, heartbeat, wave clear, lose, win.
import { synth, vary } from './synth';

const NOTE = { C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5, E6: 1318.5, G6: 1568, C4: 261.6, A4: 440, F4: 349.2 };

export const sfxBattle = {
  enemy_die(): void {
    const o = synth.allow('enemy_die', 3, 0.15) && synth.bus('enemy_die');
    if (!o) return;
    const v = vary(0.08);
    synth.tone(o, { f0: 500 * v, f1: 1200 * v, dur: 0.08 });
    synth.tone(o, { type: 'square', f0: 1568, dur: 0.05, at: 0.07, peak: 0.35, filter: { type: 'lowpass', f: 3000 } });
    synth.tone(o, { type: 'square', f0: 2093, dur: 0.09, at: 0.12, peak: 0.35, filter: { type: 'lowpass', f: 3000 } });
  },

  hero_hurt(): void {
    const o = synth.allow('hero_hurt', 2, 0.16) && synth.bus('hero_hurt');
    if (!o) return;
    synth.tone(o, { type: 'square', f0: 150, f1: 80, dur: 0.15, filter: { type: 'lowpass', f: 1400 } });
    synth.noise(o, { dur: 0.06, filter: 'bandpass', f0: 900, q: 1, peak: 0.5 });
  },

  enemy_attack(): void {
    const o = synth.allow('enemy_attack', 3, 0.08) && synth.bus('enemy_attack');
    if (!o) return;
    synth.noise(o, { dur: 0.07, filter: 'lowpass', f0: 1200, f1: 400, q: 0.8 });
    synth.tone(o, { f0: 140 * vary(), f1: 90, dur: 0.07, peak: 0.6 });
  },

  boom(): void {
    const o = synth.allow('boom', 2, 0.4) && synth.bus('boom');
    if (!o) return;
    synth.noise(o, { dur: 0.35, filter: 'lowpass', f0: 1600, f1: 120, q: 0.8, peak: 1 });
    synth.tone(o, { f0: 90, f1: 40, dur: 0.35, peak: 1 });
  },

  heal(): void {
    const o = synth.allow('heal', 1, 0.4) && synth.bus('heal');
    if (!o) return;
    [NOTE.C5, NOTE.E5, NOTE.G5].forEach((f, i) => synth.tone(o, { type: 'sine', f0: f * 2, dur: 0.18, at: i * 0.06, peak: 0.6 }));
  },

  boss_roar(): void {
    const o = synth.allow('boss_roar', 1, 1.2) && synth.bus('boss_roar');
    if (!o || !synth.ctx) return;
    synth.tone(o, { type: 'sawtooth', f0: 80, f1: 60, dur: 1.2, attack: 0.08, vibratoHz: 9, vibratoDepth: 14, filter: { type: 'lowpass', f: 600, q: 2 } });
    synth.noise(o, { dur: 1.0, filter: 'bandpass', f0: 300, f1: 160, q: 2, attack: 0.1, peak: 0.4 });
  },

  boss_slam(): void {
    const o = synth.allow('boss_slam', 1, 0.6) && synth.bus('boss_slam');
    if (!o) return;
    synth.noise(o, { dur: 0.5, filter: 'lowpass', f0: 900, f1: 80, q: 0.9, peak: 1 });
    synth.tone(o, { f0: 45, f1: 30, dur: 0.6, peak: 1 });
  },

  card_appear(): void {
    const o = synth.allow('card_appear', 1, 0.3) && synth.bus('card_appear');
    if (!o) return;
    synth.noise(o, { dur: 0.22, filter: 'bandpass', f0: 500, f1: 2200, q: 1.3, attack: 0.05, peak: 0.6 });
  },

  card_select(): void {
    const o = synth.allow('card_select', 1, 0.5) && synth.bus('card_select');
    if (!o) return;
    synth.noise(o, { dur: 0.2, filter: 'bandpass', f0: 800, f1: 3000, q: 1.3, attack: 0.03, peak: 0.6 });
    synth.tone(o, { type: 'triangle', f0: NOTE.C6, dur: 0.3, at: 0.1, peak: 0.6 });
    synth.tone(o, { type: 'triangle', f0: NOTE.G6, dur: 0.4, at: 0.17, peak: 0.5 });
  },

  heartbeat(): void {
    const o = synth.allow('heartbeat', 1, 0.5) && synth.bus('heartbeat');
    if (!o) return;
    synth.tone(o, { f0: 60, f1: 45, dur: 0.12 });
    synth.tone(o, { f0: 58, f1: 42, dur: 0.14, at: 0.2, peak: 0.8 });
  },

  wave_clear(): void {
    const o = synth.allow('wave_clear', 1, 0.6) && synth.bus('wave_clear');
    if (!o) return;
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => {
      synth.tone(o, { type: 'triangle', f0: f, dur: 0.22, at: i * 0.09, peak: 0.8 });
    });
  },

  lose(): void {
    const o = synth.allow('lose', 1, 1) && synth.bus('lose');
    if (!o) return;
    [NOTE.A4, NOTE.F4, NOTE.C4].forEach((f, i) => {
      synth.tone(o, { type: 'triangle', f0: f, f1: f * 0.97, dur: 0.32, at: i * 0.26, peak: 0.8 });
    });
  },

  win_fanfare(): void {
    const o = synth.allow('win_fanfare', 1, 1.6) && synth.bus('win_fanfare');
    if (!o) return;
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6].forEach((f, i) => {
      synth.tone(o, { type: 'triangle', f0: f, dur: 0.18, at: i * 0.08, peak: 0.7 });
    });
    for (const f of [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6]) synth.tone(o, { type: 'triangle', f0: f, dur: 1.1, at: 0.45, attack: 0.03, peak: 0.45 });
  },
};
