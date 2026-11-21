# Phase 14: reward moments

Colin asked for rewards to feel rewarding. He gave two examples: a Hearthstone card that shimmers and then smashes onto the table, and a chest in an Ocarina of Time-style dungeon, where the hero lifts the item overhead and a short jingle plays. Fathomlight's payoffs used to be a line of text and a small chime. Phase 14 gives them animation and sound, in three tiers. Every sound is still synthesised in code and every emblem is drawn in code. The fanfare is an original figure, not a quotation.

## The three tiers

| Tier | When | What you see | What you hear |
| --- | --- | --- | --- |
| **Minor** | A material pickup; a moss bracket lit (not the last) | The inventory chip flares and sheds a few sparks | A bright "ting" that climbs a step of D lydian with each pickup inside 2.6 s, so a good haul runs up a scale. Added on top of the existing per-material clink. |
| **Notable** | Finds, decoded blueprints, a base piece's first build, creatures caught, grown, laid or hatched, echo whorls, pattern spools, routes opened, power restored, song-locks, a lode's first drill | An emblem smashes down under the notices with a shockwave and sparks; a ribbon, a title and one line. Play carries on. About 3 s. | A soft hull-thud, then a bright two-chord answer |
| **Major** | New gear from the Workshop, suit upgrades, air tank upgrades, belt kit (jar, thrusters, cargo cradle), KD-1 repaired, KS-1 finished, each KS-1 module's **first** fit, depth plating, Signal array fragments, and the big puzzle payoffs: strongbox, cleft chimney, Sanctum door, drill seam, revival | The world drops into slow motion and the screen darkens. The emblem rises off Kestrel (or KS-1, or the walker indoors) in an arc while sparks spiral into it and light rays open behind it, then slams into the centre of the screen: flash, a short shake, two shockwaves, a burst of flares. The card names the item, its stencil code and what it opens. | A swelling riser with an accelerating arpeggio, then a deep thud, struck metal, bubbles and a chord stab, then the fanfare: short-short-short-long rising, over a held chord with falling glints. The soundtrack dips under it. |

Choir rewards (whorls, spools, fragments, song-locks, the Sanctum door, the resonator) use the Choir's cyan, violet and magenta and glassier, whole-tone bells. That keeps the design rule that only the Choir owns those colours. Creature rewards use a warmer "life" palette and voicing.

## Behaviour

- A major card can be dismissed by any tap or key after 1.7 s. Otherwise it settles away after about 5 s. A tap while the card is landing is swallowed so it does not press a touch control underneath.
- While a major card is up, ordinary notices wait and appear once it closes. Warnings are never held. The card says the short version and the notice still carries the full instructions.
- The world runs at 12% speed through the rise and slam, then about 35% while the card holds. It returns to full speed when the card closes. Animation runs on real time, so the card itself is not slowed.
- Cards queue. Two rewards from one event play one after the other.
- Reading panels (logs, drawings) open beneath the card and are there when it closes.
- Module fits are celebrated once per module, recorded in the save's existing `tips` list as `fit:<module>`. Swapping modules later is routine. A base piece's card plays only when it is the first finished piece of its kind.
- `prefers-reduced-motion` removes the shake and the slow motion and shortens the rise.

## Source

- [`src/ui/reward.ts`](../src/ui/reward.ts): the `Rewards` class (tiers, queue, emblems, canvas particles and rays, slow motion, dismissal).
- [`src/ui/rewardSpecs.ts`](../src/ui/rewardSpecs.ts): wording and icons for gear, modules, kits, air tanks and blueprints, plus `notable()` and `major()` helpers.
- [`src/audio/stings.ts`](../src/audio/stings.ts): `stingMinor`, `stingNotable`, `stingRiser`, `stingSlam`, `stingFanfare` and `stingSettle`, on the unmuffled `ui` bus. `audio.duckForSting()` in [`engine.ts`](../src/audio/engine.ts) dips the music.
- `main.ts`: `grant(spec, then?)` next to the toast wrapper. The ticker multiplies `dt` by `reward.timeScale()`. `reward.heroPos` reads the diver, KS-1 or `interior.heroPx`.
- Test hooks on `window.__fathom`: `reward(spec)`, `rewardGear(id)`, `rewardPickup(kind)`, `rewardScale()`, `rewardPin(ms | null)` (freeze a card's clock for screenshots), `audioLevel()` and `audioRunning()`.

## Validation

- `npm run typecheck`, `npm run build` and `node scripts/test-progression.mjs` pass.
- Browser (`vite preview`, headless Chromium, 1280×720 and 844×390 at 2×). Phases were captured with `rewardPin`, because the software GPU runs at about 4 FPS. Captures covered the rise off Kestrel, the slam, the held card, a notable whorl card, a Choir fragment card and a creature card. No console errors.
- Real game path. The fixture was the bench base with its recompression room swapped for a Workshop and MB-1 mag-boots at 98.5%. The Workshop finished through the normal loop and the **New ability · Mag-boots MB-1** card played. The "Mag-boots MB-1 built!" notice was held during the card and appeared after a tap closed it.
- Audio, measured at the output meter after a tap: the major sequence peaked at 0.096 RMS against 0.037 ambient, and the notable sting at 0.081 against 0.022. The pickup ting is quiet by design and was not separable at the headless page's sampling rate.
- **Not yet checked:** the mix on the iPhone speaker and with headphones, the feel of the slow motion during real play, and gamepad dismissal. Pad buttons do not close a card yet, so on a pad it closes by itself after about 5 s.

## Tuning

- Timing: `riseT` (0.9 s), `dismissAt` (1.7 s) and `closeAt` (5.2 s) in `Rewards.next()` and `frame()`.
- Slow motion: `targetScale` in `frame()` (0.12, easing to 0.35).
- Loudness: the `gain` values in `stings.ts`. The fanfare melody is `figure` in `stingFanfare`.
- Which events use which tier: the `grant(...)` calls in `main.ts`. Search for `grant(`.
