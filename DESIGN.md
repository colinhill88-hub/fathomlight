# Fathomlight design

Nov 14, 2026 · @Colin Hill

## How to use this plan

This is the creative brief. Start with the [development handoff](docs/AI_DEVELOPMENT_HANDOFF.md) for the current system map and workflow, and [Progress](PROGRESS.md) for shipped milestones. The original milestone list and kickoff prompts below are historical. Review local work and captures before publishing or deploying.

## Vision

A single-player, side-view underwater adventure where a small crew of explorers dives, builds a snap-together base, raises sea creatures and makes contact with something intelligent in the deep. The game is called Fathomlight.

The inspiration is childhood bathtub play with toy divers and dome-windowed submersibles, imagined as real explorers. Touchstones are Subnautica (exploration and base building), The Abyss (awe at a luminous deep-sea intelligence) and The Legend of Zelda: Ocarina of Time (gear that opens new areas).

Five pillars decide every design question:

1. **Wonder first, danger with depth.** The shallows are cozy and safe. Predators, darkness, currents and crush depth arrive as the player goes deeper.
2. **Gear opens the world.** Progress comes from items and upgrades that unlock places the player could already see, as in Zelda. There are no experience points or levels.
3. **Every base piece has a job.** Pieces snap together and each one adds a capability the player needs.
4. **Creatures need care.** Collected animals must be fed, housed well and kept in clean water, and caring for them pays off.
5. **It must look beautiful.** Visual quality on Colin's own devices matters more than reach or broad compatibility.

## Art direction

Modern Fathomlight uses original painterly biome and interior assets supported by procedural lighting, terrain and animation. Kestrel's compact salvage rig keeps a squat shell, short split fins and broad gauntlets readable in silhouette. The water carries wakes and recovers after the diver passes. Base cutaways follow individual hulls with the live exterior visible around them. Preserve these layers and the crisp Phase 11C presentation when changing gameplay.

The look is weathered, realistic hardware set in painterly water. The screenshots in `docs/art/` are the style reference; match their mood, not their exact shapes.

