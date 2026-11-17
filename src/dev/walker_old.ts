import { Container, Graphics } from 'pixi.js';

/**
 * The explorer on foot (after milestone 8 part 2, Colin: dry interiors with
 * gravity, a character that can walk and jump, and a helmet face plate that
 * lifts with a short animation). Redrawn after the Corvina on foot to match
 * Colin's Crest diver boards (docs/art/kit2): a charcoal suit with gold
 * circuit etching, chrome collar and shoulder plates, twin oxygen tanks, a
 * hip thruster rig with lime nozzles, red gloves, short red-tipped fins, a
 * harpoon clipped across the back, and the neon lime crest helmet. All drawn
 * by code, every frame, from a few joint angles.
 *
 * (x, y) is the point between the boots; the figure stands about 92 units tall.
 */

const C = {
  suit: 0x26292b,
  suitLight: 0x3e4346,
  suitShade: 0x16181a,
  etch: 0xc9a13a,
  red: 0xb3302a,
  redShade: 0x6e1c18,
  chrome: 0x9aa6ad,
  chromeDark: 0x3a4248,
  chromeHi: 0xe6eef2,
  tank: 0x2e3438,
  tankHi: 0x5a646a,
  lime: 0xc6f03a,
  rubber: 0x1c1e1f,
  visor: 0xc6f03a,
  visorEdge: 0x7a9a12,
  skin: 0x9a7058,
  hair: 0x2a1e18,
  white: 0xd8dde0,
};

/** The walker as it was before character animation session B: kept only so the lab can measure before and after (animlab.html?walker&old). */
export type WalkPose = 'stand' | 'walk' | 'jump' | 'fall' | 'hang' | 'climb';

