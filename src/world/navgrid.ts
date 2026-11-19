import { isSolid, WORLD_H, WORLD_W, WORLD_X0 } from './terrain';

/**
 * Finding a way through open water (Colin, after milestone 12: KD-1 ferries
 * the dive bag home "through the physical environment").
 *
 * The world is cut into square cells. A cell is open when the terrain test
 * (`isSolid`, which knows the rock, the caves, the wrecks and every gate that
 * is still shut, like the kelp wall) finds water at its middle and a little
 * way out on all four sides, so a drone-sized body fits. Cells are only
 * tested when the search reaches them, so a long trip costs a few thousand
 * tests, not the whole world. A* finds the route (eight neighbours, no
 * cutting corners), then the route is pulled tight: each point is joined to
 * the furthest later point in plain sight.
 */

/** Cell size, world units. */
const C = 40;
/** How far from a cell's middle there must be water too (the drone is about 30 units across). */
const CLEAR = 13;
/** Nothing above this: that is the surface. */
const TOP = 90;
const COLS = Math.ceil((WORLD_W - WORLD_X0) / C);
const ROWS = Math.ceil(WORLD_H / C);
const N = COLS * ROWS;
/** Give up after this many cells (a route that long would be across the whole world twice). */
const MAX_EXPAND = 260000;

// 0 untested, 1 open, 2 solid. Gates open during play (the kelp wall, the seam...), so the
// cache is cleared before each search: it only saves repeat tests within one search.
const cell = new Uint8Array(N);
const g = new Float32Array(N);
const from = new Int32Array(N);
const seen = new Uint32Array(N);
const shut = new Uint32Array(N);
let stamp = 0;

const cx = (i: number) => WORLD_X0 + ((i % COLS) + 0.5) * C;
const cy = (i: number) => (Math.floor(i / COLS) + 0.5) * C;

function open(i: number): boolean {
  let v = cell[i];
  if (!v) {
    const x = cx(i);
    const y = cy(i);
    v = y < TOP || isSolid(x, y) || isSolid(x - CLEAR, y) || isSolid(x + CLEAR, y) || isSolid(x, y - CLEAR) || isSolid(x, y + CLEAR) ? 2 : 1;
    cell[i] = v;
  }
  return v === 1;
}

function indexAt(x: number, y: number): number {
  const c = Math.floor((x - WORLD_X0) / C);
  const r = Math.floor(y / C);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return -1;
  return r * COLS + c;
}

/** The open cell nearest a point (the diver may be pressed against rock), within a few cells. */
function nearestOpen(x: number, y: number): number {
  const i0 = indexAt(x, y);
  if (i0 >= 0 && open(i0)) return i0;
  const c0 = Math.floor((x - WORLD_X0) / C);
  const r0 = Math.floor(y / C);
  let best = -1;
  let bd = Infinity;
  for (let dr = -4; dr <= 4; dr++)
    for (let dc = -4; dc <= 4; dc++) {
      const c = c0 + dc;
      const r = r0 + dr;
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
      const i = r * COLS + c;
      const d = dc * dc + dr * dr;
      if (d < bd && open(i)) {
        bd = d;
        best = i;
      }
    }
  return best;
}

/** Is the straight line from a to b all water, for a drone-sized body? */
export function clearLine(ax: number, ay: number, bx: number, by: number): boolean {
  const len = Math.hypot(bx - ax, by - ay);
  const n = Math.max(1, Math.ceil(len / 12));
  // Check the line and two lines either side of it, CLEAR apart.
  const nx = len > 0 ? (-(by - ay) / len) * CLEAR : 0;
  const ny = len > 0 ? ((bx - ax) / len) * CLEAR : 0;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    if (y < TOP - 10 || isSolid(x, y) || isSolid(x + nx, y + ny) || isSolid(x - nx, y - ny)) return false;
  }
  return true;
}

/** A small binary heap of cell indices keyed on f. */
class Heap {
  private ids: number[] = [];
  private fs: number[] = [];
  get size(): number {
    return this.ids.length;
  }
  push(id: number, f: number): void {
    const a = this.ids;
    const b = this.fs;
    let i = a.length;
    a.push(id);
    b.push(f);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (b[p] <= f) break;
      a[i] = a[p];
      b[i] = b[p];
      i = p;
    }
    a[i] = id;
    b[i] = f;
  }
  pop(): number {
    const a = this.ids;
    const b = this.fs;
    const top = a[0];
    const lastId = a.pop()!;
    const lastF = b.pop()!;
    if (a.length) {
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        if (l >= a.length) break;
        const r = l + 1;
        const m = r < a.length && b[r] < b[l] ? r : l;
        if (b[m] >= lastF) break;
        a[i] = a[m];
        b[i] = b[m];
        i = m;
      }
      a[i] = lastId;
      b[i] = lastF;
    }
    return top;
  }
}

const STEPS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

/**
 * A route through open water from one point to another, as waypoints (the
 * first is the start, the last the goal), or null if there is none.
 */
export function findPath(ax: number, ay: number, bx: number, by: number): { x: number; y: number }[] | null {
  cell.fill(0);
  stamp++;
  if (stamp === 0xffffffff) {
    seen.fill(0);
    shut.fill(0);
    stamp = 1;
  }
  const s = nearestOpen(ax, ay);
  const t = nearestOpen(bx, by);
  if (s < 0 || t < 0) return null;
  if (clearLine(ax, ay, bx, by)) return [{ x: ax, y: ay }, { x: bx, y: by }];
  const tc = t % COLS;
  const tr = Math.floor(t / COLS);
  const h = (i: number) => {
    const dc = Math.abs((i % COLS) - tc);
    const dr = Math.abs(Math.floor(i / COLS) - tr);
    return Math.max(dc, dr) + (Math.SQRT2 - 1) * Math.min(dc, dr);
  };
  const heap = new Heap();
  g[s] = 0;
  from[s] = -1;
  seen[s] = stamp;
  heap.push(s, h(s));
  let expanded = 0;
  let found = false;
  while (heap.size) {
    const i = heap.pop();
    if (shut[i] === stamp) continue;
    shut[i] = stamp;
    if (i === t) {
      found = true;
      break;
    }
    if (++expanded > MAX_EXPAND) break;
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    for (const [dc, dr, w] of STEPS) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      const j = nr * COLS + nc;
      if (shut[j] === stamp || !open(j)) continue;
      // No squeezing diagonally between two rock cells.
      if (dc && dr && (!open(r * COLS + nc) || !open(nr * COLS + c))) continue;
      const ng = g[i] + w;
      if (seen[j] === stamp && ng >= g[j]) continue;
      seen[j] = stamp;
      g[j] = ng;
      from[j] = i;
      heap.push(j, ng + h(j));
    }
  }
  if (!found) return null;
  const cells: { x: number; y: number }[] = [];
  for (let i = t; i >= 0; i = from[i]) cells.push({ x: cx(i), y: cy(i) });
  cells.reverse();
  const raw = [{ x: ax, y: ay }, ...cells.slice(1, -1), { x: bx, y: by }];
  // Pull the route tight: from each kept point, jump to the furthest point still in plain sight.
  const out = [raw[0]];
  let k = 0;
  while (k < raw.length - 1) {
    let j = Math.min(raw.length - 1, k + 40);
    while (j > k + 1 && !clearLine(raw[k].x, raw[k].y, raw[j].x, raw[j].y)) j--;
    out.push(raw[j]);
    k = j;
  }
  return out;
}

/** How long a route is, world units. */
export function pathLength(p: { x: number; y: number }[]): number {
  let d = 0;
  for (let i = 1; i < p.length; i++) d += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
  return d;
}
