// All tuning numbers live here. No magic numbers in other files.
// The debug panel reads/writes this object live, so it must stay a plain mutable object.

export type InflateCurve = 'linear' | 'easeIn' | 'easeOut' | 'smooth';

export const config = {
  /** Logical layout in px (720 x 1280, y down). */
  layout: {
    width: 720,
    height: 1280,
    /** Where the dark earth under the road starts (the balloon room is dug into it). */
    roomTop: 640,
    /** Playable room interior (balloons are clamped inside, spikes bounce off these walls). */
    roomLeft: 20,
    roomRight: 700,
    /** Ceiling for held balloons and the bulging chain (above the room's open top). */
    roomInnerTop: 604,
    roomBottom: 1260,
    /** The room has no top wall (reference): its open top, with the chain anchored across it. */
    roomOpenTop: 648,
    /** Gold chain + lock anchored on top of the side walls; released balloons push it up until it snaps. */
    ropeY: 664,
    /** Escaping balloons burst into bullet balls when they rise above this (over the hero). */
    burstY: 430,
    /** Reference tap point (keyboard Space on desktop). */
    refSpawnX: 360,
    refSpawnY: 1100,
    /** Side-view arena: hero on the left facing right, enemies come from the right. */
    heroX: 110,
    heroY: 500,
    /** Where feet touch the road. */
    groundY: 548,
    /** Top of the dirt road (forest above it). */
    horizonY: 420,
    /** Hero HP bar + bullet count pill, under the hero's feet (like the reference). */
    heroBarY: 576,
    ammoCounterX: 110,
    ammoCounterY: 606,
    /** Max device pixel ratio used for the render resolution. */
    maxDpr: 2,
  },

  balloon: {
    rMin: 22, // px
    rMax: 150, // px
    inflateRate: 0.45, // air per second (full in ~2.2 s)
    curve: 'linear' as InflateCurve,
    ammoMax: 40,
    ammoExp: 1.5, // convex: greed pays more
    tierT2: 10, // ammo >= this -> tier 2
    tierT3: 20,
    tierT4: 30,
    overinflateTime: 0.5, // s of strain at air = 1 before it pops itself
    hitboxScale: 0.92, // hitbox radius = visual radius * this
    riseSpeed: 420, // px/s upward kick on release (then buoyancy takes over)
    riseFactorSmall: 1.15, // kick multiplier at air = 0
    riseFactorBig: 0.8, // kick multiplier at air = 1
    spawnTime: 0.15, // s visual pop-in at the tap point (inflation starts immediately)
    dragFollow: 28, // 1/s, how fast the held balloon follows the finger (higher = snappier)
    // Released balloons are spike-proof (spikes bounce off them, like the reference). They float
    // up (buoyancy), bump into each other (mass ~ size) and push the chain until it snaps.
    buoyancy: 1100, // px/s^2 upward pull on released balloons
    escapeBuoyancy: 2600, // px/s^2 once the chain snaps
    drag: 3, // 1/s velocity damping
    squish: 8, // px balloons may overlap before pushing apart
    spawnGrace: 0.15, // s a new balloon can't be popped (forgives tapping right on a spike)
    strainStart: 0.85, // air above which it jitters and creaks
  },

  spawn: {
    cooldownAfterRelease: 0.35, // s
    cooldownAfterPop: 0.8, // s
    /** A hold that survived a pop must be released before the next balloon inflates. */
    requireFreshPressAfterPop: true,
    /** Balloons that cannot pop on the very first run (tutorial). */
    tutorialProtected: 2,
    /** Type weights (types unlock from wave 2, see levels.ts). */
    typeWeights: { normal: 60, fire: 12, ice: 12, bomb: 8, heal: 8 },
    queueSize: 3, // upcoming balloon types shown (= balloons per turn)
  },

  bonus: {
    nearMissDistance: 10, // px between visual balloon edge and spike surface
    nearMissBonus: 0.1, // fraction of ammo
    perfectThreshold: 0.9, // air at release
    perfectBonus: 0.1, // fraction of ammo
    dangerDistance: 40, // px; red edge glow / danger ticks start here
  },

  spikes: {
    armHalfThickness: 5, // px (arm is a 10 px capsule)
    ballRadius: 18, // px
    hubRadius: 20, // px
    transitionOut: 0.35, // s old pattern shrinks away
    transitionIn: 0.6, // s new pattern grows in
    speedMult: 1, // global spike speed (Slow Gears etc multiply this)
    validatorPhases: 24,
    validatorAirs: [0.3, 0.5, 0.7, 0.9],
    /** s of spike motion sampled for patterns that never repeat exactly (bouncers). */
    validatorWindow: 12,
    /** Tap points the validator averages over (balloons spawn where the player taps). */
    validatorTaps: [
      [160, 800],
      [360, 800],
      [560, 800],
      [160, 1000],
      [360, 1000],
      [560, 1000],
      [160, 1190],
      [360, 1190],
      [560, 1190],
    ] as Array<[number, number]>,
  },

  hero: {
    hp: 150, // brief: 100; every enemy hits every turn (hordes)
    // Turn-based: the hero fires its whole ammo as one volley. Rate scales so big volleys stay short.
    volleyTime: 1.6, // s a full volley aims to take
    minFireRate: 8, // shots per second
    maxFireRate: 45,
    bulletSpeed: 1400, // px/s
    bulletDamage: 1,
    recoil: 4, // px
  },

  enemies: {
    // Enemies line up in front of the hero (formation slots) and ALL attack on every enemy turn:
    // they dash to the hero, hit, and run back. Survivors slide forward to fill gaps.
    slotX0: 240, // first formation column x
    slotDX: 70, // px between columns
    moveTime: 0.4, // s to walk in / slide into a slot
    attackStagger: 0.13, // s between consecutive attacks (shrinks for big hordes)
    attackTurnMax: 1.4, // s cap for all attacks to start in one enemy turn
    attackHit: 0.15, // s from dash start to the hit
    attackTime: 0.36, // s whole dash (go, hit, back)
    laneOffsets: [-42, -14, 14, 42], // px around groundY for depth (4 lanes, hordes)
    // HP doubled vs the brief (6/3/25): the x1-x2 height multiplier doubles ammo supply.
    // damage = per attack, every enemy turn.
    grunt: { hp: 12, damage: 4, radius: 28, knockback: 10 },
    runner: { hp: 6, damage: 3, radius: 20, knockback: 10 },
    tank: { hp: 50, damage: 8, radius: 40, knockback: 4 },
    // brief 300 HP x2 like the other enemies; damage is its slam
    boss: { hp: 600, damage: 15, radius: 74, knockback: 0 },
  },

  /** Boss (turn-based version of the brief: slam every N enemy turns, summons, phase 2). */
  boss: {
    x: 585, // stands behind the formation
    slamEvery: 2, // enemy turns between slams (telegraphed the turn before)
    slamEveryPhase2: 1,
    summonEvery: 3, // enemy turns between summons
    summonCount: 3,
    phase2At: 0.5, // HP fraction
    lock: 65, // lock number during the boss fight
  },

  /** Turn flow: you blow one balloon -> hero fires the volley -> enemies step/attack -> repeat. */
  /** Bullets carry over between turns (reference) but not between waves: on wave clear every
   *  leftover bullet flows into the HP bar and the ammo starts again at 0. */
  leftover: {
    bulletsPerHp: 4,
    delay: 0.7, // s after "WAVE CLEAR" before the bullets start flowing
    steps: 20, // the flow is split into at most this many chunks
    interval: 0.05, // s between chunks
  },

  turns: {
    balloonsPerTurn: 3, // balloons (moves) per turn to open the lock
    unlockDelay: 0.35, // s of straining chain before it snaps
    failDelay: 0.9, // s "LOCKED" before the turn goes on without bullets
    introTime: 1.2, // s "WAVE n" banner before the first enemies walk in
    collectDelay: 0.15, // s after the last bullet token lands before firing
    enemyDelay: 0.25, // s after the volley before enemies act
    clearTime: 2.2, // s "WAVE CLEAR" before the next wave
    clearSlowmo: 0.5, // time scale of the "WAVE CLEAR" slow-mo
    clearSlowmoTime: 0.3, // s
    roomDim: 0.45, // alpha of the dark overlay on the balloon room when it is not your turn
  },

  juice: {
    reducedMotion: false,
    shakeMult: 1,
    flashEnabled: true,
    shake: { maxOffset: 18, maxRotationDeg: 2, traumaDecay: 1.6, noiseFreq: 14 },
    trauma: {
      arrival: 0.25,
      spikePop: 0.5,
      overinflatePop: 0.6,
      heroHurt: 0.3,
      enemyDie: 0.08,
      tankDie: 0.2,
      bossLand: 0.6,
      bossSlam: 0.7,
    },
    hitstop: { spikePop: 0.09, overinflatePop: 0.11, tankDie: 0.025, bossDie: 0.25 }, // s
    flash: { spikePop: 0.06, tierUp: 0.08 }, // s
    slowmo: { easeIn: 0.06, easeOut: 0.18 }, // s
    reducedMotionShake: 0.3,
    spring: { stiffness: 320, damping: 14 },
    particles: {
      max: 600,
      popShardsMin: 16,
      popShardsMax: 24,
      arrivalShardsMin: 12,
      arrivalShardsMax: 20,
      arrivalConfetti: 20,
      tierRing: 18,
    },
    tokens: { max: 50, stagger: 0.009, flightTime: 0.55 }, // bullet balls pouring to the hero
    innerBalls: 50, // max bullet balls drawn inside a balloon
    ammoPunch: { scale: 1.25, time: 0.12 },
    releaseAnim: { squashTime: 0.05, stretchTime: 0.06, settleTime: 0.3 },
    trailGhosts: 4,
    hpChipDelay: 0.4, // s before the white HP chip catches up
    lowHp: 0.3, // fraction of HP where the red pulse + heartbeat start
    dangerVignette: 0.32, // max alpha of the red room vignette near spikes
  },

  /** Upgrade cards between waves. */
  cards: {
    rarityWeights: { common: 60, rare: 30, epic: 10 },
    stagger: 0.08, // s between cards entering
  },

  /** Special balloon effects (from wave 2). Turn-based versions of the brief's timings. */
  effects: {
    burnDamage: 1, // per enemy turn
    burnTurns: 3,
    bombDamageMult: 1.5, // bomb damage = balloon number x this
    bombRadius: 90, // px
    bombFlight: 0.5, // s
    healMult: 0.8, // heal = balloon number x this
  },

  /** The chain (verlet rope) the balloons push against. */
  rope: {
    points: 31,
    slack: 1.05, // rope length / span: how far balloons can bulge it
    gravity: 150, // px/s^2 (light chain: one balloon can already bulge it)
    damping: 0.985, // velocity kept per step
    iterations: 16,
    pointShare: 0.9, // how much of a balloon/chain overlap the chain gives way
  },

  /** Camera moves into the battle while the hero fires / enemies act (like the reference). */
  camera: { battleZoom: 1.16, battleCenterY: 470, speed: 5 },

  haptics: { enabled: true, tierUp: 15, spikePop: 40, heroHurt: 25 }, // ms

  audio: {
    master: 0.8,
    muted: false,
    musicOn: false,
    volumes: {
      inflate_start: 0.35,
      inflate_loop: 0.12,
      ammo_tick: 0.16,
      tier_up: 0.32,
      danger_tick: 0.16,
      strain: 0.14,
      release_boing: 0.32,
      whoosh: 0.22,
      arrival_pop: 0.45,
      ammo_collect: 0.14,
      spike_pop: 0.6,
      overinflate_pop: 0.7,
      near_miss: 0.35,
      plop: 0.3,
      shoot: 0.08,
      empty_click: 0.3,
      hit: 0.14,
      ui_tap: 0.3,
      enemy_die: 0.3,
      hero_hurt: 0.4,
      heartbeat: 0.45,
      wave_clear: 0.4,
      lose: 0.45,
      win_fanfare: 0.45,
      enemy_attack: 0.18,
      lock_tick: 0.16,
      unlock: 0.45,
      chain_snap: 0.55,
      boom: 0.55,
      heal: 0.35,
      boss_roar: 0.5,
      boss_slam: 0.6,
      card_appear: 0.3,
      card_select: 0.4,
      music: 0.1,
      locked: 0.4,
      deflate: 0.3,
    } as Record<string, number>,
  },

  // Art direction follows the references: forest strip + dirt road + dark earth (Claw Master),
  // gray balloon room with cyan walls, pink balloons and red spike stars (Puff Up). All drawn in code.
  palette: {
    skyTop: '#A9EEF0',
    skyBottom: '#5FC8CD',
    mountain: '#4DB3B7',
    treeFar: '#3C9EA1',
    treeNear: '#21777A',
    bush: '#1B6366',
    grass: '#2E8B57',
    road: '#CBC2B5',
    roadLine: '#B6AC9F',
    earth: '#4E3B37',
    earthSpot: '#443330',
    ground: '#7BD389',
    groundDark: '#5FBF72',
    room: '#86868D',
    roomGrid: '#7C7C83',
    roomWall: '#4FDDF5',
    roomWallDark: '#2AA9C2',
    danger: '#FF3B3B',
    gold: '#FFD23F',
    outline: '#22163F',
    spikeBody: '#E53935',
    spikeCore: '#A51D1D',
    spikeTip: '#FF6B6B',
    hero: '#FFE066',
    grunt: '#34343C',
    runner: '#F4F1EC',
    tank: '#8A5534',
    boss: '#5A4A63',
    hpBar: '#3DDC84',
    balloonNormal: '#DD72E6',
    /** Normal balloons pick one of these (no orange/cyan/green/dark: those mark special types). */
    balloonColors: ['#FF5DA2', '#A86BFF', '#4D9DFF', '#FFC93C', '#FF6B6B', '#DD72E6'],
    balloonFire: '#FF7A1A',
    balloonIce: '#5BE7FF',
    balloonBomb: '#3B3B4F',
    balloonHeal: '#3DDC84',
    text: '#FFFFFF',
  },

  debug: {
    timeScale: 1,
    showHitbox: false,
    godMode: false,
    infiniteAmmo: false,
    spikesOff: false,
    noPop: false,
    seed: 12345,
  },
};

export type Config = typeof config;

/** '#RRGGBB' -> 0xRRGGBB */
export function hex(color: string): number {
  return parseInt(color.slice(1), 16);
}

export const FIXED_DT = 1 / 60;
export const MAX_STEPS_PER_FRAME = 5;