export class WalkerOld {
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
  /** Hand-over-hand progress on a ladder. */
  climbPhase = 0;
  working = 0;
  load = 0;
  lampOn = true;
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
    } else if (this.pose === 'climb') {
      // Hand over hand: the arms reach up in turn, knees lift.
      const c = Math.sin(this.climbPhase * Math.PI);
      aA = 2.5 + c * 0.35;
      eA = 2.9 + c * 0.2;
      aB = 2.5 - c * 0.35;
      eB = 2.9 - c * 0.2;
      lA = 0.5 + Math.max(0, c) * 0.5;
      kA = -0.3;
      lB = 0.5 + Math.max(0, -c) * 0.5;
      kB = -0.3;
    }
    // Back leg and arm first (darker), then the body, then the front ones.
    this.leg(-2, hipY, lB, kB, true);
    this.limb(-5, -74 + bob, aB, 17, eB, 16, 8, 7, C.suitShade, C.suitShade, C.redShade, 4.5);
    // Harpoon clipped across the back: white stock, chrome barrel, spear tip up behind the shoulder.
    g.moveTo(-24, -40 + bob).lineTo(4, -112 + bob).stroke({ color: C.chromeDark, width: 2 });
    g.poly([4, -112 + bob, 1, -104 + bob, 7, -105 + bob]).fill({ color: C.chromeHi });
    g.moveTo(-22, -46 + bob).lineTo(-10, -76 + bob).stroke({ color: C.white, width: 5, cap: 'round' });
    g.moveTo(-21, -47 + bob).lineTo(-11, -73 + bob).stroke({ color: 0x8e979c, width: 1.4 });
    // Twin oxygen tanks on the back: dark chrome with lime bands and valves on top.
    for (const [tx, sh] of [[-25, C.suitShade], [-19, C.tank]] as const) {
      g.roundRect(tx, -86 + bob, 9, 34, 4.5).fill({ color: sh });
      g.roundRect(tx + 1.5, -84 + bob, 2.2, 30, 1).fill({ color: C.tankHi, alpha: 0.7 });
      g.rect(tx + 5, -78 + bob, 2, 8).fill({ color: C.lime, alpha: 0.85 });
      g.rect(tx + 2.5, -90 + bob, 4, 5).fill({ color: C.chrome });
      g.rect(tx + 1, -92 + bob, 7, 2.2).fill({ color: C.chromeDark });
    }
    // Torso.
    g.roundRect(-12, -80 + bob, 25, 36, 8).fill({ color: C.suit });
    g.roundRect(-10, -78 + bob, 6, 30, 3).fill({ color: C.suitLight, alpha: 0.35 });
    // Gold circuit etching.
    g.moveTo(-8, -72 + bob).lineTo(-2, -72 + bob).lineTo(1, -67 + bob).lineTo(9, -67 + bob)
      .moveTo(-8, -60 + bob).lineTo(0, -60 + bob).lineTo(3, -56 + bob).lineTo(10, -56 + bob)
      .moveTo(4, -76 + bob).lineTo(4, -70 + bob)
      .stroke({ color: C.etch, width: 0.9, alpha: 0.85 });
    g.circle(9, -67 + bob, 1).fill({ color: C.etch }).circle(-8, -60 + bob, 1).fill({ color: C.etch });
    // Belt and the hip thruster rig: a white housing with a lime nozzle pointing back.
    g.rect(-12, -50 + bob, 25, 5).fill({ color: C.suitShade });
    g.rect(-1, -50 + bob, 5, 5).fill({ color: C.chrome });
    g.roundRect(-20, -54 + bob, 16, 11, 4).fill({ color: C.white });
    g.roundRect(-20, -54 + bob, 16, 3, 2).fill({ color: 0xffffff, alpha: 0.6 });
    g.rect(-14, -54 + bob, 2, 11).fill({ color: 0x8e979c });
    g.circle(-21, -48.5 + bob, 4.2).fill({ color: C.chromeDark });
    g.circle(-21, -48.5 + bob, 2.8).fill({ color: C.lime, alpha: 0.9 });
    // Chrome hose rebreather: corrugated hose from the tanks over the shoulder to the chest port.
    g.circle(9, -67 + bob, 4.5).fill({ color: C.chrome });
    g.circle(9, -67 + bob, 2).fill({ color: C.chromeDark });
    for (let k = 0; k < 7; k++) {
      const t = k / 6;
      g.circle(-12 + t * 21 + Math.sin(t * 9) * 2, -90 + bob + t * 22 - Math.sin(t * Math.PI) * 6, 2.5).stroke({ color: k % 2 ? C.chromeHi : C.chrome, width: 1.6 });
    }
    // Chrome collar yoke and shoulder plate.
    g.roundRect(-11, -84 + bob, 22, 7, 3).fill({ color: C.chrome });
    g.roundRect(-11, -84 + bob, 22, 2, 1).fill({ color: C.chromeHi, alpha: 0.7 });
    // Front leg and arm.
    this.leg(3, hipY, lA, kA, false);
    const hand = this.limb(4, -74 + bob, aA, 17, eA, 16, 8.5, 7.5, C.suit, C.suitLight, C.red, 5);
    g.ellipse(4, -75 + bob, 7, 5.5).fill({ color: C.chrome });
    g.ellipse(3, -77 + bob, 4, 2).fill({ color: C.chromeHi, alpha: 0.7 });
    // Head inside the helmet: hair, face in profile.
    const hx = 3;
    const hy = -94 + bob;
    g.circle(hx, hy, 8).fill({ color: C.skin });
    g.moveTo(hx - 8, hy - 1).arc(hx, hy, 8, Math.PI, -0.25).lineTo(hx + 2, hy - 2).closePath().fill({ color: C.hair });
    g.poly([hx + 7, hy - 1, hx + 10.5, hy + 2, hx + 7.5, hy + 3.5]).fill({ color: C.skin });
    g.circle(hx + 4.5, hy - 1, 1).fill({ color: 0x1a1410 });
    g.moveTo(hx + 4.5, hy + 4.5).lineTo(hx + 7.5, hy + 4).stroke({ color: 0x5a3a30, width: 0.8 });
    // The helmet shell (back half) in neon lime, and the tall swept crest fin.
    g.moveTo(hx - 13, hy + 7).arc(hx, hy, 13.5, Math.PI * 0.72, Math.PI * 1.62).stroke({ color: C.visor, width: 4.5 });
    g.moveTo(hx - 13, hy + 7).arc(hx, hy, 13.5, Math.PI * 0.72, Math.PI * 1.62).stroke({ color: C.visorEdge, width: 1.2 });
    // Swept crest fin: rises from the brow and sweeps back past the helmet, like the concept's.
    g.moveTo(hx + 7, hy - 11)
      .quadraticCurveTo(hx + 2, hy - 22, hx - 15, hy - 26)
      .quadraticCurveTo(hx - 10, hy - 18, hx - 13, hy - 5)
      .quadraticCurveTo(hx - 4, hy - 14, hx + 7, hy - 11)
      .closePath()
      .fill({ color: C.visor, alpha: 0.9 })
      .stroke({ color: C.visorEdge, width: 1 });
    g.moveTo(hx + 3, hy - 15).quadraticCurveTo(hx - 3, hy - 21, hx - 11, hy - 23).stroke({ color: 0xf4ffd0, width: 1.2, alpha: 0.6 });
    // The chrome rebreather ring around the jaw.
    g.ellipse(hx + 6, hy + 8, 6, 4).fill({ color: C.chrome }).ellipse(hx + 7, hy + 8, 2.6, 1.8).fill({ color: C.chromeDark });
    // The face plate: lime glass hinged at the top of the helmet. It lifts up and back.
    const ang = -this.visor * 1.05;
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
    g.poly(rot).fill({ color: C.visor, alpha: 0.32 - this.visor * 0.14 });
    g.poly(rot).stroke({ color: C.visorEdge, width: 1.4, alpha: 0.9 });
    // Lamp on the helmet's side.
    g.circle(hx + 12, hy + 3, 3).fill({ color: C.chromeDark });
    const l = this.lens.clear();
    const wx = this.x + this.face * (hx + 12);
    const wy = this.y + hy + 3;
    l.circle(wx, wy, 2.2).fill({ color: 0xfff6d8 });
    // The thruster nozzle and the tank bands glow faintly (unlit layer).
    l.circle(this.x + this.face * -21, this.y - 48.5 + bob, 2.2).fill({ color: 0xe6ff80, alpha: 0.8 });
    void hand;
  }

  /** A leg: charcoal with a chrome knee, ending in a short fin with a red tip. */
  private leg(x0: number, y0: number, a0: number, a1: number, back: boolean): void {
    const g = this.g;
    const end = this.limb(x0, y0, a0, 23, a1, 23, 11, 10, back ? C.suitShade : C.suit, back ? C.suitShade : C.suitLight, C.rubber, 5.5);
    const kx = x0 + Math.sin(a0) * 23;
    const ky = y0 + Math.cos(a0) * 23;
    g.circle(kx, ky, 4.5).fill({ color: back ? C.chromeDark : C.chrome });
    // Short fin lying forward along the floor, red at the tip.
    const fx = end.x;
    const fy = end.y + 3;
    const tilt = this.pose === 'stand' || this.pose === 'walk' ? 0 : 0.5;
    const c = Math.cos(tilt);
    const sn = Math.sin(tilt);
    const P = (u: number, v: number) => [fx + u * c - v * sn, fy + u * sn + v * c];
    g.poly([...P(-5, -4), ...P(14, -3), ...P(18, 0), ...P(14, 2), ...P(-5, 2)]).fill({ color: back ? 0x141516 : C.rubber });
    g.poly([...P(9, -3.2), ...P(14, -3), ...P(18, 0), ...P(14, 2), ...P(9, 2)]).fill({ color: back ? C.redShade : C.red });
  }
}
