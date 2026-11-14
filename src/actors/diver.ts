import { Container, Graphics, Text } from 'pixi.js';
import { isSolid } from '../world/terrain';
import { mulberry32 } from '../rng';

/**
 * The explorer, drawn entirely with code: an orange shallows suit, a yellow
 * air tank, steel fittings and a dome helmet with a headlamp. Joints (hips,
 * knees, ankles, shoulders, elbows) are separate pieces so the limbs can kick
 * and scull. Weathering (rivets, seams, scratches and rust) is painted on.
 *
 * Local drawing space: facing right, origin at the middle of the torso.
 */

const C = {
  suit: 0xb0602f,
  suitShade: 0x7f4024,
  suitLight: 0xc9824c,
  rust: 0x8a3a20,
  steel: 0x707c80,
  steelDark: 0x3b4448,
  steelLight: 0xaab4b5,
  yellow: 0xc29b45,
  yellowShade: 0x8c6f31,
  rubber: 0x2c2a27,
  rubberEdge: 0x5a3324,
  glass: 0x163238,
  glassHi: 0xd8ece8,
};

const rand = mulberry32(0xd1e5);

function rivets(g: Graphics, pts: [number, number][], r = 1.1): void {
  for (const [x, y] of pts) {
    g.circle(x, y, r).fill({ color: C.steelDark });
    g.circle(x - 0.3, y - 0.4, r * 0.45).fill({ color: C.steelLight, alpha: 0.8 });
  }
}

function scratches(g: Graphics, x0: number, y0: number, w: number, h: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + rand() * w;
    const y = y0 + rand() * h;
    const a = rand() * Math.PI;
    const l = 2 + rand() * 4;
    g.moveTo(x, y)
      .lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
      .stroke({ color: 0xffffff, alpha: 0.18 + rand() * 0.12, width: 0.6 });
  }
}

function rustStreaks(g: Graphics, x0: number, y0: number, w: number, n: number, len: number): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + rand() * w;
    const l = len * (0.5 + rand());
    g.moveTo(x, y0)
      .quadraticCurveTo(x + (rand() - 0.5) * 2, y0 + l * 0.5, x + (rand() - 0.5) * 3, y0 + l)
      .stroke({ color: C.rust, alpha: 0.35 + rand() * 0.25, width: 0.8 + rand() * 0.9 });
  }
}

/** A limb segment drawn along +x from its joint. */
function segment(len: number, thick: number, color: number, shade: number): Graphics {
  const g = new Graphics();
  g.roundRect(-thick * 0.45, -thick / 2, len + thick * 0.9, thick, thick / 2).fill({ color });
  g.roundRect(-thick * 0.3, thick * 0.05, len + thick * 0.6, thick * 0.42, thick * 0.2).fill({
    color: shade,
    alpha: 0.6,
  });
  g.moveTo(0, -thick * 0.3)
    .lineTo(len, -thick * 0.3)
    .stroke({ color: 0xffffff, alpha: 0.12, width: 1 });
  return g;
}

interface Leg {
  thigh: Container;
  shin: Container;
  fin: Container;
}
interface Arm {
  upper: Container;
  fore: Container;
}

