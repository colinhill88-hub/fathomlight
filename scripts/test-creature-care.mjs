/**
 * Phases 20 and 21 (Session A): Node checks for the collection book, the care bonus to the
 * odds, contentment and hand-feeding, capacity and the reserve, Linnea's requests and
 * restocking. Run from scripts/test-progression.mjs (it passes its Vite server in).
 */
import assert from 'node:assert/strict';

export async function runCreatureCareChecks(server) {
  const [state, { BaseLayout }, care, traits, col, rng] = await Promise.all([
    server.ssrLoadModule('/src/game/state.ts'),
    server.ssrLoadModule('/src/game/base.ts'),
    server.ssrLoadModule('/src/game/creatures.ts'),
    server.ssrLoadModule('/src/game/traits.ts'),
    server.ssrLoadModule('/src/game/collection.ts'),
    server.ssrLoadModule('/src/rng.ts'),
  ]);

  const base = () => {
    const layout = new BaseLayout([
      { id: 1, kind: 'tank', gx: 0, gy: 0, rot: 0 },
      { id: 2, kind: 'gtank', gx: 4, gy: 0, rot: 0 },
      { id: 3, kind: 'hatch', gx: 9, gy: 0, rot: 0 },
    ]);
    for (const id of [1, 2, 3]) layout.powered.add(id);
    const save = state.freshSave(0, 0);
    save.tankData[1] = { water: 1, plant: 'coral' };
    save.tankData[2] = { water: 1, plant: 'coral' };
    return { save, layout };
  };

  // ---- Odds: the care bonus doubles rare results, and the planner's odds match inherit() ----
  {
    const a = { colour: 0, pattern: 0, gen: 1 };
    const b = { colour: 1, pattern: 1, gen: 1 };
    const sample = (care, n = 60000) => {
      const r = rng.mulberry32(42);
      let rare = 0, third = 0, rad = 0;
      for (let i = 0; i < n; i++) {
        const t = traits.inherit(a, b, r, care);
        if (t.colour === 3) rare++;
        if (t.pattern === 2) third++;
        if (t.radiant) rad++;
      }
      return { rare: rare / n, third: third / n, rad: rad / n };
    };
    const low = sample(1), high = sample(2);
    for (const k of ['rare', 'third', 'rad']) {
      const ratio = high[k] / low[k];
      assert.ok(ratio > 1.8 && ratio < 2.2, `Great care makes ${k} about twice as likely (×${ratio.toFixed(2)})`);
    }
    const odds = traits.eggOdds(a, b, 2);
    assert.ok(Math.abs(odds.colour.reduce((x, y) => x + y) - 1) < 1e-9, 'Colour odds add up to 1');
    assert.ok(Math.abs(odds.pattern.reduce((x, y) => x + y) - 1) < 1e-9, 'Pattern odds add up to 1');
    assert.ok(Math.abs(odds.colour[3] - high.rare) < 0.005, `Planner rare colour odds match breeding (${odds.colour[3]} vs ${high.rare})`);
    assert.ok(Math.abs(odds.pattern[2] - high.third) < 0.008, 'Planner third-pattern odds match breeding');
    assert.ok(Math.abs(odds.radiant - high.rad) < 0.005, 'Planner radiant odds match breeding');
    assert.equal(traits.radiantChance({ colour: 0, pattern: 0, radiant: true }, { colour: 0, pattern: 0, radiant: true }, 2), traits.RADIANT_CAP, 'Radiance never becomes certain');
    // care = 1 keeps the old odds exactly (same random draws, same result).
    const r1 = rng.mulberry32(7), r2 = rng.mulberry32(7);
    for (let i = 0; i < 200; i++) assert.deepEqual(traits.inherit(a, b, r1), traits.inherit(a, b, r2, 1));
  }

  // ---- Contentment and hand-feeding ----
  {
    const { save, layout } = base();
    const g = care.newCreature(save, 'glowfin', 'grown', 1);
    const h = care.newCreature(save, 'glowfin', 'grown', 1);
    for (const c of [g, h]) Object.assign(c, { fed: 0.62, comfort: 0.76 });
    save.tankData[1].water = 0.62;
    assert.ok(care.isHappy(save, g), 'A neglected-but-happy creature can still breed');
    assert.equal(care.carePower(save, g, h), 1, 'A pair that only just meets its needs gets the old odds');
    assert.notEqual(care.contentment(save, g).label, 'Content');
    for (const c of [g, h]) Object.assign(c, { fed: 1, comfort: 1, bond: 1 });
    save.tankData[1].water = 1;
    save.tankData[1].decor = ['arch', 'clam'];
    assert.equal(care.contentment(save, g).value, 1, 'Needs met, decorations and a bond with Kestrel: fully content');
    assert.equal(care.contentment(save, g).label, 'Content');
    assert.equal(care.carePower(save, g, h), 2, 'A content, well-kept pair: twice as likely');
    // Hand-feeding: a treat, a bond, then a cooldown.
    const c = care.newCreature(save, 'glowfin', 'young', 2);
    c.fed = 0.3;
    assert.equal(care.handFeed(save, c), null);
    assert.equal(c.bond, care.BOND_PER_FEED);
    assert.ok(Math.abs(c.fed - 0.5) < 1e-9, 'A treat feeds it a little');
    assert.match(care.handFeed(save, c), /treat/, 'One treat at a time');
    save.playSeconds += care.HAND_FEED_COOLDOWN;
    assert.equal(care.handFeed(save, c), null, 'Ready again after the cooldown');
    const egg = care.newCreature(save, 'glowfin', 'egg', 2);
    assert.ok(care.handFeed(save, egg), 'Eggs are not hand-fed');
    // The bond fades without care.
    const before = c.bond;
    care.tickCare(save, layout, 60);
    assert.ok(c.bond < before, 'A bond fades slowly');
    // Breeding stores the parents' names on the egg.
    save.creatures = save.creatures.filter((x) => x.tank === 1);
    for (let i = 0; i < 400 && !save.nursery.length; i++) {
      save.tankData[1].water = 1;
      for (const x of [g, h]) x.fed = 1;
      care.tickCare(save, layout, 1);
    }
    assert.equal(save.nursery.length, 1, 'A content pair lays');
    assert.deepEqual([...save.nursery[0].parents].sort(), [care.creatureName(g), care.creatureName(h)].sort(), 'The egg knows its parents');
  }

  // ---- Names ----
  {
    const c = { id: 9, species: 'ray' };
    assert.equal(care.creatureName(c), care.suggestedName(c), 'No chosen name: the suggestion');
    assert.equal(care.creatureName({ ...c, name: 'Biscuit' }), 'Biscuit', 'A chosen name wins');
    // Suggestions vary (the old hash gave ids 1-4 the same name), and old creatures keep theirs.
    const names = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((id) => care.suggestedName({ id, species: 'glowfin' })));
    assert.ok(names.size >= 6, `Suggested names vary (${[...names]})`);
    const olds = state.freshSave(0, 0);
    const kept = care.newCreature(olds, 'glowfin', 'grown', 1);
    const before = care.legacyName(kept);
    assert.equal(care.keepOldNames(olds), true);
    assert.equal(care.creatureName(kept), before, 'A creature kept before the change keeps its old name');
    assert.equal(care.keepOldNames(olds), false, 'Runs once per save');
    assert.equal(care.cleanName('  <b>Sir   Flaps-a-lot the Third</b> '), 'bSir Flaps-a-lot', 'Names are tidied and kept short');
  }

  // ---- Capacity: upgrades, the display aquarium, the reserve, moving, care for all ----
  {
    const { save, layout } = base();
    assert.equal(care.tankCapacity(layout, 1, save), 4);
    assert.equal(care.tankCapacity(layout, 2, save), 8);
    assert.match(care.upgradeTank(save, layout, 1), /TX-1/, 'Upgrading needs a kit');
    save.tankKits = 2;
    assert.equal(care.upgradeTank(save, layout, 1), null);
    assert.equal(care.tankCapacity(layout, 1, save), 6, 'Small tank 4 → 6');
    assert.match(care.upgradeTank(save, layout, 1), /Grand/, 'A small tank only grows once');
    assert.equal(care.upgradeTank(save, layout, 2), null);
    assert.equal(care.tankCapacity(layout, 2, save), 12, 'Grand tank 8 → 12');
    assert.match(care.upgradeTank(save, layout, 2), /DR-1/, 'The display refit needs its own kit');
    save.displayKits = 1;
    assert.equal(care.upgradeTank(save, layout, 2), null);
    assert.equal(care.tankCapacity(layout, 2, save), 20, 'The display aquarium holds 20');
    assert.ok(care.isDisplay(save, layout, 2));
    assert.equal(care.decorSlots(save, layout, 2), 6);
    assert.equal(care.driftRoom(care.tankCapacity(layout, 2, save)), 10, 'Puffcaps get room to drift in the display aquarium');
    assert.equal(care.tankCapacity(layout, 1), 4, 'Without the save (old callers) a tank reads as built');
    // The reserve: rest, no care, and back again.
    const r = care.newCreature(save, 'ray', 'grown', 1);
    r.fed = 0.2;
    assert.equal(care.moveCreature(save, layout, r.id, 'reserve'), null);
    assert.equal(save.creatures.includes(r), false);
    assert.equal(save.reserve.length, 1);
    care.tickCare(save, layout, 3000);
    assert.equal(r.sickness, 0, 'Nothing happens to a creature resting in the reserve');
    assert.equal(r.fed, 0.2, 'It does not get hungry there');
    assert.equal(care.moveCreature(save, layout, r.id, 2), null);
    assert.equal(r.tank, 2);
    assert.ok(r.fed >= 0.75, 'It comes back fed');
    assert.equal(save.reserve.length, 0);
    // Moving into a full tank is refused and changes nothing.
    for (let i = 0; i < 5; i++) care.newCreature(save, 'glowfin', 'young', 1);
    assert.equal(care.creaturesIn(save, 1).length, 5);
    care.newCreature(save, 'glowfin', 'young', 1);
    assert.match(care.moveCreature(save, layout, r.id, 1), /full/);
    assert.equal(r.tank, 2);
    // No Hatchery, no reserve.
    const bare = new BaseLayout([{ id: 1, kind: 'tank', gx: 0, gy: 0, rot: 0 }]);
    assert.match(care.moveCreature(save, bare, r.id, 'reserve'), /Hatchery/);
    // Reserve creatures still count toward the wild's founding pair.
    save.wildCaught.snail = 2;
    save.reserve = [{ ...r, id: 900, species: 'snail', tank: -2 }, { ...r, id: 901, species: 'snail', tank: -2 }];
    assert.equal(care.wildAllowed(save, 'snail'), false, 'Resting creatures count as the founding pair');
    // Care for all: one fibre per hungry tank, every dirty tank scrubbed.
    for (const c of save.creatures) c.fed = 0.3;
    save.tankData[1].water = 0.4;
    save.tankData[2].water = 0.5;
    save.stored.fibre = 1;
    const res = care.careForAll(save, layout);
    assert.deepEqual(res, { fed: 1, cleaned: 2, short: 1 }, 'Feeds what it can afford and says how many it could not');
    assert.equal(save.stored.fibre, 0);
  }

  // ---- The book: kinds, the hatching tier, row and page rewards ----
  {
    const { save } = base();
    const mk = (species, colour, pattern, extra = {}) => care.newCreature(save, species, 'young', 1, { colour, pattern, gen: 2, ...extra });
    col.book(save);
    const first = mk('glowfin', 0, 0);
    const news = col.kindNews(save, first);
    assert.equal(news.newKind && news.newColour && news.newPattern, true);
    col.record(save, first);
    assert.equal(col.hatchTier(col.kindNews(save, { ...first, id: 99 })), 'reveal', 'Another of a kind you have: a short reveal');
    assert.equal(col.hatchTier(col.kindNews(save, { id: 98, species: 'glowfin', traits: { colour: 1, pattern: 0 } })), 'notable', 'A first-ever colour: a reward card');
    assert.equal(col.hatchTier(col.kindNews(save, { id: 97, species: 'glowfin', traits: { colour: 3, pattern: 0 } })), 'major', 'The first rare colour: a major card');
    assert.equal(col.hatchTier(col.kindNews(save, { id: 96, species: 'glowfin', traits: { colour: 0, pattern: 0, radiant: true } })), 'major', 'The first radiant of a kind: major');
    // A sweep picks up every kept creature, once.
    mk('glowfin', 1, 0); mk('glowfin', 2, 0);
    assert.equal(col.sweepBook(save).length, 2);
    assert.equal(col.sweepBook(save).length, 0, 'Nothing new on a second sweep');
    assert.equal(col.claimBookRewards(save).length, 0, 'An incomplete row gives nothing');
    mk('glowfin', 3, 0);
    col.sweepBook(save);
    const got = col.claimBookRewards(save);
    assert.equal(got.length, 1, 'A completed row gives one reward');
    assert.equal(Object.values(save.decor).reduce((a, b) => a + b, 0), 1, 'It is a decoration');
    assert.equal(col.claimBookRewards(save).length, 0, 'Rewards are given once');
    for (let p = 1; p < 3; p++) for (let c = 0; c < 4; c++) mk('glowfin', c, p);
    col.sweepBook(save);
    const page = col.claimBookRewards(save);
    assert.equal(page.filter((x) => x.page).length, 1, 'A completed page');
    assert.equal(save.gifts.length, 1, 'gives a rare egg');
    assert.equal(save.gifts[0].traits.radiant, true);
    assert.equal(col.pageOf(save, 'glowfin').complete, true);
    // Old saves: the book fills from what is already kept, with no fanfare.
    const old = base().save;
    care.newCreature(old, 'ray', 'grown', 1, { colour: 2, pattern: 1, gen: 1 });
    delete old.book;
    assert.equal(Object.keys(col.book(old)).length, 1, 'An older save starts with its creatures in the book');
    assert.equal(col.sweepBook(old).length, 0);
  }

  // ---- Linnea's requests ----
  {
    const { save } = base();
    care.newCreature(save, 'ray', 'grown', 1, { colour: 0, pattern: 0, gen: 1 });
    assert.equal(col.topUpRequests(save).length, 0, 'No requests before anything is bred');
    care.newCreature(save, 'ray', 'young', 1, { colour: 1, pattern: 0, gen: 2 });
    col.sweepBook(save);
    const fresh = col.topUpRequests(save);
    assert.equal(fresh.length, col.REQUESTS_OPEN, 'She opens two requests');
    assert.equal(col.topUpRequests(save).length, 0, 'No more while two are open');
    const again = JSON.parse(JSON.stringify(save));
    again.requests = undefined;
    col.topUpRequests(again);
    assert.deepEqual(again.requests.active, save.requests.active, 'Requests are the same for the same save (no reshuffling on reload)');
    for (const q of save.requests.active) assert.equal(col.book(save)[col.kindKey(q.species, q.colour, q.pattern)], undefined, 'She asks for a kind the book is missing');
    // Show her a matching creature in the jar: the reward, and the creature stays yours.
    const q = save.requests.active[0];
    const kept = care.newCreature(save, q.species, 'grown', 1, { colour: q.colour, pattern: q.pattern, gen: 3 });
    save.creatures = save.creatures.filter((c) => c !== kept);
    save.jar = { species: q.species, stage: 'grown', keep: kept, traits: kept.traits };
    const wrong = { species: q.species === 'ray' ? 'glowfin' : 'ray', stage: 'grown', traits: { colour: 0, pattern: 0 } };
    save.jar2 = wrong;
    const res = col.showToLinnea(save);
    assert.ok(res && res.req.id === q.id, 'A matching creature fulfils its request');
    assert.equal(save.jar.keep, kept, 'You keep the creature');
    assert.equal(save.requests.done, 1);
    assert.equal(save.requests.active.length, 1);
    assert.equal(col.showToLinnea(save), null, 'A creature that matches nothing does nothing');
    // The third request pays the display aquarium plans; requests never expire.
    col.topUpRequests(save);
    const third = save.requests.active.find((x) => x.reward.kind === 'display');
    assert.ok(third, 'Her third request gives the display aquarium plans');
    save.playSeconds += 1e6;
    col.topUpRequests(save);
    assert.ok(save.requests.active.includes(third), 'No time limits');
    assert.equal(col.matchesRequest({ species: 'ray', pattern: 1, radiant: true }, 'ray', { colour: 2, pattern: 1 }), false, 'A radiant request needs a radiant one');
    assert.equal(col.matchesRequest({ species: 'ray', pattern: 1, radiant: true }, 'ray', { colour: 2, pattern: 1, radiant: true }), true);
    col.giveReward(save, { kind: 'display' });
    assert.ok(save.blueprints.includes('display'));
  }

  // ---- Restocking the reef ----
  {
    const { save } = base();
    assert.equal(col.restock(save, 'ray', { colour: 3, pattern: 2, gen: 1 }), false, 'A wild-born release changes nothing');
    assert.equal(col.restock(save, 'ray', { colour: 3, pattern: 2, gen: 2 }), true, 'A bred release restocks the reef');
    assert.equal(col.restock(save, 'ray', { colour: 3, pattern: 2, gen: 4 }), false, 'The same look once');
    assert.deepEqual(col.restockedLook(save, 'ray', 0), { colour: 3, pattern: 2, gen: 1 }, 'It turns up in the wild');
    assert.equal(col.restockedLook(save, 'ray', 1), null, 'Every other wild one keeps its natural looks');
    for (let c = 0; c < 6; c++) col.restock(save, 'glowfin', { colour: c % 4, pattern: Math.floor(c / 4), gen: 2 });
    assert.equal(save.restocked.glowfin.length, col.RESTOCK_KEEP, 'Only the latest few looks are kept');
  }

  // ---- Old saves load with every new field absent, and new fields survive a round trip ----
  {
    const store = new Map();
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
    const s = state.freshSave(0, 0);
    s.creatures.push({ id: 1, species: 'glowfin', tank: 5, stage: 'grown', growth: 1, fed: 1, comfort: 1, sickness: 0, make: 0 });
    store.set('fathomlight.save.v1', JSON.stringify(s));
    const { data, loaded } = state.loadSave(0, 0);
    assert.ok(loaded);
    assert.equal(data.book, undefined);
    assert.equal(care.creatureName(data.creatures[0]), care.suggestedName(data.creatures[0]), 'Old creatures keep their names');
    data.creatures[0].name = 'Pip II';
    data.reserve = [];
    data.requests = { active: [], done: 2, nextId: 3 };
    state.writeSave(data);
    const back = state.loadSave(0, 0).data;
    assert.equal(back.creatures[0].name, 'Pip II');
    assert.equal(back.requests.done, 2);
    store.set('fathomlight.save.v1', JSON.stringify({ ...s, requests: 'bad', reserve: 7, book: 3 }));
    const bad = state.loadSave(0, 0).data;
    assert.equal(bad.requests, undefined, 'Malformed new fields are dropped, not fatal');
    assert.equal(bad.reserve, undefined);
    assert.equal(bad.book, undefined);
    delete globalThis.localStorage;
  }
}
