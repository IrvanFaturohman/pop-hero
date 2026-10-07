// Game scene: fixed-timestep logic (60 Hz accumulator) + interpolated rendering + juice.
// Logic: balloon room + battle + turn flow. World views here; overlays/UI live in GameUi.
import Phaser from 'phaser';
import { FIXED_DT, MAX_STEPS_PER_FRAME, config } from '../config';
import { Music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { synth } from '../audio/synth';
import { HitboxOverlay } from '../debug/overlay';
import type { InputController } from '../input';
import { FloatingText } from '../juice/floatingText';
import { ScreenFlash } from '../juice/flash';
import { Particles } from '../juice/particles';
import { Shake } from '../juice/shake';
import { TimeControl } from '../juice/time';
import { patterns, stage1 } from '../levels';
import type { Balloon } from '../logic/balloon';
import { Battle } from '../logic/battle';
import { clamp01, lerp } from '../logic/math';
import { Rng } from '../logic/rng';
import { BalloonRoom } from '../logic/room';
import { buildStats } from '../logic/telemetry';
import { TurnRunner } from '../logic/turns';
import { WaveRunner } from '../logic/waves';
import { loadSettings, markTutorialDone, tutorialDone } from '../storage';
import { rollCards } from '../upgrades';
import { ArenaView } from '../view/arenaView';
import { BalloonLayer } from '../view/balloonLayer';
import { EnemyView } from '../view/enemyView';
import { HeroView } from '../view/heroView';
import { RoomView } from '../view/roomView';
import { SpikeLayerView } from '../view/spikeView';
import { TokenFlights } from '../view/tokens';
import { BattleFeedback } from './battleFeedback';
import { Feedback } from './feedback';
import { GameUi } from './gameUi';
import { getDebug, setupDebug, setupInput } from './services';

type LayerName = 'bg' | 'enemies' | 'balloons' | 'hero' | 'spikes' | 'fx' | 'overlay' | 'ui';
const LAYERS: LayerName[] = ['bg', 'enemies', 'balloons', 'hero', 'spikes', 'fx', 'overlay', 'ui'];
const NO_INPUT = { held: false, pressed: false, released: false, x: 0, y: 0 };
const RESULT_DELAY = 1.6; // s of end banner / effects before the result screen

const music = new Music();

export class GameScene extends Phaser.Scene {
  private rs = 1;
  private room!: BalloonRoom;
  private battle!: Battle;
  private waves!: WaveRunner;
  private turns!: TurnRunner;
  private input2: InputController | null = null;
  private acc = 0;
  private paused = false;
  private ended = false;
  private endT = -1;
  private won = false;
  private runTime = 0;
  private layers!: Record<LayerName, Phaser.GameObjects.Layer>;
  private shake = new Shake();
  private timeCtl = new TimeControl();
  private particles!: Particles;
  private floating!: FloatingText;
  private flash!: ScreenFlash;
  private tokens!: TokenFlights;
  private arena!: ArenaView;
  private roomView!: RoomView;
  private spikeView!: SpikeLayerView;
  private balloons!: BalloonLayer;
  private hero!: HeroView;
  private enemyView!: EnemyView;
  private overlay!: HitboxOverlay;
  private feedback!: Feedback;
  private battleFb!: BattleFeedback;
  private ui!: GameUi;
  private cardRng!: Rng;
  /** Upgrade ids picked this run, in order (telemetry). */
  private picked: string[] = [];
  private dangerT = 0;
  private camZoom = 1;
  private camCY = config.layout.height / 2;
  private camTargetZoom = 1;
  private camTargetCY = config.layout.height / 2;
  private overlayList: Array<Balloon | null> = [];

  constructor() {
    super('Game');
  }

  create(): void {
    this.rs = (this.registry.get('renderScale') as number) ?? 1;
    this.applySettings();
    this.shake = new Shake();
    this.timeCtl = new TimeControl();
    this.acc = 0;
    this.paused = false;
    this.ended = false;
    this.endT = -1;
    this.runTime = 0;
    this.picked = [];

    const rng = new Rng(config.debug.seed);
    this.room = new BalloonRoom(rng);
    this.battle = new Battle(rng);
    this.cardRng = new Rng(config.debug.seed ^ 0x5eed);
    this.waves = new WaveRunner(stage1, rng);
    this.turns = new TurnRunner(this.waves, this.battle, this.room);
    this.room.armed = false;
    this.room.protectedLeft = tutorialDone() ? 0 : config.spawn.tutorialProtected;

    this.layers = Object.fromEntries(LAYERS.map((n) => [n, this.add.layer()])) as Record<LayerName, Phaser.GameObjects.Layer>;
    this.setupCameras();
    const L = this.layers;
    this.arena = new ArenaView(this, L.bg);
    this.roomView = new RoomView(this, L.bg, L.overlay);
    this.enemyView = new EnemyView(this, L.enemies);
    this.balloons = new BalloonLayer(this, L.balloons, this.rs);
    this.hero = new HeroView(this, L.hero, this.rs);
    this.spikeView = new SpikeLayerView(this, L.spikes);
    this.particles = new Particles(this, L.fx);
    this.tokens = new TokenFlights(this, L.fx);
    this.floating = new FloatingText(this, L.fx);
    this.overlay = new HitboxOverlay(this, L.overlay);
    this.flash = new ScreenFlash(this, L.ui);
    const fx = { particles: this.particles, floating: this.floating, flash: this.flash, shake: this.shake };
    this.ui = new GameUi(this, L, this.rs, fx);
    this.ui.onPause = () => this.pause();
    this.ui.onResume = () => this.resume();
    this.ui.onRestart = () => this.scene.restart();

    this.feedback = new Feedback({
      ...fx,
      time: this.timeCtl,
      tokens: this.tokens,
      hero: this.hero,
      spikes: this.spikeView,
      field: this.room.field,
      bindView: (b) => this.balloons.bind(b),
      view: (id) => this.balloons.view(id),
      releaseView: (id, delay) => this.balloons.release(id, delay),
    });
    this.battleFb = new BattleFeedback({ ...fx, time: this.timeCtl, hero: this.hero, enemies: this.enemyView, banner: this.ui.banner });

    this.input2 = setupInput(this, L.ui, () => this.pause());
    setupDebug({
      setPattern: (id) => this.setPattern(id),
      restart: () => this.scene.restart(),
      skipWave: () => this.turns.skipWave(),
      goBoss: () => this.turns.goBoss(),
      applyAudio: () => synth.applyVolume(),
      info: () => ({ particles: this.particles.active, seed: config.debug.seed, pattern: this.room.field.pattern?.name ?? '-', ammo: this.battle.ammo }),
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.feedback.stopLoops());
    this.cameras.main.fadeIn(250, 0, 0, 0);
    // Automation/debug handle (dev builds only).
    if (import.meta.env.DEV) {
      (window as unknown as { __pop: unknown }).__pop = { room: this.room, battle: this.battle, waves: this.waves, turns: this.turns, scene: this, config };
    }
  }

  private applySettings(): void {
    const s = loadSettings();
    if (s.muted !== undefined) config.audio.muted = s.muted;
    if (s.music !== undefined) config.audio.musicOn = s.music;
    if (s.haptics !== undefined) config.haptics.enabled = s.haptics;
    if (s.reducedMotion !== undefined) config.juice.reducedMotion = s.reducedMotion;
    synth.applyVolume();
  }

  private setupCameras(): void {
    const L = config.layout;
    const cam = this.cameras.main;
    cam.setZoom(this.rs).centerOn(L.width / 2, L.height / 2);
    const ui = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    ui.setZoom(this.rs).centerOn(L.width / 2, L.height / 2);
    cam.ignore(this.layers.ui);
    ui.ignore(LAYERS.filter((n) => n !== 'ui').map((n) => this.layers[n]));
  }

  private setPattern(id: string): void {
    const p = patterns[id];
    if (p) this.room.requestPattern(p);
  }

  private setInput(on: boolean): void {
    if (!this.input2) return;
    if (!on) this.input2.forget();
    this.input2.enabled = on;
  }

  pause(): void {
    if (this.paused || this.ended) return;
    this.paused = true;
    this.setInput(false);
    this.feedback.stopLoops();
    this.ui.showPause(true);
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.setInput(true);
    this.ui.showPause(false);
  }

  /** Between waves: pick 1 of 3 upgrade cards (gameplay input is off meanwhile). */
  private showCards(): void {
    this.setInput(false);
    this.ui.showCards(rollCards(this.cardRng, this.picked), (u) => {
      u.apply({ room: this.room, battle: this.battle });
      this.picked.push(u.id);
      this.setInput(true);
      this.turns.pickCard();
    });
  }

  /** Win or lose: freeze the logic, let the end effects play, then the result screen. */
  private end(won: boolean): void {
    if (this.ended) return;
    this.ended = true;
    this.won = won;
    this.endT = RESULT_DELAY;
    this.setInput(false);
    this.feedback.stopLoops();
  }

  private showResult(): void {
    const stats = buildStats(this.room.stats, {
      won: this.won,
      seconds: this.runTime,
      wave: this.turns.bossStage ? 'BOSS' : `${this.waves.index + 1}/${this.waves.waveCount}`,
      cause: this.battle.lastDamageBy,
      turns: this.turns.turn,
      locksOpened: this.turns.locksOpened,
      locksFailed: this.turns.locksFailed,
      damageTaken: this.battle.damageTaken,
      leftoverPerWave: this.battle.leftoverPerWave,
      hpFromLeftover: this.battle.hpFromLeftover,
      upgrades: this.picked,
    });
    console.log('[run stats]', JSON.stringify(stats));
    this.ui.showResult(stats, () => this.scene.restart());
  }

  override update(_time: number, deltaMs: number): void {
    const debug = getDebug();
    debug?.frameBegin();
    const realDt = Math.min(deltaMs / 1000, 0.1);
    const gameDt = this.paused ? 0 : this.timeCtl.update(realDt);
    if (!this.ended) this.runTime += gameDt;
    this.acc += gameDt;
    let steps = 0;
    while (this.acc >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      if (!this.ended) this.step(FIXED_DT);
      this.acc -= FIXED_DT;
      steps++;
    }
    if (steps >= MAX_STEPS_PER_FRAME) this.acc = 0;
    if (this.endT > 0) {
      this.endT -= realDt;
      if (this.endT <= 0) this.showResult();
    }
    this.render(this.acc / FIXED_DT, gameDt, realDt);
    music.update();
    debug?.frameEnd(realDt);
  }

  private step(dt: number): void {
    const room = this.room;
    room.field.enabled = !config.debug.spikesOff;
    room.cheats.noPop = config.debug.noPop;
    room.step(dt, this.input2 ? this.input2.consume() : NO_INPUT);
    for (const ev of room.events) {
      if (ev.type === 'arrive') this.battle.deliver(ev.total, ev.b.type);
      if (ev.type === 'spawn' && ev.b.protected && room.protectedLeft === 0) markTutorialDone();
      this.ui.onRoomEvent(ev);
      this.feedback.room(ev);
    }
    room.drain();

    const battle = this.battle;
    battle.step(dt);
    this.turns.step(dt);
    for (const ev of battle.events) {
      this.battleFb.battle(ev);
      if (ev.type === 'bossPhase2') this.setPattern(stage1.boss.phase2Pattern);
    }
    battle.drain();
    for (const ev of this.turns.events) {
      if (ev.type === 'waveIntro') {
        this.setPattern(stage1.waves[ev.wave].pattern);
        room.setTypePool(stage1.waves[ev.wave].balloonTypes);
      } else if (ev.type === 'bossIntro') {
        this.setPattern(stage1.boss.phase1Pattern);
        room.setTypePool(stage1.boss.balloonTypes);
      } else if (ev.type === 'cards') this.showCards();
      else if (ev.type === 'phase') {
        const inBattle = ev.phase === 'shoot' || ev.phase === 'enemy';
        this.camTargetZoom = inBattle ? config.camera.battleZoom : 1;
        this.camTargetCY = inBattle ? config.camera.battleCenterY : config.layout.height / 2;
      }
      this.ui.onTurnEvent(ev, room, this.turns);
      this.battleFb.turn(ev);
      if (ev.type === 'victory') this.end(true);
      if (ev.type === 'defeat') this.end(false);
    }
    this.turns.drain();
  }

  private render(alpha: number, gameDt: number, realDt: number): void {
    const room = this.room;
    const a = room.attached;
    const danger = this.balloons.update(room, alpha, gameDt, realDt);
    this.spikeView.update(room.field, alpha, gameDt);
    this.roomView.update(gameDt, danger);
    this.dangerTicks(danger, gameDt);

    if (!this.paused && room.blowing && a) {
      this.feedback.inflate.update(a.air, gameDt);
      const bc = config.balloon;
      const k = clamp01((a.air - bc.strainStart) / (1 - bc.strainStart));
      this.feedback.strain.set(k * 0.7 + clamp01(a.strain / bc.overinflateTime) * 0.3);
    } else this.feedback.strain.set(0);

    this.arena.update(gameDt);
    this.enemyView.update(this.battle.enemies, alpha, gameDt);
    this.hero.update(this.battle, alpha, gameDt, this.battle.ammo);
    this.particles.update(gameDt);
    this.tokens.update(gameDt);
    this.floating.update(gameDt);
    this.feedback.update(realDt);
    this.battleFb.update(gameDt, this.battle.hp / config.hero.hp);
    this.ui.update(realDt, gameDt, { room, battle: this.battle, turns: this.turns, waves: this.waves });
    this.flash.update(realDt);
    this.shake.update(realDt);
    const L = config.layout;
    const k = Math.min(1, realDt * config.camera.speed);
    this.camZoom += (this.camTargetZoom - this.camZoom) * k;
    this.camCY += (this.camTargetCY - this.camCY) * k;
    const cam = this.cameras.main;
    cam.setZoom(this.rs * this.camZoom);
    cam.centerOn(L.width / 2 - this.shake.offsetX, this.camCY - this.shake.offsetY);
    cam.setRotation(this.shake.rotation);

    this.overlayList.length = 0;
    if (config.debug.showHitbox) this.overlayList.push(a, ...room.flying);
    this.overlay.draw(room.field, this.overlayList);
  }

  private dangerTicks(danger: number, dt: number): void {
    if (danger <= 0.01) {
      this.dangerT = 0;
      return;
    }
    this.dangerT -= dt;
    if (this.dangerT <= 0) {
      this.dangerT = lerp(0.32, 0.06, danger);
      sfx.danger_tick();
    }
  }
}
