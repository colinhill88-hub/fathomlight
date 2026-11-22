import { Container, Graphics } from 'pixi.js';
import { ShoreRig, type ShorePose } from './shoreCreatureRigs';

/**
 * Phase 22: the two new keepable species, drawn in code on jointed rigs in the same
 * painterly style as the others (Colin approved names and looks: see DESIGN.md).
 *
 *  - The kiln eel (the trench floor, by the Fulmar): a slender, sooty eel with a soft
 *    ribbon fin along its back, big gentle eyes, and ember lights along its sides. Its
 *    body is re-drawn along a swaying spine every frame, so it swims in a true S-wave.
 *  - The chime seahorse (the sanctum's edge, the antechamber): an ivory seahorse with a
 *    crown of pale filaments, a fluttering back fin and a curling tail. Its glow is warm
 *    pearl and gold (cyan, violet and magenta stay the Choir's).
 *
 * Both follow the ShoreRig contract (view, markings, halo, stroke, eye, angle, offset),
 * so Critter, the tanks and the portraits treat them like the shore creatures.
 */

/** Its colours, by the colour trait (the rig is drawn in these rather than tinted). */
export interface DeepLook {
  body: number;
  dark: number;
  belly: number;
  fin: number;
  glow: number;
}

export const EEL_LOOKS: DeepLook[] = [
  { body: 0x4c403a, dark: 0x2a2220, belly: 0x9a7a62, fin: 0x6a5048, glow: 0xffa04a }, // Soot
  { body: 0x7a4232, dark: 0x45231b, belly: 0xc08a68, fin: 0x9a5a44, glow: 0xffb050 }, // Rust
  { body: 0x6c6a66, dark: 0x3a3836, belly: 0xb6aa9a, fin: 0x86827c, glow: 0xffc070 }, // Ash grey
  { body: 0xb08a3a, dark: 0x6a4a1c, belly: 0xf0d48a, fin: 0xd4a850, glow: 0xffe08a }, // Molten gold (rare)
];
export const HORSE_LOOKS: DeepLook[] = [
  { body: 0xe6dcc8, dark: 0xa8977c, belly: 0xfff4e2, fin: 0xf2e6d0, glow: 0xfff0c0 }, // Ivory
  { body: 0xe8c2b4, dark: 0xa87a6e, belly: 0xfbe2d8, fin: 0xf4d6ca, glow: 0xffe2c0 }, // Pearl rose
  { body: 0xa88a6a, dark: 0x6a5440, belly: 0xd8c0a0, fin: 0xc4a684, glow: 0xffe0a0 }, // Driftwood
  { body: 0xe0a85a, dark: 0x9a6428, belly: 0xffdc9a, fin: 0xf0c070, glow: 0xfff0a0 }, // Sunstone (rare)
];

function joint(parent: Container, x: number, y: number): Container {
  const part = new Container();
  part.position.set(x, y);
  parent.addChild(part);
  return part;
}

const N = 14;

/** The kiln eel: a spine of N points swaying in a travelling wave; head and fin follow it. */
export class KilnEelRig extends ShoreRig {
  private readonly bodyG = new Graphics();
  private readonly finG = new Graphics();
  private readonly head = new Container();
  private readonly jaw: Container;
  private readonly sx = new Float32Array(N);
  private readonly sy = new Float32Array(N);
  private readonly len: number;
  private readonly thick: number;
  private swim = 0;

