# Fathomlight roadmap

Nov 21, 2026 · planned with Colin after Phase 14 (reward moments, PR #36)

This is the agreed plan for work that is **not built yet**. Nothing here is implemented unless [Progress](../PROGRESS.md) says so. Read the [development handoff](AI_DEVELOPMENT_HANDOFF.md) before starting any of it, whichever AI tool you are. When a phase ships, move its entry into PROGRESS.md and mark it done here. Do not delete it.

The order below is Colin's agreed phasing. **Phases 20 and 21 (Session A) are built and merged** (PR #50). **Phases 22 and 23 (Session B) are built and merged** (PR #51, Nov 22, 2026); the Creature room follow-up is merged (PR #52); Kestrel's open-water size change is on a new pull request. Phases 15, 16 and 17 are built and merged. **Phase 18 is built** (on a branch with a pull request for Colin). **Phase 19 is agreed and ready to build** (planned with Colin on Nov 21, 2026, after Phase 16), each with a session prompt in `docs/prompts/`. Later items need a design pass with Colin before code. Ask him the open questions listed with each item.

## Creature containment base (Grand Sanctuary tank), Nov 26, 2026

- **Mobile tank zoom: done** (see PROGRESS.md). Colin asked for the tank on mobile to look zoomed out "as if on a 2K monitor", keeping the mobile UI and controls the same. Next: Colin to try it on his phone and say whether to zoom more or less (`TANK_VIRTUAL_H` in `src/scene/sanctuaryView.ts`).

## Colin's decisions (Nov 21, 2026)

**After Phase 16 (planning the next phases):**
- **Mag-boots become a toggle walking mode** (Phase 17), like Ocarina of Time's iron boots. One press clamps on, another lets go. Kestrel walks in a walking pose with heavy footsteps, can hop, isn't pushed by currents, and sinks slowly with the boots on when walking off a ledge. Slower than swimming. Mainly for the Wreck Shelf race; other boot sections may come later.
- **The Field kit portrait reuses the real Kestrel assets** (Phase 17), and hovering over an attachment highlights it on the body.
- **Linnea, a friendly axolotl guide** (Phase 18; the idea and the name come from Colin's daughter). Gentle hints, only when Kestrel swims up to her. Soft coral with warm frilly gills, not hot pink. Painterly, high-fidelity, drawn in code like the other creatures, with personality. First found at the first gear gate.
- **Combat, on foot, inside wrecks only** (Phase 19). A change from the original vision that Colin wants: the game feels a little too cozy without it. Enemies are small mechanical robots, drones and creatures of rust and wreckage that infest parts of the wrecks, never wildlife. Reading moves, timing, blocking and ducking behind cover (Ori is the reference for feel). A weapon that mounts on the suit and changes the silhouette. Losing means a gentle blackout and a restart at the wreck's entrance or the last safe platform. Touch gets one more button, Shoot. Not while swimming. Colin may change his mind after playing it.
- **Phase 19 design (Colin, Nov 22, 2026, at the start of the Phase 19 session):** he accepted every proposal.
  - **The weapon is the Rivet driver RD-1:** a chunky forearm launcher grown from the harpoon, firing glowing hot rivets, with a guard plate that folds out when Kestrel braces.
  - **Health is suit integrity:** the ring already on the dive watch. Hits crack it, and it seals itself after a few quiet seconds.
  - **The hull keeper stays beaten forever (saved).** The small machines rebuild themselves on every visit.
  - **The first infested section is a new, optional engine room in the Corvina,** behind a welded door in her hold. The weapon drawings are in the bosun's locker beside the door.
  - **Enemies (proposed and kept):** the rust tick (rattles, then lunges), the weld drone (aims a sighting line, then fires a bolt), the hull keeper (shield; a slam shockwave or a charge, then its core opens).
  - **Controls (proposed and kept):** Shoot is X / RT / the touch Shoot button. Brace and duck is holding Down. A perfect brace knocks the attacker back.
  - **Story:** the Corvina's old automatic hull-cleaning machines rebuilt themselves from rust.
- **One session per phase** (Colin saves usage that way). Phases 17's two parts share a session because both are Kestrel-rig work.

- **No offer ping (after Phase 16 round 3).** The soft ding when a new action appeared on the control bar played every time you passed something you could use (every room in a busy base, every copper nugget), and Colin found it annoying. It is off. The bar's sonar ripple still marks new offers. Don't bring back a sound for routine offers without asking him.

- **Releasing a named creature needs confirmation.** A creature taken out of one of your own tanks has a name and may carry bred traits. Releasing it from the jar needs a second press within a few seconds. Use the same pattern as the over-depth hatch warning: the first press arms it and shows a warning; a second press within 4 s confirms. Wild-caught creatures release on one press.
- **Audio may use recorded sound files.** The rule from milestone 7b that all sound is synthesised in code is lifted for audio only. Art is still drawn in code. *(Superseded for art on Nov 22, 2026: see "Art may use generated images" below.)* Conditions:
  - **Licence:** only files that carry no copyright obligation. In practice that means public domain or **CC0**. "Royalty-free" packs with their own licence terms, CC-BY (which requires attribution) and anything "free for non-commercial use" are **not** acceptable without asking Colin first. Colin may sell the game on Steam.
  - **Ledger:** record every file in `public/audio/CREDITS.md` with its source URL, author, licence and date downloaded, plus any edits made (trimmed, pitched, layered).
  - **Bundled:** files ship inside the build, as the Steam plan in DESIGN.md requires. Never stream them from a third-party site at runtime.
  - **Format:** use a format iPhone Safari decodes reliably through the Web Audio API (`.mp3` or `.m4a`/AAC; `.wav` for very short one-shots). Keep files short, mono where stereo adds nothing, and the total small, because the game loads on a phone.
  - **Routing:** play samples through the existing engine buses (`sfx`, `ui`, `ambience`, `music` in `src/audio/engine.ts`) so volume sliders, the underwater muffle, the phone-speaker mix and the mute all still apply. Synthesis stays wherever it already sounds good, including the Phase 14 reward stings, which Colin likes.

## Colin's decisions (Nov 22, 2026)

- **Art may use generated images (Colin, after Phase 19).** The early rule that every piece of art is drawn by code is lifted. Colin worked with other AI tools to generate painted images for the zone backdrops, the reef and kelp, the creatures' look and Kestrel. He considers that one of the biggest improvements to the game so far. New art may be drawn by code or generated, whichever looks best. Conditions:
  - **Original only:** no imitating or recreating another game's, film's or artist's characters, creatures, logos or distinctive look. Reference games are for feel, as before.
  - **One style:** match the painterly, high-fidelity look the game already has, and its lighting pipeline (images sit in the lit, emissive and glow layers like the existing plates).
  - **Colour rule unchanged:** cyan, violet and magenta stay the Choir's (Choir-touched creatures are the one exception; see Phase 23).
  - **Ledger:** log every generated image in `docs/art/SOURCES.md` with the file, what it is, the tool used, the date and the prompt (or a summary of it). The licence of the tool must allow selling the game (Colin may sell it on Steam). If unsure, ask Colin before using it.
  - **Phone-friendly:** keep files small (prefer `.webp`, sized to how big they are on screen), and keep a procedural fallback wherever the code already has one (`?art=procedural`).
  - **Animated things:** creatures and characters still need to move naturally. Painted textures can dress a jointed code rig (as Kestrel's face and suit materials do), rather than replacing animation with stiff sprites.
- **Phases 20–23 design answers (Colin, Nov 22, 2026, answered all at once to save tokens; build in two sessions, A and B, below):**
  - **Phase 20:**
    - The collection book is a **new tab in the Field kit**.
    - At hatching the game **suggests a name, which the player can keep with one tap or edit**.
    - Completing a row or page gives **rare eggs and tank decorations**.
    - The hatching moment is **scaled by rarity**: every egg gets a short reveal; a first-ever colour or pattern, or a radiant baby, gets a full reward card and fanfare.
  - **Phase 21:**
    - **Linnea gives the creature requests.**
    - They pay in **rare eggs and tank decorations**.
    - They have **no time limits**.
    - Good care makes rare traits **clearly more likely**: about twice as likely for a content, well-kept pair as for a neglected one, and the planner shows it.
  - **Room for more creatures (Colin raised this):** if breeding becomes the focus, today's tanks are too small (a small tank holds 4, a Grand tank 8; about 40–50 creatures by the end of the game). Add all three:
    - a **huge display aquarium** (about 20 creatures; a late showpiece unlocked by a request or blueprint);
    - **upgradeable tanks** in the Workshop (small 4 → 6, Grand 8 → 12);
    - a **creature reserve** where creatures not on show rest safely with no care needed, and can be brought back to any tank.

    The care and Hatchery panels must handle large numbers: lists that **sort and filter** (species, rare, needs care), a quick **move** between tanks and the reserve, and a **"care for all"** button for routine feeding and cleaning.
  - **Phase 22:**
    - New traits: **size** (the occasional tiny or giant one), **fin or shell shape**, and **heirloom lines**. Markings were not chosen.
    - **Two new species:** one from the trench and one from the sanctum's edge, each with its own rare forms.
    - **Tiered rarity:** uncommon traits about 1 in 8 hatchings, rare about 1 in 25, heirloom and Choir-touched 1 in 100 or rarer, all better with great care.
  - **Phase 23:**
    - **Choir-touched creatures may carry the Choir's cyan, violet and magenta.** This is the one exception to the colour rule, and only for them.
    - The ending is **richer, same story**: the same ending for everyone, but its colours, sounds and the patterns the Choir sings back grow richer with a varied, rare collection, plus a special line for an outstanding one.
    - A raised creature carried in the jar is an **optional companion** that joins the call and answer with its own moment.
- **More from Colin before merging the plan (Nov 22, 2026):**
  - **Puffcaps' room to drift scales with the tank (done in this pull request).**
    - The problem: a puffcap was only happy with at most one tank-mate, whatever the tank's size, so nobody could raise many of them.
    - Now a puffcap is content while its tank is no more than half full (`driftRoom` in `src/game/creatures.ts`, Node-tested). A small tank still allows 2, a Grand tank 4, and upgraded tanks and the display aquarium will allow more automatically.
  - **Living tanks (added to Session A). Done in Session A, except generated tank backdrops (see Phase 21).** With generated art allowed, make the tanks themselves beautiful, building on the work already done on the open water and how it reacts to Kestrel (`src/fx/waterWake.ts`, `src/fx/surface.ts`, `src/world/habitatWater.ts`, `src/world/tanklife.ts`):
    - **creatures swim naturally,** trailing water behind them: a soft wake and drifting particles stirred by their tails, as Kestrel's swimming does outside;
    - **surfacing:** when a creature breaks the surface at the top of the tank, ripples spread across it, a few bubbles and a little splash, like Kestrel surfacing;
    - **richer tank art:** generated painted backdrops, substrate, rocks and plants for the tank interiors (logged in `docs/art/SOURCES.md`), glass reflections and caustic light, and decorations (the Phase 20 and 21 rewards) that look like real aquarium pieces;
    - **performance:** keep it smooth on the iPhone with several tanks on screen (only tanks in view animate fully).
  - **Kestrel is a boy (he/him).** Some earlier documentation and code comments called Kestrel "she"; they are corrected in this pull request. Use he/him for Kestrel everywhere. (Linnea is "she"; the Corvina and the Fulmar are "her", as ships traditionally are.)
- **Session B (Colin, Nov 22, 2026, during the session):** he approved the two new species from zoo screenshots: the **kiln eel** (trench) and the **chime seahorse** (the sanctum's edge), names and looks as drawn.
- **The Creature room and smaller creatures (Colin, Nov 23, 2026, after playing Session B; built on a new pull request after PR #51 merged):**
  - **The problem:** with about six breeding pairs the Hatchery (4 cradles) filled up fast, and walking room to room in a big base to manage creatures felt disconnected.
  - **The Hatchery becomes the Creature room** (option A): one console with a **Tanks** tab showing every tank (who lives there, contentment, water, plant, who is laying) where you can feed, clean, move any creature to a tank or the reserve, and open cards. **Only while standing in the room** (Colin: coming home should matter), not from the Field kit.
  - **Young swim home by themselves** (option B): when one hatches it goes to its parents' tank, or another that suits it, or the reserve; it only waits in a cradle if nothing suits. A switch on the console turns this off.
  - **Smaller creatures, much bigger tanks:** creatures in tanks drawn at about 59% of before (Colin: at least 65%, maybe more); tanks hold about three times as many (Colin: triple or quadruple): small 12 (extended 18), Grand 24 (36), display aquarium 60.
  - **Slower pace:** a pair lays every 10 minutes (was 6), crowded tanks lay more slowly (a full tank at a quarter of the speed), young take 12 minutes to grow (was 8).
  - **Depth:** code shading first (underside shadow and top light, shadows on the sand, depth inside the tanks), then **Codex** makes painted textures with baked shading (and optional normal maps); the prompt is section 7 of `docs/art/prompts/phases-22-23-creatures.md`.
  - **Choices the session made** (Colin can change them): smaller creatures dirty water a third as much and eat about 30% less (so a full tank fouls about as fast as before and a young one can still grow between visits); the shoal bonus stops growing at seven tank-mates (so a tank of 24 doesn't make four times as much each); creatures in the wild keep their size.
- **Kestrel's size in the open water (Colin, Nov 23, 2026, after PR #52 merged; built on a new pull request):** the swimmer was drawn much bigger than the mag-boots walker. Colin prefers the smaller walker ("it makes the ocean seem bigger"): make the swimmer match the walker, and both **20% smaller** than the walker was. Done with one setting, `Diver.KESTREL_SIZE` (0.8). Interiors (bases and wrecks) keep their size; ask Colin if he wants them smaller too.
- **What's next (Colin, after Phase 19 merged):** make creature care and breeding the heart of the game (Dave the Diver is the inspiration for how satisfying that loop feels), with more rare and unique creatures tied into the Choir encounter. Then premium polish. Combat gets more sections and tuning later, through playtesting. The plan is Phases 20–24 below; each needs a short design check with Colin first (the open questions are listed with each).

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

## Phase 18: Linnea, the axolotl guide. **Built** (see PROGRESS.md and [`phase-18-linnea.md`](phase-18-linnea.md)); waiting for Colin to play it and merge.

**Decided with Colin during the session (Nov 21, 2026):** her look was approved from screenshots before the hints were wired up ("she's lovely"). All nine spots were confirmed: the dark east cliff, where the cliff cave comes out in the Kelp Forest (where she also mentions the boom's winch if KS-1 exists and the boom is shut, instead of a spot of its own), outside the kelp caves, above the race, outside the Corvina, the trench rim, outside the Fulmar, by the round stone door, and home by the Kestrel buoy after first contact. The hint wording was approved as written; every line is listed in the Phase 18 notes. Talk uses the Collect action (C, X on a pad, the Collect button on touch), so no new button.

The original brief follows.

**Session prompt:** [`docs/prompts/phase-18-linnea.md`](prompts/phase-18-linnea.md).

- **Who:** Linnea, a friendly axolotl (Colin's daughter's idea and name). Soft coral and peach with warm, frilly gills, not hot pink; never Choir cyan, violet or magenta. Drawn in code in the painterly, high-fidelity style of the Phase 10 creatures and Kestrel, with personality: blinking, gill flutter, a little bob when she talks, a curious tilt as Kestrel approaches.
- **Where:** first at **the first gear gate**, the dark east cliff in Sunlit Shallows that needs the dive light (Colin described "the first block in your path where you need a piece of equipment, the brighter lamp"; he also mentioned the first winch that lets the sub through, the Kelp Forest boom, which can be a later spot). Then at other key places: each new zone's entrance and outside the major sites. She moves on as the story moves (she isn't in every spot at once).
- **How she helps:** only when Kestrel swims up to her (a Talk action offered by the control helper). She never calls out or follows you. One or two gentle lines, hinting rather than ordering ("I heard something clicking in the kelp..."). The hint is chosen from where the player really is in the progression (the [progression audit](phase-12-progression-audit.md) lists the gates and order). A soft chirp when she speaks.
- **Save:** optional new fields only (for example which of her spots you've met), with safe defaults.
- Not decided yet (the session asks Colin, or picks a sensible default and says so): the full list of her spots and the hint wording for each stage.

## Phase 19: combat inside the wrecks. First section built and merged (PR #47, with the Corvina scan point moved by her stern); more sections and tuning wait for Colin's playtesting.

**Built (Nov 22, 2026):** the Corvina's engine room, the Rivet driver RD-1, the rust tick, the weld drone and the hull keeper. Also bracing and ducking, safe lamps, a gentle blackout, warning sounds, and the Shoot action and touch button. See [the Phase 19 notes](phase-19-wreck-combat.md) and PROGRESS.md.
- **Still to do after Colin plays it:**
  - tune by feel: damage, timings, the perfect-brace window, the soft aim;
  - decide how many more sections, and in which wrecks (the Fulmar is next in line);
  - decide whether the keeper becomes a Corvina climax;
  - decide whether a gamepad button should also brace.

The open questions below were answered at the start of the session (see "Colin's decisions").

**Session prompt:** [`docs/prompts/phase-19-wreck-combat.md`](prompts/phase-19-wreck-combat.md). Probably more than one session: the first builds the weapon, two or three enemy types and one infested section of a wreck to play, then Colin plays it before more is built.

- **Where:** on foot in dry wreck interiors (`src/interior/`), starting with one section of the Corvina or the Fulmar. Not while swimming; the shallows and the sanctum stay combat-free.
- **Enemies:** small mechanical robots, drones and creatures made of rust and wreckage that infest parts of the wrecks, with a story reason (for example the wrecks' old automated systems, still running, or salvage machines gone wrong). Never the sea's wildlife. Each type has its own moves and telegraphs them clearly. First ideas to offer Colin: a skittering rust crawler that lunges, a hovering weld drone that charges up a beam, a heavy shielded sentinel that is only open after it attacks.
- **Fighting:** reading moves and timing. Shoot, plus a way to defend: a block or brace, ducking, and cover (crates and bulkheads). Ori is the reference for feel only; nothing is copied.
- **The weapon:** new gear that mounts visibly on the suit (shoulder or forearm) and changes Kestrel's silhouette, growing from the harpoon's design (DESIGN.md's Crest diver notes). Earned through the usual blueprint and Workshop path, with a major `grant()` reward. Its effects use the base kit palette (lime, gold, red), never Choir colours.
- **Controls:** a Shoot action in `bindings.ts` (keyboard, pad, and one touch button shown once the weapon is owned), plus whatever the defence needs.
- **Losing:** not punishing. Kestrel blacks out and wakes at the wreck's entrance or the last safe platform, keeping everything.
- **Sound:** every enemy move gets an audible telegraph (danger first in the mix, per Phase 16).
- **Open questions for Colin, early in the session:** what the weapon is and is called; how Kestrel's health works indoors (reuse suit integrity or something new); whether cleared rooms stay cleared or refill when you come back; how many infested sections, and in which wrecks.

## Phase 20: the creature collection book and the hatching moment. **Built in Session A** (pull request; see PROGRESS.md). Design answered: see "Colin's decisions (Nov 22, 2026)".

**Done:** the Book tab, the hatching reveal scaled by rarity, naming (a suggestion kept with one tap, or typed), creature cards, and rare eggs and decorations for finished rows and pages. Choices the session made (Colin can change them): a row is every colour of one glow pattern (it gives a decoration); a page is all 12 kinds (a radiant rare egg); name suggestions are better mixed, and creatures kept before keep their old names. The original brief follows.

**Why:** breeding already has real depth: four colours per species (the fourth only from breeding), three glow patterns (the third only from breeding), and radiant glow that runs in families (`src/game/traits.ts`). But the player rarely sees it. This phase makes rarity visible and every hatching exciting. It is the biggest visible win for the least work.

- **A collection book** (a new tab in the Field kit, or its own screen).
  - A page per species, with a grid of every colour × pattern, and radiant shown as a gold frame.
  - Kinds you haven't raised show as dark silhouettes marked "???", like unfound gear in the Kit tab.
  - Rare ones (the fourth colour, the third pattern, radiant) are marked as rare.
  - Each kind shows where it came from: wild, bred, and which generation.
  - Completing a row (every colour of a pattern, say) gives a small reward card.
- **The hatching moment.**
  - An egg cracks with a short reveal at the Hatchery: a wobble, light through the shell, the baby tumbling out.
  - The reveal scales with rarity: an ordinary baby gets a minor sparkle; a first-ever colour or pattern, or a radiant baby, gets a notable or major reward card (Phase 14 tiers) and a new page lighting up in the book.
  - The player names it then and there (names are derived from ids today; a chosen name would be a new optional save field).
- **Creature cards.** Tapping a creature in a tank (or in the book) shows a card with its portrait, name, parents, generation, traits and how content it is.
- **Open questions for Colin:**
  - a tab in the Field kit, or its own screen at the base;
  - whether players choose names (or keep the generated ones);
  - what completing a row or a page gives (materials, a decoration, a rare egg).

## Phase 21: care that pays, a breeding planner, and requests. **Built in Session A, with room for more creatures** (pull request; see PROGRESS.md). Design answered: see "Colin's decisions (Nov 22, 2026)".

**Done:** contentment, hand-feeding and recognising Kestrel, the care bonus (×1 to ×2 on rare results, shown in the planner), the breeding planner, Linnea's requests, restocking the reef, tank extensions (4 → 6, 8 → 12), the reserve, the display aquarium (20), sort/filter/move/care for all, decorations, and living tanks (wakes, surfacing, caustics, sand). Choices the session made (Colin can change them):
- **Requests are shown, not given away:** bring the creature to Linnea in the jar and talk to her; you keep it. She opens two requests once something has been bred, and her third pays the display aquarium plans.
- **The display aquarium is a refit** of an extended Grand tank (DR-1 kit), not a new base piece, so it uses the Grand tank's room.
- **The reserve is part of the Hatchery** (opens once one is built, holds 30).
- **Hand-feeding is free** (a treat, about once a minute per creature); it builds a bond that fades over about half an hour.
- **Done (Nov 23, 2026):** generated painted backdrops for every tank interior (`src/art/tanks/{bare,coral,kelp,grass,bladder,lumen}.webp`, wired via `src/art/tankArt.ts` and `HabitatWater.setTheme()`, logged in `docs/art/SOURCES.md`, with `?art=procedural` fallback).

The original brief follows.

**Why:** give breeding a rhythm and a reason, the way Dave the Diver's farm and orders keep you coming back, without copying them.

- **Contentment you can see:** each creature shows how happy it is (fed, clean water, the right plants, tank mates it likes, room to swim), with small behaviours: playful when content, sluggish when not. Content creatures breed better, and **rare results are more likely in a well-kept tank.** That makes care pay off directly, the fourth pillar.
- **Hand-feeding and interaction:** feed a creature by hand at the glass; creatures you tend often recognise Kestrel and swim to him.
- **A breeding planner** at the Hatchery: pick two parents and see the odds ("about 1 in 5 for a new pattern; radiant runs in this family").
- **Requests:** Linnea, the Kestrel radio or a passing research contact asks for a specific creature ("a moss-coloured ray with a ring glow"), each with a reward. A short list refreshes over play time. This gives purpose between story beats.
- **Restocking the reef:** releasing a bred creature can make its colour or pattern turn up in the wild later, so your work shows in the world.
- **Open questions for Colin:**
  - who gives the requests (Linnea, a radio voice, a new character);
  - what they reward (materials, rare eggs, decorations, blueprints);
  - how strongly care should change the odds;
  - whether requests have time limits (suggested: none, to stay cozy).

## Phase 22: more ways to be rare. **Built in Session B** (merged, PR #51; see PROGRESS.md). Design answered: see "Colin's decisions (Nov 22, 2026)".

**Done:** size (tiny, giant), two new fin or shell shapes per species, heirloom lines (from the 4th generation), tiered rarity (uncommon 1 in 8, rare 1 in 25, heirloom 1 in 100, Choir-touched 1 in 150; great care doubles each), the book's rare forms row, planner odds, and two new species with their own rare forms: the kiln eel (trench floor) and the chime seahorse (the sanctum's antechamber). Choices the session made (Colin can change them):
- tiny and giant are looks only (no change to what a creature makes);
- the uncommon shape and sizes also turn up in the wild; the rare shape, heirlooms and the Choir's light only from breeding;
- every size and shape of a species gives a tank decoration;
- the kiln eel makes brass and the chime seahorse grows glowing blooms;
- no creature is "bred only" as a whole species (both new species have wild founders).
- **Not done:** painted textures for the creature rigs (no image generator in this session; prompts are ready in `docs/art/prompts/phases-22-23-creatures.md`).

The original brief follows.

**Why:** Colin wants more rare and unique creatures possible. Today rarity is colour, pattern and radiance.

- **New inherited traits** so creatures look unique, not just recoloured:
  - **size:** the occasional tiny or giant one;
  - **fin or shell shape:** two or three per species;
  - **markings:** spots, stripes or freckles;
  - **heirloom lines:** a trait that only appears after several generations of careful breeding (generation 4+), as a long-term goal.
- **Possibly new species** found deeper or later (the trench, the sanctum's edge), each with its own rare forms, and perhaps a few creatures that can only be bred, never caught.
- **Art:** with the art rule relaxed (Nov 22, 2026), the creatures can get painted textures and new generated detail on their jointed code rigs, so the rare forms look special.
- **Open questions for Colin:**
  - which new traits matter most to him;
  - whether to add species (how many, and where);
  - how rare "rare" should feel (one in ten hatchings, one in fifty).

## Phase 23: creatures and the Choir. **Built in Session B** (merged, PR #51; see PROGRESS.md). Design answered: see "Colin's decisions (Nov 22, 2026)".

**Done:** Choir-touched creatures (after contact, 1 in 150, in the Choir's cyan, violet and magenta), the Choir singing back every pattern in your book in your creatures' colours, four tiers of richness (colours, circling lights, harmony, a held chord, sparkles and shimmers) and a special line for an outstanding collection, and the optional jar companion with its own moment. Choices the session made (Colin can change them):
- after first contact the plinth in the heart lets you **sing with the Choir again** (no gifts, no credits), so a later collection, Choir-touched creatures and a companion can still be heard;
- only a creature raised at the base can be a companion (not a fresh wild catch);
- the outstanding line needs 6+ species, 30+ kinds and an heirloom or Choir-touched one (or 10+ rare kinds).
- **Not done:** "the Choir's requests after the ending" (legendary lines it asks to see). It was an idea in the brief, not one of Colin's decisions; it could follow Linnea's requests later.

The original brief follows.

**Why:** tie the creature collection into the story's climax, so the ending is personal to each player.

- **The Choir's song is built from your collection.** At first contact (`src/ui/contact.ts`), the more varied and rare the creatures you've raised, the richer the Choir's answer looks and sounds. It already sings back the patterns of every creature you raised; this deepens that.
- **A companion in the sanctum:** bring a creature you raised (in the jar) into the heart, and it answers the Choir too.
- **Choir-touched creatures:** after contact, a creature can very rarely hatch carrying the Choir's light: the rarest thing in the game, and the reason to keep breeding after the credits.
- **The Choir's requests after the ending:** legendary lines it asks to see, as an endgame.
- **Open questions for Colin:**
  - **the colour rule:** may Choir-touched creatures carry cyan, violet or magenta (the one exception, because the Choir touched them), or should they show its light another way (a shimmer, an aura)?
  - how much the ending should change with the collection (a little colour and sound, or new moments);
  - whether a companion creature is required, optional, or a bonus.

## Phase 24: premium polish. Not built.

**Why:** the things that make a game feel finished and expensive.

- **First impressions:** a short opening scene (the Kestrel buoy, the first dive), and a proper title screen.
- **Moving through the world:** zone name cards when entering a new area, smoother transitions between zones and into interiors, and a music layer that rises in fights (Phase 19) and falls away after.
- **Photo mode:** freeze the game, move the camera, hide the interface, add a frame. This suits a game this good-looking, especially with rare creatures.
- **Comfort and reach:**
  - several save slots;
  - subtitles or captions for important sounds;
  - a colour-blind option for enemy warnings;
  - controller rumble in combat;
  - the key remapping screen (already queued in "Later", item 6).
- **Already planned in "Later"** (keep them; design with Colin): maps that fill in (5), a goal board (4), songs on the resonator (1), a climax at each major site (2), movement flow (3).
- **For Steam later:** a desktop build (deferred until now), achievements, cloud saves.
- **Open questions for Colin:**
  - what the opening should show;
  - which comfort features matter most;
  - when Steam becomes a real target.

## Suggested order (Colin agreed in principle, Nov 22, 2026)

1. Phase 20: the collection book and the hatching moment.
2. Phase 21: care that pays, the breeding planner, requests.
3. Phases 22 and 23: new rare traits and Choir-touched creatures, tied into the ending.
4. Phase 24: premium polish.
5. Combat (Phase 19) gets more sections and tuning whenever Colin is ready to playtest; it can slot in between any of these.

**Update (Colin, Nov 22, 2026): Phases 20–23 are built in two sessions, with every design question already answered** (see "Colin's decisions (Nov 22, 2026)"), so each session can start building after a quick look at a mock-up:
- **Session A: Phases 20 and 21, plus room for more creatures. Built (pull request, Nov 22, 2026).**
  - The collection book tab, the hatching moment, naming and creature cards.
  - Contentment, hand-feeding, the breeding planner, Linnea's requests and restocking the reef.
  - Upgradeable tanks, the creature reserve and the display aquarium.
  - Panels that sort, filter, move and "care for all".
  - Living tanks: natural swimming with wakes, ripples and bubbles when creatures surface, and richer tank art (generated images allowed). If Session A runs long, this part can move to Session B.
  - Prompt: [`prompts/phases-20-21-creature-care.md`](prompts/phases-20-21-creature-care.md).
- **Session B: Phases 22 and 23. Built and merged (PR #51, Nov 22, 2026).**
  - Size, shape and heirloom traits and the tiered rarity.
  - The two new species.
  - Choir-touched creatures.
  - The richer ending and the optional companion.
  - Prompt: [`prompts/phases-22-23-rarity-and-choir.md`](prompts/phases-22-23-rarity-and-choir.md).

  Session B builds on Session A (the book and the care odds), so A comes first.

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
