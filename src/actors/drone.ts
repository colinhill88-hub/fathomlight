import { Container, Graphics, Text } from 'pixi.js';
import { mulberry32, WORLD_SEED } from '../rng';
import { groundY, isSolid, SLED_X } from '../world/terrain';
import { BaseLayout, CELL, GRID_BASE, GRID_ROWS, GRID_X0, GRID_X1, PIECES, pieceRect, Placed } from '../game/base';
import type { PointLight } from '../world/scenery';

/**
 * The build drone (milestone 3 follow-up, Colin's idea): a small Kestrel
 * construction robot that welds base pieces together.
 *
 * It starts stranded in the survey sled wreck, battery flat and wedged under
 * the sled's top rail. Hold Collect next to it with a few materials and the
 * diver patches it up. After that it follows the diver around. When a frame
 * is placed in build mode, it flies to the frame and welds it, bottom to
 * top, while the diver is free to swim off. When it has nothing to do and
 * the diver is far away, it waits at the base.
 *
 * Drawn with code: a weathered Kestrel-yellow hull with a steel belly, a
 * ducted lift fan on top, a rear thruster, an amber sensor eye, and a
 * folding arm with a welding torch underneath.
 *
 * Local drawing space: facing right, origin at the middle of the hull.
 */

const PAL = {
  yellow: 0xb8923f,
  yellowDark: 0x7f6430,
  steel: 0x5b6467,
  steelLight: 0x8a9496,
  steelDark: 0x3b4448,
  deep: 0x232a2d,
  rust: 0x8a3a20,
  algae: 0x5e7a3c,
  chromeHi: 0xd6e0ee,
};

/** Where the drone is stuck in the sled wreck. */
const STRAND = { x: SLED_X - 12, y: groundY(SLED_X - 12) - 62, rot: -0.38 };
/** How close the diver must be to work on the stranded drone. */
const REPAIR_REACH = 90;
/** Drawing scale: the drone is drawn at about 1.3x its local units. */
const SCALE = 1.3;
export const REPAIR_SECONDS = 4;

type Mode = 'stranded' | 'waking' | 'follow' | 'toFrame' | 'weld' | 'parked';

export type DroneEvent = { type: 'repaired' } | { type: 'finished'; piece: Placed } | { type: 'started'; piece: Placed };

export interface DroneInput {
  diverX: number;
  diverY: number;
  /** Which way the diver faces (1 right, -1 left). */
  diverFace: number;
  /** The diver is holding Collect next to the stranded drone, with the parts to fix it. */
  repairing: boolean;
  layout: BaseLayout;
  /** Welding speed (1 = normal). */
  rate: number;
}

let rand = mulberry32(WORLD_SEED ^ 0xd201e);
const R = (a: number, b: number) => a + rand() * (b - a);

function scratches(g: Graphics, x0: number, y0: number, w: number, h: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + rand() * w;
    const y = y0 + rand() * h;
    const a = rand() * Math.PI;
    const l = 1.5 + rand() * 3.5;
    g.moveTo(x, y)
      .lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
      .stroke({ color: 0xffffff, alpha: 0.18 + rand() * 0.12, width: 0.5 });
  }
}

function rivets(g: Graphics, pts: [number, number][]): void {
  for (const [x, y] of pts) {
    g.circle(x, y, 0.9).fill({ color: PAL.deep });
    g.circle(x - 0.3, y - 0.3, 0.4).fill({ color: PAL.chromeHi, alpha: 0.7 });
  }
}

