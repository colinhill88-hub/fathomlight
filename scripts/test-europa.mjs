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
