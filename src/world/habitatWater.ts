import { Container, FillGradient, Graphics } from 'pixi.js';

export interface WaterBox { x: number; y: number; w: number; h: number }

interface Ripple {
  x: number;
  y: number;
  vx: number;
  vy: number;
  strength: number;
  age: number;
}

const depth = new FillGradient({
  type: 'linear', start: { x: 0.4, y: 0 }, end: { x: 0.6, y: 1 },
  colorStops: [
    { offset: 0, color: 0x76b5a9 },
    { offset: 0.2, color: 0x327b79 },
    { offset: 0.68, color: 0x204e59 },
    { offset: 1, color: 0x153940 },
  ],
});

const EDGE = 2;
const WAVE_COUNT = 5;
const RIPPLE_LIFE = 1.25;
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));

/** A closed recirculating tank. The water state and currents here are render-only. */
export class HabitatWater {
  readonly back = new Container();
  readonly front = new Container();
  private readonly surface = new Graphics();
  private readonly beds = new Graphics();
  private readonly suspended = new Graphics();
  private readonly dirt = new Graphics();
  private readonly particles: number;
  private readonly ripples: Ripple[] = [];
  private scrubTime = 0;
  private drawAgain = 0;
  private rippleDelay = 0;
  private clarity = -1;
  private visible = false;

  constructor(private readonly box: WaterBox, private readonly seed: number) {
    const { x, y, w, h } = box;
    const backdrop = new Graphics().rect(x + EDGE, y + EDGE, w - EDGE * 2, h * 0.9).fill({ fill: depth, alpha: 0.86 });
    // A softly lit plane behind the creatures suggests a curved pressure window.
    backdrop.moveTo(x + w * 0.07, y + 8).lineTo(x + w * 0.38, y + 8)
      .quadraticCurveTo(x + w * 0.39, y + h * 0.55, x + w * 0.49, y + h * 0.8)
      .lineTo(x + w * 0.23, y + h * 0.86).quadraticCurveTo(x + w * 0.12, y + h * 0.47, x + w * 0.07, y + 8)
      .fill({ color: 0xc5ecba, alpha: 0.12 });
    const edge = new Graphics().roundRect(x + 2, y + 2, w - 4, h - 4, 5).stroke({ color: 0x8db8a5, width: 1.2, alpha: 0.55 })
      .moveTo(x + 4, y + h * 0.18).lineTo(x + 4, y + h * 0.81).stroke({ color: 0xe1edc7, width: 2, alpha: 0.32 });
    this.particles = Math.min(23, Math.ceil(w / 25 + 6));
    this.back.addChild(backdrop, this.beds);
    this.front.addChild(this.dirt, this.suspended, this.surface, edge);
    this.dirt.rect(x, y, w, h).fill(0x829264)
      .rect(x + 2, y + h * 0.76, w - 4, h * 0.23).fill(0x5f6e46);
  }

  ripple(x: number, y: number, vx: number, vy: number, strength: number): void {
    const b = this.box;
    if (this.rippleDelay > 0 || x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) return;
    if (this.ripples.length >= WAVE_COUNT) this.ripples.shift();
    this.ripples.push({ x, y, vx, vy, strength, age: 0 });
    this.rippleDelay = 0.17;
  }

  scrub(): void {
    this.scrubTime = 1.6;
    const b = this.box;
    this.rippleDelay = 0;
    this.ripple(b.x + b.w * 0.84, b.y + b.h * 0.68, -25, -18, 0.9);
  }

  flow(x: number, y: number, time: number, filtered: boolean): number {
    const b = this.box;
    const u = clamp((x - b.x) / b.w, 0, 1);
    const v = clamp((y - b.y) / b.h, 0, 1);
    let drift = 0.14 * Math.sin(time * 0.65 + this.seed + u * 4 - v * 2);
    if (filtered) drift += (v - 0.5) * 0.8 * (0.28 + 0.72 * u);
    for (const p of this.ripples) {
      const d = Math.hypot(x - p.x, y - p.y) / 52;
      if (d < 1) drift += (1 - d) * (1 - p.age / RIPPLE_LIFE) * p.strength * 0.37 * Math.sign(p.vx);
    }
    return clamp(drift, -0.7, 0.7);
  }

