/**
 * The dive watch (Colin's request after milestone 1): a round gauge in the
 * top-left corner, drawn with code on a small canvas.
 *
 *  - The bezel ring is the oxygen gauge. It empties clockwise from 12
 *    o'clock. Pale lume when there is plenty, amber when it is getting low,
 *    pulsing red when it is nearly gone.
 *  - The big number in the middle is the depth in metres.
 *  - Below it is the dive time since leaving the surface, and a thin
 *    lume-tipped hand sweeps once a minute, like a real dive watch.
 */

const LUME = '#dfeccb';
const AMBER = '#e0a040';
const RED = '#d8492e';

export class DiveWatch {
  private ctx: CanvasRenderingContext2D;
  private size = 0;
  private dpr = 1;
  private last = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  private fit(): void {
    const size = this.canvas.clientWidth || 112;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    if (size !== this.size || dpr !== this.dpr) {
      this.size = size;
      this.dpr = dpr;
      this.canvas.width = Math.round(size * dpr);
      this.canvas.height = Math.round(size * dpr);
    }
  }

  /** oxygen and max in seconds; depth in metres; diveTime in seconds. Redraws at most ~20 times a second. */
  draw(now: number, oxygen: number, max: number, depth: number, diveTime: number, atSurface: boolean): void {
    if (now - this.last < 50) return;
    this.last = now;
    this.fit();
    const c = this.ctx;
    const S = this.size;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, S, S);
    const cx = S / 2;
    const cy = S / 2;
    const R = S / 2 - 2;
    const frac = Math.max(0, Math.min(1, oxygen / max));

    // Steel case.
    let g = c.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#c9d2d6');
    g.addColorStop(0.45, '#5f6a70');
    g.addColorStop(0.55, '#7d888d');
    g.addColorStop(1, '#2c3337');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, R, 0, Math.PI * 2);
    c.fill();

    // Bezel: dark ring with minute marks.
    const bezelOuter = R - 3;
    const bezelInner = R * 0.74;
    c.fillStyle = '#16191b';
    c.beginPath();
    c.arc(cx, cy, bezelOuter, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(223,236,203,0.35)';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const long = i % 5 === 0;
      const r0 = bezelOuter - (long ? 6 : 3.5);
      c.lineWidth = long ? 1.6 : 0.8;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      c.lineTo(cx + Math.cos(a) * (bezelOuter - 1.5), cy + Math.sin(a) * (bezelOuter - 1.5));
      c.stroke();
    }

    // Oxygen arc on the bezel.
    const low = frac < 0.35;
    const critical = frac < 0.15;
    const pulse = critical ? 0.55 + 0.45 * Math.sin(now / 120) : 1;
    const col = critical ? RED : low ? AMBER : LUME;
    const arcR = (bezelOuter + bezelInner) / 2 + 1;
    c.lineCap = 'round';
    c.lineWidth = bezelOuter - bezelInner - 6;
    c.strokeStyle = 'rgba(255,255,255,0.06)';
    c.beginPath();
    c.arc(cx, cy, arcR, 0, Math.PI * 2);
    c.stroke();
    if (frac > 0.002) {
      c.globalAlpha = pulse;
      c.strokeStyle = col;
      c.shadowColor = col;
      c.shadowBlur = critical ? 8 : 3;
      c.beginPath();
      c.arc(cx, cy, arcR, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      c.stroke();
      c.shadowBlur = 0;
      c.globalAlpha = 1;
    }
    // Triangle marker at 12, like a dive bezel.
    c.fillStyle = LUME;
    c.beginPath();
    c.moveTo(cx, cy - bezelOuter + 1);
    c.lineTo(cx - 4, cy - bezelOuter + 7);
    c.lineTo(cx + 4, cy - bezelOuter + 7);
    c.closePath();
    c.fill();

    // Dial.
    g = c.createRadialGradient(cx - R * 0.2, cy - R * 0.3, 2, cx, cy, bezelInner);
    g.addColorStop(0, '#2f3436');
    g.addColorStop(1, '#151819');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, bezelInner - 1, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(179,154,78,0.6)'; // brass inner ring
    c.lineWidth = 1;
    c.beginPath();
    c.arc(cx, cy, bezelInner - 1.5, 0, Math.PI * 2);
    c.stroke();

    // Text.
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = col;
    c.globalAlpha = low ? pulse : 0.85;
    c.font = `600 ${Math.round(S * 0.075)}px -apple-system, system-ui, sans-serif`;
    c.fillText(`O₂ ${Math.ceil(oxygen)}s`, cx, cy - S * 0.2);
    c.globalAlpha = 1;
    c.fillStyle = LUME;
    c.font = `700 ${Math.round(S * 0.19)}px -apple-system, system-ui, sans-serif`;
    const d = depth.toFixed(1);
    c.fillText(d, cx - S * 0.03, cy + S * 0.01);
    c.font = `600 ${Math.round(S * 0.075)}px -apple-system, system-ui, sans-serif`;
    c.fillStyle = 'rgba(223,236,203,0.7)';
    c.fillText('m', cx + S * 0.17, cy + S * 0.04);
    const m = Math.floor(diveTime / 60);
    const s = Math.floor(diveTime % 60);
    c.font = `500 ${Math.round(S * 0.07)}px ui-monospace, Menlo, monospace`;
    c.fillText(atSurface ? 'SURFACE' : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, cx, cy + S * 0.17);
    c.fillStyle = 'rgba(179,154,78,0.75)';
    c.font = `700 ${Math.round(S * 0.045)}px -apple-system, system-ui, sans-serif`;
    c.fillText('KESTREL', cx, cy + S * 0.26);

    // Sweep marker: a lume dot that circles the inside of the dial once a minute
    // (no hand across the middle, so the numbers stay readable).
    if (!atSurface) {
      const a = ((diveTime % 60) / 60) * Math.PI * 2 - Math.PI / 2;
      c.fillStyle = LUME;
      c.beginPath();
      c.arc(cx + Math.cos(a) * (bezelInner - 6), cy + Math.sin(a) * (bezelInner - 6), 2, 0, Math.PI * 2);
      c.fill();
    }

    // Glass glare.
    g = c.createLinearGradient(cx - R, cy - R, cx, cy);
    g.addColorStop(0, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, bezelInner - 2, Math.PI * 0.95, Math.PI * 1.75);
    c.closePath();
    c.fill();
  }
}
