# Fathomlight development handoff

Read [Design](../DESIGN.md) for the creative constraints, [Progress](../PROGRESS.md) for the shipped history, and the [Phase 12 audit](phase-12-progression-audit.md) for route dependencies and spoilers. Treat source, tests, and the live branch as the evidence for current behavior. Old milestone prompts in `docs/prompts/` explain historical choices.

## The game and current branch

Fathomlight is a single-player 2D underwater exploration, base-building and creature-care game. Kestrel is the compact salvage diver. The opening is small and approachable. The route expands from Sunlit Shallows and the basin through the Kelp Forest, Wreck Shelf and trench to the Choir. The player should make connections through observed behavior, scans, tool use and revisits. Keep calm spaces, hazards, and deliberate moments of discovery. Use the existing log and contextual actions for guidance.

The repository default is `claude/underwater-game-m0-0qqajg`. Phase 12 gameplay is local on `codex/phase-12-gameplay-progression`, based on `78c8bb3`. The preceding live change adds the Fulmar comms-spool foothold. Merging to the live branch starts the [GitHub Pages workflow](../.github/workflows/deploy.yml). Publish or merge only when Colin requests it.

## Source map

| Concern | Where to start |
| --- | --- |
| Main loop, progression gates, route interactions, saves on state transitions | [main.ts](../src/main.ts), [terrain.ts](../src/world/terrain.ts), [pickups.ts](../src/world/pickups.ts), [state.ts](../src/game/state.ts) |
| Lab, Workshop, KS-1, inventory and automation | [gear.ts](../src/game/gear.ts), [sub.ts](../src/game/sub.ts), [station.ts](../src/ui/station.ts), [dock.ts](../src/ui/dock.ts), [base.ts](../src/game/base.ts), [factory.ts](../src/game/factory.ts) |
| Scans, log, creature gates, spools and endgame | [scanner.ts](../src/game/scanner.ts), [discovery.ts](../src/game/discovery.ts), [hud.ts](../src/ui/hud.ts), [signals.ts](../src/game/signals.ts), [zonemap.ts](../src/ui/zonemap.ts), [contact.ts](../src/ui/contact.ts) |
| Movement, controls and character poses | [input.ts](../src/input.ts), [diver.ts](../src/actors/diver.ts), [walker.ts](../src/actors/walker.ts), [interior.ts](../src/interior/interior.ts). Physics and control states drive the rigs. World positions and orientations should remain stable when rendering changes. |
| Wildlife and care | [wildlife.ts](../src/world/wildlife.ts), [critters.ts](../src/actors/critters.ts), [shoreCreatureRigs.ts](../src/actors/shoreCreatureRigs.ts), [creatures.ts](../src/game/creatures.ts), [traits.ts](../src/game/traits.ts), [tanklife.ts](../src/world/tanklife.ts), [care.ts](../src/ui/care.ts), [hatch.ts](../src/ui/hatch.ts). Shared creature art serves both world and tank. |
| Base rendering and interior interactions | [basegfx.ts](../src/world/basegfx.ts), [baselevel.ts](../src/interior/baselevel.ts), [housingHull.ts](../src/interior/housingHull.ts), [housingSea.ts](../src/interior/housingSea.ts), [habitatWater.ts](../src/world/habitatWater.ts). Constructed modules determine the hull cutaway. The interior tile map remains authoritative for collision, traversal and spacing. |
| Art and compositor | [worldArt.ts](../src/art/worldArt.ts), [zonebackdrop.ts](../src/scene/zonebackdrop.ts), [lighting.ts](../src/fx/lighting.ts), [post.ts](../src/fx/post.ts), [presets.ts](../src/presets.ts). PixiJS draws world, emissive and glow layers into the lighting/post pipeline. Dry interiors use their own scene target and can sample the registered ocean. Ultra targets native-resolution presentation; resolution can still adapt with settings. |
| Living Water | [waterMotion.ts](../src/scene/waterMotion.ts), [water.ts](../src/scene/water.ts), [waterWake.ts](../src/fx/waterWake.ts), [surface.ts](../src/fx/surface.ts). Motion is shared by visual consumers. Keep wakes and impulses bounded and separate from swimming physics. |

