/**
 * Performance measuring (graphics session G1). Dev tool, off by default.
 *
 * - CPU: milliseconds the game's own frame code takes ("update") and the time
 *   spent handing drawing to the graphics card ("render"), from performance.now().
 * - GPU: milliseconds per pass, from EXT_disjoint_timer_query_webgl2 where the
 *   browser offers it (desktop Chrome and Edge do; Safari on iPhone does not,
 *   so there only frame time and the frame rate are shown).
 * - Draw calls and triangles per frame, counted by wrapping the GL draw calls
 *   while measuring is on.
 *
 * Passes are wrapped like `perf.pass('lit', () => renderer.render(...))`.
 * While measuring is off that is just a function call.
 */

export interface PerfFrame {
  /** Whole frame, ms between two frames (from the ticker). */
  frame: number;
  /** The game's own code, ms (frame loop minus the drawing it submits itself). */
  update: number;
  /** Submitting drawing to the graphics card, ms (all passes together). */
  render: number;
  /** GPU ms per pass, last finished reading (empty when timer queries are missing). */
  gpu: Record<string, number>;
  draws: number;
  tris: number;
  lights: number;
  width: number;
  height: number;
}

type GL = WebGL2RenderingContext;
interface TimerExt {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

class Perf {
  /** Collect numbers (overlay on, or the benchmark running). */
  on = false;
  private gl: GL | null = null;
  private ext: TimerExt | null = null;
  private patched = false;
  private t0 = 0;
  private renderMs = 0;
  private updMs = 0;
  private draws = 0;
  private tris = 0;
  private active: { q: WebGLQuery; name: string } | null = null;
  private pending: { q: WebGLQuery; name: string }[] = [];
  private gpuMs: Record<string, number> = {};
  /** Lights and size are filled in by the game each frame. */
  lights = 0;
  width = 0;
  height = 0;
  /** The last finished frame. */
  last: PerfFrame = { frame: 0, update: 0, render: 0, gpu: {}, draws: 0, tris: 0, lights: 0, width: 0, height: 0 };
  /** Set when a frame finishes, so the benchmark can sample it. */
  onFrame: ((f: PerfFrame) => void) | null = null;

  /** Does this browser offer GPU timing? */
  get hasGpuTimer(): boolean {
    return !!this.ext;
  }

  /** The graphics chip's name, when the browser says (it may be hidden), and whether it is a software renderer. */
  gpuName = 'unknown';
  software = false;

  attach(gl: GL): void {
    this.gl = gl;
    try {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) this.gpuName = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
    } catch {
      /* hidden by the browser */
    }
    this.software = /swiftshader|llvmpipe|software|softpipe/i.test(this.gpuName);
    try {
      // A software renderer has no real GPU to time: its queries only measure the wrong thing.
      this.ext = this.software ? null : ((gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExt | null) ?? null);
    } catch {
      this.ext = null;
    }
  }

  /** Start or stop measuring. Counting draw calls needs the GL draw functions wrapped, once. */
  enable(on: boolean): void {
    this.on = on;
    if (on && this.gl && !this.patched) this.patch(this.gl);
  }

  private patch(gl: GL): void {
    this.patched = true;
    const self = this;
    const g = gl as unknown as Record<string, (...a: number[]) => void>;
    const wrap = (name: string, count: (a: number[]) => number) => {
      const orig = g[name].bind(gl);
      g[name] = (...a: number[]) => {
        if (self.on) {
          self.draws++;
          self.tris += count(a);
        }
        orig(...a);
      };
    };
    // drawElements(mode, count, type, offset), drawArrays(mode, first, count)
    const tri = (mode: number, n: number) => (mode === gl.TRIANGLES ? n / 3 : mode === gl.TRIANGLE_STRIP || mode === gl.TRIANGLE_FAN ? Math.max(0, n - 2) : 0);
    wrap('drawElements', (a) => tri(a[0], a[1]));
    wrap('drawArrays', (a) => tri(a[0], a[2]));
    wrap('drawElementsInstanced', (a) => tri(a[0], a[1]) * (a[4] || 1));
    wrap('drawArraysInstanced', (a) => tri(a[0], a[2]) * (a[3] || 1));
  }

  /** Start of the frame (a ticker callback that runs before everything else). */
  frameStart(): void {
    if (!this.on) return;
    this.t0 = performance.now();
    this.renderMs = 0;
    this.draws = 0;
    this.tris = 0;
    this.pollGpu();
  }

