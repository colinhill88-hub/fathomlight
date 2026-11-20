import { mulberry32, WORLD_SEED } from '../rng';

/**
 * The shape of the Sunlit Shallows (milestone 2), in world units (wu).
 * y = 0 is the water surface and y grows downwards. 75 wu is about 1 metre.
 *
 * Layout, left to right (x):
 * -5600 - -5000  the basin's west wall, rising to just under the surface (milestone 5)
 * -5000 -   300  the Kestrel basin: a wide, flat-floored hollow about 22 m deep,
 *                the big build site for the factory base (milestone 5)
 *   300 -  380  a cliff up to the shelf
 *   300 - 1700  Kestrel shelf: flat sand under a marker buoy, where the first
 *               base went (milestone 3); it is the top east corner of the site
 *  1700 - 3600  coral garden with two rock outcrops
 *  3600 - 4700  a sand channel with the wreck of an old survey sled
 *  4700 - 5000  a rocky knoll with the survey beacon on its edge
 *  5000 - 6850  the drop-off, the rock ledge and the dark grotto under it (from milestone 1)
 *  6850 - 8400  a seagrass meadow on a plateau, with a narrow crevice
 *  8400 - 9000  the east cliff, with a cave mouth that leads into darkness (the
 *               gear gate to the kelp forest and caves zone: it needs a real dive light)
 *
 * Milestone 7 added the kelp forest east of the cliff:
 *  8640 - 9600  the cliff top: a shallow rock shelf under 3 m of water. The cave
 *               runs right under it and comes out on the far side. The sub can
 *               cross the shelf, but an old survey boom gate hangs across it
 *               (x = 8900); its winch is on the forest side.
 *  9600 - 10050 the shelf's east face drops 15 m to the forest floor
 * 10050 - 14800 the kelp forest: giant kelp from the floor to the surface,
 *               rock outcrops, holdfasts (resin) and shaded rock (lumen moss)
 * 14800 - 15600 the east wall, with the mouth of the kelp caves (the zone's
 *               major site, milestone 7 part 2)
 *
 * Milestone 7 part 2 carved the kelp caves into the rock behind the east wall
 * (15000 - 19200, 10 to 25 m down): a hall with an air pocket, a squeeze with a
 * pulsing current, a junction (air pocket, a side chamber up to an old rope
 * store), a pitch-black chamber and the earlier expedition's cache at the end.
 * Above them the wall's top is a flat rock plateau 3.5 m under the surface.
 *
 * Milestone 8 part 1 added the wreck shelf east of the plateau:
 * 19300 - 19750 the shelf edge: the plateau drops 18 m to the shelf floor
 * 19450 - 21900 the race: a strong current sweeps west across the edge; old
 *               anchor rings cross it (the grapple line hooks them)
 * 21900 - 27000 the wreck shelf: twilight, about 22 m down, silt and wreckage,
 *               two small sealed wrecks, wreck lurkers in dens, brass fittings,
 *               and the great sealed wreck of the Corvina (the major site, part 2)
 *
 * Milestone 10 opened the world's east wall into the trench (TRENCH below):
 * 26800 - 27350 the rim, where the shelf ends (an old relay buoy lies toppled)
 * 27350 - 28350 ledge A, about 33 m (a crushed deep probe)
 * 28350 - 29350 ledge B, about 44 m (the KS-1 hull is safe to 45 m)
 * 29350 - 30450 ledge C, the vent field, about 55 m: chimneys, vent ore,
 *               cinder snails; a cleft into the rock under ledge B, sealed
 *               by a mineral chimney a grown cinder snail grazes away
 * 30450 - 30650 the deep drop
 * 30650 - 32500 the trench floor, about 98 m, and the drowned Fulmar deep
 *               station (the major site, an interior on foot)
 * 32500 - 33000 the trench's east wall, up to the surface
 *
 * Milestone 11 opened the sanctum under the trench floor (SANCTUM below): a
 * round door of pale stone in the floor's far east end, a shaft down, an
 * antechamber, the great hall behind a song-lock, and a second song-lock down
 * to the deep pool, where the heart stands (an interior on foot).
 */

/** West edge of the world (milestone 5 added the basin west of the old wall). */
export const WORLD_X0 = -5600;
export const WORLD_W = 33000;
/** Width of the whole world, from WORLD_X0 to WORLD_W. */
export const WORLD_SPAN = WORLD_W - WORLD_X0;
/** Milestone 10: the trench goes down to about 100 m. Milestone 11: the sanctum below it, to about 128 m. */
export const WORLD_H = 9700;
export const WU_PER_METRE = 75;

/** Where the diver starts, and comes back to after blacking out: the Kestrel buoy at the surface. */
export const SPAWN = { x: 900, y: 40 };
/**
 * Where a new game starts (Colin, after the terrain pass): at the surface just
 * off the build trench's western lip, looking east down the whole site. Blacking
 * out still brings you back to the buoy (SPAWN).
 */
export const START = { x: -2950, y: 40 };
export const BUOY_X = 900;
export const BEACON_X = 4990;
export const SLED_X = 4120;
/**
 * The SLED 2 recorder (the dive light's data): thrown clear of the sled onto
 * open sand to its west, away from the stranded drone and the scrap around the
 * wreck, with a blinking amber beacon (Colin, after the terrain pass).
 */
export const RECORDER_X = 3810;
export const ANCHOR_X = 2860;
export const CREVICE_X = 7700;
export const GROTTO = { x0: 5810, x1: 6500, y0: 760, y1: 1000 };
/** The diver cannot go past this point inside the cave without the dive light: it is too dark. */
export const CAVE_GATE_X = 8790;

/** Milestone 7: the kelp forest beyond the east cliff. */
export const FOREST = { x0: 10050, x1: 14800 };
/** The shelf on top of the east cliff (the sub's way over), and the boom gate across it. */
export const SHELF = { x0: 8640, x1: 9600, floor: 210 };
export const BOOM_X = 8900;
/** The boom gate's winch, on the forest side of the gate. */
export const WINCH_X = 9040;
/** Is the boom gate open? Set from the save (src/main.ts). */
export const boom = { open: false };
/** The mouth of the kelp caves in the east wall (the major site, part 2). */
export const SITE_MOUTH = { x: 14975, y: 1150, rx: 170, ry: 100 };

