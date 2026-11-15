import { Container, Graphics } from 'pixi.js';
import { mulberry32 } from '../rng';
import type { SpeciesId } from '../game/state';

/**
 * The keepable creatures of the sunlit shallows, drawn with code
 * (milestone 4). The same drawings are used out in the wild and inside the
 * creature tanks.
 *
 * Colin's direction (DESIGN.md, Art direction): creatures near the surface
 * are cute and gentle, with no teeth, but visually interesting. So these are
 * round and soft with friendly eyes, bold patterns and small warm glows,
 * while keeping realistic shading. Glow stays warm: cyan, violet and magenta
 * belong to the Choir.
 *
 *  - Glowfin: a round striped fish with a big dark eye and a glowing lure.
 *  - Puffcap: a small peach jelly with a frilled rim, glowing polka dots and
 *    two dark eye spots, so it seems to look at you.
 *  - Dapple ray: a palm-sized sandy ray with dappled rings on its back,
 *    big eyes on little bumps and rippling wing edges.
 *  - Glowfin eggs: a clutch of see-through eggs, each with a curled fry and
 *    a dot of an eye inside.
 *
 * Each creature has three layers, like everything else in the game: the
 * body (lit by the scene), emissive (crisp shining bits) and glow (soft
 * halos). The emissive and glow layers copy the body's position, turn and
 * facing every frame.
 */

const GLOWFIN_LOOKS = [
  { body: 0xd27a86, stripe: 0x9a4a5c, belly: 0xf0c2b8, fin: 0xb85f70, lure: 0xfff2a8 },
  { body: 0x78a6c8, stripe: 0x45708f, belly: 0xc8dde6, fin: 0x5e8aad, lure: 0xf3f7b0 },
];

export type Stage = 'egg' | 'young' | 'grown';

export interface CritterPose {
  /** 0..1 how lively and bright (needs met). */
  vigour: number;
  /** 0..1 how sick (pale, slow, drooping). */
  sick: number;
  /** Extra scale (wild adults are drawn bigger). */
  size?: number;
}

export class Critter {
  readonly view = new Container();
  readonly emissive = new Container();
  readonly glow = new Container();
  /** Where the creature is pointing (1 right, -1 left). */
  face = 1;
  private faceAnim = 1;
  private phase: number;
  private parts: Record<string, Graphics> = {};
  private body = new Container();
  private look: number;

  constructor(
    readonly species: SpeciesId,
    readonly stage: Stage,
    seed: number,
  ) {
    const r = mulberry32(seed * 977 + 13);
    this.phase = r() * 10;
    this.look = Math.floor(r() * 2);
    this.view.addChild(this.body);
    if (stage === 'egg') this.drawEggs(r);
    else if (species === 'glowfin') this.drawGlowfin();
    else if (species === 'puffcap') this.drawPuffcap();
    else this.drawRay();
  }

  /** Base scale for this species and stage. */
  private baseScale(): number {
    if (this.stage === 'egg') return 1;
    const young = this.stage === 'young';
    if (this.species === 'glowfin') return young ? 0.62 : 0.88;
    if (this.species === 'puffcap') return young ? 0.85 : 1.3;
    return young ? 0.85 : 1.25;
  }

