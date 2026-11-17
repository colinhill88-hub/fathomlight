/**
 * Milestone 10: the drowned Fulmar deep station on the trench floor, the
 * trench's major site (Colin's choice: explored on foot, like the Corvina).
 * Its crew lived down here for years listening to the Choir's lights; the
 * pressure finally won, they left, and most of it is still dry. One tile is
 * 40 units. Three decks:
 *
 *  - the top deck: the airlock (S), the listening room under the crushed dome
 *    (their log, 7), the lift's top (U), and the array room behind a powered
 *    door (D) with the last pattern spool (5) and the resonator drawings (6);
 *  - the crew deck: bunks with the comms spool (4), a breaker, a tall step
 *    and a gap over the machine hall (grapple across), a ladder up;
 *  - the machine hall, flooded below: islands, grapple rings across, two
 *    more breakers and the lift's bottom. A ladder climbs from its west end.
 *
 * All three breakers bring her emergency power back: the lamps, the lift and
 * the array room's door. Letters as in src/interior/corvina.ts, plus H for a
 * ladder.
 */
export const FULMAR_MAP: string[] = [
  '####################################################################################################',
  '#                              #                                        #                          #',
  '#                              #                                        #                          #',
  '#                              #                                        #                          #',
  '#                              #                                        #                          #',
  '#                                =====                                  #   =====                  #',
  '#    cc                                                                 D                          #',
  '#    cc          c                      cc                              D               c          #',
  '#    cc     7    cc     v               cc      S                 U     D         5     c   6      #',
  '########################################################    #H######################################',
  '#                                                            H                                     #',
  '#                              o                             H                                     #',
  '#                                               o            H                                     #',
  '#   ===========                                              H                                     #',
  '#                                                            H                                     #',
  '#     4                       ###                            H              =======                #',
  '#   ===========               ###                            H                                     #',
  '#                             ###                            H                                     #',
  '#                   B         ###       v                    H        v             $              #',
  '##H#########################################          ######################################    ####',
  '# H                                                                                                #',
  '# H                                                                                                #',
  '# H                                                                                                #',
  '# H            o               o                  o                  o                o            #',
  '# H                                                                                                #',
  '# H                                                                                                #',
  '# H                       =====                                 ====                               #',
  '# H                                                                                                #',
  '# H                                                                                                #',
  '# H  B                                                     B                                    U  #',
  '###########        #####             ####                #####             #####           #########',
  '###########        #####             ####                #####             #####           #########',
  '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
  '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
  '####################################################################################################',
  '####################################################################################################',
];

/** The Collect labels and the sign for her finds. */
export const FULMAR_OPTS = {
  labels: {
    '4': 'Take the comms room pattern spool',
    '5': 'Take the last pattern spool',
    '6': 'Take the resonator drawings',
    '7': 'Read the listening log',
    $: 'Open the supply locker',
  } as Record<string, string>,
  sign: { ch: '5', text: 'ARRAY ROOM' },
};
