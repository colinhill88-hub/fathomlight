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
};

export const SAMPLE_FILES: Record<string, string> = Object.fromEntries(
  Object.entries(SAMPLE_GROUPS).flatMap(([name, n]) => Array.from({ length: n }, (_, i) => [`${name}-${i + 1}`, `audio/${name}-${i + 1}.mp3`])),
);
