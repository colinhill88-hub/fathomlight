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
 */

/** West edge of the world (milestone 5 added the basin west of the old wall). */
export const WORLD_X0 = -5600;
export const WORLD_W = 27200;
/** Width of the whole world, from WORLD_X0 to WORLD_W. */
export const WORLD_SPAN = WORLD_W - WORLD_X0;
export const WORLD_H = 1980;
export const WU_PER_METRE = 75;

/** Where the diver starts, and comes back to after blacking out: the Kestrel buoy at the surface. */
export const SPAWN = { x: 900, y: 40 };
export const BUOY_X = 900;
export const BEACON_X = 4990;
export const SLED_X = 4120;
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
  y += (300 - y) * smooth((x - 26880) / 260);
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
 * The Kestrel basin (milestone 5). Its floor sits a little below the bottom
 * row of the build grid (see GRID_BASE in src/game/base.ts), so every
 * bottom-row cell is open water. BASIN_EAST is where the cliff up to the
 * old shelf starts; BASIN_WEST where the far wall starts to rise.
 */
export const BASIN_FLOOR = 1700;
export const BASIN_EAST = 300;
export const BASIN_WEST = -4990;
/** A nook in the west wall (an Echo whorl hides there). */
export const WALL_NOOK = { x: -5225, y: 770 };

/*
 * The terraces line up with the build grid (src/game/base.ts can't be
 * imported here, so its numbers are repeated): cells are 112 units, the grid
 * starts at x = -4884 and its bottom row sits on y = 1655. A ledge `rows`
 * high fills that many cells of its two columns with rock; its riser sits
 * inside its own west column, so the cells beside it stay open. Its top is
 * 16 below the row line, which keeps the row above open despite the ripples.
 * They take 30 cells: 2 columns × (2 + 5 + 8) rows.
 */
const T_CELL = 112;
const T_GRID_X0 = -4884;
const T_GRID_BASE = 1655;
const TERRACES = [
  { col: 41, rows: 2 },
  { col: 43, rows: 5 },
  { col: 45, rows: 8 },
].map((t) => ({ x: T_GRID_X0 + t.col * T_CELL, y: T_GRID_BASE - t.rows * T_CELL + 16 }));

function basinGround(x: number): number {
  // Gentle ripples on the floor, and a few low sand mounds.
  let y = BASIN_FLOOR + 6 + Math.sin(x * 0.004) * 6 + Math.sin(x * 0.0113 + 2) * 4;
  y -= bump(x, -3300, 260, 10) + bump(x, -1450, 320, 12);
  // Terraces at the foot of the cliff (Colin, after milestone 6): three rock
  // ledges, each two grid columns wide, stepping down from the shelf, so pieces
  // built off the shelf edge stand on a ledge instead of on 17 m legs.
  for (const t of TERRACES) y += (t.y - y) * smooth((x - t.x) / 46);
  // The cliff up to the shelf: steep, with a shoulder part-way up.
  const up = smooth((x - (BASIN_EAST - 10)) / 85);
  y += (430 - y) * up;
  y += bump(x, BASIN_EAST + 10, 22, 90) * (1 - up);
  // The west wall: a steep rise with a ledge (the nook) part-way up.
  const w = smooth((BASIN_WEST - x) / 170);
  y += (WALL_NOOK.y + 26 - y) * w;
  y -= bump(x, WALL_NOOK.x + 35, 30, 14) * w; // a lip at the front of the nook
  const w2 = smooth((BASIN_WEST - 290 - x) / 170);
  y += (110 - y) * w2;
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
  const w = Math.ceil(WORLD_SPAN / cell);
  const h = Math.ceil(WORLD_H / cell);
  const vis = new Float32Array(w * h);
  // Graphics session G2: which cells are rock, steel or sand, for the lamp's shadows (stored in the green channel, unblurred).
  const occ = new Uint8Array(w * h);
  for (let i = 0; i < w; i++) {
    const x = WORLD_X0 + (i + 0.5) * cell;
    let rock = 0;
    for (let j = 0; j < h; j++) {
      const y = (j + 0.5) * cell;
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
    }
  }
  // Soft shadow edges: repeated small box blurs approximate a smooth blur.
  const tmp = new Float32Array(w * h);
  for (let pass = 0; pass < blurPasses; pass++) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        let s = 0;
        for (let k = -2; k <= 2; k++) s += vis[j * w + Math.min(w - 1, Math.max(0, i + k))];
        tmp[j * w + i] = s / 5;
      }
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
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
  return canvas;
}

// Milestone 8: the anchor rings stand 1.6 m above the seabed (set once every helper above exists).
for (const r of RINGS) r.y = groundY(r.x) - 120;
// Milestone 8 part 2: the Corvina's stern bollard and deck hatch sit on her deck.
CV_BOLLARD.y = cvDeckY(CV_BOLLARD.x) - 22;
CV_HATCH.y = cvDeckY(CV_HATCH.x);
/** Every point the grapple can hook: the race's rings, the Corvina's bollard and her hold's beam hooks. */
export const ANCHORS: { x: number; y: number }[] = [...RINGS];
