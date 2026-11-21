/*
 * Phase 17b: the mag-boots' walking mode (Colin: like a heavy pair of iron
 * boots in an old adventure game). One press of Boots clamps them on, another
 * lets go. Clamped, Kestrel drops to the seabed and walks along it:
 *
 *  - slower than swimming, and the water's currents (the Wreck Shelf race, the
 *    vents' upflow) don't move her;
 *  - Jump is a short, heavy hop;
 *  - walking off a ledge she sinks slowly with the boots still on, and lands
 *    with a thud (the size of the thud is reported, for the sound and silt);
 *  - she follows slopes and climbs small steps, and stops at walls.
 *
 * Only the rule lives here (no drawing, no sound), so the Node checks in
 * scripts/test-progression.mjs can run it against the real terrain.
 *
 * (x, y) is the same point the swimming diver uses (the middle of the body),
 * so clamping on or letting go never moves her. The boots' soles are FOOT
 * below it. Units are world units per second.
 */

export const MAG = {
  /** Walking speed along the bottom (swimming is 230). */
  walk: 95,
  /** How quickly the walk speeds up and slows down (on the floor; less in a hop). */
  accel: 7,
  /** The hop's push upward: about 50 units high, a heavy little bounce. */
  hop: 230,
  /** Pull down while clamped and off the floor, and the slow sink's top speed. */
  gravity: 520,
  sink: 150,
  /** From the body's middle down to the soles, and up to the top of the helmet. */
  foot: 40,
  head: 54,
  /** Half the body's width, for walls. */
  half: 13,
  /** The tallest step (or steepest bit of slope per frame) the boots walk up. */
  stepUp: 14,
  /** How fast the body may rise or fall to keep the soles on a slope or step (no snapping). */
  settle: 260,
} as const;

export interface MagBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** The soles are on the floor. */
  onFloor: boolean;
}

export interface MagResult {
  /** 0 nothing; otherwise how hard the boots landed (0.05 to 1), this frame. */
  landed: number;
  /** A hop started this frame. */
  hopped: boolean;
  /** Pressing into a wall this frame. */
  blocked: boolean;
}

type Solid = (x: number, y: number) => boolean;

/** The first solid point going down from y0 to y1 at x (to 1 unit), or null. */
export function floorBetween(x: number, y0: number, y1: number, solid: Solid): number | null {
  if (solid(x, y0)) return y0;
  for (let y = y0 + 2; y <= y1 + 1; y += 2) if (solid(x, y)) return solid(x, y - 1) ? y - 1 : y;
  return null;
}

/** Is there a wall at x between the helmet and just above the tallest step? */
function wallAt(x: number, y: number, solid: Solid): boolean {
  const top = y - MAG.head;
  const low = y + MAG.foot - MAG.stepUp - 2;
  for (let yy = top; yy <= low; yy += 8) if (solid(x, yy)) return true;
  return solid(x, low);
}

/** Clamping on: find the floor under her now (she may be hanging well above it). */
export function magClamp(b: MagBody, solid: Solid): void {
  const f = floorBetween(b.x, b.y + MAG.foot - MAG.stepUp, b.y + MAG.foot + 2, solid);
  b.onFloor = f !== null;
  // Keep the swim's drift downward (a sink into the boots), never an upward fling.
  b.vy = b.onFloor ? 0 : Math.max(0, Math.min(MAG.sink, b.vy));
  b.vx = Math.max(-MAG.walk, Math.min(MAG.walk, b.vx));
}

/**
 * One step of walking in clamped mag-boots. `moveX` is the stick or keys
 * (-1..1); `hop` is true on the frame Jump was pressed.
 */
export function magStep(b: MagBody, moveX: number, hop: boolean, dt: number, solid: Solid): MagResult {
  const out: MagResult = { landed: 0, hopped: false, blocked: false };
  if (dt <= 0) return out;
  dt = Math.min(dt, 0.05);
  // Walking: ease towards the wanted speed (no currents add to it).
  const want = Math.abs(moveX) < 0.15 ? 0 : Math.sign(moveX) * Math.min(1, Math.abs(moveX) * 1.2) * MAG.walk;
  const k = 1 - Math.exp(-MAG.accel * (b.onFloor ? 1 : 0.45) * dt);
  b.vx += (want - b.vx) * k;
  // Sideways, stopped by walls (small steps and slopes are walked up below).
  if (Math.abs(b.vx) > 0.01) {
    const nx = b.x + b.vx * dt;
    if (wallAt(nx + Math.sign(b.vx) * MAG.half, b.y, solid)) {
      out.blocked = Math.abs(want) > 0;
      b.vx = 0;
    } else b.x = nx;
  }
  // The hop.
  if (hop && b.onFloor && !solid(b.x, b.y - MAG.head - 6)) {
    b.onFloor = false;
    b.vy = -MAG.hop;
    out.hopped = true;
  }
  if (b.onFloor) {
    // Keep the soles on the floor: up a step or slope, down a slope; off an edge, she starts to sink.
    const sole = b.y + MAG.foot;
    const f = floorBetween(b.x, sole - MAG.stepUp, sole + MAG.stepUp, solid);
    if (f === null) {
      b.onFloor = false;
      b.vy = 0;
    } else {
      const d = f - sole;
      const m = MAG.settle * dt;
      b.y += Math.max(-m, Math.min(m, d));
      b.vy = 0;
    }
  } else {
    // Off the floor: a slow, heavy sink (after a hop's rise).
    b.vy = Math.min(MAG.sink, b.vy + MAG.gravity * dt);
    const ny = b.y + b.vy * dt;
    if (b.vy < 0) {
      if (solid(b.x, ny - MAG.head)) b.vy = 0;
      else b.y = ny;
    } else {
      const f = floorBetween(b.x, b.y + MAG.foot, ny + MAG.foot + 1, solid);
      if (f !== null) {
        b.y = f - MAG.foot;
        // How hard: a hop's landing is light, a long sink off a ledge lands with the full thud.
        out.landed = Math.max(0.05, Math.min(1, b.vy / MAG.sink));
        b.vy = 0;
        b.onFloor = true;
      } else b.y = ny;
    }
  }
  // The water's surface: the helmet can't leave it (as for swimming).
  if (b.y < 18) {
    b.y = 18;
    if (b.vy < 0) b.vy = 0;
  }
  return out;
}