function buildLeg(far: boolean): Leg {
  const k = far ? 0.72 : 1;
  const tint = far ? 0x9a9a9a : 0xffffff;
  const thigh = new Container();
  const tg = segment(30, 13, C.suit, C.suitShade);
  // Steel knee pad.
  tg.roundRect(25, -6.5, 9, 13, 3).fill({ color: C.steel });
  rivets(tg, [[29.5, -3.5], [29.5, 3.5]], 0.9);
  tg.tint = tint;
  thigh.addChild(tg);

  const shin = new Container();
  shin.x = 30;
  const sg = segment(26, 11, C.suit, C.suitShade);
  sg.rect(18, -5.5, 5, 11).fill({ color: C.steelDark, alpha: 0.7 }); // strap
  scratches(sg, 2, -4, 18, 6, 3);
  sg.tint = tint;
  shin.addChild(sg);
  thigh.addChild(shin);

  const fin = new Container();
  fin.x = 28;
  const fg = new Graphics();
  // Boot.
  fg.roundRect(-5, -6, 12, 12, 4).fill({ color: C.rubber });
  // Blade: long, tapered and slightly ribbed.
  fg.moveTo(2, -6)
    .lineTo(44, -9)
    .quadraticCurveTo(50, -1, 46, 6)
    .lineTo(4, 5)
    .closePath()
    .fill({ color: C.rubber });
  fg.moveTo(44, -9).quadraticCurveTo(50, -1, 46, 6).stroke({ color: C.rubberEdge, width: 2.2, alpha: 0.9 });
  for (const y of [-4, 0, 3.5])
    fg.moveTo(8, y * 0.7)
      .lineTo(42, y * 1.25)
      .stroke({ color: 0x4a4540, width: 1, alpha: 0.7 });
  fg.tint = tint;
  fin.addChild(fg);
  shin.addChild(fin);

  thigh.scale.set(1, k > 0.9 ? 1 : 0.96);
  return { thigh, shin, fin };
}

function buildArm(far: boolean): Arm {
  const tint = far ? 0x9a9a9a : 0xffffff;
  const upper = new Container();
  const ug = segment(20, 10, C.suit, C.suitShade);
  ug.circle(0, 0, 6).fill({ color: C.steel }); // shoulder joint ring
  ug.circle(0, 0, 3).fill({ color: C.steelDark });
  ug.tint = tint;
  upper.addChild(ug);

  const fore = new Container();
  fore.x = 20;
  const fg = segment(17, 9, C.suit, C.suitShade);
  // Glove.
  fg.roundRect(15, -5, 10, 10, 4).fill({ color: C.rubber });
  fg.rect(14, -5, 3, 10).fill({ color: C.steel });
  fg.tint = tint;
  fore.addChild(fg);
  upper.addChild(fore);
  return { upper, fore };
}

function buildTorso(): Container {
  const c = new Container();
  const g = new Graphics();

  // Air tank on the back.
  g.roundRect(-30, -31, 58, 18, 9).fill({ color: C.yellow });
  g.roundRect(-28, -22, 54, 8, 4).fill({ color: C.yellowShade, alpha: 0.7 });
  g.roundRect(-26, -29, 50, 4, 2).fill({ color: 0xffffff, alpha: 0.13 });
  for (const x of [-16, 12]) {
    g.rect(x, -32, 4, 20).fill({ color: C.steel });
    rivets(g, [[x + 2, -28], [x + 2, -16]], 0.9);
  }
  rustStreaks(g, -26, -20, 48, 6, 7);
  // Valve and hose to the helmet.
  g.roundRect(26, -28, 9, 10, 2).fill({ color: C.steel });
  g.circle(30.5, -30, 3).fill({ color: C.steelDark });
  g.moveTo(34, -22)
    .bezierCurveTo(44, -24, 42, -10, 48, -8)
    .stroke({ color: C.rubber, width: 4, cap: 'round' });

  // Suit body.
  g.roundRect(-34, -15, 74, 30, 13).fill({ color: C.suit });
  g.roundRect(-32, 3, 70, 11, 6).fill({ color: C.suitShade, alpha: 0.75 });
  g.roundRect(-30, -13, 66, 5, 3).fill({ color: C.suitLight, alpha: 0.45 });
  // Panel seams.
  for (const x of [-12, 8]) g.moveTo(x, -14).lineTo(x + 1, 14).stroke({ color: C.suitShade, width: 1.1 });
  // Harness straps.
  g.rect(18, -15, 5, 30).fill({ color: C.steelDark, alpha: 0.85 });
  g.rect(-22, -15, 5, 30).fill({ color: C.steelDark, alpha: 0.85 });
  g.roundRect(-36, -5, 9, 12, 3).fill({ color: C.steel }); // belt buckle
  rivets(g, [[-31.5, -1], [-31.5, 3.5]], 0.9);
  // Chest plate with rivets and a stencilled number.
  g.roundRect(24, -12, 17, 22, 5).fill({ color: C.steel });
  g.roundRect(25, 2, 15, 7, 3).fill({ color: C.steelDark, alpha: 0.45 });
  rivets(g, [[27, -9], [38, -9], [27, 7], [38, 7]]);
  scratches(g, -30, -12, 70, 24, 10);
  rustStreaks(g, 24, -2, 16, 3, 9);
  // Algae speckles near the bottom of the suit.
  for (let i = 0; i < 10; i++)
    g.circle(-30 + rand() * 60, 9 + rand() * 4, 0.8 + rand() * 1.2).fill({ color: 0x5f7a3a, alpha: 0.5 });
  c.addChild(g);

  const stencil = new Text({
    text: 'K7',
    style: { fontFamily: 'Courier New, monospace', fontSize: 11, fontWeight: 'bold', fill: 0x2a2418 },
    resolution: 4,
  });
  stencil.alpha = 0.55;
  stencil.anchor.set(0.5);
  stencil.position.set(-2, -22.5);
  c.addChild(stencil);
  return c;
}

