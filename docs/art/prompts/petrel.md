# Image-generation prompts: the Petrel, the Petrel works, and Europa (Beyond Earth, Nov 27, 2026)

**Status:** everything on this sheet is **made and in the game**: sections 1–3 (the Petrel works, the platform and the five ship stages; Colin, Nov 27, 2026) and section 4, 4a–4j (Europa, the voyages and the works room props; Colin, Nov 28, 2026). All are logged in `docs/art/SOURCES.md`. New Europa images go through `scripts/prep-europa-art.py`.

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

## 4. Europa (made Nov 28, 2026)

Europa is drawn in code for now (`src/scene/europaScene.ts`). It doesn't read painted images by file name yet: when a batch of these arrives, the next session wires them in (as it did the Petrel), so they **don't need to be perfect matches to the code's shapes**, but they should keep to the sizes and roles below.

**Europa's own style line** (use instead of the shared one): *Victorian watercolor and gouache illustration, soft hand-painted texture, dark ink outlines, cold palette of blue-white ice, slate, and blue-black water, original design, not in the style of any existing game or film, side view.* Add *isolated on a pure white background* for objects; leave it off for backdrops.

**Colour rules on Europa:** Europa's own life glows **icy white and pale blue-green**. Only the Choir's kin, their glyphs and their gates use the Choir's **cyan, violet and magenta**. Kestrel's kit and the hab keep the base kit's gunmetal, brass and warm amber.

**Layers.** Each zone has three painted layers, drawn at different depths (parallax), like Earth's zones:
- **Background** (far): a wide, soft, low-contrast vista, about 2048 × 1024, *not* on white (it fills the whole view). Darker and bluer the deeper the zone.
- **Midground**: a wide strip of shapes between the far vista and the playfield (ice columns, ridges, chimneys), about 2048 × 768, **on pure white** so the white can be keyed out (only the shapes show).
- **Foreground**: a few dark, soft-focus silhouettes that pass in front of Kestrel near the edges of the view, about 2048 × 512, **on pure white**. Keep the middle mostly empty so it never hides the player.

### 4a. Zone 1, "Under the ice" (the landing site)
- **`src/art/europa/ice_bg.webp`** (background): *Looking along the underside of a vast ice sheet from a dark ocean that no sunlight reaches: a ceiling of blue-white ice receding into the distance, with hanging icicles and frozen ridges, a faint cold glow seeping through cracks, deep blue-black water below, very quiet and lonely.*
- **`src/art/europa/ice_mid.webp`** (midground): *A row of long hanging ice columns and frozen stalactites of different lengths, pale blue with darker blue shadows, hanging from the top edge; a low dark silt ridge along the bottom edge. Isolated on pure white.*
- **`src/art/europa/ice_fg.webp`** (foreground): *A few thick, dark blue icicle silhouettes hanging from the top edge at the far left and far right, soft and slightly blurred, as if very close to the viewer. Isolated on pure white, centre left empty.*

### 4b. The passage under the thick-ice wall
- **`src/art/europa/passage_bg.webp`** (background): *A long, low tunnel of ancient blue-black ice running into darkness, its roof and floor converging far away, faint streaks of a cold current flowing toward the viewer, a pale glow at the far end.*
- **`src/art/europa/passage_mid.webp`** (midground): *Jagged ribs of old ice hanging from the top edge and rising from the bottom edge, like the inside of a frozen throat, dark blue with frosty edges. Isolated on pure white.*
- **`src/art/europa/passage_fg.webp`** (foreground): *Two or three dark, blurred lumps of ice at the very top and bottom edges, close to the viewer. Isolated on pure white, centre empty.*

