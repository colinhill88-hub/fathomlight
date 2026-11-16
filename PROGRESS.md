# Fathomlight progress

Last updated: 2026-11-16, **milestone 7 part 1 deployed (Lab, Workshop, the dive light, the kelp forest, tinker crab and lantern shrimp)**. Next is **milestone 7 part 2, the kelp caves** (see Next).

Play link: https://colinhill88-hub.github.io/fathomlight/ (live; first successful deploy 2026-11-14)

## Tech choices (decided in milestone 0)

Versions checked against the npm registry and current docs on 2026-11-14.

| Job | Choice | Why, in plain language |
| --- | --- | --- |
| Drawing on screen | **PixiJS 8.23** (WebGL 2 for now) | A fast 2D drawing library that uses the graphics chip (GPU). It lets us write custom shaders, which are small GPU programs for water, light shafts and glow, and it has a particle system that can draw thousands of specks at once. It is built for 2D, very actively maintained (updated this week) and runs the same in Safari on iPhone/iPad and in Chrome on the PC. |
| Language | **TypeScript 7.0** | JavaScript with type checking. It catches mistakes before they reach the phone. |
| Build tool | **Vite 8.3** | Turns the TypeScript into a small, fast website. It also gives a live preview while developing. |
| Hosting | **GitHub Pages**, deployed by GitHub Actions | Every push builds the game and publishes it to the play link automatically. It is free and needs no server. |
| Phone install | Web app manifest and Apple home-screen tags | "Add to Home Screen" on iPhone opens the game full screen with its own icon. |

Alternatives considered:
- **Phaser 4.** A full game framework. It has more built-in game features, but it is less flexible for the custom-shader, effects-heavy look the brief asks for. We would end up fighting its built-in rendering.
- **Three.js.** Excellent, but it is a 3D library. A 2D side-view game would carry extra weight it doesn't use.
- **Raw WebGPU.** The most power, but we would have to build everything ourselves.

**Why WebGL 2 rather than WebGPU for now:** PixiJS supports both, but a custom shader must be written once per backend (GLSL for WebGL, WGSL for WebGPU). WebGL 2 is the most proven path on iPhone Safari, and it has more than enough headroom for a 2D game. If the Ultra preset on the PC ever needs more, we can add WebGPU versions of the shaders and switch the PC to WebGPU. That decision is in one line in `src/main.ts`.

## Graphics presets

These are defined in `src/presets.ts`. **Auto** picks High on touch devices (iPhone, iPad) and Ultra on computers with a mouse. You can override it in Settings (the gear button), and the choice is remembered on that device.

| Setting | High | Ultra |
| --- | --- | --- |
| Frame-rate cap | 60 | 120 |
| Sharpness | Up to 2× screen pixels | Full device sharpness, capped at 4K |
| Drifting particles (relative amount) | 220 | 600 (denser) |
| Rock parallax layers | 3 | 5 |
| Dynamic lights added up per pixel | 8 | 12 |
| Caustics | single colour | split into red, green and blue (faint rainbow edges) |
| Glow (bloom) sharpness and smoothness | ¼ resolution, 2 blur passes | ½ resolution, 4 blur passes |
| Plants and coral | normal | about 1.6× more |
| Soft shadows | baked rock shadows | baked rock shadows **plus** the diver's moving soft shadow on the seabed |

Every effect in the DESIGN.md High row is on in High: dynamic lights, light shafts, caustics, depth fog, glow, water distortion and particles.

Cut from High so far: the phone renders at 2× instead of its native 3×. Colin reported a steady 60 fps on the milestone 0 scene in both presets. Milestone 1 adds much heavier effects, so 2× stays until Colin reports the new frame rate. If it holds 60 on the phone, try raising High to 3×.

## Done

### Milestone 0: Setup
- `DESIGN.md` saved. The concept art screenshots are in `docs/art/`.
- Project set up with PixiJS, TypeScript and Vite (`npm run dev`, `npm run build`).
- GitHub Actions workflow `.github/workflows/deploy.yml` builds the game and deploys it to GitHub Pages on every push to `main` or `claude/**` branches.
- An empty underwater scene. The water is drawn by a custom shader with a depth gradient, swaying light shafts and slow murk. Behind it are seeded procedural rock ridges with depth fog and parallax, plus a sandy seabed and drifting marine snow. The view drifts slowly sideways so the parallax shows.
- iPhone landscape: full-screen layout using the whole screen, including around the camera cutout. Page scrolling and zooming are blocked. Portrait on a phone shows a "Turn your phone sideways" message. Rendering pauses when the app is in the background.
- Home-screen install: manifest, Apple tags and an icon drawn by code (`scripts/make-icons.mjs`).
- Settings panel (gear, top right): Auto / High / Ultra buttons, plus a live frame rate, render resolution, renderer and build stamp. The build stamp shows which version the phone has loaded.
- Deploy verified: GitHub Actions run 43649689741 built and deployed to Pages successfully.
- Tested: type check and production build pass. A headless browser emulating an iPhone in landscape and a 1600×900 PC loaded the game with no errors. Presets switch at runtime (High 1468×686 → Ultra 2202×1029 on the iPhone-sized screen), and the rotate message appears in portrait. The frame rate could not be measured meaningfully here because the test browser has no real GPU. That has to be checked on the iPhone.

### Milestone 1: Water and diver (look-and-feel benchmark)
- **Feedback on milestone 0:** "looks good, steady 60 fps on both modes, the sun rays look pretty." Nothing was flagged to fix.
- **The scene** is a small hand-laid test area, about 48 m wide and 15 m deep (`src/world/terrain.ts`). Left to right: sunny sandy shallows with kelp, coral and a rock outcrop; a weathered survey beacon (`KESTREL SURVEY 03`) with a blinking red lamp at the top of a drop-off; deeper water below; and a rock ledge whose underside forms a dark grotto. The grotto has glowing anemones and three glowfins. It is test scenery for judging the look, not the real shallows zone, which comes in milestone 2.
- **The explorer** (`src/actors/diver.ts`) is drawn with code. They wear an orange suit with steel fittings, a yellow tank stencilled K7 and a dome helmet with a headlamp, and the suit has rivets, panel seams, scratches, rust streaks and algae specks. The hips, knees, ankles, shoulders and elbows are jointed, so the diver flutter-kicks faster with speed and sculls with their arms when floating still. The body tilts with the swim direction and turns around smoothly. Bubbles rise from the helmet with each breath, faster while boosting. The diver slides along rock and sand instead of sticking, and stops at the surface.
- **Controls** (`src/input.ts`):
  - Touch: a floating stick appears wherever the left thumb lands. Boost (large) and Lamp buttons sit on the right.
  - Keyboard: WASD or arrow keys, Shift or Space to boost, L or F for the lamp.
  - Mouse: hold the left button to swim towards the pointer; right-click boosts.
  - Gamepad: left stick, A to boost, X or Y for the lamp.
- **Camera:** follows the diver smoothly, looking ahead in the swim direction. The view always shows the same world height (560 at first, 640 since follow-up 2), so the framing matches on phone, iPad and PC.
- **Effects:**
  - *Lighting* (`src/fx/lighting.ts`): sand, rock, plants and the diver are drawn into an off-screen picture, then lit by one shader. It handles depth-tinted sunlight (warm tones fade first), baked soft shadows under rock, animated caustics, up to 8/12 dynamic lights, visible light beams in the water, a water-distortion wobble, depth fog and the Ultra diver shadow.
  - *Dynamic lights:* the headlamp cone, the beacon flash, the glowfin lures and the anemones.
  - *Water* (`src/scene/water.ts`): the depth colour, swaying light shafts that rock blocks, and the rippling underside of the surface when you swim up to it.
  - *Glow:* shining parts are drawn crisp, plus a blurred copy added on top.
  - *Particles:* marine snow drifts with camera parallax and dims with depth. Bubbles and kelp sway; the kelp leans away when the diver brushes through it.
  - *Parallax:* distant ridges move with the camera in both directions and take the water colour of the current depth. Dark foreground kelp passes in front.
  - *Vignette:* a soft edge darkening.
- **Colour rule kept:** cyan, violet and magenta glow is reserved for the Choir, so all bioluminescence here is warm yellow-green or pale yellow, and the beacon is red.
- **HUD:** a depth meter (top left) and a first-time controls hint that fades once you start swimming.
- Tested:
  - Type check and production build pass.
  - A headless browser emulating an iPhone 15 Pro in landscape and a 1280×720 PC rendered the shallows, outcrop, beacon, surface, ledge and grotto with no console errors. The lamp on and off states were checked too.
  - A simulated touch drag on the left half moves the diver. The Lamp button toggles the lamp. Switching presets at runtime works (High 1468×686, Ultra 2202×1029 on the iPhone-sized screen).
  - The frame rate could not be measured, because the test browser draws in software. Colin needs to check it on the iPhone.
- Rendering pipeline notes for future sessions:
  - `src/main.ts` explains the draw order.
  - Anything that should be lit goes into `litCam`.
  - Anything that should shine goes into `emissiveCam` (sharp) and `glowCam` (soft halo), with a matching entry in the lights list.

### Milestone 1 follow-up: Colin's feedback and new explorer suit
- **Feedback:**
  - Controls work perfectly. Rippling, sun rays, leaning kelp, the beacon and the fish are all good.
  - The frame rate drops to the mid 30s on High with the lamp on in the deep area. Colin is OK with that: **do not lower the graphics, but do not raise them either** (High stays at 2× for now).
  - He wants a dive-watch-style gauge eventually; it is noted in DESIGN.md.
  - He asked for the explorer to be redesigned with heavier inspiration from his childhood toy divers (photos shared in chat, not stored in the repo).
- **New suit** (`src/actors/diver.ts`; DESIGN.md Art direction has the written direction):
  - A swept tinted lime-glass helmet with a crest fin and the face visible inside.
  - A chrome collar yoke with a coiled hose to a round chest regulator port.
  - Grey sleeves, a charcoal suit with brass etching, and rust-red gloves, belt and straps.
  - A chrome back unit with a bolted port and a vent grille.
  - The headlamp is clamped under the crest. Bubbles now come from the chest regulator.
- Tested: type check and build pass. Close-up renders of the diver idle, swimming and in the dark grotto (lamp on) show no console errors.

### Milestone 1 follow-up 2: head, proportions and camera
- **Feedback:** the frame rate is still fine. The head looked like a goldfish from the side and was too small inside the helmet. The diver could be a little shorter, and the view will need to zoom out for base building anyway.
- **Head:** a proper side profile (brow, nose, lips, chin, jaw, ear, hair, shading) that fills most of the helmet. The round mouthpiece is gone; the full-face helmet does not need one.
- **Shorter, stockier build:**
  - Thighs, shins, fins, upper arms and forearms are shorter, and the torso is about 12% shorter.
  - The helmet stays full size, so it reads a little larger relative to the body.
  - Diver scale went from 0.82 to 0.86.
- **Lamp moved off the head:** at Colin's request, the dive lamp is now a chrome canister strapped to the harness on the near shoulder, under the helmet (`buildShoulderLamp` in `src/actors/diver.ts`). The beam starts there and aims slightly down.
- **Face and neck (follow-up 3):** Colin said the area under the jaw looked like a neck brace or double chin. It was a wide block of skin running from the jaw to the helmet bottom. Now there is a jaw line rising to the ear, a slim shaded neck, and the suit's dark rubber neck seal with a metal ring in the bottom of the helmet. Extra realism: an eyelid, a nostril, the line from nose to mouth, a cheekbone highlight, a shaped ear and hair strands.
- **Raised back cowl (follow-up 3):** like the metal rising behind the head on Colin's reference figure, the chrome back unit now sweeps up into a cowl behind the helmet. It has vent ribs, a small port, rivets and the coupling where the coiled hose comes out. The rear port on the back unit became a bolted hatch, so no round "eyes" show.
- **Camera zoomed out:** the view now shows 640 world units of height instead of 560 (`VIEW_H` in `src/main.ts`), which leaves room for base pieces later. Change that one number to zoom in or out.

