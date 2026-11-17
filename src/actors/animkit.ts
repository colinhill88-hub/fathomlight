import { Container, Graphics } from 'pixi.js';

/**
 * Small animation helpers shared by the swimming diver and the walker
 * (character animation session B). Plain numbers updated in place: nothing
 * here makes objects per frame.
 */

/**
 * A damped spring (semi-implicit Euler). w is the stiffness as an angular
 * frequency (higher snaps faster), z the damping ratio (1 = no overshoot,
 * lower = a hint of follow-through). `force` pushes it (an impulse per second).
 * Stable for w * dt below about 2, so clamp dt to 1/20 s at the caller.
 */
export class Spring {
  v = 0;
  constructor(public x = 0) {}
  step(target: number, w: number, z: number, dt: number, force = 0): number {
    this.v += (w * w * (target - this.x) - 2 * z * w * this.v + force) * dt;
    this.x += this.v * dt;
    return this.x;
  }
  /** Hold it between lo and hi, stopping its speed into the limit. */
  clamp(lo: number, hi: number): void {
    if (this.x > hi) {
      this.x = hi;
      this.v = Math.min(0, this.v);
    } else if (this.x < lo) {
      this.x = lo;
      this.v = Math.max(0, this.v);
    }
  }
  set(x: number): void {
    this.x = x;
    this.v = 0;
  }
}

/** Move cur towards target at a rate (per second), frame-rate independent. */
export function approach(cur: number, target: number, rate: number, dt: number): number {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt));
}

/**
 * The shape of one breath, phase 0..1 to chest lift 0..1: in over the first
 * 40%, then a longer breath out.
 */
export function breathShape(ph: number): number {
  return ph < 0.4 ? Math.sin((ph / 0.4) * Math.PI * 0.5) : Math.cos(((ph - 0.4) / 0.6) * Math.PI * 0.5);
}

/** Where the breath out starts in breathShape's cycle. */
export const BREATH_OUT = 0.4;

/**
 * The head's idle life: every few seconds a restrained look up, down or back
 * to straight ahead, and an occasional blink.
 */
export class Glance {
  /** Head angle wanted by the current glance (radians, negative = up). */
  target = 0;
  private timer: number;
  private blinkTimer: number;
  constructor(
    private readonly rand: () => number,
    first = 2.5,
  ) {
    this.timer = first;
    this.blinkTimer = first + 0.5;
  }
  update(dt: number): void {
    this.timer -= dt;
    if (this.timer <= 0) {
      const r = this.rand();
      this.target = r < 0.35 ? -0.1 - this.rand() * 0.06 : r < 0.6 ? 0.06 + this.rand() * 0.05 : 0;
      this.timer = 2.2 + this.rand() * 4;
    }
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) this.blinkTimer = 2.5 + this.rand() * 4.5;
  }
  get blinking(): boolean {
    return this.blinkTimer < 0.13;
  }
}

/** Smooth 0..1 ease in and out. */
export function smoothstep(t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Draw every Graphics under `root` in the shared batch. Pixi otherwise gives
 * any piece with more than about 400 vertices its own draw call; for a
 * character of a few dozen moving pieces that costs far more (measured in the
 * animation lab: about 1 ms against 0.09 ms a frame) than copying the
 * vertices into the batch.
 */
export function batchAll(root: Container): void {
  if (root instanceof Graphics) root.context.batchMode = 'batch';
  for (const c of root.children) batchAll(c);
}
