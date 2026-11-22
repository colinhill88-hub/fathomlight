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

/** Phase 21, living tanks: a soft wake behind swimmers, and a creature breaking the surface. */
interface Mote { x: number; y: number; vx: number; vy: number; age: number; life: number; r: number }
interface SurfaceWave { x: number; age: number; strength: number }
interface Drop { x: number; y: number; vx: number; vy: number; age: number }
const MOTE_CAP = 36;
const WAVE_LIFE = 2.2;
/** How fast a surface ripple runs along the water line (units a second). */
const WAVE_SPEED = 70;

/** A tiny seeded random for the fixed sand and pebbles. */
function seeded(n: number): () => number {
  let a = (n * 2654435761) >>> 0 || 1;
  return () => {
    a ^= a << 13;
    a ^= a >>> 17;
    a ^= a << 5;
    return ((a >>> 0) % 10000) / 10000;
  };
}

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
  private readonly caustics = new Graphics();
  private readonly motes: Mote[] = [];
  private readonly waves: SurfaceWave[] = [];
  private readonly drops: Drop[] = [];

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
    // Phase 21: a sand bed along the bottom with pebbles and a few shells, lit from above.
    const sand = new Graphics();
    const r = seeded(seed + 101);
    const top = y + h * 0.9;
    sand.moveTo(x + EDGE, y + h - EDGE);
    for (let i = 0; i <= 12; i++) sand.lineTo(x + EDGE + ((w - EDGE * 2) * i) / 12, top + Math.sin(i * 1.7 + seed) * h * 0.018 + (r() - 0.5) * h * 0.015);
    sand.lineTo(x + w - EDGE, y + h - EDGE).closePath().fill({ color: 0xb49a6a, alpha: 0.85 });
    sand.rect(x + EDGE, top + h * 0.035, w - EDGE * 2, h * 0.07).fill({ color: 0x8a7350, alpha: 0.45 });
    const pebbles = Math.round(w / 9);
    for (let i = 0; i < pebbles; i++) {
      const px = x + 6 + r() * (w - 12);
      const py = top + h * 0.02 + r() * h * 0.07;
      const pr = 0.8 + r() * 2.4;
      const tone = [0x6e6252, 0x9c8a6a, 0x5a5048, 0xc8b48a][Math.floor(r() * 4)];
      sand.ellipse(px, py, pr * 1.3, pr).fill({ color: tone, alpha: 0.9 });
      sand.ellipse(px - pr * 0.3, py - pr * 0.35, pr * 0.5, pr * 0.3).fill({ color: 0xf2e6c8, alpha: 0.35 });
    }
    this.back.addChild(backdrop, this.caustics, sand, this.beds);
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

  /** Phase 21: a swimmer's wake: a few motes stirred up behind it that drift and fade. */
  wake(x: number, y: number, vx: number, vy: number): void {
    const b = this.box;
    if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) return;
    if (this.motes.length >= MOTE_CAP) this.motes.shift();
    const j = (this.motes.length * 0.61803398875) % 1;
    this.motes.push({ x: x + (j - 0.5) * 4, y: y + (((j * 7) % 1) - 0.5) * 4, vx: -vx * 0.25 + (j - 0.5) * 6, vy: -vy * 0.25 - 2, age: 0, life: 0.9 + j * 0.8, r: 0.7 + j * 1.1 });
  }

  /**
   * Phase 21: a creature breaks the surface at x: a ripple runs both ways along the water
   * line, a few droplets jump and fall back, and a ring spreads where it came up.
   */
  surfaceBreak(x: number, strength = 1): void {
    const b = this.box;
    this.waves.push({ x, age: 0, strength });
    if (this.waves.length > 4) this.waves.shift();
    for (let i = 0; i < 5; i++) {
      const u = (i - 2) / 2;
      this.drops.push({ x: x + u * 3, y: b.y + 4, vx: u * 16 * strength, vy: -(22 + (2 - Math.abs(u)) * 9) * strength, age: 0 });
    }
    if (this.drops.length > 20) this.drops.splice(0, this.drops.length - 20);
    this.rippleDelay = 0;
    this.ripple(x, b.y + 7, 0, 10, 0.8 * strength);
  }

  /** The water line's height at x (the surface ripples lift and lower it). */
  surfaceY(x: number, time: number): number {
    const t = time + this.seed * 0.37;
    const u = (x - this.box.x - 3) / Math.max(1, this.box.w - 6);
    let py = this.box.y + 5 + Math.sin(u * 13 - t * 1.8) * 2.3 + Math.sin(u * 29 + t * 0.9) * 0.7;
    for (const wv of this.waves) {
      const fade = 1 - wv.age / WAVE_LIFE;
      const front = wv.age * WAVE_SPEED;
      const d = Math.abs(x - wv.x);
      const k = (d - front) / 10;
      py += Math.cos(k * 1.6) * Math.exp(-k * k * 0.5) * 3.2 * wv.strength * fade;
      if (d < 12) py -= (1 - d / 12) * 3 * wv.strength * Math.max(0, 1 - wv.age * 2.5);
    }
    return py;
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
    for (let i = this.waves.length - 1; i >= 0; i--) if ((this.waves[i].age += dt) >= WAVE_LIFE) this.waves.splice(i, 1);
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.age += dt;
      if (m.age >= m.life) {
        this.motes.splice(i, 1);
        continue;
      }
      const drag = Math.exp(-dt * 2.4);
      m.vx *= drag;
      m.vy = m.vy * drag - 1.5 * dt;
      m.x += m.vx * dt + this.flow(m.x, m.y, time, filtered) * 6 * dt;
      m.y += m.vy * dt;
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.age += dt;
      d.vy += 110 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.y > this.box.y + 6 && d.vy > 0) this.drops.splice(i, 1);
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
    // Phase 21: caustic light: soft bright bands that wander across the back of the tank.
    const cg = this.caustics.clear();
    for (let i = 0; i < 4; i++) {
      const cx = x + w * (((i * 0.29 + t * 0.021 * (i % 2 ? 1 : -1)) % 1 + 1) % 1);
      const sway = Math.sin(t * 0.7 + i * 2.1) * w * 0.05;
      cg.moveTo(cx - w * 0.035, y + 8).quadraticCurveTo(cx + sway, y + h * 0.45, cx + sway * 1.6 - w * 0.02, y + h * 0.88)
        .lineTo(cx + sway * 1.6 + w * 0.03, y + h * 0.88).quadraticCurveTo(cx + sway + w * 0.04, y + h * 0.45, cx + w * 0.035, y + 8)
        .fill({ color: 0xe8f6c8, alpha: (0.035 + 0.03 * Math.sin(t * 1.3 + i)) * (0.4 + this.clarity * 0.6) });
    }
    for (let i = 0; i < 9; i++) {
      const cx = x + w * ((i * 0.137 + Math.sin(t * 0.4 + i) * 0.03 + 1) % 1);
      const cy = y + h * (0.86 + Math.sin(i * 2.3) * 0.03);
      cg.ellipse(cx, cy, w * 0.03 * (0.6 + 0.4 * Math.sin(t * 1.7 + i * 1.3)), h * 0.008).fill({ color: 0xf6f0c8, alpha: 0.12 * this.clarity });
    }
    for (let i = 0; i < 5; i++) {
      const cx = x + w * (0.14 + i * 0.18 + Math.sin(t * 0.83 + i * 1.3) * 0.04);
      const cy = y + h * (0.77 + Math.sin(t * 0.67 - i) * 0.06);
      const span = w * 0.09;
      beds.moveTo(cx - span, cy).quadraticCurveTo(cx - 3, cy - h * 0.12, cx + span, cy - h * 0.05)
        .quadraticCurveTo(cx, cy - h * 0.025, cx - span, cy).fill({ color: 0xc6dfa0, alpha: 0.06 + this.clarity * 0.12 });
    }

    const samples = Math.max(10, Math.min(31, Math.round(w / 22)));
    const waving = this.waves.length > 0;
    for (let stripe = 0; stripe < 2; stripe++) {
      for (let i = 0; i <= (waving ? samples * 2 : samples); i++) {
        const u = i / (waving ? samples * 2 : samples);
        const py = stripe === 0 ? this.surfaceY(x + 3 + u * (w - 6), time) : y + 5 + stripe * 4 + Math.sin(u * 13 - t * 1.8) * (2.3 - stripe * 0.6)
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
    // Phase 21: the wake behind swimmers, and droplets from a creature breaking the surface.
    for (const m of this.motes) {
      const f = Math.sin((m.age / m.life) * Math.PI);
      suspended.ellipse(m.x, m.y, m.r * 1.6, m.r).fill({ color: 0xdff3dc, alpha: 0.4 * f });
    }
    for (const d of this.drops) suspended.circle(d.x, d.y, 1.1).fill({ color: 0xeaf8f0, alpha: 0.8 });
    for (const p of this.ripples) {
      const rx = clamp(p.x + p.vx * p.age * 0.38, x + 5, x + w - 5);
      const ry = clamp(p.y + p.vy * p.age * 0.38, y + 5, y + h - 5);
      const radius = Math.min(6 + p.age * 22, rx - x - 2, x + w - rx - 2);
      const height = Math.min(radius * 0.24, ry - y - 2, y + h - ry - 2);
      surface.ellipse(rx, ry, radius, height).stroke({ color: 0xc1ecd0, width: 1.1, alpha: p.strength * 0.63 * (1 - p.age / RIPPLE_LIFE) });
    }
  }
}
