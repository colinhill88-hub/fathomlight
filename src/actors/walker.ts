import { Container, Graphics } from 'pixi.js';

/**
 * The explorer on foot (after milestone 8 part 2, Colin: dry interiors with
 * gravity, a character that can walk and jump, and a helmet face plate that
 * lifts with a short animation). The same suit as the swimmer: charcoal with
 * brass etched lines, grey sleeves, rust-red gloves, boots and belt, a chrome
 * collar and rebreather with its raised cowl, and the lime-glass helmet with
 * one crest fin. All drawn by code, every frame, from a few joint angles.
 *
 * (x, y) is the point between the boots; the figure stands about 92 units tall.
 */

const C = {
  suit: 0x2c302f,
  suitLight: 0x4a504d,
  suitShade: 0x1a1d1d,
  etch: 0xb39a4e,
  sleeve: 0x8b918f,
  sleeveShade: 0x5f6563,
  red: 0xa8402e,
  redShade: 0x6e2a1f,
  chrome: 0x6d7f9a,
  chromeDark: 0x2c3647,
  chromeHi: 0xd6e0ee,
  rubber: 0x232524,
  visor: 0xb6e23a,
  visorEdge: 0x6f8f16,
  skin: 0x9a7058,
  hair: 0x3a2a20,
};

export type WalkPose = 'stand' | 'walk' | 'jump' | 'fall' | 'hang';

export class Walker {
  readonly view = new Container();
  /** The helmet lamp lens and the visor glint, drawn unlit. */
  readonly lens = new Graphics();
  private g = new Graphics();
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
  private phase = 0;
  private time = 0;
  /** Where the grapple line pulls from (the raised hand), set while hanging. */
  hangTo: { x: number; y: number } | null = null;

  constructor() {
    this.view.addChild(this.g);
  }

  /** The helmet's centre, for the lamp and the grapple line. */
  head(): { x: number; y: number } {
    return { x: this.x + this.face * 3, y: this.y - 82 };
  }
  hand(): { x: number; y: number } {
    return { x: this.x + this.face * 6, y: this.y - 108 };
  }

  animate(dt: number): void {
    this.time += dt;
    const speed = Math.abs(this.vx);
    if (this.pose === 'walk') this.phase += dt * (4 + speed * 0.028);
    else this.phase += (Math.round(this.phase / Math.PI) * Math.PI - this.phase) * Math.min(1, dt * 10);
    this.visor += (this.visorTarget - this.visor) * Math.min(1, dt * 4);
    if (Math.abs(this.visorTarget - this.visor) < 0.005) this.visor = this.visorTarget;
    this.draw();
  }

  private limb(x0: number, y0: number, a0: number, l0: number, a1: number, l1: number, w0: number, w1: number, c0: number, c1: number, end: number, endR: number): { x: number; y: number } {
    const g = this.g;
    const kx = x0 + Math.sin(a0) * l0;
    const ky = y0 + Math.cos(a0) * l0;
    const ex = kx + Math.sin(a1) * l1;
    const ey = ky + Math.cos(a1) * l1;
    g.moveTo(x0, y0).lineTo(kx, ky).stroke({ color: c0, width: w0, cap: 'round' });
    g.moveTo(kx, ky).lineTo(ex, ey).stroke({ color: c1, width: w1, cap: 'round' });
    g.circle(ex, ey, endR).fill({ color: end });
    return { x: ex, y: ey };
  }