/*
 * Milestone 7 part 2: the kelp caves. Open water inside the rock is a set of
 * capsules (tunnels whose radius changes along them) and ellipses (chambers).
 * Pillars are rock left standing inside the black chamber.
 */
export type CaveShape =
  | { kind: 'cap'; x1: number; y1: number; r1: number; x2: number; y2: number; r2: number }
  | { kind: 'ell'; x: number; y: number; rx: number; ry: number };
const cap = (x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): CaveShape & { kind: 'cap' } => ({ kind: 'cap', x1, y1, r1, x2, y2, r2 });
const ell = (x: number, y: number, rx: number, ry: number): CaveShape & { kind: 'ell' } => ({ kind: 'ell', x, y, rx, ry });

export const KC = {
  /** The first chamber, with an air pocket in its roof. */
  hall: ell(15760, 1120, 270, 175),
  /** A side passage down from the hall, choked by a thick kelp wall (the cutter torch opens it). */
  kelpPassage: cap(15620, 1250, 56, 15565, 1470, 52),
  alcove: ell(15545, 1525, 95, 62),
  /** The squeeze: a long narrow tunnel where cold water surges out in pulses. */
  squeeze: cap(16010, 1170, 58, 16900, 1280, 46),
  /** Two little pockets in the squeeze's roof where the surge can't reach. */
  pockets: [ell(16300, 1128, 58, 46), ell(16600, 1162, 58, 46)],
  junction: ell(17150, 1310, 240, 150),
  towPassage: cap(17200, 1180, 56, 17285, 930, 56),
  towRoom: ell(17305, 860, 165, 92),
  downPassage: cap(17330, 1420, 66, 17560, 1600, 76),
  /** The black chamber: silt so fine it swallows the dive light. */
  dark: ell(18080, 1650, 560, 215),
  exit: cap(18600, 1700, 62, 18830, 1690, 66),
  cache: ell(18960, 1640, 175, 125),
  /**
   * Milestone 9: a passage down from the junction's floor into lightless
   * water (no lamp gets through it, not even the dive light: only a grown
   * glowfin swimming with you), and the hidden grotto at its end.
   */
  glowPassage: cap(16990, 1415, 50, 16700, 1600, 46),
  glowGrotto: ell(16420, 1665, 250, 132),
};
/** Where the lightless water starts: the diver can go this far in without a glowfin's light. */
export const LIGHTLESS_EDGE = { x: 16935, y: 1450 };
/** Is this point in the lightless passage or the hidden grotto? */
export function inLightless(x: number, y: number): boolean {
  return x < 17060 && x > 16100 && y > 1380 && (inShape(KC.glowPassage, x, y) || inShape(KC.glowGrotto, x, y));
}
export const KC_PILLARS = [ell(17800, 1600, 55, 120), ell(18100, 1722, 66, 108), ell(18360, 1590, 50, 125)];
/** Where trapped air fills the roof of a chamber: the diver breathes above waterY. */
export const AIR_POCKETS = [
  { shape: KC.hall, waterY: 1002 },
  { shape: KC.junction, waterY: 1202 },
];
/** Old Kestrel lamp brackets across the black chamber (set lumen moss on them). */
export const BRACKETS = [17660, 17960, 18240, 18520].map((x) => ({ x, y: ellBottom(KC.dark, x) - 22 }));
/** The kelp wall across the side passage (milestone 7 part 2: the cutter torch cuts it). */
export const KELP_WALL = { x0: 15500, x1: 15690, y0: 1322, y1: 1372 };
export const kelpWall = { cut: false };

const CAVE_SHAPES: CaveShape[] = [
  // The way in: it starts in the open forest water, so the mouth flows straight into the tunnel.
  cap(14840, 1185, 100, 15430, 1185, 76),
  KC.hall,
  KC.kelpPassage,
  KC.alcove,
  cap(15990, 1140, 62, 16050, 1172, 58),
  KC.squeeze,
  ...KC.pockets,
  cap(16880, 1282, 50, 16960, 1300, 70),
  KC.junction,
  KC.towPassage,
  KC.towRoom,
  KC.downPassage,
  KC.dark,
  KC.exit,
  KC.cache,
  KC.glowPassage,
  KC.glowGrotto,
];
export const KC_BOUNDS = { x0: 14740, x1: 19150 };

/**
 * Tunnels aren't perfect tubes (Colin, after milestone 7 part 2: "too box-y"):
 * their radius swells and pinches gently along their length. The drawing and
 * the collisions use the same wobble, so walls look and feel the same.
 */
export function capWobble(cx: number, cy: number): number {
  return 1 + 0.13 * Math.sin(cx * 0.011 + cy * 0.007) + 0.07 * Math.sin(cx * 0.029 + 1.7) + 0.04 * Math.sin(cx * 0.061 + cy * 0.013 + 4.1);
}
export function inShape(s: CaveShape, x: number, y: number, pad = 0): boolean {
  if (s.kind === 'ell') return ((x - s.x) / (s.rx + pad)) ** 2 + ((y - s.y) / (s.ry + pad)) ** 2 < 1;
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const t = Math.max(0, Math.min(1, ((x - s.x1) * dx + (y - s.y1) * dy) / (dx * dx + dy * dy)));
  const r = (s.r1 + (s.r2 - s.r1) * t) * capWobble(s.x1 + dx * t, s.y1 + dy * t) + pad;
  return (x - s.x1 - dx * t) ** 2 + (y - s.y1 - dy * t) ** 2 < r * r;
}
/** The floor of an ellipse chamber at x. */
export function ellBottom(e: { x: number; y: number; rx: number; ry: number }, x: number): number {
  return e.y + e.ry * Math.sqrt(Math.max(0, 1 - ((x - e.x) / e.rx) ** 2));
}
export function ellTop(e: { x: number; y: number; rx: number; ry: number }, x: number): number {
  return e.y - e.ry * Math.sqrt(Math.max(0, 1 - ((x - e.x) / e.rx) ** 2));
}
/**
 * Signed distance (roughly, in world units) from a shape's wall: negative inside.
 * After milestone 7 part 2 (Colin: joins looked misdrawn) the caves are one
 * smooth shape: chambers and tunnels blend into each other with rounded
 * fillets instead of overlapping as separate pills and ovals.
 */