  constructor(young: boolean, pattern: number, phase: number, shape = 0, private readonly look: DeepLook = EEL_LOOKS[0]) {
    super(phase);
    this.len = young ? 46 : 74;
    this.thick = young ? 5 : 7;
    this.pattern = pattern;
    this.shape = shape;
    this.view.addChild(this.finG, this.bodyG, this.head);
    const L = look;
    const k = young ? 0.75 : 1;
    // The head: a rounded snout, a big soft eye with an amber ring, a small closed mouth.
    const h = new Graphics()
      .moveTo(-4, -6 * k).quadraticCurveTo(6 * k, -8.5 * k, 13 * k, -3 * k).quadraticCurveTo(16 * k, 0, 12.5 * k, 3 * k)
      .quadraticCurveTo(4 * k, 7 * k, -4, 6 * k).closePath().fill(L.body)
      .moveTo(-3, 3.5 * k).quadraticCurveTo(5 * k, 6.5 * k, 12 * k, 2.6 * k).quadraticCurveTo(5 * k, 3.5 * k, -3, 1.5 * k).fill({ color: L.belly, alpha: 0.75 })
      .moveTo(-2, -5 * k).quadraticCurveTo(6 * k, -7.6 * k, 11 * k, -3.6 * k).stroke({ color: 0xffffff, width: 1, alpha: 0.16 })
      .circle(6 * k, -2.4 * k, (young ? 3.6 : 3.2) * 1.25).fill({ color: 0xc8823a, alpha: 0.9 })
      .circle(6 * k, -2.4 * k, young ? 3.6 : 3.2).fill(0x1c1614)
      .circle(7.2 * k, -3.6 * k, 1.2).fill({ color: 0xfff0d8, alpha: 0.95 });
    this.head.addChild(h);
    this.jaw = joint(this.head, 9 * k, 2.4 * k);
    this.jaw.addChild(new Graphics().moveTo(0, 0).quadraticCurveTo(3 * k, 1.4 * k, 5.6 * k, 0.2).stroke({ color: L.dark, width: 1, alpha: 0.8, cap: 'round' }));
    // Gill frills behind the head.
    h.moveTo(-1, -3 * k).quadraticCurveTo(-4.5, 0, -1, 3 * k).stroke({ color: L.dark, width: 1.2, alpha: 0.7 });
    this.halo.ellipse(0, 0, this.len * 0.62, 14).fill({ color: L.glow, alpha: 0.5 });
    Object.assign(this.stroke, { x: -this.len * 0.58, y: 0, vx: -30, vy: 0, radius: 34 });
    for (let i = 0; i < N; i++) this.sx[i] = this.len * 0.42 - (i / (N - 1)) * this.len;
    this.update({ dt: 0, time: 0, speed: 0, notice: 0, curious: 0, flow: 0, floor: 0, feeding: 0 });
  }
  private readonly pattern: number;
  private readonly shape: number;

  /** Half thickness at s (0 head .. 1 tail tip). */
  private width(s: number): number {
    return this.thick * (s < 0.12 ? 0.85 + s : Math.max(0.22, 1 - (s - 0.12) * 0.9)) ;
  }

