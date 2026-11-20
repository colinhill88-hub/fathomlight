import { pieceRect, type Placed } from '../game/base';

/** Local positions in the side cutaway of the dock, also used by the exterior art. */
export const POOL_HALF_WIDTH = 64;
export const POOL_SURFACE_Y = 91;
export const POOL_MOUTH_Y = 142;
export const POOL_LADDER_X = 30;

export function moonpoolOf(dock: Placed) {
  const r = pieceRect(dock);
  const x = r.x + r.w / 2;
  return { x, y: r.y + POOL_SURFACE_Y, mouth: r.y + POOL_MOUTH_Y, ladder: x + POOL_LADDER_X };
}
