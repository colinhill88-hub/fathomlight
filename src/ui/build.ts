import {
  BaseLayout,
  canAfford,
  available,
  CELL,
  cellAt,
  GRID_BASE,
  GRID_COLS,
  GRID_ROWS,
  GRID_X0,
  GRID_X1,
  isDone,
  pay,
  PIECE_ORDER,
  PIECES,
  PieceKind,
  pieceCode,
  pieceRect,
  Placed,
  shapeOf,
} from '../game/base';
import { MATERIAL_ORDER, MATERIALS, MaterialId, SaveData } from '../game/state';
import {
  Factory,
  FEEDER_MASH_CAP,
  FEEDER_RATE,
  feederStatus,
  HOPPER_CAP,
  lineCode,
  lineCost,
  lineRate,
  lineRoute,
  LineKind,
  LINES,
  linkProblem,
  machineData,
  MASH_PER_FIBRE,
  mashPerCreature,
  PRESS_COPPER_CAP,
  PRESS_PLATE_CAP,
  PRESS_RATE,
  PRESS_SCRAP_CAP,
  pressStatus,
  stuckInTray,
  tierDef,
  tierOf,
  TRAY_CAP,
  trayCount,
  TROUGH_CAP,
  upgradeCost,
  whorlMult,
  whorlsFree,
  WHORLS_PER_PIECE,
} from '../game/factory';
import { creaturesIn, HUNGER_RATE, makeRate, payCost, SPECIES, tankNumber } from '../game/creatures';
import { MATERIAL_ICONS } from './hud';
import { WHORL_ICON } from '../world/whorl';

/**
 * Build mode (milestone 3): lay out the base at the Kestrel site.
 *
 * Touch: tap Build (hammer, top right) near the site. Pick a piece on the
 * bottom bar; it appears at the nearest spot where it fits. Drag anywhere to
 * slide it (it snaps cell by cell), or tap where you want it. Tap the tick
 * to build. With no piece picked, tap a built piece to select it and remove
 * it (all materials come back).
 * Keyboard: B opens and closes, 1-6 pick a piece, arrows or WASD move it,
 * R rotates, Enter or Space builds, Esc lets go of the piece, Tab selects
 * built pieces, Delete or X removes the selected one.
 * Mouse: the piece follows the pointer; click to build, right-click to let go.
 * Gamepad: View/Back opens and closes, LB/RB pick, d-pad moves, A builds,
 * Y rotates, B lets go or closes, X removes.
 */

/** Small side-view icons for the palette, drawn as SVG. */
const PIECE_ICONS: Record<PieceKind, string> = {
  dome:
    '<svg viewBox="0 0 40 32"><path d="M6 20a14 15 0 0 1 28 0z" fill="#86b3ae" opacity=".55"/><path d="M6 20a14 15 0 0 1 28 0" fill="none" stroke="#3b4448" stroke-width="2"/><path d="M20 5v15M13 7c-1 4-1 9 0 13M27 7c1 4 1 9 0 13" stroke="#3b4448" stroke-width="1.3" fill="none"/><rect x="3" y="19" width="34" height="9" rx="2" fill="#5b6467"/><rect x="3" y="22" width="34" height="2.5" fill="#b8923f"/><circle cx="10" cy="26" r="1.4" fill="#ffd9a0"/><circle cx="20" cy="26" r="1.4" fill="#ffd9a0"/><circle cx="30" cy="26" r="1.4" fill="#ffd9a0"/></svg>',
  corridor:
    '<svg viewBox="0 0 40 32"><rect x="2" y="10" width="36" height="13" fill="#5b6467"/><rect x="2" y="15" width="36" height="2.5" fill="#b8923f"/><rect x="9" y="9" width="3" height="15" fill="#3b4448"/><rect x="19" y="9" width="3" height="15" fill="#3b4448"/><rect x="29" y="9" width="3" height="15" fill="#3b4448"/><rect x="0" y="7" width="3" height="19" rx="1" fill="#3b4448"/><rect x="37" y="7" width="3" height="19" rx="1" fill="#3b4448"/></svg>',
  turbine:
    '<svg viewBox="0 0 40 32"><circle cx="20" cy="10" r="9" fill="none" stroke="#3b4448" stroke-width="2.4"/><path d="M20 10l1-7 1 7zM20 10l6 4-7-2zM20 10l-6 4 6-5z" fill="#b8923f"/><circle cx="20" cy="10" r="2" fill="#8a9496"/><rect x="18.5" y="18" width="3" height="5" fill="#5b6467"/><rect x="10" y="22" width="20" height="9" rx="2" fill="#b8923f"/></svg>',
  storage:
    '<svg viewBox="0 0 40 32"><rect x="12" y="3" width="16" height="26" rx="6" fill="#5b6467"/><rect x="12" y="8" width="16" height="2.5" fill="#b8923f"/><circle cx="18" cy="18" r="3" fill="none" stroke="#a8402e" stroke-width="1.4"/><rect x="23" y="13" width="2.5" height="9" fill="#c9a24a"/><rect x="4" y="13" width="8" height="7" fill="#5b6467"/><rect x="28" y="13" width="8" height="7" fill="#5b6467"/></svg>',
  tank:
    '<svg viewBox="0 0 40 32"><rect x="3" y="8" width="34" height="18" fill="#1f4a4c"/><rect x="3" y="8" width="34" height="7" fill="#3d7470" opacity=".6"/><path d="M3 23q8-2 17 0t17 0v3H3z" fill="#b7a47a"/><path d="M14 17c3-3 7-3 9 0-2 3-6 3-9 0zm9 0l3-2v4z" fill="#d27a86"/><rect x="1" y="5" width="38" height="4" rx="1" fill="#a8402e"/><rect x="1" y="25" width="38" height="4" rx="1" fill="#a8402e"/></svg>',
  feeder:
    '<svg viewBox="0 0 40 32"><path d="M8 1h18l-4 9h-10z" fill="#5b6467"/><path d="M12 3h10l-2 5h-6z" fill="#b8923f"/><rect x="9" y="10" width="20" height="9" rx="2" fill="#b8923f"/><circle cx="15" cy="14.5" r="3.4" fill="#8a9496"/><rect x="9" y="19" width="20" height="12" rx="2" fill="#5b6467"/><rect x="13" y="21" width="4" height="8" fill="#9aa84a"/><rect x="29" y="2" width="3" height="22" fill="#8a6a3a"/><rect x="2" y="23" width="7" height="6" fill="#5b6467"/></svg>',
  press:
    '<svg viewBox="0 0 40 32"><rect x="1" y="14" width="4" height="6" fill="#5b6467"/><rect x="35" y="14" width="4" height="6" fill="#5b6467"/><path d="M3 3h11l-2 9H5z" fill="#5b6467"/><rect x="5" y="5" width="3" height="6" fill="#7a685a"/><rect x="9" y="5" width="3" height="6" fill="#5f9a72"/><rect x="13" y="7" width="3" height="18" fill="#3b4448"/><rect x="25" y="7" width="3" height="18" fill="#3b4448"/><rect x="11" y="3" width="19" height="6" rx="1" fill="#b8923f"/><rect x="19" y="9" width="3" height="5" fill="#aab4b5"/><rect x="15" y="14" width="11" height="4" fill="#3b4448"/><rect x="16" y="20" width="9" height="2" fill="#8e9a9c"/><rect x="29" y="16" width="8" height="2" fill="#8e9a9c"/><rect x="29" y="19" width="8" height="2" fill="#8e9a9c"/><rect x="2" y="24" width="36" height="6" rx="1" fill="#3b4448"/><rect x="3" y="26" width="34" height="1.5" fill="#b8923f"/></svg>',
  filter:
    '<svg viewBox="0 0 40 32"><rect x="2" y="12" width="7" height="8" fill="#5b6467"/><rect x="31" y="12" width="7" height="8" fill="#5b6467"/><rect x="17" y="1" width="6" height="6" fill="#5b6467"/><rect x="9" y="6" width="22" height="22" rx="4" fill="#5b6467"/><rect x="9" y="8" width="22" height="2.5" fill="#b8923f"/><circle cx="18" cy="19" r="6" fill="#262d30"/><path d="M18 19l1-5 1 5zM18 19l5 2-5 0zM18 19l-4 3 3-4z" fill="#aab4b5"/><circle cx="27" cy="15" r="2" fill="#a88a4a"/></svg>',
};

