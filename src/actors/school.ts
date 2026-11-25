import { Container, Graphics } from 'pixi.js';
import { mulberry32 } from '../rng';
import { isSolid } from '../world/terrain';
import type { WaterMotion } from '../scene/waterMotion';
import { Silverbar } from './silverbar';

/**
 * Silverbars: small schooling fish of the shallows. Silver with one dark
 * band behind the gill and a yellowish tail. The school drifts between spots
 * in its home area; each fish keeps its own place in the school, wobbles
 * around it and scatters when the diver swims through, then regroups.
 */

const rand = mulberry32(0x5b17);

export type AmbientSpecies = 'silverbar' | 'anthias' | 'perch' | 'jelly' | 'lanternfish';

interface Fish {
  g: Container;
  tail?: Graphics;
  silverbar?: Silverbar;
  isJelly?: boolean;
  baseScale: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ox: number;
  oy: number;
  phase: number;
  face: number;
}

function drawFish(kind: AmbientSpecies = 'silverbar'): { g: Container; tail?: Graphics; isJelly?: boolean } {
  const g = new Container();
  const body = new Graphics();
  if (kind === 'jelly') {
    // Delicate translucent pulsing Moon Jelly drifter (smooth dome bell + glowing clover core + wispy silk tentacles).
    const domePts: number[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI + (i / 20) * Math.PI;
      domePts.push(Math.cos(a) * 8.5, 1 + Math.sin(a) * 6.5);
    }
    domePts.push(4.5, 2.2, 0, 1.4, -4.5, 2.2);
    body.poly(domePts)
      .fill({ color: 0xf6e6c8, alpha: 0.44 })
      .stroke({ color: 0xffd592, width: 0.9, alpha: 0.68 });
    body.ellipse(0, -1.6, 5.2, 2.6).fill({ color: 0xfff8e2, alpha: 0.36 });
    body.circle(-1.6, -1.4, 1.3).fill({ color: 0xffe4a4, alpha: 0.52 });
    body.circle(1.6, -1.4, 1.3).fill({ color: 0xffe4a4, alpha: 0.52 });
    const tail = new Graphics();
    for (const [tx, len, w] of [[-4.8, 11, 0.7], [-1.8, 15, 0.85], [1.8, 14, 0.85], [4.8, 10.5, 0.7]] as const) {
      tail.moveTo(tx, 1.4).bezierCurveTo(tx + 1.8, len * 0.4, tx - 1.8, len * 0.75, tx + 0.6, len)
        .stroke({ color: 0xffe2ac, width: w, alpha: 0.52, cap: 'round' });
    }
    g.addChild(tail, body);
    return { g, tail, isJelly: true };
  }
  const tail = new Graphics();
  if (kind === 'anthias') {
    // Golden Reef Anthias: warm coral-peach body with forked golden lyretail.
    body.ellipse(0, 0, 8.5, 3.6).fill({ color: 0xe67c52 });
    body.ellipse(0.5, 1.4, 6.8, 1.7).fill({ color: 0xffc684, alpha: 0.85 });
    body.ellipse(-0.5, -1.8, 6.5, 1.4).fill({ color: 0xc24838, alpha: 0.75 });
    body.circle(5.5, -0.6, 0.9).fill({ color: 0x181210 });
    tail.moveTo(0, 0).lineTo(-6, -4.4).lineTo(-3.5, 0).lineTo(-6, 4.4).closePath().fill({ color: 0xf2b84c });
  } else if (kind === 'perch') {
    // Striped Kelp Perch: olive-brass reef fish with vertical kelp camouflage bars.
    body.ellipse(0, 0, 9.5, 4.1).fill({ color: 0x7b8c52 });
    body.ellipse(0.5, 1.8, 7.5, 1.8).fill({ color: 0xd4d29a, alpha: 0.78 });
    for (const bx of [-3, 0.5, 3.5]) body.rect(bx, -3.5, 1.6, 7).fill({ color: 0x2e3b24, alpha: 0.75 });
    body.circle(6.2, -0.7, 0.95).fill({ color: 0x141612 });
    tail.moveTo(0, 0).lineTo(-5.5, -3.8).lineTo(-4.2, 0).lineTo(-5.5, 3.8).closePath().fill({ color: 0x9aa454 });
  } else if (kind === 'lanternfish') {
    // Abyssal Lanternfish: sleek deep-slate body with warm-gold bioluminescent photophore dots.
    body.ellipse(0, 0, 8, 3.0).fill({ color: 0x2c3c48 });
    body.ellipse(0.5, -1.2, 6, 1.2).fill({ color: 0x4c6878, alpha: 0.65 });
    for (const px of [-4, -1.5, 1, 3.5]) body.circle(px, 1.4, 0.95).fill({ color: 0xffd878, alpha: 0.95 });
    body.circle(5.2, -0.4, 1.0).fill({ color: 0xffe8a0, alpha: 0.9 });
    tail.moveTo(0, 0).lineTo(-4.8, -3.0).lineTo(-3.6, 0).lineTo(-4.8, 3.0).closePath().fill({ color: 0x486272 });
  } else {
    body.ellipse(0, 0, 9, 3.4).fill({ color: 0xb9c4c2 });
    body.ellipse(1, 1.4, 7, 1.6).fill({ color: 0xe6ece6, alpha: 0.8 });
    body.ellipse(0, -1.6, 7.5, 1.4).fill({ color: 0x6f7f84, alpha: 0.8 });
    body.rect(1.5, -3.2, 2.2, 6.4).fill({ color: 0x2a3236, alpha: 0.85 });
    body.circle(6, -0.6, 0.9).fill({ color: 0x141414 });
    tail.moveTo(0, 0).lineTo(-5, -3.4).lineTo(-4, 0).lineTo(-5, 3.4).closePath().fill({ color: 0xc9b46a });
  }
  tail.x = -8;
  g.addChild(tail, body);
  return { g, tail };
}

