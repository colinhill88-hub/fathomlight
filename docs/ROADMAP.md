# Fathomlight roadmap

Nov 21, 2026 · planned with Colin after Phase 14 (reward moments, PR #36)

This is the agreed plan for work that is **not built yet**. Nothing here is implemented unless [Progress](../PROGRESS.md) says so. Read the [development handoff](AI_DEVELOPMENT_HANDOFF.md) before starting any of it, whichever AI tool you are. When a phase ships, move its entry into PROGRESS.md and mark it done here. Do not delete it.

The order below is Colin's agreed phasing. Phases 15 and 16 are ready to build. Later items need a design pass with Colin before code. Ask him the open questions listed with each item.

## Colin's decisions (Nov 21, 2026)

- **No offer ping (after Phase 16 round 3).** The soft ding when a new action appeared on the control bar played every time you passed something you could use (every room in a busy base, every copper nugget), and Colin found it annoying. It is off. The bar's sonar ripple still marks new offers. Don't bring back a sound for routine offers without asking him.

- **Releasing a named creature needs confirmation.** A creature taken out of one of your own tanks has a name and may carry bred traits. Releasing it from the jar needs a second press within a few seconds. Use the same pattern as the over-depth hatch warning: the first press arms it and shows a warning; a second press within 4 s confirms. Wild-caught creatures release on one press.
- **Audio may use recorded sound files.** The rule from milestone 7b that all sound is synthesised in code is lifted for audio only. Art is still drawn in code. Conditions:
  - **Licence:** only files that carry no copyright obligation. In practice that means public domain or **CC0**. "Royalty-free" packs with their own licence terms, CC-BY (which requires attribution) and anything "free for non-commercial use" are **not** acceptable without asking Colin first. Colin may sell the game on Steam.
  - **Ledger:** record every file in `public/audio/CREDITS.md` with its source URL, author, licence and date downloaded, plus any edits made (trimmed, pitched, layered).
  - **Bundled:** files ship inside the build, as the Steam plan in DESIGN.md requires. Never stream them from a third-party site at runtime.
  - **Format:** use a format iPhone Safari decodes reliably through the Web Audio API (`.mp3` or `.m4a`/AAC; `.wav` for very short one-shots). Keep files short, mono where stereo adds nothing, and the total small, because the game loads on a phone.
  - **Routing:** play samples through the existing engine buses (`sfx`, `ui`, `ambience`, `music` in `src/audio/engine.ts`) so volume sliders, the underwater muffle, the phone-speaker mix and the mute all still apply. Synthesis stays wherever it already sounds good, including the Phase 14 reward stings, which Colin likes.

## Phase 15: quality of life and the Field kit (built, PR #38)

### 15a. Release the creature in the jar: **done** (see PROGRESS.md)

**Problem (Colin):** out in the wild, a creature in the jar can only leave by being put in a tank. If you catch the wrong one, you are stuck with it.

- Add a **Release** action whenever the jar (or the satchel's second jar) holds a creature and Kestrel is swimming outside.
  - Keyboard: choose an unused key in `src/controls/bindings.ts`. That file is the only place bindings are decided.
  - Gamepad: a button the pad table doesn't use yet.
  - Touch: tap the jar readout or a small jar button.
- The control helper (`src/ui/controlHelper.ts`) advertises it whenever a creature is held.
- **Wild-caught** (no `keep` record): it swims away with a little animation and bubbles. Call the existing `wildlife.release(species, stage, save)`, which already returns it to the wild and its quota. See the blackout path in `main.ts`, search "The specimen jar came open".
- **Named, from your tanks** (`jar.keep` set): the first press arms a warning that names it ("Release Pip the glowfin? It won't come back. Press again to release.") and a second press within 4 s confirms. Its name and traits are lost.
- With two jars held, release the most recently caught first. Say which one in the prompt.
- Check: release, then catching the right species, works end to end with real input. The wild cap counts correctly after a release. Releasing a named creature without the second press does nothing. `node scripts/test-progression.mjs` gets a check for the quota refund.

### 15b. The Field kit screen (press I): **done** (see PROGRESS.md). Not done yet: per-zone breakdowns in the Collection tab (it shows game-wide totals) and reuse of the Kestrel rig for the portrait (it is a separate SVG drawing).

**Idea (Colin):** a screen showing the character with every attachment and everything unlocked, as a reminder. It grew into an Ocarina of Time-style pause sub-screen.

- Opens with **I** (a new binding; a pad button; a touch button near the log). Pause the air clock while it is open, as the reading panel does. Close with I, Esc or B.
- **Kit tab:**
  - a large drawn portrait of Kestrel wearing what the save has, using the existing rig or art;
  - each attachment called out: dive light, thrusters TH-1/2/3, mag-boots, echo visor, heat-shield cowl, harpoon and darts, flare launcher, specimen jar and satchel, the suit tier (Kestrel suit, PS-1 or PS-2, with crush depth) and the resonator;
  - KS-1 beside it with its fitted modules and depth plating;
  - KD-1 with its welder and cargo cradle.
- **Empty silhouettes for gear not found yet.** This is what makes Zelda's version motivating. Show the shape dark, without the name, so the screen hints at more to find without spoiling it.
- **Collection tab:**
  - creatures scanned, kept and bred;
  - glow patterns collected toward the Signal array, mirroring its distinct species × pattern rule;
  - air tanks, whorls, lodes and scans found, shown per zone (for example "Kelp forest 7/9").
- Links into the existing log, zone map and rates panel rather than duplicating them.
- Reuse the Phase 14 emblem icons (`src/ui/reward.ts`) so a reward and its Field kit entry look the same.
- Gamepad navigation through `src/ui/padnav.ts` like every other panel. Touch targets of at least 44 px. It has to work in iPhone landscape.

### 15c. Restyle the control helper bar: **done**. Colin chose the sonar look; the other two candidates were removed. The CSS is the `skin-sonar` rules at the end of `src/style.css`, and the ping is `onOffer` in controlHelper.ts → `sound.offerPing()`. The original brief follows.

**Problem (Colin):** the Phase 13 key bar along the bottom looks bland. It should fit an underwater, somewhat sci-fi world, perhaps musical, since the Choir's story is told in song.

- Proposed direction:
  - **The staff:** a thin bar of dark glass with brass end caps and a faint five-line musical staff running through it. Each action sits on the staff like a note.
  - **The keys:** round brass-rimmed buttons styled like gauge faces behind lime glass. They replace the flat keycaps.
  - **New offers:** a fresh action ripples outward like a sonar ping and plays a very soft tone in the current music zone's key.
  - **Choir colours:** only where the action is a Choir one (resonator, song-locks), following the colour rule.
- **Mock up two or three looks** (screenshots at desktop and iPhone landscape) and let Colin choose before building. Keep the Phase 13 behaviour unchanged: modes, info versus action, pad glyphs and the Settings preference. Change only the styling (the `#ctl-helper` rules in `src/style.css`) and any markup it needs.

## Phase 16: the audio audit (rounds 1 and 2 merged; round 3 on a review branch; needs Colin's ears)

**Status:** the satchel bug is **done**. Round 1 of the audit is built: see [`phase-16-audio-audit.md`](phase-16-audio-audit.md) for the inventory, the changes and the listening guide. Done in round 1: the inventory; gathering shapes for every material; the cutter, winch, drill, grabber (via the material strokes), tractor, scanning, docking and weld shapes; round-robin variety; danger-first mix fixes; phone-speaker harmonics; spatial drone whir and placed welds; indoor room echo, hull filter and footsteps; jar release polish. **Round 2 (merged, PR #41):** the first 16 CC0 files from Kenney's Impact Sounds are in. **Round 3 (review branch): done:** the rest of the shortlist (30 CC0 files from Freesound: bubbles, the regulator's breath out, diving in, a 10 s underwater ambience loop, kelp snaps, moss rips, wreck groans and metal creaks, a sand trickle, wet footsteps for the wrecks), soft creature calls placed in the world, and KS-1 heard from outside. **Not done yet:** tuning from Colin's listening notes (none given yet for rounds 1–3), per-zone footstep surfaces in the base, and the offer ping's level (**decided:** Colin turned the ping off after round 3; see his decisions above).

**Session prompt:** [`docs/prompts/phase-16-audio.md`](prompts/phase-16-audio.md). It also covers the satchel bug below, which should be fixed first.

**Bug to fix first (Colin, after Phase 15): done** (`jarRoom()`, `putInJar()`, `takeFromJar()` in creatures.ts). with the specimen satchel (two jar slots), the base's Habitat console and Hatchery only move **one** creature into the jar. `take()` in `src/ui/care.ts`, `toJar()` and `jarBlock` in `src/ui/hatch.ts`, and the Revival pool's `revive` in main.ts check only `save.jar` and ignore `save.jar2`. Depositing indoors also takes only from `save.jar`, and `jar2` moves up only while swimming (`gearFrame`). Use one helper for jar room and add tests.

**Goal (Colin):** polished audio. Natural sounds that pop and have a purpose. Even digging something up should feel satisfying. He likes the current sounds and especially the Phase 14 reward stings.

- **Inventory first.** List every cue: the `SoundDirector` methods in `src/audio/director.ts`, the about 50 `sound.*`/`audio.*` calls in `main.ts`, the ambience beds and the music. For each, note what triggers it, its bus, its loudness and what is wrong with it.
- **Give every action a shape:** anticipation, contact and payoff. Gathering is the model case. Today copper plays the same thud each stroke and a quiet clink at the end. It should have:
  - strokes that vary and build;
  - a clear **release** when the material comes loose (a crunch or pop);
  - a reward note (the Phase 14 pickup ting already climbs the scale).

  Apply the same thinking to scrap, quartz, resin, moss, ore and brass, the cutter, the winch, the drill and the grabber.
- **No machine-gun repetition.** Use pools of variants with round-robin selection and small random pitch and level changes.
- **Mix hierarchy.**
  - Order of importance: danger, then reward, then interaction, then ambience, then music.
  - Check loudness per bus.
  - Test on the iPhone speaker (the `phone` speaker mix) and on headphones.
  - Keep the limiter for peaks only.
- **Natural textures are where samples help.** Water, gravel, kelp, metal hulls and footsteps per surface. Follow the licence and ledger rules above.
- **Spatial sound.** Pan and distance for sounds placed in the world (creatures, machines, the drone), and a duller, roomier sound inside hulls.
- **Work in rounds with Colin listening.** Each round: change a group of sounds, record a short before/after capture or describe exactly where to stand in the game to hear it, then ask for feedback.

## Later: needs a design pass with Colin first

These came from comparing Fathomlight with Ocarina of Time, Ori and the Will of the Wisps, Hearthstone and Satisfactory. Colin likes all of them. Design each with him before building.

1. **Songs Kestrel can play (the Ocarina idea).** The story is about learning the Choir's light language, and the resonator exists. Decoded fragments could become songs played on it with a short input phrase. The contact scene in `src/ui/contact.ts` already does call and response. Possible songs:
   - call a grown creature to you;
   - calm a predator;
   - open the Choir gate home;
   - wake a dormant structure.

   Open questions: how many songs, how they're input on touch, keyboard and pad, and which existing gates they replace or add to. This is the biggest idea on the list and the strongest fit with the story.
2. **A climax at each major site (Zelda's bosses, Ori's escape sequences), without combat.** Each major site currently ends with a blueprint in a room. Possible set pieces:
   - the Corvina flooding while you climb out;
   - the trench stalker hunting you while you find the way;
   - a collapsing vent field.

   This turns "danger with depth" into something you feel. Open questions: whether failing costs anything, and how to keep the shallows cozy.
3. **Movement flow (Ori).** Let abilities chain into each other:
   - dash out of a grapple;
   - boost off kelp or hull plates;
   - keep momentum through currents.

   Add trails and small flourishes when abilities are used. The swimming rig and physics are in `src/actors/diver.ts`. Keep world positions stable.
4. **Goals you can see (Satisfactory's milestones, Hearthstone's quests).** A goal board at the base with goals like "Grow a tinker crab", "Power the base to 40 W" or "Find 3 whorls", each with a small reward that uses the Phase 14 cards. Add Satisfactory-style production graphs for large bases.
5. **Maps that fill in as you explore each major site,** like Zelda's dungeon maps. They could hang off the existing zone map.
6. **Quality of life already queued:**
   - a key remapping screen (the storage in `bindings.ts` exists);
   - gamepad buttons that dismiss reward cards (today they close by themselves);
   - tuning drill-lode yields from a real economy run.