- **Hardware (suits, subs, base pieces):** chunky, functional silhouettes with industrial detail. Muted yellow, steel grey and rust red paint; rivets, panel seams, stencilled numbers, scratches, rust streaks and algae growth. Dome-shaped glass windows are a signature shape.
- **Environment:** painterly and atmospheric. Soft brushed rock and sand, layered parallax, murky depth fog and drifting particles. Colour fades realistically with depth: warm tones disappear first, then everything goes blue-black.
- **Creatures:** naturalistic proportions with small eyes, patterned skin and bioluminescence. Nothing cartoonish.
- **Creatures get scarier with depth (Colin's direction after milestone 3 follow-up 2).** Opus may be creative with creature designs, and the mood of the creatures follows the depth:
  - *Sunlit shallows:* cute and gentle. Round, soft shapes, no teeth, friendly eyes, but visually interesting: bold patterns, frills, translucency, small warm glows. Still drawn with realistic shading and weathering, not as cartoons.
  - *Kelp forest and caves:* curious but wary. The first small predators: sharper fins, hints of tiny teeth, eyes that catch the lamp.
  - *Wreck shelf:* unsettling. Longer bodies, spines, creatures that hide and lunge, more bioluminescence used as lures.
  - *The trench:* fear-based. Large shapes glimpsed at the edge of the light, needle teeth, glowing lures in the dark, eyes that reflect, things that follow the diver. Bioluminescence grows with depth.
  - *The sanctum:* awe again, not fear; the Choir's colours take over.
  - The colour rule still holds at every depth: creature glow stays warm (yellow, green, amber, pale white, red). Cyan, violet and magenta stay reserved for the Choir.
- **The alien presence:** luminous, non-humanoid ring-and-ribbon forms in cyan, violet and magenta. It is the only source of those colours in the game.
- **Interface:** clean and minimal so it does not compete with the scene. Touch targets at least 44 px.
- **Dive watch:** oxygen, depth and dive time are eventually shown on a gauge styled like a dive watch (Colin's request after milestone 1).
- **Explorer suit (Colin's direction after milestone 1):** inspired by the toy divers he played with as a kid, reimagined as real gear. It has a swept helmet of tinted lime-green glass with one smooth crest fin and the face visible inside. A blue-steel chrome collar yoke carries a coiled breathing hose from the back unit over the side of the helmet to a round regulator port on the chest. Sleeves are grey; the suit is charcoal with faint brass etched lines; gloves, belt and straps are rust red; a compact chrome rebreather sits on the back, and its metal sweeps up into a raised cowl behind the helmet where the hose connects. Use these as inspiration only: realistic proportions and weathering, no toy shapes.
- **New base kit and Crest diver (Colin, after the Corvina on foot; boards in `docs/art/kit2/`):** base pieces are charcoal hull, chrome joints and flanges, neon lime glass, a gold power line and one red lamp, with no yellow plate and no hazard stripes. The diver has a charcoal suit with gold circuit etching, a neon lime crest helmet, a chrome hose rebreather, twin oxygen tanks, hip thrusters with lime nozzles, red gloves, short red-tipped fins and a clipped harpoon (decoration for now; reuse its design for later tools and weapons).
- **All art is drawn by code.** Shapes, textures, weathering and lighting are procedural. Use no image files unless Colin supplies them.

**Originality rules.** Every design must be original. Use no brick, stud or minifigure shapes and no toy-like plastic look. Use no trademarked names. Copy no creature, vehicle, building or character design from Subnautica, The Abyss or any other game or film.

## Platform and tech

The game is a 2D side-view web app, so one build runs on Colin's iPhone 16 Pro, his iPad and his gaming PC (RTX 5080) from a single link.

- **Rendering:** GPU-accelerated 2D with custom shaders. A WebGL or WebGPU renderer such as PixiJS is the suggested starting point; Opus should check current documentation and choose the best fit before milestone 0.
- **Language and build:** TypeScript with a standard bundler, deployed automatically to GitHub Pages on every commit.
- **Controls:** touch first, landscape orientation. A virtual stick on the left and context buttons on the right. Keyboard, mouse and gamepad on PC.
- **Phone install:** the game can be added to the iPhone home screen and run full screen.
- **Saving:** automatic, stored on the device. Include export and import of a save code so progress can move between phone, iPad and PC.
- **Steam later (Colin, after milestone 4):** Colin may sell the game on Steam. Keep developing it as a web link in small chunks; wrap it as a desktop app (Electron or Tauri) during the polish milestone, or earlier if he wants a "Coming soon" store page for wishlists. Until then, keep everything the game needs inside the build (no online services it depends on), keep saving behind one module (`src/game/state.ts`) so Steam cloud saves can plug in, and keep making only original, licensable content.
- **Graphics presets:** two presets, chosen automatically and switchable in settings.

| Preset | Device | Target | Effects |
| --- | --- | --- | --- |
| High | iPhone 16 Pro, iPad | Smooth at 60 frames per second | Dynamic lights, light shafts, caustics, depth fog, glow, water distortion, particles, and the HDR post stack: tone mapping, per-zone colour grading, bloom, vignette and film grain (graphics session G1) |
| Ultra | PC with RTX 5080 | Up to 4K at 120 frames per second | Everything in High at full resolution, plus soft shadows, denser particles, more parallax layers and a longer bloom chain |

There is no need to support older or low-end devices. If an effect has to be cut, cut it from the phone preset before the PC one, and say so in `PROGRESS.md`.

## On foot: dry interiors (Colin, after milestone 8 part 2)

- **Interiors are separate dry spaces.** You enter through a hatch or airlock and the game switches to the interior (like stepping into a Zelda dungeon), so an interior can be far bigger than the hull looks from outside. Built from tile maps (`src/interior/`), so new interiors are quick to author.
- **The explorer walks and jumps** indoors: gravity, platforms, one-way gratings, hazards. **The grapple is a hookshot** to anchor rings on higher ledges. The helmet's face plate lifts with a short animation in dry air.
- **The Corvina** was the first (her insides as a multi-deck dungeon). **The base is walkable** (parts 1 and 2 built: rooms from the layout, ceiling conveyors and pipes with moving items, the moon pool as a second entry, lifts for tall shafts, whorls fitted from inside) (Colin's choice: everything indoors, machines included), with larger, more detailed pieces whose layout must make sense to walk through. Save compatibility does not matter for that rework: Colin will playtest from scratch.
- **Logs and documents** open in a reading panel that stays until closed, and stay in the scanner log.

## Game systems

Five systems make up the game: diving, submersibles, the base, creature care and gear progression.

### Diving

- The explorer swims freely in a side-view world. Oxygen, depth and light are the three things to manage.
- Each suit has a maximum safe depth. Going below it causes damage that grows quickly.
- A scanner records creatures, plants and wreckage. Scans feed the Lab and unlock blueprints.
- Running out of oxygen or health returns the player to the last base or sub visited. Carried samples drop at that spot and can be recovered.
- Air tank upgrades are hidden collectibles that extend dive time, like heart containers in Zelda.

### Submersibles

- A sub is a hull with a dome cockpit and module slots. Modules include lights, grabber arm, cargo bay, sonar and depth plating.
- Subs carry oxygen, so they act as a mobile safe point.
- Subs are built, repaired and refitted at the Moon pool dock.
- **Built in milestone 6** (Colin's choices): the sub KS-1 costs 12 hull plating plus quartz, copper and kelp fibre, and the dock 6 plating. It drives heavy and direct (the same stick, with Boost as thrusters), carries 10 minutes of air, and hard knocks against rock dent the hull, which the dock repairs with plating. The first modules are the cargo bay (raises `bagLimits()` while aboard), floodlights and the grabber arm. Sonar and depth plating come with the deeper zones.

### The base

Pieces snap together at their connector collars on a grid. A piece works only when it is connected to power.

| Piece | Job |
| --- | --- |
| Dome habitat | Rest, save and refill oxygen |
| Corridor | Connects pieces and extends the base |
| Current turbine | Powers every connected piece |
| Storage pod | Holds samples and materials |
| Lab | Turns scans and samples into blueprints |
| Workshop | Builds gear and suit upgrades from blueprints |
| Moon pool dock | Parks, repairs and upgrades subs |
| Creature tank | Houses collected creatures |
| Filter pump | Keeps the water healthy in connected tanks |
| Kelp farm | Grows food for creatures |
| Hatchery | Hatches eggs and breeds creatures |
| Signal array | Maps zones and decodes alien signals |

**Base growth across biomes (Colin's direction after milestone 3).** The base must keep growing as the player reaches new zones. Each new biome should add base components, including bigger and more complex pieces that are more rewarding to build: they should cost the new zone's materials and give clearly better abilities, not just more of the same. Keep the system open so new pieces slot into the same collar-and-power rules. Plan this into each zone milestone (7, 8, 10 and 11) alongside its gear, and ask Colin before deciding details.

**Colin's additions after milestone 3 (built in the milestone 3 follow-up; see PROGRESS.md for the numbers chosen):**

- **Build drone companion.** Base pieces are not built instantly. A small robot helper, found early in the shallows (for example stranded in the survey sled wreck and repaired with a few materials), does the construction. Tapping Build places a frame, and the drone flies over and welds it together over time: roughly 10 s for a corridor up to about 40 s for a dome. The player can keep swimming meanwhile. Later upgrades make it faster or add a second drone, which is the "faster building" reward path.
- **Material weight.** Collected materials go in a dive bag, and each has a weight (for example copper and scrap heavy, kelp fibre light). As the bag gets heavier the diver swims slower, sinks when idle, climbs to the surface more slowly and uses air faster. That limits how much can be carried at once. It should be a soft, readable penalty shown on the dive watch, not a sudden drowning. In the shallows it stays gentle, in keeping with the "cozy and safe" pillar. Upgrades that raise the limit form their own path: a lift bag, a buoyancy vest, the drone carrying loads, and the sub's cargo bay (milestone 6).

**One home base, growing into a factory (Colin's direction after milestone 4; decisions below).**

- **One main base for the whole game.** It stays at the Kestrel site in the shallows. The player keeps travelling home to expand it and to add creatures. There are no full bases in other biomes (small outposts are still an open question).
- **The build area must be big: wider and deeper.** Colin: "If I learned anything from Satisfactory, it is that the factory needs to be big." The 11 × 3 grid becomes a much wider and taller site along the shallows seabed, with a zoomable, pannable build view that suits the PC's larger screen and still works on the phone.
- **Tunnelling, later.** Once the space under the water is full, a tunnelling capability lets the base expand down into the rock below the site.
- **Milestone 5 decisions (Colin, after milestone 4):**
  - **Size (revised by Colin after milestone 9): about 270–300 open cells, roughly 8–9 times the old site.** The trench felt too big and mostly empty, so the far west of the basin is now a rock wall with a sloped, stepped bed, the floor sits three rows higher, and three terraces step down from the shelf (see `src/world/terrain.ts`; `OPEN_CELLS` in `src/game/base.ts` counts it). The grid constants did not change, so saves keep their places; pieces in what is now rock are removed and refunded on load. Three structural pieces were added for building up and down it: the Riser shaft, Cross junction and Cliff bracket. The note below is the original, larger goal.
  - **Size: at least 20 times today's site.** Today's grid is 11 × 3 cells (33 cells), so aim for roughly 650 cells or more, for example about 45 wide and 15 tall. The seabed at the site is only about 6 m deep today, so the terrain has to change: a wide, deep basin at the Kestrel site that the diver can swim up and down. On the phone the diver swims around it at normal zoom; in build mode the camera zooms out far, scaled to fit what is built so far, with pan and pinch. A PC monitor is the best way to see the whole factory, but it must stay playable on the phone.
  - **Transport: different tools for different kinds of material.** Colin has no strong preference. Propose a small set, for example conveyors for solid items (scrap, copper, quartz), pipes for anything fluid (such as a feed slurry or filtered water), with the existing corridors still joining pieces for power and access.
  - **First machine: the auto feeder production line.** Kelp fibre from storage (including what puffcaps make) is processed into feed and delivered to joined creature tanks automatically. That closes the first loop: creatures make resources, and resources keep creatures fed.
  - **Creature output scales with both numbers and upgrades.** More happy creatures and more tanks give more output. On top of that, a rare item, found out in the world, slots into a tank or machine and multiplies its output (×2 for one, ×3 for two, for example), but it also raises how fast that piece uses its inputs (feed, materials), so the player must supply more to benefit. This is inspired by a mechanic in Satisfactory, but it needs an original name, look and story; it must not copy that game's item.
- **Naming tiers (Colin, after milestone 5 part 1):** transport tiers use Kestrel stencil codes, not "Mk": conveyors CB-1, CB-2, …; feed pipes FL-1, FL-2, …, in the same style as the piece stencils (CT-1, FP-1, AF-1). Use the same kind of code for later tiered pieces.
- **First refined material (Colin, after milestone 5 part 1):** hull plating for the submersible, made from scrap and copper.
- **Getting home gets faster.** Vehicles (the sub in milestone 6, later faster ones) shorten the trip, and a late-game alien teleport (Choir technology) lets the player jump home from any deep biome.
- **Creatures as resource nodes.** Grown, happy creatures put materials into storage (built in milestone 4, and Colin likes it). Later the rate should scale with how many creatures and tanks the base has, so a well-kept aquarium works like a mining node in a factory game such as Factorio or Satisfactory.
- **Real production chains with rates to balance** (Colin's choice over a few simple combiners). Machines turn raw materials (from the reef and from creature tanks) into refined ones needed for bigger upgrades, gear and sub parts. Materials flow between pieces at real rates (items per minute), so the player balances inputs and outputs, as in Factorio or Satisfactory. Introduce it gradually and keep it readable on a phone; a PC screen may be the best way to manage a large factory.
- **Auto feeder** (built early, in milestone 5 part 1, as the first production line). A base piece that feeds joined tanks from the kelp fibre in storage, including what puffcaps produce, so a puffcap tank can keep the others fed. It arrives around the second biome (kelp forest), when the player is often far from home. Like the filter pump for cleaning, it lets creatures eventually look after themselves.
- **A scrap-making creature in the kelp forest (Colin, after milestone 6).** Scrap is the first big bottleneck: no creature makes it, the shallows give at most about 0.8 a minute, and the sub, dock and modules take about 59 scrap once their hull plating is counted. Colin chose a **scavenger creature** as the long-term source, but not in the shallows: it arrives with the kelp forest (milestone 7). One idea: a small decorator crab that picks metal flakes off wreckage and drops scrap into its tank's output tray. It should be curious but wary, like the zone's other creatures. Design it with Colin, including its tank needs and partner pairings.
- **Power as a mechanic (Colin, milestone 7; built in milestone 12, see PROGRESS.md).** Power is now a real limit: every source makes watts and every piece draws them, so expanding the base needs new power sources unlocked deeper in the game (the reef current drives only three turbines; then the trench's vent generator; then the Choir lantern after contact). A network short of power runs its machines slower.
- **Scarcer reef materials** (done after milestone 4): fewer material spots and slower regrowth, so creatures and automation are the rewarding way to get more.

### Creature care

- Creatures are collected as eggs or juveniles and placed in tanks.
- Each creature has three needs: hunger, comfort and water quality. Comfort depends on tank size, the right plants and compatible tank-mates.
- Well-kept creatures grow, glow brighter, breed and pass traits such as colour and glow pattern to their young.
- Care pays off. Healthy creatures produce materials, and some grown creatures act as keys in the world. A grown glowfin, for example, lights passages that the dive light cannot.
- **Mixed tanks should become the best setup (Colin, after milestone 5 part 1).** Today one species per tank, each with its own plant, is ideal, because a tank holds one plant and most species prefer their own kind. Colin likes having to think before putting creatures together, and wants that kept. As more species arrive, though, the *ideal* tank should hold two or more species. Ways to get there, to plan with Colin when new species are added:
  - **Tank upgrades:** bigger tanks (for example 3 × 1 or 3 × 2 cells, holding more creatures), and planters that hold two or more plant kinds, so two species can both have their favourite plant and reach 100% comfort.
  - **Partner species:** pairings that help each other (for example one species cleans another, or one shelters another), giving a comfort or output bonus that a single-species tank can't get.
  - Keep the clashes (like puffcap threads stinging glowfins) so pairings still need thought.
  - **Decided (Colin): build both** tank upgrades and partner species, and keep clashes. Plan the details with Colin when the next species are designed.
- Neglected creatures can die. A creature becomes visibly sick first, which gives the player time to act; if its needs stay unmet it dies and leaves dormant remains that can be kept in storage. Revival is locked behind exploration: the blueprint for a Revival pool base piece is hidden in a side area of the wreck shelf, and each revival uses a rare glowing bloom gathered in the deeper zones.

### Gear progression

Each item is built in the Workshop from a blueprint found at a major site, and each one opens places the player has already seen but could not reach.

| Gear | What it opens |
| --- | --- |
| Dive light | Dark caves |
| Cutter torch | Sealed wrecks and thick kelp walls |
| Tow line | Crossing strong currents |
| Pressure suit, in tiers | Each deeper zone |
| Sonar pulse | Hidden passages; calms hostile creatures |
| Sub depth plating and grabber arm | Crush depths and heavy objects |
| Alien resonator | Doors in the ancient structures |

## World and story

The map is hand-designed in five zones stacked by depth, with procedural art and detail filling each one. The same seed is used every time, so the world never changes between plays.

| Zone | Mood | Gear needed to enter | Gear blueprint found there |
| --- | --- | --- | --- |
| Sunlit shallows | Cozy and safe; the home base | None | Dive light |
| Kelp forest and caves | Dim, enclosed, first small predators | Dive light | Cutter torch, tow line |
| Wreck shelf | Twilight, strong currents, sealed wrecks | Cutter torch, tow line | Pressure suit, sonar pulse |
| The trench | Dark and dangerous; large predators, crush depth | Pressure suit, sub depth plating | Alien resonator |
| The sanctum | Ancient luminous structures; awe, not combat | Alien resonator | None; the ending |

- **Each zone has one major site** that works like a Zelda dungeon: a wreck, cave system or ruin with a few navigation puzzles and the next blueprint at the end.
- **Hand-designed:** zone layout, major sites, story moments and gear gates.
- **Procedural:** rock and seabed shapes between landmarks, plants, coral, fish schools, particles, lighting and creature variations.

**Story.** The player leads the crew of Outpost Kestrel, a small survey station sent to study an unexplored reef. Strange light signals rise from the deep. They come from the Choir, a luminous intelligence that has lived below for a very long time. It is curious, not hostile; the dangers of the game come from the ocean itself.

The beings communicate in patterns of light. Raising glowing creatures is how the player learns that language, so creature care drives the plot. The Signal array decodes fragments as the player goes deeper, and the game ends with first contact in the sanctum.

Names are final: the game is Fathomlight, the crew's station is Outpost Kestrel and the beings are the Choir.

## Current progression and discovery

The [progression audit](docs/phase-12-progression-audit.md) maps the full route and lists equipment, gates and creature abilities. Explore for evidence, equipment and specimens, then use Kestrel's base to give those discoveries a purpose. Read the existing scanner log for connections between sites and capabilities. Keep hints close to the relevant object and let them build from visible marks to a practical clue as the player examines or revisits a site.

Phase 12 gives the Wreck Shelf strongbox paired claw scratches, a scan and a creature interaction. A grown tinker crab works the lock and returns to the jar. The mandatory trench cleft has grazing marks and a separate mature cinder-snail interaction. Its PS-2 drawings and signal spool are the deep progression payoff. Good habitat setup should let the player prepare for those trips. A solitary juvenile with its preferred plant now consumes food and fouls water more slowly. Players can replace lost founders without a Revival pool. Population growth beyond the founding pair still comes from breeding happy adults with a powered Hatchery.

The Wreck Shelf race teaches the grapple's anchor route and ends with the flow vane calming the upper crossing. KS-1 keeps that lasting route. Mag-boots give Kestrel a separate low-speed stance near the seabed. Hold Down to resist currents and edge sideways to line up an interaction. Releasing Down restores free swimming. Deep operation of KS-1 and stepping outside remain separate decisions, with the hatch warning before a voluntary over-depth exit.

## Original milestones

The original plan divided the game into thirteen playable slices. Later Codex phases continued from those milestones. Phase 12 gameplay is distinct from the earlier numbered polish milestone.

0. **Setup.** Repository, automatic deploy, an empty scene that opens on the iPhone, both graphics presets wired up.
1. **Water and diver.** The look-and-feel benchmark: one explorer swimming through a small lit scene with every visual effect on. Do not move on until Colin approves the look.
2. **Shallows.** The first zone, with oxygen, scanner, collectible materials and saving.
3. **Base building.** Snap-together placement with dome habitat, corridor, current turbine and storage pod.
4. **Creatures.** Collecting, creature tank, feeding, filter pump and the three needs.
5. **Big base and factory groundwork** (added after milestone 4 at Colin's request). A much wider and deeper build site with a pannable, zoomable build view; materials moving between joined pieces at real rates; the first machine that combines materials into a refined one; creature tanks as resource nodes whose output scales with happy creatures. Split into two sessions: **part 1** (done) the Kestrel basin, build camera, conveyors and feed pipes, the auto feeder, scaling creature output and the Echo whorl; **part 2** (done) the plate press making hull plating, tank output on conveyors, faster CB-2 conveyors and FL-2 feed pipes, and a base-wide rates overview. Details in PROGRESS.md.
6. **Submersible** (done). A drivable sub with module slots, plus the Moon pool dock. Colin's decisions: medium cost (about 20 hull plating for dock and sub together), cargo bay, floodlights and grabber arm as the first modules, heavy direct handling, and hull dents repaired at the dock with a 10-minute air reserve. Details in PROGRESS.md.
7. **First gear gate.** Lab, Workshop and dive light; kelp forest and caves zone with its major site; the auto feeder (already built in milestone 5); a scavenger creature that makes scrap (Colin, after milestone 6). Split into two sessions (Colin's choices are in PROGRESS.md): **part 1** (done) Lab, Workshop, the dive light from the sled recorder, the cave opened through to the open kelp forest, holdfast resin and lumen moss, the tinker crab (makes scrap) and lantern shrimp (cleaner), the sub's way over the cliff via a boom gate, the scrap test gift removed; **part 2** (done) the kelp caves major site (a pulsing current squeeze and a moss-lit black chamber; the tow line and DR-2 finds inside, the cutter torch at the end), the cutter torch built and used on a kelp wall, the Grand tank GT-1, Sorting pod SP-1 and Air relay AR-1, and the DR-2 drone welder.
7b. **Audio** (done; Colin, after milestone 7 part 1: brought forward from milestone 12, and built before milestone 7 part 2). All sound is **made by code** with the Web Audio API, like the art: no sound files. One audio module with music and effects volumes in settings, unlocked by the first tap on iPhone. Little cues (scanning, the Collect work sounds, drone welding, the plate press, bubbles and breathing, surface splashes, sub thrusters and dents, the low-air warning, panel clicks), an ambient bed per zone that darkens with depth, and a generative soundtrack that shifts with the zone and ducks when panels are open. Milestone 12 keeps the final mix and polish. Colin's style choices: warm synth-ambient, sparse music that comes and goes, grounded physical effects, subtle breathing that grows as air runs low. Details in PROGRESS.md.
8. **Danger.** Predators, currents, cutter torch and tow line; the wreck shelf zone. Split into two sessions (Colin's choices in PROGRESS.md): **part 1** (done) the wreck shelf east of the kelp caves' plateau, suit integrity (a second ring on the dive watch), the race current crossed by clipping the tow line to anchor rings, wreck lurkers (unsettling ambush predators that can be avoided), brass fittings, and two small sealed wrecks the cutter torch opens; **part 2** (done) the Corvina, the sealed survey ship that is the shelf's major site: grapple to her stern bollard over the upwelling, cut her deck hatch, grapple across her hold's downdraft, throw two breakers to restore her power, and find the sonar pulse and pressure suit designs and her log (the first story fragment: the light signals) in her lab. Plus the sonar pulse (reveals a hidden passage, sends lurkers home), and two brass base pieces: the recompression room and the salvage crane (the sub lifts heavy salvage for it). Also after part 1 (Colin): the tow line became a **grapple line**, and a **flow vane** gates the sub at the race.
9. **Breeding** (done). Hatchery, kelp farm, inherited traits and creatures that act as keys. Colin's choices: pairs breed in their tank and lay into a Hatchery; colour and glow pattern are inherited, with a rare radiant glow that makes more and lights further; the Kelp farm grows fibre or plant cuttings; a grown glowfin swims with you as a light through lightless water in the kelp caves, and a grown tinker crab picks the wreck shelf strongbox that holds the Revival pool blueprint; a small Revival pool (one glowing bloom wakes one dormant creature). Also (Colin, before breeding): the indoor tanks show the same creatures and plants as outside, and tending happens indoors. Details in PROGRESS.md.
10. **The deep** (done). Pressure suit tiers, sonar pulse, sub depth plating, the trench zone and the Signal array story fragments. Colin's choices: a drowned deep station (the Fulmar) explored on foot as the major site; crush depth 30 m (Kestrel suit), 60 m (PS-1), 110 m (PS-2), sub 45 m or 120 m with depth plating; an angler, a stalker and a giant deep-sea spider as predators; a new trench creature (the cinder snail) as the key. Signal fragments are decoded once the tanks show enough different glow patterns. Details in PROGRESS.md.
11. **Contact** (done). Alien resonator, the sanctum and the ending. Colin's choices: the resonator is built in the Workshop only once all four fragments are decoded, and is worn on the pack and arm; the sanctum lies under the trench floor, swum down through song-locks, with a dry heart explored on foot (grapple swings, a lift on a column of light); the ending is a call and response with the Choir in its heart (no way to fail), credits, then the game goes on with a Choir gate home and a Choir lantern power source; the Signal array's "maps zones" job is a zone map at its console. Details in PROGRESS.md.
12. **Polish** (part 1 done). The final sound and music mix (audio itself arrives in 7b), menus, save transfer between devices, performance tuning for both presets, and the Steam desktop build (see Platform and tech). Colin's choices: power became a real limit here (three tiers: current turbine 12 W, capped at three; a vent generator 40 W from the trench; the Choir lantern 100 W; a shortage slows machines, never air or doors), the gamepad drives every panel and menu, and **the Steam desktop build waits** until more polish is done. Details in PROGRESS.md.

## Archived kickoff prompts

Paste the first prompt into a new Claude Code session connected to the game's repository, with this plan and the art screenshots attached.

```
You are building a single-player 2D underwater adventure game as a web app.
I have never made a game before, so explain choices in plain language.

Attached are DESIGN.md (the full design brief) and concept art screenshots.

In this session, do milestone 0 only:
1. Save the brief as DESIGN.md and the screenshots under docs/art/.
2. Check current documentation and choose the rendering library and build
   tools that best meet the Platform and tech section. Record the choice
   and the reason in PROGRESS.md.
3. Set up the project and automatic deployment to GitHub Pages.
4. Ship an empty underwater scene that opens on an iPhone in landscape,
   with the High and Ultra graphics presets wired up.
5. Create PROGRESS.md listing what is done, what is next, and any problems.
6. Give me the play link and tell me exactly what to test on my phone.

Rules for every session:
- Follow DESIGN.md. If something in it is unclear or seems wrong, ask me
  before building.
- Draw all art with code. Follow the originality rules in Art direction.
- Build only the milestone asked for. Do not start the next one.
- Test that the build runs before you finish, and update PROGRESS.md.
```

For every later session, start a new session and paste this:

```
Read DESIGN.md and PROGRESS.md. My feedback on the last build: [YOUR FEEDBACK].
Fix anything I flagged, then build the next milestone only. Deploy it,
update PROGRESS.md, and tell me what to test on my phone.
```
