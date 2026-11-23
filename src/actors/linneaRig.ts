import { Container, FillGradient, Graphics, Sprite } from 'pixi.js';
import { getCreatureArt } from '../art/creatureArt';
import { approach, batchAll, clamp } from './animkit';

/**
 * Phase 18: Linnea, the axolotl guide (Colin's daughter's idea and name).
 *
 * Drawn in code like the Phase 10 creatures: layered painted shapes, a soft
 * gradient skin, jointed gills and legs. She is soft coral and peach with warm,
 * frilly gills; never hot pink and never the Choir's cyan, violet or magenta.
 *
 * The rig faces right (+x), y grows downwards, and the origin is the middle of
 * her body. The body and tail are re-drawn along a swaying spine each frame
 * (she is one creature, so that is cheap); the head, gills and legs are joints.
 *
 * Personality, all driven by `LinneaPose`:
 *  - she blinks every few seconds (a soft lid closes over her small dark eye),
 *  - her gills flutter all the time and fan out when she talks or is happy,
 *  - she bobs while she talks, and her mouth opens a little with each chirp,
 *  - she tilts her head curiously as Kestrel comes close,
 *  - a little tail wiggle of delight when Kestrel arrives.
 */

export const LINNEA_COLORS = {
  /** Back and upper flanks: warm coral-peach. */
  back: 0xcc735f,
  /** Mid flank: soft peach. */
  skin: 0xdc917a,
  /** Belly and throat: pale cream-peach. */
  belly: 0xe9b39b,
  /** Fins: translucent peach. */
  fin: 0xdfa08a,
  /** Gill stalks: deeper warm coral. */
  rachis: 0xbc5c4c,
  /** Gill frills: coral, lighter at the tips. */
  frill: 0xd7705c,
  frillTip: 0xeca085,
  /** Cheek blush and freckles. */
  blush: 0xd96a5c,
  freckle: 0xb8774f,
  eye: 0x2a1d24,
  outline: 0xb8655a,
} as const;

export interface LinneaPose {
  dt: number;
  time: number;
  /** 0..1 how close Kestrel is (1 = right beside her). Drives the curious tilt. */
  near: number;
  /** 0..1 while she is talking (bob, gills fanned). */
  talk: number;
  /** 0..1 how open her mouth is (follows the chirps). */
  mouth: number;
  /** 1 facing right, -1 facing left. */
  face: number;
  /** World swim speed, for the paddling legs and tail. */
  speed: number;
}

const C = LINNEA_COLORS;
const N = 16;
/** Spine x from the neck (s = 0) back to the tail tip (s = 1). */
const NECK_X = 14;
const TAIL_X = -74;

let skinGradient: FillGradient | null = null;
function skin(): FillGradient {
  skinGradient ??= new FillGradient({
    type: 'linear',
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
    colorStops: [
      { offset: 0, color: C.back },
      { offset: 0.42, color: C.skin },
      { offset: 0.78, color: C.belly },
      { offset: 1, color: 0xe2a68e },
    ],
  });
  return skinGradient;
}

/** One soft feathery lobe from (x, y) pointing at angle a. */
function petal(g: Graphics, x: number, y: number, a: number, len: number, w: number, color: number, alpha: number): void {
  const cx = Math.cos(a);
  const sy = Math.sin(a);
  const nx = -sy * w;
  const ny = cx * w;
  const tx = x + cx * len;
  const ty = y + sy * len;
  g.moveTo(x, y)
    .bezierCurveTo(x + cx * len * 0.35 + nx, y + sy * len * 0.35 + ny, tx + nx * 0.5, ty + ny * 0.5, tx, ty)
    .bezierCurveTo(tx - nx * 0.5, ty - ny * 0.5, x + cx * len * 0.35 - nx, y + sy * len * 0.35 - ny, x, y)
    .fill({ color, alpha });
}

interface Gill {
  root: Container;
  tip: Container;
  base: number;
  phase: number;
  far: boolean;
}

