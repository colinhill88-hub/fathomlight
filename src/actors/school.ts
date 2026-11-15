import { Container, Graphics } from 'pixi.js';
import { mulberry32 } from '../rng';
import { isSolid } from '../world/terrain';

/**
 * Silverbars: small schooling fish of the shallows. Silver with one dark
 * band behind the gill and a yellowish tail. The school drifts between spots
 * in its home area; each fish keeps its own place in the school, wobbles
 * around it and scatters when the diver swims through, then regroups.
 */

const rand = mulberry32(0x5b17);

interface Fish {
  g: Container;
  tail: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ox: number;
  oy: number;
  phase: number;
  face: number;
}

function drawFish(): { g: Container; tail: Graphics } {
  const g = new Container();
  const body = new Graphics();
  const tail = new Graphics();
  body.ellipse(0, 0, 9, 3.4).fill({ color: 0xb9c4c2 });
  body.ellipse(1, 1.4, 7, 1.6).fill({ color: 0xe6ece6, alpha: 0.8 });
  body.ellipse(0, -1.6, 7.5, 1.4).fill({ color: 0x6f7f84, alpha: 0.8 });
  body.rect(1.5, -3.2, 2.2, 6.4).fill({ color: 0x2a3236, alpha: 0.85 });
  body.circle(6, -0.6, 0.9).fill({ color: 0x141414 });
  tail.moveTo(0, 0).lineTo(-5, -3.4).lineTo(-4, 0).lineTo(-5, 3.4).closePath().fill({ color: 0xc9b46a });
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

  constructor(
    count: number,
    private readonly area: { x0: number; x1: number; y0: number; y1: number },
  ) {
    this.cx = (area.x0 + area.x1) / 2;
    this.cy = (area.y0 + area.y1) / 2;
    this.pickTarget();
    for (let i = 0; i < count; i++) {
      const { g, tail } = drawFish();
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand());
      const f: Fish = {
        g,
        tail,
        ox: Math.cos(a) * r * 70,
        oy: Math.sin(a) * r * 34,
        x: this.cx,
        y: this.cy,
        vx: 0,
        vy: 0,
        phase: rand() * 10,
        face: 1,
      };
      f.x += f.ox;
      f.y += f.oy;
      g.scale.set(0.85 + rand() * 0.35);
      this.view.addChild(g);
      this.fish.push(f);
    }
  }

  private pickTarget(): void {
    const a = this.area;
    for (let i = 0; i < 12; i++) {
      this.tx = a.x0 + rand() * (a.x1 - a.x0);
      this.ty = a.y0 + rand() * (a.y1 - a.y0);
      if (!isSolid(this.tx, this.ty + 40) && !isSolid(this.tx, this.ty - 40)) break;
    }
    this.retarget = 6 + rand() * 6;
  }

  update(dt: number, time: number, diverX: number, diverY: number, viewX0: number, viewX1: number): void {
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

    for (const f of this.fish) {
      // Each fish wants to be at its place in the school, plus a slow wobble.
      const wx = this.cx + f.ox + Math.sin(time * 0.7 + f.phase) * 14;
      const wy = this.cy + f.oy + Math.sin(time * 0.9 + f.phase * 1.7) * 8;
      let ax = (wx - f.x) * 1.4;
      let ay = (wy - f.y) * 1.4;
      // Scatter away from the diver.
      const fx = f.x - diverX;
      const fy = f.y - diverY;
      const fd = Math.hypot(fx, fy);
      if (fd < 130) {
        const k = (1 - fd / 130) * 900;
        ax += (fx / (fd || 1)) * k;
        ay += (fy / (fd || 1)) * k;
      }
      f.vx += ax * dt;
      f.vy += ay * dt;
      const sp = Math.hypot(f.vx, f.vy);
      const max = fd < 130 ? 260 : 90;
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
      f.g.scale.x = Math.abs(f.g.scale.y) * f.face;
      f.g.rotation = Math.atan2(f.vy, Math.abs(f.vx) + 15) * 0.6 * f.face;
      f.tail.rotation = Math.sin(time * (8 + Math.min(sp, 200) * 0.06) + f.phase) * 0.4;
    }
  }
}
