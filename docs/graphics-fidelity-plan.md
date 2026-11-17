# Fathomlight: graphics fidelity audit and plan

2026-11-17. Audit and planning only: no code was changed in this session. **Approved by Colin on 2026-11-17.** G1 runs next (prompt: `docs/prompts/graphics-g1.md`); G2–G4 follow as he approves each.

Goal: a more polished underwater science-fiction look (sophisticated lighting, rich painterly environments, detailed weathered hardware, convincing atmosphere) on the existing PixiJS 8.23 / WebGL 2 / custom GLSL renderer. No Three.js, no engine rewrite, no WebGPU, no paid assets or new dependencies, procedural art stays the default, iPhone and iPad keep working, and gameplay stays readable.

## 1. The rendering architecture today

### Draw order (outdoor world, one frame)

Set up in `src/main.ts` (`boot`, `populate`, the end of the `app.ticker` frame loop):

| # | Pass | Where | Target | Notes |
| --- | --- | --- | --- | --- |
| 1 | Lit layer: sand, rock, plants, base, creatures, sub, drone, diver, bubbles, dome glass, front kelp (`litCam` + `frontCam`) | `scenery.ts`, `basegfx.ts`, actors | `litRT`, full resolution, **MSAA on**, RGBA8 | Flat colours ("albedo"), no lighting yet |
| 2 | Glow layer (`glowCam`) | each actor's `glow` container | `glowRT` (¼ res High, ½ res Ultra) | Blurred with Pixi `BlurFilter` (2 / 4 passes per axis) when composited |
| 3 | Water (`scene/water.ts`) | full-screen shader | canvas | Depth colour, sky above the surface, swaying light shafts, murk, grain |
| 4 | Backdrop (`scene/backdrop.ts`) | 3 / 5 layers of sine-wave ridges | canvas | One flat tint per layer, recoloured each frame for depth fog |
| 5 | Lighting (`fx/lighting.ts`) | full-screen shader reading `litRT` + the baked sky mask | canvas | Sun absorbed with depth, baked soft rock shadows, Voronoi caustics (×3 for the chromatic Ultra version), up to 8 / 12 point or cone lights, beam haze, water wobble, depth fog, Ultra diver shadow (one ellipse) |
| 6 | Emissive (`emissiveCam`) | lures, lamps, screens, surface splash | canvas | Drawn sharp, unlit |
| 7 | Glow sprite | `glowRT` + blur | canvas, additive | This is the only "bloom": only things placed in `glowCam` glow |
| 8 | Marine snow (`scene/particles.ts`) | `ParticleContainer` | canvas | Unlit: specks never react to the lamp |
| 9 | World overlays (`overlayCam`) | scanner brackets, build grid | canvas | Gameplay readability layer |
| — | Vignette | `#vignette` CSS div in `index.html` | page | Outside the renderer |

Indoors (`src/interior/`), the same pattern repeats with its own scene RT, a simpler lighting shader (16 lights, dust haze) and its own glow blur.

### What is good and should stay

- **The deferred-style split is the right foundation.** Drawing everything flat into `litRT` and lighting it in one full-screen shader is exactly how a premium 2D renderer is built. Every upgrade below plugs into that shader or adds a pass after it; nothing needs replacing.
- **One source of truth for water colour** (`GLSL_COMMON` in `fx/shared.ts`, with a TypeScript twin) keeps water, fog and backdrop in agreement.
- **The baked sky-visibility map** (`bakeSkyVisibility` in `world/terrain.ts`) already gives soft rock shadows, cave darkness, the forest canopy and the shelf twilight for almost no runtime cost. The same baking approach can give the lamp real shadows (see below).
- **Culling by world slices**, cached static scenery, and particles in a `ParticleContainer` are already efficient.
- **Presets are one bundle of numbers** (`src/presets.ts`), so every new effect can get a High and an Ultra value.

### What it is missing (the gap to "premium")

Seen in the four screenshots taken this session (Ultra, shallows, grotto, kelp forest, wreck shelf) and in the code:

1. **No HDR or tone mapping.** Lights add straight into an 8-bit canvas. Bright lamp-lit objects clip to flat saturated blobs (the brass fittings in the wreck shelf shot turn into flat yellow discs), and there is no colour grading per zone.
2. **Bloom is opt-in only.** Only objects drawn into `glowCam` glow. A lamp-lit rock, the surface, or a bright splash never blooms.
3. **Light passes through everything.** The lamp's cone and its visible beam go straight through rock and wrecks (wreck shelf and grotto shots). Nothing casts a shadow from a dynamic light.
4. **Surfaces have no form under light.** The lighting multiplies a flat colour, so rocks, hull plates, rivets and creature bodies light up evenly, like paper cut-outs. There are no normals, no rim light, no highlights on chrome, brass or glass.
5. **Only the diver casts a moving shadow**, and only as one ellipse on the seabed. Pieces, the sub, the drone and creatures float without contact shadows.
6. **Backdrops are generic.** Every zone uses the same sine ridges in one flat colour per layer. The kelp forest backdrop shows no forest, the wreck shelf no wrecks. Composition depth comes almost entirely from the foreground.
7. **Atmosphere is thin in the deep.** Light shafts are sine bands not blocked by kelp or hardware, and the marine snow does not catch the lamp, so the lamp cone looks like a flat triangle instead of a beam through murky water.
8. **Hardware and creatures read as clean vector art.** The concept boards (`docs/art/`) have a grainy, grimy painterly texture on every surface; the game's Graphics fills are perfectly smooth.

## 2. Visual quality assessment by area

| Area | Today | Opportunity | Impact |
| --- | --- | --- | --- |
| Lighting realism | Good base: depth absorption, baked sky shadows, many lights | HDR + filmic tone map; normals from the art; light occlusion | Very high |
| Shadows and AO | Baked rock shadows; diver ellipse (Ultra) | Shadowed lamp/floodlights; contact shadows for every piece, sub, drone, creature; soft AO where objects meet the seabed | High |
| Water and atmosphere | Depth colour, shafts, murk, wobble, surface from below | Shafts blocked by kelp/hardware (god rays); lamp-lit particles; forward scattering in the beam; a second near particle layer | High |
| Caustics | Animated Voronoi, chromatic on Ultra | Only on up-facing surfaces (needs normals); faint caustic shimmer in the water volume near the surface; skip the cost where they are invisible | Medium |
| Materials and textures | Painted dabs, scratches, rivets as flat colour | World-anchored painterly grain and grime; specular sheen on chrome, brass and glass; glass refraction on domes and tanks | Medium–high |
| Geometry and environment detail | Dense procedural dabs, kelp ropes, coral | Zone-specific mid-ground silhouettes (kelp, wrecks, arches), better rock silhouettes in the backdrop | High |
| Structures, machinery, pipes, glass | Strong drawn detail (new kit palette) | Lit by normals they pop; spec highlights on chrome flanges; glass with refraction and a moving reflection streak | Medium–high |
| Creatures and animation | Jointed, characterful, good secondary motion on the drone | Lamp eye-shine, body undulation on longer creatures, fin flutter; mostly drawing work per species | Medium |
| Depth, parallax, composition | 3 / 5 ridge layers + one foreground kelp layer | Zone-aware layers with internal vertical fog; soft depth-of-field on the near foreground | High |
| Anti-aliasing, sharpness, post | MSAA on `litRT` and canvas; CSS vignette | Post stack (tone map, grade, bloom, vignette, grain) in one pass; overlays drawn after it so they stay crisp; an optional render-scale setting on Ultra | High |

## 3. Performance assessment

**No GPU timings were measured.** The cloud test browser renders in software (SwiftShader, a few frames per second), so any number from here would be invented. What follows is what the code shows and what needs measuring on Colin's hardware.

### What we know

- **iPhone (High):** Colin measured mid-30s fps in the grotto with the lamp on (milestone 1), 60 elsewhere. That scene is the busiest for the lighting shader (most lights) and the glow layer. The phone is the binding constraint: it is almost certainly **GPU-bound on fragment work** there.
- **PC (Ultra):** about 106 fps at 2560 × 1360 against a 120 fps cap. That is close to the cap, so it does **not** prove a bottleneck. Pixi's `maxFPS` cap works by skipping display refreshes, so on a 144 or 165 Hz monitor the average can land below 120 without the machine being busy at all. We need frame **times**, not fps, to know.

### Likely costs, per frame (from reading the code)

GPU, roughly in order of expected cost at full resolution:

1. **Lighting shader** (`fx/lighting.ts`). Per pixel: up to 12 lights, plus caustics. Chromatic caustics run `cellEdge` 6 times (2 layers × 3 colours), each a 3 × 3 Voronoi search with `sin`-based hashes: around a hundred transcendental operations per pixel. They are computed **even where they are invisible** (deep water, inside caves, where `cK` is near zero). A depth/visibility early-out is a free win for both presets.
2. **`litRT` with MSAA** at full resolution, filled with many overlapping semi-transparent dabs (painterly overdraw), then resolved.
3. **Glow blur**: 4 passes per axis at half resolution on Ultra.
4. **Water shader** over the full screen, including the areas the opaque seabed will cover (overdraw; cheap per pixel).
5. **Canvas MSAA** (`antialias: true`) also applies to the full-screen water and lighting quads, where it buys nothing.

CPU, per frame:

- Several `Graphics` objects are **cleared and redrawn every frame** (critters, animated base parts, tank life, lines, pickups, the sub's prop and claw, the diver's plume). Pixi re-tessellates and re-uploads these each time. In a big base this grows with the number of pieces (already flagged in PROGRESS.md for the walkable base).
- The lights list is rebuilt, filtered and sorted every frame (small).
- The frame loop in `main.ts` (game rules, audio director snapshot) is long but mostly arithmetic.

### What has to be measured on Colin's hardware (session G1 builds the tools)

- **CPU time** for update and for render submission, from `performance.now()` around each.
- **GPU time per pass** with `EXT_disjoint_timer_query_webgl2` (available in desktop Chrome; not on iPhone, where we use frame time and fps instead).
- **Draw calls and triangles** per frame (wrap the GL context counters in the dev overlay).
- **A fixed benchmark route**, so before/after numbers compare like with like.

### Where extra visual complexity is safe