function sdShape(s: CaveShape, x: number, y: number): number {
  if (s.kind === 'ell') return (Math.hypot((x - s.x) / s.rx, (y - s.y) / s.ry) - 1) * Math.min(s.rx, s.ry);
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const t = Math.max(0, Math.min(1, ((x - s.x1) * dx + (y - s.y1) * dy) / (dx * dx + dy * dy)));
  const cx = s.x1 + dx * t;
  const cy = s.y1 + dy * t;
  return Math.hypot(x - cx, y - cy) - (s.r1 + (s.r2 - s.r1) * t) * capWobble(cx, cy);
}
function bboxOf(s: CaveShape): [number, number, number, number] {
  if (s.kind === 'ell') return [s.x - s.rx, s.y - s.ry, s.x + s.rx, s.y + s.ry];
  const r = Math.max(s.r1, s.r2) * 1.3;
  return [Math.min(s.x1, s.x2) - r, Math.min(s.y1, s.y2) - r, Math.max(s.x1, s.x2) + r, Math.max(s.y1, s.y2) + r];
}
const BLEND = 70;
const smin = (a: number, b: number) => {
  const h = Math.max(BLEND - Math.abs(a - b), 0) / BLEND;
  return Math.min(a, b) - h * h * BLEND * 0.25;
};
let shapeBoxes: [number, number, number, number][] | null = null;
/** The caves' smooth field: negative in open water, positive in rock. */
export function caveField(x: number, y: number, pillars = true): number {
  if (x < KC_BOUNDS.x0 || x > KC_BOUNDS.x1 || y < 740) return 999;
  shapeBoxes ??= CAVE_SHAPES.map(bboxOf);
  let d = 999;
  for (let i = 0; i < CAVE_SHAPES.length; i++) {
    const b = shapeBoxes[i];
    if (x < b[0] - BLEND || x > b[2] + BLEND || y < b[1] - BLEND || y > b[3] + BLEND) continue;
    d = smin(d, sdShape(CAVE_SHAPES[i], x, y));
  }
  if (d > BLEND || !pillars) return d;
  for (const p of KC_PILLARS) d = Math.max(d, -sdShape(p, x, y));
  return d;
}
/** Is the point in the open water of the kelp caves (not rock, not a pillar)? */
export function inKelpCaves(x: number, y: number): boolean {
  return caveField(x, y) < 0;
}
/** The first rock below (x, fromY): a cave floor when fromY is inside a chamber. */
export function caveFloor(x: number, fromY: number): number {
  let y = fromY;
  while (y < WORLD_H && !isSolid(x, y + 2)) y += 2;
  return y;
}
/** Where the four finds lie in the caves (each read by the Lab). */
export const KC_FINDS = {
  relaylog: { x: 15905, from: 1150 },
  weldchip: { x: 17060, from: 1320 },
  towcoil: { x: 17350, from: 860 },
  cache: { x: 19000, from: 1650 },
  // After milestone 12: the Hatchery's notes, in the alcove behind the kelp wall (the cutter torch opens it).
  nurserylog: { x: 15545, from: 1470 },
} as const;
/** Every open shape, for drawing. */
export function caveShapes(): readonly CaveShape[] {
  return CAVE_SHAPES;
}

/** Milestone 8: the wreck shelf. */
export const WRECK_SHELF = { x0: 19700, x1: 27000 };
/** The race: a strong current across the shelf edge, pushing west. */
export const RACE = { x0: 19450, x1: 21900, speed: 500 };
function shelfFloor(x: number): number {
  let y = 1630 + Math.sin(x * 0.0019) * 22 + Math.sin(x * 0.0057 + 2) * 9;
  y -= bump(x, 20600, 240, 70) + bump(x, 23650, 300, 60) + bump(x, 24950, 200, 45);
  return y;
}
/**
 * The old salvage crew's flow vane: a huge hinged steel plate on the seabed just
 * past the race. Raised (from its winch on the far side), it turns the current
 * down along the shelf, so the upper water at the edge goes calm and the sub can
 * cross over the top. Set from the save (src/main.ts).
 */
export const VANE = { x: 22020, winchX: 22200, calmY: 520 };
export const race = { vane: false };
/** How strong the race current is at a point (0..1). Before the vane is raised it reaches the surface. */
export function raceAt(x: number, y: number): number {
  if (x < RACE.x0 - 40 || x > RACE.x1 + 200) return 0;
  const k = smooth((x - RACE.x0) / 160) * (1 - smooth((x - RACE.x1) / 200));
  return race.vane ? k * smooth((y - (VANE.calmY - 80)) / 160) : k;
}
/** Old anchor rings across the race: stakes driven into the seabed with a ring on top. */
export const RINGS = [19560, 19880, 20200, 20530, 20860, 21190, 21520, 21860].map((x) => ({ x, y: 0 }));
/** The sealed wrecks: two small ones (the cutter torch opens their hatches) and the Corvina (part 2). */
export const WRECKS = [
  { id: 'trawler', x0: 22650, x1: 23250, hatchX: 23040 },
  { id: 'barge', x0: 24050, x1: 24750, hatchX: 24300 },
] as const;
export const CORVINA = { x0: 25550, x1: 26750, doorX: 25570 };

/*
 * Milestone 8 part 2: the Corvina's insides (Colin: grapple up to the deck,
 * restore the power, grapple across the hold).
 *  - Water boils up over her deck (the upwelling): nobody sinks onto it, but a
 *    grapple to the bollard on her stern pulls you down and holds you there,
 *    beside the deck hatch (the cutter torch opens it).
 *  - The hatch drops down a shaft to the lower corridor. The stern door at its
 *    west end is sealed until you release it from inside (a shortcut out).
 *  - The hold: a downdraft through her holed keel pins anything to the floor,
 *    except under the three beam hooks a grapple can reach.
 *  - Past the hold, high up, the engine room. Two breakers (one there, one on
 *    the hold floor) bring her emergency power back: lights, and the powered
 *    door to the survey lab in her superstructure.
 */
