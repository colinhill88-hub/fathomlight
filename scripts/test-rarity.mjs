/**
 * Phases 22 and 23 (Session B): Node checks for the new inherited traits (size, shape,
 * heirloom lines, the Choir's touch), the tiered odds and the care bonus, the planner's
 * odds, the book's rare forms, and old creatures loading unchanged.
 * Run from scripts/test-progression.mjs (it passes its Vite server in).
 */
import assert from 'node:assert/strict';

export async function runRarityChecks(server) {
  const [state, care, traits, col, rng] = await Promise.all([
    server.ssrLoadModule('/src/game/state.ts'),
    server.ssrLoadModule('/src/game/creatures.ts'),
    server.ssrLoadModule('/src/game/traits.ts'),
    server.ssrLoadModule('/src/game/collection.ts'),
    server.ssrLoadModule('/src/rng.ts'),
  ]);
  const N = 100000;
  const plain = { colour: 0, pattern: 0, gen: 1 };
  const sample = (a, b, care = 1, opts = {}, n = N) => {
    const r = rng.mulberry32(99);
    const out = { tiny: 0, giant: 0, s1: 0, s2: 0, heir: 0, choir: 0 };
    for (let i = 0; i < n; i++) {
      const t = traits.inherit(a, b, r, care, opts);
      if (t.size === 'tiny') out.tiny++;
      if (t.size === 'giant') out.giant++;
      if (t.shape === 1) out.s1++;
      if (t.shape === 2) out.s2++;
      if (t.heirloom) out.heir++;
      if (t.choir) out.choir++;
    }
    for (const k in out) out[k] /= n;
    return out;
  };
  const near = (x, want, tol, what) => assert.ok(Math.abs(x - want) < tol, `${what}: ${x.toFixed(4)} (want about ${want.toFixed(4)})`);

  // ---- Tiered rarity from two ordinary parents (Colin: uncommon 1 in 8, rare 1 in 25, heirloom/Choir 1 in 100 or rarer) ----
  {
    const o = sample(plain, plain);
    near(o.tiny + o.giant, 1 / 8, 0.006, 'A size variant is about 1 in 8 (uncommon)');
    near(o.s1, 1 / 8, 0.006, 'The second shape is about 1 in 8 (uncommon)');
    near(o.s2, 1 / 25, 0.004, 'The third shape is about 1 in 25 (rare)');
    assert.equal(o.heir, 0, 'No heirloom before the 4th generation');
    assert.equal(o.choir, 0, 'No Choir-touched egg before first contact');
    const g3 = { ...plain, gen: 3 };
    const h = sample(g3, g3, 1, {}, 300000);
    near(h.heir, 1 / 100, 0.0015, 'An heirloom is about 1 in 100 from the 4th generation');
    const c = sample(plain, plain, 1, { contact: true }, 300000);
    near(c.choir, traits.CHOIR_ODDS, 0.0012, 'Choir-touched is about 1 in 150 after contact');
    assert.ok(traits.CHOIR_ODDS <= 1 / 100 && traits.HEIRLOOM_ODDS <= 1 / 100, 'The rarest tier is 1 in 100 or rarer');
  }

  // ---- Great care makes every fresh chance about twice as likely ----
  {
    const g3 = { ...plain, gen: 3 };
    const low = sample(g3, g3, 1, { contact: true }, 300000);
    const high = sample(g3, g3, 2, { contact: true }, 300000);
    for (const k of ['tiny', 'giant', 's1', 's2', 'heir', 'choir']) {
      const ratio = high[k] / low[k];
      assert.ok(ratio > 1.7 && ratio < 2.3, `Great care makes ${k} about twice as likely (×${ratio.toFixed(2)})`);
    }
  }

  // ---- Traits run in families ----
  {
    const giant = { ...plain, size: 'giant', shape: 2 };
    const o = sample(giant, giant);
    assert.ok(o.giant > 0.7, `Two giants mostly have giant young (${o.giant.toFixed(2)})`);
    assert.ok(o.s2 > 0.6, `Two parents with the rare shape mostly pass it on (${o.s2.toFixed(2)})`);
    const one = sample(giant, plain);
    assert.ok(one.giant > 0.35 && one.giant < 0.5, `One giant parent: some giant young (${one.giant.toFixed(2)})`);
    const heir = sample({ ...plain, heirloom: true }, plain);
    near(heir.heir, 0.5, 0.01, 'One heirloom parent passes the line on about half the time (any generation)');
    const both = sample({ ...plain, heirloom: true }, { ...plain, heirloom: true });
    near(both.heir, 0.85, 0.01, 'Two heirloom parents: most young carry it');
    const ch = sample({ ...plain, choir: true }, plain, 1, { contact: true });
    near(ch.choir, 1 / 12, 0.004, "A Choir-touched parent passes the Choir's light on about 1 in 12");
    assert.equal(traits.choirChance({ ...plain, choir: true }, { ...plain, choir: true }, 2, false), 0, 'Never before contact, even from touched parents');
    // Generation still counts up; the older traits keep their exact draws.
    const r1 = rng.mulberry32(5);
    const t = traits.inherit({ ...plain, gen: 4 }, plain, r1);
    assert.equal(t.gen, 5);
  }

  // ---- The planner's odds match breeding ----
  {
    for (const [a, b, k, opts] of [
      [plain, plain, 1, {}],
      [{ ...plain, size: 'tiny', shape: 1, gen: 3 }, { ...plain, size: 'giant', shape: 2, gen: 2 }, 1.6, { contact: true }],
      [{ ...plain, heirloom: true, choir: true }, plain, 2, { contact: true }],
    ]) {
      const odds = traits.eggOdds(a, b, k, opts);
      const s = sample(a, b, k, opts, 200000);
      near(odds.tiny, s.tiny, 0.004, 'Planner tiny odds');
      near(odds.giant, s.giant, 0.004, 'Planner giant odds');
      near(odds.shape[1], s.s1, 0.004, 'Planner second-shape odds');
      near(odds.shape[2], s.s2, 0.004, 'Planner rare-shape odds');
      near(odds.heirloom, s.heir, 0.004, 'Planner heirloom odds');
      near(odds.choir, s.choir, 0.003, 'Planner Choir odds');
      assert.ok(Math.abs(odds.shape.reduce((x, y) => x + y) - 1) < 1e-9, 'Shape odds add up to 1');
    }
  }

  // ---- Tiers, wild forms and tidy-up ----
  {
    assert.equal(traits.rarityTier(plain), 'common');
    assert.equal(traits.rarityTier({ ...plain, size: 'tiny' }), 'uncommon');
    assert.equal(traits.rarityTier({ ...plain, shape: 2 }), 'rare');
    assert.equal(traits.rarityTier({ ...plain, heirloom: true }), 'legendary');
    assert.equal(traits.rarityTier({ ...plain, choir: true }), 'legendary');
    let shape2 = 0;
    let sized = 0;
    const r = rng.mulberry32(3);
    for (let i = 0; i < 20000; i++) {
      const f = traits.wildForms(r);
      if (f.shape === 2) shape2++;
      if (f.size) sized++;
    }
    assert.equal(shape2, 0, 'The rare shape is never found in the wild');
    near(sized / 20000, 1 / 8, 0.01, 'Wild creatures are tiny or giant about 1 in 8');
    const messy = { colour: 1, pattern: 0, size: 'huge', shape: 7, heirloom: 'yes', choir: 1 };
    traits.cleanTraits(messy);
    assert.deepEqual(messy, { colour: 1, pattern: 0 }, 'Malformed new traits are dropped');
    assert.match(traits.traitText('glowfin', { colour: 3, pattern: 2, size: 'giant', shape: 1, heirloom: true, radiant: true }), /giant · sail fin · heirloom · radiant/);
  }

  // ---- Old creatures load unchanged, with sensible default traits ----
  {
    // A creature from before milestone 9 (no traits) keeps exactly the looks its id gave it: no size, no shape.
    for (let id = 1; id < 300; id++) {
      const t = traits.traitsOf({ id });
      assert.equal(t.size, undefined);
      assert.equal(t.shape, undefined);
      assert.equal(t.heirloom, undefined);
    }
    const store = new Map();
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
    const s = state.freshSave(0, 0);
    s.creatures.push({ id: 1, species: 'glowfin', tank: 5, stage: 'grown', growth: 1, fed: 1, comfort: 1, sickness: 0, make: 0 });
    s.creatures.push({ id: 2, species: 'ray', tank: 5, stage: 'grown', growth: 1, fed: 1, comfort: 1, sickness: 0, make: 0, traits: { colour: 2, pattern: 1, gen: 3, radiant: true } });
    s.book = { 'ray:2:1': { src: 'bred', gen: 3, t: 10, radiant: true } };
    store.set('fathomlight.save.v1', JSON.stringify(s));
    const { data, loaded } = state.loadSave(0, 0);
    assert.ok(loaded);
    assert.deepEqual(data.creatures[1].traits, { colour: 2, pattern: 1, gen: 3, radiant: true }, 'Saved traits load as they were');
    assert.equal(data.bookForms, undefined, 'No rare forms page until it is used');
    col.book(data);
    assert.deepEqual(data.bookForms, {}, 'Ordinary creatures add nothing to the rare forms page');
    assert.equal(col.sweepBook(data).length, 1, 'The old glowfin goes into the book (it was not recorded before)');
    // New fields survive a round trip; malformed ones are dropped.
    data.creatures[1].traits.size = 'giant';
    data.creatures[1].traits.heirloom = true;
    state.writeSave(data);
    const back = state.loadSave(0, 0).data;
    assert.equal(back.creatures[1].traits.size, 'giant');
    assert.equal(back.creatures[1].traits.heirloom, true);
    store.set('fathomlight.save.v1', JSON.stringify({ ...s, bookForms: 4, creatures: [{ ...s.creatures[1], traits: { colour: 2, pattern: 1, size: 'enormous', shape: 'fan' } }] }));
    const bad = state.loadSave(0, 0).data;
    assert.equal(bad.bookForms, undefined);
    assert.deepEqual(bad.creatures[0].traits, { colour: 2, pattern: 1 });
    delete globalThis.localStorage;
  }

  // ---- The book's rare forms: news, hatch tiers and the forms reward ----
  {
    const save = state.freshSave(0, 0);
    const egg = (t) => ({ id: save.nextCreatureId++, species: 'crab', tank: 1, stage: 'young', growth: 0, fed: 1, comfort: 1, sickness: 0, make: 0, traits: { gen: 2, ...t } });
    const a = egg({ colour: 0, pattern: 0, size: 'tiny' });
    let n = col.kindNews(save, a);
    assert.deepEqual(n.newForms, ['tiny']);
    assert.equal(col.hatchTier({ ...n, newColour: false, newPattern: false, newKind: false }), 'notable', 'A first tiny one gets a reward card');
    col.record(save, a);
    assert.deepEqual(col.kindNews(save, egg({ colour: 0, pattern: 0, size: 'tiny' })).newForms, [], 'Only the first of a form is news');
    const rare = col.kindNews(save, egg({ colour: 0, pattern: 0, shape: 2 }));
    assert.equal(col.hatchTier(rare), 'major', 'A first rare shape is a major moment');
    const heir = col.kindNews(save, egg({ colour: 0, pattern: 0, heirloom: true }));
    assert.equal(col.hatchTier(heir), 'major', 'A first heirloom is a major moment');
    for (const t of [{ size: 'giant' }, { shape: 1 }, { shape: 2 }]) {
      const c = egg({ colour: 0, pattern: 0, ...t });
      save.creatures.push(c);
      col.record(save, c);
    }
    save.bookClaimed = [];
    const got = col.claimBookRewards(save).map((r) => r.id);
    assert.ok(got.includes('forms:crab'), 'Every size and shape of a species gives a reward');
    assert.ok(!col.claimBookRewards(save).some((r) => r.id === 'forms:crab'), 'Only once');
    // Restocking keeps size and the uncommon shape, not the rare shape or heirloom.
    col.restock(save, 'crab', { colour: 1, pattern: 0, gen: 3, size: 'giant', shape: 2, heirloom: true });
    assert.deepEqual(save.restocked.crab[0], { colour: 1, pattern: 0, gen: 1, size: 'giant' });
  }
}
