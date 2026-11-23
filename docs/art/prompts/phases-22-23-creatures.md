# Image-generation prompts: Phases 22 and 23 (Session B, Nov 22, 2026)

Everything new in Session B is drawn in code (this session had no image generator). These prompts are ready for whoever has one, to make painted textures that **dress the jointed code rigs** (Colin prefers painted textures on the rigs to stiff sprites, so creatures still move naturally). The code drawings stay as the fallback (`?art=procedural`, and when a texture is missing).

**How to use them (for any AI tool):**
- Generate, then crop and save as `.webp`, sized to how big it is on screen (a creature is about 60–150 px wide in a tank on a phone, so 256–512 px textures are plenty).
- Put creature textures in `src/art/creatures/` (new folder) and log every file in [`docs/art/SOURCES.md`](../SOURCES.md) with the tool, the date and the prompt used.
- The tool's licence must allow selling the game (Steam).
- **Colour rule:** cyan, violet and magenta belong to the Choir. The only creatures that may carry them are Choir-touched ones (Colin, Nov 22, 2026).
- Keep each texture **flat-lit and side-on**, on a plain transparent or flat background, because the game's own lighting pipeline adds the light (the lit, emissive and glow layers). Glowing marks go on a **separate emissive sheet** (black background, only the glowing marks), as the existing creatures' markings do.

**Shared style line** (add to every prompt): *painterly, high-fidelity, soft gouache and watercolour texture, gentle rim light, cute and friendly creature design with big soft eyes and no teeth, original design, not in the style of any existing game or film, side view, flat even lighting, isolated on a transparent background, game texture sheet.*

---

## 1. Kiln eel (trench species), body material strip

Where it goes: `src/actors/deepCreatureRigs.ts` (`KilnEelRig`). The body is re-drawn along a swaying spine each frame, so the texture is a **straight horizontal strip** that the code bends along the spine (head on the right, tail on the left).

> A long straight horizontal texture strip of a slender eel's body seen from the side, head end on the right and tapering tail on the left, sooty charcoal-brown skin with faint warm undertones, a paler warm buff belly, fine soft scales and small soot speckles, a soft translucent ribbon fin running along the whole back with fine dark fin rays, no head, no eyes, even width for texture mapping. [shared style line]

Colour variants (same prompt, swap the colours): **Soot** (charcoal-brown), **Rust** (deep rust-red, tan belly), **Ash grey** (warm grey, pale stone belly), **Molten gold** (rare: burnished dark-gold skin, honey belly).

### 1b. Kiln eel head
> The head of a gentle deep-sea eel in side view, facing right: a rounded snout, a big soft dark eye with a warm amber ring and one bright catchlight, a small closed smiling mouth, soft gill frills behind, sooty charcoal-brown skin with a pale belly. [shared style line]

### 1c. Kiln eel glow sheet (emissive)
> On a pure black background, only the glowing marks of an eel's side, laid out on a straight horizontal strip: a row of small warm ember-orange lights along the middle, softly glowing, no body visible. [shared style line, but on black]

Make three: **ember line** (one even row of small dots), **cinder spots** (scattered pairs of larger and smaller dots), **kiln bands** (short glowing upright bars every few segments).

### 1d. Kiln eel shapes
- **Sail crest** (uncommon): *a tall, ribbed, translucent sail-like dorsal fin running along an eel's back, soft charcoal-brown with fine dark rays, side view, as a separate strip.*
- **Lantern tail** (rare): *the end of an eel's tail ending in a small rounded paddle holding a soft glowing ember-orange bulb, side view.*

## 2. Chime seahorse (sanctum's edge species)

Where it goes: `ChimeHorseRig` in the same file. Parts are separate joints: torso, head, back fin, eight tail segments, crown filaments. Make each part as its own piece on one sheet.

> A texture sheet of separate parts for a small, gentle ivory seahorse, each part isolated with space around it: the rounded torso with soft ridged rings and a pale pearly belly; the head facing right with a long tube snout, a big friendly dark eye and a small crown of short spines; a fan-shaped translucent back fin with fine rays; eight tapering ridged tail segments from thick to thin; three long pale filaments with tiny glowing tips. Warm ivory and pearl colours with soft cream highlights. [shared style line]

Colour variants: **Ivory**, **Pearl rose** (blush pink, not hot pink), **Driftwood** (soft brown), **Sunstone** (rare: warm amber-gold).

### 2b. Chime seahorse glow sheet (emissive, black background)
Three patterns: **crown light** (three small warm-white lights on the crown), **pearl beads** (a row of five pearly lights down the chest), **lyre lines** (two curved glowing lines on the chest like a lyre). Warm pearl and pale gold only.

### 2c. Chime seahorse shapes
- **Long snout** (uncommon): *the same seahorse head with a noticeably longer, elegant snout.*
- **Veil crown** (rare): *four long, flowing, veil-like pale filaments trailing from the crown, each with a tiny glowing tip.*

## 3. Shapes for the six older species (Phase 22)

Each is a small overlay part on an existing rig. Side view, matching that creature's current painted colours (see the zoo, `zoo.html`).

