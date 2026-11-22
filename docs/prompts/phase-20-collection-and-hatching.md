# Phase 20 prompt: the creature collection book and the hatching moment

Paste everything below the line into a new session connected to the Fathomlight repository.

---

Read `AGENTS.md` first, then the files it lists: `docs/AI_DEVELOPMENT_HANDOFF.md`, `docs/ROADMAP.md`, `DESIGN.md` and the top of `PROGRESS.md`. Start a branch from the latest default branch (`claude/underwater-game-m0-0qqajg`). Explain things to me in plain language: I'm not a programmer. If something I ask for is unclear or is my decision to make (names, feel, costs, which option), ask me before building; otherwise pick a sensible default and tell me what you chose.

This session is **Phase 20: the creature collection book and the hatching moment**. The plan is in `docs/ROADMAP.md` under "Phase 20", with Phases 21–23 after it. The aim is to make creature care and breeding the heart of the game (Dave the Diver is the inspiration for how satisfying that loop feels; for feel only, never copy it).

## How to work

1. **Start by proposing the design to me,** briefly and in plain language, and answer the open questions listed under Phase 20 with your recommendation:
   - where the book lives;
   - whether I name creatures;
   - what completing a row gives;
   - how the hatching reveal looks for an ordinary baby versus a rare one.

   Show me a mock-up or screenshot if you can. Wait for my answers.
2. Then build it, and stop so I can play it.

## Rules

- **Art may be drawn by code or generated** (my decision of Nov 22, 2026; see the roadmap's "Colin's decisions"). Generated images must be original, match the painterly style, and be logged in `docs/art/SOURCES.md`. Cyan, violet and magenta are the Choir's alone.
- **Never break saves** (`fathomlight.save.v1`): new fields optional with safe defaults.
- **Bindings only in `src/controls/bindings.ts`.**
- **New unlocks call `grant(...)`** with a fitting reward tier.

## Before finishing

- Run `npm ci`, `npm run typecheck`, `npm run build` and `node scripts/test-progression.mjs`. Add Node checks for any new rule.
- Check it in `vite preview` (not `vite dev`) with real input: keyboard, gamepad if you can, and touch emulation at iPhone landscape size. Take screenshots I can look at. No console errors.
- Update `PROGRESS.md`, `docs/ROADMAP.md` (mark what's done; never delete anything), `DESIGN.md` if a creative decision changed, and the handoff's source map.
- Commit, push and open a pull request. Don't merge it: I'll merge it myself.
- Tell me exactly where to go in the game and what to try, on my PC and my iPhone, and plainly what you couldn't test.
