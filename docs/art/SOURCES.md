# Art sources

Colin lifted the "all art is drawn by code" rule on Nov 22, 2026 (see "Colin's decisions" in the [roadmap](../ROADMAP.md)). Art may now be drawn by code or made with image generation. This ledger records where each image in the game came from, as `public/audio/CREDITS.md` does for sound.

**For every new generated image, add a row with:**
- the file path;
- what it is;
- the tool used;
- the date;
- the prompt, or a short summary of it;
- any edits made (cropped, recoloured, resized, converted to `.webp`).

**Rules:**
- The tool's licence must allow selling the game, since Colin may sell it on Steam. If unsure, ask Colin before using an image.
- Images must be original: never a recreation of another game's, film's or artist's characters, creatures or look.
- Cyan, violet and magenta stay the Choir's.

## Images already in the game (before this ledger)

These were made in earlier sessions with other AI tools, which Colin used to generate painted images. Their exact prompts weren't recorded here. The procedural versions remain available with `?art=procedural` where the code has one.

| Files | What | Notes |
| --- | --- | --- |
| `src/art/painterly-world/*.webp` (27 files) | Painterly zone and facility plates (Phase 7) | Earlier sessions; see PROGRESS.md, Phase 7 |
| `src/art/sunlit-shallows/*.png` | Reef atlas, far and mid reef, seabed strip, kelp strands (Phases 1–6A) | Earlier sessions |
| `src/art/kelp-forest/*.png` | Forest mid layer and the central outcrop | Earlier sessions |
| `src/art/wreck-shelf/western-approach.png` | Wreck Shelf western approach | Earlier sessions |
| `src/art/diver/kestrel-face.png`, `kestrel-suit-materials.png` | Kestrel's painted face and suit materials (used on the jointed rig) | Earlier sessions |
| `docs/art/**` | Concept and reference boards (not shipped in the game) | Reference only |
| `public/icon-*.png` | Home-screen icons | Drawn by code (`scripts/make-icons.mjs`) |

## New images