  update(p: ShorePose): void {
    const sp = Math.min(1, p.speed / 60);
    this.swim += p.dt * (2.2 + sp * 5 + p.notice * 3);
    this.tick(p, 0.4 + sp);
    const amp = (2.2 + sp * 3.4) * (this.len / 74);
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      this.sy[i] = Math.sin(s * 7.5 - this.swim) * amp * (0.25 + s) + p.flow * s * 4;
    }
    const L = this.look;
    const b = this.bodyG.clear();
    const f = this.finG.clear();
    // Outline: top edge head to tail, then the belly back.
    const top: number[] = [];
    const bot: number[] = [];
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      const w = this.width(s);
      top.push(this.sx[i], this.sy[i] - w);
      bot.unshift(this.sx[i], this.sy[i] + w * 0.92);
    }
    b.poly([...top, ...bot]).fill(L.body);
    // A paler belly band and a soft back highlight.
    const belly: number[] = [];
    for (let i = 1; i < N - 1; i++) belly.push(this.sx[i], this.sy[i] + this.width(i / (N - 1)) * 0.35);
    for (let i = N - 2; i >= 1; i--) belly.push(this.sx[i], this.sy[i] + this.width(i / (N - 1)) * 0.9);
    b.poly(belly).fill({ color: L.belly, alpha: 0.55 });
    b.moveTo(this.sx[1], this.sy[1] - this.width(0.08) * 0.6);
    for (let i = 2; i < N - 2; i++) b.lineTo(this.sx[i], this.sy[i] - this.width(i / (N - 1)) * 0.6);
    b.stroke({ color: 0xffffff, width: 0.9, alpha: 0.12 });
    // The ribbon fin along the back (a sail crest for shape 1), rippling behind the wave.
    const crest = this.shape === 1 ? 2.3 : 1;
    const fin: number[] = [];
    for (let i = 2; i < N; i++) {
      const s = i / (N - 1);
      const hgt = (this.thick * 0.9 * crest) * Math.sin(Math.min(1, (s - 0.1) / 0.9) * Math.PI) * (0.85 + 0.15 * Math.sin(this.swim * 1.6 - s * 9));
      fin.push(this.sx[i], this.sy[i] - this.width(s) - hgt);
    }
    for (let i = N - 1; i >= 2; i--) fin.push(this.sx[i], this.sy[i] - this.width(i / (N - 1)) + 0.5);
    f.poly(fin).fill({ color: L.fin, alpha: 0.82 });
    for (let i = 3; i < N - 1; i += 2) {
      const s = i / (N - 1);
      f.moveTo(this.sx[i], this.sy[i] - this.width(s)).lineTo(this.sx[i] - 1.5, this.sy[i] - this.width(s) - this.thick * 0.75 * crest * Math.sin(s * Math.PI))
        .stroke({ color: L.dark, width: 0.7, alpha: 0.5 });
    }
    // The belly fin, a short ribbon underneath near the tail.
    const under: number[] = [];
    for (let i = 7; i < N; i++) under.push(this.sx[i], this.sy[i] + this.width(i / (N - 1)) * 0.9 + this.thick * 0.55 * Math.sin(((i - 7) / (N - 7)) * Math.PI));
    for (let i = N - 1; i >= 7; i--) under.push(this.sx[i], this.sy[i] + this.width(i / (N - 1)) * 0.8);
    f.poly(under).fill({ color: L.fin, alpha: 0.7 });
    // Head follows the front of the spine.
    const ha = Math.atan2(this.sy[0] - this.sy[1], this.sx[0] - this.sx[1]);
    this.head.position.set(this.sx[0], this.sy[0]);
    this.head.rotation = ha * 0.7 + Math.sin(p.time * 0.9) * 0.05 * (1 - sp);
    this.jaw.rotation = p.feeding * Math.max(0, Math.sin(p.time * 9)) * 0.4;
    // Glow pattern along the sides: ember line, cinder spots or kiln bands.
    const m = this.markings;
    m.clear();
    for (let i = 2; i < N - 1; i++) {
      const s = i / (N - 1);
      const x = this.sx[i];
      const y = this.sy[i];
      const w = this.width(s);
      if (this.pattern === 0) m.circle(x, y + w * 0.1, 1.1).fill(L.glow);
      else if (this.pattern === 1) {
        if (i % 2) m.circle(x, y - w * 0.35, 1.25).fill(L.glow).circle(x - 2, y + w * 0.4, 0.9).fill(L.glow);
      } else if (i % 3 === 0) m.moveTo(x + 0.5, y - w * 0.85).lineTo(x - 0.8, y + w * 0.8).stroke({ color: L.glow, width: 1.3 });
    }
    if (this.shape === 2) {
      // Lantern tail: a soft glowing paddle on the tail's end.
      const tx = this.sx[N - 1];
      const ty = this.sy[N - 1];
      m.ellipse(tx - 3, ty, 4.4, 3).fill({ color: L.glow, alpha: 0.95 }).ellipse(tx - 3, ty, 2, 1.4).fill({ color: 0xffffff, alpha: 0.8 });
      b.moveTo(tx + 1, ty - 3).quadraticCurveTo(tx - 9, ty - 6, tx - 8, ty).quadraticCurveTo(tx - 9, ty + 6, tx + 1, ty + 3).closePath().fill({ color: L.fin, alpha: 0.85 });
    }
    this.halo.position.set(0, this.sy[Math.floor(N / 2)] * 0.6);
    this.eye.x = this.head.x + 6 * Math.cos(this.head.rotation) + 2.4 * Math.sin(this.head.rotation);
    this.eye.y = this.head.y + 6 * Math.sin(this.head.rotation) - 2.4 * Math.cos(this.head.rotation);
    this.stroke.x = this.sx[N - 1];
    this.stroke.y = this.sy[N - 1];
    if (p.dt > 0 && Math.sin(this.swim) > 0.98 && sp > 0.3) this.stroke.strength = 0.18 + p.notice * 0.2;
    this.angle = Math.atan(p.floor) * 0.4;
  }
}

/** The chime seahorse: upright, a fluttering back fin, a curling tail, a crown of filaments. */
export class ChimeHorseRig extends ShoreRig {
  private readonly torso = new Container();
  private readonly head: Container;
  private readonly fin: Container;
  private readonly tail: Container[] = [];
  private readonly filaments: { root: Container; tip: Container }[] = [];
  private readonly curl: number;

