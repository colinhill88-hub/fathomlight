import type { BaseLayout } from './base';
import { giftEgg } from './collection';
import { SPECIES, SPECIES_ORDER, tankHarmony, tanks } from './creatures';
import { discoveredSpecies } from './exchange';
import { MATERIALS, type FieldContract, type MaterialId, type SaveData } from './state';

/**
 * Supply Buoy EX-1 rotating Field Contracts (Colin, Nov 23, 2026).
 *
 * Always keeps 3 active, no-time-limit dive & base contracts tailored to the
 * player's current progression. Ties wreck combat, salvage runs, gathering,
 * Tank Harmony, hatching, and creature dispatch into one rewarding loop.
 */

const ACTIVE_SLOTS = 3;

interface ContractTemplate {
  kind: FieldContract['kind'];
  build(save: SaveData, seq: number): FieldContract;
}

function gatherMaterialFor(save: SaveData, seq: number): MaterialId {
  const pool: MaterialId[] = ['copper', 'scrap', 'fibre', 'quartz'];
  if (save.kelpCut || (save.stored.resin ?? 0) > 0 || (save.stored.moss ?? 0) > 0) pool.push('resin', 'moss');
  if (save.corvina.hatch || (save.stored.brass ?? 0) > 0) pool.push('brass');
  if (save.cleftOpen || save.fulmar.open || (save.stored.ore ?? 0) > 0 || (save.stored.bloom ?? 0) > 0) pool.push('ore', 'bloom');
  return pool[seq % pool.length];
}

const TEMPLATES: readonly ContractTemplate[] = [
  {
    kind: 'foes',
    build: (_save, seq) => ({
      id: `fc-foes-${seq}`,
      kind: 'foes',
      title: 'Clear Wreck Machines',
      detail: 'Defeat 3 Rust Ticks or Weld Drones inside the Corvina Engine Room.',
      target: 3,
      progress: 0,
      credits: 70,
    }),
  },
  {
    kind: 'salvage',
    build: (_save, seq) => ({
      id: `fc-salvage-${seq}`,
      kind: 'salvage',
      title: 'Engine Room Salvage Run',
      detail: 'Pry open 2 repeatable Salvage Crates inside the Corvina Engine Room.',
      target: 2,
      progress: 0,
      credits: 85,
      bonus: seq % 2 === 0 ? 'egg' : undefined,
    }),
  },
  {
    kind: 'gather',
    build: (save, seq) => {
      const mat = gatherMaterialFor(save, seq);
      const name = MATERIALS[mat].name;
      const qty = mat === 'bloom' || mat === 'ore' ? 2 : 3;
      return {
        id: `fc-gather-${seq}`,
        kind: 'gather',
        title: `Field Sample: ${name}`,
        detail: `Collect ${qty} ${name.toLowerCase()} out in the ocean.`,
        target: qty,
        progress: 0,
        mat,
        credits: mat === 'bloom' || mat === 'ore' ? 75 : 55,
      };
    },
  },
  {
    kind: 'harmony',
    build: (_save, seq) => {
      const want = seq % 3 === 0 ? 5 : 4;
      return {
        id: `fc-harmony-${seq}`,
        kind: 'harmony',
        title: `Showcase Tank (${'★'.repeat(want)})`,
        detail: `Bring any creature tank up to ${want}-star Harmony (flora, 2+ decor, thriving care${want === 5 ? ', rare/diverse' : ''}).`,
        target: want,
        progress: 0,
        credits: want === 5 ? 110 : 75,
        bonus: want === 5 ? 'egg' : undefined,
      };
    },
  },
  {
    kind: 'hatch',
    build: (_save, seq) => ({
      id: `fc-hatch-${seq}`,
      kind: 'hatch',
      title: 'Nursery Cohort',
      detail: 'Hatch 2 eggs in your Creature Room.',
      target: 2,
      progress: 0,
      credits: 60,
    }),
  },
  {
    kind: 'dispatch',
    build: (_save, seq) => ({
      id: `fc-dispatch-${seq}`,
      kind: 'dispatch',
      title: 'Sanctuary Transfer',
      detail: 'Dispatch 3 raised creatures to partner sanctuaries at Supply Buoy EX-1.',
      target: 3,
      progress: 0,
      credits: 65,
    }),
  },
];

