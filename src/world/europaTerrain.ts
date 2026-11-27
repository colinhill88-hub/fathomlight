/**
 * Beyond Earth (Nov 27, 2026): the shape of Europa.
 *
 * Europa is its own space (its own coordinates, 0..EUROPA_W across), entered from the
 * Petrel like the wreck interiors are: the Earth ocean pauses behind it. The surface of
 * the water is at y = 0, as on Earth.
 *
 * Biome 1, "Under the ice" (x 0..6200): a ceiling of ice over everything, with the
 * lander's hab moored under the shaft the Petrel bored through it.
 *   x 900    the lander hab (air, the console, Linnea)
 *   x 2150   the first brine pool; x 2850 a silt ridge; x 3700 the second pool
 *   x 3300   a thin patch of ice: the floe ray's ice-breaker crest opens it to the surface
 *   x 4500   the icicle forest (the ceiling hangs low); x 5300 the third pool
 *   x 6000   the foot of the thick-ice wall, with the air bladder's glyph
 * The passage (x 6200..8600): a long, low, freezing tunnel under the wall. Its current
 * pushes back anything but a floe ray, and the ray only goes through with an air bladder
 * for its rider.
 * Biome 2, "The floe field" (x 8600..13900): open water under a black sky with Jupiter in
 * it. The ice is broken into floes floating on the surface, with open leads between them
 * where Kestrel can surface and breathe. Two of the floes are thin enough for the crest.
 */

export const EUROPA_W = 14000;
/** The lander hab: hung under the ice at the foot of the bore shaft. */
export const LANDER = { x: 900, shaftW: 70 };
/** The thick-ice wall, where the passage begins (biome 1's east end). */
export const ICE_WALL_X = 6200;
/** The passage under the wall, and where the floe field begins. */
export const PASSAGE = { x0: 6200, x1: 8600, roof: 1250, floor: 1560 };
export const FLOE_X0 = 8600;
export const FLOE_X1 = 13900;
/**
 * Biome 3, "The warm deep" (Colin, Nov 27, 2026): under the eastern floes the seabed falls away
 * into an abyss. Halfway down is a band of black water no lamp gets through: only a floe ray's
 * glow gland lights the way. Below it, the only warm water on Europa: vents, and the hearth
 * where the Choir's kin live, fading as the vents go cold.
 */
export const ABYSS = { x0: 11150, x1: 13600, blackTop: 2300, blackBottom: 3100, floor: 4560 };
/** The kin's hearth: the one vent still warm (just). */
export const HEARTH = { x: 12450, y: 4100 };
/** The cold vents to rekindle, west to east. */
export const DEAD_VENTS = [
  { id: 'v1', x: 11750 },
  { id: 'v2', x: 13000 },
  { id: 'v3', x: 13350 },
];
/** In the black-water band? */
export function inBlackWater(x: number, y: number): boolean {
  return x > ABYSS.x0 + 150 && x < ABYSS.x1 - 150 && y > ABYSS.blackTop && y < ABYSS.blackBottom;
}
/** Down in the warm deep (below the black water)? */
export function inWarmDeep(x: number, y: number): boolean {
  return x > ABYSS.x0 && x < ABYSS.x1 && y >= ABYSS.blackBottom;
}

/** The thin patch of ice in biome 1 that the crest can open. */
export const SKYLIGHT = { x: 3300, half: 75 };
export const BRINE_POOLS = [
  { x: 2150, w: 360, depth: 70 },
  { x: 3700, w: 420, depth: 85 },
  { x: 5300, w: 340, depth: 65 },
];

export interface Floe {
  id: string;
  x: number;
  w: number;
  /** How far it reaches below the surface. */
  depth: number;
  /** Thin enough for the ice-breaker crest. */
  thin?: boolean;
}
export const FLOES: Floe[] = [
  { id: 'f0', x: 8900, w: 420, depth: 110 },
  { id: 'f1', x: 9600, w: 520, depth: 130 },
  { id: 'thin-a', x: 10250, w: 300, depth: 60, thin: true },
  { id: 'f2', x: 10900, w: 640, depth: 150 },
  { id: 'f3', x: 11750, w: 380, depth: 100 },
  { id: 'thin-b', x: 12300, w: 340, depth: 55, thin: true },
  { id: 'f4', x: 12950, w: 560, depth: 140 },
  { id: 'f5', x: 13600, w: 420, depth: 120 },
];

/** "No ceiling here": the water is open to the surface (y 0). */
export const OPEN = -1e5;

/** What has been broken open (set from the save while on Europa). */
let broken = { skylight: false, floes: new Set<string>() };
export function setEuropaBroken(skylight: boolean, floes: string[]): void {
  broken = { skylight, floes: new Set(floes) };
}