| File | What | Tool | Date | Prompt (summary) | Edits |
| --- | --- | --- | --- | --- | --- |
| `src/art/tanks/kelp.webp` | Painted ribbon-kelp aquarium tank backdrop | User-generated image (WebP) | 2026-11-23 | Wide 16:9 painterly blue-green aquarium interior with olive-ochre limestone ledges, swaying ribbon kelp, sunlit sandy pebble floor, and warm sunbeams; no fish or borders | None (shipped as `.webp`) |
| `src/art/tanks/bare.webp` | Painted empty reef aquarium tank backdrop | User-generated image (WebP) | 2026-11-23 | Wide 16:9 painterly blue-green aquarium interior with weathered warm sandy limestone ledges, open deep-teal center, sunlit sandy pebble floor, and warm sunbeams | None (shipped as `.webp`) |
| `src/art/tanks/coral.webp` | Painted branch-coral aquarium tank backdrop | User-generated image (WebP) | 2026-11-23 | Wide 16:9 painterly sunlit aquarium interior with sandy limestone ledges, rosy-terracotta and peach branching coral clusters, coral-sand pebble floor, and sunbeams | None (shipped as `.webp`) |
| `src/art/tanks/grass.webp` | Painted seagrass aquarium tank backdrop | User-generated image (WebP) | 2026-11-23 | Wide 16:9 painterly sunlit aquarium interior with terraced limestone ledges carpeted in swaying green seagrass tufts, pale sandy pebble floor, and sunbeams | None (shipped as `.webp`) |
| `src/art/tanks/bladder.webp` | Painted bladder-kelp aquarium tank backdrop | User-generated image (WebP) | 2026-11-23 | Wide 16:9 painterly dim kelp-forest aquarium interior with mossy olive-slate ledges, amber-brown bladder kelp stalks with golden air bladders, and dappled light | None (shipped as `.webp`) |
| `src/art/tanks/lumen.webp` | Painted lumen-moss aquarium tank backdrop | User-generated image (WebP) | 2026-11-23 | Wide 16:9 painterly sheltered dark-grotto aquarium interior with wet dark slate ledges cushioned in softly glowing warm yellow-green moss and dark pebble floor | None (shipped as `.webp`) |
| `src/art/creatures/glowfin.webp` | Painted Glowfin body texture with baked 3D shading | User-generated image (WebP) | 2026-11-23 | Side-view pale neutral warm-grey/cream reef fish body facing right, big soft dark eye, no fins, baked sunlit top rim & cool shaded underside on pure white | Runtime 4-corner white cutout & tight crop in `creatureArt.ts` |
| `src/art/creatures/puffcap.webp` | Painted Puffcap bell texture with baked 3D shading | User-generated image (WebP) | 2026-11-23 | Front-side view pale ivory-peach translucent jellyfish dome bell with scalloped rim & two tiny eyes, no tentacles, baked sunlit dome highlight & inner shade on pure white | Runtime 4-corner white cutout & tight crop in `creatureArt.ts` |
| `src/art/creatures/ray.webp` | Painted Dapple ray body texture with baked 3D shading | User-generated image (WebP) | 2026-11-23 | Side-3/4 view pale neutral sand-grey sea ray disc with lighter-ringed dapple spots, friendly dark eye, no long tail, baked sunlit back & cool underside on pure white | Runtime 4-corner white cutout & tight crop in `creatureArt.ts` |
| `src/art/creatures/crab.webp` | Painted Tinker crab shell texture with baked 3D shading | User-generated image (WebP) | 2026-11-23 | Side-3/4 view pale stone-tan domed crab carapace with stalked eyes, no legs or claws, baked sunlit dome & shaded underside on pure white | Runtime 4-corner white cutout & tight crop in `creatureArt.ts` |
| `src/art/creatures/shrimp.webp` | Painted Lantern shrimp body texture with baked 3D shading | User-generated image (WebP) | 2026-11-23 | Side-view pale ivory-pearlescent curved segmented shrimp body & head with big dark eye, no antennae/legs/tail fan, baked volume on pure white | Runtime 4-corner white cutout & tight crop in `creatureArt.ts` |
| `src/art/creatures/snail.webp` | Painted Cinder snail shell texture with baked 3D shading | User-generated image (WebP) | 2026-11-23 | Side-view pale ash-buff coiled ribbed sea snail shell only, baked sunlit ridges & deep spiral shadows on pure white | Runtime 4-corner white cutout & tight crop in `creatureArt.ts` |
| `src/art/creatures/eel.webp` | Painted Kiln eel head texture with baked 3D shading | User-generated image (WebP) | 2026-11-23 | Side-view pale neutral warm-grey gentle eel head with amber eye ring & feathery gill frills, no body, baked volume on pure white | Runtime 4-corner white cutout & tight crop in `creatureArt.ts` |
| `src/art/creatures/horse.webp` | Painted Chime seahorse head & torso texture with baked 3D shading | User-generated image (WebP) | 2026-11-23 | Side-view pale ivory-cream upright seahorse head & ridged chest torso, no lower tail or back fin, baked sunlit rim & cool shade on pure white | Runtime 4-corner white cutout & tight crop in `creatureArt.ts` |
| `src/art/creatures/linnea.webp` | Painted Linnea axolotl head texture with baked 3D shading | User-generated image (WebP) | 2026-11-23 | Side-view soft warm coral-peach axolotl head with warm dark eyes & gentle smile, no gills or body, baked warm lighting on pure white | Runtime 4-corner white cutout & tight crop in `creatureArt.ts` |
| `src/art/creatures/lurker.webp` | Painted Wreck Lurker ambush predator texture | User-generated image (WebP) | 2026-11-23 | Side-view weathered slate-olive and rust-brown spiny predator head & torso with needle teeth & glowing amber eye on pure white | Runtime 4-corner white cutout & tight crop in `creatureArt.ts` |
| `src/art/creatures/angler.webp` | Painted Lanternjaw Trench Angler body texture | User-generated image (WebP) | 2026-11-23 | Side-view gnarled charcoal-iron abyssal anglerfish body & gaping needle-tooth jaw, no lure stalk or tail, on pure white | Runtime 4-corner white cutout, crop & horizontal flip in `predatorArt.ts` |
| `src/art/creatures/stalker.webp` | Painted Trench Stalker hunter texture | User-generated image (WebP) | 2026-11-23 | Side-view shadowy soot-grey and bronze-black abyssal hunter head & torso with needle teeth & reflecting eye on pure white | Runtime 4-corner white cutout & tight crop in `creatureArt.ts` |
| `src/art/creatures/spider.webp` | Painted Deep-Sea Strider spider carapace texture | User-generated image (WebP) | 2026-11-23 | Side-view basalt-black and rust-bronze armoured deep-sea spider carapace with glowing amber eyes, no legs, on pure white | Runtime 4-corner white cutout & tight crop in `creatureArt.ts` |

