import { BaseLayout, isDone } from './base';
import type { SaveData } from './state';

/**
 * Milestone 10: the Signal array and the Choir's story fragments. No drawing
 * here, just the rules.
 *
 * The Choir speaks in patterns of light (DESIGN.md, Story), so raising
 * glowing creatures is how the crew learns the language. Pattern spools are
 * found in the trench (the Fulmar's crew recorded them). A finished, powered
 * Signal array SA-1 decodes them one at a time, in the order they were found,
 * but only once the base knows enough "words": the number of different glow
 * patterns among grown creatures in the base's tanks (each species and
 * pattern pair counts once). Breeding for new patterns is the way to more.
 */

export interface FragmentDef {
  id: string;
  /** Where its spool is found (for the panel). */
  where: string;
  /** Different glow patterns the tanks must show before it can be read. */
  need: number;
  /** After milestone 12 (Colin): one of those patterns must be shown by a creature bred at the base. */
  bred?: boolean;
}

export const FRAGMENTS: FragmentDef[] = [
  { id: 'sig1', where: 'the relay buoy on the trench rim', need: 2 },
  { id: 'sig2', where: 'the cargo pod in the cleft', need: 4 },
  { id: 'sig3', where: 'the Fulmar deep station', need: 6 },
  { id: 'sig4', where: 'the Fulmar deep station', need: 8, bred: true },
];
/** Seconds of decoding per fragment (with power). */
export const DECODE_SECONDS = 150;

/** The base's light vocabulary: different glow patterns among grown creatures in tanks. */
export function vocabulary(save: SaveData): number {
  const words = new Set<string>();
  for (const c of save.creatures) if (c.stage === 'grown') words.add(`${c.species}:${c.traits?.pattern ?? 0}`);
  return words.size;
}

/** Is there a grown creature bred at the base (2nd generation or later) in a tank? Its pattern is a word the base made itself. */
export function hasBredWord(save: SaveData): boolean {
  return save.creatures.some((c) => c.stage === 'grown' && (c.traits?.gen ?? 1) >= 2);
}

export function hasArray(layout: BaseLayout): boolean {
  return layout.pieces.some((p) => p.kind === 'signal' && isDone(p) && layout.powered.has(p.id));
}

/** The fragment the array is working on (found, not yet decoded), if any. */
export function nextFragment(save: SaveData): FragmentDef | null {
  for (const id of save.signals.found) {
    if (save.signals.decoded.includes(id)) continue;
    return FRAGMENTS.find((f) => f.id === id) ?? null;
  }
  return null;
}

export type SignalEvent = { type: 'decoded'; id: string } | { type: 'stuck'; id: string; need: number; have: number };

/** Run the array forward by dt seconds of play. */
export function tickSignals(save: SaveData, layout: BaseLayout, dt: number): SignalEvent[] {
  const out: SignalEvent[] = [];
  if (!hasArray(layout)) return out;
  const f = nextFragment(save);
  if (!f) return out;
  const have = vocabulary(save);
  if (have < f.need) return out;
  if (f.bred && !hasBredWord(save)) return out;
  const rate = Math.max(0, ...layout.pieces.filter((p) => p.kind === 'signal' && isDone(p)).map((p) => layout.powerRate(p.id)));
  save.signals.progress = Math.min(1, save.signals.progress + (dt * rate) / DECODE_SECONDS);
  if (save.signals.progress >= 1) {
    save.signals.progress = 0;
    save.signals.decoded.push(f.id);
    if (!save.scans.includes(f.id)) save.scans.push(f.id);
    out.push({ type: 'decoded', id: f.id });
  }
  return out;
}

/** One line for the array's console and the scanner log. */
export function signalStatus(save: SaveData, layout: BaseLayout): string {
  const f = nextFragment(save);
  const n = save.signals.decoded.length;
  if (!layout.pieces.some((p) => p.kind === 'signal' && isDone(p))) return `Signal fragments: ${save.signals.found.length} found, ${n} decoded. Build a Signal array to read them.`;
  if (!hasArray(layout)) return 'Signal array: no power. Join it to a current turbine.';
  if (!f) return save.signals.found.length ? `Signal array: all ${n} fragment${n === 1 ? '' : 's'} found so far decoded. More spools wait in the trench.` : 'Signal array: listening. No pattern spools to read yet: look for them in the trench.';
  const have = vocabulary(save);
  if (have < f.need)
    return `Signal array: the next fragment needs ${f.need} different glow patterns among your grown creatures (you have ${have}). Breed for new patterns.`;
  if (f.bred && !hasBredWord(save))
    return 'Signal array: this last fragment answers only to a pattern the base has made itself. Raise a creature bred at the Hatchery until it is grown.';
  return `Signal array: decoding fragment ${FRAGMENTS.indexOf(f) + 1} · ${Math.round(save.signals.progress * 100)}% · about ${Math.ceil((1 - save.signals.progress) * DECODE_SECONDS)} s`;
}