const smooth = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};
const bump = (x: number, c: number, w: number, h: number) => h * Math.max(0, 1 - ((x - c) / w) ** 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Biome 1's ice ceiling, before the wall. */
function shelfCeil(x: number): number {
  let y = 250;
  y += Math.sin(x * 0.0021 + 0.7) * 36 + Math.sin(x * 0.0057 + 2.1) * 14;
  y += bump(x, LANDER.x, 420, 40);
  y += bump(x, 4500, 520, 150);
  y += smooth((x - (ICE_WALL_X - 400)) / 400) * 420;
  y += smooth((300 - x) / 300) * 380;
  return y;
}

/** The underside of the ice (world y grows downwards), or OPEN where the water reaches the surface. */
export function ceilY(x: number): number {
  if (x <= ICE_WALL_X) {
    if (broken.skylight && Math.abs(x - SKYLIGHT.x) < SKYLIGHT.half) return OPEN;
    return shelfCeil(x);
  }
  if (x < PASSAGE.x1) {
    const roof = PASSAGE.roof + Math.sin(x * 0.004) * 25;
    // Down from the wall's foot into the passage, then up and out under the edge of the floe field.
    if (x < PASSAGE.x0 + 320) return lerp(shelfCeil(ICE_WALL_X), roof, smooth((x - PASSAGE.x0) / 320));
    if (x > PASSAGE.x1 - 420) return lerp(roof, -40, smooth((x - (PASSAGE.x1 - 420)) / 420));
    return roof;
  }
  return OPEN;
}

/** The seabed (or the top of the brine where a pool lies). */
export function floorY(x: number): number {
  if (x <= ICE_WALL_X) {
    let y = 1180;
    y += Math.sin(x * 0.0017 + 1.3) * 60 + Math.sin(x * 0.0049) * 18;
    y -= bump(x, 2850, 380, 190);
    y -= bump(x, 1300, 300, 80);
    for (const p of BRINE_POOLS) y += bump(x, p.x, p.w / 2 + 60, p.depth);
    // Down toward the passage at the wall's foot.
    y += smooth((x - (ICE_WALL_X - 500)) / 500) * (PASSAGE.floor - 1180);
    y -= smooth((260 - x) / 260) * 520;
    return y;
  }
  if (x < PASSAGE.x1) {
    const fl = PASSAGE.floor + Math.sin(x * 0.0031 + 1) * 30;
    if (x > PASSAGE.x1 - 420) return lerp(fl, 1700, smooth((x - (PASSAGE.x1 - 420)) / 420));
    return fl;
  }
  // The floe field: a deep, open seabed with a rocky rise, then the lip of the abyss (biome 3)
  // falling away under the eastern floes, then the far shore.
  let y = 1700 + Math.sin(x * 0.0013) * 80 + Math.sin(x * 0.0041 + 2) * 25;
  y -= bump(x, 10100, 450, 380); // the rise
  // The abyss: down past the black water to the warm vent floor, and back up at its east side.
  const into = smooth((x - ABYSS.x0) / 260) * (1 - smooth((x - (ABYSS.x1 - 260)) / 260));
  if (into > 0) {
    let deep = ABYSS.floor + Math.sin(x * 0.006) * 40;
    for (const v of [...DEAD_VENTS, HEARTH]) deep -= bump(x, v.x, 120, 160); // the chimneys' mounds
    y = lerp(y, deep, into);
  }
  y -= smooth((x - (FLOE_X1 - 200)) / 300) * 1950; // the far shore rises out of the water
  return y;
}

/** Is a floe (still whole) at this point? */
export function floeAt(x: number, y: number): Floe | null {
  if (x < FLOE_X0 || y > 200) return null;
  for (const f of FLOES) {
    if (f.thin && broken.floes.has(f.id)) continue;
    if (Math.abs(x - f.x) < f.w / 2 && y > -30 && y < f.depth) return f;
  }
  return null;
}

/** Is this point inside ice or rock? (Used in place of the Earth terrain while on Europa.) */
export function europaSolid(x: number, y: number): boolean {
  if (x < 60 || x > EUROPA_W - 60) return true;
  const c = ceilY(x);
  if (c !== OPEN && y < c) return true;
  if (y > floorY(x)) return true;
  return floeAt(x, y) !== null;
}

/** Can Kestrel reach the surface here (open water up to y 0)? */
export function openToSky(x: number): boolean {
  return ceilY(x) === OPEN && floeAt(x, 5) === null;
}

/** Is this point inside the passage under the wall (where the current runs)? */
export function inPassage(x: number): boolean {
  return x > PASSAGE.x0 + 120 && x < PASSAGE.x1 - 200;
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
