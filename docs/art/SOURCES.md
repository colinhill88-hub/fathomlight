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
| | | | | | |

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

Wired `src/art/tankArt.ts` (`loadTankArt`) and `HabitatWater.setTheme()` so every tank (exterior and walkable interior) automatically displays a per-plant painted backdrop from `src/art/tanks/{bare,coral,kelp,grass,bladder,lumen}.{webp,png}` when present, and falls back to multi-layered biome-themed painterly procedural backdrops (rock ridges, sunlit terraces, distant plant silhouettes, depth haze, and themed sand beds) when files are absent or `?art=procedural` is active. No generated image files were added during this session because the image-generation server returned `503 MODEL_CAPACITY_EXHAUSTED`; drop generated `.webp` plates into `src/art/tanks/` and log them in the table above whenever capacity is available.