export const cv = { hatch: false, door: false, power: false };
const cvF = (x: number) => groundY(x) + 30;
/** Her hull and superstructure outlines (shared with the drawing). */
let hullCache: [number, number][] | null = null;
export function corvinaHull(): [number, number][] {
  const { x0, x1 } = CORVINA;
  return (hullCache ??= [
    [x0, cvF(x0) - 300],
    [x1 - 160, cvF(x1 - 160) - 340],
    [x1, cvF(x1) - 470],
    [x1 - 60, cvF(x1 - 60)],
    [x0 + 40, cvF(x0 + 40)],
  ]);
}
export function corvinaHouse(): { x: number; y: number; w: number; h: number } {
  return { x: CORVINA.x0 + 160, y: cvF(CORVINA.x0) - 470, w: 380, h: 172 };
}
export const CV_BOLLARD = { x: 25566, y: 0 };
export const CV_HATCH = { x: 25612, y: 0 };
export const CV_HOOKS = [
  { x: 25935, y: 1402 },
  { x: 26100, y: 1394 },
  { x: 26265, y: 1402 },
];
export const CV_ROOMS = {
  shaft: cap(25612, 1330, 30, 25612, 1478, 32),
  corridor: cap(25548, 1514, 44, 25870, 1508, 44),
  hold: ell(26100, 1490, 250, 112),
  toEngine: cap(26318, 1418, 38, 26440, 1430, 40),
  engine: ell(26515, 1452, 92, 74),
  toLab: cap(25622, 1352, 28, 25745, 1286, 30),
  lab: ell(25900, 1258, 168, 58),
};
/** Things you hold Collect at, inside her. */
export const CV_SPOTS = {
  breakerEngine: { x: 26545, y: 1500 },
  breakerHold: { x: 26100, y: 1576 },
  lever: { x: 25600, y: 1536 },
  sonardata: { x: 25840, y: 1290 },
  suitplans: { x: 25975, y: 1290 },
  corvinalog: { x: 25775, y: 1290 },
};
/** Solid until opened: the stern door, and the powered door into the lab. */
export const CV_DOOR = { x0: 25540, x1: 25600, y0: 1462, y1: 1566 };
export const CV_LABDOOR = { x0: 25712, x1: 25728, y0: 1258, y1: 1342 };
/** The hold's downdraft (all but near the hooks) and the upwelling over her deck. */
export function cvDowndraft(x: number, y: number): number {
  if (!inShape(CV_ROOMS.hold, x, y)) return 0;
  return x < CV_ROOMS.hold.x + CV_ROOMS.hold.rx - 50 ? 1 : 0;
}
export function cvUpwell(x: number, y: number): number {
  if (x < CORVINA.x0 - 30 || x > CORVINA.x1 - 30) return 0;
  const top = cvDeckY(x);
  if (y > top - 4) return 0;
  return smooth((x - (CORVINA.x0 - 30)) / 60) * (1 - smooth((x - (CORVINA.x1 - 90)) / 60));
}
/** The top of her hull (or the superstructure) at x. */
export function cvDeckY(x: number): number {
  const h = corvinaHull();
  const [ax, ay] = h[0];
  const [bx, by] = h[1];
  const [cx, cy] = h[2];
  let y = x <= bx ? ay + ((by - ay) * (x - ax)) / (bx - ax) : by + ((cy - by) * (x - bx)) / (cx - bx);
  const H = corvinaHouse();
  if (x > H.x && x < H.x + H.w) y = Math.min(y, H.y);
  return y;
}
const CV_SHAPES = Object.values(CV_ROOMS);
/** Distance-like field of any shapes (negative inside), for drawing. */
export function shapesField(shapes: CaveShape[], x: number, y: number): number {
  let d = 999;
  for (const s of shapes) d = Math.min(d, sdShape(s, x, y));
  return d;
}
/** Distance-like field of her rooms (negative inside), for drawing. */
export function cvRoomField(x: number, y: number): number {
  let d = 999;
  for (const s of CV_SHAPES) d = Math.min(d, sdShape(s, x, y));
  return d;
}
/** Is (x, y) inside the Corvina's steel (hull or superstructure), not one of her rooms? */
export function corvinaSolid(x: number, y: number): boolean | null {
  if (x < CORVINA.x0 - 50 || x > CORVINA.x1 + 5 || y < 1150) return null;
  // After milestone 8 part 2 (Colin): her insides are a separate dry interior
  // (src/interior/), entered by the deck hatch. Outside she is solid steel.
  const H = corvinaHouse();
  const inHull = inPolygon(x, y, corvinaHull()) || (x > H.x && x < H.x + H.w && y > H.y && y < H.y + H.h + 4);
  return inHull ? true : null;
}
/** The hidden passage in the shelf edge that a sonar pulse reveals (milestone 8 part 2). */
export const HIDDEN = { tunnel: cap(19790, 1560, 44, 19560, 1548, 42), room: ell(19470, 1528, 92, 58), x: 19760, y: 1560 };
export const hidden = { open: false };
/**
 * After milestone 12: a soft rock seam in the sheer wall under the trench rim
 * (the face of the first ledge, about 28 m down). KS-1's drill nose bores it
 * open: a sub-sized tunnel into a sealed grotto where blooms have grown in the
 * dark, with vent ore and an Echo whorl.
 */
export const SEAM = { tunnel: cap(27400, 2150, 92, 27060, 2160, 96), room: ell(26850, 2165, 230, 140), x: 27390, y: 2150 };
export const seam = { open: false };
/** Heavy salvage on the shelf floor: the sub's grabber lifts it, a salvage crane breaks it down. */
export const SALVAGE = [
  // Kept well away from the brass spots, so the grabber's Collect isn't taken by a fitting.
  { id: 'salv-a', x: 22720 },
  { id: 'salv-b', x: 23660 },
  { id: 'salv-c', x: 25300 },
];
/** Salvage comes back (more settles out of the wrecks) after this much play time. */
export const SALVAGE_REGROW = 15 * 60;
/** Wreck lurker dens: x, and which way the den opens (1 = right, -1 = left). */
export const LURKER_DENS = [
  { x: 22320, dir: 1 },
  { x: 22790, dir: -1 },
  { x: 23560, dir: 1 },
  { x: 24620, dir: -1 },
  { x: 25330, dir: 1 },
];

