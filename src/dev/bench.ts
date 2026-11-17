import { BaseLayout, GRID_X0, CELL, Placed, PieceKind, cellOpen, GRID_COLS, GRID_ROWS } from '../game/base';
import { linkProblem } from '../game/factory';
import { SaveData } from '../game/state';
import { PerfFrame } from './perf';
import { CORVINA, GROTTO, groundY } from '../world/terrain';

/**
 * The benchmark route (graphics session G1), opened with ?bench in the URL.
 *
 * It visits a fixed list of scenes, holding the camera still (with a slow
 * sway so the water, particles and lights all move) for about 8 seconds each,
 * then prints a table that can be copied. It never touches the real save:
 * with ?bench, `src/game/state.ts` neither reads nor writes the device's
 * save, and the base the route needs is seeded here from a fixed recipe.
 */

export const BENCH = typeof location !== 'undefined' && new URLSearchParams(location.search).has('bench');

/** ?bench&still holds the view perfectly still (for before and after screenshots of the same frame). */
export const STILL = typeof location !== 'undefined' && new URLSearchParams(location.search).has('still');

const BENCH_SCENE_COUNT = 7;

/** ?bench&scene=N stays in scene N (0 to 6) and never moves on: for screenshots. */
export const HOLD: number | null = (() => {
  if (typeof location === 'undefined') return null;
  const v = new URLSearchParams(location.search).get('scene');
  return v === null ? null : Math.max(0, Math.min(BENCH_SCENE_COUNT - 1, Number(v) || 0));
})();

export const SCENE_SECONDS = 8;
/** Seconds at the start of each scene that are not measured (shaders, culling and the camera settling). */
export const WARMUP_SECONDS = 2;
/** ...and the first few frames after a move are never measured either (the first one builds things). */
export const WARMUP_FRAMES = 3;
/** A slow machine still needs a handful of frames to average; never run longer than this per scene. */
export const MIN_FRAMES = 10;
export const MAX_SCENE_SECONDS = 40;

export interface BenchScene {
  id: string;
  name: string;
  /** Where the diver floats. y is a distance above the seabed when `floor` is set. */
  x: number;
  y: number;
  floor?: boolean;
  face: 1 | -1;
  lamp: boolean;
  /** Multiplies the swimming view height (the zoomed-out view shows more of a big base). */
  zoom: number;
  /** Walk around inside the base instead of swimming. */
  interior?: boolean;
  /** How far the view sways sideways, world units. */
  sway: number;
}

export const BENCH_SCENES: BenchScene[] = [
  { id: 'shallows', name: 'Shallows at the buoy', x: 900, y: 160, floor: true, face: 1, lamp: false, zoom: 1, sway: 120 },
  { id: 'basin', name: 'Basin, seeded big base', x: -1970, y: 1320, face: 1, lamp: true, zoom: 2.2, sway: 160 },
  { id: 'grotto', name: 'Grotto, lamp on', x: (GROTTO.x0 + GROTTO.x1) / 2 - 120, y: 900, face: 1, lamp: true, zoom: 1, sway: 90 },
  { id: 'forest', name: 'Kelp forest', x: 12300, y: 260, floor: true, face: 1, lamp: true, zoom: 1, sway: 140 },
  { id: 'caves', name: 'Kelp caves, black chamber', x: 17960, y: 1650, face: 1, lamp: true, zoom: 1, sway: 60 },
  { id: 'shelf', name: 'Wreck shelf, by the Corvina', x: CORVINA.x0 - 240, y: 230, floor: true, face: 1, lamp: true, zoom: 1, sway: 100 },
  { id: 'base', name: 'Base interior, ceiling lines', x: 0, y: 0, face: 1, lamp: true, zoom: 1, interior: true, sway: 0 },
  // Milestone 10 (appended, so the scene numbers above keep their meaning).
  { id: 'trench', name: 'Trench vent field, lamp on', x: 29700, y: 150, floor: true, face: 1, lamp: true, zoom: 1, sway: 100 },
];