### 4c. Zone 2, "The floe field"
- **`src/art/europa/floes_bg.webp`** (background): *Open dark water seen from just under the surface, with the undersides of big floating ice floes overhead, cold grey light coming down through the gaps between them, the water fading to blue-black below.* (Jupiter is a separate image, below.)
- **`src/art/europa/floes_sky.webp`** (sky backdrop, about 2048 × 768, *not* on white): *A black, star-filled sky over a field of broken sea ice floating on dark open water, seen from water level; the floes white with snow, the leads between them black and glassy. Leave the upper half empty sky (Jupiter goes there).*
- **`src/art/europa/floes_mid.webp`** (midground): *The rough underwater undersides of three or four floating ice floes along the top edge, blue-white and ragged; a low rocky seabed rise along the bottom edge. Isolated on pure white.*
- **`src/art/europa/floes_fg.webp`** (foreground): *Dark, blurred chunks of broken ice floating near the top edge at the far left and right, very close to the viewer. Isolated on pure white, centre empty.*

### 4d. Zone 3, "The warm deep" (the abyss and the kin's hearth)
- **`src/art/europa/deep_bg.webp`** (background): *The bottom of a deep ocean abyss: rows of old hydrothermal vent chimneys fading into the dark, a faint warm amber haze rising from a few of them, the water black above, an ancient and sacred feeling.*
- **`src/art/europa/deep_mid.webp`** (midground): *A row of tall, cold, dark-grey vent chimneys of different heights standing on mounds along the bottom edge, crusted and ancient, one of them faintly glowing amber at its mouth. Isolated on pure white.*
- **`src/art/europa/deep_fg.webp`** (foreground): *Two dark, blurred chimney silhouettes at the far left and right edges, close to the viewer, with a faint warm rim light. Isolated on pure white, centre empty.*
- **`src/art/europa/blackwater.webp`** (about 1024 × 512, *not* on white): *A band of utterly black water with only the faintest drifting specks, soft-edged at the top and bottom, as if light simply stops.* (Optional; the code's black band works without it.)

### 4e. Europa's sky
- **`src/art/europa/jupiter.webp`** (about 1024 × 1024, on pure black): *Jupiter seen huge in a black, starry sky, banded in cream, tan and rust with its great red storm, half in shadow on the right, softly painted.*

### 4f. Objects and places
- **`src/art/europa/hab.webp`** (about 768 × 640): *A riveted gunmetal capsule hanging on brass struts under a dark shaft bored through ice, two big round brass-rimmed portholes glowing warm amber, a small peach axolotl in a glass jar behind one porthole, an open round moon-pool lip underneath, a stencilled plate "PETREL · HAB". Isolated on pure white.*
- **`src/art/europa/still.webp`** (about 256 × 384): *A small riveted gunmetal tank bolted to the side of a capsule, with two brass bands, a warm amber gauge window, a short brass pipe dripping below, and a plate "BS-1" (the Brine still). Isolated on pure white.*
- **`src/art/europa/bell.webp`** (about 512 × 384): *A dome of trapped air hanging under ice from a brass chain, held by a brass ring with rivets, the air inside glassy and pale blue, a rippling silver surface at its open bottom (the Air bell AB-1). Isolated on pure white.*
- **`src/art/europa/glyph_stand.webp`** and **`glyph_hang.webp`** (about 256 × 512): *A pillar of clear blue glacier ice (standing on the seabed / hanging from the ice above) with concentric rings carved into it, glowing faintly from inside in soft cyan and violet, ancient and alien. Isolated on pure white.*
- **`src/art/europa/floe.webp`** and **`floe_thin.webp`** (about 768 × 256): *A floating slab of sea ice seen from the side at the waterline: thick snow on top, a rough, rounded blue-white underside below the water* (thin: *a thinner, more translucent slab with cracks running through it*). *Isolated on pure white.*
- **`src/art/europa/brine_pool.webp`** (about 768 × 256): *A small lake of heavier, shimmering water lying in a hollow of the dark seabed, with its own glassy surface, white salt crust at its rims. Isolated on pure white.*
- **`src/art/europa/vent_cold.webp`**, **`vent_lit.webp`**, **`hearth.webp`** (about 256 × 512): *An ancient hydrothermal vent chimney on a mound of rock, tapered and crusted* (cold: *dark grey, its mouth black*; lit: *its mouth glowing warm amber with shimmering heat and bubbles*; hearth: *taller and older, with a faint warm glow and carved rings around its base*). *Isolated on pure white.*
- **`src/art/europa/kin_gate.webp`** (about 256 × 384): *An upright oval ring of living light standing in dark water, soft cyan outside and violet inside, with a faint glow filling its middle, like a door. On pure black.*

### 4g. Europa's materials (pickups, about 192 × 192 each, on pure white)
- **`rime.webp`**: *a cluster of clear, needle-like ice crystals growing downward*; **`brine.webp`**: *a white crust of salt crystals on a dark pebble*; **`frond.webp`**: *a stiff, glassy, pale green-white seaweed frond*. All in `src/art/europa/`.

### 4h. Europa's creatures (side view, on pure white; their lights on a separate black "glow" sheet, as for the Earth creatures)
- **`src/art/europa/moth.webp`** (256 × 256): *A palm-sized deep-sea swimmer with four broad frost-white translucent fin-wings like a moth's, a small rounded body, gentle and delicate.* Glow sheet: *rows of tiny pale blue-green dots along the wings.*
- **`src/art/europa/glasshorn.webp`** (512 × 192): *A long, slow seabed creature as clear as glass, with dozens of fine legs and a single slender horn on its head.* Glow sheet: *the horn's tip, icy white.*
- **`src/art/europa/krill.webp`** (64 × 64): *A single tiny translucent krill-like swimmer.* Glow sheet: *one icy white speck.* (The game draws them in swarms.)
- **`src/art/europa/floe_ray.webp`** (768 × 384, seen a little from above and to the side): *A broad, gentle ray as wide as a small submarine, slate-grey above and pale white beneath, a long thin tail, big soft dark eyes and two curled horn-fins at its head, calm and friendly.* Glow sheet: *a row of pale blue-green lights along each wing edge.* Its **gear as separate overlays**, drawn to sit on that same ray: **`ray_saddle.webp`** (*a saddle woven from pale green-white frost fronds, with a small woven pouch*), **`ray_bladder.webp`** (*a translucent bubble of air on the saddle's back*), **`ray_crest.webp`** (*a crest of sharp rime crystals on the brow*), **`ray_gland.webp`** (*a round glowing lantern grown on the brow, icy blue-green*).
- **`src/art/europa/kin.webp`** (512 × 512, **on pure black**): *A luminous, non-humanoid being of light made of interlocking rings and a trailing ribbon, in soft cyan, violet and magenta, old and gentle, faint and a little transparent, as if fading.* (One image; the game draws five, brighter as the vents are rekindled.)

### 4i. Inside the Petrel works (the room in the base)
- **`src/art/interior/works_lathe.webp`** (512 × 256): *A brass-and-gunmetal parts lathe on a workbench, with gauges and a half-turned brass ring in its chuck. Isolated on pure white.*
- **`src/art/interior/works_model.webp`** (256 × 384): *A small brass display model of a Victorian rocket-submarine on a brass stand, with a tiny amber porthole lit. Isolated on pure white.*
- **`src/art/interior/works_hoist.webp`** (256 × 768): *A tall riveted hoist shaft with a brass cargo cage on a chain, a stencilled sign "TO PLATFORM ▲". Isolated on pure white.*

### 4j. The voyage scenes (optional; the code draws them now)
Full-frame paintings, about 1920 × 1080, *not* on white, each a moment of the trip: **`src/art/voyage/dusk.webp`** (*the sea at dusk from a floating platform, warm sky*), **`space.webp`** (*the blue Earth's curve falling away below into a black, starry sky*), **`moon.webp`** (*a small white moon of ice, cracked with long rust-brown lines, growing ahead in the dark*), **`ice.webp`** (*a wide plain of white ice under a black sky, a drill shaft steaming*). The game would draw the Petrel over them.
