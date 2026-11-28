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
- **Kestrel upgrades, articulated puppet splits & joint guards (`src/art/kestrel/`):** `chest.webp` (upper chest & brass helmet collar), `pelvis.webp` (lower suit & brass-block dive belt), `forearm_sleeve.webp` (sleeve-only forearm), `hand.webp` (articulated terracotta diving gauntlet), `boot.webp` (riveted brass-toed dive boot), `fin_blade.webp` (flexible articulated flipper blade), `joint_shoulder.webp` (brass shoulder medallion), `joint_knee.webp` (riveted knee guard), `jar.webp` (belt specimen jar), `pack_single.webp` (pony air tank), `pack_quad.webp` (4-cylinder deep-sea tank rig), `thruster.webp` (TH-1 hip thruster), `thruster_mk2.webp` (TH-2 twin-nozzle hip thruster), `harpoon.webp` (grapple harpoon launcher), `rivet.webp` (Rivet Driver RD-1), `rivet_bolt.webp` (hot-brass rivet bolt projectile), `dart.webp` (stun-dart launcher), `stun_dart.webp` (terracotta-finned brass stun-dart projectile), `flare.webp` (flare tube), `resonator.webp` (Choir resonator hoop), `magboots.webp` (magnetic clamping dive boots), `satchel.webp` (specimen satchel), `fin_walk.webp` (flat side-profile walking flipper), `lamp.webp` (brass shoulder headlamp), and `hose.webp` (corrugated breathing air hose), wired across `src/actors/diver.ts`, `src/actors/walker.ts`, and `src/actors/kestrelArt.ts`.
- **Remaining utility base exterior modules (`src/art/base/`):** `storage.webp`, `junction.webp`, `thermal.webp`, `hatch.webp`, `farm.webp`, `revive.webp`, `signal.webp`, `filter.webp`, `feeder.webp`, `press.webp`, `recomp.webp`, `crane.webp`, `sorter.webp`, and `lantern.webp` wired into `src/world/basegfx.ts` with window/lamp glows, live spinning rotors, and moving press ram matched tightly to each painted hull (100% of all buildable base modules now have hand-painted exterior art!).
- **All 9 reef material pickups (`src/art/pickups/`):** `scrap.webp`, `copper.webp`, `quartz.webp`, `fibre.webp`, `resin.webp`, `moss.webp`, `brass.webp`, `bloom.webp`, and `ore.webp` wired into `src/world/pickups.ts` (alongside painted world finds for `tank`, `jar`, `thruster`, `thruster2`, and dropped `satchel`).
- **All 5 seabed ambient animals (`src/art/bottom/`):** `lily.webp`, `sponge.webp`, `worm.webp`, `star.webp`, and `pen.webp` wired into `src/actors/bottomLife.ts` with live current sway and reactive ducking.
- **All 14 indoor base room stations & props (`src/art/interior/`):** `airlock.webp`, `bunk.webp`, `planner.webp`, `galley.webp`, `lab_bench.webp`, `workshop_bench.webp`, `hatch_cradle.webp`, `hatch_console.webp`, `revive_pool.webp`, `signal_dish.webp`, `recomp_chamber.webp`, `farm_trough.webp`, `filter_vat.webp`, `crane_cradle.webp`, `press_frame.webp`, `press_ram.webp`, `feeder_hopper.webp`, and `feeder_mash.webp` wired into `src/interior/baselevel.ts` (plus docked `KS-1` inside the Moon Pool now uses `sub.webp`).
- **Indoor base architecture, ocean landmarks & Supply Buoy mooring anchor:** `wall_bulkhead.webp` (seamless riveted bulkhead wall panel), `deck_grate.webp` (tiled perforated catwalk steel floor strip), and `ladder_rung.webp` (riveted ladder rails with knurled brass rungs) in `src/art/interior/` (`src/interior/baselevel.ts` & `src/interior/interior.ts`, also rust-blended into Fulmar & Corvina wreck interiors), `buoy_anchor.webp` (barnacle-crusted seabed mooring anchor block) in `src/art/vehicles/` (`src/world/supplyBuoy.ts`), `sled.webp` (Survey Sled wreck), `beacon.webp` (Reef Survey Beacon), `lode.webp` (Mineral Drill Lode), `cache.webp` (Survey Cache 3 strongbox), `winch.webp` (cable winch assembly), `winch_wheel.webp` (rotating red-enamel marine crank handwheel), `mooring_buoy.webp` (vintage red-and-cream Kestrel site marker buoy), `relay_buoy.webp` (toppled KS RELAY 2 cave buoy), `welder_crate.webp` (cracked KD WELD cave tool crate), and `nursery_crate.webp` (embossed-egg hatchery log crate) in `src/art/landmarks/` (`src/world/scenery.ts` & `src/world/lodes.ts`), and `dive_gauge_bezel.webp` (vintage riveted tarnished-brass dive gauge housing) in `src/art/ui/` (`src/ui/watch.ts`).
- Tank decorations — all 16 pieces (`src/art/decor/`): `arch.webp`, `amphora.webp`, `helmet.webp`, `chest.webp`, `driftwood.webp`, `clam.webp`, `lantern.webp`, `wheel.webp`, `cairn.webp`, `floats.webp`, `anchor.webp`, `bell.webp`, `coralarch.webp`, `astrolabe.webp`, `belljar.webp`, `kelplantern.webp` (`src/world/tankDecor.ts`, keeping glow auras on luminous pieces).
- Wreck combat machines — Corvina engine room (`src/art/foes/`): `tick.webp` (Rust Tick), `drone.webp` (Weld Drone), `keeper.webp` (Hull Keeper boss) (`src/interior/combatLayer.ts` & `src/interior/foeArt.ts`, keeping all readable combat telegraphs, laser sight, flaring eyes, and blazing core).
- Crew Quarters (`BR-1`) exterior module (`src/art/base/bedroom.webp` → `src/world/basegfx.ts`): original image-generated watercolor/gouache `3 × 2` riveted dark-steel and tarnished-brass living quarters module with warm panoramic bunk/lantern window and 3 lower portholes (Nov 24, 2026).
- Sunken Grotto & Deep Trench painterly midground backdrops (`src/art/painterly-world/grotto-mid.webp`, `src/art/painterly-world/trench-mid.webp` → `src/art/worldArt.ts`, `src/scene/zonebackdrop.ts`): original image-generated watercolor/gouache underwater vistas replacing procedural polygonal silhouettes (Nov 24, 2026).
- Wreck Shelf secondary wrecks (`src/art/wrecks/barge.webp`, `src/art/wrecks/trawler.webp` → `src/art/propArt.ts`, `src/world/scenery.ts`): original image-generated watercolor/gouache sunken Cargo Barge (with 3 corrugated containers & lattice deck crane) and sunken Fishing Trawler (with wheelhouse & broken mast) (Nov 24, 2026).
- Grand Sanctuary Tank biome display shelves (`src/art/landmarks/shelf_{shallows,kelp,trench,sanctum}.jpg` → `src/art/propArt.ts`, `src/scene/sanctuaryView.ts`): 4 original image-generated watercolor/gouache 2D side-profile rock shelves (sunlit coral limestone, mossy kelp karst, volcanic hydrothermal basalt, and carved pale Choir Sanctum stone) for tiered Sanctuary aquascaping (Nov 25, 2026).
- Claymation new-game intro storyboard scenes (`src/art/intro/intro_{01_tub,02_play,03_hold,04_plunge,05_underwater}.jpg` → `src/ui/introCutscene.ts`): 5 original image-generated handcrafted plasticine claymation stop-motion 16:9 scenes depicting a young boy in navy-and-cream striped pajamas playing with toy Kestrel and the KS-1 submarine in a cozy clawfoot bathtub, gently lowering Kestrel into the bathwater as it deepens into the sunlit ocean, and Kestrel plunging downward into the starting shallows (Nov 25, 2026).

