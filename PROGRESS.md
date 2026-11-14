# Fathomlight progress

Last updated: 2026-11-14, after milestone 0 (Setup).

Play link (once deployed): https://colinhill88-hub.github.io/fathomlight/

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
| Soft shadows | off | on (switch exists; the effect itself comes later) |

Cut from High so far: the phone renders at 2× instead of its native 3×. This leaves headroom for the heavy effects in milestone 1. Revisit it once those effects exist.

## Done

### Milestone 0: Setup
- `DESIGN.md` saved. The concept art screenshots are in `docs/art/`.
- Project set up with PixiJS, TypeScript and Vite (`npm run dev`, `npm run build`).
- GitHub Actions workflow `.github/workflows/deploy.yml` builds the game and deploys it to GitHub Pages on every push to `main` or `claude/**` branches.
- An empty underwater scene. The water is drawn by a custom shader with a depth gradient, swaying light shafts and slow murk. Behind it are seeded procedural rock ridges with depth fog and parallax, plus a sandy seabed and drifting marine snow. The view drifts slowly sideways so the parallax shows.
- iPhone landscape: full-screen layout using the whole screen, including around the camera cutout. Page scrolling and zooming are blocked. Portrait on a phone shows a "Turn your phone sideways" message. Rendering pauses when the app is in the background.
- Home-screen install: manifest, Apple tags and an icon drawn by code (`scripts/make-icons.mjs`).
- Settings panel (gear, top right): Auto / High / Ultra buttons, plus a live frame rate, render resolution, renderer and build stamp. The build stamp shows which version the phone has loaded.
- Tested: type check and production build pass. A headless browser emulating an iPhone in landscape and a 1600×900 PC loaded the game with no errors. Presets switch at runtime (High 1468×686 → Ultra 2202×1029 on the iPhone-sized screen), and the rotate message appears in portrait. The frame rate could not be measured meaningfully here because the test browser has no real GPU. That has to be checked on the iPhone.

## Next

**Milestone 1: Water and diver.** This is the look-and-feel benchmark: one explorer swimming through a small lit scene with every visual effect on (dynamic lights, light shafts, caustics, depth fog, glow, water distortion, particles, and Ultra extras). It adds touch controls (a virtual stick) and keyboard, mouse and gamepad controls. Do not move on until Colin approves the look.

## Problems and open questions

- **One-time GitHub Pages switch (blocking the play link).** The first deploy run built the game, then stopped at `configure-pages` with "Get Pages site failed... Not Found", because Pages is not switched on yet. Fix: in the repository on GitHub, go to Settings → Pages → "Build and deployment" → Source and choose **GitHub Actions**. Then re-run the workflow from the Actions tab, or push any commit. The workflow cannot switch Pages on by itself. Note that GitHub Pages on a *private* repository needs a paid GitHub plan; on a free plan the repository must be public.
- **Which branch deploys.** Only the repository's default branch may deploy to Pages by default. This branch will be the default because it is the first one pushed to the empty repository. If a `main` branch is added later, either merge into it or allow the branch under Settings → Environments → github-pages.
- **Frame rate on the real phone.** Not yet measured (see Tested above).
