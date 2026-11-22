# Phase 18: Linnea, the axolotl guide

Linnea is Colin's daughter's idea and name. She is a friendly axolotl who waits at one place at a time and gives gentle hints about what to look for next. She only speaks when Kestrel swims up to her and presses **Talk** (the Collect action: **C** on the keyboard, **X** on a gamepad, the **Collect** button on touch). She never calls out, follows Kestrel or interrupts.

- **Rules:** [`src/game/linnea.ts`](../src/game/linnea.ts) (`linneaPlan(save)` picks her spot and lines from the save; Node-tested in `scripts/test-progression.mjs`).
- **Art and animation:** [`src/actors/linneaRig.ts`](../src/actors/linneaRig.ts) (drawn in code; blink, gill flutter, talking bob and mouth, curious head tilt, a happy tail wiggle when Kestrel arrives).
- **In the world:** [`src/world/linnea.ts`](../src/world/linnea.ts) (her drift at the spot, facing Kestrel, fading out and reappearing at the next spot).
- **Her words:** [`src/ui/linneaSpeech.ts`](../src/ui/linneaSpeech.ts) (the warm card over her head; Talk again for her next line).
- **Her chirp:** `linneaChirp()` in [`src/audio/director.ts`](../src/audio/director.ts) (synthesised, on the sfx bus).
- **Save:** no new field. Each place Kestrel has met her is a `linnea:<spot>` entry in the existing `tips` list. Old saves work unchanged.

## Her spots, in order

She is at exactly one of these, decided by the save. When the story moves on, she fades away and is found at the next one.

| # | Spot | Where | She is here while |
| --- | --- | --- | --- |
| 1 | cliff | Sunlit Shallows, outside the dark cave in the east cliff (the first gear gate) | no dive light yet |
| 2 | forest | Kelp Forest, where the cliff cave comes out | dive light, kelp caves not yet seen |
| 3 | caves | outside the mouth of the kelp caves | kelp caves seen, no grapple line yet |
| 4 | shelf | the rock plateau above the race, at the edge of the Wreck Shelf | grapple line, Corvina not yet reached |
| 5 | corvina | outside the Corvina | Corvina reached, no PS-1 suit yet |
| 6 | rim | the trench rim | PS-1, the cleft's chimney still sealed |
| 7 | fulmar | the trench floor outside the Fulmar | cleft open, resonator plans not yet found |
| 8 | sanctum | by the round stone door in the trench floor | resonator plans found, before first contact |
| 9 | home | by the Kestrel buoy | after first contact |

"Seen" means Kestrel has been near it (the zone map's record).

## What she says

The very first time ever, she starts with: *"Oh! Hello. I'm Linnea."*

| Spot | When | Lines |
| --- | --- | --- |
| cliff | nothing found yet | "It's so dark in that cave... I'd never swim in without a proper light." / "The old survey sled out on the sand still blinks sometimes. I wonder what it remembers?" |
| cliff | carrying the sled recorder | "You found the sled's little recorder!" / "A Lab at your base could read what it remembers." |
| cliff | light decoded (or being made) | "Your Lab has worked out the light, hasn't it? I can tell." / "Once a Workshop builds it, the dark in there won't be so dark." |
| forest | KS-1 built, boom shut | "Your little sub is too big for the cave, isn't it?" / "The old boom up on the clifftop has a winch on this side..." |
| forest | otherwise | "Welcome to the kelp! Listen... something echoes in the rock wall, far to the east." |
| caves | brackets not all lit | "Deep inside, the water is darker than dark." / "The glowing moss on the shady rocks out here... I wonder if it would help, set in those old brackets?" |
| caves | all four lit | "You lit the black water! It's so pretty now." / "Someone left something at the far end, I'm sure of it." |
| caves | cache found, no cutter | "That old cache had plans for something hot and bright." / "A Lab and a Workshop could make it real." |
| caves | cutter, rope notes not found | "I heard creaking up above the junction inside. An old rope store, maybe?" |
| caves | rope notes found | "Rope notes! A line that hooks onto things could take you very far east." |
| shelf | always | "The water down there pulls so hard!" / "Those old rings across it... your line could hook onto them, one after another." |
| shelf | KS-1 built, vane down (second line instead) | "Past the race there's a winch. I think it could calm the water enough for your sub." |
| corvina | deck hatch sealed | "That big ship is shut tight. Her deck hatch is welded closed." / "Her stern looks easy to hook onto, and your cutter does love a welded seam." |
| corvina | hatch open, power off | "Inside, the old ship is fast asleep." / "Wake her breakers and maybe her doors will listen." |
| corvina | power on, suit plans not found | "She hums again! Something about deep-water suits is tucked away down in her hold." |
| corvina | suit plans found | "Those suit plans! With a Lab and a Workshop, you could swim deeper than ever." |
| rim | no grown snail in the jar | "Down by the warm vents, a crack in the rock is sealed by a mineral chimney." / "The little cinder snails graze on those. A grown one might clear it..." |
| rim | a grown snail in the jar | "Your snail looks hungry!" / "There's a mineral chimney sealing a crack by the vents. I bet it would love a nibble." |
| fulmar | no PS-2 | "There's an old station on the very bottom. It's deeper than your suit can go." / "The cleft by the vents held plans for a stronger one, didn't it?" |
| fulmar | PS-2, airlock shut | "The station's airlock is on top. Its old winch might still turn." |
| fulmar | inside, power off | "It's so dark inside the station." / "Three breakers to wake it, I think." |
| fulmar | power on | "Spools of light are hidden in there. The Choir's own patterns, I'm sure of it." |
| sanctum | fewer than four fragments decoded | "Your Signal array needs to understand the light." / "The more different glows your creatures make, the more it can read. Babies have their own patterns, too." |
| sanctum | all decoded, no resonator | "All four pieces of the song! A Workshop could make something that sings." |
| sanctum | resonator, door shut | "This door is listening. I think it wants a song." |
| sanctum | door open | "They're waiting for you, down at the very bottom." / "I can feel them singing in my gills." |
| home | after first contact | "You did it! The Choir sang all the way up to the shallows." / "Thank you for letting me swim along. Come and say hello any time." |

To change a line, edit the text in `linneaPlan()` in `src/game/linnea.ts`. The checks only test which hint is chosen, not the exact words, and that each line stays short.
