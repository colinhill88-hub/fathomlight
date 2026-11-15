import { Container, Graphics } from 'pixi.js';
import { mulberry32, WORLD_SEED } from '../rng';
import { groundY, isSolid, SLED_X } from '../world/terrain';
import { BaseLayout, CELL, GRID_BASE, GRID_ROWS, GRID_X0, GRID_X1, PIECES, pieceRect, Placed } from '../game/base';
import type { PointLight } from '../world/scenery';

/**
 * The build drone, "KD-1" (milestone 3 follow-up, Colin's idea; made
 * smaller and cuter after Colin's feedback): a little Kestrel helper robot
 * that welds base pieces together.
 *
 * It starts stranded in the survey sled wreck, battery flat and tangled in
 * old cable. Hold Collect next to it with a few materials and the diver
 * patches it up. After that it tags along. When a frame is placed in build
 * mode, it flies to the frame and welds it from the bottom up while the
 * diver is free to swim off. With nothing to do and the diver far away, it
 * waits over the base, a little sleepy.
 *
 * The look, drawn by code: a squat, rounded Kestrel-yellow hull about a
 * third of the diver's length, with a small glass dome on top (the game's
 * signature shape). Inside the dome sits a dark camera ball with one amber
 * lens: its "eye". Two little ducted fans stick out at the sides like ears,
 * a springy antenna bobs on top, and a tiny folding arm holds the welding
 * torch.
 *
 * Personality comes from small animations:
 *  - the eye looks at the diver (or at the weld), and blinks now and then;
 *  - it tilts its head towards where it is looking;
 *  - the antenna wobbles with every change of speed;
 *  - it does a happy hop and a little roll, eye squinting into a smile,
 *    when you collect something, finish a piece or repair it;
 *  - when you stand still for a while it glances around, curious;
 *  - parked and alone, its eye droops half closed.
 *
 * Local drawing space: facing right, origin at the middle of the hull.
 */

const PAL = {
  yellow: 0xc49a42,
  yellowDark: 0x7f6430,
  steel: 0x5b6467,
  steelLight: 0x8a9496,
  steelDark: 0x3b4448,
  deep: 0x1d2325,
  rust: 0x8a3a20,
  algae: 0x5e7a3c,
  glass: 0x86b3ae,
  chromeHi: 0xd6e0ee,
};

/** Where the drone is stuck in the sled wreck. */
const STRAND = { x: SLED_X - 12, y: groundY(SLED_X - 12) - 56, rot: -0.42 };
/** How close the diver must be to work on the stranded drone. */
const REPAIR_REACH = 80;
export const REPAIR_SECONDS = 4;
/** The middle of the camera ball in the dome, where the eye sits. */
const EYE = { x: 0, y: -11.5 };
/** The antenna's foot on the dome. */
const ANT = { x: -5, y: -16.5 };
const ANT_LEN = 9;

type Mode = 'stranded' | 'waking' | 'follow' | 'toFrame' | 'weld' | 'parked';

export type DroneEvent = { type: 'repaired' } | { type: 'finished'; piece: Placed } | { type: 'started'; piece: Placed };

export interface DroneInput {
  diverX: number;
  diverY: number;
  /** Which way the diver faces (1 right, -1 left). */
  diverFace: number;
  /** How fast the diver is swimming. */
  diverSpeed: number;
  /** The diver is holding Collect next to the stranded drone, with the parts to fix it. */
  repairing: boolean;
  layout: BaseLayout;
  /** Welding speed (1 = normal). */
  rate: number;
}

let rand = mulberry32(WORLD_SEED ^ 0xd201e);
const R = (a: number, b: number) => a + rand() * (b - a);

