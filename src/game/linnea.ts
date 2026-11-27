import type { SaveData } from './state';
import { currentStage, missingKey } from './petrel';
import { WORLD_X0 } from '../world/terrain';

/**
 * Phase 18: Linnea, the axolotl guide (Colin's daughter's idea and name).
 *
 * She waits at one place at a time and moves on as the story moves. When
 * Kestrel swims up to her and talks, she says one or two short, gentle lines
 * that hint at what to look for next, never orders. Which place and which
 * lines come only from the save, so this file has no graphics and is tested
 * in Node (scripts/test-progression.mjs).
 *
 * The route and its gates are in docs/phase-12-progression-audit.md.
 */

export type LinneaSpotId = 'cliff' | 'forest' | 'caves' | 'shelf' | 'corvina' | 'rim' | 'fulmar' | 'sanctum' | 'home';

export interface LinneaSpot {
  id: LinneaSpotId;
  /** Where she floats: x, and how far above the seabed there. */
  x: number;
  lift: number;
  /** Which way she looks while nobody is near (1 right, -1 left): towards where Kestrel comes from. */
  face: 1 | -1;
  /** For the docs and checks: where this is, in words. */
  where: string;
}

/**
 * Each spot is in open water and at least 190 units from any material or
 * find, so Talk is never hidden behind a Collect for something else (pickups
 * claim Collect within 72 units; she talks within 150).
 */
export const LINNEA_SPOTS: Record<LinneaSpotId, LinneaSpot> = {
  cliff: { id: 'cliff', x: 8330, lift: 110, face: -1, where: 'Sunlit Shallows, outside the dark cave in the east cliff' },
  forest: { id: 'forest', x: 10130, lift: 210, face: -1, where: 'Kelp Forest, where the cliff cave comes out' },
  caves: { id: 'caves', x: 14560, lift: 110, face: -1, where: 'Kelp Forest, outside the mouth of the kelp caves' },
  shelf: { id: 'shelf', x: 19150, lift: 52, face: -1, where: 'the rock plateau above the race, at the edge of the Wreck Shelf' },
  corvina: { id: 'corvina', x: 25230, lift: 64, face: -1, where: 'Wreck Shelf, outside the Corvina' },
  rim: { id: 'rim', x: 26920, lift: 58, face: -1, where: 'the trench rim, where the Wreck Shelf ends' },
  fulmar: { id: 'fulmar', x: 30990, lift: 170, face: -1, where: 'the trench floor, outside the Fulmar deep station' },
  sanctum: { id: 'sanctum', x: 32240, lift: 80, face: -1, where: 'the trench floor, by the round stone door' },
  home: { id: 'home', x: 1820, lift: 265, face: -1, where: 'Sunlit Shallows, just east of the Kestrel base, after first contact' },
};

/** The order she moves through them (each one only while it is the current stage). */
export const LINNEA_ORDER: LinneaSpotId[] = ['cliff', 'forest', 'caves', 'shelf', 'corvina', 'rim', 'fulmar', 'sanctum', 'home'];

export interface LinneaPlan {
  spot: LinneaSpotId;
  /** A short id for this hint (tests, and to tell a new hint from one already heard). */
  hint: string;
  /** One or two short lines. */
  lines: string[];
}

const MAP_COL = 250;
/** Has Kestrel been near x? (The zone map's record: one character per 250 units.) */
function seen(save: SaveData, x: number): boolean {
  return (save.mapSeen ?? '')[Math.floor((x - WORLD_X0) / MAP_COL)] === '1';
}
const has = (save: SaveData, g: string) => (save.gear as string[]).includes(g);
const bp = (save: SaveData, b: string) => (save.blueprints as string[]).includes(b);
const found = (save: SaveData, f: string) => (save.finds as string[]).includes(f);
const researching = (save: SaveData, what: string) => Object.values(save.jobs ?? {}).some((j) => j.id === `research:${what}` || j.id === `build:${what}`);

/** The Kelp caves' mouth and the Corvina: once Kestrel has been near, Linnea moves on to them. */
const CAVES_X = 14975;
const CORVINA_X = 25900;

