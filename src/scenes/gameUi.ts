// Everything on top of the world for one run: wave HUD, turn pill, chain + lock, boss bar, banners,
// upgrade cards, pause menu, result screen and first-run hints. Reads logic state, owns no rules.
import type Phaser from 'phaser';
import { config } from '../config';
import { sfx } from '../audio/sfx';
import { sfxBattle } from '../audio/sfxBattle';
import type { FloatingText } from '../juice/floatingText';
import type { ScreenFlash } from '../juice/flash';
import type { Particles } from '../juice/particles';
import type { Shake } from '../juice/shake';
import type { Battle } from '../logic/battle';
import type { RoomEvent, BalloonRoom } from '../logic/room';
import type { RunStats } from '../logic/telemetry';
import type { TurnEvent, TurnRunner } from '../logic/turns';
import type { WaveRunner } from '../logic/waves';
import { ftueDone } from '../storage';
import { strings } from '../strings';
import type { UpgradeDef } from '../upgrades';
import { Banner } from '../view/banner';
import { BossView } from '../view/bossView';
import { CardPicker } from '../view/cardPicker';
import { Hud } from '../view/hud';
import { LockView } from '../view/lockView';
import { PauseMenu } from '../view/pauseMenu';
import { ResultScreen } from '../view/resultScreen';
import { RopeView } from '../view/ropeView';
import { TopHud } from '../view/topHud';
import { Tutorial } from '../view/tutorial';
import { TurnUi } from '../view/turnUi';

export interface UiLayers {
  ui: Phaser.GameObjects.Layer;
  overlay: Phaser.GameObjects.Layer;
  spikes: Phaser.GameObjects.Layer;
}

export interface UiFx {
  particles: Particles;
  floating: FloatingText;
  flash: ScreenFlash;
  shake: Shake;
}

export interface UiState {
  room: BalloonRoom;
  battle: Battle;
  turns: TurnRunner;
  waves: WaveRunner;
}

export class GameUi {
  readonly banner: Banner;
  readonly lock: LockView;
  private topHud: TopHud;
  private turnUi: TurnUi;
  private rope: RopeView;
  private boss: BossView;
  private cards: CardPicker;
  private pauseMenu: PauseMenu;
  private result: ResultScreen;
  private tutorial: Tutorial;
  onPause: () => void = () => {};
  onResume: () => void = () => {};
  onRestart: () => void = () => {};

  constructor(scene: Phaser.Scene, L: UiLayers, rs: number, private fx: UiFx) {
    this.rope = new RopeView(scene, L.spikes);
    this.lock = new LockView(scene, L.spikes, rs);
    this.lock.onTick = () => sfx.lock_tick();
    this.tutorial = new Tutorial(scene, L.spikes, rs, !ftueDone());
    this.topHud = new TopHud(scene, L.ui, rs);
    this.turnUi = new TurnUi(scene, L.overlay, L.ui, rs);
    this.boss = new BossView(scene, L.ui, L.overlay, rs);
    this.banner = new Banner(scene, L.ui, rs);
    this.cards = new CardPicker(scene, L.ui, rs);
    this.cards.onSelect = () => sfxBattle.card_select();
    const hud = new Hud(scene, L.ui);
    hud.onPause = () => this.onPause();
    this.pauseMenu = new PauseMenu(scene, L.ui, rs);
    this.pauseMenu.onTap = () => sfx.ui_tap();
    this.pauseMenu.onResume = () => this.onResume();
    this.pauseMenu.onRestart = () => this.onRestart();
    this.result = new ResultScreen(scene, L.ui, rs);
    this.result.onTap = () => sfx.ui_tap();
  }

  showPause(v: boolean): void {
    this.pauseMenu.show(v);
  }

  showCards(defs: UpgradeDef[], onPick: (u: UpgradeDef) => void): void {
    this.cards.show(defs, onPick);
  }

  showResult(stats: RunStats, onPlayAgain: () => void): void {
    this.result.onPlayAgain = onPlayAgain;
    this.result.show(stats);
  }

