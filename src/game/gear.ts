import { BaseLayout, isDone, Placed } from './base';
import type { BlueprintId, FindId, GearId, MaterialId, SaveData, StationJob } from './state';

/**
 * Milestone 7: the first gear gate. No drawing here, just the rules.
 *
 *  - The Lab reads data finds (like the survey sled's recorder) and scans,
 *    and decodes them into blueprints. Each research job runs for a while
 *    of play time, and only while the Lab has power.
 *  - The Workshop builds gear from a blueprint the Lab has decoded, paying
 *    its materials up front. It also only works with power.
 *  - Gear opens places the diver could already see, as in Zelda: the dive
 *    light opens the dark cave in the east cliff.
 *
 * Every number is a constant here, easy to tune after Colin plays.
 */

export interface ResearchDef {
  id: BlueprintId;
  name: string;
  /** What the Lab says while it works. */
  text: string;
  /** Data finds it uses up. */
  finds: FindId[];
  /** Scanner log entries it needs. */
  scans: string[];
  seconds: number;
}

export const RESEARCH: Record<BlueprintId, ResearchDef> = {
  // Phase 21, room for more creatures: bigger tanks from the Workshop.
  tankkit: {
    id: 'tankkit',
    name: 'Tank extension TX-1 blueprint',
    text: 'From your scans of the shallows creatures: a bolt-on glass extension that takes a creature tank from 4 to 6, or a Grand tank from 8 to 12. The Workshop builds kits; fit one at a Habitat console.',
    finds: [],
    scans: ['glowfin', 'puffcap', 'ray'],
    seconds: 70,
  },
  // Linnea's third request gives these plans (never decoded in a Lab, so not in RESEARCH_ORDER).
  display: {
    id: 'display',
    name: 'Display aquarium DR-1 plans',
    text: "Linnea's plans for a showpiece: an extended Grand tank refitted with a tall curved front, for 20 creatures.",
    finds: [],
    scans: [],
    seconds: 1,
  },
  light: {
    id: 'light',
    name: 'Dive light blueprint',
    text: 'Reads the SLED 2 recorder: the earlier expedition was testing a sealed, high-output dive light for the caves.',
    finds: ['recorder'],
    scans: ['sled'],
    seconds: 75,
  },
  // Milestone 7 part 2 (Colin's choices: costs as proposed, research 60–120 s).
  gtank: {
    id: 'gtank',
    name: 'Grand tank GT-1 blueprint',
    text: 'From your scans of the tinker crab, the lantern shrimp and the giant kelp: a big 3 × 2 tank for eight creatures, with a planter for two kinds of plant. Unlocks a build card.',
    finds: [],
    scans: ['crab', 'shrimp', 'gkelp'],
    seconds: 90,
  },
  sorter: {
    id: 'sorter',
    name: 'Sorting pod SP-1 blueprint',
    text: 'From your scans of giant kelp (its holdfast resin) and bladder kelp: resin-sealed storage with a separate bay for every material, so one kind can never crowd out the rest. Unlocks a build card.',
    finds: [],
    scans: ['gkelp', 'bladder'],
    seconds: 60,
  },
  relay: {
    id: 'relay',
    name: 'Air relay AR-1 blueprint',
    text: 'Reads the KS RELAY 2 log from the kelp caves: a surface float that pumps fresh air down a hose to a mooring on the seabed.',
    // Pacing (Nov 27, 2026): decodes once you have seen the Corvina, where long dives round a wreck begin.
    finds: ['relaylog'],
    scans: ['corvina'],
    seconds: 80,
  },
  welder: {
    id: 'welder',
    name: 'DR-2 welder blueprint',
    text: 'Reads the KD WELD control chip from the kelp caves: a hotter, steadier torch head for the build drone.',
    // Pacing (Nov 27, 2026): decodes once you have seen the wreck shelf, where the dock and KS-1 (the big builds) come next.
    finds: ['weldchip'],
    scans: ['wshelf'],
    seconds: 70,
  },
  tow: {
    id: 'tow',
    name: 'Grapple line blueprint',
    text: 'Reads the rope store\'s spool tag and notes: a wrist launcher that fires a hooked line at an anchor point and reels you in, faster than any current.',
    finds: ['towcoil'],
    scans: [],
    seconds: 100,
  },
  cutter: {
    id: 'cutter',
    name: 'Cutter torch blueprint',
    text: 'Reads the survey cache\'s data cartridge: a cutting torch that burns through kelp walls and, later, sealed wreck hatches.',
    finds: ['cache'],
    scans: [],
    seconds: 120,
  },
  // Milestone 8 part 2: the wreck shelf.
  recomp: {
    id: 'recomp',
    name: 'Recompression room RC-1 blueprint',
    text: 'From your scans of the wreck shelf, the wreck lurker and the trench: a brass pressure chamber that mends a cracked suit fast and prepares you for the deep. Unlocks a build card.',
    finds: [],
    scans: ['wshelf', 'lurker', 'trench'],
    seconds: 90,
  },
  crane: {
    id: 'crane',
    name: 'Salvage crane SC-1 blueprint',
    text: 'From your scans of the sealed wrecks and the Corvina: a crane that breaks heavy salvage the sub brings home into scrap, brass and plating. Unlocks a build card.',
    finds: [],
    scans: ['wreck', 'corvina'],
    seconds: 80,
  },
  sonar: {
    id: 'sonar',
    name: 'Sonar pulse blueprint',
    text: "Reads the Corvina's sonar test logs: a pulse that maps hollows behind rock and silt, and drives hunters back into their dens.",
    finds: ['sonardata'],
    scans: [],
    seconds: 100,
  },
  psuit: {
    id: 'psuit',
    name: 'Pressure suit PS-1 blueprint',
    text: "The Corvina's drawings for a deep-water suit, brass-ringed and pressure-sealed: safe far deeper than the Kestrel suit. For the trench.",
    finds: ['suitplans'],
    scans: [],
    seconds: 140,
  },
  // Milestone 9: the locker on the wreck shelf a tinker crab picks open.
  revive: {
    id: 'revive',
    name: 'Revival pool RP-1 blueprint',
    text: "Reads the drawings from the shelf's rusted locker: a warm, still pool that wakes a dormant creature with the light of a glowing bloom. Unlocks a build card.",
    finds: ['poolplans'],
    scans: [],
    seconds: 90,
  },
  // Milestone 10: the trench.
  plating: {
    id: 'plating',
    name: 'Depth plating DP-S blueprint',
    text: "Reads the crushed Fulmar probe's hull stress logs, with your scan of the trench: a bolted second skin of plate and vent ore that takes KS-1 to 120 m. Fitted at a Moon pool dock.",
    finds: ['hulllogs'],
    scans: ['trench'],
    seconds: 110,
  },
  psuit2: {
    id: 'psuit2',
    name: 'Pressure suit PS-2 blueprint',
    text: "The Fulmar's drawings for her own divers' suit: vent-ore rings and a forged collar, safe to 110 m. For the trench floor.",
    finds: ['ps2plans'],
    scans: [],
    seconds: 150,
  },
  signal: {
    id: 'signal',
    name: 'Signal array SA-1 blueprint',
    text: "From your scans of the trench, its vent field and the Corvina's log: a listening dish and pattern decoder, like the one the Fulmar's crew built. It reads the Choir's light patterns off spools. Unlocks a build card.",
    finds: [],
    scans: ['trench', 'vents', 'cvlog'],
    seconds: 120,
  },
  // Milestone 12: the middle power tier.
  thermal: {
    id: 'thermal',
    name: 'Core generator CG-1 blueprint',
    text: "Reads the Corvina's log: the engineering pages for her sealed power core, which ran the whole survey ship with no current to turn it. 40 W, anywhere on the site. Unlocks a build card.",
    finds: [],
    scans: ['cvlog'],
    seconds: 120,
  },
  // ---- After milestone 12: the Hatchery's notes, suit attachments and sub modules ----
  hatch: {
    id: 'hatch',
    name: 'Creature room HX-1 blueprint',
    text: 'Reads the Kestrel nursery log from the kelp caves: warm cradles that take the eggs a happy pair lays, and keep the young until they have a tank. Unlocks a build card.',
    finds: ['nurserylog'],
    scans: [],
    seconds: 70,
  },
  satchel: {
    id: 'satchel',
    name: 'Specimen satchel blueprint',
    text: 'From your scans of the shallows\' young creatures: a padded second jar for the belt, so a breeding pair comes home in one trip.',
    finds: [],
    scans: ['glowfin', 'puffcap', 'ray'],
    seconds: 45,
  },
  flare: {
    id: 'flare',
    name: 'Flare launcher blueprint',
    text: 'From your scans of the kelp caves and their black water: a wrist tube that fires quartz flares. Each burns for a minute and a half wherever it lands.',
    finds: [],
    scans: ['kcaves', 'blackwater'],
    seconds: 55,
  },
  visor: {
    id: 'visor',
    name: 'Echo visor blueprint',
    text: 'From your scans of an Echo whorl, the lumen moss and the silt slump on the shelf: a lime band in the helmet glass that shows nearby materials and creatures through rock.',
    finds: [],
    scans: ['whorl', 'lumen', 'hidden'],
    seconds: 60,
  },
  boots: {
    id: 'boots',
    name: 'Mag-boots blueprint',
    text: 'From your scans of the race current and its anchor rings: magnetic soles that clamp to rock and steel. Clamp them on to walk the seabed where currents would sweep a swimmer away.',
    finds: [],
    scans: ['race', 'ring'],
    seconds: 60,
  },
  dart: {
    id: 'dart',
    name: 'Stun dart blueprint',
    text: 'From your scans of a wreck lurker: a charge for the harpoon on your back that stuns a predator and sends it away (it shares the sonar\'s cooldown).',
    finds: [],
    scans: ['lurker', 'wreck'],
    seconds: 60,
  },
  // Phase 19 (Colin, Nov 22, 2026): the weapon for the infested wrecks.
  rivet: {
    id: 'rivet',
    name: 'Rivet driver blueprint',
    text: "Reads the drawings from the Corvina's bosun's locker: a forearm rivet driver grown from the harpoon's barrel, with a guard plate that folds out to brace behind. Made by her crew for when the hull keeper's machines mistook a diver for fouling.",
    finds: ['rivetplans'],
    scans: [],
    seconds: 80,
  },
  dash: {
    id: 'dash',
    name: 'TH-3 dash head blueprint',
    text: 'From your scans of the caves\' cold surge and the race: a third nozzle for the hip thruster. Double-tap Boost to dash, every few seconds.',
    finds: [],
    scans: ['surge', 'race'],
    seconds: 65,
  },
  cowl: {
    id: 'cowl',
    name: 'Heat-shield cowl blueprint',
    text: 'From your scans of the vent field and a chimney: a chrome cowl and shoulder cape that turn the vent plumes\' scalding heat away.',
    finds: [],
    scans: ['vents', 'chimney'],
    seconds: 70,
  },
  booster: {
    id: 'booster',
    name: 'Afterburner AB-S blueprint',
    text: 'From your scans of the race current and the flow vane: a second burner for KS-1. Boost is faster and burns three times as long. Fitted at the dock.',
    finds: [],
    scans: ['race', 'vane'],
    seconds: 70,
  },
  ballast: {
    id: 'ballast',
    name: 'Ballast pod BP-S blueprint',
    text: 'From your scans of the wreck shelf and its race: trim tanks that hold KS-1 steady, so currents barely move it. Fitted at the dock.',
    finds: [],
    scans: ['wshelf', 'race'],
    seconds: 60,
  },
  tractor: {
    id: 'tractor',
    name: 'Tractor beam TB-S blueprint',
    text: 'From your scans of an Echo whorl and the salvage: a lime beam that draws loose materials into KS-1 while you drive past. Fitted at the dock.',
    finds: [],
    scans: ['whorl', 'salvage'],
    seconds: 75,
  },
  sdome: {
    id: 'sdome',
    name: 'Sonar dome SD-S blueprint',
    text: "From the Corvina's log and your scan of the trench: a dome for KS-1's back that pings the dark water around it and marks every material within a long reach, through rock. Fitted at the dock.",
    finds: [],
    scans: ['cvlog', 'trench'],
    seconds: 70,
  },
  habitat: {
    id: 'habitat',
    name: 'Habitat pod HP-S blueprint',
    text: 'From your scans of an air pocket, the Corvina and the trench: a pressurised pod with air scrubbers for long dives. Aboard, your own air refills and the sub\'s reserve barely falls. Fitted at the dock.',
    finds: [],
    scans: ['airpocket', 'corvina', 'trench'],
    seconds: 80,
  },
  drill: {
    id: 'drill',
    name: 'Drill nose DN-S blueprint',
    text: "From your scans of the trench and the crushed probe: a cutting nose for KS-1 that bores through soft rock and mines the hard mineral lodes along the sub's routes. A soft seam glints in the wall under the trench's rim. Fitted at the dock.",
    finds: [],
    scans: ['trench', 'probe'],
    seconds: 90,
  },
  lantern: {
    id: 'lantern',
    name: 'Choir lantern CL-1',
    text: "The Choir's gift: a seed of its light that powers the base. Unlocks a build card.",
    finds: [],
    scans: ['contact'],
    seconds: 1,
  },
  // Beyond Earth (Nov 27, 2026): given at first contact with the Choir's memory of the far moon, never decoded in a Lab.
  works: {
    id: 'works',
    name: 'Petrel works PW-1',
    text: "The Choir's memory, drawn out like a blueprint: a ship on a platform at the surface, and the shop that makes her parts. Unlocks a build card.",
    finds: [],
    scans: ['contact'],
    seconds: 1,
  },
  rivet2: {
    id: 'rivet2',
    name: 'Auto-rivet carbine RD-2 blueprint',
    text: "Decoded from the Corvina Hull Keeper's salvaged pneumatic actuator core: a heavy drum-fed automatic rivet carbine that cycles twice as fast and hits harder while Shoot is held.",
    finds: ['keepercore'],
    scans: [],
    seconds: 80,
  },
  resonator: {
    id: 'resonator',
    name: 'Alien resonator blueprint',
    text: "Reads the Fulmar's resonator drawings: a ring of tuned crystal and vent ore that sings back the Choir's own patterns. The doors below answer only to it. The Workshop can only tune it once the Signal array has decoded all four of the Choir's fragments.",
    finds: ['resonplans'],
    scans: [],
    seconds: 160,
  },
};
// (Milestone 11: the Choir lantern is given at first contact, never decoded in a Lab, so it isn't in RESEARCH_ORDER.)
export const RESEARCH_ORDER: BlueprintId[] = ['light', 'satchel', 'sorter', 'relay', 'welder', 'tow', 'flare', 'visor', 'dash', 'cutter', 'recomp', 'crane', 'sonar', 'thermal', 'boots', 'dart', 'rivet', 'rivet2', 'booster', 'ballast', 'tractor', 'sdome', 'habitat', 'psuit', 'revive', 'plating', 'psuit2', 'cowl', 'drill', 'signal', 'resonator'];
/** Blueprints that unlock a base piece (build card) instead of Workshop gear. */
export const PIECE_BLUEPRINTS: Partial<Record<BlueprintId, string>> = { sorter: 'sorter', recomp: 'recomp', crane: 'crane', revive: 'revive', signal: 'signal', thermal: 'thermal', lantern: 'lantern', works: 'works' };
/** Milestone 10: blueprints that are fitted elsewhere (the dock) or built later, not in the Workshop. */
export const OTHER_BLUEPRINTS: Partial<Record<BlueprintId, string>> = {
  plating: 'Fit it to KS-1 at a Moon pool dock (the Dock panel).',
  booster: 'Fit it to KS-1 at a Moon pool dock (the Dock panel).',
  ballast: 'Fit it to KS-1 at a Moon pool dock (the Dock panel).',
  tractor: 'Fit it to KS-1 at a Moon pool dock (the Dock panel).',
  sdome: 'Fit it to KS-1 at a Moon pool dock (the Dock panel).',
  habitat: 'Fit it to KS-1 at a Moon pool dock (the Dock panel).',
  drill: 'Fit it to KS-1 at a Moon pool dock (the Dock panel).',
};

