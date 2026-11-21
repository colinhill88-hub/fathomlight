# Phase 16: the audio audit

Nov 21, 2026 · first pass, built without ears (the headless browser cannot hear). Every change below needs Colin's ears on PC and iPhone before it counts as done. The listening guide is at the end.

Colin's brief: polished, natural sound that pops and has a purpose. Every action gets a shape (anticipation, contact, payoff). No machine-gun repetition. Danger first in the mix, then rewards, interactions, ambience and music. The Phase 14 reward stings stay as they are. Ori and the Will of the Wisps and the Zelda remakes are the bar for *feel* only; nothing is copied.

## How the sound is built

- **Engine** (`src/audio/engine.ts`): four buses. `sfx` and `ambience` pass the underwater muffle (a low-pass that closes with depth, caves and the forest); `ui` and `music` do not. After them: master, a fader (blackout, pause, hidden tab), the speaker mix (phone: 110 Hz low cut and a +2.5 dB presence lift at 2.4 kHz; full: 28 Hz), a gentle glue compressor (-20 dB, 2:1) and a peak limiter (-3 dB, 20:1).
- **Bus make-up gains** (voices are written small, then lifted): music ×1.6, ambience ×1, sfx ×2.4, ui ×2.2, each times the square of its slider.
- **Voices** are all synthesised: `tone`, `hiss` (white or brown noise through a filter), `bell` (FM), `metal` (inharmonic partials), `thump` and `bubbles`. Phase 16 adds `sample()` for CC0 files (none shipped yet; see below).

## Inventory (before Phase 16)

Loudness is the voice's peak gain before the bus make-up. "Danger", "reward", "interaction", "ambience" and "music" mark each cue's place in the mix hierarchy.

### Danger

| Cue | Trigger | Bus | Level | What was wrong |
| --- | --- | --- | --- | --- |
| Low-air beeps (`update`) | Air below a quarter tank | ui | 0.03 → 0.07 square | Started at about the same loudness as a pickup ting, so danger did not lead. |
| Cracked-suit alarm (`update`) | Suit integrity below a third | ui | 0.035 triangle | Quiet next to rewards. |
| Lurker rattle (`lurkWarn`) | A lurker warns from its den | **sfx** | 0.07 clicks at 1.4–1.9 kHz | On the muffled bus: at depth the muffle closes to about 900 Hz and the clicks all but vanish. The warning you most need was the quietest. |
| Lurker bite (`bite`) | A bite | ui | 0.3 thump | Good. The music did not dip under it. |
| Hull breach (`breach`) | KS-1's hull fails | ui + sfx | 0.06 alarm, 0.2 rush | The music did not dip. |
| Crush creak (`creak`) | Over the depth rating | sfx | 0.08–0.2 metal, 40 Hz thump | The 40–55 Hz body is cut on a phone speaker. |
| Heartbeat (`heartbeat`) | Blackout begins | ui | 0.25 at 50–55 Hz | Almost silent on a phone speaker (below the 110 Hz cut). |
| Steam and bilge (`hurt`) | Hazards in the wrecks | ui | 0.16–0.18 | Fine. |

### Rewards (Phase 14, kept as they are)

| Cue | Trigger | Bus | Level | Notes |
| --- | --- | --- | --- | --- |
| `stingMinor` | Every material pickup, moss bracket | ui | 0.032 bell | The ting that climbs D lydian. Kept. |
| `stingNotable` | Finds, decodes, first base piece, creatures | ui | 0.16 thump, 0.04 bells | Kept. |
| `stingRiser`, `stingSlam`, `stingFanfare`, `stingSettle` | Major rewards | ui | slam 0.34 | Kept. Music ducks to 22%. |
| `find` | Air tank, whorl, sample bag | ui | 0.05 bells | Fine. |
| `toast('scan')`, `toast('big')` | Scan complete, big notices | ui | 0.05 / 0.025 | Fine. |

### Interaction

