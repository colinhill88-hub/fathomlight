/**
 * Beyond Earth (Nov 27, 2026): the shape of Europa's first biome, "Under the ice".
 *
 * Europa is its own space (its own coordinates, 0..EUROPA_W across), entered from the
 * Petrel like the wreck interiors are: the Earth ocean pauses behind it. There is no
 * open surface: a ceiling of ice hangs over the whole slice, with the lander's hab
 * moored under the shaft the Petrel bored through it.
 *
 *   x 0      west wall of old, blue ice
 *   x 900    the lander hab, under the bore shaft (air, the console, Linnea)
 *   x 2150   the first brine pool (a lake of heavier water lying on the seabed)
 *   x 2850   a ridge of frozen silt
 *   x 3700   the second brine pool
 *   x 4500   the icicle forest (the ceiling hangs low)
 *   x 5300   the third brine pool
 *   x 6200   the thick-ice wall: beyond it, far off, something sings (biomes 2 and 3, later)
 */

export const EUROPA_W = 6400;
/** The lander hab: hung under the ice at the foot of the bore shaft. */
export const LANDER = { x: 900, shaftW: 70 };
/** The thick-ice wall that closes the slice to the east (for now). */
export const ICE_WALL_X = 6200;
export const BRINE_POOLS = [
  { x: 2150, w: 360, depth: 70 },
  { x: 3700, w: 420, depth: 85 },
  { x: 5300, w: 340, depth: 65 },
];

const smooth = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};
const bump = (x: number, c: number, w: number, h: number) => h * Math.max(0, 1 - ((x - c) / w) ** 2);

/** The underside of the ice (world y grows downwards). */
export function ceilY(x: number): number {
  let y = 250;
  y += Math.sin(x * 0.0021 + 0.7) * 36 + Math.sin(x * 0.0057 + 2.1) * 14;
  // Thicker ice over the lander (the bore shaft runs up through it).
  y += bump(x, LANDER.x, 420, 40);
  // The icicle forest: the ceiling sags low.
  y += bump(x, 4500, 520, 150);
  // Rising into the thick-ice wall at the east end.
  y += smooth((x - (ICE_WALL_X - 400)) / 400) * 420;
  // And at the west wall.
  y += smooth((300 - x) / 300) * 380;
  return y;
}

/** The seabed (or the top of the brine where a pool lies). */
export function floorY(x: number): number {
  let y = 1180;
  y += Math.sin(x * 0.0017 + 1.3) * 60 + Math.sin(x * 0.0049) * 18;
  y -= bump(x, 2850, 380, 190); // the silt ridge
  y -= bump(x, 1300, 300, 80);
  for (const p of BRINE_POOLS) y += bump(x, p.x, p.w / 2 + 60, p.depth);
  y -= smooth((x - (ICE_WALL_X - 300)) / 300) * 520;
  y -= smooth((260 - x) / 260) * 520;
  return y;
}

/** Is this point inside ice or rock? (Used in place of the Earth terrain while on Europa.) */
export function europaSolid(x: number, y: number): boolean {
  if (x < 60 || x > EUROPA_W - 60) return true;
  return y < ceilY(x) || y > floorY(x);
}

/** The hab's air: inside this, Kestrel breathes (the open moon pool under it). */
export function habAir(x: number, y: number): boolean {
  const top = ceilY(LANDER.x);
  return Math.abs(x - LANDER.x) < 120 && y > top && y < top + 230;
}

/** Where Kestrel comes out of the hab: just under it, in the water. */
export function habSpawn(): { x: number; y: number } {
  return { x: LANDER.x + 40, y: ceilY(LANDER.x) + 260 };
}
