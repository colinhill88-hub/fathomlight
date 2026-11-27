/**
 * Pacing model (Nov 27, 2026): a simulated, efficient player on a fresh save, stepped one
 * second at a time, using the game's real numbers (costs, research and build times, pickup
 * spots and regrow times, carry limits, creature output). It answers "how long does each
 * stage of the game take, what holds it up, and when do blueprints unlock?".
 *
 * It is a model, not a recording of play: puzzles, caves, fights and getting lost are not
 * in it (they are added as flat "exploring" minutes per zone, listed below), and it
 * plays efficiently. Treat its minutes as a floor for a first-time player.
 *
 *   node scripts/pacing-model.mjs            critical path, plus the optional blueprints as they unlock
 *   node scripts/pacing-model.mjs --critical critical path only (decode only what the route needs)
 */
import { createServer } from 'vite';

const CRITICAL_ONLY = process.argv.includes('--critical');
const server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom', logLevel: 'error' });

try {
  const [state, base, gear, factory, sub, pick, creatures] = await Promise.all([
    server.ssrLoadModule('/src/game/state.ts'),
    server.ssrLoadModule('/src/game/base.ts'),
    server.ssrLoadModule('/src/game/gear.ts'),
    server.ssrLoadModule('/src/game/factory.ts'),
    server.ssrLoadModule('/src/game/sub.ts'),
    server.ssrLoadModule('/src/world/pickups.ts'),
    server.ssrLoadModule('/src/game/creatures.ts'),
  ]);
  const MATS = state.MATERIAL_ORDER.filter((k) => k !== 'plate');

  // ---- Assumptions (all in one place) ----
  const SWIM = 200; // wu/s, the 230 top speed less turning, bag weight and climbing
  const SUB_SWIM = 330; // wu/s in KS-1, once built
  const SETTLE = 3; // s to stop and line up on each pickup, on top of its collect effort
  const BASE_X = 600; // the base and its storage, roughly
  const EXPLORE = { shallows: 8, kelp: 25, shelf: 30, trench: 35, sanctum: 15 }; // minutes of puzzles and finding the way, per zone
  const ZONES = ['shallows', 'kelp', 'shelf', 'trench'];
  const zoneOf = (x) => (x < 9900 ? 'shallows' : x < 17500 ? 'kelp' : x < 26700 ? 'shelf' : 'trench');

  // Wild pickup spots by zone, from the real placements.
  const spots = [];
  for (const k of MATS) for (const s of pick.Pickups.spotsOf(k)) spots.push({ k, x: s.x, z: zoneOf(s.x), takenAt: -1e9 });
  const regrow = (k) => state.regrowSeconds(k);
  const effort = (k) => pick.EFFORT[k]?.seconds ?? 2.5;

  // ---- The route: goals in order. 'zone' is reached when the goal before it is done. ----
  const piece = (k) => ({ type: 'piece', id: k, cost: base.PIECES[k].cost, secs: base.PIECES[k].buildTime });
  const research = (id) => ({ type: 'research', id, secs: gear.RESEARCH[id].seconds });
  const craft = (id) => ({ type: 'craft', id, cost: gear.GEAR[id].cost, secs: gear.GEAR[id].seconds ?? 60 });
  const route = [
    { zone: 'shallows', label: 'Repair KD-1', type: 'piece', id: 'drone', cost: state.DRONE_REPAIR_COST, secs: 5 },
    piece('dome'), piece('turbine'), piece('storage'), piece('corridor'), piece('lab'),
    research('light'), { queueZone: 'shallows' }, piece('press'),
    { label: 'Two CB-1 conveyors (store to press and back, about 3 cells each)', type: 'piece', id: 'belts', cost: { scrap: 4, copper: 2 }, secs: 8 },
    piece('corridor'), piece('workshop'), craft('light'),
    { label: 'A tank for the shallows creatures', ...piece('tank') },
    { creatures: ['ray', 'glowfin', 'puffcap'] },
    { zone: 'kelp', milestone: 'Dark east cliff open (dive light)' },
    research('cutter'), craft('cutter'), research('tow'), craft('tow'), research('hatch'), piece('hatch'),
    { creatures: ['crab', 'shrimp'] },
    { zone: 'shelf', milestone: 'Race crossed (grapple), kelp wall cut' },
    piece('dock'), { label: 'KS-1 submersible', type: 'piece', id: 'sub', cost: sub.SUB_COST, secs: sub.SUB_BUILD_TIME, sub: true },
    research('psuit'), craft('psuit'),
    { zone: 'trench', milestone: 'Corvina solved, PS-1 built: trench open' },
    { creatures: ['snail'] },
    research('psuit2'), craft('psuit2'), research('signal'), piece('signal'), research('resonator'),
    { breedFor: 8, bred: 2 },
    craft('resonator'),
    { milestone: 'Resonator built: the sanctum and first contact' },
  ];
  // Optional blueprints a keen player decodes and builds as they unlock (zone = where the last requirement is).
  const OPTIONAL = {
    shallows: ['satchel'],
    // Pacing (Nov 27, 2026): welder, relay, dash and visor moved to the shelf; recomp, habitat and sdome to the trench.
    kelp: ['sorter', 'flare'],
    shelf: ['welder', 'crane', 'sonar', 'boots', 'dart', 'rivet', 'booster', 'ballast', 'tractor', 'relay', 'dash', 'visor', 'thermal', 'revive', 'rivet2'],
    trench: ['plating', 'cowl', 'drill', 'recomp', 'habitat', 'sdome'],
  };
  const optionalCraft = new Set(['satchel', 'relay', 'welder', 'flare', 'visor', 'dash', 'sonar', 'boots', 'dart', 'rivet', 'rivet2', 'cowl']);
  const optionalPiece = { sorter: 'sorter', recomp: 'recomp', crane: 'crane', thermal: 'thermal', revive: 'revive' };

  // ---- State ----
  let t = 0;
  let zoneIdx = 0;
  const stored = Object.fromEntries(state.MATERIAL_ORDER.map((k) => [k, 0]));
  let plateMaking = 0; // press progress
  let plateTarget = 0; // plating the current goal needs: the press only runs while short of it
  let hasPress = false;
  let hasSub = false;
  let creaturesOwned = []; // { species, growUntil }
  const log = [];
  const unlocks = []; // { t, zone, id }
  let labFreeAt = 0;
  let workshopFreeAt = 0;
  let droneFreeAt = 0;
  const waits = {}; // material -> seconds spent waiting for regrow
  const zoneEnter = { shallows: 0 };
  let welder = 1;

  const reachable = () => ZONES.slice(0, zoneIdx + 1);
  const pressStep = (dt) => {
    if (!hasPress) return;
    // The press only runs when the store has 2 scrap + 1 copper to spare.
    if (stored.plate < plateTarget && stored.scrap >= 2 && stored.copper >= 1) {
      plateMaking += (factory.PRESS_RATE / 60) * dt;
      if (plateMaking >= 1) {
        plateMaking -= 1;
        stored.scrap -= 2;
        stored.copper -= 1;
        stored.plate++;
      }
    }
  };
  const creatureStep = (dt) => {
    for (const c of creaturesOwned) {
      if (t < c.growUntil) continue;
      const make = creatures.SPECIES[c.species].makes;
      c.acc = (c.acc ?? 0) + dt / creatures.MAKE_SECONDS;
      if (c.acc >= 1) {
        c.acc -= 1;
        stored[make]++;
      }
    }
  };
  const tick = (dt) => {
    t += dt;
    pressStep(dt);
    creatureStep(dt);
  };

  // A gathering trip: swim out to the zones that have what's missing, take what is present, come home.
  function gather(need) {
    const want = { ...need };
    const zones = reachable();
    const cand = spots.filter((s) => zones.includes(s.z) && (want[s.k] ?? 0) > 0);
    const ready = cand.filter((s) => t - s.takenAt >= regrow(s.k));
    if (!ready.length) {
      // Nothing to take yet: wait for the soonest regrow (the press and creatures keep working).
      const soon = Math.min(...cand.map((s) => s.takenAt + regrow(s.k) - t));
      const kinds = [...new Set(cand.map((s) => s.k))];
      const w = Math.max(1, Math.min(soon, 60));
      for (const k of kinds) waits[k] = (waits[k] ?? 0) + w / kinds.length;
      tick(w);
      return;
    }
    ready.sort((a, b) => Math.abs(a.x - BASE_X) - Math.abs(b.x - BASE_X));
    let kg = 0;
    let far = 0;
    let spent = 0;
    for (const s of ready) {
      if ((want[s.k] ?? 0) <= 0) continue;
      const w = state.MATERIALS[s.k].kg;
      if (kg + w > state.BAG_MAX_KG) continue;
      kg += w;
      want[s.k]--;
      s.takenAt = t + spent;
      stored[s.k]++;
      spent += effort(s.k) + SETTLE;
      far = Math.max(far, Math.abs(s.x - BASE_X));
    }
    const speed = hasSub && far > 9000 ? SUB_SWIM : SWIM;
    // Out to the furthest pickup and back, plus zig-zagging between pickups (a third extra).
    spent += ((far * 2) / speed) * 1.33 + 15; // + unloading
    tick(spent);
  }

  function pay(cost) {
    for (const [k, n] of Object.entries(cost)) stored[k] -= n;
  }
  function missing(cost) {
    const m = {};
    let plates = 0;
    for (const [k, n] of Object.entries(cost)) {
      if (k === 'plate') {
        if (stored.plate < n) plates = n - stored.plate;
      } else if (stored[k] < n) m[k] = n - stored[k];
    }
    // Plating is pressed from 2 scrap + 1 copper: gather those too, and wait for the press.
    if (plates) {
      m.scrap = (m.scrap ?? 0) + Math.max(0, plates * 2 - Math.max(0, stored.scrap - (cost.scrap ?? 0)));
      m.copper = (m.copper ?? 0) + Math.max(0, plates - Math.max(0, stored.copper - (cost.copper ?? 0)));
    }
    for (const k of Object.keys(m)) if (m[k] <= 0) delete m[k];
    return { m, plates };
  }
  function afford(cost) {
    plateTarget = cost.plate ?? 0;
    for (let guard = 0; guard < 20000; guard++) {
      const { m, plates } = missing(cost);
      if (!Object.keys(m).length && !plates) {
        plateTarget = 0;
        return;
      }
      if (Object.keys(m).length) gather(m);
      else {
        waits['press (plating)'] = (waits['press (plating)'] ?? 0) + 10;
        tick(10); // waiting on the press
      }
    }
    throw new Error('stuck affording ' + JSON.stringify(cost));
  }

  function doGoal(g) {
    if (g.zone && g.zone !== ZONES[zoneIdx]) {
      zoneIdx = ZONES.indexOf(g.zone);
      tick(EXPLORE[ZONES[zoneIdx - 1]] * 60);
      zoneEnter[g.zone] = t;
      if (!CRITICAL_ONLY) queueOptional(g.zone);
    }
    if (g.queueZone) {
      if (!CRITICAL_ONLY) queueOptional(g.queueZone);
      return;
    }
    if (g.milestone) {
      log.push({ t, what: `**${g.milestone}**` });
      return;
    }
    if (g.creatures) {
      for (const sp of g.creatures) for (let i = 0; i < 2; i++) creaturesOwned.push({ species: sp, growUntil: t + creatures.GROW_SECONDS });
      log.push({ t, what: `Catch 2 young each: ${g.creatures.join(', ')} (grown in ${Math.round(creatures.GROW_SECONDS / 60)} min)` });
      return;
    }
    if (g.breedFor) {
      // Breeding for new patterns: a pair lays every BREED_SECONDS, an egg hatches in HATCH_SECONDS, the young grow in GROW_SECONDS.
      // Two bred words, from pairs laying in parallel, need one full cycle; the 8 patterns come from the wild founders plus these.
      const cycle = creatures.BREED_SECONDS + creatures.HATCH_SECONDS + creatures.GROW_SECONDS;
      tick(cycle);
      log.push({ t, what: `Breed for ${g.bred} new patterns (${g.breedFor} in all): one lay, hatch and grow cycle, ${Math.round(cycle / 60)} min, then fragments 3 and 4 decode` });
      tick(300); // decoding fragments 3 and 4 at 150 s each
      return;
    }
    const start = t;
    if (g.type === 'research') {
      t = Math.max(t, labFreeAt);
      tick(g.secs);
      labFreeAt = t;
    } else {
      afford(g.cost);
      pay(g.cost);
      if (g.id === 'press') hasPress = true;
      if (g.sub) hasSub = true;
      if (g.id === 'welder') welder = 2;
      if (g.type === 'craft') {
        t = Math.max(t, workshopFreeAt);
        tick(g.secs);
        workshopFreeAt = t;
      } else {
        t = Math.max(t, droneFreeAt);
        tick(g.secs / welder);
        droneFreeAt = t;
      }
    }
    log.push({ t, what: `${g.label ?? `${g.type} ${g.id}`}`, took: t - start });
  }

  const optionalQueue = [];
  function queueOptional(zone) {
    for (const id of OPTIONAL[zone] ?? []) {
      if (unlocks.some((u) => u.id === id)) continue;
      unlocks.push({ t, zone, id });
      optionalQueue.push(id);
    }
  }
  // Optional work is done between critical goals: decode one, then build or craft it.
  // Crafts that need a material not found in any zone reached yet wait for a later zone.
  const deferred = [];
  const canSource = (cost) => Object.keys(cost).every((k) => k === 'plate' || spots.some((sp) => sp.k === k && reachable().includes(sp.z)));
  function doOptional() {
    for (const g of deferred.splice(0)) {
      if (canSource(g.cost)) doGoal(g);
      else deferred.push(g);
    }
    while (optionalQueue.length) {
      const id = optionalQueue.shift();
      doGoal({ type: 'research', id, secs: gear.RESEARCH[id].seconds, label: `(optional) decode ${id}` });
      const g = optionalCraft.has(id) ? { ...craft(id), label: `(optional) craft ${id}` } : optionalPiece[id] ? { ...piece(optionalPiece[id]), label: `(optional) build ${id}` } : null;
      if (!g) continue;
      if (canSource(g.cost)) doGoal(g);
      else deferred.push(g);
    }
  }

  for (const g of route) {
    doGoal(g);
    if (!CRITICAL_ONLY && g.zone && !g.milestone) doOptional();
    if (!CRITICAL_ONLY && (g.milestone || g.queueZone)) doOptional();
  }

  // ---- Report ----
  const mm = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  console.log(`\n## Pacing model: ${CRITICAL_ONLY ? 'critical path only' : 'critical path plus optional blueprints as they unlock'}\n`);
  console.log('| Time (h:mm) | Step |');
  console.log('| --- | --- |');
  for (const e of log) console.log(`| ${Math.floor(e.t / 3600)}:${String(Math.floor((e.t % 3600) / 60)).padStart(2, '0')} | ${e.what}${e.took > 90 ? ` (${mm(e.took)})` : ''} |`);
  console.log('\nZone reached at (h:mm):', Object.entries(zoneEnter).map(([z, s]) => `${z} ${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`).join(' · '));
  console.log('Minutes spent waiting for pickups to regrow, by material:', Object.entries(waits).map(([k, s]) => `${k} ${Math.round(s / 60)}`).join(' · '));
  if (!CRITICAL_ONLY) {
    console.log('\nBlueprints that become decodable, by zone:');
    for (const z of ZONES) {
      const ids = unlocks.filter((u) => u.zone === z).map((u) => u.id);
      const secs = ids.reduce((a, id) => a + gear.RESEARCH[id].seconds, 0);
      console.log(`- ${z}: ${ids.length} optional (${ids.join(', ')}), ${mm(secs)} of Lab time`);
    }
  }
} finally {
  await server.close();
}
