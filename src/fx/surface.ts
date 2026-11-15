import { Container, Graphics } from 'pixi.js';
import { mulberry32 } from '../rng';

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

  constructor() {
    this.view.addChild(this.line, this.g);
  }

  /** A splash at x. strength 0..1: a gentle surfacing is small, bursting up at speed is big. */
  splash(x: number, strength: number, time: number): void {
    const y = surfaceWave(x, time);
    const n = Math.round(10 + 34 * strength);
    for (let i = 0; i < n; i++) {
      const side = rand() < 0.5 ? -1 : 1;
      const up = (120 + rand() * 300) * (0.45 + strength * 0.75);
      this.drops.push({
        x: x + side * rand() * 22,
        y: y - 2,
        vx: side * (20 + rand() * 150) * (0.5 + strength * 0.6),
        vy: -up,
        r: 1 + rand() * 2.6 * (0.6 + strength * 0.6),
        life: 1,
      });
    }
    for (let i = 0; i < 2 + Math.round(strength * 2); i++) {
      this.rings.push({ x, r: 6 + i * 6, speed: 60 + i * 35 + strength * 60, life: 1, max: 1.1 + i * 0.3 });
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
      if (d.vy > 0 && d.y > surfaceWave(d.x, time)) {
        d.life = 0;
        if (d.r > 2.2) this.rings.push({ x: d.x, r: 2, speed: 18, life: 1, max: 0.6 });
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
      const y = surfaceWave(r.x, time);
      g.ellipse(r.x, y + 1, r.r, Math.max(1.5, r.r * 0.12)).stroke({ color: 0xffffff, width: 1.6, alpha: 0.7 * r.life });
      // Bits of foam on the ring.
      for (let k = 0; k < 4; k++) {
        const a = k * 1.7 + r.x;
        g.circle(r.x + Math.cos(a) * r.r, y + 1 + Math.sin(a) * r.r * 0.12, 1.4).fill({ color: 0xffffff, alpha: 0.55 * r.life });
      }
    }
    this.rings = this.rings.filter((r) => r.life > 0);

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
    l.moveTo(x0, surfaceWave(x0, time));
    for (let x = x0 + step; x <= viewX1 + step; x += step) l.lineTo(x, surfaceWave(x, time));
    l.stroke({ color: 0xffffff, width: 1.6, alpha: 0.5 });
    // A thin, faint film of water just under the line.
    l.moveTo(x0, surfaceWave(x0, time));
    for (let x = x0 + step; x <= viewX1 + step; x += step) l.lineTo(x, surfaceWave(x, time));
    for (let x = viewX1 + step; x >= x0; x -= step) l.lineTo(x, surfaceWave(x, time) + 7);
    l.closePath().fill({ color: 0xcfeee8, alpha: 0.13 });
  }
}
