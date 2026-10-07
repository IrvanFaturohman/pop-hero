// Tweakpane debug/tuning panel. Toggle: D key, or tap the top-left corner 3x.
import * as Essentials from '@tweakpane/plugin-essentials';
import type { FpsGraphBladeApi } from '@tweakpane/plugin-essentials';
import { Pane, type FolderApi } from 'tweakpane';
import { config } from '../config';
import { patterns, stage1 } from '../levels';
import { validatePattern } from '../logic/validator';
import { renderValidator, validatorCss } from './validatorView';
import { exportJson, importJson, resetDefaults } from './tuning';

export interface DebugHooks {
  setPattern(id: string): void;
  restart(): void;
  skipWave(): void;
  goBoss(): void;
  applyAudio(): void;
  info(): { particles: number; seed: number; pattern: string; ammo: number };
}

type Range = [number, number, number?];

function addNumbers(f: FolderApi, obj: Record<string, unknown>, ranges: Record<string, Range>): void {
  for (const [key, r] of Object.entries(ranges)) {
    if (typeof obj[key] !== 'number') continue;
    f.addBinding(obj, key, { min: r[0], max: r[1], step: r[2] });
  }
}

export class DebugPanel {
  private root: HTMLDivElement;
  private pane: Pane;
  private fps: FpsGraphBladeApi;
  private vtEl: HTMLDivElement;
  private patternFolder: FolderApi | null = null;
  private infoObj = { particles: 0, seed: 0, pattern: 'w1', heroAmmo: 0 };
  private sel = { pattern: 'w1' };
  private refreshT = 0;
  visible = false;

  constructor(private hooks: DebugHooks) {
    const style = document.createElement('style');
    style.textContent = `${validatorCss}
      #debug { position: fixed; top: 0; right: 0; width: 310px; max-height: 100%; overflow-y: auto;
        z-index: 10; touch-action: pan-y; -webkit-user-select: none; display: none; }
      #debug textarea { width: 100%; height: 80px; font: 10px monospace; box-sizing: border-box; }`;
    document.head.appendChild(style);
    this.root = document.createElement('div');
    this.root.id = 'debug';
    document.body.appendChild(this.root);
    const paneHost = document.createElement('div');
    this.root.appendChild(paneHost);
    this.vtEl = document.createElement('div');
    this.vtEl.className = 'vt';
    this.vtEl.style.display = 'none';
    this.root.appendChild(this.vtEl);
    // stop game input under the panel
    this.root.addEventListener('pointerdown', (e) => e.stopPropagation());

    this.pane = new Pane({ container: paneHost, title: 'Pop Hero — tuning' });
    this.pane.registerPlugin(Essentials);
    this.fps = this.pane.addBlade({ view: 'fpsgraph', label: 'FPS', rows: 2 }) as unknown as FpsGraphBladeApi;
    this.buildInfo();
    this.buildBalloon();
    this.buildSpikes();
    this.buildJuice();
    this.buildAudio();
    this.buildConfigIO();
    this.rebuildPatternFolder();
  }

  setHooks(h: DebugHooks): void {
    this.hooks = h;
  }

  toggle(): void {
    this.visible = !this.visible;
    this.root.style.display = this.visible ? 'block' : 'none';
  }

  frameBegin(): void {
    if (this.visible) this.fps.begin();
  }

  frameEnd(realDt: number): void {
    if (!this.visible) return;
    this.fps.end();
    this.refreshT -= realDt;
    if (this.refreshT <= 0) {
      this.refreshT = 0.25;
      const i = this.hooks.info();
      this.infoObj.particles = i.particles;
      this.infoObj.seed = i.seed;
      this.infoObj.pattern = i.pattern;
      this.infoObj.heroAmmo = i.ammo;
    }
  }

  private buildInfo(): void {
    const f = this.pane.addFolder({ title: 'Info & cheats' });
    f.addBinding(this.infoObj, 'particles', { readonly: true, format: (v: number) => v.toFixed(0) });
    f.addBinding(this.infoObj, 'seed', { readonly: true, format: (v: number) => v.toFixed(0) });
    f.addBinding(this.infoObj, 'pattern', { readonly: true });
    f.addBinding(this.infoObj, 'heroAmmo', { readonly: true, format: (v: number) => v.toFixed(0) });
    f.addBinding(config.debug, 'timeScale', { min: 0.1, max: 2, step: 0.05, label: 'time scale' });
    f.addBinding(config.debug, 'showHitbox', { label: 'hitboxes' });
    f.addBinding(config.debug, 'noPop', { label: 'balloons never pop' });
    f.addBinding(config.debug, 'spikesOff', { label: 'spikes off' });
    f.addBinding(config.debug, 'infiniteAmmo', { label: 'infinite ammo' });
    f.addBinding(config.debug, 'godMode', { label: 'god mode' });
    const opts = Object.fromEntries(Object.values(patterns).map((p) => [p.name, p.id]));
    f.addBinding(this.sel, 'pattern', { options: opts, label: 'spike pattern' }).on('change', (ev) => {
      this.hooks.setPattern(ev.value as string);
      this.rebuildPatternFolder();
    });
    f.addButton({ title: 'Skip wave' }).on('click', () => this.hooks.skipWave());
    f.addButton({ title: 'Go to boss' }).on('click', () => this.hooks.goBoss());
    f.addButton({ title: 'Restart run' }).on('click', () => this.hooks.restart());
  }

