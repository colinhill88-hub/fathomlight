# Image-generation prompts: the Petrel and the Petrel works (Beyond Earth, Nov 27, 2026)

Everything for the Petrel is drawn in code for now (this session had no image generator). These prompts are for Colin to run in Gemini, or for any AI tool that can generate images. Drop the results in and the game uses them instead of the code-drawn art. No code change is needed: the file name is enough.

**How to use them:**
- Generate the image, then save it under the **exact file name** below as `.webp` (or `.jpg` / `.png`).
- **Pure white background.** The game's loader keys out the white and crops tight, as it does for the other base modules (`keyOutWhiteAndCrop` in `src/art/creatureArt.ts`). No shadows on the ground, no scenery.
- **Side view, flat even lighting.** The game adds its own light, glow and water.
- Log every file in [`docs/art/SOURCES.md`](../SOURCES.md): the file, what it is, the tool, the date and the prompt.
- The tool's licence must allow selling the game (Steam).
- **Colour rule:** cyan, violet and magenta belong to the Choir. Only the Choir core (stage 5) may use them.
- Keep the ship the **same design in every stage image**, so the stages read as one ship being built. Generate stage 5 first, then ask for "the same ship, with only the parts up to stage N".

**Shared style line** (add to every prompt): *Victorian watercolor and gouache illustration, riveted gunmetal-grey iron plates, tarnished brass bands and fittings, dark ink outlines, warm amber porthole glow, soft hand-painted texture, weathered and slightly rusty, original design, not in the style of any existing game or film, side view, flat even lighting, isolated on a pure white background.*

---

## 1. The Petrel works (base module)

**File:** `src/art/base/works.webp` · about 1024 × 512 (a 2 × 1 module).

> A small undersea workshop module for building a ship's parts, seen from the side: a wide riveted gunmetal capsule with rounded ends and two vertical tarnished brass bands, a large round brass-rimmed porthole in the middle glowing warm amber with a tiny model of a pointed brass-and-iron ship visible inside, a short brass-banded hoist tube rising from the roof on the left, two small round pressure gauges, a vent grille, connector collars on the left and right ends, a stencilled plate reading "PW-1". [shared style line]

## 2. The launch platform (empty)

**File:** `src/art/landmarks/petrel_platform.webp` · about 1024 × 512. The ship stands in the brass ring in the middle, so leave that space empty.

> A floating launch platform at sea, seen from the side: a long riveted gunmetal deck on three fat rounded pontoon floats with brass bands, a brass railing along the deck, a round brass launch cradle ring set into the middle of the deck (empty), and a tall lattice gantry tower of riveted iron on the left with two brass swing arms reaching toward the middle, small warm amber lamps at each end of the deck and on top of the gantry. [shared style line]

## 3. The Petrel, stage by stage

**Files:** `src/art/landmarks/petrel_1.webp` … `petrel_5.webp` · about 512 × 1024 (tall). Each one is **the ship only, standing upright, nose up** (no platform). It's drawn standing on the deck, centred on the cradle.

**Stage 5 first (the whole ship):**

> A tall, slender upright Victorian rocket-submarine standing nose up, seen from the side: a round-shouldered body tapering to a pointed nose cone, the lower third covered in overlapping warm-brown ceramic heat tiles with three brass engine bells underneath, the middle section of riveted gunmetal plates with tarnished brass bands and four round amber-glowing portholes, a small dome-shaped glass viewport in the nose with brass frame bars, a brass star-telescope on one shoulder, an antenna at the tip, two swept iron fins at the base, and at the very heart of the hull a round brass-rimmed window showing a glowing ring of soft cyan, violet and magenta light. [shared style line]

Then the same ship with less of it built:

- **`petrel_4`** (navigation done, no core): as stage 5, but the heart window is dark and empty.
- **`petrel_3`** (life support done): the nose cone, dome viewport, telescope and fins are missing; the hull ends in an open ring of girders at the top.
- **`petrel_2`** (heat shield done): only the tiled lower third and the engine bells are plated; above them, a bare skeleton of iron girders in the ship's shape.
- **`petrel_1`** (frame done): the whole ship's shape as a bare skeleton of riveted iron girders and brass cross-braces, no plates at all, standing in its cradle.

## Where they show

- `works` replaces the code-drawn module outside the base (`drawPaintedHero` in `src/world/basegfx.ts`).
- `petrel_platform` and `petrel_1..5` replace the code-drawn platform and ship at the surface (`src/world/petrelView.ts`). While a stage is being built, the image for the stages already finished shows.


---

## 4. Europa (for later wiring)

Europa is drawn in code for now (`src/scene/europaScene.ts`), and it doesn't yet read painted images by file name. When painted art for it exists, the next session wires these in the same way as the Petrel's. Same shared style line, but **cold**: blue-white ice, dark blue-black water. Europa's own life glows **icy white and pale blue-green** (never the Choir's cyan, violet or magenta, except in the glyphs).

- **`src/art/landmarks/europa_hab.webp`** (about 768 × 640): *A riveted gunmetal capsule hanging on brass struts under a dark shaft bored through ice, two big round brass-rimmed portholes glowing warm amber, a small peach axolotl in a glass jar behind one porthole, an open round moon pool lip underneath, a stencilled plate "PETREL · HAB". [shared style line]*
- **`src/art/landmarks/europa_glyph.webp`** (about 256 × 512): *A pillar of clear blue glacier ice with concentric rings carved into it, glowing faintly from inside in soft cyan and violet, ancient and alien. [shared style line]*
- **`src/art/creatures/rime_moth.webp`** (about 256 × 256, side view): *A palm-sized deep-sea swimmer with four broad frost-white translucent fin-wings like a moth's, a small rounded body, rows of tiny pale blue-green light spots along the wings, gentle and delicate, no teeth. [shared style line]*
- **`src/art/creatures/glasshorn.webp`** (about 512 × 192, side view): *A long, slow seabed creature as clear as glass, with dozens of fine legs and a single slender horn on its head glowing icy white. [shared style line]*
- **`src/art/painterly-world/europa_ice.webp`** (wide backdrop, about 2048 × 768): *Looking up at the underside of a vast ice sheet from a dark ocean: hanging icicles and frozen ridges in blue-white, faint light filtering through cracks, deep blue-black water below. [shared style line, but a wide painted backdrop, not isolated on white]*
- **`src/art/creatures/floe_ray.webp`** (about 768 × 384, seen a little from above and to the side): *A broad, gentle ray as wide as a small submarine, slate-grey above and pale white beneath, with a row of small pale blue-green lights along each wing edge, a long thin tail, big soft dark eyes and two curled horn-fins at its head, calm and friendly. [shared style line]* Its gear could be separate overlays later: a woven frost-frond saddle with a pouch, a translucent air bladder, a crest of rime crystals, a glowing brow gland.
- **`src/art/painterly-world/europa_jupiter.webp`** (about 1024 × 1024): *Jupiter seen huge in a black, starry sky, banded in cream, tan and rust with its great red storm, half in shadow. [shared style line, but on black]*
- **`src/art/landmarks/europa_floe.webp`** (about 768 × 256): *A floating slab of sea ice seen from the side at the waterline: thick snow on top, a rough, rounded blue-white underside below the water. [shared style line]*
