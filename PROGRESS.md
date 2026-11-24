# Fathomlight progress

The live branch includes the Fulmar foothold, Codex Phases 1–11D the Phase 12 gameplay pass (PR #33/#34) and the Phase 13 control helper, drill lodes and named creatures (PR #35, `d9f4728`); see the [Phase 13 audit](docs/phase-13-gameplay-audit.md). **Phase 14** reward moments merged as PR #36 (`03b4c8f`). **Phase 15** (jar release, the Field kit, the sonar control bar) merged as PR #38 (`faa9e26`). **Phase 16** rounds 1 and 2 (the satchel jar fix, the audio audit, the first Kenney sound files) merged as PRs #40 and #41. **Round 3** (30 more CC0 sound files, creature calls, KS-1 heard from outside) merged as PR #42. Colin then had the control bar's offer ping turned off (PR #43). **Phase 17** (the Field kit portrait is the real Kestrel, and walking mag-boots) merged as PR #45. **Phase 18** (Linnea, the axolotl guide) is built on a branch with a pull request, not merged yet; see the [Phase 18 notes](docs/phase-18-linnea.md). **Phase 19** (combat inside wrecks) merged its first infested section as PR #47: the Corvina's engine room, the Rivet driver RD-1 and three machines, plus the Corvina's scan point moved to her stern; see the [Phase 19 notes](docs/phase-19-wreck-combat.md). More sections wait for his playtesting. **Phases 20 and 21** (Session A: the collection book, hatching, naming, cards, care that pays, the planner, Linnea's requests, restocking, room for more creatures and living tanks) are merged. **Phases 22 and 23** (Session B: size, shape and heirloom traits with tiered rarity, the kiln eel and the chime seahorse, Choir-touched creatures, and a richer ending with an optional companion) are merged (PR #51). **The Creature room** (Colin's follow-up: one console for every tank, young that settle themselves, slower breeding, smaller creatures in much bigger tanks, shading for depth) is merged (PR #52). **Kestrel's size in the open water** (the swimmer matches the mag-boots walker, both 20% smaller) is on a branch with a pull request. **Next:** Phase 24 (premium polish) in the roadmap, after a short design check with Colin. Since Nov 22, 2026 art may also use generated images (logged in `docs/art/SOURCES.md`); see the [Phase 16 audit](docs/phase-16-audio-audit.md) and the [Phase 14 notes](docs/phase-14-reward-moments.md). The agreed plan for Phase 15 onward, including ideas not built yet, is in the [roadmap](docs/ROADMAP.md). See the [development handoff](docs/AI_DEVELOPMENT_HANDOFF.md) for the current source map and the [progression audit](docs/phase-12-progression-audit.md) for the route from a new save to first contact.

Play link: https://colinhill88-hub.github.io/fathomlight/ (live; first successful deploy 2026-11-14)

### Pass 2 Painterly Art & Seamless Alignment Polish (Colin, Nov 24, 2026)

Brought Kestrel's entire upgrade kit, the remaining base exterior modules, all 9 reef material pickups, all 5 seabed ambient animals, and the parallax ocean backdrop up to the same hand-painted watercolor-and-gouache look, with strict art-to-collision and light alignment:
- **Complete Articulated Kestrel Rig & Upgrade Kit (`src/art/kestrel/` → `src/actors/diver.ts`, `src/actors/walker.ts`, `src/actors/kestrelArt.ts`):** split Kestrel's body into articulated `chest` + `pelvis` (live waist flex), `forearm_sleeve` + `hand` (wrist articulation), `boot` + `fin_blade` (live toe-off bend & water-lag flipper whip), and `joint_shoulder` + `joint_knee` guards; added flexing air hose, physics-driven trailing belt lanyard, and eye-tracking catchlight; installed and wired `jar`, `pack_single`, `pack_quad`, `thruster`, `thruster_mk2`, `harpoon`, `rivet`, `dart`, `flare`, `resonator`, `magboots`, `satchel`, `lamp`, `hose`, and `fin_walk`, plus aligned Kestrel's blink eyelid directly onto `head.jpg`'s painted eye.
- **Remaining Base Exterior Modules & Lighting Alignment (`src/art/base/` → `src/world/basegfx.ts`, `src/interior/baselevel.ts`):** installed and wired `storage`, `junction`, `thermal`, `hatch`, `farm`, `revive`, and `signal`; replaced the dome's oval window glow with a flat-bottomed half-dome arch; split the turbine power spine clear of the blades; aligned all module lamps/porthole glows; and replaced interior storage shelf rectangles with 15 dynamic painted crates.
- **Corvina & Fulmar 1:1 Collision Alignment (`src/world/terrain.ts`, `src/world/corvinaArt.ts`, `src/world/fulmarArt.ts`):** reshaped `corvinaHull()`, `corvinaHouse()`, and `cvDeckY()` to match `corvina.jpg` 1:1 (eliminating invisible sub collision over the stern/bow) and tightened `fulmar.jpg` registration.
- **Reef Pickups & Seabed Life (`src/art/pickups/`, `src/art/bottom/` → `src/world/pickups.ts`, `src/actors/bottomLife.ts`):** installed and wired all 9 material pickups (`scrap`, `copper`, `quartz`, `fibre`, `resin`, `moss`, `brass`, `bloom`, `ore`) plus painted world kit finds and all 5 swaying seabed animals (`lily`, `sponge`, `worm`, `star`, `pen`).
- **Complete Indoor Base Props & Architecture (`src/art/interior/` → `src/interior/baselevel.ts`, `src/interior/interior.ts`, `src/interior/housingOcean.ts`):** installed and wired all 14 remaining room stations (`airlock`, `bunk`, `planner`, `galley`, `lab_bench`, `workshop_bench`, `hatch_cradle`, `hatch_console`, `revive_pool`, `signal_dish`, `recomp_chamber`, `farm_trough`, `filter_vat`, `crane_cradle`), swapped docked `KS-1` in the Moon Pool to `sub.webp`, added tiled painted `wall_bulkhead`, `deck_grate`, and `ladder_rung` architecture textures, removed flat procedural wall clutter & low-poly window mountain triangles, moved interior overlays behind Kestrel, and added automatic enclosed white-pocket cutout removal (`src/art/creatureArt.ts`).
- **Supply Buoy `EX-1` Mooring Anchor & Shackle (`src/art/vehicles/buoy_anchor.webp` → `src/world/supplyBuoy.ts`):** replaced the flat seabed block with painted barnacle-crusted mooring anchor art, moved `EX-1` clear of nearby scrap (`src/game/exchange.ts`), and added interlocking brass shackles clasping both the buoy's bottom ring and the anchor's top ring.
- **Recompression Chamber (`RC-1`) Acclimation Buff & Always-Visible Inventory (`src/game/state.ts`, `src/interior/baselevel.ts`, `src/main.ts`, `src/style.css`):** cycling `RC-1` grants a 12-minute Acclimated dive buff (`+25%` O₂, `+15%` swim speed, `+10 m` depth margin) plus a 2-hit Pressurized Suit Seal; the upper-left HUD now always displays both carried and base-stored counts.
- **Ocean Parallax Backdrop Polish (`src/scene/zonebackdrop.ts`, `src/scene/backdrop.ts`, `src/main.ts`, `src/interior/housingSea.ts`):** disabled crude 9-sided procedural basin boulder blobs when `basin.webp` is loaded, widened the painted `basin` vista across the starting ledge, and smoothly faded the blocky sine-wave background ridges wherever any painted watercolor world landscape covers the view (both outside and through base observation windows).

### Gameplay Loop Polish: Tank Harmony, Field Contracts & Repeatable Wreck Salvage Runs (Colin, Nov 23, 2026)

Connected the creature-care, exploration, Supply Buoy, and wreck-combat loops together with three save-safe systems:
- **Tank Harmony / Showcase Rating (`★–★★★★★`, `src/game/creatures.ts`, `src/ui/care.ts`, `src/ui/hatch.ts`):** tanks earn stars for matching biome flora, placing 2+ painted decorations, keeping water/residents thriving, and housing rare/radiant/diverse specimens. Each star above 1★ grants **+10% rare-trait breeding odds** (up to `+40%`) and **+8% faster material yield** (up to `+32%`), displayed with golden stars and next-star tips in both the Habitat Console and Creature Room.
- **Supply Buoy `EX-1` Rotating Field Contracts (`src/game/contracts.ts`, `src/ui/exchange.ts`, `src/main.ts`):** 3 active, no-time-limit dive & base contracts tailored to progression (clearing Corvina wreck machines, Engine Room salvage runs, biome material samples, Showcase Tank Harmony, hatching, and sanctuary dispatches), paying Survey Credits (`SC`) and bonus Mystery Rare Eggs, with a ready-to-claim badge on `EX-1`.
- **Repeatable Wreck Salvage Runs & Bounties (`src/interior/engineRoom.ts`, `src/interior/interior.ts`, `src/main.ts`):** added 3 guarded Salvage Crates inside the Corvina Engine Room that respawn on every fresh visit (`+35 SC` + Brass Fittings / Hull Plating each), plus `+8 SC` / `+15 SC` salvage bounties for defeating Rust Ticks and Weld Drones — giving the Rivet Driver `RD-1` and wreck combat a lasting role tied into the Supply Buoy and breeding loop.

### Painted vehicles, base exterior modules, all 16 tank decor & wreck machines (Colin, Nov 23, 2026)

Extended the painterly cutout pipeline with `src/art/propArt.ts` (`loadPropArt`, reusing the 4-corner pure-white flood-fill cutout from `src/art/creatureArt.ts` with `?art=procedural` fallback) and installed **28 new painted `.webp` plates** (all logged in `docs/art/SOURCES.md`):
- **Vehicles (`src/art/vehicles/`):** `KS-1` Submersible (`src/actors/sub.ts`), `KD-1` Build Drone (`src/actors/drone.ts`), and `EX-1` Supply Buoy (`src/world/supplyBuoy.ts`), preserving all live lights, welding sparks, cargo cradles, damage cracks, mooring chain, and pulsing beacon.
- **Hero Base Exterior Modules (`src/art/base/`):** Dome Habitat, Moon Pool Dock, Lab, Workshop, Creature Room (`tank`/`gtank`), and Current Turbine (`src/world/basegfx.ts`), preserving live glowing windows, Lab scan bar, Workshop sparks, spinning Turbine blades, and live swimming creatures inside the Creature Room window.
- **All 16 Tank Decorations (`src/art/decor/`):** all 8 Field-Kit/Linnea pieces (`arch`, `amphora`, `helmet`, `chest`, `driftwood`, `clam`, `lantern`, `wheel`) and all 8 Supply Buoy exclusives (`cairn`, `floats`, `anchor`, `bell`, `coralarch`, `astrolabe`, `belljar`, `kelplantern`) wired into `src/world/tankDecor.ts` with warm glow auras preserved on luminous pieces.
- **Wreck Combat Machines (`src/art/foes/`):** Rust Tick, Weld Drone, and Hull Keeper boss wired into `src/interior/combatLayer.ts` & `src/interior/foeArt.ts` (`drawFoeFx`), keeping every attack telegraph (flaring red eyes, drone laser sight & torch charge, flipped tick, hurt flash, and the Keeper's blazing vulnerable reactor core).
- **Kestrel Hero Art, Wrecks, Corridors & Interior Stations:** generated and wired painted hero art for Kestrel's helmet/face & diving suit torso (`src/art/kestrel/{head,torso}.jpg` → `src/actors/kestrelArt.ts`, shared by swimmer, walker, and Field Kit portrait), both major exterior wrecks (`src/art/wrecks/{fulmar,corvina}.jpg` → `src/world/fulmarArt.ts`, `src/world/corvinaArt.ts`), base corridors & 3-cell riser shafts (`src/art/base/corridor.jpg` → `src/world/basegfx.ts`), the Choir portal (`src/art/base/portal.webp` → `src/world/sanctumgfx.ts`), schooling Silverbars (`src/art/creatures/silverbar.webp` → `src/actors/silverbar.ts`), and painted interior Habitat management console, Collection tray stand, salvage storage crates, and engraved brass-plaque typography (`src/art/interior/{console_habitat,tray_collection,crate}.jpg` → `src/interior/baselevel.ts`).

### Painted creature textures — all 8 keepable species (Colin, Nov 23, 2026)

Wired `src/art/creatureArt.ts` (`loadCreatureArt` with automatic 4-corner white background cutout, soft anti-aliased edge feathering, and tight bounding-box crop) and installed all 8 painted `.webp` creature body textures (`src/art/creatures/{glowfin,puffcap,ray,crab,shrimp,snail,eel,horse}.webp`, ~131 KB total, logged in `docs/art/SOURCES.md`):
- **Glowfin (`src/actors/glowfinRig.ts`):** painted 3D body sprite tinted by colour variant, with the existing animated tail paddle, pectoral flippers, lure stalk, sail fin, and veil tail moving around it.
- **Puffcap (`src/actors/shoreCreatureRigs.ts`):** painted 3D translucent dome bell on `this.bell`, with the 5 jointed flowing tentacles, lace rim, and crown animating beneath it.
- **Dapple ray (`src/actors/dappleRayRig.ts`):** painted 3D gliding body with subtle vertical breathing undulation and banking tilt, with the 5-joint whip tail and rare tail plume trailing behind it.
- **Tinker crab, Lantern shrimp, Cinder snail (`src/actors/shoreCreatureRigs.ts`):** painted 3D carapace shell, curved translucent shrimp torso, and coiled ribbed snail shell mounted onto their existing animated walking legs, snapping claw, waving antennae/tail fan, and undulating foot/eye-stalks.
- **Kiln eel & Chime seahorse (`src/actors/deepCreatureRigs.ts`):** painted 3D eel head tracking the live swaying S-wave spine, and painted 3D upright seahorse head & ridged torso paired with the fluttering back fin, 8-joint curling tail, and glowing crown filaments.
- **Linnea & all 4 predators (`src/actors/linneaRig.ts`, `src/actors/predatorArt.ts`):** installed and wired painted 3D textures for Linnea's head (`linnea.webp`, keeping her animated feathery gills, blinks, and swaying body), Wreck Lurker (`lurker.webp`), Lanternjaw Trench Angler (`angler.webp`), Trench Stalker (`stalker.webp`), and Deep-Sea Spider (`spider.webp`).
- **Baked shading:** `Critter` skips `drawShade()` for textured species so their painted volume shines cleanly, while keeping tank shadows, depth fog, glowing patterns, heirlooms, Choir-touched forms, and `?art=procedural` fallback. Loaded in both `src/main.ts` and `src/dev/zoo.ts` (`zoo.html`).

### Kestrel Supply Buoy — Research Exchange & Survey Credits (Colin, Nov 23, 2026)

Added an end-to-end creature offloading and reward loop inspired by Dave the Diver's catch-and-sell rhythm, tailored to Fathomlight's cozy research world:
- **Floating Supply Buoy EX-1 (`src/world/supplyBuoy.ts`):** tethered just east of the base (`x = 2060`, clear of the build grid, Linnea, and the Choir portal), bobbing with a glowing Kestrel-lime beacon. Swim or drive KS-1 up to it and press Collect (`C`) to open the **Research Exchange**.
- **Dispatching surplus creatures (`src/game/exchange.ts`, `src/ui/exchange.ts`):** send creatures from your **Reserve** or **any tank** to partner marine sanctuaries for **Survey Credits (`SC`)**, scaled by rarity and stage (common adult `15 SC`, uncommon `35 SC`, rare `75 SC`, radiant `120–165 SC`, heirloom `220 SC`, Choir-touched `350 SC`; young pay half). Includes a one-tap **"Send duplicate commons"** button that protects breeding pairs (keeps ≥2 per species and ≥1 of every look) and never touches rare, radiant, heirloom, Choir-touched, or Linnea's requested creatures. Rare/special creatures ask for a second tap before sending.
- **Exchange Store:**
  - **8 exclusive tank decorations** (`src/world/tankDecor.ts`, `src/game/collection.ts`): *Pebble cairn*, *Glass float cluster*, *Sunken anchor*, *Ship's bell*, *Coral archway*, *Brass astrolabe*, *Lumen bell jar* (glows), and *Kelp lantern* (glows).
  - **Rich Kelp Tonic (`45 SC`):** apply to any tank for 15 minutes of 1.6× faster breeding and boosted rare-trait odds (`tankData.tonicUntil` in `src/game/creatures.ts`).
  - **Base supplies & Echo whorls:** Brass fittings ×4, Hull plating ×4, Glowing bloom ×1, Echo whorl ×1.
  - **Mystery Rare Eggs (`110 SC`):** rare-odds egg for any discovered species, delivered to the Creature room.
- **Save-safe:** optional fields `credits` on `SaveData` and `tonicUntil` on `TankData` only.

### Tank backdrops & UI/UX polish pass (Colin, Nov 23, 2026; local working tree)

Upgraded both the creature tanks and every menu/HUD surface to a cohesive Outpost Kestrel look:
- **Painted tank backdrop pipeline (`src/art/tankArt.ts`, `src/world/habitatWater.ts`, `src/world/tanklife.ts`, `src/interior/baselevel.ts`, `src/main.ts`):**
  - Every creature tank — both in the exterior base cutaway and inside the walkable base — now switches its backdrop automatically to match its planted flora (`bare`, `coral`, `kelp`, `grass`, `bladder`, `lumen`).
  - `loadTankArt()` loads generated painted backdrops from `src/art/tanks/<kind>.webp` (or `.png`), fits them cleanly inside the tank window with aspect-ratio cover masking, and respects `?art=procedural` and `?worldArt=procedural`.
  - When no generated image is present (or with `?art=procedural`), `HabitatWater` now renders a multi-layered biome-themed painterly procedural backdrop: themed water gradients, sunlit shafts, far reef ridge silhouettes, sculpted sunlit rock terraces, recessed distant flora silhouettes (branch coral clusters, swaying ribbon kelp, seagrass tufts, bladder stalks, or glowing warm yellow-green lumen moss), depth haze, and themed pebble sand beds.
  - All 6 painted `.webp` backdrops (`bare`, `coral`, `kelp`, `grass`, `bladder`, `lumen`) are now installed in `src/art/tanks/` and logged in `docs/art/SOURCES.md`. When `?art=procedural` is active, `HabitatWater` falls back to its multi-layered biome-themed procedural backdrops.
- **UI/UX redesign across every menu & the bottom control bar (`src/ui/care.ts`, `src/style.css`):**
  - **Habitat Console structural redesign (`src/ui/care.ts`):** replaced text-only creature pills with a 3-column **creature portrait grid** (real creature portraits via `snapImg`, glowing lime/gold/coral contentment dots, and rarity rims), added a framed **Selected Creature Hero Card** with portrait bay and rarity tags, colour-coded botanical dots on plant chips, a powered telemetry pill, and recessed dark-glass instrument modules.
  - **Bottom control bar redesign (`#ctl-helper.skin-sonar`):** upgraded to a brass-capped underwater sonar console with brushed brass top trim, glowing brass end-cap rivets, bevelled 3D lime/gold gauge-face keycaps, and highlighted contextual world-action pills.
  - **Every console, HUD bar & modal:** wider desktop consoles (`432px`), bold 3px brass terminal crowns, thicker 10px glowing telemetry gauges, brushed-gold primary buttons, brass-framed top-left resource pills and toasts, custom thin sea-glass & brass scrollbars, smooth entrance motion, and hover-only desktop lift. Preserved 44 px touch targets, iPhone landscape layouts, gamepad `.pad-focus` rings, high-contrast disabled buttons, `prefers-reduced-motion`, and the Choir colour rule.
- **Meaningful-only birth & growth notifications (`src/main.ts`, Colin, Nov 23, 2026):**
  - Kept the current breeding pace, but silenced routine repeat popups so busy bases stay calm while special moments still feel big:
  - **Eggs laid:** only the very first egg laid ever shows the "New egg" celebration and tip; later eggs lay quietly in the Creature room.
  - **Hatching:** full reward cards and bottom naming reveals play for new book entries (first colour/pattern/radiant/rare form), rare/radiant/heirloom/Choir-touched babies, creatures matching one of Linnea's active requests, and your first hatch ever. Ordinary repeat hatchlings settle into their tank or reserve quietly (a toast still shows if a hatchling has no home and is waiting in a cradle).
  - **Fully grown:** celebrates the first adult of each species, species ability unlocks, radiant/heirloom/Choir-touched adults, and creatures matching Linnea's requests; ordinary repeat adults grow up quietly.
- **Not checked in this session:** Node.js and Git CLI are not installed on this Windows machine's PATH, so `npm run typecheck`, `npm run build`, `node scripts/test-progression.mjs`, and `vite preview` browser checks still need to be run once Node 22 is available (or in CI).

### Kestrel's size in the open water (Colin, Nov 23, 2026; pull request, not merged)

Colin noticed the swimming Kestrel was drawn much bigger than the mag-boots walker (the swimmer's helmet was about twice the walker's on screen). He prefers the smaller walker ("it makes the ocean seem bigger") and asked for both to match, then 20% smaller again.
- **One size setting:** `Diver.KESTREL_SIZE` (0.8) in `src/actors/diver.ts` sizes both. The walker on the seabed is drawn at 0.72 (was 0.9). The swimmer's body scale is 0.86 × `SWIM_MATCH` (0.5, which brings its helmet to the walker's size) × 0.8, about 0.34 (was 0.86).
- **The swimmer's collision circle** follows the drawing: 10 (was 26), so he stops against rock where his body does. Gates and sealed passages are solid blocks, so nothing opens early (the Node route checks pass).
- **The mag-boots** follow the walker: soles 32 below the body's middle (was 40), helmet top 43 (54), half-width 10 (13). The silt puffs on landing and hopping use the soles' height.
- **At the surface** he floats 12 below the waterline (was 30), so the helmet still breaks the surface; the bob, the breach pop and the moonpool's surfacing spot scale with him. Surfacing and the "arm a fresh ascent" depths are unchanged, so old saves at the surface and the start buoy still begin treading water.
- **Not changed:** inside bases and wrecks (the interior walker and its rooms, ladders and fights), the sub, and every reach and pickup distance.
- **Checked:** typecheck, build, and all three Node check scripts. In `vite preview`: the swimmer's and walker's helmets measure the same on screen (35 px each at the default zoom; before 89 and 44), walking right on the shallows seabed with the boots planted, the start at the buoy with the helmet above water. No console errors.

### The Creature room and smaller creatures (Colin, Nov 23, 2026; merged, PR #52)

After playing Session B Colin found the Hatchery a bottleneck with about six breeding pairs, managing creatures room to room disconnected, and the creatures too big and flat. His decisions are in the roadmap; built:
- **The Creature room** replaces the Hatchery (same piece, same saves; every "Hatchery" the player sees now says Creature room). Its console's new **Tanks** tab (first) shows every tank: count and room, water, plant, who is hungry or needs care, which pairs are laying (and when crowding slows them), each creature as a small portrait with its contentment. Tap one to move it to another tank or the reserve, or open its card; **Feed** and **Clean** per tank; **Care for all**. It works only at the room's console.
- **Young swim home by themselves:** a hatchling goes to its parents' tank (eggs now remember it, the optional `from`), else a tank with its plant and its own kind, never in with a creature it clashes with or a puffcap's too-full tank; else the reserve; else it waits in a cradle as before. The hatching card says "Hatched and swam to TANK 2". A switch on the console (`autoSettle`, optional, on by default) turns it off.
- **Pace:** a pair lays every 10 minutes (was 6); a tank over half full lays more slowly, down to a quarter of the speed when full; young take 12 minutes to grow (was 8).
- **Smaller creatures, bigger tanks:** in tanks creatures are drawn at 0.5 (was 0.85). Tanks hold 12 / 24 (extended 18 / 36, the display aquarium 60). Each creature dirties the water a third as much and gets hungry about 30% more slowly; the shoal bonus is capped at seven tank-mates.
- **Depth, in code:** a soft shadow on each creature's underside and light on its back, a shadow on the sand under each creature, and depth in the tanks (each creature swims at its own depth: further back smaller, bluer and dimmer, drawn behind). Creatures now start spread through the tank instead of all in the middle.
- **For Codex:** section 7 of `docs/art/prompts/phases-22-23-creatures.md` asks for painted part textures with baked shading and optional normal maps, and says how to wire them into the rigs.
- **Checked:** the Node checks (new: crowding, a hatchling's choice of home, the reserve and waiting fallbacks, the switch, a happy pair laying in about 10 minutes and a full tank far more slowly; older checks updated to the new capacities and times). In `vite preview`: the Tanks tab with the mouse and at iPhone 13 landscape by touch (moving a creature, feeding a tank), a tank of eight smaller glowfins at different depths, the zoo with the shading. No console errors. Not checked in the browser: a hatchling swimming home in the live game (the test base had no power; the Node checks cover it), and smoothness of a 60-creature display aquarium on the iPhone.

### Phases 22 and 23 (Session B): rare creatures and the Choir (merged, PR #51)

Built from Colin's answers in the roadmap ("Colin's decisions (Nov 22, 2026)"). Colin approved the two new species' names and looks from zoo screenshots during the session. Every new save field is optional; old saves and old creatures load unchanged (checked in Node).

**Phase 22: more ways to be rare**
- **New inherited traits** (on a creature's `traits`, all optional): `size` (`tiny` or `giant`, drawn about 0.7× or 1.4×), `shape` (0 the usual, 1 uncommon, 2 rare and bred only; two new shapes per species, drawn as jointed parts that move with the body), `heirloom` (a pearl-gold filigree and sheen) and `choir` (Phase 23).
  - Shapes: glowfin sail fin / veil tail; puffcap lace rim / crowned bell; dapple ray pointed wings / fringed wings; tinker crab spiked shell / fan crest; lantern shrimp long whips / plume tail; cinder snail tall spire / fluted shell; kiln eel sail crest / lantern tail; chime seahorse long snout / veil crown.
- **Tiered rarity** (from two ordinary parents, at ordinary care): a size variant 1 in 8 (tiny 1 in 16, giant 1 in 16), the uncommon shape 1 in 8, the rare shape 1 in 25, an heirloom 1 in 100 (only from the 4th generation on), Choir-touched 1 in 150 (only after first contact). **Great care doubles every one** (the Phase 21 care bonus, ×1 to ×2). They run in families: a young takes a parent's size or shape often (two giants: about 72% giant), one heirloom parent passes the line on half the time, two about 85%; a Choir-touched parent about 1 in 12 (two, 1 in 6).
- **Wild creatures** can be tiny, giant or the uncommon shape (about 1 in 8 each); the rare shape, heirlooms and the Choir's light are never wild. Old creatures (including ones from before traits were saved) keep exactly their looks.
- **The book:** each page has a **Rare forms** row (tiny, giant, both shapes, heirloom line, Choir-touched; the last stays ??? until first contact). Tapping one says how rare it is and how to get it. Every size and shape of a species gives a decoration. New field `bookForms`.
- **The hatching moment:** a first tiny, giant or uncommon shape is a notable card; a first rare shape, heirloom or Choir-touched baby is major (Choir-touched in the Choir's colours). Tags on cards and the reveal: uncommon, rare, heirloom line, Choir-touched.
- **The planner** shows the odds of tiny, giant, each shape, heirloom (or when the line can start) and, after contact, Choir-touched, with and without the care bonus. The Habitat console's Rare filter and rarest-first sort use the new tiers.
- **Restocking** carries a released creature's size and uncommon shape into the wild.
- **Two new species** (Colin approved names and looks):
  - **Kiln eel:** a slender sooty eel with a ribbon fin, big gentle eyes and ember lights; its body is re-drawn along a swaying spine, so it swims in a real S-wave. Lives at the trench floor's quiet east end, past the Fulmar's stern by the round stone door (the striders keep to the west). Likes lumen moss and any company; puffcaps sting it. Makes brass fittings. Colours Soot, Rust, Ash grey, Molten gold (rare); patterns ember line, cinder spots, kiln bands (bred only).
  - **Chime seahorse:** an ivory seahorse with a crown of glowing-tipped filaments, a fluttering back fin and a curling tail, in the sanctum's antechamber. It hums a tiny falling three-note chime. Likes seagrass and its own kind; tinker crabs snip it. Grows glowing blooms (the Revival pool flower). Colours Ivory, Pearl rose, Driftwood, Sunstone (rare); patterns crown light, pearl beads, lyre lines (bred only).
  - Both have scanner entries, wild founders (two young and an adult each), calls, tank behaviour, belt-jar looks, book pages and planner odds.
- **The creature zoo** (`zoo.html`, also on the play link): every species in every form, swimming. `?kinds` shows colours and patterns, `?young` the young.

**Phase 23: creatures and the Choir**
- **Choir-touched creatures:** after first contact, very rarely an egg carries the Choir's light: shimmering cyan, violet and magenta bands over its body, a paler lilac body and a halo that turns slowly through the three colours. The one exception to the colour rule, only for them. The gifts reading after contact mentions it.
- **The ending, richer but the same story** (`src/game/choirSong.ts`, played by `src/ui/contact.ts`):
  - the Choir now sings back **every pattern your book holds** (not only grown creatures in the tanks), each in its creature's glow colour, with the name shown under the caption;
  - how varied and rare the collection is gives four tiers: as before; it takes on your colours (lights circling it) with harmony; an outer ring of your colours, a held chord, sparkles for rare kinds; trails, a richer chord and a shimmer for heirloom and Choir-touched lines;
  - an **outstanding** collection (6+ species, 30+ kinds, and an heirloom or Choir-touched one, or 10+ rare kinds) gets a special last line and a chord of every note.
- **The optional companion:** a raised creature carried in the jar or satchel is lifted out in a bubble of the Choir's light after your last phrase. The Choir sings it its own pattern three times and it answers, glow for glow, in its own voice (special lines for heirloom and Choir-touched companions), then it is set back in the jar. A wild catch is not a companion. Without one the ending plays as before.
- **Sing again:** after first contact the heart's plinth says "Sing with the Choir again": the call and answer replays with your collection as it is now (no gifts, no credits), so Choir-touched creatures and a companion can be heard there later.

**Controls:** no new bindings. The answer pads still use 1–4, A/B/X/Y and taps.

**Checked:**
- `npm ci`, typecheck, build and `node scripts/test-progression.mjs`. New checks in `scripts/test-rarity.mjs`: every species complete; the tiers sampled over 100,000–300,000 eggs (size 1 in 8, shapes 1 in 8 and 1 in 25, heirloom 1 in 100 from the 4th generation, Choir 1 in 150 only after contact); care doubling each; family inheritance; the planner matching breeding; wild forms; old and malformed creatures loading; book forms, hatch tiers and the forms reward; restocking; the song's tiers, the outstanding line and the companion rule.
- In `vite preview` (fixture saves built by the session's Playwright scripts: a seeded base via `__fathom.seedBase`, PS-2 and the resonator, Kestrel placed on the trench floor, in the antechamber or in the heart, creatures of many kinds and forms; the book was emptied so it refills from the creatures). No console errors in any of these:
  - **keyboard:** E scanned a kiln eel and C coaxed a young one into the jar on the trench floor; I opened the Field kit, the Book showed the eel and seahorse pages and the rare forms row (tapping Heirloom line explained it and listed the eel); in the heart, keys 1–4 answered all three phrases, the companion (Pip, an heirloom glowfin in the jar) rose in its bubble beside Kestrel and answered, the Choir named 19 patterns in their colours with circling lights and an outer ring, all five lines played (including the outstanding line), and the credits rolled;
  - **mouse:** the Hatchery's planner with two chime seahorses (size, shape and rare-shape odds); Keep on the hatching card of a Choir-touched baby;
  - **a simulated gamepad:** View opened the kit and RB reached the Book (the page tab was then picked by a click);
  - **iPhone 13 landscape touch:** the kit button, the Book tab, the eel and seahorse pages, tapping a rare form;
  - also seen: the chime seahorses drifting in the antechamber, eels and seahorses (one Choir-touched) in a tank, the zoo.
- **Not checked by the session:** sound (the eel's purr, the seahorse's chime, the companion's answer, the richer chords) cannot be heard in the test browser; a real gamepad's A/B/X/Y on the answer pads; the feel of the odds over a long real breeding run; the game runs at only a few frames a second in the test browser, so smoothness on the iPhone needs Colin's eyes.

### Phases 20 and 21 (Session A): creature care at the heart of the game (merged)

Built from Colin's answers in the roadmap ("Colin's decisions (Nov 22, 2026)"). Every new save field is optional; old saves load as they are (checked in Node).

**Phase 20: the collection book and the hatching moment**
- **The Book** is a new Field kit tab (between Kit and Collection). A page per species: its 4 colours across, its 3 glow patterns down. A kind you have raised shows its portrait (the real creature rig, drawn into a small picture); one you haven't is a dark shape marked ???. Radiant kinds get a gold frame. The rare colour is marked "rare" and the third pattern "bred only". Tapping a kind says where it first came from (wild or bred, and the generation) and lists the ones you keep; tapping a name opens its card.
- **Rewards:** a finished row (every colour of one pattern) gives a tank decoration; a finished page gives a rare egg (the rare colour, the bred-only pattern, radiant). Rare eggs wait at the Hatchery.
- **The hatching moment,** scaled by rarity: every egg gets a short reveal card at the bottom of the screen (the egg wobbles, cracks with light, bursts, and the baby tumbles out). A first-ever colour or pattern, or a radiant baby, first gets a reward card with its fanfare (notable; major when it is also the rare colour, the bred-only pattern or the first radiant of its kind).
- **Naming:** the reveal suggests a name; **Keep** takes it with one tap, or type another. Left alone it keeps the suggestion after a while. Names can be changed later on the card (the pencil). New field: `name` on a creature.
- **Better name suggestions:** the old name picker only reached about three names per species (creatures 1 to 4 were all "Murk"). Suggestions are now well mixed. Every creature already kept keeps its old name (written into `name` once per save, the tip `names:v2`).
- **Creature cards:** portrait, name, species, colour and pattern with rarity tags, generation, parents (new field `parents`, set when an egg is laid), where it lives, how content it is and why, and whether it knows Kestrel. From the Habitat console, the Hatchery and the Book.

**Phase 21: care that pays, the planner and requests**
- **Contentment** (0–100%: Content, Settled, Restless, Unhappy) is mostly the three needs, plus decorations in the tank and how well it knows Kestrel. Content creatures swim playfully (quicker, little loops); unhappy ones are sluggish.
- **Good care doubles rare results:** the care bonus runs from ×1 (a pair that only just meets its needs) to ×2 (a content, well-kept pair), multiplying the chance of a colour mutation, a pattern mutation and radiance (radiance capped at 90%). Node checks show ×1.8–2.2 over 60,000 eggs.
- **Hand-feeding:** a free treat at the glass (Hand-feed on the Habitat console, or H), about once a minute per creature. Each treat builds a bond that fades slowly; at half it knows Kestrel and swims to the glass on his side when he is near (outside or walking the base). New fields `bond`, `handFedAt`.
- **The breeding planner** (the Hatchery's Planner tab): pick a species and two grown parents (tanks or reserve). It shows the chance of every colour and pattern, of radiance, and of a kind your book is missing, with the care bonus and the odds without it. **Pair them** moves them into one tank.
- **Linnea's requests:** once something has been bred, talking to her opens two requests (no time limits). Bring a matching creature in the jar or satchel and talk to her: she admires it (you keep it) and gives a decoration or a rare egg. Her third request gives the **display aquarium plans**. The control bar says "Show Linnea your creature" when you carry one she wants. Open requests are listed in the Book.
- **Restocking the reef:** letting a bred creature go (from a tank or the jar) makes its looks turn up in the wild: every other wild creature of that species (up to four looks per species), and a caught one keeps them.

**Room for more creatures**
- **Tank extension kit TX-1** (a Lab blueprint from the three shallows creature scans; Workshop: 2 plating, 3 quartz, 1 resin): fitted at a Habitat console, a small tank holds 6 instead of 4 and a Grand tank 12 instead of 8.
- **The display aquarium:** with Linnea's plans, the Workshop builds a **display refit kit DR-1** (4 plating, 6 quartz, 3 brass, 2 resin) that turns an extended Grand tank into the display aquarium: 20 creatures, six decorations. It is a refit of a Grand tank rather than a new base piece (same room, so no new building art or layout rules).
- **The reserve:** the Hatchery's holding bay (30). Creatures there need no care, don't grow or make anything and aren't on show. Move in from any Habitat console; back to any tank from the Hatchery's Reserve tab. Resting creatures still count toward the wild's founding pair.
- **Panels for big tanks:** the Habitat console filters (All, Rare, Needs care, each species) and sorts (species, name, least content, rarest) once a tank has 4 or more; **Move to…** sends the selected creature to another tank or the reserve; **Care for all** (or Y) feeds every hungry tank (1 kelp fibre each) and scrubs every tank. Decorations are placed and taken out on the console.
- **Decorations** (8, drawn in code): stone arch, giant clam shell, old amphora, driftwood branch, brass dive helmet, ship's lantern (it glows), sea chest (bubbles slip out) and ship's wheel.

**Living tanks**
- Swimmers trail a soft wake of motes that drift and fade.
- Glowfins, puffcaps and shrimp now and then rise and break the surface: a ripple runs both ways along the water line, droplets jump and fall back, bubbles rise.
- Caustic light wanders over the back of each tank; a sand bed with pebbles lines the bottom.
- Only tanks on screen draw these. A same-save comparison against the game before this session ran at the same speed in the test browser.
- Not done: generated painted backdrops for tank interiors (no image generator in this session; see `docs/art/SOURCES.md`).

**Controls:** H hand-feeds and Y is "care for all" on the Habitat console (in `bindings.ts`). Everything else is buttons, which the gamepad drives through PadNav and touch taps.

**Checked:**
- `npm ci`, typecheck, build and `node scripts/test-progression.mjs`. The new checks are in `scripts/test-creature-care.mjs`: odds and the care bonus (sampled and exact), contentment, hand-feeding and bonds, names, capacity levels, the reserve, moving, care for all, the book, row and page rewards, requests (deterministic, no expiry, the display plans, keeping the creature), restocking, and old or malformed saves loading.
- In `vite preview` with a fixture save (a seeded base, creatures of many kinds; listed in the session's test scripts):
  - **keyboard:** I opens the kit; the Book; typing a new name on the hatching card (Kestrel stays still); C beside Linnea with a requested ray in the jar completed the request and gave the lantern;
  - **mouse:** filter, hand-feed, decorate, extend and move to the reserve on the Habitat console; the Hatchery's planner and reserve;
  - **a simulated gamepad:** View opens the kit, RB reaches the Book, the d-pad moves through cells, A opens one, B closes;
  - **iPhone 13 landscape touch:** the kit button, the Book, a card rename, Keep on the hatching card, hand-feeding.
- No console errors in any of these.

### Before Phases 20–23: puffcaps get room in bigger tanks (Nov 22, 2026)

Colin noticed nobody could raise many puffcaps: one was only content with at most one tank-mate, whatever the tank's size.
- **The change:** it is now content while its tank is no more than half full (`driftRoom` in `src/game/creatures.ts`). A small tank still allows 2, a Grand tank now 4, and larger or upgraded tanks will allow more automatically.
- **The care panel** says how many fit when it's crowded ("at most 4 in this tank").
- **Checked:** Node checks for small and Grand tanks, and the existing progression checks still pass.
- **Also:** documentation and code comments now use he/him for Kestrel (Colin: Kestrel is a boy).

## Codex phases and current state

| Work | Merged history | Implemented state |
| --- | --- | --- |
| Phases 1–6A | PR #21, `238c5a6` | Painted Shallows reefs, seabed and animated kelp; legacy face, visor and suit materials; surfacing reaction; Forest canopy and registered outcrop; Wreck Shelf hulks. Approved modes default on, with procedural fallbacks. Legacy face and suit still belong to the original character path. |
| Phase 7 | PR #23, `99f3a98` | Painterly biome and facility plates with procedural terrain, depth layers, constraints and fallbacks. Captures and generation intermediates from the original working sessions are outside this repository. |
| Phase 8 | PR #24, `0e142d9` | Living Water wakes, surface impulses, vegetation response, subsurface drift and better braking/reversal readability. |
| Phase 9 and live-branch integration | PRs #25 and #26, `6b27182`, `e56913a` | Compact salvage diver with shared swim and dry-interior identity, revised poses and equipment contact. Extra basin copper and KD-1 cargo-cradle deliveries carried forward. |
| Phase 10 | PR #27, `4b13c4b` | Articulated keepable wildlife, schools, predators, eggs and Choir, with consistent tank and field rigs. See [the creature checkpoint](docs/phase-10-creature-checkpoint.md). |
| Phases 11–11B | PRs #28 and #29, `1a07d8f`, `9ee6e5f` | Habitat tank motion, separated care and collection, swim-to-ladder moonpool entry, revised Corvina/Fulmar/Sanctum architecture and panoramic windows. See [the living bases notes](docs/phase-11-living-bases.md). |
| Phase 11C | PR #30, `f1f85be` | Native detail work on the compositor, Kestrel, lighting and edge fidelity. Retained the renderer comparison. |
| Phase 11D | PR #31, `c07277f` | Indoor zoom and camera handoff, live surrounding ocean, per-module pressure hulls, connector seals and separate scaffolds. Layout collision stays on the existing map. |
| Fulmar accessibility | PR #32, `78c8bb3` | Three-tile crew-deck foothold creates two normal jumps to the comms spool. |
| Phase 13 | PR #35, `d9f4728` | Contextual control helper on one binding table, five resealing drill lodes for KS-1, and named kept creatures. |
| Phase 15 | PR #38, `faa9e26` | Jar release with confirmation for named creatures, the Field kit on I, and the sonar-style control bar with an offer ping. |
| Phase 16 (rounds 1–2) | PRs #40, #41 | The satchel's second jar slot works indoors; gathering, tools, docking and welds get anticipation, contact and release; round-robin variety; danger first in the mix; phone-speaker harmonics; an indoor room echo and hull filter; footsteps. |
| Phase 16 (round 3) | PR #42 | 30 CC0 Freesound files (bubbles, breath out, diving in, an underwater loop, kelp snaps, moss rips, wreck groans and creaks, sand, wet footsteps), soft creature calls placed in the world, KS-1's idle heard from outside. |
| Phase 19 (first section) | PR #47 | Combat on foot in the Corvina's new engine room: the Rivet driver RD-1 (blueprint, Workshop, major reward), rust ticks, weld drones and the hull keeper, bracing and ducking, safe lamps and a gentle blackout. |
| Phase 18 | pull request (not merged) | Linnea, a friendly axolotl drawn in code, waits at one of nine spots and gives gentle hints chosen from the save when Kestrel talks to her. |
| Phase 17 | PR #45 | The Field kit portrait is the live Kestrel rig with part highlights and ??? silhouettes; mag-boots are a toggle walking mode on the seabed. |
| Phases 20–21 | PR #50 | The collection book, hatching moments with naming, creature cards, contentment and hand-feeding (care doubles rare odds), the breeding planner, Linnea's requests, restocking, tank upgrades, the reserve, the display aquarium, and living tanks. |
| Phases 22–23 | PR #51 | Size, fin/shell shape and heirloom traits with tiered rarity (care doubles each), the kiln eel and chime seahorse, Choir-touched creatures in the Choir's colours, a Choir song that grows with the collection, the optional jar companion, and singing again after contact. |
| Phase 14 | PR #36, `03b4c8f` | Reward moments: minor, notable and major tiers with drawn emblems, particles, slow motion and synthesised stings and fanfares. |

### Phase 19: combat inside the wrecks, first section (pull request, not merged)

Colin chose all four proposals at the start of the session (Nov 22, 2026):

- the weapon is the **Rivet driver RD-1**;
- health is **suit integrity**;
- the **hull keeper stays beaten** and the small machines rebuild;
- the first section is a **new, optional Corvina engine room**.

Full notes: [phase-19-wreck-combat.md](docs/phase-19-wreck-combat.md).

- **The route:** the bosun's locker in the Corvina's hold (west end, past the salvage crate) gives the Rivet driver drawings. A Lab decodes them (80 s). The Workshop builds the driver (3 brass, 4 copper, 2 quartz) with a major reward card and its own emblem. Holding Collect at the welded door beside the locker forces it open. Without the driver, the door says so and points at the locker.
- **The engine room:** a dark bay of rust with two old engines, a propeller shaft, pipes and the keeper's nest with its red console, all drawn in code. It has three rooms, each starting at a caged safe lamp that lights lime as Kestrel passes:
  - **room 1:** two rust ticks;
  - **room 2:** two weld drones and a tick among crates you can hide behind;
  - **room 3:** the hull keeper.

  Behind the keeper, a shutter lifts once it is beaten. It opens onto the keeper's store: the chief engineer's log (a new scanner log entry) and the keeper's hoard (4 brass, 4 copper, 3 quartz, 2 plating).
- **The machines,** each telegraphing every attack in pose, glow and sound:
  - **Rust tick:** crouches, shakes and flares its eye, then lunges. Jump it or brace; it lands on its back.
  - **Weld drone:** a sighting line follows Kestrel, then goes solid and blinks with two beeps when locked, then it fires a bolt. Duck or take cover. It is armoured except while charging (a rivet interrupts it) and while its vents glow open cooling down.
  - **Hull keeper:** raises its hammer arm and slams a shockwave along the floor (jump it), or rears back venting steam and charges (brace, and it is stopped dead). After either, its shield droops and its core blazes: the only time rivets hurt it.
- **Kestrel:** the driver is strapped to his near forearm, on the swimmer too: a housing with red straps, a brass-banded drum, a barrel and a lime sight lamp. Holding **Down** braces: a low crouch with the forearm raised and the guard plate folded out. He can turn round while braced but not walk. A **perfect brace** (raised just as a hit lands) knocks the attacker back and sends a drone's bolt home. Rivets aim softly at the nearest machine ahead. The arm points along each shot with a kick of recoil.
- **Losing:** the screen fades. Kestrel wakes by the last safe lamp lit this visit (or the door) with his suit patched to 60% and everything kept. The rooms from that lamp on refill. Out of a fight the suit seals itself after 4 quiet seconds.
- **Controls:** Shoot is **X**, **RT** on a gamepad, or the **Shoot** button on touch. The button only appears in the engine room once the driver is built, in Scan's place; Flare and Dart buttons hide on foot. Brace is holding **Down**. The control bar shows Shoot and Brace there.
- **Switch and tuning:** `?combat=off` keeps the door welded. Every number lives in `src/game/combat.ts`.
- **Sound:** a synthesised warning for every attack, placed towards the machine, never muffled, dipping the soundtrack. There are also separate sounds for rivets, pings off armour, hits, blocks, the perfect brace, machines falling apart, the keeper's power-down, Kestrel's suit being hit and a lamp lighting. No sound files were added.
- **Save:** only the optional `corvina.engine?: { taken }` is new. Old saves load untouched (checked in Node).

**Also (Colin, before merging):** the Corvina's scan point moved. It used to be buried in her hull amidships and was hard to catch from outside. It now sits in open water just off her stern, beside the bollard and the deck hatch (the way in), so it's met on the way inside. Checked in Node (open water, clear of the upwelling, within scan reach of the bollard and hatch) and in `vite preview`: swimming east to the stern with real keys, the scanner offered the wreck and holding E logged it.

**Validated:** `npm ci`, typecheck, build and the progression checks.

The new Node checks cover:
- blocking, the perfect brace and the unblockable shockwave;
- suit damage and mending;
- the engine room map, rooms and spawns;
- the door and locker in the hold;
- respawning (the keeper stays beaten) and the wake point;
- the `?combat=off` switch;
- the blueprint and gear;
- old and new saves loading;
- the Shoot binding and control bar rows;
- a fight stepped in Node: a tick telegraphs then lunges, a brace turns it, a perfect brace is recognised, ticks climb crates rather than lunging into them, two rivets stop a tick, a drone is armoured except when charging or cooling, ducking after the lock makes its bolt miss, the keeper is shielded except when open, its slam shockwave lands on someone who doesn't jump, and shooting its open core beats it.

In `vite preview` with real input:
- **Keyboard (a scripted player pressing A/D, Space, S and X):**
  - real C-holds took the locker and forced the door;
  - room 1 played with braced lunges and no damage taken;
  - room 2 had both drones and the tick destroyed, one bolt taken and the suit mending back to 100%;
  - room 3 had the keeper's slam, charge, open core and defeat, with the store shutter opening and `k` saved.

  The scripted player started rooms 2 and 3 at their safe lamps (a fixture: the save was given the Rivet driver, and Kestrel was placed at the lamp).
- **Simulated gamepad:** RT fires; the stick held down braces; the bar shows "RT Shoot" and "hold Down: brace · duck".
- **Touch, iPhone 15 Pro landscape:** the Shoot button shows (Dart and Flare hidden), a tap fires, and dragging the stick down braces.

No console errors in any run.

Fixed during the checks:
- the guard plate lay flat (it now always stands upright);
- a tick stuck behind a crate lunged into it forever (it now climbs over, and only lunges along a clear floor).

**Not tested (needs Colin):**
- every sound (the headless browser can't hear);
- the feel and difficulty with his own hands on PC, controller and iPhone;
- a blackout and wake in the browser (the scripted player never lost; the rule is Node-tested);
- the full route from a fresh save: locker, then Lab, then Workshop, then door (the Lab and Workshop steps were not played; the drawings, blueprint and gear are Node-tested);
- reading the chief engineer's log and opening the hoard on screen.

### Phase 18: Linnea, the axolotl guide (pull request, not merged)

The idea and the name come from Colin's daughter. Colin approved her look from screenshots before the hints were wired up, then confirmed all nine spots, the wording and the Talk button. Full notes and every hint line: [phase-18-linnea.md](docs/phase-18-linnea.md).

- **Her look:** a soft coral and peach axolotl with a broad head, a gentle upturned smile, small dark eyes with catchlights, a blush, golden freckles, faint folds along her flank, translucent fins and three feathery coral gills on each side. She is drawn in code with gradients and jointed parts, like the Phase 10 creatures. Her body and tail sway along a curving spine. She is never hot pink and uses none of the Choir's colours. Her palette was tuned in the real lighting so Kestrel's lamp doesn't wash her out.
- **Her personality:** she blinks (sometimes twice), her gills flutter all the time and fan out when she talks or is pleased, she bobs and opens her mouth with each chirp, she tilts her head curiously and turns to face Kestrel as Kestrel comes close, and she gives a little tail wiggle when Kestrel arrives. A faint warm glow and a small light let her be found in dim water.
- **Where she is:** one spot at a time, chosen from the save each frame: the dark east cliff, where the cliff cave comes out in the Kelp Forest, outside the kelp caves, above the race, outside the Corvina, the trench rim, outside the Fulmar, by the round stone door, and home by the Kestrel buoy after first contact. When the story moves on she fades away and is found at the next spot. Each spot is in open water and kept clear of pickups, so her Talk is never hidden.
- **How she helps:** only when Kestrel comes within reach and presses **Talk**, which is the Collect action (**C**, **X** on a pad, the **Collect** button on touch). The control bar shows "Talk to Linnea", then "Listen to Linnea" while she has more to say. She says one or two short, gentle lines picked from where the player really is (for example, carrying the sled recorder, a grown snail in the jar, the Corvina's power still off). The first time ever she says hello and her name first. Her words appear in a small warm card over her head. The card fades on its own after a while, or when Kestrel swims away. She never calls out, follows or interrupts.
- **Her voice:** a soft synthesised chirp per syllable (a rising rounded note, a faint bell, the odd tiny bubble) on the sfx bus, so the underwater muffle, sliders and phone mix apply. No sound files were added; `public/audio/CREDITS.md` is unchanged.
- **Save:** no new field. Each place Kestrel has met her is a `linnea:<spot>` entry in the existing `tips` list; her spot is worked out from the save. Old saves load at the right spot.
- **Fix on the way:** a very quick tap on the touch **Collect** button could be missed if it fell between two frames. A tap now always counts for at least one frame (this helps every tap action, not just Talk).

**Validated:** `npm ci`, typecheck, build and the progression checks. The new checks walk a save through the whole route and check she visits all nine spots, once each, in order, with the right hint at each step. They also check that every spot is in open water and far from the others, that her lines stay short, that her hello plays once, and that a save without a zone map still works. In `vite preview` with real input:
- **Keyboard:** C talks, then gives her next line; the card follows her.
- **Simulated gamepad:** the bar shows "X Talk to Linnea"; X talks and gives the next line; swimming away fades the card.
- **Touch at iPhone 15 Pro landscape:** dived with the on-screen stick, tapped Collect, she spoke.
- **Moving on:** with the dive light given during play (a fixture), she faded from the cliff and was found and talked to in the Kelp Forest.

There were no console errors. Screenshots were checked at the cliff (in and out of the lamp) and in the forest.
- **Not tested (needs Colin):** how the chirp sounds (the headless browser can't hear), the feel on a real controller and the iPhone, and her later spots (Corvina to home) in real play: those were placed by the Node checks and a pickup-distance check, but not visited on screen.

### Phase 17: Kestrel's kit (merged, PR #45)

**17a. The Field kit portrait is the real Kestrel.**
- The Kit tab draws Kestrel's own on-foot rig (`src/actors/walker.ts`) live in a small canvas of its own (`src/ui/kitPortrait.ts`), wearing exactly what the save has. He stands, breathes, glances and turns round slowly now and then. The old boxy SVG drawing is gone.
- Every card for something he wears is a button. **Hover** it (PC), **tap** it (touch: it stays lit until you tap it again or another card), or **move the gamepad's highlight** onto it, and that part glows with a slow warm pulse and a halo: suit, air tanks, lamp, thruster (TH-3's third nozzle too), jar and satchel, grapple harpoon, mag-boots, Echo visor, heat cowl, flare tube, stun-dart launcher, resonator. The caption under him names it.
- Gear not found yet shows on him as a **dark silhouette marked "???"**, without its name. (An unfound resonator keeps its crystal dark, so the Choir's colours aren't given away.)
- The world stays paused (checked: play time does not move while the Field kit is open). Works in iPhone landscape.
- To make this possible the on-foot rig gained the attachments only the swimmer had (mag-boots, flare tube, satchel, Echo visor band, heat cowl, TH-3 nozzle), and both rigs gained a small **stun-dart launcher** on the far forearm (before, the dart had no visible piece). So Kestrel now wears all his gear indoors too.

**17b. Mag-boots: a walking mode.**
- **Boots** clamps them on and off: **N** on the keyboard, **d-pad up** on a gamepad, a **Boots** button on touch (it appears once the boots are built and glows lime while clamped). The control bar offers "Clamp mag-boots" near the seabed or in the race, and while clamped shows Let go, Walk, Hop.
- Clamped: Kestrel switches to his standing rig at the same spot (no jump in position), sinks to the seabed if he's above it, and walks it at 95 (swimming is 230), with a heavier, stompier walk. Currents and vent lift don't move him. **Jump** (Space, A, or the Boost button) is a short heavy hop of about half his height. Walking off a ledge he **sinks slowly** (no faster than 150) and lands with a thud, a puff of silt and a small camera jolt. He follows slopes and climbs small steps (his soles stay within 1–2 units of the ground on the tested slopes) and stops at walls. Air runs as normal; his lamp, scan, flares and darts still work.
- **Let go:** press Boots again and he swims on at once from the same spot. Boarding KS-1, the grapple, the moon pool, a blackout or going indoors also let go.
- Each footfall is a deep clanking stomp with a silt puff; landings are a heavier thud. They play through the normal sound system (sfx bus: underwater muffle, sliders, phone mix), layering slowed copies of the already-logged CC0 metal impacts and footsteps under synthesised thumps. **No new sound files**, so `public/audio/CREDITS.md` is unchanged.
- The old "hold Down to brace" is gone (the toggle replaces it). Gear text, the reward line and the scanner note now describe the toggle.
- The walking rule is its own Node-tested file (`src/game/magboots.ts`).

**Fixes found on the way.**
- The on-foot rig's turn-round spring could blow up on a slow frame (about 20 frames a second or worse): Kestrel vanished and the lamp's light smeared a band across the screen. The rig now animates in steps of at most 1/60 s, indoors too.
- The touch buttons for **Flare, Dart, Send (KD-1) and Release** ignored taps (they inherited "let touches through" from their container), so taps went to the game. They now take touches.

**Validated:** `npm ci`, typecheck, build and the progression checks (new: the walking rule on a test floor and on the real race floor, and the control bar's boots rows). In `vite preview` with real input: keyboard (I, hover, N, arrows, Space), a simulated gamepad (View, d-pad focus in the Field kit, d-pad up, stick, A) and touch emulation at iPhone 15 Pro landscape (tap cards, Boots button, the stick, Boost to hop). Wreck Shelf race: clamped mid-water, sank, walked east across the race floor against the current, hopped, stood still in full current without moving, let go and was swept away. Slopes walked down and up in the wreck field. No console errors. Sounds were triggered through the real engine without errors or clipping (peak 0.06).
- **Not tested (needs Colin):** how the stomps and thud sound (the headless browser can't hear), the feel on a real controller and the iPhone, and real phone frame rates.

### Phase 16: the offer ping is off (merged, PR #43)

- **Colin, after round 3:** running through a base with many rooms, or swimming past things to pick up or dig, the control bar dinged every time a new action appeared. The ding is switched off (`controlHelper.onOffer` is no longer hooked to `sound.offerPing()` in main.ts). The bar's visual sonar ripple still marks a new offer. Nothing else changed.
- **Validated:** typecheck, build and the progression checks; in `vite preview`, walking up to offers no longer calls the ping (checked with a counter on `offerPing`).

### Phase 16, round 3: the rest of the sound shortlist (merged, PR #42)

- **No tuning from notes this round:** Colin's listening notes hadn't been filled in yet, so no existing level was changed by ear.
- **30 CC0 sound files from Freesound** (289 KB; all 46 audio files now total 373 KB, mono MP3 at 64 kbps). Each file's own Freesound page says "Creative Commons 0"; Freesound's public preview MP3s were used (same licence). Every file is logged in `public/audio/CREDITS.md`. They layer under the coded sounds, rotate without repeats, vary in pitch and fall back to the coded sound if a file fails to load:
  - bubbles (the jar release, boosting, catching, docking, diving in, the shallows ambience), the regulator's breath out (every breath underwater), a dip under the surface (diving in);
  - a 10 s underwater ambience loop under the coded water bed (seamless, muffled with depth, dull through a hull);
  - kelp snaps (fibre, the kelp wall giving way), moss rips (moss, bloom, brackets);
  - slowed wreck groans and metal creaks (the Wreck Shelf, the trench, crush-depth creaks, which now carry on a phone speaker);
  - a sand trickle (copper loosening, the drill's grit, the rockfall after a break-through), wet metal footsteps in the wrecks.
- **Soft creature calls,** coded and placed by position: puffcaps boop, rays hum, crabs click, shrimp snap and chirp, snails glug, glowfins chirp; young ones higher. One every 4–10 s from a creature within about 900 px.
- **KS-1 heard from outside:** a low idle hum with a slow pump near the parked sub, panned to its side, gone by about 700 px.
- **Validated:** `npm ci`, typecheck, build and the progression checks. In `vite preview`: all 46 files load, every new group plays through the real game code, a meter after the limiter showed no clipping (worst pile-up 0.93 with the files, 0.99 synthesised-only, both held by the limiter), and there were no console errors. Kestrel was swum under with the real Down key; KS-1's hum was checked with a fixture sub placed in the save. Numbers and a listening guide are in the [audit](docs/phase-16-audio-audit.md).
- **Needs Colin's ears:** everything in the round 3 listening guide, on PC and the iPhone speaker and headphones. The headless browser cannot hear.

### Phase 16, round 2: the first recorded sounds (merged, PR #41)

- **16 CC0 sound files** from Kenney's "Impact Sounds" pack (84 KB in total, mono MP3), logged in `public/audio/CREDITS.md`. The pack's own licence file says CC0. They're layered under the coded sounds, rotate without repeats and vary in pitch:
  - stone and gravel for copper and ore coming loose, the copper strokes and the drill breaking through;
  - metal for scrap and brass coming free;
  - light glass for quartz snapping off;
  - hard-floor footsteps in the base and the wrecks.
  If a file fails to load, the coded sound plays alone.
- **Validated:** typecheck, build and the progression checks. In `vite preview` all 16 files loaded and every cue played without clipping (the copper release was trimmed after measuring 0.52, louder than intended). **Needs Colin's ears:** gathering copper, scrap, quartz, ore and brass, drilling a lode, and walking in the base.

### Phase 16: the satchel jar fix and the audio audit, round 1 (merged, PR #40)

- **Satchel bug fixed.** With the specimen satchel, the base now fills both slots. "To jar" at a Habitat console or the Hatchery, and the Revival pool, fill whichever slot is free. Depositing a creature into a tank moves the satchel's creature up into the jar at once, so the next deposit is offered straight away, indoors or out. The buttons read **Jar full** (disabled, with a tooltip) only when both slots are full, or when the one jar is full and there is no satchel. One rule does it all: `jarRoom()`, `putInJar()` and `takeFromJar()` in `src/game/creatures.ts`. A blackout now also empties the satchel's slot the same way as the jar's (named creatures go back to their tank or the Hatchery, wild ones swim home); before, it only handled the first slot.
- **Creature names fixed.** About half of all kept creatures showed the name "undefined" (a sign error in `creatureName()`, from Phase 13). They now get a real name; every name that already worked is unchanged. The progression checks now test 400 ids for each species.
- **The audio audit** is in [`docs/phase-16-audio-audit.md`](docs/phase-16-audio-audit.md): every cue, its trigger, bus, level and what was wrong, then what changed and a listening guide. In short:
  - Gathering has a shape: strokes that vary and build as the ring fills, a release that suits each material when it comes loose (copper pops out of gravel, quartz snaps and rings, resin lets go with a sticky pop and so on), then the Phase 14 ting, unchanged.
  - The cutter, winch, moss brackets, recorder, creature catching, drill nose, tractor beam, scanning, docking and KD-1's finished welds each get an anticipation, a contact and a payoff.
  - Round-robin variants and small random pitch and level changes on every frequent sound (`src/audio/variety.ts`).
  - Danger first: the lurker's rattle is no longer muffled at depth and dips the music, as do bites and hull breaches; the low-air beeps and suit alarm sit a little above a pickup ting.
  - On the phone speaker mix, deep thuds get a short higher knock so they are heard, not lost under the 110 Hz cut.
  - Inside the base and the wrecks: a short steel-room echo, the ocean heard dull through the hull, and footsteps while walking. Aboard KS-1 the sea outside is dulled too.
  - KD-1 has a soft propeller whir placed in the world.
  - The jar release sound is fuller. The control bar's offer ping is unchanged and flagged for Colin to judge.
- **Sound files:** none yet. The session's network policy refused the sound libraries (kenney.nl, freesound.org, opengameart.org). The game can now play bundled CC0 files through the normal buses (`audio.sample()`, with the synthesised sound as fallback; the list is `src/audio/samples.ts`), and the audit has a shortlist of what to fetch. `public/audio/CREDITS.md` is the ledger.
- **Validated:** typecheck, build and `node scripts/test-progression.mjs`, which adds satchel checks: two creatures with the satchel, a refused second without it, deposit order with the satchel's creature moving up, and no room without a jar. In `vite preview` with real keyboard and mouse input on a fixture (the bench base, the satchel, three young creatures in one tank): Collect at the Habitat console, **To jar** twice filled the jar and the satchel, the third creature's button read **Jar full** (disabled); at a second tank, **Move specimen from jar** twice put both in, in catch order. No console errors. A meter on the audio thread showed every new cue playing and nothing clipping (the worst pile-up peaked at 0.92); the numbers are in the audit.
- **Needs Colin's ears:** everything in the audit's listening guide, on PC and on the iPhone speaker and headphones. The headless browser cannot hear.

### Phase 15: jar release, the Field kit, and the sonar control bar (merged, PR #38)

- **Release the creature in the jar (15a, done).** Press **J** (d-pad left on a gamepad, or the jar **Release** button on touch) while swimming outside. The satchel's newer catch goes first. The control helper offers it by name ("Release the glowfin fry").
  - A wild catch swims home and **stops counting against the wild limit**, so the right one can be caught instead.
  - A **named creature from your tanks asks first**. The first press warns ("Release Pip the dapple ray? It will not come back to your tanks. Press J again to let it go."), and only a second press within 4 s releases it (Colin's decision).
  - There's a new release sound: the lid, a gush of bubbles and a soft falling note. The rule lives in `releaseFromJar()` in `src/game/creatures.ts`.
- **The Field kit (15b, done).** Press **I** (View on a gamepad, or the new helmet button above the log) to open a pause screen. The world holds still while it is open. I, Esc or ✕ close it; B closes it on a pad, and LB/RB switch tabs.
  - **Kit tab:** a code-drawn Kestrel wearing only what the save has: suit tier rings, shoulder lamp or dive light, thruster nozzles, jar and satchel, harpoon, flare tube, boots, visor, cowl and the resonator hoop. Beside the portrait are cards for the diver (14 slots), KS-1 and its modules, and KD-1.
  - Gear not found yet shows as a **dark silhouette marked "???"**. KS-1's module slots appear only once the sub is built.
  - **Collection tab:** each species (scanned, kept, grown, patterns, bred); meters for air tanks, echo whorls, the scanner log and drill lodes; and the Choir's song (spools found, fragments decoded, and the glow patterns the next fragment needs).
  - Links to the scanner log, and to the zone map once a Signal array is built.
- **The control bar's new look (15c, done; Colin chose "sonar" from three candidates).** The Phase 13 key bar is now a floating capsule with a slow lime sonar sweep, glowing capsule keys and small-caps labels; world offers glow warmer. When a new action appears, it ripples like a sonar ping and a very soft two-note tone plays on the current music zone's root and fifth (at most every 1.5 s). The helper's behaviour (modes, info versus action, pad glyphs, the Settings preference) is unchanged. The rejected "staff" and "gauge" looks were removed.
- **Validated:**
  - Typecheck, build, and `node scripts/test-progression.mjs`, which adds release checks: satchel order, the wild-limit refund, the floor at zero, no refund for named creatures, and the helper rows.
  - **Real keyboard input** in `vite preview` on a fixture save (a wild glowfin in the jar, a named ray in the satchel, mid-game gear):
    - J warned for the ray, a second J released it, and a third J released the glowfin and lowered its wild count from 1 to 0.
    - I opened the Field kit and play time stopped. Esc closed it without opening the pause menu, and I, I opened and closed it again.
  - The three candidate looks were captured in the game for Colin to choose. After the choice, the sonar bar was checked as the default, and the offer ping fired once when the Build offer appeared. No console errors. The tone's loudness still needs Colin's ears.
  - **Not yet checked:** touch buttons on the iPhone and gamepad navigation on real hardware.

### Phase 14: reward moments (merged, PR #36)

Colin wanted every reward to feel like a reward: a card that shimmers and smashes down, and a dungeon chest where the hero lifts the item overhead to a short jingle. Rewards now come in three tiers, all drawn and synthesised in code. See the [Phase 14 notes](docs/phase-14-reward-moments.md).

- **Minor (pickups):** the inventory chip flares and sparks. A bright ting climbs a step of the scale with each pickup in quick succession.
- **Notable (finds, decodes, a first base piece, creatures caught, grown or hatched, whorls, spools, routes opened):** an emblem smashes down under the notices with a shockwave, a ribbon and one line, plus a slam-and-answer sting.
- **Major (new gear, suits, air tanks, belt kit, KD-1, KS-1 and its first module fits, depth plating, signal fragments, the big puzzle payoffs):** slow motion and a darkened screen. The emblem rises off Kestrel on light rays while a riser swells, then slams to the centre with a flash, a shake, shockwaves and flares. A fanfare plays over a held chord while the music dips. A tap or key closes it after 1.7 s. Ordinary notices wait until it closes.
- Choir rewards keep the Choir's colours and glassier bells. Creature rewards use a warm palette. `prefers-reduced-motion` drops the shake and slow motion.
- **Validated:** typecheck, build and the progression checks. Browser captures of every phase at desktop and phone-landscape sizes. A real Workshop build (MB-1 on a fixture base) showed the card and held its notice until a tap. The output meter showed the stings well above the ambient bed. **Still needs Colin's ears and hands:** the mix on the iPhone speaker and headphones, and how the slow motion feels in play.

### Phase 13 gameplay pass (merged, PR #35)

- **Contextual control helper.** A keycap bar along the bottom edge shows the bindings the game actually uses, by situation: swimming, KS-1, on foot, ladder, grapple swing and build mode. It leads with what the world offers on Collect, Scan or Board. Settings let the player choose contextual hints (the default), always show, or hide. Gamepad users get pad glyphs; touch keeps its own buttons. See `src/ui/controlHelper.ts`.
- **One binding table.** `src/controls/bindings.ts` feeds `Input`, build mode, the panel shortcuts and zoom. It stores overrides per device, ready for a remapping screen.
- **Info versus action.** Collect prompts that only explain something, such as a refusal, a need or a console status, are flagged and never advertised as key actions.
- **Drill nose, a lasting tool.** Five mineral lodes (kelp forest, two on the wreck shelf, trench ledge and trench floor) yield copper, quartz, scrap, brass and vent ore, and reseal after 10 minutes. The seam and the lodes are scannable and have field notes. The drill now uses the Collect label instead of its own banner. Optional save fields: `lodes` and `lodeNotes`.
- **Named creatures.** Each kept creature has a stable name derived from its id, shown in care, the jar, events and the crab and snail sites. The save is unchanged.
- **Validated:** `node scripts/test-progression.mjs` (with the new helper, bindings, lode and name checks), typecheck and build. In the browser with real input: a continuous fresh-save opening to the survey beacon, drilling the kelp forest lode in KS-1, walking the base and climbing its ladder, wheel zoom in the base, and gamepad glyphs. A continuous run to the ending was not possible on the headless software GPU (3–5 FPS); see the audit.

### Phase 12 gameplay pass (merged)

- The strongbox and trench chimney now offer physical clues, scanner entries and staged prompts. A later visit can surface more specific instructions, and a young or grown specimen changes the advice. During Collect holds, the corresponding creature visibly works and returns to the jar. Existing rewards and completion flags are retained.
- Mag-boots add a braced stance near the bottom. Hold Down to stop being carried and edge sideways to work in the deep race or vent flow. The grapple still crosses the race, and raising the vane still opens permanent access to the upper water for KS-1.
- The log highlights investigated sites, pending spools and their grown/bred pattern requirements, recovered research and the boots. A return to housing can surface a recovered research item. The Lab names the remaining scans for a blueprint.
- The sealed Corvina bulkhead points to the deck hatch above the stern grapple bollard.
- A solitary juvenile with its preferred plant consumes food and fouls water more slowly. Lost or dormant founders can be replaced from the wild up to a living pair, counting both specimen slots. The Hatchery still supplies any additional animals.
- The hatch compares the candidate exit depth with the suit rating. An over-depth voluntary exit gives a warning and requires a second press within four seconds. Normal exits, powered dock handoffs and emergency ejections retain their own paths.
- Sanctum openings now take precedence over the Fulmar hull test. The hull collision used to extend into the deep tunnel and block access to the first song-lock. The station and the closed song-lock retain collision in their own spaces.
- Validation included a clean-save opening swim and scan. A separate empty save used normal Collect and Build controls to gather materials, recover the jar and recorder, repair KD-1 and weld the first dome, with repositioning between sites. Browser checkpoints covered the Lab and Workshop dive-light sequence, habitat planting/feeding/cleaning/jar transfer, both animal gate actions, bracing, a grapple, the vane and upgraded KS-1 crossing, safe and guarded hatch exits, entering Fulmar, the Sanctum door and both song-locks, and the Choir's three phrases, gift and return gate. Isolated simulations covered growth, breeding, hatching and four-spool decoding. A legacy fixture retained completed gates and its Fulmar spool.
- The Kelp checkpoints verified the dive-light boundary, boom winch, all four moss brackets, cutter and grapple data finds, and opening the kelp wall with the cutter.
- Still open for playtesting are an uninterrupted fresh-save run through construction, fabrication, all region gates and first contact, a real-device check of the boots and hatch prompt, and the long-interval habitat economy. Historical visual reviews outside the repository cannot serve as a complete archival record.

### Phase 12 polish: Hatchery and habitat usability

- **Hatchery Feed button.** It was not disabled. It had no style of its own, so it fell back to the browser's white button face under the panel's pale text, which made it almost unreadable. Every care and Hatchery button now has a dark face with readable hover, keyboard focus and disabled states. Disabled buttons are dashed and muted with high-contrast text instead of fading to 35% opacity.
- **Trough status.** The trough is a separate card showing its level, a one-line status and the button. The button reads **Trough full** (disabled) when hand feeding would be wasted, **Need 1 fibre** when you have none, **No power** without a powered Hatchery, and **Feed · 1 fibre** otherwise. Each state has a tooltip. Hand feeding adds 12 L, so the trough counts as full within 1 L of the brim, as before, and the note explains when feeding opens again.
- **Hatchery cradle buttons.** A full tank reads `GT-1 full`, and **To jar** becomes **Jar full** or **No jar** when the jar cannot take the animal. These buttons are disabled and have tooltips.
- **Habitat console.** The disabled **Habitat full** button now looks disabled. Unscanned plants are dashed but legible instead of faded.
- **Grand tank: one floor and one HABITAT sign.** With living bases, the two-cell Grand tank drew a console and a HABITAT sign on each level. The upper level's grating and ladder existed in the tile map but were hidden behind the aquarium glass, so the second sign floated mid-tank over a deck the player could not see or reach. A living habitat is now one tall aquarium over a single floor. The map has no mezzanine or ladder, and there is one console and one railing. The HABITAT sign stays on the console's face as before (Colin: it reads fine when Kestrel walks up to it). The original `?bases=original` path keeps its mezzanine. The panoramic exterior windows and the full tank height are unchanged.
- **Hatchery room.** The **HX-1** code moved above the console's HATCHERY label. Before, the first heat lamp covered it. The prompt now counts eggs and young separately, for example "1 young" or "2 eggs, 1 young", instead of "1 egg and young".
- **Validation.** Type check, production build and `node scripts/test-progression.mjs` all pass. The progression test adds a check that a living Grand tank has a single floor while the original path keeps its mezzanine. Browser checks ran at 2560×1440 with the Ultra preset at the default and a closer indoor zoom. The fixture was a base with a dome, turbine, Grand tank and Hatchery, with a young glowfin in the cradles, a full trough and 5 stored fibre. Checks covered:
  - The tank with its single sign and console. Pressing Up at the old ladder tile does nothing.
  - Opening the Habitat Console and the Hatchery through their interactions.
  - The full, ready and no-fibre trough states, plus a hand feed (3 → 12 L, −1 fibre).
  - Hover on enabled and disabled buttons, and the Jar full state.
  
  Not yet checked on the iPhone or iPad.

## Tech choices (decided in milestone 0)

Versions checked against the npm registry and current docs on 2026-11-14.

| Job | Choice | Why, in plain language |
| --- | --- | --- |
| Drawing on screen | **PixiJS 8.23** (WebGL 2 for now) | A fast 2D drawing library that uses the graphics chip (GPU). It lets us write custom shaders, which are small GPU programs for water, light shafts and glow, and it has a particle system that can draw thousands of specks at once. It is built for 2D, very actively maintained (updated this week) and runs the same in Safari on iPhone/iPad and in Chrome on the PC. |
| Language | **TypeScript 7.0** | JavaScript with type checking. It catches mistakes before they reach the phone. |
| Build tool | **Vite 8.3** | Turns the TypeScript into a small, fast website. It also gives a live preview while developing. |
| Hosting | **GitHub Pages**, deployed by GitHub Actions | Every push builds the game and publishes it to the play link automatically. It is free and needs no server. |
| Phone install | Web app manifest and Apple home-screen tags | "Add to Home Screen" on iPhone opens the game full screen with its own icon. |

Alternatives considered:
- **Phaser 4.** A full game framework. It has more built-in game features, but it is less flexible for the custom-shader, effects-heavy look the brief asks for. We would end up fighting its built-in rendering.
- **Three.js.** Excellent, but it is a 3D library. A 2D side-view game would carry extra weight it doesn't use.
- **Raw WebGPU.** The most power, but we would have to build everything ourselves.

**Why WebGL 2 rather than WebGPU for now:** PixiJS supports both, but a custom shader must be written once per backend (GLSL for WebGL, WGSL for WebGPU). WebGL 2 is the most proven path on iPhone Safari, and it has more than enough headroom for a 2D game. If the Ultra preset on the PC ever needs more, we can add WebGPU versions of the shaders and switch the PC to WebGPU. That decision is in one line in `src/main.ts`.

## Graphics presets

These are defined in `src/presets.ts`. **Auto** picks High on touch devices (iPhone, iPad) and Ultra on computers with a mouse. You can override it in Settings (the gear button), and the choice is remembered on that device.

| Setting | High | Ultra |
| --- | --- | --- |
| Frame-rate cap | 60 | 120 |
| Sharpness | Up to 2× screen pixels | Full device sharpness, capped at 4K |
| Drifting particles (relative amount) | 220 | 600 (denser) |
| Rock parallax layers | 3 | 5 |
| Dynamic lights added up per pixel | 8 | 12 |
| Caustics | single colour | split into red, green and blue (faint rainbow edges) |
| Glow (bloom) sharpness and smoothness | ¼ resolution, 2 blur passes | ½ resolution, 4 blur passes |
| Plants and coral | normal | about 1.6× more |
| Soft shadows | baked rock shadows | baked rock shadows **plus** the diver's moving soft shadow on the seabed |
| *G1:* HDR picture and tone mapping | half-float picture, soft shoulder from 0.72 | same, with MSAA on the picture ("Smooth edges") |
| *G1:* Bloom | strength 0.30, starts at 1.0, 4 steps from ¼ screen, glow feed 0.18 | strength 0.34, starts at 1.0, 6 steps from ½ screen, glow feed 0.20 |
| *G1:* Colour grading, vignette | per zone, vignette as before | same |
| *G1:* Film grain | 0.6 | 1.0 |
| *G1:* Skip hidden caustics | on | on |
| *G3:* Zone backdrops | faint (0.8) silhouettes | full (1.0) |
| *G3:* God rays | strength 0.09, 8 steps, at ¼ screen | 0.14, 14 steps |
| *G3:* Lit snow and bokeh | lamp strength 0.9, 5 soft near specks | 1.3, 12 specks |
| *G3:* Depth of field (near kelp) | off | 2.4 px blur |
| *G3:* Surface shimmer | 0.6 | 1.0 |
| *G4:* Grime and grain | strength 0.35 | 0.55 |
| *G4:* Metal sheen | 0.6 | 1.0 |
| *G4:* Dome glass streak | 0.7 | 1.0 |
| *G4:* Eye-shine | 1.0 | 1.0 |
| *G4:* Render scale (Settings switch, off by default) | 1.25x | 1.5x |
| *G2:* Lamp shadows | the diver's lamp casts; 10 march steps | the diver's lamp and the sub's lights (up to 3 lights); 22 steps |
| *G2:* Relief lighting | 4 taps, strength 0.55 | 8 taps, strength 0.8 |
| *G2:* Contact shadows | up to 6, base 0.4 | up to 12, base 0.5 |

Every effect in the DESIGN.md High row is on in High: dynamic lights, light shafts, caustics, depth fog, glow, water distortion and particles.

Cut from High so far: the phone renders at 2× instead of its native 3×. Colin reported a steady 60 fps on the milestone 0 scene in both presets. Milestone 1 adds much heavier effects, so 2× stays until Colin reports the new frame rate. If it holds 60 on the phone, try raising High to 3×.

## Done

### Milestone 0: Setup
- `DESIGN.md` saved. The concept art screenshots are in `docs/art/`.
- Project set up with PixiJS, TypeScript and Vite (`npm run dev`, `npm run build`).
- GitHub Actions workflow `.github/workflows/deploy.yml` builds the game and deploys it to GitHub Pages on every push to `main` or `claude/**` branches.
- An empty underwater scene. The water is drawn by a custom shader with a depth gradient, swaying light shafts and slow murk. Behind it are seeded procedural rock ridges with depth fog and parallax, plus a sandy seabed and drifting marine snow. The view drifts slowly sideways so the parallax shows.
- iPhone landscape: full-screen layout using the whole screen, including around the camera cutout. Page scrolling and zooming are blocked. Portrait on a phone shows a "Turn your phone sideways" message. Rendering pauses when the app is in the background.
- Home-screen install: manifest, Apple tags and an icon drawn by code (`scripts/make-icons.mjs`).
- Settings panel (gear, top right): Auto / High / Ultra buttons, plus a live frame rate, render resolution, renderer and build stamp. The build stamp shows which version the phone has loaded.
- Deploy verified: GitHub Actions run 43649689741 built and deployed to Pages successfully.
- Tested: type check and production build pass. A headless browser emulating an iPhone in landscape and a 1600×900 PC loaded the game with no errors. Presets switch at runtime (High 1468×686 → Ultra 2202×1029 on the iPhone-sized screen), and the rotate message appears in portrait. The frame rate could not be measured meaningfully here because the test browser has no real GPU. That has to be checked on the iPhone.

### Milestone 1: Water and diver (look-and-feel benchmark)
- **Feedback on milestone 0:** "looks good, steady 60 fps on both modes, the sun rays look pretty." Nothing was flagged to fix.
- **The scene** is a small hand-laid test area, about 48 m wide and 15 m deep (`src/world/terrain.ts`). Left to right: sunny sandy shallows with kelp, coral and a rock outcrop; a weathered survey beacon (`KESTREL SURVEY 03`) with a blinking red lamp at the top of a drop-off; deeper water below; and a rock ledge whose underside forms a dark grotto. The grotto has glowing anemones and three glowfins. It is test scenery for judging the look, not the real shallows zone, which comes in milestone 2.
- **The explorer** (`src/actors/diver.ts`) is drawn with code. They wear an orange suit with steel fittings, a yellow tank stencilled K7 and a dome helmet with a headlamp, and the suit has rivets, panel seams, scratches, rust streaks and algae specks. The hips, knees, ankles, shoulders and elbows are jointed, so the diver flutter-kicks faster with speed and sculls with their arms when floating still. The body tilts with the swim direction and turns around smoothly. Bubbles rise from the helmet with each breath, faster while boosting. The diver slides along rock and sand instead of sticking, and stops at the surface.
- **Controls** (`src/input.ts`):
  - Touch: a floating stick appears wherever the left thumb lands. Boost (large) and Lamp buttons sit on the right.
  - Keyboard: WASD or arrow keys, Shift or Space to boost, L or F for the lamp.
  - Mouse: hold the left button to swim towards the pointer; right-click boosts.
  - Gamepad: left stick, A to boost, X or Y for the lamp.
- **Camera:** follows the diver smoothly, looking ahead in the swim direction. The view always shows the same world height (560 at first, 640 since follow-up 2), so the framing matches on phone, iPad and PC.
- **Effects:**
  - *Lighting* (`src/fx/lighting.ts`): sand, rock, plants and the diver are drawn into an off-screen picture, then lit by one shader. It handles depth-tinted sunlight (warm tones fade first), baked soft shadows under rock, animated caustics, up to 8/12 dynamic lights, visible light beams in the water, a water-distortion wobble, depth fog and the Ultra diver shadow.
  - *Dynamic lights:* the headlamp cone, the beacon flash, the glowfin lures and the anemones.
  - *Water* (`src/scene/water.ts`): the depth colour, swaying light shafts that rock blocks, and the rippling underside of the surface when you swim up to it.
  - *Glow:* shining parts are drawn crisp, plus a blurred copy added on top.
  - *Particles:* marine snow drifts with camera parallax and dims with depth. Bubbles and kelp sway; the kelp leans away when the diver brushes through it.
  - *Parallax:* distant ridges move with the camera in both directions and take the water colour of the current depth. Dark foreground kelp passes in front.
  - *Vignette:* a soft edge darkening.
- **Colour rule kept:** cyan, violet and magenta glow is reserved for the Choir, so all bioluminescence here is warm yellow-green or pale yellow, and the beacon is red.
- **HUD:** a depth meter (top left) and a first-time controls hint that fades once you start swimming.
- Tested:
  - Type check and production build pass.
  - A headless browser emulating an iPhone 15 Pro in landscape and a 1280×720 PC rendered the shallows, outcrop, beacon, surface, ledge and grotto with no console errors. The lamp on and off states were checked too.
  - A simulated touch drag on the left half moves the diver. The Lamp button toggles the lamp. Switching presets at runtime works (High 1468×686, Ultra 2202×1029 on the iPhone-sized screen).
  - The frame rate could not be measured, because the test browser draws in software. Colin needs to check it on the iPhone.
- Rendering pipeline notes for future sessions:
  - `src/main.ts` explains the draw order.
  - Anything that should be lit goes into `litCam`.
  - Anything that should shine goes into `emissiveCam` (sharp) and `glowCam` (soft halo), with a matching entry in the lights list.

### Milestone 1 follow-up: Colin's feedback and new explorer suit
- **Feedback:**
  - Controls work perfectly. Rippling, sun rays, leaning kelp, the beacon and the fish are all good.
  - The frame rate drops to the mid 30s on High with the lamp on in the deep area. Colin is OK with that: **do not lower the graphics, but do not raise them either** (High stays at 2× for now).
  - He wants a dive-watch-style gauge eventually; it is noted in DESIGN.md.
  - He asked for the explorer to be redesigned with heavier inspiration from his childhood toy divers (photos shared in chat, not stored in the repo).
- **New suit** (`src/actors/diver.ts`; DESIGN.md Art direction has the written direction):
  - A swept tinted lime-glass helmet with a crest fin and the face visible inside.
  - A chrome collar yoke with a coiled hose to a round chest regulator port.
  - Grey sleeves, a charcoal suit with brass etching, and rust-red gloves, belt and straps.
  - A chrome back unit with a bolted port and a vent grille.
  - The headlamp is clamped under the crest. Bubbles now come from the chest regulator.
- Tested: type check and build pass. Close-up renders of the diver idle, swimming and in the dark grotto (lamp on) show no console errors.

### Milestone 1 follow-up 2: head, proportions and camera
- **Feedback:** the frame rate is still fine. The head looked like a goldfish from the side and was too small inside the helmet. The diver could be a little shorter, and the view will need to zoom out for base building anyway.
- **Head:** a proper side profile (brow, nose, lips, chin, jaw, ear, hair, shading) that fills most of the helmet. The round mouthpiece is gone; the full-face helmet does not need one.
- **Shorter, stockier build:**
  - Thighs, shins, fins, upper arms and forearms are shorter, and the torso is about 12% shorter.
  - The helmet stays full size, so it reads a little larger relative to the body.
  - Diver scale went from 0.82 to 0.86.
- **Lamp moved off the head:** at Colin's request, the dive lamp is now a chrome canister strapped to the harness on the near shoulder, under the helmet (`buildShoulderLamp` in `src/actors/diver.ts`). The beam starts there and aims slightly down.
- **Face and neck (follow-up 3):** Colin said the area under the jaw looked like a neck brace or double chin. It was a wide block of skin running from the jaw to the helmet bottom. Now there is a jaw line rising to the ear, a slim shaded neck, and the suit's dark rubber neck seal with a metal ring in the bottom of the helmet. Extra realism: an eyelid, a nostril, the line from nose to mouth, a cheekbone highlight, a shaped ear and hair strands.
- **Raised back cowl (follow-up 3):** like the metal rising behind the head on Colin's reference figure, the chrome back unit now sweeps up into a cowl behind the helmet. It has vent ribs, a small port, rivets and the coupling where the coiled hose comes out. The rear port on the back unit became a bolted hatch, so no round "eyes" show.
- **Camera zoomed out:** the view now shows 640 world units of height instead of 560 (`VIEW_H` in `src/main.ts`), which leaves room for base pieces later. Change that one number to zoom in or out.

### Milestone 2: Shallows
- **Feedback on the last build:** Colin approved the redesigned explorer suit, so milestone 1 is closed. Nothing else was flagged.
- **The zone** (`src/world/terrain.ts`, `src/world/scenery.ts`) is about 120 m wide and up to 14 m deep. The milestone 1 test scene grew into it; its outcrop, beacon, drop-off, ledge, grotto and glowfins are all still there, moved east. Left to right:
  - West rock wall.
  - **Kestrel site:** flat sand under an orange-red marker buoy, with a weighted crate on the seabed. This is where the diver starts and where the base will go in milestone 3.
  - **Coral garden:** two rock outcrops, dense coral, kelp groves, an old anchor and a school of silverbar fish.
  - **Sand channel:** the wreck of an old survey sled ("SLED 2") with scrap metal scattered around it.
  - **Rocky knoll:** the survey beacon stands on its edge.
  - **Drop-off, ledge and grotto:** from milestone 1.
  - **Seagrass meadow:** on a plateau, with swaying grass, a second fish school and a narrow crevice.
  - **East cliff:** a cave mouth that goes pitch black a few metres in. This is the gear gate to the kelp forest and caves zone. The diver can go in a little, then a message explains that a proper dive light is needed.
- **Culling:** the art is cut into 1000-unit slices, and only slices near the camera are drawn, so the bigger world costs about the same per frame as the milestone 1 scene. The world is also rebuilt from the same seed when you switch presets, so it no longer reshuffles. That was a small milestone 1 bug.
- **Oxygen** (`src/main.ts`, `src/game/state.ts`):
  - The starting tank holds 75 s. It drains 1 s per second underwater, and 1.8 while boosting.
  - Breathing at the surface refills it in about 3 s, anywhere.
  - Below 25%: a warning message, then a red pulsing screen edge that grows as the oxygen runs out.
  - At zero the diver blacks out. The screen fades to black and the diver wakes at the Kestrel buoy with a full tank. Everything carried drops in a **sample bag** on the seabed where they fell. The bag has a blinking amber lamp, and an arrow at the screen edge shows its direction and distance. Swim into the bag to get everything back. A second blackout before recovering it merges both into one bag.
  - When the base exists (milestone 3), the respawn point should move to the dome habitat.
- **Air tank upgrades:** two hidden yellow spare cylinders, each worth +20 s for good. One is in the back of the grotto, the other at the bottom of the meadow crevice. Each has a faint warm glow and a twinkle.
- **Dive watch** (`src/ui/watch.ts`, top left; Colin's request): a steel case and a dark bezel with minute marks.
  - The bezel ring is the oxygen gauge. Pale lume when full, amber below 35%, pulsing red below 15%.
  - The dial shows depth in metres, dive time since leaving the surface ("SURFACE" while breathing) and seconds of oxygen left.
  - A lume dot circles the dial once a minute.
- **Materials** (`src/world/pickups.ts`): 39 fixed spots, about ten each of scrap metal (wrecks), copper nodules (sand), quartz (on rock) and kelp fibre (golden holdfast tufts).
  - Swim into one to collect it. Each twinkles every few seconds so it can be spotted.
  - Collected spots grow back after 6 minutes (real time), so the base will never run short.
  - Counts show as small chips beside the watch.
  - There is no storage yet, so everything is carried, and a blackout drops it all. The storage pod in milestone 3 changes that.
- **Scanner** (`src/game/scanner.ts`): hold **Scan** (touch button above Boost; E or Q on keyboard; B on gamepad) near something not yet in the log.
  - Amber brackets frame the target, and a label says "Unknown creature / plant / wreckage / place". Holding sends an amber beam from the shoulder lamp and fills a ring. It takes 1.4 s.
  - There are 12 log entries: silverbar, glowfin, lantern anemone, ribbon kelp, branch coral, sea fan, seagrass, the Kestrel site marker, the old anchor, the survey sled wreck, survey beacon 03 and the dark cave mouth.
  - The sled entry mentions a dive light design for the Lab (milestone 6), and the beacon entry hints at the lights rising from the deep.
  - The scanner is amber, never cyan, violet or magenta, which stay reserved for the Choir.
- **Scanner log** (book button, top right): every entry, with "Unknown" until scanned, plus carried materials with what they are for and air tanks found.
- **Saving** (`src/game/state.ts`): automatic, on this device (localStorage).
  - It saves every 5 s, straight after each scan, pickup or blackout, and when the app goes to the background or closes.
  - Saved: position, oxygen, lamp, materials, scans, air tanks, which spots are regrowing, the dropped bag and play time. Reopening puts you back where you were.
  - Settings shows "Saved on this device: N s ago" and a **Start over** button that needs two taps.
  - Save codes for moving between devices are still planned for milestone 11, as DESIGN.md says.
- Tested:
  - Type check and production build pass.
  - A headless browser emulating an iPhone 15 Pro in landscape, and a 1280×720 PC, rendered every area of the zone. The only console messages were the test browser's own graphics driver notes.
  - Scripted checks:
    - Scanning the beacon records it.
    - Swimming onto scrap adds 1.
    - Draining the oxygen blacks out and respawns the diver at the buoy, with the carried quartz in a bag at the grotto floor.
    - After a reload, the scan, the bag and the position are all still there. The bag arrow points the right way.
    - The log opens.
  - The frame rate could not be measured, because the test browser draws in software.
- Deployed: GitHub Actions run 43675143107 built and deployed to Pages successfully from `claude/build-next-milestone-2lynhu`. This branch still needs merging into the default branch `claude/underwater-game-m0-0qqajg` so that branch stays current (a session can only push to its own branch).

### Milestone 2 follow-up: Colin's feedback
- **Feedback:** Colin likes the progress. He asked for four changes:
  - an animation for coming up for air;
  - friction when collecting, instead of just swimming over things;
  - materials should not regrow when you die (dying, recovering the bag and dying again had become the fastest way to farm);
  - a way to see the name of something already scanned, without filling the screen with text.
- **Surfacing** (`src/actors/diver.ts`, `src/fx/surface.ts`):
  - **The breach:** swimming up into the surface tips the diver upright, treading water, with the whole helmet out of the water. A fast ascent makes them pop up higher, overshoot and settle.
  - **The splash:** droplets are thrown up and fall back in, and foam rings spread across the surface. Its size depends on how fast you came up.
  - **Breathing:** the first breath is a big gasp, with the chest heaving and the head tipping back. After that come calmer, slower breaths. Each breath out leaves a puff of vapour above the water and fogs the inside of the visor, which then clears. Water drops run off the glass after the breach.
  - **At the surface:** small ripples spread while treading water, and a waterline is drawn across the suit where it enters the water.
  - **Diving back:** push down to duck under, with a small splash.
  - **Air:** oxygen starts refilling with that first breath, not on touching the surface. Bubbles only come out underwater.
  - **Sky:** the water shader now fades into hazy daylight air above the surface, and the lighting skips underwater caustics, wobble and fog on anything above the waterline. The camera shows a little more sky at the surface, so the splash fits.
- **Collecting takes work** (`src/world/pickups.ts`):
  - Swimming over a material no longer picks it up. Stop next to one and a dashed ring marks it. A **Collect** button appears (touch; C or R on keyboard; X on gamepad) with what the job is.
  - Hold the button while staying nearly still (under 70 units/s): the diver turns to the spot and works it with the near arm. Kelp fibre takes 1.6 s to cut, scrap 2.2 s to pry loose, copper 2.6 s to dig out and quartz 3.0 s to chip off.
  - Effects while working: chips fly, sand clouds puff out of copper digs, and sparks come off scrap and quartz. A ring fills around the material and on the button.
  - Letting go keeps the progress for a moment, then it slips back.
  - Working uses air faster (1.3×), so collecting deep costs real dive time.
  - Air tanks and the dropped bag are still picked up by touch.
  - Gamepad lamp moved to Y only, because X is now Collect.
- **Regrow timer fixed** (`src/game/state.ts`):
  - Regrowth now counts **6 minutes of play time**, stored in the save, instead of the real-world clock.
  - Blackouts, recovering the bag and closing the app never make anything grow back sooner. Waiting with the app closed no longer refills the reef either.
  - Older saves' timers restart from now.
  - In testing, the old build also kept collected spots gone after a blackout, so the regrowth Colin saw was most likely the 6-minute real-time clock running out during a long session, or untouched spots near the buoy. Either way the play-time timer closes the loophole. If it still happens, the exact steps would help.
- **Quick ID** (`src/main.ts`, `src/ui/hud.ts`):
  - **Tap** Scan (or tap E / B) and an amber ring sweeps out from the diver.
  - For 6 seconds, small name tags appear over the nearby things you have **already scanned**: up to 8, at most 2 of each kind, never overlapping each other, the diver or the buttons. Only the closest one also shows the first line of its log entry.
  - Holding Scan still scans new things as before.
- Tested:
  - Type check and production build pass.
  - In the emulated iPhone, scripted checks:
    - A fast ascent surfaces the diver with a splash, ripples and a head-out pose, and refills oxygen to full.
    - Parked by a copper nodule, the Collect label reads "Dig out copper nodule", and holding C collects exactly one.
    - After a forced blackout, that spot stays taken in the save and hidden on screen.
    - A tap of E shows name tags for scanned kinds, with the closest one expanded.
  - No console errors.

### Milestone 3: Base building
- **Feedback on the last build:** "Everything looks good." Nothing was flagged, so this session went straight to milestone 3.
- **Build mode** (`src/ui/build.ts`):
  - A **Build** button (hammer, top right) appears when the diver is at the Kestrel site, the sand around the buoy. Keyboard B, gamepad View/Back. A one-time tip points it out on arrival.
  - The camera zooms out (`VIEW_H_BUILD` = 860 in `src/main.ts`) to show the whole site, with faint grid marks. The swim buttons hide, and the air clock pauses while you plan.
  - The bar along the bottom has the four pieces, each with a small drawing and what it costs: what you have / what it needs, in red if short. Costs come out of carried materials first, then storage.
  - Tap a piece and a ghost of it appears at the **nearest spot where it fits**. Drag anywhere to slide it (it moves by how far your finger moves, so your finger never covers it), or tap where you want it. It snaps cell by cell. Pale green outline = fits; red = it doesn't, with the reason above. Collars that will join light up.
  - **✓** builds it. The piece fades in with welding sparks, and stays in hand for the next one while you can afford it. **⟲** rotates the corridor. **✕** puts the piece back, then closes build mode.
  - With no piece in hand, tap a built piece to select it (marching outline, its job and power state). **Remove** (tap twice) takes it away and returns all its materials as carried.
  - Keyboard: 1–4 pick, arrows/WASD move, R rotate, Enter/Space build, Esc let go/close, Tab select, Delete/X remove. Mouse: the piece follows the pointer, click builds, right-click lets go. Gamepad: LB/RB pick, d-pad or stick move, A build, Y rotate, B let go/close, X remove.
- **The rules** (`src/game/base.ts`):
  - The site grid is 11 cells wide and 3 high; a cell is 112 units (1.5 m). The bottom of the grid sits just above the highest sand, and pieces on legs reach down to the seabed.
  - Pieces snap at **connector collars**. The first piece goes on the seabed; after that, a new piece must line one of its collars up with an open collar on the base. Open collars pulse with amber chevrons in build mode.
  - **Power:** a current turbine powers every piece joined to it through collars (directly or through corridors). A piece only works with power. Each piece has a status lamp: steady pale green with power, slow red blink without.

| Piece | Size (cells) | Collars | Cost | Job |
| --- | --- | --- | --- | --- |
| Dome habitat | 2 × 2 | left, right (bottom row) | 3 scrap, 4 quartz, 2 kelp fibre | Swim inside to breathe station air (refills oxygen like the surface) and save. After a blackout you wake inside it instead of at the buoy. |
| Corridor | 1 × 1 | left/right, or up/down when rotated | 2 scrap, 1 kelp fibre | Joins pieces and extends the base; rotated, it climbs to a higher row |
| Current turbine | 1 × 2 | left, right (bottom) | 2 scrap, 4 copper, 1 kelp fibre | Powers every piece joined to it |
| Storage pod | 1 × 1 | all four sides | 3 scrap, 1 copper, 1 kelp fibre | Swim up to it to unload everything carried. Holds 40 items per pod. Stored items are safe from blackouts. |

  - A starter base (dome, turbine, corridor, storage pod) costs 10 scrap, 5 copper, 4 quartz and 5 kelp fibre. The shallows have 10 scrap spots, so the first base takes a full sweep of the zone (or waiting for regrowth).
- **The look** (`src/world/basegfx.ts`), all drawn by code in the art direction's palette: weathered steel, muted Kestrel yellow and rust red, rivets, panel seams, faded hazard stripes, stencils (`KESTREL HAB-01`, `CT-1`, `STORE 01`, `C-01`), rust streaks, scratches and algae.
  - **Dome habitat:** a riveted drum with brass portholes under a ribbed glass dome. Inside are a console with screens, a chair, a bunk, a kelp jar and a hanging lamp. With power the interior glows warm and casts a real light on the surroundings. The glass sheen is drawn *over* the diver, so they look like they are inside.
  - **Current turbine:** a yellow machine house with cooling fins and a lit readout, a mast with a copper cable, and a three-blade rotor in a ducted ring that turns in the current.
  - **Storage pod:** an upright capsule with a hatch wheel and an amber fill gauge that rises as the base's storage fills.
  - **Corridor:** a ribbed tube with a yellow band and a porthole that lights with power.
  - **Collars:** joined collars are bolted flanges; open ones carry a rust-red blanking cap. Collars facing down into the seabed are sealed flush.
  - **Legs:** steel legs with cross-bracing and foot pads sunk into the sand, reaching to the seabed or to the piece below.
- **Other changes:**
  - The material chips by the watch show stored amounts as a small amber **+N** beside what is carried.
  - The scanner log now has a **Materials** section (carried and stored) and an **Outpost Kestrel** section listing what is built.
  - An unpowered dome shows a message explaining it needs a turbine; an unpowered storage pod says so when you try to unload.
  - The low-oxygen warning mentions the dome once one has power.
  - The save keeps the pieces, stored materials and shown tips. Older saves load with an empty base.
- Tested:
  - Type check and production build pass.
  - Emulated iPhone 15 Pro (landscape), scripted:
    - Building a dome, turbine, corridor and storage pod from the bottom bar. All four powered; costs deducted correctly.
    - A corridor dragged to a spot with no matching collar shows red, "Line up a collar with an open collar on the base", and the ✓ is disabled.
    - Swimming to the pod moved everything carried into storage.
    - Inside the powered dome, oxygen refilled and the "breathing station air" message showed.
    - Blacking out far away woke the diver inside the dome. Stored materials were kept; carried ones dropped in the bag as before.
    - After a reload, all four pieces were back and powered.
    - Removing the turbine returned its materials and cut power to the other three.
  - 1280×720 PC with the keyboard: B, 1/3/2/4 and Enter built the same base; R rotated a corridor, which snapped onto the storage pod's top collar.
  - No console errors. The frame rate could not be measured, because the test browser draws in software.
- Deployed: GitHub Actions run 43717650882 built and deployed to Pages successfully from `claude/next-milestone-build-deploy-zelm64`. This branch still needs merging into the default branch `claude/underwater-game-m0-0qqajg`.

### Milestone 3 follow-up: build drone and dive bag weight
- **Feedback on the last build:** "I'm happy with the progress so far. Let's keep going." Nothing was flagged. This session built the follow-up Colin scheduled after milestone 3 (DESIGN.md, The base).
- **The build drone** (`src/actors/drone.ts`):
  - **The look:** a small Kestrel construction robot, all drawn by code. It has a weathered yellow hull with a steel belly, a ducted lift fan on top, a rear thruster, an amber sensor eye, a red antenna lamp, the stencil `KD-1`, hazard stripes, rust and algae. A folding arm under the belly holds a welding torch.
  - **Finding it:** it is stuck in the survey sled wreck in the sand channel, tangled in old cable, battery flat. Its eye flickers faintly every few seconds so it can be spotted. It is also a new scanner log entry (13 entries now).
  - **Repairing it:** stop next to it and the Collect button reads **Repair build drone**. Hold it for 4 s. It costs **2 scrap, 1 copper, 1 kelp fibre** (carried first, then stored). Without them, the label says exactly what is missing. All of these lie within a short swim of the sled. When it is fixed, the drone shakes off the cable, its eye flickers on and it lifts off.
  - **Following:** it trails the diver from about half a second behind, a little above and behind, so it stays in open water. After a blackout it comes back with the diver.
  - **Building needs the drone.** Build mode still opens so you can plan, but ✓ is disabled until the drone is repaired, and the info line says where it is.
  - **Frames:** ✓ now places a **frame**. Materials are paid straight away. The drone flies over and welds it from the bottom up: a steel scaffold stands around the piece, the finished hull appears as the weld line rises, and there is a hot seam line, a flickering torch light and sparks. Build times (`buildTime` in `PIECES`, `src/game/base.ts`): **corridor 10 s, storage pod 18 s, turbine 28 s, dome 40 s**.
  - **Swim off meanwhile.** Several frames can be placed; the drone works through them oldest first. A frame does nothing until it is finished: no power, no air, no storage, and it does not pass power on. Its status lamp pulses amber. A toast says when each piece is finished.
  - If the diver is far away when it finishes, the drone hovers over the base and rejoins the diver when they come back.
  - Build mode: the piece cards show the build time. Tapping a frame shows "Drone welding: 63% · about 15 s left" or "Waiting for the drone". Removing a frame returns all its materials.
  - **Removing a piece** now puts its materials back into storage first (while there is room), so the dive bag doesn't suddenly become very heavy.
  - Old saves keep everything already built. Their drone still has to be found and repaired before anything new can be built.
- **Dive bag weight** (`src/game/state.ts`, `src/actors/diver.ts`):
  - Each material weighs something: **copper 3 kg, scrap 2.5 kg, quartz 1.5 kg, kelp fibre 0.5 kg.**
  - Up to **15 kg** (the rated load) the effects are mild. They grow smoothly with weight:
    - slower swimming (−22% at 15 kg, up to −35% when full);
    - an extra slowdown going up;
    - a weaker boost;
    - a slow sink when not swimming (about 0.4 m/s at 15 kg);
    - faster air use (+20% at 15 kg, +32% when full).
  - There is no sinking while treading water at the surface, while collecting or inside a dome. Nothing about it can suddenly drown you.
  - At **24 kg** the bag is full. The Collect button says "Dive bag full: unload at a storage pod", and holding it does nothing.
  - A starter base weighs about 48 kg in materials, so it takes two or three trips. Each single piece fits in one load.
  - **On the dive watch:** a short arc along the bottom of the dial fills with the weight. It has a tick at 15 kg and turns amber past it, red when full. The kg readout replaces the word KESTREL while anything is carried.
  - **On the diver:** a mesh bag clipped to the belt swells as it fills, and the diver kicks harder when heavy.
  - One-time messages explain it the first time the bag gets heavy, then a short "Dive bag heavy" or "Dive bag full".
  - The scanner log shows the bag weight and each material's weight.
- **Hooks for later upgrades:**
  - `bagLimits()` in `src/game/state.ts` returns the rated and full load. A lift bag, buoyancy vest, the drone carrying loads or the sub's cargo bay just raise these.
  - `droneWeldRate()` sets the welding speed (a faster torch). A second drone would be a second `Drone` taking the next frame from `layout.frames()`.
- Tested:
  - Type check and production build pass.
  - Emulated iPhone 15 Pro (landscape), scripted:
    - Next to the stranded drone with no materials, the Collect label lists what is missing and holding it gives a warning.
    - With the parts, holding Collect repaired it, took 2 scrap, 1 copper and 1 fibre, and the drone woke up and followed the diver.
    - With a 21 kg bag the diver sank slowly when idle and the watch showed the weight.
    - In build mode, ✓ placed a dome and a turbine as frames (materials paid). The drone flew to the dome and welded it, then the turbine. Once both were finished, both had power.
    - After a reload, the repaired drone, finished pieces and a half-welded corridor frame were all restored, and the drone went back to the frame.
  - The test browser draws in software and runs the game at about one sixth speed, so the real welding times and the frame rate have to be checked on the phone. No console errors.
- Deployed: GitHub Actions run 43727209174 built and deployed to Pages successfully from `claude/next-milestone-build-deploy-ikoapi`. This branch (which also carries milestone 3) still needs merging into the default branch `claude/underwater-game-m0-0qqajg`.

### Milestone 3 follow-up 2: a smaller, cuter drone that holds still
- **Feedback:** the numbers (weights, build times) feel good; tune later for difficulty. But:
  - the drone flickered left and right whenever the diver was still or treading water at the surface;
  - it was too big;
  - Colin wanted a cuter helper with more personality, shown through animation;
  - it should start small, so finds in later biomes can upgrade it (and the diver) without filling the screen.
- **Jitter fixed** (`src/actors/drone.ts`, `src/main.ts`):
  - The cause: with the diver not moving, the game guessed the diver's facing from which side the drone was on. The drone then aimed for the spot "behind" the diver, on the other side, which flipped the guess, and so on. A "don't crowd the diver" push made it worse.
  - Now it uses the diver's real facing. It only moves behind the diver while they actually swim (faster than 70 units/s). When they stop, it keeps to whichever side it is on.
  - It turns only with clear travel, or after a 28-unit dead zone towards what it is looking at, and it settles firmly near its target.
  - Checked in the emulated iPhone: still at the surface and still underwater, it drifts 1–2 units and never turns around (10 s sampled each).
- **New look, about half the size** (roughly a third of the diver's length):
  - a small squat Kestrel-yellow hull with a steel belly;
  - a big glass dome "head" (the signature dome shape) with a dark camera ball inside and one large amber lens as its eye;
  - two little ducted fans sticking out at the sides like ears;
  - a springy antenna with a red tip lamp;
  - a tiny folding welding arm.
  - Still weathered: rivets, scratches, rust and algae.
- **Personality animations:**
  - the eye rolls inside the dome to look at the diver, or at the weld while working, and blinks every few seconds;
  - it tilts its head towards what it is looking at;
  - the antenna wobbles on a spring whenever it speeds up or stops;
  - a **happy hop with a full roll**, its eye squinting into a smile, when you collect a material, scan something new, find an air tank, finish a piece, and right after it is repaired;
  - when you stay still for a few seconds it glances around, curious;
  - parked alone over the base, its eye droops half closed.
  - All of these are in `src/actors/drone.ts`. `cheer()` triggers the hop, so future events can use it too.
- **Room to grow:** drone upgrades from later biomes can add visible parts (bigger fans, a second arm, a cargo clamp) to this small base design.
- Tested: type check and build pass. Close-ups of the new drone idle, mid-roll and smiling, plus the jitter measurements above. No console errors.

### Milestone 4: Creatures
- **Feedback on the last build:** going well. Colin gave creature direction rather than fixes: be creative; creatures in the first biomes should be **cuter (no teeth) but visually interesting**, and get **scarier deeper down, with more bioluminescence and fear-based elements**. Nothing was flagged as broken. The direction is recorded in DESIGN.md (Art direction, "Creatures get scarier with depth"), with a mood for each zone so later milestones follow it.
- **Three keepable shallows creatures** (`src/actors/critters.ts`), all drawn by code: round and soft, big friendly eyes with catchlights, closed smiles, no teeth, bold patterns and small warm glows. No cyan, violet or magenta (still kept for the Choir), so the concept art's lavender jelly became peach.
  - **Glowfin:** a rounder striped fish with a big eye, a little blush and a glowing lure. Grown ones also show a row of lume dots. The wild grotto glowfins got the same big eye and a soft rounded dorsal fin instead of spikes.
  - **Puffcap:** a small peach jelly with a frilled rim, glowing polka dots, two dark eye spots that read as a face, curly tentacles and two frilly ribbons. It pulses and rises with each squeeze.
  - **Dapple ray:** a palm-sized sandy ray with dark dapples ringed in cream, big eyes on little bumps, rippling wing edges and a tail with a tiny glowing tip. It glides low and sometimes rests on the sand.
  - **Glowfin egg clutch:** see-through eggs, each with a curled fry and a dot of an eye, glowing faintly.
- **Where they live** (`src/world/wildlife.ts`, fixed spots):
  - Two glowfin egg clutches on the grotto floor, each with a faint glow.
  - Three big adult puffcaps and two young ones over the drop-off.
  - One adult dapple ray and two young ones over the seagrass meadow.
  - Adults are too big for the jar but can be scanned. **Two new scanner entries:** Puffcap and Dapple ray (15 in total). Each entry says what the creature likes.
- **Collecting: the specimen jar.**
  - Stop next to a young creature or an egg clutch. The Collect button reads "Coax young puffcap into jar" (or similar). Hold it while keeping still: the creature calms and drifts over to you, and a ring fills (2.6 s, eggs 2 s).
  - **You must scan the species first** ("Unknown creature: scan it first"), so you know how to keep it. Glowfin eggs need the glowfin scanned.
  - Boosting nearby startles young ones: they dart off for a few seconds.
  - The jar holds one creature. A chip under the dive watch shows what is in it.
  - A collected spot fills again after 6 minutes of play, like materials.
  - Blacking out with a wild creature in the jar lets it swim home. One taken out of a tank goes back into its tank.
- **Two new base pieces** (`src/game/base.ts`, drawn in `src/world/basegfx.ts`), using the same collar and power rules as before:

| Piece | Size (cells) | Collars | Cost | Build time | Job |
| --- | --- | --- | --- | --- | --- |
| Creature tank | 2 × 1 | left, right | 2 scrap, 3 quartz, 1 kelp fibre | 24 s | Holds up to 4 creatures. A long glass tank with a riveted frame, rust-red rails, sand, a rock and a lamp strip that lights with power. |
| Filter pump | 1 × 1 | left, right, up | 2 scrap, 2 copper, 2 kelp fibre | 16 s | Keeps the water clean in the nearest 2 tanks joined to it. A drum with an impeller behind a grille (it spins only with power), a gauge and an intake pipe. |

  - Swim up to a finished tank with something in the jar and it goes in automatically.
  - A tank with creatures in it can't be removed in build mode until they are moved or released.
- **Tank care** (`src/ui/care.ts`), laid out like the "Tank care on phone" concept board:
  - At a tank, a **Tend** button appears (top right; keyboard T). The camera zooms in on the tank, the diver and drone fade out of the way, the air clock pauses, and a panel opens on the right.
  - The panel has a tab for each creature, a one-line status (for example "Hungry. Lantern is dimming."), three bars (**Fed, Comfort, Water quality**) and a ✓ / ✗ list of what helps or hurts its comfort. The selected creature has a ring around it in the tank.
  - **Feed kelp flakes** costs 1 kelp fibre and feeds the whole tank. Flakes sink and the creatures swim to eat them.
  - **Clean tank** scrubs the water clean (+40%), with bubbles.
  - **Plant** one plant per tank: branch coral (1 quartz), ribbon kelp or seagrass (1 kelp fibre each). Each must be scanned on the reef first.
  - **To jar** moves a creature to another tank (it keeps its needs and growth). **Release** (tap twice) sends it home.
  - Inside the tank: murk and an algae film build up as the water gets dirty; sick creatures turn pale, slow down and sink.
- **The rules** (`src/game/creatures.ts`). Every number is one constant at the top of the file. Everything runs on play time, so closing the app never starves anything.
  - **Fed:** full to empty in 15 minutes. One feed adds 60%.
  - **Water:** each creature dirties its tank (1 alone takes 20 minutes, 4 take 5). A powered filter pump cleans far faster than that.
  - **Comfort** starts at 50%, then:
    - +30% with its favourite plant: glowfin likes branch coral, puffcap ribbon kelp, dapple ray seagrass;
    - +20% with the right company: glowfins like another glowfin, rays like any tank-mate, puffcaps like space (at most one tank-mate);
    - −40% if a puffcap shares a tank with a glowfin (its threads sting);
    - −40% if the tank has no power;
    - −10% for each creature over 3.
    - The bar drifts towards that value over about a minute.
  - **Growing:** with all three needs at 60% or more, a young creature is grown after 8 minutes. Grown ones are bigger and glow brighter. Eggs hatch after 90 s in any tank.
  - **Payoff:** a grown, happy creature puts 1 material into storage every 4 minutes. Rays turn up copper, puffcaps shed kelp fibre, glowfins leave quartz. Brightness shows how well kept a creature is.
  - **Sickness:** if any need drops below 25%, it gets sick (a warning message, pale and slow). It recovers once fixed. After 6 minutes sick it goes **dormant**: its remains are kept in storage (listed in the scanner log) until the Revival pool from DESIGN.md is found. From a single feed, neglect takes roughly 17 minutes of play to lose a creature.
- **Scanner log:** a new **Creatures** section lists each kept creature with its status, what is in the jar and any dormant remains.
- **Build bar:** now six pieces. Cards shrink to fit the phone, and on short screens their drawings hide. Keyboard 1–6.
- Tested:
  - Type check and production build pass.
  - Emulated iPhone 15 Pro in landscape, scripted:
    - Holding C next to the young puffcap put it in the jar (jar chip shown). Swimming to the tank put it in tank 1.
    - In the care panel, planting ribbon kelp took 1 fibre, and feeding took 1 fibre and raised Fed.
    - 20 simulated minutes without care: the puffcap got sick, then went dormant (1 dormant puffcap recorded).
    - Eggs hatched. A fed young ray with seagrass and a tank-mate grew up and stored 4 copper. A lone glowfin in a seagrass tank stayed unsettled and did not grow, as the rules say.
    - Blacking out with a young ray in the jar woke the diver in the dome, and the ray swam home (its spot refilled at once).
  - Screenshots of the puffcaps, the meadow rays, the grotto eggs, the tank with creatures, and the care panel.
  - No console errors. The frame rate could not be measured, because the test browser draws in software.
- Deployed: GitHub Actions run 43732834582 built and deployed to Pages successfully from `claude/creature-design-milestone-806kjd`. This branch was started from the default branch `claude/underwater-game-m0-0qqajg` (after PR #2 merged), so merging it back is a clean fast-forward.

### Milestone 4 follow-up: scarcer materials
- **Feedback:** Colin likes that grown creatures put materials into storage ("a clever way of rewarding the player for collecting different animal specimens"). He has more materials than he needs, and asked for scarcer reef materials so creatures and automatic production feel more rewarding. He also proposed a larger direction (one main base that grows all game, factory-style automation with creatures as resource nodes, an auto feeder around the second biome, faster travel home, a much bigger build area). That is recorded in DESIGN.md under The base; nothing of it is built yet.
- **Changes:**
  - Material spots cut from 39 to 28 (`src/world/pickups.ts`): scrap 10 → 8, copper 10 → 7, quartz 10 → 7, kelp fibre 9 → 6. The spots kept are the ones near landmarks (the sled wreck, the grotto, the coral garden), so the shallows still teach where each material lives.
  - Regrowth after collecting: 6 → **10 minutes** of play (`REGROW_SECONDS` in `src/game/state.ts`). Wild creature spots use the same timer.
  - Creature production is unchanged (one material every 4 minutes per grown, happy creature), so it now covers a larger share of what the base needs. Puffcaps make kelp fibre, which the feeding uses, so a puffcap tank partly feeds the others.
  - Scrap is now the bottleneck: no creature makes it. That fits it being salvage from wrecks, but if it feels like a grind, add scrap spots back or let a later creature or machine produce it.
- Tested: type check and build pass.

### Milestone 5, part 1: the Kestrel basin and the first production line
- **Feedback on the last build:** milestone 4 and the scarcer materials are good; Colin loves that grown creatures fill storage. He chose milestone 5 (big base and factory groundwork) before the submersible, with the decisions recorded in DESIGN.md (The base, "Milestone 5 decisions").
- **The split.** Milestone 5 is too big for one session, so it is two playable parts:
  - **Part 1 (this session):** the big basin site and build camera, conveyors and feed pipes, the auto feeder chain, creature output that scales with happy creatures and tanks, and the Echo whorl.
  - **Part 2 (next):** the first machine that combines materials into a refined one, tank output carried on conveyors (instead of going straight to storage), faster CB-2 conveyors and FL-2 pipes, and a whole-base rates overview.
- **The site** (`src/world/terrain.ts`, `src/game/base.ts`):
  - The grid grew from 11 × 3 cells to **58 × 14 cells** (87 m × 21 m). **About 680 cells are open water**, a bit over 20 times the old site. `OPEN_CELLS` in `src/game/base.ts` has the exact count.
  - West of the shelf a cliff drops into the **Kestrel basin**: a wide, flat silt floor about 22 m deep, with a steep west wall. The wall has a nook part-way up (an Echo whorl hides there). Boulders, kelp along the walls and four warm lantern anemones on the floor dress it; the middle is left clear for building.
  - The old shelf by the buoy is the **top east corner** of the grid. The rock under the shelf and the foot of the cliff can't be built in ("Solid rock here (tunnelling comes later)").
  - **Old saves keep their base where it is.** On load, pieces are shifted by 47 columns and 11 rows (the `site` field in the save marks the new layout).
  - The world now runs from x = −5600 to 9000 and is 1980 units deep. The rest of the shallows' landmarks didn't move; the plants and corals scattered between landmarks are reshuffled a little. One quartz spot moved from the old west wall to the top of the cliff.
  - Light below about 11 m now fades at a quarter of the normal rate (`depthLook` in `src/fx/shared.ts`), so the basin floor reads as deep blue rather than black. The grotto keeps its dark rock shadow.
  - New scanner entry: **Kestrel basin**.
- **Pieces stand on the seabed wherever it is:** the first piece may go on the basin floor, the shelf or the cliff, and downward collars facing rock are sealed.
- **Build camera** (`src/ui/build.ts`):
  - Opening build mode frames what you've built, with a cell or so of room around it (the shelf if nothing is built yet). The **Fit** button (top left; F on keyboard) reframes it.
  - Zoom goes from about one piece up to the whole basin.
  - Touch: drag on empty water to pan, pinch to zoom. While holding a piece, one finger still slides the piece; two fingers pan and zoom.
  - Mouse: the wheel zooms at the pointer; drag with the left button (no piece in hand) or the middle button to pan.
  - Keyboard: WASD pans, arrows move the piece (or pan with no piece), + / − or E / Q zoom.
  - Gamepad: the triggers zoom and the right stick pans.
  - A picked piece appears at the nearest valid spot to the middle of the view, and the view follows a piece you move off screen.
  - The dive watch hides in build mode, and the near kelp fades away when zoomed far out.
  - The drone parks over the middle of what's built instead of over the middle of the grid.
- **Transport** (`src/game/factory.ts` rules, `src/world/linegfx.ts` drawing). Different kinds of material move by different means:

| Line | Carries | Rate (CB-1 / FL-1) | Cost per length | Look |
| --- | --- | --- | --- | --- |
| Conveyor | solid items (kelp fibre for now; all solids later) | 6 items/min | 1 scrap per 2 cells + 1 copper per 4 cells | dark rubber belt on steel rollers, transfer boxes at bends; bundles ride along it while it runs |
| Feed pipe | fluids (feed mash now; filtered water and so on later) | 10 L/min | 1 copper per 2 cells + 1 kelp fibre per 4 cells | weathered copper with brass flanges and verdigris; pulses of mash travel down it |

  - Corridors still carry power and access.
  - **Drawing a line:** in build mode, tap a piece with an output, then **Conveyor to…** or **Pipe to…**, then tap the target. A dashed preview shows the route, length and cost, and ✓ builds it straight away (no welding).
    - Keyboard: C or P with a piece selected. Mouse: click the target.
  - **Routing:** a line leaves the top of the first piece, runs across above both pieces and drops into the top of the second. Lines from the same piece take separate lanes. The longest line is 30 cells.
  - **Port limits:** a storage pod sends up to 4 conveyors; an auto feeder takes up to 2 conveyors in and sends up to 4 pipes; a tank takes 1 pipe.
  - **Selecting a line:** tap it to see what it's moving per minute against what it can carry (for example "Moving 0.5 items/min of kelp fibre · can carry 6 items/min (8% used)"). **Remove** (two taps) refunds it.
  - Removing a piece also removes and refunds its lines. Fibre waiting in a feeder's hopper goes back to storage, and fitted whorls come off.
- **Auto feeder** (a new piece, 1 × 2 cells, card 7; drawn in `src/world/basegfx.ts`): a funnel hopper on top, a geared press drum, and a mash tank with a sight window. A copper riser carries the mash up to the pipe port. Its hopper and mash levels show live, and the gear turns while it presses.
  - **Cost and power:** 3 scrap, 3 copper and 2 quartz; 30 s to weld; it needs power.
  - **The chain:** storage pod → conveyor (kelp fibre) → auto feeder → feed pipes → creature tanks.
  - **Rate:** it presses **0.5 kelp fibre/min** into **12 L of mash each**, so it makes 6 L/min. The hopper holds 4 fibre and the mash tank 24 L.
  - **The tanks:** each tank on a feed pipe gets a 12 L **feed trough**. Its creatures eat from it whenever Fed drops below 95%. One litre fills 20% of Fed, so a creature eats about **0.33 L/min**, and one feeder keeps about 18 creatures fed.
  - **Fibre cost:** per fibre this is the same as feeding by hand (one feed of 1 fibre gives a whole tank +60%). The gain is not having to swim back.
  - **Supply:** a grown puffcap makes 0.25 fibre/min, enough to feed about nine creatures.
  - Hand feeding still works. Mash is shared out between a feeder's pipes.
  - **Readouts:** the selected feeder shows its state (running, waiting for fibre, mash tank full, no power, no conveyor) and its rates. The selected tank shows its trough, what it eats per minute and what it makes per minute. The care panel lists the feed pipe and trough level.
- **Creature output that scales** (`makeRate` in `src/game/creatures.ts`):
  - The base rate is unchanged: a grown, happy creature makes 0.25 items/min (one every 4 minutes).
  - **Shoal bonus:** +15% for each happy tank-mate.
  - **Reef bonus:** +10% for each other thriving tank (at least two grown, happy creatures), up to +50%.
  - **Echo whorls** multiply on top.
  - The care panel shows each grown creature's rate and its bonuses.
- **Echo whorl** (`src/world/whorl.ts`; pickups in `src/world/pickups.ts`):
  - **Look:** a thumb-sized spiral of pale nacre with a cold spiral thread of light and rings that pulse out from it, cyan to violet. It's the first thing in the shallows in the Choir's colours. It's an original design, not based on any other game's item.
  - **Story:** the scanner entry says no animal on record makes it, and that living things and machines near it quicken. The crew think the lights from the deep left it.
  - **Where:** two in the shallows for now. One is in the nook in the basin's west wall; the other is on the floor just inside the dark cave mouth, before the "too dark" point. Swim into one to take it (it also completes its scan).
  - **Fitting:** in build mode, select a finished creature tank or auto feeder and tap **Fit whorl** or **Take out whorl**, up to 2 per piece. Fitted whorls show on the piece and pulse.
  - **Effect:** one whorl gives ×2 output and two give ×3, and inputs go up by the same factor:
    - a tank's creatures get hungry and foul the water ×2 / ×3 as fast;
    - a feeder presses fibre ×2 / ×3 as fast.
    - A whorled tank without a feeder or a filter pump quickly gets hungry or dirty, so it only pays off with the supply to match.
  - The scanner log shows how many have been found and fitted.
- Tested:
  - Type check and production build pass.
  - Emulated iPhone 15 Pro (landscape), scripted:
    - An old milestone 4 save (dome, turbine, corridor, storage, tank and filter on the shelf, two grown creatures) loaded with every piece shifted to columns 47–54, row 11. They sat in the same place on the shelf, all powered.
    - Swam the basin floor, the west wall and the nook. Swimming into the nook whorl picked it up and scanned it.
    - In build mode, placed an auto feeder, then drew a conveyor (storage → feeder, 7 cells) and a feed pipe (feeder → tank, 9 cells) with the line buttons.
    - Ran 20 minutes of simulated play: fibre moved from storage to the hopper, the feeder pressed it, and the tank's trough filled to 12 L. Both creatures went from 49% to 97% Fed without hand feeding. With the trough and hopper full the feeder reported "mash tank full".
    - Fitted the whorl to the tank: its readout showed ×2 output and ×2 eating.
    - Selected the conveyor and saw its rate readout. After a reload the lines, the fitted whorl and the shifted base were all kept.
  - 1280×720 PC: build mode framing, zooming right out to the whole basin, and picking a dome in the middle of the basin.
  - No console errors. The frame rate couldn't be measured, because the test browser draws in software. Zoomed all the way out it draws the whole basin at once: the software test browser crashed now and then while taking screenshots (at any zoom, and at random; the same test passed when run again). To be safe, on touch screens the zoom-out stops at a view height of 2800 (still almost the whole basin width). Check the frame rate zoomed out on the phone, and on the PC (Ultra).

- Deployed: GitHub Actions run 43752369060 built and deployed to Pages successfully from `claude/great-pascal-vx5iis`. This branch was started from the default branch `claude/underwater-game-m0-0qqajg` after PR #3 merged, so merging it back is a clean fast-forward.

### Milestone 5, part 2: refining, tank output on conveyors, line tiers and rates
- **Feedback on the last build:** part 1 is coming together and Colin likes the gameplay. He skipped PC testing for now and asked to keep building.
- **Hull plating** (a fifth material, `plate` in `src/game/state.ts`): riveted plate pressed from scrap and copper. It weighs 4 kg in the dive bag, against 8 kg for the scrap and copper that go into it. It is only made by the plate press, never found on the reef. Its chip by the watch stays hidden until the base has some.
- **Plate press** (piece 8, `PP-1`; rules in `src/game/factory.ts`, drawing in `src/world/basegfx.ts`):

| Cost | Size | Build time | Recipe | Rate (×1) | Hoppers | Ports |
| --- | --- | --- | --- | --- | --- | --- |
| 4 scrap, 2 copper, 1 quartz | 2 × 1 cells, collars left and right | 34 s | 2 scrap + 1 copper → 1 hull plating | 0.5 plating/min (one stroke every 2 min), using 1 scrap + 0.5 copper/min | 6 scrap, 3 copper, a rack of 4 plates | 2 conveyors in, 2 out |

  - It needs power, and it takes Echo whorls (×2 / ×3, using inputs that much faster too).
  - **Statuses:** pressing; waiting for scrap and copper; plate rack full (no conveyor out, or storage full); no power; still a frame.
  - **Look:** a squat hydraulic press. It has a split hopper on the left with scrap and copper level windows, a yellow crossbeam on two steel columns, and a chrome ram. The ram creeps down as a plate builds, then slams with sparks. Finished plates stack on a rack on the right.
  - **Why these numbers:** the reef gives at most about 0.8 scrap/min, so the press runs on stockpiles in bursts rather than starving everything else.
- **Conveyors carry whatever the far end needs** (`Factory.tick`):
  - A storage pod sends kelp fibre to a feeder, and scrap and copper to a press. For a press it sends whichever hopper is emptiest, so the 2:1 ratio holds.
  - A tank or press can send to a storage pod, which now has conveyor inputs as well (4 in, 4 out).
  - A link that could never carry anything is refused with the reason, for example press → feeder, or storage → storage.
- **Tank output on conveyors:**
  - Creatures no longer put what they make straight into storage. It goes into the tank's **output tray** (4 items). When the tray is full, making pauses.
  - A conveyor from the tank (up to 2) carries it off to storage, or straight to a machine. For example, puffcap tank → auto feeder closes the feeding loop without storage.
  - Swimming up to a tank also takes the tray into the dive bag, so early play without conveyors still works.
  - A one-time tip explains the tray. If the tray holds something none of its conveyors can take (a ray's copper on a belt to the feeder), the tank readout says so and suggests a second conveyor to storage.
  - The care panel shows the tray.
- **Line tiers, named with Kestrel stencil codes (never "Mk"):**

| Code | Carries | Rate | Cost per length |
| --- | --- | --- | --- |
| CB-1 conveyor | solid items | **4 items/min** (was 6) | 1 scrap / 2 cells + 1 copper / 4 cells |
| CB-2 conveyor | solid items | 10 items/min | as CB-1, plus 1 hull plating / 4 cells |
| FL-1 feed pipe | mash | 10 L/min | 1 copper / 2 cells + 1 kelp fibre / 4 cells |
| FL-2 feed pipe | mash | 25 L/min | as FL-1, plus 1 hull plating / 4 cells |

  - CB-1 dropped from 6 to 4 so that a whorled press can actually fill a belt; otherwise CB-2 had no purpose.
  - **Choosing a tier:** while drawing a line, a **CB-1 | CB-2** switch appears once the base has some hull plating (keyboard U). Select a built line and **Upgrade to CB-2** (or FL-2) pays only the plating difference.
  - **Line readouts** show the code and what it carries (for example "CB-1 conveyor: STORE 01 → PP-1 · Moving 1.4 items/min (scrap metal) · can carry 4 (34% used)"). They also say when a line runs flat out and an upgrade would help.
  - **Stencils:** every line has its code stencilled on a small painted plate on its longest run. CB-2 belts have yellow-and-black hazard rails and run faster; FL-2 pipes are steel-jacketed with steel bands. Bundles on a belt take the colour of what they carry.
  - Selected pieces list their lines ("Lines: CB-1 in, CB-2 out"), and readouts name pieces by their stencil codes (`pieceCode` in `src/game/base.ts`).
- **Lines from either end:** a selected piece shows **Conveyor to…** / **Pipe to…** for its outputs and **Conveyor from…** / **Pipe from…** for its inputs. For example, the auto feeder offers "Conveyor from…" and "Pipe to…". Keyboard: C / P draw out of the piece; Shift+C / Shift+P (or a piece with only an input) draw into it.
- **Whole-base rates overview** (`src/ui/rates.ts`): a **Rates** button beside Fit in build mode (keyboard O; Esc closes).
  - **The table** has one row per material (plus feed mash in litres), with columns **Made /min, Used /min, Net /min** (green up, red down) and **Stored**. "+N held" counts items waiting in trays and hoppers. A note under each row says who makes and uses it (for example "made by puffcaps: 0.29; used by AF-1: 0.5").
  - **Below the table:** every machine and stocked tank with its status, max rate and hoppers, then every line, busiest first, with a load bar that turns red when flat out.
  - On a PC it is a wide two-column panel; on the phone the table keeps its five columns and the panel scrolls. It refreshes twice a second.
- **Scanner log:** lists plate presses and counts lines by code.
- **Tested:**
  - Type check and production build pass.
  - Emulated iPhone 15 Pro (landscape), with a scripted base: turbine, storage, tank (grown puffcap and ray), auto feeder, plate press and a second storage pod.
    - 10 simulated minutes: the CB-1 conveyor fed the press scrap and copper at 2:1. The press made 4 plates (8 scrap and 4 copper used, with the hoppers full), and the CB-2 conveyor carried them to storage.
    - The puffcap's fibre went from the tank's tray by conveyor to the feeder, which kept the tank's trough full (both creatures stayed at 97% Fed). The ray's copper waited in the tray, as expected with only a feeder conveyor.
    - Selecting the feeder offered "Conveyor from…" and "Pipe to…". Drawing from the feeder back to a storage pod, switching to CB-2 and building it charged the plating.
    - Upgrading a CB-1 line to CB-2 cost 2 plating and raised its capacity to 10.
    - The rates panel opened with O and closed with Esc. Swimming up to a tank took 2 copper from its tray into the bag.
    - Screenshots of the press close-up, the stencilled lines, the press readout and the rates panel. No console errors.
- Deployed: GitHub Actions run 43760293910 built and deployed to Pages successfully from `claude/milestone-5-part-2-ncs2f6`. Merge it into the default branch `claude/underwater-game-m0-0qqajg` before the next session.

### Milestone 6: the submersible and the Moon pool dock
- **Feedback on the last build:** Colin tested milestone 5 part 2 and keeps tank output as it is (the 4-item output tray, emptied by conveyors or by swimming up to the tank). Nothing to fix.
- **Colin's decisions before building:**
  - **Cost:** medium, about 20 hull plating for the dock and sub together.
  - **First modules:** cargo bay, floodlights and grabber arm.
  - **Handling:** heavy and direct.
  - **Wear:** hull dents repaired with plating at the dock, and a 10-minute air reserve.
- **One session, no split:** everything planned fitted.
- **Moon pool dock** (piece 9, `MP-1`; rules in `src/game/base.ts`, drawing `drawDock` in `src/world/basegfx.ts`):

| Cost | Size | Build time | Collars | Job |
| --- | --- | --- | --- | --- |
| 6 hull plating, 4 scrap, 3 copper, 2 quartz | 3 × 2 cells | 45 s | left and right, on the top row | Builds, berths, repairs and refits the sub |

  - **The look:** the top row is a pressurised hall (a riveted drum with portholes, a hazard band, a crane rail and a hook block) with the moon pool cut in its floor. The bottom row is the open berth: heavy pillars with hazard bands, clamp arms and amber guide lamps. The berthed sub's dome rises into the pool.
  - **Rules:** it needs power to refill air, unload or build. It can't be removed while the sub is being built in it or berthed there, and the last dock can't be removed while a sub exists.
- **The submersible KS-1** (`src/actors/sub.ts` drawing and driving, `src/game/sub.ts` rules):
  - **Building it:** at a finished, powered dock, tap **Dock** (top right; keyboard G) and then **Build the sub here**. It costs **12 hull plating, 4 quartz, 3 copper and 2 kelp fibre**. A frame appears in the berth, and the build drone welds it in **60 s**, from the bottom up inside a scaffold (after any base frames waiting).
  - **The look, all drawn by code:**
    - a stubby hull in weathered Kestrel yellow over a steel belly, with a rust-red band;
    - rivets, panel seams, `KS-1 / KESTREL` stencils (they read correctly in both directions), hazard stripes, rust streaks, scratches and algae;
    - two lit portholes, a dorsal fin with a blinking red tail lamp, a snorkel mast, skids and a ducted brass propeller that spins with the thrust;
    - the glass dome cockpit, with the explorer visible inside (lime-glass helmet with its crest, face in profile, charcoal suit, chrome yoke) and a lit console.
  - **Boarding:**
    - Swim up to it and tap **Board** (touch button left of the lamp; keyboard **V**; gamepad **RB**). The same button reads **Exit** aboard.
    - While aboard, the diver is in the cockpit and the camera pulls back a little (`VIEW_H_SUB` = 820).
  - **Driving (heavy direct):** the same stick, keys, mouse or gamepad stick.
    - It cruises at 330 units/s (the diver swims at 230). **Boost** fires the thrusters for 1.6 s at 620.
    - It takes a moment to get going and longer to stop, and the hull tilts as it climbs and dives.
    - **Lamp** switches its lights. The drone follows at a wider distance and keeps up.
  - **Air (a mobile safe point):**
    - It holds **10 minutes**. Aboard, you breathe the sub's air, so your own tank stays full and the dive clock stays at zero.
    - The reserve refills at the surface and, faster, berthed in a powered dock. A chip under the watch shows hull, air and cargo.
    - With a minute left you get a warning. When it runs out you breathe from your own tank.
    - After a blackout you wake aboard the sub if it is nearer than the dome, has air and a sound hull. A blackout aboard puts you out first.
    - Off screen, a **KS-1** arrow at the screen edge shows where you parked it.
  - **Dents:**
    - Hitting rock faster than 170 units/s dents the hull: about 15% for cruising into a wall and up to 40% for a thruster ram. Scraping along rock is free.
    - Each dent gives a jolt, a puff of bubbles and a warning. Dents and rust show on the hull as it wears, and a crack appears in the dome below 35%.
    - At 0% you bail out where you are, and the crew winches KS-1 home to its dock. A breached sub can't be taken out until it is repaired.
  - **Docking:** drive slowly into a dock's berth and the clamps take it.
    - Berthed in a powered dock, air refills, and everything aboard (cargo and what you carry) unloads into storage.
    - Push the stick to release the clamps.
- **The Dock panel** (`src/ui/dock.ts`), laid out like tank care: the camera frames the dock and a panel on the right shows:
  - with no sub yet: its cost and **Build**;
  - while it is a frame: weld progress;
  - while it is out: how far away it is;
  - while it is berthed: hull and air bars, **Repair the hull** (1 hull plating per quarter of the hull) and the **three module slots**, each with **Take off** (two taps; materials come back into storage first). Modules not yet fitted are listed with their cost and **Fit**.
  - Keyboard: G opens, Esc closes, R repairs.
- **The first modules:**

| Module | Code | Cost | What it does | On the hull |
| --- | --- | --- | --- | --- |
| Cargo bay | CB-S | 3 hull plating, 2 scrap, 1 kelp fibre | Aboard, `bagLimits()` rises by 36 kg rated / 40 kg full (51 / 64 kg). Climbing out, what the diver can't carry stays in the hold; it rejoins the bag on boarding, and the dock unloads it. | A riveted belly pod with rust-red doors |
| Floodlights | FL-S | 2 hull plating, 2 quartz, 1 copper | A wide, bright bow cone (1150 radius against 560 for the running lamp) | Twin lamp housings on the bow |
| Grabber arm | GA-S | 3 hull plating, 2 copper, 1 scrap | Hold Collect with the claw by a material or a young creature to take it without climbing out (same work times; stay nearly still) | A folding yellow arm under the chin that reaches for the work |

  - Without the grabber, a one-time tip explains that it is needed to collect from the sub.
- **Costs in total:** dock 6 plating, sub 12, all three modules 8. That is 18 plating to get driving and 26 for the full kit, or about 36 minutes of one plate press for the sub and dock (18 with a whorl).
- **Other:**
  - Storage pods also unload the bag when the sub drives up to them.
  - The scanner beam comes from the dome while aboard.
  - Tend and the dome habitat need the diver out of the sub.
  - The scanner log's Outpost Kestrel section has a line for the sub and counts docks.
  - Build bar: 9 pieces (keyboard 1–9).
  - Saves: `sub` in `src/game/state.ts`. Older saves load with no sub.
- **Tested:**
  - Type check and production build pass.
  - Emulated iPhone 15 Pro in landscape, with a seeded base (storage pod, turbine, dock):
    - The Dock button appears at the dock. Build took the cost, and the frame showed welding at 45%. The drone finished it, and the toast and panel switched to the berthed view.
    - All three modules were fitted, costs were paid, and they showed on the hull.
    - Board (button and V): pushing the stick released the clamps. Driving in the basin showed the floodlight cone.
    - Ramming the basin's west wall at thruster speed dented the hull to 70%. A ram at 5% breached it: the diver bailed out, and the sub was towed back into the berth with the hull at 0. The cargo overflow went into the dock's storage.
    - Climbing out carrying 52 kg left the heaviest items in the hold, and they rejoined the bag on boarding.
    - Blacking out away from the sub woke the diver aboard it (no dome in that base).
    - The grabber pried loose a scrap spot under the bow (+1 scrap).
    - Floodlights in the dark grotto, facing left with the stencils readable. After a reload, the sub's place, hull, air, modules and aboard state were all kept.
  - No console errors. As before, the software test browser can't show the real frame rate or speeds; those need checking on the phone.
- Deployed: GitHub Actions run 43778650636 built and deployed to Pages successfully from `claude/funny-bell-6fvfos`. Merge it into the default branch `claude/underwater-game-m0-0qqajg` before the next session.

### After milestone 6: scrap balance and a test gift
- **Colin's question:** scrap is the first big bottleneck. Is a creature meant to make it? No: rays make copper, puffcaps kelp fibre and glowfins quartz. Scrap only comes from the 8 wreckage spots, at most about 0.8 a minute. The dock, sub and all three modules take about 59 scrap once their hull plating is counted.
- **Decided:** a **scavenger creature** that makes scrap, arriving with the **kelp forest (milestone 7)**, not the shallows. It is in DESIGN.md (The base, and the milestone 7 line).
- **Test gift:** existing saves get a one-time **30 scrap** delivered into base storage on the next load (`gift` in the save; `deliverGift` in `src/main.ts`).
  - It moves in as storage has room. Whatever doesn't fit waits and trickles in as space frees up, with a "Supply drop" message.
  - The tip id `gift-scrap-30` stops it repeating. New games don't get it.
  - Remove it once the scavenger creature exists.
- **Bug fixed while doing it:** unloading at a storage pod or the dock could take a negative amount (pulling items back into the bag) if storage ever held more than its capacity. Both now clamp at zero.
- Tested in the emulated iPhone: with 26 of 40 storage used, 14 scrap arrived and 16 waited. After freeing 6 slots, 6 more arrived. A reload kept the remaining 10 owed and didn't give the gift again. Type check and build pass.

### After milestone 6: unloading and trays on the Collect button
- **Colin's feedback:** swimming around a connected base, he kept emptying tank trays and unloading into storage by accident.
- **Now nothing moves just by swimming past.** Stop by a storage pod and **tap Collect** ("Unload 6 items into storage"), or stop by a tank with something in its output tray and tap Collect ("Take 2 from tank 1's tray"). Keyboard C, gamepad X; on PC the label ends "· press C".
  - It's a single tap: holding the button doesn't repeat it.
  - Materials, the drone repair and wild creatures still take priority on the button.
  - Aboard the sub, Collect unloads at a pod even without a grabber arm.
  - A one-time tip explains the change. Unpowered pods and pods still being welded say so on the label.
- **Still automatic, on purpose:** putting a creature from the jar into a tank (you carry it there to do that), and a berthed sub unloading at a powered dock (docking is already a deliberate act).
- **Colin's storage question, answered (no change):** storage is one shared pool. Each finished pod adds 40 to the total. A conveyor from any pod sends what its far end needs: kelp fibre to a feeder; scrap and copper to a press, emptiest hopper first, so the 2:1 ratio holds. A possible later need: per-material limits or a sorter, so creature output can't fill storage and leave no room for plating.
- Tested in the emulated iPhone: waiting by a pod and a tank moved nothing. A tap unloaded 3 scrap and took 2 copper from the tray. No console errors.

### After milestone 6: terraces under the shelf, and jar deposits on the Collect button
- **Colin's feedback:** past the shelf edge, the cliff drops about 17 m in one grid cell, so pieces built out over the basin stood on legs all the way to the floor. He chose a **short taper**, and is fine with refunds for pieces inside the new rock.
- **The terraces** (`TERRACES` in `src/world/terrain.ts`): three rock ledges, each two grid columns wide, at 2, 5 and 8 rows up, stepping down from the shelf (row 11).
  - Each riser sits inside its own column, so the open cells beside it stay clean. A piece built off the shelf edge now stands on legs at most 3 rows tall.
  - The rock is painted over the ledges (the cliff rock now starts at x = −320). Plants, boulders and the anemone there follow the new ground.
  - **Cost:** 22 cells, not the 30 estimated, because the old cliff column was already rock. The site is now **658 open cells** (was 680), still about 20 times the original shelf.
  - **Refunds for older saves:** on load, any piece with a cell in the new rock comes out through the same code as Remove (`removePiece` in `src/ui/build.ts`), with its cost, lines, machine contents, tray and whorls refunded, into storage first.
    - Creatures in a buried tank move to another tank with room, or swim home.
    - A sub frame in a buried dock is refunded; a built sub there is just released.
    - A diver or sub saved inside the new rock is lifted out.
    - A one-time message lists what came out.
- **Jar deposits on the Collect button:** with a creature in the jar, stop by a tank and tap Collect ("Put young puffcap in tank 1"; "Tank 1 is full" when it has 4). This comes before the tray action. Texts that said "swim up to the tank" now say "tap Collect".
- Tested in the emulated iPhone with an old-layout save: a storage pod and a tank (holding a young ray) in the new rock came out. Storage got back exactly their cost (5 scrap, 1 copper, 3 quartz, 2 kelp fibre), and the ray moved to the other tank. A dome on the lowest ledge stayed, and a tap put the puffcap from the jar into the tank. Screenshots of the terraces in the swim and build views. No console errors.

### Milestone 7, part 1: the first gear gate and the kelp forest
- **Feedback on the last build:** milestone 6 and its follow-ups (sub, dock, Collect-button actions, terraces) are all fine. Nothing to fix.
- **Colin's decisions before building:**
  - **Costs:** Lab cheap, Workshop needs plating (numbers below).
  - **Blueprints:** specific data sources unlock specific blueprints, researched in the Lab over time while it has power.
  - **Species:** tinker crab (scavenger, makes scrap) and lantern shrimp (cleaner). A third, a small wary predator, may come later.
  - **Materials and pieces:** holdfast resin and lumen moss; the pieces are the Grand tank GT-1, Sorting pod SP-1 and Air relay AR-1 (part 2). Colin added: **power should become a real mechanic later** (nuclear, fusion or Choir power needed to grow the base further). Recorded in DESIGN.md.
  - **Drone:** one upgrade (DR-2 welder, about 2× faster) arrives in part 2, built in the Workshop from a blueprint found in the caves.
  - **Sub:** it can go into the open kelp forest, but not through the cave; the cave system is diver-only.
  - **Split:** part 1 is this session; part 2 is the kelp caves dungeon, the kelp base pieces and the drone upgrade.
- **Lab** (piece 10, `LAB-`, keyboard 0) and **Workshop** (piece 11, `WS-`). Same collar and power rules as every piece. Rules in `src/game/gear.ts`, panel in `src/ui/station.ts`, drawings `drawLab` / `drawWorkshop` in `src/world/basegfx.ts`.

| Piece | Size | Collars | Cost | Weld | Job |
| --- | --- | --- | --- | --- | --- |
| Lab | 1 × 1 | left, right, up | 3 scrap, 3 quartz, 2 copper | 26 s | Decodes data finds and scans into blueprints |
| Workshop | 2 × 1 | left, right | 4 hull plating, 3 scrap, 2 copper | 36 s | Builds gear from blueprints |

  - **Look:** the Lab is a pressure capsule with one big brass-ringed port onto a lit bench, sample jars and a cartridge reader whose screen has a scan bar sweeping while it decodes; a little mast and dish on the roof. The Workshop is a riveted shed with a half-rolled door, a parts rack, and a yellow fabrication arm that slides and swings with a flickering torch and sparks while it builds.
  - **The panel:** stop beside one and tap **Lab** / **Workshop** (green button, top right; keyboard K). The camera frames the piece, the air clock pauses, and a panel shows the job and its progress, data finds carried, and blueprints (Lab) or gear (Workshop). A Workshop job can be stopped (two taps) for a refund. Jobs only run with power, and pause without it.
  - Removing a Lab or Workshop mid-job gives back the data find or the materials.
- **The dive light DL-1** (the first gear):
  1. Scan the survey sled wreck. Then stop by it and **hold Collect: "Unclip the SLED 2 recorder"** (1.6 s). Data finds weigh nothing and survive blackouts.
  2. At a Lab: **Decode** the dive light blueprint (75 s, uses the recorder).
  3. At a Workshop: **Build** the dive light: **2 hull plating, 2 quartz, 1 copper**, 45 s.
  4. It replaces the shoulder lamp: reach 980 (was 560), brighter, and a wider beam (`DIVE_LIGHT` / `LAMP` in `src/game/gear.ts`). The cave's black throat thins to a deep shadow your light cuts through.
  - With it (and the lamp on) the diver can pass the "too dark" point in the east cliff cave. Lamp off: "switch your dive light on".
  - The scanner log has a **Gear and blueprints** section saying what to do next.
- **The world grew east** (`src/world/terrain.ts`): `WORLD_W` 9000 → 15600.
  - **The east cliff** now tops out at a shallow rock **shelf** about 2.8 m under the surface (8640–9600). In a side view a notch can't be bypassed, so the sub's way over is the whole shelf, blocked by the **survey boom gate** (`KS BOOM 1`, x = 8900): a rusted steel gate hanging from a post that breaks the surface. Its **winch** is on the forest side: hold Collect there, **"Wind the boom winch"** (3 s), and the gate swings up out of the water for good (`boomOpen` in the save). The sub is stopped by the closed gate, as tested.
  - **The cave** now runs right under the shelf and comes out on its east face, about 9 m down, above the forest. It is still too tight for the sub from either end.
  - **The kelp forest** (10050–14800): floor about 17 m deep, with three rock outcrops. The bake that shades daylight adds a canopy factor there, so it is dim, green and enclosed.
    - **Giant kelp** (48 stalks on High) from floor to surface, golden brown, with knotted holdfasts at their feet; dark stalks in the foreground; a wary silverbar shoal between them.
    - **Bladder kelp** bushes with round floats, and **lumen moss** glowing warm yellow-green on the outcrops and the foot of the east wall (soft lights that pulse slowly).
    - **The east wall** with the **mouth of the kelp caves**, a dark recess going black further in. A banner says the crew is still surveying the way in (part 2). A third **air tank upgrade** hides at the mouth (3 in total now).
  - **New materials** (`src/game/state.ts`): **holdfast resin** (1 kg, "Scrape off", 7 spots by holdfasts) and **lumen moss** (0.5 kg, "Peel off", 5 spots on shaded rock), plus 2 scrap spots. Their chips (amber drop, glowing moss) hide until you have some. With seven materials the chip column wraps into a second column on short screens.
  - **New scanner entries (9):** Survey boom gate, Kelp forest, Giant kelp, Bladder kelp, Lumen moss, Tinker crab, Lantern shrimp, The kelp caves; the sled and cave entries were updated.
- **New creatures** (`src/actors/critters.ts`, homes in `src/world/wildlife.ts`, rules in `src/game/creatures.ts`). Curious but wary: they edge closer to a diver who keeps still and keep a little distance; they bolt from a fast swimmer or a boost from further away than shallows creatures do.
  - **Tinker crab:** a small decorator crab with a low rust-brown shell. It has metal flakes, a bit of shell and a curl of kelp glued to its back, two stalk eyes whose shine catches the lamp (amber), and claws with tiny teeth that pick at things. It walks the floor. One adult and three young among the holdfasts (10520, 12300, 13480).
  - **Lantern shrimp:** see-through, with a curved segmented body, one big dark eye, long waving antennae, flickering swimmerets and a row of amber lights down its side. One adult and two young by the glowing moss (11080, 13980).
  - **Their needs and pairings** (Colin: mixed tanks should become the best setup; clashes stay):

| Species | Favourite plant (cost) | Company | Makes | Pairing |
| --- | --- | --- | --- | --- |
| Tinker crab | Bladder kelp (1 resin) | any tank-mate | **scrap metal** | Clash: snips puffcap ribbons (puffcap −40% comfort) |
| Lantern shrimp | Lumen moss (1 moss) | content with **another species to clean** | lumen moss | Cleaner: each other species in its tank makes **+25%**, and the tank fouls **35% slower** |

  - So a crab with a shrimp is already better than crabs alone. Today one tank holds one plant, so the shrimp settles at 70% comfort beside crabs on bladder kelp. Part 2's Grand tank with two planters lets both reach 100%: the mixed tank becomes the best setup.
  - A grown, happy crab makes scrap at the usual 0.25/min before bonuses (with a shrimp, shoal and reef bonuses, more). That is the long-term scrap source Colin chose.
  - Care panel: the two new plants, and "+N% cleaned" in the output line. Tank swimming: crabs walk the tank floor, shrimp keep low-to-middle.
- **The 30-scrap test gift is gone.** Any scrap still owed is dropped on load (`gift` stays in the save type only so old saves load).
- **Other:** a dropped sample bag now rests on the real seabed anywhere (it used to be capped at 1290, mid-water in the basin). The foreground kelp layer keeps its old layout in the shallows (`FRONT_REF`). Some procedural decoration in the shallows is reshuffled slightly, because the random sequence changed with the bigger world.
- **Tested** (type check and production build pass; emulated iPhone 15 Pro in landscape, scripted):
  - Teleported through the cliff cave mouth, the shelf, the boom gate and winch, the tunnel with the light, the tunnel exit, three places in the forest and the kelp caves mouth, with screenshots.
  - Without the light the diver stops at the gate with the "pitch black" banner. With it, the diver follows the tunnel through.
  - A seeded base (turbine, storage, Lab, Workshop, tank, all powered). The Lab button appeared; Decode used the recorder, and 80 simulated seconds gave the blueprint. The Workshop took 2 plating and built the dive light in 50 s.
  - A tank with a grown crab, a grown shrimp and a young puffcap on bladder kelp, after 4 simulated minutes: crab 100% comfort, shrimp 70%, puffcap 10% (snipped by the crab). The water dropped more slowly, and the tray held 1 scrap and 1 lumen moss.
  - A sub driven at the closed boom gate stopped at it.
  - The old save's leftover gift (12 owed) was dropped on load.
  - No console errors. As before, the software test browser can't show the real frame rate.
- Deployed: GitHub Actions run 43874694191 built and deployed to Pages successfully from `claude/optimistic-archimedes-n3w5pz`. Merge it into the default branch `claude/underwater-game-m0-0qqajg` before the next session.

### Milestone 7b: audio, all made by code
- **Feedback on the last build:** milestone 7 part 1 is all fine ("I like everything so far. this looks awesome on my pc. let's continue"). Nothing to fix.
- **Colin's choices before building:** warm synth-ambient music; sparse, coming and going; grounded, physical effects; subtle breathing that gets faster and louder as air runs low.
- **No sound files.** Everything is synthesised with the Web Audio API in `src/audio/`:
  - `engine.ts`: the audio context, four buses (music, ambience, effects, and "ui" for unmuffled clicks and notices), a shared reverb made from generated noise, an echo on the music, a limiter, the underwater muffle, and voice helpers (tone, hiss, FM bell, struck metal, thump, bubbles).
  - `ambience.ts`: the ambient bed per zone.
  - `music.ts`: the generative soundtrack.
  - `director.ts`: reads a snapshot of the game every frame (built at the end of the frame loop in `src/main.ts`, search "Sound (milestone 7b)") and plays the loops and cues.
  - `src/ui/sound.ts`: the Sound settings.
- **Settings → Sound** (at the top of the panel): Master, Music, Ambience and Effects sliders, Mute (also the M key), and on iPhone/iPad a "silent switch" choice. These are saved on the device (`fathomlight.audio` in local storage, beside the graphics preset).
  - **Starting sound:** the first tap or key press starts it, as iOS requires. If iOS pauses it (after a call, for example), the next tap resumes it. It goes silent while the app is hidden.
  - **The silent switch:** by default the game follows the switch (`navigator.audioSession.type = 'ambient'`, which also lets Spotify or podcasts keep playing). The button switches to "Plays with the silent switch on" (`'playback'`), which stops other apps' audio.
- **Underwater muffle:** effects and ambience pass through a low-pass filter that closes with depth (about 4.2 kHz just under the surface, about 1.9 kHz at 25 m), and more in the cave and forest. With the head above water it opens fully, so splashes and waves are bright. Music is never muffled.
- **Ambience per zone,** crossfading over about 2 s as you swim (`zoneMix` in `director.ts`):
  - **Shallows:** bright fizz, snapping-shrimp crackle, bubbles drifting past, and waves overhead near the surface.
  - **Kestrel basin:** a darker water wash, a low hum, and rare distant groans.
  - **Kelp forest:** a muffled, enclosed wash, a lower hum, kelp stalks creaking and soft knocks.
  - **Cave (and the grotto, and near the kelp caves mouth):** a hollow resonant breath, drips ringing in a long echo.
  - Everything gets darker with depth.
- **Generative soundtrack:** warm detuned-saw pads (with a slow breathing filter), a soft FM electric-piano melody wandering in short phrases, and glassy chimes, in a big reverb.
  - A passage plays for 70 to 150 s, then rests for 40 to 100 s with only ambience. Entering a new zone during a long rest starts a passage sooner.
  - Each zone has its own key and mood: shallows D lydian (calm, bright), basin A dorian (lower, spacious), forest E minor with a flat second (darker and slower, with occasional uneasy notes), cave a near-drone with rare notes.
  - It ducks to 40% while any panel is open (build, tend, dock, Lab/Workshop, settings, log) and dims as air runs low.
- **Cues:**
  - **Diving:** breathing (demand-valve hiss in, bubbles out; faster and louder below a quarter tank), swimming water rush, a boost whoosh, splashes breaking the surface and diving back in, breath at the surface, the lamp switch, and a low-air double beep from the watch that speeds up as air drops.
  - **Scanning:** a rising sweep while held, a two-note chime when done, and a soft sonar ping for a Scan tap.
  - **Collect work,** per material: cut (kelp), pry and clank (scrap), dig thuds (copper), crystal taps (quartz), scrape (resin), soft tear (moss); bubbles while coaxing a creature; weld crackle repairing the drone; ratchet clicks winding the boom winch; latches on the sled recorder. Plus a pickup clink (pitched per material) and bigger chimes for air tank upgrades, echo whorls and the recovered bag.
  - **Base:** the drone's welding crackle wherever it works (by distance and side), each plate press stroke (thump, clank and steam hiss), and a machinery hum near running auto feeders.
  - **Sub:** motor hum and propeller wash rising with speed, a thruster rush and whine, a metal clang and thud for dents, a two-tone alarm with rushing water for a breach, clamps docking and undocking, and the hatch when boarding or leaving.
  - **Interface:** a soft click for buttons, a short tone when a panel opens or closes, a small chime for big notices and a falling two-note tone for warnings.
  - **Blackout:** sound fades down, a slow heartbeat plays, and a soft tone sounds on waking.
- **Tested** (type check and production build pass; headless Chromium, emulated iPhone 15 Pro landscape, scripted):
  - No audio context exists before the first tap; after the tap it is "running".
  - Output was measured at the surface, in the shallows, the basin, the cave, the forest, and the forest with low air: all have sound, louder with low air. Mute gives exact silence, and the settings save.
  - The music was playing in the forest key after the teleports.
  - Every voice type rendered offline with no NaN or silence, and every cue in `director.ts` ran without errors.
  - No console errors. The test browser can't play sound to a speaker, so the mix itself still needs Colin's ears.
- Deployed: GitHub Actions run 43893723178 built and deployed to Pages successfully from `claude/youthful-darwin-r5kw5d` (built on the default branch `claude/underwater-game-m0-0qqajg`, which already had PR #7 merged). Merge it into the default branch before the next session.

### After milestone 7b: more scrap early on
- **Colin:** "love the music and sounds". On a fresh save on the PC, the road to the Lab and Workshop felt slow because he was waiting for scrap to grow back.
- **Why:** the road from a fresh save to the dive light needs about 29 scrap: drone 2, turbine 2, storage 3, plate press 4, Lab 3, Workshop 3, and 12 inside the 6 hull plates for the Workshop and the light. The shallows had 8 scrap spots that grew back every 10 minutes.
- **Changes:**
  - **4 more scrap spots in the shallows** (12 in all): 2050, 3620, 5600 (on the slope down into the grotto) and 6560. They are appended (`scrap-8` … `scrap-11`), so old saves keep their spots.
  - **Scrap grows back in 6 minutes** instead of 10 (`REGROW_BY_KIND` in `src/game/state.ts`). Other materials still take 10.
  - The shallows now give about 2 scrap a minute (was 0.8), so the first Lab and Workshop come roughly 2–3 regrowths sooner. The tinker crab is still the long-term source for the sub and bigger pieces.
- **Tested:** type check and build pass. The new spots sit on the seabed (screenshots), and a taken scrap spot came back after 6.5 minutes of play time while a copper spot taken at the same moment did not. No console errors.

### Milestone 7, part 2: the kelp caves, new pieces and gear
- **Colin's choices before building:** the puzzles are a **pulsing current squeeze** and a **moss-lit black chamber**; the **tow line** is in the caves too (a side chamber), the **cutter torch** at the end; **costs and unlocks as proposed**; the cutter torch is **built and used now** (it cuts a kelp wall).
- **The kelp caves** (`KC` and friends in `src/world/terrain.ts`, drawing `Scenery.buildKelpCaves` in `src/world/scenery.ts`, rules in `src/main.ts`, search "Milestone 7 part 2"). The world grew east again: `WORLD_W` 15600 → 19400. The caves are open shapes (tunnels and chambers) carved into the rock behind the forest's east wall, 15–25 m down. Diver-only. In order:
  1. **The hall:** an **air pocket** in its roof (put your helmet in it to breathe), lumen moss to peel (3 new moss spots in the caves), the toppled **KS RELAY 2** buoy (its log → Air relay AR-1), and a side passage choked by a **kelp wall**.
  2. **The squeeze:** cold water surges out every 7.5 s (about 3.5 s of surge at up to 585 units/s, stronger than a boost), then a lull. Two little **pockets in the roof** are out of the flow: hop between them in the lulls. Banners say "Cold surge!" / "A lull: swim on".
  3. **The junction:** a second air pocket, the broken **KD WELD** crate (its chip → DR-2 welder), and a passage up to the old **rope store** (spool tag and notes → tow line).
  4. **The black chamber:** silt so fine the dive light shrinks to a third of its reach. Four old **lamp brackets** cross it, with rock pillars between. Hold Collect at a bracket with lumen moss in your bag to set it there: its glow lights that part of the chamber. The diver won't swim more than about 4 m past the last lit bracket. With all four lit, the way is open.
  5. **The survey cache** at the end: open it for the cutter torch cartridge.
  - The **kelp wall:** hold Collect with the cutter torch (3 s) to cut it. Behind it is the **fourth air tank upgrade** (`TOTAL_AIR_TANKS` 4).
  - New scanner entries: Air pocket, Cold surge, Black water, Kelp wall; the kelp caves entry was rewritten. The scanner log has a **kelp caves** checklist (finds, blueprints, brackets, the wall, relays).
- **New blueprints** (Lab, `RESEARCH` in `src/game/gear.ts`). Finds hide in the Lab list until you carry them.

| Blueprint | Comes from | Lab time | Unlocks |
| --- | --- | --- | --- |
| Grand tank GT-1 | scans: tinker crab, lantern shrimp, giant kelp | 90 s | build card |
| Sorting pod SP-1 | scans: giant kelp, bladder kelp | 60 s | build card |
| Air relay AR-1 | KS RELAY 2 log (hall) | 80 s | Workshop kit |
| DR-2 welder | KD WELD chip (junction) | 70 s | Workshop gear |
| Tow line | rope store notes (side chamber) | 100 s | Workshop gear |
| Cutter torch | survey cache (end) | 120 s | Workshop gear |

- **New gear** (Workshop, `GEAR`):

| Gear | Code | Cost | Time | Does |
| --- | --- | --- | --- | --- |
| Cutter torch | TC-1 | 4 plating, 3 copper, 2 quartz, 2 resin | 60 s | cuts kelp walls; later, sealed wreck hatches |
| Tow line | TL-1 | 3 plating, 4 kelp fibre, 2 resin | 50 s | for the wreck shelf's currents (milestone 8); no use yet |
| DR-2 welder | DR-2 | 3 plating, 2 copper, 2 moss | 50 s | the drone welds 2× faster (`droneWeldRate`) |
| Air relay kit | AR-1 | 3 plating, 4 resin, 3 moss, 2 copper | 45 s | build as many as you like |

  - **Planting a relay:** carrying a kit, stop on open seabed (not at the base, not in the caves, at least 8 m from another relay) and hold Collect: "Plant air relay AR-1". A mooring with a regulator, a hose and an orange surface float. Swim to the mooring to breathe (like a dome), and after a blackout you wake at the nearest relay if it is closer than the dome or the sub.
- **New base pieces** (each needs its blueprint; the build card stays hidden until then):

| Piece | Size | Cost | Weld | Job |
| --- | --- | --- | --- | --- |
| Grand tank GT-1 | 3 × 2 | 6 resin, 4 plating, 3 quartz, 2 moss | 50 s | 8 creatures, **two planters** (Tend shows Planter 1 and Planter 2); feed pipe in, conveyors out, whorls |
| Sorting pod SP-1 | 1 × 1 | 4 resin, 3 scrap, 2 copper | 26 s | a **bay of 12 for every material**, on top of the shared storage pods, so one kind can't crowd out the rest |

  - So a crab and a shrimp in a Grand tank with bladder kelp and lumen moss both reach 100% comfort: the mixed tank is now the best tank.
  - Storage room is now worked out per material (`storageRoom(k)` in `src/main.ts`): its sorting bays first, then the shared pods. Unloading, the sub, conveyors and refunds all use it.
- **Fixes from Colin during this milestone:**
  - **The sub's grabber arm was hard to line up.** It now reaches materials up to 150 units from the claw (a diver's hand: 72), and while you hold Collect with a material in range (and aren't steering), the sub's thrusters **hover it so the claw lines up** over the material and hold it still while the arm works.
  - **The pilot showed in the sub's dome even when empty.** Now the cabin is empty unless you are aboard. **Boarding animation:** tap Board and the diver swims to the hatch on top of the dome and sinks through it (about 1 s), then the pilot slides down into the seat. Leaving: the pilot rises out through the hatch and the diver fades in above it.
- **Sounds:** a deep rumble while the cold surge runs, the unmuffled air of an air pocket (no bubbles from the regulator there), the cutter torch's roar and crackle, moss set on brackets, and finds use the bag-recovered chime.
- **Tested** (type check and production build pass; scripted in headless Chromium, timed by in-game seconds because the cloud browser renders at only 2–8 frames per second without a GPU):
  - **Surge:** left alone in the squeeze, the diver was pushed back about 860 units to the hall in 8 s; in a roof pocket the diver didn't drift at all.
  - **Air pocket:** oxygen went from 20 to the full 75 in 3 s with the helmet in the hall's pocket.
  - **Finds:** all four (relay log, weld chip, rope store notes, survey cache) taken by holding Collect.
  - **Black water:** with no brackets lit the diver stopped at x 17790. All four brackets were lit with 4 moss from the bag, and then the diver swam through to the cache.
  - **Kelp wall:** it blocked the diver without the torch. With the cutter torch, holding Collect cut it; the diver swam down into the alcove and took the 4th air tank.
  - **Air relay:** planted on the forest floor. A blackout at x 13500 woke the diver at the relay (12040). The breathing radius was then widened to 140, which the test showed was needed.
  - **Pieces:** a turbine, Sorting pod and Grand tank joined in a row were all powered. Unloading 20 scrap at the Sorting pod stored exactly 12 (one bay) and left 8 in the bag. A grown crab and shrimp in the Grand tank with bladder kelp and lumen moss both reached 100% comfort.
  - **Sub:** pressing V beside it ran the boarding animation and put the diver aboard. With the grabber, the sub started 118 units from a scrap spot; holding Collect hovered it into line, and the arm took the scrap.
  - No console errors.

### After milestone 7 part 2: zoom while swimming
- **Colin:** wanted a scroll-wheel zoom while diving, like build mode, to see more.
- **The mouse wheel** zooms the swimming view out to 2.2× the normal view or in to 0.75×. The **- and = keys** do the same, and Ctrl+0 resets it. It works aboard the sub too (scaled from the sub's wider view). It is off while a panel is open, and it is saved on the device (`fathomlight.swimZoom`). Code: `swimZoom` in `src/main.ts`.
- Not on touch yet: two-finger pinch would fight the swim stick and the buttons. If Colin wants it on the iPhone, a zoom button or pinch on the right half of the screen are options.
- **Tested:** the wheel zoomed out to the limit, = zoomed in to the limit, and screenshots at both look right. No console errors.

### After milestone 7 part 2: smoother cave tunnels
- **Colin** (screenshot on the PC): the tunnel looked "box-y".
- **The cave mouth** was drawn as narrow vertical strips from the cave up to the steep wall face, which showed as a staircase and a dark wedge. It is now one smooth rounded opening, shaded darker towards the inside.
- **Tunnels** are no longer perfect pill shapes. Their radius swells and pinches gently along their length (`capWobble` in `src/world/terrain.ts`). Drawing and collisions use the same wobble. The narrowest point is still 39 units (the diver needs 26), and a walk along the squeeze found no tight spots.

### After milestone 7 part 2: the caves as one smooth shape, and the kelp wall bug
- **Colin** (screenshot): a black C-shape at the mouth that didn't flow into the cave; a join in the hall that looked misdrawn; and after cutting the kelp wall, the green tangle was still there.
- **The caves are now one smooth shape** (`caveField` in `src/world/terrain.ts`). Each tunnel and chamber is a distance field, blended into the others with a smooth union, so joins become rounded fillets instead of separate pills and ovals overlapping. Rock pillars are cut out of it.
  - The entry tunnel now starts out in the forest water, and the drawing is clipped at the seabed. So the mouth opens straight out of the wall face (the old separate mouth drawing is gone).
  - The drawing traces that field with marching squares (smooth, interpolated edges) in `Scenery.buildKelpCaves`. Collisions use the same field.
  - Checked: the squeeze has no tight spots, both air pockets are open, all four finds sit on the floor, and the brackets stand on it.
- **Kelp wall bug:** the scenery's culling pass sets every object in view visible each frame, which re-showed the uncut wall (and would have re-shown closed wreck hatches). Those graphics are now left out of culling. Once cut, only a few charred stubs cling to the passage sides, and the tangle is drawn only inside the passage.

### Milestone 8, part 1: the wreck shelf, the race, lurkers and suit integrity
- **Colin's choices before building:**
  - **health** is suit integrity;
  - **predators** are unsettling, avoidable ambush hunters;
  - **currents** are crossed with anchor rings and the tow line's winch;
  - the **sub** goes over the plateau.
  - The milestone is split: part 1 is this session; part 2 is the Corvina (the major site) and the shelf's base pieces.
- **The world grew east again** (`WORLD_W` 19400 → 27200, `src/world/terrain.ts`):
  - **19300–19750, the shelf edge:** the plateau over the kelp caves drops 18 m to the wreck shelf.
  - **19450–21900, the race:** a current (500 units/s, stronger than a boost) sweeps west across the edge. Its silt streaks show the flow. Eight **anchor rings** (steel stakes with a ring on top) cross it. Holding on at a ring cuts the current to a tenth.
  - **21900–27000, the wreck shelf:** about 22 m down and twilight (the light bake dims it). Grey silt with rusted debris, sea pens, two small sealed wrecks (a **trawler** and a **barge**), five **lurker dens**, eight **brass** spots, and the great wreck of the **Corvina** (part 2).
  - The sub can reach it over the plateau. The race pushes the sub too, at half strength: its thrusters still get it across.
- **The tow line** (built in milestone 7 part 2) now has its job. At a ring, hold Collect: "Clip on and haul to the next ring" (0.5 s). The diver then winches along the line to the next ring (170 units/s), drawn as a line, and the current can't take them. Without the tow line, the ring says a tow line could clip on, and a banner explains the race.
- **Suit integrity** (`save.suit`, 0–1): an arc across the top of the dive watch, mirroring the bag's arc at the bottom. Lume colour above 70%, amber above 35%, red and pulsing below.
  - Bites crack it by 30%.
  - It self-seals at 1.2% a second after 8 s without damage, and repairs quickly at the surface, a dome, the sub or an air relay.
  - At 0 the diver blacks out like running out of air ("Your suit gave way"), dropping the bag; the suit is repaired on waking.
  - Below a third, a slow two-tone alarm sounds.
- **Wreck lurkers** (`src/actors/lurker.ts`), the first predators. A long, mottled, spined hunter with needle teeth and a warm amber lure, waiting in a den under wreckage. It never chases:
  - it notices a diver in front of its den within 200 units (125 with the lamp off);
  - it **warns** (the lure flares, its eyes shine, a dry clicking rattle) for 0.75 s;
  - it **lunges** up to 250 units and **bites** if the diver is still there;
  - then it slides back and **rests** for 3.4 s, so a careful diver can pass.
  - It ignores the sub. Two brass spots lie in front of dens on purpose: grab them while it rests.
- **Brass fittings**, the shelf's material: 3 kg, "Unbolt" (2.6 s). They're for the shelf's base pieces and pressure gear in part 2.
- **Sealed hatches:** hold Collect with the cutter torch (3 s) at the trawler's and the barge's hatch.
  - The trawler: an emergency air cylinder, the **5th air tank upgrade** (`TOTAL_AIR_TANKS` 5).
  - The barge: a dry cargo locker with 3 hull plating and 2 brass.
  - The Corvina's bulkhead door is sealed from inside: it opens in part 2.
- **New scanner entries:** The wreck shelf, The race, Anchor ring, Sealed hatch, The Corvina, Wreck lurker. The log shows suit integrity and the hatches.
- **Sounds:**
  - the shelf's own music (C# with a flattened fifth: low, slow, uneasy) and ambience (deep hum, groaning wrecks, distant clanks);
  - the race's rumble, the lurker's warning rattle, the bite (snap, crunch and escaping air);
  - the tow line's clip and winch, brass being unbolted, and the suit alarm.
- **Tested** (type check and build pass; scripted in headless Chromium, timed in game seconds):
  - **Race:** without a tow line the diver was swept from x 20700 back to 19613 in 3 s.
  - **Hauling:** clipped on at the 20530 ring, the diver hauled to 20837 (next ring 20860).
  - **Lurker:** loitering in front of a den got the diver bitten: suit 1.00 → 0.70. Over 12 s away from danger it self-sealed to 0.78.
  - **Hatch:** cutting the trawler's hatch gave the 5th air tank.
  - **Suit failure:** with the suit at 20%, a bite blacked the diver out; they woke at the buoy with the suit repaired.
  - **Sub:** left alone in the race, it drifted from 20600 to 19813 in 3 s.
  - No console errors.

### After milestone 8 part 1: natural air pockets and black water
- **Colin** (screenshot): the junction's air pocket didn't look natural, and a rectangular box at the black chamber's entrance looked wrong.
- **Air pockets** were still drawn from the old oval chamber, so they no longer matched the smooth cave roof. They are now traced from the caves' own shape: air fills exactly the roof above the waterline (with a lighter rim), the rippling water surface appears only where there is water under it, and droplets hang from the real roof.
- **Black water** was a stack of vertical darkness strips with a flat-topped box at the west end, which caused the box and the stripes on the pillars. It is now one soft silt haze, built once from four smooth layers that fade towards the chamber's edges. Each lit bracket thins the whole haze by 16%; the brackets' own glow and the shrunken lamp do the rest. The 4 m limit past the last lit bracket is unchanged.
- The marching-squares tracing is now one shared helper (`traceField` in `src/world/scenery.ts`).

### After milestone 8 part 1: a clear suit bar
- **Colin:** the suit integrity arc on the watch was hard to see.
- **A suit bar under the dive watch** (`#suit-bar`, `Hud.setSuit` / `suitHit`): a helmet icon, a thick bar and a percentage. It is lume green above 70%, amber above 35%, and red with a pulsing border below that, and the whole chip flashes red when the diver is bitten. It shows once the wreck shelf has been reached, or whenever the suit is damaged, and hides aboard the sub (the sub's chip uses that spot) and in panels. The arc on the dial stays as a secondary hint.
- Checked on an emulated iPhone in landscape: amber at 56% and red at 26%, clearly readable under the watch.

### After milestone 8 part 1: the grapple line and the flow vane
- **Colin:** didn't love clipping on and hauling ring to ring, and chose a **grapple line** instead. He also wanted the sub blocked the first time, so it can't skip the grapple: "something that stops the water flow at the top so the sub can go over it like it does now".
- **The grapple line GL-1** replaces the tow line. It uses the same blueprint and Workshop item (`tow` in the save), so saves carry over.
  - With it, the best anchor ring within 460 units with a clear line (rings ahead of the diver first) gets an amber **target marker**, and Collect reads "Fire the grapple".
  - A tap shoots the hook out (0.18 s), then the line **reels the diver in at 580 units/s**, faster than the race, ending holding the ring (where the current is cut to a tenth). Fire again for the next ring.
  - It fires even while the race is sweeping you away.
- **The race now reaches the surface** (it used to stop just under it, so a diver could slip past along the top).
- **The flow vane** (`VANE`, `race.vane` in `src/world/terrain.ts`): a huge hinged steel plate lying on the seabed just past the race (x 22020), with its winch on the far side (22200). Only a diver who has grappled across can reach the winch. Hold Collect, "Wind the flow vane winch" (3 s), and it swings up off the seabed to about 60°. It turns the race down along the shelf, so **the water above 5 m goes calm** and the sub can cross over the top. The deep race still works on the diver, and slows the sub to half.
  - **Before the vane is raised,** the race pushes the sub at 1.4× its strength, more than its thrusters. A banner says the salvage crew must have had a way to calm it, on the far side, on foot.
- New scanner entry: Flow vane. The ring, race, gear and blueprint texts now describe the grapple.
- **Tested** (scripted, game seconds):
  - **Surface:** a diver at the surface in the race was swept from 20700 to 19996 in 2 s.
  - **Grapple:** from the first ring on the shelf floor, seven grapple shots carried the diver ring by ring to 21970 (rings at 20200 … 21860).
  - **Vane:** winding the winch raised it.
  - **Sub:** on full thrusters before the vane, it was pushed from 20600 back to 19541 in 4 s; after the vane, it crossed from 20600 to 21712 near the top.
  - No console errors.

### Milestone 8, part 2: the Corvina, the sonar pulse, and the shelf's base pieces
- **Colin's choices before building:**
  - **way in:** grapple up to her deck;
  - **puzzles:** restore her power, and grapple across the hold;
  - the **sonar pulse is usable now**, and the pressure suit is found now but only matters in the trench;
  - **pieces:** the recompression room and the salvage crane.
- **The Corvina** (`CORVINA`, `CV_*`, `corvinaSolid` in `src/world/terrain.ts`; drawing `Scenery.drawCorvina` / `setCorvina`; rules in `src/main.ts`, search "Milestone 8 part 2"):
  - Her hull and superstructure are now **solid steel with rooms inside**, drawn as a cut-away: dark decks with ribs, grating and ceiling lamps.
  - **The upwelling:** water boils up over her deck (520 units/s), so nobody can sink onto it.
  - **Her stern bollard** is a grapple anchor. Hooked and holding it, you're out of the flow, beside the **deck hatch**. Cut the hatch with the cutter torch (3 s), and a shaft drops to the lower corridor.
  - **The stern door** at the corridor's west end is sealed until you **release it from inside** (a lever): a shortcut in and out at seabed level.
  - **The hold:** a downdraft through her holed keel (460 units/s) pins you to the floor, except right under the **three beam hooks**, which are grapple anchors. Grapple hook to hook to cross to the engine room door, high on the far wall.
  - **Power:** two breakers, one on the hold floor (drop down to it, then grapple back up) and one in the engine room. With both thrown, her lamps come on and the **powered door to the lab** in her superstructure opens.
  - **The lab:**
    - the **sonar test logs** (→ sonar pulse);
    - the **pressure suit drawings** (→ PS-1);
    - **her log**, the first story fragment: her crew came to follow cyan and violet light patterns rising from the deep; it goes into the scanner log as an Artefact.
- **The grapple** now hooks any anchor: the race's rings, the bollard and the hold's hooks (`ANCHORS`). It fires only on a **fresh tap** of Collect: a Collect still held after finishing another action no longer fires it by surprise.
- **New research** (Lab):
  - Recompression room RC-1: scans of the wreck shelf + wreck lurker, 90 s.
  - Salvage crane SC-1: scans of a sealed hatch + the Corvina, 80 s.
  - Sonar pulse: her sonar logs, 100 s.
  - Pressure suit PS-1: her suit drawings, 140 s.
- **New gear** (Workshop):
  - **Sonar pulse SN-1** (3 brass, 2 copper, 2 quartz, 1 plating; 55 s). A tap of Scan also sends a pulse (every 6 s), with a deep ringing ping. Lurkers within 700 shrink back into their dens and rest for about 10 s.
  - **Pressure suit PS-1** (6 brass, 4 plating, 2 resin; 80 s). It can be built now; the trench (milestone 10) will use it.
- **The hidden passage:** a silt slump at the foot of the shelf edge (x about 19760, inside the race). A sonar pulse within 700 units finds the hollow behind it and the silt slides away. Inside is an **old salvage locker** with 3 brass and an Echo whorl.
- **New base pieces:**

| Piece | Size | Cost | Weld | Job |
| --- | --- | --- | --- | --- |
| Recompression room RC-1 | 2 × 1 | 5 brass, 3 plating, 2 quartz | 40 s | Swim inside (powered): the suit mends at 60%/s and air refills |
| Salvage crane SC-1 | 2 × 2 | 4 brass, 4 plating, 4 scrap | 45 s | Breaks heavy salvage into 4 scrap, 2 brass, 1 plating (one a minute per crane), into storage |

- **Heavy salvage:** a winch drum, a propeller hub and an engine block lie on the shelf (x 22720, 23660, 25300).
  - With the sub's grabber, hold Collect: "Lift the salvage". It hangs from the claw.
  - Near a powered salvage crane: "Lower the salvage onto the crane".
  - The crane waits, holding the piece, until storage has room. Salvage comes back after 15 minutes.
- **Tested** (scripted, game seconds; no console errors):
  - **Outside:** the upwelling lifted a diver from y 1150 to 838 in 1 s. From beside her stern, the grapple pulled the diver onto the bollard, and the deck hatch cut open.
  - **Inside:** the hold's downdraft pinned a diver from 1480 to the floor (1576). The floor breaker threw, and grapple shots crossed the hooks to the engine room. Both breakers gave power.
  - **Lab:** her log, the sonar logs and the suit drawings could all be taken; the stern door lever opened the door.
  - **Sonar:** a pulse at the shelf edge revealed the hidden passage, and the locker gave the whorl and brass.
  - **Base:** with a turbine, salvage crane and recompression room joined and powered, the sub lifted salvage, lowered it on the crane, and the crane broke it down. In the recompression room the suit went from 30% to 100% in about a second.
  - Screenshots of her outside, the lit hold and the lab.
  - The test found and fixed: the grapple firing from a held Collect; a salvage piece too close to a brass spot; and the crane throwing away output when storage was full.

### After milestone 8 part 2: on foot, and the Corvina as a real dungeon
- **Colin:** the ship felt clunky and not fun inside, and too small for a dungeon; the grapple to get in didn't feel good; the logs vanished too fast. He asked for:
  - entry by cutting the hatch only;
  - a dry inside with gravity, where the grapple hops you up to higher ledges;
  - a character that can walk and jump, reusable for later interiors;
  - a walkable base, which he chose to have **everything indoors**, machines included, as a later milestone (and it doesn't need to be save compatible).
- **Colin's choices:**
  - interiors are **separate spaces**;
  - **the Corvina first, the base after**;
  - indoors, the helmet's **face plate lifts with a short animation**.
- **Outside, the Corvina is solid steel again.** The upwelling, the bollard, the hold downdraft, the stern door and the cut-away decks are gone. Swim to her deck hatch, cut it with the cutter torch (3 s), then hold Collect: "Climb down into the Corvina".
- **Interiors on foot** (`src/interior/interior.ts`, new reusable system):
  - A separate dry space built from a tile map (40 units a tile) with its own lighting shader (`src/interior/light.ts`). The lighting is a low ambient that stays dark until a ship's power is back, plus ceiling lamps, red emergency lamps and the helmet lamp's beam. The world is hidden and paused while you're inside; dry air refills your tank.
  - **The explorer on foot** (`src/actors/walker.ts`): the same suit, drawn by code from joint angles, with stand, walk, jump, fall and hang poses. The lime-glass face plate lifts on entering.
  - **Controls:** the stick or A/D walks. Boost (Space/Shift, A on a pad) jumps, and holding it gives a higher jump; there's a short grace after stepping off a ledge, and a press just before landing still counts. Down + jump drops through a grating. Collect holds to use things.
  - **The grapple** marks the best anchor ring in range (420): ahead and above first, with a clear line. A tap of Collect fires it and reels you up to hang under the ring. Jump swings you off with a push; down lets go.
  - **Hazards:** steam vents burst every 3.2 s (8% suit and a knock back). The flooded bilge costs 10% suit and hauls you back to your last safe footing. If the suit gives way, you're back outside and the usual blackout follows.
  - After any hold action completes, Collect must be let go before the next one starts (so the lift doesn't carry you up and straight back).
- **The Corvina inside** (`src/interior/corvina.ts`, 100 × 36 tiles: 4000 × 1440 units, about 3× her outside length):
  - **The upper deck:** the hatch ladder, crates, a steam vent, a grating shelf, a hole down, the lift's top, and the powered bulkhead door to the **survey lab**.
  - **The crew deck:** bunks (gratings), a step too tall to jump (grapple up), a wide gap over the hold (grapple across), steam vents, **breaker 1**, and a drop into the hold.
  - **The great hold:** steel islands over the flooded bilge, crossed by grappling the anchor rings overhead. Shelves, a salvage crate (3 brass, 2 plating) on the far west island, and on the far east ledge **breaker 2** and the lift's bottom.
  - **With both breakers thrown:** lamps all over, the lift running (a shortcut from the hold to the upper deck) and the lab door open. The lab holds the **sonar test logs**, the **pressure suit drawings** and **the Corvina's log**.
  - Her state is saved (`save.corvina.breakers`, `save.corvina.taken`). The save point while inside is just outside her hatch.
- **Logs and documents** now open in a **reading panel** that stays until closed (Close, Esc or Enter) and pauses the game. The sonar logs, suit drawings and her log use it, and her log stays in the scanner log.
- **Notices last longer:** about a quarter of a second a word (up to 14 s), and a tap dismisses one.
- **Fixed on the way:** a brass spot sat on the Corvina's deck right beside the hatch and took the Collect button; it moved to the seabed beside her stern.
- **Tested** (scripted in headless Chromium, timed in game seconds; no console errors):
  - **Entering:** at the cut hatch, "Climb down into the Corvina" put the walker on the upper deck.
  - **Walking and jumping:** walking stops at crates, and a jump clears them. A full jump is 98 units (about 2.4 tiles). Down + jump dropped through a grating (y 240 → 360).
  - **The grapple:** the tall step blocks walking, and the grapple pulled the walker up to hang under its ring. Swinging off went across the crew deck's gap (to x 2344), and in the hold from a ring to the east ledge (x 3912).
  - **Hazards:** a steam vent cost 8% suit. The bilge hauled the walker back to its last footing and cost suit.
  - **Power:** the lab door blocks without power. Both breakers gave power; the lift went up (and no longer bounces straight back), and the door opened.
  - **The lab:** the sonar logs opened the reading panel and paused the game; Esc closed it.
  - **Leaving:** climbing out put the diver back above her deck.
  - Screenshots: the dark decks lit by the helmet lamp, the hold, the lit lab.
  - The tests found and fixed: the lift ping-pong (Collect must now be released between actions), too dark and too small a view (zoomed in, brighter ambient before power), and the interior's state drifting from the save.

### The walkable base, part 1 (after the Corvina on foot)
- **Colin's feedback:** new concept art for the base pieces and the diver (saved in `docs/art/kit2/`). Nothing was flagged about walking, jumping, the grapple or the Corvina's decks, so those are unchanged.
- **Colin's choices (all suggested):**
  - in through the dome's airlock (the moon pool comes in part 2);
  - build from the build view: outside as before, or from the **base planner** console in the dome (no new indoor build controls);
  - side joins are doorways, up/down joins are ladders (a lift only for shafts taller than 3 cells; none needed yet);
  - **pieces keep their grid size outside**, but each cell is **8 × 6 tiles indoors** (320 × 240 units);
  - conveyors and pipes along the ceilings (part 2);
  - outside, the base is closed hulls in the new style: **you no longer swim "into" pieces**; everything is used indoors;
  - creature tanks are seen through big windows from inside, and Tend opens at the window;
  - **the base keeps running while you're inside** (drone, Labs, Workshops, cranes, factory lines, creatures);
  - everything stays drawn by code, to match Colin's renders. The **harpoon is decoration for now**; keep its design in mind for later tools and weapons.
- **The base indoors** (`src/interior/baselevel.ts`): the rooms are built automatically from the finished pieces on the grid, so they always match the layout.
  - Joined side collars become **doorways** through both walls, with chrome flanges. Joined up/down collars become **ladder shafts** through floor and ceiling.
  - Pieces two cells tall (dome, turbine, feeder, crane, Grand tank) have a **grating mezzanine** and a ladder up the left side. The dock has a catwalk over the **moon pool**.
  - A **frame** still being welded isn't a room yet: its doorway is a sealed hatch with a red lamp. When it finishes while you're inside, the rooms rebuild around you.
  - Open collars on the outside show as round windows onto the water.
  - Each room's lamps light only while that piece has power. Unpowered rooms are dark.
- **What each room does** (hold Collect at the spot):
  - **dome:** airlock (go out), base planner (build view), bunk and galley console. The glass dome is the upper level's window. You wake here after a blackout.
  - **storage / sorting pod:** unload what you carry. Crates on the racks and a gauge show how full storage is.
  - **creature tank / Grand tank:** a window wall with the creatures, plants and bubbles. Put the jar's creature in, take the output tray, or Tend (opens the care panel).
  - **Lab / Workshop:** opens their panel. The Lab's hologram and the Workshop's arm work while a job runs.
  - **Moon pool dock:** dock controls. Docking and the sub itself are still outside.
  - **recompression room:** seal the chamber to mend the suit to 100% and fill the air.
  - **turbine, filter, feeder, press, crane:** a status line (power, levels, plates, salvage waiting). The turbine's impeller turns in a round window; the press's ram strokes while it runs.
  - Panels (care, Lab/Workshop, dock, build) open by showing the base from outside for a moment; closing the panel puts you back where you stood.
- **Ladders** (reusable in any interior, map letter `H`): push up or down at a ladder to climb; jump hops off sideways; push left or right where it passes a floor to step off. The top of a ladder holds you up like a grating.
- **Inside the base** the air is dry and refills your tank, and the suit mends at 25%/s.
- **Outside:** hold Collect at the round hatch on the front of a dome's drum: "Go in through the airlock". Storage, tanks, Labs, Workshops and the recompression room no longer do anything from outside. The dock's outside button stays (for the sub).
- **The new base kit outside** (`src/world/basegfx.ts`, the `PAL` palette, `goldTraces`, `flangeV`):
  - charcoal hull, chrome flanges and joints, lime glass, gold power lines and one red lamp, with no yellow plate or hazard stripes;
  - the **dome** has lime glass, a chrome rim and a round airlock hatch on the drum;
  - the **corridor** is a charcoal drum with thick chrome end flanges, a lime porthole and a coiled conduit;
  - the **turbine** is a tall column with lime grille vents, a glowing gold spine and the impeller in a chrome ring;
  - the other pieces pick up the new palette.
- **The Crest diver look** (`src/actors/diver.ts`, `src/actors/walker.ts`), swimming and on foot:
  - charcoal suit and sleeves with gold circuit lines;
  - neon lime crest helmet, chrome collar and hose rebreather;
  - twin oxygen tanks with lime bands, and a harpoon clipped along them;
  - a white **hip thruster** rig with a lime nozzle that throws a **lime plume while boosting**;
  - red gloves and short red-tipped fins.
- **Also changed:** the interior lighting now keeps only the nearest 16 lights (it used to drop lights at random past 16). The camera sits lower in the base, so you see the rooms rather than the water under them.
- **Tested** (scripted in headless Chromium, which runs at about 3 fps there, so every step waits for its result; no console errors):
  - a 13-piece test base built its rooms correctly: doorways, a ladder shaft from storage up through a vertical corridor into a sorting pod, mezzanines, and a sealed door to a Grand tank frame;
  - climbing the dome's ladder onto its mezzanine; walking from the dome through a corridor and the turbine into storage;
  - unloading 3 scrap into storage, and climbing the shaft to the upper floor;
  - Tend at the tank window opened the care panel outside, and closing it put the walker back in the tank room;
  - the airlock put the diver outside the dome;
  - screenshots of the dome, sorting pod, tank room, the outside of the base and the boosting diver.
  - The tests found and fixed: the dome ladder running past its mezzanine (you couldn't step off), and glowing fills (tank water, dome glass) drawing over the explorer.

### The walkable base, part 2 (after part 1)
- **Colin's feedback:** none given before part 2, so part 1 is unchanged. The choices from part 1 stand (ceiling lines, moon pool as a second way in, lifts for tall shafts, base keeps running).
- **Conveyors and feed pipes along the ceilings** (`routeLine`, `drawRoutes` in `src/interior/baselevel.ts`):
  - Each line runs from its machine's port up to the ceiling, along the ceilings of every room between the two machines, through the walls at doorways, up and down the ladder shafts, and drops into the other machine. The route follows the pieces joined end to end (the shortest chain of rooms).
  - Belts are a dark belt on a chrome cradle; pipes are copper with chrome clamps. A chrome junction box with a gold (out) or lime (in) arrow marks each end.
  - **Items move on them:** bundles of material on belts in the material's colour, soft lime pulses in pipes, only while the line is carrying something (the same flow numbers as outside). Lines take up to four lanes under the ceiling so crossing lines can be told apart.
  - Outside, lines are drawn as before.
- **The moon pool as a second way in:**
  - Berthed in a finished, powered dock in a base that has a dome: **Exit (V)** now climbs you up into the dock room's catwalk instead of out into the water.
  - In the dock room, hold Collect at the left of the pool: **"Climb down into KS-1"** boards the sub and puts you back in the water in it.
  - The docked sub is drawn in the pool, under the catwalk.
  - Without a dome (or without power), Exit still climbs out into the water as before.
- **Lifts:** a shaft taller than 3 cells in total (for example storage, sorting pod, two corridors and another sorting pod) gets a lift pad at each end (two tiles right of the ladder). Hold Collect: "Take the lift up / down". The ladder still works.
- **Fitting whorls from inside:** once an Echo whorl has been found, tanks, Grand tanks, feeders and presses show "Fit Echo whorls to CODE (n free)" at the right-hand end of their room. It opens the build view with that machine already selected.
- **Tested** (scripted in headless Chromium at about 3 fps; no console errors): a 13-piece base with three lines (a belt from storage to the press across the whole base, a pipe from the feeder up a shaft to the tank, a belt between two stacked rooms) routed and drew; the lift carried the walker between floors (y 1280 to 320); boarding from the dock left the interior with the sub aboard; Exit from the docked sub came up into the base; the whorl console appeared at the press. Screenshots of the press room's ceiling lines, the feeder's pipe and the dock.
- **Not done yet from the original part 2 list:** each machine room is not much more detailed than in part 1; the ceiling lines add the most. A line's code plate (CB-1, FL-2) is not drawn indoors.

### Graphics fidelity audit (planning only, 2026-11-17)
- **Colin asked for** a graphics fidelity initiative: a more polished, premium look without changing the art direction, the renderer or gameplay. This session was an audit and plan only; **no code changed**.
- **The plan is in `docs/graphics-fidelity-plan.md`**: how the renderer works today (draw order, passes, shaders), what is missing (no HDR or tone mapping, bloom only on opted-in objects, lights that pass through rock, flat-lit surfaces, generic backdrops, unlit particles), the performance picture, ten upgrades ranked by visual impact, and four sessions (G1 measure + HDR post stack; G2 light with form and shadow; G3 atmosphere and composition; G4 materials and creatures, optional).
- **Baseline screenshots** (Ultra, cloud software renderer, 1280 × 680): `docs/art/fidelity/before-*.png` (shallows, grotto with lamp, kelp forest, wreck shelf).
- **No frame times were measured**: the cloud browser has no GPU. Session G1 builds a performance overlay and a fixed benchmark route so Colin can measure his PC (RTX 5080, about 106 fps at 2560 × 1360 on Ultra today) and iPhone before and after each session.
- **Colin approved the plan** and chose to run session G1 next, before milestone 9 (the walkable base part 2 was finished in a parallel session). The G1 prompt is in `docs/prompts/graphics-g1.md`.

### Graphics session G1: measure, then HDR and the post stack (2026-11-17)
- **Colin's feedback on the walkable base, part 2:** "looks good". Nothing was flagged, so nothing was fixed.
- **Housekeeping:** the plan (`docs/graphics-fidelity-plan.md`) and this session's prompt lived on the audit branch `claude/fathomlight-graphics-audit-2p8vp3`; they were merged into this branch (a fast-forward) so the session could read them.
- **Rendering only.** No gameplay, save format or drawing code changed beyond what the passes need. No new dependencies, no WebGPU, no Three.js. All colours still obey the Choir rule (cyan, violet and magenta only for the Choir).

**1. Performance overlay** (`src/dev/perf.ts`; Settings → Graphics effects → **Show performance**, off by default)
- Shows fps and frame ms, **CPU update** ms (the game's own frame code) and **CPU render** ms (handing drawing to the graphics card), **GPU ms per pass**, draw calls, triangles, light count and render resolution.
- GPU times come from `EXT_disjoint_timer_query_webgl2` where the browser has it (desktop Chrome and Edge do). Safari on the iPhone does not, so there it says "GPU timer: not available here" and the frame time and fps are the numbers to read. A software renderer (like the cloud's) is detected and its timer is not used.
- Passes: `lit` (the flat picture), `glow`, `scene` (water, rock, lighting, emissives, glow and snow into the HDR picture), `bloom`, `post` (the final pass plus the crisp overlays).
- Draw calls and triangles are counted by wrapping the GL draw calls, only while measuring is on.

**2. Benchmark route** (`src/dev/bench.ts`; open the play link with `?bench` on the end)
- Seven scenes, about 8 s each (the first 2 s and 3 frames of each are not measured; a slow machine runs on until it has 10 frames): shallows at the buoy, basin with a seeded big base (40 pieces, 17 lines, view zoomed out 2.2×), grotto with the lamp on, kelp forest, kelp caves black chamber (two brackets lit), wreck shelf by the Corvina, base interior with ceiling lines (standing in the press room). The diver is held still with a slow sideways sway so water, particles and lights all move.
- It prints a table (fps, mean ms, p95, worst, CPU update and render, GPU ms, draws, triangles, lights, frames, resolution) with a **Copy table** button, and GPU ms per pass underneath.
- **It never touches the real save:** with `?bench`, `loadSave`, `writeSave` and `clearSave` in `src/game/state.ts` skip the device's save entirely (checked: no save key is written). The base is seeded from a fixed recipe (`seedBenchSave`).
- Extra developer switches: `&still` holds the view perfectly still, `&scene=N` (0 to 6) stays in one scene for screenshots, `&at=x,y` moves that scene, `&sync` waits for each pass to finish and times it (a stalling estimate for machines without a GPU timer, used here for the cloud).

**3. Baseline numbers (cloud, before any rendering change): relative only.** The cloud browser has **no GPU** (SwiftShader, software), so frame times there are not GPU times and are not comparable with Colin's devices: they only say whether something got dramatically worse. What is reliable is draw calls, triangles, lights and the CPU numbers. These came from the code as it stood before the post stack (measuring tools only), at 1280 × 680 Ultra and 844 × 390 High, one run each (noise is about ±20% per scene).

| Scene (Ultra, 1280 × 680) | Draw calls | Triangles (k) | Lights | CPU update ms | CPU render ms | Software frame ms |
| --- | --- | --- | --- | --- | --- | --- |
| Shallows at the buoy | 223 | 532 | 1 | 2.4 | 13.0 | 656 |
| Basin, seeded big base | 219 | 391 | 10 | 1.5 | 5.9 | 614 |
| Grotto, lamp on | 153 | 363 | 12 | 1.8 | 7.2 | 788 |
| Kelp forest | 147 | 260 | 4 | 2.1 | 6.6 | 780 |
| Kelp caves, black chamber | 136 | 470 | 6 | 1.4 | 5.3 | 564 |
| Wreck shelf, by the Corvina | 139 | 475 | 2 | 1.6 | 7.3 | 903 |
| Base interior, ceiling lines | 17 | 121 | 13 | 0.9 | 3.2 | (65, sync-stalled) |

| Scene (High, 844 × 390) | Draw calls | Triangles (k) | Lights | CPU update ms | CPU render ms | Software frame ms |
| --- | --- | --- | --- | --- | --- | --- |
| Shallows at the buoy | 211 | 414 | 1 | 1.6 | 6.8 | 262 |
| Basin, seeded big base | 209 | 375 | 8 | 1.5 | 5.5 | 344 |
| Grotto, lamp on | 143 | 256 | 8 | 1.8 | 5.5 | 315 |
| Kelp forest | 138 | 204 | 4 | 1.5 | 4.3 | 231 |
| Kelp caves, black chamber | 126 | 360 | 7 | 1.2 | 3.1 | 312 |
| Wreck shelf, by the Corvina | 128 | 364 | 3 | 1.7 | 6.7 | 261 |
| Base interior, ceiling lines | 17 | 121 | 15 | 1.1 | 2.7 | (110, sync-stalled) |

- **Reading them:** the world is about 140 to 230 draw calls and 250 to 530 thousand triangles; the CPU side is small (the game's own code 1 to 2.5 ms, submitting drawing 3 to 13 ms), so the CPU is not the limit on a PC and probably not on the phone either. Where the time goes on a real GPU is the question for **Colin's PC and iPhone numbers** (see "What Colin should do next" below). **No GPU timings were invented.**

**4. Cheap wins**
- **Caustics skipped where they cannot be seen** (`src/fx/lighting.ts`): the caustic net (about a hundred transcendental operations per pixel, three times over on Ultra) is skipped wherever it would add less than about one level of 255 (deep water, caves, shaded areas, under rock). Settings toggle "Skip hidden caustics" turns it off to compare. In the cloud the grotto (caves, shade) was the scene that got cheaper in software (about 590 to 470 ms in one run); the real saving has to be measured on a GPU.
- **Canvas MSAA is off** (`antialias: false` in `src/main.ts`): the screen is now one full-screen quad (the post pass) plus thin overlays. The world's own edges are antialiased in the pictures it is drawn from: the flat picture still has MSAA, and on **Ultra the world picture has MSAA too** ("Smooth edges (MSAA)" in Settings, `hdrMsaa` in `presets.ts`). Without it, the long rock ridges in the backdrop show faint stair-steps on a 1× screen (checked in a crop); with it they match the old look. **High has no MSAA** (the phone renders at 2×, and the screenshots at that density look clean). Note: in the software renderer, MSAA on a half-float picture is a slow path (about +50% frame time there); a real GPU should not care, but this is **the first thing to compare on the PC** (Smooth edges on and off).

**5. The HDR post stack** (`src/fx/post.ts`; wired up in `src/main.ts`, search "Measuring" and `drawPost`)
- **New draw order.** The world (water, backdrop, lighting, emissives, glow sprite, snow, and dry interiors) is drawn into one **half-float picture** (`PostStack.sceneRT`). Then the **bloom chain**, then **one full-screen post pass** to the screen, then the **scanner, build grid and collect rings** (`overlayCam`) on top, crisp. The old CSS vignette (`#vignette`) is gone; the DOM HUD, low-air edge and blackout are unchanged.
- **Half-float check:** the device is tested on a scratch WebGL context (`halfFloatSupported`): the extension, plus a real framebuffer-completeness check. If it fails (older iPhones), the picture is **8-bit** instead: the whole stack still works, but tone mapping is switched off (there is no light brighter than white to roll off, so it would only dim highlights) and bloom starts 0.18 lower. Settings shows which path is in use under "Graphics effects".
- **Tone mapping:** a soft shoulder, untouched below 0.72 and rolling off towards white above it (continuous in value and slope), per channel so very bright warm lights go creamy white instead of clipping into flat coloured discs.
- **Per-zone colour grading** (`GRADES` in `post.ts`; zone weights from `zoneMix`, eased so crossing a boundary never pops): shallows warm and clear, basin cool, forest green and dim, shelf grey-teal (saturation 0.7), caves near black but kept readable (brightness within about 8% of before), interiors dry steel. Brightness stays within about ±6% of the old look in every other scene (measured on the benchmark screenshots).
- **Bloom** (threshold with a soft knee, 13-tap downsample chain, tent upsample, with the old **glow layer fed into it** through a wide filter so its sharp stored edges never show): anything brighter than white blooms, lamp-lit hull and brass roll off softly, lures and anemones glow naturally. The existing glow sprite is unchanged, so existing glows keep their look.
- **Vignette** moved into the final shader (same shape and strength as the CSS one). **Fine grain** (strongest in the mid-tones) also dithers the 8-bit output.
- **Interiors get the same post pass** (their own grade). Their lighting shaders now draw into the HDR picture (`RT_VERTEX` in `src/fx/shared.ts`: Pixi stores off-screen pictures upside down, so the water and the two lighting shaders use a flipped vertex shader).
- **Settings → Graphics effects** (all saved on the device): HDR picture, Tone mapping, Colour grading, Bloom, Vignette, Film grain, Smooth edges (MSAA), Skip hidden caustics, Show performance. With **everything off** the picture is the old look (clamped colours, no vignette); that is the A/B reference.
- **Readability checks:** pickups, the lurker's warning flare and the grotto's glowing lures still pop (warm glows, bloom is subtle: strengths 0.30 to 0.34); build ghosts and grid are in `overlayCam`, drawn after post, so they are crisp (checked in build mode); the basin floor, caves and wreck shelf stay readable (mean brightness of the benchmark screenshots: shallows +4%, basin +1%, grotto -6%, forest -4%, caves -8%, shelf -3%, base -4%).
- **Screenshots** of the same fixed scenes before and after, Ultra, 1280 × 680, software renderer: `docs/art/fidelity/g1-before-*.jpg` and `g1-after-*.jpg` (shallows, basin, grotto, forest, caves, shelf, base). The earlier `before-*.png` are from the audit.

**After, in the cloud (relative only).** Same scenes and settings as the baseline, with the post stack. Draw calls rise by about 8 (High) or 12 (Ultra) for the bloom chain and the final pass; triangles, lights and CPU time are unchanged within noise. Software frame time (not a GPU time): High averaged 288 ms before and 288 ms after over the six outdoor scenes; Ultra averaged 717 ms before and 693 ms after with Smooth edges off, and about 1115 ms with it on (the software-only MSAA slow path above).

| Ultra, 1280 × 680 | Draw calls | CPU update ms | CPU render ms | Software frame ms: before → after (edges off) → after (edges on) |
| --- | --- | --- | --- | --- |
| Shallows at the buoy | 223 → 235 | 2.4 → 2.5 | 13.0 → 7.8 | 656 → 629 → 988 |
| Basin, seeded big base | 219 → 231 | 1.5 → 1.5 | 5.9 → 5.3 | 614 → 682 → 1008 |
| Grotto, lamp on | 153 → 165 | 1.8 → 1.8 | 7.2 → 6.6 | 788 → 730 → 1217 |
| Kelp forest | 147 → 159 | 2.1 → 1.5 | 6.6 → 7.9 | 780 → 702 → 1205 |
| Kelp caves, black chamber | 136 → 148 | 1.4 → 1.5 | 5.3 → 3.4 | 564 → 662 → 1088 |
| Wreck shelf, by the Corvina | 139 → 151 | 1.6 → 1.6 | 7.3 → 6.8 | 903 → 752 → 1183 |
| Base interior (60 fps-capped; sync-stalled, not comparable) | 17 → 29 | 0.9 → 1.4 | 3.2 → 3.0 | n/m |

| High, 844 × 390 | Draw calls | CPU update ms | CPU render ms | Software frame ms |
| --- | --- | --- | --- | --- |
| Shallows at the buoy | 211 → 219 | 1.6 → 2.1 | 6.8 → 6.2 | 262 → 260 |
| Basin, seeded big base | 209 → 217 | 1.5 → 1.5 | 5.5 → 5.0 | 344 → 360 |
| Grotto, lamp on | 143 → 151 | 1.8 → 1.5 | 5.5 → 4.2 | 315 → 321 |
| Kelp forest | 138 → 146 | 1.5 → 1.4 | 4.3 → 5.3 | 231 → 232 |
| Kelp caves, black chamber | 126 → 134 | 1.2 → 1.2 | 3.1 → 3.3 | 312 → 288 |
| Wreck shelf, by the Corvina | 128 → 136 | 1.7 → 1.5 | 6.7 → 5.3 | 261 → 265 |
| Base interior (sync-stalled, not comparable) | 17 → 25 | 1.1 → 1.2 | 2.7 → 2.4 | n/m |

- **High cost review (the 10% rule).** The iPhone cannot be measured from the cloud, so High was built as the cheap set from the start: half-float picture with no MSAA, bloom starting at **¼** screen (a quarter of Ultra's pixels) with 4 steps instead of 6, a lighter grain, one extra full-screen pass in all. Nothing was cut from High yet. **If the phone is more than about 10% slower in the grotto than Colin's mid-30s**, cut in this order, each one a Settings toggle and a number in `presets.ts`: (1) Bloom, (2) HDR picture off (8-bit), (3) Film grain. The caustics skip should give some of it back in the grotto.
- **Tested** (type check and production build pass; headless Chromium in the cloud, software GL, so slow): the whole benchmark ran in both presets with no console errors and wrote no save; every Settings toggle switches on and off at runtime with no Pixi warnings (after fixing a texture-lifetime warning); the 8-bit fallback was forced by hiding the float extensions and the game ran with the note shown; build mode (grid, ghost, bottom bar) draws correctly over the post pass; phone layout (844 × 390 at 2×) shows the new Settings block and the overlay; before and after screenshots of all seven scenes.

- **Fix after Colin's first look:** the Settings panel would not scroll by touch on the iPhone (the page blocks touch scrolling, and G1 made the panel longer, so the Graphics effects block was out of reach). `#hud .panel` now has `touch-action: pan-y`.

**What Colin should do next (also sent as a message):**
1. Open the play link with `?bench` on the end (on the PC and then on the iPhone, with the phone in landscape and plugged in or at normal battery). Wait for the table (about a minute), tap **Copy table**, and send both tables. On the PC, run it again with **Smooth edges (MSAA)** switched off in Settings to see what that costs, and once with **Show performance** on while swimming the grotto with the lamp.
2. Look at the game in the shallows, grotto, forest and shelf, and flip **Tone mapping, Colour grading, Bloom, Vignette** one at a time (Settings → Graphics effects). Say which you like and which are too strong.
3. Tell us the grotto's frame rate on the iPhone with everything on, against his earlier mid-30s.

### Graphics session G2: light with form and shadow (2026-11-17)
- **Colin's feedback on G1:** the Settings panel would not scroll by touch (fixed straight away: `touch-action: pan-y`); "I like the look". He chose G2 next. His G1 PC and iPhone `?bench` numbers had not arrived, so the G2 cost is also unmeasured on real hardware.
- **Lamp shadows** (`src/fx/lighting.ts`, `src/world/terrain.ts`): the world bake now also stores **where rock, steel and sand are** (the green channel of the same mask the daylight bake uses, so no extra texture). The diver's lamp and the sub's lights **march from each lit pixel towards the lamp** through that map: thick rock or hull between blocks the light, so the cone and its visible beam **stop at pillars, ceilings and the Corvina's hull** and leave real shadow behind them (see the caves and shelf pairs). A pixel's own rock counts as its surface, not as a shadow (otherwise the lit floor goes dark), and a thin skin of rock only dims. Only the first few lights cast (`lightShadows`), the rest stay as before.
- **Relief lighting:** a surface normal worked out from the art itself (coverage plus brightness slope, 4 taps; 8 on Ultra). Each light, and the sun, now shades by the normal, so rock, hull plates and rivets pick up form; caustics fall only on surfaces that face up. Strength 0.55 (High) and 0.8 (Ultra), `relief` in `presets.ts`.
- **Contact shadows** (generalising the diver's old Ultra-only ellipse): soft ellipses under the diver, the sub, the drone and the feet of base pieces on the seabed, up to 6 (High) or 12 (Ultra), on both presets.
- **Interiors** (`src/interior/light.ts`): a one-pixel-per-tile steel map (`setOccupancy`) lets the helmet lamp and the nearest room lamps cast shadows through walls (so a lamp no longer lights the next room through a wall), plus the same relief lighting.
- **Settings → Graphics effects:** new toggles **Lamp shadows, Relief lighting, Contact shadows** (with all of them off the picture matches G1).
- **Readability:** mean brightness of the seven benchmark scenes changed by at most -2%, except the caves (-21%: the lamp no longer lights through the rock, so the black chamber is darker behind pillars; the lit parts, pickups and brackets are unchanged) and the base interior (-6%). If the caves are too dark, raise the rock softness (`uShadowCfg[1]`, 26) or lower `lightShadows`.
- **Screenshots** before and after (Ultra, 1280 x 680, software renderer): `docs/art/fidelity/g2-before-*.jpg` and `g2-after-*.jpg`.
- **Cloud numbers, relative only** (640 x 340 Ultra and 422 x 195 High so the software renderer can keep up; two runs each, six outdoor scenes averaged; software frame ms, not GPU time, about 20% noise): Ultra 477 ms before, 501 after (+5%); High 185 before, 190 after (+3%). Draw calls and triangles are unchanged within noise. The base interior in High was about 25% slower in software (50 to 62 ms), since its shader got a march and normals; it is a light scene, but **check indoors on the phone**.
- **First real iPhone number (Colin, after G2):** High, every effect on, swimming in the grotto with the lamp on (screenshot of the overlay): **28 fps, frame 35.9 ms, CPU update 1.7 ms, CPU render 4.2 ms, 146 draw calls, 235.7k triangles, 8 lights, 1748 x 804.** The GPU timer is not available on Safari, so there is no per-pass split. Colin is **happy with it**. For reference, his milestone 1 reading in the same kind of scene was the mid 30s fps, so this is a little lower, but it is a different build and a single reading; the CPU side is tiny, so the time is on the GPU. No `?bench` table yet, and no with-and-without comparison: still to come if Colin wants to tune further.
- **Cost to measure on real hardware:** the shadow march only runs for pixels inside a lit cone (10 taps High, 22 Ultra, jittered per pixel and per frame so it shows up as grain, not bands); relief is 4 or 8 taps for every lit pixel. The G1 overlay shows GPU ms per pass: compare the `scene` pass with Lamp shadows and Relief lighting on and off in the grotto and the black chamber.
- **If High is more than about 10% slower than after G1 on the iPhone**, cut in this order (each a toggle and a number in `presets.ts`): Relief lighting, then `shadowSteps` (10 to 6), then Contact shadows. Nothing has been cut from High yet.

### Graphics session G3: atmosphere and composition (2026-11-17)
- **Colin's feedback on G2:** he ran High with every option on in the grotto on the iPhone and was **happy with the performance** (28 fps, 35.9 ms; details in the G2 section). He asked for G3 and then G4 to follow so he can test them together.
- **Zone backdrops** (`src/scene/zonebackdrop.ts`): faint mid-ground silhouettes, drawn once, fogged to the water colour and positioned in world space at one parallax depth: **the basin** gets boulders and natural arches, **the kelp forest** ranks of distant kelp, **the wreck shelf** sunk hulks with masts and a crane. Kept low-contrast (alpha 0.62 at most) so they never read as swimmable rock. The kelp caves have none (the cave interior hides the backdrop anyway).
- **God rays:** a quarter-screen pass marches from each pixel toward a sun above the screen through the flat lit picture, so shafts are cut by kelp, rock, hardware and the diver; they fade with camera depth (gone below about 20 m) and are skipped entirely when too deep or indoors.
- **Lit marine snow:** specks inside the four brightest lights catch them (brighter and warm), and a sparse near layer of big soft out-of-focus specks ("bokeh", 5 on High and 12 on Ultra) slides past in front.
- **Depth of field (Ultra only):** the near foreground kelp gets a soft 2.4 px blur; High keeps it sharp.
- **Surface shimmer:** a faint, noise-broken caustic net drifting through the water just under the surface.
- **Settings → Graphics effects:** Zone backdrops, God rays, Lit snow, Depth of field, Surface shimmer (all saved on the device).
- **Readability:** mean brightness of the seven benchmark scenes changed by -0% to +5% (the shallows get brighter from the rays and shimmer). Screenshots before and after (Ultra, 960 x 510, software renderer): `docs/art/fidelity/g3-before-*.jpg` and `g3-after-*.jpg`.
- **Cloud numbers, relative only** (640 x 340 Ultra, 422 x 195 High, two runs each, six outdoor scenes averaged, software frame ms, about 20% noise): Ultra 526 before and 535 after (+2%); High 199 before and 204 after (+2%). Draw calls +3.
- **Not done from the G3 plan:** the kelp caves' rock-pillar backdrop, and forward scattering in the lamp beam as its own effect (the lit snow gives the sparkle).
- **If High slows more than about 10% on the iPhone**, cut in this order: God rays, Lit snow, Zone backdrops (each a toggle and a number in `presets.ts`). Nothing has been cut yet.

### Graphics session G4: materials and life (2026-11-17)
- **Colin asked for G4 straight after G3** so he can test both in the morning. G3 was deployed first, then this.
- **Grime and grain** (`src/fx/lighting.ts`): painterly mottling, vertical streaks and a fine grain **anchored to world positions**, so they never swim with the camera. Greyish bright pixels are treated as hardware and get several times more than rock and water (a simple colour test, not a per-object mask).
- **Metal sheen:** chrome, brass and bright steel catch the diver's lamp and the sub's lights with a highlight worked out from the G2 relief normals, so it travels across a flange as the lamp moves. It needs Relief lighting on.
- **Dome glass streak** (`src/world/basegfx.ts`): a pale slanted band slides slowly across each dome habitat's glass (clipped to the dome), a pass every twenty seconds or so.
- **Eye-shine** (`src/world/wildlife.ts`): creatures inside the lamp's beam get a warm glint at the head (warm only, never the Choir's colours), stronger when close and squarely lit, and strongest on the wary kelp-forest species (crabs and shrimp).
- **Render scale** (Settings, off by default): supersampling (1.5x on Ultra, 1.25x on High) for a sharper picture at a GPU cost; capped by the 4K backbuffer limit.
- **Settings → Graphics effects:** Grime and grain, Metal sheen, Glass streak, Eye-shine, Render scale.
- **Not done from the G4 plan, honestly:** refraction of what is behind dome and tank glass (only the moving streak, and only on domes, not the creature tanks); sheen is a shader effect, not hand-placed shine lines in the drawing files, so it only touches bright grey surfaces; no new fin flutter (the wreck lurker already undulates; other creatures were left alone); no extra bioluminescent detail toward the shelf.
- **Readability:** mean brightness of the seven benchmark scenes changed by 0 to -5% (grime darkens a little). Screenshots before and after (Ultra, 960 x 510, software renderer): `docs/art/fidelity/g4-before-*.jpg` and `g4-after-*.jpg`. The first version of the grime looked like woven cloth on the rock; it was cut to about 40% and its fine grain reduced.
- **Cloud numbers, relative only** (640 x 340 Ultra, 422 x 195 High, two runs, six outdoor scenes, software frame ms, about 20% noise): Ultra 621 before and 645 after (+4%); High 248 before and 249 after (0%).
- **If High slows on the iPhone**, cut in this order: Metal sheen, Grime and grain, Eye-shine. Render scale is off by default.
- **Tested:** type check and build pass; every Settings toggle (all effects of G1 to G4, including Render scale) flipped on and off with no console errors; before and after screenshots of the seven scenes.

### Character animation, session A: the swimming diver (2026-11-17)
Colin asked for a dedicated polish pass on the player character before milestone 9: natural, weighty, fluid movement for someone in a heavy exploration suit, with nothing cartoonish. Session A covers the diver (`src/actors/diver.ts`); session B covers the walker. The architecture is unchanged: drawn by code, jointed pieces, no sprites or animation libraries.

**Audit (what was wrong before)**
- **Turning snapped.** The body's tilt was multiplied by the facing (`pitch * face`), so at the moment the diver turned, the tilt flipped sign in one frame (about 0.44 rad when floating head-up) while the width was still squashing.
- **The knee bent both ways** (it over-straightened backwards on half of every kick), the fin angle was a fixed sine with no follow-through, and boosting switched the kick strength on and off in one frame.
- **No breathing underwater.** Bubbles came from their own timer in `fx/bubbles.ts`, unrelated to the diver.
- **Two small arrays were created every frame** in the limb code, and the thruster plume was cleared every frame even when not boosting.
- The pose **froze while the grapple reeled the diver in** (`update` is not called then).
- **Performance:** Colin's 28 fps grotto reading (G2 section) was a 35.9 ms frame with only 1.7 ms of game code, so the time goes to the graphics card (lighting, shadows, post), not the CPU or the character.

**What changed** (all in `animate()`, `animateHead()`, `animateGear()` and `animateLimbs()`; physics, controls and collisions are untouched)
- **Flutter kick from the hips.** The thigh swings; the knee only bends one way, most as the thigh starts down, then straightens through the downbeat (the whip). Each **fin is a damped spring** pushed by the water against the sweep of the foot, so it trails and flexes. The fin is now two pieces, so its **softer red-tipped end bends further** than the root.
- **Effort builds and fades.** A smoothed `drive` (0..1) sets the kick rate and size, so acceleration builds up the kick and letting go slows it gradually. The diver then **glides with legs together** and settles into the floating pose over about 2 seconds. The kick phase only ever advances, so the legs never jump. Slow swimming kicks slow and small, fast swimming quicker and bigger, and a heavy bag harder.
- **Boost** ramps in fast and fades over about half a second: a harder, quicker whip, arms tucked in tight, head down a little.
- **Turning** is a mirror in world space (the view's x scale, driven by a critically damped spring), so the tilt never flips. While coming round, the body lifts slightly, the kick picks up and **the hands scull to steer**. The lamp beam swaps sides when the body is edge-on.
- **Body angle** follows a soft spring (a hint of follow-through), with a little torso roll and rise and fall from the kick.
- **Arms:** a lazy figure-of-eight scull in front when floating; when setting off they **pull back along the body like a stroke**, then trim a little with each kick; they drift forward slowly when stopping. They also scull a little on slow climbs.
- **Floating still:** knees bent and hips a little flexed (the far leg slightly different from the near one), small irregular holding kicks, the existing buoyancy bob, and **breathing**: the chest rises and the body lifts slightly on each breath in. Every few seconds the head inside the glass **looks up, down or ahead**. There is an occasional **blink**.
- **Breathing and bubbles:** breaths are slow when still (about 4.2 s) and quicker when working hard (about 2 s when boosting). **Bubbles now leave the helmet on each breath out**: a burst, then a short trickle (`Diver.takeBubbles()`, read by `Bubbles.update` in `main.ts`).
- **Equipment:** the dive bag swings on its clip like a pendulum (back when speeding up, forward when slowing, jiggling with the kick); the breathing hose is now its own piece and sways a little with the head, the breath and changes of speed. The head is its own piece, so it can turn inside the glass.
- **While being reeled in by the grapple** the diver keeps animating (`Diver.pose(dt)`).
- `lampPose()` now reuses one object (no garbage per frame); no arrays are made per frame.

**Animation lab** (`animlab.html`, `src/dev/animlab.ts`; on the play link at `.../fathomlight/animlab.html`, or `npm run dev`)
- The diver swims through a fixed 50-second script without moving across the screen: floating, slow, fast, boost, cruising, let go, set off, turn, diagonal up, straight up, straight down, turn while diving, stop, boost from still, floating. It is shown at iPhone landscape **gameplay scale** (640 world units to the screen height) on the left and **3× close up** on the right.
- WASD or arrow keys take over, Shift boosts, P or a tap pauses. `?seg=N` starts at segment N. `?frozen` with `window.__lab.step(seconds)` steps it in exact 1/60 s steps for screenshots, and `__lab.bench(n)` times the diver's update.
- Frame strips from the lab, and an in-game sheet at 844 × 390: `docs/art/animation/a-*.jpg` (fast, turn, stop, boost, vert, idle, in-game).

**Performance**
- The diver's whole update (physics and animation): **0.011 ms per frame, was 0.009 ms** (headless Chromium, 100,000 updates). That is about 0.01% of a 60 fps frame.
- **Draw calls:** 120.6 against 119.6 per frame in the shallows and 86.2 against 85.2 in the grotto (`?bench&still`, software GL). That is one more draw call, from the head and hose now being separate pieces. Triangles and lights are unchanged, and no new effects were added.
- The plume is only redrawn while boosting. Nothing is created per frame.

**Tested** (type check and production build pass; headless Chromium, software GL): every lab segment as frame strips (stationary, slow, fast, boost, glide and settle, restart, turn, diagonal, vertical up and down, turn while diving, boost from still), and in the real game at 844 × 390: surfaced and treading water, swimming, boost, diving and turning, with the lamp following the helmet. No console errors. **Not tested on a real iPhone.** Every number to tune is at the top of the relevant block in `animate()` and `animateLimbs()` (kick rates, amplitudes, spring speeds, breath periods).

### Base interior art pass (2026-11-17, after character animation session B)
Colin asked, from his PC screenshots, whether the indoor art could carry more detail. The measurements said yes: on his PC (RTX, 3840 × 2040, Ultra) the base interior's scene pass was 4.2 ms for only 77k triangles and 31 draws, against 3.2 ms for 351k triangles outdoors. So the interior's GPU cost is per pixel (16 lights and wall shadows summed on every pixel), not geometry, and static detail is close to free.

**What changed** (all drawn once into the static layer when the base level is built; nothing per frame)
- **A detail kit** (`src/interior/detail.ts`). Rooms now use it for:
  - bevelled wall plates, lit along the top and shadowed underneath, with corner rivets, and now and then a vent grille, an access hatch, a pressure gauge, a red valve wheel or a label plate;
  - grime and drips gathering above each floor, and a riveted skirting;
  - a steel I-beam under every ceiling, with gussets and slack cables on clamps;
  - a steel conduit along the wall in rooms whose wall is free (storage, sorter, lab, workshop, filter, dock), below the conveyor and pipe lanes;
  - hazard stripes at machine bases, and bolted flanges.

  The lighting reads relief from brightness edges, so the bevels and seams catch the lamps.
- **Lamp fixtures:** each lamp hangs on two rods under the beam. **Its glow now sits on the lamp** (it used to be a wide ellipse hanging below it, which read as a smudge in mid-air).
- **Floors and ceilings:** diamond tread on the deck tops, a plate edge and bolts under each deck, a bolted strip along each ceiling lip.
- **Machine rooms** (left over from the walkable base, part 2): press (ribbed columns, two hydraulic cylinders, bolted bed and crosshead, warning stripe), feeder (hopper ribs, a chute, bolted vat bands, a sight window), filter (column bands and caps, pump motor fins, copper pipes), crane (trolley wheels, hook block, cradle jaws), recompression chamber (bolt ring on the door, gauges, a copper pipe), workshop (a tool pegboard, a vice, drawers), lab (screen bezels, sample racks, drawers), storage and sorter (perforated uprights, bracing), tanks (bolted frames, a level scale), dock (bolted gantry, winch drums), dome (console keys and bezels, airlock bolts), turbine (bolted generator housing, cable trunking).
- **Outside the hull:** the black water behind the base now has a faint rock floor and the base's own support legs.
- **The turbine room's gold power spine is toned down** (it bloomed harder than anything else in Colin's screenshot).

**Measured** (the 40-piece benchmark base, `?bench&scene=6&still`, software GL)
- Draw calls **29, unchanged**. Triangles for the whole base **122k to 255k**: the static art is one Graphics drawn every frame without culling, so this is the full base, not just what is on screen.
- CPU per frame unchanged (5.2 ms against 5.4 to 5.6 before; noise in software GL). On Colin's PC the extra triangles should add a fraction of a millisecond at most, given that 351k outdoor triangles cost 3.2 ms. Worth a `?bench` run on the iPhone.

**Tested:** type check and build; every room kind captured before and after at 844 × 390 (`docs/art/interior/art-*.jpg`). A bug found that way: two rooms (workshop and recompression) had lost their `break`, so each also drew the next room's art over itself. Both are fixed, and every room kind now ends in a `break` (storage and tank share theirs with sorter and gtank by design). **Not tested on a real iPhone.**

**To check after Colin plays:** whether the detail reads on the phone or turns to noise (every piece is low contrast on purpose; the strongest accents are the hazard stripes and red valve wheels); and the camera's floor line (the base camera puts the floor 70% of the way down the screen, so a quarter of the screen is the dark under-floor at the bottom of the base: `ly` in `Interior.render`).

### Character animation, session B: the walker (2026-11-17)
The on-foot explorer (`src/actors/walker.ts`, used in the Corvina and the walkable base) got the same polish as the diver in session A. Physics, controls, collisions and the rendering set-up are unchanged.

**Audit (what was wrong before)**
- **One Graphics was cleared and redrawn every frame**: about 100 shapes re-tessellated, about 0.45 ms of JavaScript a frame (profiled in the lab, below).
- **The feet slid.** The step rhythm ran on time, not distance, so a planted foot drifted along the floor at most speeds. There was no heel or toe, no rise and fall tied to the steps, and no weight shift.
- **Turning was an instant flip.** Stopping snapped the legs straight, and landings had no response at all. The jump was one fixed pose.
- **It was not the diver.** It had lighter chrome, a different small helmet and face, a lamp on the helmet instead of the shoulder lamp, a simpler suit and no dive bag. The grapple line and lamp beam started from fixed points, not the animated body.

**What changed**
- **Same person:** the walker is now built from the diver's own parts (exported from `diver.ts`): the same helmet with the face inside, crest, blue-steel collar yoke, coiled hose, regulator port, twin tanks and harpoon, brass-etched charcoal suit with chrome knee guards and red ankle straps, red gloves with chrome cuffs, hip thruster, **shoulder lamp** (the beam now starts there) and **the dive bag**, which appears with the same load as underwater and swings at the hip. The helmet's front glass is a separate **face plate** that lifts up and back.
- **Prebuilt jointed pieces** (24 Graphics drawn once); each frame only moves and turns them. Nothing is created per frame.
- **Walking with real foot contact:** two-bone IK legs. A planted foot is fixed in the world while the body passes over it: heel strike, flat, then the heel rises over the ball while the fin blade stays flat on the floor (toe-off). The swing foot leaves at once and slows into its footfall, and the hips lower to meet it. Stride and cadence follow speed. **Full speed (270 units/s) is about 5 m/s for a person this size**, so the top end is a heavy jog with a short flight, and partial stick is a walk. There is rise and fall (vaulting over the leg when walking, sinking into it when jogging), opposing arm swing that lags slightly, a little shoulder twist, lean with speed, and the tanks, hose and bag bounce with each step.
- **Starting:** the first strides are shorter and the arm swing, bob and lean build up. **Stopping:** the foot in the air lands where it was heading, the other comes up beside it and the body settles into a balanced, slightly staggered stance. The torso pitches with braking and settles (a soft spring). **Turning:** a quick mirror that never goes thinner than a third (like turning through a front view), with a dip and a step round to the new side.
- **Standing:** breathing (the same breath shape as the diver's, faster after effort), a slow weight shift from foot to foot with the unweighted heel resting up a touch, glances and blinks (shared with the diver).
- **Jump:** the feet push off the floor last (a quick crouch and push, since the physics jumps on the press), the knees tuck on the way up, then the legs reach down for the landing. **Falling:** the arms rise for a long fall. **Landing:** the knees absorb, scaled by fall speed, and the torso, arms, head and tanks follow through and settle.
- **Grapple:** the near arm points at the hook as it flies. Reeling in, the legs trail. Hanging, both hands are on the line in front of the helmet and the legs sway as a pendulum. The line now leaves from the animated hand.
- **Ladders:** hands and feet grip rungs (fixed in the world while they hold, a hand with the opposite foot), three rungs per move. Holding still, any hand or foot between rungs settles onto one. Stepping off the bottom, the feet step down to the floor.
- **Working** (holding Collect at a console, rack or tank window): the near hand reaches out and works at it, with a slight lean and the head down.
- **Hand-off with the swimming diver:** entering the Corvina or the base, the explorer arrives in a crouch (climbed in), stands up, and lifts the face plate after a moment. Holding Collect to leave (the Corvina's hatch or the base's airlock) **shuts the face plate first**, so the sealed helmet matches the diver who appears outside.
- **Shared helpers** (`src/actors/animkit.ts`): a damped spring, breath shape, glance and blink timing, smoothstep and clamp. The diver now uses them too (same numbers, same behaviour). `batchAll()` keeps a character's pieces in one draw batch.

**Animation lab:** `animlab.html?walker`. A 61-second script runs through the interior's own movement rules (`interior.ts` constants are now exported): standing, slow walk (stick 0.3), walk (0.6), full speed, stop, set off and turn, turn while walking, turn on the spot, standing jump, short hop, running jump, walking off a ledge, grapple fire, reel in and hang, swing off, ladder up, hold and down, working at a console. The tiled floor scrolls under the walker so any sliding shows against the seams. It shows gameplay scale (560 units to the screen height) on the left and 3x on the right. `?seg=N`, `?frozen` with `__lab.step(s)`, `__lab.footCheck(s)` (measures how far each heel and ball moves while it is planted, and how far any foot ends up from where the animation wanted it), `__lab.loop(n)` and `__lab.bench(n)`. `animlab.html?compare` stands the diver and walker side by side at one scale, and `&old` swaps in the walker as it was (`src/dev/walker_old.ts`, kept only for before and after measurements).

**Measured** (headless Chromium, software GL)
- **Foot contact:** the worst slide of a planted heel or ball over the whole script is **0.13 units** (before: the whole stride slid). Feet reach their targets everywhere (worst under 2 units) except the brief edge-on moment of a turn.
- **CPU, profiled (simulate + animate + render, per frame):** walker JavaScript **0.07 to 0.09 ms, was 0.44 to 0.47 ms**. `animate()` alone is about 0.005 ms, was 0.05 ms (the old one rebuilt its drawing). The new walker uploads about 4,000 vertices a frame (one batch) against 2,600 before, because of the diver's detail. The software GL's own time per frame rose with that (1.4 to 2.5 ms, emulated GPU), which on a real GPU is trivial.
- **Draw calls:** base interior (`?bench&scene=6&still`) **29, unchanged**. The diver's pieces are now batched too: **shallows 241 to 230, grotto 172 to 161** (these counts include every pass in this browser, so they are higher than session A's numbers).
- Diver update unchanged at about 0.012 ms.

**Tested:** type check and production build. Frame strips of every lab segment and a numeric foot-contact check, plus in-game at 844 × 390 in the Corvina (arriving, the plate lifting, walking, jumping, stopping, turning, with the beam swapping sides) and the base. Holding at the hatch shuts the plate and letting go reopens it (stepped test). No console errors. **Not tested on a real iPhone.** Strips: `docs/art/animation/b-*.jpg` (walk-slow, walk-full, stop-turn, turn-spot, jump, land, hang-climb, climb, compare, in-game-corvina, in-game-base).

**Left over / to check after Colin plays**
- **Gameplay speeds are fast for a person:** walking 270 is about 5 m/s (so full stick jogs) and climbing 210 is about 4 m/s (so the hands move three rungs at a time, briskly). The animation follows them honestly. If walking should look calmer, lower `WALK` in `interior.ts` (a gameplay change, Colin's call).
- **Size:** the water view shows 640 units to the screen height and the interiors 560, and the diver is drawn about 1.4 times larger in world units, so on screen the diver is about 1.25 times the walker. The diver's legs are also shorter in proportion (they kick bent). Making the walker bigger needs taller doors and collision (`HEIGHT` 84).
- Tuning numbers are at the top of `walker.ts` (proportions, rung spacing, climb stride) and in `ground()` (stride `D`, duty `beta`, lift, bob), `air()`, `hang()` and `climb()`.
- No steam-vent flinch (a hit just throws the walker into the jump pose).


### Milestone 9: breeding (2026-11-17)
Colin's feedback first (after the walker and the interior art pass): the animation and room detail are liked. Two changes asked for, both done before breeding:

**1. The same creatures indoors as outside.** The tank rooms used to draw pixel blobs. Now they show the very same creatures (`Critter`, from `src/actors/critters.ts`) and plants as the tanks outside, swimming by the same rules, at 1.45 times the outside size (`TANK_SCALE` in `src/interior/baselevel.ts`). `TankLife` (`src/world/tanklife.ts`) now takes options (where the water is, a scale, plant clumps), and the base's rooms run their own copy of it. Indoors you see the plants you planted as several clumps along the sand, swaying gently; flakes sink and get eaten after a feed, the water clouds and algae creeps up the glass as it gets dirty, and bubbles rise after a scrub. Sick creatures go pale and sink, eggs sit on the sand. The single tank's window is taller (it now reaches the railing).
- **How it works:** the interior has a new pair of hooks, `attach` and `detach`, which put real actors into its lit, emissive and glow layers (between the room art and the walker), and a `tick` that moves them every frame.

**2. Tending stays indoors.** Hold Collect at a tank window and tap Tend: the care panel opens on the right, the camera eases in on the tank (`Interior.focus`), and the walker waits at the glass. Picking a creature rings it in the tank. Feed, clean, plant, To jar and Release work as before, with their effects in the indoor tank. ✕ or Esc closes the panel and the camera goes back to the walker. The panel's header now uses the painted stencil code (TANK 2, GT-1), so it matches the room's sign (it used to count tanks west to east, so the numbers disagreed).

**Milestone 9, Colin's choices** (asked before building): pairs in a tank breed, with a Hatchery; colour and glow pattern as traits, with a rare "radiant" glow that matters in play; the Kelp farm grows fibre or plant cuttings; a grown glowfin escort plus one more creature key; and a small Revival pool now; one egg about every 6 minutes per pair.

**Inherited traits** (`src/game/traits.ts`)
- **Colour:** four per species. The first three appear in the wild (55%, 30%, 15%); the fourth is rare and only ever appears by mutation. Glowfin: coral, tide blue, kelp gold, rare moonpale (full palettes). The others are a tint over the drawing: puffcap peach, rose, lemon, rare sea-glass; ray sand, slate, moss, rare midnight; crab rust, olive, brick, rare steel blue; shrimp amber, ruby, clearwater, rare gilded. Glow stays warm in every colour (cyan, violet and magenta stay the Choir's).
- **Glow pattern:** three per species, the arrangement of the glowing marks (glowfin side line, spotted, banded; puffcap polka dots, rim lights, starburst; ray tail light, dappled glow, ring glow; crab eye shine, shell spots, claw tips; shrimp side lights, banded, tail lantern). Young glowfins now show a faint pattern too.
- **Radiant:** a wider, brighter halo and a soft aura. A radiant creature makes 25% more (`RADIANT_MAKE`), and a radiant glowfin's escort light reaches 60% further (`RADIANT_LIGHT`).
- **Inheritance:** colour and pattern each come from one parent or the other; 8% chance of a mutation for each (`MUTATION`), which is the only way to the rare colour. Radiant: 4% with no radiant parent, 35% with one, 75% with two (`RADIANT_ODDS`). Each egg is one generation after its parents.
- Wild creatures show their traits too, and the one you catch keeps them in the jar and the tank. Creatures from older saves get wild traits fixed by their id (so their colours may differ from before).
- The care panel shows them under the name ("Moonpale, banded · radiant · 3rd generation, bred at the base"), rare ones in gold, and the radiant bonus in the output line.

**Breeding and the Hatchery** (`HX-1`, 2 × 1, `resin 4, quartz 3, moss 2, copper 2`, 36 s; no blueprint)
- Two **happy, grown** creatures of one species in a tank are a breeding pair (`pairsIn`). While the base has a finished, **powered** Hatchery with room, each pair lays an egg about every **6 minutes** (`BREED_SECONDS`), straight into the Hatchery. Its traits come from two of the happy grown ones.
- A Hatchery holds **4** eggs and young (`HATCH_CAP`; more Hatcheries hold more). Eggs hatch there in 90 s. The young wait in their cradle (they don't get hungry) until you place them.
- **Indoors:** four glass cradles under heat lamps, with the real eggs and young in them (the young circle slowly under the bells), and a console. Hold Collect at the console: the Hatchery panel opens (in the care panel's frame, the camera on the cradles) with each egg or young, its traits, and a button per tank (full tanks greyed out) or To jar.
- The care panel says how breeding is going for each grown creature: needs a mate, needs a Hatchery, no power, the Hatchery is full, or the next egg in about N minutes.
- Toasts when an egg is laid (with its traits) and when one hatches.
- **New egg drawings:** a dapple ray egg case (a leathery pouch with tendrils), a puffcap polyp (stalked buds), and amber and coral clutches for crabs and shrimp.

**The Kelp farm** (`KF-1`, 2 × 1, `fibre 4, resin 3, quartz 2, copper 2`, 32 s; no blueprint; Echo whorls fit)
- **Fibre:** with power it grows one kelp fibre every 150 s (`FARM_SECONDS`, faster with whorls) into its own tray of 4 (`FARM_TRAY`). A full tray pauses it. Up to 2 conveyors out: a conveyor straight into an **auto feeder** closes the feeding loop with no puffcaps needed, or into storage. Or take the tray by hand indoors.
- **Cuttings:** switch it (Collect at the CROP console indoors; it cycles through kelp fibre and every tank plant you have scanned) to grow cuttings of a plant: one every 200 s, up to 3 of each kind kept ready (`CUTTING_SECONDS`, `CUTTING_CAP`). Planting a tank uses a cutting instead of materials (the planter buttons show "cutting (2 ready)").
- **Indoors:** two tiers of planter troughs under lime grow lamps, with the real crop growing taller as the next harvest nears and swaying in the pumped water, a CROP console with a progress bar, and the TRAY hatch with fibre bundles stacked in it.
- Rules: the top of `src/game/factory.ts` and the farm block in `Factory.tick`.

**Creatures as keys**
- **A grown glowfin lights a passage the dive light cannot** (`src/actors/escort.ts`). Take a grown glowfin out of a tank (To jar). Outside, it swims at your shoulder as a warm light (radius 340, ×1.6 when radiant). In the **kelp caves**, a new passage drops from the floor of the **junction** (the chamber with the air pocket) into **lightless water**: without a glowfin the dive light shrinks to almost nothing and you can't swim more than a little way in (the banner says why). With one, the darkness thins and its light shows the way down to a **hidden grotto** with: a **puffcap polyp** and a **dapple ray egg case** (the first wild eggs of either), three **glowing blooms**, and an **Echo whorl**. New cave shapes `KC.glowPassage` and `KC.glowGrotto` in `src/world/terrain.ts`; the lightless haze is `buildLightless` in `scenery.ts`.
- **A grown tinker crab picks a lock.** In the wreck shelf's **hidden room** (behind the silt slump the sonar pulse reveals) there is now a rusted **strongbox** whose padlock is seized and too small for the cutter. With a grown tinker crab in the jar, hold Collect: the crab picks it, and inside are the **Revival pool drawings** (a data find for the Lab). This is the "side area of the wreck shelf" DESIGN.md asked for.

**The Revival pool** (`RP-1`, 2 × 1, `brass 4, quartz 4, moss 3, plate 2`, 44 s; blueprint from the strongbox, decoded in a Lab in 90 s)
- A new material, the **glowing bloom** (0.3 kg; "grows only where no lamp has ever shone"). For now the blooms grow in the hidden grotto (they regrow like other materials); the deep zones will have more.
- Indoors: a warm, still pool in a brass rim under a glass hood. Hold Collect: one bloom wakes one dormant creature (the save already counted them since milestone 4). It comes back **young**, with wild traits, into your specimen jar (the jar must be empty).

**Also**
- Build cards for the three pieces, with icons; their drawings outside (`drawHatchery`, `drawFarm`, `drawRevive` in `basegfx.ts`); their stencil codes HX-, KF-, RP-.
- Moving a grown glowfin or tinker crab into the jar says what it can do.

**Tested** (headless Chromium at 844 × 390; the cloud has no GPU): type check and production build, no console errors; every new room and both indoor-tank views captured (`docs/art/milestone9/`); the Hatchery panel; a scripted breeding run (no Hatchery: no eggs in 400 s; with one: an egg after 360 s with a parent's colour, hatching 90 s later); the lightless gate (blocked without a glowfin, open with one) and the strongbox prompt. **Not tested on a real iPhone or Colin's PC.**

**Left over / to check after Colin plays**
- Numbers: `BREED_SECONDS` 360, `HATCH_CAP` 4, `MUTATION` 0.08, `RADIANT_ODDS`, `RADIANT_MAKE` 1.25, `RADIANT_LIGHT` 1.6 (`traits.ts`, `creatures.ts`); farm 150 s / 200 s / tray 4 / 3 cuttings (`factory.ts`); escort radius 340 (`escort.ts`); `TANK_SCALE` 1.45; the three pieces' costs in `PIECES`.
- Whether the indoor tank creatures read well on the phone at 1.45× (and whether the Grand tank, whose window spans two floors, wants them bigger).
- A grown glowfin in the jar is out with you, so it isn't in a tank making quartz. On a blackout the crew put it back in its tank (as before). A young one from the Hatchery or the Revival pool, which has no tank yet, now goes back to the Hatchery (if the base has none, it swims home and is lost).
- Wild glowfin, puffcap and ray colours in the world changed slightly (their traits now pick their look).
- **Mixed tanks (Colin's long-term goal):** breeding pairs are counted per species in a tank, so a mixed tank of two pairs breeds both. Tank upgrades and new partner species are still to plan.

### Milestone 10: the deep (2026-11-17)
**Feedback on milestone 9:** "Everything looks good. Let's keep going." Nothing was flagged, so nothing needed fixing first.

**Colin's choices** (asked before building):
- **Major site:** a drowned deep station on the trench floor, explored on foot like the Corvina.
- **Crush depth:** the Kestrel suit is safe to 30 m, PS-1 to 60 m and PS-2 to 110 m. The sub KS-1 is safe to 45 m, or 120 m with depth plating. Past the limit, integrity drains at 2% a second, doubling for every 5 m deeper.
- **Predators:** an angler and a stalker, plus a large deep-sea spider (Colin's addition).
- **Creature key:** a new trench creature.

**The trench** (`TRENCH`, `trenchGround` in `src/world/terrain.ts`; art in `src/world/trenchgfx.ts`, which `Scenery` owns)
- The world's east wall is gone. The wreck shelf now ends at a rim, and the trench steps down beyond it. The world grew from 27,200 to 33,000 units wide (`WORLD_W`) and from 1,980 to 7,700 units deep (`WORLD_H`).
  - **26800–27350, the rim** (about 22 m): a toppled relay buoy, FULMAR RELAY 4, with the first pattern spool.
  - **27350–28350, ledge A** (about 33 m): the crushed deep probe FULMAR DP-2, whose stress recorder leads to depth plating.
  - **28350–29350, ledge B** (about 44 m): just within KS-1's 45 m.
  - **29350–30450, ledge C, the vent field** (about 55 m):
    - four mineral chimneys with glowing seams and shimmering plumes of scalding water, which lift you and burn the suit (9% a second at the vent mouth);
    - vent ore;
    - cinder snails;
    - the **cleft**, a side cave into the rock under ledge B, sealed by a young chimney.
  - **30450–30650, the deep drop** to the floor.
  - **30650–32500, the floor** (about 98 m), with the **Fulmar deep station**.
  - **32500–33000**, the trench's east wall, up to the surface.
- **The look:** grey sediment on the flats; sea lilies, glass sponges, tube worms and brittle stars; warm pinprick bioluminescence that thickens with depth.
- **The water** fades to near black from about 40 m (`waterColor` in `src/fx/shared.ts`). The lighting bake darkens the trench further with depth. The trench has its own colour grade, a cold blue-black at low saturation (`GRADES.trench` in `src/fx/post.ts`).
- **Sound:** its own music (A1, very sparse, a minor second against the root) and ambience (far-off pressure groans, slow deep pulses), plus a metal groan when crushing (`creak`).
- **Faster load:** the lighting bake skips the solid rock under the shallows and only blurs the rows that matter, so the much taller world costs little more to load.

**Crush depth** (`CRUSH`, `crushRate` in `terrain.ts`; the rules are in `src/main.ts`, search "crush depth")
- Past the rated depth, the suit loses integrity: 2% a second at the limit, doubling for every 5 m deeper. The game shows:
  - a groan and a shudder;
  - a red flash on the suit bar;
  - a banner, and a one-off warning toast.
- **The depth chip** under the suit bar (`#depth-chip`) shows the rated depth ("MAX 60 m") near the trench. It turns amber within 5 m of the limit and red ("CRUSH") past it. The watch's depth digits turn amber and then flash red as well.
- **The sub:** past 45 m (or 120 m when plated), the hull loses integrity at the same rate. At 0 the existing breach rules apply: you bail out, and the crew winches KS-1 home. The sub chip shows "depth 43/45 m" in the trench.

**Gear** (`src/game/gear.ts`)

| What | From | Lab | Cost | Job |
| --- | --- | --- | --- | --- |
| Pressure suit PS-1 (existing) | Corvina drawings | 140 s | 6 brass, 4 plating, 2 resin; 80 s | now does its job: safe to 60 m |
| Pressure suit PS-2 | drawings in the cleft's cargo pod | 150 s | 6 vent ore, 4 brass, 4 plating, 2 quartz; 100 s | safe to 110 m |
| Depth plating DP-S | the probe's stress recorder, plus a scan of the trench | 110 s | 6 plating, 4 vent ore, 3 brass (fitted at the dock) | KS-1 safe to 120 m |
| Signal array SA-1 (base piece) | scans of the trench, the vent field and the Corvina's log | 120 s | see below | reads pattern spools |
| Alien resonator | drawings in the Fulmar's array room | 160 s | built in milestone 11 | opens the sanctum's doors |

- **Depth plating is a hull refit, not a module.** It has its own "Hull refit" row in the Dock panel and takes no slot, so the cargo bay, floodlights and grabber can all stay fitted.
- **The Lab** hides the trench's research until the trench has been scanned.

**Vent ore** (`ore`, 3.5 kg, "Chip off", 3.2 s): the trench's material. There are eight spots on ledges B and C (one is in the rock under ledge B, by the cleft's mouth). Grown cinder snails make it too. There are also three more glowing blooms: one in the cleft and two on the trench floor.

**The predators** (`src/actors/deep.ts`; homes `TR_LANTERNJAWS`, `TR_STALKERS`, `TR_SPIDERS` in `terrain.ts`)
- They are built so that no lamp setting is safe from all three. All of them ignore the sub. A sonar pulse drives all three off for a while.
- **Lanternjaw** (six, hanging in open water). A heavy, dark-bodied hunter with an underslung jaw full of needle teeth, a small reflective eye and a long-stalked amber lure.
  - With your lamp on, it notices you within 520 units and drifts towards the light (it never strays more than 420 units from home).
  - Within 120 units it snaps: a 0.28 s burst that bites for 30%. Then it goes home and rests.
  - With the lamp off, it only notices you within 150 units.
- **Pale stalker** (three: on ledge B, in the deep drop, on the floor). A long, pale, ribbon-finned body that follows the head's path, with eyes that glow back at the lamp.
  - It follows you at the edge of the light: about 400 units off, behind and above.
  - It strikes if you stay still for 2.6 s or go dark for 1.1 s. The strike bites for 30%.
  - Moving with your lamp on keeps it at bay.
- **Abyssal strider** (four, walking the ledges and the floor). A deep-sea spider about as wide as a diver is tall.
  - Eight jointed legs that plant and step, banded pale and rust, a slender body with a proboscis and a tubercle of four eyes.
  - It is drawn to your lamp within 650 units and walks over at 78 units a second. Within 150 units it rears up and its front legs close (25%), then it backs off for about 4 s.
  - With the lamp off, it loses interest after 1.6 s.
- **Sonar:** a pulse within 800 units drives all three off: the lanternjaw folds its lure and goes home, the stalker flees, the strider scuttles away.

**The cinder snail** (`snail`; the new trench creature and the key)
- **Looks:** a coiled iron shell with ember-glowing seams, and an iron-scaled foot that ripples as it creeps.
- **In the wild:** it lives on the vent field. There is one grown adult and two young you can coax into the jar (after scanning one).
- **Keeping it:** it likes lumen moss and others of its kind; tinker crabs pick at its scales.
  - **Grown, it makes vent ore**, so a snail tank is a renewable source of the trench's material.
- **Traits:**
  - colours: iron, bronze, ash, and the rare ember gold;
  - glow patterns: seam glow, foot lights, spiral glow.
- **The key:** with a grown cinder snail in your jar, hold Collect at the sealed chimney over the cleft ("Let the cinder snail graze the chimney", 4 s). It grazes the chimney away, then climbs back into the jar.
  - **In the cleft:** a Fulmar cargo pod holding the **PS-2 drawings** and the second pattern spool.
  - **The sequence:** catch a young snail on the vent field (PS-1 reaches it), raise it at home, then bring it back.

**The Fulmar deep station** (outside: `FULMAR`, `fulmarTop` in `terrain.ts`; inside: `src/interior/fulmar.ts`)
- **Outside:** a long riveted module, a crushed listening dome, a tilted side module, a leaning antenna mast and slumped cables. One amber emergency lamp still blinks by the airlock hatch on top.
  - To get in: wind the hatch open (2.6 s), then climb down.
  - It sits at about 98 m, so you need PS-2 to reach it.
- **Inside:** a dry level on foot, 100 × 36 tiles, using the Corvina's system. The interior code now takes per-level find labels and a sign (`InteriorOptions`), any digit as a find, and draws ladders in wrecks.
  - **The top deck:**
    - the airlock;
    - the listening room under the dome, with the crew's **listening log** (a story fragment; it opens in the reading panel and stays in the log);
    - a steam leak;
    - the lift's top;
    - a powered door to the **array room**, which holds the last pattern spool and the **resonator drawings**.
  - **The crew deck:**
    - bunks with the comms pattern spool;
    - a breaker;
    - a step too tall to jump (grapple up);
    - a gap over the machine hall (grapple across);
    - steam vents;
    - a supply locker (3 vent ore, 2 brass, 1 glowing bloom);
    - a ladder up to the top deck.
  - **The machine hall:** steel islands over flooded bilge, crossed by grappling the rings overhead. It has two more breakers and the lift's bottom. A ladder climbs from its west island to the crew deck, so you can't get stuck down there.
  - **Power:** all three breakers bring the emergency power back (`save.fulmar`), which lights the lamps, runs the lift and opens the array room door.

**The Signal array and the story** (`src/game/signals.ts`; piece `signal` in `src/game/base.ts`)
- **Signal array SA-1:** 2 × 2. It costs 6 vent ore, 6 quartz, 4 brass, 4 plating and 4 copper, and takes 55 s to weld. Its blueprint is decoded in a Lab.
  - **Outside:** a brass dish on a mast, receiver rods and a decoder window.
  - **Inside:** a big round pattern screen in a brass ring and receiver racks. The screen shows slow amber rings while listening, and the Choir's colours while it decodes.
- **The four pattern spools:**
  - the rim's relay buoy;
  - the cleft's cargo pod;
  - the Fulmar's comms rack;
  - the Fulmar's array room.
- **How decoding works:** a powered array decodes the spools one at a time in the order you found them, 150 s each. Following DESIGN.md ("raising glowing creatures is how the player learns that language"), each one needs enough "words" first. A word is a different glow pattern among the grown creatures in your tanks, where each species-and-pattern pair counts once. The four spools need **2, 4, 6 and 8** words, so breeding for new patterns is the way forward.
- **Reading a fragment:** a decoded fragment becomes an Artefact in the scanner log. At the array's console inside the base, hold Collect to read the latest one in the reading panel.
- **The fragments** (an arc towards contact):
  1. "Held light": the Choir has seen divers' lamps and wonders what holds them.
  2. "Grown light": it answers light that someone raised.
  3. "Below the cold": an invitation down and east, past the trench floor.
  4. "The door": the door below hears only its own song, which matches the resonator drawings.
- **The listening log** tells the Fulmar crew's story: eleven years listening, and lamps answered by lights. They worked out that every glowing creature is a word the Choir knows. They drew the resonator, then left when the hull began to weep.
- **"Maps zones"** (DESIGN.md's other job for the array) was built in milestone 11: the zone map.

**Also**
- **New scanner entries:** the trench, the Fulmar relay buoy, the crushed deep probe, the vent field, the sealed chimney, the cinder snail, the lanternjaw, the pale stalker, the abyssal strider, the Fulmar deep station, the Fulmar's listening log, and the four signal fragments. That makes 15 entries.
- **The scanner log** has a new "The trench" section: which suit you wear and its depth, the sub's rating, the cleft, and the spools found and decoded.
- **Fixed on the way:** zone weights for the colour grade and the sound added up to 2 in the trench (the kelp forest's weight came back as the shelf's faded), which doubled the exposure. Now the forest fades with the shelf's raw weight.
- **The benchmark** has a new scene, 7, "Trench vent field, lamp on". It was appended, so `scene=6` still means the base interior. The bench base now ends with a corridor and a Signal array.

**Tested** (headless Chromium in the cloud, with no GPU. The game ran at about a quarter of real speed there, so the timings below are in game seconds):
- **Build:** type check and production build pass. No console errors.
- **Screenshots:** the rim, the vent field, the floor and the station; the three predators in the lamp; the open cleft; and the Fulmar inside.
- **Crush depth:**
  - With the Kestrel suit at 40 m, the suit drained and the chip read "CRUSH 30 m".
  - With PS-1 at 40 m, there was no damage.
- **Predators** (simulated 15–20 s each):
  - A lanternjaw with your lamp on warned and bit once; with the lamp off, it did nothing.
  - A stalker following a moving, lit diver never struck; still or dark, it struck once.
  - A strider with your lamp on bit; with the lamp off, it did nothing.
  - A sonar pulse stopped all of them.
- **Hold actions**, scripted with a real key held:
  - the buoy spool;
  - the probe recorder;
  - the chimney (blocked without a snail; grazed away with a grown one in the jar);
  - the PS-2 drawings and the cleft spool;
  - the station hatch and climbing in.
- **Inside the Fulmar:** the three breakers gave power, and the resonator drawings could be taken from the array room.
- **The Signal array:** blocked at 0 words; decoded fragment 1 in 150 s with 2 words; asked for 4 words for fragment 2; stopped without power.
- **Not tested on a real iPhone or Colin's PC.**

### After milestone 10: sound lost on the iPhone
- **Colin:** the audio had gone on his phone.
- **Two weak spots fixed in `src/audio/engine.ts`:**
  - **A missed "visible again".** A home-screen app on iOS does not always fire `visibilitychange` when it comes back. The engine kept a stale "hidden" flag, which held the master fader at zero and made it ignore taps. Now `pageshow` and `focus` count as coming back, and every tap re-reads `document.hidden`.
  - **A broken audio context.** After a call, Siri or another app's audio, iOS can leave the context interrupted so that `resume()` never takes. If a resume asked for on one tap hasn't worked by the next tap, the engine closes the old context and builds a fresh one, inside that tap. Music, ambience and effects rebuild with it (`epoch`; the music and the cue timers reset their clocks).
- **Settings, Sound** now names the state when sound is paused. When it's running on an iPhone, it reminds you that the ring/silent switch mutes the game unless "Plays with the silent switch on" is chosen.
- **Tested** in headless Chromium: a context forced into the stuck state came back with sound on the next key press, and a stale hidden flag cleared on the next tap. Not tested on the iPhone itself.

### Milestone 11: contact (2026-11-18)
**Feedback on milestone 10 and the merge with the kit passes:** "All looks good." Nothing was flagged, so nothing needed fixing first.

**Colin's choices** (asked before building; all four were the recommended option):
- **The resonator:** built in the Workshop, but it can only be tuned once the Signal array has decoded all four fragments. Worn as a hoop on the pack and a bracer on the arm, lit in the Choir's colours when it sings.
- **The sanctum:** swim down through it, then on foot in its heart. No crush depth inside.
- **The ending:** call and response with the resonator (no way to fail), a short scene, credits, and then the game goes on with two gifts: a Choir gate home and a Choir power source for the base.
- **"Maps zones":** a map at the Signal array's console.

**The alien resonator RS-1** (`resonator` in `GEAR`, `src/game/gear.ts`)
- **Getting it:** decode the Fulmar's drawings in a Lab (160 s, as before). Then build it in a Workshop (160 s) for 6 vent ore, 4 quartz, 4 brass and 1 glowing bloom.
- **The gate:** until 4 of 4 fragments are decoded, the Workshop row says why and its Build button stays off (`gearBlocker`).
- **On the body** (`KitLook.resonator` in `src/actors/diver.ts`):
  - a forged brass hoop holding a pale tuned crystal on four spokes, with two swept fins, riding on top of the pack (`drawResonatorHoop`; on the walker it stands above the tanks);
  - a brass bracer with a small crystal ring on the near forearm (`drawResonatorBracer`).
- **The light:** the crystal glows unlit, drifting through cyan, violet and magenta (`choirColour`). While it sings (holding Collect at a door or song-lock, or answering the Choir), it flares and pulses faster, and rings of song spread from it (`SanctumScenery.song`).
- **Previews:** `animlab.html?kit=4,1,1,2,2,1` (a sixth number is the resonator); add `&walker` for the walker.

**The sanctum** (`SANCTUM`, `sanctum`, `inSanctum` in `src/world/terrain.ts`; art in `src/world/sanctumgfx.ts`, owned by `Scenery`)
- **The world grew deeper:** `WORLD_H` went from 7,700 to 9,700 (about 129 m). The sanctum is carved into the rock under the trench floor:
  - **The door** (x 32360): a raised disc of pale stone in the floor's far east end, cut with rings of grooves that leak cyan light (a beacon from across the floor). With the resonator built, hold Collect there: "Sing to the door with the resonator", 3 s. Its petals fold back into the rock.
  - **The shaft** down, and the **antechamber**.
  - **The first song-lock:** a tall lens of light across the narrows. Sing to it (3 s).
  - **The great hall:** about 20 × 11 m, with three great rings of pale stone lit from inside, stone ribbons hanging from the roof, glowing veins and crystals, and slow Choir motes (ribbons of light) drifting.
  - **The second song-lock**, down to the **deep pool**.
  - **The heart:** a spiral shell of stone on the pool's floor with a glowing arch. Hold Collect at the arch to go in.
- **No crush depth** anywhere inside the sanctum (the Choir's water holds no weight). The depth chip hides there, and the watch's digits stay calm.
- **Its own colour grade** (`GRADES.sanctum`: richer colour, a lifted violet floor) and its own zone in the sound:
  - glassy chimes in fifths for the ambience;
  - a slow, open lydian over D for the music (`PROFILES.sanctum`).
- **The sub can't follow.** The shaft is diver-sized and the sanctum is past KS-1's 120 m anyway.
- **To keep finds clear of the door:**
  - the floor's eastern strider moved to the floor's west end;
  - the glowing bloom at x 32380 moved to x 31120 (it had been taking the Collect button at the door).
- **New scanner entries:** the door in the floor, the sanctum, song-lock, the heart, and (after the ending) First contact. The scanner log has a "The sanctum" section under the trench's.

**The heart, on foot** (`HEART_MAP`, `heartOptions` in `src/interior/sanctum.ts`)
- **Built by code** as a 90 × 34 tile map: rooms carved out of solid stone, so the shape is easy to change.
- **The interior system gained a sanctum style** (`InteriorOptions.style: 'sanctum'`):
  - pale nacre stone with glowing seams and veins;
  - ledges of solid light;
  - grapple rings of light;
  - crystal lamps in the Choir's colours;
  - a glowing arch for the way out.
- **New interior options:**
  - `powered`: it needs no breakers;
  - `gates`: door letters that open once a find is taken (here `Q` opens with plinth `1`);
  - `animate` and `lights`: the level's own moving art;
  - `exitLabel`.
- **Falling into the light pool** at the bottom of the chasm only puts you back where you last stood. No damage.
- **The route:**
  1. In by the arch, east along the upper hall.
  2. Over a chasm of light on three high rings (fire the grapple, swing, let go, catch the next).
  3. The lift at the east end: a disc of stone riding a column of light, with curtains of light for gates. It is the same ride as the wrecks' lifts, redrawn.
  4. West along the lower hall to a song-lock door. Sing to it at its plinth.
  5. A second swing on three low rings over the pool.
  6. The Choir's chamber, under the upper hall: tall, with ledges of light. At its plinth, hold Collect: "Answer the Choir".

**First contact, the ending** (`src/ui/contact.ts`; the Choir's form is `ChoirForm` in `src/interior/sanctum.ts`)
1. **The Choir rises** out of its light well: six tilted rings turning in cyan, violet and magenta, ribbons trailing, a bright core. The camera draws back to frame the chamber.
2. **Three phrases** of 3, 4 and 5 notes. It sings each in light and sound. You answer by tapping the same colours in order: four big pads on the phone, or keys 1–4.
   - Each pad is named after one of your own creatures' glow patterns, e.g. "Glowfin · banded" (the vocabulary the fragments needed).
   - A wrong note makes it sing the phrase again, slower. There is no way to fail.
3. **It names your creatures:** it sings back every pattern you raised and opens out to fill the room, with three lines of text.
4. **Credits,** then a "Keep exploring" button.
5. **The rewards:**
   - you come to in the antechamber, beside a **Choir gate**;
   - the **Choir lantern** build card unlocks;
   - First contact goes into the scanner log.
- **If the game closes mid-contact,** the plinth waits again (the `9` find is cleared unless contact is saved).

**The gifts**
- **Choir gates** (`SANCTUM.gate`, `SANCTUM.homeGate`): a ring of swirling light in the antechamber, and its twin on the Kestrel shelf by the buoy (x 1180). Hold Collect at either (1.2 s) to step through to the other. Diver only; the sub stays where it is.
- **Choir lantern CL-1** (`lantern` in `PIECES`, `src/game/base.ts`): 1 × 1, collars on all four sides, 4 quartz, 2 vent ore and 1 glowing bloom, 30 s to weld.
  - It powers every piece joined to it, like a current turbine, anywhere on the site.
  - Outside: a ring of pale Choir stone with a seed of light. Inside: the same ring on the room's back wall.
  - It is the only place the Choir's colours appear on the base.
  - The power-as-a-limit design (DESIGN.md) is still to come; for now it is a second kind of source.

**The Signal array's zone map** (`src/ui/zonemap.ts`)
- **Opening it:** hold Collect at a powered array's console: "Open the zone map". It replaces "Read fragment".
- **What it shows:**
  - a side view of the whole world, with depth on a square-root scale so the shallow zones aren't squashed flat;
  - places you have swum or driven through are mapped (`save.mapSeen`, one character per 250 units, updated twice a second), and the rest is dark;
  - zone names appear once reached;
  - sites appear once scanned or found: Kestrel, the sled, the kelp caves, the Corvina, the relay buoy, the cleft, the Fulmar, the door and the heart;
  - you, as a marker;
  - the sanctum's halls, once the door is open.
- **Each decoded fragment draws one more dotted leg** of the Choir's way in its colours: the rim, the ledges, the vent field, the floor, and finally a ring round the door.
- **Reading fragments:** buttons under the map open each decoded fragment.
- **Older saves** start with the zones they had already reached mapped.

**Tested** (headless Chromium in the cloud with software graphics: about 1 frame a second inside the heart, so `contact.debugSpeed` ran the ending faster for the test):
- **Build:** type check and production build pass; no console errors.
- **Screenshots** (`docs/art/milestone11/`): the door singing, the great hall, the heart's shell, the contact pads, the credits, the zone map, the home gate, and the walker with the resonator.
- **The door:** "Sing to the door with the resonator" is held at the door and opens it. Before the move, the bloom took the button there.
- **The heart:**
  - the lift ride from the upper hall to the lower;
  - the song-lock plinth opens the door `Q`;
  - "Answer the Choir" starts contact; all three phrases answered; the naming; the credits.
  - "Keep exploring" sets `sanctum.contact`, unlocks the lantern and puts you by the gate.
- **The gate home** lands by the Kestrel buoy.
- **The zone map** at 1280 × 720 and 844 × 390.
- **Not tested by hand:** the two swings in the heart (the grapple fired at the first ring in the test, but a full crossing needs real hands), the touch pads on an iPhone, and frame rate on a real GPU.

### Milestone 12, part 1: polish (2026-11-18)
**Feedback on milestone 11:** "Everything looks good for now." Nothing was flagged, so nothing needed fixing first. Colin will test more later.

**Colin's choices** (asked before building):
- **Power as a real limit:** yes, three tiers (the recommended option).
- **A shortage:** machines slow down (recommended). Nothing switches off.
- **Gamepad:** every panel and menu (recommended).
- **The Steam desktop build:** wait. "I wanna do more polish first."

**Power as a real limit** (`POWER_MAKE`, `POWER_DRAW`, `TURBINE_LIMIT`, `PowerNet` in `src/game/base.ts`)
- **Every source makes watts and every piece draws them.** Pieces joined together are one network and share its sources.
  - Sources: current turbine 12 W, vent generator 40 W, Choir lantern 100 W.
  - Draws: dome, storage, tank, filter, feeder, farm 1 W; lab, Grand tank, sorter, recompression room, Hatchery, revival pod 2 W; workshop, press, dock, crane 3 W; Signal array 4 W. Corridors, shafts, junctions and brackets draw nothing.
- **The reef current drives only three turbines** (the first three built). A fourth stands idle and says so.
- **Short of power:** the network's machines run at supply ÷ demand speed:
  - production lines (conveyors, pipes, farms, feeders, presses), Labs and Workshops, the Signal array, salvage cranes, and eggs in a Hatchery;
  - air, doors, lights, the dock's clamps, tanks' comfort and breeding are never affected.
- **The vent generator VG-1** (`thermal`): the new middle tier.
  - Lab research from scanning the vent field and the Fulmar (120 s). Then 5 vent ore, 3 brass, 4 copper and 2 plating, 45 s to weld.
  - 1 × 2, collars on both levels like a turbine. Outside: a charcoal column with heat fins and a glowing orange core behind a porthole. Inside: the same core on the room's back wall.
- **Where you see it:**
  - build mode's title has a meter: "⚡ used / made W" (orange when short);
  - a selected piece says what it makes or draws, and how its network is doing;
  - the build card's line shows a piece's watts before you place it;
  - the Lab/Workshop panel and the base's info consoles say when they run slow;
  - a one-time tip when a finished piece first puts the base short.
- **A typical first base** (dome, storage, tank, filter, feeder, press) draws 8 W, under one turbine. Adding a dock, Lab and Workshop needs a second turbine; a big base needs the vent generator, and a very big one the lantern.

**The gamepad in every panel and menu** (`src/ui/padnav.ts`)
- **One focus system** finds the panel on screen and drives its buttons:
  - d-pad or left stick moves a lime highlight to the nearest button that way (held, it repeats);
  - A presses; B closes (the panel's ✕ or Close); LB / RB step through tabs; the right stick scrolls.
  - Sliders (the volume rows) move with left and right.
  - The highlight only shows while a pad is in use, and the first touch of the pad only shows it.
- **Covers:** the title screen, the pause menu, Move a save, logs and documents, contact's credits, the zone map, Settings, the scanner log, Base rates, Lab/Workshop, the dock, and tank care / the Hatchery.
- **Build mode** keeps its own pad controls (unchanged).
- **First contact:** the four pads answer to **A, B, X and Y** (the letter shows on each pad once a pad is used).
- **Start** opens and closes the pause menu. While a panel holds the pad, the diver doesn't move.

**Menus** (`src/ui/menu.ts`)
- **The title screen**, on every start: Continue (or Begin the dive on a fresh game), New game (two taps), Move a save, Settings. It shows when the save was made and how big the base is. The world stands still behind it.
- **The pause menu:** the gear button (top right), Escape, or Start on a gamepad. Resume, Settings, Scanner log, Move a save, Title screen. It saves as it opens. The world stands still, the sound softens and the music dips, and the picture stops redrawing after a few frames (saves the battery).
- **Settings has a ✕** now, and Escape closes it.
- Escape that closes a panel (build mode, say) doesn't also open the pause menu.
- `?notitle` in the URL skips the title (for tests); `?bench` and `?at=` skip it too.

**Moving a save between devices** (`exportSaveCode`, `readSaveCode`, `importSave`, `restoreBackup` in `src/game/state.ts`; the panel in `src/ui/menu.ts`)
- **The code:** "FATHOM1." then the save, squeezed with the browser's own compression (about 0.8 KB for a new game).
- **From this device:** Copy code, Share… (the iPhone's share sheet, so AirDrop to the PC or iPad works), or Save as file.
- **From another device:** paste a code, or Open a file…. It shows the save's date and size first, and a second tap loads it.
- **A backup:** loading a code keeps this device's own save as a backup, and "Put the backup back" swaps them.
- Wrong or cut-short codes get a plain message and change nothing.
- Saving stays behind `src/game/state.ts`, so Steam Cloud can plug in later.

**The final mix** (`build()` in `src/audio/engine.ts`)
- **A proper master chain:** a low cut, a presence lift, a gentle glue compressor (2:1 at −20 dB) and a true peak limiter (−3 dB). The old limiter was squashing everything at −10 dB.
- **A soft shelf under the music** (−3 dB below 180 Hz), so its pads don't mask the ambient drone.
- **Mix: phone speaker / headphones** (Settings → Sound). Phone mode cuts the rumble a phone speaker can't play (below 110 Hz) and lifts the mids a little. It starts on phone mode on touch devices.
- **Panels** dip the music a little less (to 55%, was 40%). **The pause menu** softens everything to about half.

**Performance tuning**
- **Adaptive resolution** (Settings → Graphics effects, on by default; `renderScale` in `src/presets.ts`, `adaptFrame` in `src/main.ts`):
  - if frames run more than 18% over the preset's budget (16.7 ms on High, 8.3 ms on Ultra) for 2 s, the render scale drops by 10%, to 70% at the least;
  - after 30 s, and 8 s comfortably at the cap, it steps back up;
  - only the picture's sharpness changes, never the effects;
  - Settings → Resolution shows "(adaptive, 80%)" when it is down.
- **The walkable base** only draws the moving parts of rooms and lines near the screen (it drew every room every frame).
- **The benchmark route** gained the sanctum's great hall (`?bench&scene=8`). Fixed: `?scene=7` (the trench) couldn't be held before.
- **Measured in the cloud** (software graphics, so CPU only; the real cost on a phone is the GPU): game update 2.1 ms in the shallows, 3.2 ms in the trench, 2.4 ms in the sanctum, 1.4 ms inside the base. The CPU is not the problem on either preset.

**Not built (Colin's choice):** the Steam desktop build. When Colin wants it: Electron or Tauri, a Windows build from GitHub Actions, saves in a file for Steam Auto-Cloud, then Steamworks once there is an app ID.

**Tested** (headless Chromium in the cloud, with a fake gamepad):
- **Build:** type check and production build pass; no console errors.
- **Screenshots** (`docs/art/milestone12/`): the power meter, Move a save, the pause menu, the contact pads, the sanctum benchmark scene.
- **Power:** 10 domes on a turbine run at 100%; 16 at 75%; with a vent generator joined, 52 W made and 100%; a fourth turbine stands idle. Build mode's meter and piece notes read right (screenshot of the vent generator beside a turbine and dome).
- **Title and pause:** the title at 1280 × 720 and 844 × 390; gamepad down / A opens Settings; left/right moves a volume slider; B closes it; Start opens and closes the pause menu; Escape out of build mode doesn't pause.
- **Save codes:** a code is made, a bad code is refused with a message, a good one shows its summary, loads on the second tap and leaves a backup.
- **Contact:** A answers the first pad in the heart.
- **Audio:** sound plays through the new chain; the pause menu halves the level.
- **Adaptive resolution:** at 33 fps it steps 100% → 70% in 6 s; back at the cap it returns to 100%.
- **Not tested by hand:** a real gamepad, Share on an iPhone, the phone-speaker mix by ear, and frame rates on a real GPU.

### After milestone 12 part 1: the Kelp farm grows resin (2026-11-18)
Colin asked how breeding and the Kelp farm fit the loop. One grown puffcap makes enough kelp fibre to feed about nine creatures, so once puffcaps are in a tank the farm's fibre adds little. The farm now has a job nothing else at the base does:
- **A resin crop** (`RESIN_SECONDS` 300 in `src/game/factory.ts`). Once bladder kelp is scanned, the CROP console cycles fibre → **resin** → plant cuttings. One resin every 5 minutes into its tray (4), carried out by conveyor like fibre, or taken by hand.
- **Why:** no creature makes resin, and the wild bladder kelp (7 spots in the forest, 10 minutes to regrow) is the only other source. The breeding wing is built from it: Grand tank 6, Hatchery 4, sorting pod 4, another farm 3.
- Tested: a farm on resin with a conveyor to storage, 15 minutes of play: 3 grown, 2 carried to storage, 1 in the tray.

### After milestone 12 part 1: Colin's pacing pass, line markers, and a new sub (2026-11-18)
Colin's answers after reading the breeding and farm analysis. All built:

**Breeding is the way to more creatures** (`WILD_CAP`, `wildAllowed` in `src/game/creatures.ts`; `PATTERN_MUTATION`, `WILD_PATTERNS` in `src/game/traits.ts`)
- **The wild spares two of each species** (young or eggs), enough for one breeding pair. After that the spots still have creatures, but Collect says "breed more at the base" and a one-time tip explains breeding. Counted in `save.wildCaught` (older saves count their wild-born creatures).
  - **Safety net:** if the base has none of a species left (none in tanks, the Hatchery or the jar, and no dormant remains), the wild spares one more.
- **Breeding finds new patterns faster than the wild:** 20% of eggs show a glow pattern neither parent has (was 8% for any random pattern). The colour mutation stays 8%.
- **The third pattern of every species is breed-only:** wild creatures only show the first two (65% / 35%).
- Checked: about 20% of eggs from two pattern-0 parents show a new pattern; no wild creature shows the third; the cap and its safety net.

**The 4th fragment needs a bred creature** (`FRAGMENTS`, `hasBredWord` in `src/game/signals.ts`): besides 8 patterns, a grown creature bred at the base (2nd generation or later) must be in a tank. The array's console says so when it's the only thing missing.

**Resin is scarce in the wild** (`src/world/pickups.ts`, `REGROW_BY_KIND` in `src/game/state.ts`): 5 spots in the kelp forest (was 7), 20 minutes to regrow (was 10). The farm's resin crop is faster: one every 4 minutes (`RESIN_SECONDS` 240). Before the farm, gear needs about 10 resin (cutter 2, grapple 2, air relay 4, pressure suit 2) and the farm itself 3.

**Plants matter: comfort must reach 75%** (`COMFORT_HAPPY` in `src/game/creatures.ts`). A tank starts at 50%, company adds 20% and the species' plant 30%, so without its plant a creature can't grow, make materials or breed. Food and water keep the 60% bar (75% there would mean hand-feeding every 4 minutes before the feeder). The status line says when comfort is what's missing. **Crowding** now starts once a tank is nearly full (from the 4th creature in a tank, the 8th in a Grand tank); it used to start at the 4th even in a Grand tank, which would have made big Grand tanks unhappy under the new bar.

**The middle power tier comes earlier** (`thermal` in `PIECES` and `RESEARCH`): renamed the **Core generator CG-1**, a copy of the Corvina's sealed power core. Researched in a Lab from the Corvina's log (found in her lab; was the trench's vent field and the Fulmar). Costs 4 brass, 5 copper, 3 plating and 2 quartz (no vent ore). Still 40 W.

**Lines: port markers, drag to connect, and a first-time guide** (`portMarkers`, `markerAt`, `lineGuide` in `src/ui/build.ts`; drawn in `BuildOverlay` in `src/world/basegfx.ts`)
- **Port markers:** in build mode every finished piece that takes or sends lines shows a badge above its port: **amber** for conveyors, **teal** for feed pipes; **▲** sends out, **▼** takes in, **⇅** both (storage). While drawing a line, pieces it can go to pulse and the rest dim.
- **Drag to connect:** press a marker, drag to a piece that lights up and let go. The line is built at once. A rubber band follows the finger until a target is found. Dragging from storage onto something that only feeds it draws the line the other way. A tap on a marker (no drag) still starts a line the old way; the Conveyor/Pipe buttons are unchanged.
- **The first-time guide** appears in build mode's info panel once a storage pod, auto feeder and creature tank are finished: three steps (storage → feeder conveyor, feeder → tank pipe, tank → storage conveyor), each shown until done, then a toast.
- Tested with the mouse: all three guided drags built the right lines and the guide finished.

**The submersible's new look** (`src/actors/sub.ts`; Colin: "make it look cooler")
- The new base kit's charcoal, chrome, neon lime glass and gold circuit lines on a swept, flattened hull with a sharp chrome bow and a lime sensor eye, a raised spine and a dark chin plate.
- A **teardrop bubble canopy** in lime glass, with the pilot inside.
- **No propeller:** a main ring thruster at the stern and a ventral nacelle, with turbine fans and **lime exhaust that burns longer with speed and flares on Boost** (and casts a little lime light).
- A swept dorsal fin with a lime edge light and a red tail lamp; lime side line and vents that glow while it's powered.
- Modules restyled: a sleek clamped cargo pod, twin bow light bars (floodlights), a charcoal-and-gold grabber arm.
- Its size and collision didn't change, so it drives exactly as before.
- Screenshots: `docs/art/milestone12/sub-new.png`, `sub-boost.png`.

### After milestone 12 part 1: pacing, suit attachments and sub modules (2026-11-18)
Colin: "Do all of that new stuff." Everything proposed after the pacing pass is built.

**Pacing**
1. **The Hatchery needs a blueprint** (`hatch` in `RESEARCH`, the `nurserylog` find). The **Kestrel nursery log** lies in a crate in the kelp caves' alcove, behind the kelp wall the cutter torch opens (`KC_FINDS.nurserylog`). A Lab decodes it (70 s).
2. **Young in the Hatchery get hungry** (`tickBreeding` in `src/game/creatures.ts`). They share one trough (`save.nurseryMash`, 12 L per Hatchery). A **feed pipe** from an auto feeder fills it (the Hatchery now takes one pipe in), or **Feed (1 fibre)** at its console. Unfed, a youngster sickens and goes dormant like any creature. They hatch full, which gives about 17 minutes. A one-time tip explains this.
3. **Housing costs more:** the creature tank adds 2 copper; the Grand tank adds 3 brass.
4. **Each zone's gear needs a bigger batch of its materials:** dive light 4 quartz and 2 copper (was 2 and 1), sonar 5 brass (was 3), PS-1 8 brass (was 6), PS-2 8 vent ore (was 6).
5. **Bred patterns for the later fragments** (`FRAGMENTS`, `bredWords` in `src/game/signals.ts`): fragment 3 needs 1 pattern shown by a grown creature bred at the base, and fragment 4 needs 2.

**Suit attachments** (Lab research, then a Workshop build; all in `GEAR`/`RESEARCH` in `src/game/gear.ts`). Each shows on the swimming diver (`applyKit` in `src/actors/diver.ts`; preview with `animlab.html?kit=2,1,1,2,0,0,1,1,1,1,1,1`):
| Gear | Researched from scans of | Does | Looks |
| --- | --- | --- | --- |
| Specimen satchel SJ-2 | glowfin, puffcap, ray | A second jar slot (`save.jar2`, which moves into the jar when it's emptied) | A padded pouch beside the jar |
| Flare launcher FX-1 | kelp caves, black water | **Z**, LT or the flame button: a flare flies ahead, sinks, lands and burns 90 s with its own red light (1 carried quartz each, six at most) | A tube on the near forearm |
| Echo visor EV-1 | Echo whorl, lumen moss | Lime marks on materials and amber marks on young creatures within about 20 m, through rock | A lime band across the helmet glass |
| TH-3 dash head | the caves' surge (needs TH-2) | Double-tap Boost to dash, every 3 s | A third, upturned nozzle |
| Mag-boots MB-1 | race, anchor ring | On the seabed, currents push you an eighth as much | Chrome soles with lime studs |
| Stun dart SD-1 | lurker, wreck | **X**, RT or the dart button: hits the nearest predator ahead (lurker or trench hunter) and sends it away. Shares the sonar's 6 s cooldown (a miss recharges in 1.5 s) | (the harpoon already on the pack) |
| Heat-shield cowl HC-1 | vent field, chimney | Vent plumes and the chimney scald a fifth as much | A chrome rim round the helmet and a shoulder plate |

The Flare and Dart buttons show on touch screens once each is built. Visual effects are in `src/world/gearfx.ts`. The new parts don't show on the walker (on foot) yet.

**Sub modules** (`MODULES` in `src/game/sub.ts`; Lab research, then fitted at a dock). **KS-1 now has 4 slots** (was 3), with nine modules to choose from:
| Module | Researched from | Does | Looks |
| --- | --- | --- | --- |
| Afterburner AB-S | race, flow vane | Boost 1.5× faster and 3× longer | A second ring nozzle above the main one, with its own plume |
| Ballast pod BP-S | wreck shelf, race | The race moves KS-1 a fifth as much | Twin trim tanks under the keel |
| Tractor beam TB-S | Echo whorl, salvage | Driving slowly, it draws the nearest loose material within 4 m into the sub, one every 1.2 s | A lime lens in the chin, and a beam |
| Sonar dome SD-S | the Corvina's log | Teal marks on materials within about 25 m, through rock | A small glass dome on the back with a sweep |
| Habitat pod HP-S | air pocket, Corvina | The sub's air reserve falls a quarter as fast | A pressurised pod on the back with lit ports |
| Drill nose DN-S | trench, crushed probe | Bores the soft rock seam (below) and, since Phase 13, five resealing mineral lodes | A chrome drill cone past the bow, spinning while it drills |

**The drill seam** (`SEAM`, `seam` in `src/world/terrain.ts`; art `buildSeam` in `scenery.ts`): a band of pale, glinting soft rock in the sheer wall under the trench rim (the face of the first ledge, about 28 m). With the drill fitted, put the bow at it and hold Collect (3 s): it opens into a sub-sized tunnel and a **sealed grotto** with 2 glowing blooms, 2 vent ore and an Echo whorl (`seam-*` and `whorl-seam` in `pickups.ts`, hidden until it's open). Without the drill, the banner says what it needs. Saved as `save.seamOpen`.

**Hull tiers** (`setLook` in `src/actors/sub.ts`): with depth plating DP-S, brass plates show along the hull. After first contact, pale Choir stone with cyan, violet and magenta gems lines the spine and keel.

**Also fixed:** a diver saved inside the sonar's hidden room or the drill grotto was pushed out onto the rock above on loading (the passages opened a frame too late).

**Tested** (headless Chromium; software graphics, so game time runs slow):
- Type check and production build; no console errors on a fresh start through the title screen.
- **Rules (run against the game's code):** unfed young sicken and go dormant; a feed pipe from a feeder into a Hatchery is accepted; fragments need 2/4/6/8 patterns with 0/0/1/2 bred.
- **The seam:** KS-1 at the wall with the drill fitted. The banner said "hold Collect to drill it", drilling went 8% → 42% → 75%, then it opened. Inside, the tractor beam took 2 vent ore and a bloom by itself.
- **On foot in the grotto:** a flare used 1 quartz and burned in the tunnel; the dart fired; the visor marked the grotto's materials.
- **Screenshots** (`docs/art/milestone12/`): `suit-attachments.png`, `seam-grotto-flare.png`, `sub-modules-a.png` (afterburner, ballast, sonar dome, drill, brass plating) and `sub-modules-b.png` (habitat, tractor beam, Choir stone).
- **Not tested by hand:** the dash's feel, mag-boots in the race, the cowl in the plumes, the satchel catching a second creature, and all of it on the phone.

### Line drag controls, reworked (2026-11-19)

Colin: dragging pipes from one piece to another wasn't working well. What was wrong, and the fixes (`src/ui/build.ts`; drawn in `BuildOverlay`, `src/world/basegfx.ts`):

- **Markers were tiny on a phone.** They were sized in world units, so on a phone (zoomed out over the base) they were about 6 px across. They are now sized on screen (`markScale`): about 11 px radius with a mouse, 15 px on touch, at any zoom. The grab reach is screen-sized too (18 px mouse, 30 px touch).
- **Markers overlapped.** A piece's conveyor and pipe markers touched, and neighbours' markers covered each other when zoomed out. They are spread sideways now, with a stem down to the real port.
- **The drop had to land exactly on the target's cell**, under the finger. Now the line **snaps to the nearest piece that can take it** within about 28 px (mouse) or 48 px (touch) of the pointer, measured to the piece's outline or its marker; dropping on the target's marker counts. The snapped piece gets a solid filled outline and its marker a white ring, so it's clear before letting go. Over a piece that can't take the line, the info box says why (and a toast says it again if you let go there).
- **A miss threw the line away.** Letting go over nothing now leaves the line waiting: tap (or click) a piece that lights up, or its marker, to pick its far end; tap empty water to cancel. Pressing the waiting line's own marker picks it up to drag again (before, that panned the view).
- **Targets off screen couldn't be reached.** Holding the dragged line near any screen edge pans the view that way (`tick`).
- **The drag could get stuck.** The pointer is captured during the drag, so crossing the build bar or info box no longer loses it; a cancelled touch ends it cleanly; a second finger turns it into a pinch/pan and leaves the line waiting for a tap.
- Storage (sends and takes conveyors) still works both ways: both kinds of target light up while dragging from it.

### More copper in the basin (2026-11-19)

Colin: copper was the early-game bottleneck. Three more copper nodules lie on the flat floor at the bottom of the basin's west side, at x -2110, -1930 and -1720 (ids `copper-b0` to `copper-b2`, appended at the end of `SPOTS` in `src/world/pickups.ts` so saved ids and random draws keep their places). That makes 10 copper spots in all; they regrow like the others.

### KD-1 delivery runs: the cargo cradle (2026-11-19)

Colin: the companion robot should find a dive-bag attachment in the kelp forest and ferry materials back to base storage on its own, on a key that isn't C, taking longer the further out you are, travelling through the real world, and with no building until it's back.

- **The find:** KD-1's **cargo cradle** lies in the kelp forest sand at x 12500 (between the crab-picked wreckage and the moss). Picked up by touch like the jar and thrusters (`'carrier'` kit find in `src/world/pickups.ts`; `save.kit.carrier`). Once found, KD-1 wears two little rails under its belly, and a net pouch hangs from them while it holds cargo.
- **Sending it:** **H** on the keyboard, **d-pad down** on a gamepad, the **Send** button on touch (shown once the cradle is found, dimmed while KD-1 is away). Deliberately not Collect (C / X / the Collect button), so reaching for a material never sends it off. KD-1 takes every material in the dive bag (the jar's creature stays with you) to the nearest finished, powered storage pod. It won't go while welding a frame, with an empty bag, without a powered pod, or if no way through the water is found; a toast says which.
- **Through the world, not a teleport:** `src/world/navgrid.ts` finds a route through open water with A* on a 40-unit grid over the terrain's own `isSolid` (rock, caves, wrecks, and every gate still shut, such as the kelp wall). Cells are tested only as the search reaches them, and the route is pulled tight to straight runs. KD-1 then flies it (`haul` mode in `src/actors/drone.ts`): out at 340 units/s with a full cradle, 1.8 s hovering over the pod to unload, then a fresh route back to the diver at 430 units/s, re-planned every few seconds as the diver moves. Trip time is simply the route's length, so the further out you are, the longer it takes.
- **Storage full:** what doesn't fit stays in the cradle (`save.droneCargo`) and goes with the next trip. The cradle is in the save, so quitting mid-trip loses nothing (KD-1 comes back to you holding it).
- **No building while it's away:** build mode won't open (a toast gives the seconds left), and the dock won't start a sub frame. Toasts when it sets off (with an estimate), when it unloads, and when it's back.
- The benchmark save has the cradle, and exposes `window.__haul` for headless checks.

## Next

**Known bug (Colin, after Phase 15):** with the two-slot specimen satchel, the base's Habitat console and Hatchery move only one creature into the jar. It is scheduled first in the Phase 16 prompt; see the roadmap for the cause.

The plan is in the [roadmap](docs/ROADMAP.md):
- **Phase 15:** release the creature in the jar, the Field kit screen and a control-bar restyle.
- **Phase 16:** an audio audit, which may now use CC0 sound files.
- **Later, to design with Colin:** playable Choir songs, site climaxes, movement flow, a goal board and site maps.

Alongside that, real-hardware validation continues:

First, play a full new save with the Phase 12–14 changes on real hardware (the headless rig is too slow for it). Listen to the Phase 14 reward stings on the iPhone speaker and with headphones, and judge whether the major cards' slow motion and length feel right in play or need tuning (see the Tuning section of the Phase 14 notes). Check the time and materials between milestones, identify friction in care and crafting, and test no-spoiler guidance with a new player. The Steam desktop build remains deferred until Colin asks.

## Problems and open questions

- **Milestone 12, to check after Colin plays:**
  - **Power numbers** (`POWER_MAKE`, `POWER_DRAW`, `TURBINE_LIMIT` in `src/game/base.ts`): whether three turbines (36 W) is the right ceiling before the Corvina, and the Core generator's cost (`PIECES.thermal`). Its research comes from the Corvina's log.
  - **Old bases:** a save with more than three turbines or a big base may now be short of power when it loads. That's the new rule, not a bug; a core generator (from the Corvina's log) fixes it.
  - **Gamepad:** the highlight's moves between buttons are worked out from where they sit on screen; if a panel moves somewhere odd, note which one.
  - **The title screen** shows on every start. If that's too much on the phone, it could show only after an hour away.
  - **Adaptive resolution** thresholds (18% over budget down, 30 s before up) in `adaptFrame`. If you see the picture soften and sharpen in a loop, switch it off in Settings and tell me where.
  - **Phone-speaker mix** (110 Hz low cut, +2.5 dB at 2.4 kHz): listen on the iPhone speaker and with headphones.

- **Milestone 11, to check after Colin plays:**
  - **The heart's swings** (`HEART_MAP` in `src/interior/sanctum.ts`):
    - upper rings at columns 34, 41 and 48 (280 units apart), 220 units above the walkway;
    - lower rings at 31, 38 and 45, where the line is held to about 230 units by the pool below.
    - If a gap is too wide, move or add an `o`.
  - **The contact's pace** (`src/ui/contact.ts`): the rise is 5 s, 0.95 s a note, and the three phrases are in `PHRASES`. The credits take about 26 s, and the button shows after 3.5 s.
  - **The resonator's gate and cost:** all four fragments; 6 ore, 4 quartz, 4 brass and 1 bloom (`gearBlocker`, `GEAR.resonator`).
  - **The Choir lantern's cost** (`PIECES.lantern`), and whether it should do more than a turbine once power becomes a limit.
  - **The zone map:**
    - a phone in portrait gives a short map (it is sized for landscape);
    - the sanctum shows only after its door is open;
    - the kelp caves draw as a few hollows.
  - **Gamepad:** contact answers to A, B, X and Y since milestone 12.
  - **The lighting bake is taller** (about 4,825 × 1,213 cells at 8 units). Check the first load time on the iPhone.

- **Milestone 10, to check after Colin plays:**
  - **Crush numbers:** `CRUSH`, `CRUSH_RATE` (2%/s) and `CRUSH_DOUBLE` (5 m) in `src/world/terrain.ts`. With PS-1 the floor (98 m) kills in a second or two, on purpose; PS-2 is needed there.
  - **Predators** (top of each class in `src/actors/deep.ts`): lanternjaw notice 520 lit / 150 dark, snap 120, bite 30%; stalker keeps 400 off, strikes after 2.6 s still or 1.1 s dark, bite 30%; strider notices 650 lit, walks 78/s, grabs 150, 25%. Whether three predator kinds plus crush depth is too much at once on the floor.
  - **Vent plumes** lift (240) and scald (up to 9%/s). The chimney over the cleft also scalds at its mouth.
  - **Signal fragments** need 2/4/6/8 different glow patterns among grown creatures (`FRAGMENTS` in `src/game/signals.ts`), 150 s each. Eight needs real breeding (or the cinder snail's three patterns).
  - **Costs:** PS-2, DP-S (`DEPTH_PLATING_COST` in `src/ui/dock.ts`), the Signal array; vent ore weight (3.5 kg) and its eight spots.
  - **Frame rate in the trench** on the iPhone: three kinds of predators draw every frame when on screen (far ones idle). The lighting bake is taller (about 4,850 × 960 cells): check the first load time on the phone.
  - **The cleft's rock** lit by the lamp looks flat from inside; it may want the kelp caves' wall treatment later.
  - The trench's research is hidden in the Lab until the trench is scanned.

- **Graphics session G2, to check after Colin plays:** the caves are darker behind pillars (by design, see above); the shadow march is not yet measured on a GPU; moving things that are not in the bake (the kelp wall, the boom gate, creatures, the sub's hull) do not cast shadows; the interior's walls cast but its doors and gratings do not. Lights other than the diver's lamp and the sub's still pass through rock (moss, anemones, lures): that is deliberate for now (small radius), and the list is one flag, `shadow: true`, per light.

- **Graphics session G1, to check after Colin measures:**
  - **No real GPU numbers exist yet.** The cloud has none. Colin's PC (RTX 5080) and iPhone numbers from `?bench` are the first real ones; until then the High cost review in the G1 section is a plan, not a measurement.
  - **Ultra's "Smooth edges" (MSAA on the half-float picture)** replaced the canvas MSAA. It looked right in screenshots but is untested for cost on a real GPU. If it costs more than the old canvas MSAA did, switch `hdrMsaa` off in `presets.ts` for Ultra and consider an FXAA step in the final pass instead.
  - **The 8-bit fallback** (devices that cannot render to half-float) was forced and ran in the cloud, but not on an older iPhone. It has no tone mapping by design.
  - **Tuning numbers (all single values):** bloom strength, threshold and steps in `presets.ts`; the tone-map knee (0.72, `shoulder` in the final shader in `src/fx/post.ts`); the per-zone grades (`GRADES` in `post.ts`); grain in `presets.ts`. Bloom was kept subtle on purpose (the glow layer was already doing the soft halos).
  - **The interior's grapple ring** is drawn inside the post pass (it is part of the interior's own scene), so it is tone-mapped and can bloom slightly. The world's scanner, build grid and collect rings are after post.
  - **Benchmark scenes use fixed positions** (`BENCH_SCENES` in `src/dev/bench.ts`). If the world or the basin changes a lot, re-check them with `?bench&still&scene=N`.

- **The walkable base, part 2, to check after Colin plays:**
  - the ceiling lines when a base is big: lines crossing or overlapping (four lanes, `% 4` in `BaseHooks`' constructor), and long routes through many rooms;
  - the lift only appears for shafts of 4+ cells; if the ladder feels slow at 3, lower the limit in `buildBaseLevel` (`cells <= 3`);
  - Exit (V) in a docked sub now goes up into the base (only when a dome exists and the dock is powered).
- **The walkable base, part 1, to check after Colin plays:**
  - room size (8 × 6 tiles a cell, `CW`/`CH` in `src/interior/baselevel.ts`) and climbing speed (210, `CLIMB` in `src/interior/interior.ts`);
  - whether panels opening "outside for a moment" (care, Lab/Workshop, dock, build) feels right, or should open over the room instead;
  - a base with **no finished dome has no way in**, so storage and tanks can't be used until one is built. The dome is the first build card;
  - old saves load, but bases built before may make odd room layouts (Colin said save compatibility doesn't matter; reset progress in Settings to start clean);
  - frame rate on the phone in a big base. Rooms redraw their moving parts (creatures, screens, rams) every frame; if it stutters, only draw rooms near the camera.

- **On-foot numbers to tune after Colin plays** (top of `src/interior/interior.ts`):
  - walk 270, jump 660 (about 2.4 tiles high), gravity 1900, coyote 0.1 s, jump buffer 0.13 s;
  - grapple range 420 and pull 760;
  - steam vents (3.2 s cycle, 8% each), bilge 10%;
  - the camera's view height (560 units), the dark ambient before her power is back, and the lamp's beam.
- **The world pauses while you're inside an interior** (the base, creatures, regrowth and the factory wait). That keeps things simple. If it matters for long dungeons, the base's simulation could tick on while you're inside.
- **Touch controls on foot:** the stick walks, Boost jumps, Lamp toggles the helmet lamp, Collect uses things or fires the grapple. Scan, Board and the base buttons hide indoors. Check this on the iPhone.

- **Milestone 8 part 2 numbers to tune after Colin plays:**
  - the upwelling (520) and downdraft (460);
  - the grapple reaching the bollard from the seabed (range 460);
  - the sonar cooldown (6 s), its range (700) and the lurkers' rest (about 10 s);
  - research and build times and costs (`src/game/gear.ts`, `PIECES`);
  - the crane's minute per piece and its 4/2/1 output; salvage regrowth (15 min);
  - the recompression room's repair rate.
- **The Corvina is a cut-away:** from outside you can see into her decks. That reads clearly in a side view. If Colin prefers her closed until the hatch is cut, the interior can be hidden until then.
- **The pressure suit does nothing yet** (by Colin's choice): crush depth and the trench come in milestone 10.

- **Milestone 8 part 1 numbers to tune after Colin plays:**
  - the race (`RACE.speed` 500, 10% at a ring), hauling speed (`HAUL_SPEED` 170), and the sub's half-strength drift;
  - the lurker's reach (250), detect range (200 lit / 125 dark), warn 0.75 s, rest 3.4 s, and the bite (30%);
  - suit self-seal (1.2%/s after 8 s) and repair (25%/s);
  - brass weight (3 kg) and unbolt time (2.6 s).
- **The lurkers ignore the sub.** The sub can't cross the race until a diver raises the flow vane (after milestone 8 part 1). Grapple numbers to tune: range 460, reel 580 units/s, sub push 1.4× before the vane.

- **Milestone 7 part 2 numbers to tune after Colin plays:** the surge (`SURGE_CYCLE` 7.5 s, strength 560 in `src/main.ts`), air pocket sizes (`AIR_POCKETS` water lines), how far you can go past the last lit bracket (330) and how much the black water shrinks the light (0.32); research and build times and costs (`src/game/gear.ts`, `PIECES`); the Sorting pod bay (12 of each); relay spacing (600) and breathing radius (140); the grabber's reach (`GRAB_REACH` 150) and how fast it hovers into line (160 units/s); boarding (0.6 s swim + 0.45 s in).
- **Cave frame rate on the phone:** in the cloud test browser (software graphics, no GPU) the caves ran at about half the frame rate of the shallows, mostly from their many lights (moss, brackets, finds). Check the caves on the iPhone. If they stutter, the first things to cut are the moss lights along the route (in `buildKelpCaves`) and the darkness strips' resolution.
- **The tow line has no use yet.** It is for the wreck shelf's currents (milestone 8). The Workshop says so.
- **A material in reach takes the Collect button first.** That is why the weld chip's moss spot was moved. Keep finds and material spots at least 2–3 m apart.

- **Milestone 7 part 1 numbers to tune after Colin plays:** Lab and Workshop costs and weld times (`PIECES`); research 75 s and build 45 s, dive light cost and its reach and brightness (`src/game/gear.ts`); the shrimp's +25% cleaning bonus and 35% slower fouling (`CLEAN_BONUS`, `SHRIMP_CLEAN_WATER`); resin and moss weights and spot counts; how dim the forest is (the canopy factor in `bakeSkyVisibility`).
- **The east cliff changed shape.** Its top used to be right at the surface; it is now a 2.8 m deep shelf (so the sub has a way over). The cave mouth is where it was.
- **Power as a mechanic later** (Colin): see DESIGN.md, The base. Not planned into a milestone yet.
- **Milestone 7b sound to tune after Colin listens** (all single numbers):
  - bus levels and make-up gains in `applyVolumes` (`src/audio/engine.ts`);
  - the muffle cutoffs and reverb amounts in `SoundDirector.update` (`setScene`);
  - breathing level and pace (the "Breathing" block in `director.ts`);
  - how often the music plays and rests (`Music.update`: 70–150 s on, 40–100 s off) and each zone's key, chords and brightness (`PROFILES` in `src/audio/music.ts`);
  - ambience layer levels in `Ambience.update`.
- **Audio CPU on the iPhone:** about 25 continuous oscillators and noise sources, plus short voices. If the frame rate drops with sound on, the first thing to try is one saw per pad note instead of two (`Music.nextChord`).
- **Not yet given sounds:** turbines, conveyors and feed pipes; creatures (glowfins and others are silent); tank bubbling. Candidates for milestone 12's final mix, along with the Choir's own sound in the sanctum.

- **Milestone 6 numbers to tune after Colin plays** (`src/game/sub.ts`, `src/actors/sub.ts`):
  - sub cost (12 plating + 4 quartz, 3 copper, 2 fibre), weld 60 s, dock cost and weld time in `PIECES`;
  - air 10 min; it refills in 20 s at a powered dock and 30 s at the surface;
  - dents above 170 units/s at 1/1100 per unit; repairs cost 1 plating per quarter;
  - cruise 330, thrusters 620 for 1.6 s, and how slowly it speeds up and stops;
  - the cargo bay's +36 / +40 kg; module costs.
- **The sub on the phone:** the controls are the swimming ones, so check it feels heavy but not sluggish on the touch stick. If it is too slow to stop, raise the 0.55 drag in `Sub.update`.
- **The sub isn't solid to the base.** Like the diver, it passes in front of base pieces, so it never snags on the factory. Only rock dents it.
- **The cave gate (decided in milestone 7):** the cave stays diver-only; the sub reaches the forest over the cliff-top shelf once the boom gate is wound open.

- **Milestone 5 part 2 numbers to tune after Colin plays** (top of `src/game/factory.ts`): press 0.5 plating/min, recipe 2 scrap + 1 copper, hoppers 6 / 3, rack 4; tray 4 per tank; CB-1 4 and CB-2 10 items/min; FL-1 10 and FL-2 25 L/min; tier-2 plating cost (1 per 4 cells); plating weight 4 kg; the press's cost and build time in `PIECES`.
- **Tank output no longer goes straight to storage.** Without a conveyor, creatures fill the 4-item tray and pause until the diver swims by. If that feels like a chore before conveyors are affordable, a bigger tray or a "crew empties the tray when you visit the dome" rule are easy changes.

- **Milestone 5 part 1 numbers to tune after Colin plays** (all in `src/game/factory.ts` and the top of `src/game/creatures.ts`):
  - conveyor 6 items/min, pipe 10 L/min, line costs, the longest line (30 cells);
  - feeder 0.5 fibre/min, 12 L per fibre, hopper 4, mash tank 24 L, trough 12 L, 1 L = 20% Fed;
  - shoal +15%, reef +10% each up to +50%;
  - whorls ×2 / ×3.
  - Basin depth and brightness: `BASIN_FLOOR` in `src/world/terrain.ts`, `depthLook` in `src/fx/shared.ts`.
- **Lines are drawn over pieces.** They run across the tops of pieces and drop into them, so a long line can cross in front of other pieces. That keeps them readable on a phone. If it gets busy, a later option is drawing them behind, or letting Colin pick the lane height.
- **Old saves and decorations.** The landmarks stayed put, but some procedural plants, corals and rock texture between them moved (the random sequence changed with the bigger world).

- **Colin's answers on the base and factory direction (after milestone 4):**
  1. Build the big base and factory groundwork **before** the submersible. It is now milestone 5; every later milestone moved up by one (the sub is 6, the first gear gate 7, and so on; DESIGN.md has the new list). Milestone numbers in the history above are the old ones.
  2. The build area must be **wider and deeper**, with plenty of room for factory parts. Later, tunnelling lets the base expand down into the rock once the water space is full.
  3. **Real production chains with rates to balance**, not just a few simple combiners.
  4. The **auto feeder** is a base piece that feeds tanks from stored kelp fibre, including what puffcaps produce.
  5. Steam: keep building as a web link in small chunks; wrap it as a desktop app in the polish milestone (or earlier for a store page).
- **Colin answered the milestone 5 questions** (written up in DESIGN.md, The base, "Milestone 5 decisions"): a site at least 20 times bigger in a deep basin, different transport for different material kinds, the auto feeder as the first production line, and creature output scaled by both numbers and a rare output-multiplying item that also raises input use. The prompt for the next session is in `docs/prompts/milestone-5.md`.
- **Phone and PC for a big base:** the build view will need panning and zooming for a large base. Keep it usable on the phone, but PC with a mouse may be the best way to manage a big factory, as Colin expects.

- **Creature numbers to tune after Colin plays** (all at the top of `src/game/creatures.ts`): hunger 15 min, feed +60%, dirt per creature 20 min, filter rate, clean +40%, sick below 25%, 6 min sick to dormant, 8 min to grow, 90 s to hatch, 4 min per material, 4 per tank, 2 tanks per pump. Catch times are in `src/world/wildlife.ts`. If losing creatures feels too harsh for the cozy shallows, raise `SICK_SECONDS` or slow `HUNGER_RATE`.
- **Mixed tanks as the goal (Colin, after milestone 5 part 1).** As new species arrive, the ideal tank should hold two or more species: through **both** tank upgrades (bigger tanks, planters with more than one plant kind) **and** partner species that help each other (Colin chose both, and wants clashes kept). Today's ideal (one species per tank with its own plant) is fine for now. Recorded in DESIGN.md, Creature care. Plan it with Colin when the next species are designed (kelp forest, milestone 7; breeding, milestone 9). Possible small help before then: a "good tank-mates" line in each scanner entry, or a warning before putting a glowfin in with a puffcap.
- **Gamepad can't open Tend yet** (touch and keyboard T work). Add a button when gamepad play matters (milestone 11 polish).
- **Grown creatures as keys** (a grown glowfin lighting a passage) and breeding come in milestone 8, as DESIGN.md plans. Grown glowfins already glow brighter, ready for that.
- **Revival pool** is not built. Dormant remains are counted in the save (`dormant`) for when it is.
- **Egg cases for puffcaps and rays** have names in the code, but only glowfin eggs exist in the world for now. Breeding (milestone 8) can add the others.

- **Build drone and dive bag numbers to tune after Colin plays:**
  - drone repair cost (`DRONE_REPAIR_COST`) and repair time (`REPAIR_SECONDS`);
  - build times (`buildTime` in `PIECES`);
  - material weights (`kg` in `MATERIALS`) and the 15 kg / 24 kg limits (`BAG_RATED_KG`, `BAG_MAX_KG`);
  - the penalty sizes in `Diver.update` (swim −22% per rated load, sink 30 units/s per rated load) and the air use in `src/main.ts` (+20% per rated load).
- **Drone upgrade path:** not built yet, by design. Colin wants drone and diver upgrades found in future biomes; the drone starts small so upgrades can show on it. The hooks are in place (see the milestone 3 follow-up notes). When do upgrades arrive: with the Workshop in milestone 6, or earlier? Ask Colin.
- **The drone doesn't avoid rock on long flights.** It follows the diver's own path, and when idle it parks above the base, so in practice it stays in open water. If it is ever seen clipping through rock, that is the place to look.
- **Base growth across biomes (Colin, after milestone 3).** Colin wants to expand the base with each new biome, with bigger, more complex and more rewarding pieces. This is recorded in DESIGN.md under The base. When planning milestones 6, 7, 9 and 10, include new base pieces made from that zone's materials. Open questions for Colin:
  - Should new biomes grow the one base at the Kestrel site (a larger grid and upgraded piece tiers), or allow small outposts in each zone?
  - Which kind of reward matters most to him: new abilities, faster crafting, comfort and looks, or stronger creature care?
  - The code is ready for it. A new piece is one entry in `PIECES` (`src/game/base.ts`) plus a drawing in `src/world/basegfx.ts`. The grid size is `GRID_COLS` / `GRID_ROWS`.

- ~~GitHub Pages switch~~ Done: Colin set Pages → Source to GitHub Actions, and the deploy now succeeds.
- **Which branch deploys.** Colin added the deployment-branch rule `claude/*` (Settings → Environments → github-pages) on 2026-11-15, so every `claude/...` session branch now deploys to the play link on push. Before that, only the default branch `claude/underwater-game-m0-0qqajg` could deploy, and milestone 1 builds were copied onto it. The play link shows whichever branch pushed last, so run one session at a time. Keep merging finished work into the default branch so it stays current.
- **Milestone 3 numbers to tune after Colin plays:** piece costs (`PIECES` in `src/game/base.ts`), storage per pod (40, `STORAGE_PER_POD`), the grid size (11 × 3 cells of 112 units) and the build-mode zoom (`VIEW_H_BUILD`).
- **Possible later (Colin open to it):** a buildable support pylon, so foundations can go anywhere in the middle of the basin, not just on the terraces.
- **Base pieces are not solid.** The diver swims in front of corridors, turbines and pods, and "inside" domes. This keeps movement smooth. If Colin wants to bump into the base, collisions can be added per piece.
- **Milestone 2 numbers to tune after Colin plays:** tank size (75 s, `BASE_OXYGEN`), upgrade size (+20 s), the drain while boosting or working, the regrow time (6 min of play, `REGROW_SECONDS`), the work time per material (`EFFORT` in `src/world/pickups.ts`) and the scan time (1.4 s). All are single numbers in `src/game/state.ts`, `src/main.ts` and `src/game/scanner.ts`.
- **Dive light vs. shoulder lamp.** The diver already has a shoulder lamp from milestone 1. DESIGN.md's "dive light" is treated as a stronger light built in milestone 6, which opens the dark cave in the east cliff. The cave message and the sled scan say so. If Colin pictures it differently, change it before milestone 6.
- **Health** is not in yet. Nothing in the shallows can hurt you, so it arrives with predators and crush depth (milestones 7 and 9).
- **Things to watch in Colin's review:** whether the kelp is too bright or too busy, how strong the caustics and water wobble are, and how fast the diver swims. Each is a single number in the code and easy to tune.
- **Frame rate on the real phone.** Milestone 0: Colin measured a steady 60 fps in both presets. Milestone 1: mid 30s fps on High with the lamp on in the deep grotto (Colin, iPhone). He accepts this; graphics stay as they are. Ultra on the PC is not yet tested. If we tune performance later (milestone 11), the grotto with the lamp on is the scene to profile: there the lighting shader adds up the most lights and the glow layer is busiest.

## Terrain and build-bar pass (after milestone 9)

- **Tighter, stepped trench** (`src/world/terrain.ts`): 282 open cells (was 658). The basin floor is raised to grid row 3 and runs cols 24–33; a sloped bed (one row a column) climbs the west side to a ledge (the Echo whorl nook, now at x -2950) and a full-height wall; three terraces (rows 5, 7, 9) step down from the shelf. `GRID_X0`, `GRID_BASE`, `OLD_SITE` and the grid size are unchanged, so no save migration is needed: the existing load-time pass in `src/main.ts` removes and refunds pieces now in rock, and sends the diver or sub back to the buoy if saved inside the old basin.
- **Build camera** frames the open cells (`SITE` in `src/game/base.ts`), not the whole grid.
- **Three structural pieces** (`src/game/base.ts`, `src/world/basegfx.ts`): Riser shaft (1×3, D/U collars, 5 scrap 2 fibre, 24 s), Cross junction (1×1, four collars, 3 scrap 1 fibre, 12 s) and Cliff bracket (1×1, two rotations, must stand beside solid rock, 3 scrap 2 copper, 16 s). No blueprint needed. A separate stilt piece was skipped: legs are already drawn under every floating piece.
- **Build bar** (`src/ui/build.ts`, `src/style.css`): All / Modules / Structure tabs above a card row that scrolls sideways (cards stay 156 px wide, names wrap to two lines). Picking a piece from another tab by key or pad switches tab.
- **To look at on a real phone:** the tab row adds about 40 px above the cards (36 px in landscape), and the action and tool buttons moved up by the same amount (`--bar-extra`).
- **Follow-ups:** the bench base now includes the new structure pieces (`src/dev/bench.ts`); the Cross junction and Riser shaft have interior art (a hub ring with direction arrows; a gold conduit and L1/L2/L3 level markers); the swimming diver's breath is easier to see when floating still (walking-style boost, `src/actors/diver.ts`); and `?bench&scene=6&at=x,y` stands in the base interior at that spot, for screenshots.

## Colin's notes before milestone 11

- **Start at the trench's west lip.** A new game starts at the surface just off the trench's western wall (`START` in `src/world/terrain.ts`), looking east down the site. Blacking out still brings you back to the buoy (`SPAWN`). With nothing built, the build view frames the whole trench (`SITE`), not the old flat shelf.
- **No sinking while building.** In build view (and with the care, dock or Lab panel open outside) the diver treads water where they are, however heavy the bag (`diver.noSink`).
- **Lab and Workshop panels open indoors**, like tending: the camera frames the room and the walker waits while the panel is open. No more popping outside.
- **Sprint on foot.** Space jumps, Shift sprints (430 against the 270 jog; `SPRINT` in `src/interior/interior.ts`). Pad: left bumper or left stick click. Touch: drag the stick well past its rim. The walker has a sprint pose: longer, quicker strides, high heel kick, more lean, arms pumping (`sprintOf` in `src/actors/walker.ts`; `animlab.html?walker&seg=4` shows it). In the water, Shift and Space both still boost.
- **Thruster plume** (`drawPlume` in `src/actors/diver.ts`): a flared lime bell with a white-hot core, a hot ring at the nozzle, pulsing shock diamonds, and churned bubbles and sparks that drift and fade after the boost.
- **Current turbine:** collars left and right on its upper level too, so pieces join its top deck (inside, a doorway off the upper grating).
- **Riser shaft:** side collars on its top and bottom cells (both sides).
- **Specimen jar on the belt** (`BeltJar` in `src/actors/diver.ts`), on the swimmer and the walker: hidden while empty, showing eggs, a youngster or a grown creature in the species' colours. `animlab.html?jar=glowfin` and `animlab.html?walker&jar=crab-young` preview it.
- **Grotto nodules moved clear of the glowfin eggs** (scrap to x 6215, copper to 5860). A creature the jar can't take (full, or not scanned) no longer hides a material in reach.
- **SLED 2 recorder** is now its own yellow canister on the sand west of the sled (`RECORDER_X` 3810), away from the drone and the scrap, with a blinking amber beacon, a light, a cable back to the sled and a pulsing ring when you're near. It no longer needs the sled scanned first.
- **Echo whorls are fitted indoors**, at the machine's console: hold C to fit one (or, once full or out of spares, to take one out). A socket plate on the wall above shows what's fitted and blinks when a spare can go in. The build view's whorl buttons still work outside.
- **To try on the real phone:** the touch sprint (drag past the stick's rim) and whether the whorl console spot at a tank's right end is easy to stand at.
- **Build bar on a PC:** the card row was touch-scroll only (hidden scrollbar, and the wheel zoomed the camera). Now the mouse wheel over the cards scrolls them sideways, a click-drag scrolls them without picking a card, and ‹ › buttons appear at whichever end has more cards (hidden on touch).

## The kit builds up as it's found (Colin, before milestone 11)

- **Found, not given.** A new game starts with a pony bottle on the back and nothing else. Everything else appears on the body when it's found or built (`KitLook` in `src/actors/diver.ts`; the save's `kit` holds the jar and thruster level):
  - **Specimen jar:** lies by the old anchor in the coral garden (x 2770). Without it you can't take creatures (wild, from a tank or the Hatchery, or from the Revival pool), and it isn't on the belt. Once found it hangs on the belt even when empty; a caught creature shows inside and tints the water its colour.
  - **TH-1 hip thruster:** at the foot of the survey beacon by the drop-off (x 5090). No boost before it (a toast says where to look).
  - **TH-2 thruster head:** in the kelp forest (x 13760). Twin nozzles, lime fins and a brass ring; the boost is faster (540 against 430), harder and longer, with twin plumes.
  - **Air tanks:** one tank on the back per tank found (up to four: rows stack outward on the swimmer, columns on the walker).
  - **Harpoon (the grapple line):** on the back only once the Workshop has built it.
  - **Pressure suit:** a warm bronze cast over the suit, brass rings at every joint, ribbed pressure tubes along the limbs and round the body, a brass chest plate and bands.
  - Older saves keep the jar (if they've ever caught or kept a creature) and the TH-1 (if they had started building). `animlab.html?kit=tanks,spear,jar,thruster,psuit` previews any stage (e.g. `kit=0,0,0,0,0`, `kit=4,1,1,2,1`); add `&walker` for the walker.
- **Grapple on foot, reworked** (`src/interior/interior.ts`): tap Collect at a marked ring and the near hand reaches back over the shoulder for the harpoon, aims it, fires the spear (with its line) into the ring, and the line reels you up off your feet into a swing. It's a real pendulum: A/D pump it, W/S climb or pay out the line, Space lets go and you fly on with the swing's speed (`flingT` keeps it from being braked by walking speed), Collect lets go without the hop, touching the floor lets go too. The line's length is capped so the bottom of the arc clears the floor (or the bilge) under the ring. The spear reels back to the harpoon and it goes back on the pack. On foot it needs the grapple line built too.
- **Lifts ride, no more teleport.** The Corvina's lift now has a real shaft at the east end of the ship (map: `L` shaft, `G` gates; the upper stop moved from the entry deck into the survey lab's east end, which opens onto it; the hold's breaker moved four tiles west). Hold Collect at a stop: the car is called if it's at the other end, the gate slides up, you step in, the gate shuts, the car's lamp comes on and it runs along the shaft with you in it, then the far gate opens and you step out. The base's long-climb lifts carry you in a car between their ends the same way.
- **Dive watch on a PC:** sized by `--watch` (108 px; on a big screen with a mouse it grows with the window height, about 158 px at 1440p). The suit bar and sub chip under it follow.
- **To look at:** whether the swing's pump and the let-go flight feel right in the Corvina's hold (`SWING_PUMP`, `SWING_CLIMB`, the hop on release), and the lift's speed (240 units a second).

## Merging milestone 10 with the kit passes (2026-11-18)

Milestone 10 (on `claude/jolly-cray-gets18`) and the three passes above were built side by side from the same commit. Merged together, with these fixes where they meet:

- **The Fulmar's lift rides a real shaft**, like the Corvina's now. Its two stops were in different columns (top deck col 66, machine hall col 96); now both are at col 94, with gates (G) and a shaft (L) up the station's east side (`src/interior/fulmar.ts`). The top stop is at the array room's east end: the lift only runs with power, which also opens the array room's door, so it skips nothing. The hall's east platform reaches 4 tiles further west (cols 91 to 98) to hold the bottom stop; the gap you grapple across to it is 7 tiles (was 11), with the same ring.
- **Entering a wreck resets its lift** (the car waits at the lowest stop), so the Corvina's car position never carries over into the Fulmar.
- **PS-2 has its own look**: the kit's `psuit` is now a level (0 Kestrel suit, 1 PS-1, 2 PS-2). PS-2 adds to PS-1 a deeper bronze cast, riveted armour plates on the thighs and upper arms, a second pair of pressure tubes, a riveted back plate and a lit pressure gauge on the chest (`drawDiverPs2Torso`, `ps2Plate` in `src/actors/diver.ts`; the walker's twins in `src/actors/walker.ts`). `animlab.html?kit=2,1,1,1,2` previews it.
- **The cinder snail in the belt jar**: iron-grey shell with an ember-lit spiral.
- **The crush-depth chip** follows the dive watch's size (`--watch`), like the suit bar.
- Styles: both sides' new blocks are kept (the build bar's arrows, the crush-depth chip).

**Tested:** type check and production build; in a headless browser, the Fulmar lift from the machine hall to the array room (the call, gates, ride and step-out), and the PS-1 and PS-2 looks on the swimmer and the walker. **Not tested on a real iPhone or PC.**