export interface BuildDeps {
  save: SaveData;
  layout: BaseLayout;
  /** Screen (CSS px) to world units, using the current camera. */
  toWorld(sx: number, sy: number): { x: number; y: number };
  /** Called after the base changed (a piece placed or removed). */
  changed(fresh: number[]): void;
  toast(text: string, kind?: 'item' | 'scan' | 'big' | 'warn'): void;
  refreshInventory(): void;
  /** Storage capacity of the base. */
  capacity(): number;
  /** Is the build drone repaired? Nothing can be built without it. */
  droneReady(): boolean;
  /** The frame the drone is welding right now, if any. */
  welding(): Placed | null;
  /** Milestone 5: the machines and lines, for readouts. */
  factory: Factory;
  /** The conveyor or pipe drawn near a world point, if any. */
  lineAt(x: number, y: number, reach: number): number | null;
  /** The drawn path of a line. */
  lineRoute(id: number): [number, number][] | null;
  /** Called after lines or fitted whorls changed. */
  linesChanged(): void;
  /** Open the whole-base rates overview (milestone 5 part 2). */
  showRates(): void;
}

/** The build camera: where it looks (world centre) and how much height it shows. */
export interface BuildCam {
  x: number;
  y: number;
  h: number;
}

/** Said whenever the build drone is still missing. */
export const NO_DRONE =
  'Needs the build drone. A Kestrel drone went missing near the survey sled wreck, in the sand channel east of the coral garden. Repair it first.';

interface Ghost {
  kind: PieceKind;
  rot: number;
  gx: number;
  gy: number;
}

export class BuildMode {
  active = false;
  ghost: Ghost | null = null;
  selected: Placed | null = null;
  /** A selected conveyor or pipe (milestone 5). */
  selectedLine: number | null = null;
  /**
   * Drawing a conveyor or pipe. The anchor end is the piece it was started
   * from (either end, milestone 5 part 2); the other end is the piece tapped
   * next. `tier` is the line tier being drawn (CB-1 / CB-2, FL-1 / FL-2).
   */
  link: { kind: LineKind; from: number | null; to: number | null; anchor: 'from' | 'to'; tier: number } | null = null;
  /** The tier last drawn, per kind, so the next line starts on it. */
  private lastTier: Record<LineKind, number> = { belt: 1, pipe: 1 };
  /** Where the build camera looks. main.ts follows it while building. */
  cam: BuildCam = { x: 0, y: 0, h: 860 };
  /** Can the build button be used right now (the diver is at the site)? */
  available = false;

  private btn = document.getElementById('build-btn') as HTMLButtonElement;
  private bar = document.getElementById('build-bar')!;
  private info = document.getElementById('build-info')!;
  private placeBtn = document.getElementById('build-place') as HTMLButtonElement;
  private rotateBtn = document.getElementById('build-rotate') as HTMLButtonElement;
  private cancelBtn = document.getElementById('build-cancel') as HTMLButtonElement;
  private removeBtn = document.getElementById('build-remove') as HTMLButtonElement;
  private fitBtn = document.getElementById('build-fit') as HTMLButtonElement;
  private beltBtn = document.getElementById('build-belt') as HTMLButtonElement;
  private pipeBtn = document.getElementById('build-pipe') as HTMLButtonElement;
  private beltInBtn = document.getElementById('build-belt-in') as HTMLButtonElement;
  private pipeInBtn = document.getElementById('build-pipe-in') as HTMLButtonElement;
  private tierBtn = document.getElementById('build-tier') as HTMLButtonElement;
  private upgradeBtn = document.getElementById('build-upgrade') as HTMLButtonElement;
  private ratesBtn = document.getElementById('build-rates') as HTMLButtonElement;
  private whorlAddBtn = document.getElementById('build-whorl-add') as HTMLButtonElement;
  private whorlTakeBtn = document.getElementById('build-whorl-take') as HTMLButtonElement;
  private cards = new Map<PieceKind, HTMLButtonElement>();
  private removeArmed = 0;
  private reason: string | null = null;
  /** Touch points on the screen, for pinch and pan. */
  private touches = new Map<number, { x: number; y: number }>();
  private pinch: { d0: number; h0: number; wx: number; wy: number } | null = null;
  private pan: { id: number; sx: number; sy: number; cx: number; cy: number } | null = null;

  // Dragging the ghost with a finger (relative, so the finger never hides it).
  private drag: { id: number; sx: number; sy: number; wx: number; wy: number; t: number; moved: boolean; mouse: boolean } | null = null;
  /** Unsnapped centre of the ghost while dragging. */
  private float = { x: 0, y: 0 };
  private padPrev: boolean[] = [];
  private padRepeat = 0;

  constructor(
    host: HTMLElement,
    private readonly deps: BuildDeps,
  ) {
    for (const kind of PIECE_ORDER) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'piece-card';
      b.dataset.kind = kind;
      this.bar.appendChild(b);
      this.cards.set(kind, b);
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', () => this.pick(this.ghost?.kind === kind ? null : kind));
    }
    this.btn.addEventListener('click', () => this.toggle());
    const tap = (el: HTMLElement, fn: () => void) => {
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
      el.addEventListener('click', fn);
    };
    tap(this.placeBtn, () => this.place());
    tap(this.rotateBtn, () => this.rotate());
    tap(this.cancelBtn, () => (this.ghost ? this.pick(null) : this.close()));
    tap(this.removeBtn, () => this.remove());
    tap(this.fitBtn, () => this.fit());
    tap(this.beltBtn, () => this.startLink('belt', 'from'));
    tap(this.pipeBtn, () => this.startLink('pipe', 'from'));
    tap(this.beltInBtn, () => this.startLink('belt', 'to'));
    tap(this.pipeInBtn, () => this.startLink('pipe', 'to'));
    tap(this.tierBtn, () => this.cycleTier());
    tap(this.upgradeBtn, () => this.upgradeLine());
    tap(this.ratesBtn, () => this.deps.showRates());
    tap(this.whorlAddBtn, () => this.fitWhorl(1));
    tap(this.whorlTakeBtn, () => this.fitWhorl(-1));

