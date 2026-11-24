/**
 * The dive watch (Colin's request after milestone 1; redesigned Nov 24, 2026):
 * a vintage hand-painted tarnished-brass marine pressure & depth gauge in the
 * top-left corner with live moving mechanical pieces on a 2D canvas.
 *
 *  - Outer housing: hand-painted riveted antique brass bezel with verdigris
 *    patina and slotted screws (falls back cleanly to code art with ?art=procedural).
 *  - Luminous O₂ pressure arc + live sweeping antique brass pointer needle:
 *    empties clockwise from 12 o'clock; pale radium-cream when full, amber when
 *    getting low, pulsing coral-red when nearly gone, and sweeps smoothly back
 *    to 12 o'clock when refilling at the surface or in an air pocket.
 *  - Center dial: depth in metres (amber near crush depth, pulsing red past it),
 *    dive time (or SURFACE), and a live sweeping lume seconds hand with a soft
 *    phosphor trail.
 *  - Twin curved sub-arcs: Suit Integrity across the top, Dive Bag Load across
 *    the bottom with a brass rated-load notch tick.
 */

import bezelUrl from '../art/ui/dive_gauge_bezel.jpg?url';

const LUME = '#e6f0cc';
const BRASS = '#d4b168';
const BRASS_DARK = '#6f5528';
const AMBER = '#e5a23c';
const RED = '#e04a32';

/** Key out pure-white corners & decontaminate fringe on the circular brass bezel into a tight square canvas. */
function prepareBezelCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  const sctx = src.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(img, 0, 0);
  const id = sctx.getImageData(0, 0, w, h);
  const d = id.data;
  const n = w * h;
  const bg = new Uint8Array(n);
  const q = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const push = (idx: number) => {
    if (bg[idx]) return;
    const o = idx * 4;
    const r = d[o];
    const g = d[o + 1];
    const b = d[o + 2];
    const hi = Math.max(r, g, b);
    const lo = Math.min(r, g, b);
    if (lo >= 218 && hi - lo <= 28) {
      bg[idx] = 1;
      q[tail++] = idx;
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + (w - 1));
  }
  while (head < tail) {
    const idx = q[head++];
    const x = idx % w;
    const y = (idx - x) / w;
    if (x > 0) push(idx - 1);
    if (x + 1 < w) push(idx + 1);
    if (y > 0) push(idx - w);
    if (y + 1 < h) push(idx + w);
  }
  let x0 = w;
  let y0 = h;
  let x1 = 0;
  let y1 = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (bg[i]) {
      d[o + 3] = 0;
      continue;
    }
    const x = i % w;
    const y = (i - x) / w;
    // Softly feather & decontaminate 1px ring touching white background.
    const nearBg =
      (x > 0 && bg[i - 1]) ||
      (x + 1 < w && bg[i + 1]) ||
      (y > 0 && bg[i - w]) ||
      (y + 1 < h && bg[i + w]);
    if (nearBg) {
      const lum = (d[o] + d[o + 1] + d[o + 2]) / 3;
      if (lum > 185) {
        const a = Math.max(0, Math.min(1, (242 - lum) / 57));
        d[o + 3] = Math.round(a * 255);
        d[o] = Math.round(d[o] * 0.45);
        d[o + 1] = Math.round(d[o + 1] * 0.42);
        d[o + 2] = Math.round(d[o + 2] * 0.35);
      }
    }
    if (d[o + 3] > 24) {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  sctx.putImageData(id, 0, 0);
  const cw = Math.max(1, x1 - x0 + 1);
  const ch = Math.max(1, y1 - y0 + 1);
  const side = Math.min(512, Math.max(cw, ch));
  const out = document.createElement('canvas');
  out.width = side;
  out.height = side;
  const octx = out.getContext('2d')!;
  octx.drawImage(src, x0, y0, cw, ch, 0, 0, side, side);
  return out;
}

