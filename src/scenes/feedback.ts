// Turns logic events into juice: visuals + sound + camera/haptics. Presentation only, no game state.
import { config, hex } from '../config';
import { sfx, InflateLoop, StrainLoop } from '../audio/sfx';
import { vibrate } from '../juice/haptics';
import type { FloatingText } from '../juice/floatingText';
import type { Particles } from '../juice/particles';
import type { ScreenFlash } from '../juice/flash';
import type { Shake } from '../juice/shake';
import type { TimeControl } from '../juice/time';
import type { Balloon, BalloonType } from '../logic/balloon';
import type { RoomEvent } from '../logic/room';
import type { SpikeField } from '../logic/spikes';
import { strings } from '../strings';
import type { BalloonView } from '../view/balloonView';
import type { HeroView } from '../view/heroView';
import type { SpikeLayerView } from '../view/spikeView';
import { balloonColor } from '../view/textures';
import type { TokenFlights } from '../view/tokens';

const CONFETTI = [0xff5da2, 0xffd23f, 0x5be7ff, 0x3ddc84, 0x9b6bff, 0xff7a1a];


export interface FeedbackDeps {
  particles: Particles;
  floating: FloatingText;
  flash: ScreenFlash;
  shake: Shake;
  time: TimeControl;
  tokens: TokenFlights;
  hero: HeroView;
  spikes: SpikeLayerView;
  field: SpikeField;
  /** Bind a pooled view to a newly spawned balloon. */
  bindView(b: Balloon): BalloonView | null;
  view(id: number): BalloonView | undefined;
  /** Hide a balloon's view now, or after `delay` real seconds (freeze-frame flash first). */
  releaseView(id: number, delay?: number): void;
}

interface Pending {
  at: number;
  fn: () => void;
}

export class Feedback {
  readonly inflate = new InflateLoop();
  readonly strain = new StrainLoop();
  private queue: Pending[] = [];
  private clock = 0;
  constructor(private d: FeedbackDeps) {}

  /** Real-time scheduler (runs during hitstop). */
  update(realDt: number): void {
    this.clock += realDt;
    for (let i = this.queue.length - 1; i >= 0; i--) {
      if (this.queue[i].at <= this.clock) {
        const p = this.queue[i];
        this.queue.splice(i, 1);
        p.fn();
      }
    }
  }

  private later(delay: number, fn: () => void): void {
    this.queue.push({ at: this.clock + delay, fn });
  }

  stopLoops(): void {
    this.inflate.stop();
    this.strain.stop();
  }

  room(ev: RoomEvent): void {
    const d = this.d;
    const j = config.juice;
    switch (ev.type) {
      case 'spawn':
        d.bindView(ev.b);
        sfx.plop();
        d.particles.ring(ev.b.x, ev.b.y, 10, 70, 0.22, 0xffffff, 0.7);
        break;
      case 'powerUp':
        this.powerUp(ev.b, ev.kind, ev.x, ev.y, ev.isNew);
        break;
      case 'deflect':
        d.view(ev.b.id)?.onDeflect();
        d.particles.burst('p_star', ev.x, ev.y, 5, 120, 260, { drag: 6, life: 0.25, scale0: 0.6, scale1: 0.1, alpha1: 0, tint: hex(config.palette.shield), additive: true });
        sfx.deflect();
        break;
      case 'blowStart':
        sfx.inflate_start();
        this.inflate.start();
        this.puffs(ev.b.x, ev.b.y + ev.b.r);
        break;
      case 'blowStop':
        this.stopLoops();
        break;
      case 'ammoTick':
        d.view(ev.b.id)?.onAmmoTick();
        sfx.ammo_tick(ev.ammo);
        break;
      case 'tierUp': {
        const b = ev.b;
        d.view(b.id)?.onTierUp(ev.tier);
        const col = ev.tier >= 4 ? 0xffffff : ev.tier === 3 ? hex(config.palette.gold) : 0xffffff;
        d.particles.ring(b.x, b.y, b.r, b.r * 1.7, 0.3, col, 0.8);
        for (let i = 0; i < j.particles.tierRing; i++) {
          const a = (i / j.particles.tierRing) * Math.PI * 2;
          const sp = 320 + Math.random() * 120;
          d.particles.emit('p_star', b.x + Math.cos(a) * b.r, b.y + Math.sin(a) * b.r, {
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            drag: 5,
            life: 0.45,
            scale0: 0.9,
            scale1: 0.1,
            alpha1: 0,
            spin: 8,
            tint: ev.tier >= 4 ? CONFETTI[i % CONFETTI.length] : col,
          });
        }
        sfx.tier_up(ev.tier);
        vibrate(config.haptics.tierUp);
        break;
      }
      case 'release':
        this.stopLoops();
        d.view(ev.b.id)?.onRelease();
        sfx.release_boing();
        sfx.whoosh();
        this.puffs(ev.b.x, ev.b.y + ev.b.r);
        break;
      case 'park':
        this.park(ev.b, ev.perfect + ev.greedy);
        break;
      case 'flyAway':
        this.flyAway(ev.b);
        break;
      case 'arrive':
        this.arrive(ev.b, ev.total);
        break;
      case 'nearMiss':
        this.nearMiss(ev.b, ev.x, ev.y, ev.bonus);
        break;
      case 'ghost':
        d.view(ev.b.id)?.onGhost();
        sfx.near_miss();
        d.floating.show('pop', ev.x, ev.y - 30, strings.whew, '#ffffff', 0.7);
        break;
      case 'shield':
        d.particles.ring(ev.b.x, ev.b.y, ev.b.r, ev.b.r * 1.4, 0.25, 0x9fe8ff);
        sfx.near_miss();
        break;
      case 'pop':
        this.pop(ev.b, ev.cause === 'overinflate', ev.lost, ev.spike);
        break;
      default:
        break;
    }
  }