  private draw(): void {
    const g = this.g.clear();
    this.view.position.set(this.x, this.y);
    this.view.scale.x = this.face;
    const s = Math.sin(this.phase);
    const bob = this.pose === 'walk' ? Math.abs(Math.cos(this.phase)) * -3 : this.pose === 'stand' ? Math.sin(this.time * 2) * 0.8 : 0;
    const hipY = -46 + bob;
    // Leg and arm angles (radians from straight down; positive swings forward).
    let lA = 0;
    let lB = 0;
    let kA = 0;
    let kB = 0;
    let aA = 0.15;
    let aB = -0.1;
    let eA = -0.35;
    let eB = -0.35;
    if (this.pose === 'walk') {
      lA = s * 0.55;
      lB = -s * 0.55;
      kA = lA - Math.max(0, -s) * 0.9;
      kB = lB - Math.max(0, s) * 0.9;
      aA = -s * 0.5;
      aB = s * 0.5;
    } else if (this.pose === 'jump') {
      lA = 0.6;
      kA = -0.3;
      lB = -0.15;
      kB = -0.9;
      aA = 2.4;
      eA = 2.6;
      aB = -0.6;
    } else if (this.pose === 'fall') {
      lA = 0.35;
      kA = 0.1;
      lB = -0.35;
      kB = -0.5;
      aA = 1.6;
      aB = -1.3;
      eA = 1.9;
      eB = -1.6;
    } else if (this.pose === 'hang') {
      lA = 0.2 + Math.sin(this.time * 3) * 0.1;
      kA = -0.3;
      lB = -0.1;
      kB = -0.6;
      aA = Math.PI - 0.1;
      eA = Math.PI - 0.05;
      aB = 0.6;
    }
    // Back leg and arm first (darker), then the body, then the front ones.
    this.limb(-2, hipY, lB, 23, kB, 23, 11, 10, C.suitShade, C.suitShade, C.rubber, 6.5);
    this.limb(-5, -74 + bob, aB, 17, eB, 16, 8, 7, C.sleeveShade, C.sleeveShade, C.redShade, 4.5);
    // Rebreather on the back, sweeping up into the cowl behind the helmet.
    g.roundRect(-20, -82 + bob, 12, 30, 5).fill({ color: C.chrome });
    g.roundRect(-18, -80 + bob, 3, 26, 1.5).fill({ color: C.chromeHi, alpha: 0.5 });
    g.poly([-20, -80 + bob, -14, -98 + bob, -6, -94 + bob, -10, -78 + bob]).fill({ color: C.chromeDark });
    // Torso.
    g.roundRect(-12, -80 + bob, 25, 36, 8).fill({ color: C.suit });
    g.moveTo(-9, -70 + bob).lineTo(9, -70 + bob).moveTo(-8, -60 + bob).lineTo(10, -60 + bob).stroke({ color: C.etch, width: 0.8, alpha: 0.7 });
    g.rect(-12, -50 + bob, 25, 5).fill({ color: C.red });
    g.rect(-1, -50 + bob, 5, 5).fill({ color: C.etch });
    // Chest regulator port and the coiled hose over the shoulder.
    g.circle(8, -68 + bob, 4.5).fill({ color: C.chrome });
    g.circle(8, -68 + bob, 2).fill({ color: C.chromeDark });
    for (let k = 0; k < 6; k++) {
      const t = k / 5;
      g.circle(-12 + t * 20 + Math.sin(t * 9) * 2, -90 + bob + t * 22 - Math.sin(t * Math.PI) * 6, 2.4).stroke({ color: C.rubber, width: 1.6 });
    }
    // Chrome collar yoke.
    g.roundRect(-11, -84 + bob, 22, 7, 3).fill({ color: C.chrome });
    g.roundRect(-11, -84 + bob, 22, 2, 1).fill({ color: C.chromeHi, alpha: 0.6 });
    // Front leg and arm.
    this.limb(3, hipY, lA, 23, kA, 23, 11, 10, C.suit, C.suitLight, C.rubber, 6.5);
    const hand = this.limb(4, -74 + bob, aA, 17, eA, 16, 8, 7, C.sleeve, C.sleeve, C.red, 4.5);
    // Head inside the helmet: hair, face in profile.
    const hx = 3;
    const hy = -94 + bob;
    g.circle(hx, hy, 8).fill({ color: C.skin });
    g.moveTo(hx - 8, hy - 1).arc(hx, hy, 8, Math.PI, -0.25).lineTo(hx + 2, hy - 2).closePath().fill({ color: C.hair });
    g.poly([hx + 7, hy - 1, hx + 10.5, hy + 2, hx + 7.5, hy + 3.5]).fill({ color: C.skin });
    g.circle(hx + 4.5, hy - 1, 1).fill({ color: 0x1a1410 });
    g.moveTo(hx + 4.5, hy + 4.5).lineTo(hx + 7.5, hy + 4).stroke({ color: 0x5a3a30, width: 0.8 });
    // The helmet shell (back half) and crest fin.
    g.moveTo(hx - 13, hy + 6).arc(hx, hy, 13.5, Math.PI * 0.75, Math.PI * 1.6).stroke({ color: C.visorEdge, width: 2.4 });
    g.poly([hx - 9, hy - 9, hx + 3, hy - 15, hx + 9, hy - 12, hx - 4, hy - 17]).fill({ color: C.visor, alpha: 0.75 });
    // The face plate: tinted lime glass hinged at the top of the helmet. It lifts up and back.
    const ang = -this.visor * 1.7;
    const pts: number[] = [];
    for (let k = 0; k <= 10; k++) {
      const a = -Math.PI * 0.45 + (k / 10) * Math.PI * 0.95;
      pts.push(Math.cos(a) * 13.5, Math.sin(a) * 13.5);
    }
    const hinge = { x: hx - 2, y: hy - 13 };
    const rot: number[] = [];
    for (let k = 0; k < pts.length; k += 2) {
      const px = pts[k] + hx - hinge.x;
      const py = pts[k + 1] + hy - hinge.y;
      rot.push(hinge.x + px * Math.cos(ang) - py * Math.sin(ang), hinge.y + px * Math.sin(ang) + py * Math.cos(ang));
    }
    g.poly(rot).fill({ color: C.visor, alpha: 0.38 });
    g.poly(rot).stroke({ color: C.visorEdge, width: 1.4, alpha: 0.9 });
    // Lamp on the helmet's side.
    g.circle(hx + 12, hy + 4, 3).fill({ color: C.chromeDark });
    const l = this.lens.clear();
    const wx = this.x + this.face * (hx + 12);
    const wy = this.y + hy + 4;
    l.circle(wx, wy, 2.2).fill({ color: 0xfff6d8 });
    void hand;
  }
}