## The Petrel and the Petrel works (Beyond Earth, Nov 27, 2026)

Made by Colin from the prompts in [`prompts/petrel.md`](prompts/petrel.md), sections 1–3. Wired in by `src/world/petrelView.ts` (platform and ship stages, sized and anchored to the cradle), `drawPaintedHero` in `src/world/basegfx.ts` (the works) and `src/ui/voyageCutscene.ts` (the finished ship in the voyages).

| File | What | Tool | Date | Prompt (summary) | Edits |
| --- | --- | --- | --- | --- | --- |
| `src/art/base/works.webp` | Petrel Works module | OpenAI ImageGen | 2026-11-27 | Side-view riveted undersea workshop with a model rocket in an amber porthole, hoist and PW-1 plate | Resized, padded as needed, encoded as lossless WebP; then re-encoded as lossy WebP (quality 88) in the repo to keep the build small (3.2 MB to 0.58 MB) |
| `src/art/landmarks/petrel_platform.webp` | Empty launch platform | OpenAI ImageGen | 2026-11-27 | Side-view gantry and empty brass launch cradle on a three-pontoon deck | Resized, padded as needed, encoded as lossless WebP; then re-encoded as lossy WebP (quality 88) in the repo to keep the build small (3.2 MB to 0.58 MB) |
| `src/art/landmarks/petrel_1.webp` | Petrel frame | OpenAI ImageGen | 2026-11-27 | Finished ship reference rebuilt as open riveted iron girders and brass cross-braces | Resized, padded as needed, encoded as lossless WebP; then re-encoded as lossy WebP (quality 88) in the repo to keep the build small (3.2 MB to 0.58 MB) |
| `src/art/landmarks/petrel_2.webp` | Petrel heat shield | OpenAI ImageGen | 2026-11-27 | Same ship with open upper frame, ceramic tiles on the lower third and three brass engine bells | Resized, padded as needed, encoded as lossless WebP; then re-encoded as lossy WebP (quality 88) in the repo to keep the build small (3.2 MB to 0.58 MB) |
| `src/art/landmarks/petrel_3.webp` | Petrel life support | OpenAI ImageGen | 2026-11-27 | Same ship with plated midsection and amber portholes, exposed girders at the top and no fins | Resized, padded as needed, encoded as lossless WebP; then re-encoded as lossy WebP (quality 88) in the repo to keep the build small (3.2 MB to 0.58 MB) |
| `src/art/landmarks/petrel_4.webp` | Petrel navigation | OpenAI ImageGen | 2026-11-27 | Finished ship reference with the central Choir core window dark and empty | Resized, padded as needed, encoded as lossless WebP; then re-encoded as lossy WebP (quality 88) in the repo to keep the build small (3.2 MB to 0.58 MB) |
| `src/art/landmarks/petrel_5.webp` | Finished Petrel | OpenAI ImageGen | 2026-11-27 | Upright Victorian rocket-submarine with iron hull, amber portholes, ceramic heat tiles and a cyan, violet and magenta Choir core | Resized, encoded as lossless WebP; then re-encoded as lossy WebP (quality 88) in the repo to keep the build small (3.2 MB to 0.58 MB) |

