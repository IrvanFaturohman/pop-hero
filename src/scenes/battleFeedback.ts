// Battle + wave events -> juice (visuals, sound, camera, haptics). Presentation only.
import { config } from '../config';
import { sfx } from '../audio/sfx';
import { sfxBattle } from '../audio/sfxBattle';
import type { FloatingText } from '../juice/floatingText';
import { vibrate } from '../juice/haptics';
import type { Particles } from '../juice/particles';
import type { Shake } from '../juice/shake';
import type { TimeControl } from '../juice/time';
import type { BattleEvent } from '../logic/battle';
import type { Enemy } from '../logic/enemies';
import { isBossKind } from '../levels';
import type { TurnEvent } from '../logic/turns';
import { strings } from '../strings';
import type { Banner } from '../view/banner';
import type { EnemyView } from '../view/enemyView';
import type { HeroView } from '../view/heroView';
import { enemyColor } from '../view/texturesEnemy';

const CONFETTI = [0xff5da2, 0xffd23f, 0x5be7ff, 0x3ddc84, 0x9b6bff, 0xff7a1a];

export interface BattleFeedbackDeps {
  particles: Particles;
  floating: FloatingText;
  shake: Shake;
  time: TimeControl;
  hero: HeroView;
  enemies: EnemyView;
  banner: Banner;
}

export class BattleFeedback {
  private heartT = 0;

  constructor(private d: BattleFeedbackDeps) {}