export class School {
  readonly view = new Container();
  /** Middle of the school, for the scanner. */
  cx: number;
  cy: number;
  private tx = 0;
  private ty = 0;
  private retarget = 0;
  private fish: Fish[] = [];
  private readonly flow = { x: 0, y: 0, silt: 0, energy: 0 };
  private wakeDelay = 0;

  constructor(
    count: number,
    private readonly area: { x0: number; x1: number; y0: number; y1: number },
    private readonly living = false,
    private readonly random = rand,
    visualSize = 1,
    private readonly species: AmbientSpecies = 'silverbar',
  ) {
    this.cx = (area.x0 + area.x1) / 2;
    this.cy = (area.y0 + area.y1) / 2;
    this.pickTarget();
    const useSilverbarRig = living && this.species === 'silverbar';
    for (let i = 0; i < count; i++) {
      const { g, tail, isJelly } = useSilverbarRig ? { g: new Container(), tail: undefined, isJelly: false } : drawFish(this.species);
      const a = this.random() * Math.PI * 2;
      const r = Math.sqrt(this.random());
      const size = (0.85 + this.random() * 0.35) * visualSize;
      const f: Fish = {
        g,
        tail,
        isJelly,
        baseScale: size,
        ox: Math.cos(a) * r * (isJelly ? 95 : 70),
        oy: Math.sin(a) * r * (isJelly ? 52 : 34),
        x: this.cx,
        y: this.cy,
        vx: 0,
        vy: 0,
        phase: this.random() * 10,
        face: 1,
      };
      f.x += f.ox;
      f.y += f.oy;
      g.scale.set(size);
      if (useSilverbarRig) f.silverbar = new Silverbar(g, f.phase, size);
      this.view.addChild(g);
      this.fish.push(f);
    }
  }

  private pickTarget(): void {
    const a = this.area;
    for (let i = 0; i < 12; i++) {
      this.tx = a.x0 + this.random() * (a.x1 - a.x0);
      this.ty = a.y0 + this.random() * (a.y1 - a.y0);
      if (!isSolid(this.tx, this.ty + 40) && !isSolid(this.tx, this.ty - 40)) break;
    }
    this.retarget = 6 + this.random() * 6;
  }