### Milestone 2: Shallows
- **Feedback on the last build:** Colin approved the redesigned explorer suit, so milestone 1 is closed. Nothing else was flagged.
- **The zone** (`src/world/terrain.ts`, `src/world/scenery.ts`) is about 120 m wide and up to 14 m deep. The milestone 1 test scene grew into it; its outcrop, beacon, drop-off, ledge, grotto and glowfins are all still there, moved east. Left to right:
  - West rock wall.
  - **Kestrel site:** flat sand under an orange-red marker buoy, with a weighted crate on the seabed. This is where the diver starts and where the base will go in milestone 3.
  - **Coral garden:** two rock outcrops, dense coral, kelp groves, an old anchor and a school of silverbar fish.
  - **Sand channel:** the wreck of an old survey sled ("SLED 2") with scrap metal scattered around it.
  - **Rocky knoll:** the survey beacon stands on its edge.
  - **Drop-off, ledge and grotto:** from milestone 1.
  - **Seagrass meadow:** on a plateau, with swaying grass, a second fish school and a narrow crevice.
  - **East cliff:** a cave mouth that goes pitch black a few metres in. This is the gear gate to the kelp forest and caves zone. The diver can go in a little, then a message explains that a proper dive light is needed.
- **Culling:** the art is cut into 1000-unit slices, and only slices near the camera are drawn, so the bigger world costs about the same per frame as the milestone 1 scene. The world is also rebuilt from the same seed when you switch presets, so it no longer reshuffles. That was a small milestone 1 bug.
- **Oxygen** (`src/main.ts`, `src/game/state.ts`):
  - The starting tank holds 75 s. It drains 1 s per second underwater, and 1.8 while boosting.
  - Breathing at the surface refills it in about 3 s, anywhere.
  - Below 25%: a warning message, then a red pulsing screen edge that grows as the oxygen runs out.
  - At zero the diver blacks out. The screen fades to black and the diver wakes at the Kestrel buoy with a full tank. Everything carried drops in a **sample bag** on the seabed where they fell. The bag has a blinking amber lamp, and an arrow at the screen edge shows its direction and distance. Swim into the bag to get everything back. A second blackout before recovering it merges both into one bag.
  - When the base exists (milestone 3), the respawn point should move to the dome habitat.
