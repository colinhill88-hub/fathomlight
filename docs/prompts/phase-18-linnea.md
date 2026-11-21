# Phase 18 prompt: Linnea, the axolotl guide

Paste everything below the line into a new session connected to the Fathomlight repository.

---

Read `AGENTS.md` first, then the files it lists: `docs/AI_DEVELOPMENT_HANDOFF.md`, `docs/ROADMAP.md`, `DESIGN.md` and the top of `PROGRESS.md`. Start a branch from the latest default branch (`claude/underwater-game-m0-0qqajg`). Explain things to me in plain language: I'm not a programmer. If something I ask for is unclear or is my decision to make (names, feel, costs, which option), ask me before building; otherwise pick a sensible default and tell me what you chose.

This session is **Phase 18: Linnea**, a friendly axolotl who gives gentle hints about where to go next. The idea and her name come from my daughter, so I'd like her to be lovely. The brief is in `docs/ROADMAP.md` under "Phase 18", and `DESIGN.md` describes her under "World and story". Also read `docs/phase-12-progression-audit.md`: it lists the route, gates and order, which her hints are based on.

## Who she is

- An axolotl: soft coral and peach, with warm, frilly gills. Not hot pink, and none of the Choir's cyan, violet or magenta.
- Drawn in code, in the same painterly, high-fidelity style as the other creatures and Kestrel (see `src/actors/critters.ts` and `src/actors/shoreCreatureRigs.ts`). She should fit the world and have personality: she blinks, her gills flutter, she bobs when she talks, and she tilts her head curiously when Kestrel comes close.
- Show me screenshots of her design early, before wiring up the hints, so I can say yes or ask for changes.

## Where she is

- First, at **the first block in the path that needs a piece of equipment**: the dark east cliff in Sunlit Shallows, where you need the dive light. (I also thought of the first winch that lets the sub through, the Kelp Forest boom. That can be a later spot.)
- Later, at other key places: each new zone's entrance and outside the major sites. She moves on as I progress; she isn't everywhere at once. Propose a list of spots and I'll confirm.

## How she helps

- **Only when I swim up to her.** The control bar offers "Talk". She never calls out, follows me, or interrupts.
- One or two short, **gentle** lines that hint rather than order ("I heard something clicking in the kelp..."). Pick the hint from where I really am in the game. Show me the hint lines for each stage so I can adjust the wording.
- A soft little chirp when she speaks (synthesised or CC0, through the normal sound system).
- Any new save field is optional, with a safe default.

## Before finishing

- Run `npm ci`, `npm run typecheck`, `npm run build` and `node scripts/test-progression.mjs`. Add Node checks for any new rule you write.
- Check it in `vite preview` (not `vite dev`) with **real input**: keyboard, gamepad if you can, and touch emulation at iPhone landscape size. Take screenshots I can look at. No console errors.
- Never break saves (`fathomlight.save.v1`): new fields optional with safe defaults. Bindings only in `src/controls/bindings.ts`. Art drawn in code. Cyan, violet and magenta are the Choir's alone.
- Update `PROGRESS.md`, `docs/ROADMAP.md` (mark what's done; never delete anything), `DESIGN.md` if a creative decision changed, and the handoff's source map.
- Commit, push and open a pull request. Don't merge it: I'll merge it myself.
- Tell me exactly where to go in the game and what to try, on my PC and my iPhone, and plainly what you couldn't test.