interface Leg {
  hip: Container;
  knee: Container;
  base: number;
  phase: number;
  far: boolean;
}

export class LinneaRig {
  readonly view = new Container();
  /** A soft warm halo around her gills, for the glow layer. Kept in step by the caller. */
  readonly halo = new Graphics();
  /** Where the head is in rig units (for the halo and a speech anchor). */
  readonly headPoint = { x: 0, y: 0 };

  private readonly farLegs = new Container();
  private readonly farGills = new Container();
  private readonly body = new Graphics();
  private readonly fins = new Graphics();
  private readonly marks = new Graphics();
  private readonly head = new Container();
  private readonly mouthG = new Graphics();
  private readonly lid = new Graphics();
  private readonly nearLegs = new Container();
  private readonly nearGills = new Container();
  private readonly gills: Gill[] = [];
  private readonly legs: Leg[] = [];
  private readonly spineY = new Float32Array(N);
  private readonly spineX = new Float32Array(N);
  private readonly freckles: { s: number; v: number; r: number }[] = [];

  private phase = 0;
  private blinkTimer = 2.2;
  private blink = 0;
  private tilt = 0;
  private tiltWobble = 0;
  private fan = 0;
  private bob = 0;
  private wiggle = 0;
  private lastNear = 0;
  private turn = 1;
  private paddle = 0;
  private randState: number;

  constructor(seed = 7) {
    this.randState = seed * 2654435761 >>> 0;
    for (let i = 0; i < N; i++) this.spineX[i] = NECK_X + (TAIL_X - NECK_X) * (i / (N - 1));
    for (let i = 0; i < 22; i++) this.freckles.push({ s: 0.04 + this.rand() * 0.62, v: -0.85 + this.rand() * 1.1, r: 0.55 + this.rand() * 0.75 });

    this.buildLegs();
    this.buildHead();
    this.buildGills();
    // The near gills sit over the head's back; the far gills peek out behind it.
    this.view.addChild(this.farLegs, this.fins, this.body, this.marks, this.head, this.nearLegs);
    this.head.addChildAt(this.farGills, 0);
    this.head.addChild(this.nearGills);
    // Faint: it only shows in dim water (it adds to Kestrel's lamp, so it must not wash her out).
    this.halo.ellipse(0, 0, 34, 26).fill({ color: 0xffb48c, alpha: 0.14 });
    this.halo.ellipse(0, 0, 18, 14).fill({ color: 0xffc9a4, alpha: 0.1 });
    batchAll(this.view);
    this.update({ dt: 0, time: 0, near: 0, talk: 0, mouth: 0, face: 1, speed: 0 });
  }

  private rand(): number {
    this.randState = (this.randState * 1664525 + 1013904223) >>> 0;
    return this.randState / 4294967296;
  }