/*
 * Milestone 10: the trench (Colin's choices: a drowned deep station as the
 * major site; crush depth 30 m for the Kestrel suit, 60 m for PS-1, 110 m for
 * PS-2; the sub 45 m, or 120 m with depth plating). It is a heightfield like
 * the rest of the seabed: the shelf ends at a rim, then three ledges step
 * down, then a sheer drop to the floor. One side cave (the cleft) is carved
 * into the rock under ledge B, opening onto the vent field.
 */
export const TRENCH = { x0: 26800, x1: 32550, rimX: 27300, ledgeA: 27350, ledgeB: 28350, ledgeC: 29350, drop: 30500, floorX: 30650 };
/** Ledge heights (world units below the surface). */
export const TRENCH_Y = { rim: 1660, a: 2450, b: 3290, c: 4150, floor: 7380 };
function trenchGround(x: number): number {
  let y = TRENCH_Y.rim + Math.sin(x * 0.0043) * 9;
  y += (TRENCH_Y.a + smooth((x - 27400) / 900) * 60 + Math.sin(x * 0.0071 + 1) * 12 - y) * smooth((x - 27300) / 120);
  y += (TRENCH_Y.b + Math.sin(x * 0.0063 + 2) * 14 - bump(x, 28900, 90, 30) - y) * smooth((x - 28300) / 110);
  y += (TRENCH_Y.c + Math.sin(x * 0.0081 + 3) * 10 - bump(x, 29700, 60, 40) - bump(x, 30150, 70, 50) - y) * smooth((x - 29300) / 110);
  y += (TRENCH_Y.floor + Math.sin(x * 0.0029) * 26 + Math.sin(x * 0.011 + 1) * 8 - y) * smooth((x - 30470) / 130);
  // The trench's east wall, up to just under the surface at the end of the world.
  y += (300 - y) * smooth((x - 32560) / 220);
  return y;
}
/** Crush depths in metres (Colin's numbers). */
export const CRUSH = { kestrel: 30, ps1: 60, ps2: 110, sub: 45, plated: 120 };
/** Damage per second at the limit; it doubles for every CRUSH_DOUBLE metres deeper. */
export const CRUSH_RATE = 0.02;
export const CRUSH_DOUBLE = 5;
/** Integrity lost per second, at a depth (m) against a limit (m). 0 above the limit. */
export function crushRate(depthM: number, limitM: number): number {
  if (depthM <= limitM) return 0;
  return CRUSH_RATE * Math.pow(2, (depthM - limitM) / CRUSH_DOUBLE);
}
/** The toppled relay buoy on the rim, the crushed deep probe on ledge A. */
export const TR_BUOY = { x: 27080 };
export const TR_PROBE = { x: 27880 };
/** Hot vent chimneys on the vent field: scalding water rises above each one. */
export const TR_VENTS = [
  { x: 29620, h: 120 },
  { x: 29880, h: 80 },
  { x: 30130, h: 150 },
  { x: 30360, h: 95 },
];
/** The cleft: a tunnel west into the rock under ledge B, and the chamber at its end. */
export const CLEFT = {
  tunnel: cap(29450, 4096, 52, 29120, 4058, 46),
  room: ell(28950, 4032, 165, 86),
  /** The mineral chimney that seals the mouth (a grown cinder snail grazes it away). */
  plug: { x0: 29372, x1: 29452, y0: 4024, y1: 4162 },
  x: 29412,
  y: 4100,
};
export const cleft = { open: false };
/** Finds in the cleft's chamber. */
export const CLEFT_FINDS = { plans: { x: 28880 }, spool: { x: 29040 } };
/** The drowned Fulmar deep station on the trench floor. Its airlock hatch is on top of the main module. */
export const FULMAR = { x0: 31250, x1: 32160, mainX1: 31900, hatchX: 31720, domeX: 31470 };
/** The top of the station's hull at x (or Infinity where there is none). */
export function fulmarTop(x: number): number {
  if (x < FULMAR.x0 || x > FULMAR.x1) return Infinity;
  const f = TRENCH_Y.floor + 10;
  let top = x < FULMAR.mainX1 ? f - 250 : f - 165 - (x - FULMAR.mainX1) * 0.12;
  // Round shoulders at each end.
  top += 40 * (1 - smooth((x - FULMAR.x0) / 60)) + 40 * smooth((x - (FULMAR.x1 - 50)) / 50);
  // The listening dome, crushed in on one side.
  const dx = (x - FULMAR.domeX) / 120;
  if (Math.abs(dx) < 1) top = Math.min(top, f - 250 - 95 * Math.sqrt(1 - dx * dx) * (dx > 0.2 ? 0.75 : 1));
  return top;
}
export const FULMAR_HATCH = { x: FULMAR.hatchX, y: 0 };
/*
 * Milestone 11: the sanctum, carved into the rock under the trench floor
 * (Colin's choice: swim down through it, then on foot in its heart). The
 * Choir's water there holds no weight: there is no crush depth inside.
 */
