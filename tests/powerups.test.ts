import { describe, expect, it } from 'vitest';
import { config } from '../src/config';
import { Battle } from '../src/logic/battle';
import { BalloonRoom, type RoomInput } from '../src/logic/room';
import { Rng } from '../src/logic/rng';
import type { SpikePattern } from '../src/logic/spikes';

const DT = 1 / 60;
const IDLE: RoomInput = { held: false, pressed: false, released: false, x: 0, y: 0 };

function room(types = ['normal', 'fire']): BalloonRoom {
  const r = new BalloonRoom(new Rng(7));
  r.field.enabled = false;
  r.setTypePool(types as never);
  r.setLock(99);
  return r;
}

/** Blows a balloon at (x, y) for `hold` s, releases it and lets it rise until it joins the chain. */
function blowAndRelease(r: BalloonRoom, x: number, y: number, hold = 0.6): void {
  r.step(DT, { held: true, pressed: true, released: false, x, y });
  for (let t = 0; t < hold; t += DT) r.step(DT, { held: true, pressed: false, released: false, x, y });
  r.step(DT, { held: false, pressed: false, released: true, x, y });
  for (let i = 0; i < 240 && r.anyInRoom(); i++) r.step(DT, IDLE);
}

/** One spike ball parked at (x, y). */
function still(x: number, y: number): SpikePattern {
  return { id: 'still', name: 'Still', speedMult: 1, spikes: [{ kind: 'bouncer', x, y, angle: 0, speed: 0 }] };
}

describe('power-ups', () => {
  it('spawn per turn below the chain, only from the wave pool', () => {
    const r = room(['normal', 'star']);
    const L = config.layout;
    const pc = config.powerUps;
    expect(r.powerUps.items).toHaveLength(pc.perTurn);
    for (const p of r.powerUps.items) {
      expect(p.kind).toBe('star');
      expect(p.y).toBeGreaterThanOrEqual(L.ropeY + pc.yMin);
      expect(p.y).toBeLessThanOrEqual(L.ropeY + pc.yMax);
    }
    expect(room(['normal']).powerUps.items).toHaveLength(0);
  });

  it('a balloon flying through one carries it (one per balloon)', () => {
    const r = room();
    const p = r.powerUps.items[0];
    blowAndRelease(r, p.baseX, config.layout.roomBottom - 40);
    const parked = r.flying.find((b) => b.state === 'parked');
    expect(parked?.type).toBe('fire');
    expect(r.powerUps.items.some((o) => o.id === p.id)).toBe(false);
    expect(r.stats.powerUps).toBe(1);
  });

  it('spikes pop rising balloons, but glance off gathered ones', () => {
    const r = room(['normal']);
    const x = 200;
    r.field.enabled = true;
    r.requestPattern(still(x, 900), true);
    blowAndRelease(r, x, config.layout.roomBottom - 40, 0.2);
    expect(r.stats.popFly).toBe(1);

    const safe = room(['normal']);
    blowAndRelease(safe, x, config.layout.roomBottom - 40, 0.2);
    const b = safe.flying.find((o) => o.state === 'parked');
    expect(b).toBeDefined();
    safe.field.enabled = true;
    safe.requestPattern(still(b!.x, b!.y + b!.r), true);
    for (let i = 0; i < 30; i++) safe.step(DT, IDLE);
    expect(b!.state).toBe('parked');
    expect(safe.stats.popFly).toBe(0);
  });
});

describe('power-up shots', () => {
  it('one power-up = one special shot, fired before the normal bullets', () => {
    const battle = new Battle(new Rng(1));
    battle.spawnEnemy('tank');
    battle.deliver(10, 'fire');
    for (let i = 0; i < 120; i++) battle.step(DT);
    expect(battle.ammo).toBe(10);
    expect(battle.weapons.specials).toEqual(['fire']);

    battle.startVolley();
    const kinds: string[] = [];
    for (let i = 0; i < 600 && !battle.volleyDone; i++) {
      battle.step(DT);
      for (const ev of battle.events) if (ev.type === 'shoot') kinds.push(ev.kind);
      battle.drain();
    }
    expect(kinds[0]).toBe('fire');
    expect(kinds.filter((k) => k === 'fire')).toHaveLength(1);
    expect(battle.weapons.specials).toHaveLength(0);
  });

  it('heal is a fixed amount, not scaled by the balloon', () => {
    const battle = new Battle(new Rng(1));
    battle.hp = 100;
    battle.deliver(10, 'heal');
    for (let i = 0; i < 120; i++) battle.step(DT);
    expect(battle.hp).toBe(100 + config.effects.heal);
  });
});