function buildHelmet(): Container {
  const c = new Container();
  c.position.set(52, -2);
  const g = new Graphics();
  // Collar ring.
  g.roundRect(-10, -15, 10, 30, 4).fill({ color: C.steel });
  rivets(g, [[-5, -11], [-5, 0], [-5, 11]]);
  // Dome.
  g.circle(10, 0, 18).fill({ color: C.steel });
  g.circle(10, 0, 18).stroke({ color: C.steelDark, width: 1.5 });
  g.circle(12, 0, 14).fill({ color: C.glass });
  // A faint face behind the glass.
  g.ellipse(13, 2, 6.5, 8).fill({ color: 0x6d5446, alpha: 0.55 });
  g.ellipse(15.5, 0, 1.4, 1.1).fill({ color: 0x1a1210, alpha: 0.6 });
  // Reflections on the glass.
  g.arc(12, 0, 11, Math.PI * 1.05, Math.PI * 1.55).stroke({ color: C.glassHi, width: 3, alpha: 0.55, cap: 'round' });
  g.circle(19, -7, 1.8).fill({ color: 0xffffff, alpha: 0.6 });
  // Frame rivets around the window.
  const pts: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    pts.push([10 + Math.cos(a) * 16, Math.sin(a) * 16]);
  }
  rivets(g, pts, 0.9);
  // Headlamp housing on top.
  g.roundRect(6, -24, 18, 8, 3).fill({ color: C.steelDark });
  g.roundRect(8, -23, 13, 3, 1.5).fill({ color: C.steel });
  g.circle(25, -20, 3.4).fill({ color: C.steel });
  rustStreaks(g, 0, 10, 20, 3, 6);
  c.addChild(g);
  return c;
}

export interface LampPose {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
}

export class Diver {
  readonly view = new Container();
  /** The glowing lens of the headlamp, drawn without lighting so it shines. */
  readonly lens = new Graphics();
  readonly lensGlow = new Graphics();

  x = 300;
  y = 300;
  vx = 0;
  vy = 0;
  lampOn = true;
  /** 0..1, how fast the diver is going relative to normal top speed. */
  speedNorm = 0;

  private body = new Container();
  private nearLeg = buildLeg(false);
  private farLeg = buildLeg(true);
  private nearArm = buildArm(false);
  private farArm = buildArm(true);
  private face = 1; // 1 right, -1 left
  private faceAnim = 1;
  private pitch = 0;
  private kick = 0;
  private time = 0;
  private boostTime = 0;
  private boostCooldown = 0;
  private lampLevel = 1;

