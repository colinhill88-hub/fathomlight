# Phase 17 prompt: Kestrel's kit (the Field kit portrait, and walking mag-boots)

Paste everything below the line into a new session connected to the Fathomlight repository.

---

Read `AGENTS.md` first, then the files it lists: `docs/AI_DEVELOPMENT_HANDOFF.md`, `docs/ROADMAP.md`, `DESIGN.md` and the top of `PROGRESS.md`. Start a branch from the latest default branch (`claude/underwater-game-m0-0qqajg`). Explain things to me in plain language: I'm not a programmer. If something I ask for is unclear or is my decision to make (names, feel, costs, which option), ask me before building; otherwise pick a sensible default and tell me what you chose.

This session is **Phase 17**, two parts that both work on Kestrel's rig and poses. The full brief is in `docs/ROADMAP.md` under "Phase 17", and my decisions are under "Colin's decisions". Do part 1 first: it's smaller.

## 1. The Field kit portrait uses the real Kestrel (17a)

In the Field kit (press I), the Kit tab's portrait of Kestrel is a separate boxy drawing (an SVG in `src/ui/fieldkit.ts`). It should look like the character.

- Render the real Kestrel rig (`src/actors/diver.ts`; the walker in `src/actors/walker.ts` if standing reads better) live inside the panel, wearing exactly what my save has.
- When I hover over an attachment card on PC, tap it on the iPhone, or move to it with a gamepad, that part should light up on Kestrel's body (tanks, thrusters, light, boots, visor, cowl, harpoon, dart, flare tube, jar and satchel, the suit, the resonator). Gear I haven't found stays a dark "???" silhouette.
- It must still work in iPhone landscape, and the world stays paused while it's open.

## 2. Mag-boots: a walking mode (17b)

Today the boots only brace you while you hold Down near the seabed. I want them to work like Ocarina of Time's iron boots:

- **A Boots button** (keyboard, a free gamepad button, a touch button once I own the boots). Press once to clamp on, press again to let go. The control bar should offer it.
- **Clamped on:** Kestrel drops to the seabed and walks in a walking pose with heavy, stomping footsteps and puffs of silt. Slower than swimming. Currents don't push me around.
- **Hop:** Jump does a short, heavy hop.
- **Ledges:** walking off an edge sinks slowly with the boots still on, landing with a heavy thud.
- **Letting go:** press Boots again and swim on straight away.
- The heavy footsteps go through the normal sound system (muffled underwater, volume sliders, phone mix). A CC0 sound file is fine if it's logged in `public/audio/CREDITS.md`.
- Try it properly in the Wreck Shelf race and on slopes. Kestrel's position shouldn't jump when switching between swimming and walking.

## Before finishing

- Run `npm ci`, `npm run typecheck`, `npm run build` and `node scripts/test-progression.mjs`. Add Node checks for any new rule you write.
- Check it in `vite preview` (not `vite dev`) with **real input**: keyboard, gamepad if you can, and touch emulation at iPhone landscape size. Take screenshots I can look at. No console errors.
- Never break saves (`fathomlight.save.v1`): new fields optional with safe defaults. Bindings only in `src/controls/bindings.ts`. Art drawn in code. Cyan, violet and magenta are the Choir's alone.
- Update `PROGRESS.md`, `docs/ROADMAP.md` (mark what's done; never delete anything), `DESIGN.md` if a creative decision changed, and the handoff's source map.
- Commit, push and open a pull request. Don't merge it: I'll merge it myself.
- Tell me exactly where to go in the game and what to try, on my PC and my iPhone, and plainly what you couldn't test.
