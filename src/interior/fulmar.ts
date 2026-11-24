import type { FoeKind, FoeSpawn } from '../game/combat';

/**
 * Milestone 10 (expanded with Phase 19+ deep-wreck combat & Reactor Wing):
 * the drowned Fulmar deep station on the trench floor, explored on foot.
 * One tile is 40 units. Three wide decks + the new East Reactor & Hydrophone Wing:
 *
 *  - top deck: the airlock (S), safe lamp (K), listening room under the crushed
 *    dome (log 7), array room behind a powered door (D) with pattern spool (5),
 *    resonator drawings (6), an Abyssal Spider & Weld Drone guarding the east
 *    hydrophone gallery, Deep Salvage Crate (1), and the lift's top stop (U/G/L);
 *  - crew deck: bunks with comms spool (4), breaker 1 (B), grapple gap, ladder (H),
 *    Rust Ticks (t) & Abyssal Spider (p) patrolling the turbine walkway, Deep
 *    Salvage Crate (2), and the supply locker ($);
 *  - machine hall & deep reactor bay: flooded below, grapple rings (o), breakers
 *    2 & 3 (B), Rust Ticks (t), Weld Drones (d), Abyssal Spiders (p), Deep Salvage
 *    Crate (3), and the lift's bottom stop on the east platform.
 */
export const FULMAR_MAP: string[] = [
  '############################################################################################################################',
  '#                              #                                        #                                              #####',
  '#                              #                                        #                                              #####',
  '#                              #                                        #                                              #####',
  '#                              #                                        #                                              #####',
  '#                                =====                                  #   =====               =======                #####',
  '#    cc                                                                 D                                              GLLL#',
  '#    cc          c                      cc                              D               c         d       c            GLLL#',
  '#    cc     7    cc     v               cc    K S                       D         5     c   6  K     p    c   1       UGLLL#',
  '########################################################    #H##########################################################LLL#',
  '#                                                            H                                                         #LLL#',
  '#                              o                             H                                    o                    #LLL#',
  '#                                               o            H                                                         #LLL#',
  '#   ===========                                              H                                                         #LLL#',
  '#                                                            H                                                         #LLL#',
  '#     4                       ###                            H              =======                =========           #LLL#',
  '#   ===========               ###                            H                                                         #LLL#',
  '#              ===            ###                    d       H                       d                                 #LLL#',
  '#                   B         ###       v      t             H   K    v         t      $      p       cc   2           #LLL#',
  '##H#########################################          ############################################################     #LLL#',
  '# H                                                                                                                    #LLL#',
  '# H                                                                                                                    #LLL#',
  '# H                                                                                                                    #LLL#',
  '# H            o               o                  o                  o                o                o               #LLL#',
  '# H                                                                                                                    #LLL#',
  '# H                                                                                                                    #LLL#',
  '# H                       =====                                 ====                            ======                 #LLL#',
  '# H                                           d                                  d                                     GLLL#',
  '# H                                                                                                                    GLLL#',
  '# H  B   K     t                                           B       p                        t     3      p            UGLLL#',
  '###########        #####             ####                #####             #####         #######        ####################',
  '###########        #####             ####                #####             #####         #######        ####################',
  '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
  '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
  '############################################################################################################################',
  '############################################################################################################################',
];

/** The Collect labels and the sign for her finds. */
export const FULMAR_OPTS = {
  style: 'fulmar' as const,
  labels: {
    '1': 'Pry open deep salvage crate',
    '2': 'Pry open deep salvage crate',
    '3': 'Pry open deep salvage crate',
    '4': 'Take the comms room pattern spool',
    '5': 'Take the last pattern spool',
    '6': 'Take the resonator drawings',
    '7': 'Read the listening log',
    $: 'Open the supply locker',
  } as Record<string, string>,
  sign: { ch: '5', text: 'ARRAY ROOM' },
};

const FULMAR_KINDS: Record<string, FoeKind> = { t: 'tick', d: 'drone', p: 'spider' };

/** Safe lamps, room boundaries, and patrolling machines/spiders inside the Fulmar. */
export function fulmarLayout(
  map: string[] = FULMAR_MAP,
  T = 40,
): { lamps: { x: number; y: number; room: number }[]; roomStarts: number[]; spawns: FoeSpawn[]; door: { x: number; y: number } } {
  const lamps: { x: number; y: number; room: number }[] = [];
  const found: { ch: string; x: number; y: number }[] = [];
  let door = { x: 0, y: 0 };
  map.forEach((row, ty) => {
    [...row].forEach((c, tx) => {
      const x = tx * T + T / 2;
      const y = ty * T + T;
      if (c === 'K') lamps.push({ x, y, room: 0 });
      else if (c === 'S') door = { x, y };
      else if (FULMAR_KINDS[c]) found.push({ ch: c, x, y });
    });
  });
  lamps.sort((a, b) => a.x - b.x);
  lamps.forEach((l, i) => (l.room = i));
  const roomStarts = lamps.map((l) => l.x - 4 * T);
  const roomOf = (x: number) => {
    let r = 0;
    roomStarts.forEach((s, i) => {
      if (x >= s) r = i;
    });
    return r;
  };
  const spawns = found.map((f, i) => ({ id: `f${f.ch}${i}`, kind: FULMAR_KINDS[f.ch], x: f.x, y: f.y, room: roomOf(f.x) }));
  return { lamps, roomStarts, spawns, door };
}
