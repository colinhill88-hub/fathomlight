/**
 * Milestone 10: the drowned Fulmar deep station on the trench floor, the
 * trench's major site (Colin's choice: explored on foot, like the Corvina).
 * Its crew lived down here for years listening to the Choir's lights; the
 * pressure finally won, they left, and most of it is still dry. One tile is
 * 40 units. Three decks:
 *
 *  - the top deck: the airlock (S), the listening room under the crushed dome
 *    (their log, 7), and the array room behind a powered
 *    door (D) with the last pattern spool (5) and the resonator drawings (6),
 *    and the lift's top stop at its east end (U, with its gate G);
 *  - the crew deck: bunks with the comms spool (4), a breaker, a tall step
 *    and a gap over the machine hall (grapple across), a ladder up;
 *  - the machine hall, flooded below: islands, grapple rings across, two
 *    more breakers and the lift's bottom stop on the east platform. A ladder
 *    climbs from its west end. The lift's car rides a real shaft (L) up the
 *    station's east side between the two stops (after milestone 10, as in the
 *    Corvina).
 *
 * All three breakers bring her emergency power back: the lamps, the lift and
 * the array room's door. Letters as in src/interior/corvina.ts, plus H for a
 * ladder.
 */
export const FULMAR_MAP: string[] = [
  '####################################################################################################',
  '#                              #                                        #                      #####',
  '#                              #                                        #                      #####',
  '#                              #                                        #                      #####',
  '#                              #                                        #                      #####',
  '#                                =====                                  #   =====              #####',
  '#    cc                                                                 D                      GLLL#',
  '#    cc          c                      cc                              D               c      GLLL#',
  '#    cc     7    cc     v               cc      S                       D         5     c   6 UGLLL#',
  '########################################################    #H##################################LLL#',
  '#                                                            H                                 #LLL#',
  '#                              o                             H                                 #LLL#',
  '#                                               o            H                                 #LLL#',
  '#   ===========                                              H                                 #LLL#',
  '#                                                            H                                 #LLL#',
  '#     4                       ###                            H              =======            #LLL#',
  '#   ===========               ###                            H                                 #LLL#',
  '#                             ###                            H                                 #LLL#',
  '#                   B         ###       v                    H        v             $          #LLL#',
  '##H#########################################          ######################################   #LLL#',
  '# H                                                                                            #LLL#',
  '# H                                                                                            #LLL#',
  '# H                                                                                            #LLL#',
  '# H            o               o                  o                  o                o        #LLL#',
  '# H                                                                                            #LLL#',
  '# H                                                                                            #LLL#',
  '# H                       =====                                 ====                           #LLL#',
  '# H                                                                                            GLLL#',
  '# H                                                                                            GLLL#',
  '# H  B                                                     B                                  UGLLL#',
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