  private static readonly SCALE = 0.82;
  private static readonly RADIUS = 26;
  private static readonly SPEED = 230;
  private static readonly BOOST_SPEED = 430;

  constructor() {
    const torso = buildTorso();
    const helmet = buildHelmet();
    const hip = { x: -30, y: 5 };
    const shoulder = { x: 30, y: 6 };
    this.farLeg.thigh.position.set(hip.x + 2, hip.y - 3);
    this.nearLeg.thigh.position.set(hip.x, hip.y + 2);
    this.farArm.upper.position.set(shoulder.x + 2, shoulder.y - 3);
    this.nearArm.upper.position.set(shoulder.x, shoulder.y + 2);
    this.body.addChild(this.farLeg.thigh, this.farArm.upper, torso, helmet, this.nearLeg.thigh, this.nearArm.upper);
    this.body.position.set(0, 0);
    this.view.addChild(this.body);

    this.lens.circle(0, 0, 2.6).fill({ color: 0xfff3d0 });
    this.lensGlow.circle(0, 0, 14).fill({ color: 0xffe9b0, alpha: 0.9 });
  }

  /** Where the headlamp lens sits, in local drawing space. */
  private static readonly LAMP = { x: 78, y: -22 };
  private static readonly BUBBLE = { x: 60, y: -20 };

  private toWorld(lx: number, ly: number): [number, number] {
    const S = Diver.SCALE;
    const sx = lx * this.faceAnim * S;
    ly *= S;
    const r = this.body.rotation;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return [this.x + sx * c - ly * s, this.y + sx * s + ly * c];
  }

  lampPose(): LampPose {
    const [x, y] = this.toWorld(Diver.LAMP.x, Diver.LAMP.y);
    const r = this.body.rotation;
    const dl = 1;
    const dyl = 0.22; // aim slightly downwards
    const dx = dl * this.face;
    return {
      x,
      y,
      dirX: dx * Math.cos(r) - dyl * Math.sin(r),
      dirY: dx * Math.sin(r) + dyl * Math.cos(r),
    };
  }

  bubblePoint(): [number, number] {
    return this.toWorld(Diver.BUBBLE.x, Diver.BUBBLE.y);
  }

  /** How strongly the headlamp shines right now (it fades on and off). */
  get lamp(): number {
    return this.lampLevel;
  }

  get boosting(): boolean {
    return this.boostTime > 0;
  }

  update(dt: number, moveX: number, moveY: number, boost: boolean, toggleLamp: boolean): void {
    this.time += dt;
    if (toggleLamp) this.lampOn = !this.lampOn;
    this.lampLevel += ((this.lampOn ? 1 : 0) - this.lampLevel) * Math.min(1, dt * 10);

    // Boost: a short burst of hard kicking, then a cooldown.
    this.boostCooldown = Math.max(0, this.boostCooldown - dt);
    this.boostTime = Math.max(0, this.boostTime - dt);
    if (boost && this.boostCooldown <= 0) {
      this.boostTime = 0.55;
      this.boostCooldown = 1.1;
      let bx = moveX;
      let by = moveY;
      if (Math.hypot(bx, by) < 0.2) {
        bx = this.face;
        by = 0;
      }
      const l = Math.hypot(bx, by);
      this.vx += (bx / l) * 260;
      this.vy += (by / l) * 260;
    }

    // Swim physics: accelerate towards the wanted velocity, with water drag.
    const top = this.boostTime > 0 ? Diver.BOOST_SPEED : Diver.SPEED;
    const wantX = moveX * top;
    const wantY = moveY * top;
    const accel = Math.hypot(moveX, moveY) > 0.05 ? 3.2 : 1.4;
    const k = 1 - Math.exp(-accel * dt);
    this.vx += (wantX - this.vx) * k;
    this.vy += (wantY - this.vy) * k;
    // Gentle bob when floating still.
    this.vy += Math.sin(this.time * 1.6) * 6 * dt * (1 - Math.min(1, Math.hypot(moveX, moveY)));

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.collide();

    const speed = Math.hypot(this.vx, this.vy);
    this.speedNorm = Math.min(1.6, speed / Diver.SPEED);

    // Facing and body angle.
    if (this.vx > 25) this.face = 1;
    else if (this.vx < -25) this.face = -1;
    this.faceAnim += (this.face - this.faceAnim) * Math.min(1, dt * 9);
    if (Math.abs(this.faceAnim) < 0.08) this.faceAnim = this.face * 0.08; // never quite zero width

    const moving = Math.min(1, speed / 60);
    const swimAngle = Math.atan2(this.vy, Math.abs(this.vx) + 25);
    const idleAngle = -0.22 + Math.sin(this.time * 0.9) * 0.04;
    const targetPitch = Math.max(-1.15, Math.min(1.15, swimAngle * moving + idleAngle * (1 - moving)));
    this.pitch += (targetPitch - this.pitch) * Math.min(1, dt * 5);

    this.view.position.set(this.x, this.y);
    this.body.scale.set(this.faceAnim * Diver.SCALE, Diver.SCALE);
    this.body.rotation = this.pitch * this.face;

    this.animateLimbs(dt, moving);
  }