export interface GearDef {
  id: GearId;
  name: string;
  code: string;
  job: string;
  blueprint: BlueprintId;
  cost: Partial<Record<MaterialId, number>>;
  seconds: number;
}

export const GEAR: Record<GearId, GearDef> = {
  // Phase 21: kits, built again and again (counted in save.tankKits / displayKits).
  tankkit: {
    id: 'tankkit',
    name: 'Tank extension kit',
    code: 'TX-1',
    job: 'Fit it at a Habitat console: a creature tank holds 6 instead of 4, a Grand tank 12 instead of 8, with room for one more decoration.',
    blueprint: 'tankkit',
    cost: { plate: 2, quartz: 3, resin: 1 },
    seconds: 40,
  },
  displaykit: {
    id: 'displaykit',
    name: 'Display refit kit',
    code: 'DR-1',
    job: 'Fit it to an extended Grand tank at its Habitat console: it becomes the display aquarium, for 20 creatures and six decorations.',
    blueprint: 'display',
    cost: { plate: 4, quartz: 6, brass: 3, resin: 2 },
    seconds: 90,
  },
  light: {
    id: 'light',
    name: 'Dive light',
    code: 'DL-1',
    job: 'A sealed, wide-beam lamp that replaces the shoulder lamp. Bright enough for the dark cave in the east cliff.',
    blueprint: 'light',
    cost: { plate: 2, quartz: 4, copper: 2 },
    seconds: 45,
  },
  cutter: {
    id: 'cutter',
    name: 'Cutter torch',
    code: 'TC-1',
    job: 'Burns through thick kelp walls (hold Collect at one). Later it opens sealed wreck hatches.',
    blueprint: 'cutter',
    cost: { plate: 4, copper: 3, quartz: 2, resin: 2 },
    seconds: 60,
  },
  tow: {
    id: 'tow',
    name: 'Grapple line',
    code: 'GL-1',
    job: 'The harpoon on your back fires a hooked line at an anchor ring. In the water it reels you in, faster than any current; on foot you swing on it across gaps too wide to jump. When a ring is marked, tap Collect to fire.',
    blueprint: 'tow',
    cost: { plate: 3, fibre: 4, resin: 2 },
    seconds: 50,
  },
  welder: {
    id: 'welder',
    name: 'DR-2 welder',
    code: 'DR-2',
    job: 'Fitted to the build drone KD-1: it welds about twice as fast.',
    blueprint: 'welder',
    cost: { plate: 3, copper: 2, moss: 2 },
    seconds: 50,
  },
  relay: {
    id: 'relay',
    name: 'Air relay kit',
    code: 'AR-1',
    job: 'Plant it on open seabed (hold Collect): a float pumps air down to it. Swim up to it to breathe, and you wake up at the nearest one after a blackout. Build as many as you like.',
    blueprint: 'relay',
    cost: { plate: 3, resin: 4, moss: 3, copper: 2 },
    seconds: 45,
  },
  sonar: {
    id: 'sonar',
    name: 'Sonar pulse',
    code: 'SN-1',
    job: 'Tap Scan to send a pulse (every 6 s): it reveals hollows hidden behind silt and rock, and sends lurkers nearby back into their dens for a while.',
    blueprint: 'sonar',
    cost: { brass: 5, copper: 2, quartz: 2, plate: 1 },
    seconds: 55,
  },
  psuit: {
    id: 'psuit',
    name: 'Pressure suit',
    code: 'PS-1',
    job: 'A brass-ringed deep suit, safe to 60 m (the Kestrel suit: 30 m). Enough for the trench\'s upper ledges and its vent field.',
    blueprint: 'psuit',
    cost: { brass: 8, plate: 4, resin: 2 },
    seconds: 80,
  },
  psuit2: {
    id: 'psuit2',
    name: 'Pressure suit',
    code: 'PS-2',
    job: 'The Fulmar crew\'s deep suit: vent-ore rings and a forged collar, safe to 110 m. The trench floor and the drowned station.',
    blueprint: 'psuit2',
    cost: { ore: 8, brass: 4, plate: 4, quartz: 2 },
    seconds: 100,
  },
  resonator: {
    id: 'resonator',
    name: 'Alien resonator',
    code: 'RS-1',
    job: "A forged hoop of tuned crystal on your pack and a ringed bracer on your arm. It sings the Choir's own song: hold Collect at the door on the trench floor, and at the doors below it.",
    blueprint: 'resonator',
    cost: { ore: 6, quartz: 4, brass: 4, bloom: 1 },
    seconds: 160,
  },
  // ---- After milestone 12: suit attachments ----
  satchel: {
    id: 'satchel',
    name: 'Specimen satchel',
    code: 'SJ-2',
    job: 'A padded second jar on the belt: carry two young creatures (or eggs) at once, a whole breeding pair in one trip.',
    blueprint: 'satchel',
    cost: { fibre: 4, copper: 2, quartz: 2 },
    seconds: 40,
  },
  flare: {
    id: 'flare',
    name: 'Flare launcher',
    code: 'FX-1',
    job: 'A tube on the wrist. Press Flare (Z, the flame button, or LT on a gamepad) to fire a flare ahead: it lands and burns for 90 s, lighting dark water. Each flare uses 1 quartz.',
    blueprint: 'flare',
    cost: { quartz: 4, copper: 2, moss: 2 },
    seconds: 50,
  },
  visor: {
    id: 'visor',
    name: 'Echo visor',
    code: 'EV-1',
    job: 'A lime band in the helmet glass. Materials and young creatures within about 20 m show as marks, even through rock.',
    blueprint: 'visor',
    cost: { quartz: 4, copper: 2, moss: 3 },
    seconds: 55,
  },
  dash: {
    id: 'dash',
    name: 'TH-3 dash head',
    code: 'TH-3',
    job: 'A third nozzle for the hip thruster. Double-tap Boost to dash a short way at once, every 3 seconds: out of a current, away from a bite.',
    blueprint: 'dash',
    cost: { plate: 3, copper: 3, moss: 2 },
    seconds: 55,
  },
  boots: {
    id: 'boots',
    name: 'Mag-boots',
    code: 'MB-1',
    job: 'Clamp them on (the Boots button) and you sink to the seabed and walk it: heavy, slow, and no current or vent updraft can move you. Jump hops; press Boots again to swim. Walk the floor of the deep race, or stand firm at salvage.',
    blueprint: 'boots',
    cost: { brass: 3, plate: 2, copper: 2 },
    seconds: 55,
  },
  dart: {
    id: 'dart',
    name: 'Stun dart',
    code: 'SD-1',
    job: 'A charge for the harpoon. Press Dart (X, the dart button, or RT on a gamepad) to fire at the nearest predator ahead: it is stunned and turns away for a while. Shares the sonar\'s 6 s cooldown.',
    blueprint: 'dart',
    cost: { brass: 3, plate: 2, copper: 2 },
    seconds: 60,
  },
  rivet: {
    id: 'rivet',
    name: 'Rivet driver',
    code: 'RD-1',
    job: "Strapped to the forearm: fires glowing hot rivets at the hull keeper's machines in infested wrecks (Shoot: X, RT on a gamepad, or the Shoot button). Hold Down to brace behind its fold-out guard: it blocks attacks from the front, and a brace raised just as a hit lands knocks the attacker back. Works on foot only.",
    blueprint: 'rivet',
    cost: { brass: 3, copper: 4, quartz: 2 },
    seconds: 60,
  },
  rivet2: {
    id: 'rivet2',
    name: 'Auto-rivet carbine',
    code: 'RD-2',
    job: 'Upgrades the forearm Rivet driver with a drum-fed automatic actuator: hold Shoot (X, RT, or the Shoot button) for rapid full-auto fire, faster bolts, and heavier punch against deep-wreck machines and stalkers.',
    blueprint: 'rivet2',
    cost: { brass: 4, plate: 3, ore: 3, quartz: 2 },
    seconds: 75,
  },
  cowl: {
    id: 'cowl',
    name: 'Heat-shield cowl',
    code: 'HC-1',
    job: 'A chrome cowl round the helmet and a cape over the shoulders. Vent plumes and chimneys scald a fifth as much.',
    blueprint: 'cowl',
    cost: { ore: 3, brass: 3, quartz: 2 },
    seconds: 70,
  },
};
/** Milestone 11 (Colin's choice): the resonator can only be tuned once all four fragments are decoded. */
export function gearBlocker(save: SaveData, id: GearId): string | null {
  if (id === 'dash' && save.kit.thruster < 2) return 'It fits the TH-2 thruster head. Find that first.';
  if (id === 'rivet2' && !hasGear(save, 'rivet')) return 'Upgrades the Rivet driver RD-1. Build that first.';
  if (id === 'resonator' && save.signals.decoded.length < 4)
    return `It can only be tuned to the Choir's song once the Signal array has decoded all four fragments (${save.signals.decoded.length} of 4 so far).`;
  return null;
}
export const GEAR_ORDER: GearId[] = ['light', 'satchel', 'cutter', 'tow', 'welder', 'relay', 'flare', 'visor', 'dash', 'sonar', 'boots', 'dart', 'rivet', 'rivet2', 'psuit', 'psuit2', 'cowl', 'resonator'];
/** Gear that is a kit you can build again and again (it isn't kept in save.gear). */
export const KIT_GEAR: GearId[] = ['relay'];

