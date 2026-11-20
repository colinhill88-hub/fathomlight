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
  console.log('Progression checks passed.');
} finally {
  await server.close();
}