| Species | Uncommon shape | Rare shape (bred only) |
| --- | --- | --- |
| Glowfin | *a tall ribbed sail of a dorsal fin* | *a long flowing veil tail, translucent with fine rays* |
| Puffcap | *a lace rim: a second fine frill of scallops round a jelly's bell edge* | *a crown of soft standing lobes on top of the bell, each tipped with a tiny warm light* |
| Dapple ray | *long swept pointed wingtips* | *a soft frill of rounded lobes along the wing edges, and a tiny plume at the tail tip* |
| Tinker crab | *a row of blunt spines along the top of the shell* | *a ribbed fan-shaped crest rising from the back of the shell* |
| Lantern shrimp | *antennae twice as long, ending in fine trailing whips* | *a feathery plume tail fan* |
| Cinder snail | *a tall tapering spire on the coiled shell* | *flared wavy flutes along the shell's back edge* |

## 4. Heirloom lines (Phase 22)

> On a pure black background, a delicate pearl-gold filigree scroll, like fine engraving on old silver: one long curling line with small leaf curls along it and a tiny six-petal rosette at one end, softly glowing pale gold. Isolated, no creature. [shared style line, but on black]

The code lays it over the middle of any creature's body (emissive layer) with a soft gold sheen in the glow layer.

## 5. Choir-touched (Phase 23, the one exception to the colour rule)

> On a pure black background, three fine curved bands of living light, like rings seen edge-on, in luminous cyan, violet and magenta, with a few tiny sparks of the same colours, soft and glowing. Isolated, no creature.

And a halo: *a soft round glow that blends from cyan to violet to magenta, very soft edges, on black.* The code turns the halo slowly through the three colours.

## 6. Tank interiors (left over from Session A)

> A painted backdrop for the inside of a small aquarium tank seen from the front: soft blue-green water, a far wall of warm sandy reef rock with small corals and seagrass tufts, gentle light shafts from above, no fish, no glass edges, wide and shallow composition. [shared style line, without the creature words]

Make one per plant (branch coral, ribbon kelp, seagrass, bladder kelp, lumen moss) so a tank's backdrop matches its plant.

---

## 7. Hand-off to Codex: painted textures with depth (Colin, Nov 23, 2026)

Colin wants the creatures to look less flat. **Done in code first** (this pull request): a soft shadow on each creature's underside and light on its back (`drawShade` in `src/actors/critters.ts`), a shadow on the tank sand under each creature, and depth inside the tanks (creatures further back are smaller, bluer and dimmer, and drawn behind; `z` and `fog` in `src/world/tanklife.ts`). The painted textures below are the next step, for **Codex** (or any tool with image generation).

**Sizes have changed:** in the tanks creatures are now drawn at `TANK_SIZE = 0.5` (about 59% of before), so most are only **30–70 px wide on a phone**. Paint at 4× that (128–256 px per part) and save `.webp`. Giants are 1.38×, tiny ones 0.68×.

**What to make, per species** (colours as in the zoo, `zoo.html`):
1. **A colour texture for each rig part** (the parts listed in sections 1–3; e.g. glowfin hull, tail paddle, pectoral fins, lure stalk), painted **with the shading baked in**: lit from above, a darker underside, soft ambient occlusion where parts meet, a thin warm rim light along the top edge, and painterly scale or skin texture. Side view, transparent background, each part on its own so it can move on its joint.
2. **Optional: a normal map for each part** (a "depth map": an image that tells the game which way each spot faces), in the standard purple-blue tangent-space style, same size and outline as the colour texture. The game has no normal-map lighting for creatures yet; adding it is a code task for the same session (see below).
3. **The glow sheets** stay separate, on black (sections 1c, 2b, 4, 5).

**Prompt to add to every part** (after the shared style line): *with soft painted volume: lit from above with a gentle warm rim light along the top edge, a darker cool underside, soft shadow where parts overlap, subtle painted texture, no hard outlines, no cast shadow on the background.*

**For the normal maps:** *a tangent-space normal map of this exact shape, matching its outline, smooth rounded volume, flat (128,128,255) background where transparent.*

**How to wire them in (the code side, for the same Codex session):**
- Put files in `src/art/creatures/<species>/<part>.webp` (and `<part>.normal.webp`), and log every one in `docs/art/SOURCES.md`.
- Each rig builds its parts as `Graphics`; swap each part's `Graphics` for a `Sprite` of its texture **inside the same joint `Container`**, at the same anchor, so the existing animation drives it unchanged. Keep the code drawing as the fallback when a texture is missing or with `?art=procedural`.
- Colours: either paint each colour variant, or paint the common one in greys and keep the existing tint (`BODY_TINTS` in `critters.ts`; the new species use `EEL_LOOKS` and `HORSE_LOOKS`).
- With textures in, turn off `drawShade` for that species (the shading is baked in). Keep the tank shadows and depth fog.
- Normal maps would need a small lighting step for the creature layer (the world's lighting is in `src/fx/lighting.ts`). Only do it if it stays smooth on an iPhone with 60 creatures on screen; otherwise the baked shading is enough.
- Test with `zoo.html`, a crowded tank (24+ creatures) on the iPhone, and the book's portraits (`src/ui/creatureSnap.ts` renders the same rigs).