## Phases 20–21 (Session A, Nov 22, 2026)

No generated images were added. This session's tool had no image generator, so the new art is drawn in code in the painterly style (layered lit and shadow shapes, rim light, barnacles and weed, warm colours only):
- the eight tank decorations (`src/world/tankDecor.ts`);
- the tanks' sand bed, pebbles and caustic light (`src/world/habitatWater.ts`);
- creature portraits in the book and on cards, which are the real creature rigs rendered into small pictures (`src/ui/creatureSnap.ts`).

Painted backdrops and substrate for the tank interiors are still welcome later (log them here).

## Phases 22–23 (Session B, Nov 22, 2026)

No generated images were added. This session also had no image generator, so all new creature art is drawn in code on jointed rigs, in the painterly style:
- the kiln eel and the chime seahorse (`src/actors/deepCreatureRigs.ts`; Colin approved their names and looks from the zoo screenshots);
- two new shapes for each of the six older species (`glowfinRig.ts`, `dappleRayRig.ts`, `shoreCreatureRigs.ts`), tiny and giant sizes;
- the heirloom filigree and the Choir-touched bands and halo (`src/actors/critters.ts`, `drawMarks`);
- the Choir's echo of your collection at contact: circling lights and an outer ring (`src/interior/sanctum.ts`, `drawEcho`).

See every creature in every form at `zoo.html` (on the play link, or with `npm run dev`).

**Image-generation prompts** for painted textures to dress these rigs (and the Session A tank backdrops) are ready in [`prompts/phases-22-23-creatures.md`](prompts/phases-22-23-creatures.md). Generated textures go in `src/art/creatures/` and are logged in the table above.

## Tank backdrops & UI polish pass (Nov 23, 2026)

Wired `src/art/tankArt.ts` (`loadTankArt`) and `HabitatWater.setTheme()` so every tank (exterior and walkable interior) automatically displays its matching painted `.webp` backdrop from `src/art/tanks/{bare,coral,kelp,grass,bladder,lumen}.webp` (all 6 installed and logged in the table above), and falls back to multi-layered biome-themed painterly procedural backdrops when `?art=procedural` or `?worldArt=procedural` is active.

## Painted vehicles, hero base modules, tank decor & wreck machines (Nov 23, 2026)

