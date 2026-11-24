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
    text: 'A towed survey sled from an earlier expedition. Its recorder was torn loose and lies on the sand just west of the sled, its amber beacon blinking. It still holds part of a dive light design: hold Collect at it and take it to a Lab to decode.',
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
    // Phase 19: found in the Corvina's engine room, the infested section.
    id: 'enginelog',
    name: "The chief engineer's log",
    category: 'Artefact',
    text: "\"Day 212. The hull keeper's scrubbers have started on the engine casings. Rewrote its rules twice; it rewrites them back. It thinks rust is the ship and we are the fouling.\n\nDay 214. Welded the door. Told the bosun to leave the driver drawings in his locker, for whoever comes next. Don't fight it in the dark. Watch what it does before it does it.\"",
  },
  {
    id: 'hidden',
    name: 'Silt slump',
    category: 'Place',
    text: 'A fan of fine grey silt and stones heaped against the foot of the shelf edge. Something about the way the current eddies around it suggests a hollow behind.',
  },
  {
    id: 'crablock',
    name: 'Scored strongbox',
    category: 'Wreckage',
    text: 'Paired scratches run under the lip of a rusted padlock. Something finer than a cutter has been probing the keyhole. Bits of bladder kelp are caught in the hinge.',
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
  },  // ---- Milestone 10: the trench ----
  {
    id: 'trench',
    name: 'The trench',
    category: 'Place',
    text: 'Past the wreck shelf the seabed breaks off into a trench: ledge after ledge into the black, then a sheer drop to a floor nearly 100 m down. Each suit has a crush depth (the Kestrel suit 30 m, PS-1 60 m); past it the pressure crumples the suit, faster the deeper. The sub\'s hull is rated to 45 m.',
  },
  {
    id: 'sigbuoy',
    name: 'Fulmar relay buoy',
    category: 'Wreckage',
    text: 'A relay buoy toppled on the trench rim, stencilled FULMAR RELAY 4. It once passed messages up from something far below. A pattern spool is still clipped in its recorder.',
  },
  {
    id: 'probe',
    name: 'Crushed deep probe',
    category: 'Wreckage',
    text: 'A pressure sphere in a steel frame, FULMAR DP-2, crumpled in on one side where its hull gave way. Its stress recorder may say why: the start of a design for a stronger hull.',
  },
  {
    id: 'seam',
    name: 'Soft rock seam',
    category: 'Place',
    text: 'A band of pale, flaky stone across the wall under the trench rim, softer than the basalt around it. The scanner reads a hollow behind it. A diver\'s hands only scrape it, but a powered drill could bore a way through.',
  },
  {
    id: 'lode',
    name: 'Mineral lode',
    category: 'Place',
    text: 'A knuckle of hard ore standing out of the seabed, glinting with quartz and metal. Far too hard for gloves or the cutter torch. A drill nose on KS-1 would bore the cuttings loose, and the rock seals over again in time. Lodes lie along the kelp forest floor, the wreck shelf and the trench.',
  },
  {
    id: 'vents',
    name: 'The vent field',
    category: 'Place',
    text: 'Mineral chimneys on the trench\'s third ledge, glowing at their seams and breathing scalding water. Stay out of the plumes. The crust around them is vent ore, and cinder snails graze it.',
  },
  {
    id: 'chimney',
    name: 'Sealed chimney',
    category: 'Place',
    text: 'A young chimney has grown across a cleft. The cutter would shatter its surface, but the mineral crust grows back. Smooth, pale trails are worn into the soft seams. Something has been feeding here.',
  },
  {
    id: 'snail',
    name: 'Cinder snail',
    category: 'Creature',
    text: 'A snail with an iron-scaled foot and a coiled iron shell, its seams glowing like embers. It creeps over the vent chimneys grazing their crust. Keep: likes lumen moss and others of its kind; tinker crabs pick at its scales. Grown, it sheds vent ore, and it can graze a chimney away.',
  },
  // Phase 22: the two new species.
  {
    id: 'eel',
    name: 'Kiln eel',
    category: 'Creature',
    text: 'A slender, sooty eel with a soft ribbon fin along its back and ember lights down its sides. It threads through the rubble at the trench floor\'s quiet east end, past the Fulmar\'s stern, nosing for old metal, and watches you with big gentle eyes. Young ones fit in the jar. Keep: likes lumen moss and any company, but puffcap threads sting its fin. Grown, it polishes the tank gravel\'s old metal into brass fittings.',
  },
  {
    id: 'horse',
    name: 'Chime seahorse',
    category: 'Creature',
    text: 'An ivory seahorse with a crown of pale filaments that glow at their tips. It drifts upright in the antechamber at the sanctum\'s edge and hums: a tiny three-note chime, falling, almost like the song-locks. Young ones fit in the jar. Keep: likes seagrass to hold with its tail, and others of its kind; tinker crabs snip its filaments. Grown, it now and then grows a glowing bloom where it sleeps.',
  },
  {
    id: 'lanternjaw',
    name: 'Lanternjaw',
    category: 'Creature',
    text: 'A big, dark-bodied hunter that hangs still in open water with an amber lure. A lit lamp draws it in: it drifts towards the light and snaps. Lamp off, it barely notices you. A sonar pulse makes it fold its lure and sink away.',
  },
  {
    id: 'stalker',
    name: 'Pale stalker',
    category: 'Creature',
    text: 'A long pale shape that follows a diver at the very edge of the lamp\'s reach. It hates light in its eyes: while your lamp is on and you keep moving, it only follows. Stop, or switch your lamp off, and it strikes. A sonar pulse drives it off.',
  },
  {
    id: 'spider',
    name: 'Abyssal strider',
    category: 'Creature',
    text: 'A deep-sea spider as wide as a diver is tall, walking the ledges on long jointed legs. It is drawn to light: with your lamp on it comes, slowly and steadily, and grabs. In the dark it loses interest. A sonar pulse sends it scuttling.',
  },
  {
    id: 'fulmar',
    name: 'Fulmar deep station',
    category: 'Wreckage',
    text: 'A deep station on the trench floor: a long module, a crushed listening dome and a dead antenna mast. Its crew lived down here for years, listening to the lights. One amber lamp still blinks by the airlock hatch on top.',
  },
  {
    id: 'fulmarlog',
    name: "The Fulmar's listening log",
    category: 'Artefact',
    text: "Eleven years on the trench floor. The lights came every night at first: rings of cyan and violet rising past the dome, too slow for any animal. We answered with our lamps, and they answered back, changed. They are not speaking to us so much as with the light itself: every glowing creature down here is a word they know. We built an array to read them, and from their patterns drew a ring that sings them back. Then the hull began to weep, and we went up. The resonator drawings are in the array room. Whoever comes next: grow light, don't only carry it.",
  },
  {
    id: 'sig1',
    name: 'Signal fragment 1: held light',
    category: 'Artefact',
    text: 'Decoded by the Signal array from the relay buoy\'s spool: SMALL LIGHTS · FALLING · HELD, NOT GROWN · WHO HOLDS THEM? The Choir has seen divers\' lamps coming down. It does not know what holds them.',
  },
  {
    id: 'sig2',
    name: 'Signal fragment 2: grown light',
    category: 'Artefact',
    text: 'Decoded from the cleft\'s spool: SMALL LIGHT · GROWN · GIVEN · ANSWER. The pattern matches the glow of creatures raised in tanks, played back slower. The array\'s best guess: it saw light that someone raised, and is answering it.',
  },
  {
    id: 'sig3',
    name: 'Signal fragment 3: below the cold',
    category: 'Artefact',
    text: 'Decoded from the Fulmar\'s first spool: BELOW THE COLD · THE OLD SONG · ROOMS OF LIGHT · COME. Repeated three times, with a bearing pattern pointing down and east, past the trench floor.',
  },
  {
    id: 'sig4',
    name: 'Signal fragment 4: the door',
    category: 'Artefact',
    text: 'Decoded from the Fulmar\'s last spool: THE DOOR HEARS ONLY ITS OWN SONG · CARRY THE SONG · WE WAIT. The array matches it to the Fulmar\'s resonator drawings: their ring would sing exactly this pattern.',
  },
  // ---- Milestone 11: the sanctum ----
  {
    id: 'sdoor',
    name: 'The door in the floor',
    category: 'Place',
    text: 'A disc of pale stone set flush into the far east end of the trench floor, cut with rings of grooves that leak a faint cyan light. No silt settles on it. It is warm. The fourth fragment said: THE DOOR HEARS ONLY ITS OWN SONG. An alien resonator, worn and sung here (hold Collect), should open it.',
  },
  {
    id: 'shall',
    name: 'The sanctum',
    category: 'Place',
    text: 'Halls of pale, nacre-smooth stone under the trench, lit from inside by veins of cyan, violet and magenta. Rings and ribbons of stone stand in the water like the shapes in the Fulmar\'s recordings. The water here is still and holds no weight at all: your suit\'s depth gauge stops complaining. Nothing here hunts.',
  },
  {
    id: 'slock',
    name: 'Song-lock',
    category: 'Place',
    text: 'A tall lens of light across a narrow way, cool to the glove and quite solid. It brightens when the resonator hums near it. Sing to it (hold Collect) and it should part.',
  },
  {
    id: 'sheart',
    name: 'The heart',
    category: 'Place',
    text: 'A spiral shell of stone the size of the Corvina, on the floor of the deepest pool, with a glowing arch for a door. Beyond the arch there is air: the Choir keeps dry rooms, as if it expected visitors who breathe. Hold Collect at the arch to go in.',
  },
  {
    id: 'contact',
    name: 'First contact',
    category: 'Artefact',
    text: 'In the heart of the sanctum the Choir rose to meet you: rings and ribbons of living light, very old, very curious. It sang, and you answered with the resonator, phrase by phrase, in the patterns your creatures taught you. Then it sang back the patterns of every creature you had raised, as if naming them, and made you a gift: a gate of light that carries you home from its door, and a lantern of its own to power the Kestrel.',
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
  private donePulse = 0;
  private doneX = 0;
  private doneY = 0;

  constructor(readonly candidates: ScanCandidate[]) {}

  /** A quick sonar wave sweeping out from the diver, shown when the quick ID is used. */
  pulseIdentify(x: number, y: number): void {
    this.idPulse = 1;
    this.idX = x;
    this.idY = y;
  }

  /** Returns the id of an entry that was just completed, if any. */
  update(dt: number, dx: number, dy: number, held: boolean, done: Set<string>, emitX: number, emitY: number, enabled: boolean): string | null {
    this.pulse += dt;
    this.idPulse = Math.max(0, this.idPulse - dt / 0.85);
    this.donePulse = Math.max(0, this.donePulse - dt / 0.65);
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
        this.donePulse = 1;
        this.doneX = this.target.x;
        this.doneY = this.target.y;
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
    const gold = 0xf2d488;
    const lime = 0xc6f03a;

    // Quick-ID sonar wave: smooth double-ring expansion with a faint optical wash.
    if (this.idPulse > 0) {
      const k = 1 - this.idPulse;
      const ease = 1 - (1 - k) * (1 - k);
      const r = 34 + ease * 430;
      g.circle(this.idX, this.idY, r).fill({ color: lime, alpha: this.idPulse * 0.04 });
      g.circle(this.idX, this.idY, r).stroke({ color: lime, width: 2.2, alpha: this.idPulse * 0.55 });
      if (r > 52) {
        g.circle(this.idX, this.idY, r - 24).stroke({ color: gold, width: 1.2, alpha: this.idPulse * 0.3 });
      }
    }

    // Completion sonar ripple when a scan finishes: double lume-and-brass rings + radiating tick glints.
    if (this.donePulse > 0) {
      const k = 1 - this.donePulse;
      const ease = 1 - (1 - k) * (1 - k);
      const r = 18 + ease * 68;
      g.circle(this.doneX, this.doneY, r).stroke({ color: lime, width: 2.5 * this.donePulse + 0.5, alpha: this.donePulse * 0.82 });
      g.circle(this.doneX, this.doneY, r * 0.72).stroke({ color: gold, width: 1.4, alpha: this.donePulse * 0.65 });
      g.circle(this.doneX, this.doneY, r * 0.55).fill({ color: lime, alpha: this.donePulse * 0.14 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + k * 0.35;
        const r0 = r * 0.82;
        const r1 = r + 7;
        g.moveTo(this.doneX + Math.cos(a) * r0, this.doneY + Math.sin(a) * r0)
          .lineTo(this.doneX + Math.cos(a) * r1, this.doneY + Math.sin(a) * r1)
          .stroke({ color: gold, width: 1.4, alpha: this.donePulse * 0.7, cap: 'round' });
      }
    }

    const t = this.target;
    if (!t) return;
    const p = this.progress;
    const s = 24 + Math.sin(this.pulse * 3.2) * 2.2 - p * 5;
    const k = 7.5;

    // Subtle dark backing halo so the optical reticle reads crisply even in bright shallows.
    g.circle(t.x, t.y, s + 9).fill({ color: 0x081a1e, alpha: held && p > 0 ? 0.22 : 0.12 });

    // Rotating optical tick marks around the target.
    const rot = this.pulse * (held ? 1.5 : 0.45);
    const ringR = s + 6;
    for (let i = 0; i < 4; i++) {
      const a = rot + (i * Math.PI) / 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      g.moveTo(t.x + ca * (ringR - 3), t.y + sa * (ringR - 3))
        .lineTo(t.x + ca * (ringR + 3), t.y + sa * (ringR + 3));
    }
    g.stroke({ color: gold, width: 1.4, alpha: 0.55, cap: 'round' });

    // Clean corner brackets (tightening softly as scan completes).
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
    g.stroke({ color: held && p > 0 ? lime : gold, width: 1.8, alpha: 0.85, cap: 'round', join: 'round' });

    if (held && p > 0) {
      // Smooth dual-layer optical beam from Kestrel's visor/sub dome to the target.
      const ang = Math.atan2(t.y - ey, t.x - ex);
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      const wide = Math.min(26, s * 0.95);
      const narrow = wide * 0.45;
      // Outer soft haze cone.
      g.poly([ex, ey, t.x + nx * wide, t.y + ny * wide, t.x - nx * wide, t.y - ny * wide]).fill({
        color: gold,
        alpha: 0.065,
      });
      // Inner focused lime-gold beam.
      g.poly([ex, ey, t.x + nx * narrow, t.y + ny * narrow, t.x - nx * narrow, t.y - ny * narrow]).fill({
        color: lime,
        alpha: 0.095,
      });
      // Travelling optical scan pulses gliding down the beam toward the target.
      for (let i = 0; i < 3; i++) {
        const u = (this.pulse * 1.4 + i / 3) % 1;
        const px = ex + (t.x - ex) * u;
        const py = ey + (t.y - ey) * u;
        const hw = 3 + u * (wide * 0.85);
        g.moveTo(px + nx * hw, py + ny * hw)
          .lineTo(px - nx * hw, py - ny * hw)
          .stroke({ color: lime, width: 1.4, alpha: Math.sin(u * Math.PI) * 0.45, cap: 'round' });
      }

      // Gentle vertical sweep wave across the target (soft glow + crisp line).
      const sweep = Math.sin(this.pulse * 5.2) * s * 0.78;
      const halfW = Math.sqrt(Math.max(0, s * s - sweep * sweep)) * 0.95;
      g.moveTo(t.x - halfW, t.y + sweep).lineTo(t.x + halfW, t.y + sweep).stroke({ color: lime, width: 4, alpha: 0.16, cap: 'round' });
      g.moveTo(t.x - halfW, t.y + sweep).lineTo(t.x + halfW, t.y + sweep).stroke({ color: 0xeaff9a, width: 1.3, alpha: 0.78, cap: 'round' });

      // Smooth progress ring with dark track, luminous arc (proper moveTo so zero stray chord!), and leading tip dot.
      const pr = ringR + 3;
      const start = -Math.PI / 2;
      const end = start + p * Math.PI * 2;
      g.circle(t.x, t.y, pr).stroke({ color: 0x0c242a, width: 3.6, alpha: 0.5 });
      g.moveTo(t.x + Math.cos(start) * pr, t.y + Math.sin(start) * pr)
        .arc(t.x, t.y, pr, start, end)
        .stroke({ color: lime, width: 2.6, alpha: 0.95, cap: 'round' });
      g.circle(t.x + Math.cos(end) * pr, t.y + Math.sin(end) * pr, 3.2).fill({ color: 0xf4ffbd, alpha: 0.95 });
    }
  }
}

export function entry(id: string): ScanEntry | undefined {
  return SCAN_ENTRIES.find((e) => e.id === id);
}