function buildHull(): Graphics {
  const g = new Graphics();
  // Ducted lift fan on top: a short steel ring seen edge-on, on two struts.
  g.rect(-14, -22, 3, 8).fill({ color: PAL.steelDark });
  g.rect(6, -22, 3, 8).fill({ color: PAL.steelDark });
  g.roundRect(-22, -27, 38, 7, 3).fill({ color: PAL.steel });
  g.roundRect(-22, -27, 38, 2.4, 1.2).fill({ color: 0xffffff, alpha: 0.2 });
  g.roundRect(-22, -22.5, 38, 2.5, 1).fill({ color: PAL.deep, alpha: 0.6 });

  // Rear thruster pod.
  g.roundRect(-40, -6, 14, 14, 4).fill({ color: PAL.steelDark });
  g.roundRect(-43, -8, 5, 18, 2).fill({ color: PAL.steel });
  g.roundRect(-43, -8, 5, 3, 1).fill({ color: 0xffffff, alpha: 0.2 });
  for (let y = -4; y <= 6; y += 3.4) g.moveTo(-36, y).lineTo(-28, y).stroke({ color: PAL.deep, width: 0.8, alpha: 0.7 });

  // Hull: Kestrel yellow on top, steel belly.
  g.roundRect(-30, -16, 58, 30, 9).fill({ color: PAL.yellow });
  g.roundRect(-30, 1, 58, 13, 6).fill({ color: PAL.steel });
  g.rect(-30, 0, 58, 1.6).fill({ color: PAL.deep, alpha: 0.8 });
  g.roundRect(-26, -15, 48, 4, 2).fill({ color: 0xffffff, alpha: 0.16 });
  g.roundRect(-28, 8, 54, 5, 3).fill({ color: PAL.deep, alpha: 0.35 });
  // Panel seams and an access hatch.
  g.moveTo(-6, -16).lineTo(-6, 0).moveTo(10, -16).lineTo(10, 0).stroke({ color: PAL.yellowDark, width: 0.8, alpha: 0.9 });
  g.roundRect(-4, -12, 12, 9, 1.5).stroke({ color: PAL.yellowDark, width: 0.8 });
  rivets(g, [[-26, -12], [-26, -3], [-8, -13], [8, -13], [-8, -2], [8, -2], [20, -12], [-20, 4], [0, 4], [16, 4]]);
  // Faded hazard stripes on the tail.
  for (let i = 0; i < 4; i++) {
    const x = -29 + i * 5;
    g.poly([x, -16 + 2, x + 3, -16 + 2, x - 2, -2, x - 5, -2]).fill({ color: 0x2a2620, alpha: 0.55 });
  }
  // Sensor eye: a recessed steel bezel (the lens itself is drawn glowing).
  g.circle(22, -3, 8.5).fill({ color: PAL.steelDark });
  g.circle(22, -3, 8.5).stroke({ color: PAL.steelLight, width: 1.2, alpha: 0.8 });
  g.circle(22, -3, 5.5).fill({ color: 0x14181a });
  // Weathering.
  scratches(g, -28, -14, 50, 26, 16);
  for (let i = 0; i < 6; i++) {
    const x = R(-26, 18);
    const l = R(4, 10);
    g.moveTo(x, -1)
      .quadraticCurveTo(x + R(-1, 1), l * 0.5, x + R(-1.5, 1.5), l)
      .stroke({ color: PAL.rust, alpha: R(0.3, 0.55), width: R(0.6, 1.2) });
  }
  for (let i = 0; i < 9; i++) g.circle(R(-28, 20), R(10, 13), R(0.6, 1.5)).fill({ color: PAL.algae, alpha: 0.75 });
  return g;
}

