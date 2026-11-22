# Session A prompt: Phases 20 and 21 (creature care at the heart of the game)

Paste everything below the line into a new session connected to the Fathomlight repository.

---

Read `AGENTS.md` first, then the files it lists: `docs/AI_DEVELOPMENT_HANDOFF.md`, `docs/ROADMAP.md`, `DESIGN.md` and the top of `PROGRESS.md`. Start a branch from the latest default branch (`claude/underwater-game-m0-0qqajg`). Explain things to me in plain language: I'm not a programmer.

This session is **Session A: Phases 20 and 21, plus room for more creatures**. The aim is to make creature care and breeding the heart of the game (Dave the Diver is the inspiration for how satisfying that loop feels; for feel only, never copy it).

**I have already answered every design question.** They're in `docs/ROADMAP.md` under "Colin's decisions (Nov 22, 2026)", with the plan under Phases 20 and 21 and "Suggested order". Don't ask them again. Only ask me about something genuinely new that isn't covered there; otherwise pick a sensible default and tell me what you chose.

## What to build

1. **The collection book:** a new Field kit tab.
2. **The hatching moment,** scaled by rarity.
3. **Naming:** a suggested name you can keep or edit.
4. **Creature cards.**
5. **Rewards** of rare eggs and tank decorations for completed rows and pages.
6. **Contentment and hand-feeding.** Good care makes rare traits about twice as likely.
7. **The breeding planner** at the Hatchery.
8. **Linnea's creature requests:** no time limits, paying in rare eggs and decorations.
9. **Restocking the reef** with released bred creatures.
10. **Room for more creatures:**
    - upgradeable tanks (small 4 → 6, Grand 8 → 12);
    - the creature reserve;
    - the display aquarium (about 20).
11. **Care and Hatchery panels** that sort, filter, move and "care for all".

## How to work

- **Show me a quick mock-up or screenshot** of the book and the new panels before building everything around them.
- **This is a big session.** Build in this order, and commit and push as you go:
  1. book, hatching and cards;
  2. care, planner and requests;
  3. capacity and panels.

  If it gets too long, stop at a clean point, open the pull request, and tell me what's left.

## Rules

- **Art** may be drawn by code or generated (see the roadmap's "Colin's decisions"). Generated images must be original, match the painterly style, and be logged in `docs/art/SOURCES.md`. Cyan, violet and magenta are the Choir's alone (Choir-touched creatures are Session B).
- **Never break saves** (`fathomlight.save.v1`): new fields optional with safe defaults. Existing creatures and tanks must load and keep working.
- **Bindings** only in `src/controls/bindings.ts`.
- **New unlocks** call `grant(...)` with a fitting tier.

## Before finishing

- Run `npm ci`, `npm run typecheck`, `npm run build` and `node scripts/test-progression.mjs`. Add Node checks for every new rule (odds, contentment, capacity, requests).
- Check it in `vite preview` (not `vite dev`) with real input: keyboard, gamepad if you can, and touch emulation at iPhone landscape size. Take screenshots I can look at. No console errors.
- Update `PROGRESS.md`, `docs/ROADMAP.md` (mark what's done; never delete anything), `DESIGN.md` if a creative decision changed, and the handoff's source map.
- Commit, push and open a pull request. Don't merge it: I'll merge it myself.
- Tell me exactly where to go in the game and what to try, on my PC and my iPhone, and plainly what you couldn't test.