/** Ensure 3 distinct active Field Contracts exist on the save. */
export function ensureContracts(save: SaveData): FieldContract[] {
  if (!Array.isArray(save.contracts)) save.contracts = [];
  let seq = (save.contractsDone ?? 0) + save.contracts.length + 1;
  while (save.contracts.length < ACTIVE_SLOTS) {
    const used = new Set(save.contracts.map((c) => c.kind));
    // Prefer wreck combat / salvage once the player has reached the Wreck Shelf or unlocked the Rivet Driver.
    const wreckReady = save.corvina.hatch || !!save.corvina.engine || save.gear.includes('rivet') || save.blueprints.includes('rivet');
    const candidates = TEMPLATES.filter((t) => !used.has(t.kind) && (wreckReady || (t.kind !== 'foes' && t.kind !== 'salvage')));
    const pick = candidates[(seq - 1) % candidates.length] ?? TEMPLATES[seq % TEMPLATES.length];
    save.contracts.push(pick.build(save, seq));
    seq++;
  }
  return save.contracts;
}

/** Sync any active Tank Harmony contract against the player's current best tank rating. */
export function syncHarmonyContracts(save: SaveData, layout: BaseLayout): boolean {
  const list = ensureContracts(save);
  let best = 0;
  for (const t of tanks(layout)) {
    const stars = tankHarmony(save, t.id).stars;
    if (stars > best) best = stars;
  }
  let justFinished = false;
  for (const c of list) {
    if (c.kind !== 'harmony') continue;
    const wasDone = c.progress >= c.target;
    if (best > c.progress) c.progress = Math.min(c.target, best);
    if (!wasDone && c.progress >= c.target) justFinished = true;
  }
  return justFinished;
}

/** Advance matching active contracts and return true if any contract just became ready to claim. */
export function recordContractEvent(save: SaveData, kind: FieldContract['kind'], amount = 1, mat?: MaterialId): boolean {
  const list = ensureContracts(save);
  let justFinished = false;
  for (const c of list) {
    if (c.kind !== kind) continue;
    if (kind === 'gather' && c.mat && mat && c.mat !== mat) continue;
    const wasDone = c.progress >= c.target;
    c.progress = Math.min(c.target, c.progress + amount);
    if (!wasDone && c.progress >= c.target) justFinished = true;
  }
  return justFinished;
}

/** How many active contracts are complete and ready to claim at EX-1. */
export function readyContractCount(save: SaveData): number {
  return ensureContracts(save).filter((c) => c.progress >= c.target).length;
}

/** Claim a completed Field Contract, pay its rewards, and rotate in a fresh contract. */
export function claimContract(
  save: SaveData,
  contractId: string,
): { ok: true; credits: number; bonusText: string } | { ok: false; why: string } {
  const list = ensureContracts(save);
  const idx = list.findIndex((c) => c.id === contractId);
  if (idx < 0) return { ok: false, why: 'Contract not found.' };
  const c = list[idx];
  if (c.progress < c.target) return { ok: false, why: 'Contract is still in progress.' };
  save.credits = Math.max(0, Math.floor(save.credits ?? 0)) + c.credits;
  let bonusText = '';
  if (c.bonus === 'egg') {
    const pool = discoveredSpecies(save);
    const sp = pool.length ? pool[Math.floor(Math.random() * pool.length)] : SPECIES_ORDER[0];
    giftEgg(save, sp, true);
    bonusText = ` + Rare ${SPECIES[sp].name} Egg`;
  } else if (c.bonus === 'whorl') {
    save.whorls = (save.whorls ?? 0) + 1;
    bonusText = ' + 1 Echo Whorl';
  }
  save.contractsDone = (save.contractsDone ?? 0) + 1;
  list.splice(idx, 1);
  ensureContracts(save);
  return { ok: true, credits: c.credits, bonusText };
}
