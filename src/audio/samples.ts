/*
 * Phase 16: the CC0 sound files the game may play (Colin's decision, Nov 21, 2026).
 *
 * Round 2 (Nov 21, 2026) adds 16 one-shots from Kenney's CC0 "Impact Sounds"
 * pack, in variant groups (`mining-1`..`mining-5` and so on). Every sound still
 * has a synthesised version: `audio.sample(name, ...)` returns false until a
 * file is loaded, so the synthesised sound plays instead.
 *
 * To add one:
 *  1. Only public-domain or CC0 files. No CC-BY, no "royalty-free" licences, no
 *     non-commercial terms (Colin may sell the game on Steam).
 *  2. Put it in public/audio/ as .mp3 or .m4a (short one-shots may be .wav),
 *     mono, trimmed, normalised, small.
 *  3. Log it in public/audio/CREDITS.md: source URL, author, licence, date
 *     downloaded and the edits made.
 *  4. Add it below (name -> path relative to the page, e.g. 'audio/gravel-1.mp3')
 *     and call `audio.sample('gravel-1', { gain, rate, bus, pan })` where the
 *     synthesised sound is, keeping the synthesised one as the fallback.
 *
 * The shortlist of files to fetch is in docs/phase-16-audio-audit.md.
 */
/** Variant groups: name -> how many numbered files (audio/<name>-<n>.mp3). */
export const SAMPLE_GROUPS: Record<string, number> = {
  mining: 5, // stone and gravel hits: copper, ore, the drill breaking through
  metal: 3, // metal impacts: scrap and brass coming free
  glass: 3, // light glass taps: quartz snapping off
  step: 5, // footsteps on hard floors: the base's steel decks
  // Round 3 (Freesound, CC0):
  bubble: 3, // short bubble bursts: the jar release, boosting, catching, the shallows
  exhale: 3, // a scuba regulator breathing out: Kestrel's breath out
  dive: 2, // dipping under the surface: diving in
  sea: 1, // a 10 s underwater ambience loop (see SAMPLE_LOOPS)
  kelp: 4, // crisp vegetable snaps: a kelp stalk parting, the kelp wall giving way
  rip: 3, // cloth rips: moss and bloom peeling off, a bracket's moss coming free
  groan: 3, // long metal groans: wrecks settling on the shelf, the trench, crush depth
  creak: 3, // short metal creaks: crush-depth creaks, the shelf's clanks
  sand: 3, // sand and gravel trickling: copper loosening, the drill, rockfall
  wetstep: 5, // footsteps on wet metal: walking in the wrecks
  // Round 4 (Freesound, CC0 — hatch unscrewing, rivet gun, stun-dart zap, sonar, airlock hiss, brass switch):
  hatchwheel: 1, // ratcheting metal wheel unscrewing a submarine hatch
  hatchclunk: 1, // heavy metal hatch unlatching & docking clamps locking
  hiss: 1, // pressurized airlock & docking seal steam/air release
  rivet: 2, // pneumatic compressed-air burst for RD-1 rivet driver & SD-1 dart release
  zap: 1, // crisp electric taser/stun-dart impact crackle
  sonar: 1, // resonant submarine sonar ping
  click: 1, // tactile metallic brass switch click (UI buttons & headlamp)
};

/**
 * Round 3: looping files, with the loop points (seconds). The file carries a
 * quarter second of extra, matching sound at each end, so a decoder that adds
 * a little silence at the start (MP3 padding) never puts a gap in the loop.
 */
export const SAMPLE_LOOPS: Record<string, [number, number]> = {
  'sea-1': [0.25, 10.25],
};

export const SAMPLE_FILES: Record<string, string> = Object.fromEntries(
  Object.entries(SAMPLE_GROUPS).flatMap(([name, n]) => Array.from({ length: n }, (_, i) => [`${name}-${i + 1}`, `audio/${name}-${i + 1}.mp3`])),
);
