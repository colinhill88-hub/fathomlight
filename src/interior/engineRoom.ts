import type { FoeKind, FoeSpawn } from '../game/combat';

/**
 * Phase 19: the Corvina's engine room, the first infested wreck section
 * (Colin's choice, Nov 22, 2026: a new, optional sealed part of the
 * Corvina, so nobody is stuck on the main route without the weapon).
 *
 * The story: the Corvina carried a team of small hull-keeping machines that
 * scrubbed fouling off her plates and patched welds on long surveys. When
 * she sank her automatic "hull keeper" kept running on a trickle of power
 * down here, and over the years its machines rebuilt themselves out of
 * rust and scrap. Now they treat anything that moves as fouling. Her crew
 * welded the door shut and left drawings for a rivet driver in the bosun's
 * locker beside it.
 *
 * One tile is 40 units. Letters as in src/interior/corvina.ts, plus:
 *   K  a safe lamp (lit as Kestrel passes; after a blackout he wakes at the last one)
 *   t  a rust tick      d  a weld drone (hovers above this spot)      h  the hull keeper
 *   Y  the shutter to the keeper's store (it lifts once the keeper is beaten)
 *   7  the chief engineer's log       $  the keeper's hoard of salvage
 * The safe lamps also mark the rooms: a machine guards the room it starts in
 * and wakes when Kestrel walks into it.
 */
export const ENGINE_MAP: string[] = [
  '########################################################################',
  '#                  #                     #                     #       #',
  '#                  #                     #                     #       #',
  '#                  #                     #                     #       #',
  '#                                                              #       #',
  '#                                                              #       #',
  '#                                                              #       #',
  '#                                                              #       #',
  '#                                       d                      Y       #',
  '#                        c  d      cc                          Y       #',
  '#  S K      t  cc t   K  c      t  cc     K           h        Y  7  $ #',
  '########################################################################',
  '########################################################################',
];

/** The Collect labels, the way out and the look. */
export const ENGINE_OPTS = {
  style: 'engine' as const,
  powered: true,
  labels: {
    '7': "Read the chief engineer's log",
    $: "Open the keeper's hoard",
  } as Record<string, string>,
  gates: { Y: 'k' } as Record<string, string>,
  exitLabel: 'Back through the door to the hold',
  sign: { ch: '7', text: 'KEEPER STORE' },
};

const KINDS: Record<string, FoeKind> = { t: 'tick', d: 'drone', h: 'keeper' };

/** The safe lamps (in order), where each room starts, and the machines in it. */
export function engineLayout(map: string[] = ENGINE_MAP, T = 40): { lamps: { x: number; y: number; room: number }[]; roomStarts: number[]; spawns: FoeSpawn[]; door: { x: number; y: number } } {
  const lamps: { x: number; y: number; room: number }[] = [];
  const found: { ch: string; x: number; y: number }[] = [];
  let door = { x: 0, y: 0 };
  map.forEach((row, ty) => {
    [...row].forEach((c, tx) => {
      const x = tx * T + T / 2;
      const y = ty * T + T;
      if (c === 'K') lamps.push({ x, y, room: 0 });
      else if (c === 'S') door = { x, y };
      else if (KINDS[c]) found.push({ ch: c, x, y });
    });
  });
  lamps.sort((a, b) => a.x - b.x);
  lamps.forEach((l, i) => (l.room = i));
  const roomStarts = lamps.map((l) => l.x - T);
  const roomOf = (x: number) => {
    let r = 0;
    roomStarts.forEach((s, i) => {
      if (x >= s) r = i;
    });
    return r;
  };
  const spawns = found.map((f, i) => ({ id: `${f.ch}${i}`, kind: KINDS[f.ch], x: f.x, y: f.y, room: roomOf(f.x) }));
  return { lamps, roomStarts, spawns, door };
}
