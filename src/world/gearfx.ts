import { Container, Graphics } from 'pixi.js';
import type { Light } from '../fx/lighting';
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
    for (const d of [...this.darts]) {
      d.t += dt;
      const k = Math.min(1, d.t / 0.18);
      const x = d.x0 + (d.x1 - d.x0) * k;
      const y = d.y0 + (d.y1 - d.y0) * k;
      const a = 1 - Math.max(0, (d.t - 0.18) / 0.4);
      g.moveTo(d.x0, d.y0).lineTo(x, y).stroke({ color: 0xc6f03a, width: 2, alpha: 0.6 * a });
      g.circle(x, y, 4).fill({ color: 0xf4ffd0, alpha: a });
      if (k >= 1) g.circle(d.x1, d.y1, 10 + 40 * (d.t - 0.18)).stroke({ color: 0xc6f03a, width: 2, alpha: 0.8 * a });
      if (a <= 0) this.darts = this.darts.filter((q) => q !== d);
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
