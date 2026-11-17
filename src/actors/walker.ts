import { Container, Graphics } from 'pixi.js';
import { mulberry32 } from '../rng';
import { C, buildDiveBag, buildHelmet, buildShoulderLamp, chromeBands, coiledHose, etching, rivets, scratches, segment } from './diver';
import { Glance, Spring, approach, breathShape, clamp, smoothstep } from './animkit';

/**
 * The explorer on foot (after milestone 8 part 2: dry interiors with
 * gravity, walking, jumping, ladders and the grapple, and a helmet face
 * plate that lifts). Character animation session B rebuilt it from the
 * swimming diver's own parts (`src/actors/diver.ts`): the same helmet with
 * the face inside, collar yoke, blue-steel chrome, charcoal suit with brass
 * etching, twin tanks and harpoon, coiled hose, shoulder lamp, red gloves,
 * hip thruster and dive bag. It is the same person in a different place.
 *
 * Everything is drawn once into jointed pieces; each frame only turns and
 * moves them (no redrawing). The legs are placed by two-bone IK: a planted
 * foot stays fixed on the floor in world space while the body passes over it,
 * so feet never slide. Every state (standing, walking, the jump, falling,
 * landing, the grapple, ladders, working at a console) gives targets for
 * the feet, hands, hips and lean, and a short blend carries the limbs from
 * one state into the next.
 *
 * (x, y) is the point between the boots on the floor; facing right in local
 * space; the figure stands about 108 units to the top of the helmet.
 */

export type WalkPose = 'stand' | 'walk' | 'jump' | 'fall' | 'hang' | 'climb';

const rand = mulberry32(0x3a1c);
const FAR_TINT = 0x9a9a9a;

// ---- Proportions (walker units) ----
const THIGH = 23;
const SHIN = 22;
/** The ankle's height above the floor with the foot flat, and the heel and ball of the foot either side of it. */
const ANKLE_H = 5;
const HEEL = 5.5;
const BALL = 8;
const UPPER = 15;
const FORE = 15;
const REACH = THIGH + SHIN - 0.4;
/** Hip height standing (knees a little soft). */
const STAND_HIP = -49.5;
/** Torso space: origin at the pelvis, up is -y. */
const SHOULDER_X = 1;
const SHOULDER_Y = -30;
const NECK_X = 3;
const NECK_Y = -34;
const PACK_X = -11;
const PACK_Y = -17;
const PORT_X = 11;
const PORT_Y = -27;
const LENS_X = 17.5;
const LENS_Y = -20;
const NOZZLE_X = -21;
const NOZZLE_Y = -4;
/** The diver's helmet, scaled to the walker. */
const HELMET_K = 0.57;
/** Ladder rungs (as `drawLadder` in the interior draws them): every 20 units, 8 below each tile's top. */
export const RUNG_GAP = 20;
export const RUNG_OFFSET = 8;
/** Each hand and foot moves this far up the ladder per cycle (3 rungs). */
const CLIMB_STRIDE = 60;

type Mode = 'ground' | 'air' | 'hang' | 'climb';

interface Leg {
  thigh: Container;
  shin: Container;
  foot: Container;
  blade: Container;
}
interface Arm {
  upper: Container;
  fore: Container;
}
interface Foot {
  /** Planted: where the ankle is, in world x (with the foot flat). */
  wx: number;
  planted: boolean;
  /** Walking: where this swing started (world x), and the stance fraction then (a swing always finishes). */
  liftX: number;
  liftY: number;
  swingB: number;
  /** Standing: a small step to settle under the hips (-1 when not stepping). */
  stepT: number;
  stepFrom: number;
  stepTo: number;
  stepH0: number;
  stepDur: number;
  /** The ankle drawn last frame (local) and its foot angle (positive = heel up). */
  ax: number;
  ay: number;
  roll: number;
  /** Target this frame, before the blend. */
  tx: number;
  ty: number;
  troll: number;
  /** Blend offsets that carry the foot from the last state into this one. */
  ox: Spring;
  oy: Spring;
  /** The fin blade's flex at the ball of the foot. */
  blade: Spring;
  prevAy: number;
  /** How close a swinging foot is to its footfall (0..1), so the hips can come down to meet it. */
  reachW: number;
}

function newFoot(wx: number): Foot {
  return {
    wx,
    planted: true,
    liftX: wx,
    liftY: -ANKLE_H,
    swingB: 0.6,
    stepT: -1,
    stepFrom: wx,
    stepTo: wx,
    stepH0: 0,
    stepDur: 0.25,
    ax: 0,
    ay: -ANKLE_H,
    roll: 0,
    tx: 0,
    ty: -ANKLE_H,
    troll: 0,
    ox: new Spring(0),
    oy: new Spring(0),
    blade: new Spring(0),
    prevAy: -ANKLE_H,
    reachW: 0,
  };
}

interface ArmState {
  /** Target angles this frame (local, radians; 0 = pointing forward, PI/2 = down), and eased towards them. */
  tu: number;
  tf: number;
  su: number;
  sf: number;
  /** Drawn angles (upper arm, forearm). */
  u: number;
  f: number;
  /** Blend offsets, as for the feet, and a jolt (landings) on the shoulder. */
  ou: Spring;
  of: Spring;
  jolt: Spring;
}

function newArm(u: number, f: number): ArmState {
  return { tu: u, tf: f, su: u, sf: f, u, f, ou: new Spring(0), of: new Spring(0), jolt: new Spring(0) };
}