/** Where Linnea is now, and what she would say. */
export function linneaPlan(save: SaveData): LinneaPlan {
  const light = has(save, 'light');
  // 1. The first gear gate: the dark cave in the east cliff needs the dive light.
  if (!light) {
    if (bp(save, 'light') || researching(save, 'light'))
      return { spot: 'cliff', hint: 'cliff-build', lines: ['Your Lab has worked out the light, hasn\'t it? I can tell.', 'Once a Workshop builds it, the dark in there won\'t be so dark.'] };
    if (found(save, 'recorder'))
      return { spot: 'cliff', hint: 'cliff-lab', lines: ['You found the sled\'s little recorder!', 'A Lab at your base could read what it remembers.'] };
    return { spot: 'cliff', hint: 'cliff-sled', lines: ['It\'s so dark in that cave... I\'d never swim in without a proper light.', 'The old survey sled out on the sand still blinks sometimes. I wonder what it remembers?'] };
  }
  const tow = has(save, 'tow');
  // 2. Just through the cliff: the Kelp Forest, until Kestrel has seen the caves' mouth.
  if (!tow && !seen(save, CAVES_X)) {
    if (save.sub && !save.boomOpen)
      return { spot: 'forest', hint: 'forest-boom', lines: ['Your little sub is too big for the cave, isn\'t it?', 'The old boom up on the clifftop has a winch on this side...'] };
    return { spot: 'forest', hint: 'forest-east', lines: ['Welcome to the kelp! Listen... something echoes in the rock wall, far to the east.'] };
  }
  // 3. Outside the kelp caves (the zone's major site), until the grapple line is built.
  if (!tow) {
    const lit = save.brackets.filter(Boolean).length;
    const cutter = has(save, 'cutter');
    if (!cutter && !found(save, 'cache') && !bp(save, 'cutter')) {
      if (lit < save.brackets.length)
        return { spot: 'caves', hint: 'caves-moss', lines: ['Deep inside, the water is darker than dark.', 'The glowing moss on the shady rocks out here... I wonder if it would help, set in those old brackets?'] };
      return { spot: 'caves', hint: 'caves-cache', lines: ['You lit the black water! It\'s so pretty now.', 'Someone left something at the far end, I\'m sure of it.'] };
    }
    if (!cutter)
      return { spot: 'caves', hint: 'caves-cutter', lines: ['That old cache had plans for something hot and bright.', 'A Lab and a Workshop could make it real.'] };
    if (!found(save, 'towcoil') && !bp(save, 'tow'))
      return { spot: 'caves', hint: 'caves-rope', lines: ['I heard creaking up above the junction inside. An old rope store, maybe?'] };
    return { spot: 'caves', hint: 'caves-line', lines: ['Rope notes! A line that hooks onto things could take you very far east.'] };
  }
  const psuit = has(save, 'psuit');
  // 4. The plateau above the race, until Kestrel has reached the Corvina.
  if (!psuit && !seen(save, CORVINA_X)) {
    const lines = ['The water down there pulls so hard!', 'Those old rings across it... your line could hook onto them, one after another.'];
    if (save.sub && !save.vane) return { spot: 'shelf', hint: 'shelf-vane', lines: [lines[0], 'Past the race there\'s a winch. I think it could calm the water enough for your sub.'] };
    return { spot: 'shelf', hint: 'shelf-race', lines };
  }
  // 5. Outside the Corvina (the Wreck Shelf's major site), until the PS-1 suit is built.
  if (!psuit) {
    if (!save.corvina.hatch)
      return { spot: 'corvina', hint: 'corvina-hatch', lines: ['That big ship is shut tight. Her deck hatch is welded closed.', 'Her stern looks easy to hook onto, and your cutter does love a welded seam.'] };
    if (!save.corvina.breakers.every(Boolean))
      return { spot: 'corvina', hint: 'corvina-power', lines: ['Inside, the old ship is fast asleep.', 'Wake her breakers and maybe her doors will listen.'] };
    if (!found(save, 'suitplans') && !bp(save, 'psuit'))
      return { spot: 'corvina', hint: 'corvina-hold', lines: ['She hums again! Something about deep-water suits is tucked away down in her hold.'] };
    return { spot: 'corvina', hint: 'corvina-suit', lines: ['Those suit plans! With a Lab and a Workshop, you could swim deeper than ever.'] };
  }
  // 6. The trench rim, until the cleft's chimney is grazed open.
  if (!save.cleftOpen) {
    const grownSnail = [save.jar, save.jar2].some((j) => j?.species === 'snail' && j.stage === 'grown');
    if (grownSnail)
      return { spot: 'rim', hint: 'rim-snail-ready', lines: ['Your snail looks hungry!', 'There\'s a mineral chimney sealing a crack by the vents. I bet it would love a nibble.'] };
    return { spot: 'rim', hint: 'rim-chimney', lines: ['Down by the warm vents, a crack in the rock is sealed by a mineral chimney.', 'The little cinder snails graze on those. A grown one might clear it...'] };
  }
  const resonReady = bp(save, 'resonator') || found(save, 'resonplans') || has(save, 'resonator') || save.signals.found.length >= 4;
  // 7. The trench floor outside the Fulmar, until her resonator plans and spools are found.
  if (!resonReady) {
    if (!has(save, 'psuit2'))
      return { spot: 'fulmar', hint: 'fulmar-deep', lines: ['There\'s an old station on the very bottom. It\'s deeper than your suit can go.', 'The cleft by the vents held plans for a stronger one, didn\'t it?'] };
    if (!save.fulmar.open)
      return { spot: 'fulmar', hint: 'fulmar-hatch', lines: ['The station\'s airlock is on top. Its old winch might still turn.'] };
    if (!save.fulmar.breakers.every(Boolean))
      return { spot: 'fulmar', hint: 'fulmar-power', lines: ['It\'s so dark inside the station.', 'Three breakers to wake it, I think.'] };
    return { spot: 'fulmar', hint: 'fulmar-spools', lines: ['Spools of light are hidden in there. The Choir\'s own patterns, I\'m sure of it.'] };
  }
  // 8. By the round stone door in the trench floor, until first contact.
  if (!save.sanctum.contact) {
    if (save.signals.decoded.length < 4 && !bp(save, 'resonator') && !has(save, 'resonator'))
      return { spot: 'sanctum', hint: 'sanctum-array', lines: ['Your Signal array needs to understand the light.', 'The more different glows your creatures make, the more it can read. Babies have their own patterns, too.'] };
    if (!has(save, 'resonator'))
      return { spot: 'sanctum', hint: 'sanctum-resonator', lines: ['All four pieces of the song! A Workshop could make something that sings.'] };
    if (!save.sanctum.door)
      return { spot: 'sanctum', hint: 'sanctum-door', lines: ['This door is listening. I think it wants a song.'] };
    return { spot: 'sanctum', hint: 'sanctum-heart', lines: ['They\'re waiting for you, down at the very bottom.', 'I can feel them singing in my gills.'] };
  }
  // 9. After first contact: home in the shallows. Beyond Earth: she follows the Petrel's build.
  return homePlan(save);
}