Added `src/art/propArt.ts` (`loadPropArt`), sharing the 4-corner pure-white cutout loader from `src/art/creatureArt.ts`, with `?art=procedural` fallback:
- Ambient schooling fish (`src/art/creatures/silverbar.webp`): Silverbar (`src/actors/silverbar.ts`, keeping its live wagging forked golden tail).
- Kestrel hero art (`src/art/kestrel/`): complete 8-piece painted puppet — `head.jpg`, `torso.jpg`, `pack.webp` (twin brass scuba tanks), `upper_arm.webp`, `forearm.webp` (with terracotta gauntlet), `thigh.webp`, `shin.webp`, and `fin.webp` (ribbed charcoal & terracotta flipper) — wired into `src/actors/kestrelArt.ts` & `src/actors/diver.ts` (shared by swimmer, walker, and Field Kit portrait).
- Exterior wrecks (`src/art/wrecks/`): `fulmar.jpg` (Fulmar Listening Station, `src/world/fulmarArt.ts`) and `corvina.jpg` (Corvina Survey Ship, `src/world/corvinaArt.ts`).
- Interior base stations & props (`src/art/interior/`): `console_habitat.jpg` (Habitat management lectern), `tray_collection.jpg` (Collection tray stand), and `crate.jpg` (storage salvage crates), wired into `src/interior/baselevel.ts` with engraved brass-plaque signage.
- Base corridors & shafts (`src/art/base/corridor.jpg`): horizontal/vertical corridors and 3-cell riser shafts (`src/world/basegfx.ts`).
- Vehicles (`src/art/vehicles/`): `sub.webp` (KS-1 Submersible, `src/actors/sub.ts`), `drone.webp` (KD-1 Build Drone, `src/actors/drone.ts`), `buoy.webp` (EX-1 Supply Buoy, `src/world/supplyBuoy.ts`).
- Hero base exterior modules & Choir portal (`src/art/base/`): `dome.webp`, `dock.webp`, `lab.webp`, `workshop.webp`, `nursery.webp`, `turbine.webp` (`src/world/basegfx.ts`, keeping live animated lights, scan bar, sparks, turbine rotor, and live interior tanks on top), plus `portal.webp` (Choir Gate / Home Gate, `src/world/sanctumgfx.ts`).

## Pass 2 Art: Complete Kestrel Upgrade Kit, Utility Base Exteriors, Reef Pickups & Seabed Life (Nov 24, 2026)

