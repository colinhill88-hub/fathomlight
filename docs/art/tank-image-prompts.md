# Image prompts: living tanks (painted tank art)

Written at the end of Session A (Phases 20–21, Nov 22, 2026). Session A drew the tanks' new art in code (sand bed, pebbles, caustic light, eight decorations) because it had no image generator. These prompts are for an image tool (Colin plans to use Codex) to make painted versions. The paste-ready session prompt that uses them is [`docs/prompts/tank-art.md`](../prompts/tank-art.md).

Every image must follow the art rules in the roadmap's "Colin's decisions (Nov 22, 2026)":
- original;
- painterly;
- no cyan, violet or magenta;
- small `.webp` files;
- logged in [`SOURCES.md`](SOURCES.md);
- the code-drawn version kept as the fallback.

## Shared style (add this to every prompt)

> Painterly digital illustration for a 2D side-view underwater game. Soft brushed texture, realistic lighting and weathering, not cartoonish and not photographic. Calm, warm aquarium mood. Palette: sea-green and teal water, warm sand, ochre, rust, brass and soft amber light. Strictly no cyan, no violet, no purple and no magenta anywhere. Lit from above, through the water surface. No text, no logos, no fish or creatures, no people, no frame or border. Seen straight on from the front, as through aquarium glass.

## 1. Small tank back wall

- **File:** `src/art/tanks/back-small.webp`
- **Size:** 1024 × 448 px (the small tank's water is about 2.3 : 1).
- **Prompt:**

  > [Shared style.] The back wall of a small aquarium tank inside an underwater research base. A softly lit wall of dark green-grey basalt and reef rock, crusted with tiny shells and a few tufts of olive weed. Faint warm light ripples down from the surface at the top. The lower fifth of the picture fades into darker water where sand will sit in front. Keep the middle third calm and fairly plain, so swimming creatures read clearly in front of it. Gentle depth haze.

## 2. Grand tank back wall

- **File:** `src/art/tanks/back-grand.webp`
- **Size:** 1280 × 816 px (about 1.57 : 1).
- **Prompt:**

  > [Shared style.] The back wall of a large aquarium tank in an underwater base. A layered rock face of basalt and pale reef stone with a shallow cave mouth on one side and a gentle ledge on the other. Strands of olive and amber seaweed hang from the ledge, and sun rays slant from the top left. The lower sixth fades into deeper water for the sand in front. The centre stays open and softly lit so creatures read clearly.

## 3. Display aquarium back wall (the showpiece)

- **File:** `src/art/tanks/back-display.webp`
- **Size:** 1280 × 816 px (the same shape as the Grand tank: the display aquarium is a refitted Grand tank).
- **Prompt:**

  > [Shared style.] The back wall of a grand showpiece aquarium. Behind a tall curved front, a richly layered reef landscape:
  > - weathered stone arches;
  > - terraces of warm coral in coral-pink, ochre and cream;
  > - a sunken carved stone column lying in the distance;
  > - shafts of golden light from above;
  > - soft depth haze, giving three layers of distance.
  >
  > Lavish but calm, like the best public aquarium you have seen. The centre stays open and clear for creatures. The lower sixth fades into deeper water for the sand in front.

## 4. Sand and substrate strip

- **File:** `src/art/tanks/substrate.webp` (transparent above the sand)
- **Size:** 2048 × 256 px, made to tile left to right.
- **Prompt:**

  > [Shared style.] A long horizontal strip of aquarium sand seen from the front: fine warm sand with a gently uneven top edge, scattered smooth pebbles in grey, ochre and cream, a few small shell fragments, and soft shadows. Everything above the sand is fully transparent. It tiles seamlessly left to right.

## 5. Back rocks and plants set

- **File:** `src/art/tanks/rocks.webp` (a sheet of separate pieces on a transparent background)
- **Size:** 2048 × 512 px: four pieces side by side, each in its own 512 × 512 square with space around it.
- **Prompt:**

  > [Shared style.] Four separate aquarium rock pieces on a fully transparent background, each standing on its own base, evenly spaced in a row:
  > 1. a tall jagged basalt spire;
  > 2. a low rounded cluster of pale reef stones;
  > 3. a flat slab leaning on a smaller rock;
  > 4. a rock with a small hole through it.
  >
  > Each is lightly crusted with tiny barnacles and olive algae, lit from above, with a soft contact shadow at its base.

## 6. Decorations (painted versions of the eight rewards)

- **Files:** `src/art/tanks/decor-<id>.webp`, one per decoration, transparent background.
- **Size:** 512 × 512 px each. The piece stands on the bottom edge, centred, filling about 80% of the width.
- **The pieces** (the ids match `DecorId` in `src/game/state.ts` and the code drawings in `src/world/tankDecor.ts`), each with: "[Shared style.] A single aquarium ornament on a fully transparent background, standing on the bottom edge, lit from above, with a soft contact shadow. It looks like a real, well-made aquarium piece that has been underwater for a while: fine algae, tiny barnacles." Then add:
  - **arch:** a weathered stone arch of reef stone, with an opening a small fish could swim through.
  - **clam:** a giant open clam shell, ridged outside and pearly cream inside, holding one warm white pearl.
  - **amphora:** an ancient terracotta amphora lying tipped on its side, half sunk in sand, its mouth a dark hollow, crusted with tiny shells.
  - **driftwood:** a silvered, forked driftwood branch lying across the sand, smooth from the sea, with wisps of olive weed on its tips.
  - **helmet:** an old brass deep-sea diving helmet with three round portholes, the brass warm with green age at the seams.
  - **lantern:** a ship's lantern of dark iron and glass lying on its side, its glass glowing a soft warm amber from within.
  - **chest:** a barnacled wooden sea chest with iron bands, its lid slightly open, warm golden light and a few bubbles inside.
  - **wheel:** a wooden ship's wheel with eight worn spokes, its lower part sunk in sand.

## 7. Caustic light (optional)

- **File:** `src/art/tanks/caustics.webp`
- **Size:** 512 × 512 px, grayscale, tiles seamlessly in both directions.
- **Prompt:**

  > A seamless tileable texture of underwater caustic light patterns: soft, organic bright web-like lines on black, as sunlight through rippling water makes on a sandy floor. Grayscale only, gentle contrast, slightly blurred.

## After generating

- Convert to `.webp` at about 80% quality. Keep each file under about 250 KB (the backdrops) or 80 KB (the decorations and rocks).
- Add a row for every file to [`SOURCES.md`](SOURCES.md): file, what it is, the tool, the date, the prompt (or "see `docs/art/tank-image-prompts.md`, prompt N") and any edits.
- Look at each one against a game screenshot before using it. Redo any image that drifts towards cyan or purple water.
