import { Graphics } from 'pixi.js';

/**
 * The hand scanner. Swim near something you have not recorded yet and a
 * bracket appears around it; hold Scan for a moment and it goes into the
 * scanner log. In later milestones the Lab turns scans into blueprints.
 *
 * The scanner's light is warm amber on purpose: cyan, violet and magenta
 * are kept for the Choir (DESIGN.md, Art direction).
 */

export type ScanCategory = 'Creature' | 'Plant' | 'Wreckage' | 'Place' | 'Artefact';

export interface ScanEntry {
  id: string;
  name: string;
  category: ScanCategory;
  text: string;
}

export const SCAN_ENTRIES: ScanEntry[] = [
  {
    id: 'silverbar',
    name: 'Silverbar',
    category: 'Creature',
    text: 'Small schooling fish with one dark band. Schools scatter as one when startled and regroup within seconds.',
  },
  {
    id: 'glowfin',
    name: 'Glowfin',
    category: 'Creature',
    text: 'A round striped fish that dangles a glowing lure above its head. Shy, and found only in the dark under the ledge, where it lays clutches of glowing eggs. Keep: likes branch coral and other glowfins; puffcap threads sting it.',
  },
  {
    id: 'puffcap',
    name: 'Puffcap',
    category: 'Creature',
    text: 'A small jelly with a frilled rim, glowing spots and two dark eye spots. It drifts over the drop-off, pulsing gently. Young ones fit in the specimen jar. Keep: likes ribbon kelp to drift by and space to itself.',
  },
  {
    id: 'ray',
    name: 'Dapple ray',
    category: 'Creature',
    text: 'A palm-sized ray with dappled rings on its back. It glides low over the seagrass meadow and rests on the sand. Young ones fit in the specimen jar. Keep: likes seagrass and any tank-mate to follow.',
  },
  {
    id: 'anemone',
    name: 'Lantern anemone',
    category: 'Creature',
    text: 'An anemone whose tentacle tips glow pale yellow-green. It grows where daylight never reaches.',
  },
  {
    id: 'kelp',
    name: 'Ribbon kelp',
    category: 'Plant',
    text: 'Tall kelp held up by tiny gas bladders. Its holdfasts give tough golden fibre.',
  },
  {
    id: 'coral',
    name: 'Branch coral',
    category: 'Plant',
    text: 'Strictly an animal colony, not a plant. Grows a few millimetres a year in warm, bright water.',
  },
  {
    id: 'fan',
    name: 'Sea fan',
    category: 'Plant',
    text: 'A flat lacework that always grows across the current, to catch drifting food.',
  },
  {
    id: 'grass',
    name: 'Seagrass',
    category: 'Plant',
    text: 'A true flowering plant that went back to the sea. Its meadow on the east plateau shelters young fish.',
  },
  {
    id: 'buoy',
    name: 'Kestrel site marker',
    category: 'Wreckage',
    text: 'Our own weighted crate and buoy. Outpost Kestrel will be built on the flat sand here.',
  },
  {
    id: 'anchor',
    name: 'Old anchor',
    category: 'Wreckage',
    text: 'A heavy fluked anchor, decades old. Whatever ship it held is long gone.',
  },
  {
    id: 'sled',
    name: 'Survey sled wreck',
    category: 'Wreckage',
    text: 'A towed survey sled from an earlier expedition. Its recorder still holds part of a dive light design: unclip it (Collect) and take it to a Lab to decode.',
  },
  {
    id: 'drone',
    name: 'Build drone KD-1',
    category: 'Wreckage',
    text: 'A Kestrel construction drone that went missing on the sled survey. Patched up with a little scrap, copper and kelp fibre, it welds base frames together while you dive. Later upgrades could make it faster, or add a second drone.',
  },
  {
    id: 'beacon',
    name: 'Survey beacon 03',
    category: 'Wreckage',
    text: 'One of the beacons dropped before the crew arrived. Its log shows bursts of light rising from far below, at the same hour every night.',
  },
  {
    id: 'basin',
    name: 'Kestrel basin',
    category: 'Place',
    text: 'A wide hollow west of the buoy, about 22 m deep, floored with fine silt and sheltered from the swell. Room for a whole station: Outpost Kestrel can grow down here, far bigger than the shelf.',
  },
  {
    id: 'whorl',
    name: 'Echo whorl',
    category: 'Artefact',
    text: 'A spiral of pale nacre the size of a thumb, with rings of cold light pulsing slowly inside. No animal on record makes anything like it, and its light is a colour nothing else on the reef gives off. Living things and machines near it quicken: fitted to a creature tank or a machine, one doubles its output and two triple it, but it eats, fouls or uses its inputs just as much faster. The crew think the lights from the deep left it.',
  },
  {
    id: 'cave',
    name: 'Dark cave mouth',
    category: 'Place',
    text: 'A tunnel into the east cliff, black beyond a few metres. The shoulder lamp is not strong enough. A proper dive light, built in the Workshop, would open it. The current through it smells of kelp.',
  },
  // ---- Milestone 7: the kelp forest ----
  {
    id: 'boom',
    name: 'Survey boom gate',
    category: 'Wreckage',
    text: 'A rusted steel boom hung across the shelf on top of the east cliff by the earlier expedition, to keep drifting kelp out of the shallows. Too heavy to shift from this side. Its winch sits on the far side; open it there and the sub can cross.',
  },
  {
    id: 'forest',
    name: 'Kelp forest',
    category: 'Place',
    text: 'Beyond the east cliff, giant kelp rises 17 m from the floor to the surface, so close overhead that the daylight turns green and dim. Things move between the stalks and watch your lamp. The rock is shaded enough for glowing moss.',
  },
  {
    id: 'gkelp',
    name: 'Giant kelp',
    category: 'Plant',
    text: 'Stalks as tall as the water is deep, held up by gas floats and anchored by knotted holdfasts. The holdfasts weep amber resin where the current rubs them.',
  },
  {
    id: 'bladder',
    name: 'Bladder kelp',
    category: 'Plant',
    text: 'A short, bushy kelp studded with round gas floats. Tinker crabs pick through it and hang bits of it on their shells. Planted in a tank, it takes 1 holdfast resin to root.',
  },
  {
    id: 'lumen',
    name: 'Lumen moss',
    category: 'Plant',
    text: 'Soft moss that glows a warm yellow-green on shaded rock. Lantern shrimp graze it and hide in it. It can be gathered, and planted in a tank.',
  },
  {
    id: 'crab',
    name: 'Tinker crab',
    category: 'Creature',
    text: 'A wary little decorator crab that glues flakes of metal, shell and kelp to its back. It picks through holdfasts and old wreckage, and its eyes catch the lamp. Keep: likes bladder kelp and any tank-mate. Grown, it picks rust and grit off its shell and leaves scrap metal. Its claws snip puffcap ribbons.',
  },
  {
    id: 'shrimp',
    name: 'Lantern shrimp',
    category: 'Creature',
    text: 'A see-through shrimp with a row of amber lights down its side. A cleaner: it picks tank-mates clean, so each other species in its tank makes more, and the water stays clean longer. Keep: likes lumen moss and another species to clean. Grown, it leaves tufts of lumen moss.',
  },
  {
    id: 'kcaves',
    name: 'The kelp caves',
    category: 'Place',
    text: 'A cold-breathing mouth in the east wall of the forest, opening into a whole cave system. An earlier survey expedition worked in here: their gear is still lying where they left it. Bring the dive light and some lumen moss.',
  },
  // Milestone 7 part 2: the kelp caves.
  {
    id: 'airpocket',
    name: 'Air pocket',
    category: 'Place',
    text: 'Air trapped in the roof of a chamber, breathed out by the rock over centuries. Put your helmet into it to breathe and refill your tank.',
  },
  {
    id: 'surge',
    name: 'Cold surge',
    category: 'Place',
    text: 'Cold water from deep in the rock surges out through this squeeze in pulses, too strong to swim against. Swim on in the lulls, and wait out each surge in the little pockets in its roof.',
  },
  {
    id: 'blackwater',
    name: 'Black water',
    category: 'Place',
    text: 'Silt so fine it hangs in the water like ink: even the dive light dies a few metres out. The old survey team left lamp brackets across the chamber. Set lumen moss on them and its glow lights the way.',
  },
  {
    id: 'kwall',
    name: 'Kelp wall',
    category: 'Plant',
    text: 'Holdfasts and old stalks grown together into a tough mat across a side passage. Too thick to push through or pull apart. A cutter torch would slice it open.',
  },
  // Milestone 8: the wreck shelf.
  {
    id: 'wshelf',
    name: 'The wreck shelf',
    category: 'Place',
    text: 'A wide silty shelf about 22 m down, in permanent twilight. Ships have been lost here for a long time; their wrecks lie half sunk, and things have moved into them.',
  },
  {
    id: 'race',
    name: 'The race',
    category: 'Place',
    text: 'Deep water pours over the shelf edge here in a steady, powerful current, far too strong to swim against, all the way up to the surface. Old anchor rings cross it: a grapple line could pull you from ring to ring.',
  },
  {
    id: 'ring',
    name: 'Anchor ring',
    category: 'Wreckage',
    text: 'A steel stake driven deep into the seabed with a heavy ring on top, left by a salvage crew long ago. Holding on to one keeps you out of the worst of the current, and a grapple line can hook it.',
  },
  {
    id: 'vane',
    name: 'Flow vane',
    category: 'Wreckage',
    text: 'A huge hinged steel plate on a pivot in the seabed, with a winch beside it: the salvage crew\'s way of turning the race down along the shelf, so the water at the top goes calm. Raised, a sub can cross the shelf edge over the top.',
  },
  {
    id: 'wreck',
    name: 'Sealed hatch',
    category: 'Wreckage',
    text: 'A watertight hatch, rusted shut. Something dry might still be inside. A cutter torch would open it.',
  },
  {
    id: 'corvina',
    name: 'The Corvina',
    category: 'Wreckage',
    text: 'A large survey ship lying on the shelf, its bow raised on a rock. Its bulkhead door is sealed from the inside. Whatever her crew were studying, they locked it away.',
  },
  // Milestone 8 part 2: the Corvina and the shelf's salvage.
  {
    id: 'cvhook',
    name: 'Beam hook',
    category: 'Wreckage',
    text: "A cargo hook hanging from a beam across the Corvina's hold. Hooked by a grapple line, it holds you out of the downdraft that pins everything else to the hold floor.",
  },
  {
    id: 'cvlog',
    name: "The Corvina's log",
    category: 'Artefact',
    text: "The survey ship Corvina came to this shelf to record lights rising from the deep water beyond it: slow, patterned flashes, cyan and violet, that no animal makes. Her crew built a sonar to map where they came from, and a deep suit to follow them down. The last entries end mid-sentence.",
  },
  {
    id: 'hidden',
    name: 'Silt slump',
    category: 'Place',
    text: 'A fan of fine grey silt and stones heaped against the foot of the shelf edge. Something about the way the current eddies around it suggests a hollow behind.',
  },
  {
    id: 'salvage',
    name: 'Heavy salvage',
    category: 'Wreckage',
    text: "Winch drums, propeller hubs and engine blocks lying in the silt, far too heavy to carry. A sub's grabber arm could lift one, and a salvage crane at the base could break it down.",
  },
  {
    id: 'lurker',
    name: 'Wreck lurker',
    category: 'Creature',
    text: 'A long, spined hunter that waits in dens under wreckage with a glowing lure over its head. It never chases: it warns (lure flaring, eyes shining), lunges, then pulls back and rests. Give its den a wide berth, or pass while it rests. It notices a lit lamp from further away.',
  },
];