## Europa, the voyages and the works room props (Beyond Earth, Nov 28, 2026)

Made by Colin from the prompts in [`prompts/petrel.md`](prompts/petrel.md), section 4 (4a–4j). Every file was then keyed, trimmed and re-encoded in the repo by `scripts/prep-europa-art.py` (white or black backgrounds turned transparent, objects cropped, creatures kept on their full canvas so their glow sheets and the ray's gear line up, the black water's faint motes stretched so they show as added light). Shipped size: about 2 MB, from 26 MB. Wired in by `src/art/europaArt.ts` (loaded only once Europa is in play) and `src/scene/europaScene.ts` (`applyArt`), `src/ui/voyageCutscene.ts` (the voyage paintings), and `src/interior/baselevel.ts` (the works room props). The code-drawn versions stay as the fallback.

| File | What | Tool | Date | Prompt (summary) | Edits |
| --- | --- | --- | --- | --- | --- |
| `src/art/europa/ice_bg.webp` | ice bg | OpenAI ImageGen | 2026-11-27 | Distant underside of a vast ice ceiling above dark, quiet water | Reframed earlier under-ice backdrop to the current 2:1 canvas |
| `src/art/europa/ice_mid.webp` | ice mid | OpenAI ImageGen | 2026-11-27 | Hanging blue ice columns above a low dark silt ridge | Resized to layer canvas, keeping edge placement |
| `src/art/europa/ice_fg.webp` | ice fg | OpenAI ImageGen | 2026-11-27 | Soft-focus dark icicles hanging at the far left and right | Resized to layer canvas, keeping edge placement |
| `src/art/europa/passage_bg.webp` | passage bg | OpenAI ImageGen | 2026-11-27 | Low ice tunnel receding into darkness with a distant pale glow | Fit to the full-frame canvas |
| `src/art/europa/passage_mid.webp` | passage mid | OpenAI ImageGen | 2026-11-27 | Frozen ribs framing the top and bottom of an ancient passage | Resized to layer canvas, keeping edge placement |
| `src/art/europa/passage_fg.webp` | passage fg | OpenAI ImageGen | 2026-11-27 | Blurred dark ice lumps along the upper and lower edges | Resized to layer canvas, keeping edge placement |
| `src/art/europa/floes_bg.webp` | floes bg | OpenAI ImageGen | 2026-11-27 | Deep water beneath floating floes with cold light between them | Fit to the full-frame canvas |
| `src/art/europa/floes_sky.webp` | floes sky | OpenAI ImageGen | 2026-11-27 | Broken ice and still water beneath an open starry sky | Fit to the full-frame canvas |
| `src/art/europa/floes_mid.webp` | floes mid | OpenAI ImageGen | 2026-11-27 | Ragged floe undersides above a low rocky seabed | Resized to layer canvas, keeping edge placement |
| `src/art/europa/floes_fg.webp` | floes fg | OpenAI ImageGen | 2026-11-27 | Soft-focus broken ice framing the upper corners | Resized to layer canvas, keeping edge placement |
| `src/art/europa/deep_bg.webp` | deep bg | OpenAI ImageGen | 2026-11-27 | Rows of distant vent chimneys in a black abyss with faint amber haze | Fit to the full-frame canvas |
| `src/art/europa/deep_mid.webp` | deep mid | OpenAI ImageGen | 2026-11-27 | Crusted hydrothermal chimneys on rocky mounds with one amber vent | Resized to layer canvas, keeping edge placement |
| `src/art/europa/deep_fg.webp` | deep fg | OpenAI ImageGen | 2026-11-27 | Blurred dark chimneys with faint warm rim light at the outer edges | Resized to layer canvas, keeping edge placement |
| `src/art/europa/blackwater.webp` | blackwater | OpenAI ImageGen | 2026-11-27 | Black water with faint drifting specks and soft black edges | Fit to the full-frame canvas |
| `src/art/europa/jupiter.webp` | jupiter | OpenAI ImageGen | 2026-11-27 | Jupiter on a black starry field with the Great Red Spot and its right half in shadow | Fit to the full-frame canvas |
| `src/art/europa/hab.webp` | hab | OpenAI ImageGen | 2026-11-27 | Riveted habitat hung beneath ice with amber portholes, an axolotl jar and a moon pool | Reused existing WebP under the current filename |
| `src/art/europa/still.webp` | still | OpenAI ImageGen | 2026-11-27 | Gunmetal brine still with brass bands, amber gauge and a dripping pipe | Separated from sprite atlas, fit on white canvas |
| `src/art/europa/bell.webp` | bell | OpenAI ImageGen | 2026-11-27 | Glassy air dome with a brass chain, riveted ring and open water surface | Separated from sprite atlas, fit on white canvas |
| `src/art/europa/glyph_stand.webp` | glyph stand | OpenAI ImageGen | 2026-11-27 | Standing glacier-ice pillar carved with faint cyan and violet rings | Reused existing WebP under the current filename |
| `src/art/europa/glyph_hang.webp` | glyph hang | OpenAI ImageGen | 2026-11-27 | Matching glacial glyph hanging from a ceiling of ice | Adapted earlier Europa art with ImageGen. Fit on white canvas |
| `src/art/europa/floe.webp` | floe | OpenAI ImageGen | 2026-11-27 | Thick snow-capped slab of floating ice with a ragged deep underside | Separated from sprite atlas, fit on white canvas |
| `src/art/europa/floe_thin.webp` | floe thin | OpenAI ImageGen | 2026-11-27 | Thin translucent slab of floating ice with visible cracks | Separated from sprite atlas, fit on white canvas |
| `src/art/europa/brine_pool.webp` | brine pool | OpenAI ImageGen | 2026-11-27 | Glassy brine pool in a rocky seabed hollow edged with salt | Separated from sprite atlas, fit on white canvas |
| `src/art/europa/vent_cold.webp` | vent cold | OpenAI ImageGen | 2026-11-27 | Dark tapered hydrothermal vent with a black mouth | Separated from sprite atlas, fit on white canvas |
| `src/art/europa/vent_lit.webp` | vent lit | OpenAI ImageGen | 2026-11-27 | Tapered hydrothermal vent with amber light and bubbles at its mouth | Separated from sprite atlas, fit on white canvas |
| `src/art/europa/hearth.webp` | hearth | OpenAI ImageGen | 2026-11-27 | Ancient tall chimney with carved rings near its base and a faint warm glow | Separated from sprite atlas, fit on white canvas |
| `src/art/europa/kin_gate.webp` | kin gate | OpenAI ImageGen | 2026-11-27 | An upright living oval doorway in cyan and violet on black | Fit to the full-frame canvas |
| `src/art/europa/rime.webp` | rime | OpenAI ImageGen | 2026-11-27 | Downward-pointing needle-like ice crystals | Separated from sprite atlas, fit on white canvas |
| `src/art/europa/brine.webp` | brine | OpenAI ImageGen | 2026-11-27 | White salt crystals on a dark pebble | Separated from sprite atlas, fit on white canvas |
| `src/art/europa/frond.webp` | frond | OpenAI ImageGen | 2026-11-27 | Stiff glassy pale green-white seaweed | Separated from sprite atlas, fit on white canvas |
| `src/art/europa/moth.webp` | moth | OpenAI ImageGen | 2026-11-27 | Delicate swimmer with four translucent frost-white fins, based on the earlier moth | Adapted earlier Europa art with ImageGen. Fit on white canvas |
| `src/art/europa/moth_glow.webp` | moth glow | Hand-placed glow mask | 2026-11-27 | Rows of tiny pale blue-green fin lights on black | Aligned to the companion creature image on a black canvas |
| `src/art/europa/glasshorn.webp` | glasshorn | OpenAI ImageGen | 2026-11-27 | Clear, many-legged seabed creature with a single horn, based on the earlier glasshorn | Adapted earlier Europa art with ImageGen. Fit on white canvas |
| `src/art/europa/glasshorn_glow.webp` | glasshorn glow | Hand-placed glow mask | 2026-11-27 | One icy-white light at the horn tip on black | Aligned to the companion creature image on a black canvas |
| `src/art/europa/krill.webp` | krill | OpenAI ImageGen | 2026-11-27 | Small translucent krill-like swimmer in side view | Fit on white canvas |
| `src/art/europa/krill_glow.webp` | krill glow | Hand-placed glow mask | 2026-11-27 | One icy-white speck on black | Aligned to the companion creature image on a black canvas |
| `src/art/europa/floe_ray.webp` | floe ray | OpenAI ImageGen | 2026-11-27 | Gentle slate-grey ray with a thin tail, curled horn-fins and broad wings | Fit on white canvas |
| `src/art/europa/floe_ray_glow.webp` | floe ray glow | Hand-placed glow mask | 2026-11-27 | Rows of pale blue-green lights along the ray’s wing edges on black | Aligned to the companion creature image on a black canvas |
| `src/art/europa/ray_saddle.webp` | ray saddle | OpenAI ImageGen | 2026-11-27 | Woven frost-frond saddle and pouch positioned on the ray’s back | Separated from sprite atlas, keyed to transparency and aligned to the ray canvas |
| `src/art/europa/ray_bladder.webp` | ray bladder | OpenAI ImageGen | 2026-11-27 | Translucent air bubble positioned over the saddle | Separated from sprite atlas, keyed to transparency and aligned to the ray canvas |
| `src/art/europa/ray_crest.webp` | ray crest | OpenAI ImageGen | 2026-11-27 | Rime crystal crest positioned on the ray’s brow | Separated from sprite atlas, keyed to transparency and aligned to the ray canvas |
| `src/art/europa/ray_gland.webp` | ray gland | OpenAI ImageGen | 2026-11-27 | Organic icy-blue lantern positioned on the ray’s brow | Separated from sprite atlas, keyed to transparency and aligned to the ray canvas |
| `src/art/europa/kin.webp` | kin | OpenAI ImageGen | 2026-11-27 | A faint non-humanoid being of cyan, violet and magenta rings and light on black | Fit to the full-frame canvas |
| `src/art/interior/works_lathe.webp` | works lathe | OpenAI ImageGen | 2026-11-27 | Workbench lathe with gauges and a half-turned brass ring | Separated from sprite atlas, fit on white canvas |
| `src/art/interior/works_model.webp` | works model | OpenAI ImageGen | 2026-11-27 | Victorian brass rocket-submarine display model with an amber porthole | Separated from sprite atlas, fit on white canvas |
| `src/art/interior/works_hoist.webp` | works hoist | OpenAI ImageGen | 2026-11-27 | Tall riveted hoist with a brass cage and a platform sign | Separated from sprite atlas, fit on white canvas |
| `src/art/voyage/dusk.webp` | dusk | OpenAI ImageGen | 2026-11-27 | Warm dusk above the sea from a floating platform | Fit to the full-frame canvas |
| `src/art/voyage/space.webp` | space | OpenAI ImageGen | 2026-11-27 | Blue Earth curving away beneath a black starry sky | Fit to the full-frame canvas |
| `src/art/voyage/moon.webp` | moon | OpenAI ImageGen | 2026-11-27 | Icy Europa ahead in darkness with rust-brown fractures | Fit to the full-frame canvas |
| `src/art/voyage/ice.webp` | ice | OpenAI ImageGen | 2026-11-27 | White ice plain beneath black sky with a steaming drill shaft | Fit to the full-frame canvas |


