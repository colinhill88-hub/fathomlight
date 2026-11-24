import { Container, Graphics, Sprite } from 'pixi.js';
import type { Light } from '../fx/lighting';
import { getPropArt } from '../art/propArt';
import { isSolid } from './terrain';

/**
 * After milestone 12: the moving parts of the new suit attachments and sub
 * modules, drawn and timed in one place:
 *  - flares from the flare launcher: they fly ahead, sink, land and burn for
 *    90 s, each with its own warm red light;
 *  - the stun dart's streak;
 *  - marks for the Echo visor (lime) and the sonar dome (teal), drawn on top
 *    of everything so they show through rock;
 *  - the tractor beam, and sparks from the drill nose.
 */

interface Flare {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  landed: boolean;
  light: Light;
}

export const FLARE_SECONDS = 90;

export class GearFx {
  /** Shining parts (drawn unlit). */
  readonly emissive = new Container();
  /** Marks drawn over everything, after the post pass. */
  readonly overlay = new Container();
  readonly lights: Light[] = [];
  private flares: Flare[] = [];
  private darts: { x0: number; y0: number; x1: number; y1: number; t: number }[] = [];
  private dartSprites = new Map<object, Sprite>();
  private sparks: { x: number; y: number; vx: number; vy: number; t: number }[] = [];
  private fx = new Graphics();
  private marks = new Graphics();

  constructor() {
    this.emissive.addChild(this.fx);
    this.overlay.addChild(this.marks);
  }

  fireFlare(x: number, y: number, face: number): void {
    const light: Light = { x, y, radius: 470, intensity: 0, color: [1, 0.42, 0.28], haze: 0.35 };
    this.flares.push({ x, y, vx: face * 560, vy: -90, life: FLARE_SECONDS, landed: false, light });
    this.lights.push(light);
    // At most six burn at once: the oldest goes out.
    while (this.flares.length > 6) this.dropFlare(this.flares[0]);
  }

  private dropFlare(f: Flare): void {
    this.flares = this.flares.filter((q) => q !== f);
    const i = this.lights.indexOf(f.light);
    if (i >= 0) this.lights.splice(i, 1);
  }

  fireDart(x0: number, y0: number, x1: number, y1: number): void {
    this.darts.push({ x0, y0, x1, y1, t: 0 });
  }

  /** Sparks where the drill bites (call each frame while drilling). */
  drillSparks(x: number, y: number): void {
    for (let i = 0; i < 2; i++) this.sparks.push({ x, y, vx: (Math.random() - 0.5) * 320, vy: -Math.random() * 220, t: 0 });
  }