  private puffs(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.d.particles.emit('p_soft', x + side * 14, y, {
        vx: side * (60 + Math.random() * 60),
        vy: -20 - Math.random() * 40,
        drag: 4,
        life: 0.35,
        scale0: 0.35,
        scale1: 0.9,
        alpha0: 0.5,
        alpha1: 0,
      });
    }
  }

  private nearMiss(b: Balloon, sx: number, sy: number, bonus: number): void {
    const d = this.d;
    d.view(b.id)?.onNearMiss();
    const mx = (sx + b.x) / 2;
    const my = (sy + b.y) / 2;
    d.floating.show('pop', mx, my - 20, strings.close, config.palette.gold, 1.05);
    d.floating.show('bonus', mx, my + 26, `+${bonus}`, config.palette.gold, 0.7);
    // swoosh streaks along the spike side
    const ang = Math.atan2(b.y - sy, b.x - sx) + Math.PI / 2;
    for (let i = -1; i <= 1; i++) {
      d.particles.emit('p_confetti', sx + Math.cos(ang) * i * 18, sy + Math.sin(ang) * i * 18, {
        vx: Math.cos(ang) * 420,
        vy: Math.sin(ang) * 420,
        drag: 6,
        life: 0.25,
        rot: ang,
        scale0: 2.6,
        scale1: 0.4,
        alpha0: 0.9,
        tint: 0xffffff,
      });
    }
    sfx.near_miss();
  }

  /** A flying balloon grabbed a power-up: burst at the pickup, then it shows inside the balloon. */
  private powerUp(b: Balloon, kind: BalloonType, x: number, y: number, isNew: boolean): void {
    const d = this.d;
    const col = balloonColor(kind);
    d.view(b.id)?.onPowerUp();
    d.particles.ring(x, y, 12, 90, 0.25, col, 0.9);
    d.particles.burst('p_star', x, y, 10, 180, 420, { drag: 5, life: 0.4, scale0: 0.9, scale1: 0.1, alpha1: 0, spin: 8, tint: col, additive: true });
    const label = `+${strings.powerNames[kind] ?? kind.toUpperCase()}`;
    d.floating.show('pop', x, y - 40, label, `#${col.toString(16).padStart(6, '0')}`, 0.9);
    if (isNew) d.floating.show('small', x + 60, y - 80, strings.newType, config.palette.gold, 0.8);
    sfx.power_up();
    vibrate(config.haptics.tierUp);
  }

  /** Reached the top and joined the gathered balloons: its number goes into the lock. */
  private park(b: Balloon, extra: number): void {
    const d = this.d;
    d.view(b.id)?.onAmmoTick();
    d.particles.ring(b.x, b.y - b.r, 10, 60, 0.2, hex(config.palette.gold), 0.9);
    sfx.plop();
    if (extra > 0 && b.releaseAir >= config.bonus.perfectThreshold) {
      d.floating.show('pop', b.x, b.y + b.r * 0.5, strings.perfect, config.palette.gold, 1.1);
    }
  }

  /** Lock not opened: the balloon sags and drifts off empty. */
  private flyAway(b: Balloon): void {
    const d = this.d;
    d.releaseView(b.id);
    d.particles.burst('p_soft', b.x, b.y, 8, 40, 160, { drag: 3, life: 0.6, scale0: b.r / 30, scale1: b.r / 18, alpha0: 0.5, alpha1: 0, tint: balloonColor('normal', b.tint) }, b.r * 0.5);
    sfx.deflate();
  }

  private arrive(b: Balloon, total: number): void {
    const d = this.d;
    const j = config.juice;
    const col = balloonColor('normal', b.tint);
    d.releaseView(b.id);
    d.particles.ring(b.x, b.y, b.r * 0.4, b.r * 1.8 + 40, 0.25, 0xffffff);
    // muzzle-like flash where the bullets come out
    d.particles.emit('p_star', b.x, b.y - b.r * 0.3, { life: 0.12, scale0: 2 + b.r / 40, scale1: 0.5, alpha0: 1, alpha1: 0, tint: 0xfff3a0, additive: true });
    const nShards = j.particles.arrivalShardsMin + Math.floor(Math.random() * (j.particles.arrivalShardsMax - j.particles.arrivalShardsMin + 1));
    const s = Math.max(0.8, b.r / 60);
    d.particles.burst('p_shard', b.x, b.y, nShards, 250, 650, { gravity: 1400, drag: 1.5, life: 0.8, scale0: s, scale1: s * 0.6, alpha0: 1, alpha1: 0, spin: 12, tint: col }, b.r * 0.5);
    for (let i = 0; i < j.particles.arrivalConfetti; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const sp = 350 + Math.random() * 450;
      d.particles.emit('p_confetti', b.x, b.y, {
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        gravity: 900,
        drag: 2.2,
        life: 1.1,
        rot: Math.random() * 6,
        spin: (Math.random() - 0.5) * 16,
        flutter: 3 + Math.random() * 3,
        alpha0: 1,
        alpha1: 0.6,
        tint: CONFETTI[i % CONFETTI.length],
      });
    }
    d.tokens.launch(b.x, b.y, d.hero.counterX(), d.hero.counterY(), total, b.type);
    sfx.arrival_pop();
    d.shake.add(j.trauma.arrival);
  }

  private pop(b: Balloon, over: boolean, lost: number, spikeIndex: number): void {
    const d = this.d;
    const j = config.juice;
    const stop = over ? j.hitstop.overinflatePop : j.hitstop.spikePop;
    if (b.attached) this.stopLoops();
    d.time.freeze(stop);
    d.flash.flash(j.flash.spikePop, over ? 0.75 : 0.6);
    d.shake.add(over ? j.trauma.overinflatePop : j.trauma.spikePop);
    if (spikeIndex >= 0) d.spikes.hit(d.field, spikeIndex);
    sfx.spike_pop(over);
    vibrate(config.haptics.spikePop);
    d.releaseView(b.id, stop);
    const x = b.x;
    const y = b.y;
    const r = b.r;
    const col = balloonColor('normal', b.tint);
    this.later(stop, () => {
      const pm = j.particles;
      const n = pm.popShardsMin + Math.floor(Math.random() * (pm.popShardsMax - pm.popShardsMin + 1)) + (over ? 8 : 0);
      const s = Math.max(0.8, r / 55);
      d.particles.burst('p_shard', x, y, n, 300, over ? 900 : 700, { gravity: 1500, drag: 1.2, life: 0.9, scale0: s, scale1: s * 0.5, alpha1: 0, spin: 14, tint: col }, r * 0.7);
      d.particles.burst('p_soft', x, y, 6, 40, 160, { drag: 3, life: 0.5, scale0: r / 40, scale1: r / 25, alpha0: 0.35, alpha1: 0, tint: 0xffffff }, r * 0.3);
      if (over) d.particles.ring(x, y, r, r * 2.4, 0.35, 0xffffff, 1);
      d.floating.show('loss', x, y, `-${lost}`, config.palette.danger, Math.min(1.6, 0.8 + r / 150));
    });
  }
}