**Nov 28, 2026:** `src/art/painterly-world/grotto-mid` and `trench-mid` (1376 × 768 JPGs, which the loader rejected) were padded to 1536 × 768, given soft faded edges and re-encoded as WebP. No other change to the paintings.


## Earth scenery polish (Nov 28, 2026)

Made by Colin from [`prompts/earth-polish.md`](prompts/earth-polish.md). Each painting was then prepared in the repo by `scripts/prep-earth-art.py`: sized to the plate (1536 × 768; the kelp 1024 × 512), the white mist at the edges turned into soft transparency with the colour under it recovered, and re-encoded as WebP. Wired in by `src/scene/zonebackdrop.ts` (`basin-east`, `reeftop`, `grotto-mid`) and `src/world/scenery.ts` (the foreground kelp, via `loadShallowsFrontKelp` in `src/art/shallows.ts`). The new `grotto-mid` replaces the padded one from earlier that day.

| File | What | Tool | Date | Prompt (summary) | Edits |
| --- | --- | --- | --- | --- | --- |
| `src/art/painterly-world/basin-east.webp` | Basin-to-reef transition | OpenAI ImageGen | 2026-11-28 | A low-contrast underwater slope, rising from cool dark basin on the left to warmly lit sand, kelp and muted coral on the right. Victorian watercolor and gouache with edges fading to white. | Resized to 2048 × 1024, finished perimeter fade to white, encoded as lossless WebP |
| `src/art/painterly-world/reeftop.webp` | Shallow reef top | OpenAI ImageGen | 2026-11-28 | Continuous sand ridges and rock shelves below a bright surface, with dense kelp at the far left thinning toward the right. Victorian watercolor and gouache with edges fading to white. | Resized to 2048 × 1024, finished perimeter fade to white, encoded as lossless WebP |
| `src/art/painterly-world/grotto-mid.webp` | Grotto midground | OpenAI ImageGen | 2026-11-28 | Overlapping limestone arches, mossy ledges and sponges in dim green water with soft ambient light. Victorian watercolor and gouache with edges fading to white. | Resized to 2048 × 1024, finished perimeter fade to white, encoded as lossless WebP |
| `src/art/sunlit-shallows/kelp-front.webp` | Foreground kelp | OpenAI ImageGen | 2026-11-28 | Near-camera blue-green kelp silhouettes with soft ribbon fronds at the outer edges and a clear center. Victorian watercolor and gouache with edges fading to white. | Resized to 2048 × 1024, finished perimeter fade to white, encoded as lossless WebP |


**Nov 28, 2026 (art audit):** the 45 JPGs Colin added Nov 23–25 (in `base/`, `interior/`, `kestrel/`, `landmarks/`, `wrecks/`, `intro/` and `ui/`) were re-encoded as WebP (quality 88, same size). Each keeps its name, with `.webp` in place of `.jpg`. No other change to the images.


**Nov 28, 2026 (interior tiles):** `interior/ladder_rung.webp` was cropped to the stretch between its brackets (rows 196–820 of 1024), so it repeats as one ladder. `interior/deck_grate.webp` was cropped to its top riveted rail (rows 25–76). `interior/wall_bulkhead.webp` had its light evened out top to bottom and side to side, and its edges cross-faded so it tiles. The originals are in the git history.
