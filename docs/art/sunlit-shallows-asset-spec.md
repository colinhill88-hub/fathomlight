# Fathomlight Sunlit Shallows artwork brief

Create original painterly environment artwork for a 2D side-view underwater game. This set dresses the reef between the Kestrel buoy (world x = 900) and the old anchor (world x = 2860). The area should feel like a sheltered, sunlit survey site with clear swimming lanes, layered reef shelves, and patches of life. Use atmospheric perspective, varied silhouettes, and intentional groupings. Leave the recognizably industrial shapes to Fathomlight’s existing buoy, anchor, diver, and base kit.

The project's [Sunlit Shallows concept board](sunlit-shallows.jpg) is a mood reference. [The G4 shallows capture](fidelity/g4-after-shallows.jpg) shows the in-game camera, lighting, and object scale. Produce original shapes and paintings for this world.

## Final game files

Deliver exactly these three images. These paths are relative to the repository root.

| File | Pixels | Aspect ratio | In-game size |
| --- | --- | --- | --- |
| `src/art/sunlit-shallows/reef-far.png` | 2048 × 1024 | 2:1 | 2100 × 1050 world units |
| `src/art/sunlit-shallows/reef-mid.png` | 2048 × 1024 | 2:1 | 1940 × 970 world units |
| `src/art/sunlit-shallows/reef-atlas.png` | 1024 × 512 | 2:1 | Eight 240 × 240 px frames. See sprite sizes below. |

Export **8-bit sRGB RGBA PNGs with straight alpha**. Empty space must be actual alpha 0. Keep soft transitions on distant plates and clean antialiased edges on cutouts. Check the silhouettes over both light teal and dark blue-green for white or black halos. The generation canvas may differ from the delivery grid. Generate the components independently if needed, then crop, clean, resize, and pack them to the exact dimensions. Codex can handle that packaging from the delivered source images.

## Two parallax paintings

Each painting is a transparent plate for one side-on view. Give the formations tapered ends that read naturally as the camera moves. Both plates keep the outermost 96 px at left and right and the uppermost 96 px fully transparent. Feather forms inward before those edges. Fade toward full transparency in the bottom 160 px where forms reach that far. The plates are placed once and do not tile.

| Plate | What to paint | Design guide | Camera behavior |
| --- | --- | --- | --- |
| **Far reef** | Broad submerged limestone shelves and a few low, broken ridges. Soft, low-contrast brushwork and simple overlapping masses. | Place the main ridge crests between pixel y = 140 and 290. Use hazy blue-green, sampled around `#416D70`, `#548184`, and `#6D9897`. | Parallax **0.12** horizontally and vertically. Center **x = 1780**, top **y = −152** at reference camera depth. Maximum layer opacity **66%**. |
| **Mid reef** | Closer limestone terraces, rounded erosion channels, and sparse, small plant silhouettes. Group forms into uneven shelves with gaps that reveal the far layer. | Place the main crests between pixel y = 185 and 315, with broken shoulders and little detail in the open water above. Use `#305B59`, `#49726A`, and `#658376`. | Parallax **0.42** horizontally and vertically. Center **x = 2020**, top **y = −98** at reference camera depth. Maximum layer opacity **88%**. |

The camera’s vertical reference depth is **y = 260**. The paintings crossfade with the generated ridges over **240 world units** at both ends of the stretch, based on camera center. They also fade as the view widens from **960 to 1400 world units** tall. The draw order is **water → procedural backdrop → far painting → mid painting → lit terrain, reef cutouts, and gameplay objects**. The existing zone grade applies to both paintings. The distant forms should read as scenery beyond the playable seabed.

Paint soft, broad upper-left daylight and gentle shaded planes. Keep values and saturation close within each plate. The runtime provides water, live caustics, light shafts, particles, lamp light, bloom, and color grading. Leave those effects out of the paintings, along with the waterline, characters, pickups, and hardware.

## Reef atlas

Generate eight isolated cutouts. The table gives the exact order for a **4-column × 2-row** grid of **256 × 256 px cells**. The game reads the fixed grid directly from the PNG.

| Row | Column 1 | Column 2 | Column 3 | Column 4 |
| --- | --- | --- | --- | --- |
| 1 | Coral 1, warm apricot branching fingers | Coral 2, dusty salmon antler-like branches | Coral 3, muted ochre clustered branches | Fan 1, rose-colored rounded fan |
| 2 | Fan 2, copper-rose asymmetrical fan | Fan 3, muted terracotta split fan | Rock 1, low slate-green shelf fragment | Rock 2, rounded grey-green stone with olive algae |

Each cell has an **8 px transparent gutter on all sides**. The visible texture frame is **240 × 240 px**. Its top-left atlas coordinates are x = **8, 264, 520, 776** and y = **8 or 264**, depending on the cell. Within each frame, leave at least **12 px of transparent margin** on the left, right, and top. Put the center of the attachment base at **frame (120, 216)**, or **cell (128, 224)**. Keep the remaining bottom area transparent. Each sprite is upright in side view with its base down. Use neither rotated frames nor trimmed cells.

| Sprite family | Frame size in the game | Placement |
| --- | --- | --- |
| Coral | **76 × 76 world units** at scale 1. Existing placement varies the scale from 0.7 to 1.3. | Existing coral anchors. |
| Sea fan | **64 × 64 world units** at scale 1. Existing placement varies the scale from 0.8 to 1.4. | Existing fan anchors. Preserve open gaps in the delicate silhouettes. |
| Rock | **48 × 48 world units** per frame. Keep the visible stone low and wide. | Two purely decorative rocks on the seabed at x = 2110 and x = 2740. |

Use muted living colors such as `#C98870`, `#B36B67`, `#B88D58`, and `#7B8767`. Use restrained, broad shading so the game’s moving lights can add dimension without exaggerating painted texture. Coral and stone cores should be opaque, with selective translucency in thin sea-fan tissue and at antialiased edges. Keep the attachment bases clearly readable. Avoid baked ground shadows, bloom, bright specular streaks, or emissive cyan, violet, and magenta, which belong to the Choir.

## Preview after the images are packed

- The regular game and `?art=procedural` show the procedural control. `?art=shallows` requests the authored set. The preview falls back to procedural art if any required file is absent, fails to load, or has the wrong pixel dimensions.
- To compare the same camera, use `?bench&still&scene=0&at=1880,265&art=procedural` and `?bench&still&scene=0&at=1880,265&art=shallows`. Repeat near the old anchor at `at=2600,320`. For real-device performance comparisons, use the same preset, viewport, and render resolution.
