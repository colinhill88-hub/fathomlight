# Phase 10 Living Creatures

The living roster is enabled by default on `codex/phase-10-living-creatures`. Add `?creatures=original` to restore the original creature visuals. The Living Water flag remains independent. Add `?water=original` to check the new rigs without environmental flow and wakes.

## Creature inventory

| Family | Silhouette and movement in the final design | Life stages or encounter |
| --- | --- | --- |
| Silverbar | A tall sail-backed schooling fish with a broad dark gill bar, a long articulated gold fork, and a trailing belly fin. Fish roll and tuck their fins on a burst, then coast back into the school. | Same adult schools in the Shallows, Meadow, and Forest. |
| Glowfin | A round, high-browed rower with oversized pectoral blades and a swinging lure. Paired fin strokes hold a hover. The tail takes over on a startle. | Grotto adults, egg clutches, captive fry and adults, and the existing escort. Fry keep the round paddle and shorter lure. |
| Puffcap | A full scalloped bell with five broad, jointed, trailing ribbons. Brief compression drives each pulse, followed by a longer open drift. An escape quickens the pulse. | Stalked polyps, three-ribbon juveniles, and five-ribbon adults. |
| Dapple ray | Swept wings open around a low central disc. The outer wings follow the inner stroke with different timing on either side. The near wing folds down to the sand on a rest. | Leathery egg case, short-winged young, and wide-winged adults. |
| Tinker crab | A tall, asymmetrical stack of armor over short jointed legs. A large claw opens to investigate and tucks down before a retreat. The legs target the existing floor. | Low-shelled young with proportionally larger eyes, crowned adults, and egg sponges. |
| Lantern shrimp | A compact saddle mask with long feelers, articulated abdominal plates, an oversized tail fan, and small paddling limbs. On a startle the tail folds under, then opens on the glide. | Smaller eyes are reserved for adults. Young shrimp have larger eyes relative to the mask and fewer abdominal plates. The clutch uses a row of pearls. |
| Cinder snail | A chimney-shaped shell rides a rippling foot. Staggered eye stalks retract when threatened. The shell retains the amber cue near vent rock. | Tall layered shells in adults, low shells in juveniles, and vertical egg capsules. |
| Wreck lurker | A plated hood expands around the flaring lure before the jaws launch. The armor closes back down as the lurker retracts into the den. | Den warning, lunge, retreat, and sonar response. |
| Lanternjaw | A head-heavy, high-sailed ambusher with a hinged jaw, ballast fins and a pendulum lure. Its fins tighten for the snap and open while hanging. | Lamp-led drift and snap, then backing into rest. |
| Pale stalker | A narrow ghost ribbon with wide staggered mantle membranes. A travelling wave follows the existing trail. The membranes tuck in for the strike. | Roam, follow, warning, strike, and sonar flight. |
| Abyssal strider | A low, plated trestle body between hooked blade shins. The front pair reaches while the remaining legs use the existing ledge contacts. | Wander, approach, grab, and sonar flight. |
| Lantern anemones | Individual petal lobes tilt with water and recoil under a passing diver. The colony stays anchored to the original base and scan point. | Grotto floor and ceiling and basin floor. |
| Sea pens | A single fleshy feather folds close to its anchored stem as the diver passes. | Wreck Shelf seabed. |
| Tube worms | Flared individual crowns withdraw toward their separate tubes under a passing diver. | Wreck Shelf and Trench floors. |
| Sea lilies | Broad feathery crowns flare and fold. Adjacent arms have different phases. | Trench ledges and floor. |
| Glass sponges | Tall faceted lattices with a softly contracting aperture. | Trench ledges and floor. |
| Brittle stars | Five flexing arms anchored to a small disc on the existing rock. | Trench ledges and floor. |
| The Choir | An unfurling, breathing mantle of luminous lobes. Separate strands bear the original contact colours and pulse with the original notes. | Scripted first contact. The existing rise, notes, bloom cues and light intensity still drive the render. |

The six keepable species share the same rigs in outdoor tanks, indoor tanks, and the Hatchery. Reef-building coral and sea fans remain the approved, placed reef scenery. Vegetation and self-propelled equipment use their existing systems.

## Design choices

- Silverbar's narrow mackerel-like pilot kept the school legible, but the taller leaf profile and oversized fork made each turn easier to follow in a group.
- The rounded Glowfin rower gives the fin strokes more space to read than the needle-bodied dart concept. The Dapple ray keeps the broad diamond from the initial study, extended into swept wingtips that show its bank from the side.
- Puffcap's wide bell exposes the contraction and the delayed ribbon swing better than a tall narrow cascade. Tinker crab's tall crown leaves room for a planted gait beneath it, while a low rubble camouflage design hid the stance.
- The low long-bodied Lantern shrimp concept left less room to show the abdomen folding under itself. The saddle and fan make that tuck readable. Cinder snail's chimney silhouette gives the small grazer a stronger presence among the vents than a low spiral.
- The plated hood makes the lurker's warning readable at the den. A tall open-water sail separates Lanternjaw from the hood. The pale stalker's membrane wave distinguishes it from the shorter tail-driven hunters. The low strider carapace gives its planted contacts and reaching front limbs more contrast than a high arch.
- Fixed wildlife leans or retracts according to its anatomy. The Choir's mantle opens in successive lobes using the existing first-contact cues.

## Living Water and gameplay boundaries

Creature poses read from the existing gameplay state. The swimming paths, reach and damage rules, scanner landmarks, terrain collision, care, and save schema remain with their original controllers. Current influences the fins, wings, feelers, and stationary crowns at render time. Nearby visible swimming creatures or crawlers can add bounded impulses from the tail, bell, wing, or foot using the shared Living Water queue. Glowfin retains its original impulse budget with the origin registered to the moving tail. The redesigned predator impulses originate behind the lurker's hood, at the angler's tail, along the stalker's trailing end, or at a planted strider foot.

## Validation

- TypeScript and the production build pass. The comparison flag was exercised in the real game at 2560 × 1440 Ultra on the RTX 5080.
- Matched natural-route samples agreed for wildlife position and velocity, scanner positions, player movement, and oxygen. The isolated predator fixtures also agreed on warning and damage frames, state transitions, and sonar response. Glowing lure and ray tail-tip registration were checked.
- An isolated save exercised hatching, growth, breeding, and trait round-trips for all six keepable species. Both tank renderers were checked. The Glowfin escort uses the same rig. The 48-creature render smoke test showed no obvious slowdown on the desktop.
- The review folder contains matched videos at normal gameplay zoom, a sheet for all keepable life stages, and a field comparison sheet for the school, predators, fixed wildlife, and the Choir. The predator videos use controlled encounter fixtures inside their actual biome. The Choir clip exercises its authored cues without replaying the whole quest.
- Coverage is desktop. The full campaign and iPhone performance were outside these checks. Low ambient light still makes some silhouettes subtle until Kestrel's lamp crosses them.

## Local implementation history

- `9d1010c` · Initial Silverbar school.
- `371356c` · Glowfin and Dapple ray articulation.
- `d73d35e` · Keepable wildlife and life stages.
- `b9c7b7f` · Wreck Shelf and Trench predators.
- `9fa5721` · Stronger Silverbar, Glowfin, and Dapple ray silhouettes and registered wildlife eyeshine.
- `597ef14` · Fixed wildlife and the Choir.