/** Where a scene's diver sits (the seabed offset resolved). */
export function scenePos(s: BenchScene): { x: number; y: number } {
  // ?bench&scene=N&at=x,y moves the held scene (for finding good spots).
  const at = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('at') : null;
  if (at && HOLD !== null && BENCH_SCENES[HOLD] === s) {
    const [ax, ay] = at.split(',').map(Number);
    if (Number.isFinite(ax) && Number.isFinite(ay)) return { x: ax, y: ay };
  }
  return { x: s.x, y: s.floor ? groundY(s.x) - s.y : s.y };
}

// ---------------------------------------------------------------------------
// A fixed base for the basin and interior scenes.

const SEQUENCE: PieceKind[] = [
  'dome', 'turbine', 'corridor', 'storage', 'corridor', 'press', 'corridor', 'tank', 'filter', 'corridor', 'feeder', 'tank',
  'corridor', 'lab', 'workshop', 'corridor', 'dock', 'corridor', 'gtank', 'sorter', 'corridor', 'crane', 'recomp', 'storage',
  'corridor', 'turbine', 'corridor', 'tank', 'corridor', 'press', 'corridor', 'storage', 'corridor', 'gtank', 'filter',
  'corridor', 'feeder', 'corridor', 'lab', 'corridor', 'tank',
  'junction', 'shaft', 'junction', 'bracket',
  // Milestone 10.
  'corridor', 'signal',
];

/**
 * Seed a big, deterministic base into a fresh save: a long run of pieces
 * joined by their collars on the basin floor, some lines between machines,
 * and the dive light so the lamp is the real one.
 */
export function seedBenchSave(save: SaveData): void {
  const placed: Placed[] = [];
  const layout = new BaseLayout(placed);
  let id = 1;
  let anchor = Math.round((-2400 - GRID_X0) / CELL);
  let turn = 0;
  for (const kind of SEQUENCE) {
    // Corridors alternate flat and upright so the base grows both ways.
    const rot = kind === 'corridor' ? turn++ % 2 : 0;
    const spots = layout.validSpots(kind, rot);
    if (!spots.length) continue;
    // Prefer low, close to the anchor; ties to the left so the result never depends on iteration luck.
    let best = spots[0];
    let bestScore = Infinity;
    for (const s of spots) {
      const score = Math.abs(s.gx - anchor) + s.gy * 1.6 + (cellOpen(s.gx, s.gy) ? 0 : 1000);
      if (score < bestScore - 1e-9) {
        bestScore = score;
        best = s;
      }
    }
    placed.push({ id: id++, kind, gx: best.gx, gy: best.gy, rot });
    layout.set(placed);
    if (kind === 'dome') anchor = best.gx + 2;
    anchor = Math.max(2, Math.min(GRID_COLS - 3, anchor + (kind === 'corridor' ? 1 : 0)));
  }
  void GRID_ROWS;
  save.pieces = placed;
  save.nextPieceId = id;
  // Lines: each store feeds the nearest press, each feeder feeds the tanks near it, tanks send to storage.
  let lineId = 1;
  const add = (kind: 'belt' | 'pipe', a: Placed, b: Placed): void => {
    if (linkProblem(save, layout, kind, a, b)) return;
    save.lines.push({ id: lineId++, kind, from: a.id, to: b.id, tier: lineId % 3 === 0 ? 2 : 1 });
  };
  const dist = (a: Placed, b: Placed) => Math.abs(a.gx - b.gx) + Math.abs(a.gy - b.gy);
  const nearest = (p: Placed, kind: PieceKind) =>
    placed.filter((q) => q.kind === kind).sort((a, b) => dist(p, a) - dist(p, b));
  for (const store of placed.filter((p) => p.kind === 'storage')) {
    for (const press of nearest(store, 'press').slice(0, 2)) add('belt', store, press);
    for (const f of nearest(store, 'feeder').slice(0, 1)) add('belt', store, f);
  }
  for (const press of placed.filter((p) => p.kind === 'press')) for (const store of nearest(press, 'storage').slice(0, 1)) add('belt', press, store);
  for (const f of placed.filter((p) => p.kind === 'feeder')) for (const t of [...nearest(f, 'tank'), ...nearest(f, 'gtank')].slice(0, 3)) add('pipe', f, t);
  for (const t of placed.filter((p) => p.kind === 'tank' || p.kind === 'gtank')) for (const store of nearest(t, 'storage').slice(0, 1)) add('belt', t, store);
  save.nextLineId = lineId;
  save.gear = ['light'];
  save.lampOn = true;
  save.drone = 'active';
  save.tips = ['basefoot', 'onfoot', 'wshelf'];
  save.brackets = [true, true, false, false];
}