  /** Lock / chain moments from the balloon room. */
  onRoomEvent(ev: RoomEvent): void {
    const { particles, floating, flash, shake } = this.fx;
    const lock = this.lock;
    if (ev.type === 'park') {
      // its number flows into the lock (gold sparks travel to it)
      const n = Math.min(10, 3 + Math.floor(ev.total / 5));
      for (let i = 0; i < n; i++) {
        const sx = ev.b.x + (Math.random() - 0.5) * ev.b.r;
        const sy = ev.b.y - ev.b.r * 0.6;
        const life = 0.35 + i * 0.03;
        particles.emit('p_star', sx, sy, { vx: (lock.x - sx) / life, vy: (lock.y - sy) / life, life, scale0: 0.8, scale1: 0.4, alpha1: 0.6, spin: 10, tint: 0xffd23f, delay: i * 0.03 });
      }
    } else if (ev.type === 'unlock') {
      sfx.unlock();
      floating.show('pop', lock.x, lock.y + 80, strings.unlocked, config.palette.gold, 1.1);
    } else if (ev.type === 'snap') {
      // the chain gives way under the balloons: flash, links fly, lock pops off
      lock.open();
      this.tutorial.finish();
      sfx.chain_snap();
      shake.add(0.35);
      flash.flash(0.06, 0.35);
      particles.ring(lock.x, lock.y - 30, 10, 140, 0.25, 0xffffff, 1);
      particles.burst('p_star', lock.x, lock.y - 30, 18, 220, 520, { drag: 4, life: 0.5, scale0: 1.1, scale1: 0.1, tint: 0xffd23f, spin: 8 });
      particles.burst('p_dot', lock.x, lock.y - 30, 12, 150, 420, { gravity: 1200, life: 0.7, scale0: 0.7, scale1: 0.4, tint: 0xd4a017 });
    }
  }

  onTurnEvent(ev: TurnEvent, room: BalloonRoom, turns: TurnRunner): void {
    if (ev.type === 'locked') {
      this.lock.fail();
      sfx.locked();
      this.fx.floating.show('pop', this.lock.x, this.lock.y + 70, strings.locked, config.palette.danger, 1.1);
    } else if (ev.type === 'phase') {
      if (ev.phase === 'blow') this.lock.reset(room.lockTarget);
      this.turnUi.setPhase(ev.phase, turns.balloonsLeft);
    }
  }

  update(realDt: number, gameDt: number, s: UiState): void {
    const { room, battle, turns, waves } = s;
    const hpFrac = battle.hp / config.hero.hp;
    const bossStage = turns.bossStage;
    const progress = bossStage ? 1 : waves.progress(battle.aliveCount, turns.cleared);
    this.topHud.update(realDt, hpFrac, bossStage ? waves.waveCount : waves.index, waves.waveCount, progress, bossStage);
    const ph = turns.phase;
    const rope = room.physics.rope;
    const strain = room.lockTarget > 0 ? 1 - room.lockLeft / room.lockTarget : 0;
    this.rope.draw(rope, rope.snapped ? 0 : strain, gameDt);
    const lockActive = ph === 'blow' || ph === 'unlock' || ph === 'failed' || ph === 'burst';
    this.lock.update(gameDt, room.lockLeft, turns.balloonsLeft, lockActive, rope.x[rope.mid], rope.y[rope.mid], strain, room.queue);
    this.tutorial.update(gameDt, room, ph === 'blow', this.lock.x, this.lock.y);
    const yourTurn = ph === 'blow' || ph === 'unlock' || ph === 'burst' || ph === 'collect' || ph === 'shoot';
    this.boss.update(realDt, battle.boss, yourTurn);
    this.cards.update(realDt);
    this.turnUi.setLeft(turns.balloonsLeft);
    this.turnUi.update(realDt);
    this.banner.update(realDt);
    this.result.update(realDt);
  }
}
