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
