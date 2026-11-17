import { Container, Graphics, Text } from 'pixi.js';
import { BaseLayout } from '../game/base';
import { Factory, lineCode, lineRoute, lineSlot, LineKind, tierOf } from '../game/factory';
import { MaterialId, SaveData } from '../game/state';
import { mulberry32, WORLD_SEED } from '../rng';

/**
 * Drawing conveyors and feed pipes (milestone 5), all with code.
 *
 * A conveyor is a dark rubber belt on steel rollers with a side rail and
 * transfer boxes at its bends; bundles of material ride along it while it
 * runs. A feed pipe is weathered copper with brass flanges and green
 * verdigris; soft pulses of mash travel down it while it pumps.
 *
 * Milestone 5 part 2: every line carries its Kestrel stencil code (CB-1,
 * CB-2, FL-1, FL-2) on a small painted plate. CB-2 belts have yellow-and-
 * black hazard rails and run faster; FL-2 pipes are steel-jacketed with
 * hull-plating bands. Bundles on a belt take the colour of what they carry.
 *
 * Lines are drawn in front of the base pieces (they run along the near side
 * of the base) but behind the diver.
 */

let rand = mulberry32(1);
const R = (a: number, b: number) => a + rand() * (b - a);

const BELT = 10;
/** Bundle colours on a belt, by what it carries: body and highlight. */
export const ITEM_COLOURS: Record<MaterialId, [number, number]> = {
  fibre: [0xc8a050, 0xf0d890],
  scrap: [0x7a685a, 0xb0a8a0],
  copper: [0x7d6048, 0x7fc39a],
  quartz: [0xd8ded0, 0xffffff],
  plate: [0x8e9a9c, 0xdfe6e8],
  resin: [0xb8782a, 0xf0c070],
  moss: [0x7a9a40, 0xe0f0a0],
  brass: [0xa8822e, 0xe8c870],
};
const PIPE = 9;

/** Length of a polyline. */
function polyLength(pts: [number, number][]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}

/** The point at distance d along a polyline. */
export function pointAlong(pts: [number, number][], d: number): [number, number] {
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const l = Math.hypot(bx - ax, by - ay);
    if (d <= l || i === pts.length - 1) {
      const t = l ? Math.min(1, d / l) : 0;
      return [ax + (bx - ax) * t, ay + (by - ay) * t];
    }
    d -= l;
  }
  return pts[pts.length - 1];
}

function drawBelt(g: Graphics, pts: [number, number][], tier = 1): void {
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const horiz = Math.abs(by - ay) < 0.5;
    const x0 = Math.min(ax, bx);
    const y0 = Math.min(ay, by);
    const len = horiz ? Math.abs(bx - ax) : Math.abs(by - ay);
    if (len < 1) continue;
    if (horiz) {
      g.rect(x0, ay - BELT / 2 - 2, len, BELT + 5).fill({ color: 0x3b4448 });
      g.rect(x0, ay - BELT / 2, len, BELT).fill({ color: 0x2b2a26 });
      g.rect(x0, ay - BELT / 2, len, 2).fill({ color: 0x5a5850, alpha: 0.9 });
      g.rect(x0, ay + BELT / 2, len, 3).fill({ color: 0x5b6467 });
      for (let x = x0 + 8; x < x0 + len - 4; x += 20) g.circle(x, ay + BELT / 2 + 1.5, 2.2).fill({ color: 0x8a9496 });
      if (tier > 1) for (let x = x0; x < x0 + len - 6; x += 12) g.rect(x, ay + BELT / 2, Math.min(6, x0 + len - x), 3).fill({ color: x % 24 < 12 ? 0xb8923f : 0x1c1c1a });
    } else {
      g.rect(ax - BELT / 2 - 2, y0, BELT + 5, len).fill({ color: 0x3b4448 });
      g.rect(ax - BELT / 2, y0, BELT, len).fill({ color: 0x2b2a26 });
      g.rect(ax - BELT / 2, y0, 2, len).fill({ color: 0x5a5850, alpha: 0.9 });
      g.rect(ax + BELT / 2, y0, 3, len).fill({ color: 0x5b6467 });
      for (let y = y0 + 8; y < y0 + len - 4; y += 20) g.circle(ax + BELT / 2 + 1.5, y, 2.2).fill({ color: 0x8a9496 });
      if (tier > 1) for (let y = y0; y < y0 + len - 6; y += 12) g.rect(ax + BELT / 2, y, 3, Math.min(6, y0 + len - y)).fill({ color: y % 24 < 12 ? 0xb8923f : 0x1c1c1a });
    }
    // Rust streaks and algae specks.
    for (let k = 0; k < len / 40; k++) {
      const t = rand();
      const x = horiz ? x0 + t * len : ax + R(-4, 4);
      const y = horiz ? ay + BELT / 2 + R(1, 4) : y0 + t * len;
      g.rect(x, y, 1.2, R(3, 9)).fill({ color: 0x8a3a20, alpha: 0.45 });
      if (rand() < 0.4) g.circle(x + R(-2, 2), y - R(0, 3), R(1, 2)).fill({ color: 0x5e7a3c, alpha: 0.7 });
    }
  }
  // Transfer boxes at the bends, and chutes at both ends.
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    g.roundRect(x - 9, y - 9, 18, 18, 3).fill({ color: 0x5b6467 });
    g.roundRect(x - 9, y - 9, 18, 4, 2).fill({ color: 0xb8923f });
    for (const [dx, dy] of [[-5, -1], [5, -1], [-5, 6], [5, 6]]) g.circle(x + dx, y + dy, 1.1).fill({ color: 0x2a3033 });
  }
  for (const [x, y] of [pts[0], pts[pts.length - 1]]) {
    g.poly([x - 11, y - 8, x + 11, y - 8, x + 7, y + 4, x - 7, y + 4]).fill({ color: 0x5b6467 });
    g.rect(x - 11, y - 8, 22, 2).fill({ color: 0xffffff, alpha: 0.15 });
  }
}