  battle(ev: BattleEvent): void {
    const d = this.d;
    const j = config.juice;
    switch (ev.type) {
      case 'shoot':
        d.hero.onShoot();
        sfx.shoot();
        break;
      case 'spawn':
        d.enemies.onSpawn(ev.e);
        break;
      case 'hit': {
        d.enemies.onHit(ev.e);
        const tint = ev.kind === 'fire' ? 0xff8a3d : ev.kind === 'ice' ? 0x9fe8ff : enemyColor(ev.e.kind);
        d.particles.burst(ev.kind === 'normal' ? 'p_dot' : 'p_star', ev.x, ev.y, 6, 120, 320, { life: 0.3, scale0: 0.8, scale1: 0.1, gravity: 600, tint });
        if (ev.exec) d.floating.show('pop', ev.x, ev.y - 30, strings.execute, config.palette.danger, 0.7);
        else if (ev.crit) d.floating.show('pop', ev.x, ev.y - 30, `${strings.crit} ${ev.dmg}`, config.palette.gold, 0.6);
        else d.floating.show('damage', ev.x, ev.y - 16, String(ev.dmg));
        sfx.hit();
        break;
      }
      case 'kill':
        if (isBossKind(ev.e.kind)) this.bossDeath(ev.e);
        else this.kill(ev.e);
        break;
      case 'stun':
        d.floating.show('small', ev.e.x, ev.e.y - ev.e.stats.radius - 24, strings.knocked, '#FFD23F', 0.6);
        break;
      case 'stunSkip':
        d.floating.show('small', ev.e.x, ev.e.y - ev.e.stats.radius - 20, strings.stunned, '#FFD23F', 0.6);
        d.particles.burst('p_star', ev.e.x, ev.e.y - ev.e.stats.radius, 6, 60, 160, { life: 0.5, scale0: 0.7, scale1: 0.1, tint: 0xffd23f });
        break;
      case 'secondWind': {
        const L = config.layout;
        d.floating.show('pop', L.heroX + 40, L.heroY - 100, strings.secondWind, '#3DDC84', 1.1);
        d.particles.ring(L.heroX, L.heroY, 20, 160, 0.4, 0x3ddc84, 1);
        d.time.slow(0.4, 0.5);
        sfxBattle.heal();
        break;
      }
      case 'attackStart':
        d.enemies.onAttackStart(ev.e);
        break;
      case 'attack':
        this.heroHurt(ev.dmg, j.trauma.heroHurt);
        sfxBattle.enemy_attack();
        break;
      case 'frozenSkip':
        d.floating.show('small', ev.e.x, ev.e.y - ev.e.stats.radius - 20, strings.frozen, '#9FE8FF', 0.6);
        d.particles.burst('p_star', ev.e.x, ev.e.y, 6, 60, 180, { life: 0.4, scale0: 0.7, scale1: 0.1, tint: 0xcff6ff });
        break;
      case 'burn':
        d.floating.show('damage', ev.e.x, ev.e.y - ev.e.stats.radius, String(ev.dmg), '#FF8A3D');
        for (let i = 0; i < 5; i++) {
          d.particles.emit('p_soft', ev.e.x + (Math.random() - 0.5) * ev.e.stats.radius, ev.e.y, { vy: -120 - Math.random() * 80, life: 0.5, scale0: 0.5, scale1: 0.1, alpha0: 0.9, tint: i % 2 ? 0xff8a3d : 0xffd23f, additive: true });
        }
        break;
      case 'bombThrow':
        sfx.whoosh();
        break;
      case 'bombBoom':
        d.particles.ring(ev.x, ev.y, 20, ev.r * 1.5, 0.3, 0xffd23f, 1);
        d.particles.burst('p_soft', ev.x, ev.y, 14, 100, 380, { drag: 3, life: 0.5, scale0: 1.2, scale1: 2.4, alpha0: 0.9, alpha1: 0, tint: 0xff8a3d, additive: true });
        d.particles.burst('p_dot', ev.x, ev.y, 16, 200, 600, { gravity: 1200, life: 0.6, scale0: 1, scale1: 0.3, tint: 0x3b3b4f });
        d.shake.add(0.35);
        sfxBattle.boom();
        break;
      case 'heal': {
        const L = config.layout;
        d.floating.show('bonus', L.heroX, L.heroY - 80, `+${Math.round(ev.amount)}`, '#3DDC84', 0.9);
        d.particles.burst('p_star', L.heroX, L.heroY, 12, 80, 220, { life: 0.6, scale0: 0.8, scale1: 0.1, gravity: -200, tint: 0x3ddc84 });
        sfxBattle.heal();
        break;
      }
      case 'bossLand':
        d.shake.add(j.trauma.bossLand);
        d.particles.burst('p_soft', ev.e.x, ev.e.y + ev.e.stats.radius * 0.8, 14, 120, 360, { drag: 3, life: 0.6, scale0: 1, scale1: 2, alpha0: 0.6, alpha1: 0, tint: 0xd8cbb8 });
        sfxBattle.boss_slam();
        break;
      case 'bossSlam':
        d.enemies.onBossSlam(ev.e);
        this.heroHurt(ev.dmg, j.trauma.bossSlam);
        sfxBattle.boss_slam();
        break;
      case 'bossPhase2':
        d.enemies.onHit(ev.e);
        d.floating.show('pop', ev.e.x, ev.e.y - ev.e.stats.radius - 30, strings.enraged, config.palette.danger, 1);
        d.shake.add(0.5);
        sfxBattle.boss_roar();
        break;
      case 'empty':
        d.hero.onEmpty();
        sfx.empty_click();
        break;
      case 'ammoLand':
        d.hero.onTokenLand();
        sfx.ammo_collect(ev.index);
        break;
      default:
        break;
    }
  }

  private heroHurt(dmg: number, trauma: number): void {
    if (config.debug.godMode) return;
    const d = this.d;
    d.hero.onHurt();
    d.shake.add(trauma);
    d.floating.show('loss', config.layout.heroX - 40 + Math.random() * 80, config.layout.heroY - 60, `-${Math.round(dmg)}`, config.palette.danger, 0.7);
    sfxBattle.hero_hurt();
    vibrate(config.haptics.heroHurt);
  }

  private kill(e: Enemy): void {
    const d = this.d;
    const j = config.juice;
    const tank = e.kind === 'tank' || e.kind === 'brute';
    d.enemies.onKill(e);
    const r = e.stats.radius;
    d.particles.burst('p_dot', e.x, e.y, 10, 160, 420, { gravity: 900, drag: 1.5, life: 0.6, scale0: r / 12, scale1: r / 40, alpha1: 0.2, tint: enemyColor(e.kind) }, r * 0.4);
    const coins = tank ? 6 : 3;
    for (let i = 0; i < coins; i++) {
      d.particles.emit('coin', e.x, e.y, { vx: (Math.random() - 0.5) * 260, vy: -260 - Math.random() * 200, gravity: 1300, life: 0.75, spin: 10, alpha0: 1, alpha1: 0 });
    }
    sfxBattle.enemy_die();
    d.shake.add(tank ? j.trauma.tankDie : j.trauma.enemyDie);
    if (tank) d.time.freeze(j.hitstop.tankDie);
  }