  /** The frame loop is done and the final drawing is about to be submitted. */
  markUpdate(): void {
    if (this.on) this.updMs = performance.now() - this.t0 - this.renderMs;
  }

  /** Time a drawing pass: CPU submit time, and GPU time when the timer exists. */
  pass(name: string, fn: () => void): void {
    if (!this.on) {
      fn();
      return;
    }
    const gl = this.gl;
    const ext = this.ext;
    let q: WebGLQuery | null = null;
    // Only one timer query can run at a time, so a pass inside a pass is timed with the outer one.
    if (gl && ext && !this.active) {
      q = gl.createQuery();
      gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
      this.active = { q, name };
    }
    const t = performance.now();
    try {
      fn();
    } finally {
      this.renderMs += performance.now() - t;
      if (q && gl && ext && this.active) {
        gl.endQuery(ext.TIME_ELAPSED_EXT);
        this.pending.push(this.active);
        this.active = null;
      }
    }
  }

  /** Read back the queries that have finished (results arrive a frame or two late). */
  private pollGpu(): void {
    const gl = this.gl;
    const ext = this.ext;
    if (!gl || !ext || !this.pending.length) return;
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT) as boolean;
    while (this.pending.length) {
      const p = this.pending[0];
      if (!gl.getQueryParameter(p.q, gl.QUERY_RESULT_AVAILABLE)) break;
      this.pending.shift();
      if (!disjoint) {
        const ns = gl.getQueryParameter(p.q, gl.QUERY_RESULT) as number;
        this.gpuMs[p.name] = ns / 1e6;
      }
      gl.deleteQuery(p.q);
    }
    // A GPU that stalls can pile queries up; drop the oldest rather than grow forever.
    while (this.pending.length > 40) gl.deleteQuery(this.pending.shift()!.q);
  }

  /** The frame is over (after the stage has been drawn). */
  frameEnd(frameMs: number): void {
    if (!this.on) return;
    const f: PerfFrame = {
      frame: frameMs,
      update: this.updMs,
      render: this.renderMs,
      gpu: { ...this.gpuMs },
      draws: this.draws,
      tris: this.tris,
      lights: this.lights,
      width: this.width,
      height: this.height,
    };
    this.last = f;
    this.onFrame?.(f);
  }
}

export const perf = new Perf();

/** The on-screen readout: updates a few times a second so it can be read. */
export class PerfOverlay {
  private el: HTMLDivElement;
  private acc: PerfFrame[] = [];
  private since = 0;
  visible = false;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'perf';
    this.el.hidden = true;
    document.body.appendChild(this.el);
  }

  show(on: boolean): void {
    this.visible = on;
    this.el.hidden = !on;
    perf.enable(on || perf.onFrame !== null);
    this.acc = [];
  }

  /** Call once per frame with the finished frame; shows an average every half second. */
  tick(f: PerfFrame, nowMs: number): void {
    if (!this.visible) return;
    this.acc.push(f);
    if (nowMs - this.since < 500) return;
    this.since = nowMs;
    const n = this.acc.length;
    const avg = (get: (p: PerfFrame) => number) => this.acc.reduce((s, p) => s + get(p), 0) / n;
    const gpuNames = Object.keys(f.gpu);
    const rows: string[] = [];
    const fps = 1000 / Math.max(0.1, avg((p) => p.frame));
    rows.push(`<b>${fps.toFixed(0)}</b> fps · frame <b>${avg((p) => p.frame).toFixed(1)}</b> ms`);
    rows.push(`CPU update <b>${avg((p) => p.update).toFixed(1)}</b> · render <b>${avg((p) => p.render).toFixed(1)}</b> ms`);
    if (perf.hasGpuTimer) {
      const total = gpuNames.reduce((s, k) => s + (f.gpu[k] ?? 0), 0);
      rows.push(`GPU <b>${total.toFixed(2)}</b> ms: ` + gpuNames.map((k) => `${k} ${f.gpu[k].toFixed(2)}`).join(' · '));
    } else rows.push('GPU timer: not available here');
    rows.push(`draws <b>${Math.round(avg((p) => p.draws))}</b> · tris ${(avg((p) => p.tris) / 1000).toFixed(1)}k · lights <b>${f.lights}</b>`);
    rows.push(`${f.width} × ${f.height}`);
    this.el.innerHTML = rows.join('<br>');
    this.acc = [];
  }
}
