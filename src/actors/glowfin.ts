import { Container, Graphics } from 'pixi.js';
import { mulberry32 } from '../rng';
import { isSolid } from '../world/terrain';
import type { PointLight } from '../world/scenery';

/**
 * Glowfins from the kit sheet: small striped fish with a glowing lure on a
 * stalk above the head. In this milestone they are scenery that wanders
 * around the grotto and shies away from the diver; they can also be kept: their
 * egg clutches in the grotto go in the specimen jar (milestone 4).
 */

const rand = mulberry32(0x61f1);

interface Look {
  body: number;
  stripe: number;
  belly: number;
  lure: number;
  light: [number, number, number];
}

const LOOKS: Look[] = [
  { body: 0xc4697d, stripe: 0x8e3f55, belly: 0xe2a7a6, lure: 0xfff2a8, light: [1.0, 0.92, 0.55] },
  { body: 0x6f9cc0, stripe: 0x3f6688, belly: 0xb8d2de, lure: 0xf3f7b0, light: [0.9, 0.95, 0.6] },
];

export class Glowfin {
  readonly view = new Container();
  readonly lure = new Graphics();
  readonly halo = new Graphics();
  readonly light: PointLight;

  private tail = new Graphics();
  private x: number;
  private y: number;
  private vx = 0;
  private vy = 0;
  private tx = 0;
  private ty = 0;
  private face = 1;
  private faceAnim = 1;
  private wiggle = rand() * 6;
  private retarget = 0;

  constructor(
    look: number,
    private readonly area: { x0: number; x1: number; y0: number; y1: number },
  ) {
    const L = LOOKS[look % LOOKS.length];
    this.x = area.x0 + rand() * (area.x1 - area.x0);
    this.y = area.y0 + rand() * (area.y1 - area.y0);
    const g = new Graphics();
    // Soft rounded dorsal fin (shallows creatures stay gentle: no spikes or teeth).
    g.moveTo(-10, -7).bezierCurveTo(-8, -16, 4, -17, 7, -8).closePath().fill({ color: L.stripe });
    // Body.
    g.ellipse(0, 0, 20, 9.5).fill({ color: L.body });
    g.ellipse(2, 4, 16, 4.5).fill({ color: L.belly, alpha: 0.7 });
    for (const x of [-9, -3, 3, 9]) g.moveTo(x, -8.5).quadraticCurveTo(x + 2, 0, x, 8.5).stroke({ color: L.stripe, width: 2, alpha: 0.8 });
    // A big friendly eye with catchlights, and a small closed smile.
    g.circle(12.5, -2, 3.6).fill({ color: L.belly, alpha: 0.6 });
    g.circle(12.5, -2, 3).fill({ color: 0x1a1414 });
    g.circle(13.4, -3, 1.1).fill({ color: 0xffffff, alpha: 0.9 });
    g.circle(11.6, -1, 0.5).fill({ color: 0xffffff, alpha: 0.7 });
    g.moveTo(16.5, 2.5).quadraticCurveTo(18, 3.8, 19.2, 2.4).stroke({ color: 0x4a2222, width: 0.7, alpha: 0.7 });
    // Lure stalk.
    g.moveTo(12, -8).bezierCurveTo(14, -20, 24, -24, 28, -18).stroke({ color: L.stripe, width: 1.4 });
    // Pectoral fin.
    g.moveTo(4, 2).lineTo(-3, 9).lineTo(6, 6).closePath().fill({ color: L.stripe, alpha: 0.8 });
    this.tail.moveTo(0, 0).lineTo(-11, -9).quadraticCurveTo(-7, 0, -11, 9).closePath().fill({ color: L.body });
    this.tail.moveTo(-2, 0).lineTo(-9, -6).stroke({ color: L.stripe, width: 1.2 });
    this.tail.x = -18;
    this.view.addChild(this.tail, g);
    this.view.scale.set(1.1);

    this.lure.circle(0, 0, 3).fill({ color: L.lure });
    this.halo.circle(0, 0, 16).fill({ color: L.lure });
    this.light = { x: this.x, y: this.y, radius: 150, intensity: 0.8, color: L.light };
    this.pickTarget();
  }

  private pickTarget(): void {
    const a = this.area;
    for (let i = 0; i < 10; i++) {
      this.tx = a.x0 + rand() * (a.x1 - a.x0);
      this.ty = a.y0 + rand() * (a.y1 - a.y0);
      if (!isSolid(this.tx, this.ty)) break;
    }
    this.retarget = 3 + rand() * 4;
  }

  update(dt: number, time: number, diverX: number, diverY: number): void {
    this.retarget -= dt;
    let ax = this.tx - this.x;
    let ay = this.ty - this.y;
    const d = Math.hypot(ax, ay);
    if (d < 20 || this.retarget <= 0) this.pickTarget();
    ax /= d || 1;
    ay /= d || 1;
    let speed = 55;
    // Shy: dart away when the diver comes close.
    const fx = this.x - diverX;
    const fy = this.y - diverY;
    const fd = Math.hypot(fx, fy);
    if (fd < 160) {
      const k = (1 - fd / 160) * 2.5;
      ax += (fx / (fd || 1)) * k;
      ay += (fy / (fd || 1)) * k;
      speed = 140;
    }
    const l = Math.hypot(ax, ay) || 1;
    const k = 1 - Math.exp(-2 * dt);
    this.vx += ((ax / l) * speed - this.vx) * k;
    this.vy += ((ay / l) * speed * 0.6 - this.vy) * k;
    const nx = this.x + this.vx * dt;
    const ny = this.y + this.vy * dt;
    if (!isSolid(nx, ny) && nx > this.area.x0 - 100 && nx < this.area.x1 + 100) {
      this.x = nx;
      this.y = ny;
    } else {
      this.vx *= -0.5;
      this.vy *= -0.5;
      this.pickTarget();
    }

    if (this.vx > 8) this.face = 1;
    else if (this.vx < -8) this.face = -1;
    this.faceAnim += (this.face - this.faceAnim) * Math.min(1, dt * 6);
    const sp = Math.hypot(this.vx, this.vy);
    this.wiggle += dt * (4 + sp * 0.08);
    this.tail.rotation = Math.sin(this.wiggle) * 0.35;
    this.view.position.set(this.x, this.y + Math.sin(time * 1.7 + this.wiggle * 0.1) * 2);
    this.view.scale.x = 1.1 * (Math.abs(this.faceAnim) < 0.1 ? 0.1 * this.face : this.faceAnim);
    this.view.rotation = Math.atan2(this.vy, Math.abs(this.vx) + 20) * 0.5 * this.face;

    // The lure sits at the end of the stalk; work out where that is in the world.
    const lx = 28 * 1.1 * this.view.scale.x / 1.1;
    const ly = -18 * 1.1;
    const c = Math.cos(this.view.rotation);
    const s = Math.sin(this.view.rotation);
    const wx = this.view.x + lx * c - ly * s;
    const wy = this.view.y + lx * s + ly * c;
    this.lure.position.set(wx, wy);
    this.halo.position.set(wx, wy);
    const pulse = 0.8 + 0.2 * Math.sin(time * 3 + this.wiggle * 0.2);
    this.halo.alpha = 0.7 * pulse;
    this.light.x = wx;
    this.light.y = wy;
    this.light.intensity = 0.75 * pulse;
  }
}