  // ---- Glowfin ----
  private drawGlowfin(): void {
    const L = GLOWFIN_LOOKS[this.look];
    const young = this.stage === 'young';
    const tail = new Graphics();
    // A soft fan tail with ray lines.
    tail.moveTo(0, 0).bezierCurveTo(-6, -10, -14, -12, -15, -8).quadraticCurveTo(-10, 0, -15, 8).bezierCurveTo(-14, 12, -6, 10, 0, 0).fill({ color: L.fin, alpha: 0.9 });
    for (const a of [-0.5, 0, 0.5]) tail.moveTo(-1, 0).lineTo(-12, a * 16).stroke({ color: L.stripe, width: 0.8, alpha: 0.6 });
    tail.x = -15;
    const g = new Graphics();
    // Rounded dorsal fin (lobes, not spikes).
    g.moveTo(-10, -8).bezierCurveTo(-8, -17, 2, -18, 6, -9).closePath().fill({ color: L.fin });
    g.moveTo(-6, -10).lineTo(-4, -15).moveTo(0, -10).lineTo(1, -15).stroke({ color: L.stripe, width: 0.8, alpha: 0.6 });
    // Round body with a soft belly.
    g.ellipse(0, 0, 18, 11.5).fill({ color: L.body });
    g.ellipse(1, 5, 14, 5.5).fill({ color: L.belly, alpha: 0.75 });
    g.ellipse(-2, -6, 12, 3).fill({ color: 0xffffff, alpha: 0.12 });
    // Curved stripes.
    for (const x of [-10, -4, 2]) g.moveTo(x, -10.5).quadraticCurveTo(x + 3, 0, x, 10.5).stroke({ color: L.stripe, width: 2.2, alpha: 0.75 });
    // Scale texture.
    for (let i = 0; i < 10; i++) g.arc(-12 + (i % 5) * 5, -2 + Math.floor(i / 5) * 5, 2, 0.2, Math.PI - 0.2).stroke({ color: L.stripe, width: 0.5, alpha: 0.35 });
    // Gill line, a blush and a small closed smile: no teeth.
    g.moveTo(6, -7).quadraticCurveTo(9, 0, 6, 7).stroke({ color: L.stripe, width: 1, alpha: 0.6 });
    g.ellipse(12, 4, 3, 1.8).fill({ color: 0xff9a9a, alpha: 0.35 });
    g.moveTo(15.5, 3).quadraticCurveTo(17, 4.6, 18.2, 3.2).stroke({ color: 0x5a2a2a, width: 0.8, alpha: 0.7 });
    // Big friendly eye with two catchlights.
    const er = young ? 5 : 4.2;
    g.circle(11, -2.5, er + 1).fill({ color: L.belly, alpha: 0.6 });
    g.circle(11, -2.5, er).fill({ color: 0x161214 });
    g.circle(12.2, -3.9, er * 0.38).fill({ color: 0xffffff, alpha: 0.9 });
    g.circle(9.8, -1.2, er * 0.16).fill({ color: 0xffffff, alpha: 0.7 });
    // Lure stalk.
    g.moveTo(10, -9).bezierCurveTo(12, -19, 19, -22, 21, -17).stroke({ color: L.stripe, width: 1.3 });
    // Pectoral fin (animated).
    const pec = new Graphics();
    pec.moveTo(0, 0).bezierCurveTo(-3, 4, -8, 6, -9, 3).quadraticCurveTo(-5, 1, 0, 0).fill({ color: L.fin, alpha: 0.85 });
    pec.position.set(4, 3);
    this.body.addChild(tail, g, pec);
    this.parts.tail = tail;
    this.parts.pec = pec;
    const lure = new Graphics().circle(0, 0, 2.6).fill({ color: L.lure });
    lure.position.set(21, -17);
    // A row of tiny lume dots along the side (shows on grown fish).
    const dots = new Graphics();
    for (let i = 0; i < 5; i++) dots.circle(-12 + i * 5, 1.5, 0.8).fill({ color: 0xf6f0b0 });
    this.emissive.addChild(lure, dots);
    this.parts.dots = dots;
    const halo = new Graphics().circle(0, 0, 13).fill({ color: L.lure });
    halo.position.set(21, -17);
    this.glow.addChild(halo);
    this.parts.halo = halo;
    this.parts.lure = lure;
  }