  /** Brief: hitstop 250 ms, slow-mo 0.3x for 0.8 s, big explosion, lots of confetti. */
  private bossDeath(e: Enemy): void {
    const d = this.d;
    d.enemies.onKill(e);
    d.time.freeze(config.juice.hitstop.bossDie);
    d.time.slow(0.3, 0.8);
    d.shake.add(1);
    d.particles.ring(e.x, e.y, 30, 260, 0.5, 0xffffff, 1);
    d.particles.burst('p_soft', e.x, e.y, 24, 150, 520, { drag: 2.5, life: 0.8, scale0: 1.6, scale1: 3, alpha0: 0.9, alpha1: 0, tint: 0xff8a3d, additive: true });
    d.particles.burst('p_dot', e.x, e.y, 30, 200, 700, { gravity: 900, life: 1, scale0: 2, scale1: 0.6, tint: enemyColor(e.kind) }, e.stats.radius * 0.5);
    for (let i = 0; i < 16; i++) {
      d.particles.emit('coin', e.x, e.y, { vx: (Math.random() - 0.5) * 500, vy: -400 - Math.random() * 300, gravity: 1300, life: 1.1, spin: 10, alpha0: 1, alpha1: 0 });
    }
    this.confetti();
    sfxBattle.boom();
  }

  turn(ev: TurnEvent): void {
    const d = this.d;
    if (ev.type === 'cards') {
      sfxBattle.card_appear();
    } else if (ev.type === 'waveIntro') {
      if (ev.boss === 'mole') {
        d.banner.show(strings.bossIncoming, config.palette.danger, 1.4);
        d.shake.add(0.4);
        sfxBattle.boss_roar();
      } else if (ev.boss) {
        d.banner.show(`${strings.waveIntro(ev.wave + 1)}`, '#FF9F1C', 1.2);
        sfxBattle.boss_roar();
      } else d.banner.show(strings.waveIntro(ev.wave + 1));
    } else if (ev.type === 'waveClear') {
      d.time.slow(config.turns.clearSlowmo, config.turns.clearSlowmoTime);
      d.banner.show(strings.waveClear, config.palette.gold, 1.3);
      sfxBattle.wave_clear();
    } else if (ev.type === 'victory') {
      d.banner.show(strings.stageClear, config.palette.gold, 1.3);
      sfxBattle.win_fanfare();
      this.confetti();
    } else if (ev.type === 'defeat') {
      d.banner.show(strings.gameOver, config.palette.danger, 1.3);
      d.shake.add(0.6);
      sfxBattle.lose();
    }
  }

  /** Heartbeat while HP is low. */
  update(dt: number, hpFrac: number): void {
    if (hpFrac <= 0 || hpFrac >= config.juice.lowHp) {
      this.heartT = 0;
      return;
    }
    this.heartT -= dt;
    if (this.heartT <= 0) {
      this.heartT = 1.1;
      sfxBattle.heartbeat();
    }
  }

  private confetti(): void {
    const L = config.layout;
    for (let i = 0; i < 60; i++) {
      this.d.particles.emit('p_confetti', Math.random() * L.width, -20, {
        vx: (Math.random() - 0.5) * 200,
        vy: 100 + Math.random() * 300,
        gravity: 400,
        drag: 0.8,
        life: 2.4,
        rot: Math.random() * 6,
        spin: (Math.random() - 0.5) * 10,
        flutter: 2 + Math.random() * 3,
        alpha0: 1,
        alpha1: 0.8,
        tint: CONFETTI[i % CONFETTI.length],
        delay: Math.random() * 0.6,
      });
    }
  }
}