export class DiveWatch {
  private ctx: CanvasRenderingContext2D;
  private size = 0;
  private dpr = 1;
  private last = 0;
  private bezel: HTMLCanvasElement | null = null;
  private shownFrac = -1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    const procedural = typeof location !== 'undefined' && new URLSearchParams(location.search).get('art') === 'procedural';
    if (!procedural) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        try {
          this.bezel = prepareBezelCanvas(img);
          this.last = 0;
        } catch {
          this.bezel = null;
        }
      };
      img.src = bezelUrl;
    }
  }

  private fit(): void {
    const size = this.canvas.clientWidth || 118;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    if (size !== this.size || dpr !== this.dpr) {
      this.size = size;
      this.dpr = dpr;
      this.canvas.width = Math.round(size * dpr);
      this.canvas.height = Math.round(size * dpr);
    }
  }

  /** oxygen and max in seconds; depth in metres; diveTime in seconds. Redraws at most ~30 times a second. */
  draw(
    now: number,
    oxygen: number,
    max: number,
    depth: number,
    diveTime: number,
    atSurface: boolean,
    bag: { kg: number; rated: number; max: number } = { kg: 0, rated: 1, max: 1 },
    suit = 1,
    /** Milestone 10: the suit's (or the sub's) crush depth in metres; the depth turns amber near it and red past it. */
    limit = Infinity,
  ): void {
    if (now - this.last < 33) return;
    const dt = this.last > 0 ? Math.min(0.15, (now - this.last) / 1000) : 0.05;
    this.last = now;
    this.fit();
    const c = this.ctx;
    const S = this.size;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, S, S);
    const cx = S / 2;
    const cy = S / 2;
    const R = S / 2 - 1;
    const targetFrac = Math.max(0, Math.min(1, oxygen / max));
    if (this.shownFrac < 0) this.shownFrac = targetFrac;
    else this.shownFrac += (targetFrac - this.shownFrac) * (1 - Math.exp(-10 * dt));
    const frac = this.shownFrac;

    // 1. Housing: hand-painted vintage brass bezel clipped cleanly to a silky-smooth circle (or procedural fallback).
    const dialR = R * 0.675;
    if (this.bezel) {
      c.save();
      c.beginPath();
      c.arc(cx, cy, R - 1.4, 0, Math.PI * 2);
      c.clip();
      c.drawImage(this.bezel, -1.2, -1.2, S + 2.4, S + 2.4);
      c.restore();
      // Smooth anti-aliased dark-bronze outer rim bevel to eliminate any cutout stair-stepping.
      c.strokeStyle = 'rgba(26, 20, 11, 0.82)';
      c.lineWidth = 1.6;
      c.beginPath();
      c.arc(cx, cy, R - 1.4, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = 'rgba(220, 188, 118, 0.28)';
      c.lineWidth = 0.9;
      c.beginPath();
      c.arc(cx, cy, R - 2.4, -Math.PI * 0.85, -Math.PI * 0.15);
      c.stroke();
    } else {
      let g = c.createLinearGradient(0, 0, S, S);
      g.addColorStop(0, '#c8a65a');
      g.addColorStop(0.45, '#7e6334');
      g.addColorStop(0.65, '#9d7f46');
      g.addColorStop(1, '#3d301c');
      c.fillStyle = g;
      c.beginPath();
      c.arc(cx, cy, R, 0, Math.PI * 2);
      c.fill();
      g = c.createRadialGradient(cx - R * 0.15, cy - R * 0.25, 2, cx, cy, dialR);
      g.addColorStop(0, '#1e2c32');
      g.addColorStop(1, '#0e161a');
      c.fillStyle = g;
      c.beginPath();
      c.arc(cx, cy, dialR + 2, 0, Math.PI * 2);
      c.fill();
    }

    // Subtle deep-sea radial depth sheen inside the painted bezel's dark enamel dial.
    const dialGrad = c.createRadialGradient(cx - dialR * 0.18, cy - dialR * 0.24, 2, cx, cy, dialR);
    dialGrad.addColorStop(0, 'rgba(42,64,70,0.22)');
    dialGrad.addColorStop(0.75, 'rgba(12,20,24,0.18)');
    dialGrad.addColorStop(1, 'rgba(5,10,12,0.52)');
    c.fillStyle = dialGrad;
    c.beginPath();
    c.arc(cx, cy, dialR, 0, Math.PI * 2);
    c.fill();

    // 2. Clean 12-hour vintage brass tick marks inside the enamel dial.
    const tickOuter = dialR * 0.96;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const major = i % 3 === 0;
      const r0 = tickOuter - (major ? S * 0.036 : S * 0.022);
      c.strokeStyle = major ? 'rgba(212,177,104,0.72)' : 'rgba(223,236,203,0.28)';
      c.lineWidth = major ? 1.4 : 0.8;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      c.lineTo(cx + Math.cos(a) * tickOuter, cy + Math.sin(a) * tickOuter);
      c.stroke();
    }

    // 3. Single clean luminous O₂ pressure arc + sleek brass pointer needle.
    const low = targetFrac < 0.35;
    const critical = targetFrac < 0.15;
    const pulse = critical ? 0.55 + 0.45 * Math.sin(now / 120) : 1;
    const col = critical ? RED : low ? AMBER : LUME;
    const arcR = dialR * 0.855;
    const arcW = Math.max(3.6, S * 0.035);
    c.lineCap = 'round';
    c.lineWidth = arcW;
    c.strokeStyle = 'rgba(255,255,255,0.07)';
    c.beginPath();
    c.arc(cx, cy, arcR, 0, Math.PI * 2);
    c.stroke();
    const o2End = -Math.PI / 2 + frac * Math.PI * 2;
    if (frac > 0.002) {
      c.globalAlpha = pulse;
      c.strokeStyle = col;
      c.shadowColor = col;
      c.shadowBlur = critical ? 9 : 3.5;
      c.beginPath();
      c.arc(cx, cy, arcR, -Math.PI / 2, o2End);
      c.stroke();
      c.shadowBlur = 0;
      c.globalAlpha = 1;
    }

    // Moving mechanical brass O₂ pointer riding smoothly on the arc's leading edge.
    {
      c.save();
      c.translate(cx, cy);
      c.rotate(o2End);
      const tipX = tickOuter;
      const baseX = arcR - arcW * 1.1;
      c.fillStyle = BRASS;
      c.strokeStyle = '#1b1409';
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(tipX, 0);
      c.lineTo(baseX, -3.1);
      c.lineTo(baseX + 2, 0);
      c.lineTo(baseX, 3.1);
      c.closePath();
      c.fill();
      c.stroke();
      c.restore();
    }

    // 4. Contextual inner sub-gauges (only shown when suit is damaged or bag carries weight).
    const subR = dialR * 0.725;
    const subW = Math.max(2.2, S * 0.02);
    if (suit < 0.995) {
      const s0 = Math.PI * 1.22;
      const s1 = Math.PI * 1.78;
      c.lineWidth = subW;
      c.strokeStyle = 'rgba(212,177,104,0.14)';
      c.beginPath();
      c.arc(cx, cy, subR, s0, s1);
      c.stroke();
      if (suit > 0.002) {
        const scol = suit < 0.35 ? RED : suit < 0.7 ? AMBER : LUME;
        c.strokeStyle = scol;
        c.globalAlpha = suit < 0.35 ? 0.6 + 0.4 * Math.sin(now / 110) : 0.9;
        c.beginPath();
        c.arc(cx, cy, subR, s0, s0 + suit * (s1 - s0));
        c.stroke();
        c.globalAlpha = 1;
      }
    }
    const wf = Math.max(0, Math.min(1, bag.kg / bag.max));
    const over = bag.kg > bag.rated + 0.01;
    const full = bag.kg >= bag.max - 0.01;
    if (bag.kg > 0.01) {
      const a0 = Math.PI * 0.78;
      const a1 = Math.PI * 0.22;
      const span = a0 - a1;
      c.lineWidth = subW;
      c.strokeStyle = 'rgba(212,177,104,0.14)';
      c.beginPath();
      c.arc(cx, cy, subR, a1, a0);
      c.stroke();
      const wcol = full ? RED : over ? AMBER : LUME;
      c.strokeStyle = wcol;
      c.globalAlpha = 0.9;
      c.beginPath();
      c.arc(cx, cy, subR, a0 - wf * span, a0);
      c.stroke();
      c.globalAlpha = 1;
    }

    // 6. Crisp vintage instrument readouts centered in the enamel dial.
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = col;
    c.globalAlpha = low ? pulse : 0.92;
    c.font = `700 ${Math.round(S * 0.068)}px -apple-system, system-ui, sans-serif`;
    c.fillText(`O₂ ${Math.ceil(oxygen)}s`, cx, cy - S * 0.145);
    c.globalAlpha = 1;

    c.fillStyle = depth > limit ? (Math.sin(now / 110) > 0 ? RED : '#ffd0c0') : depth > limit - 5 ? AMBER : LUME;
    c.font = `700 ${Math.round(S * 0.165)}px -apple-system, system-ui, sans-serif`;
    const d = depth.toFixed(1);
    c.fillText(d, cx - S * 0.028, cy + S * 0.005);
    c.font = `600 ${Math.round(S * 0.068)}px -apple-system, system-ui, sans-serif`;
    c.fillStyle = 'rgba(212,177,104,0.82)';
    c.fillText('m', cx + S * 0.145, cy + S * 0.032);

    const m = Math.floor(diveTime / 60);
    const s = Math.floor(diveTime % 60);
    c.fillStyle = 'rgba(230,240,204,0.78)';
    c.font = `600 ${Math.round(S * 0.062)}px ui-monospace, Menlo, monospace`;
    c.fillText(atSurface ? 'SURFACE' : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, cx, cy + S * 0.132);

    if (bag.kg > 0.01) {
      c.fillStyle = full ? RED : over ? AMBER : 'rgba(230,240,204,0.82)';
      c.font = `700 ${Math.round(S * 0.052)}px -apple-system, system-ui, sans-serif`;
      c.fillText(full ? 'FULL' : `${bag.kg.toFixed(1)} kg`, cx, cy + S * 0.2);
    } else {
      c.fillStyle = 'rgba(212,177,104,0.72)';
      c.font = `700 ${Math.round(S * 0.042)}px -apple-system, system-ui, sans-serif`;
      c.fillText('KESTREL', cx, cy + S * 0.202);
    }

    // Thin engraved antique brass inner crystal ring.
    c.strokeStyle = BRASS_DARK;
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(cx, cy, dialR, 0, Math.PI * 2);
    c.stroke();

    // 7. Curved convex crystal glass dome sheen.
    c.save();
    c.beginPath();
    c.arc(cx, cy, dialR - 0.5, 0, Math.PI * 2);
    c.clip();
    const glare = c.createLinearGradient(cx - dialR, cy - dialR, cx + dialR * 0.2, cy + dialR * 0.2);
    glare.addColorStop(0, 'rgba(255,250,235,0.16)');
    glare.addColorStop(0.45, 'rgba(255,250,235,0.03)');
    glare.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = glare;
    c.beginPath();
    c.ellipse(cx - dialR * 0.18, cy - dialR * 0.42, dialR * 0.85, dialR * 0.46, -0.35, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}