export const SANCTUM = {
  /** The door in the floor (the resonator opens it). */
  door: { x: 32360, y: 0, r: 74 },
  shaft: cap(32360, 7330, 66, 32290, 7860, 74),
  ante: ell(32060, 7990, 380, 190),
  /** The narrows from the antechamber to the hall: the first song-lock stands across it. */
  narrows: cap(31760, 8020, 92, 31500, 8070, 88),
  hall: ell(30860, 8250, 760, 430),
  /** The way down from the hall to the deep pool: the second song-lock stands across it. */
  down: cap(30230, 8500, 84, 29900, 8900, 86),
  pool: ell(29600, 9120, 540, 300),
  /** The song-locks: discs of light across the narrows (solid until sung open). */
  locks: [
    { x: 31640, y: 8045, r: 104 },
    { x: 30070, y: 8700, r: 150 },
  ],
  /** The heart's way in, on the pool's floor (an interior on foot). */
  heart: { x: 29420, y: 0 },
  /** The Choir gate (after contact): in the antechamber, and its twin by the Kestrel buoy. */
  gate: { x: 32170, y: 7990 },
  homeGate: { x: 1180, y: 0 },
};
export const sanctum = { door: false, locks: [false, false] };
const SANCTUM_SHAPES: CaveShape[] = [SANCTUM.shaft, SANCTUM.ante, SANCTUM.narrows, SANCTUM.hall, SANCTUM.down, SANCTUM.pool];
export function sanctumShapes(): readonly CaveShape[] {
  return SANCTUM_SHAPES;
}
/** Is the point in the sanctum's open water (whatever its doors)? */
export function inSanctum(x: number, y: number): boolean {
  if (x < 29000 || x > 32500 || y < 7300) return false;
  for (const s of SANCTUM_SHAPES) if (inShape(s, x, y)) return true;
  return false;
}
/** Solid parts of the sanctum's doors (the door in the floor, the song-locks) while shut. */
function sanctumDoorSolid(x: number, y: number): boolean {
  const d = SANCTUM.door;
  if (!sanctum.door && Math.abs(x - d.x) < d.r && y > d.y - 30 && y < d.y + 60) return true;
  for (const [i, l] of SANCTUM.locks.entries()) if (!sanctum.locks[i] && Math.abs(x - l.x) < 24 && Math.abs(y - l.y) < l.r) return true;
  return false;
}

/** Predators of the trench (src/actors/deep.ts): where each one lives. */
export const TR_LANTERNJAWS = [
  { x: 27950, y: 2150 },
  { x: 28950, y: 2950 },
  { x: 30000, y: 3700 },
  { x: 30950, y: 5300 },
  { x: 31700, y: 6450 },
  { x: 30900, y: 6950 },
];
export const TR_STALKERS = [
  { x0: 28450, x1: 29300, y0: 2900, y1: 3200 },
  { x0: 30550, x1: 31300, y0: 4600, y1: 6400 },
  { x0: 30700, x1: 32400, y0: 6700, y1: 7250 },
];
export const TR_SPIDERS = [
  { x0: 28600, x1: 29250 },
  { x0: 29480, x1: 30420 },
  { x0: 31000, x1: 31220 },
  // (Milestone 11: the floor's east end is the sanctum's door now; its strider moved to the floor's west end.)
  { x0: 30700, x1: 30950 },
];

function forestFloor(x: number): number {
  let y = 1290 + Math.sin(x * 0.0017) * 28 + Math.sin(x * 0.0041 + 1) * 14;
  y -= bump(x, 11150, 260, 80) + bump(x, 12850, 220, 110) + bump(x, 13850, 200, 60);
  return y;
}

/** The shelf, the east face, the forest floor and the east wall. */
function eastGround(x: number): number {
  let y = SHELF.floor + Math.sin(x * 0.011) * 5 - bump(x, 9300, 90, 22);
  y += (forestFloor(x) - y) * smooth((x - 9600) / 450);
  y += (260 - y) * smooth((x - 14800) / 420);
  // Milestone 8: the shelf edge and the wreck shelf beyond, and the world's east wall.
  y += (shelfFloor(x) - y) * smooth((x - 19300) / 430);
  // Milestone 10: the shelf breaks off into the trench.
  if (x > 26600) y += (trenchGround(x) - y) * smooth((x - 26600) / 200);
  return y;
}

const rand = mulberry32(WORLD_SEED ^ 0x1111);
const bumps = Array.from({ length: 6 }, (_, i) => ({
  f: (i + 1) * 0.0021 + rand() * 0.0012,
  a: 14 / (i + 1),
  p: rand() * Math.PI * 2,
}));

export function smooth(t: number): number {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}

const bump = (x: number, cx: number, w: number, h: number) => Math.exp(-(((x - cx) / w) ** 2)) * h;

/**
 * The Kestrel basin (milestone 5, tightened after milestone 9). Its floor sits
 * a little below row 3 of the build grid (see GRID_BASE in src/game/base.ts):
 * the three rows under it are rock, so the trench is shallower than it was.
 * BASIN_EAST is where the cliff up to the old shelf starts; BASIN_WEST is
 * where the stepped west wall meets the floor's western slope.
 */
export const BASIN_FLOOR = 1364;
export const BASIN_EAST = 300;
export const BASIN_WEST = -2644;
/** A nook on a ledge of the west wall (an Echo whorl hides there). */
export const WALL_NOOK = { x: -2950, y: 560 };

/*
 * The steps line up with the build grid (src/game/base.ts can't be imported
 * here, so its numbers are repeated): cells are 112 units, the grid starts at
 * x = -4884 and its bottom row sits on y = 1655. A step `rows` high fills that
 * many cells of its columns with rock. Its top is 16 below the row line, which
 * keeps the row above open despite the ripples. East steps rise towards the
 * shelf with the riser inside their own west column; west steps rise towards
 * the wall with the riser inside their own east column, so the cells beside a
 * step always stay open. Listed from the floor outwards.
 */
const T_CELL = 112;
const T_GRID_X0 = -4884;
const T_GRID_BASE = 1655;
const stepY = (rows: number) => T_GRID_BASE - rows * T_CELL + 16;
/** Three terraces down from the shelf: rows 5, 7 and 9 (columns 34-37, 38-41, 42-45). */
const EAST_STEPS = [
  { col: 34, rows: 5 },
  { col: 38, rows: 7 },
  { col: 42, rows: 9 },
].map((t) => ({ x: T_GRID_X0 + t.col * T_CELL, y: stepY(t.rows) }));
/** The floor's western slope (one row a column, columns 23 to 20), then a ledge for the nook and the wall. */
const WEST_STEPS = [
  { col: 23, rows: 4 },
  { col: 22, rows: 5 },
  { col: 21, rows: 6 },
  { col: 20, rows: 7 },
  { col: 19, rows: 8 },
  { col: 18, rows: 10 },
  { col: 17, rows: 10 },
  { col: 16, rows: 10 },
  { col: 15, rows: 14 },
].map((t) => ({ x: T_GRID_X0 + (t.col + 1) * T_CELL, y: stepY(t.rows) }));