  private buildHead(): void {
    const h = new Graphics();
    // A broad, rounded head with a blunt snout, wider than the neck.
    h.moveTo(-6, -10.5)
      .bezierCurveTo(1, -16.5, 18, -17, 26, -10.5)
      .bezierCurveTo(31.5, -6, 32.5, 2, 28.5, 6.5)
      .bezierCurveTo(22, 12.5, 6, 13.5, -6, 11.5)
      .closePath()
      .fill(skin());
    // Soft top light along the crown, and the pale throat.
    h.moveTo(-2, -12).bezierCurveTo(6, -16, 17, -16, 24, -11.5).bezierCurveTo(16, -13, 6, -12.5, -2, -12).fill({ color: 0xeaae96, alpha: 0.7 });
    h.moveTo(2, 9).bezierCurveTo(10, 12, 20, 10.5, 27, 6.5).bezierCurveTo(20, 8.5, 10, 9.5, 2, 9).fill({ color: 0xf0c3ae, alpha: 0.6 });
    // A faint rim of warm shadow under the jaw.
    h.moveTo(28.5, 6.5).bezierCurveTo(22, 12.5, 6, 13.5, -6, 11.5).stroke({ color: C.outline, width: 1.1, alpha: 0.35, cap: 'round' });
    // Cheek blush.
    h.ellipse(21.5, 3.2, 4.8, 2.6).fill({ color: C.blush, alpha: 0.38 });
    h.ellipse(21.5, 3.2, 2.8, 1.5).fill({ color: C.blush, alpha: 0.28 });
    // Nostril, and a few freckles on the crown.
    h.circle(29.4, -4.6, 0.7).fill({ color: C.outline, alpha: 0.55 });
    for (const [x, y, r] of [[8, -12.5, 0.8], [12, -14, 0.6], [15, -11.8, 0.7], [5, -9.6, 0.55], [18.5, -13.6, 0.5]] as const) {
      h.circle(x, y, r).fill({ color: C.freckle, alpha: 0.5 });
    }
    // The eye: small, dark and friendly, in a soft peach socket, with two catchlights.
    h.ellipse(20.8, -6.2, 4.3, 3.9).fill({ color: 0xe8b09a, alpha: 0.9 });
    h.circle(21, -6.2, 3.1).fill(C.eye);
    h.circle(21.2, -6.3, 2.2).fill({ color: 0x3e2a30, alpha: 0.7 });
    h.circle(22.2, -7.5, 1.05).fill(0xfff4e8);
    h.circle(19.9, -5.0, 0.5).fill({ color: 0xfff4e8, alpha: 0.75 });
    const painted = getCreatureArt().linnea;
    let headNode: Container = h;
    if (painted) {
      const sp = new Sprite(painted);
      sp.anchor.set(0.5, 0.5);
      sp.position.set(13, -2);
      sp.width = 41;
      sp.height = 31;
      headNode = sp;
    }
    this.head.addChild(headNode, this.mouthG, this.lid);
    this.head.position.set(NECK_X - 3, 0);
    // A big friendly head, as axolotls have.
    this.head.scale.set(1.14);
  }

  /** The eyelid (closes from above) and the smiling mouth, re-drawn as they move. */
  private drawFace(mouth: number): void {
    const l = this.lid;
    l.clear();
    if (this.blink > 0.02) {
      const b = this.blink;
      // Lid comes down from the top of the socket.
      l.moveTo(16.6, -6.4)
        .bezierCurveTo(17.5, -11, 24.5, -11, 25.2, -6.4)
        .bezierCurveTo(24.5, -6.4 + 7.2 * b - 3.6, 17.5, -6.4 + 7.2 * b - 3.6, 16.6, -6.4)
        .fill(0xd99179);
      l.moveTo(17.2, -6.4 + 4.2 * b - 1.6).quadraticCurveTo(21, -6.4 + 5.6 * b - 1.4, 24.6, -6.4 + 4.2 * b - 1.6)
        .stroke({ color: C.outline, width: 0.8, alpha: 0.55 * b, cap: 'round' });
    }
    const m = this.mouthG;
    m.clear();
    const open = clamp(mouth, 0, 1) * 3.2;
    // The classic gentle axolotl smile: wide, upturned at the corner.
    if (open > 0.15) {
      m.moveTo(30.6, 1.6).quadraticCurveTo(24, 5.2 + open * 0.4, 15.6, 3.2)
        .quadraticCurveTo(23, 6.4 + open * 1.4, 30.4, 1.6 + open * 0.55)
        .fill({ color: 0x7a3c3e, alpha: 0.85 });
      m.moveTo(28, 2.6 + open * 0.35).quadraticCurveTo(23.5, 4.8 + open, 19, 4.2 + open * 0.4)
        .stroke({ color: 0xe48a86, width: 1.2, alpha: 0.6, cap: 'round' });
    }
    m.moveTo(30.8, 1.4).quadraticCurveTo(24, 5.4, 15.4, 3.1).quadraticCurveTo(14.2, 2.8, 13.9, 1.6)
      .stroke({ color: 0x8c4a46, width: 1.15, alpha: 0.85, cap: 'round' });
  }

