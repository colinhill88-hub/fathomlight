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
  // Phase 16: every creature id has a real name (half of them used to read "undefined").
  for (let id = 1; id <= 400; id++)
    for (const sp of ['glowfin', 'ray', 'crab', 'snail']) assert.match(care.creatureName({ id, species: sp }), /^[A-Z][a-z]+$/, `creature ${id} (${sp}) has a name`);

  // Phase 16: the satchel's second slot works indoors too (Habitat console, Hatchery, Revival pool).
  const sj = state.freshSave(0, 0);
  sj.kit.jar = true;
  assert.equal(care.jarRoom(sj), 'jar');
  assert.ok(care.putInJar(sj, { species: 'crab', stage: 'young' }));
  assert.equal(care.jarRoom(sj), null, 'Without the satchel one creature fills the jar');
  assert.equal(care.putInJar(sj, { species: 'ray', stage: 'young' }), false, 'A second creature is refused without the satchel');
  assert.equal(sj.jar2 ?? null, null);
  sj.gear.push('satchel');
  assert.equal(care.jarRoom(sj), 'jar2', 'With the satchel there is room for a second creature');
  assert.ok(care.putInJar(sj, { species: 'ray', stage: 'young' }));
  assert.equal(care.jarRoom(sj), null, 'Both slots full');
  assert.equal(care.takeFromJar(sj).species, 'crab', 'Depositing takes the first catch');
  assert.equal(sj.jar.species, 'ray', 'The satchel creature moves up at once');
  assert.equal(sj.jar2, null);
  assert.equal(care.jarRoom(sj), 'jar2', 'The freed space is offered again');
  assert.equal(care.takeFromJar(sj).species, 'ray');
  assert.equal(care.takeFromJar(sj), null);
  const noJar = state.freshSave(0, 0);
  noJar.gear.push('satchel');
  assert.equal(care.jarRoom(noJar), null, 'No jar, no room, satchel or not');

  const { helperRows: rows15 } = await server.ssrLoadModule('/src/ui/controlHelper.ts');
  const base15 = { mode: 'swim', device: 'keyboard', collect: null, scan: null, board: null, build: false, tend: false, dock: false, lab: false, flare: false, dart: false, haul: false, sonar: false, lights: true, brace: false, ladder: false, zoom: true, moving: false };
  assert.ok(rows15({ ...base15, release: 'the glowfin fry' }).some((r) => r.id === 'release:the glowfin fry' && r.label === 'Release the glowfin fry'));
  assert.ok(!rows15(base15).some((r) => r.id.startsWith('release')), 'No release offer with an empty jar');
  assert.ok(rows15(base15).some((r) => r.id === 'kit'), 'The Field kit is listed while swimming');

  // Phase 17b: the mag-boots' walking mode (src/game/magboots.ts).
  {
    const mb = await server.ssrLoadModule('/src/game/magboots.ts');
    const { MAG, magStep, magClamp } = mb;
    // A flat floor at y = 1000 with a ledge (floor drops to 1200) from x = 600, a wall from x = 900, a 10-unit step at x = 300.
    const floorAt = (x) => (x >= 900 ? -1e9 : x >= 600 ? 1200 : x >= 300 ? 990 : 1000);
    const solid = (x, y) => y >= floorAt(x);
    const run = (b, moveX, sec, hopAt = -1) => {
      const ev = { landed: 0, hops: 0, blocked: false };
      for (let t = 0, i = 0; t < sec; t += 1 / 60, i++) {
        const r = magStep(b, moveX, i === hopAt, 1 / 60, solid);
        if (r.landed) ev.landed = Math.max(ev.landed, r.landed);
        if (r.hopped) ev.hops++;
        if (r.blocked) ev.blocked = true;
      }
      return ev;
    };
    // Clamping on never moves her; hanging in the water, she then sinks slowly to the floor.
    const b = { x: 100, y: 700, vx: 40, vy: -30, onFloor: false };
    magClamp(b, solid);
    assert.equal(b.x, 100);
    assert.equal(b.y, 700, 'Clamping on keeps the position');
    assert.equal(b.vy, 0, 'No upward fling from the swim');
    let ev = run(b, 0, 0.5);
    assert.ok(b.vy <= MAG.sink && b.y < 1000 - MAG.foot, 'Sinks no faster than the slow sink');
    ev = run(b, 0, 3);
    assert.ok(b.onFloor && Math.abs(b.y + MAG.foot - 1000) < 1.5, 'Lands with the soles on the floor');
    assert.ok(ev.landed > 0.9, 'A long sink lands with a full thud');
    // Walking is slower than swimming (230) and goes up a small step.
    const x0 = b.x;
    run(b, 1, 2);
    assert.ok(b.x - x0 > MAG.walk * 1.5 && b.x - x0 < MAG.walk * 2.05, 'Walks at the boots pace');
    assert.ok(MAG.walk < 230 * 0.5, 'Walking is well under swimming speed');
    run(b, 1, 1);
    assert.ok(b.x > 300 && b.onFloor && Math.abs(b.y + MAG.foot - 990) < 1.5, 'Walks up a small step onto it');
    // The hop is short and heavy, and lands again.
    const yStand = b.y;
    let top = b.y;
    for (let i = 0; i < 90; i++) {
      magStep(b, 0, i === 0, 1 / 60, solid);
      top = Math.min(top, b.y);
    }
    assert.ok(yStand - top > 35 && yStand - top < 70, 'A heavy hop of about half a body');
    assert.ok(b.onFloor, 'Back on the floor after the hop');
    // Walking off the ledge sinks slowly (boots still on) and lands with a thud below.
    b.x = 580;
    const off = run(b, 1, 0.4);
    assert.ok(!b.onFloor && b.vy > 0 && b.vy <= MAG.sink, 'Walking off an edge sinks slowly');
    const land = run(b, 0, 3);
    assert.ok(b.onFloor && Math.abs(b.y + MAG.foot - 1200) < 1.5 && land.landed > 0.9, 'Lands heavily on the lower floor');
    // A wall stops her.
    const w = run(b, 1, 6);
    assert.ok(w.blocked && b.x < 900 - MAG.half + 1, 'Stopped by a wall');
    void off;
    // Against the real terrain: walking across the Wreck Shelf race floor keeps the soles on the seabed.
    const rb = { x: 19760, y: terrain.groundY(19760) - MAG.foot - 2, vx: 0, vy: 0, onFloor: false };
    magClamp(rb, terrain.isSolid);
    for (let i = 0; i < 60 * 8; i++) magStep(rb, 1, false, 1 / 60, terrain.isSolid);
    assert.ok(rb.x > 19760 + MAG.walk * 6, 'Walks east across the race floor (currents play no part in the rule)');
    assert.ok(rb.onFloor && Math.abs(rb.y + MAG.foot - terrain.groundY(rb.x)) < 4, 'The soles stay on the race floor');
  }
  const bootRows = (over) => rows15({ ...base15, ...over }).map((r) => r.id);
  assert.ok(bootRows({ boots: 'offer' }).includes('boots'), 'Near the seabed the bar offers to clamp the boots');
  assert.ok(bootRows({ boots: 'own' }).includes('boots'), 'Owned boots are listed while swimming');
  assert.ok(!bootRows({}).includes('boots'), 'No boots row before the boots are built');
  assert.deepEqual(bootRows({ mode: 'boots' }).slice(0, 3), ['unclamp', 'walk', 'hop'], 'Clamped: let go, walk and hop come first');

  // Phase 18: Linnea's spot and hint follow the real progression (src/game/linnea.ts).
  {
    const L = await server.ssrLoadModule('/src/game/linnea.ts');
    const { linneaPlan, LINNEA_SPOTS, LINNEA_ORDER, LINNEA_TALK_RANGE, linneaGreeting, markLinneaMet } = L;
    // Kestrel has been near x (the zone map's record, one character per 250 units).
    const markSeen = (s, x) => {
      const c = Math.floor((x - terrain.WORLD_X0) / 250);
      s.mapSeen = s.mapSeen.padEnd(c + 1, '0');
      s.mapSeen = s.mapSeen.slice(0, c) + '1' + s.mapSeen.slice(c + 1);
    };
    const g = state.freshSave(0, 0);
    const spots = [];
    const step = (expectSpot, expectHint, why) => {
      const p = linneaPlan(g);
      assert.equal(p.spot, expectSpot, why);
      if (expectHint) assert.equal(p.hint, expectHint, why);
      assert.ok(p.lines.length >= 1 && p.lines.length <= 2, 'One or two lines');
      for (const line of p.lines) assert.ok(line.length <= 120, `Lines stay short: ${line}`);
      if (spots[spots.length - 1] !== p.spot) spots.push(p.spot);
    };
    step('cliff', 'cliff-sled', 'A new save: at the dark east cliff, hinting at the sled recorder');
    g.finds.push('recorder');
    step('cliff', 'cliff-lab', 'Carrying the recorder: the Lab');
    g.finds = [];
    g.blueprints.push('light');
    step('cliff', 'cliff-build', 'Decoded: the Workshop');
    g.gear.push('light');
    step('forest', 'forest-east', 'With the dive light she waits on the kelp side');
    g.sub = { aboard: false };
    step('forest', 'forest-boom', 'With KS-1 and the boom shut, she mentions its winch');
    g.boomOpen = true;
    step('forest', 'forest-east');
    markSeen(g, 14975);
    step('caves', 'caves-moss', 'Once the caves have been seen she waits outside them, hinting at the moss brackets');
    g.brackets = [true, true, true, true];
    step('caves', 'caves-cache');
    g.finds.push('cache');
    step('caves', 'caves-cutter');
    g.gear.push('cutter');
    step('caves', 'caves-rope');
    g.finds.push('towcoil');
    step('caves', 'caves-line');
    g.gear.push('tow');
    step('shelf', 'shelf-vane', 'With the grapple: the race (and, with a sub, the vane)');
    g.vane = true;
    step('shelf', 'shelf-race');
    markSeen(g, 25900);
    step('corvina', 'corvina-hatch', 'At the Corvina: the welded deck hatch');
    g.corvina.hatch = true;
    step('corvina', 'corvina-power');
    g.corvina.breakers = [true, true];
    step('corvina', 'corvina-hold');
    g.finds.push('suitplans');
    step('corvina', 'corvina-suit');
    g.gear.push('psuit');
    step('rim', 'rim-chimney', 'PS-1: the trench rim and the snail chimney');
    g.jar = { species: 'snail', stage: 'grown' };
    step('rim', 'rim-snail-ready', 'A grown snail in the jar changes her line');
    g.cleftOpen = true;
    step('fulmar', 'fulmar-deep', 'Cleft open, no PS-2 yet');
    g.gear.push('psuit2');
    step('fulmar', 'fulmar-hatch');
    g.fulmar.open = true;
    step('fulmar', 'fulmar-power');
    g.fulmar.breakers = [true, true, true];
    step('fulmar', 'fulmar-spools');
    g.finds.push('resonplans');
    step('sanctum', 'sanctum-array', 'Resonator plans found: the door, and the array');
    g.signals.decoded = ['a', 'b', 'c', 'd'];
    step('sanctum', 'sanctum-resonator');
    g.gear.push('resonator');
    step('sanctum', 'sanctum-door');
    g.sanctum.door = true;
    step('sanctum', 'sanctum-heart');
    g.sanctum.contact = true;
    step('home', 'home', 'After first contact she is home in the shallows');
    assert.deepEqual(spots, LINNEA_ORDER, 'She visits every spot, once each, in order');

    // Every spot is in open water (not inside rock) and nowhere near another spot.
    for (const id of LINNEA_ORDER) {
      const s = LINNEA_SPOTS[id];
      const y = terrain.groundY(s.x) - s.lift;
      assert.equal(terrain.isSolid(s.x, y), false, `${id} is in open water`);
      assert.equal(terrain.isSolid(s.x, y - 30), false, `${id} has room above`);
      for (const other of LINNEA_ORDER) if (other !== id) assert.ok(Math.abs(LINNEA_SPOTS[other].x - s.x) > LINNEA_TALK_RANGE * 4, `${id} and ${other} are apart`);
    }
    // An old save with no Linnea tips loads at the right spot; meeting her is kept in tips only.
    const loaded = state.freshSave(0, 0);
    assert.equal(linneaPlan(loaded).spot, 'cliff');
    assert.equal(linneaGreeting(loaded), "Oh! Hello. I'm Linnea.", 'The first meeting starts with hello');
    markLinneaMet(loaded, 'cliff');
    markLinneaMet(loaded, 'cliff');
    assert.deepEqual(loaded.tips.filter((t) => t.startsWith('linnea:')), ['linnea:cliff'], 'Meeting her is recorded once');
    assert.equal(linneaGreeting(loaded), null, 'Hello only once');
    // A save without mapSeen (very old) still works.
    const bare = state.freshSave(0, 0);
    bare.gear.push('light');
    bare.mapSeen = undefined;
    assert.equal(linneaPlan(bare).spot, 'forest');
  }

  console.log('Progression checks passed.');
} finally {
  await server.close();
}