  constructor(young: boolean, pattern: number, phase: number, shape = 0, look: DeepLook = HORSE_LOOKS[0]) {
    super(phase);
    const L = look;
    const k = young ? 0.72 : 1;
    this.curl = shape === 0 ? 1 : 0.75;
    this.view.addChild(this.torso);
    // The tail: a chain of joints curling under, tapering, ridged.
    let mount: Container = this.torso;
    const segs = 8;
    for (let i = 0; i < segs; i++) {
      const j = joint(mount, i === 0 ? -1 * k : 0, i === 0 ? 14 * k : 4.6 * k);
      const w = (4.6 - i * 0.48) * k;
      j.addChild(new Graphics().moveTo(-w, 0).quadraticCurveTo(-w * 1.05, 2.5 * k, -w * 0.9, 5.2 * k).lineTo(w * 0.9, 5.2 * k)
        .quadraticCurveTo(w * 1.05, 2.5 * k, w, 0).closePath().fill(i % 2 ? L.body : mixWarm(L.body, L.dark, 0.18))
        .moveTo(-w * 0.95, 0.6).lineTo(w * 0.95, 0.6).stroke({ color: L.dark, width: 0.8, alpha: 0.6 }));
      this.tail.push(j);
      mount = j;
    }
    // Torso: a rounded belly and chest, ridged rings across it.
    const t = new Graphics()
      .moveTo(-4 * k, -16 * k).bezierCurveTo(6 * k, -16 * k, 10 * k, -4 * k, 8 * k, 6 * k)
      .bezierCurveTo(6 * k, 14 * k, -1 * k, 18 * k, -5 * k, 15 * k).bezierCurveTo(-9 * k, 6 * k, -9 * k, -8 * k, -4 * k, -16 * k).closePath().fill(L.body)
      .moveTo(2 * k, -12 * k).bezierCurveTo(8 * k, -6 * k, 9 * k, 4 * k, 4 * k, 13 * k).quadraticCurveTo(3 * k, 0, 2 * k, -12 * k).fill({ color: L.belly, alpha: 0.7 });
    for (let i = 0; i < 6; i++) {
      const y = (-12 + i * 4.6) * k;
      t.moveTo(-7.5 * k, y).quadraticCurveTo(0, y + 1.6 * k, 7.6 * k, y - 0.4 * k).stroke({ color: L.dark, width: 0.9, alpha: 0.45 });
    }
    t.moveTo(-5 * k, -13 * k).quadraticCurveTo(-7.5 * k, -2 * k, -5.5 * k, 9 * k).stroke({ color: 0xffffff, width: 1.2, alpha: 0.18 });
    // The back fin: a fan that flutters fast (seahorses scull with it).
    this.fin = joint(this.torso, -7 * k, 2 * k);
    const fan = new Graphics();
    fan.moveTo(0, -6 * k);
    for (let a = 0; a <= 8; a++) fan.lineTo(-Math.sin((a / 8) * Math.PI) * 8 * k, -6 * k + (a / 8) * 13 * k);
    fan.closePath().fill({ color: L.fin, alpha: 0.75 });
    for (let a = 1; a < 8; a += 2) fan.moveTo(0, -6 * k + (a / 8) * 13 * k).lineTo(-Math.sin((a / 8) * Math.PI) * 7.5 * k, -6 * k + (a / 8) * 13 * k).stroke({ color: L.dark, width: 0.6, alpha: 0.5 });
    this.fin.addChild(fan);
    this.torso.addChild(t);
    // The head: tilted forward on a curved neck, with a long tube snout (longer for shape 1).
    this.head = joint(this.torso, -1 * k, -15 * k);
    const snout = (shape === 1 ? 15 : 9) * k;
    const hg = new Graphics()
      .moveTo(-6 * k, 2 * k).bezierCurveTo(-7 * k, -7 * k, 2 * k, -10 * k, 6 * k, -5 * k)
      .lineTo(6 * k + snout, -3.2 * k).quadraticCurveTo(8 * k + snout, -1.6 * k, 6 * k + snout, 0)
      .lineTo(6 * k, 0.4 * k).quadraticCurveTo(3 * k, 4 * k, -6 * k, 2 * k).closePath().fill(L.body)
      .moveTo(6 * k, -0.6 * k).lineTo(5.5 * k + snout, -0.8 * k).stroke({ color: L.belly, width: 1.2, alpha: 0.7 })
      .circle(1.5 * k, -3.5 * k, 3 * k).fill({ color: L.belly, alpha: 0.85 })
      .circle(2 * k, -3.6 * k, 2.2 * k).fill(0x1e1a18).circle(2.8 * k, -4.4 * k, 0.8).fill({ color: 0xffffff, alpha: 0.95 });
    this.head.addChild(hg);
    // The crown (coronet), with pale filaments trailing from it (a long veil for shape 2).
    const coronet = new Graphics();
    for (let i = 0; i < 4; i++) coronet.moveTo((-4 + i * 2) * k, -7 * k).lineTo((-3.4 + i * 2.2) * k, (-11 - (i % 2) * 2) * k).stroke({ color: L.dark, width: 1.3, cap: 'round' });
    this.head.addChild(coronet);
    const fl = shape === 2 ? 26 : 13;
    for (let i = 0; i < (shape === 2 ? 4 : 3); i++) {
      const root = joint(this.head, (-3 + i * 2) * k, -11 * k);
      const len = (fl - i * 2) * k;
      root.addChild(new Graphics().moveTo(0, 0).quadraticCurveTo(-len * 0.4, -len * 0.25, -len * 0.7, len * 0.05).stroke({ color: L.fin, width: 1.1, alpha: 0.85, cap: 'round' }));
      const tip = joint(root, -len * 0.7, len * 0.05);
      tip.addChild(new Graphics().moveTo(0, 0).quadraticCurveTo(-len * 0.2, len * 0.2, -len * 0.45, len * 0.4).stroke({ color: L.fin, width: 0.8, alpha: 0.7, cap: 'round' })
        .circle(-len * 0.45, len * 0.4, 0.9).fill({ color: L.glow, alpha: 0.9 }));
      this.filaments.push({ root, tip });
    }
    // Glow pattern: crown light, pearl beads down the chest, or lyre lines.
    const m = this.markings;
    if (pattern === 0) for (const [x, y] of [[-3, -18.5], [-1, -19.5], [1, -18.8]]) m.circle(x * k, y * k, 1.2).fill(L.glow);
    else if (pattern === 1) for (let i = 0; i < 5; i++) m.circle((5.2 - Math.abs(i - 2) * 0.6) * k, (-9 + i * 4.6) * k, 1.1).fill(L.glow);
    else for (const s of [-1, 1]) m.moveTo(s * 2 * k, -11 * k).bezierCurveTo(s * 7 * k, -6 * k, s * 2 * k, 2 * k, s * 5 * k, 10 * k).stroke({ color: L.glow, width: 1.1 });
    this.halo.ellipse(0, -2 * k, 16 * k, 24 * k).fill({ color: L.glow, alpha: 0.35 });
    Object.assign(this.stroke, { x: -8, y: 0, vx: -12, vy: 6, radius: 22 });
    this.update({ dt: 0, time: 0, speed: 0, notice: 0, curious: 0, flow: 0, floor: 0, feeding: 0 });
  }