## Behavior and compatibility

- Save schema is version 1 under `fathomlight.save.v1` in browser local storage. The loader fills older fields and runs legacy layout migrations. Save export/import and backups are in [state.ts](../src/game/state.ts). Phase 12 adds only keys in the existing `tips` list for learned hints. Completed gates, opened locks, progress counters and gear ownership retain their original fields.
- The snail–cleft path leads to PS-2 and a spool. The crab–strongbox path leads to optional revival. A grown glowfin lights the separate lightless grotto. Keep these routes distinct. Habitat care gates growth and breeding. Wild recapture restores up to a living founding pair when the earlier quota has been reached. Dormant founders do not count against that pair. The Signal array counts distinct species/pattern pairs in grown tank animals, including bred patterns as required.
- With living bases, tank rooms (`tank`, `gtank`) are a single floor: one tall aquarium, one Habitat console with its HABITAT sign. `buildBaseLevel` omits their mezzanine and ladder, and `?bases=original` keeps them. Care and Hatchery panel buttons share one style in `src/style.css`. Give a button `disabled`, a label that says why and a `title`, rather than leaving it enabled and only toasting a refusal.
- Use safety ratings for the diver and sub independently. The voluntary exit warning uses the actual candidate hatch exit and arms a second press for four seconds. Powered dock exits lead into the base. Emergency ejection and pressure damage still use their own existing paths.
- Mag-boots now brace near the seabed while holding Down. Sideways movement becomes slower and more precise, and upward vent flow is canceled while planted. Releasing Down, climbing away or boosting restores normal swimming. The race grapple and the flow vane remain available and the sub can cross above the vane.
- `?art=procedural` disables the Shallows pilot. `terrain`, `kelp`, `forest`, `forestTerrain`, `shelf`, and `worldArt` each have a procedural comparison. Phase 4A face and 4B suit flags belong to the legacy rig available with `?character=original`. `?character=phase9` selects the earlier redesign. `?personality=surface` enables the surfacing reaction, on by default.
- `?water=original`, `?creatures=original`, `?bases=original`, `?housingOcean=original`, `?panorama=original`, `?housingSurround=original`, `?housingHull=original` and `?render=original` select comparison paths. Housing switches are nested in that order from `bases` through `housingHull`. See [the game entry point](../src/main.ts) for how flags interact.

## Working and testing

Use Node 22, matching CI. From the repository root run `npm ci`, `npm run dev`, `npm run typecheck`, and `npm run build`. Vite serves the local game on port 5173 by default and can serve a same-network phone. `?notitle` skips the title for browser tests. `?bench` and the benchmark presets are documented in [bench.ts](../src/dev/bench.ts). Check ordinary play with the HUD and zoom visible as well as internal state. For screenshots compare the same display size, quality, zoom and camera. Use a separate browser profile for playtesting and legacy saves.

Run [`node scripts/test-progression.mjs`](../scripts/test-progression.mjs) for the Sanctum collision, staged discovery, founder recovery, and solitary habitat growth checks. Browser checkpoints use ordinary controls with specific gear, positions or saves as fixtures. The uninterrupted fresh-save route is still open for validation.

Start new work from the latest merged default. Keep real player profiles separate from fixture saves. Validate control inputs and actual interactions in the browser, then typecheck and build. For fixtures, document any seeded gear, resources, positions or elapsed simulation time. Commit related work together. Do not publish, merge, or deploy a local review branch without authorization.

## Next priorities

1. Run an uninterrupted new-save progression playthrough, especially early material economy, base construction and crafting, both environmental puzzles, Fulmar, and the Signal array to first contact.
2. Try the boots with a controller and touch in the race and the vents. Check whether the hold-to-brace reads before considering additional optional routes.
3. Validate the legacy recovery routes and long-running breeding economy with sparse habitats and a low-power base. The desktop wrapper remains deferred.