export interface ScanCandidate {
  id: string;
  points: () => { x: number; y: number }[];
}

const RANGE = 230;
const SCAN_TIME = 1.4;

export class Scanner {
  /** Drawn in world space on top of the scene: bracket, beam and progress ring. */
  readonly overlay = new Graphics();
  target: { id: string; x: number; y: number } | null = null;
  progress = 0;
  private pulse = 0;

  private idPulse = 0;
  private idX = 0;
  private idY = 0;

  constructor(readonly candidates: ScanCandidate[]) {}

  /** A quick amber ring sweeping out from the diver, shown when the quick ID is used. */
  pulseIdentify(x: number, y: number): void {
    this.idPulse = 1;
    this.idX = x;
    this.idY = y;
  }

  /** Returns the id of an entry that was just completed, if any. */
  update(dt: number, dx: number, dy: number, held: boolean, done: Set<string>, emitX: number, emitY: number, enabled: boolean): string | null {
    this.pulse += dt;
    this.idPulse = Math.max(0, this.idPulse - dt / 0.7);
    let completed: string | null = null;

    // Keep a locked target while the button is held, otherwise pick the nearest new thing.
    let best: { id: string; x: number; y: number } | null = null;
    let bestD = RANGE;
    if (enabled) {
      for (const c of this.candidates) {
        if (done.has(c.id)) continue;
        for (const p of c.points()) {
          // A target already being scanned is "stickier", so it is not lost to a closer one.
          const sticky = held && this.target?.id === c.id ? 1.25 : 1;
          const d = Math.hypot(p.x - dx, p.y - dy) / sticky;
          if (d < bestD) {
            bestD = d;
            best = { id: c.id, x: p.x, y: p.y };
          }
        }
      }
    }
    if (best && this.target && best.id !== this.target.id) this.progress = 0;
    this.target = best;

    if (this.target && held) {
      this.progress += dt / SCAN_TIME;
      if (this.progress >= 1) {
        completed = this.target.id;
        this.progress = 0;
      }
    } else {
      this.progress = Math.max(0, this.progress - dt * 2);
    }

    this.draw(emitX, emitY, held);
    return completed;
  }

