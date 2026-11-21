# Phase 19 prompt: combat inside the wrecks

Paste everything below the line into a new session connected to the Fathomlight repository.

---

Read `AGENTS.md` first, then the files it lists: `docs/AI_DEVELOPMENT_HANDOFF.md`, `docs/ROADMAP.md`, `DESIGN.md` and the top of `PROGRESS.md`. Start a branch from the latest default branch (`claude/underwater-game-m0-0qqajg`). Explain things to me in plain language: I'm not a programmer. If something I ask for is unclear or is my decision to make (names, feel, costs, which option), ask me before building; otherwise pick a sensible default and tell me what you chose.

This session is **Phase 19: combat inside the wrecks**. It's a deliberate change from the original vision: the game feels a little too cozy without some combat. The outline is agreed in `docs/ROADMAP.md` under "Phase 19" and in `DESIGN.md` (the first pillar and "On foot"). I may change my mind after playing it, so build it cleanly enough to tune or switch off.

## What I want

- **On foot, inside wrecks only** (the dry interiors in `src/interior/`). Not while swimming. The shallows and the sanctum stay combat-free.
- **Enemies:** small mechanical robots, drones and creatures made of rust and wreckage that infest parts of the wrecks, with a story reason that fits. Never the sea's wildlife: this is a game about caring for creatures.
- **Fights that make you think:** each enemy has its own moves and telegraphs them clearly, and I answer with timing: shooting, blocking or bracing, ducking, and taking cover behind crates and bulkheads. Ori and the Will of the Wisps is the reference for how good 2D combat feels. Use it for feel only, never copy it.
- **A weapon** that mounts on Kestrel's suit and changes the silhouette, like the tanks, pressure suits and grapple do. It can grow from the harpoon's design. Earn it the usual way (a blueprint, then the Workshop), with a big reward moment. Its effects use the base kit colours (lime, gold, red).
- **Controls:** a Shoot action (keyboard, gamepad, and one more touch button, which only appears once I own the weapon), plus whatever defending needs.
- **Losing isn't punishing:** a blackout, then back at the wreck's entrance or the last safe platform, keeping everything.
- **Sound:** every enemy attack is audible before it lands, and danger comes first in the mix.

## How to work

1. **Start by proposing the design to me**, briefly and in plain language: two or three enemy types with their moves and how to beat each one, the weapon (what it looks like, what it's called), how Kestrel's health works indoors, whether cleared rooms stay cleared, and which wreck section to infest first. Wait for my answers.
2. Then build **one playable infested section** (in the Corvina or the Fulmar) with the weapon and those enemies, and stop there so I can play it before more is built.

## Before finishing

- Run `npm ci`, `npm run typecheck`, `npm run build` and `node scripts/test-progression.mjs`. Add Node checks for any new rule you write.
- Check it in `vite preview` (not `vite dev`) with **real input**: keyboard, gamepad if you can, and touch emulation at iPhone landscape size. Take screenshots I can look at. No console errors.
- Never break saves (`fathomlight.save.v1`): new fields optional with safe defaults. Bindings only in `src/controls/bindings.ts`. Art drawn in code. Cyan, violet and magenta are the Choir's alone.
- Update `PROGRESS.md`, `docs/ROADMAP.md` (mark what's done; never delete anything), `DESIGN.md` if a creative decision changed, and the handoff's source map.
- Commit, push and open a pull request. Don't merge it: I'll merge it myself.
- Tell me exactly where to go in the game and what to try, on my PC and my iPhone, and plainly what you couldn't test.
