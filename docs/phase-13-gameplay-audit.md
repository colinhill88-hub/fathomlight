# Phase 13 gameplay audit

Phase 13 follows the Phase 12 progression pass, which merged as `c06d46d` on the default branch `claude/underwater-game-m0-0qqajg`. It reviews the game for play rather than graphics. The phase adds a contextual control helper, gives KS-1's drill nose a lasting job, and names kept creatures. The development branch is `claude/kind-keller-x7l9pw`. It merged into the default branch as PR #35 (`d9f4728`).

This document separates what was **verified** (in the browser with real input, or by the regression script) from what was **code-derived** (read from source but not played) and from what is only **proposed**.

## 1. Critical path (code-derived, unchanged by Phase 13)

| Stage | Gate | How it is satisfied |
| --- | --- | --- |
| Shallows | Drone, jar, thruster, first materials | Survey wreckage east of the basin. The KD-1 repair costs 2 scrap, 1 copper and 1 fibre. |
| Base | A powered base with storage, Lab and Workshop | KD-1 welds frames. The Workshop needs hull plating from a Plate press. |
| East cliff | Dive light | Decode the SLED 2 recorder (Lab), then fabricate it (Workshop). |
| Kelp caves | Cutter torch | Lumen moss on four brackets, the cutter cache, then fabrication. |
| Hatchery | Nursery log | Found behind the kelp wall. Cut the wall with the torch. |
| Shelf race | Grapple line | Tow-line notes. The flow vane then calms the sub's route. |
| Corvina | Cutter + grapple + two breakers | Gives the sonar data and PS-1 plans. |
| Trench | PS-1, then a grown cinder snail | The snail grazes the sealed chimney. The cleft holds the PS-2 plans and a spool. |
| Fulmar | PS-2, three breakers | Two spools and the resonator plans. |
| Signal array | 4 spools, and 2/4/6/8 distinct species × glow patterns among grown tank animals (1/2 bred) | Breeding in a powered Hatchery. |
| Sanctum | Resonator (after all four fragments) | Opens the floor door and two song-locks. Contact happens in the Heart. |

Optional routes: the strongbox (grown tinker crab), which leads to the Revival pool; the lightless grotto (grown glowfin), which holds blooms; the sonar's hidden room; the drill seam; and, new in Phase 13, the drill lodes. Phase 13 changes no existing gate, flag or geometry.

## 2. Playthrough coverage, stated plainly

**The headless test machine runs the game at 3–5 frames per second.** It renders with SwiftShader, a software GPU, and the frame step is capped at 50 ms, so game time passes at about 20% of wall time. Turning every effect off and shrinking the viewport to 640×360 still gives about 5 FPS. The GPU raster cost is fixed per frame, so a continuous real-input run to the ending was not practical. **This phase does not claim a complete fresh-save playthrough.**

| Segment | How it was covered |
| --- | --- |
| Fresh save → basin → shallows → SLED 2 recorder → sled wreck / KD-1 → survey beacon | **Played continuously with real keyboard input** (an autopilot pressing WASD, holding C and E, surfacing for air). It ran about 11 minutes of wall time, roughly 5–7 minutes of game time. 12 scans were completed, scrap was pried and the recorder was unclipped. The KD-1 repair correctly refused with the missing materials listed. The pilot steered over the jar and the TH-1 thruster without collecting them, because they lie within 72 units of the floor and its waypoints ran 70 units above it. That is a pilot limit, not a game fault. |
| Drill lode (kelp forest) | **Fixture save** (KS-1 built with the drill fitted, placed over the lode), then **real C hold**. Label "Drill the kelp forest lode", +3 copper and +1 quartz on the first drill, then "Lode resealing · ready in about 10 min". |
| Base on foot (bench-seeded base, entered through the `enterBase` test hook) | **Real A/D/Space input** walking the base. The helper showed "C hold · Go out through the airlock", walk/jump/sprint/lamp and zoom. Info-only console labels (for example "CT-1: turning in the reef current…") were correctly *not* advertised as actions. |
| Ladders, the airlock, zoom, gamepad, build mode and preferences | **Real input on fixture saves.** Walking past a ladder adds "W S Climb". Holding C at the airlock leaves the base, and the helper switches to swimming at once ("C hold · Dig out copper nodule", "B Build", "H Send KD-1 home"). The wheel zooms the base view (1.00 → 1.49) and open water (view height 640 → 952). A gamepad shows "X hold · Go out through the airlock", "LS ↔ Walk", "A Jump", "LB hold Sprint" and "Y Lamp". B opens build mode with Pan, Place, Rotate, Zoom, Fit view and Done. Pause → Settings → Control helper stores the choice. Hide removes the bar and restores the corner labels. |
| Later stages (Corvina, trench, Fulmar, Signal array, Sanctum) | **Not played in Phase 13.** Their dependencies are code-derived and covered by the existing regression checks (Sanctum collision, staged creature-site hints, founder recovery, habitat growth). |

The autopilot lives outside the repository. To reproduce it, use Playwright against `vite preview`, never against `vite dev`: the dev server hot-reloads the page whenever a source file changes, which killed the first run mid-route.

