# Prompt: painted tank art (living tanks, the image part)

Paste everything below the line into a new session connected to the Fathomlight repository (written for Codex, which can generate images; any tool that can make images works). Run it after the Phases 20–21 pull request (#50) is merged. It is small enough to do before or after Session B.

---

Read `AGENTS.md` first, then the files it lists: `docs/AI_DEVELOPMENT_HANDOFF.md`, `docs/ROADMAP.md`, `DESIGN.md` and the top of `PROGRESS.md`. Start a branch from the latest default branch (`claude/underwater-game-m0-0qqajg`). Explain things to me in plain language: I'm not a programmer. (Kestrel is a boy: he/him.)

This session finishes the last part of "living tanks" (Session A, Phase 21): **painted art for the creature tanks.** Session A drew the tanks' sand, light and eight decorations in code because it couldn't make images.

## What to do

1. **Generate the images** in `docs/art/tank-image-prompts.md`, in order. Use its shared style for every one.
   - Before wiring anything in, **show me the three back walls and two or three decorations** as pictures, so I can approve the look.
   - Follow the art rules:
     - original;
     - painterly, matching the game;
     - no cyan, violet or magenta (those belong to the Choir);
     - `.webp`, kept small for the iPhone;
     - every file logged in `docs/art/SOURCES.md` with its prompt.
2. **Wire them into the tanks.** Keep the code-drawn version as the fallback, with `?art=procedural` showing it, as the rest of the game does. Load the images the way the existing painted art is loaded (`src/art/imageAssets.ts`).
   - **Back walls:** in `src/world/habitatWater.ts`, behind everything else, fitted to the tank's water box:
     - small tanks use the small back wall;
     - Grand tanks use the Grand one;
     - the display aquarium uses the display one (`isDisplay` in `src/game/creatures.ts`).

     Keep the caustic light and the surface ripples on top.
   - **Sand strip:** replaces the code-drawn sand bed along the bottom.
   - **Rocks:** a couple of pieces per tank, placed behind the plants, varied by tank so neighbouring tanks don't look identical.
   - **Decorations:** replace the code drawings in `src/world/tankDecor.ts`, at the same size and position. Keep the lantern's glow and the sea chest's bubbles.
   - **Caustics texture (if made):** drives the moving light in `habitatWater.ts`.
3. The art must look right both **outside** (the base from the water) and **inside** (the tall tank rooms you walk past). The same tank life serves both; see `src/interior/baselevel.ts` `boxOf`.
4. **Keep it smooth on the iPhone.**
   - Only tanks on screen draw (already true).
   - Load each image once and share it between tanks.
   - Compare the frame rate on the same save before and after, as Session A did.

## Rules

- **Never break saves** (`fathomlight.save.v1`). This session needs no save changes.
- **Bindings** only in `src/controls/bindings.ts` (none needed).

## Before finishing

- Run `npm ci`, `npm run typecheck`, `npm run build` and `node scripts/test-progression.mjs`.
- Check it in `vite preview` (not `vite dev`), at desktop size and iPhone landscape. Take screenshots I can compare:
  - a small tank, a Grand tank and the display aquarium, from outside and inside;
  - all eight decorations;
  - before and after.

  No console errors.
- Update `PROGRESS.md`, `docs/ROADMAP.md` (mark living tanks fully done; never delete anything), `docs/art/SOURCES.md` and the handoff's source map.
- Commit, push and open a pull request. Don't merge it: I'll merge it myself.
- Tell me exactly where to look in the game, on my PC and my iPhone, and plainly what you couldn't check.