// ---------------------------------------------------------------------------
// The runner.

export interface BenchRow {
  id: string;
  name: string;
  frames: number;
  fps: number;
  frameMs: number;
  p95Ms: number;
  worstMs: number;
  update: number;
  render: number;
  gpu: number | null;
  gpuPasses: string;
  draws: number;
  tris: number;
  lights: number;
  res: string;
}

export interface BenchHost {
  /** Move to a scene: place the diver (or walker), set the lamp and the view. */
  enter(i: number): void;
  /** One line describing the setup, printed with the table. */
  info(): string;
  done(): void;
}

function mean(a: number[]): number {
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
}

export class Bench {
  active = false;
  index = -1;
  rows: BenchRow[] = [];
  private samples: PerfFrame[] = [];
  private seen = 0;
  private sceneStart = 0;
  private el: HTMLDivElement;
  private text = '';

  constructor(private host: BenchHost) {
    this.el = document.createElement('div');
    this.el.id = 'bench';
    this.el.hidden = true;
    document.body.appendChild(this.el);
    // The benchmark view is just the scene: no hints or labels over it.
    if (BENCH) document.body.classList.add('bench');
  }

  get scene(): BenchScene | null {
    return this.index >= 0 && this.index < BENCH_SCENES.length ? BENCH_SCENES[this.index] : null;
  }

  /** Seconds into the current scene. */
  elapsed(now: number): number {
    return (now - this.sceneStart) / 1000;
  }

  start(now: number): void {
    this.active = true;
    this.rows = [];
    this.el.hidden = false;
    this.go(HOLD ?? 0, now);
  }

  private go(i: number, now: number): void {
    this.index = i;
    this.samples = [];
    this.seen = 0;
    this.sceneStart = now;
    (window as unknown as { __benchIndex?: number }).__benchIndex = i;
    this.host.enter(i);
    this.progress(now);
  }

  private progress(now: number): void {
    const s = this.scene;
    if (!s) return;
    const e = Math.min(SCENE_SECONDS, this.elapsed(now));
    this.el.className = 'running';
    this.el.innerHTML = `<b>Benchmark ${this.index + 1} / ${BENCH_SCENES.length}</b> ${s.name}<br><i style="width:${(e / SCENE_SECONDS) * 100}%"></i>`;
  }

  /** Called once per frame with the frame's numbers. */
  tick(f: PerfFrame, now: number): void {
    if (!this.active || !this.scene) return;
    if (HOLD !== null) return;
    const e = this.elapsed(now);
    this.seen++;
    if (e > WARMUP_SECONDS && this.seen > WARMUP_FRAMES) this.samples.push(f);
    this.progress(now);
    if ((e >= SCENE_SECONDS && this.samples.length >= MIN_FRAMES) || e >= MAX_SCENE_SECONDS) this.finishScene(now);
  }

