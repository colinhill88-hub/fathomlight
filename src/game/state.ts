/**
 * Everything about the player's progress that needs to survive closing the
 * app, plus automatic saving to the device (localStorage).
 *
 * Saving is automatic: every few seconds while playing, straight after
 * anything important (a scan, a pickup, blacking out), and when the app is
 * sent to the background. Moving a save between devices (a save code) is
 * planned for milestone 11.
 */

export type MaterialId = 'scrap' | 'copper' | 'quartz' | 'fibre';

export const MATERIALS: Record<MaterialId, { name: string; plural: string; blurb: string }> = {
  scrap: { name: 'Scrap metal', plural: 'Scrap metal', blurb: 'Rusted plate and fittings from old wreckage. Base frames and hulls.' },
  copper: { name: 'Copper nodule', plural: 'Copper nodules', blurb: 'Green-crusted lumps half buried in sand. Wiring and turbines.' },
  quartz: { name: 'Quartz', plural: 'Quartz', blurb: 'Clear crystal that grows on reef rock. Dome glass.' },
  fibre: { name: 'Kelp fibre', plural: 'Kelp fibre', blurb: 'Tough golden strands from kelp holdfasts. Seals and filters.' },
};
export const MATERIAL_ORDER: MaterialId[] = ['scrap', 'copper', 'quartz', 'fibre'];

/** Oxygen, in seconds of breathing, for the starting tank and for each tank upgrade. */
export const BASE_OXYGEN = 75;
export const TANK_BONUS = 20;
export const TOTAL_AIR_TANKS = 2;
/** Collected materials grow back after this long (real time). */
export const REGROW_MS = 6 * 60 * 1000;

export interface DroppedBag {
  x: number;
  y: number;
  items: Partial<Record<MaterialId, number>>;
}

export interface SaveData {
  v: 1;
  x: number;
  y: number;
  oxygen: number;
  lampOn: boolean;
  /** Carried materials. There is no storage until the base exists (milestone 3). */
  bag: Record<MaterialId, number>;
  /** Ids of scanner log entries that are complete. */
  scans: string[];
  /** Ids of air tank upgrades found. */
  tanks: string[];
  /** Pickup id -> when it was collected (ms since 1970), so it can grow back. */
  taken: Record<string, number>;
  dropped: DroppedBag | null;
  playSeconds: number;
  savedAt: number;
}

const KEY = 'fathomlight.save.v1';

export function freshSave(spawnX: number, spawnY: number): SaveData {
  return {
    v: 1,
    x: spawnX,
    y: spawnY,
    oxygen: BASE_OXYGEN,
    lampOn: true,
    bag: { scrap: 0, copper: 0, quartz: 0, fibre: 0 },
    scans: [],
    tanks: [],
    taken: {},
    dropped: null,
    playSeconds: 0,
    savedAt: 0,
  };
}

export function loadSave(spawnX: number, spawnY: number): { data: SaveData; loaded: boolean } {
  const fresh = freshSave(spawnX, spawnY);
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { data: fresh, loaded: false };
    const d = JSON.parse(raw) as Partial<SaveData>;
    if (d.v !== 1) return { data: fresh, loaded: false };
    // Fill in anything missing, so older or damaged saves still load.
    const data: SaveData = {
      ...fresh,
      ...d,
      bag: { ...fresh.bag, ...(d.bag ?? {}) },
      scans: Array.isArray(d.scans) ? d.scans : [],
      tanks: Array.isArray(d.tanks) ? d.tanks : [],
      taken: d.taken && typeof d.taken === 'object' ? d.taken : {},
    } as SaveData;
    if (!isFinite(data.x) || !isFinite(data.y)) {
      data.x = spawnX;
      data.y = spawnY;
    }
    return { data, loaded: true };
  } catch {
    return { data: fresh, loaded: false };
  }
}

export function writeSave(d: SaveData): boolean {
  d.savedAt = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: nothing to clear */
  }
}

export function maxOxygen(d: SaveData): number {
  return BASE_OXYGEN + d.tanks.length * TANK_BONUS;
}
