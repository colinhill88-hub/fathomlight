# Fathomlight roadmap

Nov 21, 2026 · planned with Colin after Phase 14 (reward moments, PR #36)

This is the agreed plan for work that is **not built yet**. Nothing here is implemented unless [Progress](../PROGRESS.md) says so. Read the [development handoff](AI_DEVELOPMENT_HANDOFF.md) before starting any of it, whichever AI tool you are. When a phase ships, move its entry into PROGRESS.md and mark it done here. Do not delete it.

The order below is Colin's agreed phasing. Phases 15 and 16 are built. **Phase 17 is built** (on a branch with a pull request for Colin). **Phases 18 and 19 are agreed and ready to build** (planned with Colin on Nov 21, 2026, after Phase 16), each with a session prompt in `docs/prompts/`. Later items need a design pass with Colin before code. Ask him the open questions listed with each item.

## Colin's decisions (Nov 21, 2026)

**After Phase 16 (planning the next phases):**
- **Mag-boots become a toggle walking mode** (Phase 17), like Ocarina of Time's iron boots. One press clamps on, another lets go. Kestrel walks in a walking pose with heavy footsteps, can hop, isn't pushed by currents, and sinks slowly with the boots on when walking off a ledge. Slower than swimming. Mainly for the Wreck Shelf race; other boot sections may come later.
- **The Field kit portrait reuses the real Kestrel assets** (Phase 17), and hovering over an attachment highlights it on the body.
- **Linnea, a friendly axolotl guide** (Phase 18; the idea and the name come from Colin's daughter). Gentle hints, only when Kestrel swims up to her. Soft coral with warm frilly gills, not hot pink. Painterly, high-fidelity, drawn in code like the other creatures, with personality. First found at the first gear gate.
- **Combat, on foot, inside wrecks only** (Phase 19). A change from the original vision that Colin wants: the game feels a little too cozy without it. Enemies are small mechanical robots, drones and creatures of rust and wreckage that infest parts of the wrecks, never wildlife. Reading moves, timing, blocking and ducking behind cover (Ori is the reference for feel). A weapon that mounts on the suit and changes the silhouette. Losing means a gentle blackout and a restart at the wreck's entrance or the last safe platform. Touch gets one more button, Shoot. Not while swimming. Colin may change his mind after playing it.
- **One session per phase** (Colin saves usage that way). Phases 17's two parts share a session because both are Kestrel-rig work.

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

### 15b. The Field kit screen (press I): **done** (see PROGRESS.md). Not done yet: per-zone breakdowns in the Collection tab (it shows game-wide totals). The portrait now reuses the Kestrel rig (**done in Phase 17a**).

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

## Phase 17: Kestrel's kit (the Field kit portrait, and walking mag-boots). **Built** (see PROGRESS.md); waiting for Colin to try it and merge.

**Session prompt:** [`docs/prompts/phase-17-kit-portrait-and-boots.md`](prompts/phase-17-kit-portrait-and-boots.md). Both parts are work on Kestrel's rig and poses, so they share one session.

### 17a. The Field kit portrait uses the real Kestrel: **done**

Built with the on-foot rig standing (it reads better in a tall panel than the swimmer), turning round slowly now and then; the roadmap's default of a floating swim pose was not used. Cutter, sonar and relay kits have no piece on the body, so their cards light nothing.

**Problem (Colin):** the Kit tab's portrait looks boxy and code-drawn, not like the character.

- Replace the SVG portrait in `src/ui/fieldkit.ts` with the real Kestrel rig (`src/actors/diver.ts`, and the walker in `src/actors/walker.ts` if a standing pose reads better), rendered live inside the panel and wearing exactly what the save has.
- **Highlight on hover:** hovering over an attachment card (PC), tapping it (touch) or focusing it with the gamepad (`padnav.ts`) makes that part of the body glow or pulse: tanks, thrusters, light, boots, visor, cowl, harpoon, dart, flare tube, jar and satchel, the suit tier, the resonator. Gear not found yet stays a dark silhouette marked "???".
- Keep it working in iPhone landscape and keep the world paused while the Field kit is open.
- Open choice for the session (default if Colin doesn't say): a calm floating swim pose, slowly turning a little.

### 17b. Mag-boots: a walking mode: **done**

Choices the session made (Colin can change them): the key is **N** (B was taken by Build), the pad button is **d-pad up**, the touch button says **Boots** and glows lime while clamped. Only Boots lets go (Boost is Jump, so it hops). The old hold-Down brace is gone. Footsteps reuse the logged CC0 files (slowed metal impacts and steps) under synthesised thumps: no new sound files.

**Problem (Colin):** the boots don't really lock onto the ocean floor. Today you hold Down near the seabed to brace (`bootsOnFloor` and `bracing` in `main.ts`; the control helper shows "brace"). There is no Boots button.

- **A new Boots action** in `src/controls/bindings.ts` (keyboard key, a free pad button, a touch button that shows once the boots are owned). Press once to clamp on, press again to let go. The control helper advertises it.
- **Clamped:** Kestrel sinks to the seabed and stands in a walking pose (reuse the walker's walk cycle where possible, adapted to slow, heavy, underwater steps). Left and right walk along the bottom, following slopes. Walking is slower than swimming.
- **Heavy footsteps:** a deep, clanking stomp with a puff of silt each step, placed on the sfx bus (so it is muffled underwater like everything else). Reuse the Phase 16 footstep and sample machinery; a CC0 file may be added under the usual rules.
- **Hop:** Jump makes a short, heavy hop.
- **Currents don't move Kestrel** while clamped (the race, the vents).
- **Ledges:** walking off an edge sinks slowly with the boots still on (Ocarina's iron boots), landing with a heavy thud.
- **Letting go:** press Boots again (and perhaps boost; the session decides and says so). Swimming resumes at once.
- The diver's world position must stay stable when switching rigs. Air still runs as normal. No save field needed beyond what exists (the toggle doesn't need saving; start unclamped).
- Check with real input in the race and on slopes, with keyboard, pad and touch. Update the progression audit if the race route changes.

## Phase 18: Linnea, the axolotl guide. Not built.

**Session prompt:** [`docs/prompts/phase-18-linnea.md`](prompts/phase-18-linnea.md).

- **Who:** Linnea, a friendly axolotl (Colin's daughter's idea and name). Soft coral and peach with warm, frilly gills, not hot pink; never Choir cyan, violet or magenta. Drawn in code in the painterly, high-fidelity style of the Phase 10 creatures and Kestrel, with personality: blinking, gill flutter, a little bob when she talks, a curious tilt as Kestrel approaches.
- **Where:** first at **the first gear gate**, the dark east cliff in Sunlit Shallows that needs the dive light (Colin described "the first block in your path where you need a piece of equipment, the brighter lamp"; he also mentioned the first winch that lets the sub through, the Kelp Forest boom, which can be a later spot). Then at other key places: each new zone's entrance and outside the major sites. She moves on as the story moves (she isn't in every spot at once).
- **How she helps:** only when Kestrel swims up to her (a Talk action offered by the control helper). She never calls out or follows you. One or two gentle lines, hinting rather than ordering ("I heard something clicking in the kelp..."). The hint is chosen from where the player really is in the progression (the [progression audit](phase-12-progression-audit.md) lists the gates and order). A soft chirp when she speaks.
- **Save:** optional new fields only (for example which of her spots you've met), with safe defaults.
- Not decided yet (the session asks Colin, or picks a sensible default and says so): the full list of her spots and the hint wording for each stage.

## Phase 19: combat inside the wrecks. Not built; the design is agreed in outline.

**Session prompt:** [`docs/prompts/phase-19-wreck-combat.md`](prompts/phase-19-wreck-combat.md). Probably more than one session: the first builds the weapon, two or three enemy types and one infested section of a wreck to play, then Colin plays it before more is built.

- **Where:** on foot in dry wreck interiors (`src/interior/`), starting with one section of the Corvina or the Fulmar. Not while swimming; the shallows and the sanctum stay combat-free.
- **Enemies:** small mechanical robots, drones and creatures made of rust and wreckage that infest parts of the wrecks, with a story reason (for example the wrecks' old automated systems, still running, or salvage machines gone wrong). Never the sea's wildlife. Each type has its own moves and telegraphs them clearly. First ideas to offer Colin: a skittering rust crawler that lunges, a hovering weld drone that charges up a beam, a heavy shielded sentinel that is only open after it attacks.
- **Fighting:** reading moves and timing. Shoot, plus a way to defend: a block or brace, ducking, and cover (crates and bulkheads). Ori is the reference for feel only; nothing is copied.
- **The weapon:** new gear that mounts visibly on the suit (shoulder or forearm) and changes Kestrel's silhouette, growing from the harpoon's design (DESIGN.md's Crest diver notes). Earned through the usual blueprint and Workshop path, with a major `grant()` reward. Its effects use the base kit palette (lime, gold, red), never Choir colours.
- **Controls:** a Shoot action in `bindings.ts` (keyboard, pad, and one touch button shown once the weapon is owned), plus whatever the defence needs.
- **Losing:** not punishing. Kestrel blacks out and wakes at the wreck's entrance or the last safe platform, keeping everything.
- **Sound:** every enemy move gets an audible telegraph (danger first in the mix, per Phase 16).
- **Open questions for Colin, early in the session:** what the weapon is and is called; how Kestrel's health works indoors (reuse suit integrity or something new); whether cleared rooms stay cleared or refill when you come back; how many infested sections, and in which wrecks.

## Later: needs a design pass with Colin first

These came from comparing Fathomlight with Ocarina of Time, Ori and the Will of the Wisps, Hearthstone and Satisfactory. Colin likes all of them. Design each with him before building.

1. **Songs Kestrel can play (the Ocarina idea).** The story is about learning the Choir's light language, and the resonator exists. Decoded fragments could become songs played on it with a short input phrase. The contact scene in `src/ui/contact.ts` already does call and response. Possible songs:
   - call a grown creature to you;
   - calm a predator;
   - open the Choir gate home;
   - wake a dormant structure.

   Open questions: how many songs, how they're input on touch, keyboard and pad, and which existing gates they replace or add to. This is the biggest idea on the list and the strongest fit with the story.
2. **A climax at each major site (Zelda's bosses, Ori's escape sequences), without combat.** (Update after Phase 16: Colin now allows combat inside wrecks, Phase 19, so a wreck's climax could be a fight; open-water climaxes stay combat-free.) Each major site currently ends with a blueprint in a room. Possible set pieces:
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
