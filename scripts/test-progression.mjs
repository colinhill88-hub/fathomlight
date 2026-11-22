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

  // ---- Puffcaps' room to drift scales with the tank (Colin, Nov 22, 2026) ----
  {
    assert.equal(care.driftRoom(care.TANK_CAPACITY), 2, 'A small tank: two puffcaps drift happily, as before');
    assert.equal(care.driftRoom(care.GTANK_CAPACITY), 4, 'A Grand tank: four');
    assert.equal(care.driftRoom(12), 6, 'Bigger tanks hold more');
    const comfortOf = (kind, n) => {
      const s = state.freshSave(0, 0);
      const lay = new BaseLayout([{ id: 1, kind, gx: 0, gy: 0, rot: 0 }]);
      lay.powered.add(1);
      s.tankData[1] = { water: 1, plant: 'kelp' };
      const made = [];
      for (let i = 0; i < n; i++) made.push(care.newCreature(s, 'puffcap', 'grown', 1));
      return care.comfortTarget(s, lay, made[0]).notes.find((x) => /drift/.test(x.text));
    };
    assert.equal(comfortOf('tank', 2).good, true);
    assert.equal(comfortOf('tank', 3).good, false, 'Three is a crowd in a small tank');
    assert.equal(comfortOf('gtank', 4).good, true, 'Four puffcaps have room in a Grand tank');
    assert.equal(comfortOf('gtank', 5).good, false);
  }

  // ---- Phase 19: combat inside the wrecks ----
  {
    const combat = await server.ssrLoadModule('/src/game/combat.ts');
    const foesMod = await server.ssrLoadModule('/src/game/foes.ts');
    const { ENGINE_MAP, engineLayout } = await server.ssrLoadModule('/src/interior/engineRoom.ts');
    const { CORVINA_MAP } = await server.ssrLoadModule('/src/interior/corvina.ts');
    const gearMod = await server.ssrLoadModule('/src/game/gear.ts');
    const T = 40;

    // The switch: ?combat=off closes the engine room door; on by default.
    assert.equal(combat.combatOn(''), true);
    assert.equal(combat.combatOn('?combat=off'), false, 'combat can be switched off from the address');
    // The door opens with the Rivet driver only.
    assert.equal(combat.engineDoorOpen({ gear: [] }), false);
    assert.equal(combat.engineDoorOpen({ gear: ['rivet'] }), true);
    assert.equal(combat.engineDoorOpen({ gear: ['rivet'] }, false), false, 'switched off, the door stays shut');

    // Blocking: the guard covers the front only; a fresh brace is perfect; the shockwave must be jumped.
    const hit = (o) => combat.resolveHit({ attack: 'lunge', braced: true, braceAge: 1, face: 1, fromX: 100, x: 0, ...o });
    assert.equal(hit({}), 'block');
    assert.equal(hit({ braceAge: 0.1 }), 'perfect');
    assert.equal(hit({ braced: false }), 'hit');
    assert.equal(hit({ fromX: -100 }), 'hit', 'The guard does not cover her back');
    assert.equal(hit({ attack: 'slam', braceAge: 0.05 }), 'hit', 'The keeper\'s shockwave rolls under the guard');
    assert.equal(combat.afterHit(1, 'bolt', 'block'), 1, 'A blocked hit costs nothing');
    assert.ok(combat.afterHit(1, 'bolt', 'hit') < 1);
    assert.equal(combat.afterHit(0.1, 'charge', 'hit'), 0, 'Suit integrity never goes below zero');
    // The suit seals itself only once the fight has been quiet a while.
    assert.equal(combat.mendSuit(0.5, 1, 1), 0.5);
    assert.ok(combat.mendSuit(0.5, combat.SUIT_CALM, 1) > 0.5);
    assert.equal(combat.mendSuit(0.99, 10, 10), 1);

    // The engine room: equal rows, three safe lamps (three rooms), its machines, a shutter and the way out.
    assert.ok(ENGINE_MAP.every((r) => r.length === ENGINE_MAP[0].length), 'Engine room rows are all the same width');
    const lay = engineLayout();
    assert.equal(lay.lamps.length, 3);
    assert.deepEqual(lay.lamps.map((l) => l.room), [0, 1, 2]);
    const kinds = (room) => lay.spawns.filter((sp) => sp.room === room).map((sp) => sp.kind).sort();
    assert.deepEqual(kinds(0), ['tick', 'tick'], 'Room 1: two rust ticks');
    assert.deepEqual(kinds(1), ['drone', 'drone', 'tick'], 'Room 2: two weld drones and a tick among the crates');
    assert.deepEqual(kinds(2), ['keeper'], 'Room 3: the hull keeper');
    const solid = (x, y) => '#c'.includes(ENGINE_MAP[Math.floor(y / T)]?.[Math.floor(x / T)] ?? '#');
    for (const sp of lay.spawns) if (sp.kind !== 'drone') assert.ok(solid(sp.x, sp.y + 4) && !solid(sp.x, sp.y - 4), `${sp.id} starts standing on the floor`);
    assert.ok(solid(lay.door.x, lay.door.y + 4), 'The way out is on the floor');
    assert.ok(ENGINE_MAP.some((r) => r.includes('Y')) && ENGINE_MAP.some((r) => r.includes('7')) && ENGINE_MAP.some((r) => r.includes('$')));

    // Respawning (Colin's choice): small machines come back each visit; the keeper stays beaten.
    assert.equal(combat.foesFor(lay.spawns, undefined).length, 6);
    assert.equal(combat.foesFor(lay.spawns, { taken: ['k'] }).length, 5, 'A beaten keeper stays beaten');
    assert.ok(combat.foesFor(lay.spawns, { taken: ['k'] }).every((sp) => sp.kind !== 'keeper'));
    assert.deepEqual(combat.foesFor(lay.spawns, undefined, 2).map((sp) => sp.kind), ['keeper'], 'After a blackout only the rooms from the lamp on refill');
    assert.deepEqual(combat.wakePoint(lay.door, lay.lamps, 1), lay.lamps[1]);
    assert.deepEqual(combat.wakePoint(lay.door, [], 0), { ...lay.door, room: 0 }, 'No lamp: wake at the door');

    // The Corvina's hold has the engine room door and the bosun's locker, on the floor and apart from the salvage crate.
    const at = (ch) => { const ty = CORVINA_MAP.findIndex((r) => r.includes(ch)); return { tx: CORVINA_MAP[ty].indexOf(ch), ty }; };
    for (const ch of ['E', '6', '$']) {
      const { tx, ty } = at(ch);
      assert.equal(CORVINA_MAP[ty + 1][tx], '#', `${ch} stands on the hold floor`);
    }
    assert.ok(Math.abs(at('E').tx - at('$').tx) * T > 60 && Math.abs(at('6').tx - at('$').tx) * T > 60, 'Door, locker and crate offers do not overlap');
    assert.ok(CORVINA_MAP.every((r) => r.length === 100), 'The Corvina keeps its size');

    // The Corvina's scan point is in open water by her way in (Colin, before merging Phase 19).
    {
      const sp = { x: terrain.CV_HATCH.x - 120, y: terrain.CV_HATCH.y - 60 };
      assert.equal(terrain.isSolid(sp.x, sp.y), false, 'The Corvina scan point is in open water');
      assert.equal(terrain.cvUpwell(sp.x, sp.y), 0, 'It is clear of the upwelling over her deck');
      assert.ok(Math.hypot(sp.x - terrain.CV_BOLLARD.x, sp.y - terrain.CV_BOLLARD.y) < 230, 'It is in scan reach of the bollard, the way in');
      assert.ok(Math.hypot(sp.x - terrain.CV_HATCH.x, sp.y - terrain.CV_HATCH.y) < 230, 'and of the deck hatch');
    }
    // The weapon comes the usual way: drawings, a Lab, the Workshop.
    assert.deepEqual(gearMod.RESEARCH.rivet.finds, ['rivetplans']);
    assert.equal(gearMod.GEAR.rivet.blueprint, 'rivet');
    assert.equal(gearMod.GEAR.rivet.code, 'RD-1');
    assert.ok(gearMod.RESEARCH_ORDER.includes('rivet') && gearMod.GEAR_ORDER.includes('rivet'));

    // Saves: an old save has no engine room; a saved one round-trips; junk is dropped.
    const store = new Map();
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
    const old = state.freshSave(0, 0);
    store.set('fathomlight.save.v1', JSON.stringify(old));
    const l1 = state.loadSave(0, 0);
    assert.equal(l1.loaded, true);
    assert.equal(l1.data.corvina.engine, undefined, 'An old save loads with no engine room state');
    store.set('fathomlight.save.v1', JSON.stringify({ ...old, corvina: { ...old.corvina, engine: { taken: ['k', '7', 5] } } }));
    assert.deepEqual(state.loadSave(0, 0).data.corvina.engine, { taken: ['k', '7'] }, 'The engine room state is kept (strings only)');
    delete globalThis.localStorage;

    // Controls: Shoot is X / RT (the stun dart's keys: the dart is swim-only, the driver foot-only), Brace is Down.
    assert.equal(bindings.isKey('shoot', 'x'), true);
    assert.deepEqual(bindings.padFor('shoot'), [7]);
    const foot = ids(ctx({ mode: 'foot', combat: true }));
    assert.ok(foot.includes('shoot') && foot.includes('brace'), 'On foot in a fight the helper shows Shoot and Brace');
    assert.ok(!ids(ctx({ mode: 'foot' })).includes('shoot'), 'No Shoot row outside a fight');
    assert.ok(ids(ctx({ mode: 'foot', combat: true, device: 'gamepad' })).includes('brace'), 'The pad shows bracing on the stick');

    // ---- A fight stepped in Node: a flat floor 20 tiles long at y = 400 ----
    const world = { tile: T, solid: (x, y) => y >= 400 || x < 0 || x > 2000, clear: () => true };
    const hero = (o = {}) => ({ x: 300, y: 400, face: 1, onGround: true, braced: false, braceAge: 9, grace: 0, ...o });
    const run = (field, h, secs, each) => {
      const out = [];
      for (let t = 0; t < secs; t += 1 / 60) {
        const ev = [];
        each?.(t, field, h);
        field.step(1 / 60, h, ev);
        out.push(...ev);
        for (const e of ev) if (e.type === 'hurt' && e.result === 'hit') h.grace = combat.HURT_GRACE;
        h.grace = Math.max(0, h.grace - 1 / 60);
      }
      return out;
    };
    const cues = (evs) => evs.filter((e) => e.type === 'cue').map((e) => e.cue);
    // A rust tick telegraphs, then lunges and hurts a hero who stands still.
    {
      const f = new foesMod.FoeField(world, [0]);
      f.reset([{ id: 't', kind: 'tick', x: 520, y: 400, room: 0 }]);
      const evs = run(f, hero(), 4);
      const c = cues(evs);
      assert.ok(c.indexOf('tickTell') >= 0 && c.indexOf('tickTell') < c.indexOf('tickLunge'), 'The tick rattles before it lunges');
      assert.ok(evs.some((e) => e.type === 'hurt' && e.attack === 'lunge' && e.result === 'hit'), 'An unanswered lunge lands');
    }
    // Braced in time, the lunge is turned and the tick is flipped; jumping over it, nothing lands.
    {
      const f = new foesMod.FoeField(world, [0]);
      f.reset([{ id: 't', kind: 'tick', x: 520, y: 400, room: 0 }]);
      const h = hero({ braced: true, braceAge: 0 });
      let lungeAt = -1;
      const evs = run(f, h, 3, (t, field) => {
        if (lungeAt < 0 && field.foes[0].state === 'lunge') lungeAt = t;
        h.braceAge = lungeAt < 0 ? 0 : t - lungeAt;
      });
      assert.ok(!evs.some((e) => e.type === 'hurt' && e.result === 'hit'), 'A raised guard turns the lunge');
      assert.ok(evs.some((e) => e.type === 'hurt' && e.result === 'perfect'), 'Braced just as it lands: a perfect brace');
    }
    // A crate between them: the tick never lunges into it; it climbs over and comes on.
    {
      const crate = { tile: T, solid: (x, y) => y >= 400 || x < 0 || x > 2000 || (x >= 400 && x < 440 && y >= 360), clear: (ax, ay, bx, by) => { for (let k = 1; k < 20; k++) { const x = ax + (bx - ax) * k / 20; const y = ay + (by - ay) * k / 20; if (x >= 400 && x < 440 && y >= 360) return false; } return true; } };
      const f = new foesMod.FoeField(crate, [0]);
      f.reset([{ id: 't', kind: 'tick', x: 560, y: 400, room: 0 }]);
      const h = hero({ x: 200, grace: 999 });
      let over = false;
      for (let t = 0; t < 6 && !over; t += 1 / 60) { f.step(1 / 60, h, []); if (f.foes[0].x < 400) over = true; }
      assert.ok(over, 'A tick climbs over a crate between it and Kestrel');
    }
    // Rivets: soft aim finds the tick; two hits and it falls apart.
    {
      const f = new foesMod.FoeField(world, [0]);
      f.reset([{ id: 't', kind: 'tick', x: 700, y: 400, room: 5 }]);
      const evs = run(f, hero(), 1.6, (t, field) => { if (t < 1.2) field.shoot(); });
      assert.ok(cues(evs).filter((c) => c === 'shot').length >= 2, 'Holding the trigger fires at the driver\'s pace');
      assert.ok(f.foes[0].dead, 'Two rivets stop a tick');
      assert.ok(cues(evs).includes('down'));
    }
    // The drone is armoured while it hovers, open while it charges and cools, and every shot is announced.
    {
      const d = foesMod.makeFoe({ id: 'd', kind: 'drone', x: 600, y: 400, room: 0 });
      d.state = 'hover';
      assert.equal(foesMod.vulnerable(d), false);
      d.state = 'aim';
      assert.equal(foesMod.vulnerable(d), true, 'A shot while it charges interrupts it');
      d.state = 'cool';
      assert.equal(foesMod.vulnerable(d), true);
      const f = new foesMod.FoeField(world, [0]);
      f.reset([{ id: 'd', kind: 'drone', x: 650, y: 400, room: 0 }]);
      const evs = run(f, hero(), 5);
      const c = cues(evs);
      assert.ok(c.indexOf('droneAim') >= 0 && c.indexOf('droneAim') < c.indexOf('droneFire'), 'The drone aims (and is heard) before it fires');
      assert.ok(evs.some((e) => e.type === 'hurt' && e.attack === 'bolt'), 'Its bolt reaches a hero standing in the open');
      // Braced (crouched) after it locks on: the bolt aimed at her chest flies over.
      const g = new foesMod.FoeField(world, [0]);
      g.reset([{ id: 'd', kind: 'drone', x: 650, y: 400, room: 0 }]);
      const h = hero();
      const evs2 = run(g, h, 5, (t, field) => { const fo = field.foes[0]; if (fo.state === 'aim' && fo.t > combat.DRONE.track) { h.braced = true; h.braceAge = 2; } if (fo.state === 'cool' && !field.shots.length) h.braced = false; });
      assert.ok(!evs2.some((e) => e.type === 'hurt' && e.attack === 'bolt' && e.result === 'hit'), 'Ducking after the lock makes the bolt miss');
    }
    // The keeper: rivets only spark off its shield until an attack leaves its core open.
    {
      const k = foesMod.makeFoe({ id: 'h', kind: 'keeper', x: 600, y: 400, room: 0 });
      for (const st of ['idle', 'walk', 'windSlam', 'windCharge', 'charge']) { k.state = st; assert.equal(foesMod.vulnerable(k), false, `keeper shielded while ${st}`); }
      for (const st of ['stuck', 'stagger']) { k.state = st; assert.equal(foesMod.vulnerable(k), true, `keeper open while ${st}`); }
      const f = new foesMod.FoeField(world, [0]);
      f.reset([{ id: 'h', kind: 'keeper', x: 420, y: 400, room: 0 }]);
      const h = hero({ x: 300 });
      const evs = run(f, h, 6);
      const c = cues(evs);
      assert.ok(c.indexOf('keeperWindSlam') >= 0 && c.indexOf('keeperWindSlam') < c.indexOf('keeperSlam'), 'The keeper winds up before it slams');
      assert.ok(evs.some((e) => e.type === 'hurt' && e.attack === 'slam'), 'Its shockwave reaches a hero who does not jump');
      assert.ok(c.includes('keeperOpen'), 'After the slam its core opens');
      // Beating it: shoot only while it's open.
      const g = new foesMod.FoeField(world, [0]);
      g.reset([{ id: 'h', kind: 'keeper', x: 460, y: 400, room: 0 }]);
      const hh = hero({ x: 300, grace: 999 });
      run(g, hh, 40, (t, field) => { if (foesMod.vulnerable(field.foes[0])) field.shoot(); });
      assert.ok(g.foes[0].dead, 'Shooting the open core beats the keeper');
    }
  }

  console.log('Progression checks passed.');
} finally {
  await server.close();
}