  // ---- Puffcap ----
  private drawPuffcap(): void {
    const bell = new Graphics();
    // Bell: translucent peach, a deeper inner bell and three apricot lobes.
    bell.moveTo(-17, 2).bezierCurveTo(-18, -16, 18, -16, 17, 2).closePath().fill({ color: 0xf2d2b6, alpha: 0.82 });
    bell.moveTo(-12, 1).bezierCurveTo(-12, -10, 12, -10, 12, 1).closePath().fill({ color: 0xf7e2cc, alpha: 0.5 });
    for (const x of [-6, 0, 6]) bell.ellipse(x, -4, 3.2, 3.8).fill({ color: 0xe3956a, alpha: 0.7 });
    bell.ellipse(-6, -10, 6, 2.4).fill({ color: 0xffffff, alpha: 0.35 });
    // Frilled rim.
    for (let i = 0; i < 9; i++) {
      const x = -16 + i * 4;
      bell.ellipse(x, 2.5, 2.4, 1.6).fill({ color: 0xe8b894, alpha: 0.9 });
    }
    // Two dark eye spots (ocelli) on the rim, so it seems to look at you.
    bell.circle(-5, -0.5, 1.6).fill({ color: 0x2a1a18 });
    bell.circle(5, -0.5, 1.6).fill({ color: 0x2a1a18 });
    bell.circle(-4.5, -1, 0.5).fill({ color: 0xffffff, alpha: 0.8 });
    bell.circle(5.5, -1, 0.5).fill({ color: 0xffffff, alpha: 0.8 });
    const tent = new Graphics();
    this.body.addChild(tent, bell);
    this.parts.bell = bell;
    this.parts.tent = tent;
    // Glowing polka dots on the bell.
    const dots = new Graphics();
    for (const [x, y, r] of [[-11, -5, 1.4], [-8, -11, 1.2], [-2, -12.5, 1.3], [4, -11.5, 1.1], [10, -8, 1.4], [12, -3, 1], [-13, -1, 0.9]] as const)
      dots.circle(x, y, r).fill({ color: 0xfff2c0 });
    this.emissive.addChild(dots);
    this.parts.dots = dots;
    const halo = new Graphics().ellipse(0, -5, 20, 14).fill({ color: 0xffd9a0, alpha: 0.5 });
    this.glow.addChild(halo);
    this.parts.halo = halo;
  }

  // ---- Dapple ray ----
  private drawRay(): void {
    const disc = new Graphics();
    const tail = new Graphics();
    this.body.addChild(tail, disc);
    this.parts.disc = disc;
    this.parts.tail = tail;
    const tip = new Graphics().circle(0, 0, 1.4).fill({ color: 0xfff0c0 });
    this.emissive.addChild(tip);
    this.parts.tip = tip;
    const halo = new Graphics().circle(0, 0, 7).fill({ color: 0xffe0a0, alpha: 0.6 });
    this.glow.addChild(halo);
    this.parts.halo = halo;
  }