    host.addEventListener('pointerdown', (e) => this.down(e));
    host.addEventListener('pointermove', (e) => this.move(e));
    host.addEventListener('pointerup', (e) => this.up(e));
    host.addEventListener('pointercancel', (e) => {
      this.drag = null;
      this.pan = null;
      this.touches.delete(e.pointerId);
      if (this.touches.size < 2) this.pinch = null;
    });
    host.addEventListener('wheel', (e) => this.wheel(e), { passive: false });
    host.addEventListener('contextmenu', (e) => {
      if (this.active) {
        e.preventDefault();
        this.pick(null);
      }
    });
    window.addEventListener('keydown', (e) => this.key(e));
  }

  toggle(): void {
    if (this.active) this.close();
    else if (this.available) this.open();
  }

  open(): void {
    if (this.active) return;
    this.active = true;
    this.selected = null;
    this.selectedLine = null;
    this.link = null;
    this.ghost = null;
    this.fit(true);
    document.body.classList.add('building');
    this.btn.setAttribute('aria-pressed', 'true');
    this.refresh();
  }

  close(): void {
    if (!this.active) return;
    this.active = false;
    this.ghost = null;
    this.selected = null;
    this.selectedLine = null;
    this.link = null;
    this.drag = null;
    this.pan = null;
    this.pinch = null;
    this.touches.clear();
    document.body.classList.remove('building');
    this.btn.setAttribute('aria-pressed', 'false');
  }

  /** Pick a piece to place (null lets go of it). It appears at the nearest spot where it fits. */
  pick(kind: PieceKind | null): void {
    this.selected = null;
    this.selectedLine = null;
    this.link = null;
    if (!kind) {
      this.ghost = null;
      this.refresh();
      return;
    }
    const prev = this.ghost;
    const rot = prev && prev.kind === kind ? prev.rot : 0;
    this.ghost = { kind, rot, gx: 0, gy: 0 };
    this.snapToBest(prev ? this.ghostCentre(prev) : null);
    this.refresh();
  }

  private ghostCentre(g: Ghost): { x: number; y: number } {
    const r = pieceRect(g);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  /** Move the ghost to the valid spot nearest a point (or the middle of the base). */
  private snapToBest(near: { x: number; y: number } | null): void {
    const g = this.ghost;
    if (!g) return;
    const layout = this.deps.layout;
    // Near the middle of the view (the site is big: start where you are looking).
    const target = near ?? { x: this.cam.x, y: this.cam.y };
    let best: { gx: number; gy: number } | null = null;
    let bestD = Infinity;
    for (const s of layout.validSpots(g.kind, g.rot)) {
      const c = this.ghostCentre({ ...g, ...s });
      // Prefer low spots a little, so the base grows along the seabed.
      const d = Math.hypot(c.x - target.x, c.y - target.y) + s.gy * 40;
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (best) {
      g.gx = best.gx;
      g.gy = best.gy;
    } else this.moveGhostTo(target.x, target.y);
    this.float = this.ghostCentre(g);
    this.keepInView(pieceRect(g));
  }

  /** Put the ghost's centre as near a world point as the grid allows. */
  private moveGhostTo(x: number, y: number): void {
    const g = this.ghost;
    if (!g) return;
    const s = shapeOf(g);
    g.gx = Math.max(0, Math.min(GRID_COLS - s.w, Math.round((x - GRID_X0) / CELL - s.w / 2)));
    g.gy = Math.max(0, Math.min(GRID_ROWS - s.h, Math.round((GRID_BASE - y) / CELL - s.h / 2)));
  }

  rotate(): void {
    const g = this.ghost;
    if (!g || PIECES[g.kind].shapes.length < 2) return;
    g.rot = (g.rot + 1) % PIECES[g.kind].shapes.length;
    const at = this.ghostCentre(g);
    const ok = !this.deps.layout.check(g);
    if (!ok) this.snapToBest(at);
    this.refresh();
  }

  place(): void {
    if (this.link) {
      this.buildLink();
      return;
    }
    const g = this.ghost;
    if (!g) return;
    const { save, layout } = this.deps;
    const why = layout.check(g);
    if (why) {
      this.deps.toast(why, 'warn');
      return;
    }
    if (!this.deps.droneReady()) {
      this.deps.toast(NO_DRONE, 'warn');
      return;
    }
    if (!canAfford(g.kind, save.bag, save.stored)) {
      this.deps.toast(`Not enough materials for a ${PIECES[g.kind].name.toLowerCase()}`, 'warn');
      return;
    }
    pay(g.kind, save.bag, save.stored);
    const id = save.nextPieceId++;
    // Placed as a frame: the build drone welds it together over time.
    const placed: Placed = { id, kind: g.kind, gx: g.gx, gy: g.gy, rot: g.rot, progress: 0 };
    layout.set([...layout.pieces, placed]);
    save.pieces = layout.pieces;
    const def = PIECES[g.kind];
    const queued = layout.frames().length;
    this.deps.toast(
      `Frame placed: ${def.name.toLowerCase()}. The drone will weld it (about ${def.buildTime} s)${queued > 1 ? `, after ${queued - 1} other frame${queued > 2 ? 's' : ''}` : ''}. You can swim off meanwhile.`,
      'big',
    );
    this.deps.changed([id]);
    this.deps.refreshInventory();
    // Keep the same piece in hand for the next one, if there is enough for it.
    if (canAfford(g.kind, save.bag, save.stored)) this.snapToBest(this.ghostCentre(g));
    else this.ghost = null;
    this.refresh();
  }

  /** Put materials back: into storage while there is room, the rest carried. */
  private refund(cost: Partial<Record<MaterialId, number>>): void {
    const { save } = this.deps;
    let room = this.deps.capacity() - MATERIAL_ORDER.reduce((a, k) => a + save.stored[k], 0);
    for (const k of MATERIAL_ORDER) {
      const n = cost[k] ?? 0;
      const s = Math.max(0, Math.min(room, n));
      save.stored[k] += s;
      save.bag[k] += n - s;
      room -= s;
    }
  }

  remove(): void {
    const p = this.selected;
    const lineId = this.selectedLine;
    if (!p && lineId === null) return;
    if (Date.now() - this.removeArmed > 3000) {
      this.removeArmed = Date.now();
      this.refresh();
      return;
    }
    this.removeArmed = 0;
    const { save, layout } = this.deps;
    if (!p) {
      // A conveyor or pipe: its materials come back.
      const l = save.lines.find((q) => q.id === lineId);
      this.selectedLine = null;
      if (l) {
        this.refund(this.lineCostOf(l));
        save.lines = save.lines.filter((q) => q.id !== l.id);
        this.deps.toast(`Removed: ${LINES[l.kind].name}. Materials returned.`);
        this.deps.linesChanged();
        this.deps.refreshInventory();
      }
      this.refresh();
      return;
    }
    if (p.kind === 'tank' && save.creatures.some((c) => c.tank === p.id)) {
      this.deps.toast('Creatures live in this tank. Move them to another tank or release them first (tap Tend at the tank).', 'warn');
      this.refresh();
      return;
    }
    // Its lines go too, and come back as materials.
    const lines = save.lines.filter((l) => l.from === p.id || l.to === p.id);
    for (const l of lines) this.refund(this.lineCostOf(l));
    save.lines = save.lines.filter((l) => !lines.includes(l));
    // What a machine holds goes back too (a feeder's fibre, a press's scrap,
    // copper and plates, a tank's output tray); fitted whorls come off.
    const m = save.machines[String(p.id)];
    if (m) this.refund({ fibre: Math.floor(m.fibre), scrap: m.scrap ?? 0, copper: m.copper ?? 0, plate: m.plate ?? 0 });
    const tray = save.tankData[String(p.id)]?.out;
    if (tray) this.refund(tray);
    delete save.machines[String(p.id)];
    const whorls = save.fitted[String(p.id)] ?? 0;
    delete save.fitted[String(p.id)];
    layout.set(layout.pieces.filter((q) => q.id !== p.id));
    save.pieces = layout.pieces;
    // Everything comes back: into storage while there is room (so the dive
    // bag does not suddenly weigh a tonne), the rest carried.
    this.refund(PIECES[p.kind].cost);
    // If a storage pod went, what no longer fits is handed back to carry.
    const cap = this.deps.capacity();
    let over = MATERIAL_ORDER.reduce((a, k) => a + save.stored[k], 0) - cap;
    for (const k of MATERIAL_ORDER) {
      if (over <= 0) break;
      const n = Math.min(over, save.stored[k]);
      save.stored[k] -= n;
      save.bag[k] += n;
      over -= n;
    }
    const extra = [lines.length ? `${lines.length} line${lines.length > 1 ? 's' : ''} with it` : '', whorls ? `${whorls} whorl${whorls > 1 ? 's' : ''} taken out` : '']
      .filter(Boolean)
      .join(', ');
    this.deps.toast(`Removed: ${PIECES[p.kind].name}${isDone(p) ? '' : ' frame'}${extra ? ` (${extra})` : ''}. Materials returned.`);
    this.selected = null;
    this.deps.changed([]);
    if (lines.length || whorls) this.deps.linesChanged();
    this.deps.refreshInventory();
    this.refresh();
  }

  // ---- Conveyors and feed pipes (milestone 5) ----

  private lineCostOf(l: { id: number; kind: LineKind; from: number; to: number; tier?: number }): Partial<Record<MaterialId, number>> {
    return lineCost(l.kind, this.lineCells(l), tierOf(l));
  }

  private piece(id: number | null | undefined): Placed | undefined {
    return id === null || id === undefined ? undefined : this.deps.layout.pieces.find((p) => p.id === id);
  }

  /**
   * Start drawing a conveyor or pipe at the selected piece. `anchor` says
   * which end the selected piece is: 'from' (Conveyor to…) or 'to'
   * (Conveyor from…).
   */
  startLink(kind: LineKind, anchor: 'from' | 'to' = 'from'): void {
    const p = this.selected;
    if (!p) return;
    this.link = { kind, from: anchor === 'from' ? p.id : null, to: anchor === 'to' ? p.id : null, anchor, tier: this.bestTier(kind) };
    this.selectedLine = null;
    this.refresh();
  }

  /** The tier to start a new line on: the last one drawn, if it is unlocked. */
  private bestTier(kind: LineKind): number {
    return this.tierUnlocked(kind, this.lastTier[kind]) ? this.lastTier[kind] : 1;
  }

  /** Higher tiers need hull plating, so they show once the base has made some. */
  private tierUnlocked(kind: LineKind, tier: number): boolean {
    if (tier <= 1) return true;
    const { save } = this.deps;
    return tier <= LINES[kind].tiers.length && (save.bag.plate + save.stored.plate > 0 || save.lines.some((l) => tierOf(l) >= tier));
  }

  /** Switch the tier of the line being drawn (CB-1 ⇄ CB-2, FL-1 ⇄ FL-2). */
  cycleTier(): void {
    const l = this.link;
    if (!l) return;
    const n = LINES[l.kind].tiers.length;
    l.tier = (l.tier % n) + 1;
    this.lastTier[l.kind] = l.tier;
    this.refresh();
  }

  /** The two ends of the line being drawn (the unknown one is undefined). */
  private linkEnds(): { from?: Placed; to?: Placed } {
    const l = this.link;
    return l ? { from: this.piece(l.from), to: this.piece(l.to) } : {};
  }

  /** The piece the line was started from. */
  private linkAnchor(): Placed | undefined {
    const l = this.link;
    return l ? this.piece(l[l.anchor]) : undefined;
  }

  /** Why a line between the anchor and `p` can't be built, or null if it can. */
  private linkWhy(p: Placed): string | null {
    const l = this.link;
    const a = this.linkAnchor();
    if (!l || !a) return 'Pick a piece';
    const { save, layout } = this.deps;
    return l.anchor === 'from' ? linkProblem(save, layout, l.kind, a, p) : linkProblem(save, layout, l.kind, p, a);
  }

  /** Set the other end of the line being drawn (null clears it). */
  private setLinkOther(id: number | null): void {
    const l = this.link;
    if (!l) return;
    if (l.anchor === 'from') l.to = id;
    else l.from = id;
  }

  /** The other end of the line being drawn, if chosen. */
  private linkOther(): number | null {
    const l = this.link;
    return l ? (l.anchor === 'from' ? l.to : l.from) : null;
  }

  /** Pieces the line being drawn could join to the anchor. */
  private linkTargets(): Placed[] {
    const a = this.linkAnchor();
    if (!a) return [];
    return this.deps.layout.pieces.filter((p) => p.id !== a.id && !this.linkWhy(p));
  }

  /** What the line being drawn would look like and cost, for the overlay. */
  linkPreview(): { from: Placed; targets: Placed[]; route: [number, number][] | null; ok: boolean } | null {
    const l = this.link;
    const anchor = this.linkAnchor();
    if (!l || !anchor) return null;
    const { from, to } = this.linkEnds();
    const { save } = this.deps;
    const route = from && to ? lineRoute(from, to, l.kind, save.lines.filter((q) => q.kind === l.kind && q.from === from.id).length).pts : null;
    return { from: anchor, targets: this.linkTargets(), route, ok: !this.reason };
  }

  private buildLink(): void {
    const l = this.link;
    const { from, to } = this.linkEnds();
    if (!l || !from || !to) return;
    const { save, layout } = this.deps;
    const why = linkProblem(save, layout, l.kind, from, to);
    if (why) {
      this.deps.toast(why, 'warn');
      return;
    }
    const slot = save.lines.filter((q) => q.kind === l.kind && q.from === from.id).length;
    const cells = lineRoute(from, to, l.kind, slot).cells;
    const cost = lineCost(l.kind, cells, l.tier);
    if (!payCost(save, cost)) {
      this.deps.toast(`Not enough materials for this ${LINES[l.kind].name.toLowerCase()}`, 'warn');
      return;
    }
    const line = { id: save.nextLineId++, kind: l.kind, from: from.id, to: to.id, tier: l.tier };
    save.lines.push(line);
    const def = LINES[l.kind];
    this.deps.toast(
      `${lineCode(line)} ${def.name.toLowerCase()} built: ${pieceCode(layout, from)} to ${pieceCode(layout, to)} (${cells} cell${cells > 1 ? 's' : ''}). It moves up to ${lineRate(line)} ${def.unit}.`,
      'big',
    );
    if (!save.tips.includes('lines')) {
      save.tips.push('lines');
      setTimeout(
        () =>
          this.deps.toast(
            'Tap a conveyor or pipe to see how much it moves per minute. Conveyors carry whatever the far end needs: kelp fibre to a feeder, scrap and copper to a plate press, anything to storage.',
            'big',
          ),
        2600,
      );
    }
    this.link = null;
    this.deps.linesChanged();
    this.deps.refreshInventory();
    this.refresh();
  }

  /** Cells a built line covers (for refunds and upgrades). */
  private lineCells(l: { id: number; kind: LineKind; from: number; to: number }): number {
    const route = this.deps.lineRoute(l.id);
    if (route) {
      let len = 0;
      for (let i = 1; i < route.length; i++) len += Math.abs(route[i][0] - route[i - 1][0]) + Math.abs(route[i][1] - route[i - 1][1]);
      return Math.max(1, Math.ceil(len / CELL));
    }
    const a = this.piece(l.from);
    const b = this.piece(l.to);
    return a && b ? lineRoute(a, b, l.kind).cells : 1;
  }

  /** Upgrade the selected line to the next tier (CB-1 → CB-2, FL-1 → FL-2), paying the difference. */
  upgradeLine(): void {
    const { save, layout } = this.deps;
    const l = save.lines.find((q) => q.id === this.selectedLine);
    if (!l) return;
    const tier = tierOf(l);
    if (tier >= LINES[l.kind].tiers.length) return;
    const cost = upgradeCost(l.kind, this.lineCells(l), tier);
    if (!payCost(save, cost)) {
      const missing = MATERIAL_ORDER.filter((k) => (cost[k] ?? 0) > save.bag[k] + save.stored[k]).map((k) => MATERIALS[k].name.toLowerCase());
      this.deps.toast(`Need more ${missing.join(' and ')}${missing.includes('hull plating') ? ' (made by a plate press)' : ''}`, 'warn');
      return;
    }
    l.tier = tier + 1;
    this.lastTier[l.kind] = tier + 1;
    void layout;
    this.deps.toast(`Upgraded to ${lineCode(l)}: it now moves up to ${lineRate(l)} ${LINES[l.kind].unit}`, 'big');
    this.deps.linesChanged();
    this.deps.refreshInventory();
    this.refresh();
  }

  /** Fit (+1) or take out (-1) an Echo whorl on the selected piece. */
  fitWhorl(step: 1 | -1): void {
    const p = this.selected;
    if (!p || !PIECES[p.kind].whorls) return;
    const { save } = this.deps;
    const k = String(p.id);
    const n = save.fitted[k] ?? 0;
    if (step > 0) {
      if (n >= WHORLS_PER_PIECE) return this.deps.toast(`Two whorls is the most one piece can hold`, 'warn');
      if (!whorlsFree(save)) return this.deps.toast('No spare Echo whorls. They are rare: look in hidden corners of the reef.', 'warn');
      save.fitted[k] = n + 1;
    } else {
      if (!n) return;
      if (n > 1) save.fitted[k] = n - 1;
      else delete save.fitted[k];
    }
    const m = whorlMult(save, p.id);
    this.deps.toast(
      step > 0
        ? `Echo whorl fitted: the ${PIECES[p.kind].name.toLowerCase()} works ×${m} as fast, and uses its ${p.kind === 'tank' ? 'feed (and fouls the water)' : 'kelp fibre'} ×${m} as fast too`
        : `Echo whorl taken out (×${m} now)`,
      'big',
    );
    this.deps.linesChanged();
    this.refresh();
  }

  // ---- Camera (milestone 5: the site is big) ----

  /** The most height the camera may show: the whole site with a margin. */
  private maxH(): number {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const siteW = GRID_X1 - GRID_X0 + 500;
    const siteH = GRID_BASE + 300;
    const whole = Math.max(siteH, (siteW * H) / W) * 1.1;
    // Phones stop a little short of the whole site (it still shows almost all
    // of its width), which keeps the frame rate up; a PC sees everything.
    return document.body.classList.contains('touch') ? Math.min(2800, whole) : whole;
  }

  private clampCam(): void {
    const c = this.cam;
    c.h = Math.max(320, Math.min(this.maxH(), c.h));
    c.x = Math.max(GRID_X0 - 100, Math.min(GRID_X1 + 100, c.x));
    c.y = Math.max(-150, Math.min(GRID_BASE + 150, c.y));
  }

  /**
   * Frame what is built so far (with room around it for the next pieces),
   * or the shelf by the buoy if nothing is built yet.
   */
  fit(quiet = false): void {
    const { layout } = this.deps;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const p of layout.pieces) {
      const r = pieceRect(p);
      x0 = Math.min(x0, r.x);
      y0 = Math.min(y0, r.y - 60);
      x1 = Math.max(x1, r.x + r.w);
      y1 = Math.max(y1, r.y + r.h);
    }
    if (!layout.pieces.length) {
      x0 = GRID_X1 - 11 * CELL;
      x1 = GRID_X1;
      y0 = 80;
      y1 = 460;
    }
    x0 -= CELL * 1.5;
    x1 += CELL * 1.5;
    y0 -= CELL;
    y1 += CELL * 0.6;
    const W = window.innerWidth;
    const H = window.innerHeight;
    // Leave room for the info box at the top and the piece bar at the bottom.
    const useH = 0.66;
    this.cam.h = Math.max(860, (y1 - y0) / useH, ((x1 - x0) * H) / W);
    this.cam.x = (x0 + x1) / 2;
    // The middle of the usable band sits a little above the screen's middle.
    this.cam.y = (y0 + y1) / 2 + this.cam.h * 0.04;
    this.clampCam();
    if (!quiet) this.refresh();
  }

  /** Pan so a rectangle (a piece being placed) is on screen. */
  private keepInView(r: { x: number; y: number; w: number; h: number }): void {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const c = this.cam;
    const vw = (c.h * W) / H;
    const mx = Math.min(vw * 0.3, 220);
    const top = c.y - c.h * 0.32;
    const bot = c.y + c.h * 0.28;
    if (r.x < c.x - vw / 2 + mx) c.x = r.x - mx + vw / 2;
    if (r.x + r.w > c.x + vw / 2 - mx) c.x = r.x + r.w + mx - vw / 2;
    if (r.y < top) c.y += r.y - top;
    if (r.y + r.h > bot) c.y += r.y + r.h - bot;
    this.clampCam();
  }

  /** World point under a screen point, using where the camera is heading. */
  private camWorld(sx: number, sy: number): { x: number; y: number } {
    const H = window.innerHeight;
    const W = window.innerWidth;
    const k = this.cam.h / H;
    return { x: this.cam.x + (sx - W / 2) * k, y: this.cam.y + (sy - H / 2) * k };
  }

  /** Zoom by a factor, keeping the world point under a screen point still. */
  private zoomAt(sx: number, sy: number, factor: number): void {
    const w = this.camWorld(sx, sy);
    const H = window.innerHeight;
    const W = window.innerWidth;
    this.cam.h *= factor;
    this.clampCam();
    const k = this.cam.h / H;
    this.cam.x = w.x - (sx - W / 2) * k;
    this.cam.y = w.y - (sy - H / 2) * k;
    this.clampCam();
  }

  private wheel(e: WheelEvent): void {
    if (!this.active) return;
    e.preventDefault();
    const d = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
    this.zoomAt(e.clientX, e.clientY, Math.exp(Math.max(-0.5, Math.min(0.5, d * 0.0016))));
  }

  // ---- Pointer ----

  private down(e: PointerEvent): void {
    if (!this.active) return;
    const mouse = e.pointerType === 'mouse';
    // Middle mouse button: pan the view.
    if (mouse && e.button === 1) {
      e.preventDefault();
      this.pan = { id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: this.cam.x, cy: this.cam.y };
      return;
    }
    if (mouse && e.button !== 0) return;
    if (!mouse) {
      this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.touches.size === 2) {
        // Two fingers: pinch to zoom and drag to pan. Cancels the one-finger gesture.
        const [a, b] = [...this.touches.values()];
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const w = this.camWorld(mid.x, mid.y);
        this.pinch = { d0: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), h0: this.cam.h, wx: w.x, wy: w.y };
        this.drag = null;
        this.pan = null;
        return;
      }
      if (this.touches.size > 2) return;
    }
    const w = this.deps.toWorld(e.clientX, e.clientY);
    this.drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, wx: w.x, wy: w.y, t: performance.now(), moved: false, mouse };
    if (this.ghost) this.float = this.ghostCentre(this.ghost);
    else this.pan = { id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: this.cam.x, cy: this.cam.y };
  }

  private move(e: PointerEvent): void {
    if (!this.active) return;
    if (this.touches.has(e.pointerId)) this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinch && this.touches.size >= 2) {
      const [a, b] = [...this.touches.values()];
      const d = Math.max(20, Math.hypot(a.x - b.x, a.y - b.y));
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      this.cam.h = this.pinch.h0 * (this.pinch.d0 / d);
      this.clampCam();
      const k = this.cam.h / window.innerHeight;
      this.cam.x = this.pinch.wx - (mid.x - window.innerWidth / 2) * k;
      this.cam.y = this.pinch.wy - (mid.y - window.innerHeight / 2) * k;
      this.clampCam();
      return;
    }
    const pan = this.pan;
    if (pan && pan.id === e.pointerId) {
      const moved = Math.hypot(e.clientX - pan.sx, e.clientY - pan.sy) > 8;
      if (this.drag && this.drag.id === e.pointerId && moved) this.drag.moved = true;
      if (moved || !this.drag) {
        const k = this.cam.h / window.innerHeight;
        this.cam.x = pan.cx - (e.clientX - pan.sx) * k;
        this.cam.y = pan.cy - (e.clientY - pan.sy) * k;
        this.clampCam();
      }
      return;
    }
    if (e.pointerType === 'mouse' && this.ghost) {
      // The ghost follows the mouse.
      const w = this.deps.toWorld(e.clientX, e.clientY);
      const before = `${this.ghost.gx},${this.ghost.gy}`;
      this.moveGhostTo(w.x, w.y);
      if (before !== `${this.ghost.gx},${this.ghost.gy}`) this.refresh();
      return;
    }
    if (e.pointerType === 'mouse' && this.link && !this.drag) {
      // Hovering over a piece previews the line to it.
      const w = this.deps.toWorld(e.clientX, e.clientY);
      const c = cellAt(w.x, w.y);
      const p = this.deps.layout.pieceAt(c.gx, c.gy);
      const other = p && this.linkTargets().includes(p) ? p.id : null;
      if (other !== this.linkOther()) {
        this.setLinkOther(other);
        this.refresh();
      }
      return;
    }
    const d = this.drag;
    if (!d || d.id !== e.pointerId || d.mouse) return;
    if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 8) d.moved = true;
    if (!d.moved || !this.ghost) return;
    // Slide the ghost by how far the finger moved (in world units).
    const w = this.deps.toWorld(e.clientX, e.clientY);
    const x = this.float.x + (w.x - d.wx);
    const y = this.float.y + (w.y - d.wy);
    const before = `${this.ghost.gx},${this.ghost.gy}`;
    this.moveGhostTo(x, y);
    if (before !== `${this.ghost.gx},${this.ghost.gy}`) {
      this.keepInView(pieceRect(this.ghost));
      this.refresh();
    }
  }

  private up(e: PointerEvent): void {
    this.touches.delete(e.pointerId);
    if (this.pinch) {
      if (this.touches.size < 2) this.pinch = null;
      this.drag = null;
      this.pan = null;
      return;
    }
    if (this.pan?.id === e.pointerId) this.pan = null;
    const d = this.drag;
    if (!this.active || !d || d.id !== e.pointerId) return;
    this.drag = null;
    if (d.moved) return;
    // A tap (or click).
    const w = this.deps.toWorld(e.clientX, e.clientY);
    if (this.ghost) {
      if (d.mouse) {
        this.place();
        return;
      }
      this.moveGhostTo(w.x, w.y);
      this.float = this.ghostCentre(this.ghost);
      this.refresh();
      return;
    }
    const c = cellAt(w.x, w.y);
    const hit = this.deps.layout.pieceAt(c.gx, c.gy) ?? null;
    if (this.link) {
      // Choose the other end of the line.
      if (!hit) return;
      const anchor = this.linkAnchor();
      if (anchor && hit.id === anchor.id) {
        this.link = null;
        this.refresh();
        return;
      }
      const why = this.linkWhy(hit);
      if (why) this.deps.toast(why, 'warn');
      this.setLinkOther(why ? null : hit.id);
      this.refresh();
      // On a computer, a click on a valid target builds straight away.
      if (!why && d.mouse) this.place();
      return;
    }
    // Lines are thin: prefer one under the tap, then a piece.
    const k = this.cam.h / window.innerHeight;
    const line = this.deps.lineAt(w.x, w.y, Math.max(14, 22 * k));
    this.selectedLine = line !== null && (!hit || this.deps.lineAt(w.x, w.y, Math.max(8, 10 * k)) !== null) ? line : null;
    this.selected = this.selectedLine === null ? hit : null;
    this.removeArmed = 0;
    this.refresh();
  }

  // ---- Keyboard and gamepad ----

  private key(e: KeyboardEvent): void {
    if (e.repeat && !['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd', '=', '+', '-', 'q', 'e'].includes(e.key.toLowerCase())) return;
    const k = e.key.toLowerCase();
    if (k === 'b') {
      this.toggle();
      return;
    }
    if (!this.active) return;
    const idx = ['1', '2', '3', '4', '5', '6', '7', '8'].indexOf(k);
    const step = (this.cam.h * 0.12);
    if (idx >= 0) this.pick(PIECE_ORDER[idx]);
    else if (k === 'arrowleft') this.nudge(-1, 0);
    else if (k === 'arrowright') this.nudge(1, 0);
    else if (k === 'arrowup') this.nudge(0, 1);
    else if (k === 'arrowdown') this.nudge(0, -1);
    else if (k === 'a') this.panBy(-step, 0);
    else if (k === 'd') this.panBy(step, 0);
    else if (k === 'w') this.panBy(0, -step);
    else if (k === 's') this.panBy(0, step);
    else if (k === '=' || k === '+' || k === 'e') this.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.2);
    else if (k === '-' || k === 'q') this.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.2);
    else if (k === 'f') this.fit();
    else if ((k === 'c' || k === 'p') && this.selected && !this.ghost) {
      // C / P draw a conveyor / pipe out of the selected piece; with Shift (or
      // when the piece only takes one in), into it.
      const kind: LineKind = k === 'c' ? 'belt' : 'pipe';
      const ports = PIECES[this.selected.kind].ports;
      const out = ports?.[kind === 'belt' ? 'beltOut' : 'pipeOut'];
      const inn = ports?.[kind === 'belt' ? 'beltIn' : 'pipeIn'];
      if (inn && (e.shiftKey || !out)) this.startLink(kind, 'to');
      else if (out) this.startLink(kind, 'from');
    } else if (k === 'u') {
      if (this.link) this.cycleTier();
      else this.upgradeLine();
    } else if (k === 'o') this.deps.showRates();
    else if (k === 'r') this.rotate();
    else if (k === 'enter' || k === ' ') this.place();
    else if (k === 'escape') {
      if (this.link) {
        this.link = null;
        this.refresh();
      } else if (this.ghost) this.pick(null);
      else this.close();
    } else if (k === 'tab') this.cycleSelection();
    else if (k === 'delete' || k === 'backspace' || k === 'x') this.remove();
    else return;
    e.preventDefault();
  }

  private panBy(dx: number, dy: number): void {
    this.cam.x += dx;
    this.cam.y += dy;
    this.clampCam();
  }

  private nudge(dx: number, dy: number): void {
    const g = this.ghost;
    if (!g) {
      this.panBy(dx * this.cam.h * 0.12, -dy * this.cam.h * 0.12);
      return;
    }
    const s = shapeOf(g);
    g.gx = Math.max(0, Math.min(GRID_COLS - s.w, g.gx + dx));
    g.gy = Math.max(0, Math.min(GRID_ROWS - s.h, g.gy + dy));
    this.float = this.ghostCentre(g);
    this.keepInView(pieceRect(g));
    this.refresh();
  }

  private cycleSelection(step = 1): void {
    const ps = [...this.deps.layout.pieces].sort((a, b) => a.gx - b.gx || a.gy - b.gy);
    if (!ps.length) return;
    this.ghost = null;
    this.link = null;
    this.selectedLine = null;
    const i = this.selected ? ps.findIndex((p) => p.id === this.selected!.id) : -1;
    this.selected = ps[(i + step + ps.length) % ps.length];
    this.keepInView(pieceRect(this.selected));
    this.removeArmed = 0;
    this.refresh();
  }

  /** Poll the gamepad (call every frame). */
  pollPad(dt: number): void {
    const pad = (navigator.getGamepads?.() ?? []).find((p) => !!p);
    if (!pad) return;
    const btn = (i: number) => !!pad.buttons[i]?.pressed;
    const pressed = (i: number) => btn(i) && !this.padPrev[i];
    if (pressed(8)) this.toggle();
    if (this.active) {
      if (pressed(0)) this.place();
      if (pressed(1)) {
        if (this.link) {
          this.link = null;
          this.refresh();
        } else if (this.ghost) this.pick(null);
        else this.close();
      }
      if (pressed(3)) this.rotate();
      if (pressed(2)) this.remove();
      const cur = this.ghost ? PIECE_ORDER.indexOf(this.ghost.kind) : -1;
      if (pressed(5)) this.pick(PIECE_ORDER[(cur + 1) % PIECE_ORDER.length]);
      if (pressed(4)) this.pick(PIECE_ORDER[(cur - 1 + PIECE_ORDER.length) % PIECE_ORDER.length]);
      // Triggers zoom; the right stick pans.
      const lt = pad.buttons[6]?.value ?? 0;
      const rt = pad.buttons[7]?.value ?? 0;
      if (lt > 0.1 || rt > 0.1) this.zoomAt(window.innerWidth / 2, window.innerHeight / 2, Math.exp((lt - rt) * dt * 1.6));
      const rx = pad.axes[2] ?? 0;
      const ry = pad.axes[3] ?? 0;
      if (Math.abs(rx) > 0.2 || Math.abs(ry) > 0.2) this.panBy(rx * this.cam.h * dt, ry * this.cam.h * dt);
      // D-pad, or the stick with a repeat delay.
      let dx = (btn(15) ? 1 : 0) - (btn(14) ? 1 : 0);
      let dy = (btn(12) ? 1 : 0) - (btn(13) ? 1 : 0);
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      if (Math.abs(ax) > 0.6) dx = Math.sign(ax);
      if (Math.abs(ay) > 0.6) dy = -Math.sign(ay);
      if (dx || dy) {
        this.padRepeat -= dt;
        if (this.padRepeat <= 0) {
          this.nudge(dx, dy);
          this.padRepeat = this.padRepeat < -0.5 ? 0.18 : 0.32;
        }
      } else this.padRepeat = 0;
    }
    this.padPrev = pad.buttons.map((b) => b.pressed);
  }

  // ---- Interface ----

  /** Show or hide the Build button (only near the Kestrel site). */
  setAvailable(ok: boolean): void {
    if (ok === this.available) return;
    this.available = ok;
    this.btn.classList.toggle('show', ok);
    if (!ok && this.active) this.close();
  }

  /** Why the ghost cannot go where it is, or null if it can. */
  ghostState(): { ok: boolean } | null {
    if (!this.ghost) return null;
    return { ok: !this.reason };
  }

  /** Readout lines for a selected piece (milestone 5: machines, troughs, trays, rates, whorls). */
  private pieceDetails(p: Placed): string {
    const { save, layout, factory } = this.deps;
    const out: string[] = [];
    const m = whorlMult(save, p.id);
    const fitted = save.fitted[String(p.id)] ?? 0;
    const whorlNote = fitted ? ` · ${WHORL_ICON}×${m}` : '';
    const ins = save.lines.filter((l) => l.to === p.id).map((l) => `${lineCode(l)} in`);
    const outs = save.lines.filter((l) => l.from === p.id).map((l) => `${lineCode(l)} out`);
    if (p.kind === 'feeder') {
      const md = machineData(save, p.id);
      const state = factory.feederState.get(p.id);
      const rate = FEEDER_RATE * m;
      out.push(`<span class="${state === 'running' || state === 'full' ? 'ok' : 'why'}">${feederStatus(state)}</span>`);
      out.push(
        `<span class="rate">${pieceCode(layout, p)} presses up to ${fmt(rate)} kelp fibre/min → ${fmt(rate * MASH_PER_FIBRE)} L/min mash${whorlNote} · hopper ${Math.floor(md.fibre)}/${HOPPER_CAP} · mash ${Math.round(md.mash)}/${FEEDER_MASH_CAP} L</span>`,
      );
    } else if (p.kind === 'press') {
      const md = machineData(save, p.id);
      const state = factory.pressState.get(p.id);
      const rate = PRESS_RATE * m;
      out.push(`<span class="${state === 'running' || state === 'full' ? 'ok' : 'why'}">${pressStatus(state)}</span>`);
      out.push(
        `<span class="rate">${pieceCode(layout, p)} · 2 scrap + 1 copper → 1 plating · up to ${fmt(rate)}/min${whorlNote} · hopper ${md.scrap ?? 0}/${PRESS_SCRAP_CAP} scrap, ${
          md.copper ?? 0
        }/${PRESS_COPPER_CAP} copper · rack ${md.plate ?? 0}/${PRESS_PLATE_CAP}${state === 'running' ? ` · next ${Math.round(md.press * 100)}%` : ''}</span>`,
      );
    } else if (p.kind === 'tank') {
      const td = save.tankData[String(p.id)];
      const cs = creaturesIn(save, p.id).filter((c) => c.stage !== 'egg');
      const eat = cs.length * mashPerCreature(HUNGER_RATE) * m;
      let make = 0;
      const kinds = new Set<string>();
      for (const c of cs) {
        const r = makeRate(save, layout, c).perMin;
        if (r > 0) {
          make += r;
          kinds.add(SPECIES[c.species].makes === 'fibre' ? 'kelp fibre' : SPECIES[c.species].makes);
        }
      }
      const fed = save.lines.some((l) => l.kind === 'pipe' && l.to === p.id);
      const belt = save.lines.some((l) => l.kind === 'belt' && l.from === p.id);
      const tray = trayCount(td);
      out.push(
        `<span class="rate">Tank ${tankNumber(layout, p.id)}: ${cs.length} creature${cs.length === 1 ? '' : 's'} · ${
          fed ? `feed trough ${Math.round(td?.mash ?? 0)}/${TROUGH_CAP} L, eats ${fmt(eat)} L/min` : 'fed by hand (no feed pipe)'
        } · makes ${make > 0 ? `${fmt(make)}/min ${[...kinds].join(' + ')}` : 'nothing yet'}${whorlNote}</span>`,
      );
      out.push(
        `<span class="${tray >= TRAY_CAP ? 'why' : 'rate'}">Output tray ${tray}/${TRAY_CAP}${
          belt ? ' · a conveyor carries it off' : ' · no conveyor out: swim up to take it, or tap Conveyor to…'
        }${tray >= TRAY_CAP ? ' · full, making paused' : ''}</span>`,
      );
      const stuck = stuckInTray(save, layout, p.id);
      if (stuck.length)
        out.push(
          `<span class="why">No conveyor here takes its ${stuck.map((k) => MATERIALS[k].name.toLowerCase()).join(' or ')}: run another conveyor from this tank to a storage pod</span>`,
        );
    } else if (p.kind === 'storage') {
      const total = MATERIAL_ORDER.reduce((a, k) => a + save.stored[k], 0);
      out.push(`<span class="rate">Base storage ${total}/${this.deps.capacity()}</span>`);
    }
    if (ins.length || outs.length) out.push(`<span class="rate">Lines: ${[...ins, ...outs].join(', ')}</span>`);
    if (PIECES[p.kind].whorls && fitted) out.push(`<span class="rate">${fitted} Echo whorl${fitted > 1 ? 's' : ''} fitted: works ×${m}, and uses its inputs ×${m}</span>`);
    return out.join('');
  }

  refresh(): void {
    const { save, layout, factory } = this.deps;
    if (this.selected && !layout.pieces.includes(this.selected)) this.selected = layout.pieces.find((p) => p.id === this.selected!.id) ?? null;
    if (this.selectedLine !== null && !save.lines.some((l) => l.id === this.selectedLine)) this.selectedLine = null;
    if (this.link && !this.linkAnchor()) this.link = null;
    const have = available(save.bag, save.stored);
    for (const [kind, card] of this.cards) {
      const def = PIECES[kind];
      const afford = canAfford(kind, save.bag, save.stored);
      const cost = MATERIAL_ORDER.filter((k) => def.cost[k])
        .map((k) => {
          const need = def.cost[k]!;
          return `<span class="cost ${have[k] >= need ? '' : 'short'}">${MATERIAL_ICONS[k]}${have[k]}/${need}</span>`;
        })
        .join('');
      const html = `${PIECE_ICONS[kind]}<div><b>${def.name}</b><div class="costs">${cost}<span class="time">${def.buildTime} s</span></div></div>`;
      if (card.innerHTML !== html) card.innerHTML = html;
      card.classList.toggle('short', !afford);
      card.setAttribute('aria-pressed', String(this.ghost?.kind === kind));
    }
    const g = this.ghost;
    const drone = this.deps.droneReady();
    const link = this.link;
    const { from: linkFrom, to: linkTo } = this.linkEnds();
    const linkAnchor = this.linkAnchor();
    let linkCost: Partial<Record<MaterialId, number>> = {};
    let linkCells = 0;
    if (link && linkFrom && linkTo) {
      const slot = save.lines.filter((q) => q.kind === link.kind && q.from === linkFrom.id).length;
      linkCells = lineRoute(linkFrom, linkTo, link.kind, slot).cells;
      linkCost = lineCost(link.kind, linkCells, link.tier);
    }
    if (link) {
      this.reason = !linkFrom || !linkTo
        ? link.anchor === 'from'
          ? 'Tap the piece to run it to'
          : 'Tap the piece to run it from'
        : linkProblem(save, layout, link.kind, linkFrom, linkTo) ??
          (MATERIAL_ORDER.some((k) => have[k] < (linkCost[k] ?? 0)) ? `Need more ${MATERIAL_ORDER.filter((k) => have[k] < (linkCost[k] ?? 0)).map((k) => MATERIALS[k].plural.toLowerCase()).join(' and ')}` : null);
    } else this.reason = g ? (drone ? layout.check(g) : 'Needs the build drone first (lost by the survey sled wreck)') : null;
    if (g && !this.reason && !canAfford(g.kind, save.bag, save.stored)) {
      const missing = MATERIAL_ORDER.filter((k) => (PIECES[g.kind].cost[k] ?? 0) > have[k]).map((k) => MATERIALS[k].plural.toLowerCase());
      this.reason = `Need more ${missing.join(' and ')}`;
    }
    const sel = this.selected;
    const ports = sel ? PIECES[sel.kind].ports : undefined;
    this.placeBtn.hidden = !g && !link;
    this.placeBtn.disabled = !!this.reason;
    this.rotateBtn.hidden = !g || PIECES[g.kind].shapes.length < 2;
    this.removeBtn.hidden = (!sel && this.selectedLine === null) || !!g || !!link;
    this.removeBtn.textContent = Date.now() - this.removeArmed < 3000 ? 'Tap again to remove' : 'Remove';
    this.removeBtn.classList.toggle('armed', Date.now() - this.removeArmed < 3000);
    this.cancelBtn.setAttribute('aria-label', g ? 'Put the piece back' : link ? 'Stop drawing the line' : 'Close build mode');
    const showTools = !!sel && !g && !link;
    this.beltBtn.hidden = !(showTools && ports?.beltOut);
    this.pipeBtn.hidden = !(showTools && ports?.pipeOut);
    this.beltInBtn.hidden = !(showTools && ports?.beltIn);
    this.pipeInBtn.hidden = !(showTools && ports?.pipeIn);
    // Tier switch while drawing (shown once a higher tier can be afforded or exists).
    const tiers = link ? LINES[link.kind].tiers : [];
    this.tierBtn.hidden = !link || !this.tierUnlocked(link.kind, 2);
    if (link) {
      const html = tiers.map((t, i) => `<b class="${i + 1 === link.tier ? 'on' : ''}">${t.code}</b>`).join('');
      if (this.tierBtn.innerHTML !== html) this.tierBtn.innerHTML = html;
      this.tierBtn.setAttribute('aria-label', `Line tier: ${tiers[link.tier - 1].code}. Tap to switch.`);
    }
    // Upgrade a selected line.
    const selLine = this.selectedLine !== null ? save.lines.find((q) => q.id === this.selectedLine) : undefined;
    const canUp = !!selLine && !g && !link && tierOf(selLine) < LINES[selLine.kind].tiers.length;
    this.upgradeBtn.hidden = !canUp;
    if (selLine && canUp) {
      const cost = upgradeCost(selLine.kind, this.lineCells(selLine), tierOf(selLine));
      const next = tierDef(selLine.kind, tierOf(selLine) + 1);
      const html = `<span>Upgrade to ${next.code}</span>${MATERIAL_ORDER.filter((k) => cost[k])
        .map((k) => `<span class="cost ${have[k] >= cost[k]! ? '' : 'short'}">${MATERIAL_ICONS[k]}${cost[k]}</span>`)
        .join('')}`;
      if (this.upgradeBtn.innerHTML !== html) this.upgradeBtn.innerHTML = html;
    }
    this.ratesBtn.hidden = !layout.pieces.length || !!g || !!link;
    const canWhorl = showTools && !!sel && !!PIECES[sel.kind].whorls && isDone(sel) && (save.whorls.length > 0 || !!save.fitted[String(sel.id)]);
    const fittedHere = sel ? save.fitted[String(sel.id)] ?? 0 : 0;
    this.whorlAddBtn.hidden = !canWhorl || fittedHere >= WHORLS_PER_PIECE || whorlsFree(save) === 0;
    this.whorlTakeBtn.hidden = !canWhorl || fittedHere === 0;
    const free = whorlsFree(save);
    this.whorlAddBtn.innerHTML = `${WHORL_ICON}<span>Fit whorl (${free} spare)</span>`;
    this.whorlTakeBtn.innerHTML = `${WHORL_ICON}<span>Take out whorl</span>`;

    let text = '';
    if (link && linkAnchor) {
      const def = LINES[link.kind];
      const td = tierDef(link.kind, link.tier);
      const costTxt = MATERIAL_ORDER.filter((k) => linkCost[k])
        .map((k) => `<span class="cost ${have[k] >= linkCost[k]! ? '' : 'short'}">${MATERIAL_ICONS[k]}${linkCost[k]}</span>`)
        .join(' ');
      const aName = `${PIECES[linkAnchor.kind].name.toLowerCase()} (${pieceCode(layout, linkAnchor)})`;
      text = `<b>${td.code} ${def.name.toLowerCase()}</b> (${def.carries}, up to ${td.rate} ${def.unit}) ${link.anchor === 'from' ? 'from' : 'into'} the ${aName}.`;
      if (linkFrom && linkTo) {
        const other = link.anchor === 'from' ? linkTo : linkFrom;
        text += ` ${link.anchor === 'from' ? 'To' : 'From'} the ${PIECES[other.kind].name.toLowerCase()} (${pieceCode(layout, other)}): ${linkCells} cell${linkCells > 1 ? 's' : ''} · ${costTxt}`;
      }
      text += this.reason ? `<span class="why">${this.reason}</span>` : '<span class="ok">Tap ✓ to build it (no welding needed)</span>';
      if ((!linkFrom || !linkTo) && !this.linkTargets().length)
        text += `<span class="why">Nothing here can ${link.anchor === 'from' ? 'take it' : 'feed it'} yet.</span>`;
    } else if (g) {
      text = `<b>${PIECES[g.kind].name}</b>: ${PIECES[g.kind].job}`;
      text += this.reason ? `<span class="why">${this.reason}</span>` : '<span class="ok">Fits here: tap ✓ to place the frame</span>';
    } else if (this.selectedLine !== null) {
      const l = save.lines.find((q) => q.id === this.selectedLine)!;
      const def = LINES[l.kind];
      const a = this.piece(l.from);
      const b = this.piece(l.to);
      const fl = factory.flows.get(l.id);
      const rate = fl?.rate ?? 0;
      const cap = lineRate(l);
      const what = l.kind === 'belt' ? (fl?.item ? MATERIALS[fl.item].name.toLowerCase() : 'nothing yet') : 'feed mash';
      const maxed = (fl?.busy ?? 0) > 0.8 && rate > cap * 0.75;
      text = `<b>${lineCode(l)} ${def.name.toLowerCase()}</b>: ${a ? pieceCode(layout, a) : '?'} → ${b ? pieceCode(layout, b) : '?'}<span class="rate">Moving ${fmt(rate)} ${
        l.kind === 'belt' ? 'items' : 'L'
      }/min (${what}) · can carry ${cap} ${def.unit} (${Math.round((rate / cap) * 100)}% used)</span>${
        maxed && tierOf(l) < def.tiers.length ? `<span class="why">Running flat out: upgrading to ${tierDef(l.kind, tierOf(l) + 1).code} would move more</span>` : ''
      }`;
    } else if (sel && !isDone(sel)) {
      const pct = Math.floor((sel.progress ?? 0) * 100);
      const left = Math.ceil((1 - (sel.progress ?? 0)) * PIECES[sel.kind].buildTime);
      const busy = this.deps.welding();
      text = `<b>${PIECES[sel.kind].name} frame</b>: ${PIECES[sel.kind].job}<span class="${busy?.id === sel.id ? 'ok' : 'why'}">${
        busy?.id === sel.id ? `Drone welding: ${pct}% · about ${left} s left` : `Waiting for the drone · ${pct}% welded`
      }</span>`;
    } else if (sel) {
      const on = layout.powered.has(sel.id);
      text = `<b>${PIECES[sel.kind].name}</b>: ${PIECES[sel.kind].job}<span class="${on ? 'ok' : 'why'}">${
        on ? (sel.kind === 'turbine' ? 'Making power' : 'Powered') : 'No power: join it to a current turbine'
      }</span>${this.pieceDetails(sel)}`;
    } else if (!drone) {
      text = `Plan freely, but nothing can be built yet.<span class="why">${NO_DRONE}</span>`;
    } else if (!layout.pieces.length) {
      text = 'Pick a piece below. Start with a <b>Dome habitat</b> and a <b>Current turbine</b> side by side; their collars join. The drone welds each frame.';
    } else {
      const unpowered = layout.pieces.filter((p) => isDone(p) && !layout.powered.has(p.id)).length;
      const frames = layout.frames().length;
      text = `Pick a piece to add, or tap a piece or line to select it. ${
        document.body.classList.contains('touch') ? 'Drag to look around, pinch to zoom.' : 'Drag or WASD to look around, wheel to zoom, F to fit.'
      }${frames ? `<span class="ok">${frames} frame${frames > 1 ? 's' : ''} waiting for the drone</span>` : ''}${
        unpowered ? `<span class="why">${unpowered} piece${unpowered > 1 ? 's have' : ' has'} no power</span>` : ''
      }`;
    }
    if (this.info.innerHTML !== text) this.info.innerHTML = text;
  }
}

/** A rate for the readouts: 0.25, 1.5, 12. */
function fmt(n: number): string {
  if (n === 0) return '0';
  if (n < 1) return n.toFixed(2).replace(/0$/, '');
  if (n < 10) return n.toFixed(1).replace(/\.0$/, '');
  return String(Math.round(n));
}