function basinGround(x: number): number {
  // Gentle ripples on the floor, and a few low sand mounds.
  let y = BASIN_FLOOR + 6 + Math.sin(x * 0.004) * 6 + Math.sin(x * 0.0113 + 2) * 4;
  y -= bump(x, -1800, 260, 10) + bump(x, -1250, 320, 12);
  // Stepped terraces down from the shelf, and the western slope up to the wall.
  for (const t of EAST_STEPS) y += (t.y - y) * smooth((x - t.x) / 46);
  for (const t of WEST_STEPS) y += (t.y - y) * smooth((t.x - x) / 46);
  // The cliff up to the shelf: steep, with a shoulder part-way up.
  const up = smooth((x - (BASIN_EAST - 10)) / 85);
  y += (430 - y) * up;
  y += bump(x, BASIN_EAST + 10, 22, 90) * (1 - up);
  return y;
}

/** Height of the seabed at x: the first solid y below the water (ignoring the ledge and the cave). */
export function groundY(x: number): number {
  if (x < 380) {
    // The basin (milestone 5). East of 380 the shallows are unchanged.
    let y = basinGround(x);
    const k = 0.35 + 0.65 * smooth((x - 290) / 85);
    for (const b of bumps) y += Math.sin(x * b.f + b.p) * b.a * k;
    return y;
  }
  let y = 430;
  // Coral garden: a gentle slope down, with two outcrops.
  y += smooth((x - 1700) / 1200) * 50;
  y -= bump(x, 2270, 150, 120) + bump(x, 2410, 70, 50);
  y -= bump(x, 3150, 110, 80);
  // The sand channel.
  y += smooth((x - 3550) / 350) * 130 - smooth((x - 4350) / 350) * 130;
  // The knoll that the beacon stands on.
  y -= bump(x, 4780, 160, 70);
  // The drop-off into deeper water, then the rising wall at the end of the grotto.
  y += smooth((x - 5000) / 750) * 560;
  y -= smooth((x - 6550) / 300) * 520;
  // Seagrass meadow: a few soft hollows, and a narrow crevice.
  y += bump(x, 7250, 180, 25) + bump(x, 8050, 140, 20);
  y += bump(x, CREVICE_X, 38, 130);
  // The east cliff (milestone 7: it now rises out of the water).
  y -= smooth((x - 8380) / 260) * 270;
  if (x > 8540) y += (eastGround(x) - y) * smooth((x - 8540) / 100);
  const k = x > 8700 ? 0.5 : 1;
  for (const b of bumps) y += Math.sin(x * b.f + b.p) * b.a * k;
  return y;
}

/**
 * The rock ledge above the grotto, as a closed outline. It hangs off the
 * wall at the end of the drop-off; the diver can swim over it or underneath it.
 */
export const LEDGE: [number, number][] = (() => {
  const pts: [number, number][] = [];
  const r = mulberry32(WORLD_SEED ^ 0x2222);
  const X0 = 5730;
  const X1 = 6870;
  for (let x = X0; x <= X1; x += 40) {
    const t = (x - X0) / (X1 - X0);
    const top = 600 - smooth(t * 3) * 50 + Math.sin(x * 0.013) * 10 + (r() - 0.5) * 8;
    pts.push([x, top]);
  }
  for (let x = X1; x >= X0; x -= 40) {
    const t = (x - X0) / (X1 - X0);
    const bottom = 690 + smooth(t * 2.5) * 40 + Math.sin(x * 0.021 + 1) * 12 + (r() - 0.5) * 10;
    pts.push([x, bottom]);
  }
  pts.push([X0 - 25, 668], [X0 - 38, 642], [X0 - 28, 616]);
  return pts;
})();

/**
 * The cave in the east cliff: a tunnel sloping gently down into the rock.
 * Milestone 7: it runs right through, under the island, and comes out on
 * its east face above the kelp forest.
 */
export const CAVE = { x0: 8470, x1: 9960 };
export function caveTop(x: number): number {
  return 420 + (x - CAVE.x0) * 0.2 + Math.sin(x * 0.03) * 8;
}
export function caveBottom(x: number): number {
  return 560 + (x - CAVE.x0) * 0.24 + Math.sin(x * 0.02 + 2) * 6;
}
/** The open part of the tunnel at x, as [top, bottom]; it closes off in a rounded end. */
export function caveSpan(x: number): [number, number] {
  return [caveTop(x), caveBottom(x)];
}
function inCave(x: number, y: number): boolean {
  if (x < CAVE.x0 - 40 || x > CAVE.x1) return false;
  const [t, b] = caveSpan(x);
  return y > t && y < b;
}