export const FINDS: Record<FindId, { name: string; text: string }> = {
  recorder: { name: 'SLED 2 recorder', text: 'A scuffed data cartridge from the survey sled. The Lab can read it.' },
  relaylog: { name: 'KS RELAY 2 log', text: 'The memory card from a toppled air relay buoy in the kelp caves.' },
  weldchip: { name: 'KD WELD control chip', text: 'A drone welder controller from a broken crate in the caves.' },
  towcoil: { name: 'Rope store spool tag', text: 'The tag and waterproof notes from a grapple line spool in the caves\' old rope store.' },
  cache: { name: 'Survey cache cartridge', text: 'The data cartridge from the earlier expedition\'s cache, deep in the kelp caves.' },
  sonardata: { name: 'Corvina sonar logs', text: "Test logs from the Corvina's lab: a pulse sonar her crew were building." },
  suitplans: { name: 'Pressure suit drawings', text: "A waterproof roll of drawings from the Corvina's lab: a deep-water suit." },
  poolplans: { name: 'Revival pool drawings', text: "Oilcloth drawings from the wreck shelf's rusted locker: a pool that wakes dormant creatures." },
  hulllogs: { name: 'Fulmar probe hull logs', text: "The stress recorder from the crushed deep probe on the trench's first ledge: where its hull buckled, and why." },
  ps2plans: { name: 'PS-2 suit drawings', text: "Drawings from a Fulmar cargo pod in the cleft: her divers' deep suit." },
  resonplans: { name: 'Resonator drawings', text: "The Fulmar crew's drawings for a device that sings the Choir's patterns back." },
  rivetplans: { name: 'Rivet driver drawings', text: "Oilcloth drawings from the Corvina's bosun's locker: a forearm rivet driver with a fold-out guard." },
  keepercore: { name: 'Hull Keeper actuator core', text: "The high-pressure pneumatic drive core salvaged from the Corvina's Hull Keeper. A Lab can adapt it into a full-auto rivet carbine." },
  nurserylog: { name: 'Kestrel nursery log', text: 'A waterproof log from a sealed crate behind the kelp wall in the caves: how the first crew bred creatures in warm cradles.' },
};