| Cue | Trigger | Bus | Level | What was wrong |
| --- | --- | --- | --- | --- |
| Gathering strokes (`workHit`) for fibre, scrap, copper, ore, quartz, resin, moss, bloom, brass | Holding Collect at a material | sfx | 0.03–0.09 | **The same stroke every time** (only ±15% pitch). Nothing built as the ring filled. No moment when the material came loose. |
| Pickup clink (`pickup`) | Material collected | sfx | 0.045 bell | The only "release": a small clink, the same for every material apart from pitch. |
| Cutter torch (`workHit('cutter')`) | Cutting the kelp wall | sfx | 0.07 | No ignition, no break-through. |
| Boom winch, relay, vane, Fulmar hatch (`workHit('winch')`) | Hold actions | sfx | 0.03 clicks, 0.04 groan | Steady clicking with no build and no "clunk" at the end. |
| Moss brackets | Hold action | sfx | as moss | Shared the material's sound; no finish. |
| Drill nose (`drill`) | KS-1 drilling a lode or the seam | sfx | 0.05 | Random metal ticks about 8 a second. No motor, no build, no break. |
| Grabber arm | KS-1 gathering | sfx | the material's strokes | Fine once the strokes vary. |
| Tractor beam (`tractor`) | KS-1 pulls a material | sfx | 0.04 rising tone | No catch at the end. |
| Scan sweep (loop) | Holding Scan | sfx | 0.03 sine | A plain rising tone. No sense of closing in. |
| Identify ping, sonar (`ping`, `sonar`) | Scan tap, sonar | sfx | 0.04 / 0.07 | Fine. Ping now varies slightly. |
| Grapple (`clip`) | Firing the grapple | sfx | 0.05 metal ×2 | Identical every swing. |
| Dash, boost, flare, dart | Gear | sfx | 0.08–0.14 | Fine. |
| Docking clamps (`clamps`) | KS-1 docks or a lift moves | sfx | 0.15 thump | Contact only: no approach, no seal. |
| Hatch (`hatch`, `hatchCue`) | Boarding, entering bases and wrecks | sfx/ui | 0.07 | Fine. |
| Sub dent (`dent`) | Hitting rock in KS-1 | sfx | 0.3 | Fine; no scrape. |
| Footsteps (`step`) | Jump and landing on foot | ui | 0.12–0.22 | **No footsteps while walking**, only on landing. Landing identical every time. On the ui bus, so the base's echo was the sea's. |
| Drone welding (loop) | KD-1 building | sfx, panned by distance | 0.05–0.12 crackle | Good, spatial. No "finished" moment. |
| Plate press, feeder hum | Base machines | sfx, panned | 0.2 / 0.05 | Good, spatial. |
| Sub motor, wash, whine | Aboard KS-1 | sfx | 0.05–0.2 | Fine. The sea outside sounded just as close as outside the sub. |
| Jar release (`release`, Phase 15) | J / Release | sfx | 0.035–0.05 | Pleasant but a little plain. |
| Offer ping (`offerPing`, Phase 15) | A new action on the control bar | ui | 0.014 + 0.010 bells | **Not judged yet.** Probably right for headphones; may be lost on the phone speaker. |
| Panel open/close, button click, lamp | UI | ui/sfx | 0.035–0.04 | Fine. |

### Ambience (`src/audio/ambience.ts`)

Wash (brown noise, darker with depth), shallows fizz, surf overhead, a deep hum per zone, cave hollow. Events per zone: snapping shrimp and bubbles (shallows), groans (basin), kelp creaks and knocks (forest), wreck groans and clanks (shelf), pressure groans and deep pulses (trench), glassy fifths (sanctum), drips (cave). **Problem:** inside the base or a wreck, the full underwater bed and the sea's 3.6 s reverb carried on as if you were still swimming.

### Music (`src/audio/music.ts`)

Generative passages per zone (pads 0.04–0.055, melody bells 0.07, chimes 0.025), resting 40–100 s between passages, ducked to 55% with a panel open, to 22% under a reward. Not changed in this pass.

## What Phase 16 changed (round 1)

