import { Graphics } from 'pixi.js';

/**
 * The hand scanner. Swim near something you have not recorded yet and a
 * bracket appears around it; hold Scan for a moment and it goes into the
 * scanner log. In later milestones the Lab turns scans into blueprints.
 *
 * The scanner's light is warm amber on purpose: cyan, violet and magenta
 * are kept for the Choir (DESIGN.md, Art direction).
 */

export type ScanCategory = 'Creature' | 'Plant' | 'Wreckage' | 'Place';

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
    text: 'A towed survey sled from an earlier expedition. Its recorder still holds part of a dive light design; the Lab could read it (milestone 6).',
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
    id: 'cave',
    name: 'Dark cave mouth',
    category: 'Place',
    text: 'A tunnel into the east cliff, black beyond a few metres. The shoulder lamp is not strong enough. A proper dive light would open it.',
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
