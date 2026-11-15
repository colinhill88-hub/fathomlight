# Fathomlight progress

Last updated: 2026-11-15, milestone 1 follow-up 2 (bigger head, shorter diver, wider view). **Colin approved the water, effects, controls and scenery; the redesigned diver is waiting for his OK before milestone 2.**

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
- **Camera zoomed out:** the view now shows 640 world units of height instead of 560 (`VIEW_H` in `src/main.ts`), which leaves room for base pieces later. Change that one number to zoom in or out.

## Next

**First, Colin approves the new explorer suit.** Everything else in milestone 1 is approved. If he asks for more suit changes, make them before starting milestone 2.

**Then milestone 2: Shallows.** This is the first real zone: oxygen, scanner, collectible materials and saving. The oxygen and depth readout is a good first home for the dive-watch gauge.

## Problems and open questions

- ~~GitHub Pages switch~~ Done: Colin set Pages → Source to GitHub Actions, and the deploy now succeeds.
- **Which branch deploys.** Only the repository's default branch, `claude/underwater-game-m0-0qqajg`, may deploy to Pages. A push from a session branch builds but its deploy step is refused (milestone 1 run 43655777497). The fix used in milestone 1, with Colin's OK: fast-forward the default branch to the session branch's commit (`git push origin HEAD:claude/underwater-game-m0-0qqajg`), which deployed successfully in run 43656384925. To make session branches deploy directly instead, Colin can add `claude/*` under Settings → Environments → github-pages → Deployment branches.
- **Things to watch in Colin's review:** whether the kelp is too bright or too busy, how strong the caustics and water wobble are, and how fast the diver swims. Each is a single number in the code and easy to tune.
- **Frame rate on the real phone.** Milestone 0: Colin measured a steady 60 fps in both presets. Milestone 1: mid 30s fps on High with the lamp on in the deep grotto (Colin, iPhone). He accepts this; graphics stay as they are. Ultra on the PC is not yet tested. If we tune performance later (milestone 11), the grotto with the lamp on is the scene to profile: there the lighting shader adds up the most lights and the glow layer is busiest.
