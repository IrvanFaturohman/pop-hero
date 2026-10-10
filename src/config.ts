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
    /** Playable room interior (balloons are clamped inside, spikes bounce off these walls). Inset
     *  from the screen edges so the earth shows around the room, like the claw machine. */
    roomLeft: 60,
    roomRight: 660,
    /** Ceiling for held balloons and the bulging chain (above the room's open top). */
    roomInnerTop: 604,
    roomBottom: 1365, // below the 1280 canvas: the camera pans down while you blow (camera.blowCenterY)
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
    // Reference: one claw grab is ~9-15 bullets per turn, so a full balloon holds 10 and a turn
    // needs ~2 balloons (lock 7-13).
    ammoMax: 10,
    ammoExp: 1.5, // convex: greed pays more
    tierT2: 4, // ammo >= this -> tier 2
    tierT3: 6,
    tierT4: 8,
    overinflateTime: 0.5, // s of strain at air = 1 before it pops itself
    hitboxScale: 0.92, // hitbox radius = visual radius * this
    riseSpeed: 420, // px/s upward kick on release (then buoyancy takes over)
    riseFactorSmall: 1.15, // kick multiplier at air = 0
    riseFactorBig: 0.8, // kick multiplier at air = 1
    spawnTime: 0.15, // s visual pop-in at the tap point (inflation starts immediately)
    dragFollow: 28, // 1/s, how fast the held balloon follows the finger (higher = snappier)
    // Released balloons float up (buoyancy), bump into each other (mass ~ size) and push the chain
    // until it snaps. Spikes pop them on the way up; once gathered under the chain spikes bounce off.
    buoyancy: 1100, // px/s^2 upward pull on released balloons
    escapeBuoyancy: 2600, // px/s^2 once the chain snaps
    drag: 3, // 1/s velocity damping
    squish: 8, // px balloons may overlap before pushing apart
    spawnGrace: 0.15, // s a new balloon can't be popped (forgives tapping right on a spike)
    strainStart: 0.85, // air above which it jitters and creaks
    stuckTime: 5, // s a released balloon may take to reach the group before it joins anyway (boss claw)
  },

  spawn: {
    cooldownAfterRelease: 0.35, // s
    cooldownAfterPop: 0.8, // s
    /** A hold that survived a pop must be released before the next balloon inflates. */
    requireFreshPressAfterPop: true,
    /** Balloons that cannot pop on the very first run (tutorial). */
    tutorialProtected: 2,
  },

  /**
   * Power-ups float in the balloon room (immune to spikes). A released balloon that flies through
   * one carries it (one per balloon) and adds one special shot to its bullets. Kinds per wave are
   * in levels.ts.
   */
  powerUps: {
    perTurn: 2, // spawned at the start of every blow phase (leftovers are replaced)
    radius: 28, // px pickup radius, added to the balloon radius
    minGap: 160, // px between power-ups
    yMin: 200, // px below the chain (clear of the lock)
    yMax: 400,
    margin: 70, // px from the side walls
    bobX: 14, // px drift
    bobY: 10,
    weights: { fire: 10, ice: 10, bomb: 7, heal: 7, star: 10, redstar: 2 },
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
    // Numbers scaled like the reference (bullets deal 30, hero has hundreds of HP) so percentage
    // upgrades (+15% damage, crit, multishot at 30%) stay visible on the damage numbers.
    hp: 300, // before meta Health upgrades and Health Boost cards
    // Turn-based: the hero fires its whole ammo as one volley, one shot at a time like the
    // reference (~2.7 shots/s measured in the walkthrough; only very long volleys speed up a bit).
    volleyTime: 5, // s a full volley aims to take
    minFireRate: 2.0, // shots per second (player: 2.8 felt too fast)
    maxFireRate: 2.4,
    bulletSpeed: 1000, // px/s (bullets visibly fly, ~0.3 s to the front enemy)
    bulletDamage: 30, // before meta Damage upgrades and Attack Damage cards
    critMult: 2, // crit damage multiplier before Crit Damage cards
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
    // Small groups per wave (reference), so each enemy is tougher than the old hordes.
    // hp in bullet-damage units (a bullet deals 30); damage = per attack, every enemy turn.
    // `small` enemies can be stunned by Knockback; fliers hover over the road.
    grunt: { hp: 210, damage: 16, radius: 28, knockback: 10, small: true, fly: false },
    runner: { hp: 120, damage: 12, radius: 20, knockback: 10, small: true, fly: false },
    tank: { hp: 520, damage: 30, radius: 40, knockback: 4, small: false, fly: false },
    flier: { hp: 270, damage: 18, radius: 26, knockback: 8, small: true, fly: true },
    brute: { hp: 1240, damage: 46, radius: 50, knockback: 2, small: false, fly: false },
    // bosses: damage is their slam
    ratking: { hp: 2100, damage: 56, radius: 74, knockback: 0, small: false, fly: false },
    mole: { hp: 5200, damage: 72, radius: 84, knockback: 0, small: false, fly: false },
  },

  /** Bosses stand behind the formation: slam every N enemy turns (telegraphed), summon rats,
   *  phase 2 at half HP. The Digger Mole also digs a claw into the balloon room every turn. */
  boss: {
    x: 585,
    phase2At: 0.5, // HP fraction
  },
  bosses: {
    ratking: { slamEvery: 2, slamEveryPhase2: 1, summonEvery: 3, summonCount: 2 },
    mole: { slamEvery: 2, slamEveryPhase2: 1, summonEvery: 3, summonCount: 2 },
  },

  /** Digger Mole claw: pokes into the balloon room from a side wall, at a new height each turn.
   *  Pops balloons being blown; released balloons bump around it. */
  claw: {
    radius: 30, // px capsule radius (the arm)
    tipRadius: 40, // px hit radius of the claw at the tip
    reach: 0.42, // fraction of the room width
    reachPhase2: 0.55,
    yMin: 760, // px range for the claw height
    yMax: 1300,
    growTime: 0.55, // s to dig in
    retractTime: 0.3, // s to pull out
  },

  /** Turn flow: you blow one balloon -> hero fires the volley -> enemies step/attack -> repeat. */
  turns: {
    // Balloons per turn to open the lock; 0 = no limit (player request): keep blowing until the
    // lock opens, popped balloons only cost time.
    balloonsPerTurn: 0,
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

  /** Ability cards between waves (reference): level 1 is free, level 2 / 3 cost yellow stars,
   *  an evolution (red card, after level 3) costs red stars. */
  cards: {
    price: [0, 0, 1, 3], // yellow stars for level n
    evoPrice: 1, // red stars
    upgradeWeight: 1.3, // offer weight of a level-up vs a new ability (1)
    evoWeight: 1.5,
    stagger: 0.08, // s between cards entering
  },

  /** Out-of-run progression (reference home screen): coins from runs buy permanent stats. */
  meta: {
    coinsPerWave: 22, // per wave cleared
    winBonus: 130,
    costBase: 10, // coins for level 1; grows with the level
    costGrowth: 12,
    damagePerLevel: 3, // + bullet damage (base 30)
    healthPerLevel: 15, // + max HP (base 300)
    armorPerLevel: 1, // - damage per enemy hit (min 1)
    levelsPerRank: 10,
    rankReward: 100, // coins when the hero ranks up
  },

  /** Power-up effects: each power-up is one special shot (reference: one claw ball = one bullet). */
  effects: {
    burnDamage: 30, // per enemy turn (fire shot)
    burnTurns: 3,
    bombDamage: 300, // bomb shot, before Attack Damage
    bombRadius: 90, // px
    bombFlight: 0.5, // s
    heal: 60, // HP from a heal power-up
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
  /** Battle phases zoom into the arena; the rest of the time the view sits lower so the (longer)
   *  balloon room fits (player request). */
  camera: { battleZoom: 1.16, battleCenterY: 470, blowCenterY: 790, speed: 5 },

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
      power_up: 0.4,
      deflect: 0.25,
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

  // Art direction: Layer Lab's flat look (monster pack battlefield colors, GUI pack frames, near-black
  // outlines). The forest colors are only used by the procedural fallback arena.
  palette: {
    skyTop: '#A9EEF0',
    skyBottom: '#5FC8CD',
    mountain: '#4DB3B7',
    treeFar: '#3C9EA1',
    treeNear: '#21777A',
    bush: '#1B6366',
    grass: '#2E8B57',
    road: '#CBB188', // monster pack bg_road_color
    roadLine: '#B89C70',
    /** Monster pack bg_color: the flat battlefield backdrop. */
    field: '#6CB59F',
    earth: '#8F7149',
    earthSpot: '#836641',
    ground: '#7BD389',
    groundDark: '#5FBF72',
    room: '#2C2D44', // GUI pack banner frame
    roomGrid: '#25263A',
    roomWall: '#0E7FF2', // GUI pack popup top bar
    roomWallDark: '#0A61D3',
    danger: '#FF3B3B',
    gold: '#FFD23F',
    outline: '#14141F',
    spikeBody: '#E53935',
    spikeCore: '#A51D1D',
    spikeTip: '#FF6B6B',
    hero: '#FFE066',
    grunt: '#34343C',
    runner: '#F4F1EC',
    tank: '#8A5534',
    flier: '#6B4C9A',
    brute: '#7A5A3A',
    ratking: '#5A4A63',
    mole: '#4A3F55',
    star: '#FFD23F',
    redStar: '#FF4D5E',
    coin: '#FFC83D',
    hpBar: '#3DDC84',
    balloonNormal: '#DD72E6',
    /** Normal balloons pick one of these (no orange/cyan/green/dark: those mark special types). */
    // no gold (star) or white (red star) either
    balloonColors: ['#FF5DA2', '#A86BFF', '#4D9DFF', '#FF9ECF', '#FF6B6B', '#DD72E6'],
    balloonFire: '#FF7A1A',
    balloonIce: '#5BE7FF',
    balloonBomb: '#3B3B4F',
    balloonHeal: '#3DDC84',
    balloonStar: '#FFC21F',
    balloonRedStar: '#F4F1FA',
    /** Shimmer on gathered balloons (safe from spikes). */
    shield: '#9FE8FF',
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