  private buildGills(): void {
    // Three on each side, sprouting from behind the head and sweeping back:
    // the top one up and back, the middle one back, the low one back and down.
    const specs = [
      { x: -1, y: -11, a: -2.02, len: 25 },
      { x: -3.5, y: -5.5, a: -2.62, len: 23 },
      { x: -3, y: 0.5, a: 2.9, len: 18 },
    ];
    for (const far of [true, false]) {
      specs.forEach((s, i) => {
        const root = new Container();
        root.position.set(s.x + (far ? 3.5 : 0), s.y - (far ? 1.5 : 0));
        const tip = new Container();
        tip.x = s.len * 0.52;
        const len = s.len * (far ? 0.9 : 1);
        const inner = new Graphics();
        const outer = new Graphics();
        const frill = far ? 0xb0604f : C.frill;
        const tipC = far ? 0xc98670 : C.frillTip;
        const rach = far ? 0x9e4e42 : C.rachis;
        // The stalk (rachis), tapering from root to tip, split into two joints.
        const half = len * 0.52;
        inner.moveTo(0, -1.7).quadraticCurveTo(half * 0.5, -1.4, half + 0.5, -1).lineTo(half + 0.5, 1)
          .quadraticCurveTo(half * 0.5, 1.4, 0, 1.7).closePath().fill(rach);
        outer.moveTo(-0.5, -1).quadraticCurveTo((len - half) * 0.5, -0.8, len - half, 0)
          .quadraticCurveTo((len - half) * 0.5, 0.8, -0.5, 1).closePath().fill(rach);
        // Feathery frills along both sides, angled towards the tip, darker
        // underneath and lighter on top; they grow longer towards the middle.
        const frills = (g: Graphics, from: number, to: number, x0: number) => {
          const count = Math.max(2, Math.round((to - from) / 2.2));
          for (let k = 0; k < count; k++) {
            const u = from + ((to - from) * (k + 0.5)) / count;
            const along = u / len;
            const flen = (3.6 + Math.sin(Math.min(1, along * 1.25) * Math.PI) * 4.2) * (i === 2 ? 0.85 : 1);
            const x = u - x0;
            for (const side of [-1, 1]) {
              const a = side * (0.95 - along * 0.3);
              // Soft rounded lobes: a fuller coral one, a paler one on top, a bright tip.
              petal(g, x, side * 0.8, a, flen, 1.9, frill, 0.95);
              petal(g, x + 0.3, side * 1, a * 0.9, flen * 0.7, 1.2, tipC, far ? 0.75 : 0.9);
              const ex = x + Math.cos(a) * flen * 0.92;
              const ey = side * 0.8 + Math.sin(a) * flen * 0.92;
              g.circle(ex, ey, 0.85).fill({ color: tipC, alpha: far ? 0.8 : 1 });
            }
          }
        };
        frills(inner, 1.5, half, 0);
        frills(outer, half, len - 0.8, half);
        // A tiny round tuft at the end.
        outer.circle(len - half, 0, 1.7).fill(tipC);
        root.addChild(inner, tip);
        tip.addChild(outer);
        root.rotation = s.a;
        (far ? this.farGills : this.nearGills).addChild(root);
        this.gills.push({ root, tip, base: s.a, phase: i * 1.7 + (far ? 0.9 : 0), far });
      });
    }
  }

