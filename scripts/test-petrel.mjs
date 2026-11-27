/**
 * Beyond Earth (Nov 27, 2026): Node checks for the Petrel's rules (src/game/petrel.ts).
 * Run from scripts/test-progression.mjs (it passes its Vite server in), or on its own:
 *   node scripts/test-petrel.mjs
 */
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

export async function runPetrelChecks(server) {
  const [state, { BaseLayout, PIECES, POWER_DRAW }, P, linnea] = await Promise.all([
    server.ssrLoadModule('/src/game/state.ts'),
    server.ssrLoadModule('/src/game/base.ts'),
    server.ssrLoadModule('/src/game/petrel.ts'),
    server.ssrLoadModule('/src/game/linnea.ts'),
  ]);

  const setup = () => {
    const layout = new BaseLayout([{ id: 1, kind: 'works', gx: 0, gy: 0, rot: 0 }]);
    layout.powered.add(1);
    layout.netOf.set(1, { make: 40, draw: 6, rate: 1 });
    const save = state.freshSave(0, 0);
    save.pieces = [{ id: 1, kind: 'works', gx: 0, gy: 0, rot: 0 }];
    save.sanctum.contact = true;
    return { save, layout };
  };
  const grow = (save, species, n = 1, pattern = 0) => {
    for (let i = 0; i < n; i++)
      save.creatures.push({ id: 1000 + save.creatures.length, species, tank: 9, stage: 'grown', growth: 1, fed: 1, comfort: 1, sickness: 0, make: 0, traits: { colour: 0, pattern: pattern + i, gen: 2 } });
  };
  const fill = (save, n = 99) => {
    for (const k of state.MATERIAL_ORDER) save.stored[k] = n;
  };

  assert.equal(PIECES.works.blueprint, 'works', 'The Petrel works is unlocked by its own blueprint');
  assert.ok(POWER_DRAW.works > 0, 'The works draws power');
  assert.equal(P.PETREL_STAGES.length, 5, 'Five stages');

  // Locked before first contact, then waits for the stage's creatures.
  {
    const { save, layout } = setup();
    save.sanctum.contact = false;
    fill(save);
    assert.equal(P.petrelStatus(save, layout).state, 'locked');
    assert.equal(P.tickPetrel(save, layout, 999).length, 0, 'Nothing is made before first contact');
    save.sanctum.contact = true;
    assert.equal(P.petrelStatus(save, layout).state, 'needs-key', 'Stage 1 needs a tinker crab and a dapple ray');
    grow(save, 'crab');
    assert.match(P.petrelStatus(save, layout).why, /dapple ray/);
    grow(save, 'ray');
    assert.equal(P.petrelStatus(save, layout).state, 'running');
  }

  // A part takes PART_SECONDS and spends its recipe from storage (never the bag); the stage ends with the grant.
  {
    const { save, layout } = setup();
    grow(save, 'crab');
    grow(save, 'ray');
    fill(save);
    save.bag.scrap = 5;
    const before = save.stored.scrap;
    P.tickPetrel(save, layout, P.PART_SECONDS / 2);
    assert.equal(save.petrel.parts, 0, 'Half a part is not a part');
    const ev = P.tickPetrel(save, layout, P.PART_SECONDS / 2 + 0.01);
    assert.equal(ev[0]?.type, 'part');
    assert.equal(save.stored.scrap, before - P.PETREL_STAGES[0].recipe.scrap, 'Scrap comes from storage');
    assert.equal(save.bag.scrap, 5, 'The dive bag is never touched');
    const credits = save.credits ?? 0;
    let stage = null;
    for (let i = 0; i < 40 && !stage; i++) for (const e of P.tickPetrel(save, layout, P.PART_SECONDS + 0.01)) if (e.type === 'stage') stage = e;
    assert.equal(stage?.stage.id, 'frame', 'Stage 1 finishes');
    assert.equal(P.petrelDone(save), 1);
    assert.equal(save.credits, credits + P.PETREL_GRANT_SC, 'The frame pays the survey grant');
    assert.equal(P.petrelStatus(save, layout).state, 'needs-key', 'Stage 2 waits for its creatures');
  }

  // Short of a material: it waits, and a half-made part keeps its progress.
  {
    const { save, layout } = setup();
    grow(save, 'crab');
    grow(save, 'ray');
    fill(save, 0);
    assert.equal(P.petrelStatus(save, layout).state, 'short');
    assert.equal(P.tickPetrel(save, layout, 999).length, 0);
    assert.equal(save.petrel?.progress ?? 0, 0, 'Nothing advances while short');
  }

  // No works, or no power: nothing happens.
  {
    const { save } = setup();
    grow(save, 'crab');
    grow(save, 'ray');
    fill(save);
    const unpowered = new BaseLayout([{ id: 1, kind: 'works', gx: 0, gy: 0, rot: 0 }]);
    assert.equal(P.petrelStatus(save, unpowered).state, 'no-works');
    assert.equal(P.tickPetrel(save, unpowered, 999).length, 0);
  }

  // Stage 4 needs three glowfins with three different patterns; stage 5 a Choir-touched creature.
  {
    const { save } = setup();
    save.petrel = { done: 3, parts: 0, progress: 0 };
    grow(save, 'glowfin', 3, 0);
    save.creatures.forEach((c) => (c.traits.pattern = 0));
    assert.match(P.missingKey(save, P.PETREL_STAGES[3]), /3 different glow patterns/);
    save.creatures.forEach((c, i) => (c.traits.pattern = i));
    assert.equal(P.missingKey(save, P.PETREL_STAGES[3]), null);
    grow(save, 'horse');
    assert.match(P.missingKey(save, P.PETREL_STAGES[4]), /Choir-touched/);
    save.creatures[0].traits.choir = true;
    assert.equal(P.missingKey(save, P.PETREL_STAGES[4]), null);
  }

  // Rewards: heat tiles, a spare air cartridge, brighter tank lamps; the whole ship.
  {
    const s = state.freshSave(0, 0);
    const air0 = state.maxOxygen(s);
    assert.equal(P.petrelScald(s), 1);
    s.petrel = { done: 3, parts: 0, progress: 0 };
    assert.equal(P.petrelScald(s), P.PETREL_SCALD);
    assert.equal(state.maxOxygen(s), air0 + state.PETREL_AIR);
    assert.equal(P.petrelYield(s), 1);
    s.petrel.done = 5;
    assert.equal(P.petrelYield(s), P.PETREL_YIELD);
    assert.ok(P.petrelComplete(s));
    assert.equal(P.petrelStatus(s, new BaseLayout([])).state, 'done');
    assert.equal(P.petrelFraction(s), 1);
  }

  // Saves: old saves have no ship; a save that met the Choir gets the blueprint and the memory on load.
  {
    const s = state.freshSave(0, 0);
    s.sanctum.contact = true;
    s.petrel = { done: 2, parts: 4, progress: 0.5 };
    const raw = JSON.parse(JSON.stringify(s));
    const store = new Map();
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
    store.set('fathomlight.save.v1', JSON.stringify(raw));
    const loaded = state.loadSave(0, 0).data;
    assert.deepEqual(loaded.petrel, { done: 2, parts: 4, progress: 0.5 }, 'The ship survives a save and load');
    assert.ok(loaded.blueprints.includes('works') && loaded.scans.includes('farmoon'), 'Contact saves get the works and the memory');
    delete raw.petrel;
    raw.sanctum.contact = false;
    raw.blueprints = [];
    store.set('fathomlight.save.v1', JSON.stringify(raw));
    const old = state.loadSave(0, 0).data;
    assert.equal(old.petrel, undefined, 'Saves without a ship load as before');
    assert.ok(!old.blueprints.includes('works'), 'No blueprint before first contact');
    delete globalThis.localStorage;
  }

  // Linnea follows the build after first contact.
  {
    const { save } = setup();
    save.pieces = [];
    assert.equal(linnea.homePlan(save).hint, 'home-works', 'Before the works: she mentions the ship');
    save.pieces = [{ id: 1, kind: 'works', gx: 0, gy: 0, rot: 0 }];
    assert.equal(linnea.homePlan(save).hint, 'home-petrel-frame', 'She names what stage 1 needs');
    assert.match(linnea.homePlan(save).lines[1], /tinker crab/);
    grow(save, 'crab');
    grow(save, 'ray');
    assert.equal(linnea.homePlan(save).hint, 'home-petrel-run-frame', 'With the creatures grown, she says to keep storage full');
    save.petrel = { done: 5, parts: 0, progress: 0 };
    assert.equal(linnea.homePlan(save).hint, 'home-petrel-whole');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' });
  try {
    await runPetrelChecks(server);
    console.log('Petrel checks passed.');
  } finally {
    await server.close();
  }
}
