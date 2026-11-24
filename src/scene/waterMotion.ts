import { AIR_POCKETS, FOREST, SANCTUM, TRENCH, TR_VENTS, WRECK_SHELF, groundY, inShape, raceAt, shapesField, sanctumShapes, smooth } from '../world/terrain';

export interface FlowSample { x: number; y: number; silt: number; energy: number }

/** World units and seconds. Emitters can describe a fin, propeller, tail, or other moving point. */
export interface WaterImpulse { x: number; y: number; vx: number; vy: number; radius: number; strength: number; spin?: number }
interface Disturbance extends WaterImpulse { time: number }

const CAP = 28;
const LIFE = 1.15;
const EDDY_LIFE = 1.85;
const vents = TR_VENTS.map(({ x, h }) => ({ x, y: groundY(x) - h }));
const choir = [...sanctumShapes()];

export function ventLensAt(x: number, y: number): { x: number; y: number } | undefined {
  if (x < 29000 || x > 31000 || y < 3300 || y > 4500) return undefined;
  let closest: { x: number; y: number } | undefined;
  let distance = 545 ** 2;
  for (const vent of vents) {
    const d = (vent.x - x) ** 2 + (vent.y - 120 - y) ** 2;
    if (d < distance) { distance = d; closest = vent; }
  }
  return closest;
}

export function isWaterAir(x: number, y: number): boolean {
  return y < 0 || (x > 15420 && x < 18700 && AIR_POCKETS.some((a) => y < a.waterY && inShape(a.shape, x, y)));
}

/** Visual current only. Never fed back into collision, swimming, or AI. */
export class WaterMotion {
  private readonly impulses: Disturbance[] = [];
  private time = 0;

  advance(time: number): void {
    this.time = time;
    let alive = 0;
    for (const p of this.impulses) {
      if (time - p.time < (p.spin === undefined ? LIFE : EDDY_LIFE)) this.impulses[alive++] = p;
    }
    this.impulses.length = alive;
  }

  disturb(impulse: WaterImpulse): void {
    if (isWaterAir(impulse.x, impulse.y)) return;
    if (this.impulses.length >= CAP) this.impulses.shift();
    this.impulses.push({ ...impulse, time: this.time });
  }

  reset(): void { this.impulses.length = 0; }

  sample(x: number, y: number, into: FlowSample, ambientOnly = false): FlowSample {
    const t = this.time;
    const meadow = smooth((x - 6700) / 400) * (1 - smooth((x - 8170) / 550));
    const forest = smooth((x - FOREST.x0 + 500) / 870);
    const cave = smooth((x - 14500) / 900) * (1 - smooth((x - 18850) / 540));
    const shelf = smooth((x - WRECK_SHELF.x0 + 600) / 980);
    const trench = smooth((x - TRENCH.x0) / 1050) * smooth((y - 1410) / 1120);
    const choirWeight = y > 7240 && x > 28800 ? smooth((70 - shapesField(choir, x, y)) / 150) : 0;
    let energy = (1 - 0.48 * meadow) * (1 - 0.34 * forest) * (1 - 0.54 * cave) * (1 - 0.34 * trench);
    energy *= 1 - 0.89 * choirWeight;
    const depth = 0.38 + 0.62 * Math.exp(-Math.max(0, y) / 3600);
    const phase = x * 0.0037 + y * 0.0030;
    let vx = (Math.sin(phase - t * 0.58) * 23 + Math.cos(y * 0.014 + t * 0.28) * 12 + 10) * energy * depth;
    let vy = (Math.cos(x * 0.0063 - y * 0.009 - t * 0.54) * 12 + Math.sin(phase * 1.9 + t * 0.44) * 7) * energy * depth;
    vx += (meadow * 13 + forest * 11 * (1 - shelf)) * (1 - cave);
    vx -= raceAt(x, y) * (42 + 8 * Math.sin(t * 0.7));
    if (x > 29300 && x < 30600 && y > 3460 && y < 4350) {
      for (const vent of vents) {
        const rise = vent.y - y;
        const swirl = x - vent.x - Math.sin(rise * 0.012 + t * 0.82) * 35;
        const plume = smooth(1 - Math.abs(swirl) / (68 + Math.max(0, rise) * 0.25)) * smooth((rise + 38) / 65) * (1 - smooth((rise - 140) / 290));
        vx += Math.sin(t + rise * 0.021) * plume * 33;
        vy -= plume * 82;
      }
    }
    if (choirWeight > 0) {
      const dx = x - SANCTUM.heart.x;
      const dy = y - 9210;
      const ring = Math.exp(-(dx * dx + dy * dy) / 158000) * choirWeight;
      vx -= dy * 0.028 * ring;
      vy += dx * 0.028 * ring;
    }
    const count = ambientOnly ? 0 : this.impulses.length;
    for (let i = 0; i < count; i++) {
      const p = this.impulses[i];
      const age = Math.max(0, t - p.time);
      const hasMomentum = p.spin !== undefined;
      const travel = hasMomentum ? (1 - Math.exp(-age * 1.5)) * 0.28 : age * 0.16;
      const dx = x - p.x - p.vx * travel;
      const dy = y - p.y - p.vy * travel;
      const radius = p.radius + age * 44;
      const r2 = (dx * dx + dy * dy) / (radius * radius);
      if (r2 >= 1) continue;
      const life = hasMomentum ? EDDY_LIFE : LIFE;
      const gain = (1 - r2) ** 2 * (1 - age / life) ** 2 * p.strength;
      const spin = (p.spin ?? 1) * 0.81;
      vx += (p.vx * 0.27 - dy * spin) * gain;
      vy += (p.vy * 0.27 + dx * spin) * gain;
    }
    into.x = vx;
    into.y = vy;
    into.silt = Math.min(1, (0.16 + meadow * 0.36 + cave * 0.31 + shelf * 0.53 - trench * 0.33) * (1 - choirWeight * 0.88));
    into.energy = energy;
    return into;
  }
}