function drawPipe(g: Graphics, pts: [number, number][], tier = 1): void {
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const horiz = Math.abs(by - ay) < 0.5;
    const x0 = Math.min(ax, bx);
    const y0 = Math.min(ay, by);
    const len = horiz ? Math.abs(bx - ax) : Math.abs(by - ay);
    if (len < 1) continue;
    if (horiz) {
      if (tier > 1) g.rect(x0, ay - PIPE / 2 - 2, len, PIPE + 4).fill({ color: 0x5b6467 });
      g.rect(x0, ay - PIPE / 2, len, PIPE).fill({ color: 0x8a6a3a });
      g.rect(x0, ay - PIPE / 2 + 1, len, 2.2).fill({ color: 0xd4aa6a, alpha: 0.55 });
      g.rect(x0, ay + PIPE / 2 - 3, len, 3).fill({ color: 0x4a3820, alpha: 0.6 });
      for (let x = x0 + 24; x < x0 + len - 10; x += 48) {
        g.rect(x - 2, ay - PIPE / 2 - 2.5, 4, PIPE + 5).fill({ color: tier > 1 ? 0x8e9a9c : 0xa88a4a });
        g.rect(x - 2, ay - PIPE / 2 - 2.5, 1.2, PIPE + 5).fill({ color: 0xffffff, alpha: 0.2 });
      }
    } else {
      if (tier > 1) g.rect(ax - PIPE / 2 - 2, y0, PIPE + 4, len).fill({ color: 0x5b6467 });
      g.rect(ax - PIPE / 2, y0, PIPE, len).fill({ color: 0x8a6a3a });
      g.rect(ax - PIPE / 2 + 1, y0, 2.2, len).fill({ color: 0xd4aa6a, alpha: 0.55 });
      g.rect(ax + PIPE / 2 - 3, y0, 3, len).fill({ color: 0x4a3820, alpha: 0.6 });
      for (let y = y0 + 24; y < y0 + len - 10; y += 48) {
        g.rect(ax - PIPE / 2 - 2.5, y - 2, PIPE + 5, 4).fill({ color: tier > 1 ? 0x8e9a9c : 0xa88a4a });
        g.rect(ax - PIPE / 2 - 2.5, y - 2, PIPE + 5, 1.2).fill({ color: 0xffffff, alpha: 0.2 });
      }
    }
    // Verdigris.
    for (let k = 0; k < len / 34; k++) {
      const t = rand();
      const x = horiz ? x0 + t * len : ax + R(-3, 3);
      const y = horiz ? ay + R(-3, 3) : y0 + t * len;
      g.ellipse(x, y, R(2, 6), R(1, 3)).fill({ color: 0x5e8a6e, alpha: R(0.3, 0.6) });
    }
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    g.circle(x, y, PIPE / 2 + 2).fill({ color: 0x8a6a3a });
    g.circle(x - 1, y - 1, 2.5).fill({ color: 0xd4aa6a, alpha: 0.4 });
  }
  for (const [x, y] of [pts[0], pts[pts.length - 1]]) {
    g.roundRect(x - 8, y - 4, 16, 8, 2).fill({ color: 0xa88a4a });
    g.circle(x, y, 2).fill({ color: 0x3a3020 });
  }
}

/** A path for drawing a line, given the pieces it joins. */
export function routeFor(save: SaveData, layout: BaseLayout, l: { id: number; kind: LineKind; from: number; to: number }): [number, number][] | null {
  const a = layout.pieces.find((p) => p.id === l.from);
  const b = layout.pieces.find((p) => p.id === l.to);
  if (!a || !b) return null;
  return lineRoute(a, b, l.kind, lineSlot(save, l)).pts;
}