  update(dt: number, time: number, quality: number, filtered: boolean, visible: boolean): void {
    this.scrubTime = Math.max(0, this.scrubTime - dt);
    this.rippleDelay = Math.max(0, this.rippleDelay - dt);
    this.drawAgain = Math.max(0, this.drawAgain - dt);
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const p = this.ripples[i];
      p.age += dt;
      if (p.age >= RIPPLE_LIFE) this.ripples.splice(i, 1);
    }
    if (this.clarity < 0) this.clarity = quality;
    this.clarity += (quality - this.clarity) * (1 - Math.exp(-dt * (this.scrubTime > 0 ? 2.7 : 0.9)));
    if (!visible) {
      this.visible = false;
      return;
    }
    this.dirt.alpha = (1 - this.clarity) * 0.34;
    if (this.visible && this.drawAgain > 0) return;
    this.visible = true;
    this.drawAgain = 1 / 20;
    this.paint(time, filtered);
  }

  private paint(time: number, filtered: boolean): void {
    const { x, y, w, h } = this.box;
    const { beds, surface, suspended } = this;
    beds.clear();
    surface.clear();
    suspended.clear();
    const t = time + this.seed * 0.37;
    for (let i = 0; i < 5; i++) {
      const cx = x + w * (0.14 + i * 0.18 + Math.sin(t * 0.83 + i * 1.3) * 0.04);
      const cy = y + h * (0.77 + Math.sin(t * 0.67 - i) * 0.06);
      const span = w * 0.09;
      beds.moveTo(cx - span, cy).quadraticCurveTo(cx - 3, cy - h * 0.12, cx + span, cy - h * 0.05)
        .quadraticCurveTo(cx, cy - h * 0.025, cx - span, cy).fill({ color: 0xc6dfa0, alpha: 0.06 + this.clarity * 0.12 });
    }

    const samples = Math.max(10, Math.min(31, Math.round(w / 22)));
    for (let stripe = 0; stripe < 2; stripe++) {
      for (let i = 0; i <= samples; i++) {
        const u = i / samples;
        const py = y + 5 + stripe * 4 + Math.sin(u * 13 - t * 1.8) * (2.3 - stripe * 0.6)
          + Math.sin(u * 29 + t * 0.9) * 0.7;
        if (i === 0) surface.moveTo(x + 3, py);
        else surface.lineTo(x + 3 + u * (w - 6), py);
      }
      surface.stroke({ color: stripe ? 0x94caba : 0xd3eac3, width: stripe ? 0.9 : 1.5, alpha: stripe ? 0.26 : 0.58 });
    }
    for (let i = 0; i < this.particles; i++) {
      const u = ((i * 0.61803398875 + this.seed * 0.117) % 1 + 1) % 1;
      const v = ((i * 0.377 + t * 0.027) % 1 + 1) % 1;
      const cx = x + 8 + u * (w - 16);
      const cy = y + 9 + (h - 18) * v;
      const drift = this.flow(cx, cy, time, filtered);
      const px = clamp(cx + 5 * Math.sin(t + i * 1.9) + drift * 12, x + 5, x + w - 5);
      const fade = Math.sin(v * Math.PI);
      suspended.circle(px, cy, 0.65 + (i % 3) * 0.33)
        .fill({ color: this.clarity > 0.55 ? 0xc9dfb3 : 0xc5ad75, alpha: fade * (0.23 + (1 - this.clarity) * 0.28) });
    }
    if (filtered || this.scrubTime > 0) {
      const extra = this.scrubTime / 1.6;
      for (let i = 0; i < 7; i++) {
        const v = ((t * (0.28 + extra * 0.44) + i / 7) % 1 + 1) % 1;
        const cx = x + w - 16 - v * (w * 0.16) + Math.sin(i + t * 2) * 3;
        const cy = y + h * (0.88 - v * 0.7);
        suspended.circle(cx, cy, 0.85 + i % 3 * 0.6).stroke({ color: 0xe1f3d0, width: 0.8, alpha: Math.sin(v * Math.PI) * (0.41 + extra * 0.3) });
      }
    }
    for (const p of this.ripples) {
      const rx = clamp(p.x + p.vx * p.age * 0.38, x + 5, x + w - 5);
      const ry = clamp(p.y + p.vy * p.age * 0.38, y + 5, y + h - 5);
      const radius = Math.min(6 + p.age * 22, rx - x - 2, x + w - rx - 2);
      const height = Math.min(radius * 0.24, ry - y - 2, y + h - ry - 2);
      surface.ellipse(rx, ry, radius, height).stroke({ color: 0xc1ecd0, width: 1.1, alpha: p.strength * 0.63 * (1 - p.age / RIPPLE_LIFE) });
    }
  }
}
