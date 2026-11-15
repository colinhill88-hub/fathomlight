import { Container, Graphics } from 'pixi.js';

/**
 * The Echo whorl (milestone 5): a thumb-sized spiral of pale nacre with slow
 * rings of light pulsing inside it. It is the first thing in the shallows
 * that glows in the Choir's colours (cyan, violet, magenta), a hint that the
 * lights from the deep left it. Fitted to a creature tank or a machine, it
 * quickens it: one doubles its output, two triple it, and it uses its inputs
 * just as much faster.
 *
 * Drawn with code: a logarithmic spiral of shell chambers (lit), plus a
 * glowing spiral thread and rings (emissive) that the caller pulses.
 */

/** Points along a logarithmic spiral, from the outside in. */
function spiral(turns: number, r0: number, steps: number): [number, number][] {
  const pts: [number, number][] = [];
  const k = Math.log(r0 / 1.2) / (turns * Math.PI * 2);
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * turns * Math.PI * 2;
    const r = r0 * Math.exp(-k * a);
    pts.push([Math.cos(a + 0.6) * r, Math.sin(a + 0.6) * r * 0.92]);
  }
  return pts;
}

/** The lit shell, centred on 0,0. `s` scales it (1 = about 9 units across). */
export function drawWhorlShell(g: Graphics, s = 1): void {
  const r = 9 * s;
  // Body of the shell: a rounded whorl with a short flared lip.
  g.ellipse(0, 0, r * 1.05, r * 0.95).fill({ color: 0xcfc4b6 });
  g.poly([r * 0.5, -r * 0.7, r * 1.6, -r * 0.2, r * 1.3, r * 0.5, r * 0.6, r * 0.6]).fill({ color: 0xd9cfc2 });
  g.ellipse(-r * 0.2, -r * 0.25, r * 0.7, r * 0.5).fill({ color: 0xf1e9de, alpha: 0.6 });
  // Chamber lines following the spiral.
  const pts = spiral(2.4, r * 0.95, 60);
  g.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts) g.lineTo(p[0], p[1]);
  g.stroke({ color: 0x8c8278, width: 1.1 * s, alpha: 0.9 });
  for (let i = 6; i < pts.length - 6; i += 7) {
    const [x, y] = pts[i];
    const len = Math.hypot(x, y);
    g.moveTo(x, y)
      .lineTo(x * (1 - 2.2 / len), y * (1 - 2.2 / len))
      .stroke({ color: 0x9a9086, width: 0.6 * s, alpha: 0.8 });
  }
  // Iridescent sheen and a few weathered pits.
  g.ellipse(-r * 0.35, -r * 0.45, r * 0.35, r * 0.15).fill({ color: 0xb8e8ec, alpha: 0.35 });
  g.ellipse(r * 0.2, r * 0.45, r * 0.4, r * 0.12).fill({ color: 0xd8b8f0, alpha: 0.3 });
  g.circle(r * 0.6, r * 0.2, 0.7 * s).fill({ color: 0x6e665e, alpha: 0.6 });
  g.circle(-r * 0.7, r * 0.3, 0.6 * s).fill({ color: 0x6e665e, alpha: 0.5 });
}

/** The glowing thread inside the shell (emissive). */
export function drawWhorlLight(g: Graphics, s = 1): void {
  const pts = spiral(2.4, 8 * s, 50);
  g.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts) g.lineTo(p[0], p[1]);
  g.stroke({ color: 0x8ff4ff, width: 1.4 * s, alpha: 0.9 });
  g.circle(0, 0, 2.2 * s).fill({ color: 0xf0d0ff });
}

/** A soft halo for the glow layer. */
export function drawWhorlHalo(g: Graphics, s = 1): void {
  g.circle(0, 0, 16 * s).fill({ color: 0x7a5cff, alpha: 0.55 });
  g.circle(0, 0, 8 * s).fill({ color: 0x5ce8ff, alpha: 0.7 });
}

/**
 * A whorl with its own pulsing: shell (lit), light and an expanding ring
 * (emissive), halo (glow). Call pulse() every frame.
 */
export class WhorlArt {
  readonly shell = new Graphics();
  readonly light = new Container();
  readonly halo = new Graphics();
  private thread = new Graphics();
  private ring = new Graphics();
  private phase = Math.random() * 6;

  constructor(s = 1) {
    drawWhorlShell(this.shell, s);
    drawWhorlLight(this.thread, s);
    drawWhorlHalo(this.halo, s);
    this.light.addChild(this.thread, this.ring);
    this.s = s;
  }

  private s: number;

  setPosition(x: number, y: number): void {
    this.shell.position.set(x, y);
    this.light.position.set(x, y);
    this.halo.position.set(x, y);
  }

  setVisible(v: boolean): void {
    this.shell.visible = this.light.visible = this.halo.visible = v;
  }

  /** Slow pulse: the thread brightens, a ring of light spreads out and fades, cycling cyan to violet. */
  pulse(time: number, strength = 1): void {
    const t = (time * 0.45 + this.phase) % 1;
    const p = 0.6 + 0.4 * Math.sin(time * 2.1 + this.phase);
    this.thread.alpha = (0.55 + 0.45 * p) * strength;
    this.halo.alpha = (0.35 + 0.35 * p) * strength;
    this.thread.tint = mix(0xffffff, 0xe0b8ff, 0.5 + 0.5 * Math.sin(time * 0.7 + this.phase));
    this.ring.clear();
    const r = (6 + t * 22) * this.s;
    this.ring.circle(0, 0, r).stroke({ color: t < 0.5 ? 0x8ff4ff : 0xd08cff, width: 1.2 * this.s, alpha: (1 - t) * 0.7 * strength });
  }
}

function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

/** A small SVG of the whorl for the interface. */
export const WHORL_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="11" cy="12" rx="8" ry="7.4" fill="#cfc4b6"/><path d="M15 6l6 4-2 5-5 1z" fill="#d9cfc2"/><path d="M5 12a6 6 0 1 1 6 6 4.4 4.4 0 0 1-4-4 3 3 0 0 1 3-3 2 2 0 0 1 2 2" fill="none" stroke="#5ce8ff" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="13" r="1.3" fill="#e0b8ff"/></svg>';
