# Pacing audit (Nov 27, 2026)

Colin asked for a test playthrough to check pacing: how long it takes to gather materials and build what each biome needs, and whether too many blueprints unlock at once in the kelp forest.

## How this was done, and its limits

- **No real playthrough was possible in the cloud container.** With no graphics card, headless Chrome runs the game at about **7% of real speed** (measured: 0.07 game-seconds per real second), so an hour of play would take about 14 hours. The browser was used only to confirm timings: prying loose a scrap took 2.35 s of game time (the code says 2.2 s).
- **Instead, a pacing model** ([`scripts/pacing-model.mjs`](../scripts/pacing-model.mjs)) simulates an efficient player on a fresh save, second by second, with the game's real numbers. It reads them from the code, so it stays correct as numbers change:
  - every piece, gear, research and KS-1 cost and time;
  - every wild pickup spot (by zone), its collect effort and its regrow time;
  - the dive bag's carry limit and the swim speed (taken as 200 wu/s, a little under the 230 top speed);
  - the plate press (0.5 plating a minute);
  - creature output (one material every 4 minutes from a happy grown creature), growing (12 min) and breeding (18 min a lay).

  The player sweeps the zones they can reach for what's missing, unloads, and builds, decodes and crafts in order. The Lab, Workshop, drone and press work on their real timers alongside.
- **What it leaves out:** puzzles, caves, fights, reading and getting lost. It adds a flat guess per zone instead: 8 minutes in the shallows, 25 in the kelp forest, 30 on the wreck shelf and 35 in the trench. **Its times are a floor for an efficient player; a first-time player will be slower.**
- Run it with `node scripts/pacing-model.mjs` (keen player) or `--critical` (the route only).

## Results

| Reached | Route only | Keen player (decodes and builds every optional blueprint as it unlocks) |
| --- | --- | --- |
| Kelp forest (dive light built) | 0:44 | 0:47 |
| Wreck shelf (race crossed) | 1:44 | 2:36 |
| Trench (PS-1 built) | 3:03 | 4:48 |
| Resonator (sanctum, first contact) | 4:14 | 6:20 |

### What holds the route up

1. **The plate press: about 28 minutes of the route-only run were spent waiting for hull plating.** One press makes 1 plating every 2 minutes. The workshop and light need 6, the dock 6, and **KS-1 alone 12, which is 24 minutes on one press**. Nothing tells the player that a second press would halve it.
2. **Resin (5 wild spots, 20 minutes to regrow).** The Creature room took 15–18 minutes to afford, mostly waiting for resin. In the kelp forest, resin is wanted by the cutter (2), the tow line (2), the Creature room (4), the sorting pod (4) and the air relay (4): 16 in all. That's three full regrow cycles of every wild resin spot, unless the player grows it in a Kelp farm.
3. **Breeding at the end: one lay, hatch and grow cycle is at least 32 minutes** (18 min to lay, 1.5 to hatch, 12 to grow). Fragments 3 and 4 need patterns bred at the base. A player who only starts breeding when the Signal array asks for it waits half an hour at the very end. Breeding was slowed to 18 minutes a lay on Nov 25, which made this longer.
4. **The shallows opening takes about 45 minutes** to the dive light (KD-1 repaired at 1 min, dome at about 3, Lab at 13, Workshop at 28). That's a reasonable first chapter. The Workshop is its slowest step, because of the 4 plating.

### The unlock bursts (Colin's concern)

Blueprints that become decodable in each zone, besides the ones the route needs:

| Zone | Optional blueprints that unlock | Lab time | Plus the route's |
| --- | --- | --- | --- |
| Shallows | satchel | 0:45 | dive light |
| **Kelp forest** | **sorting pod, air relay, welder, flare, echo visor, dash** | **6:30** | **cutter, tow line, Creature room** |
| **Wreck shelf** | **recompression room, salvage crane, sonar, mag-boots, stun dart, rivet driver, afterburner, ballast, tractor, sonar dome, KS-1 habitat, core generator, revival pool, RD-2** | **18:35** | **PS-1** |
| Trench | depth plating, heat cowl, drill | 4:30 | PS-2, Signal array, resonator |

- **The kelp forest is the first big burst.** Nine blueprints, after one in the shallows. Most of them come from finds in one cave system: the relay log, the weld chip, the tow coil, the cutter cache and the nursery log. A keen player spends about **50 minutes on optional kelp work before starting the cutter and tow line** the route needs. That matches what Colin felt.
- **The wreck shelf is a bigger burst (15).** In play it's spread out a little, since its finds come one by one as you get into the Corvina. It's still the densest stretch of the game.

## Proposals (not built; for Colin to choose)

### 1. Space out the kelp forest's optional blueprints

Add one later scan to four of them, so each unlocks where it first becomes useful. The finds stay where they are: the player still picks up the relay log in the caves, but the Lab can only read it once they've seen the place it refers to.

| Blueprint | Today | Proposed | Why there |
| --- | --- | --- | --- |
| DR-2 welder (drone welds twice as fast) | weld chip (caves) | + first look at the wreck shelf (`wshelf`) | the dock (6 plating) and KS-1 (12) come next: the biggest builds yet |
| AR-1 air relay | relay log (caves) | + the Corvina (`corvina`) | long dives inside and around the wreck |
| TH-3 dash | the cold surge | + the race (`race`) | a burst of speed for the race's currents |
| EV-1 echo visor | an echo whorl + lumen moss | + the silt slump (`hidden`) | the visor finds what's hidden; the slump is the first hidden thing |

The kelp forest then unlocks **5** (sorting pod and flare, plus the route's cutter, tow line and Creature room), and the four moved ones arrive at four different moments on the shelf.

### 2. Thin the wreck shelf by moving three blueprints to the trench

| Blueprint | Today | Proposed | Why there |
| --- | --- | --- | --- |
| Recompression room RC-1 | shelf + lurker | + the trench (`trench`) | its own text says it "prepares you for the deep" |
| KS-1 habitat pod | air pocket + Corvina | + the trench | long sub dives start in the trench |
| KS-1 sonar dome | the Corvina's log | + the trench | finding materials in the dark |

### 3. Ease the plate press

Either or both:
- **A hint** when plating is what a build is waiting for: "A second plate press would make plating twice as fast." This keeps the factory feel.
- **Raise the press from 0.5 to 0.75 plating a minute.** KS-1's 12 plating would go from 24 to 16 minutes.

### 4. Nudge breeding earlier

When the Creature room is built, have Linnea (or the room's console) say that bred babies bring new patterns, and that the Signal array will want them later. That way the 32-minute cycle overlaps with the wreck shelf and the trench instead of sitting at the end.

### 5. Leave resin as it is (for now)

Resin being scarce is Colin's own choice (it makes the Kelp farm matter). Proposal 1 already takes 4 resin out of the kelp forest's crunch by moving the air relay later.

## Saves

Proposals 1 and 2 only add a scan to blueprints that haven't been decoded yet. Anything already decoded or built stays. A player mid-game might see one of those four blueprints wait until they've scanned the new place, which is the intent. No save field changes.
