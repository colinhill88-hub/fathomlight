# Session B prompt: Phases 22 and 23 (rare creatures and the Choir)

Paste everything below the line into a new session connected to the Fathomlight repository. Run it after Session A (Phases 20 and 21, PR #50) is merged.

---

Read `AGENTS.md` first, then the files it lists: `docs/AI_DEVELOPMENT_HANDOFF.md`, `docs/ROADMAP.md`, `DESIGN.md` and the top of `PROGRESS.md`. Start a branch from the latest default branch (`claude/underwater-game-m0-0qqajg`). Explain things to me in plain language: I'm not a programmer. (Kestrel is a boy: he/him.)

This session is **Session B: Phases 22 and 23**. It covers more ways for creatures to be rare, two new species, Choir-touched creatures, and tying the collection into the Choir ending. It builds on Session A's collection book, hatching moment and care odds.

**I have already answered every design question.** They're in `docs/ROADMAP.md` under "Colin's decisions (Nov 22, 2026)", with the plan under Phases 22 and 23. Don't ask them again. Only ask me about something genuinely new; otherwise pick a sensible default and tell me what you chose. **Do show me the two new species' look and names before building around them:** names and look are mine to approve.

## What Session A built for you (PR #50)

- **The collection book** is a Field kit tab (`bookTab` in `src/ui/fieldkit.ts`, rules in `src/game/collection.ts`).
  - Its pages are colour × glow pattern grids keyed `species:colour:pattern`.
  - New traits (size, shape, heirloom) and new species need a place in the book. Extend the page, or add a section, rather than starting again.
- **The hatching moment:** `hatchMoment()` in `src/main.ts` and `kindNews` / `hatchTier` in `collection.ts`. Tiered rarity should feed these, so an heirloom or Choir-touched baby gets the biggest moment.
- **The care bonus:**
  - it is `carePower()` (×1 to ×2) in `src/game/creatures.ts`, passed to `inherit(a, b, rand, care)` in `src/game/traits.ts`;
  - the planner's odds come from `eggOdds()`.

  New traits should take the same `care` factor, and the planner (the Hatchery's Planner tab, `src/ui/hatch.ts`) should show their odds.
- **Creature cards** (`src/ui/creatureCard.ts`) and **portraits** (`src/ui/creatureSnap.ts`, the real rigs drawn into pictures) should show new traits too.
- **Linnea's requests** (`makeRequest` in `collection.ts`) can start asking for the new traits and species.
- **Restocking** (`restock` / `Wildlife.applyRestock`) carries colour and pattern; carry new traits through it if they would show in the wild.
- **Still open from Session A:** the painted tank art. It has its own prompt (`docs/prompts/tank-art.md`, for an image tool) and isn't part of this session.

## What to build

1. **New inherited traits:**
   - size (the occasional tiny or giant one);
   - fin or shell shape (two or three per species);
   - heirloom lines (only after several generations).
2. **Tiered rarity:**
   - uncommon traits about 1 in 8 hatchings;
   - rare about 1 in 25;
   - heirloom and Choir-touched 1 in 100 or rarer;
   - all better with great care.
3. **Two new species:** one from the trench and one from the sanctum's edge, each with its own rare forms, in the collection book.
4. **Choir-touched creatures:** after first contact, very rarely. They may carry the Choir's cyan, violet and magenta: the one exception to the colour rule, and only for them.
5. **The ending, richer but the same story:** at first contact (`src/ui/contact.ts`) the colours, sounds and the patterns the Choir sings back grow with a varied, rare collection, plus a special line for an outstanding one.
6. **An optional companion:** a raised creature carried in the jar joins the call and answer with its own moment. Without one the ending plays as now.

## How to work

- **This is a big session.** Build in this order, and commit and push as you go:
  1. traits and rarity;
  2. new species;
  3. Choir-touched creatures;
  4. the ending.

  If it gets too long, stop at a clean point, open the pull request, and tell me what's left.
- **Art** may be drawn by code or generated (see "Colin's decisions"). Painted textures on the jointed creature rigs are preferred to stiff sprites, so creatures still move naturally. Log generated images in `docs/art/SOURCES.md`.

## Rules

- **Never break saves** (`fathomlight.save.v1`): new fields optional with safe defaults. Old creatures get sensible default traits.
- **Bindings** only in `src/controls/bindings.ts`.
- **New unlocks** call `grant(...)` with a fitting tier.

## Before finishing

- Run `npm ci`, `npm run typecheck`, `npm run build` and `node scripts/test-progression.mjs`. Add Node checks for the trait inheritance, the odds and old creatures loading.
- Check it in `vite preview` (not `vite dev`) with real input: keyboard, gamepad if you can, and touch emulation at iPhone landscape size. Take screenshots I can look at. No console errors.
- Update `PROGRESS.md`, `docs/ROADMAP.md` (mark what's done; never delete anything), `DESIGN.md` (new creative decisions), and the handoff's source map.
- Commit, push and open a pull request. Don't merge it: I'll merge it myself.
- Tell me exactly where to go in the game and what to try, on my PC and my iPhone, and plainly what you couldn't test.
