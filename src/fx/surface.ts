import { Container, Graphics } from 'pixi.js';
import { mulberry32 } from '../rng';
import type { SurfaceMotion } from './surfaceMotion';

/**
 * Effects where the diver meets the surface (Colin's request after milestone 2):
 *  - a splash when the head breaks through: droplets thrown up that fall back
 *    in, and rings of foam spreading out on the water;
 *  - small ripples while treading water;
 *  - a puff of breath vapour above the water with each breath out;
 *  - the waterline itself, drawn on top of the scene, so when the diver is
 *    half out you see the line of the water crossing the suit.
 *
 * All of it is drawn unlit on top of the lit scene, in world space.
 */

const rand = mulberry32(0x5a1a5);

/** The same wave as the water shader's surface line, so they always match. */
export function surfaceWave(x: number, t: number): number {
  return Math.sin(x * 0.021 + t * 1.3) * 4 + Math.sin(x * 0.047 - t * 1.9) * 2.5 + Math.sin(x * 0.11 + t * 2.7) * 1;
}

interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
}
interface Ring {
  x: number;
  r: number;
  speed: number;
  life: number;
  max: number;
}
interface Puff {
  x: number;
  y: number;
  vx: number;
  r: number;
  life: number;
}

export class SurfaceFx {
  readonly view = new Container();
  private g = new Graphics();
  private line = new Graphics();
  private drops: Drop[] = [];
  private rings: Ring[] = [];
  private puffs: Puff[] = [];
  private rippleClock = 0;

  constructor(private readonly motion?: SurfaceMotion) {
    this.view.addChild(this.line, this.g);
  }

  private wave(x: number, t: number): number { return this.motion?.height(x, t) ?? surfaceWave(x, t); }

  /** A splash at x. strength 0..1: a gentle surfacing is small, bursting up at speed is big. */
  splash(x: number, strength: number, time: number, vx = 0, entering = false): void {
    const y = this.wave(x, time);
    this.motion?.strike(x, strength * (entering ? 0.80 : 1), vx);
    const n = Math.round(10 + 34 * strength);
    for (let i = 0; i < n; i++) {
      const side = rand() < 0.5 ? -1 : 1;
      const up = (120 + rand() * 300) * (0.45 + strength * 0.75);
      this.drops.push({
        x: x + side * rand() * 22,
        y: y - 2,
        vx: side * (20 + rand() * 150) * (0.5 + strength * 0.6) + vx * 0.42,
        vy: -up * (entering ? 0.72 : 1),
        r: 1 + rand() * 2.6 * (0.6 + strength * 0.6),
        life: 1,
      });
    }
    for (let i = 0; i < 2 + Math.round(strength * 2); i++) {
      this.rings.push({ x, r: 6 + i * 6, speed: 60 + i * 35 + strength * 60, life: 1, max: 1.1 + i * 0.3 });
    }
    if (this.motion) {
      if (this.drops.length > 144) this.drops.splice(0, this.drops.length - 144);
      if (this.rings.length > 24) this.rings.splice(0, this.rings.length - 24);
    }
  }

  breath(x: number, y: number, dir: number): void {
    for (let i = 0; i < 5; i++) {
      this.puffs.push({ x: x + dir * (4 + rand() * 6), y: y - rand() * 4, vx: dir * (6 + rand() * 12), r: 3 + rand() * 3, life: 1 });
    }
  }

  update(dt: number, time: number, viewX0: number, viewX1: number, viewY0: number, treading: { x: number } | null): void {
    // Ripples while treading water.
    if (treading) {
      this.rippleClock -= dt;
      if (this.rippleClock <= 0) {
        this.rippleClock = 0.9 + rand() * 0.6;
        this.rings.push({ x: treading.x + (rand() - 0.5) * 10, r: 10, speed: 30, life: 1, max: 1.6 });
      }
    }

    const g = this.g;
    g.clear();
    // Droplets: thrown up, fall back under gravity, vanish into the water.
    for (const d of this.drops) {
      d.vy += 760 * dt;
      d.vx *= 1 - dt * 0.6;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.vy > 0 && d.y > this.wave(d.x, time)) {
        d.life = 0;
        if (d.r > 2.2 && (!this.motion || this.rings.length < 28)) this.rings.push({ x: d.x, r: 2, speed: 18, life: 1, max: 0.6 });
        continue;
      }
      const stretch = Math.min(3, 1 + Math.abs(d.vy) / 260);
      g.ellipse(d.x, d.y, d.r, d.r * stretch).fill({ color: 0xeef8f6, alpha: 0.8 });
      g.circle(d.x - d.r * 0.3, d.y - d.r * 0.4, d.r * 0.35).fill({ color: 0xffffff, alpha: 0.9 });
    }
    this.drops = this.drops.filter((d) => d.life > 0);