  /** Redraw the ray's disc with a ripple running along its wing edges. */
  private paintRay(time: number, speed: number, droop: number): void {
    const d = this.parts.disc;
    d.clear();
    const rx = 21;
    const ry = 7.5;
    const pts: number[] = [];
    const amp = 2.2 + Math.min(1, speed / 60) * 2;
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const ex = Math.cos(a) * rx;
      // The wing edges (top and bottom of the outline, seen from the side-above) ripple from front to back.
      const edge = Math.abs(Math.sin(a));
      const wave = Math.sin(ex * 0.25 - time * (4 + speed * 0.05) + this.phase) * amp * edge;
      pts.push(ex, Math.sin(a) * ry + wave - edge * droop);
    }
    d.poly(pts).fill({ color: 0xc8b08a });
    // Darker far edge and paler belly rim, for depth.
    d.ellipse(0, -3, 17, 3).fill({ color: 0x9c845e, alpha: 0.35 });
    d.ellipse(0, 5, 17, 2).fill({ color: 0xf0e2c4, alpha: 0.5 });
    // Dapples: dark spots with pale rings.
    for (const [x, y, r] of [[-12, -1, 2.4], [-6, 2, 1.8], [-2, -3, 2.6], [4, 1, 2], [-15, 3, 1.4], [8, -3, 1.3], [-9, -4, 1.2]] as const) {
      d.circle(x, y, r + 1).fill({ color: 0xf2e6c8, alpha: 0.55 });
      d.circle(x, y, r).fill({ color: 0x7a5a3c, alpha: 0.85 });
    }
    // Head bumps with big eyes on top.
    for (const ex of [11, 15.5]) {
      d.ellipse(ex, -5.5, 3.2, 2.8).fill({ color: 0xbca27a });
      d.circle(ex, -6, 2.3).fill({ color: 0x1a1612 });
      d.circle(ex + 0.8, -6.9, 0.8).fill({ color: 0xffffff, alpha: 0.9 });
    }
    // A small smile at the front edge.
    d.moveTo(17, 1.5).quadraticCurveTo(19, 3, 20.5, 1.2).stroke({ color: 0x5a4030, width: 0.8, alpha: 0.6 });
  }

  // ---- Eggs ----
  private drawEggs(r: () => number): void {
    const g = new Graphics();
    const em = new Graphics();
    const spots: [number, number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const a = r() * Math.PI;
      const d = Math.sqrt(r()) * 9;
      spots.push([Math.cos(a) * d * 1.3, -Math.sin(a) * d * 0.8 - 3, 3.6 + r() * 1.4]);
    }
    spots.sort((a, b) => a[1] - b[1]);
    g.ellipse(0, 1, 13, 3).fill({ color: 0x3a3a28, alpha: 0.35 });
    for (const [x, y, rad] of spots) {
      g.circle(x, y, rad).fill({ color: 0xd8e890, alpha: 0.55 });
      g.circle(x, y, rad).stroke({ color: 0xf2f6c8, width: 0.7, alpha: 0.7 });
      // A curled fry inside, with a dot of an eye.
      g.arc(x, y + 0.3, rad * 0.5, 0.6, Math.PI * 1.6).stroke({ color: 0x8a7a40, width: 0.9, alpha: 0.75 });
      g.circle(x + rad * 0.25, y - rad * 0.25, 0.8).fill({ color: 0x141414 });
      g.circle(x - rad * 0.35, y - rad * 0.4, rad * 0.25).fill({ color: 0xffffff, alpha: 0.45 });
      em.circle(x, y, rad * 0.45).fill({ color: 0xf0f6b0, alpha: 0.6 });
    }
    this.body.addChild(g);
    this.emissive.addChild(em);
    this.parts.dots = em;
    const halo = new Graphics().ellipse(0, -3, 18, 12).fill({ color: 0xf0f6b0, alpha: 0.5 });
    this.glow.addChild(halo);
    this.parts.halo = halo;
  }

  /** Move and animate. vx, vy: current velocity (sets facing and tilt). */
  update(dt: number, time: number, x: number, y: number, vx: number, vy: number, pose: CritterPose): void {
    const sick = pose.sick;
    const vig = pose.vigour;
    const slow = 1 - sick * 0.6;
    const t = time * slow + this.phase;
    const s = this.baseScale() * (pose.size ?? 1);
    const sp = Math.hypot(vx, vy);
    if (vx > 6) this.face = 1;
    else if (vx < -6) this.face = -1;
    this.faceAnim += (this.face - this.faceAnim) * Math.min(1, dt * 6);
    const fx = Math.abs(this.faceAnim) < 0.1 ? 0.1 * this.face : this.faceAnim;
    let rot = 0;
    let bob = 0;
    let sx = s;
    let sy = s;
    if (this.stage === 'egg') {
      // Eggs only pulse gently.
      sy = s * (1 + Math.sin(t * 1.5) * 0.02);
    } else if (this.species === 'glowfin') {
      rot = Math.atan2(vy, Math.abs(vx) + 20) * 0.5 * this.face + sick * 0.25 * this.face;
      bob = Math.sin(t * 1.7) * 2;
      this.parts.tail.rotation = Math.sin(t * (5 + sp * 0.08)) * 0.35;
      this.parts.pec.rotation = Math.sin(t * 6) * 0.4;
      this.parts.dots.alpha = this.stage === 'grown' ? vig : 0;
      const lp = 0.75 + 0.25 * Math.sin(t * 3);
      this.parts.lure.alpha = 0.4 + 0.6 * vig;
      this.parts.halo.alpha = 0.75 * vig * lp;
    } else if (this.species === 'puffcap') {
      // Pulse: the bell squeezes, then relaxes; it rises a little on each squeeze.
      const p = Math.sin(t * 2.4);
      sx = s * (1 + p * 0.07);
      sy = s * (1 - p * 0.08);
      bob = -Math.max(0, p) * 3;
      rot = Math.sin(t * 0.7) * 0.12 + sick * 0.3;
      const tg = this.parts.tent;
      tg.clear();
      // Curly tentacles, and two frilly ribbons in the middle.
      for (let i = 0; i < 6; i++) {
        const bx = -14 + i * 5.6;
        const len = 14 + (i % 2) * 6;
        tg.moveTo(bx, 3);
        for (let k = 1; k <= 6; k++) {
          const yy = 3 + (k / 6) * len * (1 + p * 0.1);
          tg.lineTo(bx + Math.sin(t * 2 + k * 0.9 + i) * 2.4 * (k / 6), yy);
        }
        tg.stroke({ color: 0xe8b894, width: 1.1, alpha: 0.75 });
      }
      for (const ox of [-2.5, 2.5]) {
        tg.moveTo(ox, 3);
        for (let k = 1; k <= 8; k++) tg.lineTo(ox + Math.sin(t * 1.6 + k * 0.8 + ox) * 3.4, 3 + k * 2.6);
        tg.stroke({ color: 0xf0c8a8, width: 2.6, alpha: 0.7 });
      }
      this.parts.dots.alpha = 0.35 + 0.65 * vig;
      this.parts.halo.alpha = 0.55 * vig * (0.8 + 0.2 * p);
    } else {
      // Ray: glides level, tilting a little with its climb.
      rot = Math.atan2(vy, Math.abs(vx) + 30) * 0.4 * this.face;
      bob = Math.sin(t * 1.3) * 1.5;
      this.paintRay(t, sp, sick * 3);
      const tg = this.parts.tail;
      tg.clear();
      tg.moveTo(-18, 0);
      let tx = -18;
      let ty = 0;
      for (let k = 1; k <= 8; k++) {
        tx = -18 - k * 3.4;
        ty = Math.sin(t * 3 - k * 0.6) * k * 0.35 + k * 0.3 * sick;
        tg.lineTo(tx, ty);
      }
      tg.stroke({ color: 0xa88e68, width: 1.4 });
      tg.moveTo(tx + 3, ty - 2).lineTo(tx, ty).lineTo(tx + 3, ty + 2).stroke({ color: 0xa88e68, width: 1.2 });
      this.parts.tip.position.set(tx, ty);
      this.parts.halo.position.set(tx, ty);
      this.parts.tip.alpha = this.stage === 'grown' ? 0.4 + 0.6 * vig : 0.25 * vig;
      this.parts.halo.alpha = this.stage === 'grown' ? 0.6 * vig : 0.15;
    }
    if (this.stage === 'egg') {
      this.parts.dots.alpha = 0.4 + 0.4 * vig * (0.8 + 0.2 * Math.sin(t * 2));
      this.parts.halo.alpha = 0.35 * vig;
    }
    // Sick creatures turn pale and grey.
    const grey = Math.round(255 - sick * 90);
    const tint = (grey << 16) | (Math.round(grey * 1.0) << 8) | Math.min(255, grey + 10);
    this.body.tint = sick > 0.01 ? tint : 0xffffff;
    for (const c of [this.view, this.emissive, this.glow]) {
      c.position.set(x, y + bob);
      c.scale.set(sx * (this.stage === 'egg' ? 1 : fx), sy);
      c.rotation = rot;
    }
  }

  setVisible(v: boolean): void {
    this.view.visible = this.emissive.visible = this.glow.visible = v;
  }

  destroy(): void {
    this.view.destroy({ children: true });
    this.emissive.destroy({ children: true });
    this.glow.destroy({ children: true });
  }
}