- **Variety everywhere it repeats** (`src/audio/variety.ts`): `rr()` picks from a shuffled bag of variants and never plays the same one twice running; `jit()` nudges pitch and level. Used by gathering strokes, releases, footsteps, landings, the grapple, drill grit, clamps, the scan ping, dents and the jar release.
- **Gathering has a shape.** Strokes get firmer, a little higher and quicker as the ring fills, with strain near the end (sand trickling from copper, crystal starting to sing, resin stretching, a bolt squealing, scrap rattling). Then a **release** the moment it comes loose: copper pops out of the gravel with skittering stones, scrap tears free, quartz snaps with a glassy ring and shards, resin lets go with a sticky pop, moss and bloom peel with a soft rip, kelp snaps, vent ore cracks away with a hiss, brass clanks free. The old clink stays underneath, softer, as each material's note. The Phase 14 ting still plays on top, unchanged.
- **Hold actions** have a start and a finish: the cutter lights with a whump and finishes with a crack, a groan and a gush of bubbles; the winch lets its brake go, ratchets faster as it goes and ends with a heavy pawl clunk; brackets, the recorder latches and catching a creature each get a finish.
- **Drill nose:** a continuous motor and rock grind that strains higher as it bites, grit chips that come faster, and a rockfall crunch when the lode or seam gives way.
- **Tractor beam:** a shimmer while the material travels, then a magnetic clack as it lands. **Scanning:** soft sonar ticks that speed up and climb as the scan fills. **Docking:** servo whine, the clamps, then the seal's hiss and bubbles. **Welds:** when KD-1 finishes a piece, the torch sputters out and the piece settles with a deep clank, placed where the piece is.
- **Danger leads.** The lurker's rattle plays unmuffled and dips the music; the bite and hull breach dip the music; the low-air beeps and suit alarm start a little louder than a pickup ting.
- **Phone speaker:** every deep thud (below 200 Hz) also gets a short knock an octave or two up when the phone mix is on, so the heartbeat, dents, slams and presses are heard, not just felt, on an iPhone speaker.
- **Spatial:** KD-1 now has a soft propeller whir that follows it (panned, fading with distance). Welds finishing are placed in the world. Already spatial: drone welding, the plate press, feeder hum and work at the Collect button.
- **Inside hulls:** in the base and the wrecks the echo switches from the sea's long wash to a short, bright steel room, and the ocean ambience is heard dull through the hull. Aboard KS-1 the sea outside is dulled too, while the sub's own motor stays clear.
- **Footsteps:** walking now has footsteps (steel deck in the base, loose wet plates in the wrecks), varied, quicker when running. Landings vary and use the room echo.
- **Jar release (Phase 15):** the lid unscrews, pops with a low "thoop", bubbles swirl away to one side, then the soft falling goodbye.
- **Samples ready for later:** `audio.sample(name, ...)` plays a decoded CC0 file through any bus and returns false if it is not loaded, so the synthesised sound stays as the fallback. The list is `src/audio/samples.ts` (empty).

Also fixed on the way: about half of all kept creatures showed the name "undefined" (a sign error in `creatureName()` from Phase 13). Every name that already worked is unchanged.

Not changed: the Phase 14 stings, the music, the ambience beds (apart from the hull filter indoors), the limiter and glue settings (they already only catch peaks), and the offer ping's level (it needs Colin's ears first).

## Measured (headless browser, desktop mix, diver at the surface)

The browser cannot hear, so this only proves that each cue plays and that nothing clips. Peaks are not loudness: a deep thud reads far quieter to the ear than its peak says, and a 1–4 kHz click far louder. Read with a meter on the audio thread after the limiter, over 1.8 s, after one tap to start the audio.

| Cue | Peak | Cue | Peak |
| --- | --- | --- | --- |
| Ambient bed alone | 0.08 | Bite (danger) | 0.70 |
| Copper release + ting | 0.34 | Lurker warning (danger) | 0.22 |
| Quartz / moss / fibre release | 0.21 / 0.10 / 0.15 | Hull breach alarm (danger) | 0.25 |
| Scrap / brass / ore release | 0.36 / 0.40 / 0.35 | Hard dent | 0.84 |
| Winch / cutter finish | 0.44 / 0.34 | Major reward (riser, slam, fanfare) | 0.89 |
| Drill break / weld finished | 0.41 / 0.36 | Offer ping | 0.16 |
| Docking clamps | 0.44 | Jar release | 0.20 |
| Pile-up (bite, breach, drill, dent, major reward and a release at once) | 0.92 | | |

The first pass had the tool finishes at 0.52–0.60, above the danger cues, so they were lowered and the lurker rattle and breach alarm raised. Nothing reached 1.0 (clipping); the limiter only acted on the pile-up.

## Sound files: why none are in yet, and the shortlist

This session's network blocked the sound libraries (kenney.nl, freesound.org and opengameart.org were refused by the environment's network policy), so no files were downloaded. To allow them, open the cloud environment's settings (the environment menu in the session's title bar, then Edit) and add those hosts under Network access → Allowed domains. Then a later session can fetch these.

Every candidate must be checked for a **CC0** licence on its own page before download. Freesound mixes CC0 with CC-BY and non-commercial files, so filter by licence "Creative Commons 0". Kenney's packs are all CC0.