function buildBody(): Graphics {
  const g = new Graphics();
  // Ducted fans at both ends, like little ears, each on a short stub.
  for (const sx of [-1, 1]) {
    const x = sx * 16;
    g.rect(sx > 0 ? 11 : -13, 0, 2, 3.5).fill({ color: PAL.steelDark });
    g.roundRect(x - 3.5, -4, 7, 10, 3).fill({ color: PAL.steel });
    g.roundRect(x - 3.5, -4, 7, 2.2, 1.1).fill({ color: 0xffffff, alpha: 0.22 });
    g.roundRect(x - 2.2, 4, 4.4, 2, 1).fill({ color: PAL.deep });
  }
  // Hull: a small squat body in Kestrel yellow with a steel belly.
  g.roundRect(-12, -6, 24, 16, 7).fill({ color: PAL.yellow });
  g.roundRect(-12, 3, 24, 7, 3.5).fill({ color: PAL.steel });
  g.rect(-11, 2.6, 22, 1).fill({ color: PAL.deep, alpha: 0.7 });
  g.roundRect(-9, -5, 18, 2.4, 1.2).fill({ color: 0xffffff, alpha: 0.18 });
  // A faded hazard stripe band and a couple of rivets.
  for (let i = 0; i < 3; i++) g.poly([-10 + i * 3.6, -1, -8.4 + i * 3.6, -1, -10 + i * 3.6, 2, -11.6 + i * 3.6, 2]).fill({ color: 0x2a2620, alpha: 0.5 });
  for (const [x, y] of [[8, -2], [-7, 6.5], [7, 6.5]] as [number, number][]) {
    g.circle(x, y, 0.7).fill({ color: PAL.deep });
    g.circle(x - 0.2, y - 0.2, 0.3).fill({ color: PAL.chromeHi, alpha: 0.7 });
  }
  // Tiny stencilled number, as dashes (too small for letters to read).
  g.rect(1, 0, 2, 0.9).fill({ color: 0x2a2418, alpha: 0.6 });
  g.rect(3.8, 0, 0.9, 0.9).fill({ color: 0x2a2418, alpha: 0.6 });
  g.rect(5.5, 0, 2.2, 0.9).fill({ color: 0x2a2418, alpha: 0.6 });
  // Weathering: scratches, a rust streak, algae on the belly.
  for (let i = 0; i < 6; i++) {
    const x = R(-10, 9);
    const y = R(-4, 8);
    const a = rand() * Math.PI;
    g.moveTo(x, y)
      .lineTo(x + Math.cos(a) * 2, y + Math.sin(a) * 2)
      .stroke({ color: 0xffffff, alpha: 0.2, width: 0.4 });
  }
  g.moveTo(-3, 3).quadraticCurveTo(-3.4, 5.5, -2.8, 8).stroke({ color: PAL.rust, alpha: 0.45, width: 0.7 });
  for (let i = 0; i < 5; i++) g.circle(R(-9, 9), R(8.5, 9.8), R(0.4, 1)).fill({ color: PAL.algae, alpha: 0.75 });

  // The head: a dark camera ball inside a big glass dome, on a steel collar.
  g.circle(EYE.x, EYE.y, 7).fill({ color: PAL.deep });
  g.circle(EYE.x - 2.4, EYE.y - 2.4, 2.4).fill({ color: 0xffffff, alpha: 0.07 });
  g.roundRect(-10, -9, 20, 3.6, 1.6).fill({ color: PAL.steelDark });
  g.roundRect(-10, -9, 20, 1.2, 0.6).fill({ color: 0xffffff, alpha: 0.15 });
  return g;
}

function buildGlass(): Graphics {
  const g = new Graphics();
  // A rounded glass dome: tinted, with a bright rim and a curved highlight.
  g.moveTo(-10, -8).arc(0, -8, 10, Math.PI, 0).closePath().fill({ color: PAL.glass, alpha: 0.28 });
  g.moveTo(-10, -8).arc(0, -8, 10, Math.PI, 0).stroke({ color: PAL.steelLight, width: 1, alpha: 0.75 });
  g.moveTo(-6.6, -13.5).arc(0, -8, 7.8, Math.PI * 1.12, Math.PI * 1.42).stroke({ color: 0xffffff, width: 1.3, alpha: 0.55, cap: 'round' });
  return g;
}

export class Drone {
  readonly view = new Container();
  readonly emissive = new Container();
  readonly glow = new Container();
  readonly lights: PointLight[] = [];

  x = STRAND.x;
  y = STRAND.y;
  mode: Mode = 'stranded';
  /** 0..1 repair work done while stranded. */
  repairProgress = 0;
  /** The diver is close enough to work on the stranded drone. */
  inReach = false;
  /** The frame being welded right now, if any. */
  welding: Placed | null = null;