  private buildBalloon(): void {
    const f = this.pane.addFolder({ title: 'Balloon', expanded: false });
    f.addBinding(config.balloon, 'curve', {
      options: { linear: 'linear', easeIn: 'easeIn', easeOut: 'easeOut', smooth: 'smooth' },
    });
    addNumbers(f, config.balloon, {
      rMin: [8, 60, 1],
      rMax: [60, 220, 1],
      inflateRate: [0.1, 1.5, 0.01],
      ammoMax: [5, 100, 1],
      ammoExp: [0.5, 3, 0.05],
      tierT2: [1, 100, 1],
      tierT3: [1, 100, 1],
      tierT4: [1, 100, 1],
      overinflateTime: [0, 2, 0.05],
      hitboxScale: [0.5, 1.1, 0.01],
      riseSpeed: [0, 1200, 10],
      riseFactorSmall: [0.3, 2, 0.01],
      riseFactorBig: [0.3, 2, 0.01],
      buoyancy: [100, 4000, 10],
      escapeBuoyancy: [100, 6000, 10],
      drag: [0, 10, 0.1],
      squish: [0, 30, 1],
      spawnTime: [0.05, 1, 0.01],
      dragFollow: [1, 80, 1],
      strainStart: [0.5, 1, 0.01],
    });
    const s = f.addFolder({ title: 'Spawn & bonus', expanded: false });
    addNumbers(s, config.spawn, { cooldownAfterRelease: [0, 2, 0.01], cooldownAfterPop: [0, 3, 0.01] });
    s.addBinding(config.spawn, 'requireFreshPressAfterPop', { label: 'fresh press after pop' });
    addNumbers(s, config.bonus, {
      nearMissDistance: [0, 40, 1],
      nearMissBonus: [0, 1, 0.01],
      perfectThreshold: [0.5, 1, 0.01],
      perfectBonus: [0, 1, 0.01],
      dangerDistance: [0, 120, 1],
    });
  }

  private buildSpikes(): void {
    const f = this.pane.addFolder({ title: 'Spikes', expanded: false });
    addNumbers(f, config.spikes, {
      speedMult: [0, 3, 0.01],
      ballRadius: [6, 40, 1],
      hubRadius: [6, 40, 1],
      armHalfThickness: [1, 15, 0.5],
      transitionIn: [0.05, 2, 0.05],
      transitionOut: [0.05, 2, 0.05],
      validatorPhases: [6, 240, 1],
    });
    f.addButton({ title: 'Run validator (all patterns)' }).on('click', () => {
      const res = Object.values(patterns).map((p) => validatePattern(p, stage1.earlyPatterns.includes(p.id)));
      this.vtEl.style.display = 'block';
      renderValidator(this.vtEl, res);
      console.log('[validator]', res);
    });
  }

  private rebuildPatternFolder(): void {
    this.patternFolder?.dispose();
    const p = patterns[this.sel.pattern];
    if (!p) return;
    const f = this.pane.addFolder({ title: `Edit pattern: ${p.name}`, expanded: false });
    this.patternFolder = f;
    f.addBinding(p, 'speedMult', { min: 0, max: 3, step: 0.01 });
    p.spikes.forEach((d, i) => {
      const sf = f.addFolder({ title: `#${i + 1} ${d.kind}` });
      if (d.kind === 'spinner') {
        addNumbers(sf, d as unknown as Record<string, unknown>, {
          px: [0, 720, 1],
          py: [640, 1280, 1],
          arms: [1, 4, 1],
          length: [20, 300, 1],
          omega: [-300, 300, 1],
        });
      } else if (d.kind === 'orbiter') {
        addNumbers(sf, d as unknown as Record<string, unknown>, {
          cx: [0, 720, 1],
          cy: [640, 1280, 1],
          rx: [0, 360, 1],
          ry: [0, 300, 1],
          omega: [-300, 300, 1],
        });
      } else {
        // start position/direction apply on the next pattern set; speed applies live
        addNumbers(sf, d as unknown as Record<string, unknown>, {
          speed: [0, 600, 1],
          x: [0, 720, 1],
          y: [640, 1280, 1],
          angle: [0, 360, 1],
        });
      }
      if (d.kind !== 'bouncer' && d.speedWave) addNumbers(sf, d.speedWave as unknown as Record<string, unknown>, { min: [0, 300, 1], max: [0, 300, 1], period: [0.2, 10, 0.1] });
    });
  }