## 3. Major problems found

1. **No in-game way to recall the controls.** The only reference was a static, hard-coded key line (`#hint`) that faded after 2.5 s of swimming and listed keys that could drift from the code. Contextual actions showed only as a small corner label. The key bindings were scattered across seven files.
2. **The submarine drill had exactly one use.** See section 5.
3. **Explanations were shown like actions.** Refusals and needs ("Repair drone: need 1 copper", "Unknown creature: scan it first", "Dive bag full", console status lines) went through the same Collect prompt as real actions. A helper reading that prompt would have advertised "hold C" for something that does nothing.
4. **The drill seam used its own banner** instead of the Collect label, unlike every other interaction. Its banner was also not cleared when the sub moved away from the seam.
5. **Late-game vent ore is scarce.** PS-2 needs 8 vent ore, the resonator 6, the drill 2 and the cowl 3. The wild source is eight ledge spots that take ten minutes to regrow, plus grown cinder snails. The drill lodes now add a repeatable source on the trench ledge and floor.
6. **Kept creatures were anonymous.** Toasts said "The tinker crab in tank 2…". Phase 12 asked for creatures to feel like individuals, not keys.
7. **Found and fixed during validation:** build mode briefly showed a stale "Dig out copper nodule" offer left over from swimming. Build mode now shows only build controls.
8. **(Test environment) Vite HMR and software rendering** make naive browser playtests misleading. A "scan that never finishes" was really the game running at 4 FPS.

## 4. Changes implemented

### Contextual control helper (verified)

- `src/controls/bindings.ts` is the single source of keyboard, mouse and gamepad bindings. `Input`, build mode, the Tend/Dock/Lab/mute shortcuts and zoom all read it. `setKeys`, `setPad` and `resetBindings` persist per-device overrides under `fathomlight.bindings`. No remapping screen exists yet, but every consumer, the helper included, already follows an override (tested).
- `src/ui/controlHelper.ts` draws a translucent bar of keycaps along the bottom edge. It has modes for swimming, KS-1, on foot, ladder, grapple swing and build. World offers come first in brass-edged caps that pulse once when new: Collect (labelled with the actual action), Board/Exit, Scan, Tend, Dock, Lab, Build and the mag-boots brace. The movement set appears when the situation changes and after about 4 s idle, then fades during play.
- Settings → Control helper: **Contextual hints** (the default), **Always show** (dims during long uninterrupted play), or **Hide**. Stored under `fathomlight.controlHelper`.
- Gamepad: once a pad is used, the caps switch to LS, A/B/X/Y, LB/RB/LT/RT and the d-pad, and actions with no pad button are dropped. Touch keeps its own on-screen buttons and the helper stays hidden.
- While the helper is on, it replaces the desktop `#hint` key line and the duplicate bottom-right Collect/Scan labels. With the helper hidden, the corner labels return.
- The real bindings, which the helper shows faithfully: WASD or arrows to move; Shift or Space to boost (on foot, Space jumps and Shift sprints); **L or F for the lamp**; E or Q to scan; **hold C or R for Collect/interact**; V to board or exit KS-1; Z flare; X dart; H to send KD-1 home; B build; T tend; G dock; K Lab/Workshop; wheel or -/= to zoom; M mute; Esc menu. F is the lamp, not "interact", so the brief's examples were corrected to match the code.

### Drill nose (verified for the kelp forest lode; the other lodes are covered by the regression checks)

See section 5.

### Collect prompts

`hud.setCollect(label, progress, tap, info)` marks explanations, as does the interior's `labelInfo`. Explanations still show their text but are never offered as a key action.

### Named creatures (regression-checked)

`creatureName()` in `src/game/creatures.ts` derives a stable name from the creature's id and species. Nothing is saved and existing saves get names automatically. Names appear on the care panel tabs and header, the jar chip, grown/sick/better/dormant toasts, jar and release messages, and at the two creature-assisted sites ("Let Bramble pick the lock").

## 5. The submarine drill: exact status

| Question | Answer (verified in source and, where noted, in play) |
| --- | --- |
| Is it implemented? | **Yes.** Module `drill` (DN-S) in `src/game/sub.ts`. The art is a spinning chrome cone in `src/actors/sub.ts`, with sparks in `gearfx.ts` and sound in `director.drill()`. |
| Can the player unlock, equip and activate it? | **Yes.** Scan the trench and the crushed FULMAR DP-2 probe (27880 on the trench rim), decode "Drill nose DN-S" at a Lab (90 s), then fit it at a Moon pool dock for 4 brass, 4 hull plating and 2 vent ore. It is always active once fitted. |
| Controls | **Hold Collect** (C or R, gamepad X) with KS-1's bow at the target. The helper shows "C hold · Drill the … lode" or "Drill the soft seam". |
| Where can it be used? | (a) **The soft seam** under the trench rim (x 27390, about 28 m), a one-time breach into a sealed grotto holding 2 blooms, 2 vent ore and an Echo whorl. (b) **New: five mineral lodes**: kelp forest floor (x 11400), western wreck shelf (20500), wreck shelf (21800), trench ledge (28200, 34 m) and trench floor (30700, 99 m, which needs depth plating). |
| What does it accomplish? | The seam is an optional grotto. The lodes are repeatable mining: copper with quartz, scrap with copper, or vent ore with quartz. Each first drill adds a bonus (brass on the shelf-east and floor lodes) and a core-sample note. Lodes reseal after 10 minutes of play. |
| Required or optional? | **Optional.** It is not on the critical path. It substantially eases the late-game vent-ore and copper economy (PS-2, resonator, cowl, base expansion). |
| Partial or future? | Before Phase 13 it was complete but one-shot. It is now a lasting tool. Further uses are proposed below and not built. |
| Did the docs match? | Partly. PROGRESS and the Phase 12 audit described the seam correctly. DESIGN.md never mentioned the drill. The seam was not scannable, so the Lab text was the only clue. |