  /**
   * marks: points to flag (Echo visor lime, sonar dome teal). beam: the
   * tractor beam from the sub's chin to a material, or null.
   */
  update(dt: number, time: number, marks: { x: number; y: number; teal?: boolean; young?: boolean }[], beam: { x0: number; y0: number; x1: number; y1: number } | null, zoom: number): void {
    const g = this.fx.clear();
    for (const f of [...this.flares]) {
      f.life -= dt;
      if (f.life <= 0) {
        this.dropFlare(f);
        continue;
      }
      if (!f.landed) {
        f.vx *= Math.exp(-1.6 * dt);
        f.vy += 260 * dt;
        f.vy *= Math.exp(-0.8 * dt);
        const nx = f.x + f.vx * dt;
        const ny = f.y + f.vy * dt;
        if (isSolid(nx, ny + 4)) {
          f.landed = true;
          f.vx = f.vy = 0;
        } else {
          f.x = nx;
          f.y = ny;
        }
      }
      const fade = Math.min(1, f.life / 6) * Math.min(1, (FLARE_SECONDS - f.life) / 0.3);
      const flick = 0.85 + 0.15 * Math.sin(time * 23 + f.x) + 0.08 * Math.sin(time * 41);
      f.light.x = f.x;
      f.light.y = f.y - 8;
      f.light.intensity = 1.5 * fade * flick;
      g.roundRect(f.x - 7, f.y - 2.5, 14, 5, 2).fill({ color: 0x8a2a20 });
      g.circle(f.x + 6, f.y, 3.2 * flick).fill({ color: 0xfff0d0, alpha: fade });
      g.circle(f.x + 6, f.y, 9 * flick).fill({ color: 0xff5a3a, alpha: 0.45 * fade });
      // A thin trail of bubbles above a landed flare.
      if (f.landed) for (let k = 0; k < 3; k++) g.circle(f.x + 6 + Math.sin(time * 3 + k) * 3, f.y - 10 - ((time * 30 + k * 14) % 42), 1.4).fill({ color: 0xffd0b0, alpha: 0.35 * fade });
    }
    const dartTex = getPropArt().kestrel.stun_dart;
    const activeDarts = new Set<object>();
    for (const d of [...this.darts]) {
      d.t += dt;
      const flight = 0.22;
      const k = Math.min(1, d.t / flight);
      const dx = d.x1 - d.x0;
      const dy = d.y1 - d.y0;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      const px = -uy;
      const py = ux;
      const x = d.x0 + dx * k;
      const y = d.y0 + dy * k;
      const a = 1 - Math.max(0, (d.t - flight) / 0.45);

      // Brief brass muzzle recoil puff at the launcher when fired.
      if (d.t < 0.14) {
        const mk = 1 - d.t / 0.14;
        g.circle(d.x0, d.y0, 4 + 9 * (1 - mk)).stroke({ color: 0xe8f5a8, width: 1.8, alpha: 0.65 * mk });
        g.circle(d.x0 + ux * 5, d.y0 + uy * 5, 4.5 * mk).fill({ color: 0xfff6c8, alpha: 0.85 * mk });
      }

      // Spiraling underwater slipstream & trailing micro-bubbles (replaces the plain green line).
      const trailStart = Math.max(0, k - 0.55);
      const steps = 10;
      for (let i = 0; i < steps; i++) {
        const f0 = trailStart + ((k - trailStart) * i) / steps;
        const f1 = trailStart + ((k - trailStart) * (i + 1)) / steps;
        const w0 = Math.sin(f0 * 26 - d.t * 28) * 3.4 * (1 - f0 * 0.4);
        const w1 = Math.sin(f1 * 26 - d.t * 28) * 3.4 * (1 - f1 * 0.4);
        const fadeSeg = (i / steps) * a;
        g.moveTo(d.x0 + dx * f0 + px * w0, d.y0 + dy * f0 + py * w0)
          .lineTo(d.x0 + dx * f1 + px * w1, d.y0 + dy * f1 + py * w1)
          .stroke({ color: 0xd4f478, width: 1.8, alpha: 0.52 * fadeSeg, cap: 'round' });
        if (i % 2 === 0) {
          g.circle(d.x0 + dx * f0 - px * w0 * 0.8, d.y0 + dy * f0 - py * w0 * 0.8, 1.3).fill({ color: 0xe6f8d8, alpha: 0.45 * fadeSeg });
        }
      }

      // Flying stun-dart projectile (painted stun_dart sprite when loaded, else sleek brass-tipped dart).
      if (k < 1) {
        if (dartTex) {
          activeDarts.add(d);
          let spr = this.dartSprites.get(d);
          if (!spr) {
            spr = new Sprite(dartTex);
            spr.anchor.set(0.6, 0.5);
            this.emissive.addChild(spr);
            this.dartSprites.set(d, spr);
          }
          spr.scale.set(24 / Math.max(1, dartTex.width));
          spr.position.set(x, y);
          spr.rotation = Math.atan2(uy, ux);
        } else {
          g.poly([
            x + ux * 9, y + uy * 9,
            x - ux * 5 + px * 2.5, y - uy * 5 + py * 2.5,
            x - ux * 10 + px * 4.5, y - uy * 10 + py * 4.5,
            x - ux * 7, y - uy * 7,
            x - ux * 10 - px * 4.5, y - uy * 10 - py * 4.5,
            x - ux * 5 - px * 2.5, y - uy * 5 - py * 2.5,
          ]).fill({ color: 0xd4b05c }).stroke({ color: 0x261d10, width: 0.9 });
          g.circle(x + ux * 7, y + uy * 7, 2.4).fill({ color: 0xf4ffd0 });
        }
      } else {
        // Impact shock-rings + 6 crackling golden-lime static arcs around the stunned predator.
        const imp = d.t - flight;
        const r1 = 10 + 48 * imp;
        const r2 = 6 + 30 * imp;
        g.circle(d.x1, d.y1, r1).stroke({ color: 0xc6f03a, width: 2.2, alpha: 0.85 * a });
        g.circle(d.x1, d.y1, r2).stroke({ color: 0xfff4b0, width: 1.4, alpha: 0.7 * a });
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + imp * 5;
          const midR = r2 * 0.78;
          const outR = r1 * 1.08;
          const jag = (i % 2 ? 1 : -1) * 0.22;
          g.moveTo(d.x1 + Math.cos(ang) * 6, d.y1 + Math.sin(ang) * 6)
            .lineTo(d.x1 + Math.cos(ang + jag) * midR, d.y1 + Math.sin(ang + jag) * midR)
            .lineTo(d.x1 + Math.cos(ang) * outR, d.y1 + Math.sin(ang) * outR)
            .stroke({ color: i % 2 ? 0xfff6c0 : 0xc6f03a, width: 1.5, alpha: 0.85 * a, cap: 'round' });
        }
      }
      if (a <= 0) this.darts = this.darts.filter((q) => q !== d);
    }
    for (const [d, spr] of this.dartSprites) {
      if (!activeDarts.has(d)) {
        spr.destroy();
        this.dartSprites.delete(d);
      }
    }
    for (const sp of [...this.sparks]) {
      sp.t += dt;
      sp.vy += 500 * dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      g.circle(sp.x, sp.y, 1.6).fill({ color: 0xffd080, alpha: Math.max(0, 1 - sp.t / 0.5) });
      if (sp.t > 0.5) this.sparks = this.sparks.filter((q) => q !== sp);
    }
    if (beam) {
      const w = 6 + 2 * Math.sin(time * 9);
      g.moveTo(beam.x0, beam.y0).lineTo(beam.x1, beam.y1).stroke({ color: 0xc6f03a, width: w, alpha: 0.25 });
      g.moveTo(beam.x0, beam.y0).lineTo(beam.x1, beam.y1).stroke({ color: 0xf0ffc0, width: 1.6, alpha: 0.8 });
      g.circle(beam.x1, beam.y1, 14 + 4 * Math.sin(time * 7)).stroke({ color: 0xc6f03a, width: 2, alpha: 0.7 });
    }
    // Marks: small diamonds that keep a steady size on screen.
    const m = this.marks.clear();
    const s = 6 / Math.max(0.2, zoom);
    const pulse = 0.75 + 0.25 * Math.sin(time * 3);
    for (const p of marks) {
      const col = p.teal ? 0x5fe0ff : p.young ? 0xffd890 : 0xc6f03a;
      m.poly([p.x, p.y - s, p.x + s, p.y, p.x, p.y + s, p.x - s, p.y]).stroke({ color: col, width: 1.6 / Math.max(0.2, zoom), alpha: 0.85 * pulse });
      m.circle(p.x, p.y, s * 0.25).fill({ color: col, alpha: 0.9 });
    }
  }

  /** Flares burning now (for the HUD). */
  get burning(): number {
    return this.flares.length;
  }
}