    // Foam rings, seen from the side as flat ellipses on the surface.
    for (const r of this.rings) {
      r.life -= dt / r.max;
      r.r += r.speed * dt;
      r.speed *= 1 - dt * 1.2;
      if (r.life <= 0) continue;
      const y = this.wave(r.x, time);
      if (this.motion) {
        for (const side of [-1, 1]) {
          const x = r.x + side * r.r;
          const crest = this.wave(x, time);
          g.moveTo(x - side * 14, this.wave(x - side * 14, time) + 4)
            .quadraticCurveTo(x, crest - 0.5, x + side * 6, this.wave(x + side * 6, time) + 3)
            .stroke({ color: 0xe5fff1, width: 1.25, alpha: 0.68 * r.life, cap: 'round' });
        }
      } else g.ellipse(r.x, y + 1, r.r, Math.max(1.5, r.r * 0.12)).stroke({ color: 0xffffff, width: 1.6, alpha: 0.7 * r.life });
      // Bits of foam on the ring.
      for (let k = 0; k < 4; k++) {
        const a = k * 1.7 + r.x;
        const x = r.x + Math.cos(a) * r.r;
        const lineY = this.motion ? this.wave(x, time) + 1 + Math.sin(a) * 3 : y + 1 + Math.sin(a) * r.r * 0.12;
        g.circle(x, lineY, 1.4).fill({ color: 0xffffff, alpha: 0.55 * r.life });
      }
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    if (this.motion && viewY0 <= 30) this.drawImpactFoam(this.motion, time, viewX0, viewX1);

    // Breath vapour: soft, growing, rising wisps.
    for (const p of this.puffs) {
      p.life -= dt / 1.4;
      p.x += p.vx * dt;
      p.y -= 16 * dt;
      p.r += 7 * dt;
      if (p.life > 0) g.circle(p.x, p.y, p.r).fill({ color: 0xffffff, alpha: 0.3 * p.life });
    }
    this.puffs = this.puffs.filter((p) => p.life > 0);

    // The waterline, crossing anything that is half in and half out.
    const l = this.line;
    l.clear();
    if (viewY0 > 30) return;
    const step = 8;
    const x0 = Math.floor(viewX0 / step) * step - step;
    l.moveTo(x0, this.wave(x0, time));
    for (let x = x0 + step; x <= viewX1 + step; x += step) l.lineTo(x, this.wave(x, time));
    l.stroke({ color: 0xffffff, width: 1.6, alpha: 0.5 });
    // A thin, faint film of water just under the line.
    l.moveTo(x0, this.wave(x0, time));
    for (let x = x0 + step; x <= viewX1 + step; x += step) l.lineTo(x, this.wave(x, time));
    for (let x = viewX1 + step; x >= x0; x -= step) l.lineTo(x, this.wave(x, time) + 7);
    l.closePath().fill({ color: 0xcfeee8, alpha: 0.13 });
  }

  private drawImpactFoam(motion: SurfaceMotion, time: number, x0: number, x1: number): void {
    const g = this.g;
    for (let i = 0; i < motion.data.length; i += 4) {
      const age = motion.data[i + 1];
      const strength = motion.data[i + 2];
      if (strength < 0.25 || age <= 0 || age >= 1.8) continue;
      const alpha = Math.min(0.88, strength * 0.86) * Math.min(1, age * 12) * (1 - age / 1.8) ** 1.5;
      for (const side of [-1, 1]) {
        const x = motion.crestX(i, side);
        if (x < x0 - 26 || x > x1 + 26) continue;
        const a = x - side * (13 + age * 6);
        const b = x - side * 5;
        const c = x + side * 5;
        const ya = this.wave(a, time);
        const yb = this.wave(b, time);
        const y = this.wave(x, time);
        const yc = this.wave(c, time);
        g.moveTo(a, ya + 4).lineTo(b, yb + 3).lineTo(x, y + 3).lineTo(c, yc + 3)
          .stroke({ color: 0x316471, width: 3.1, alpha: alpha * 0.73, cap: 'round' });
        g.moveTo(a, ya + 1).lineTo(b, yb).lineTo(x, y - 0.6).lineTo(c, yc + 1)
          .stroke({ color: 0xe5fff1, width: 2.1, alpha, cap: 'round' });
        g.circle(a - side * 4, this.wave(a - side * 4, time) + 2, 1.25).fill({ color: 0xe5fff1, alpha: alpha * 0.72 });
      }
    }
  }
}
