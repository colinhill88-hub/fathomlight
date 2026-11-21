# Fathomlight development handoff

This handoff is for **any AI coding tool** working on Fathomlight: Claude Code, OpenAI Codex/GPT, or anything else. Colin may switch tools when one runs out of usage, so it assumes no memory of earlier sessions. Everything a new session needs is in this repository.

**Start here, in this order:**
1. This file: the source map, rules and workflow.
2. [Roadmap](ROADMAP.md): what to build next, Colin's latest decisions, and ideas he has agreed to but that aren't built yet.
3. [Design](../DESIGN.md): the creative brief and the rules every change must respect.
4. [Progress](../PROGRESS.md): what has shipped. Its top section is the current state.

Read [Design](../DESIGN.md) for the creative constraints, [Progress](../PROGRESS.md) for the shipped history, the [Phase 12 audit](phase-12-progression-audit.md) for route dependencies and spoilers, and the [Phase 13 audit](phase-13-gameplay-audit.md) for the control helper, the drill's exact status and playtest coverage, and the [Phase 14 notes](phase-14-reward-moments.md) for reward moments. Treat source, tests, and the live branch as the evidence for current behavior. Old milestone prompts in `docs/prompts/` explain historical choices.

## The game and current branch

Fathomlight is a single-player 2D underwater exploration, base-building and creature-care game. Kestrel is the compact salvage diver. The opening is small and approachable. The route expands from Sunlit Shallows and the basin through the Kelp Forest, Wreck Shelf and trench to the Choir. The player should make connections through observed behavior, scans, tool use and revisits. Keep calm spaces, hazards, and deliberate moments of discovery. Use the existing log and contextual actions for guidance.

