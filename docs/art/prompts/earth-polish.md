# Image-generation prompts: Earth scenery polish (Nov 28, 2026)

**Why:** Colin's review of Earth's backgrounds. The code fixes are done (see PROGRESS.md):
- the reef paintings now fade in slowly from the base;
- `grotto-mid` and `trench-mid` now load, with soft edges;
- the heavy foreground kelp is lighter.

These paintings fix what code can't. They're listed in order of how much they'll show.

**Status:** all four **made and in the game** (Colin, Nov 28, 2026; logged in `docs/art/SOURCES.md`). New Earth plates go through `scripts/prep-earth-art.py`.

## How to make them

**Earth's style line** (add to every prompt): *Victorian watercolor and gouache illustration, soft hand-painted texture, dark ink outlines, underwater, sunlit teal and sea-green water, warm sand, muted coral accents, original design, not in the style of any existing game or film, side view.*

**Format, the same as Earth's other far paintings:**
- **Size:** 2:1 (for example 2048 × 1024; it is sized down to 1536 × 768).
- **Background:** on **pure white**. Ask for the shapes to **dissolve softly into white mist at all four edges**, so the picture has no hard border (the session that wires them in keys the white out, the way it was done for Europa).
- **Composition:** low contrast, hazy and soft. These sit far behind the playfield. Leave the **middle third fairly open**, because Kestrel swims in front of it.
- **No** fish, divers, buoys, text or man-made objects unless the prompt asks for them.

Save each one where it says. The next session prepares and places it.

## 1. The basin rising into the reef (the seam you noticed)

**`src/art/painterly-world/basin-east.webp`.** It goes between the base's dark basin (left) and the sunlit reef (right), so its left edge must be dark and its right edge bright.

> *A wide underwater slope seen from the side, rising from left to right: on the left, deep shadowy blue-green water over dark terraced rock and silt; across the middle, the rock climbs in soft ledges and the light gets warmer; on the right, sunlit pale sand, a few soft coral tufts and the first kelp fronds near the top. Gentle light rays slanting down on the right half only. A smooth gradient from dark and cool on the left to bright and warm on the right. Shapes dissolving softly into white mist at all four edges. Isolated on pure white.* + style line

## 2. The reef top between the kelp forest and the wreck shelf

**`src/art/painterly-world/reeftop.webp`.** This is the shallow, bright stretch east of the forest (the Hatchery's kelp wall, the relay log and the cache), just under the surface. Right now it borrows the meadow painting, whose middle is empty.

> *A broad, shallow reef top just under a bright water surface: low rolling sand ridges and flat rock shelves across the whole width, sparse kelp thinning out toward the right, a tall dense wall of kelp at the far left edge, scattered sea grass, soft dappled sunlight. Calm and open, slightly hazy in the distance. Fill the bottom half across the full width (no empty bowl in the middle). Shapes dissolving softly into white mist at all four edges. Isolated on pure white.* + style line

## 3. The grotto, as a true midground

**`src/art/painterly-world/grotto-mid.webp`** (replaces the current one). The current painting is a full scene with its own bright light rays. It now shows with faded edges, but it's brighter than the dim grotto around it and reads a little like a picture hung in the water.

> *Natural limestone arches and pillars in dim greenish water, two or three arches of different sizes overlapping in depth, mossy ledges, a few small sponges, faint cool light from above but no strong light rays. Darker and lower contrast than a sunlit reef. Shapes along the bottom half and the arches rising through the middle; the top fading to mist. Shapes dissolving softly into white mist at all four edges. Isolated on pure white.* + style line

## 4. Optional: painted foreground kelp

**`src/art/sunlit-shallows/kelp-front.webp`** (about 2048 × 1024). This would replace the code-drawn dark kelp that passes in front of the camera in the shallows (it is lighter now, but still flat).

> *Three or four tall kelp stalks with long ribbon fronds, very close to the viewer and softly out of focus, dark blue-green silhouettes with a faint lighter edge, rising from the bottom edge at the far left and far right only. The centre completely empty. Isolated on pure white.* + style line

## Not needed

- **`trench-mid`:** with soft edges it now looks right (rock pillars behind the trench).
- **`basin`:** its empty right half is covered by the new bridge painting (1).