The drill seam and lodes are now scannable ("Soft rock seam", "Mineral lode"), so curiosity leads to the drill before the player owns it. Field notes progress from "too hard for hands…", through "the probe's drawings point to a drill nose…", to "Bow over a mineral lode and hold Collect… Core samples logged: n of 5". Without the drill, the Collect prompt explains what is needed instead of offering an action. While drilling the player gets bow-spin animation, sparks on the lode, a water disturbance, a light camera shake, drill audio, a find sound and a toast. A full dive bag spills the cuttings and leaves the lode intact.

Lodes add materials only. They do not replace the snail's chimney, the crab's strongbox or the glowfin's grotto, and each lode sits more than 600 units from the cleft and the seam (tested).

**Proposed, not built:**

1. A drill-only alternate route: a collapsed rockfall shortcut between the shelf and the trench for KS-1. This would need world-geometry work and save-compatibility care.
2. Drill sample → Lab research, for example a deep-plating upgrade from trench-floor cores.
3. A higher drill tier that bores faster and reaches Sanctum-adjacent crystal.

## 6. Equipment usefulness (code-derived unless marked)

| System | Available | Purpose and longevity |
| --- | --- | --- |
| Dive light | First Lab/Workshop pair | Gate plus permanent visibility. The lamp key is L or F. |
| Pressure suits PS-1/PS-2 | Corvina / cleft | Hard depth gates (30 → 60 → 110 m). Permanently relevant. |
| Mag-boots | Race + ring scans | Brace by holding Down near the floor; cancels current and vent lift (Phase 12). The helper now shows "S hold · Brace mag-boots" when braced near the floor, which addresses Phase 12's "does hold-to-brace read?" concern. Not playtested in Phase 13. |
| Grapple | Tow-line notes | Race rings, the Corvina and interior anchors. Recurs through the Fulmar and the Sanctum. |
| Scanner and sonar pulse | Start / Corvina | Research, quick ID and predator repelling. The hidden room is a one-time use. |
| Flares, darts, visor, cowl, dash | Various scans | Situational. The visor and dash have lasting value. The cowl only matters at the vents. |
| KS-1 modules | Dock | Cargo, lights, grabber (salvage regrows every 15 min), tractor, sonar dome, habitat, ballast, afterburner, depth plating. **Drill: was one-shot, now repeatable (Phase 13).** |

Phase 13 found no other one-and-done tool as stark as the drill. The ballast pod and afterburner overlap once the flow vane is raised. Consider giving the ballast a vent-plume use in the trench (proposed).

## 7. Evidence

The 1440p screenshots and the playthrough logs are outside the repository, in the session scratchpad:

- `helper-sub-lode.png`, `drill-lode-drilling.png`, `drill-lode-done.png`: KS-1 over the kelp forest lode, before, during and after drilling.
- `helper-base-foot.png`, `helper-base-*.png`, `helper-base-gamepad.png`: on foot in the base, with keyboard and with gamepad.
- `swim-start.png`: a fresh save at the Kestrel site.
- `helper-left-base.png`, `helper-build.png`, `settings-control-helper.png`: after the airlock, in build mode, and in the settings section.

Before Phase 13, the desktop had a single grey text line that disappeared after 2.5 s and nothing showed the drill. After Phase 13, the screenshots show the keycap bar and the drill prompt.

## 8. Remaining issues and next priorities

1. **Run an uninterrupted fresh-save playthrough on real hardware** (a GPU at 60 FPS). The headless rig cannot. The opening autopilot can be extended with floor-hugging waypoints so it collects the jar and thruster.
2. Add a remapping screen on `src/controls/bindings.ts`. The API and persistence exist.
3. Playtest the mag-boots brace prompt in the race and the vents, now that the helper surfaces it.
4. Tune the lode yields once a real economy run shows how much vent ore arrives from snails versus lodes.
5. Make creature names editable in the care panel. That would need one optional save field.
6. Consider the drill proposals in section 5 and a trench use for the ballast pod.
7. The opening's 75 s air forced five surfacings in about 6 game minutes on the autopilot's route. Watch whether the first air tank arrives early enough in real play.