| Use | Where | What to look for |
| --- | --- | --- |
| Copper and ore release, drill break, dents | Kenney "Impact Sounds" (kenney.nl/assets/impact-sounds) | The `impactMining_*` and `impactPunch_heavy_*` one-shots: short gravel and stone crunches. Pitch down and low-pass for underwater. |
| Scrap, brass, hull plates, clamps, footsteps on steel | Kenney "Impact Sounds" | `impactMetal_*`, `impactPlate_*`, `footstep_concrete_*` / metal steps. |
| Kelp cut and snap, moss rip | Freesound, CC0 filter: "celery snap", "cloth rip", "plant tear" | Short, dry, close-miked. |
| Quartz snap and shards | Freesound CC0: "glass break small", "ice crack", "crystal tap" | Very short; we add the ring ourselves. |
| Bubbles, regulator exhale | Freesound CC0: "underwater bubbles", "scuba regulator", "hydrophone bubbles" | A few seconds each; loops for the breath. |
| Water ambience, surf from below | Freesound CC0: "hydrophone ambience", "underwater ocean" | 10–20 s loopable, mono, low bitrate. |
| Wreck groans and hull creaks | Freesound CC0: "ship hull creak", "metal stress groan" | For the shelf ambience and crush creaks. |
| Gravel and sand trickle | Freesound CC0: "gravel pour", "sand trickle" | For the copper strain and the drill. |
| Wet footsteps for the wrecks | Freesound CC0: "footsteps puddle metal" | Short single steps. |

Format: trim, mono, normalise, convert to `.mp3` (or `.m4a`) at 96–128 kbps; very short one-shots may stay `.wav`. Log each in `public/audio/CREDITS.md`.

## Listening guide (round 1)