- **Air tank upgrades:** two hidden yellow spare cylinders, each worth +20 s for good. One is in the back of the grotto, the other at the bottom of the meadow crevice. Each has a faint warm glow and a twinkle.
- **Dive watch** (`src/ui/watch.ts`, top left; Colin's request): a steel case and a dark bezel with minute marks.
  - The bezel ring is the oxygen gauge. Pale lume when full, amber below 35%, pulsing red below 15%.
  - The dial shows depth in metres, dive time since leaving the surface ("SURFACE" while breathing) and seconds of oxygen left.
  - A lume dot circles the dial once a minute.
- **Materials** (`src/world/pickups.ts`): 39 fixed spots, about ten each of scrap metal (wrecks), copper nodules (sand), quartz (on rock) and kelp fibre (golden holdfast tufts).
  - Swim into one to collect it. Each twinkles every few seconds so it can be spotted.
  - Collected spots grow back after 6 minutes (real time), so the base will never run short.
  - Counts show as small chips beside the watch.
  - There is no storage yet, so everything is carried, and a blackout drops it all. The storage pod in milestone 3 changes that.
- **Scanner** (`src/game/scanner.ts`): hold **Scan** (touch button above Boost; E or Q on keyboard; B on gamepad) near something not yet in the log.
  - Amber brackets frame the target, and a label says "Unknown creature / plant / wreckage / place". Holding sends an amber beam from the shoulder lamp and fills a ring. It takes 1.4 s.
  - There are 12 log entries: silverbar, glowfin, lantern anemone, ribbon kelp, branch coral, sea fan, seagrass, the Kestrel site marker, the old anchor, the survey sled wreck, survey beacon 03 and the dark cave mouth.
  - The sled entry mentions a dive light design for the Lab (milestone 6), and the beacon entry hints at the lights rising from the deep.
  - The scanner is amber, never cyan, violet or magenta, which stay reserved for the Choir.
- **Scanner log** (book button, top right): every entry, with "Unknown" until scanned, plus carried materials with what they are for and air tanks found.
- **Saving** (`src/game/state.ts`): automatic, on this device (localStorage).
  - It saves every 5 s, straight after each scan, pickup or blackout, and when the app goes to the background or closes.
  - Saved: position, oxygen, lamp, materials, scans, air tanks, which spots are regrowing, the dropped bag and play time. Reopening puts you back where you were.
  - Settings shows "Saved on this device: N s ago" and a **Start over** button that needs two taps.
  - Save codes for moving between devices are still planned for milestone 11, as DESIGN.md says.
- Tested:
  - Type check and production build pass.
  - A headless browser emulating an iPhone 15 Pro in landscape, and a 1280×720 PC, rendered every area of the zone. The only console messages were the test browser's own graphics driver notes.
  - Scripted checks:
    - Scanning the beacon records it.
    - Swimming onto scrap adds 1.
    - Draining the oxygen blacks out and respawns the diver at the buoy, with the carried quartz in a bag at the grotto floor.
    - After a reload, the scan, the bag and the position are all still there. The bag arrow points the right way.
    - The log opens.
  - The frame rate could not be measured, because the test browser draws in software.
- Deployed: GitHub Actions run 43675143107 built and deployed to Pages successfully from `claude/build-next-milestone-2lynhu`. This branch still needs merging into the default branch `claude/underwater-game-m0-0qqajg` so that branch stays current (a session can only push to its own branch).

### Milestone 2 follow-up: Colin's feedback
- **Feedback:** Colin likes the progress. He asked for four changes:
  - an animation for coming up for air;
  - friction when collecting, instead of just swimming over things;
  - materials should not regrow when you die (dying, recovering the bag and dying again had become the fastest way to farm);
  - a way to see the name of something already scanned, without filling the screen with text.
- **Surfacing** (`src/actors/diver.ts`, `src/fx/surface.ts`):
  - **The breach:** swimming up into the surface tips the diver upright, treading water, with the whole helmet out of the water. A fast ascent makes them pop up higher, overshoot and settle.
  - **The splash:** droplets are thrown up and fall back in, and foam rings spread across the surface. Its size depends on how fast you came up.
  - **Breathing:** the first breath is a big gasp, with the chest heaving and the head tipping back. After that come calmer, slower breaths. Each breath out leaves a puff of vapour above the water and fogs the inside of the visor, which then clears. Water drops run off the glass after the breach.
  - **At the surface:** small ripples spread while treading water, and a waterline is drawn across the suit where it enters the water.
  - **Diving back:** push down to duck under, with a small splash.
  - **Air:** oxygen starts refilling with that first breath, not on touching the surface. Bubbles only come out underwater.
  - **Sky:** the water shader now fades into hazy daylight air above the surface, and the lighting skips underwater caustics, wobble and fog on anything above the waterline. The camera shows a little more sky at the surface, so the splash fits.
- **Collecting takes work** (`src/world/pickups.ts`):
  - Swimming over a material no longer picks it up. Stop next to one and a dashed ring marks it. A **Collect** button appears (touch; C or R on keyboard; X on gamepad) with what the job is.
  - Hold the button while staying nearly still (under 70 units/s): the diver turns to the spot and works it with the near arm. Kelp fibre takes 1.6 s to cut, scrap 2.2 s to pry loose, copper 2.6 s to dig out and quartz 3.0 s to chip off.
  - Effects while working: chips fly, sand clouds puff out of copper digs, and sparks come off scrap and quartz. A ring fills around the material and on the button.
  - Letting go keeps the progress for a moment, then it slips back.
  - Working uses air faster (1.3×), so collecting deep costs real dive time.
  - Air tanks and the dropped bag are still picked up by touch.
  - Gamepad lamp moved to Y only, because X is now Collect.
- **Regrow timer fixed** (`src/game/state.ts`):
  - Regrowth now counts **6 minutes of play time**, stored in the save, instead of the real-world clock.
  - Blackouts, recovering the bag and closing the app never make anything grow back sooner. Waiting with the app closed no longer refills the reef either.
  - Older saves' timers restart from now.
  - In testing, the old build also kept collected spots gone after a blackout, so the regrowth Colin saw was most likely the 6-minute real-time clock running out during a long session, or untouched spots near the buoy. Either way the play-time timer closes the loophole. If it still happens, the exact steps would help.
- **Quick ID** (`src/main.ts`, `src/ui/hud.ts`):
  - **Tap** Scan (or tap E / B) and an amber ring sweeps out from the diver.
  - For 6 seconds, small name tags appear over the nearby things you have **already scanned**: up to 8, at most 2 of each kind, never overlapping each other, the diver or the buttons. Only the closest one also shows the first line of its log entry.
  - Holding Scan still scans new things as before.
- Tested:
  - Type check and production build pass.
  - In the emulated iPhone, scripted checks:
    - A fast ascent surfaces the diver with a splash, ripples and a head-out pose, and refills oxygen to full.
    - Parked by a copper nodule, the Collect label reads "Dig out copper nodule", and holding C collects exactly one.
    - After a forced blackout, that spot stays taken in the save and hidden on screen.
    - A tap of E shows name tags for scanned kinds, with the closest one expanded.
  - No console errors.

### Milestone 3: Base building
- **Feedback on the last build:** "Everything looks good." Nothing was flagged, so this session went straight to milestone 3.
- **Build mode** (`src/ui/build.ts`):
  - A **Build** button (hammer, top right) appears when the diver is at the Kestrel site, the sand around the buoy. Keyboard B, gamepad View/Back. A one-time tip points it out on arrival.
  - The camera zooms out (`VIEW_H_BUILD` = 860 in `src/main.ts`) to show the whole site, with faint grid marks. The swim buttons hide, and the air clock pauses while you plan.
  - The bar along the bottom has the four pieces, each with a small drawing and what it costs: what you have / what it needs, in red if short. Costs come out of carried materials first, then storage.
  - Tap a piece and a ghost of it appears at the **nearest spot where it fits**. Drag anywhere to slide it (it moves by how far your finger moves, so your finger never covers it), or tap where you want it. It snaps cell by cell. Pale green outline = fits; red = it doesn't, with the reason above. Collars that will join light up.
  - **✓** builds it. The piece fades in with welding sparks, and stays in hand for the next one while you can afford it. **⟲** rotates the corridor. **✕** puts the piece back, then closes build mode.
  - With no piece in hand, tap a built piece to select it (marching outline, its job and power state). **Remove** (tap twice) takes it away and returns all its materials as carried.
  - Keyboard: 1–4 pick, arrows/WASD move, R rotate, Enter/Space build, Esc let go/close, Tab select, Delete/X remove. Mouse: the piece follows the pointer, click builds, right-click lets go. Gamepad: LB/RB pick, d-pad or stick move, A build, Y rotate, B let go/close, X remove.
- **The rules** (`src/game/base.ts`):
  - The site grid is 11 cells wide and 3 high; a cell is 112 units (1.5 m). The bottom of the grid sits just above the highest sand, and pieces on legs reach down to the seabed.
  - Pieces snap at **connector collars**. The first piece goes on the seabed; after that, a new piece must line one of its collars up with an open collar on the base. Open collars pulse with amber chevrons in build mode.
  - **Power:** a current turbine powers every piece joined to it through collars (directly or through corridors). A piece only works with power. Each piece has a status lamp: steady pale green with power, slow red blink without.

| Piece | Size (cells) | Collars | Cost | Job |
| --- | --- | --- | --- | --- |
| Dome habitat | 2 × 2 | left, right (bottom row) | 3 scrap, 4 quartz, 2 kelp fibre | Swim inside to breathe station air (refills oxygen like the surface) and save. After a blackout you wake inside it instead of at the buoy. |
| Corridor | 1 × 1 | left/right, or up/down when rotated | 2 scrap, 1 kelp fibre | Joins pieces and extends the base; rotated, it climbs to a higher row |
| Current turbine | 1 × 2 | left, right (bottom) | 2 scrap, 4 copper, 1 kelp fibre | Powers every piece joined to it |
| Storage pod | 1 × 1 | all four sides | 3 scrap, 1 copper, 1 kelp fibre | Swim up to it to unload everything carried. Holds 40 items per pod. Stored items are safe from blackouts. |

  - A starter base (dome, turbine, corridor, storage pod) costs 10 scrap, 5 copper, 4 quartz and 5 kelp fibre. The shallows have 10 scrap spots, so the first base takes a full sweep of the zone (or waiting for regrowth).
- **The look** (`src/world/basegfx.ts`), all drawn by code in the art direction's palette: weathered steel, muted Kestrel yellow and rust red, rivets, panel seams, faded hazard stripes, stencils (`KESTREL HAB-01`, `CT-1`, `STORE 01`, `C-01`), rust streaks, scratches and algae.
  - **Dome habitat:** a riveted drum with brass portholes under a ribbed glass dome. Inside are a console with screens, a chair, a bunk, a kelp jar and a hanging lamp. With power the interior glows warm and casts a real light on the surroundings. The glass sheen is drawn *over* the diver, so they look like they are inside.
  - **Current turbine:** a yellow machine house with cooling fins and a lit readout, a mast with a copper cable, and a three-blade rotor in a ducted ring that turns in the current.
  - **Storage pod:** an upright capsule with a hatch wheel and an amber fill gauge that rises as the base's storage fills.
  - **Corridor:** a ribbed tube with a yellow band and a porthole that lights with power.
  - **Collars:** joined collars are bolted flanges; open ones carry a rust-red blanking cap. Collars facing down into the seabed are sealed flush.
  - **Legs:** steel legs with cross-bracing and foot pads sunk into the sand, reaching to the seabed or to the piece below.
- **Other changes:**
  - The material chips by the watch show stored amounts as a small amber **+N** beside what is carried.
  - The scanner log now has a **Materials** section (carried and stored) and an **Outpost Kestrel** section listing what is built.
  - An unpowered dome shows a message explaining it needs a turbine; an unpowered storage pod says so when you try to unload.
  - The low-oxygen warning mentions the dome once one has power.
  - The save keeps the pieces, stored materials and shown tips. Older saves load with an empty base.
- Tested:
  - Type check and production build pass.
  - Emulated iPhone 15 Pro (landscape), scripted:
    - Building a dome, turbine, corridor and storage pod from the bottom bar. All four powered; costs deducted correctly.
    - A corridor dragged to a spot with no matching collar shows red, "Line up a collar with an open collar on the base", and the ✓ is disabled.
    - Swimming to the pod moved everything carried into storage.
    - Inside the powered dome, oxygen refilled and the "breathing station air" message showed.
    - Blacking out far away woke the diver inside the dome. Stored materials were kept; carried ones dropped in the bag as before.
    - After a reload, all four pieces were back and powered.
    - Removing the turbine returned its materials and cut power to the other three.
  - 1280×720 PC with the keyboard: B, 1/3/2/4 and Enter built the same base; R rotated a corridor, which snapped onto the storage pod's top collar.
  - No console errors. The frame rate could not be measured, because the test browser draws in software.
- Deployed: GitHub Actions run 43717650882 built and deployed to Pages successfully from `claude/next-milestone-build-deploy-zelm64`. This branch still needs merging into the default branch `claude/underwater-game-m0-0qqajg`.

### Milestone 3 follow-up: build drone and dive bag weight
- **Feedback on the last build:** "I'm happy with the progress so far. Let's keep going." Nothing was flagged. This session built the follow-up Colin scheduled after milestone 3 (DESIGN.md, The base).
- **The build drone** (`src/actors/drone.ts`):
  - **The look:** a small Kestrel construction robot, all drawn by code. It has a weathered yellow hull with a steel belly, a ducted lift fan on top, a rear thruster, an amber sensor eye, a red antenna lamp, the stencil `KD-1`, hazard stripes, rust and algae. A folding arm under the belly holds a welding torch.
  - **Finding it:** it is stuck in the survey sled wreck in the sand channel, tangled in old cable, battery flat. Its eye flickers faintly every few seconds so it can be spotted. It is also a new scanner log entry (13 entries now).
  - **Repairing it:** stop next to it and the Collect button reads **Repair build drone**. Hold it for 4 s. It costs **2 scrap, 1 copper, 1 kelp fibre** (carried first, then stored). Without them, the label says exactly what is missing. All of these lie within a short swim of the sled. When it is fixed, the drone shakes off the cable, its eye flickers on and it lifts off.
  - **Following:** it trails the diver from about half a second behind, a little above and behind, so it stays in open water. After a blackout it comes back with the diver.
  - **Building needs the drone.** Build mode still opens so you can plan, but ✓ is disabled until the drone is repaired, and the info line says where it is.
  - **Frames:** ✓ now places a **frame**. Materials are paid straight away. The drone flies over and welds it from the bottom up: a steel scaffold stands around the piece, the finished hull appears as the weld line rises, and there is a hot seam line, a flickering torch light and sparks. Build times (`buildTime` in `PIECES`, `src/game/base.ts`): **corridor 10 s, storage pod 18 s, turbine 28 s, dome 40 s**.
  - **Swim off meanwhile.** Several frames can be placed; the drone works through them oldest first. A frame does nothing until it is finished: no power, no air, no storage, and it does not pass power on. Its status lamp pulses amber. A toast says when each piece is finished.
  - If the diver is far away when it finishes, the drone hovers over the base and rejoins the diver when they come back.
  - Build mode: the piece cards show the build time. Tapping a frame shows "Drone welding: 63% · about 15 s left" or "Waiting for the drone". Removing a frame returns all its materials.
  - **Removing a piece** now puts its materials back into storage first (while there is room), so the dive bag doesn't suddenly become very heavy.
  - Old saves keep everything already built. Their drone still has to be found and repaired before anything new can be built.
- **Dive bag weight** (`src/game/state.ts`, `src/actors/diver.ts`):
  - Each material weighs something: **copper 3 kg, scrap 2.5 kg, quartz 1.5 kg, kelp fibre 0.5 kg.**
  - Up to **15 kg** (the rated load) the effects are mild. They grow smoothly with weight:
    - slower swimming (−22% at 15 kg, up to −35% when full);
    - an extra slowdown going up;
    - a weaker boost;
    - a slow sink when not swimming (about 0.4 m/s at 15 kg);
    - faster air use (+20% at 15 kg, +32% when full).
  - There is no sinking while treading water at the surface, while collecting or inside a dome. Nothing about it can suddenly drown you.
  - At **24 kg** the bag is full. The Collect button says "Dive bag full: unload at a storage pod", and holding it does nothing.
  - A starter base weighs about 48 kg in materials, so it takes two or three trips. Each single piece fits in one load.
  - **On the dive watch:** a short arc along the bottom of the dial fills with the weight. It has a tick at 15 kg and turns amber past it, red when full. The kg readout replaces the word KESTREL while anything is carried.
  - **On the diver:** a mesh bag clipped to the belt swells as it fills, and the diver kicks harder when heavy.
  - One-time messages explain it the first time the bag gets heavy, then a short "Dive bag heavy" or "Dive bag full".
  - The scanner log shows the bag weight and each material's weight.
- **Hooks for later upgrades:**
  - `bagLimits()` in `src/game/state.ts` returns the rated and full load. A lift bag, buoyancy vest, the drone carrying loads or the sub's cargo bay just raise these.
  - `droneWeldRate()` sets the welding speed (a faster torch). A second drone would be a second `Drone` taking the next frame from `layout.frames()`.
- Tested:
  - Type check and production build pass.
  - Emulated iPhone 15 Pro (landscape), scripted:
    - Next to the stranded drone with no materials, the Collect label lists what is missing and holding it gives a warning.
    - With the parts, holding Collect repaired it, took 2 scrap, 1 copper and 1 fibre, and the drone woke up and followed the diver.
    - With a 21 kg bag the diver sank slowly when idle and the watch showed the weight.
    - In build mode, ✓ placed a dome and a turbine as frames (materials paid). The drone flew to the dome and welded it, then the turbine. Once both were finished, both had power.
    - After a reload, the repaired drone, finished pieces and a half-welded corridor frame were all restored, and the drone went back to the frame.
  - The test browser draws in software and runs the game at about one sixth speed, so the real welding times and the frame rate have to be checked on the phone. No console errors.
- Deployed: GitHub Actions run 43727209174 built and deployed to Pages successfully from `claude/next-milestone-build-deploy-ikoapi`. This branch (which also carries milestone 3) still needs merging into the default branch `claude/underwater-game-m0-0qqajg`.

### Milestone 3 follow-up 2: a smaller, cuter drone that holds still
- **Feedback:** the numbers (weights, build times) feel good; tune later for difficulty. But:
  - the drone flickered left and right whenever the diver was still or treading water at the surface;
  - it was too big;
  - Colin wanted a cuter helper with more personality, shown through animation;
  - it should start small, so finds in later biomes can upgrade it (and the diver) without filling the screen.
- **Jitter fixed** (`src/actors/drone.ts`, `src/main.ts`):
  - The cause: with the diver not moving, the game guessed the diver's facing from which side the drone was on. The drone then aimed for the spot "behind" the diver, on the other side, which flipped the guess, and so on. A "don't crowd the diver" push made it worse.
  - Now it uses the diver's real facing. It only moves behind the diver while they actually swim (faster than 70 units/s). When they stop, it keeps to whichever side it is on.
  - It turns only with clear travel, or after a 28-unit dead zone towards what it is looking at, and it settles firmly near its target.
  - Checked in the emulated iPhone: still at the surface and still underwater, it drifts 1–2 units and never turns around (10 s sampled each).
- **New look, about half the size** (roughly a third of the diver's length):
  - a small squat Kestrel-yellow hull with a steel belly;
  - a big glass dome "head" (the signature dome shape) with a dark camera ball inside and one large amber lens as its eye;
  - two little ducted fans sticking out at the sides like ears;
  - a springy antenna with a red tip lamp;
  - a tiny folding welding arm.
  - Still weathered: rivets, scratches, rust and algae.
- **Personality animations:**
  - the eye rolls inside the dome to look at the diver, or at the weld while working, and blinks every few seconds;
  - it tilts its head towards what it is looking at;
  - the antenna wobbles on a spring whenever it speeds up or stops;
  - a **happy hop with a full roll**, its eye squinting into a smile, when you collect a material, scan something new, find an air tank, finish a piece, and right after it is repaired;
  - when you stay still for a few seconds it glances around, curious;
  - parked alone over the base, its eye droops half closed.
  - All of these are in `src/actors/drone.ts`. `cheer()` triggers the hop, so future events can use it too.
- **Room to grow:** drone upgrades from later biomes can add visible parts (bigger fans, a second arm, a cargo clamp) to this small base design.
- Tested: type check and build pass. Close-ups of the new drone idle, mid-roll and smiling, plus the jitter measurements above. No console errors.

### Milestone 4: Creatures
- **Feedback on the last build:** going well. Colin gave creature direction rather than fixes: be creative; creatures in the first biomes should be **cuter (no teeth) but visually interesting**, and get **scarier deeper down, with more bioluminescence and fear-based elements**. Nothing was flagged as broken. The direction is recorded in DESIGN.md (Art direction, "Creatures get scarier with depth"), with a mood for each zone so later milestones follow it.
- **Three keepable shallows creatures** (`src/actors/critters.ts`), all drawn by code: round and soft, big friendly eyes with catchlights, closed smiles, no teeth, bold patterns and small warm glows. No cyan, violet or magenta (still kept for the Choir), so the concept art's lavender jelly became peach.
  - **Glowfin:** a rounder striped fish with a big eye, a little blush and a glowing lure. Grown ones also show a row of lume dots. The wild grotto glowfins got the same big eye and a soft rounded dorsal fin instead of spikes.
  - **Puffcap:** a small peach jelly with a frilled rim, glowing polka dots, two dark eye spots that read as a face, curly tentacles and two frilly ribbons. It pulses and rises with each squeeze.
  - **Dapple ray:** a palm-sized sandy ray with dark dapples ringed in cream, big eyes on little bumps, rippling wing edges and a tail with a tiny glowing tip. It glides low and sometimes rests on the sand.
  - **Glowfin egg clutch:** see-through eggs, each with a curled fry and a dot of an eye, glowing faintly.
- **Where they live** (`src/world/wildlife.ts`, fixed spots):
  - Two glowfin egg clutches on the grotto floor, each with a faint glow.
  - Three big adult puffcaps and two young ones over the drop-off.
  - One adult dapple ray and two young ones over the seagrass meadow.
  - Adults are too big for the jar but can be scanned. **Two new scanner entries:** Puffcap and Dapple ray (15 in total). Each entry says what the creature likes.
- **Collecting: the specimen jar.**
  - Stop next to a young creature or an egg clutch. The Collect button reads "Coax young puffcap into jar" (or similar). Hold it while keeping still: the creature calms and drifts over to you, and a ring fills (2.6 s, eggs 2 s).
  - **You must scan the species first** ("Unknown creature: scan it first"), so you know how to keep it. Glowfin eggs need the glowfin scanned.
  - Boosting nearby startles young ones: they dart off for a few seconds.
  - The jar holds one creature. A chip under the dive watch shows what is in it.
  - A collected spot fills again after 6 minutes of play, like materials.
  - Blacking out with a wild creature in the jar lets it swim home. One taken out of a tank goes back into its tank.
- **Two new base pieces** (`src/game/base.ts`, drawn in `src/world/basegfx.ts`), using the same collar and power rules as before:

| Piece | Size (cells) | Collars | Cost | Build time | Job |
| --- | --- | --- | --- | --- | --- |
| Creature tank | 2 × 1 | left, right | 2 scrap, 3 quartz, 1 kelp fibre | 24 s | Holds up to 4 creatures. A long glass tank with a riveted frame, rust-red rails, sand, a rock and a lamp strip that lights with power. |
| Filter pump | 1 × 1 | left, right, up | 2 scrap, 2 copper, 2 kelp fibre | 16 s | Keeps the water clean in the nearest 2 tanks joined to it. A drum with an impeller behind a grille (it spins only with power), a gauge and an intake pipe. |

  - Swim up to a finished tank with something in the jar and it goes in automatically.
  - A tank with creatures in it can't be removed in build mode until they are moved or released.
- **Tank care** (`src/ui/care.ts`), laid out like the "Tank care on phone" concept board:
  - At a tank, a **Tend** button appears (top right; keyboard T). The camera zooms in on the tank, the diver and drone fade out of the way, the air clock pauses, and a panel opens on the right.
  - The panel has a tab for each creature, a one-line status (for example "Hungry. Lantern is dimming."), three bars (**Fed, Comfort, Water quality**) and a ✓ / ✗ list of what helps or hurts its comfort. The selected creature has a ring around it in the tank.
  - **Feed kelp flakes** costs 1 kelp fibre and feeds the whole tank. Flakes sink and the creatures swim to eat them.
  - **Clean tank** scrubs the water clean (+40%), with bubbles.
  - **Plant** one plant per tank: branch coral (1 quartz), ribbon kelp or seagrass (1 kelp fibre each). Each must be scanned on the reef first.
  - **To jar** moves a creature to another tank (it keeps its needs and growth). **Release** (tap twice) sends it home.
  - Inside the tank: murk and an algae film build up as the water gets dirty; sick creatures turn pale, slow down and sink.
- **The rules** (`src/game/creatures.ts`). Every number is one constant at the top of the file. Everything runs on play time, so closing the app never starves anything.
  - **Fed:** full to empty in 15 minutes. One feed adds 60%.
  - **Water:** each creature dirties its tank (1 alone takes 20 minutes, 4 take 5). A powered filter pump cleans far faster than that.
  - **Comfort** starts at 50%, then:
    - +30% with its favourite plant: glowfin likes branch coral, puffcap ribbon kelp, dapple ray seagrass;
    - +20% with the right company: glowfins like another glowfin, rays like any tank-mate, puffcaps like space (at most one tank-mate);
    - −40% if a puffcap shares a tank with a glowfin (its threads sting);
    - −40% if the tank has no power;
    - −10% for each creature over 3.
    - The bar drifts towards that value over about a minute.
  - **Growing:** with all three needs at 60% or more, a young creature is grown after 8 minutes. Grown ones are bigger and glow brighter. Eggs hatch after 90 s in any tank.
  - **Payoff:** a grown, happy creature puts 1 material into storage every 4 minutes. Rays turn up copper, puffcaps shed kelp fibre, glowfins leave quartz. Brightness shows how well kept a creature is.
  - **Sickness:** if any need drops below 25%, it gets sick (a warning message, pale and slow). It recovers once fixed. After 6 minutes sick it goes **dormant**: its remains are kept in storage (listed in the scanner log) until the Revival pool from DESIGN.md is found. From a single feed, neglect takes roughly 17 minutes of play to lose a creature.
- **Scanner log:** a new **Creatures** section lists each kept creature with its status, what is in the jar and any dormant remains.
- **Build bar:** now six pieces. Cards shrink to fit the phone, and on short screens their drawings hide. Keyboard 1–6.
- Tested:
  - Type check and production build pass.
  - Emulated iPhone 15 Pro in landscape, scripted:
    - Holding C next to the young puffcap put it in the jar (jar chip shown). Swimming to the tank put it in tank 1.
    - In the care panel, planting ribbon kelp took 1 fibre, and feeding took 1 fibre and raised Fed.
    - 20 simulated minutes without care: the puffcap got sick, then went dormant (1 dormant puffcap recorded).
    - Eggs hatched. A fed young ray with seagrass and a tank-mate grew up and stored 4 copper. A lone glowfin in a seagrass tank stayed unsettled and did not grow, as the rules say.
    - Blacking out with a young ray in the jar woke the diver in the dome, and the ray swam home (its spot refilled at once).
  - Screenshots of the puffcaps, the meadow rays, the grotto eggs, the tank with creatures, and the care panel.
  - No console errors. The frame rate could not be measured, because the test browser draws in software.
- Deployed: GitHub Actions run 43732834582 built and deployed to Pages successfully from `claude/creature-design-milestone-806kjd`. This branch was started from the default branch `claude/underwater-game-m0-0qqajg` (after PR #2 merged), so merging it back is a clean fast-forward.

### Milestone 4 follow-up: scarcer materials
- **Feedback:** Colin likes that grown creatures put materials into storage ("a clever way of rewarding the player for collecting different animal specimens"). He has more materials than he needs, and asked for scarcer reef materials so creatures and automatic production feel more rewarding. He also proposed a larger direction (one main base that grows all game, factory-style automation with creatures as resource nodes, an auto feeder around the second biome, faster travel home, a much bigger build area). That is recorded in DESIGN.md under The base; nothing of it is built yet.
- **Changes:**
  - Material spots cut from 39 to 28 (`src/world/pickups.ts`): scrap 10 → 8, copper 10 → 7, quartz 10 → 7, kelp fibre 9 → 6. The spots kept are the ones near landmarks (the sled wreck, the grotto, the coral garden), so the shallows still teach where each material lives.
  - Regrowth after collecting: 6 → **10 minutes** of play (`REGROW_SECONDS` in `src/game/state.ts`). Wild creature spots use the same timer.
  - Creature production is unchanged (one material every 4 minutes per grown, happy creature), so it now covers a larger share of what the base needs. Puffcaps make kelp fibre, which the feeding uses, so a puffcap tank partly feeds the others.
  - Scrap is now the bottleneck: no creature makes it. That fits it being salvage from wrecks, but if it feels like a grind, add scrap spots back or let a later creature or machine produce it.
- Tested: type check and build pass.

### Milestone 5, part 1: the Kestrel basin and the first production line
- **Feedback on the last build:** milestone 4 and the scarcer materials are good; Colin loves that grown creatures fill storage. He chose milestone 5 (big base and factory groundwork) before the submersible, with the decisions recorded in DESIGN.md (The base, "Milestone 5 decisions").
- **The split.** Milestone 5 is too big for one session, so it is two playable parts:
  - **Part 1 (this session):** the big basin site and build camera, conveyors and feed pipes, the auto feeder chain, creature output that scales with happy creatures and tanks, and the Echo whorl.
  - **Part 2 (next):** the first machine that combines materials into a refined one, tank output carried on conveyors (instead of going straight to storage), faster CB-2 conveyors and FL-2 pipes, and a whole-base rates overview.
- **The site** (`src/world/terrain.ts`, `src/game/base.ts`):
  - The grid grew from 11 × 3 cells to **58 × 14 cells** (87 m × 21 m). **About 680 cells are open water**, a bit over 20 times the old site. `OPEN_CELLS` in `src/game/base.ts` has the exact count.
  - West of the shelf a cliff drops into the **Kestrel basin**: a wide, flat silt floor about 22 m deep, with a steep west wall. The wall has a nook part-way up (an Echo whorl hides there). Boulders, kelp along the walls and four warm lantern anemones on the floor dress it; the middle is left clear for building.
  - The old shelf by the buoy is the **top east corner** of the grid. The rock under the shelf and the foot of the cliff can't be built in ("Solid rock here (tunnelling comes later)").
  - **Old saves keep their base where it is.** On load, pieces are shifted by 47 columns and 11 rows (the `site` field in the save marks the new layout).
  - The world now runs from x = −5600 to 9000 and is 1980 units deep. The rest of the shallows' landmarks didn't move; the plants and corals scattered between landmarks are reshuffled a little. One quartz spot moved from the old west wall to the top of the cliff.
  - Light below about 11 m now fades at a quarter of the normal rate (`depthLook` in `src/fx/shared.ts`), so the basin floor reads as deep blue rather than black. The grotto keeps its dark rock shadow.
  - New scanner entry: **Kestrel basin**.
- **Pieces stand on the seabed wherever it is:** the first piece may go on the basin floor, the shelf or the cliff, and downward collars facing rock are sealed.
- **Build camera** (`src/ui/build.ts`):
  - Opening build mode frames what you've built, with a cell or so of room around it (the shelf if nothing is built yet). The **Fit** button (top left; F on keyboard) reframes it.
  - Zoom goes from about one piece up to the whole basin.
  - Touch: drag on empty water to pan, pinch to zoom. While holding a piece, one finger still slides the piece; two fingers pan and zoom.
  - Mouse: the wheel zooms at the pointer; drag with the left button (no piece in hand) or the middle button to pan.
  - Keyboard: WASD pans, arrows move the piece (or pan with no piece), + / − or E / Q zoom.
  - Gamepad: the triggers zoom and the right stick pans.
  - A picked piece appears at the nearest valid spot to the middle of the view, and the view follows a piece you move off screen.
  - The dive watch hides in build mode, and the near kelp fades away when zoomed far out.
  - The drone parks over the middle of what's built instead of over the middle of the grid.
- **Transport** (`src/game/factory.ts` rules, `src/world/linegfx.ts` drawing). Different kinds of material move by different means:

| Line | Carries | Rate (CB-1 / FL-1) | Cost per length | Look |
| --- | --- | --- | --- | --- |
| Conveyor | solid items (kelp fibre for now; all solids later) | 6 items/min | 1 scrap per 2 cells + 1 copper per 4 cells | dark rubber belt on steel rollers, transfer boxes at bends; bundles ride along it while it runs |
| Feed pipe | fluids (feed mash now; filtered water and so on later) | 10 L/min | 1 copper per 2 cells + 1 kelp fibre per 4 cells | weathered copper with brass flanges and verdigris; pulses of mash travel down it |

  - Corridors still carry power and access.
  - **Drawing a line:** in build mode, tap a piece with an output, then **Conveyor to…** or **Pipe to…**, then tap the target. A dashed preview shows the route, length and cost, and ✓ builds it straight away (no welding).
    - Keyboard: C or P with a piece selected. Mouse: click the target.
  - **Routing:** a line leaves the top of the first piece, runs across above both pieces and drops into the top of the second. Lines from the same piece take separate lanes. The longest line is 30 cells.
  - **Port limits:** a storage pod sends up to 4 conveyors; an auto feeder takes up to 2 conveyors in and sends up to 4 pipes; a tank takes 1 pipe.
  - **Selecting a line:** tap it to see what it's moving per minute against what it can carry (for example "Moving 0.5 items/min of kelp fibre · can carry 6 items/min (8% used)"). **Remove** (two taps) refunds it.
  - Removing a piece also removes and refunds its lines. Fibre waiting in a feeder's hopper goes back to storage, and fitted whorls come off.
- **Auto feeder** (a new piece, 1 × 2 cells, card 7; drawn in `src/world/basegfx.ts`): a funnel hopper on top, a geared press drum, and a mash tank with a sight window. A copper riser carries the mash up to the pipe port. Its hopper and mash levels show live, and the gear turns while it presses.
  - **Cost and power:** 3 scrap, 3 copper and 2 quartz; 30 s to weld; it needs power.
  - **The chain:** storage pod → conveyor (kelp fibre) → auto feeder → feed pipes → creature tanks.
  - **Rate:** it presses **0.5 kelp fibre/min** into **12 L of mash each**, so it makes 6 L/min. The hopper holds 4 fibre and the mash tank 24 L.
  - **The tanks:** each tank on a feed pipe gets a 12 L **feed trough**. Its creatures eat from it whenever Fed drops below 95%. One litre fills 20% of Fed, so a creature eats about **0.33 L/min**, and one feeder keeps about 18 creatures fed.
  - **Fibre cost:** per fibre this is the same as feeding by hand (one feed of 1 fibre gives a whole tank +60%). The gain is not having to swim back.
  - **Supply:** a grown puffcap makes 0.25 fibre/min, enough to feed about nine creatures.
  - Hand feeding still works. Mash is shared out between a feeder's pipes.
  - **Readouts:** the selected feeder shows its state (running, waiting for fibre, mash tank full, no power, no conveyor) and its rates. The selected tank shows its trough, what it eats per minute and what it makes per minute. The care panel lists the feed pipe and trough level.
- **Creature output that scales** (`makeRate` in `src/game/creatures.ts`):
  - The base rate is unchanged: a grown, happy creature makes 0.25 items/min (one every 4 minutes).
  - **Shoal bonus:** +15% for each happy tank-mate.
  - **Reef bonus:** +10% for each other thriving tank (at least two grown, happy creatures), up to +50%.
  - **Echo whorls** multiply on top.
  - The care panel shows each grown creature's rate and its bonuses.
- **Echo whorl** (`src/world/whorl.ts`; pickups in `src/world/pickups.ts`):
  - **Look:** a thumb-sized spiral of pale nacre with a cold spiral thread of light and rings that pulse out from it, cyan to violet. It's the first thing in the shallows in the Choir's colours. It's an original design, not based on any other game's item.
  - **Story:** the scanner entry says no animal on record makes it, and that living things and machines near it quicken. The crew think the lights from the deep left it.
  - **Where:** two in the shallows for now. One is in the nook in the basin's west wall; the other is on the floor just inside the dark cave mouth, before the "too dark" point. Swim into one to take it (it also completes its scan).
  - **Fitting:** in build mode, select a finished creature tank or auto feeder and tap **Fit whorl** or **Take out whorl**, up to 2 per piece. Fitted whorls show on the piece and pulse.
  - **Effect:** one whorl gives ×2 output and two give ×3, and inputs go up by the same factor:
    - a tank's creatures get hungry and foul the water ×2 / ×3 as fast;
    - a feeder presses fibre ×2 / ×3 as fast.
    - A whorled tank without a feeder or a filter pump quickly gets hungry or dirty, so it only pays off with the supply to match.
  - The scanner log shows how many have been found and fitted.
- Tested:
  - Type check and production build pass.
  - Emulated iPhone 15 Pro (landscape), scripted:
    - An old milestone 4 save (dome, turbine, corridor, storage, tank and filter on the shelf, two grown creatures) loaded with every piece shifted to columns 47–54, row 11. They sat in the same place on the shelf, all powered.
    - Swam the basin floor, the west wall and the nook. Swimming into the nook whorl picked it up and scanned it.
    - In build mode, placed an auto feeder, then drew a conveyor (storage → feeder, 7 cells) and a feed pipe (feeder → tank, 9 cells) with the line buttons.
    - Ran 20 minutes of simulated play: fibre moved from storage to the hopper, the feeder pressed it, and the tank's trough filled to 12 L. Both creatures went from 49% to 97% Fed without hand feeding. With the trough and hopper full the feeder reported "mash tank full".
    - Fitted the whorl to the tank: its readout showed ×2 output and ×2 eating.
    - Selected the conveyor and saw its rate readout. After a reload the lines, the fitted whorl and the shifted base were all kept.
  - 1280×720 PC: build mode framing, zooming right out to the whole basin, and picking a dome in the middle of the basin.
  - No console errors. The frame rate couldn't be measured, because the test browser draws in software. Zoomed all the way out it draws the whole basin at once: the software test browser crashed now and then while taking screenshots (at any zoom, and at random; the same test passed when run again). To be safe, on touch screens the zoom-out stops at a view height of 2800 (still almost the whole basin width). Check the frame rate zoomed out on the phone, and on the PC (Ultra).

- Deployed: GitHub Actions run 43752369060 built and deployed to Pages successfully from `claude/great-pascal-vx5iis`. This branch was started from the default branch `claude/underwater-game-m0-0qqajg` after PR #3 merged, so merging it back is a clean fast-forward.

### Milestone 5, part 2: refining, tank output on conveyors, line tiers and rates
- **Feedback on the last build:** part 1 is coming together and Colin likes the gameplay. He skipped PC testing for now and asked to keep building.
- **Hull plating** (a fifth material, `plate` in `src/game/state.ts`): riveted plate pressed from scrap and copper. It weighs 4 kg in the dive bag, against 8 kg for the scrap and copper that go into it. It is only made by the plate press, never found on the reef. Its chip by the watch stays hidden until the base has some.
- **Plate press** (piece 8, `PP-1`; rules in `src/game/factory.ts`, drawing in `src/world/basegfx.ts`):

| Cost | Size | Build time | Recipe | Rate (×1) | Hoppers | Ports |
| --- | --- | --- | --- | --- | --- | --- |
| 4 scrap, 2 copper, 1 quartz | 2 × 1 cells, collars left and right | 34 s | 2 scrap + 1 copper → 1 hull plating | 0.5 plating/min (one stroke every 2 min), using 1 scrap + 0.5 copper/min | 6 scrap, 3 copper, a rack of 4 plates | 2 conveyors in, 2 out |

  - It needs power, and it takes Echo whorls (×2 / ×3, using inputs that much faster too).
  - **Statuses:** pressing; waiting for scrap and copper; plate rack full (no conveyor out, or storage full); no power; still a frame.
  - **Look:** a squat hydraulic press. It has a split hopper on the left with scrap and copper level windows, a yellow crossbeam on two steel columns, and a chrome ram. The ram creeps down as a plate builds, then slams with sparks. Finished plates stack on a rack on the right.
  - **Why these numbers:** the reef gives at most about 0.8 scrap/min, so the press runs on stockpiles in bursts rather than starving everything else.
- **Conveyors carry whatever the far end needs** (`Factory.tick`):
  - A storage pod sends kelp fibre to a feeder, and scrap and copper to a press. For a press it sends whichever hopper is emptiest, so the 2:1 ratio holds.
  - A tank or press can send to a storage pod, which now has conveyor inputs as well (4 in, 4 out).
  - A link that could never carry anything is refused with the reason, for example press → feeder, or storage → storage.
- **Tank output on conveyors:**
  - Creatures no longer put what they make straight into storage. It goes into the tank's **output tray** (4 items). When the tray is full, making pauses.
  - A conveyor from the tank (up to 2) carries it off to storage, or straight to a machine. For example, puffcap tank → auto feeder closes the feeding loop without storage.
  - Swimming up to a tank also takes the tray into the dive bag, so early play without conveyors still works.
  - A one-time tip explains the tray. If the tray holds something none of its conveyors can take (a ray's copper on a belt to the feeder), the tank readout says so and suggests a second conveyor to storage.
  - The care panel shows the tray.
- **Line tiers, named with Kestrel stencil codes (never "Mk"):**

| Code | Carries | Rate | Cost per length |
| --- | --- | --- | --- |
| CB-1 conveyor | solid items | **4 items/min** (was 6) | 1 scrap / 2 cells + 1 copper / 4 cells |
| CB-2 conveyor | solid items | 10 items/min | as CB-1, plus 1 hull plating / 4 cells |
| FL-1 feed pipe | mash | 10 L/min | 1 copper / 2 cells + 1 kelp fibre / 4 cells |
| FL-2 feed pipe | mash | 25 L/min | as FL-1, plus 1 hull plating / 4 cells |

  - CB-1 dropped from 6 to 4 so that a whorled press can actually fill a belt; otherwise CB-2 had no purpose.
  - **Choosing a tier:** while drawing a line, a **CB-1 | CB-2** switch appears once the base has some hull plating (keyboard U). Select a built line and **Upgrade to CB-2** (or FL-2) pays only the plating difference.
  - **Line readouts** show the code and what it carries (for example "CB-1 conveyor: STORE 01 → PP-1 · Moving 1.4 items/min (scrap metal) · can carry 4 (34% used)"). They also say when a line runs flat out and an upgrade would help.
  - **Stencils:** every line has its code stencilled on a small painted plate on its longest run. CB-2 belts have yellow-and-black hazard rails and run faster; FL-2 pipes are steel-jacketed with steel bands. Bundles on a belt take the colour of what they carry.
  - Selected pieces list their lines ("Lines: CB-1 in, CB-2 out"), and readouts name pieces by their stencil codes (`pieceCode` in `src/game/base.ts`).
- **Lines from either end:** a selected piece shows **Conveyor to…** / **Pipe to…** for its outputs and **Conveyor from…** / **Pipe from…** for its inputs. For example, the auto feeder offers "Conveyor from…" and "Pipe to…". Keyboard: C / P draw out of the piece; Shift+C / Shift+P (or a piece with only an input) draw into it.
- **Whole-base rates overview** (`src/ui/rates.ts`): a **Rates** button beside Fit in build mode (keyboard O; Esc closes).
  - **The table** has one row per material (plus feed mash in litres), with columns **Made /min, Used /min, Net /min** (green up, red down) and **Stored**. "+N held" counts items waiting in trays and hoppers. A note under each row says who makes and uses it (for example "made by puffcaps: 0.29; used by AF-1: 0.5").
  - **Below the table:** every machine and stocked tank with its status, max rate and hoppers, then every line, busiest first, with a load bar that turns red when flat out.
  - On a PC it is a wide two-column panel; on the phone the table keeps its five columns and the panel scrolls. It refreshes twice a second.
- **Scanner log:** lists plate presses and counts lines by code.
- **Tested:**
  - Type check and production build pass.
  - Emulated iPhone 15 Pro (landscape), with a scripted base: turbine, storage, tank (grown puffcap and ray), auto feeder, plate press and a second storage pod.
    - 10 simulated minutes: the CB-1 conveyor fed the press scrap and copper at 2:1. The press made 4 plates (8 scrap and 4 copper used, with the hoppers full), and the CB-2 conveyor carried them to storage.
    - The puffcap's fibre went from the tank's tray by conveyor to the feeder, which kept the tank's trough full (both creatures stayed at 97% Fed). The ray's copper waited in the tray, as expected with only a feeder conveyor.
    - Selecting the feeder offered "Conveyor from…" and "Pipe to…". Drawing from the feeder back to a storage pod, switching to CB-2 and building it charged the plating.
    - Upgrading a CB-1 line to CB-2 cost 2 plating and raised its capacity to 10.
    - The rates panel opened with O and closed with Esc. Swimming up to a tank took 2 copper from its tray into the bag.
    - Screenshots of the press close-up, the stencilled lines, the press readout and the rates panel. No console errors.
- Deployed: GitHub Actions run 43760293910 built and deployed to Pages successfully from `claude/milestone-5-part-2-ncs2f6`. Merge it into the default branch `claude/underwater-game-m0-0qqajg` before the next session.

### Milestone 6: the submersible and the Moon pool dock
- **Feedback on the last build:** Colin tested milestone 5 part 2 and keeps tank output as it is (the 4-item output tray, emptied by conveyors or by swimming up to the tank). Nothing to fix.
- **Colin's decisions before building:**
  - **Cost:** medium, about 20 hull plating for the dock and sub together.
  - **First modules:** cargo bay, floodlights and grabber arm.
  - **Handling:** heavy and direct.
  - **Wear:** hull dents repaired with plating at the dock, and a 10-minute air reserve.
- **One session, no split:** everything planned fitted.
- **Moon pool dock** (piece 9, `MP-1`; rules in `src/game/base.ts`, drawing `drawDock` in `src/world/basegfx.ts`):

| Cost | Size | Build time | Collars | Job |
| --- | --- | --- | --- | --- |
| 6 hull plating, 4 scrap, 3 copper, 2 quartz | 3 × 2 cells | 45 s | left and right, on the top row | Builds, berths, repairs and refits the sub |

  - **The look:** the top row is a pressurised hall (a riveted drum with portholes, a hazard band, a crane rail and a hook block) with the moon pool cut in its floor. The bottom row is the open berth: heavy pillars with hazard bands, clamp arms and amber guide lamps. The berthed sub's dome rises into the pool.
  - **Rules:** it needs power to refill air, unload or build. It can't be removed while the sub is being built in it or berthed there, and the last dock can't be removed while a sub exists.
- **The submersible KS-1** (`src/actors/sub.ts` drawing and driving, `src/game/sub.ts` rules):
  - **Building it:** at a finished, powered dock, tap **Dock** (top right; keyboard G) and then **Build the sub here**. It costs **12 hull plating, 4 quartz, 3 copper and 2 kelp fibre**. A frame appears in the berth, and the build drone welds it in **60 s**, from the bottom up inside a scaffold (after any base frames waiting).
  - **The look, all drawn by code:**
    - a stubby hull in weathered Kestrel yellow over a steel belly, with a rust-red band;
    - rivets, panel seams, `KS-1 / KESTREL` stencils (they read correctly in both directions), hazard stripes, rust streaks, scratches and algae;
    - two lit portholes, a dorsal fin with a blinking red tail lamp, a snorkel mast, skids and a ducted brass propeller that spins with the thrust;
    - the glass dome cockpit, with the explorer visible inside (lime-glass helmet with its crest, face in profile, charcoal suit, chrome yoke) and a lit console.
  - **Boarding:**
    - Swim up to it and tap **Board** (touch button left of the lamp; keyboard **V**; gamepad **RB**). The same button reads **Exit** aboard.
    - While aboard, the diver is in the cockpit and the camera pulls back a little (`VIEW_H_SUB` = 820).
  - **Driving (heavy direct):** the same stick, keys, mouse or gamepad stick.
    - It cruises at 330 units/s (the diver swims at 230). **Boost** fires the thrusters for 1.6 s at 620.
    - It takes a moment to get going and longer to stop, and the hull tilts as it climbs and dives.
    - **Lamp** switches its lights. The drone follows at a wider distance and keeps up.
  - **Air (a mobile safe point):**
    - It holds **10 minutes**. Aboard, you breathe the sub's air, so your own tank stays full and the dive clock stays at zero.
    - The reserve refills at the surface and, faster, berthed in a powered dock. A chip under the watch shows hull, air and cargo.
    - With a minute left you get a warning. When it runs out you breathe from your own tank.
    - After a blackout you wake aboard the sub if it is nearer than the dome, has air and a sound hull. A blackout aboard puts you out first.
    - Off screen, a **KS-1** arrow at the screen edge shows where you parked it.
  - **Dents:**
    - Hitting rock faster than 170 units/s dents the hull: about 15% for cruising into a wall and up to 40% for a thruster ram. Scraping along rock is free.
    - Each dent gives a jolt, a puff of bubbles and a warning. Dents and rust show on the hull as it wears, and a crack appears in the dome below 35%.
    - At 0% you bail out where you are, and the crew winches KS-1 home to its dock. A breached sub can't be taken out until it is repaired.
  - **Docking:** drive slowly into a dock's berth and the clamps take it.
    - Berthed in a powered dock, air refills, and everything aboard (cargo and what you carry) unloads into storage.
    - Push the stick to release the clamps.
- **The Dock panel** (`src/ui/dock.ts`), laid out like tank care: the camera frames the dock and a panel on the right shows:
  - with no sub yet: its cost and **Build**;
  - while it is a frame: weld progress;
  - while it is out: how far away it is;
  - while it is berthed: hull and air bars, **Repair the hull** (1 hull plating per quarter of the hull) and the **three module slots**, each with **Take off** (two taps; materials come back into storage first). Modules not yet fitted are listed with their cost and **Fit**.
  - Keyboard: G opens, Esc closes, R repairs.
- **The first modules:**

| Module | Code | Cost | What it does | On the hull |
| --- | --- | --- | --- | --- |
| Cargo bay | CB-S | 3 hull plating, 2 scrap, 1 kelp fibre | Aboard, `bagLimits()` rises by 36 kg rated / 40 kg full (51 / 64 kg). Climbing out, what the diver can't carry stays in the hold; it rejoins the bag on boarding, and the dock unloads it. | A riveted belly pod with rust-red doors |
| Floodlights | FL-S | 2 hull plating, 2 quartz, 1 copper | A wide, bright bow cone (1150 radius against 560 for the running lamp) | Twin lamp housings on the bow |
| Grabber arm | GA-S | 3 hull plating, 2 copper, 1 scrap | Hold Collect with the claw by a material or a young creature to take it without climbing out (same work times; stay nearly still) | A folding yellow arm under the chin that reaches for the work |

  - Without the grabber, a one-time tip explains that it is needed to collect from the sub.
- **Costs in total:** dock 6 plating, sub 12, all three modules 8. That is 18 plating to get driving and 26 for the full kit, or about 36 minutes of one plate press for the sub and dock (18 with a whorl).
- **Other:**
  - Storage pods also unload the bag when the sub drives up to them.
  - The scanner beam comes from the dome while aboard.
  - Tend and the dome habitat need the diver out of the sub.
  - The scanner log's Outpost Kestrel section has a line for the sub and counts docks.
  - Build bar: 9 pieces (keyboard 1–9).
  - Saves: `sub` in `src/game/state.ts`. Older saves load with no sub.
- **Tested:**
  - Type check and production build pass.
  - Emulated iPhone 15 Pro in landscape, with a seeded base (storage pod, turbine, dock):
    - The Dock button appears at the dock. Build took the cost, and the frame showed welding at 45%. The drone finished it, and the toast and panel switched to the berthed view.
    - All three modules were fitted, costs were paid, and they showed on the hull.
    - Board (button and V): pushing the stick released the clamps. Driving in the basin showed the floodlight cone.
    - Ramming the basin's west wall at thruster speed dented the hull to 70%. A ram at 5% breached it: the diver bailed out, and the sub was towed back into the berth with the hull at 0. The cargo overflow went into the dock's storage.
    - Climbing out carrying 52 kg left the heaviest items in the hold, and they rejoined the bag on boarding.
    - Blacking out away from the sub woke the diver aboard it (no dome in that base).
    - The grabber pried loose a scrap spot under the bow (+1 scrap).
    - Floodlights in the dark grotto, facing left with the stencils readable. After a reload, the sub's place, hull, air, modules and aboard state were all kept.
  - No console errors. As before, the software test browser can't show the real frame rate or speeds; those need checking on the phone.
- Deployed: GitHub Actions run 43778650636 built and deployed to Pages successfully from `claude/funny-bell-6fvfos`. Merge it into the default branch `claude/underwater-game-m0-0qqajg` before the next session.

### After milestone 6: scrap balance and a test gift
- **Colin's question:** scrap is the first big bottleneck. Is a creature meant to make it? No: rays make copper, puffcaps kelp fibre and glowfins quartz. Scrap only comes from the 8 wreckage spots, at most about 0.8 a minute. The dock, sub and all three modules take about 59 scrap once their hull plating is counted.
- **Decided:** a **scavenger creature** that makes scrap, arriving with the **kelp forest (milestone 7)**, not the shallows. It is in DESIGN.md (The base, and the milestone 7 line).
- **Test gift:** existing saves get a one-time **30 scrap** delivered into base storage on the next load (`gift` in the save; `deliverGift` in `src/main.ts`).
  - It moves in as storage has room. Whatever doesn't fit waits and trickles in as space frees up, with a "Supply drop" message.
  - The tip id `gift-scrap-30` stops it repeating. New games don't get it.
  - Remove it once the scavenger creature exists.
- **Bug fixed while doing it:** unloading at a storage pod or the dock could take a negative amount (pulling items back into the bag) if storage ever held more than its capacity. Both now clamp at zero.
- Tested in the emulated iPhone: with 26 of 40 storage used, 14 scrap arrived and 16 waited. After freeing 6 slots, 6 more arrived. A reload kept the remaining 10 owed and didn't give the gift again. Type check and build pass.

### After milestone 6: unloading and trays on the Collect button
- **Colin's feedback:** swimming around a connected base, he kept emptying tank trays and unloading into storage by accident.
- **Now nothing moves just by swimming past.** Stop by a storage pod and **tap Collect** ("Unload 6 items into storage"), or stop by a tank with something in its output tray and tap Collect ("Take 2 from tank 1's tray"). Keyboard C, gamepad X; on PC the label ends "· press C".
  - It's a single tap: holding the button doesn't repeat it.
  - Materials, the drone repair and wild creatures still take priority on the button.
  - Aboard the sub, Collect unloads at a pod even without a grabber arm.
  - A one-time tip explains the change. Unpowered pods and pods still being welded say so on the label.
- **Still automatic, on purpose:** putting a creature from the jar into a tank (you carry it there to do that), and a berthed sub unloading at a powered dock (docking is already a deliberate act).
- **Colin's storage question, answered (no change):** storage is one shared pool. Each finished pod adds 40 to the total. A conveyor from any pod sends what its far end needs: kelp fibre to a feeder; scrap and copper to a press, emptiest hopper first, so the 2:1 ratio holds. A possible later need: per-material limits or a sorter, so creature output can't fill storage and leave no room for plating.
- Tested in the emulated iPhone: waiting by a pod and a tank moved nothing. A tap unloaded 3 scrap and took 2 copper from the tray. No console errors.

### After milestone 6: terraces under the shelf, and jar deposits on the Collect button
- **Colin's feedback:** past the shelf edge, the cliff drops about 17 m in one grid cell, so pieces built out over the basin stood on legs all the way to the floor. He chose a **short taper**, and is fine with refunds for pieces inside the new rock.
- **The terraces** (`TERRACES` in `src/world/terrain.ts`): three rock ledges, each two grid columns wide, at 2, 5 and 8 rows up, stepping down from the shelf (row 11).
  - Each riser sits inside its own column, so the open cells beside it stay clean. A piece built off the shelf edge now stands on legs at most 3 rows tall.
  - The rock is painted over the ledges (the cliff rock now starts at x = −320). Plants, boulders and the anemone there follow the new ground.
  - **Cost:** 22 cells, not the 30 estimated, because the old cliff column was already rock. The site is now **658 open cells** (was 680), still about 20 times the original shelf.
  - **Refunds for older saves:** on load, any piece with a cell in the new rock comes out through the same code as Remove (`removePiece` in `src/ui/build.ts`), with its cost, lines, machine contents, tray and whorls refunded, into storage first.
    - Creatures in a buried tank move to another tank with room, or swim home.
    - A sub frame in a buried dock is refunded; a built sub there is just released.
    - A diver or sub saved inside the new rock is lifted out.
    - A one-time message lists what came out.
- **Jar deposits on the Collect button:** with a creature in the jar, stop by a tank and tap Collect ("Put young puffcap in tank 1"; "Tank 1 is full" when it has 4). This comes before the tray action. Texts that said "swim up to the tank" now say "tap Collect".
- Tested in the emulated iPhone with an old-layout save: a storage pod and a tank (holding a young ray) in the new rock came out. Storage got back exactly their cost (5 scrap, 1 copper, 3 quartz, 2 kelp fibre), and the ray moved to the other tank. A dome on the lowest ledge stayed, and a tap put the puffcap from the jar into the tank. Screenshots of the terraces in the swim and build views. No console errors.

### Milestone 7, part 1: the first gear gate and the kelp forest
- **Feedback on the last build:** milestone 6 and its follow-ups (sub, dock, Collect-button actions, terraces) are all fine. Nothing to fix.
- **Colin's decisions before building:**
  - **Costs:** Lab cheap, Workshop needs plating (numbers below).
  - **Blueprints:** specific data sources unlock specific blueprints, researched in the Lab over time while it has power.
  - **Species:** tinker crab (scavenger, makes scrap) and lantern shrimp (cleaner). A third, a small wary predator, may come later.
  - **Materials and pieces:** holdfast resin and lumen moss; the pieces are the Grand tank GT-1, Sorting pod SP-1 and Air relay AR-1 (part 2). Colin added: **power should become a real mechanic later** (nuclear, fusion or Choir power needed to grow the base further). Recorded in DESIGN.md.
  - **Drone:** one upgrade (DR-2 welder, about 2× faster) arrives in part 2, built in the Workshop from a blueprint found in the caves.
  - **Sub:** it can go into the open kelp forest, but not through the cave; the cave system is diver-only.
  - **Split:** part 1 is this session; part 2 is the kelp caves dungeon, the kelp base pieces and the drone upgrade.
- **Lab** (piece 10, `LAB-`, keyboard 0) and **Workshop** (piece 11, `WS-`). Same collar and power rules as every piece. Rules in `src/game/gear.ts`, panel in `src/ui/station.ts`, drawings `drawLab` / `drawWorkshop` in `src/world/basegfx.ts`.

| Piece | Size | Collars | Cost | Weld | Job |
| --- | --- | --- | --- | --- | --- |
| Lab | 1 × 1 | left, right, up | 3 scrap, 3 quartz, 2 copper | 26 s | Decodes data finds and scans into blueprints |
| Workshop | 2 × 1 | left, right | 4 hull plating, 3 scrap, 2 copper | 36 s | Builds gear from blueprints |

  - **Look:** the Lab is a pressure capsule with one big brass-ringed port onto a lit bench, sample jars and a cartridge reader whose screen has a scan bar sweeping while it decodes; a little mast and dish on the roof. The Workshop is a riveted shed with a half-rolled door, a parts rack, and a yellow fabrication arm that slides and swings with a flickering torch and sparks while it builds.
  - **The panel:** stop beside one and tap **Lab** / **Workshop** (green button, top right; keyboard K). The camera frames the piece, the air clock pauses, and a panel shows the job and its progress, data finds carried, and blueprints (Lab) or gear (Workshop). A Workshop job can be stopped (two taps) for a refund. Jobs only run with power, and pause without it.
  - Removing a Lab or Workshop mid-job gives back the data find or the materials.
- **The dive light DL-1** (the first gear):
  1. Scan the survey sled wreck. Then stop by it and **hold Collect: "Unclip the SLED 2 recorder"** (1.6 s). Data finds weigh nothing and survive blackouts.
  2. At a Lab: **Decode** the dive light blueprint (75 s, uses the recorder).
  3. At a Workshop: **Build** the dive light: **2 hull plating, 2 quartz, 1 copper**, 45 s.
  4. It replaces the shoulder lamp: reach 980 (was 560), brighter, and a wider beam (`DIVE_LIGHT` / `LAMP` in `src/game/gear.ts`). The cave's black throat thins to a deep shadow your light cuts through.
  - With it (and the lamp on) the diver can pass the "too dark" point in the east cliff cave. Lamp off: "switch your dive light on".
  - The scanner log has a **Gear and blueprints** section saying what to do next.
- **The world grew east** (`src/world/terrain.ts`): `WORLD_W` 9000 → 15600.
  - **The east cliff** now tops out at a shallow rock **shelf** about 2.8 m under the surface (8640–9600). In a side view a notch can't be bypassed, so the sub's way over is the whole shelf, blocked by the **survey boom gate** (`KS BOOM 1`, x = 8900): a rusted steel gate hanging from a post that breaks the surface. Its **winch** is on the forest side: hold Collect there, **"Wind the boom winch"** (3 s), and the gate swings up out of the water for good (`boomOpen` in the save). The sub is stopped by the closed gate, as tested.
  - **The cave** now runs right under the shelf and comes out on its east face, about 9 m down, above the forest. It is still too tight for the sub from either end.
  - **The kelp forest** (10050–14800): floor about 17 m deep, with three rock outcrops. The bake that shades daylight adds a canopy factor there, so it is dim, green and enclosed.
    - **Giant kelp** (48 stalks on High) from floor to surface, golden brown, with knotted holdfasts at their feet; dark stalks in the foreground; a wary silverbar shoal between them.
    - **Bladder kelp** bushes with round floats, and **lumen moss** glowing warm yellow-green on the outcrops and the foot of the east wall (soft lights that pulse slowly).
    - **The east wall** with the **mouth of the kelp caves**, a dark recess going black further in. A banner says the crew is still surveying the way in (part 2). A third **air tank upgrade** hides at the mouth (3 in total now).
  - **New materials** (`src/game/state.ts`): **holdfast resin** (1 kg, "Scrape off", 7 spots by holdfasts) and **lumen moss** (0.5 kg, "Peel off", 5 spots on shaded rock), plus 2 scrap spots. Their chips (amber drop, glowing moss) hide until you have some. With seven materials the chip column wraps into a second column on short screens.
  - **New scanner entries (9):** Survey boom gate, Kelp forest, Giant kelp, Bladder kelp, Lumen moss, Tinker crab, Lantern shrimp, The kelp caves; the sled and cave entries were updated.
- **New creatures** (`src/actors/critters.ts`, homes in `src/world/wildlife.ts`, rules in `src/game/creatures.ts`). Curious but wary: they edge closer to a diver who keeps still and keep a little distance; they bolt from a fast swimmer or a boost from further away than shallows creatures do.
  - **Tinker crab:** a small decorator crab with a low rust-brown shell. It has metal flakes, a bit of shell and a curl of kelp glued to its back, two stalk eyes whose shine catches the lamp (amber), and claws with tiny teeth that pick at things. It walks the floor. One adult and three young among the holdfasts (10520, 12300, 13480).
  - **Lantern shrimp:** see-through, with a curved segmented body, one big dark eye, long waving antennae, flickering swimmerets and a row of amber lights down its side. One adult and two young by the glowing moss (11080, 13980).
  - **Their needs and pairings** (Colin: mixed tanks should become the best setup; clashes stay):

| Species | Favourite plant (cost) | Company | Makes | Pairing |
| --- | --- | --- | --- | --- |
| Tinker crab | Bladder kelp (1 resin) | any tank-mate | **scrap metal** | Clash: snips puffcap ribbons (puffcap −40% comfort) |
| Lantern shrimp | Lumen moss (1 moss) | content with **another species to clean** | lumen moss | Cleaner: each other species in its tank makes **+25%**, and the tank fouls **35% slower** |

  - So a crab with a shrimp is already better than crabs alone. Today one tank holds one plant, so the shrimp settles at 70% comfort beside crabs on bladder kelp. Part 2's Grand tank with two planters lets both reach 100%: the mixed tank becomes the best setup.
  - A grown, happy crab makes scrap at the usual 0.25/min before bonuses (with a shrimp, shoal and reef bonuses, more). That is the long-term scrap source Colin chose.
  - Care panel: the two new plants, and "+N% cleaned" in the output line. Tank swimming: crabs walk the tank floor, shrimp keep low-to-middle.
- **The 30-scrap test gift is gone.** Any scrap still owed is dropped on load (`gift` stays in the save type only so old saves load).
- **Other:** a dropped sample bag now rests on the real seabed anywhere (it used to be capped at 1290, mid-water in the basin). The foreground kelp layer keeps its old layout in the shallows (`FRONT_REF`). Some procedural decoration in the shallows is reshuffled slightly, because the random sequence changed with the bigger world.
- **Tested** (type check and production build pass; emulated iPhone 15 Pro in landscape, scripted):
  - Teleported through the cliff cave mouth, the shelf, the boom gate and winch, the tunnel with the light, the tunnel exit, three places in the forest and the kelp caves mouth, with screenshots.
  - Without the light the diver stops at the gate with the "pitch black" banner. With it, the diver follows the tunnel through.
  - A seeded base (turbine, storage, Lab, Workshop, tank, all powered). The Lab button appeared; Decode used the recorder, and 80 simulated seconds gave the blueprint. The Workshop took 2 plating and built the dive light in 50 s.
  - A tank with a grown crab, a grown shrimp and a young puffcap on bladder kelp, after 4 simulated minutes: crab 100% comfort, shrimp 70%, puffcap 10% (snipped by the crab). The water dropped more slowly, and the tray held 1 scrap and 1 lumen moss.
  - A sub driven at the closed boom gate stopped at it.
  - The old save's leftover gift (12 owed) was dropped on load.
  - No console errors. As before, the software test browser can't show the real frame rate.

## Next

The prompt for the next session is in `docs/prompts/milestone-7-part-2.md`.

**Milestone 7, part 2: the kelp caves** (Colin's decisions above):
- **The major site**, through the mouth in the forest's east wall (`SITE_MOUTH` in `src/world/terrain.ts`; the banner in `src/main.ts` says it opens next). It is diver-only and works like a Zelda dungeon: a few navigation puzzles (ideas: currents through narrow squeezes, a flooded chamber lit only by lumen moss you carry, an old Kestrel hatch to wind open, a grown lantern shrimp or glowfin lighting a passage), and the **cutter torch blueprint** at the end (DESIGN.md gives the kelp forest both the cutter torch and the tow line; check with Colin whether the tow line comes from here too).
- **Kelp forest base pieces**, made from holdfast resin and lumen moss, each unlocked by Lab research on kelp forest scans and samples:
  - **Grand tank GT-1:** 3 × 2 cells, 8 creatures, a planter with two plant kinds. With it a crab and shrimp tank reaches 100% for both.
  - **Sorting pod SP-1:** storage with per-material limits, so creature output can't fill storage.
  - **Air relay AR-1:** a buoy planted out in the world that refills air and is a wake-up point far from home.
- **DR-2 drone welder** (about 2× faster), built in the Workshop from a blueprint found in the caves. `droneWeldRate` in `src/game/state.ts` is the hook.
- Ask Colin the costs and research sources for each, and the puzzle ideas.

Where things are (milestone 7 part 1): gear, research and Workshop rules in `src/game/gear.ts`; the panel in `src/ui/station.ts`; recorder and winch holds, the cave and sub gates, and the dive light in `src/main.ts` (search "Milestone 7"); the forest's drawing in `Scenery.buildForest` (`src/world/scenery.ts`); the boom gate is `boom` / `SHELF` / `BOOM_X` in `src/world/terrain.ts`.

## Problems and open questions

- **Milestone 7 part 1 numbers to tune after Colin plays:** Lab and Workshop costs and weld times (`PIECES`); research 75 s and build 45 s, dive light cost and its reach and brightness (`src/game/gear.ts`); the shrimp's +25% cleaning bonus and 35% slower fouling (`CLEAN_BONUS`, `SHRIMP_CLEAN_WATER`); resin and moss weights and spot counts; how dim the forest is (the canopy factor in `bakeSkyVisibility`).
- **The east cliff changed shape.** Its top used to be right at the surface; it is now a 2.8 m deep shelf (so the sub has a way over). The cave mouth is where it was.
- **Power as a mechanic later** (Colin): see DESIGN.md, The base. Not planned into a milestone yet.

- **Milestone 6 numbers to tune after Colin plays** (`src/game/sub.ts`, `src/actors/sub.ts`):
  - sub cost (12 plating + 4 quartz, 3 copper, 2 fibre), weld 60 s, dock cost and weld time in `PIECES`;
  - air 10 min; it refills in 20 s at a powered dock and 30 s at the surface;
  - dents above 170 units/s at 1/1100 per unit; repairs cost 1 plating per quarter;
  - cruise 330, thrusters 620 for 1.6 s, and how slowly it speeds up and stops;
  - the cargo bay's +36 / +40 kg; module costs.
- **The sub on the phone:** the controls are the swimming ones, so check it feels heavy but not sluggish on the touch stick. If it is too slow to stop, raise the 0.55 drag in `Sub.update`.
- **The sub isn't solid to the base.** Like the diver, it passes in front of base pieces, so it never snags on the factory. Only rock dents it.
- **The cave gate (decided in milestone 7):** the cave stays diver-only; the sub reaches the forest over the cliff-top shelf once the boom gate is wound open.

- **Milestone 5 part 2 numbers to tune after Colin plays** (top of `src/game/factory.ts`): press 0.5 plating/min, recipe 2 scrap + 1 copper, hoppers 6 / 3, rack 4; tray 4 per tank; CB-1 4 and CB-2 10 items/min; FL-1 10 and FL-2 25 L/min; tier-2 plating cost (1 per 4 cells); plating weight 4 kg; the press's cost and build time in `PIECES`.
- **Tank output no longer goes straight to storage.** Without a conveyor, creatures fill the 4-item tray and pause until the diver swims by. If that feels like a chore before conveyors are affordable, a bigger tray or a "crew empties the tray when you visit the dome" rule are easy changes.

- **Milestone 5 part 1 numbers to tune after Colin plays** (all in `src/game/factory.ts` and the top of `src/game/creatures.ts`):
  - conveyor 6 items/min, pipe 10 L/min, line costs, the longest line (30 cells);
  - feeder 0.5 fibre/min, 12 L per fibre, hopper 4, mash tank 24 L, trough 12 L, 1 L = 20% Fed;
  - shoal +15%, reef +10% each up to +50%;
  - whorls ×2 / ×3.
  - Basin depth and brightness: `BASIN_FLOOR` in `src/world/terrain.ts`, `depthLook` in `src/fx/shared.ts`.
- **Lines are drawn over pieces.** They run across the tops of pieces and drop into them, so a long line can cross in front of other pieces. That keeps them readable on a phone. If it gets busy, a later option is drawing them behind, or letting Colin pick the lane height.
- **Old saves and decorations.** The landmarks stayed put, but some procedural plants, corals and rock texture between them moved (the random sequence changed with the bigger world).

- **Colin's answers on the base and factory direction (after milestone 4):**
  1. Build the big base and factory groundwork **before** the submersible. It is now milestone 5; every later milestone moved up by one (the sub is 6, the first gear gate 7, and so on; DESIGN.md has the new list). Milestone numbers in the history above are the old ones.
  2. The build area must be **wider and deeper**, with plenty of room for factory parts. Later, tunnelling lets the base expand down into the rock once the water space is full.
  3. **Real production chains with rates to balance**, not just a few simple combiners.
  4. The **auto feeder** is a base piece that feeds tanks from stored kelp fibre, including what puffcaps produce.
  5. Steam: keep building as a web link in small chunks; wrap it as a desktop app in the polish milestone (or earlier for a store page).
- **Colin answered the milestone 5 questions** (written up in DESIGN.md, The base, "Milestone 5 decisions"): a site at least 20 times bigger in a deep basin, different transport for different material kinds, the auto feeder as the first production line, and creature output scaled by both numbers and a rare output-multiplying item that also raises input use. The prompt for the next session is in `docs/prompts/milestone-5.md`.
- **Phone and PC for a big base:** the build view will need panning and zooming for a large base. Keep it usable on the phone, but PC with a mouse may be the best way to manage a big factory, as Colin expects.

- **Creature numbers to tune after Colin plays** (all at the top of `src/game/creatures.ts`): hunger 15 min, feed +60%, dirt per creature 20 min, filter rate, clean +40%, sick below 25%, 6 min sick to dormant, 8 min to grow, 90 s to hatch, 4 min per material, 4 per tank, 2 tanks per pump. Catch times are in `src/world/wildlife.ts`. If losing creatures feels too harsh for the cozy shallows, raise `SICK_SECONDS` or slow `HUNGER_RATE`.
- **Mixed tanks as the goal (Colin, after milestone 5 part 1).** As new species arrive, the ideal tank should hold two or more species: through **both** tank upgrades (bigger tanks, planters with more than one plant kind) **and** partner species that help each other (Colin chose both, and wants clashes kept). Today's ideal (one species per tank with its own plant) is fine for now. Recorded in DESIGN.md, Creature care. Plan it with Colin when the next species are designed (kelp forest, milestone 7; breeding, milestone 9). Possible small help before then: a "good tank-mates" line in each scanner entry, or a warning before putting a glowfin in with a puffcap.
- **Gamepad can't open Tend yet** (touch and keyboard T work). Add a button when gamepad play matters (milestone 11 polish).
- **Grown creatures as keys** (a grown glowfin lighting a passage) and breeding come in milestone 8, as DESIGN.md plans. Grown glowfins already glow brighter, ready for that.
- **Revival pool** is not built. Dormant remains are counted in the save (`dormant`) for when it is.
- **Egg cases for puffcaps and rays** have names in the code, but only glowfin eggs exist in the world for now. Breeding (milestone 8) can add the others.

- **Build drone and dive bag numbers to tune after Colin plays:**
  - drone repair cost (`DRONE_REPAIR_COST`) and repair time (`REPAIR_SECONDS`);
  - build times (`buildTime` in `PIECES`);
  - material weights (`kg` in `MATERIALS`) and the 15 kg / 24 kg limits (`BAG_RATED_KG`, `BAG_MAX_KG`);
  - the penalty sizes in `Diver.update` (swim −22% per rated load, sink 30 units/s per rated load) and the air use in `src/main.ts` (+20% per rated load).
- **Drone upgrade path:** not built yet, by design. Colin wants drone and diver upgrades found in future biomes; the drone starts small so upgrades can show on it. The hooks are in place (see the milestone 3 follow-up notes). When do upgrades arrive: with the Workshop in milestone 6, or earlier? Ask Colin.
- **The drone doesn't avoid rock on long flights.** It follows the diver's own path, and when idle it parks above the base, so in practice it stays in open water. If it is ever seen clipping through rock, that is the place to look.
- **Base growth across biomes (Colin, after milestone 3).** Colin wants to expand the base with each new biome, with bigger, more complex and more rewarding pieces. This is recorded in DESIGN.md under The base. When planning milestones 6, 7, 9 and 10, include new base pieces made from that zone's materials. Open questions for Colin:
  - Should new biomes grow the one base at the Kestrel site (a larger grid and upgraded piece tiers), or allow small outposts in each zone?
  - Which kind of reward matters most to him: new abilities, faster crafting, comfort and looks, or stronger creature care?
  - The code is ready for it. A new piece is one entry in `PIECES` (`src/game/base.ts`) plus a drawing in `src/world/basegfx.ts`. The grid size is `GRID_COLS` / `GRID_ROWS`.

- ~~GitHub Pages switch~~ Done: Colin set Pages → Source to GitHub Actions, and the deploy now succeeds.
- **Which branch deploys.** Colin added the deployment-branch rule `claude/*` (Settings → Environments → github-pages) on 2026-11-15, so every `claude/...` session branch now deploys to the play link on push. Before that, only the default branch `claude/underwater-game-m0-0qqajg` could deploy, and milestone 1 builds were copied onto it. The play link shows whichever branch pushed last, so run one session at a time. Keep merging finished work into the default branch so it stays current.
- **Milestone 3 numbers to tune after Colin plays:** piece costs (`PIECES` in `src/game/base.ts`), storage per pod (40, `STORAGE_PER_POD`), the grid size (11 × 3 cells of 112 units) and the build-mode zoom (`VIEW_H_BUILD`).
- **Possible later (Colin open to it):** a buildable support pylon, so foundations can go anywhere in the middle of the basin, not just on the terraces.
- **Base pieces are not solid.** The diver swims in front of corridors, turbines and pods, and "inside" domes. This keeps movement smooth. If Colin wants to bump into the base, collisions can be added per piece.
- **Milestone 2 numbers to tune after Colin plays:** tank size (75 s, `BASE_OXYGEN`), upgrade size (+20 s), the drain while boosting or working, the regrow time (6 min of play, `REGROW_SECONDS`), the work time per material (`EFFORT` in `src/world/pickups.ts`) and the scan time (1.4 s). All are single numbers in `src/game/state.ts`, `src/main.ts` and `src/game/scanner.ts`.
- **Dive light vs. shoulder lamp.** The diver already has a shoulder lamp from milestone 1. DESIGN.md's "dive light" is treated as a stronger light built in milestone 6, which opens the dark cave in the east cliff. The cave message and the sled scan say so. If Colin pictures it differently, change it before milestone 6.
- **Health** is not in yet. Nothing in the shallows can hurt you, so it arrives with predators and crush depth (milestones 7 and 9).
- **Things to watch in Colin's review:** whether the kelp is too bright or too busy, how strong the caustics and water wobble are, and how fast the diver swims. Each is a single number in the code and easy to tune.
- **Frame rate on the real phone.** Milestone 0: Colin measured a steady 60 fps in both presets. Milestone 1: mid 30s fps on High with the lamp on in the deep grotto (Colin, iPhone). He accepts this; graphics stay as they are. Ultra on the PC is not yet tested. If we tune performance later (milestone 11), the grotto with the lamp on is the scene to profile: there the lighting shader adds up the most lights and the glow layer is busiest.
