/*
 * Phase 16: the CC0 sound files the game may play (Colin's decision, Nov 21, 2026).
 *
 * None ship yet: the session that built Phase 16 could not download files (its
 * network blocked the sound libraries). Every sound still has a synthesised
 * version, and `audio.sample(name, ...)` returns false until a file is loaded,
 * so the synthesised sound plays instead.
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
export const SAMPLE_FILES: Record<string, string> = {};