Play on PC with headphones, then on the iPhone speaker (in the game's Settings, the sound button should read "Mix: phone speaker"), then iPhone with headphones. For each, tell me "keep", "too loud", "too quiet", "too much" or "not right".

1. **Gathering** (Sunlit Shallows and the basin, from a new save or any save). Hold Collect on: a kelp stalk (fibre), a scrap pile, a copper nugget in the gravel, a resin holdfast. Listen for strokes that are never quite the same, getting firmer and quicker as the ring fills, then a clear pop or crunch when it comes loose, then the climbing ting. Collect three or four in a row: the ting should still climb, and nothing should sound like a stuck record.
2. **Quartz, moss, bloom, brass, ore**: wherever you next meet them (brass on the Wreck Shelf, ore and bloom behind the drilled seam, the others along the route). Same things to listen for.
3. **Kelp Forest tools.** Wind the boom winch (ratchet speeds up, a heavy clunk at the end) and light the moss brackets. Cut the kelp wall with the cutter (a whump as it lights, a crack and a rush when it breaks through).
4. **KS-1.** Drill any lode (a motor that strains higher, grit, then a rockfall crunch). Use the tractor beam on a material (a shimmer, then a clack). Dock at the Moon pool (whine, clamps, seal). While aboard, notice the sea sounding duller outside while the motor stays clear.
5. **The base on foot.** Walk and run along the corridors (footsteps on steel, quicker when running), jump and land. The echo should be short and close now, and the ocean muffled outside the hull. Walk a wreck (Corvina or Fulmar): wetter steps.
6. **KD-1.** Watch it fly to a build: a soft whir that pans with it. Let it finish a piece: the torch sputters out and the piece settles with a clank.
7. **Scanning.** Hold Scan on a creature: ticks that quicken as the ring fills, then the usual chime.
8. **Danger.** Swim near a lurker den on the Wreck Shelf: the rattle should be clear even deep down, and the music should dip. Let the air run low: the beeps should be the loudest thing on screen apart from a bite.
9. **Jar release.** Catch something, press J: two small clicks, a pop, bubbles swirling to one side, then the goodbye notes.
10. **(Decided after round 3: Colin turned the offer ping off; it dinged at every new offer.)** **The control bar's offer ping (please judge this one).** Swim up to anything new you can Collect, Scan or Board and listen for the very soft two-note tone. Is it audible on the iPhone speaker? Too much on headphones? Its level is `gain: 0.014` and `0.01` in `offerPing()` in `src/audio/director.ts`.

On the phone speaker especially: are the heartbeat (black out once), sub dents and press stamps audible now?

## Round 2: first recorded sounds (built)

16 one-shots from Kenney's CC0 Impact Sounds (stone and gravel, metal, light glass, hard-floor footsteps) now layer under copper, ore, scrap, brass and quartz coming loose, the copper strokes, the drill breaking through and footsteps. Measured peaks: copper release 0.52 before trimming, bite 0.75 for reference; nothing clipped. The network now allows kenney.nl, freesound.org, cdn.freesound.org and opengameart.org.

## Round 3 plan (status)

- Tune levels from Colin's notes. **Not done:** no listening notes were given yet, so no existing level was changed by ear.
- Fetch the shortlisted CC0 files once the network allows, and layer them under the synthesised gathering releases, footsteps and bubbles. **Done** (below).
- Creature voices in the world (soft calls placed by position) and the sub heard from outside when you swim near it. **Done** (below).
- Per-zone footstep surfaces in the base (grating, plate, wet moon pool deck). **Not done**; moved to round 4.

## Round 3: the rest of the shortlist (built, review branch)

30 CC0 files from Freesound, each checked on its own page (licence "Creative Commons 0"), fetched as Freesound's public preview MP3s (same licence as the original), then trimmed, faded, levelled and converted to mono 64 kbps MP3. Every file is in `public/audio/CREDITS.md`. They add **289 KB**; all 46 audio files together are **373 KB**. Each plays through `sam()` on the normal buses (so the volume sliders, mute, the underwater muffle, the hull filter and the phone mix all apply) and layers under the synthesised sound, which plays alone if a file fails to load.

| Group (files) | Source | Where it plays |
| --- | --- | --- |
| `bubble` (3) | ristooooo1, "Bubbles 001" | The jar release, boosting, catching a creature, docking's seal, diving in, half the bubble trickles in the shallows ambience. |
| `exhale` (3) | Yuval, "Scuba diver bubbles" | Every breath out underwater (the synthesised rush stays under it; extra synthesised bubbles join as air runs low). |
| `dive` (2) | adviseme333, "Dipping below water" 1 and 2 | Diving under the surface. |
| `sea` (1, a 10 s loop) | Tim_Verberne, "Underwater Ambience" | Under the synthesised water bed in every zone; quieter with the head out, dull through a hull. |
| `kelp` (4) | mrmccormack and ericnorcross81, celery snaps | A kelp stalk parting (fibre); slowed down, the kelp wall giving way to the cutter. |
| `rip` (3) | reg7783 and fotoshop, cloth rips | Moss and bloom peeling off; a moss bracket lit. |
| `groan` (3) | hinchinbrook, LoafDV, NachtmahrTV | Slowed right down: wrecks settling on the Wreck Shelf, a quarter of the trench's pressure groans, severe crush-depth creaks. |
| `creak` (3) | kyles, Crinkem, ingudios | Every crush-depth creak (mid-range, so it is heard on a phone speaker), half the shelf's clanks. |
| `sand` (3) | Wagna, Dalibor | Sand trickling as copper loosens (every other stroke near the end, and softly under the release), grit off the drill nose, the rockfall after the drill breaks through. |
| `wetstep` (5) | Kodack, "Wet Metal Footsteps" | Walking in the wrecks (the base keeps round 2's hard-floor steps). |

**Extras (round 3):**

- **Creature calls**, synthesised and placed by distance and pan: every 4–10 s one creature within about 900 px calls softly. Puffcaps boop, rays hum as they glide, tinker crabs click, lantern shrimp snap and chirp, cinder snails glug, glowfins chirp. Young ones are higher and lighter. Not indoors, not with a panel open. `creatureCall()` in director.ts; main.ts passes `critters` from `wildlife.voices()`.
- **KS-1 heard from outside:** while you swim near the parked sub, a low electric idle with a slowly breathing pump and a faint higher whine (so it reads on a phone speaker), panned to where the sub is and fading out by about 700 px. `loops.idle` in director.ts.

**Not changed:** the Phase 14 stings, the music, the danger cues' synthesised parts and every existing level that Colin's notes would govern (there were none).

### Measured (headless browser, desktop mix, Kestrel a few metres under in the shallows)

The browser cannot hear: these numbers only show that each sound plays and nothing clips. A meter on the audio thread after the limiter read the loudest sample over 1.8 s per cue. The ambient bed (with breathing) alone already peaks around 0.2, so quiet cues barely move the number. "Without" plays the same cues with every recorded file switched off (round 1's synthesised sound).

| Cue | With the files | Without |
| --- | --- | --- |
| ambient bed + sea loop + breathing (8 s) | 0.202 | 0.233 |
| fibre release (kelp snap) + ting | 0.214 | 0.198 |
| moss release (rip) | 0.195 | 0.212 |
| bloom release (rip) | 0.251 | 0.229 |
| copper release (+ sand) + ting | 0.462 | 0.384 |
| jar release (bubbles) | 0.217 | 0.285 |
| creature caught (bubbles) | 0.181 | 0.230 |
| cutter breaks through (kelp, bubbles) | 0.421 | 0.362 |
| bracket lit (rip) | 0.229 | 0.208 |
| diving in (dive, bubbles) | 0.277 | 0.282 |
| drill breaks through (+ sand) | 0.437 | 0.395 |
| crush creak mild (creak) | 0.712 | 0.730 |
| crush creak severe (creak + groan) | 0.884 | 0.895 |
| wreck footsteps x4 (wetstep) | 0.279 | 0.195 |
| docking clamps (bubbles) | 0.488 | 0.424 |
| creature call puffcap | 0.230 | 0.251 |
| creature call ray | 0.294 | 0.237 |
| creature call crab | 0.318 | 0.241 |
| creature call shrimp | 0.241 | 0.216 |
| creature call snail | 0.262 | 0.221 |
| creature call glowfin | 0.270 | 0.197 |
| danger: bite | 0.700 | 0.873 |
| danger: lurker warning | 0.311 | 0.331 |
| pile-up: bite, breach, drill, dent, creak, release, major reward | 0.930 | 0.992 |

The same synthesised cues vary from run to run by up to about 0.2 (the bite read 0.70 and 0.87 in the two passes, and it uses no files), so only large differences mean anything. Nothing reached 1.0; the limiter held a synthesised-only pile-up at 0.99. Peaks are not loudness: the lurker's dry rattle reads lower than a copper release on the meter but is far more piercing to the ear, as in round 1.

KS-1 from outside (a fixture: a built sub placed in the save 250 px to Kestrel's right): idle gain 0.020, panned 0.36 right; 1500 px away: 0. Creature calls, with Kestrel hovering by the puffcaps over the drop-off: a puffcap call fired with distance gain 0.58 and pan 0.31 (game time in the headless browser runs at about a fifth of real time, so only one call came in the window).

All 46 files loaded (`__fathom.audio.samples.size` = 46). Every group played through the real code paths (a counter on `audio.sample`). No console errors. After the first measurement, the copper sand trickle, the cutter's kelp snaps, the docking bubbles and the dive splash were turned down, because they had pushed those cues above where they sat before.

## Listening guide (round 3)

Same three setups: PC headphones, iPhone speaker (Settings, "Mix: phone speaker"), iPhone headphones. Tell me "keep", "too loud", "too quiet", "too much" or "not right" for each.

1. **Breathing and the sea** (Sunlit Shallows, anywhere a few metres down). Hover still for 30 s. Each breath out should be a real regulator rush of bubbles, never twice the same; under everything, a slow, living underwater texture. Surface: the texture drops away. Go into the base: the sea should be dull through the hull.
2. **Diving in.** Float at the surface, then dive: a real dip under the water and a burst of bubbles.
3. **Bubbles.** Boost (a gush), catch a creature (bubbles as the lid shuts), press J to release it (a gush off to the side it swims), dock KS-1 at the Moon pool (a soft bubble seal). In the shallows, listen for occasional bubble trickles off to one side.
4. **Kelp and moss.** Collect kelp fibre (a crisp snap as the stalk parts). Peel moss or bloom (a soft rip). In the Kelp Forest, light a moss bracket (rip) and cut the kelp wall (big, slow snaps as it gives).
5. **Copper and the drill.** Dig copper: near the end, sand trickles out; a little more as it pops free. Drill a lode in KS-1: grit pours off now and then, and a rockfall trickle after it breaks.
6. **The Wreck Shelf.** Hover for a minute: huge, slow hull groans and plate creaks far off. Walk inside the Corvina or Fulmar: wet metal footsteps.
7. **Crush depth.** Go below your suit's rating briefly: each creak now has a real metal creak (it should be clear even on the phone speaker), and a long groan when it's bad. Don't stay down.
8. **Creatures.** Hover near puffcaps (over the drop-off), dapple rays (seagrass meadow), tinker crabs and lantern shrimp (Kelp Forest floor), cinder snails (trench vents). Every few seconds one calls softly, from where it is. Should they be quieter, louder, rarer?
9. **KS-1 from outside.** Climb out of the sub and swim around it: a low idle hum with a slow pump, louder as you get close and coming from its side.