  private vx = 0;
  private vy = 0;
  private face = 1;
  private faceAnim = 1;
  private rot = STRAND.rot;
  private time = 0;
  private wake = 0;
  /** Which side of the diver it keeps to when following (-1 left, 1 right). */
  private side = -1;
  /** Seconds the diver has been nearly still. */
  private still = 0;
  /** Happy hop and roll: counts up from 0 while it plays. */
  private hop = -1;
  private blinkAt = 2;
  private glance = { x: 0, y: 0, until: 0, next: 4 };
  private look = { x: 0, y: 0 };
  private ant = { a: 0, v: 0 };
  private body = new Container();
  private armUpper = new Container();
  private armFore = new Container();
  private antenna = new Graphics();
  private fanL = new Graphics();
  private fanR = new Graphics();
  private tangle = new Graphics();
  private eye = new Graphics();
  private smile = new Graphics();
  private eyeHalo = new Graphics();
  private torch = new Graphics();
  private torchHalo = new Graphics();
  private tip = new Graphics();
  private tipHalo = new Graphics();
  private sparks: { g: Graphics; x: number; y: number; vx: number; vy: number; life: number }[] = [];
  private sparkClock = 0;
  private trail: { x: number; y: number }[] = [];
  private trailClock = 0;
  private eyeLight: PointLight = { x: 0, y: 0, radius: 110, intensity: 0, color: [1, 0.78, 0.5] };
  private weldLight: PointLight = { x: 0, y: 0, radius: 280, intensity: 0, color: [1, 0.95, 0.86] };

  constructor(active: boolean) {
    rand = mulberry32(WORLD_SEED ^ 0xd201e);
    // Fan wash: faint flickering discs under the ear fans while the motors run.
    for (const [g, x] of [[this.fanL, -16], [this.fanR, 16]] as [Graphics, number][]) {
      g.ellipse(0, 0, 5, 1.6).fill({ color: 0xd8dccf, alpha: 0.4 });
      g.position.set(x, 7);
    }
    // Tiny folding arm with the welding torch, under the belly.
    const ug = new Graphics();
    ug.circle(0, 0, 2).fill({ color: PAL.steelDark });
    ug.roundRect(-1, -1.3, 8, 2.6, 1.3).fill({ color: PAL.steel });
    this.armUpper.addChild(ug);
    this.armUpper.position.set(4, 9);
    const fg = new Graphics();
    fg.circle(0, 0, 1.6).fill({ color: PAL.steelDark });
    fg.roundRect(-1, -1.1, 6.5, 2.2, 1.1).fill({ color: PAL.yellow });
    fg.roundRect(5, -1.6, 3.5, 3.2, 0.8).fill({ color: PAL.steelDark });
    fg.rect(8.3, -0.6, 1.8, 1.2).fill({ color: 0x9a8a6a });
    this.armFore.addChild(fg);
    this.armFore.position.set(7, 0);
    this.armUpper.addChild(this.armFore);

    // Springy antenna with a bobble.
    this.antenna.moveTo(0, 0).lineTo(0, -ANT_LEN).stroke({ color: PAL.steelDark, width: 1.1 });
    this.antenna.circle(0, -ANT_LEN, 1.6).fill({ color: PAL.steel });
    this.antenna.position.set(ANT.x, ANT.y);

    this.body.addChild(this.antenna, this.armUpper, buildBody(), this.fanL, this.fanR, buildGlass());
    this.view.addChild(this.body);

    // Old cable tangled round it in the wreck (gone once it is freed).
    rand = mulberry32(WORLD_SEED ^ 0x7a961e);
    const t = this.tangle;
    for (let i = 0; i < 3; i++) {
      const y0 = R(-8, 6);
      t.moveTo(-26, y0 + R(-4, 4))
        .bezierCurveTo(-8, y0 + R(-12, 12), 8, y0 + R(-12, 12), 26, y0 + R(-6, 9))
        .stroke({ color: i ? 0x3a3128 : 0x4a3f33, width: R(1.2, 1.9), alpha: 0.95 });
    }
    for (let i = 0; i < 18; i++) t.circle(R(-18, 18), R(-14, 9), R(0.6, 1.4)).fill({ color: rand() < 0.6 ? PAL.algae : 0x8aa154, alpha: 0.8 });
    t.ellipse(0, 13, 24, 4).fill({ color: 0xb7a47a, alpha: 0.55 }); // sand drifted against it
    this.body.addChild(this.tangle);

    // Glowing parts: the eye (a round lens, or a smiling arc when happy), torch, antenna tip.
    this.eye.circle(0, 0, 3.3).fill({ color: 0xffc070 });
    this.eye.circle(-1, -1.1, 1).fill({ color: 0xfff4dc });
    this.smile.moveTo(-3.2, 1.2).quadraticCurveTo(0, -3.2, 3.2, 1.2).stroke({ color: 0xffc070, width: 1.9, cap: 'round' });
    this.smile.visible = false;
    this.eyeHalo.circle(0, 0, 10).fill({ color: 0xffb050, alpha: 0.7 });
    this.torch.circle(0, 0, 2.2).fill({ color: 0xfff8ec });
    this.torchHalo.circle(0, 0, 18).fill({ color: 0xfff0d0, alpha: 0.9 });
    this.tip.circle(0, 0, 1.2).fill({ color: 0xff6a4a });
    this.tipHalo.circle(0, 0, 5).fill({ color: 0xff5a3a, alpha: 0.6 });
    this.emissive.addChild(this.eye, this.smile, this.tip, this.torch);
    this.glow.addChild(this.eyeHalo, this.tipHalo, this.torchHalo);
    this.lights.push(this.eyeLight, this.weldLight);

    if (active) {
      this.mode = 'follow';
      this.tangle.visible = false;
      this.rot = 0;
    }
    this.place();
  }