  update(dt: number, time: number, diverX: number, diverY: number, viewX0: number, viewX1: number, water?: WaterMotion): void {
    // The school drifts slowly towards its current target.
    this.retarget -= dt;
    const dx = this.tx - this.cx;
    const dy = this.ty - this.cy;
    const d = Math.hypot(dx, dy);
    if (d < 30 || this.retarget <= 0) this.pickTarget();
    this.cx += (dx / (d || 1)) * 38 * dt;
    this.cy += (dy / (d || 1)) * 22 * dt;
    const heading = Math.sign(dx) || 1;

    const visible = this.cx > viewX0 - 300 && this.cx < viewX1 + 300;
    this.view.visible = visible;
    const waterY = this.living && visible && water ? water.sample(this.cx, this.cy, this.flow).y : 0;
    this.wakeDelay = Math.max(0, this.wakeDelay - dt);

    for (const f of this.fish) {
      // Each fish wants to be at its place in the school, plus a slow wobble.
      const wx = this.cx + f.ox + Math.sin(time * 0.7 + f.phase) * 14;
      const wy = this.cy + f.oy + Math.sin(time * 0.9 + f.phase * 1.7) * 8;
      let ax = (wx - f.x) * 1.4;
      let ay = (wy - f.y) * 1.4;
      // Dynamic reactive behavior around Kestrel:
      // - Close range (< 95): part smoothly around her in a shimmering bait-ball split.
      // - Mid range (95..265): curiously swirl and school gracefully around her flank!
      const fx = f.x - diverX;
      const fy = f.y - diverY;
      const fd = Math.hypot(fx, fy);
      const closeR = f.isJelly ? 120 : 95;
      if (fd < closeR) {
        const k = (1 - fd / closeR) * (f.isJelly ? 460 : 880);
        ax += (fx / (fd || 1)) * k;
        ay += (fy / (fd || 1)) * k;
      } else if (fd < 265 && !f.isJelly) {
        const ux = fx / (fd || 1);
        const uy = fy / (fd || 1);
        const orbitPull = (1 - fd / 265) * 145;
        // Swirl tangentially around Kestrel + gently hold a comfortable ~125px companion ring.
        const swirlDir = (f.phase % 2) > 1 ? 1 : -1;
        ax += (-uy * swirlDir * 1.15 + (125 - fd) * 0.008 * ux) * orbitPull;
        ay += (ux * swirlDir * 0.85 + (125 - fd) * 0.008 * uy) * orbitPull;
      }
      f.vx += ax * dt;
      f.vy += ay * dt;
      const sp = Math.hypot(f.vx, f.vy);
      const max = f.isJelly ? (fd < 120 ? 120 : 55) : fd < 105 ? 250 : fd < 265 ? 145 : 92;
      if (sp > max) {
        f.vx *= max / sp;
        f.vy *= max / sp;
      }
      f.vx *= 1 - Math.min(1, dt * 1.2);
      f.vy *= 1 - Math.min(1, dt * 1.2);
      const nx = f.x + f.vx * dt;
      const ny = f.y + f.vy * dt;
      if (!isSolid(nx, ny) && ny > 20) {
        f.x = nx;
        f.y = ny;
      } else {
        f.vy -= 40;
      }
      if (!visible) continue;
      if (f.vx > 6) f.face = 1;
      else if (f.vx < -6) f.face = -1;
      else if (Math.abs(f.vx) < 2) f.face = heading;
      f.g.position.set(f.x, f.y);
      if (f.silverbar) {
        f.silverbar.update(f.g, dt, f.vx, f.vy, f.face, Math.min(1, sp / 130), waterY);
        if (water && !this.wakeDelay && fd < 266 && sp > 125) {
          const tip = f.silverbar.tailTip;
          water.disturb({ x: tip.x, y: tip.y, vx: -f.vx * 0.35, vy: -f.vy * 0.35, radius: 32, strength: 0.28 });
          this.wakeDelay = 0.38;
        }
      } else if (f.isJelly && f.tail) {
        const pulse = Math.sin(time * 2.8 + f.phase);
        f.g.scale.set(f.baseScale * (1 + pulse * 0.10), f.baseScale * (1 - pulse * 0.08));
        f.g.rotation = Math.max(-0.35, Math.min(0.35, f.vx * 0.005));
        f.tail.scale.y = 0.88 + 0.16 * Math.sin(time * 2.8 + f.phase - 0.7);
      } else if (f.tail) {
        f.g.scale.set(f.baseScale * f.face, f.baseScale);
        f.g.rotation = Math.atan2(f.vy, Math.abs(f.vx) + 15) * 0.6 * f.face;
        f.tail.rotation = Math.sin(time * (8 + Math.min(sp, 200) * 0.06) + f.phase) * 0.4;
      }
    }
  }
}