  private buildLegs(): void {
    // Short soft legs with little splayed fingers: four on the front feet, five on the back.
    const specs = [
      { x: 6, fingers: 4, base: 0.55 },
      { x: -27, fingers: 5, base: 0.75 },
    ];
    for (const far of [true, false]) {
      specs.forEach((s, i) => {
        const hip = new Container();
        hip.position.set(s.x + (far ? 3 : 0), far ? 6 : 8);
        const knee = new Container();
        knee.position.set(0, 7.5);
        const col = far ? 0xb7735f : C.skin;
        const toe = far ? 0xb06d5a : 0xe6a890;
        hip.addChild(new Graphics().moveTo(-3, -2).quadraticCurveTo(-3.6, 4, -1.8, 8).lineTo(2, 8).quadraticCurveTo(3.6, 3, 3, -2).closePath().fill(col)
          .moveTo(-1.2, 0).quadraticCurveTo(-1.6, 4, -0.6, 7).stroke({ color: 0xedb9a2, width: 0.9, alpha: far ? 0.2 : 0.45, cap: 'round' }));
        const hand = new Graphics().moveTo(-2, -0.5).quadraticCurveTo(-2.4, 3.5, 0, 5).quadraticCurveTo(2.4, 3.5, 2, -0.5).closePath().fill(col);
        for (let f = 0; f < s.fingers; f++) {
          const a = Math.PI * 0.5 + (f / (s.fingers - 1) - 0.5) * 1.5;
          const fx = Math.cos(a) * 2;
          const fy = 4 + Math.sin(a) * 1.2;
          hand.moveTo(fx, fy).lineTo(fx + Math.cos(a) * 3.2, fy + Math.sin(a) * 3.2)
            .stroke({ color: toe, width: 1.25, cap: 'round' });
          hand.circle(fx + Math.cos(a) * 3.3, fy + Math.sin(a) * 3.3, 0.75).fill(toe);
        }
        knee.addChild(hand);
        hip.addChild(knee);
        (far ? this.farLegs : this.nearLegs).addChild(hip);
        this.legs.push({ hip, knee, base: s.base, phase: i * Math.PI + (far ? Math.PI * 0.5 : 0), far });
      });
    }
  }

  /** Half thickness above the spine, below it, and the fin heights, at s (0 neck .. 1 tail tip). */
  private profile(s: number): { top: number; bottom: number; dorsal: number; ventral: number } {
    const torso = s < 0.4 ? 11.4 + Math.sin((s / 0.4) * Math.PI) * 1.8 : 11.4 * (1 - (s - 0.4) / 0.6) ** 1.25 + 0.5;
    const dorsal = s < 0.16 ? 0 : s < 0.62 ? 7.2 * Math.sin(((s - 0.16) / 0.46) * Math.PI * 0.5) : 7.2 - (s - 0.62) * 9;
    const ventral = s < 0.5 ? 0 : s < 0.75 ? 5.4 * Math.sin(((s - 0.5) / 0.25) * Math.PI * 0.5) : 5.4 - (s - 0.75) * 12;
    return { top: torso * 0.88, bottom: torso * 1.12, dorsal: Math.max(0, dorsal), ventral: Math.max(0, ventral) };
  }

