# Phase 16 prompt: the audio audit, plus the satchel bug

Paste everything below the line into a new session connected to the Fathomlight repository.

---

Read `AGENTS.md` first, then the files it lists: `docs/AI_DEVELOPMENT_HANDOFF.md`, `docs/ROADMAP.md`, `DESIGN.md`, and the top of `PROGRESS.md`. Also read `docs/phase-14-reward-moments.md`, because those reward stings are the quality bar I like. Start a branch from the latest default branch (`claude/underwater-game-m0-0qqajg`, which has Phase 15 merged). Explain things to me in plain language: I'm not a programmer.

This session is **Phase 16: the audio audit**, plus **one bug fix**. Fix the bug first, because it's small and annoys me in play.

## 1. Bug: the two-slot jar only takes one creature in the base

With the specimen satchel (gear `satchel`, SJ-2), I can carry two creatures out in the wild. But inside the base, at a tank's Habitat console or at the Hatchery, I can only move **one** creature into the jar. The second "To jar" refuses because "the specimen jar is already full".

What I found looking at the code (please confirm it before changing anything):

- **The cause.** These paths only look at the first slot, `save.jar`, and never at `save.jar2`:
  - `take()` in `src/ui/care.ts` (around line 257): `if (save.jar) { toast('The specimen jar is already full') }`.
  - `toJar()` in `src/ui/hatch.ts` (around line 128), and its button state `jarBlock` (around line 173).
  - The Revival pool's `revive` in `src/main.ts` (search "The bloom's light sinks") also requires an empty `save.jar`.
- **The reverse direction, probably the same problem.** "Move specimen from jar" (`deposit` in care.ts) and the outdoor tank deposit in main.ts (search `save.jar = null`) only take from `save.jar`. `jar2` moves up into `jar` only inside `gearFrame()`, which runs while swimming. So after you deposit the first creature indoors, the second may not be offered until you swim again. Check this too.
- **The fix.**
  - With the satchel, "To jar" fills whichever slot is free.
  - Depositing takes the first creature and moves `jar2` up at once.
  - The buttons and tooltips say "Jar full" only when both slots are full, or when one is and there's no satchel.
  - Reuse one small helper for "is there room in the jar, and where" rather than repeating the check. Something like `jarRoom(save)` next to `releaseFromJar()` in `src/game/creatures.ts`.
  - Remember that `wildAllowed()` already counts both slots.
- **Tests.** Add checks to `scripts/test-progression.mjs`: taking two creatures with the satchel, refusing a second without it, and depositing in order. Then check in the browser with **real input**. Use a fixture save with the satchel, a tank holding two creatures, and the walkable base (the handoff explains fixtures and `vite preview`).

## 2. Phase 16: the audio audit

The plan and the rules are in `docs/ROADMAP.md` under "Phase 16" and "Colin's decisions". In short:

**What I want.** Polished audio: natural sounds that pop and have a purpose. Even digging something up while swimming should feel satisfying. I like the current sounds overall, and especially the Phase 14 reward stings (keep those as they are). Ori and the Will of the Wisps and the Zelda remakes are the bar for how good interaction sound should feel. Use them for feel only, never copy their sounds or music.

**Sound files are allowed now.**
- **Licence:** only public-domain or **CC0** files, nothing that needs attribution or forbids commercial use (I may sell this on Steam).
- **Ledger:** log every file in `public/audio/CREDITS.md` with the source URL, author, licence, download date and any edits.
- **Bundled:** files ship inside the build, never streamed from another site.
- **Format:** use `.mp3` or `.m4a` (or short `.wav`) that iPhone Safari decodes. Keep them small and short.
- **Routing:** play them through the existing buses in `src/audio/engine.ts` (`sfx`, `ui`, `ambience`, `music`), so the volume sliders, mute, the underwater muffle and the phone-speaker mix still apply.
- **When there's no internet:** if this environment can't download files, say so plainly. Keep improving the synthesised sounds, and give me a shortlist of specific CC0 sounds to fetch later.

**How to work.**

1. **Inventory first.** Before changing anything, list every sound in the game: the `SoundDirector` methods in `src/audio/director.ts`, the `audio.*` and `sound.*` calls in `src/main.ts`, `src/audio/ambience.ts`, `src/audio/music.ts` and `src/audio/stings.ts`. For each, record what triggers it, which bus it uses, roughly how loud it is, and what's wrong with it. Put this in a new `docs/phase-16-audio-audit.md` and show me a summary before the big changes.
2. **Give every action a shape: anticipation, contact, payoff.** Gathering is the main case. Today copper plays the same small thud each stroke and a quiet clink at the end. It should have:
   - strokes that vary and build;
   - a clear **release** when the material comes loose (a crunch or pop);
   - then the reward note. The Phase 14 pickup "ting" that climbs the scale already exists in `stingMinor`; keep it.

   Do this for every material (scrap, copper, quartz, resin, moss, ore, brass, bloom, fibre), and for the cutter torch, the boom winch, the drill, the grabber, the tractor beam, scanning, docking and building welds.
3. **No machine-gun repetition.** Every frequent sound gets variants with round-robin choice and small random changes in pitch and loudness.
4. **Mix hierarchy:** danger first, then rewards, then interactions, then ambience, then music.
   - Check each bus's loudness against the others.
   - Keep the limiter only for peaks.
   - Make sure nothing important disappears on the iPhone speaker (the `phone` speaker mix: 110 Hz low cut and a presence lift).
5. **Natural textures** are where recorded files help most: water, bubbles, gravel and sand, kelp, metal hulls, footsteps on different surfaces in the base, and the sub's hull.
6. **Spatial sound.** Pan and fade sounds by where they are in the world (creatures, machines, the drone, the sub). Make sound inside hulls and the base drier and roomier than open water.
7. **Polish the new Phase 15 sounds too:** the jar release, and the control bar's soft ping when a new action appears (`offerPing`). I haven't judged that ping's loudness yet, so flag it.
8. **Work in rounds.** After each group of changes, tell me exactly where to go in the game and what to listen for, so I can test on my PC and on my iPhone (speaker and headphones). The headless browser can't hear anything. Use `audio.level()` (exposed as `__fathom.audioLevel()`) only to check that sound plays and nothing clips or goes silent, not to judge the mix.

**Before finishing:**
- Run `npm ci`, `npm run typecheck`, `npm run build` and `node scripts/test-progression.mjs`.
- Check in the browser against `vite preview` with real input.
- Update `PROGRESS.md`, `docs/ROADMAP.md` (mark what's done; don't delete anything), the handoff's source map, and `public/audio/CREDITS.md` if you add files.
- Commit, push the branch and open a pull request. Don't merge it: merging deploys the live game, and I'll merge it myself.
- Tell me plainly what you couldn't test and what needs my ears.
