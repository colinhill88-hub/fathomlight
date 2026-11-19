# Phase 10 Living Creatures

## Implemented

The Silverbar is the first visual pilot. Its dark gill bar and gold fork still identify it at distance. The new narrow tail wrist, fork and pectoral fin each move independently. Tail tempo increases during an existing burst, and each fish carries its own stroke phase and turn response. The rig samples Living Water once per visible school to trim its pitch. The school controller still determines positions, scatter, and regrouping.

The Glowfin uses the rounded fin-rower from the grotto design studies. Paired pectoral fins work independently during hover, the tail takes over during a startle, and the lure trails the stroke. The grotto light follows the lure and the existing Living Water impulses originate at the tail paddle. Wild adults, captive Glowfins and the escort share the rig. Fry have a fuller forehead, a shorter stalk and a rounder paddle. Eggs still use the clutch art.

The Dapple ray uses the broad diamond study. The two wings and their outer tips fold at different times, with a segmented tail that follows the motion of the body. Wild rays read their existing rest state and seabed clearance to flatten near the sand. Juveniles have shorter wings and tails and proportionally larger eyes. The tank views share the rig, which still displays inherited tints and luminous patterns.

Living creatures are enabled by default. Use `?creatures=original` for the prior art and poses of these three species. Use `?water=original` independently to disable Living Water. The renderers add no save fields. Breeding, scanning, collision, and wildlife movement remain with their existing controllers.

## Creature inventory

| Creature | Existing role and implementation | Next visual questions |
| --- | --- | --- |
| Silverbar | Non-collectible schools in the Shallows, Meadow, and Forest. The school centroid is scannable. `actors/school.ts` owns drifting, scattering and regrouping. | Compare the pilot with a slimmer, mackerel-like design and a taller, leaf-shaped design in large groups. Check turn readability and whether visible reaction delays would help the school. |
| Glowfin | Three ambient grotto adults have their own light, lure and shy-swim controller in `actors/glowfin.ts`. Wild eggs and tank life use `Critter`. A grown Glowfin can escort the diver. Tank output is quartz. | Rounded fin-rower implemented. Include a populated nursery and multiple tank palettes in the final visual pass. |
| Puffcap | Open-water jelly with pulsing bell, ribbons and polyp stage. Tank output is fibre. | Compare a broad bell with soft scallops and a deep, narrow bell with longer trailing ribbons. Separate compression, release and passive drift. |
| Dapple ray | Meadow swimmer with bottom rests, juvenile specimens and egg cases. Tank output is copper. | Broad diamond with articulated wings implemented. Test its bank against different terrain slopes and add a restrained wing-driven water disturbance if warranted. |
| Tinker crab | Forest holdfast crawler that approaches a quiet diver and flees fast movement. Tank output is scrap. | Try a squat rubble-like carapace and a high, plated silhouette. Use contact-aware steps with claws and feelers that brace before it bolts. |
| Lantern shrimp | Forest cleaner and cautious swimmer with antennae. Improves mixed-tank care and yields moss. | Compare a transparent long-bodied grazer with a compact saddle-backed form. Separate feeler sweeps, feeding and tail-flick escape. |
| Cinder snail | Vent grazer with an ember-lit shell. Tank output is ore. Grazing can open the sealed chimney. | Explore a low ribbed spiral and a high chimney-like shell. Keep the living foot in contact with terrain and preserve the ember cue. |
| Wreck lurker | Den-bound ambush predator in `actors/lurker.ts`. Existing lamp-sensitive warning, lunge and recovery. | Preserve the warning silhouette and lure timing while making the recoil and retraction clearer. |
| Lanternjaw | Deep hunter attracted to Kestrel's lamp. Sonar drives it off. | Explore a heavy, deep-jawed silhouette and a thinner hanging ambusher. Preserve the lure, bite timing and hit geometry. |
| Pale stalker | Deep follower that strikes when the diver stops or goes dark. Sonar repels it. | Explore a ribbon silhouette with a long dorsal wave and a narrow-bodied glider with separate steering fins. Preserve eyeshine and the follow-to-strike cue. |
| Abyssal strider | Long-legged deep hunter on ledges, drawn to the lamp and repelled by sonar. | Explore low braced and high arching silhouettes. Keep the timing of the reach, grab and retreat clear. |

The latter three predators share `actors/deep.ts`. Lantern anemones are fixed, scannable grotto and basin life inside `world/scenery.ts`. The Trench also has decorative sea lilies, glass sponges, tube worms and brittle-star forms in `world/trenchgfx.ts`. Coral and sea fans are also environmental life. Treat fixed life as a separate motion pass using the existing art and habitat placement. The scripted Choir form in `interior/sanctum.ts` belongs to the first-contact sequence and has no breeding or wildlife AI.

## Resume here

1. Review the 1440p Silverbar captures at normal speed. Try the two alternate silhouettes before locking the family shape. Compare the dark gill bar, acceleration, fork follow-through, and group readability against the same inputs.
2. Prototype contrasting Puffcap bell and ribbon shapes, then compare real contractions and passive drifts in the drop-off. Follow with the Forest bottom-dwellers and the vent-grazing Cinder snail. Check the flag in outdoor tanks, indoor tanks, and the nursery for each keepable species.
3. Use `CritterPose` as the render boundary. Carry velocity, proximity and existing startle, rest and capture state into the artwork. Keep target selection, terrain following, collection radii and random-number calls in the existing controllers. Use independent phase and anatomy for short swimmers, jelly bells, broad wings, jointed crawlers and grazing feet.
4. Compare juveniles and adults together. Preserve egg, young and grown progression, inherited traits and palette patterns from `game/creatures.ts`, `game/traits.ts` and `game/state.ts`. Check outdoor and indoor tank views, breeding, save/load, escort and release with the same seeded inputs.
5. Develop predator silhouettes after the peaceful families. Preserve warning and attack timings, damage, sonar, lamp behavior and all scanner coordinates. Test fauna-driven water signals through the existing capped impulse queue with per-family emission limits. The existing grotto Glowfin disturbance path in `main.ts` is the starting example. The Silverbar pilot only reads the field.
6. Expand the initial desktop validation to all species, crowded habitats and mixed tanks. Capture matched 2560 × 1440 Ultra videos for the full brief. Compare more than one camera position before judging visual benefit.