The repository default (live) branch is `claude/underwater-game-m0-0qqajg`. Phases 12, 13 (PR #35), 14 (reward moments, PR #36) and 15 (jar release, Field kit, sonar control bar, PR #38) are all merged into it. The next work is Phase 16 in the [roadmap](ROADMAP.md). Merging to the live branch starts the [GitHub Pages workflow](../.github/workflows/deploy.yml). Publish or merge only when Colin requests it.

## Source map

| Concern | Where to start |
| --- | --- |
| Main loop, progression gates, route interactions, saves on state transitions | [main.ts](../src/main.ts), [terrain.ts](../src/world/terrain.ts), [pickups.ts](../src/world/pickups.ts), [state.ts](../src/game/state.ts) |
| Lab, Workshop, KS-1, inventory and automation | [gear.ts](../src/game/gear.ts), [sub.ts](../src/game/sub.ts), [station.ts](../src/ui/station.ts), [dock.ts](../src/ui/dock.ts), [base.ts](../src/game/base.ts), [factory.ts](../src/game/factory.ts) |
| Scans, log, creature gates, spools and endgame | [scanner.ts](../src/game/scanner.ts), [discovery.ts](../src/game/discovery.ts), [hud.ts](../src/ui/hud.ts), [signals.ts](../src/game/signals.ts), [zonemap.ts](../src/ui/zonemap.ts), [contact.ts](../src/ui/contact.ts) |
| Key bindings and the control helper (Phase 13) | [bindings.ts](../src/controls/bindings.ts) is the only place keys, mouse and pad buttons are decided; [controlHelper.ts](../src/ui/controlHelper.ts) reads it plus the HUD's `collectOffer`, `scanOffer` and `boardOffer` (set by `hud.setCollect`, `setScanTarget`, `setBoard`). Pass `info = true` to `setCollect` for explanations so they are not offered as actions. `helperFrame()` in main.ts builds the context. |
| Reward moments (Phase 14) | [reward.ts](../src/ui/reward.ts) (minor/notable/major tiers, emblems, particles, slow motion), [rewardSpecs.ts](../src/ui/rewardSpecs.ts) (wording and icons), [stings.ts](../src/audio/stings.ts) (riser, slam, fanfare). Call `grant(spec)` in main.ts; see the [Phase 14 notes](phase-14-reward-moments.md). While a major card is up, the toast wrapper holds non-warning notices and `reward.timeScale()` slows the world. |
| Jar release and the Field kit (Phase 15) | `releaseFromJar()` in [creatures.ts](../src/game/creatures.ts) is the rule (Node-tested), and `releaseFromJar()` in main.ts adds the named-creature confirmation, the sound and the world respawn. The `release` (J, d-pad left) and `kit` (I, View) actions are in bindings.ts. [fieldkit.ts](../src/ui/fieldkit.ts) builds the pause screen and the code-drawn portrait; the ticker holds the world while `fieldKit.open`. The control bar's look is the `skin-sonar` rules at the end of style.css. Its new-offer ping is `ControlHelper.onOffer` → `sound.offerPing()`, which plays on the music zone's root (`zoneRoot` in music.ts). |
| Sound (Phase 16) | [engine.ts](../src/audio/engine.ts) (buses, speaker mix, the sea reverb and the indoor `room`, the ambience `hull` filter, `sample()` for CC0 files), [director.ts](../src/audio/director.ts) (every cue; `workHit` strokes build with `workProgress`, `pickup` is each material's release, `workStart` and `holdDone` (called by main.ts when a hold completes) for hold actions, the drill loop, footsteps), [variety.ts](../src/audio/variety.ts) (`rr` round-robin, `jit`), [samples.ts](../src/audio/samples.ts) (the CC0 file list, empty so far), [ambience.ts](../src/audio/ambience.ts), [music.ts](../src/audio/music.ts), [stings.ts](../src/audio/stings.ts). The cue inventory and listening guide: [phase-16-audio-audit.md](phase-16-audio-audit.md). Log any sound file in [`public/audio/CREDITS.md`](../public/audio/CREDITS.md). `__fathom.audioPeak()` reads the output's peak for clipping checks. |
| The jar and satchel | `jarRoom()`, `putInJar()`, `takeFromJar()` and `releaseFromJar()` in [creatures.ts](../src/game/creatures.ts) are the only rules for the two slots; care.ts, hatch.ts and main.ts use them. |
| Drill lodes (Phase 13) | [game/lodes.ts](../src/game/lodes.ts) (data, regrow; Node-testable), [world/lodes.ts](../src/world/lodes.ts) (art), `drillLode()` and the drill block in `gearFrame()` in main.ts. |
| Movement, controls and character poses | [input.ts](../src/input.ts), [diver.ts](../src/actors/diver.ts), [walker.ts](../src/actors/walker.ts), [interior.ts](../src/interior/interior.ts). Physics and control states drive the rigs. World positions and orientations should remain stable when rendering changes. |
| Wildlife and care | [wildlife.ts](../src/world/wildlife.ts), [critters.ts](../src/actors/critters.ts), [shoreCreatureRigs.ts](../src/actors/shoreCreatureRigs.ts), [creatures.ts](../src/game/creatures.ts), [traits.ts](../src/game/traits.ts), [tanklife.ts](../src/world/tanklife.ts), [care.ts](../src/ui/care.ts), [hatch.ts](../src/ui/hatch.ts). Shared creature art serves both world and tank. |
| Base rendering and interior interactions | [basegfx.ts](../src/world/basegfx.ts), [baselevel.ts](../src/interior/baselevel.ts), [housingHull.ts](../src/interior/housingHull.ts), [housingSea.ts](../src/interior/housingSea.ts), [habitatWater.ts](../src/world/habitatWater.ts). Constructed modules determine the hull cutaway. The interior tile map remains authoritative for collision, traversal and spacing. |
| Art and compositor | [worldArt.ts](../src/art/worldArt.ts), [zonebackdrop.ts](../src/scene/zonebackdrop.ts), [lighting.ts](../src/fx/lighting.ts), [post.ts](../src/fx/post.ts), [presets.ts](../src/presets.ts). PixiJS draws world, emissive and glow layers into the lighting/post pipeline. Dry interiors use their own scene target and can sample the registered ocean. Ultra targets native-resolution presentation; resolution can still adapt with settings. |
| Living Water | [waterMotion.ts](../src/scene/waterMotion.ts), [water.ts](../src/scene/water.ts), [waterWake.ts](../src/fx/waterWake.ts), [surface.ts](../src/fx/surface.ts). Motion is shared by visual consumers. Keep wakes and impulses bounded and separate from swimming physics. |

## Behavior and compatibility

- Save schema is version 1 under `fathomlight.save.v1` in browser local storage. The loader fills older fields and runs legacy layout migrations. Save export/import and backups are in [state.ts](../src/game/state.ts). Phase 12 adds only keys in the existing `tips` list for learned hints. Phase 13 adds the optional `lodes` (lode id → play seconds when drilled) and `lodeNotes` (ids whose first-drill bonus was given); both default to empty. Creature names are derived from ids, not saved. Device-local keys: `fathomlight.controlHelper`, `fathomlight.bindings`. Completed gates, opened locks, progress counters and gear ownership retain their original fields.
- The snail–cleft path leads to PS-2 and a spool. The crab–strongbox path leads to optional revival. A grown glowfin lights the separate lightless grotto. Keep these routes distinct. Habitat care gates growth and breeding. Wild recapture restores up to a living founding pair when the earlier quota has been reached. Dormant founders do not count against that pair. The Signal array counts distinct species/pattern pairs in grown tank animals, including bred patterns as required.
- With living bases, tank rooms (`tank`, `gtank`) are a single floor: one tall aquarium, one Habitat console with its HABITAT sign. `buildBaseLevel` omits their mezzanine and ladder, and `?bases=original` keeps them. Care and Hatchery panel buttons share one style in `src/style.css`. Give a button `disabled`, a label that says why and a `title`, rather than leaving it enabled and only toasting a refusal.
- Phase 14 records each KS-1 module's first fit in `tips` as `fit:<module>` so its reward card plays once. It adds no other save fields.
- Use safety ratings for the diver and sub independently. The voluntary exit warning uses the actual candidate hatch exit and arms a second press for four seconds. Powered dock exits lead into the base. Emergency ejection and pressure damage still use their own existing paths.
- Mag-boots now brace near the seabed while holding Down. Sideways movement becomes slower and more precise, and upward vent flow is canceled while planted. Releasing Down, climbing away or boosting restores normal swimming. The race grapple and the flow vane remain available and the sub can cross above the vane.
- `?art=procedural` disables the Shallows pilot. `terrain`, `kelp`, `forest`, `forestTerrain`, `shelf`, and `worldArt` each have a procedural comparison. Phase 4A face and 4B suit flags belong to the legacy rig available with `?character=original`. `?character=phase9` selects the earlier redesign. `?personality=surface` enables the surfacing reaction, on by default.
- `?water=original`, `?creatures=original`, `?bases=original`, `?housingOcean=original`, `?panorama=original`, `?housingSurround=original`, `?housingHull=original` and `?render=original` select comparison paths. Housing switches are nested in that order from `bases` through `housingHull`. See [the game entry point](../src/main.ts) for how flags interact.

## Working and testing

Use Node 22, matching CI. From the repository root run `npm ci`, `npm run dev`, `npm run typecheck`, and `npm run build`. Vite serves the local game on port 5173 by default and can serve a same-network phone. `?notitle` skips the title for browser tests. `?bench` and the benchmark presets are documented in [bench.ts](../src/dev/bench.ts). Check ordinary play with the HUD and zoom visible as well as internal state. For screenshots compare the same display size, quality, zoom and camera. Use a separate browser profile for playtesting and legacy saves.

Run [`node scripts/test-progression.mjs`](../scripts/test-progression.mjs) for the Sanctum collision, staged discovery, founder recovery, solitary habitat growth, control-helper rows, binding overrides, drill lodes and creature-name checks. **Browser automation:** test against `vite build` + `vite preview`, not `vite dev` (HMR reloads the page on every source edit). The headless SwiftShader GPU runs the game at 3–5 FPS and the frame step is capped at 50 ms, so game time is about 20% of wall time; wait on `__fathom.save.playSeconds`, not wall clock. `__fathom.groundY`, `__fathom.seedBase(save)` and `__fathom.helper` support fixtures. Browser checkpoints use ordinary controls with specific gear, positions or saves as fixtures. The uninterrupted fresh-save route is still open for validation.

Start new work from the latest merged default. Keep real player profiles separate from fixture saves. Validate control inputs and actual interactions in the browser, then typecheck and build. For fixtures, document any seeded gear, resources, positions or elapsed simulation time. Commit related work together. Do not publish, merge, or deploy a local review branch without authorization.

## Rules for every session, whichever tool you are

- **Colin is not a programmer.** Explain choices in plain language. When something in DESIGN.md is unclear or a decision is his (names, costs, feel, which option), ask him before building. Note his answers in the docs, as the roadmap's "Colin's decisions" section does.
- **Art is drawn by code.** Use no image files unless Colin supplies them. **Audio may now use sound files** (decided Nov 21, 2026), but only public-domain or CC0 files. Bundle them in the build and log each one in `public/audio/CREDITS.md`. The [roadmap](ROADMAP.md) has the full rules.
- **Originality:** no trademarked names, and no copying of any other game's or film's characters, creatures, vehicles, music or levels. Reference games (Zelda, Ori, Hearthstone, Satisfactory, Subnautica) are inspiration for *feel*, never for content.
- **Colour rule:** cyan, violet and magenta belong only to the Choir.
- **Saves:** schema v1 under `fathomlight.save.v1` (see "Behavior and compatibility" above). New fields must be optional with safe defaults. Never break an existing save.
- **Bindings:** keys, mouse and pad buttons are decided only in `src/controls/bindings.ts`. The control helper reads them from there.
- **Rewards:** any new unlock, upgrade or solved puzzle should call `grant(...)` in `main.ts` with a tier that matches its weight (Phase 14).
- **Branches and publishing:** start from the latest default branch. Work on a feature branch and open a pull request. Merging deploys to GitHub Pages, so never merge or deploy unless Colin asks. Commit related work together.
- **Before finishing:** run `npm run typecheck`, `npm run build` and `node scripts/test-progression.mjs`. Check the change in the browser with real input (see "Working and testing" above). Then update the docs:
  - **PROGRESS.md:** what shipped, how it was checked, and what still needs Colin's hands.
  - **ROADMAP.md:** mark finished items done; never delete them.
  - **This file:** the source map and anything a newcomer must know.
  - **DESIGN.md:** new creative decisions.
- **Say what you did not test.** The headless browser can't hear audio or judge feel. Give Colin exact steps to check it on his iPhone and PC.

## Next priorities

See the [roadmap](ROADMAP.md) for the full plan. In short:

1. **Phase 15** is merged (PR #38). **Phase 16 round 1** (the satchel fix and the first audio pass) is on a review branch waiting for Colin's ears; see the [audit](phase-16-audio-audit.md).
2. **Phase 16 round 2:** tune from Colin's listening notes, then fetch the shortlisted CC0 files once the environment's network allows the sound libraries (kenney.nl, freesound.org, opengameart.org).
3. **Then design with Colin:** songs Kestrel plays on the resonator, a climax at each major site, movement flow, a goal board, and maps of major sites.

Validation that is still open:

1. Run an uninterrupted new-save progression playthrough on real hardware (Phase 13 covered the opening with real input and the rest by fixtures), especially early material economy, base construction and crafting, both environmental puzzles, Fulmar, and the Signal array to first contact.
2. Try the boots with a controller and touch in the race and the vents. Check whether the hold-to-brace reads before considering additional optional routes.
3. Tune the Phase 14 reward moments by ear on the iPhone and with a controller (pad buttons do not yet dismiss a major card).
4. Validate the legacy recovery routes and long-running breeding economy with sparse habitats and a low-power base. The desktop wrapper remains deferred.