/** After first contact (Beyond Earth, Nov 27, 2026): Linnea at home in the shallows, following the Petrel's build. */
export function homePlan(save: SaveData): LinneaPlan {
  if (!save.pieces.some((p) => p.kind === 'works'))
    return { spot: 'home', hint: 'home-works', lines: ['You did it! The Choir sang all the way up to the shallows.', 'It showed you a ship, didn\'t it? I saw it in the light. A workshop for her parts would be a start.'] };
  const stage = currentStage(save);
  if (stage) {
    const key = missingKey(save, stage);
    if (key) return { spot: 'home', hint: `home-petrel-${stage.id}`, lines: [`The ship's ${stage.name.toLowerCase()} needs what your creatures know.`, `I think it wants ${key}.`] };
    return { spot: 'home', hint: `home-petrel-run-${stage.id}`, lines: ['Look up! She gets a little bigger every time I surface.', 'Keep the storage full and the works will keep making parts.'] };
  }
  return { spot: 'home', hint: 'home-petrel-whole', lines: ['She\'s whole! The Petrel, waiting on the water.', 'A cold moon with an ocean under the ice... Do you think the water tastes different there?'] };
}

/** How close Kestrel must be to talk (world units), and where she notices Kestrel coming. */
export const LINNEA_TALK_RANGE = 150;
export const LINNEA_NOTICE_RANGE = 340;

/**
 * The save keeps which places Kestrel has met Linnea at (in `tips`, as
 * `linnea:<spot>`), so her first hello at each place is a little warmer. Older
 * saves simply have none: no new field is needed.
 */
export function linneaMet(save: SaveData, spot: LinneaSpotId): boolean {
  return save.tips.includes(`linnea:${spot}`);
}
export function markLinneaMet(save: SaveData, spot: LinneaSpotId): void {
  if (!linneaMet(save, spot)) save.tips.push(`linnea:${spot}`);
}

/** The very first time Kestrel meets her, she says who she is before the hint. */
export function linneaGreeting(save: SaveData): string | null {
  return LINNEA_ORDER.some((s) => linneaMet(save, s)) ? null : 'Oh! Hello. I\'m Linnea.';
}
