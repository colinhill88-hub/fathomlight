import type { SaveData } from './state';

/**
 * Phase 19: combat inside the wrecks (Colin, Nov 22, 2026). The rules only,
 * no drawing, so they can be checked in Node and tuned in one place.
 *
 *  - On foot, inside infested wreck sections only (the first is the Corvina's
 *    engine room). Never while swimming; never the sea's wildlife.
 *  - Kestrel's health is her suit integrity (the ring on the dive watch).
 *    Hits crack it; out of a fight it seals itself again.
 *  - Losing is gentle: a blackout, then awake at the last safe lamp she
 *    passed (or the section's door), keeping everything.
 *  - The hull keeper stays beaten once beaten (saved); the small machines
 *    rebuild themselves every time Kestrel comes back in.
 *
 * Every number is here so Colin's notes after playing are one edit away.
 * `combatOn()` is the switch: `?combat=off` in the address closes the engine
 * room door again without touching anything else.
 */

export type FoeKind = 'tick' | 'drone' | 'keeper';

/** The switch. Off: the engine room door stays shut and no foe is ever made. */
export function combatOn(search: string = typeof location !== 'undefined' ? location.search : ''): boolean {
  return new URLSearchParams(search).get('combat') !== 'off';
}

/** The Rivet driver RD-1 on Kestrel's forearm. */
export const RIVET = {
  /** Seconds between shots. */
  cooldown: 0.3,
  /** A press this long before the driver is ready still fires when it is. */
  buffer: 0.15,
  speed: 1250,
  range: 760,
  /** Soft aim: the nearest foe in front within this angle (radians) of level is aimed at. */
  aimCone: 0.75,
  damage: 1,
};

/** Bracing behind the guard plate (hold Down). */
export const BRACE = {
  /** A brace raised this recently when a hit lands is a perfect brace: no harm, and the attacker is knocked back. */
  perfect: 0.22,
  /** Kestrel's height braced (crouched) and standing, for what passes over her. */
  lowHeight: 52,
  height: 84,
  /** How long the attacker reels after a perfect brace. */
  stun: 1.3,
};

/** After a hit Kestrel can't be hit again for a moment (she flickers). */
export const HURT_GRACE = 0.9;

/** How much suit integrity each attack takes (1 is a whole suit). */
export const DAMAGE: Record<string, number> = {
  lunge: 0.2,
  bolt: 0.22,
  slam: 0.28,
  charge: 0.3,
  touch: 0.1,
};

export const FOE_HP: Record<FoeKind, number> = { tick: 2, drone: 2, keeper: 5 };

/** Timings of each foe's moves (seconds) and speeds (units/s). */
export const TICK = { sight: 360, speed: 150, tell: 0.55, lunge: 0.42, lungeSpeed: 640, lungeHop: 230, flipped: 1.1, rest: 0.6, height: 26, halfW: 16 };
export const DRONE = { sight: 640, hover: 150, keepNear: 240, keepFar: 430, speed: 120, track: 0.75, lock: 0.4, boltSpeed: 720, cool: 1.1, rest: 1.4, halfW: 18 };
export const KEEPER = { sight: 700, speed: 62, slamRange: 170, chargeRange: 640, windSlam: 0.95, windCharge: 0.85, chargeSpeed: 540, chargeMax: 1.3, waveSpeed: 430, waveLife: 1.7, waveHeight: 30, stuck: 1.7, stagger: 2.4, rest: 0.9, halfW: 42, height: 118 };

/** What happens when an attack reaches Kestrel. */
export type HitResult = 'perfect' | 'block' | 'hit';

/**
 * The guard plate only covers the front. A perfect brace (raised just before
 * the hit) turns any blockable attack. The keeper's shockwave rolls under the
 * guard: it has to be jumped.
 */
export function resolveHit(o: { attack: 'lunge' | 'bolt' | 'slam' | 'charge' | 'touch'; braced: boolean; braceAge: number; face: number; fromX: number; x: number }): HitResult {
  if (o.attack === 'slam' || o.attack === 'touch') return 'hit';
  if (!o.braced) return 'hit';
  const fromFront = (o.fromX - o.x) * o.face >= -6;
  if (!fromFront) return 'hit';
  return o.braceAge <= BRACE.perfect ? 'perfect' : 'block';
}

/** Suit integrity after a hit (blocked hits cost nothing). */
export function afterHit(suit: number, attack: keyof typeof DAMAGE, result: HitResult): number {
  if (result !== 'hit') return suit;
  return Math.max(0, suit - (DAMAGE[attack] ?? 0.2));
}

/**
 * Out of a fight the suit seals itself: once no foe has been awake and close
 * for CALM seconds it mends at MEND a second (a full suit in about 12 s).
 */
export const SUIT_CALM = 4;
export const SUIT_MEND = 0.08;
export function mendSuit(suit: number, calm: number, dt: number): number {
  return calm >= SUIT_CALM ? Math.min(1, suit + SUIT_MEND * dt) : suit;
}
/** Waking after a blackout in a fight: the suit is patched to this much. */
export const WAKE_SUIT = 0.6;

/** A foe placed in a section, and the room (by its order) it guards. */
export interface FoeSpawn {
  id: string;
  kind: FoeKind;
  x: number;
  y: number;
  room: number;
}

/** A section's state in the save (optional: an old save has none). */
export interface SectionSave {
  taken: string[];
}
export const KEEPER_BEATEN = 'k';

export function keeperBeaten(sec: SectionSave | undefined): boolean {
  return !!sec?.taken.includes(KEEPER_BEATEN);
}

/**
 * Who is waiting in a section this visit: every small machine (they rebuild
 * themselves while Kestrel is away), and the keeper only until it is beaten.
 * After a blackout only the rooms from the safe lamp onward fill again.
 */
export function foesFor(spawns: FoeSpawn[], sec: SectionSave | undefined, fromRoom = 0): FoeSpawn[] {
  return spawns.filter((s) => s.room >= fromRoom && !(s.kind === 'keeper' && keeperBeaten(sec)));
}

/** Where to wake after a blackout: the furthest safe lamp reached this visit, else the door. */
export function wakePoint(door: { x: number; y: number }, lamps: { x: number; y: number; room: number }[], reached: number): { x: number; y: number; room: number } {
  const lit = lamps.filter((l) => l.room <= reached).sort((a, b) => b.room - a.room)[0];
  return lit ?? { ...door, room: 0 };
}

/** The engine room door in the Corvina's hold opens with the Rivet driver (and combat switched on). */
export function engineDoorOpen(save: Pick<SaveData, 'gear'>, on = true): boolean {
  return on && save.gear.includes('rivet');
}