  private animateLimbs(dt: number, moving: number): void {
    const s = this.speedNorm;
    const boost = this.boostTime > 0 ? 1 : 0;
    this.kick += dt * (2.2 + s * 6.5 + boost * 5);
    const amp = 0.1 + Math.min(1, s) * 0.32 + boost * 0.12;
    const legs: [Leg, number][] = [
      [this.nearLeg, 0],
      [this.farLeg, Math.PI],
    ];
    for (const [leg, off] of legs) {
      const p = this.kick + off;
      leg.thigh.rotation = Math.PI - 0.06 + Math.sin(p) * amp;
      leg.shin.rotation = 0.12 + Math.sin(p - 0.9) * amp * 0.9;
      leg.fin.rotation = Math.sin(p - 1.7) * amp * 1.2;
    }

    // Arms: streamlined along the body when swimming, gentle sculling when still.
    const scull = Math.sin(this.time * 2.1);
    const arms: [Arm, number][] = [
      [this.nearArm, 0],
      [this.farArm, 0.8],
    ];
    for (const [arm, off] of arms) {
      const idleUpper = 1.05 + Math.sin(this.time * 2.1 + off) * 0.22;
      const idleFore = -0.9 + scull * 0.15;
      const swimUpper = Math.PI - 0.32 + Math.sin(this.kick * 0.5 + off) * 0.05;
      const swimFore = 0.12;
      arm.upper.rotation = idleUpper + (swimUpper - idleUpper) * moving;
      arm.fore.rotation = idleFore + (swimFore - idleFore) * moving;
    }
  }

  /**
   * Keep the diver out of rock and sand. We test points around a circle,
   * push away from any that are inside rock, and cancel the part of the
   * velocity going into the surface, so the diver slides along walls.
   */
  private collide(): void {
    const r = Diver.RADIUS;
    for (let iter = 0; iter < 8; iter++) {
      let nx = 0;
      let ny = 0;
      let hits = 0;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        if (isSolid(this.x + dx * r, this.y + dy * r * 0.8)) {
          nx -= dx;
          ny -= dy;
          hits++;
        }
      }
      if (!hits) break;
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      if (l < 0.01) ny = -1; // surrounded: float up
      this.x += nx * 2.5;
      this.y += ny * 2.5;
      const vn = this.vx * nx + this.vy * ny;
      if (vn < 0) {
        this.vx -= nx * vn;
        this.vy -= ny * vn;
      }
    }
    // The surface: the helmet can break it but no higher.
    if (this.y < 34) {
      this.y = 34;
      if (this.vy < 0) this.vy = 0;
    }
  }
}
