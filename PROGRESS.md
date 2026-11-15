# Fathomlight progress

Last updated: 2026-11-15, **milestone 3 follow-up (build drone and dive bag weight) deployed**. Colin was happy with milestone 3 and flagged nothing to fix. Next is milestone 4 (creatures).

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

## Next

**Milestone 4: Creatures.** Collecting creatures, the creature tank, feeding, the filter pump and the three needs (hunger, comfort, water quality). Tanks and filter pumps will be new base pieces using the same collar and power rules (`src/game/base.ts`: add to `PIECES`, then draw them in `src/world/basegfx.ts`).

## Problems and open questions

- **Build drone and dive bag numbers to tune after Colin plays:**
  - drone repair cost (`DRONE_REPAIR_COST`) and repair time (`REPAIR_SECONDS`);
  - build times (`buildTime` in `PIECES`);
  - material weights (`kg` in `MATERIALS`) and the 15 kg / 24 kg limits (`BAG_RATED_KG`, `BAG_MAX_KG`);
  - the penalty sizes in `Diver.update` (swim −22% per rated load, sink 30 units/s per rated load) and the air use in `src/main.ts` (+20% per rated load).
- **Drone upgrade path:** not built yet, by design. The hooks are in place (see the milestone 3 follow-up notes). When do upgrades arrive: with the Workshop in milestone 6, or earlier? Ask Colin.
- **The drone doesn't avoid rock on long flights.** It follows the diver's own path, and when idle it parks above the base, so in practice it stays in open water. If it is ever seen clipping through rock, that is the place to look.
- **Base growth across biomes (Colin, after milestone 3).** Colin wants to expand the base with each new biome, with bigger, more complex and more rewarding pieces. This is recorded in DESIGN.md under The base. When planning milestones 6, 7, 9 and 10, include new base pieces made from that zone's materials. Open questions for Colin:
  - Should new biomes grow the one base at the Kestrel site (a larger grid and upgraded piece tiers), or allow small outposts in each zone?
  - Which kind of reward matters most to him: new abilities, faster crafting, comfort and looks, or stronger creature care?
  - The code is ready for it. A new piece is one entry in `PIECES` (`src/game/base.ts`) plus a drawing in `src/world/basegfx.ts`. The grid size is `GRID_COLS` / `GRID_ROWS`.

- ~~GitHub Pages switch~~ Done: Colin set Pages → Source to GitHub Actions, and the deploy now succeeds.
- **Which branch deploys.** Colin added the deployment-branch rule `claude/*` (Settings → Environments → github-pages) on 2026-11-15, so every `claude/...` session branch now deploys to the play link on push. Before that, only the default branch `claude/underwater-game-m0-0qqajg` could deploy, and milestone 1 builds were copied onto it. The play link shows whichever branch pushed last, so run one session at a time. Keep merging finished work into the default branch so it stays current.
- **Milestone 3 numbers to tune after Colin plays:** piece costs (`PIECES` in `src/game/base.ts`), storage per pod (40, `STORAGE_PER_POD`), the grid size (11 × 3 cells of 112 units) and the build-mode zoom (`VIEW_H_BUILD`).
- **Base pieces are not solid.** The diver swims in front of corridors, turbines and pods, and "inside" domes. This keeps movement smooth. If Colin wants to bump into the base, collisions can be added per piece.
- **Milestone 2 numbers to tune after Colin plays:** tank size (75 s, `BASE_OXYGEN`), upgrade size (+20 s), the drain while boosting or working, the regrow time (6 min of play, `REGROW_SECONDS`), the work time per material (`EFFORT` in `src/world/pickups.ts`) and the scan time (1.4 s). All are single numbers in `src/game/state.ts`, `src/main.ts` and `src/game/scanner.ts`.
- **Dive light vs. shoulder lamp.** The diver already has a shoulder lamp from milestone 1. DESIGN.md's "dive light" is treated as a stronger light built in milestone 6, which opens the dark cave in the east cliff. The cave message and the sled scan say so. If Colin pictures it differently, change it before milestone 6.
- **Health** is not in yet. Nothing in the shallows can hurt you, so it arrives with predators and crush depth (milestones 7 and 9).
- **Things to watch in Colin's review:** whether the kelp is too bright or too busy, how strong the caustics and water wobble are, and how fast the diver swims. Each is a single number in the code and easy to tune.
- **Frame rate on the real phone.** Milestone 0: Colin measured a steady 60 fps in both presets. Milestone 1: mid 30s fps on High with the lamp on in the deep grotto (Colin, iPhone). He accepts this; graphics stay as they are. Ultra on the PC is not yet tested. If we tune performance later (milestone 11), the grotto with the lamp on is the scene to profile: there the lighting shader adds up the most lights and the glow layer is busiest.
