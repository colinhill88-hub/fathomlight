import { pieceRect, type Placed } from '../game/base';
import type { Graphics } from 'pixi.js';

/** Local positions in the side cutaway of the 4-wide dock (Sub Berth left, Diver Entry Well right). */
export const POOL_HALF_WIDTH = 50;
export const POOL_SURFACE_Y = 91;
export const POOL_MOUTH_Y = 142;
export const POOL_LADDER_X = 0;

/** Same skewed berth brace from the outside and through the flooded cutaway. */
export function drawDockBrace(g: Graphics, x: number, roofY: number, side: number, scale = 1): void {
  const ax = x + side * 102 * scale;
  const bx = x + side * 148 * scale;
  const ay = roofY + 105 * scale;
  const by = roofY + 191 * scale;
  g.moveTo(ax, ay).lineTo(bx, by).stroke({ color: 0x234045, width: 11 * scale });
  g.moveTo(ax, ay).lineTo(bx, by).stroke({ color: 0x527c75, width: 8 * scale });
  g.moveTo(ax - side * 2 * scale, ay).lineTo(bx - side * 2 * scale, by)
    .stroke({ color: 0xcaa879, width: 1.8 * scale, alpha: 0.84 });
  const y = ay + (by - ay) * 0.53;
  const px = ax + (bx - ax) * 0.53;
  g.circle(px, y, 5 * scale).fill(0x425759);
  g.circle(px - scale, y - scale, 2.3 * scale).fill(0xc4ac85);
}

export function moonpoolOf(dock: Placed) {
  const r = pieceRect(dock);
  const x = r.x + r.w * 0.80;
  return { x, y: r.y + POOL_SURFACE_Y, mouth: r.y + POOL_MOUTH_Y, ladder: x + POOL_LADDER_X };
}
