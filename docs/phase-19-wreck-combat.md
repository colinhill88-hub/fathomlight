# Phase 19: combat inside the wrecks (first section)

Colin asked for combat on foot inside wrecks only (Nov 21, 2026). On Nov 22 he agreed the design at the start of this session. This first part builds one playable infested section so he can play it before more is built.

## What Colin chose

- **Weapon:** the **Rivet driver RD-1**. It's a chunky forearm launcher grown from the harpoon: the same white stock and chrome barrel, now a housing strapped on with two red bands, a brass-banded rivet drum on top, a brass muzzle ring and a lime sight lamp. It fires glowing hot rivets with a lime muzzle flash and gold sparks. A **guard plate** (the harpoon's barbs grown into a round plate) folds out when Kestrel braces.
- **Health:** suit integrity, the ring already on the dive watch. Hits crack it. After a few quiet seconds (no awake machine close by) it seals itself, a full suit in about 12 s.
- **Cleared rooms:** the **hull keeper stays beaten** (saved). The small machines rebuild themselves each time Kestrel comes back in.
- **Where:** a **new, optional engine room in the Corvina**, behind a welded door at the west end of her hold. The drawings for the weapon are in the bosun's locker beside that door. Nobody gets stuck on the main route without the weapon, and old saves are untouched.

## The story

The Corvina carried small hull-keeping machines that scrubbed fouling off her plates and patched welds on long surveys. When she sank, her automatic "hull keeper" kept running on a trickle of power in the engine room. Over the years its machines rebuilt themselves out of rust and scrap. Now they treat anything that moves as fouling. Her crew welded the door shut and left the rivet driver drawings in the bosun's locker. The chief engineer's log, in the keeper's store, tells this.

## The route

1. In the Corvina's hold (bottom deck, west end, past the salvage crate) is the bosun's locker (Collect). It gives the **Rivet driver drawings** (a find, `rivetplans`).
2. A Lab decodes them (80 s) into the **Rivet driver blueprint**.
3. The Workshop builds the **Rivet driver RD-1** (3 brass, 4 copper, 2 quartz; 60 s). A major reward card plays, with its own emblem.
4. Back in the hold, **hold Collect at the welded door** to force it. Without the driver, the door explains itself and points at the locker.
5. **The engine room:** three rooms, each starting at a safe lamp.
   - **Room 1:** two rust ticks, with a crate between them.
   - **Room 2:** two weld drones and a tick, among crates you can take cover behind.
   - **Room 3:** the hull keeper in its nest.

   Behind the keeper, a rusted shutter lifts once it is beaten. It opens onto the keeper's store: the chief engineer's log, and the keeper's hoard (4 brass, 4 copper, 3 quartz, 2 hull plating).

## The machines (each attack is shown and heard first)