All plates below were generated by Colin on pure `#FFFFFF` white backgrounds in the game's watercolor-and-gouache style and wired into `src/art/propArt.ts` with `?art=procedural` fallback:
- **Kestrel upgrades, articulated puppet splits & joint guards (`src/art/kestrel/`):** `chest.jpg` (upper chest & brass helmet collar), `pelvis.jpg` (lower suit & brass-block dive belt), `forearm_sleeve.jpg` (sleeve-only forearm), `hand.jpg` (articulated terracotta diving gauntlet), `boot.jpg` (riveted brass-toed dive boot), `fin_blade.jpg` (flexible articulated flipper blade), `joint_shoulder.jpg` (brass shoulder medallion), `joint_knee.jpg` (riveted knee guard), `jar.webp` (belt specimen jar), `pack_single.webp` (pony air tank), `pack_quad.webp` (4-cylinder deep-sea tank rig), `thruster.webp` (TH-1 hip thruster), `thruster_mk2.webp` (TH-2 twin-nozzle hip thruster), `harpoon.webp` (grapple harpoon launcher), `rivet.webp` (Rivet Driver RD-1), `rivet_bolt.jpg` (hot-brass rivet bolt projectile), `dart.webp` (stun-dart launcher), `stun_dart.jpg` (terracotta-finned brass stun-dart projectile), `flare.webp` (flare tube), `resonator.webp` (Choir resonator hoop), `magboots.webp` (magnetic clamping dive boots), `satchel.webp` (specimen satchel), `fin_walk.webp` (flat side-profile walking flipper), `lamp.webp` (brass shoulder headlamp), and `hose.webp` (corrugated breathing air hose), wired across `src/actors/diver.ts`, `src/actors/walker.ts`, and `src/actors/kestrelArt.ts`.
- **Remaining utility base exterior modules (`src/art/base/`):** `storage.webp`, `junction.webp`, `thermal.webp`, `hatch.webp`, `farm.webp`, `revive.webp`, `signal.webp`, `filter.jpg`, `feeder.jpg`, `press.jpg`, `recomp.jpg`, `crane.jpg`, `sorter.jpg`, and `lantern.jpg` wired into `src/world/basegfx.ts` with window/lamp glows, live spinning rotors, and moving press ram matched tightly to each painted hull (100% of all buildable base modules now have hand-painted exterior art!).
- **All 9 reef material pickups (`src/art/pickups/`):** `scrap.webp`, `copper.webp`, `quartz.webp`, `fibre.webp`, `resin.webp`, `moss.webp`, `brass.webp`, `bloom.webp`, and `ore.webp` wired into `src/world/pickups.ts` (alongside painted world finds for `tank`, `jar`, `thruster`, `thruster2`, and dropped `satchel`).
- **All 5 seabed ambient animals (`src/art/bottom/`):** `lily.webp`, `sponge.webp`, `worm.webp`, `star.webp`, and `pen.webp` wired into `src/actors/bottomLife.ts` with live current sway and reactive ducking.
- **All 14 indoor base room stations & props (`src/art/interior/`):** `airlock.webp`, `bunk.webp`, `planner.webp`, `galley.webp`, `lab_bench.webp`, `workshop_bench.webp`, `hatch_cradle.webp`, `hatch_console.webp`, `revive_pool.webp`, `signal_dish.webp`, `recomp_chamber.webp`, `farm_trough.webp`, `filter_vat.webp`, `crane_cradle.webp`, `press_frame.jpg`, `press_ram.jpg`, `feeder_hopper.jpg`, and `feeder_mash.jpg` wired into `src/interior/baselevel.ts` (plus docked `KS-1` inside the Moon Pool now uses `sub.webp`).
- **Indoor base architecture, ocean landmarks & Supply Buoy mooring anchor:** `wall_bulkhead.webp` (seamless riveted bulkhead wall panel), `deck_grate.webp` (tiled perforated catwalk steel floor strip), and `ladder_rung.webp` (riveted ladder rails with knurled brass rungs) in `src/art/interior/` (`src/interior/baselevel.ts` & `src/interior/interior.ts`, also rust-blended into Fulmar & Corvina wreck interiors), `buoy_anchor.webp` (barnacle-crusted seabed mooring anchor block) in `src/art/vehicles/` (`src/world/supplyBuoy.ts`), `sled.jpg` (Survey Sled wreck), `beacon.jpg` (Reef Survey Beacon), `lode.jpg` (Mineral Drill Lode), `cache.jpg` (Survey Cache 3 strongbox), `winch.jpg` (cable winch assembly), `winch_wheel.jpg` (rotating red-enamel marine crank handwheel), `mooring_buoy.jpg` (vintage red-and-cream Kestrel site marker buoy), `relay_buoy.jpg` (toppled KS RELAY 2 cave buoy), `welder_crate.jpg` (cracked KD WELD cave tool crate), and `nursery_crate.jpg` (embossed-egg hatchery log crate) in `src/art/landmarks/` (`src/world/scenery.ts` & `src/world/lodes.ts`), and `dive_gauge_bezel.jpg` (vintage riveted tarnished-brass dive gauge housing) in `src/art/ui/` (`src/ui/watch.ts`).
- Tank decorations — all 16 pieces (`src/art/decor/`): `arch.webp`, `amphora.webp`, `helmet.webp`, `chest.webp`, `driftwood.webp`, `clam.webp`, `lantern.webp`, `wheel.webp`, `cairn.webp`, `floats.webp`, `anchor.webp`, `bell.webp`, `coralarch.webp`, `astrolabe.webp`, `belljar.webp`, `kelplantern.webp` (`src/world/tankDecor.ts`, keeping glow auras on luminous pieces).
- Wreck combat machines — Corvina engine room (`src/art/foes/`): `tick.webp` (Rust Tick), `drone.webp` (Weld Drone), `keeper.webp` (Hull Keeper boss) (`src/interior/combatLayer.ts` & `src/interior/foeArt.ts`, keeping all readable combat telegraphs, laser sight, flaring eyes, and blazing core).
- Crew Quarters (`BR-1`) exterior module (`src/art/base/bedroom.jpg` → `src/world/basegfx.ts`): original image-generated watercolor/gouache `3 × 2` riveted dark-steel and tarnished-brass living quarters module with warm panoramic bunk/lantern window and 3 lower portholes (Nov 24, 2026).
- Sunken Grotto & Deep Trench painterly midground backdrops (`src/art/painterly-world/grotto-mid.jpg`, `src/art/painterly-world/trench-mid.jpg` → `src/art/worldArt.ts`, `src/scene/zonebackdrop.ts`): original image-generated watercolor/gouache underwater vistas replacing procedural polygonal silhouettes (Nov 24, 2026).