export class LinesView {
  readonly view = new Container();
  private still = new Graphics();
  private moving = new Graphics();
  private labels = new Container();
  private routes = new Map<number, { kind: LineKind; tier: number; pts: [number, number][]; len: number; x0: number; x1: number }>();

  constructor() {
    this.view.addChild(this.still, this.labels, this.moving);
  }

  /** A stencilled code plate (CB-1, FL-2...) on the longest stretch of a line. */
  private label(code: string, kind: LineKind, pts: [number, number][]): void {
    let best = 1;
    let bestLen = -1;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (l > bestLen) {
        bestLen = l;
        best = i;
      }
    }
    if (bestLen < 40) return;
    const [ax, ay] = pts[best - 1];
    const [bx, by] = pts[best];
    const horiz = Math.abs(by - ay) < 0.5;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const plate = new Graphics();
    const w = 30;
    const h = 11;
    plate.roundRect(-w / 2, -h / 2, w, h, 2).fill({ color: kind === 'belt' ? 0x2a3033 : 0x4a3820 });
    plate.roundRect(-w / 2, -h / 2, w, 2, 1).fill({ color: 0xffffff, alpha: 0.12 });
    plate.circle(-w / 2 + 2.5, 0, 0.9).fill({ color: 0x8a9496 });
    plate.circle(w / 2 - 2.5, 0, 0.9).fill({ color: 0x8a9496 });
    const t = new Text({
      text: code,
      style: { fontFamily: 'Courier New, monospace', fontSize: 8, fontWeight: 'bold', fill: 0xe8d8a8, letterSpacing: 0.4 },
      resolution: 6,
    });
    t.anchor.set(0.5);
    t.alpha = 0.85;
    const c = new Container();
    c.addChild(plate, t);
    // On a horizontal run it hangs just under the belt or pipe; on a vertical one it sits beside it.
    if (horiz) c.position.set(mx, my + (kind === 'belt' ? 13 : 12));
    else {
      c.position.set(mx + 14, my);
      c.rotation = -Math.PI / 2;
    }
    this.labels.addChild(c);
  }

  sync(save: SaveData, layout: BaseLayout): void {
    this.still.clear();
    this.routes.clear();
    for (const c of this.labels.removeChildren()) c.destroy({ children: true });
    for (const l of save.lines) {
      const pts = routeFor(save, layout, l);
      if (!pts) continue;
      rand = mulberry32(WORLD_SEED ^ (l.id * 4447 + 0x71e));
      const tier = tierOf(l);
      if (l.kind === 'belt') drawBelt(this.still, pts, tier);
      else drawPipe(this.still, pts, tier);
      this.label(lineCode(l), l.kind, pts);
      const xs = pts.map((p) => p[0]);
      this.routes.set(l.id, { kind: l.kind, tier, pts, len: polyLength(pts), x0: Math.min(...xs), x1: Math.max(...xs) });
    }
  }

  /** Items riding the running conveyors, pulses in the pumping pipes. */
  update(dt: number, factory: Factory, viewX0: number, viewX1: number): void {
    const g = this.moving;
    g.clear();
    for (const [id, r] of this.routes) {
      const fl = factory.flows.get(id);
      if (!fl || fl.rate <= 0.02 || r.x1 < viewX0 - 50 || r.x0 > viewX1 + 50) continue;
      if (r.kind === 'belt') {
        fl.phase = (fl.phase + (dt * (r.tier > 1 ? 44 : 24)) / 28) % 1;
        const [col, hi] = ITEM_COLOURS[fl.item ?? 'fibre'];
        for (let d = fl.phase * 28; d < r.len - 6; d += 28) {
          const [x, y] = pointAlong(r.pts, d);
          g.roundRect(x - 3.5, y - 7, 7, 5, 1.5).fill({ color: col });
          g.rect(x - 3, y - 6.5, 6, 1.2).fill({ color: hi, alpha: 0.7 });
        }
      } else {
        fl.phase = (fl.phase + (dt * (r.tier > 1 ? 70 : 40)) / 60) % 1;
        for (let d = fl.phase * 60; d < r.len; d += 60) {
          const [x, y] = pointAlong(r.pts, d);
          g.circle(x, y, 3.2).fill({ color: 0xd8e6a0, alpha: 0.5 });
        }
      }
    }
  }

  /** The line whose route passes within `reach` of a world point, if any. */
  lineAt(x: number, y: number, reach: number): number | null {
    let best: number | null = null;
    let bestD = reach;
    for (const [id, r] of this.routes) {
      for (let i = 1; i < r.pts.length; i++) {
        const d = distToSegment(x, y, r.pts[i - 1], r.pts[i]);
        if (d < bestD) {
          bestD = d;
          best = id;
        }
      }
    }
    return best;
  }

  route(id: number): [number, number][] | null {
    return this.routes.get(id)?.pts ?? null;
  }
}

function distToSegment(x: number, y: number, a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)) : 0;
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
}