  private drawBody(): void {
    const b = this.body;
    const f = this.fins;
    const mk = this.marks;
    b.clear();
    f.clear();
    mk.clear();
    const X = this.spineX;
    const Y = this.spineY;
    const top: number[] = [];
    const bot: number[] = [];
    const finTop: number[] = [];
    const finBot: number[] = [];
    for (let i = 0; i < N; i++) {
      const p = this.profile(i / (N - 1));
      top.push(Y[i] - p.top);
      bot.push(Y[i] + p.bottom);
      finTop.push(Y[i] - p.top - p.dorsal);
      finBot.push(Y[i] + p.bottom + p.ventral);
    }
    // A smooth closed outline through the midpoints of a run of points.
    const smooth = (g: Graphics, xs: ArrayLike<number>, ys: number[], from: number, to: number, step: number) => {
      for (let i = from; i !== to; i += step) {
        const j = i + step;
        g.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[j]) / 2, (ys[i] + ys[j]) / 2);
      }
    };
    // Fins first, behind the body: soft translucent peach with fine rays.
    // The fins meet in a soft rounded point past the end of the tail.
    const tipX = X[N - 1] - 9;
    const tipY = Y[N - 1] + (Y[N - 1] - Y[N - 2]) * 1.5;
    f.moveTo(X[1], top[1] + 1);
    smooth(f, X, finTop, 1, N - 2, 1);
    f.quadraticCurveTo(X[N - 1], finTop[N - 1], tipX, tipY);
    f.quadraticCurveTo(X[N - 1], finBot[N - 1], X[N - 2], finBot[N - 2]);
    smooth(f, X, finBot, N - 2, 7, -1);
    f.lineTo(X[7], Y[7]);
    f.closePath().fill({ color: C.fin, alpha: 0.82 });
    f.moveTo(X[2], top[2]);
    smooth(f, X, finTop, 2, N - 1, 1);
    f.stroke({ color: 0xeebba5, width: 1, alpha: 0.55, cap: 'round' });
    for (let i = 3; i < N - 1; i += 1) {
      f.moveTo(X[i], top[i] + 0.5).lineTo(X[i] - 2.2, finTop[i] + 1.2).stroke({ color: 0xc98670, width: 0.6, alpha: 0.4 });
      if (finBot[i] - bot[i] > 1.2) f.moveTo(X[i], bot[i] - 0.5).lineTo(X[i] - 2.2, finBot[i] - 1.2).stroke({ color: 0xc98670, width: 0.6, alpha: 0.35 });
    }
    // The body: neck to tail tip along the top, back along the belly.
    b.moveTo(X[0] + 3, top[0] - 0.5);
    b.lineTo(X[0], top[0]);
    smooth(b, X, top, 0, N - 1, 1);
    b.quadraticCurveTo(X[N - 1] - 2.5, Y[N - 1], X[N - 1], bot[N - 1]);
    smooth(b, X, bot, N - 1, 0, -1);
    b.lineTo(X[0] + 3, bot[0] + 0.5);
    b.closePath().fill(skin());
    // A soft highlight along the back, and the pale belly band.
    b.moveTo(X[1], top[1] + 2.2);
    for (let i = 1; i < 10; i++) b.lineTo(X[i], top[i] + 2.2 + i * 0.05);
    b.stroke({ color: 0xeab29b, width: 2.2, alpha: 0.45, cap: 'round' });
    b.moveTo(X[0], bot[0] - 2.5);
    for (let i = 1; i < 9; i++) b.lineTo(X[i], bot[i] - 2.4 + i * 0.12);
    b.stroke({ color: 0xf0c4ae, width: 2.6, alpha: 0.5, cap: 'round' });
    // Costal grooves: the faint vertical folds along an axolotl's flank.
    for (let i = 2; i < 8; i++) {
      const x = (X[i] + X[i + 1]) / 2;
      const yt = (top[i] + top[i + 1]) / 2 + 3.5;
      const yb = (bot[i] + bot[i + 1]) / 2 - 3.8;
      mk.moveTo(x + 0.6, yt).quadraticCurveTo(x - 0.8, (yt + yb) / 2, x + 0.4, yb).stroke({ color: C.outline, width: 0.8, alpha: 0.22, cap: 'round' });
    }
    // Golden freckles scattered over the back and flanks.
    for (const fr of this.freckles) {
      const fi = fr.s * (N - 1);
      const i = Math.min(N - 2, Math.floor(fi));
      const t = fi - i;
      const x = X[i] + (X[i + 1] - X[i]) * t;
      const yt = top[i] + (top[i + 1] - top[i]) * t;
      const yb = bot[i] + (bot[i + 1] - bot[i]) * t;
      const y = (yt + yb) / 2 + (fr.v * (yb - yt)) / 2;
      mk.circle(x, y, fr.r).fill({ color: C.freckle, alpha: 0.42 });
    }
    // A warm shadow line under the belly to set her in the water.
    b.moveTo(X[0], bot[0]);
    smooth(b, X, bot, 0, 9, 1);
    b.stroke({ color: C.outline, width: 1, alpha: 0.28, cap: 'round' });
  }

  update(p: LinneaPose): void {
    const dt = Math.min(p.dt, 1 / 20);
    const t = p.time;
    // Arriving: a little wiggle of delight when Kestrel first comes close.
    if (p.near > 0.55 && this.lastNear <= 0.55) this.wiggle = 1;
    this.lastNear = p.near;
    this.wiggle = Math.max(0, this.wiggle - dt * 0.9);
    this.paddle = approach(this.paddle, clamp(p.speed / 60, 0, 1), 3, dt);
    this.phase += dt * (0.55 + this.paddle * 1.4 + this.wiggle * 2.2);

    // Blink: a soft close and open every few seconds (sometimes a double blink).
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = this.rand() < 0.2 ? 0.32 : 2.4 + this.rand() * 3.6;
    }
    const closing = this.blinkTimer < 0.16 ? 1 : 0;
    this.blink = approach(this.blink, closing, closing ? 40 : 18, dt);

    // Curious tilt: chin up and the head cocked as Kestrel comes close, with a slow wobble.
    this.tiltWobble += dt * (0.7 + p.near * 0.5);
    const tiltTarget = -p.near * 0.24 + Math.sin(this.tiltWobble) * (0.035 + p.near * 0.07);
    this.tilt = approach(this.tilt, tiltTarget, 3.2, dt);
    this.fan = approach(this.fan, Math.max(p.talk, this.wiggle * 0.8, p.near * 0.3), 5, dt);
    this.bob = approach(this.bob, p.talk, 4, dt);
    this.turn = approach(this.turn, p.face, 6, dt);

    // Spine: a slow travelling wave, bigger towards the tail; a wiggle adds a quick flick.
    const amp = 2.4 + this.paddle * 3.5 + this.wiggle * 4.5;
    const bobY = Math.sin(t * 7.2) * 1.6 * this.bob + Math.sin(t * 1.1) * 1.2;
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      this.spineY[i] = bobY * (1 - s * 0.6) + amp * Math.sin(s * 5.2 - this.phase * Math.PI * 2) * s ** 1.5 - s * 2;
    }
    this.drawBody();

    const neckY = this.spineY[0];
    this.head.y = neckY - 1;
    this.head.rotation = this.tilt + Math.sin(t * 7.2 + 0.6) * 0.035 * this.bob;
    this.drawFace(p.mouth);

    // Gills: a constant soft flutter; fanned wider and quicker when talking or happy.
    for (const g of this.gills) {
      const flutter = Math.sin(t * (2.6 + this.fan * 3.2) + g.phase);
      const spread = (g.base < 0 ? -1 : 1) * this.fan * 0.22;
      g.root.rotation = g.base + spread + flutter * (0.07 + this.fan * 0.06);
      g.tip.rotation = Math.sin(t * (3.1 + this.fan * 3) + g.phase + 0.9) * (0.16 + this.fan * 0.1);
      g.root.scale.y = 1 + Math.sin(t * 4.3 + g.phase * 1.3) * 0.1 + this.fan * 0.12;
    }

    // Legs: a lazy paddle, quicker while she swims.
    for (const l of this.legs) {
      const i = this.legs.indexOf(l);
      const sx = l.hip.x;
      const si = clamp(Math.round(((NECK_X - sx) / (NECK_X - TAIL_X)) * (N - 1)), 0, N - 1);
      l.hip.y = this.spineY[si] + (l.far ? 5.5 : 7.5);
      const stroke = Math.sin(t * (1.2 + this.paddle * 4) + l.phase);
      l.hip.rotation = l.base + stroke * (0.12 + this.paddle * 0.35) + (i % 2 ? 0.1 : 0);
      l.knee.rotation = -0.5 + Math.max(0, stroke) * (0.25 + this.paddle * 0.3);
    }

    // Facing: a quick squash through the middle when she turns round.
    this.view.scale.x = this.turn;
    const hr = this.head.rotation;
    this.headPoint.x = (this.head.x + Math.cos(hr) * 6) * this.turn;
    this.headPoint.y = this.head.y - 6 + Math.sin(hr) * 6;
    // The halo sits on the head, in rig units (the caller gives it the same placement as the view).
    this.halo.position.set(this.headPoint.x, this.headPoint.y);
  }
}