  private finishScene(now: number): void {
    const s = this.scene!;
    const f = this.samples;
    const times = f.map((p) => p.frame).sort((a, b) => a - b);
    const frameMs = mean(times);
    const gpuPasses = new Map<string, number[]>();
    for (const p of f) for (const [k, v] of Object.entries(p.gpu)) gpuPasses.set(k, [...(gpuPasses.get(k) ?? []), v]);
    const gpuTotal = [...gpuPasses.values()].reduce((s2, v) => s2 + mean(v), 0);
    const last = f[f.length - 1];
    this.rows.push({
      id: s.id,
      name: s.name,
      frames: f.length,
      fps: frameMs > 0 ? 1000 / frameMs : 0,
      frameMs,
      p95Ms: times.length ? times[Math.min(times.length - 1, Math.floor(times.length * 0.95))] : 0,
      worstMs: times.length ? times[times.length - 1] : 0,
      update: mean(f.map((p) => p.update)),
      render: mean(f.map((p) => p.render)),
      gpu: gpuPasses.size ? gpuTotal : null,
      gpuPasses: [...gpuPasses.entries()].map(([k, v]) => `${k} ${mean(v).toFixed(2)}`).join(' '),
      draws: mean(f.map((p) => p.draws)),
      tris: mean(f.map((p) => p.tris)),
      lights: last?.lights ?? 0,
      res: last ? `${last.width}x${last.height}` : '-',
    });
    if (this.index + 1 < BENCH_SCENES.length) this.go(this.index + 1, now);
    else this.finish();
  }

  private finish(): void {
    this.active = false;
    this.index = -1;
    this.host.done();
    const pad = (v: string | number, n: number, left = false) => (left ? String(v).padStart(n) : String(v).padEnd(n));
    const head = ['scene', 'fps', 'ms', 'p95', 'worst', 'cpuUpd', 'cpuRnd', 'gpuMs', 'draws', 'tris k', 'lights', 'frames', 'resolution'];
    const w = [30, 5, 6, 6, 6, 7, 7, 6, 6, 7, 6, 6, 11];
    const lines: string[] = [head.map((h, i) => pad(h, w[i], i > 0)).join(' ')];
    for (const r of this.rows) {
      lines.push(
        [
          pad(r.name, w[0]),
          pad(r.fps.toFixed(1), w[1], true),
          pad(r.frameMs.toFixed(1), w[2], true),
          pad(r.p95Ms.toFixed(1), w[3], true),
          pad(r.worstMs.toFixed(0), w[4], true),
          pad(r.update.toFixed(1), w[5], true),
          pad(r.render.toFixed(1), w[6], true),
          pad(r.gpu === null ? 'n/a' : r.gpu.toFixed(2), w[7], true),
          pad(r.draws.toFixed(0), w[8], true),
          pad((r.tris / 1000).toFixed(1), w[9], true),
          pad(r.lights, w[10], true),
          pad(r.frames, w[11], true),
          pad(r.res, w[12], true),
        ].join(' '),
      );
    }
    const gpuLines = this.rows.filter((r) => r.gpu !== null).map((r) => `  ${r.name}: ${r.gpuPasses}`);
    this.text = [`Fathomlight benchmark · ${new Date().toISOString().slice(0, 19)}Z`, this.host.info(), '', ...lines, ...(gpuLines.length ? ['', 'GPU ms per pass:', ...gpuLines] : [])].join('\n');
    this.el.className = 'done';
    this.el.innerHTML = '';
    const pre = document.createElement('pre');
    pre.textContent = this.text;
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy table';
    copy.addEventListener('click', () => {
      const ok = () => (copy.textContent = 'Copied');
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(this.text).then(ok, () => this.fallbackCopy(pre, ok));
      else this.fallbackCopy(pre, ok);
    });
    const again = document.createElement('button');
    again.type = 'button';
    again.textContent = 'Run again';
    again.addEventListener('click', () => location.reload());
    const row = document.createElement('div');
    row.className = 'row';
    row.append(copy, again);
    this.el.append(pre, row);
    (window as unknown as { __bench?: unknown }).__bench = { rows: this.rows, text: this.text };
  }

  private fallbackCopy(pre: HTMLElement, ok: () => void): void {
    const range = document.createRange();
    range.selectNodeContents(pre);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    try {
      document.execCommand('copy');
      ok();
    } catch {
      /* the table is selected; the user can copy it by hand */
    }
  }
}