function inPolygon(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Is this point inside rock or sand? Used for collisions. */
export function isSolid(x: number, y: number): boolean {
  if (x < WORLD_X0 || x > WORLD_W) return true;
  if (!boom.open && Math.abs(x - BOOM_X) < 16 && y < SHELF.floor + 8) return true;
  if (!kelpWall.cut && x > KELP_WALL.x0 && x < KELP_WALL.x1 && y > KELP_WALL.y0 && y < KELP_WALL.y1) return true;
  // Milestone 8 part 2: the Corvina is solid steel, with rooms inside.
  if (x > 25400) {
    const c = corvinaSolid(x, y);
    if (c !== null) return c;
  }
  // Milestone 11: the sanctum under the floor, behind its doors.
  // This opening is below the Fulmar, whose silhouette is solid from its roof down.
  if (x > 29000 && x < 32500 && y > 7250) {
    if (sanctumDoorSolid(x, y)) return true;
    if (inSanctum(x, y)) return false;
  }
  // Milestone 10: the drowned station is solid; the cleft is open once its chimney is grazed away.
  if (x > 31200 && x < 32200 && y >= fulmarTop(x)) return true;
  if (x > 28700 && x < 29520 && y > 3920 && y < 4200) {
    if (!cleft.open && x > CLEFT.plug.x0 && x < CLEFT.plug.x1 && y > CLEFT.plug.y0 && y < CLEFT.plug.y1) return true;
    if (inShape(CLEFT.tunnel, x, y) || inShape(CLEFT.room, x, y)) return false;
  }
  if (seam.open && x > 26600 && x < 27500 && y > 2000 && y < 2320 && (inShape(SEAM.tunnel, x, y) || inShape(SEAM.room, x, y))) return false;
  if (hidden.open && x > 19370 && x < 19840 && y > 1460 && (inShape(HIDDEN.tunnel, x, y) || inShape(HIDDEN.room, x, y))) return false;
  if (y >= groundY(x)) return !inCave(x, y) && !inKelpCaves(x, y);
  if (y > 540 && y < 780 && x > 5690 && x < 6880 && inPolygon(x, y, LEDGE)) return true;
  return false;
}

/** Is the point inside the cave tunnel (the dark part)? */
export function inCaveTunnel(x: number, y: number): boolean {
  return x > CAVE.x0 + 40 && inCave(x, y) && y >= groundY(x);
}

/**
 * Bake how much daylight reaches each spot ("sky visibility"), into a small
 * image covering the whole world (red = daylight, green = solid, for lamp shadows). 1 = open water under the sun,
 * lower = shaded by rock above. It is blurred so the shadows are soft.
 * The lighting shader reads it every frame, so shadows cost nothing at runtime.
 */
export function bakeSkyVisibility(cell: number, blurPasses: number): HTMLCanvasElement {
  const wasOpen = boom.open;
  boom.open = true;
  // The drill seam is baked open, so the lamp lights the grotto once it is bored (the plug is drawn as rock).
  const seamWas = seam.open;
  seam.open = true;
  const w = Math.ceil(WORLD_SPAN / cell);
  const h = Math.ceil(WORLD_H / cell);
  const vis = new Float32Array(w * h);
  // Graphics session G2: which cells are rock, steel or sand, for the lamp's shadows (stored in the green channel, unblurred).
  const occ = new Uint8Array(w * h);
  for (let i = 0; i < w; i++) {
    const x = WORLD_X0 + (i + 0.5) * cell;
    let rock = 0;
    // Milestone 10: west of the trench there is nothing but rock below the shelf, so skip the tests there.
    const deepRock = x < TRENCH.x0 - 300 ? 2300 : Infinity;
    for (let j = 0; j < h; j++) {
      const y = (j + 0.5) * cell;
      if (y > deepRock) {
        vis[j * w + i] = 0;
        occ[j * w + i] = 255;
        continue;
      }
      const solid = isSolid(x, y);
      // Light enters a surface slightly, so the top of a rock is fully lit.
      vis[j * w + i] = Math.exp(-rock / 70);
      if (solid) occ[j * w + i] = 255;
      if (solid) rock += cell;
      // Deep inside the cave nothing gets through.
      else if (x > CAVE.x0 && x < CAVE.x1 - 120 && y > caveTop(x) - 10 && y < caveBottom(x) + 10) rock += cell * 0.4;
      // Milestone 7: the kelp canopy shades the forest more the deeper you go.
      else if (x > 9650 && y > 40) rock += cell * 0.055 * smooth((x - 9650) / 450) * (1 - 0.5 * smooth((x - 14700) / 400)) * (1 - smooth((x - 19200) / 300));
      // Milestone 8: the wreck shelf is twilight, dimmer the deeper it gets.
      if (x > 19200 && y > 300 && !solid) rock += cell * 0.03 * smooth((x - 19200) / 600);
      // Milestone 10: the trench gets darker still with depth.
      if (x > TRENCH.x0 && y > 1700 && !solid) rock += cell * 0.02 * smooth((y - 1700) / 1500);
    }
  }
  // Soft shadow edges: repeated small box blurs approximate a smooth blur.
  const tmp = new Float32Array(w * h);
  const trenchI = Math.floor((TRENCH.x0 - 400 - WORLD_X0) / cell);
  const shallowJ = Math.min(h, Math.ceil(2400 / cell));
  for (let pass = 0; pass < blurPasses; pass++) {
    for (let j = 0; j < h; j++)
      for (let i = j < shallowJ ? 0 : trenchI; i < w; i++) {
        let s = 0;
        for (let k = -2; k <= 2; k++) s += vis[j * w + Math.min(w - 1, Math.max(0, i + k))];
        tmp[j * w + i] = s / 5;
      }
    for (let j = 0; j < h; j++)
      for (let i = j < shallowJ ? 0 : trenchI; i < w; i++) {
        let s = 0;
        for (let k = -2; k <= 2; k++) s += tmp[Math.min(h - 1, Math.max(0, j + k)) * w + i];
        vis[j * w + i] = s / 5;
      }
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  for (let k = 0; k < w * h; k++) {
    const v = Math.round(Math.min(1, Math.max(0, vis[k])) * 255);
    img.data[k * 4] = v;
    img.data[k * 4 + 1] = occ[k];
    img.data[k * 4 + 2] = v;
    img.data[k * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  boom.open = wasOpen;
  seam.open = seamWas;
  return canvas;
}

// Milestone 8: the anchor rings stand 1.6 m above the seabed (set once every helper above exists).
for (const r of RINGS) r.y = groundY(r.x) - 120;
// Milestone 8 part 2: the Corvina's stern bollard and deck hatch sit on her deck.
CV_BOLLARD.y = cvDeckY(CV_BOLLARD.x) - 22;
CV_HATCH.y = cvDeckY(CV_HATCH.x);
// Milestone 10: the Fulmar's airlock hatch sits on top of her main module.
FULMAR_HATCH.y = fulmarTop(FULMAR_HATCH.x);
// Milestone 11: the sanctum's door lies in the floor; the heart's way in on the pool's floor; the home gate on the shelf.
SANCTUM.door.y = groundY(SANCTUM.door.x);
SANCTUM.heart.y = ellBottom(SANCTUM.pool, SANCTUM.heart.x) - 4;
SANCTUM.homeGate.y = groundY(SANCTUM.homeGate.x);
/** Every point the grapple can hook: the race's rings, the Corvina's bollard and her hold's beam hooks. */
export const ANCHORS: { x: number; y: number }[] = [...RINGS];