  update(p: ShorePose): void {
    const sp = Math.min(1, p.speed / 40);
    const flutter = this.tick(p, 6 + sp * 8);
    // Upright, bobbing gently, leaning a little into the way it swims.
    this.offset = Math.sin(p.time * 1.4) * 1.6;
    this.angle = sp * 0.22 + Math.sin(p.time * 0.7) * 0.05 + p.flow * 0.1;
    this.fin.scale.x = 0.55 + 0.45 * Math.abs(Math.sin(this.phase * Math.PI * 2));
    this.head.rotation = 0.25 + Math.sin(p.time * 0.8) * 0.06 - p.curious * 0.2 + p.feeding * Math.max(0, Math.sin(p.time * 6)) * 0.15;
    this.tail.forEach((j, i) => {
      j.rotation = (0.1 + i * 0.085) * this.curl * (1 - sp * 0.6) + Math.sin(p.time * 1.1 - i * 0.6) * 0.05 + p.flow * 0.06;
    });
    this.filaments.forEach(({ root, tip }, i) => {
      root.rotation = Math.sin(p.time * 1.3 - i * 0.8) * 0.18 + sp * 0.25 + p.flow * 0.3;
      tip.rotation = Math.sin(p.time * 1.9 - i) * 0.3 + sp * 0.2;
    });
    this.markings.position.copyFrom(this.torso.position);
    const hx = this.head.x + 2 * Math.cos(this.head.rotation) + 3.6 * Math.sin(this.head.rotation);
    const hy = this.head.y + 2 * Math.sin(this.head.rotation) - 3.6 * Math.cos(this.head.rotation);
    this.eye.x = hx;
    this.eye.y = hy;
    if (flutter && sp > 0.2) this.stroke.strength = 0.08;
  }
}

function mixWarm(a: number, b: number, k: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
