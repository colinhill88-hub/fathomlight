import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' });

try {
  const [terrain, state, { BaseLayout }, care, discovery] = await Promise.all([
    server.ssrLoadModule('/src/world/terrain.ts'),
    server.ssrLoadModule('/src/game/state.ts'),
    server.ssrLoadModule('/src/game/base.ts'),
    server.ssrLoadModule('/src/game/creatures.ts'),
    server.ssrLoadModule('/src/game/discovery.ts'),
  ]);
  const { buildBaseLevel } = await server.ssrLoadModule('/src/interior/baselevel.ts');

  const lock = terrain.SANCTUM.locks[0];
  assert.equal(terrain.isSolid(lock.x + 70, lock.y), false, 'The tunnel beneath Fulmar must be traversable');
  assert.equal(terrain.isSolid(lock.x, lock.y), true, 'The song-lock itself remains solid until it opens');
  terrain.sanctum.locks[0] = true;
  assert.equal(terrain.isSolid(lock.x, lock.y), false);
  assert.equal(terrain.isSolid(terrain.FULMAR_HATCH.x, terrain.FULMAR_HATCH.y + 20), true, 'Fulmar remains solid at deck depth');

  const save = state.freshSave(0, 0);
  assert.match(discovery.creatureSiteHint(save, 'snail'), /Scan it/);
  save.scans.push('chimney');
  assert.match(discovery.creatureSiteHint(save, 'snail'), /feeding trails/);
  save.tips.push('site:snail:seen', 'site:snail:return');
  assert.match(discovery.creatureSiteHint(save, 'snail'), /lumen moss/);
  save.cleftOpen = true;
  assert.match(discovery.discoveryNotes(save).join(' '), /Fulmar cargo pod/);

  save.wildCaught.crab = 2;
  save.dormant.crab = 2;
  assert.equal(care.wildAllowed(save, 'crab'), true, 'Dormancy cannot lock the player out of founding a pair');
  save.jar = { species: 'crab', stage: 'young' };
  assert.equal(care.wildAllowed(save, 'crab'), true);
  save.jar2 = { species: 'crab', stage: 'young' };
  assert.equal(care.wildAllowed(save, 'crab'), false, 'The satchel counts towards the founding pair');

  const habitat = state.freshSave(0, 0);
  const layout = new BaseLayout([{ id: 1, kind: 'tank', gx: 0, gy: 0, rot: 0 }]);
  layout.powered.add(1);
  habitat.tankData[1] = { water: 1, plant: 'lumen' };
  const snail = care.newCreature(habitat, 'snail', 'young', 1);
  snail.fed = 1;
  for (let second = 0; second < 580; second++) care.tickCare(habitat, layout, 1);
  assert.equal(snail.stage, 'grown', 'A prepared solitary habitat supports a full growth cycle between visits');

  // A Grand tank is one tall aquarium in living bases: no mezzanine or ladder implies an upper deck.
  const grand = new BaseLayout([
    { id: 1, kind: 'dome', gx: 24, gy: 3, rot: 0 },
    { id: 2, kind: 'turbine', gx: 26, gy: 3, rot: 0 },
    { id: 3, kind: 'corridor', gx: 27, gy: 3, rot: 0 },
    { id: 4, kind: 'gtank', gx: 28, gy: 3, rot: 0 },
  ]);
  const roomTiles = (level) => {
    const r = level.rooms.find((q) => q.kind === 'gtank');
    return level.map.slice(r.ty0 + 1, r.ty0 + r.th - 1).map((row) => row.slice(r.tx0 + 1, r.tx0 + r.tw - 1)).join('');
  };
  assert.doesNotMatch(roomTiles(buildBaseLevel(grand, true)), /[=H]/, 'A living Grand tank has a single floor');
  assert.match(roomTiles(buildBaseLevel(grand, false)), /=/, 'The original comparison path keeps its mezzanine');
  // ---- Phase 13 ----
  const bindings = await server.ssrLoadModule('/src/controls/bindings.ts');
  const { helperRows } = await server.ssrLoadModule('/src/ui/controlHelper.ts');
  const lodes = await server.ssrLoadModule('/src/game/lodes.ts');

  // The helper reads the real bindings, and follows a remap.
  assert.equal(bindings.isKey('collect', 'c'), true);
  assert.equal(bindings.isKey('lamp', 'f'), true, 'F is the lamp, not interact');
  const ctx = (over) => ({ mode: 'swim', device: 'keyboard', collect: null, scan: null, board: null, build: false, tend: false, dock: false, lab: false, flare: false, dart: false, haul: false, sonar: false, lights: true, brace: false, ladder: false, zoom: true, moving: false, ...over });
  const ids = (c) => helperRows(c).map((r) => r.id);
  assert.deepEqual(ids(ctx({})).slice(0, 4), ['move', 'boost', 'scan', 'lamp'], 'Swimming shows movement first');
  const sub = helperRows(ctx({ mode: 'sub', collect: { label: 'Drill the trench ledge lode', tap: false }, board: 'Exit', lights: false }));
  assert.equal(sub[0].label, 'Drill the trench ledge lode', 'World offers come first');
  assert.equal(sub[0].hold, true);
  assert.ok(sub.some((r) => r.label === 'Exit KS-1'));
  assert.ok(!sub.some((r) => r.id === 'lamp'), 'No floodlights row without the module');
  assert.ok(ids(ctx({ mode: 'foot', ladder: true })).includes('ladder'), 'A ladder in reach offers Climb');
  assert.deepEqual(ids(ctx({ mode: 'swing' })), ['pump', 'reel', 'let', 'zoom']);
  assert.ok(ids(ctx({ mode: 'build' })).includes('bplace'));
  assert.ok(!ids(ctx({ device: 'gamepad', build: true })).includes('build'), 'Actions without a pad button are not shown on a pad');
  assert.ok(!ids(ctx({ device: 'gamepad' })).includes('zoom'));
  bindings.setKeys('collect', ['g']);
  assert.equal(bindings.isKey('collect', 'g'), true);
  assert.equal(bindings.isKey('collect', 'c'), false);
  bindings.resetBindings();
  assert.equal(bindings.isKey('collect', 'c'), true);

  // The drill nose: lodes yield, reseal, and sit in sub-reachable water away from creature gates.
  const ls = state.freshSave(0, 0);
  assert.equal(lodes.LODES.length, 5);
  for (const l of lodes.LODES) {
    const y = lodes.lodeY(l);
    assert.equal(terrain.isSolid(l.x, y + 12), true, `${l.id} sits on rock`);
    assert.equal(terrain.isSolid(l.x, y - 90), false, `${l.id} has open water above for KS-1`);
    assert.ok(Math.abs(l.x - terrain.CLEFT.x) > 600 && Math.abs(l.x - terrain.SEAM.x) > 600, `${l.id} stays clear of the cleft and the seam`);
    assert.equal(lodes.lodeAt(l.x, y - 90), l, `${l.id} is found from the sub's bow`);
    assert.equal(lodes.lodeWait(ls, l), 0);
  }
  ls.playSeconds = 100;
  ls.lodes = { 'lode-trench': 100 };
  const trench = lodes.LODES.find((l) => l.id === 'lode-trench');
  assert.equal(lodes.lodeWait(ls, trench), lodes.LODE_REGROW);
  ls.playSeconds += lodes.LODE_REGROW;
  assert.equal(lodes.lodeWait(ls, trench), 0, 'A drilled lode reseals and can be drilled again');
  assert.equal(lodes.lodeFirst(ls, trench), true);
  ls.lodeNotes = ['lode-trench'];
  assert.equal(lodes.lodeFirst(ls, trench), false);
  assert.ok(lodes.LODES.some((l) => l.yield.ore), 'The drill gives a repeatable vent ore source');

  // Lode fields load from old saves without them.
  assert.match(discovery.discoveryNotes({ ...state.freshSave(0, 0), scans: ['lode'] }).join(' '), /Mineral lodes/);

  // Creature names are stable and survive the jar (the id is kept).
  const named = care.newCreature(habitat, 'glowfin', 'young', 1);
  assert.equal(care.creatureName(named), care.creatureName({ id: named.id, species: 'glowfin' }));
  assert.match(care.creatureName(named), /^[A-Z][a-z]+$/);
  // Phase 15: releasing from the jar. A wild catch gives its place back; the satchel's newer catch goes first.
  const rel = state.freshSave(0, 0);
  // The wild limit is reached and a living pair exists: one in a tank, one just caught by mistake.
  rel.wildCaught.ray = care.WILD_CAP;
  rel.creatures.push(care.newCreature(rel, 'ray', 'young', 1));
  rel.jar = { species: 'glowfin', stage: 'young' };
  rel.jar2 = { species: 'ray', stage: 'young' };
  assert.equal(care.wildAllowed(rel, 'ray'), false);
  assert.equal(care.releaseFromJar(rel).species, 'ray', 'The newest catch (the satchel) is released first');
  assert.equal(rel.jar2, null);
  assert.equal(rel.jar.species, 'glowfin');
  assert.equal(rel.wildCaught.ray, care.WILD_CAP - 1, 'A released wild catch stops counting against the wild limit');
  assert.equal(care.wildAllowed(rel, 'ray'), true, 'After a release the right one can be caught');
  rel.wildCaught.glowfin = 0;
  care.releaseFromJar(rel);
  assert.equal(rel.jar, null);
  assert.equal(rel.wildCaught.glowfin, 0, 'The count never goes below zero');
  assert.equal(care.releaseFromJar(rel), null, 'An empty jar releases nothing');
  const keepSave = state.freshSave(0, 0);
  keepSave.wildCaught.crab = 2;
  const kept = care.newCreature(keepSave, 'crab', 'young', 1);
  keepSave.jar = { species: 'crab', stage: 'young', keep: kept };
  care.releaseFromJar(keepSave);
  assert.equal(keepSave.wildCaught.crab, 2, 'A named tank creature is not a wild catch');
  const { helperRows: rows15 } = await server.ssrLoadModule('/src/ui/controlHelper.ts');
  const base15 = { mode: 'swim', device: 'keyboard', collect: null, scan: null, board: null, build: false, tend: false, dock: false, lab: false, flare: false, dart: false, haul: false, sonar: false, lights: true, brace: false, ladder: false, zoom: true, moving: false };
  assert.ok(rows15({ ...base15, release: 'the glowfin fry' }).some((r) => r.id === 'release:the glowfin fry' && r.label === 'Release the glowfin fry'));
  assert.ok(!rows15(base15).some((r) => r.id.startsWith('release')), 'No release offer with an empty jar');
  assert.ok(rows15(base15).some((r) => r.id === 'kit'), 'The Field kit is listed while swimming');

  console.log('Progression checks passed.');
} finally {
  await server.close();
}