function stencil(): Text {
  const t = new Text({
    text: 'KD-1',
    style: { fontFamily: 'Courier New, monospace', fontSize: 7, fontWeight: 'bold', fill: 0x2a2418 },
    resolution: 5,
  });
  t.position.set(-24, -10);
  t.alpha = 0.7;
  return t;
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
  private body = new Container();
  private armUpper = new Container();
  private armFore = new Container();
  private fanBlur = new Graphics();
  private tailBlur = new Graphics();
  private tangle = new Graphics();
  private eye = new Graphics();
  private eyeHalo = new Graphics();
  private torch = new Graphics();
  private torchHalo = new Graphics();
  private tip = new Graphics();
  private tipHalo = new Graphics();
  private sparks: { g: Graphics; x: number; y: number; vx: number; vy: number; life: number }[] = [];
  private sparkClock = 0;
  private trail: { x: number; y: number }[] = [];
  private trailClock = 0;
  private eyeLight: PointLight = { x: 0, y: 0, radius: 150, intensity: 0, color: [1, 0.78, 0.5] };
  private weldLight: PointLight = { x: 0, y: 0, radius: 320, intensity: 0, color: [1, 0.95, 0.86] };

  constructor(active: boolean) {
    rand = mulberry32(WORLD_SEED ^ 0xd201e);
    this.body.addChild(buildHull(), stencil());
    // Prop blur discs: drawn faint and flickering while the motors run.
    this.fanBlur.ellipse(0, 0, 18, 2.2).fill({ color: 0xd8dccf, alpha: 0.35 });
    this.fanBlur.position.set(-3, -23.5);
    this.tailBlur.ellipse(0, 0, 2.2, 9).fill({ color: 0xd8dccf, alpha: 0.35 });
    this.tailBlur.position.set(-46, 1);
    this.body.addChild(this.fanBlur, this.tailBlur);

    // Folding arm with a welding torch under the belly.
    const ug = new Graphics();
    ug.circle(0, 0, 3.6).fill({ color: PAL.steelDark });
    ug.roundRect(-2, -2.4, 15, 4.8, 2.4).fill({ color: PAL.steel });
    ug.roundRect(-1, -2.2, 13, 1.4, 0.7).fill({ color: 0xffffff, alpha: 0.2 });
    this.armUpper.addChild(ug);
    this.armUpper.position.set(8, 13);
    const fg = new Graphics();
    fg.circle(0, 0, 2.8).fill({ color: PAL.steelDark });
    fg.roundRect(-1.5, -2, 12, 4, 2).fill({ color: PAL.yellow });
    fg.roundRect(9, -2.6, 6, 5.2, 1.2).fill({ color: PAL.steelDark }); // torch head
    fg.rect(14.5, -1, 3, 2).fill({ color: 0x9a8a6a }); // nozzle
    this.armFore.addChild(fg);
    this.armFore.position.set(13, 0);
    this.armUpper.addChild(this.armFore);
    this.body.addChild(this.armUpper);

    // Antenna with a status tip.
    const ant = new Graphics();
    ant.moveTo(-18, -15).lineTo(-23, -31).stroke({ color: PAL.steelDark, width: 1.4 });
    this.body.addChildAt(ant, 0);
    this.view.addChild(this.body);

    // Old cable tangled round it in the wreck (gone once it is freed).
    rand = mulberry32(WORLD_SEED ^ 0x7a961e);
    const t = this.tangle;
    for (let i = 0; i < 3; i++) {
      const y0 = R(-14, 6);
      t.moveTo(-40, y0 + R(-6, 6))
        .bezierCurveTo(-12, y0 + R(-18, 18), 10, y0 + R(-18, 18), 38, y0 + R(-10, 14))
        .stroke({ color: i ? 0x3a3128 : 0x4a3f33, width: R(1.6, 2.6), alpha: 0.95 });
    }
    for (let i = 0; i < 26; i++) t.circle(R(-30, 26), R(-18, 12), R(0.8, 2)).fill({ color: rand() < 0.6 ? PAL.algae : 0x8aa154, alpha: 0.8 });
    t.ellipse(0, 18, 34, 5).fill({ color: 0xb7a47a, alpha: 0.55 }); // sand drifted against it
    this.body.addChild(this.tangle);

    this.eye.circle(0, 0, 3.6).fill({ color: 0xffc070 });
    this.eyeHalo.circle(0, 0, 13).fill({ color: 0xffb050, alpha: 0.7 });
    this.torch.circle(0, 0, 3).fill({ color: 0xfff8ec });
    this.torchHalo.circle(0, 0, 22).fill({ color: 0xfff0d0, alpha: 0.9 });
    this.tip.circle(0, 0, 1.6).fill({ color: 0xff6a4a });
    this.tipHalo.circle(0, 0, 7).fill({ color: 0xff5a3a, alpha: 0.6 });
    this.emissive.addChild(this.eye, this.tip, this.torch);
    this.glow.addChild(this.eyeHalo, this.tipHalo, this.torchHalo);
    this.lights.push(this.eyeLight, this.weldLight);

    if (active) this.activate(null);
    this.place();
  }

  /** Skip the wreck: the drone is already repaired (a loaded save). */
  private activate(at: { x: number; y: number } | null): void {
    this.mode = 'follow';
    this.tangle.visible = false;
    this.rot = 0;
    if (at) {
      this.x = at.x;
      this.y = at.y;
    }
  }

  /** Put the drone straight next to a point (after loading, or when the crew brings the diver back). */
  teleport(x: number, y: number, layout: BaseLayout): void {
    if (this.mode === 'stranded' || this.mode === 'waking') return;
    const f = layout.frames()[0];
    if (f) {
      const r = pieceRect(f);
      this.x = r.x + r.w / 2;
      this.y = r.y + r.h - 40;
      this.mode = 'toFrame';
    } else {
      this.x = x - 60;
      this.y = Math.max(80, y - 50);
      this.mode = 'follow';
    }
    this.vx = this.vy = 0;
    this.trail.length = 0;
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

    const dDiver = Math.hypot(inp.diverX - this.x, inp.diverY - this.y);
    this.inReach = this.mode === 'stranded' && dDiver < REPAIR_REACH;
    let tx = this.x;
    let ty = this.y;
    let maxSpeed = 460;
    this.welding = null;

    if (this.mode === 'stranded') {
      if (this.inReach && inp.repairing) {
        this.repairProgress += dt / REPAIR_SECONDS;
        this.sparkClock -= dt;
        if (this.sparkClock <= 0) {
          this.sparkClock = 0.18;
          const [sx, sy] = this.toWorld(R(-20, 20), R(-10, 10));
          this.burst(sx, sy, 4);
        }
        if (this.repairProgress >= 1) {
          this.mode = 'waking';
          this.wake = 0;
          this.tangle.visible = false;
          this.burst(this.x, this.y, 30);
          events.push({ type: 'repaired' });
        }
      } else this.repairProgress = Math.max(0, this.repairProgress - dt * 0.3);
    } else if (this.mode === 'waking') {
      // Shake free, level out and lift off.
      this.wake += dt;
      const k = Math.min(1, this.wake / 2.4);
      this.rot = STRAND.rot * (1 - k) + Math.sin(this.wake * 30) * 0.06 * (1 - k);
      tx = STRAND.x;
      ty = STRAND.y - 50 * k * k;
      maxSpeed = 60;
      if (this.wake > 2.4) this.mode = 'follow';
    } else {
      const frames = inp.layout.frames();
      if (frames.length && this.mode !== 'toFrame' && this.mode !== 'weld') {
        this.mode = 'toFrame';
        events.push({ type: 'started', piece: frames[0] });
      }
      if (!frames.length && (this.mode === 'toFrame' || this.mode === 'weld')) this.mode = dDiver < 900 ? 'follow' : 'parked';
      if (this.mode === 'parked' && dDiver < 760) this.mode = 'follow';

      if (this.mode === 'follow') {
        // Trail the diver from about half a second behind, a little above and behind them.
        const p = this.trail[Math.max(0, this.trail.length - 7)] ?? { x: inp.diverX, y: inp.diverY };
        tx = p.x - inp.diverFace * 58;
        ty = p.y - 44;
        if (isSolid(tx, ty)) {
          tx = p.x;
          ty = p.y;
        }
        // Do not crowd the diver.
        if (dDiver < 46) {
          tx = this.x + ((this.x - inp.diverX) / (dDiver || 1)) * 30;
          ty = this.y + ((this.y - inp.diverY) / (dDiver || 1)) * 30;
        }
      } else if (this.mode === 'parked') {
        // Hover over the middle of the site, waiting for the diver to come back.
        tx = (GRID_X0 + GRID_X1) / 2 + Math.sin(this.time * 0.3) * 120;
        ty = GRID_BASE - GRID_ROWS * CELL - 30 + Math.sin(this.time * 0.7) * 10;
      } else {
        // Fly to the oldest frame and weld it, sweeping along the seam from the bottom up.
        const f = frames[0];
        const r = pieceRect(f);
        const prog = f.progress ?? 0;
        const seamY = r.y + r.h * (1 - prog);
        const sx = r.x + r.w * (0.5 + 0.38 * Math.sin(this.time * 0.9 + f.id));
        tx = sx - 20;
        ty = seamY - 40;
        maxSpeed = 420;
        const dist = Math.hypot(tx - this.x, ty - this.y);
        if (this.mode === 'toFrame' && dist < 40) this.mode = 'weld';
        if (this.mode === 'weld') {
          this.welding = f;
          f.progress = Math.min(1, prog + (dt * inp.rate) / PIECES[f.kind].buildTime);
          if (f.progress >= 1) {
            delete f.progress;
            events.push({ type: 'finished', piece: f });
            const r2 = pieceRect(f);
            this.burst(r2.x + r2.w / 2, r2.y + r2.h / 2, 26);
            const next = inp.layout.frames().find((q) => q.id !== f.id);
            if (next) {
              this.mode = 'toFrame';
              events.push({ type: 'started', piece: next });
            } else this.mode = dDiver < 900 ? 'follow' : 'parked';
          }
        }
      }
    }

    // Fly: steer towards the target with a soft spring, capped speed.
    if (this.mode !== 'stranded') {
      let wx = (tx - this.x) * 2.6;
      let wy = (ty - this.y) * 2.6;
      const l = Math.hypot(wx, wy);
      if (l > maxSpeed) {
        wx *= maxSpeed / l;
        wy *= maxSpeed / l;
      }
      const k = 1 - Math.exp(-4 * dt);
      this.vx += (wx - this.vx) * k;
      this.vy += (wy - this.vy) * k;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      // Never into rock, and stay under the surface.
      if (isSolid(this.x, this.y + 12)) {
        this.y -= 90 * dt;
        if (this.vy > 0) this.vy = 0;
      }
      if (this.y < 80) {
        this.y = 80;
        if (this.vy < 0) this.vy = 0;
      }
      if (this.mode !== 'waking') {
        if (this.mode === 'weld' && this.welding) {
          const r = pieceRect(this.welding);
          this.face = r.x + r.w / 2 > this.x ? 1 : -1;
          if (Math.abs(this.vx) > 60) this.face = Math.sign(this.vx);
        } else if (this.vx > 25) this.face = 1;
        else if (this.vx < -25) this.face = -1;
        // Lean into the direction of travel.
        const lean = Math.max(-0.35, Math.min(0.35, this.vx / 900)) * this.face;
        this.rot += (lean + Math.sin(this.time * 1.3) * 0.03 - this.rot) * Math.min(1, dt * 4);
      }
    }
    this.faceAnim += (this.face - this.faceAnim) * Math.min(1, dt * 8);
    if (Math.abs(this.faceAnim) < 0.08) this.faceAnim = this.face * 0.08;

    // Arm: tucked while flying, reaching down to the seam while welding.
    const welding = this.mode === 'weld';
    const aimUpper = welding ? 1.1 + Math.sin(this.time * 2.3) * 0.12 : this.mode === 'stranded' ? 1.5 : 0.25;
    const aimFore = welding ? -0.5 + Math.sin(this.time * 3.1) * 0.15 : this.mode === 'stranded' ? 0.4 : 2.3;
    this.armUpper.rotation += (aimUpper - this.armUpper.rotation) * Math.min(1, dt * 5);
    this.armFore.rotation += (aimFore - this.armFore.rotation) * Math.min(1, dt * 5);

    this.place();

    // Lights and glow.
    const running = this.mode !== 'stranded';
    const wakeFlicker = this.mode === 'waking' ? (Math.sin(this.wake * 23) > 0.2 - this.wake * 0.3 ? 1 : 0.15) : 1;
    // A stranded drone's eye flickers weakly now and then, to catch the eye.
    const strandedBlink = (time % 5.5) < 0.12 || ((time % 5.5) > 0.3 && (time % 5.5) < 0.38) ? 0.45 : 0.04;
    const eyeOn = running ? wakeFlicker : strandedBlink;
    const [ex, ey] = this.toWorld(22, -3);
    this.eye.position.set(ex, ey);
    this.eyeHalo.position.set(ex, ey);
    this.eye.alpha = 0.25 + 0.75 * eyeOn;
    this.eyeHalo.alpha = eyeOn * 0.8;
    this.eyeLight.x = ex;
    this.eyeLight.y = ey;
    this.eyeLight.intensity = 0.45 * eyeOn;
    const [ax, ay] = this.toWorld(-23, -31);
    this.tip.position.set(ax, ay);
    this.tipHalo.position.set(ax, ay);
    const tipOn = running ? ((time * 0.8) % 1 < 0.15 ? 1 : 0.2) : 0;
    this.tip.alpha = tipOn;
    this.tipHalo.alpha = tipOn;
    this.fanBlur.visible = this.tailBlur.visible = running;
    this.fanBlur.alpha = 0.5 + 0.5 * Math.sin(this.time * 47);
    this.fanBlur.scale.x = 0.8 + 0.2 * Math.sin(this.time * 31);
    this.tailBlur.alpha = 0.3 + 0.4 * Math.abs(Math.sin(this.time * 41));

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
    this.weldLight.intensity = welding ? 0.9 + arc * 0.9 : 0;
    if (welding) {
      this.sparkClock -= dt;
      if (this.sparkClock <= 0) {
        this.sparkClock = 0.05;
        this.burst(nx, ny, 2);
      }
    }
    this.updateSparks(dt);
    return events;
  }

  /** Where the torch nozzle is in the world. */
  torchPoint(): [number, number] {
    const a1 = this.armUpper.rotation;
    const a2 = a1 + this.armFore.rotation;
    const lx = 8 + Math.cos(a1) * 13 + Math.cos(a2) * 17;
    const ly = 13 + Math.sin(a1) * 13 + Math.sin(a2) * 17;
    return this.toWorld(lx, ly);
  }

  private toWorld(lx: number, ly: number): [number, number] {
    const sx = lx * this.faceAnim * SCALE;
    ly *= SCALE;
    const c = Math.cos(this.body.rotation);
    const s = Math.sin(this.body.rotation);
    const bob = this.mode === 'stranded' ? 0 : Math.sin(this.time * 2.1) * 2.5;
    return [this.x + sx * c - ly * s, this.y + bob + sx * s + ly * c];
  }

  private place(): void {
    const bob = this.mode === 'stranded' ? 0 : Math.sin(this.time * 2.1) * 2.5;
    this.view.position.set(this.x, this.y + bob);
    this.body.scale.set(this.faceAnim * SCALE, SCALE);
    this.body.rotation = this.rot * this.face;
  }

  private burst(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const g = new Graphics().circle(0, 0, R(0.7, 1.6)).fill({ color: rand() < 0.5 ? 0xfff1d0 : 0xffc070 });
      const a = rand() * Math.PI * 2;
      const sp = R(30, 150);
      this.emissive.addChild(g);
      this.sparks.push({ g, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: R(0.3, 0.9) });
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
