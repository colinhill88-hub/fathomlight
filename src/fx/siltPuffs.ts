import { Graphics } from 'pixi.js';

/*
 * Phase 17b: puffs of silt kicked up by the mag-boots. Each step lifts a small
 * cloud either side of the boot; a landing throws a wider ring. The grains
 * spread sideways along the bottom, rise a little, swell and fade, in the
 * seabed's own dull sand colour. Drawn in the lit layer, so the lamp and the
 * depth colour it like the rest of the seabed.
 */

interface Grain {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  max: number;
  a: number;
}

const MAX = 160;

export class SiltPuffs {
  readonly view = new Graphics();
  private grains: Grain[] = [];

  /** A puff at a point on the seabed. `k` 0..1: a light step to a hard landing. */
  puff(x: number, y: number, k: number): void {
    const n = Math.round(5 + 14 * k);
    for (let i = 0; i < n && this.grains.length < MAX; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const sp = (20 + Math.random() * 50) * (0.6 + 0.9 * k);
      this.grains.push({
        x: x + side * Math.random() * 8,
        y: y - Math.random() * 3,
        vx: side * sp,
        vy: -(8 + Math.random() * 22) * (0.6 + 0.7 * k),
        r: 2.5 + Math.random() * 3 + 3 * k,
        life: 0,
        max: 0.9 + Math.random() * 0.8 + 0.8 * k,
        a: 0.18 + 0.14 * k + Math.random() * 0.08,
      });
    }
  }

  update(dt: number): void {
    const g = this.view.clear();
    if (!this.grains.length) return;
    const keep: Grain[] = [];
    for (const p of this.grains) {
      p.life += dt;
      if (p.life >= p.max) continue;
      // Water drag slows them quickly; they drift up a touch and settle.
      const drag = Math.exp(-3.2 * dt);
      p.vx *= drag;
      p.vy = p.vy * drag + 6 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const u = p.life / p.max;
      const r = p.r * (1 + 1.6 * u);
      const alpha = p.a * (u < 0.12 ? u / 0.12 : 1 - (u - 0.12) / 0.88);
      g.circle(p.x, p.y, r).fill({ color: 0xa39a80, alpha });
      g.circle(p.x - r * 0.2, p.y - r * 0.25, r * 0.55).fill({ color: 0xc4b896, alpha: alpha * 0.6 });
      keep.push(p);
    }
    this.grains = keep;
  }
}
