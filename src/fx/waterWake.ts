import { Graphics } from 'pixi.js';
import { mulberry32 } from '../rng';
import { isSolid } from '../world/terrain';
import { isWaterAir, type WaterMotion } from '../scene/waterMotion';

interface Trace { x: number; y: number; age: number; vx: number; vy: number; nx: number; ny: number; spread: number; signal: number; silt: number; bubble: boolean; phase: number }

export class WaterWake {
  readonly view = new Graphics();
  private readonly traces: Trace[] = [];
  private readonly rand = mulberry32(0x54e8a1);
  private readonly flow = { x: 0, y: 0, silt: 0, energy: 0 };
  private wait = 0;
  private tracking = false;
  private vx = 0;
  private vy = 0;
  private x = 0;
  private y = 0;

  constructor(private readonly water: WaterMotion) {}

  /** A tracked swimmer emits from its trailing edge based on speed and velocity changes. */
  track(dt: number, x: number, y: number, vx: number, vy: number, radius: number, active: boolean): void {
    const continuous = active && this.tracking && Math.hypot(x - this.x, y - this.y) < 150;
    this.wait = Math.max(-dt, this.wait - dt);
    if (continuous && this.wait <= 0) {
      const speed = Math.hypot(vx, vy);
      const before = Math.hypot(this.vx, this.vy);
      const turn = Math.hypot(vx - this.vx, vy - this.vy);
      const surge = Math.min(1, turn / Math.max(6, dt * 535));
      if (Math.max(speed, before) > 57) {
        const dx = speed > 34 ? vx / speed : this.vx / Math.max(1, before);
        const dy = speed > 34 ? vy / speed : this.vy / Math.max(1, before);
        const strength = Math.min(1.5, Math.max(speed, before) / 240 + surge * 0.52);
        this.emit(x - dx * radius, y - dy * radius, dx, dy, strength, radius);
        this.water.disturb({ x: x - dx * radius, y: y - dy * radius, vx: dx * speed, vy: dy * speed, radius: radius + 65, strength });
        this.wait += 0.059 + (1 - Math.min(1, strength)) * 0.065;
      }
    } else if (!continuous && this.tracking && active) {
      this.reset();
    }
    this.tracking = active;
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
  }

  /** Arc and entrained bubbles at any wet emitter, from a fin to a thruster. Direction is normalized. */
  emit(x: number, y: number, dx: number, dy: number, strength: number, emitterRadius = 24): void {
    if (isWaterAir(x, y) || isSolid(x, y)) return;
    const f = this.water.sample(x, y, this.flow);
    const count = 2 + Math.round(Math.min(1.4, strength) * 3);
    for (let i = 0; i < count; i++) {
      const arc = (this.rand() - 0.5) * emitterRadius * 1.1;
      const side = arc < 0 ? -1 : 1;
      const spread = 7 + this.rand() * 23;
      const trail = 12 + strength * 25;
      if (this.traces.length >= 116) this.traces.shift();
      this.traces.push({ x: x - dy * arc, y: y + dx * arc, age: 0,
        vx: -dx * trail - dy * side * spread, vy: -dy * trail + dx * side * spread,
        nx: dx, ny: dy, spread, signal: Math.min(1.1, strength), silt: f.silt,
        bubble: i === 0 && this.rand() < 0.66, phase: this.rand() * 6.28 });
    }
  }

  reset(): void { this.traces.length = 0; this.tracking = false; this.wait = 0; this.view.clear(); }

  update(dt: number, time: number): void {
    const g = this.view.clear();
    let alive = 0;
    for (const p of this.traces) {
      p.age += dt;
      const life = p.bubble ? 1.28 : 0.92 + p.silt * 0.52;
      if (p.age >= life) continue;
      const f = this.water.sample(p.x, p.y, this.flow);
      const drag = Math.exp(-p.age * 1.7);
      const swirl = Math.sin(p.phase + p.age * 5.5) * 11 * drag;
      p.x += (p.vx * drag + f.x * 0.43 - p.ny * swirl) * dt;
      p.y += (p.vy * drag + f.y * 0.43 + p.nx * swirl - (p.bubble ? 24 : 0)) * dt;
      if (isWaterAir(p.x, p.y) || isSolid(p.x, p.y)) continue;
      this.traces[alive++] = p;
      const fade = Math.min(1, p.age * 19) * (1 - p.age / life) ** 1.65;
      if (p.bubble) {
        const size = 1.9 + p.phase * 0.34 + p.age * 0.7;
        g.circle(p.x, p.y, size).stroke({ color: 0xa6e7e3, width: 0.85, alpha: fade * p.signal * 0.57 });
        g.circle(p.x - size * 0.35, p.y - size * 0.5, 0.8).fill({ color: 0xddfaf0, alpha: fade * 0.56 });
      } else {
        const opacity = fade * p.signal * (0.21 + p.silt * 0.16);
        const length = 4 + p.signal * (8 + p.phase * 1.8) + p.age * 11;
        const side = p.phase < Math.PI ? -1 : 1;
        const bend = side * (2.8 + p.spread * p.age * 0.61) + Math.sin(time * 2.6 + p.phase) * 3;
        const c = p.silt > 0.52 ? 0xb2a689 : 0x9fddd4;
        const dx = p.nx * length, dy = p.ny * length;
        if (p.y < 610 && p.silt < 0.4) {
          g.moveTo(p.x - dx, p.y - dy + 1.4)
            .quadraticCurveTo(p.x - p.ny * bend, p.y + p.nx * bend + 1.4, p.x + dx * 0.42, p.y + dy * 0.42 + 1.4)
            .stroke({ color: 0x2c7f88, alpha: opacity * 0.69, width: 1.2, cap: 'round' });
        }
        g.moveTo(p.x - dx, p.y - dy)
          .quadraticCurveTo(p.x - p.ny * bend, p.y + p.nx * bend, p.x + dx * 0.42, p.y + dy * 0.42)
          .stroke({ color: c, alpha: opacity, width: 0.9 + p.signal * 0.93, cap: 'round' });
        if (p.silt > 0.5) g.circle(p.x + p.ny * 4, p.y - p.nx * 4, 1.3 + p.age * 0.9).fill({ color: c, alpha: opacity * 0.8 });
      }
    }
    this.traces.length = alive;
  }
}
