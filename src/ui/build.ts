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
  isDone,
  pay,
  PIECE_ORDER,
  PIECES,
  PieceKind,
  pieceRect,
  Placed,
  shapeOf,
} from '../game/base';
import { MATERIAL_ORDER, MATERIALS, SaveData } from '../game/state';
import { MATERIAL_ICONS } from './hud';

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
  /** Can the build button be used right now (the diver is at the site)? */
  available = false;

  private btn = document.getElementById('build-btn') as HTMLButtonElement;
  private bar = document.getElementById('build-bar')!;
  private info = document.getElementById('build-info')!;
  private placeBtn = document.getElementById('build-place') as HTMLButtonElement;
  private rotateBtn = document.getElementById('build-rotate') as HTMLButtonElement;
  private cancelBtn = document.getElementById('build-cancel') as HTMLButtonElement;
  private removeBtn = document.getElementById('build-remove') as HTMLButtonElement;
  private cards = new Map<PieceKind, HTMLButtonElement>();
  private removeArmed = 0;
  private reason: string | null = null;

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

    host.addEventListener('pointerdown', (e) => this.down(e));
    host.addEventListener('pointermove', (e) => this.move(e));
    host.addEventListener('pointerup', (e) => this.up(e));
    host.addEventListener('pointercancel', () => (this.drag = null));
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
    this.ghost = null;
    document.body.classList.add('building');
    this.btn.setAttribute('aria-pressed', 'true');
    this.refresh();
  }

  close(): void {
    if (!this.active) return;
    this.active = false;
    this.ghost = null;
    this.selected = null;
    this.drag = null;
    document.body.classList.remove('building');
    this.btn.setAttribute('aria-pressed', 'false');
  }

  /** Pick a piece to place (null lets go of it). It appears at the nearest spot where it fits. */
  pick(kind: PieceKind | null): void {
    this.selected = null;
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
    let target = near;
    if (!target) {
      if (layout.pieces.length) {
        // Near the middle of what is built so far.
        let sx = 0;
        let sy = 0;
        for (const p of layout.pieces) {
          const r = pieceRect(p);
          sx += r.x + r.w / 2;
          sy += r.y + r.h / 2;
        }
        target = { x: sx / layout.pieces.length, y: sy / layout.pieces.length };
      } else target = this.deps.toWorld(window.innerWidth / 2, window.innerHeight / 2);
    }
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

  remove(): void {
    const p = this.selected;
    if (!p) return;
    if (Date.now() - this.removeArmed > 3000) {
      this.removeArmed = Date.now();
      this.refresh();
      return;
    }
    this.removeArmed = 0;
    const { save, layout } = this.deps;
    if (p.kind === 'tank' && save.creatures.some((c) => c.tank === p.id)) {
      this.deps.toast('Creatures live in this tank. Move them to another tank or release them first (tap Tend at the tank).', 'warn');
      this.refresh();
      return;
    }
    layout.set(layout.pieces.filter((q) => q.id !== p.id));
    save.pieces = layout.pieces;
    // Everything comes back: into storage while there is room (so the dive
    // bag does not suddenly weigh a tonne), the rest carried.
    const cap = this.deps.capacity();
    const cost = PIECES[p.kind].cost;
    let room = cap - MATERIAL_ORDER.reduce((a, k) => a + save.stored[k], 0);
    for (const k of MATERIAL_ORDER) {
      const n = cost[k] ?? 0;
      const s = Math.max(0, Math.min(room, n));
      save.stored[k] += s;
      save.bag[k] += n - s;
      room -= s;
    }
    // If a storage pod went, what no longer fits is handed back to carry.
    let over = MATERIAL_ORDER.reduce((a, k) => a + save.stored[k], 0) - cap;
    for (const k of MATERIAL_ORDER) {
      if (over <= 0) break;
      const n = Math.min(over, save.stored[k]);
      save.stored[k] -= n;
      save.bag[k] += n;
      over -= n;
    }
    this.deps.toast(`Removed: ${PIECES[p.kind].name}${isDone(p) ? '' : ' frame'}. Materials returned.`);
    this.selected = null;
    this.deps.changed([]);
    this.deps.refreshInventory();
    this.refresh();
  }

  // ---- Pointer ----

  private down(e: PointerEvent): void {
    if (!this.active) return;
    const w = this.deps.toWorld(e.clientX, e.clientY);
    const mouse = e.pointerType === 'mouse';
    if (mouse && e.button !== 0) return;
    this.drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, wx: w.x, wy: w.y, t: performance.now(), moved: false, mouse };
    if (this.ghost) this.float = this.ghostCentre(this.ghost);
  }

  private move(e: PointerEvent): void {
    if (!this.active) return;
    if (e.pointerType === 'mouse' && this.ghost) {
      // The ghost follows the mouse.
      const w = this.deps.toWorld(e.clientX, e.clientY);
      const before = `${this.ghost.gx},${this.ghost.gy}`;
      this.moveGhostTo(w.x, w.y);
      if (before !== `${this.ghost.gx},${this.ghost.gy}`) this.refresh();
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
    if (before !== `${this.ghost.gx},${this.ghost.gy}`) this.refresh();
  }

  private up(e: PointerEvent): void {
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
    this.selected = this.deps.layout.pieceAt(c.gx, c.gy) ?? null;
    this.removeArmed = 0;
    this.refresh();
  }

  // ---- Keyboard and gamepad ----

  private key(e: KeyboardEvent): void {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'b') {
      this.toggle();
      return;
    }
    if (!this.active) return;
    const idx = ['1', '2', '3', '4', '5', '6'].indexOf(k);
    if (idx >= 0) this.pick(PIECE_ORDER[idx]);
    else if (k === 'arrowleft' || k === 'a') this.nudge(-1, 0);
    else if (k === 'arrowright' || k === 'd') this.nudge(1, 0);
    else if (k === 'arrowup' || k === 'w') this.nudge(0, 1);
    else if (k === 'arrowdown' || k === 's') this.nudge(0, -1);
    else if (k === 'r') this.rotate();
    else if (k === 'enter' || k === ' ') this.place();
    else if (k === 'escape') {
      if (this.ghost) this.pick(null);
      else this.close();
    } else if (k === 'tab') this.cycleSelection();
    else if (k === 'delete' || k === 'backspace' || k === 'x') this.remove();
    else return;
    e.preventDefault();
  }

  private nudge(dx: number, dy: number): void {
    const g = this.ghost;
    if (!g) {
      if (dx || dy) this.cycleSelection(dx < 0 || dy < 0 ? -1 : 1);
      return;
    }
    const s = shapeOf(g);
    g.gx = Math.max(0, Math.min(GRID_COLS - s.w, g.gx + dx));
    g.gy = Math.max(0, Math.min(GRID_ROWS - s.h, g.gy + dy));
    this.float = this.ghostCentre(g);
    this.refresh();
  }

  private cycleSelection(step = 1): void {
    const ps = [...this.deps.layout.pieces].sort((a, b) => a.gx - b.gx || a.gy - b.gy);
    if (!ps.length) return;
    this.ghost = null;
    const i = this.selected ? ps.findIndex((p) => p.id === this.selected!.id) : -1;
    this.selected = ps[(i + step + ps.length) % ps.length];
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
        if (this.ghost) this.pick(null);
        else this.close();
      }
      if (pressed(3)) this.rotate();
      if (pressed(2)) this.remove();
      const cur = this.ghost ? PIECE_ORDER.indexOf(this.ghost.kind) : -1;
      if (pressed(5)) this.pick(PIECE_ORDER[(cur + 1) % PIECE_ORDER.length]);
      if (pressed(4)) this.pick(PIECE_ORDER[(cur - 1 + PIECE_ORDER.length) % PIECE_ORDER.length]);
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

  refresh(): void {
    const { save, layout } = this.deps;
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
      card.innerHTML = `${PIECE_ICONS[kind]}<div><b>${def.name}</b><div class="costs">${cost}<span class="time">${def.buildTime} s</span></div></div>`;
      card.classList.toggle('short', !afford);
      card.setAttribute('aria-pressed', String(this.ghost?.kind === kind));
    }
    const g = this.ghost;
    const drone = this.deps.droneReady();
    this.reason = g ? (drone ? layout.check(g) : 'Needs the build drone first (lost by the survey sled wreck)') : null;
    if (g && !this.reason && !canAfford(g.kind, save.bag, save.stored)) {
      const missing = MATERIAL_ORDER.filter((k) => (PIECES[g.kind].cost[k] ?? 0) > have[k]).map((k) => MATERIALS[k].plural.toLowerCase());
      this.reason = `Need more ${missing.join(' and ')}`;
    }
    this.placeBtn.hidden = !g;
    this.placeBtn.disabled = !!this.reason;
    this.rotateBtn.hidden = !g || PIECES[g.kind].shapes.length < 2;
    this.removeBtn.hidden = !this.selected || !!g;
    this.removeBtn.textContent = Date.now() - this.removeArmed < 3000 ? 'Tap again to remove' : 'Remove';
    this.removeBtn.classList.toggle('armed', Date.now() - this.removeArmed < 3000);
    this.cancelBtn.setAttribute('aria-label', g ? 'Put the piece back' : 'Close build mode');

    let text = '';
    if (g) {
      text = `<b>${PIECES[g.kind].name}</b>: ${PIECES[g.kind].job}`;
      text += this.reason ? `<span class="why">${this.reason}</span>` : '<span class="ok">Fits here: tap ✓ to place the frame</span>';
    } else if (this.selected && !isDone(this.selected)) {
      const p = this.selected;
      const pct = Math.floor((p.progress ?? 0) * 100);
      const left = Math.ceil((1 - (p.progress ?? 0)) * PIECES[p.kind].buildTime);
      const busy = this.deps.welding();
      text = `<b>${PIECES[p.kind].name} frame</b>: ${PIECES[p.kind].job}<span class="${busy?.id === p.id ? 'ok' : 'why'}">${
        busy?.id === p.id ? `Drone welding: ${pct}% · about ${left} s left` : `Waiting for the drone · ${pct}% welded`
      }</span>`;
    } else if (this.selected) {
      const p = this.selected;
      const on = layout.powered.has(p.id);
      let extra = '';
      if (p.kind === 'storage') {
        const total = MATERIAL_ORDER.reduce((a, k) => a + save.stored[k], 0);
        extra = ` · base storage ${total}/${this.deps.capacity()}`;
      }
      text = `<b>${PIECES[p.kind].name}</b>: ${PIECES[p.kind].job}<span class="${on ? 'ok' : 'why'}">${
        on ? (p.kind === 'turbine' ? 'Making power' : 'Powered') : 'No power: join it to a current turbine'
      }${extra}</span>`;
    } else if (!drone) {
      text = `Plan freely, but nothing can be built yet.<span class="why">${NO_DRONE}</span>`;
    } else if (!layout.pieces.length) {
      text = 'Pick a piece below. Start with a <b>Dome habitat</b> and a <b>Current turbine</b> side by side; their collars join. The drone welds each frame.';
    } else {
      const unpowered = layout.pieces.filter((p) => isDone(p) && !layout.powered.has(p.id)).length;
      const frames = layout.frames().length;
      text = `Pick a piece to add, or tap a built piece to select it.${
        frames ? `<span class="ok">${frames} frame${frames > 1 ? 's' : ''} waiting for the drone</span>` : ''
      }${unpowered ? `<span class="why">${unpowered} piece${unpowered > 1 ? 's have' : ' has'} no power</span>` : ''}`;
    }
    if (this.info.innerHTML !== text) this.info.innerHTML = text;
  }
}