/** Wrap an angle difference into -PI..PI. */
function wrap(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// ---------------------------------------------------------------------------
// The pieces, drawn once.

function buildLeg(far: boolean): Leg {
  const tint = far ? FAR_TINT : 0xffffff;
  const thigh = new Container();
  const tg = segment(THIGH, 12, C.suit, C.suitShade);
  etching(tg, 2, -4.5, 13, 9, 2, rand);
  // Chrome knee guard, as on the diver.
  chromeBands(tg, THIGH - 5, -6.5, 9, 13, 3);
  rivets(tg, [[THIGH - 0.5, -3.5], [THIGH - 0.5, 3.5]], 0.8);
  tg.tint = tint;
  thigh.addChild(tg);

  const shin = new Container();
  shin.x = THIGH;
  const sg = segment(SHIN, 10.5, C.suit, C.suitShade);
  etching(sg, 3, -3.5, 12, 7, 2, rand);
  sg.rect(SHIN - 8, -5.4, 4, 10.8).fill({ color: C.red, alpha: 0.9 }); // ankle strap
  scratches(sg, 2, -4, 16, 6, 3, 0.22, rand);
  sg.tint = tint;
  shin.addChild(sg);
  thigh.addChild(shin);

  // The boot: heel, sole and instep, with the short fin blade on its own
  // joint at the ball of the foot so it can stay flat on the floor as the
  // heel lifts (the toe-off) and trail a little in the air.
  const foot = new Container();
  foot.x = SHIN;
  const fg = new Graphics();
  fg.moveTo(-4.5, -5.5)
    .lineTo(2.5, -6)
    .quadraticCurveTo(6.5, -3.5, BALL + 1, 1)
    .lineTo(BALL + 1.2, ANKLE_H)
    .lineTo(-HEEL, ANKLE_H)
    .quadraticCurveTo(-7, 1.5, -4.5, -5.5)
    .closePath()
    .fill({ color: C.rubber });
  fg.moveTo(-HEEL, ANKLE_H - 0.6).lineTo(BALL + 1, ANKLE_H - 0.6).stroke({ color: C.rubberEdge, width: 1.2 });
  fg.moveTo(-1, -1.5).lineTo(5.5, 0.5).stroke({ color: C.visor, width: 0.9, alpha: 0.6 });
  fg.tint = tint;
  const blade = new Container();
  blade.position.set(BALL - 1, ANKLE_H);
  const bg = new Graphics();
  bg.moveTo(0, -4).lineTo(11, -2.6).quadraticCurveTo(13.5, -1.6, 12.5, 0).lineTo(0, 0).closePath().fill({ color: C.rubber });
  bg.moveTo(7.5, -3.1).lineTo(11, -2.6).quadraticCurveTo(13.5, -1.6, 12.5, 0).lineTo(7.5, 0).closePath().fill({ color: C.red });
  bg.moveTo(11, -2.6).quadraticCurveTo(13.5, -1.6, 12.5, 0).stroke({ color: C.redShade, width: 1.2, alpha: 0.9 });
  bg.moveTo(1, -2).lineTo(7, -1.5).stroke({ color: 0x3e4140, width: 0.8, alpha: 0.7 });
  bg.tint = tint;
  blade.addChild(bg);
  foot.addChild(fg, blade);
  shin.addChild(foot);
  return { thigh, shin, foot, blade };
}

function buildArm(far: boolean): Arm {
  const tint = far ? FAR_TINT : 0xffffff;
  const upper = new Container();
  const ug = segment(UPPER, 9, C.sleeve, C.sleeveShade);
  ug.circle(0, 0, 5.2).fill({ color: C.chrome }); // shoulder joint ring
  ug.circle(-0.8, -1.3, 2.2).fill({ color: C.chromeHi, alpha: 0.6 });
  ug.circle(0, 0, 5.2).stroke({ color: C.chromeDark, width: 1 });
  scratches(ug, 4, -3.5, 10, 7, 2, 0.22, rand);
  ug.tint = tint;
  upper.addChild(ug);
  const fore = new Container();
  fore.x = UPPER;
  const fg = segment(10.5, 8, C.sleeve, C.sleeveShade);
  // Red glove with a chrome cuff ring (the diver's).
  fg.roundRect(10, -4.6, 9.5, 9.2, 4).fill({ color: C.red });
  fg.roundRect(11.5, 0.8, 7, 3, 1.4).fill({ color: C.redShade, alpha: 0.7 });
  fg.rect(9, -4.5, 2.6, 9).fill({ color: C.chrome });
  fg.tint = tint;
  fore.addChild(fg);
  upper.addChild(fore);
  return { upper, fore };
}

/** The suit's body, upright: origin at the pelvis, up is -y, front is +x. */
function buildTorso(): Graphics {
  const g = new Graphics();
  g.roundRect(-11.5, -36, 24, 41, 9).fill({ color: C.suit });
  g.roundRect(-11, -33, 6, 36, 3).fill({ color: C.suitShade, alpha: 0.75 }); // the back, away from the light
  g.roundRect(7, -32, 4, 30, 2).fill({ color: C.suitLight, alpha: 0.45 });
  etching(g, -6, -30, 15, 22, 6, rand);
  // Harness strap round the chest, and the belt with a chrome buckle.
  g.rect(-11.5, -25, 24, 3.6).fill({ color: C.chromeDark, alpha: 0.85 });
  g.rect(-11.5, -3, 24, 5).fill({ color: C.suitShade });
  chromeBands(g, 6, -4, 6.5, 7, 2);
  scratches(g, -9, -32, 19, 30, 5, 0.22, rand);
  for (let i = 0; i < 5; i++) g.circle(-8 + rand() * 6, -10 + rand() * 12, 0.6 + rand() * 0.8).fill({ color: 0x5f7a3a, alpha: 0.45 });
  // Hip thruster rig (as the diver's): a white housing with a lime nozzle pointing back.
  g.roundRect(-20, -8, 13, 9, 3.5).fill({ color: 0xd8dde0 });
  g.roundRect(-19, -7.4, 11, 2.4, 1.2).fill({ color: 0xffffff, alpha: 0.6 });
  g.rect(-13, -8, 1.6, 9).fill({ color: 0x8e979c });
  g.roundRect(-24, -7, 5, 7, 1.6).fill({ color: C.chromeDark });
  g.circle(NOZZLE_X - 0.5, NOZZLE_Y, 3).fill({ color: C.visor, alpha: 0.9 });
  // Collar yoke: the chrome ring round the shoulders that seats the helmet.
  g.moveTo(-10.5, -31)
    .lineTo(-8.5, -38.5)
    .quadraticCurveTo(2, -42.5, 12.5, -37.5)
    .quadraticCurveTo(15, -31, 13, -27.5)
    .quadraticCurveTo(2, -30.5, -10.5, -31)
    .closePath()
    .fill({ color: C.chrome })
    .stroke({ color: C.chromeDark, width: 1 });
  g.moveTo(-7, -37).quadraticCurveTo(2, -40.5, 11, -36).stroke({ color: C.chromeHi, width: 1.4, alpha: 0.7, cap: 'round' });
  g.moveTo(-8, -32.5).quadraticCurveTo(2, -33.5, 12, -30).stroke({ color: C.chromeMid, width: 1.3, alpha: 0.9, cap: 'round' });
  rivets(g, [[-6.5, -35], [10.5, -33.5]], 0.7);
  // Regulator port on the chest, with grille slots below.
  g.circle(PORT_X, PORT_Y, 4.2).fill({ color: C.chrome }).stroke({ color: C.chromeDark, width: 0.9 });
  g.circle(PORT_X + 0.6, PORT_Y, 1.9).fill({ color: 0x0d1114 });
  g.circle(PORT_X - 1.3, PORT_Y - 1.5, 1).fill({ color: C.chromeHi, alpha: 0.8 });
  for (let i = 0; i < 3; i++) g.rect(6.5 + i * 2, PORT_Y + 4.5, 1.2, 2).fill({ color: C.chromeDark });
  return g;
}

/** Twin tanks and the harpoon on the back: origin where the pack meets the back. */
function buildPack(): Graphics {
  const g = new Graphics();
  // Harpoon clipped behind the tanks: white stock, chrome barrel, spear tip above the shoulder.
  g.moveTo(-15, 26).lineTo(-9, -42).stroke({ color: C.chromeDark, width: 1.5 });
  g.poly([-9, -42, -11, -36.5, -7.4, -36.8]).fill({ color: C.chromeHi });
  g.roundRect(-17.2, 4, 5, 18, 2.5).fill({ color: 0xd8dde0 });
  g.moveTo(-15.4, 6).lineTo(-14.8, 20).stroke({ color: 0x8e979c, width: 0.8 });
  // Twin oxygen tanks (the diver's): dark chrome, lime bands, valves and caps on top.
  for (const [tx, shade] of [[-16, C.steelDark], [-10.5, C.chromeDark]] as const) {
    g.roundRect(tx, -19, 9.5, 36, 4.75).fill({ color: shade });
    g.roundRect(tx + 1.8, -17, 2.2, 32, 1.1).fill({ color: 0x8e9aa2, alpha: 0.55 });
    g.rect(tx, -3, 9.5, 3).fill({ color: C.visor, alpha: 0.9 });
    g.rect(tx, 7, 9.5, 1.4).fill({ color: C.visor, alpha: 0.6 });
    g.rect(tx + 2.7, -23, 4, 4.5).fill({ color: C.steelLight });
    g.rect(tx + 1.3, -25, 6.8, 2.4).fill({ color: C.chromeDark });
    scratches(g, tx + 1, -17, 7, 32, 2, 0.25, rand);
  }
  return g;
}

// ---------------------------------------------------------------------------

export class Walker {
  readonly view = new Container();
  /** Unlit: the shoulder lamp's lens and the thruster nozzle's glow (in world space). */
  readonly lens = new Container();
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  face = 1;
  onGround = false;
  pose: WalkPose = 'stand';
  /** 0 = face plate down (sealed), 1 = lifted. */
  visor = 0;
  visorTarget = 1;
  /** Hand-over-hand progress on a ladder (kept for compatibility; the climb now follows the rungs). */
  climbPhase = 0;
  /** Holding Collect at something (0..1): the near hand works at it. */
  working = 0;
  /** How heavy the dive bag is (0 empty, 1 rated): shows the bag, as on the diver. */
  load = 0;
  /** Whether the shoulder lamp is on (its lens glows). */
  lampOn = true;
  /** Where the grapple hook is (while it flies, reels in and holds), or null. */
  hangTo: { x: number; y: number } | null = null;

  private rig = new Container();
  private nearLeg = buildLeg(false);
  private farLeg = buildLeg(true);
  private nearArm = buildArm(false);
  private farArm = buildArm(true);
  private torso = buildTorso();
  private pack = buildPack();
  private hose = new Graphics();
  private helmet = new Container();
  private headRig!: Container;
  private eyelid!: Container;
  private plate!: Container;
  private lampC = new Container();
  private bag = buildDiveBag();
  private lampDot = new Graphics();
  private nozzleDot = new Graphics();

  // ---- Animation state (plain numbers and springs; nothing is made per frame) ----
  private time = 0;
  private mode: Mode = 'ground';
  private feet: Foot[] = [newFoot(0), newFoot(0)];
  private arms: ArmState[] = [newArm(1.45, 1.2), newArm(1.6, 1.3)];
  private faceS = new Spring(1);
  private faceWas = 1;
  /** 1 just after turning, fading: a dip and a step round. */
  private turnT = 0;
  // Walking.
  private gaitOn = false;
  private phase = 0;
  /** 0..1: how far into walking (arm swing, bob and lean build over the first steps). */
  private walkAmt = 0;
  /** 0..1 over the first strides: the first steps are shorter. */
  private gaitRamp = 0;
  private stepCool = 0;
  // The body.
  private hipDrop = new Spring(0);
  private hipX = new Spring(0);
  private hipYOff = new Spring(0);
  private lean = new Spring(0.03);
  private idleShift = 0;
  private idleTimer = 3;
  private idleSide = 1;
  // Air.
  private airT = 0;
  private pushT = 0;
  private pushFloor = 0;
  private tuck = 0;
  private lastAirVy = 0;
  private fallT = 0;
  // Hang and climb.
  private swayS = new Spring(0);
  private climbMove = 0;
  // Breathing, head and gear.
  private breath = 0.2;
  private heave = 0;
  private exert = 0;
  private glance = new Glance(rand, 3);
  private headS = new Spring(0);
  private packS = new Spring(0);
  private packTilt = new Spring(0);
  private hoseS = new Spring(0);
  private bagS = new Spring(0);
  private plateDelay = 0;
  // Last frame, for velocities and teleports.
  private lastX = 0;
  private lastY = 0;
  private lastVx = 0;
  private lastHipY = 0;
  private lastHipV = 0;
  private blendPending = false;
  private started = false;
  /** Reused outputs (no garbage per frame). */
  private readonly ik = { a1: 0, a2: 0 };
  private readonly handOut = { x: 0, y: 0 };
  private readonly headOut = { x: 0, y: 0 };
  private readonly lampOut = { x: 0, y: 0 };
  private readonly tmp = { x: 0, y: 0 };
  // The torso's transform this frame (pelvis and lean), and the mirror.
  private px = 0;
  private py = STAND_HIP;
  private cosL = 1;
  private sinL = 0;
  private sxw = 1;

  constructor() {
    const hel = buildHelmet(true);
    hel.scale.set(HELMET_K);
    hel.position.set(-64 * HELMET_K, -16 * HELMET_K);
    this.headRig = hel.getChildByLabel('headRig')!;
    this.headRig.pivot.set(66, 8);
    this.headRig.position.set(66, 8);
    this.eyelid = this.headRig.getChildByLabel('eyelid', true)!;
    this.plate = hel.getChildByLabel('plate')!;
    // The hose comes off the helmet and is laid out for the upright body instead.
    const dh = hel.getChildByLabel('hose');
    if (dh) hel.removeChild(dh);
    for (const label of ['visorFog', 'visorDrops']) {
      const c = hel.getChildByLabel(label);
      if (c) c.visible = false;
    }
    this.helmet.addChild(hel);
    // Coiled hose: from the tank valves, up past the side of the helmet, down to the chest port.
    coiledHose(this.hose, [[-15, -42], [-17, -57], [17, -50], [PORT_X, PORT_Y]], 3);
    this.hose.pivot.set(PORT_X, PORT_Y);
    // Shoulder lamp (the diver's), on the chest strap, pointing forward.
    const lamp = buildShoulderLamp();
    lamp.position.set(-47, -14.5);
    this.lampC.addChild(lamp);
    this.lampC.scale.set(0.55);
    this.bag.scale.set(0.5);
    this.bag.visible = false;
    this.rig.addChild(
      this.farArm.upper,
      this.farLeg.thigh,
      this.pack,
      this.torso,
      this.bag,
      this.helmet,
      this.hose,
      this.lampC,
      this.nearLeg.thigh,
      this.nearArm.upper,
    );
    this.view.addChild(this.rig);
    this.lampDot.circle(0, 0, 2.2).fill({ color: 0xfff6d8 });
    this.nozzleDot.circle(0, 0, 1.8).fill({ color: 0xe6ff80, alpha: 0.8 });
    this.lens.addChild(this.lampDot, this.nozzleDot);
  }

  // ---- Points other code reads (each returns the same object every call) ----

  /** The middle of the helmet, in world space. */
  head(): { x: number; y: number } {
    this.toWorld(NECK_X + 1.5, NECK_Y - 13, this.headOut);
    return this.headOut;
  }
  /** The near hand, in world space (the grapple line leaves from it). */
  hand(): { x: number; y: number } {
    return this.handOut;
  }
  /** The shoulder lamp's lens, in world space (the beam starts here). */
  lampPoint(): { x: number; y: number } {
    this.toWorld(LENS_X, LENS_Y, this.lampOut);
    return this.lampOut;
  }

  /**
   * Stand still with the feet under the hips and everything at rest: arriving
   * in a level, or put somewhere by the game. `crouch` starts the body that
   * much lower so it stands up (climbing in through a hatch or an airlock).
   */
  arrive(crouch = 0): void {
    this.started = true;
    this.lastX = this.x;
    this.lastY = this.y;
    this.lastVx = this.vx;
    this.faceS.set(this.face);
    this.faceWas = this.face;
    this.turnT = 0;
    this.mode = this.onGround || this.pose === 'stand' ? 'ground' : 'air';
    this.gaitOn = false;
    this.walkAmt = 0;
    this.settleFeet();
    this.hipDrop.set(crouch);
    this.hipX.set(0);
    this.hipYOff.set(0);
    this.lean.set(crouch > 0 ? 0.12 : 0.03);
    this.lastHipY = this.y + STAND_HIP + crouch;
    this.lastHipV = 0;
    this.packS.set(0);
    this.bagS.set(0);
    this.plateDelay = crouch > 0 ? 0.7 : 0;
  }

  private settleFeet(): void {
    for (let i = 0; i < 2; i++) {
      const f = this.feet[i];
      f.wx = this.x + this.face * (i === 0 ? 3.5 : -3.5);
      f.planted = true;
      f.stepT = -1;
      f.ox.set(0);
      f.oy.set(0);
      f.ax = (f.wx - this.x) * this.face;
      f.ay = -ANKLE_H;
    }
    for (const a of this.arms) {
      a.ou.set(0);
      a.of.set(0);
      a.jolt.set(0);
    }
  }

  /** Local point (torso space) to world. */
  private toWorld(tx: number, ty: number, out: { x: number; y: number }): void {
    const lx = this.px + tx * this.cosL - ty * this.sinL;
    const ly = this.py + tx * this.sinL + ty * this.cosL;
    out.x = this.x + lx * this.view.scale.x;
    out.y = this.y + ly;
  }

  // ---------------------------------------------------------------------------

  animate(dtIn: number): void {
    // Springs are stable to about 1/20 s; a long hitch just slows the animation.
    const dt = Math.min(dtIn, 0.05);
    if (dt <= 0) return;
    if (!this.started) this.arrive();
    this.time += dt;
    // Moved by the game (a lift, back from the bilge): stand again where we are.
    if (Math.abs(this.x - this.lastX) > 80 || Math.abs(this.y - this.lastY) > 80) {
      this.lastX = this.x;
      this.lastY = this.y;
      this.settleFeet();
      this.gaitOn = false;
    }
    const ax = clamp((this.vx - this.lastVx) / dt, -6000, 6000);
    this.lastVx = this.vx;

    // Facing: a quick mirror through edge-on (a critically damped spring, like the diver's),
    // with a dip and a step round.
    if (this.face !== this.faceWas) {
      this.faceWas = this.face;
      this.turnT = 1;
    }
    this.turnT = Math.max(0, this.turnT - dt * 3);
    this.faceS.step(this.face, 17, 1, dt);
    const fa = this.faceS.x;
    // Never thinner than about a third: a person turning shows their front, not an edge.
    const sx = Math.abs(fa) < 0.3 ? (fa < 0 ? -0.3 : 0.3) : fa;
    this.view.scale.x = sx;
    this.view.position.set(this.x, this.y);
    this.sxw = Math.abs(sx) < 0.35 ? (sx < 0 ? -0.35 : 0.35) : sx;
    const axL = ax * this.face;
    const vxL = this.vx * this.face;

    // Which state are we in?
    const mode: Mode =
      this.pose === 'climb' ? 'climb' : this.pose === 'hang' ? 'hang' : this.onGround && (this.pose === 'stand' || this.pose === 'walk') ? 'ground' : 'air';
    if (mode !== this.mode) this.enterMode(mode);

    // Breathing: slow standing, quicker walking and after effort.
    const speed = Math.abs(this.vx);
    const run = clamp((speed - 140) / 130, 0, 1);
    const work = mode === 'ground' ? this.walkAmt * (0.4 + 0.6 * speed / 270) : mode === 'climb' ? this.climbMove : 0.3;
    this.exert = clamp(this.exert + dt * (work * 0.06 - 0.025), 0, 1);
    const period = 3.8 - 1.4 * work - 1.2 * this.exert;
    this.breath = (this.breath + dt / period) % 1;
    this.heave = breathShape(this.breath);

    // Body targets this state sets.
    let hipY = STAND_HIP;
    let hipXT = 0;
    let leanT = 0.03;
    let lookT = 0;
    if (mode === 'ground') {
      const r = this.ground(dt, speed, run);
      hipY = r.hipY;
      hipXT = r.hipX;
      leanT = r.lean;
      lookT = r.look;
    } else if (mode === 'air') {
      const r = this.air(dt, vxL);
      hipY = r.hipY;
      leanT = r.lean;
      lookT = r.look;
    } else if (mode === 'hang') {
      const r = this.hang(dt, vxL, axL);
      leanT = r.lean;
      lookT = -0.12;
    } else {
      const r = this.climb(dt);
      hipY = r.hipY;
      leanT = 0.07;
      lookT = this.vy < -1 ? -0.1 : this.vy > 1 ? 0.08 : this.glance.target * 0.5;
    }

    // A dip and a lean back as the body comes round.
    hipY += this.turnT * 2.2 * (mode === 'ground' ? 1 : 0);
    leanT -= this.turnT * 0.05;
    // The pelvis: landings and arrivals push it down and it springs back; the
    // blend carries it from the last state's height.
    this.hipDrop.step(0, 9, 0.8, dt);
    this.hipDrop.clamp(-4, 16);
    this.hipYOff.step(0, 12, 1, dt);
    hipY += this.hipDrop.x + this.hipYOff.x;
    // Breathing lifts the chest a little; standing, the hips sink a touch on the breath out.
    if (mode === 'ground') hipY += (1 - this.heave) * 0.35 * (1 - this.walkAmt);
    this.hipX.step(hipXT, 9, 0.9, dt);
    // Lean: a slightly soft spring (a hint of follow-through), pushed by speeding up and slowing down.
    this.lean.step(leanT + this.hipDrop.x * 0.012, 8, 0.65, dt, mode === 'ground' ? clamp(axL / 2200, -1, 1) * 1.6 : 0);
    this.lean.clamp(-0.35, 0.5);

    // Feet: blend offsets decay; planted feet never move in the world once the blend is over.
    // Keep the hips low enough that every planted foot can be reached.
    let py = hipY;
    for (let i = 0; i < 2; i++) {
      const f = this.feet[i];
      // A planted foot is placed exactly (never blended, so it cannot slide).
      const exact = mode === 'ground' && f.planted;
      if (exact) {
        f.ox.set(0);
        f.oy.set(0);
      } else if (this.blendPending) {
        f.ox.set(f.ax - f.tx);
        f.oy.set(f.ay - f.ty);
      }
      f.ox.step(0, 16, 1, dt);
      f.oy.step(0, 16, 1, dt);
      f.ax = f.tx + f.ox.x;
      f.ay = f.ty + f.oy.x;
      // A planted foot's ankle was placed for exactly this roll; in the air the foot eases.
      if (mode === 'ground' && f.planted) f.roll = f.troll;
      else f.roll += (f.troll - f.roll) * (1 - Math.exp(-dt * 20));
      if (mode === 'ground') {
        // Planted: the hips must be low enough to reach it. Coming down: they lower to meet it.
        const w = f.planted ? 1 : f.reachW;
        if (w > 0) {
          const dx = f.ax - (this.hipX.x + (i === 0 ? 1 : -1));
          const need = f.ay - Math.sqrt(Math.max(0, REACH * REACH - dx * dx));
          if (py < need) py += (need - py) * w;
        }
      }
      f.reachW = 0;
    }
    this.px = this.hipX.x;
    this.py = py;
    const L = this.lean.x;
    this.cosL = Math.cos(L);
    this.sinL = Math.sin(L);

    // Hip velocity and acceleration (world), for the gear.
    const hipW = this.y + py;
    const hipV = clamp((hipW - this.lastHipY) / dt, -1500, 1500);
    const hipA = clamp((hipV - this.lastHipV) / dt, -9000, 9000);
    this.lastHipY = hipW;
    this.lastHipV = hipV;
    this.lastX = this.x;
    this.lastY = this.y;

    this.placeBody(dt, mode, lookT, axL, hipA);
    this.placeLegs(dt);
    this.placeArms(dt, mode);
    this.blendPending = false;
  }

  /** Changing state: start blending the limbs from where they are. */
  private enterMode(mode: Mode): void {
    const was = this.mode;
    this.mode = mode;
    this.blendPending = true;
    this.hipYOff.set(this.py - this.hipDrop.x - (mode === 'climb' ? STAND_HIP + 1.5 : STAND_HIP));
    if (mode === 'air') {
      this.airT = 0;
      this.fallT = 0;
      this.tuck = 0;
      // Leaving the floor on a jump: the feet push off it before they leave.
      this.pushT = was === 'ground' && this.vy < -200 ? 0.09 : 0;
      this.pushFloor = this.y + 0.0001;
      if (this.pushT > 0) {
        this.hipDrop.v -= 60;
        this.hipYOff.set(this.hipYOff.x + 5);
      }
      this.gaitOn = false;
    }
    if (mode === 'ground') {
      // Landing: plant the feet where they come down, absorb through the knees, settle.
      // Off a ladder, a foot still up on a rung steps down to the floor instead.
      for (let i = 0; i < 2; i++) {
        const f = this.feet[i];
        const up = -(f.ay + ANKLE_H);
        f.wx = this.x + f.ax * this.sxw;
        if (was === 'climb' && up > 2.5) {
          f.planted = false;
          f.stepT = 0;
          f.stepFrom = f.wx;
          f.stepTo = this.rest(i);
          f.stepH0 = up;
          f.stepDur = 0.2 + i * 0.08;
        } else {
          f.planted = true;
          f.stepT = -1;
        }
      }
      if (was === 'air' || was === 'hang') {
        const n = clamp((this.lastAirVy - 150) / 800, 0, 1);
        this.hipDrop.v += Math.pow(n, 1.1) * 330 + 20;
        this.lean.v += n * 2.2;
        this.packS.v += n * 60;
        this.headS.v += n * 1.2;
        this.exert = Math.min(1, this.exert + n * 0.3);
        for (const a of this.arms) a.jolt.v -= n * 5;
      }
      this.gaitOn = false;
      this.hipYOff.set(0);
    }
    if (mode === 'climb') this.climbMove = 0;
  }

  // ---- States -----------------------------------------------------------

  private readonly out = { hipY: 0, hipX: 0, lean: 0, look: 0 };

  /**
   * On the floor. Walking: each foot is planted (fixed in the world) for
   * part of the stride and swings to the next footfall for the rest; the
   * stride lengthens and the cadence quickens with speed, and towards full
   * speed (5 m/s for a person this size) it becomes a heavy jog with a short
   * flight. Standing: the feet settle under the hips with small steps (after
   * stopping, turning or landing), the weight shifts now and then.
   */
  private ground(dt: number, speed: number, run: number): { hipY: number; hipX: number; lean: number; look: number } {
    const o = this.out;
    const face = this.face;
    const moving = speed > (this.gaitOn ? 16 : 28) && this.vx * face > 0;
    if (moving && !this.gaitOn) this.startGait(run);
    else if (!moving && this.gaitOn) this.endGait();
    this.walkAmt = approach(this.walkAmt, this.gaitOn ? 1 : 0, this.gaitOn ? 5 : 6, dt);
    let hipY = STAND_HIP;
    let hipX = 0;
    let lean = 0.03;
    let look = 0;
    const sxw = this.sxw;

    if (this.gaitOn) {
      this.gaitRamp = approach(this.gaitRamp, 1, 2.4, dt);
      const D = (60 + 0.33 * speed) * (0.62 + 0.38 * this.gaitRamp);
      const beta = 0.64 - 0.3 * run;
      this.phase = (this.phase + (speed * dt) / D) % 1;
      const lift = 4 + 6 * run + (3 * speed) / 270;
      for (let i = 0; i < 2; i++) {
        const f = this.feet[i];
        const psi = (this.phase + i * 0.5) % 1;
        // A swing runs to its footfall even if the stride changes under it.
        let s = f.planted ? -1 : (((psi - f.swingB) % 1) + 1) % 1 / (1 - f.swingB);
        if (!f.planted && s >= 1) {
          f.planted = true;
          f.wx = this.x + f.ax * sxw;
          s = -1;
        }
        // A planted foot left too far behind (slowing hard) lifts early.
        const behind = f.planted && (f.wx - this.x) * face < -REACH * 0.72;
        if (f.planted && (psi >= beta || behind) && psi > 0.02) {
          // The swing starts where the ankle is at toe-off (up on the ball).
          f.planted = false;
          f.liftX = this.x + f.ax * sxw;
          f.liftY = f.ay;
          f.swingB = behind ? Math.min(psi, 0.98) : beta;
          s = (((psi - f.swingB) % 1) + 1) % 1 / (1 - f.swingB);
        }
        if (f.planted) {
          const u = Math.min(1, psi / beta);
          // Heel strike (toes up), flat through mid-stance, then the heel lifts over the ball (toe-off).
          let roll = 0;
          if (u < 0.16) roll = -0.22 * (1 - u / 0.16) * (0.5 + 0.5 * this.walkAmt);
          else if (u > 0.68) roll = 0.6 * Math.pow((u - 0.68) / 0.32, 1.4) * (0.55 + 0.45 * run);
          this.plantedAnkle(f, (f.wx - this.x) / sxw, roll);
        } else {
          // The footfall: ahead of the hip, not further than the leg reaches comfortably.
          const land = this.x + face * Math.min(beta * D * 0.42, 21);
          // The foot leaves at once (so it never trails out of reach) and slows into the footfall.
          const wx = f.liftX + (land - f.liftX) * (1 - Math.pow(1 - s, 1.7));
          f.tx = (wx - this.x) / sxw;
          f.ty = -ANKLE_H + (f.liftY + ANKLE_H) * (1 - smoothstep(s * 1.6)) - lift * Math.sin(Math.PI * Math.min(1, s * 1.12));
          f.troll = 0.55 * (1 - s) * (1 - s) - 0.2 * smoothstep((s - 0.55) / 0.45);
          f.reachW = Math.max(smoothstep((s - 0.5) / 0.5), 1 - smoothstep(s / 0.25));
        }
      }
      // Rise and fall: walking vaults over the planted leg (highest mid-stance);
      // jogging sinks into it. Twice per stride.
      const c = Math.cos(Math.PI * 4 * (this.phase - beta / 2));
      // A heavy suit: the knees stay a little softer walking.
      hipY += (1.5 + run) * this.walkAmt + c * (-(1 - run) * (1 + (1.6 * speed) / 270) + run * 3) * this.walkAmt;
      lean = 0.05 + 0.11 * (speed / 270) * this.walkAmt;
      look = 0.035;
    } else {
      // Standing: settle each foot under the hip with a small step when it is out of place.
      this.stepCool = Math.max(0, this.stepCool - dt);
      let stepping = -1;
      for (let i = 0; i < 2; i++) if (this.feet[i].stepT >= 0) stepping = i;
      if (stepping < 0 && this.stepCool <= 0) {
        let worst = -1;
        let err = 0;
        for (let i = 0; i < 2; i++) {
          // A foot a little ahead of its place is a natural, balanced stance; behind, or far out, it steps.
          const ahead = (this.feet[i].wx - this.rest(i)) * this.face;
          const e = ahead > 0 ? ahead - (this.turnT > 0 ? 2 : 9) : -ahead - (this.turnT > 0 ? 2 : 4.5);
          if (e > err) {
            err = e;
            worst = i;
          }
        }
        if (worst >= 0) {
          const f = this.feet[worst];
          f.stepT = 0;
          f.stepFrom = f.wx;
          f.stepTo = this.rest(worst);
          f.stepH0 = 0;
          f.stepDur = 0.22 + Math.min(0.1, Math.abs(f.stepTo - f.stepFrom) * 0.003);
          f.planted = false;
          stepping = worst;
        }
      }
      for (let i = 0; i < 2; i++) {
        const f = this.feet[i];
        if (f.stepT >= 0) {
          f.stepT = Math.min(1, f.stepT + dt / f.stepDur);
          const s = f.stepT;
          const wx = f.stepFrom + (f.stepTo - f.stepFrom) * smoothstep(s);
          f.tx = (wx - this.x) / sxw;
          f.ty = -ANKLE_H - f.stepH0 * (1 - smoothstep(s)) - (2.5 + Math.abs(f.stepTo - f.stepFrom) * 0.06) * Math.sin(Math.PI * s);
          f.troll = -0.12 * Math.sin(Math.PI * s);
          f.reachW = Math.max(smoothstep((s - 0.5) / 0.5), 1 - smoothstep(s / 0.25));
          if (f.stepT >= 1) {
            f.stepT = -1;
            f.planted = true;
            f.wx = f.stepTo;
            this.stepCool = 0.06;
          }
        } else {
          if (!f.planted) {
            f.planted = true;
            f.wx = this.x + f.ax * sxw;
          }
          // The unweighted foot rests on the ball a touch.
          const relax = this.idleSide === (i === 0 ? 1 : -1) ? 0.06 * (1 - this.working) : 0;
          this.plantedAnkle(f, (f.wx - this.x) / sxw, relax);
        }
      }
      // Weight over the standing foot while the other steps; otherwise a slow shift
      // from foot to foot every few seconds.
      this.idleTimer -= dt;
      if (this.idleTimer <= 0) {
        this.idleSide = -this.idleSide;
        this.idleTimer = 3.5 + rand() * 4;
      }
      this.idleShift = approach(this.idleShift, this.idleSide * 1.1, 1.5, dt);
      hipX = stepping >= 0 ? clamp(this.feet[1 - stepping].ax * 0.4, -3, 3) : this.idleShift * (1 - this.working);
      hipY += stepping >= 0 ? 0.8 : Math.abs(this.idleShift) * 0.3;
      lean = 0.025 + this.working * 0.07;
      look = this.glance.target + this.working * 0.12;
    }
    o.hipY = hipY;
    o.hipX = hipX;
    o.lean = lean;
    o.look = look;
    return o;
  }

  /** Where a foot rests standing (world x): just apart, the near one a little ahead. */
  private rest(i: number): number {
    return this.x + this.face * (i === 0 ? 3.5 : -3.5);
  }

  /** A planted foot's ankle: flat, rolled back on the heel (roll < 0) or up on the ball (roll > 0). */
  private plantedAnkle(f: Foot, lx: number, roll: number): void {
    const c = Math.cos(roll);
    const s = Math.sin(roll);
    if (roll < 0) {
      // Pivot on the heel.
      const hx = lx - HEEL;
      f.tx = hx + HEEL * c + ANKLE_H * s;
      f.ty = HEEL * s - ANKLE_H * c;
    } else {
      // Pivot on the ball.
      const bx = lx + BALL;
      f.tx = bx - BALL * c + ANKLE_H * s;
      f.ty = -BALL * s - ANKLE_H * c;
    }
    f.troll = roll;
  }

  private startGait(run: number): void {
    const beta = 0.64 - 0.3 * run;
    this.gaitOn = true;
    this.gaitRamp = 0;
    // The foot behind (or the one already stepping) swings first; the other
    // is early in its time on the floor.
    let sw = (this.feet[0].wx - this.x) * this.face < (this.feet[1].wx - this.x) * this.face ? 0 : 1;
    for (let i = 0; i < 2; i++) if (this.feet[i].stepT >= 0) sw = i;
    const psiPlanted = clamp(beta - 0.48, 0.02, 0.3);
    const psiSwing = psiPlanted + 0.5;
    for (let i = 0; i < 2; i++) {
      const f = this.feet[i];
      if (i === sw) {
        f.liftX = this.x + f.ax * this.sxw;
        f.liftY = f.ay;
        f.planted = false;
        f.swingB = psiSwing - 0.005;
      } else if (!f.planted || f.stepT >= 0) {
        f.planted = true;
        f.wx = this.x + f.ax * this.sxw;
      }
      f.stepT = -1;
    }
    this.phase = (psiSwing - sw * 0.5 + 1) % 1;
    this.blendPending = true;
  }

  /** Stopping: a foot in the air finishes its step under the hips; the other follows if it must. */
  private endGait(): void {
    this.gaitOn = false;
    for (let i = 0; i < 2; i++) {
      const f = this.feet[i];
      if (f.planted) continue;
      f.stepT = 0;
      f.stepFrom = this.x + f.ax * this.sxw;
      // Put it down where it was heading if that is ahead of its place (not more than a short pace).
      const ahead = clamp((f.stepFrom - this.rest(i)) * this.face + 4, 0, 9);
      f.stepTo = this.rest(i) + this.face * ahead;
      f.stepH0 = Math.max(0, -f.ay - ANKLE_H);
      f.stepDur = 0.2;
    }
    this.stepCool = 0.1;
  }

  /**
   * In the air. The jump pushes off the floor (the feet leave it last), the
   * knees tuck on the way up, and the legs reach down again for the landing.
   * A long fall raises the arms.
   */
  private air(dt: number, vxL: number): { hipY: number; hipX: number; lean: number; look: number } {
    const o = this.out;
    this.airT += dt;
    this.lastAirVy = this.vy;
    if (this.vy > 0) this.fallT += dt;
    const rising = this.vy < 0;
    const want = rising ? smoothstep((this.airT - 0.05) / 0.22) * 0.95 : clamp(0.95 - this.vy / 420, 0, 0.95);
    this.tuck = approach(this.tuck, want, 9, dt);
    const t = this.tuck;
    const trail = clamp(vxL * 0.012, -4, 4);
    for (let i = 0; i < 2; i++) {
      const f = this.feet[i];
      if (this.pushT > 0) {
        // Pushing off: the foot stays on the floor, toes last, until the leg is straight.
        const lx = (f.wx - this.x) / this.sxw;
        const ly = this.pushFloor - this.y - ANKLE_H;
        const dx = lx - (i === 0 ? 1 : -1);
        const dy = ly - STAND_HIP;
        if (Math.hypot(dx, dy) < REACH - 1) {
          this.plantedAnkle(f, lx, 0.5 * (1 - this.pushT / 0.09));
          continue;
        }
      }
      const ex = i === 0 ? 4 : -5;
      const ey = -ANKLE_H;
      const tx = i === 0 ? 9 : -1;
      const ty = i === 0 ? -21 : -14;
      f.tx = ex + (tx - ex) * t - trail;
      f.ty = ey + (ty - ey) * t;
      f.troll = rising ? 0.35 : 0.2 * t;
    }
    this.pushT = Math.max(0, this.pushT - dt);
    o.hipY = STAND_HIP;
    o.hipX = 0;
    o.lean = rising ? 0.09 : this.fallT > 0.45 ? 0.05 : -0.02;
    o.look = rising ? -0.04 : 0.1;
    return o;
  }

  /** Hanging under the grapple: both hands on the line, legs hanging, swaying as a pendulum. */
  private hang(dt: number, vxL: number, axL: number): { lean: number } {
    const o = this.out;
    // Reeled in, the legs trail; hanging, they lag the small sway and settle.
    this.swayS.step(-vxL * 0.03, 7, 0.35, dt, -axL * 0.01);
    this.swayS.clamp(-12, 12);
    const sw = this.swayS.x + Math.sin(this.time * 1.3) * 1.2;
    const lift = clamp(-this.vy * 0.01, -3, 5);
    for (let i = 0; i < 2; i++) {
      const f = this.feet[i];
      f.tx = (i === 0 ? 3.5 : -3) + sw;
      f.ty = (i === 0 ? -7 : -9.5) - lift;
      f.troll = 0.3;
    }
    this.lastAirVy = this.vy;
    o.lean = -0.03 - this.swayS.x * 0.01;
    return o;
  }

  /**
   * On a ladder: hands and feet grip rungs (fixed in the world while they
   * hold) and move up or down three rungs at a time, a hand with the
   * opposite foot. Holding still, any hand or foot between rungs settles on one.
   */
  private climb(dt: number): { hipY: number } {
    const moving = Math.abs(this.vy) > 1;
    this.climbMove = approach(this.climbMove, moving ? 1 : 0, 6, dt);
    const cyc = -this.y / CLIMB_STRIDE;
    const snap = (v: number) => RUNG_OFFSET + Math.round((v - RUNG_OFFSET) / RUNG_GAP) * RUNG_GAP;
    // Feet take the rung at or above where they would reach (never one too low to stand on).
    const snapUp = (v: number) => RUNG_OFFSET + Math.floor((v - RUNG_OFFSET) / RUNG_GAP) * RUNG_GAP;
    // Limb order: near hand, far hand, near foot, far foot. Offsets in the cycle; height above the floor at the start of a grip.
    for (let k = 0; k < 4; k++) {
      const hand = k < 2;
      const off = k === 0 ? 0 : k === 1 ? 0.5 : k === 2 ? 0.58 : 0.08;
      const rel = hand ? -104 : -24;
      const G = hand ? 0.55 : 0.4;
      const c = cyc + off;
      const n = Math.floor(c);
      const fr = c - n;
      const gy = (m: number) => (hand ? snap : snapUp)(-(m - off) * CLIMB_STRIDE + rel);
      let wy = gy(n);
      let out = 0;
      if (fr >= G) {
        const s = (fr - G) / (1 - G);
        wy += (gy(n + 1) - wy) * smoothstep(s);
        out = Math.sin(Math.PI * s);
      }
      if (!moving) wy = hand ? snap(wy) : snapUp(wy);
      let ly = wy - this.y;
      if (!hand) ly -= ANKLE_H;
      if (hand) {
        // Hands on the front of the rung, never higher than the arm reaches.
        this.climbHand[k * 2] = (k === 0 ? 13 : 11) - out * 4;
        this.climbHand[k * 2 + 1] = Math.max(ly, -107);
      } else {
        const f = this.feet[k - 2];
        f.tx = (k === 2 ? 4.5 : 3) - out * 3;
        f.ty = ly;
        f.troll = 0.05;
        f.planted = false;
      }
    }
    this.out.hipY = STAND_HIP + 1.5 + Math.sin(Math.PI * 4 * cyc) * 1.2 * this.climbMove;
    return this.out;
  }
  private readonly climbHand = [8, -90, 6.5, -80];

  // ---- Putting the pieces in place --------------------------------------

  private placeBody(dt: number, mode: Mode, lookT: number, axL: number, hipA: number): void {
    const px = this.px;
    const py = this.py;
    const c = this.cosL;
    const s = this.sinL;
    const L = this.lean.x;
    const tp = (tx: number, ty: number, o: Container) => o.position.set(px + tx * c - ty * s, py + tx * s + ty * c);
    // Breathing: the chest rises a little.
    const chest = this.heave * 0.6;
    this.torso.position.set(px, py);
    this.torso.rotation = L;
    this.torso.scale.set(1, 1 + this.heave * 0.015);
    // The tanks bob on their straps with each step and landing, and tip back when speeding up.
    this.packS.step(0, 15, 0.35, dt, -hipA * 0.05);
    this.packS.clamp(-2.5, 2.5);
    this.packTilt.step(0, 11, 0.4, dt, -clamp(axL, -3000, 3000) * 0.004);
    this.packTilt.clamp(-0.08, 0.08);
    tp(PACK_X, PACK_Y - chest * 0.5, this.pack);
    this.pack.y += this.packS.x;
    this.pack.rotation = L + this.packTilt.x;
    // The helmet sits on the collar and moves with the body; the head turns inside it.
    tp(NECK_X, NECK_Y - chest, this.helmet);
    this.helmet.rotation = L;
    this.glance.update(dt);
    this.headS.step(clamp(lookT - L * 0.6, -0.2, 0.2), 8, 1, dt);
    this.headRig.rotation = this.headS.x;
    this.eyelid.visible = this.glance.blinking;
    // The face plate: lifted inside (after a moment when arriving), shut to go back out.
    this.plateDelay = Math.max(0, this.plateDelay - dt);
    const vt = this.plateDelay > 0 ? 0 : this.visorTarget;
    this.visor += (vt - this.visor) * Math.min(1, dt * 4);
    if (Math.abs(vt - this.visor) < 0.005) this.visor = vt;
    this.plate.rotation = -smoothstep(this.visor) * 1.5;
    this.plate.alpha = 1 - this.visor * 0.3;
    // The hose flexes with the head, the breath and the tanks' bounce.
    this.hoseS.step(this.headS.x * 0.25 + this.heave * 0.02, 9, 0.4, dt, this.packS.v * 0.02 + clamp(axL, -3000, 3000) * 0.0002);
    this.hoseS.clamp(-0.07, 0.07);
    tp(PORT_X, PORT_Y - chest * 0.5, this.hose);
    this.hose.rotation = L + this.hoseS.x;
    tp(LENS_X, LENS_Y - chest * 0.5, this.lampC);
    this.lampC.rotation = L;
    // The dive bag swings on its clip at the hip: a pendulum, kicked by steps and speed changes.
    const fill = Math.min(1.6, this.load);
    this.bag.visible = this.load > 0.005;
    if (this.bag.visible) {
      this.bag.scale.set(0.5 * (0.55 + 0.32 * fill), 0.5 * (0.5 + 0.45 * fill));
      const jig = mode === 'ground' ? Math.sin(this.phase * Math.PI * 4) * this.walkAmt * 3 : 0;
      this.bagS.step(0, 6, 0.3, dt, -clamp(axL, -3000, 3000) * 0.004 + jig);
      this.bagS.clamp(-0.7, 0.7);
      tp(-3, 0, this.bag);
      this.bag.rotation = this.bagS.x;
    }
    // Unlit dots: the lamp lens and the thruster nozzle.
    this.toWorld(LENS_X + 1, LENS_Y - chest * 0.5, this.lampOut);
    this.lampDot.position.set(this.lampOut.x, this.lampOut.y);
    this.lampDot.alpha = this.lampOn ? 1 : 0.25;
    this.toWorld(NOZZLE_X, NOZZLE_Y, this.tmp);
    this.nozzleDot.position.set(this.tmp.x, this.tmp.y);
  }

  private placeLegs(dt: number): void {
    for (let i = 0; i < 2; i++) {
      const f = this.feet[i];
      const leg = i === 0 ? this.nearLeg : this.farLeg;
      const hx = this.px + (i === 0 ? 1 : -1);
      const hy = this.py;
      this.solve(hx, hy, f.ax, f.ay, THIGH, SHIN, 1);
      leg.thigh.position.set(hx, hy);
      leg.thigh.rotation = this.ik.a1;
      leg.shin.rotation = this.ik.a2 - this.ik.a1;
      leg.foot.rotation = f.roll - this.ik.a2;
      // The fin blade stays flat on the floor as the heel lifts; in the air it trails a little.
      const onFloor = this.mode === 'ground' && f.planted;
      const vyF = (f.ay - f.prevAy) / dt;
      f.prevAy = f.ay;
      const target = onFloor ? -Math.max(0, f.roll) : 0.08;
      if (onFloor) f.blade.set(target);
      else f.blade.step(target, 18, 0.45, dt, clamp(vyF, -400, 400) * 0.25);
      f.blade.clamp(-0.6, 0.5);
      leg.blade.rotation = f.blade.x;
    }
  }

  /**
   * Arms: swinging against the legs when walking, out for balance in the
   * air, on the line when hanging, on the rungs when climbing, at the
   * console when working. Angles are springs, so every change is eased.
   */
  private placeArms(dt: number, mode: Mode): void {
    const L = this.lean.x;
    const c = this.cosL;
    const s = this.sinL;
    const speed = Math.abs(this.vx);
    const run = clamp((speed - 140) / 130, 0, 1);
    // Shoulders: the near one dips and the torso twists a little with each step.
    const twist = mode === 'ground' ? Math.sin(this.phase * Math.PI * 2) * 1.4 * this.walkAmt : 0;
    for (let i = 0; i < 2; i++) {
      const a = this.arms[i];
      const arm = i === 0 ? this.nearArm : this.farArm;
      const sxT = SHOULDER_X + (i === 0 ? twist : -2 - twist);
      const syT = SHOULDER_Y - this.heave * 0.6 + (i === 0 ? 0 : -1);
      const shx = this.px + sxT * c - syT * s;
      const shy = this.py + sxT * s + syT * c;
      arm.upper.position.set(shx, shy);
      // Swing angles measured from hanging straight down along the body, forward positive.
      let sw = i === 0 ? 0.12 : -0.06;
      let el = i === 0 ? 0.3 : 0.38;
      let ikx = NaN;
      let iky = 0;
      if (mode === 'ground') {
        const A = (0.14 + 0.36 * (speed / 270)) * this.walkAmt;
        const ph = Math.cos(this.phase * Math.PI * 2);
        const swing = (i === 0 ? -1 : 1) * A * ph;
        sw = sw * (1 - this.walkAmt) + swing + 0.06 * this.walkAmt;
        el = el + (0.25 + 0.6 * run) * this.walkAmt + Math.max(0, swing) * 0.4;
        // Idle: the arms hang and move a little with the breath.
        sw += (1 - this.walkAmt) * this.heave * 0.03;
        if (this.working > 0 && i === 0 && !this.gaitOn) {
          // Working at something in front: the near hand reaches out and taps at it.
          ikx = 22;
          iky = -66 + Math.sin(this.time * 9) * 1.2 * this.working;
        }
      } else if (mode === 'air') {
        const rising = this.vy < 0;
        const longFall = this.fallT > 0.45 ? 1 : 0;
        if (rising) {
          sw = i === 0 ? 1.2 : 0.7;
          el = i === 0 ? 0.5 : 0.6;
        } else {
          sw = i === 0 ? 1.6 + 0.7 * longFall : -0.5 + 2.5 * longFall;
          el = 0.5;
        }
        if (this.hangTo && i === 0) {
          // Throwing the grapple: the near arm points at the hook.
          const dx = (this.hangTo.x - (this.x + shx * this.view.scale.x)) * this.face;
          const dy = this.hangTo.y - (this.y + shy);
          const d = Math.hypot(dx, dy) || 1;
          ikx = shx + (dx / d) * 29;
          iky = shy + (dy / d) * 29;
        }
      } else if (mode === 'hang') {
        // Both hands on the line, up in front of the helmet, the near one higher.
        ikx = i === 0 ? 12 : 8;
        iky = i === 0 ? -103 : -96;
      } else {
        ikx = this.climbHand[i * 2];
        iky = this.climbHand[i * 2 + 1];
      }
      if (!Number.isNaN(ikx)) {
        this.solve(shx, shy, ikx, iky, UPPER, FORE, -1);
        a.tu = this.ik.a1;
        a.tf = this.ik.a2;
      } else {
        a.tu = Math.PI / 2 + L - sw;
        a.tf = a.tu - el;
      }
      // Eased towards the target: loosely in the air (the arms follow the body), a
      // little when walking (they swing a touch behind), not at all where the hands
      // hold something (rungs, the line, a console).
      const held = !Number.isNaN(ikx);
      const k = held ? 1 : 1 - Math.exp(-dt * (mode === 'air' ? 9 : 18));
      a.su += wrap(a.tu - a.su) * k;
      a.sf += wrap(a.tf - a.sf) * k;
      if (this.blendPending) {
        a.ou.set(wrap(a.u - a.su));
        a.of.set(wrap(a.f - a.sf));
      }
      a.ou.step(0, 12, 1, dt);
      a.of.step(0, 12, 1, dt);
      a.jolt.step(0, 10, 0.5, dt);
      a.u = a.su + a.ou.x + a.jolt.x;
      a.f = a.sf + a.of.x + a.jolt.x * 1.6;
      arm.upper.rotation = a.u;
      arm.fore.rotation = a.f - a.u;
      if (i === 0) {
        // The near hand in world space, for the grapple line.
        const ex = shx + Math.cos(a.u) * UPPER;
        const ey = shy + Math.sin(a.u) * UPPER;
        const hx = ex + Math.cos(a.f) * FORE;
        const hy = ey + Math.sin(a.f) * FORE;
        this.handOut.x = this.x + hx * this.view.scale.x;
        this.handOut.y = this.y + hy;
      }
    }
  }

  /** Two-bone IK from (hx, hy) to (tx, ty). bend 1: the joint bends forward (knees); -1: back and down (elbows). */
  private solve(hx: number, hy: number, tx: number, ty: number, l1: number, l2: number, bend: number): void {
    const dx = tx - hx;
    const dy = ty - hy;
    const base = Math.atan2(dy, dx);
    const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.5, l1 + l2 - 0.01);
    const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const b = Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
    this.ik.a1 = base - bend * a;
    this.ik.a2 = this.ik.a1 + bend * (Math.PI - b);
  }
}
