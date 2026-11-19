import { Graphics } from 'pixi.js';
import { mulberry32 } from '../rng';
import { isSolid } from '../world/terrain';
import { isWaterAir, type WaterMotion } from '../scene/waterMotion';

interface Trace { x: number; y: number; age: number; vx: number; vy: number; nx: number; ny: number; spread: number; signal: number; silt: number; bubble: boolean; phase: number }
interface Eddy { x: number; y: number; dx: number; dy: number; age: number; strength: number; spin: number }

export class WaterWake {
  readonly view = new Graphics();
  private readonly traces: Trace[] = [];
  private readonly eddies: Eddy[] = [];
  private readonly rand = mulberry32(0x54e8a1);
  private readonly flow = { x: 0, y: 0, silt: 0, energy: 0 };
  private wait = 0;
  private brakeWait = 0;
  private turnWait = 0;
  private tracking = false;
  private trackingSwimmer = false;
  private vx = 0;
  private vy = 0;
  private x = 0;
  private y = 0;

  constructor(private readonly water: WaterMotion) {}

  /** A tracked swimmer emits from its trailing edge based on speed and velocity changes. */
  track(dt: number, x: number, y: number, vx: number, vy: number, radius: number, active: boolean, swimmer: boolean,
    stroke?: { x: number; y: number; strength: number }): void {
    const continuous = active && this.tracking && this.trackingSwimmer === swimmer && Math.hypot(x - this.x, y - this.y) < 150;
    this.wait = Math.max(-dt, this.wait - dt);
    this.brakeWait -= dt;
    this.turnWait -= dt;
    if (continuous && swimmer && dt > 0) {
      const speed = Math.hypot(this.vx, this.vy);
      if (speed > 82) {
        const dx = this.vx / speed;
        const dy = this.vy / speed;
        const ax = (vx - this.vx) / dt;
        const ay = (vy - this.vy) / dt;
        const braking = -(ax * dx + ay * dy);
        const across = dx * ay - dy * ax;
        const sharp = Math.max(braking, Math.abs(across) * 1.18);
        if (sharp > 555 && this.turnWait <= 0) {
          this.leaveEddy(this.x, this.y, dx, dy, radius, Math.min(1, sharp / 920), Math.sign(across) || Math.sign(dx) || 1);
          this.brakeWait = 0.85;
          this.turnWait = 0.85;
        } else if (braking > 220 && speed > 142 && this.brakeWait <= 0) {
          this.leaveEddy(this.x, this.y, dx, dy, radius, Math.min(0.55, (braking - 175) / 320), 0);
          this.brakeWait = 0.85;
        }
      }
    }
    if (continuous && this.wait <= 0) {
      const speed = Math.hypot(vx, vy);
      const before = Math.hypot(this.vx, this.vy);
      const turn = Math.hypot(vx - this.vx, vy - this.vy);
      const surge = Math.min(1, turn / Math.max(6, dt * 535));
      if (Math.max(speed, before) > 57) {
        const dx = speed > 34 ? vx / speed : this.vx / Math.max(1, before);
        const dy = speed > 34 ? vy / speed : this.vy / Math.max(1, before);
        const strength = Math.min(1.5, (Math.max(speed, before) / 240 + surge * 0.52) * (stroke?.strength ?? 1));
        const wetStroke = stroke && !isWaterAir(stroke.x, stroke.y) && !isSolid(stroke.x, stroke.y) ? stroke : undefined;
        const originX = wetStroke?.x ?? x - dx * radius;
        const originY = wetStroke?.y ?? y - dy * radius;
        this.emit(originX, originY, dx, dy, strength, wetStroke ? 28 : radius);
        this.water.disturb({ x: originX, y: originY, vx: dx * speed, vy: dy * speed, radius: radius + 65, strength });
        this.wait += 0.059 + (1 - Math.min(1, strength)) * 0.065;
      }
    } else if (!continuous && this.tracking && active) {
      this.reset();
    }
    this.tracking = active;
    this.trackingSwimmer = swimmer;
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
      const trail = 6 + strength * 38;
      if (this.traces.length >= 116) this.traces.shift();
      this.traces.push({ x: x - dy * arc, y: y + dx * arc, age: 0,
        vx: dx * trail - dy * side * spread, vy: dy * trail + dx * side * spread,
        nx: dx, ny: dy, spread, signal: Math.min(1.1, strength), silt: f.silt,
        bubble: i === 0 && this.rand() < 0.66, phase: this.rand() * 6.28 });
    }
  }

  private leaveEddy(x: number, y: number, dx: number, dy: number, radius: number, strength: number, spin: number): void {
    x -= dx * radius;
    y -= dy * radius;
    if (isWaterAir(x, y) || isSolid(x, y)) return;
    const f = this.water.sample(x, y, this.flow);
    strength *= 0.16 + 0.84 * Math.min(1, f.energy / 0.65);
    if (this.eddies.length === 4) this.eddies.shift();
    this.eddies.push({ x, y, dx, dy, age: 0, strength, spin });
    this.water.disturb({ x, y, vx: dx * 160, vy: dy * 160, radius: 98, strength, spin });
  }

  reset(): void {
    this.traces.length = 0;
    this.eddies.length = 0;
    this.tracking = false;
    this.wait = this.brakeWait = this.turnWait = 0;
    this.view.clear();
  }

  update(dt: number, time: number): void {
    const g = this.view.clear();
    let alive = 0;
    for (const p of this.traces) {
      p.age += dt;
      const life = p.bubble ? 1.28 : 0.92 + p.silt * 0.52;
      if (p.age >= life) continue;
      // A reversing swimmer shouldn't drag in the wake they just left behind.
      const f = this.water.sample(p.x, p.y, this.flow, true);
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
    this.drawEddies(dt);
  }

  private drawEddies(dt: number): void {
    const g = this.view;
    let alive = 0;
    for (const e of this.eddies) {
      e.age += dt;
      const life = e.spin ? 1.88 : 1.56;
      if (e.age >= life) continue;
      const f = this.water.sample(e.x, e.y, this.flow, true);
      const drift = (e.spin ? 71 : 56) * Math.exp(-e.age * 1.4);
      e.x += (e.dx * drift + f.x * 0.35) * dt;
      e.y += (e.dy * drift + f.y * 0.35) * dt;
      if (isWaterAir(e.x, e.y) || isSolid(e.x, e.y)) continue;
      this.eddies[alive++] = e;
      const fade = Math.min(1, e.age * 10) * (1 - e.age / life) ** 1.12 * e.strength;
      const ink = f.silt > 0.47 ? 0xd5c8a2 : 0xc5eee4;
      const count = e.spin ? 13 : 9;
      let lastX = 0;
      let lastY = 0;
      let lastVisible = false;
      for (let i = 0; i < count; i++) {
        const u = i / (count - 1);
        const wobble = Math.sin(i * 2.43) * 4;
        const angle = u * 4.5 - 1.7 + e.age * 2.7;
        const radius = 35 - u * 21 + e.age * 11;
        const along = e.spin ? Math.cos(angle) * radius : (u - 0.5) * (76 + e.age * 18);
        const across = e.spin ? Math.sin(angle) * radius * e.spin * 0.77 : Math.sin(u * 7 + e.age * 3) * 11;
        const x = e.x + e.dx * along - e.dy * (across + wobble);
        const y = e.y + e.dy * along + e.dx * (across + wobble);
        if (isWaterAir(x, y) || isSolid(x, y)) { lastVisible = false; continue; }
        if (e.spin && lastVisible && i % 3 === 1 && !isSolid((x + lastX) / 2, (y + lastY) / 2)) {
          g.moveTo(lastX, lastY + 0.9).lineTo(x, y + 0.9)
            .stroke({ color: 0x264950, width: 2, alpha: fade * 0.44, cap: 'round' });
          g.moveTo(lastX, lastY).lineTo(x, y)
            .stroke({ color: ink, width: 1.15, alpha: fade * 0.52, cap: 'round' });
        }
        lastX = x;
        lastY = y;
        lastVisible = true;
        const r = 1.1 + (1 - u) * 1.3 + Math.cos(i * 1.6) * 0.37;
        const alpha = fade * (0.7 + Math.sin(i * 1.8) * 0.17);
        g.ellipse(x, y + 1.25, r + 0.9, r + 0.55).fill({ color: 0x264950, alpha: alpha * 0.77 });
        g.ellipse(x, y, r * 1.25, r).fill({ color: ink, alpha });
      }
    }
    this.eddies.length = alive;
  }
}