  /** Put the drone straight next to a point (after loading, or when the crew brings the diver back). */
  teleport(x: number, y: number, layout: BaseLayout): void {
    if (this.mode === 'stranded' || this.mode === 'waking') return;
    const f = layout.frames()[0];
    if (f) {
      const r = pieceRect(f);
      this.x = r.x + r.w / 2;
      this.y = r.y + r.h - 30;
      this.mode = 'toFrame';
    } else {
      this.x = x + this.side * 48;
      this.y = Math.max(80, y - 36);
      this.mode = 'follow';
    }
    this.vx = this.vy = 0;
    this.trail.length = 0;
  }

  /** A happy hop and roll, with a smiling eye (a material collected, a piece finished...). */
  cheer(): void {
    if (this.mode === 'stranded' || this.mode === 'waking') return;
    if (this.hop < 0 || this.hop > 0.7) this.hop = 0;
  }

  /** A point the scanner can aim at. */
  scanPoint(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  update(dt: number, time: number, inp: DroneInput): DroneEvent[] {
    this.time += dt;
    const events: DroneEvent[] = [];

    // Remember where the diver has been: following that trail keeps the drone in open water.
    this.trailClock += dt;
    if (this.trailClock > 0.08) {
      this.trailClock = 0;
      this.trail.push({ x: inp.diverX, y: inp.diverY });
      if (this.trail.length > 40) this.trail.shift();
    }
    this.still = inp.diverSpeed < 45 ? this.still + dt : 0;

    const dDiver = Math.hypot(inp.diverX - this.x, inp.diverY - this.y);
    this.inReach = this.mode === 'stranded' && dDiver < REPAIR_REACH;
    let tx = this.x;
    let ty = this.y;
    let maxSpeed = 440;
    this.welding = null;
    // What the eye looks at: the diver, unless something else is more interesting.
    let lookX = inp.diverX;
    let lookY = inp.diverY - 10;

    if (this.mode === 'stranded') {
      if (this.inReach && inp.repairing) {
        this.repairProgress += dt / REPAIR_SECONDS;
        this.sparkClock -= dt;
        if (this.sparkClock <= 0) {
          this.sparkClock = 0.18;
          const [sx, sy] = this.toWorld(R(-14, 14), R(-8, 8));
          this.burst(sx, sy, 3);
        }
        if (this.repairProgress >= 1) {
          this.mode = 'waking';
          this.wake = 0;
          this.tangle.visible = false;
          this.burst(this.x, this.y, 24);
          events.push({ type: 'repaired' });
        }
      } else this.repairProgress = Math.max(0, this.repairProgress - dt * 0.3);
    } else if (this.mode === 'waking') {
      // Shake free, level out, lift off, look at the diver, then a happy hop.
      this.wake += dt;
      const k = Math.min(1, this.wake / 2.2);
      this.rot = STRAND.rot * (1 - k) + Math.sin(this.wake * 30) * 0.08 * (1 - k);
      tx = STRAND.x;
      ty = STRAND.y - 46 * k * k;
      maxSpeed = 60;
      if (this.wake > 2.2) {
        this.mode = 'follow';
        this.side = inp.diverX < this.x ? 1 : -1;
        this.hop = 0;
      }
    } else {
      const frames = inp.layout.frames();
      if (frames.length && this.mode !== 'toFrame' && this.mode !== 'weld') {
        this.mode = 'toFrame';
        events.push({ type: 'started', piece: frames[0] });
      }
      if (!frames.length && (this.mode === 'toFrame' || this.mode === 'weld')) this.mode = dDiver < 900 ? 'follow' : 'parked';
      if (this.mode === 'parked' && dDiver < 760) this.mode = 'follow';

      if (this.mode === 'follow') {
        // Swimming: keep behind the diver. Still: stay on whichever side it is already on,
        // so it never flips back and forth over a diver who is not moving.
        if (inp.diverSpeed > 70) this.side = -inp.diverFace;
        const moving = inp.diverSpeed > 45;
        const p = moving ? (this.trail[Math.max(0, this.trail.length - 6)] ?? { x: inp.diverX, y: inp.diverY }) : { x: inp.diverX, y: inp.diverY };
        tx = p.x + this.side * 50;
        ty = p.y - 34 + Math.sin(this.time * 0.8) * 4;
        if (isSolid(tx, ty)) {
          tx = p.x;
          ty = p.y - 20;
        }
        // Curious: when the diver has been still a while, glance around now and then.
        if (this.still > 2.5 && this.time > this.glance.next) {
          this.glance = { x: R(-160, 160), y: R(-60, 120), until: this.time + R(0.8, 1.6), next: this.time + R(3, 6) };
        }
        if (this.time < this.glance.until) {
          lookX = this.x + this.glance.x;
          lookY = this.y + this.glance.y;
        }
      } else if (this.mode === 'parked') {
        // Hover over the middle of the site, waiting for the diver to come back.
        tx = (GRID_X0 + GRID_X1) / 2 + Math.sin(this.time * 0.25) * 110;
        ty = GRID_BASE - GRID_ROWS * CELL - 30 + Math.sin(this.time * 0.7) * 8;
        lookX = tx + this.face * 100;
        lookY = ty + 60;
      } else {
        // Fly to the oldest frame and weld it, sweeping along the seam from the bottom up.
        const f = frames[0];
        const r = pieceRect(f);
        const prog = f.progress ?? 0;
        const seamY = r.y + r.h * (1 - prog);
        const sx = r.x + r.w * (0.5 + 0.38 * Math.sin(this.time * 0.9 + f.id));
        tx = sx - 12;
        ty = seamY - 26;
        maxSpeed = 400;
        lookX = sx;
        lookY = seamY;
        const dist = Math.hypot(tx - this.x, ty - this.y);
        if (this.mode === 'toFrame' && dist < 30) this.mode = 'weld';
        if (this.mode === 'weld') {
          this.welding = f;
          f.progress = Math.min(1, prog + (dt * inp.rate) / PIECES[f.kind].buildTime);
          if (f.progress >= 1) {
            delete f.progress;
            events.push({ type: 'finished', piece: f });
            const r2 = pieceRect(f);
            this.burst(r2.x + r2.w / 2, r2.y + r2.h / 2, 20);
            this.hop = 0;
            const next = inp.layout.frames().find((q) => q.id !== f.id);
            if (next) {
              this.mode = 'toFrame';
              events.push({ type: 'started', piece: next });
            } else this.mode = dDiver < 900 ? 'follow' : 'parked';
          }
        }
      }
    }

    // Fly: steer towards the target with a soft spring and capped speed. Close to
    // the target it settles instead of hunting around it.
    if (this.mode !== 'stranded') {
      let wx = (tx - this.x) * 2.4;
      let wy = (ty - this.y) * 2.4;
      const l = Math.hypot(wx, wy);
      if (l > maxSpeed) {
        wx *= maxSpeed / l;
        wy *= maxSpeed / l;
      }
      const k = 1 - Math.exp(-(l < 30 ? 6 : 4) * dt);
      const ax = this.vx;
      this.vx += (wx - this.vx) * k;
      this.vy += (wy - this.vy) * k;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      // Never into rock, and stay under the surface.
      if (isSolid(this.x, this.y + 10)) {
        this.y -= 90 * dt;
        if (this.vy > 0) this.vy = 0;
      }
      if (this.y < 78) {
        this.y = 78;
        if (this.vy < 0) this.vy = 0;
      }
      // Antenna: a spring that a change of speed sets wobbling.
      this.ant.v += (-(this.vx - ax) * 0.04 - this.ant.a * 90 - this.ant.v * 7) * dt;
      this.ant.a += this.ant.v * dt;
    }

    // Which way it faces: with clear travel, the way it flies; otherwise towards
    // what it is looking at. A dead zone stops it turning back and forth.
    if (this.mode !== 'stranded' && this.mode !== 'waking') {
      if (this.vx > 70) this.face = 1;
      else if (this.vx < -70) this.face = -1;
      else if (Math.abs(this.vx) < 40) {
        const dx = lookX - this.x;
        if (dx * this.face < -28) this.face = Math.sign(dx);
      }
      // Lean into travel, and tilt the head a little towards what it looks at.
      const lean = Math.max(-0.3, Math.min(0.3, this.vx / 900)) * this.face;
      const tilt = Math.max(-0.18, Math.min(0.18, (lookY - this.y) / 600));
      this.rot += (lean + tilt + Math.sin(this.time * 1.3) * 0.03 - this.rot) * Math.min(1, dt * 4);
    }
    this.faceAnim += (this.face - this.faceAnim) * Math.min(1, dt * 8);
    if (Math.abs(this.faceAnim) < 0.08) this.faceAnim = this.face * 0.08;

    // Arm: tucked while flying, reaching down to the seam while welding.
    const welding = this.mode === 'weld';
    const aimUpper = welding ? 1.15 + Math.sin(this.time * 2.3) * 0.12 : this.mode === 'stranded' ? 1.5 : 0.35;
    const aimFore = welding ? -0.5 + Math.sin(this.time * 3.1) * 0.15 : this.mode === 'stranded' ? 0.5 : 2.4;
    this.armUpper.rotation += (aimUpper - this.armUpper.rotation) * Math.min(1, dt * 5);
    this.armFore.rotation += (aimFore - this.armFore.rotation) * Math.min(1, dt * 5);

    if (this.hop >= 0) {
      this.hop += dt;
      if (this.hop > 1.5) this.hop = -1;
    }
    this.place();

    // ---- The eye ----
    const running = this.mode !== 'stranded';
    const wakeFlicker = this.mode === 'waking' ? (Math.sin(this.wake * 23) > 0.2 - this.wake * 0.3 ? 1 : 0.15) : 1;
    // A stranded drone's eye flickers weakly now and then, to catch the diver's eye.
    const ph = time % 5.5;
    const strandedBlink = ph < 0.12 || (ph > 0.3 && ph < 0.38) ? 0.45 : 0.04;
    const eyeOn = running ? wakeFlicker : strandedBlink;
    // The lens rolls inside the camera ball towards what it looks at.
    const lx = (lookX - this.x) * this.face;
    const ly = lookY - this.y;
    const ll = Math.hypot(lx, ly) || 1;
    const reach = Math.min(1, ll / 60) * 2.4;
    this.look.x += ((lx / ll) * reach - this.look.x) * Math.min(1, dt * 8);
    this.look.y += ((ly / ll) * reach - this.look.y) * Math.min(1, dt * 8);
    if (!running) this.look.x = this.look.y = 0;
    const [ex, ey] = this.toWorld(EYE.x + this.look.x, EYE.y + this.look.y);
    // Blinks every few seconds; half closed and sleepy while parked alone.
    if (this.time > this.blinkAt) this.blinkAt = this.time + R(2.5, 5.5);
    const lid = this.lidOpen();
    const happy = this.hop >= 0 && running;
    for (const g of [this.eye, this.smile, this.eyeHalo]) {
      g.position.set(ex, ey);
      g.rotation = this.body.rotation;
    }
    this.eye.visible = !happy;
    this.smile.visible = happy;
    this.eye.scale.set(this.faceAnim < 0 ? -1 : 1, Math.max(0.12, lid));
    this.eye.alpha = 0.25 + 0.75 * eyeOn;
    this.smile.alpha = eyeOn;
    this.eyeHalo.alpha = eyeOn * 0.75 * (happy ? 1 : Math.max(0.3, lid));
    this.eyeLight.x = ex;
    this.eyeLight.y = ey;
    this.eyeLight.intensity = 0.35 * eyeOn;

    // Antenna tip: a slow red blink while running.
    const ta = this.antenna.rotation;
    const [ax, ay] = this.toWorld(ANT.x + Math.sin(ta) * ANT_LEN, ANT.y - Math.cos(ta) * ANT_LEN);
    this.tip.position.set(ax, ay);
    this.tipHalo.position.set(ax, ay);
    const tipOn = running ? ((time * 0.8) % 1 < 0.15 ? 1 : 0.2) : 0;
    this.tip.alpha = tipOn;
    this.tipHalo.alpha = tipOn;
    this.fanL.visible = this.fanR.visible = running;
    for (const [g, o] of [[this.fanL, 0], [this.fanR, 1.7]] as [Graphics, number][]) {
      g.alpha = 0.5 + 0.5 * Math.sin(this.time * 47 + o);
      g.scale.x = 0.8 + 0.25 * Math.sin(this.time * 31 + o);
    }

    // The torch: a flickering white-hot point at the nozzle while welding, throwing sparks.
    const [nx, ny] = this.torchPoint();
    const arc = welding ? 0.65 + 0.35 * Math.sin(this.time * 61) * Math.sin(this.time * 23) : 0;
    this.torch.position.set(nx, ny);
    this.torchHalo.position.set(nx, ny);
    this.torch.visible = this.torchHalo.visible = welding;
    this.torch.alpha = arc;
    this.torchHalo.alpha = arc * 0.9;
    this.torchHalo.scale.set(0.8 + arc * 0.4);
    this.weldLight.x = nx;
    this.weldLight.y = ny;
    this.weldLight.intensity = welding ? 0.8 + arc * 0.8 : 0;
    if (welding) {
      this.sparkClock -= dt;
      if (this.sparkClock <= 0) {
        this.sparkClock = 0.06;
        this.burst(nx, ny, 2);
      }
    }
    this.updateSparks(dt);
    return events;
  }

  /** How open the eye is: 1 open, near 0 shut (blinks), about half while parked. */
  private lidOpen(): number {
    if (this.mode === 'stranded') return 1;
    const toBlink = this.blinkAt - this.time;
    // Each blink: shut and open again over the last 0.16 s before the next blink time.
    const b = toBlink < 0.16 ? Math.abs(toBlink - 0.08) / 0.08 : 1;
    const sleepy = this.mode === 'parked' ? 0.45 : 1;
    return Math.min(b, sleepy);
  }

  /** Where the torch nozzle is in the world. */
  torchPoint(): [number, number] {
    const a1 = this.armUpper.rotation;
    const a2 = a1 + this.armFore.rotation;
    const lx = 4 + Math.cos(a1) * 7 + Math.cos(a2) * 10;
    const ly = 9 + Math.sin(a1) * 7 + Math.sin(a2) * 10;
    return this.toWorld(lx, ly);
  }

  /** The happy hop: up and back down, with a full roll in the middle. */
  private hopPose(): { dy: number; spin: number } {
    if (this.hop < 0) return { dy: 0, spin: 0 };
    const t = Math.min(1, this.hop / 0.75);
    const dy = -Math.sin(t * Math.PI) * 14;
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    return { dy, spin: e * Math.PI * 2 };
  }

  private toWorld(lx: number, ly: number): [number, number] {
    const sx = lx * this.faceAnim;
    const c = Math.cos(this.body.rotation);
    const s = Math.sin(this.body.rotation);
    return [this.view.x + sx * c - ly * s, this.view.y + sx * s + ly * c];
  }

  private place(): void {
    const running = this.mode !== 'stranded';
    const bob = running ? Math.sin(this.time * 2.1) * 2 : 0;
    const h = this.hopPose();
    this.view.position.set(this.x, this.y + bob + h.dy);
    this.body.scale.set(this.faceAnim, 1);
    this.body.rotation = this.rot * this.face + h.spin * this.face;
    this.antenna.rotation = Math.max(-0.8, Math.min(0.8, this.ant.a + (running ? Math.sin(this.time * 1.7) * 0.05 : -0.3)));
  }

  private burst(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const g = new Graphics().circle(0, 0, R(0.6, 1.4)).fill({ color: rand() < 0.5 ? 0xfff1d0 : 0xffc070 });
      const a = rand() * Math.PI * 2;
      const sp = R(25, 130);
      this.emissive.addChild(g);
      this.sparks.push({ g, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 25, life: R(0.3, 0.8) });
    }
  }

  private updateSparks(dt: number): void {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      if (s.life <= 0) {
        s.g.destroy();
        this.sparks.splice(i, 1);
        continue;
      }
      s.vy += 110 * dt;
      s.vx *= 1 - dt * 2.5;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.g.position.set(s.x, s.y);
      s.g.alpha = Math.min(1, s.life * 2.2);
    }
  }
}