/** The dive light (DL-1) against the shoulder lamp: reach, brightness and beam width. */
export const LAMP = { radius: 560, intensity: 1.5, coneCos: 0.86 };
export const DIVE_LIGHT = { radius: 980, intensity: 2.1, coneCos: 0.78 };

export function hasGear(save: SaveData, g: GearId): boolean {
  return save.gear.includes(g);
}

/** What still stops a research job from starting, or null. */
export function researchBlocker(save: SaveData, r: ResearchDef): string | null {
  if (save.blueprints.includes(r.id)) return 'Already decoded';
  for (const s of r.scans) if (!save.scans.includes(s)) return 'Needs a scan the log does not have yet';
  for (const f of r.finds) if (!save.finds.includes(f)) return `Bring the ${FINDS[f].name} here`;
  return null;
}

/** Jobs are kept per piece; finished pieces only. */
export function jobOf(save: SaveData, p: Placed): StationJob | null {
  return save.jobs[String(p.id)] ?? null;
}

/** Any Lab or Workshop already running this job. */
export function jobRunning(save: SaveData, id: string): boolean {
  return Object.values(save.jobs).some((j) => j.id === id);
}

export type StationEvent = { type: 'decoded'; id: BlueprintId; piece: Placed } | { type: 'built'; id: GearId; piece: Placed };

