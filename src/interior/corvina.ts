/**
 * The Corvina's insides (after milestone 8 part 2, Colin: a proper dungeon,
 * dry, with gravity; the grapple hops you up to higher ledges). One tile is
 * 40 units. Three decks: the upper deck with the entry and the survey lab
 * (behind a powered door), the crew deck, and the great hold over a flooded
 * bilge.
 *
 *   #  steel          =  grating (stand on it; jump up through it; down + jump drops through)
 *   c  crate (solid)  o  grapple anchor        v  steam vent (bursts every few seconds)
 *   ~  flooded bilge (fall in and you're hauled back to your last footing)
 *   S  the hatch you came in by (hold Collect to climb out)
 *   B  breaker (two: both thrown brings her emergency power back)
 *   D  powered door   U  lift stop (powered: the car carries you between the hold and the upper deck)
 *   L  the lift shaft (the car rides up and down it)   G  the lift's gate at a stop
 *   1  sonar test logs   2  pressure suit drawings   3  the Corvina's log   $  a salvage crate
 *   E  the welded engine room door (Phase 19: the Rivet driver forces it; the infested engine room is behind)
 *   6  the bosun's locker beside it (the Rivet driver drawings)
 */
export const CORVINA_MAP: string[] = [
  '####################################################################################################',
  '#                                           #                                                      #',
  '#                                           #                                                      #',
  '#                                           #                                                      #',
  '#                                           #                                                      #',
  '#                                           #                                           ############',
  '#                                ====       D                   ===                            GLLL#',
  '#           cc                              D       ccc                   cc                   GLLL#',
  '#  S        cc  c    v                      D       ccc   1           2   cc        3         UGLLL#',
  '##########################    ##################################################################LLL#',
  '#                                                                                       #      #LLL#',
  '#                                    o                                                  #      #LLL#',
  '#   ======                                       o                                      #      #LLL#',
  '#                                                                                       #      #LLL#',
  '#                                                                                       #      #LLL#',
  '#   ======                                                  =======                     #      #LLL#',
  '#                cc               ###                                                       ===#LLL#',
  '#                cc               ###                                   cc                     #LLL#',
  '#         v      cc               ###                   v               cc  B                  #LLL#',
  '#############################################        ########################    ###############LLL#',
  '#                                                                                              #LLL#',
  '#                                                                                              #LLL#',
  '#                                                                                              #LLL#',
  '#              o               o                  o                  o                o        #LLL#',
  '#                                                                                              #LLL#',
  '#                                                                                              #LLL#',
  '#                         =====                                 ====                           #LLL#',
  '#                                                                                              GLLL#',
  '#                                                                                              GLLL#',
  '#   E $  6                                                                                B   UGLLL#',
  '#  ########         #####             ####                #####             #####         ##########',
  '#  ########         #####             ####                #####             #####         ##########',
  '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
  '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
  '####################################################################################################',
  '####################################################################################################',
];

/** The Collect labels and the lab's sign (Phase 19 adds the bosun's locker; E is the engine room door). */
export const CORVINA_OPTS = {
  labels: {
    '1': 'Take the sonar test logs',
    '2': 'Take the pressure suit drawings',
    '3': "Read the Corvina's log",
    '6': "Open the bosun's locker",
    $: 'Open the salvage crate',
  } as Record<string, string>,
  sign: { ch: '1', text: 'SURVEY LAB' },
};