- Anything at reduced resolution (bloom mips, god rays at ¼ res, depth-of-field at ½ res).
- Anything cached once (zone backdrops drawn into textures, baked occupancy maps).
- Per-pixel work inside the lighting shader that only runs where it matters (inside a light's radius, near the surface), gated by preset.
- **Not safe on the phone:** extra full-resolution passes with many texture taps, and more per-pixel loops in the grotto/cave scenes. Every new effect gets a cheaper High value or is Ultra only, as DESIGN.md says (cut from the phone first).

### WebGPU

Not recommended. Nothing planned here needs compute shaders or storage buffers, WebGL 2 has the headroom for a 2D renderer, and switching would mean writing every shader twice (GLSL and WGSL) and re-validating iPhone Safari. Revisit only if measurements show a WebGL limit we cannot work around.

## 4. Proposed upgrades, ranked

Ranked by visual impact first, then cost. Cost estimates are expectations to verify with the benchmark, not measurements.

| Rank | Upgrade | Visual impact | Complexity | Expected GPU cost (Ultra / High) | Fit with architecture |
| --- | --- | --- | --- | --- | --- |
| 1 | **HDR scene target + post stack**: lighting writes to a half-float target; one post pass with filmic tone mapping, per-zone colour grading, threshold bloom (anything bright glows, not just `glowCam`), the vignette moved into the shader, fine grain. Overlays (scanner, build grid) stay after post. | Very high, everywhere | Medium | One extra full-screen pass + a small bloom mip chain. Low / low-moderate | Excellent: one new target and one shader; existing glow layer feeds it |
| 2 | **Light that respects the world**: a baked world occupancy texture (same idea as the sky mask); the lamp, sub floodlights and big lights march toward their source, so rock and wrecks cast real soft shadows and the visible beam stops at walls. | Very high in caves, the grotto, the shelf, the Corvina | Medium | Only inside lit radii. Ultra ~16–24 steps for the 2–3 biggest lights; High 6–8 steps, lamp only, or off | Excellent: reuses the bake pipeline and the existing light loop |
| 3 | **2.5D relief lighting**: normals worked out in the lighting shader from the art itself (edge bevel from coverage, fine bumps from brightness). Lights now model form: rounded rock, raised rivets, rim light on hull edges, caustics only on up-facing surfaces. | High: hardware and rocks gain volume | Medium | 4–8 extra texture taps per lit pixel. Ultra full; High 4 taps | Excellent: no art changes needed to get most of it |
| 4 | **Zone-aware painterly backdrops + depth of field**: per-zone mid-ground layers (kelp silhouettes in the forest, wreck and mast silhouettes on the shelf, arches and boulders in the basin) with fog that varies inside each layer, cached to textures; the near foreground kelp gets a soft blur. | High: depth and composition | Medium | Cached textures; DOF at ½ res. Low / low (DOF Ultra only) | Good: extends `Backdrop` and `frontCam` |
| 5 | **Volumetric atmosphere**: surface light shafts blocked by kelp, hardware and the diver (screen-space god rays at ¼ res); marine snow lit by the lamp and lures; forward scattering in the beam; an extra near particle layer. | High: underwater mood, especially the deep | Low–medium | ¼-res pass; particle lighting on the CPU or in a small shader. Low / low | Good |
| 6 | **Contact shadows and soft AO** for base pieces, sub, drone, creatures, wrecks (the diver's ellipse shadow generalised to a list), plus a soft occlusion darkening where things meet the seabed. | Medium–high: things sit in the world | Low | A uniform array of ellipses. Very low | Excellent |
| 7 | **Materials**: world-anchored painterly grain and grime (the concept-art texture), specular sheen on chrome, brass and glass through a small "shine" layer drawn like the glow layer, refraction and a moving reflection streak on dome and tank glass. | Medium–high on hardware | Medium (touches drawing code) | Low | Good: same pattern as `glowCam` |
| 8 | **Creature polish**: eye-shine that answers the lamp (fits "eyes that catch the lamp" in DESIGN.md), body undulation on longer creatures, fin flutter. | Medium | Medium (per species) | Negligible | Good |
| 9 | **Caustics refinement**: early-out where invisible (a performance win), a faint caustic shimmer in the water near the surface. | Medium | Low | Negative to low | Excellent |
| 10 | **Sharpness**: optional render scale on Ultra (supersampling) and canvas MSAA off once post exists. | Low–medium | Low | Render scale costs fill rate; it is an option, not a default | Excellent |

Deliberately not proposed: full 2D radiance cascades or global illumination (impressive, expensive, and hard to read on a phone), reflections of the scene in the water surface (barely visible in this side view), WebGPU.

## 5. Development plan

Four sessions, each independently playable and testable, each touching rendering only. Gameplay files (`src/game/`, rules in the frame loop) are left alone except where a light or shadow list has to be read.

**Rules for every graphics session**

- Read DESIGN.md, PROGRESS.md and this file first.
- Every new effect has a preset value for High and Ultra, and a **Settings toggle** while it is new, so Colin can compare on and off on his own screen.
- Run the **benchmark route** before and after, on the cloud browser (for correctness and relative CPU cost only) and ask Colin for his PC and iPhone numbers. Record both in PROGRESS.md.
- **Budgets:** Ultra stays at or above today's frame rate at 2560 × 1360 and aims for a GPU time under about 5 ms there (headroom for 4K). High must not get slower in the grotto than today (Colin's mid-30s); any High effect that costs more than about 10% on the iPhone is cut from High and noted in PROGRESS.md.
- **Readability:** HUD and world overlays are drawn after post; bloom, fog and grading never hide pickups, the lurker's warning flare, collect rings or build ghosts. Creature glow stays warm; cyan, violet and magenta stay the Choir's.
- Screenshots of the same fixed scenes before and after, saved to `docs/art/fidelity/`.

### Session G1: measure, then HDR and the post stack

**Built 2026-11-17** (see PROGRESS.md, "Graphics session G1"). The plan below is what was asked for; what shipped is in PROGRESS.md, including the benchmark tables (cloud numbers are relative only) and Colin's PC and iPhone numbers once he sends them.

1. **Dev performance overlay** (Settings → "Show performance", off by default): CPU update and render ms, GPU ms per pass (timer queries where supported), draw calls, light count, resolution.
2. **Benchmark route** (`?bench` in the URL): fixed scenes, about 8 s each: shallows at the buoy, basin with a seeded big base, grotto with the lamp on, kelp forest, kelp caves black chamber, wreck shelf by the Corvina, and the base interior with its ceiling lines. It prints a table Colin can copy.
3. **Baseline numbers** recorded in PROGRESS.md (Colin's PC and iPhone).
4. **Cheap wins:** caustics early-out where invisible; canvas MSAA off once the final pass is a full-screen quad.
5. **HDR target and post pass:** lighting and emissives write to a half-float target (with an RGBA8 fallback if the iPhone cannot render to half-float; checked on the device), then filmic tone mapping, per-zone grading (shallows warm and clear, basin cool, forest green and dim, shelf grey-teal, caves near black), threshold bloom with a mip chain (the `glowCam` layer feeds it, so existing glows keep their look), vignette in the shader (the CSS one removed), grain. Interiors get the same post pass.
6. **Test:** the benchmark, screenshots of every scene, phone layout, toggles.

Expected result: the lamp and lures stop clipping, highlights roll off softly, every zone gets its own colour mood, and bright things glow naturally. Expected cost: small on both presets; the caustics early-out may pay for it in deep scenes.

### Session G2: light with form and shadow

**Built 2026-11-17** (see PROGRESS.md, "Graphics session G2"). Contact shadows are drawn from the diver, sub, drone and base pieces (not yet creatures); relief lighting is the art-derived normals described below.

1. **Occupancy bake** of the world (rock, cave field, the Corvina, wrecks) next to the sky bake, plus the interior tile map as its own occupancy texture.
2. **Shadowed lights:** the lamp, the sub's floodlights and other large lights march toward their source (Ultra), lamp only and fewer steps on High. The visible beam stops at walls, so the cone shows real shafts between pillars and around rocks.
3. **2.5D normals** from the art (bevel from coverage, bumps from brightness): directional shading from the sun and from each light, rim light, caustics on up-facing surfaces only.
4. **Contact shadows** for base pieces, sub, drone and creatures (generalising the diver's), on Ultra and High.
5. **Test:** benchmark (the grotto and black chamber are the stress scenes), before/after screenshots, readability check in the dark caves.

Expected result: the biggest change in the dark zones: rocks and hardware get volume, the lamp feels physical. Expected cost: the main new GPU cost of the initiative, concentrated inside the lamp cone; this is where the High values will be tuned on the iPhone.

### Session G3: atmosphere and composition

**Built 2026-11-17** (see PROGRESS.md, "Graphics session G3" for what shipped and what was left out).

1. **Zone backdrops:** per-zone mid-ground silhouettes drawn by code and cached to textures, with in-layer fog gradients; the forest gets distant kelp ranks, the shelf distant hulks and masts, the basin arches and boulders, the caves rock pillars.
2. **Depth of field** on the near foreground kelp (Ultra; High keeps it sharp or uses a cheaper blur).
3. **God rays** from the surface, blocked by kelp, hardware and the diver (¼ res).
4. **Lit particles:** marine snow catches the lamp and lures; a sparse near layer of larger, out-of-focus specks; forward scattering in the beam.
5. **Caustic shimmer** in the water just under the surface.
6. **Test:** benchmark, screenshots, readability (backdrop silhouettes must not look like solid, swimmable rock).

Expected result: the scenes get depth and mood; the kelp forest and shelf look like places rather than strips. Expected cost: low; mostly cached textures and low-resolution passes.

### Session G4 (optional, after Colin sees G1–G3): materials and life

**Built 2026-11-17** (see PROGRESS.md, "Graphics session G4" for what shipped and what was left out).

1. **Painterly grain and grime** anchored to the world (so it never swims), stronger on hardware than on water.
2. **Shine layer** for chrome, brass and glass (a few lines per drawing in `basegfx.ts`, `diver.ts`, `walker.ts`, `sub.ts`, `drone.ts`), lit by the G2 normals: highlights travel across flanges as the lamp moves.
3. **Glass:** dome and tank glass refract what is behind them and carry a slow reflection streak.
4. **Creatures:** lamp eye-shine, undulation and fin flutter for the longer species, more bioluminescent detail toward the shelf.
5. **Optional render scale** on Ultra (supersampling) if the benchmark leaves headroom.

Expected result: hardware reads as heavy, weathered metal and glass, close to the concept boards. Expected cost: low.

## 6. Expected improvements and trade-offs

| Session | What Colin should see | Cost on PC (Ultra) | Cost on iPhone (High) | Risk |
| --- | --- | --- | --- | --- |
| G1 | No more clipped lamp blobs; softer highlights; zone colour moods; natural bloom; benchmark numbers | Small | Small, possibly offset by the caustics fix | Half-float targets on iOS (fallback planned) |
| G2 | Rocks and hardware with volume; lamp shadows and beams stopping at walls; things sitting on the seabed | The largest of the four, inside lit areas | Moderate; tuned or reduced on High | Too-dark caves hurting readability (tunable ambient) |
| G3 | Deeper, layered scenes with zone character; light shafts cut by kelp; snow sparkling in the lamp | Low | Low (DOF and some layers Ultra only) | Backdrop clutter; kept faint and fogged |
| G4 | Metal, brass and glass that look like materials; livelier creatures | Low | Low | Touches drawing code in several files; done after the look is approved |

Order: the walkable base part 2 was finished in a parallel session, so G1 runs next, before milestone 9. Colin decides G2–G4 and their order against gameplay milestones after seeing each result.