| Machine | Warning | Attack | Answer |
| --- | --- | --- | --- |
| **Rust tick:** a domed shell of riveted plate on six rod legs, one red eye | It crouches, shakes and its eye flares; a rattle rises in pitch (0.55 s) | Lunges along the floor | Jump it, or brace. It lands on its back for about 1 s. Two rivets. |
| **Weld drone:** a round armoured hull under two rotors, a torch beneath | A dashed red sighting line follows Kestrel while its torch builds gold and a whine rises; then the line goes solid and blinks, with two beeps (it is locked) | A hot bolt along the line | Duck (brace) after it locks, or take cover behind crates. Its vents open and glow while it cools: shoot then. A rivet during its charge interrupts it. Armoured otherwise. Two rivets. |
| **Hull keeper:** a hunched loader on piston legs, a scoop shield, a hammer arm, a furnace core | **Slam:** the hammer arm heaves up, hydraulics hiss and ratchet, its lamp flashes. **Charge:** it rears back venting steam, a motor revs up | **Slam:** a shockwave rolls along the floor both ways. **Charge:** it rams forward | **Jump the shockwave** (the guard can't stop it). **Brace against the charge** (it stops dead, staggered). If it misses and hits a wall it is dazed. Afterwards its shield droops and the core blazes: the only time rivets hurt it. Five rivets. |

A **perfect brace** happens when the guard comes up just as a hit lands (within 0.22 s). It knocks a tick far back, staggers the keeper longer, and **sends a drone's bolt straight back** at the drone. A ringing lime "shing" plays.

Rivets **aim softly**: the nearest machine in front, within about 40° of level and in sight, so play on touch stays simple.

## Losing

When the suit gives way: the screen fades to dark, and Kestrel wakes beside the **last safe lamp he lit** this visit (or the door). The suit is patched to 60%, and nothing is lost. The machines in that room and the ones ahead of it rebuild; rooms behind stay as they were.

## Controls

- **Shoot:** **X** on the keyboard, **RT** on a gamepad, the **Shoot** button on touch. These are the stun dart's keys, but the dart only works swimming and the driver only on foot, so they never clash. The Shoot button only appears in the engine room once the driver is built; it sits where Scan is while swimming. Flare and Dart buttons are hidden on foot.
- **Brace / duck:** hold **Down** (S, the stick down, or the touch stick down). Kestrel crouches behind the plate and stays put, but can turn round. Shooting while braced fires low from behind the plate.
- The control bar shows Shoot and Brace in the engine room.

## Switching it off, and tuning

- `?combat=off` in the address keeps the engine room door welded shut. Nothing else changes.
- Every number (damage, timings, speeds, hit points, how fast the suit mends) is in `src/game/combat.ts`.

## Sound

Every tell is its own synthesised cue, placed towards the machine, on the `ui` bus (never muffled), and dips the soundtrack (`duckForSting`), like the lurker's warning:

- tick: a rising rattle;
- drone: a rising whine and two lock beeps;
- keeper: a hydraulic heave with a ratchet (slam), a steam roar with a motor rev (charge), a start-up groan when it wakes, a steam bleed and rising note when its core opens.

Kestrel's rivets play on `sfx`, so the room echo carries them. Hits, pings off armour, blocks, the perfect-brace ring, a machine falling apart, and the keeper's power-down are all separate cues. No sound files were added.

## Save

- `corvina.engine?: { taken: string[] }`: optional, absent in old saves. It holds the finds taken in the engine room (`7`, `$`) and `k` once the keeper is beaten.
- The Corvina's own `taken` list gains `6` (the bosun's locker).
- New ids: gear `rivet`, blueprint `rivet`, find `rivetplans`, scan `enginelog`.
- Tips: `perfectbrace`, `safelamp`.

## Source

| File | What |
| --- | --- |
| `src/game/combat.ts` | The rules and every number: hits, blocking, the perfect brace, suit mending, respawning, the wake point, the switch. |
| `src/game/foes.ts` | `FoeField`: the machines' moves, the rivets, the bolts and the shockwaves (no drawing; stepped in Node by the tests). |
| `src/interior/engineRoom.ts` | The map, the safe lamps, rooms and spawns. |
| `src/interior/engineArt.ts` | The engine room's backdrop, and the welded door in the hold. |
| `src/interior/foeArt.ts` | The machines and their tells. |
| `src/interior/combatLayer.ts` | Plugs the fight into the interior (`InteriorOptions.combat`): brace, shoot, hits, lamps, sparks, the shutter. |
| `src/actors/walker.ts` | `guard`, `aim`, `aiming` and `kick`: the crouch, the raised forearm, the aiming arm and recoil, plus the driver and plate on the near forearm. `drawRivetDriver` and `drawGuardPlate` live in `src/actors/diver.ts` (the swimmer wears the driver too). |
| `src/audio/director.ts` | `foe(cue, dx)`, `suitHit()`, `safeLamp()`. |

## Also in this pull request

The Corvina's scan point (`scanPoints.corvina` in `src/world/scenery.ts`) moved from inside her hull amidships to open water just off her stern, beside the bollard and deck hatch, so players meet it on the way in (Colin).