  private draw(ex: number, ey: number, held: boolean): void {
    const g = this.overlay;
    g.clear();
    if (this.idPulse > 0) {
      const r = 40 + (1 - this.idPulse) * 420;
      g.circle(this.idX, this.idY, r).stroke({ color: 0xffc861, width: 2, alpha: this.idPulse * 0.6 });
    }
    const t = this.target;
    if (!t) return;
    const amber = 0xffc861;
    const s = 26 + Math.sin(this.pulse * 4) * 3 - this.progress * 6;
    const k = 9;
    // Four corner brackets.
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      g.moveTo(t.x + sx * s, t.y + sy * (s - k))
        .lineTo(t.x + sx * s, t.y + sy * s)
        .lineTo(t.x + sx * (s - k), t.y + sy * s);
    }
    g.stroke({ color: amber, width: 2, alpha: 0.85 });
    if (held && this.progress > 0) {
      // A fan of light from the scanner to the target.
      const ang = Math.atan2(t.y - ey, t.x - ex);
      const len = Math.hypot(t.x - ex, t.y - ey);
      const spread = 18 / Math.max(40, len);
      g.poly([ex, ey, ex + Math.cos(ang - spread) * len, ey + Math.sin(ang - spread) * len, ex + Math.cos(ang + spread) * len, ey + Math.sin(ang + spread) * len]).fill({
        color: amber,
        alpha: 0.12 + 0.06 * Math.sin(this.pulse * 30),
      });
      // A sweeping line across the target.
      const sweep = Math.sin(this.pulse * 6) * s * 0.9;
      g.moveTo(t.x - s * 0.9, t.y + sweep).lineTo(t.x + s * 0.9, t.y + sweep).stroke({ color: amber, width: 1.5, alpha: 0.7 });
      // Progress ring.
      g.arc(t.x, t.y, s + 8, -Math.PI / 2, -Math.PI / 2 + this.progress * Math.PI * 2).stroke({ color: amber, width: 3, alpha: 0.95 });
    }
  }
}

export function entry(id: string): ScanEntry | undefined {
  return SCAN_ENTRIES.find((e) => e.id === id);
}