  private buildJuice(): void {
    const j = config.juice;
    const f = this.pane.addFolder({ title: 'Juice', expanded: false });
    f.addBinding(j, 'reducedMotion', { label: 'reduced motion' });
    f.addBinding(j, 'flashEnabled', { label: 'flash' });
    addNumbers(f, j as unknown as Record<string, unknown>, { shakeMult: [0, 3, 0.05] });
    addNumbers(f, j.shake, { maxOffset: [0, 60, 1], maxRotationDeg: [0, 10, 0.1], traumaDecay: [0.1, 6, 0.1], noiseFreq: [1, 40, 1] });
    const t = f.addFolder({ title: 'trauma / hitstop', expanded: false });
    for (const k of Object.keys(j.trauma)) t.addBinding(j.trauma, k as keyof typeof j.trauma, { min: 0, max: 1, step: 0.01, label: `trauma.${k}` });
    for (const k of Object.keys(j.hitstop)) t.addBinding(j.hitstop, k as keyof typeof j.hitstop, { min: 0, max: 0.5, step: 0.005, label: `hitstop.${k}` });
    addNumbers(t, j.flash, { spikePop: [0, 0.3, 0.01], tierUp: [0, 0.3, 0.01] });
    const tk = f.addFolder({ title: 'tokens / particles', expanded: false });
    addNumbers(tk, j.tokens, { max: [1, 40, 1], stagger: [0, 0.1, 0.005], flightTime: [0.1, 1.5, 0.05] });
    addNumbers(tk, j.particles, {
      popShardsMin: [0, 60, 1],
      popShardsMax: [0, 60, 1],
      arrivalShardsMin: [0, 60, 1],
      arrivalShardsMax: [0, 60, 1],
      arrivalConfetti: [0, 80, 1],
      tierRing: [0, 60, 1],
    });
    const h = this.pane.addFolder({ title: 'Hero & enemies', expanded: false });
    addNumbers(h, config.hero, { hp: [10, 500, 5], volleyTime: [0.3, 5, 0.1], minFireRate: [1, 60, 1], maxFireRate: [1, 120, 1], bulletSpeed: [200, 3000, 10], bulletDamage: [1, 10, 1], recoil: [0, 20, 1] });
    for (const k of ['grunt', 'runner', 'tank', 'boss'] as const) {
      addNumbers(h, config.enemies[k] as unknown as Record<string, unknown>, { hp: [1, 2000, 1], damage: [0, 50, 1] });
    }
    h.addBinding(config.haptics, 'enabled', { label: 'haptics' });
    const tf = this.pane.addFolder({ title: 'Turns, lock & chain', expanded: false });
    addNumbers(tf, config.turns, { balloonsPerTurn: [1, 6, 1], unlockDelay: [0, 2, 0.05], enemyDelay: [0, 2, 0.05], clearTime: [0.5, 5, 0.1] });
    addNumbers(tf, config.boss, { lock: [10, 300, 1], slamEvery: [1, 6, 1], summonEvery: [1, 8, 1], summonCount: [0, 8, 1] });
    addNumbers(tf, config.rope, { slack: [1, 1.3, 0.005], gravity: [0, 1500, 10], iterations: [1, 40, 1], pointShare: [0.1, 1, 0.05] });
    addNumbers(tf, config.effects, { burnDamage: [0, 10, 1], burnTurns: [1, 6, 1], bombDamageMult: [0, 5, 0.1], bombRadius: [20, 300, 5], healMult: [0, 3, 0.1] });
    addNumbers(tf, config.camera, { battleZoom: [1, 1.6, 0.01], battleCenterY: [200, 800, 5] });
  }

  private buildAudio(): void {
    const a = config.audio;
    const f = this.pane.addFolder({ title: 'Audio', expanded: false });
    f.addBinding(a, 'muted').on('change', () => this.hooks.applyAudio());
    f.addBinding(a, 'master', { min: 0, max: 1, step: 0.01 }).on('change', () => this.hooks.applyAudio());
    const v = f.addFolder({ title: 'volumes', expanded: false });
    for (const k of Object.keys(a.volumes)) v.addBinding(a.volumes, k, { min: 0, max: 1, step: 0.01 });
  }

  private buildConfigIO(): void {
    const f = this.pane.addFolder({ title: 'Config JSON', expanded: false });
    const area = document.createElement('textarea');
    area.placeholder = 'Paste config JSON here, then press "Apply pasted JSON"';
    f.addButton({ title: 'Copy config JSON' }).on('click', () => {
      const json = exportJson();
      area.value = json;
      navigator.clipboard?.writeText(json).catch(() => {});
      console.log('[config]', json);
    });
    f.addButton({ title: 'Paste from clipboard' }).on('click', async () => {
      try {
        area.value = await navigator.clipboard.readText();
        this.applyJson(area.value);
      } catch {
        area.focus();
      }
    });
    f.addButton({ title: 'Apply pasted JSON' }).on('click', () => this.applyJson(area.value));
    f.addButton({ title: 'Reset to defaults' }).on('click', () => {
      resetDefaults();
      this.afterConfigChange();
    });
    this.root.appendChild(area);
  }

  private applyJson(text: string): void {
    if (importJson(text)) this.afterConfigChange();
  }

  private afterConfigChange(): void {
    this.pane.refresh();
    this.rebuildPatternFolder();
    this.hooks.applyAudio();
    this.hooks.setPattern(this.sel.pattern);
  }
}
