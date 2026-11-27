/**
 * Beyond Earth (Nov 27, 2026): Node checks for Europa's rules (src/game/europa.ts) and shape
 * (src/world/europaTerrain.ts). Run from scripts/test-progression.mjs, or on its own:
 *   node scripts/test-europa.mjs
 */
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

export async function runEuropaChecks(server) {
  const [state, E, T, terrain] = await Promise.all([
    server.ssrLoadModule('/src/game/state.ts'),
    server.ssrLoadModule('/src/game/europa.ts'),
    server.ssrLoadModule('/src/world/europaTerrain.ts'),
    server.ssrLoadModule('/src/world/terrain.ts'),
  ]);
  const fresh = () => {
    const s = state.freshSave(0, 0);
    s.sanctum.contact = true;
    s.petrel = { done: 5, parts: 0, progress: 0 };
    return s;
  };

  // The shape: open water between the ice and the seabed everywhere a diver can be, walls at both ends.
  for (let x = 200; x < T.ICE_WALL_X - 300; x += 50) assert.ok(T.floorY(x) - T.ceilY(x) > 120, `Room to swim at x ${x}`);
  assert.ok(T.europaSolid(30, 600) && T.europaSolid(T.EUROPA_W - 30, 600), 'Walls at both ends');
  const sp = T.habSpawn();
  assert.ok(!T.europaSolid(sp.x, sp.y), 'Kestrel comes out of the hab into open water');
  assert.ok(T.habAir(T.LANDER.x, T.ceilY(T.LANDER.x) + 150), 'There is air under the hab');
  for (const s of E.EUROPA_SPOTS) assert.ok(!T.europaSolid(s.x, s.y + (s.kind === 'rime' ? 8 : -6)), `${s.id} can be reached`);
  for (const g of E.GLYPHS) assert.ok(!T.europaSolid(g.x, g.y), `Glyph ${g.id} is in open water`);

  // The solidity hook: while set, isSolid() is Europa's; cleared, Earth's again.
  const earthAt = terrain.isSolid(sp.x, sp.y);
  terrain.setSolidOverride(T.europaSolid);
  assert.equal(terrain.isSolid(sp.x, sp.y), false);
  assert.equal(terrain.isSolid(30, 600), true);
  terrain.setSolidOverride(null);
  assert.equal(terrain.isSolid(sp.x, sp.y), earthAt, 'Earth terrain is untouched once the hook is cleared');

  // Launch needs the whole ship.
  {
    const s = fresh();
    assert.ok(E.canLaunch(s));
    s.petrel.done = 4;
    assert.ok(!E.canLaunch(s), 'No launch before the ship is whole');
  }

  // Arriving, gathering (regrow), glyphs, building, and the trip home.
  {
    const s = fresh();
    assert.equal(E.arrive(s), true, 'First arrival');
    assert.equal(E.arrive(s), false, 'Not the first any more');
    assert.ok(s.europa.here && s.europa.scans.includes('eu_ice'));
    const brine = E.EUROPA_SPOTS.find((q) => q.kind === 'brine');
    assert.ok(E.takeSpot(s, brine));
    assert.ok(!E.takeSpot(s, brine), 'A taken spot is gone…');
    s.playSeconds += E.EUROPA_REGROW;
    assert.ok(E.takeSpot(s, brine), '…until it grows back');
    assert.equal(s.europa.stores.brine, 2);

    assert.match(E.startModule(s, 'still'), /glyph/, 'Pieces must be learned from a glyph first');
    assert.ok(E.readGlyph(s, E.GLYPHS.find((g) => g.id === 'still')));
    assert.ok(s.europa.learned.includes('still'));
    assert.match(E.startModule(s, 'still'), /Still needs/);
    s.europa.stores = { rime: 10, brine: 10, frond: 10 };
    assert.equal(E.startModule(s, 'still'), null);
    assert.match(E.startModule(s, 'still'), /welding/);
    let done = null;
    for (let i = 0; i < 100 && !done; i++) done = E.tickEuropa(s, 1);
    assert.equal(done, 'still');
    assert.deepEqual(E.fuelCost(s), E.FUEL_COST_STILL, 'The still halves the fuel');

    const before = { ...s.europa.stores };
    assert.equal(E.flyHome(s), null);
    assert.equal(s.europa.here, false);
    assert.equal(s.europa.stores.brine, before.brine - E.FUEL_COST_STILL.brine, 'The trip home costs Europa brine');
    assert.ok(E.canLaunch(s), 'Flying back out is free');
  }

  // Never stranded: one sweep of the spots near the hab pays for the trip home (before the still).
  {
    const near = E.EUROPA_SPOTS.filter((q) => Math.abs(q.x - T.LANDER.x) < 3500);
    const have = { rime: 0, brine: 0, frond: 0 };
    for (const q of near) have[q.kind]++;
    for (const [k, n] of Object.entries(E.FUEL_COST)) assert.ok(have[k] >= n, `Enough ${k} near the hab for the fuel home`);
  }

  // Saves: Europa survives a save and load, and malformed fields are dropped.
  {
    const s = fresh();
    E.arrive(s);
    s.europa.stores.rime = 4;
    s.europa.built = ['bell', 'nonsense'];
    const store = new Map();
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
    store.set('fathomlight.save.v1', JSON.stringify(s));
    const loaded = state.loadSave(0, 0).data;
    assert.equal(loaded.europa.here, true);
    assert.equal(loaded.europa.stores.rime, 4);
    assert.deepEqual(loaded.europa.built, ['bell'], 'Unknown pieces are dropped');
    delete s.europa;
    store.set('fathomlight.save.v1', JSON.stringify(s));
    assert.equal(state.loadSave(0, 0).data.europa, undefined, 'Saves that never went load as before');
    delete globalThis.localStorage;
  }

  // The floe ray: befriended with fronds, its gear unlocked one piece at a time.
  {
    const s = fresh();
    E.arrive(s);
    assert.equal(E.offerFrond(s), 'no-frond', 'It wants frost fronds');
    s.europa.stores.frond = 10;
    for (let i = 1; i < E.RAY_TRUST; i++) assert.equal(E.offerFrond(s), 'trusting');
    assert.equal(E.offerFrond(s), 'trusts');
    assert.ok(E.rayTrusts(s));
    assert.deepEqual(s.europa.ray.learned, ['saddle'], 'Only the saddle unlocks with trust');
    assert.match(E.startGear(s, 'bladder'), /Not learned/, 'The bladder needs its glyph');
    E.readGlyph(s, E.GLYPHS.find((g) => g.id === 'bladder'));
    assert.ok(s.europa.ray.learned.includes('bladder'));
    assert.ok(!s.europa.ray.learned.includes('crest') && !s.europa.ray.learned.includes('gland'), 'The crest and gland wait for their own glyphs');
    s.europa.stores = { rime: 20, brine: 20, frond: 20 };
    assert.equal(E.startGear(s, 'saddle'), null);
    assert.match(E.startGear(s, 'bladder'), /vat/, 'One thing grows at a time');
    let got = null;
    for (let i = 0; i < 100 && !got; i++) got = E.tickRayGear(s, 1);
    assert.equal(got, 'saddle');
    assert.ok(E.hasRayGear(s, 'saddle'));
    // The passage: only a ridden ray with an air bladder crosses.
    s.europa.ray.riding = true;
    assert.ok(!E.canCrossPassage(s));
    assert.equal(E.startGear(s, 'bladder'), null);
    for (let i = 0; i < 100 && !E.hasRayGear(s, 'bladder'); i++) E.tickRayGear(s, 1);
    assert.ok(E.canCrossPassage(s));
    // The crest breaks the skylight and thin floes; nothing breaks without it.
    assert.equal(E.breakIce(s, 'skylight'), false, 'No crest, no breaking');
    E.readGlyph(s, E.GLYPHS.find((g) => g.id === 'crest'));
    assert.equal(E.startGear(s, 'crest'), null);
    for (let i = 0; i < 100 && !E.hasRayGear(s, 'crest'); i++) E.tickRayGear(s, 1);
    assert.equal(E.breakIce(s, 'skylight'), true);
    assert.equal(E.breakIce(s, 'skylight'), false, 'Only once');
    assert.equal(E.breakIce(s, 'thin-a'), true);
    T.setEuropaBroken(true, ['thin-a']);
    assert.equal(T.ceilY(T.SKYLIGHT.x), T.OPEN, 'The skylight opens to the surface');
    assert.ok(T.openToSky(T.FLOES.find((f) => f.id === 'thin-a').x), 'A broken floe is open water');
    T.setEuropaBroken(false, []);
    // Saves keep the ray (never riding on load).
    const store = new Map();
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
    store.set('fathomlight.save.v1', JSON.stringify(s));
    const loaded = state.loadSave(0, 0).data;
    assert.equal(loaded.europa.ray.trust, E.RAY_TRUST);
    assert.deepEqual(loaded.europa.ray.gear, ['saddle', 'bladder', 'crest']);
    assert.equal(loaded.europa.ray.riding, false);
    assert.equal(loaded.europa.skylight, true);
    delete globalThis.localStorage;
  }

  // The floe field and the passage: open to the sky between floes, solid floes, a roofed passage.
  {
    const mid = (T.PASSAGE.x0 + T.PASSAGE.x1) / 2;
    assert.ok(T.inPassage(mid));
    assert.ok(!T.europaSolid(mid, (T.PASSAGE.roof + T.PASSAGE.floor) / 2), 'The passage is open water');
    assert.ok(T.europaSolid(mid, 600), 'with ice above it');
    const f = T.FLOES.find((q) => !q.thin);
    assert.ok(T.europaSolid(f.x, 20), 'Floes are solid');
    const lead = (T.FLOES[0].x + T.FLOES[0].w / 2 + T.FLOES[1].x - T.FLOES[1].w / 2) / 2;
    assert.ok(T.openToSky(lead) && !T.europaSolid(lead, 40), 'A lead between floes reaches the surface');
    for (const g of E.GLYPHS) assert.ok(!T.europaSolid(g.x, g.y), `Glyph ${g.id} is reachable`);
  }

  // Biome 3: the warm deep's shape, and the kin.
  {
    const mid = (T.ABYSS.x0 + T.ABYSS.x1) / 2;
    for (const y of [1200, 2700, 3800]) assert.ok(!T.europaSolid(mid, y), `The abyss is open water at y ${y}`);
    assert.ok(T.inBlackWater(mid, 2700) && !T.inBlackWater(mid, 3800), 'Black water halfway down, warm water below');
    assert.ok(T.inWarmDeep(T.HEARTH.x, T.HEARTH.y));
    assert.ok(!T.europaSolid(T.HEARTH.x, T.HEARTH.y - 80), 'Kestrel can reach the hearth');
    for (const v of T.DEAD_VENTS) assert.ok(!T.europaSolid(v.x, T.floorY(v.x) - 180), `Vent ${v.id} can be reached`);

    const s = fresh();
    E.arrive(s);
    s.europa.stores = { rime: 30, brine: 30, frond: 30 };
    assert.match(E.ventNeeds(s, 'v1'), /song/, 'The song comes first');
    assert.match(E.makeCore(s), /kin/);
    assert.equal(E.meetKin(s), true);
    assert.equal(E.meetKin(s), false, 'Once');
    assert.match(E.makeCore(s), /still/, 'Cores need the Brine still');
    s.europa.built.push('still');
    assert.equal(E.makeCore(s), null);
    assert.equal(E.makeCore(s), null);
    assert.equal(E.makeCore(s), null);
    assert.equal(s.europa.kin.cores, 3);
    assert.equal(E.ventNeeds(s, 'v1'), null, 'The near vent takes only a core');
    assert.ok(E.rekindle(s, 'v1'));
    assert.ok(!E.rekindle(s, 'v1'), 'Once');
    s.bag.ore = 2;
    assert.match(E.ventNeeds(s, 'v2'), /Earth/, 'The far vents need Earth’s vent ore');
    s.bag.ore = 2 * E.EARTH_ORE_PER_VENT;
    assert.ok(E.rekindle(s, 'v2') && E.rekindle(s, 'v3'));
    assert.equal(s.bag.ore, 0, 'The ore comes out of the dive bag');
    assert.ok(E.kinRestored(s));
    assert.equal(E.kinLight(s), 1);
    // Saves keep the kin.
    const store = new Map();
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
    store.set('fathomlight.save.v1', JSON.stringify(s));
    const loaded = state.loadSave(0, 0).data;
    assert.deepEqual(loaded.europa.kin, { met: true, vents: ['v1', 'v2', 'v3'], cores: 0 });
    delete globalThis.localStorage;
    assert.equal(E.linneaEuropa(s).length, 2);
  }

  // Linnea always has something to say.
  {
    const s = fresh();
    E.arrive(s);
    assert.equal(E.linneaEuropa(s).length, 2);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' });
  try {
    await runEuropaChecks(server);
    console.log('Europa checks passed.');
  } finally {
    await server.close();
  }
}