/** Run the Labs and Workshops forward by dt seconds of play. */
export function tickStations(save: SaveData, layout: BaseLayout, dt: number): StationEvent[] {
  const ev: StationEvent[] = [];
  const live = new Set(layout.pieces.map((p) => String(p.id)));
  for (const k of Object.keys(save.jobs)) if (!live.has(k)) delete save.jobs[k];
  for (const p of layout.pieces) {
    if ((p.kind !== 'lab' && p.kind !== 'workshop') || !isDone(p) || !layout.powered.has(p.id)) continue;
    const j = save.jobs[String(p.id)];
    if (!j) continue;
    const [what, id] = j.id.split(':');
    const secs = what === 'research' ? RESEARCH[id as BlueprintId].seconds : GEAR[id as GearId].seconds;
    j.progress = Math.min(1, j.progress + (dt * layout.powerRate(p.id)) / secs);
    if (j.progress < 1) continue;
    delete save.jobs[String(p.id)];
    if (what === 'research') {
      if (!save.blueprints.includes(id as BlueprintId)) save.blueprints.push(id as BlueprintId);
      ev.push({ type: 'decoded', id: id as BlueprintId, piece: p });
    } else if (KIT_GEAR.includes(id as GearId)) {
      if (id === 'relay') save.relayKits++;
      else if (id === 'tankkit') save.tankKits = (save.tankKits ?? 0) + 1;
      else if (id === 'displaykit') save.displayKits = (save.displayKits ?? 0) + 1;
      ev.push({ type: 'built', id: id as GearId, piece: p });
    } else {
      if (!save.gear.includes(id as GearId)) save.gear.push(id as GearId);
      ev.push({ type: 'built', id: id as GearId, piece: p });
    }
  }
  return ev;
}

/** Seconds left on a job, for the readouts. */
export function jobSecondsLeft(j: StationJob): number {
  const [what, id] = j.id.split(':');
  const secs = what === 'research' ? RESEARCH[id as BlueprintId].seconds : GEAR[id as GearId].seconds;
  return Math.ceil((1 - j.progress) * secs);
}
