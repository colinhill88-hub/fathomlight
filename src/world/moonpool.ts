import { pieceRect, type Placed } from '../game/base';
import type { Graphics } from 'pixi.js';

/** Local positions in the side cutaway of the 4-wide dock (Sub Berth left, Diver Entry Well right). */
export const POOL_HALF_WIDTH = 50;
export const POOL_SURFACE_Y = 91;
export const POOL_MOUTH_Y = 142;
export const POOL_LADDER_X = 0;

/** Heavy riveted berth brace framing the KS-1 Sub Berth (mirrored left/right via `side = -1 | 1`). */
export function drawDockBrace(g: Graphics, x: number, roofY: number, side: number, scale = 1): void {
  const ax = x + side * 102 * scale;
  const bx = x + side * 148 * scale;
  const ay = roofY + 105 * scale;
  const by = roofY + 191 * scale;
  // Dark ink outer flange + riveted steel strut + tarnished-brass trim rib.
  g.moveTo(ax, ay).lineTo(bx, by).stroke({ color: 0x142226, width: 15 * scale, cap: 'round' });
  g.moveTo(ax, ay).lineTo(bx, by).stroke({ color: 0x3b585c, width: 11 * scale, cap: 'round' });
  g.moveTo(ax - side * 2.4 * scale, ay).lineTo(bx - side * 2.4 * scale, by)
    .stroke({ color: 0xc29e58, width: 2.2 * scale, alpha: 0.9 });
  // Central bolted clevis hub.
  const y = ay + (by - ay) * 0.53;
  const px = ax + (bx - ax) * 0.53;
  g.circle(px, y, 7.5 * scale).fill(0x28363a).stroke({ color: 0x121c1e, width: 1.5 * scale });
  g.circle(px, y, 4.6 * scale).fill(0xb8964c);
  g.circle(px - 1 * scale, y - 1 * scale, 1.8 * scale).fill(0xefe0b4);
}

/**
 * Large mirrored hydraulic submarine docking clamp & ratchet locking mechanism
 * (`side = -1` left arm, `side = +1` right arm; `locked = true` grips KS-1's hull, `false` swings open).
 */
export function drawDockClamp(
  g: Graphics,
  cx: number,
  mountY: number,
  side: number,
  scale = 1,
  locked = true,
  em?: Graphics,
): void {
  const s = scale;
  const S = side; // -1 = left, +1 = right
  const baseX = cx + S * 76 * s;
  const elbowX = cx + S * (locked ? 72 : 84) * s;
  const elbowY = mountY + 38 * s;
  const jawTipX = cx + S * (locked ? 44 : 74) * s;
  const jawTipY = mountY + (locked ? 56 : 62) * s;

  // 1. Heavy bolted ceiling anchor housing + twin hydraulic pressure lines.
  g.roundRect(baseX - 14 * s, mountY - 4 * s, 28 * s, 16 * s, 3 * s)
    .fill({ color: 0x2a3638 }).stroke({ color: 0x11191b, width: 1.8 * s });
  g.rect(baseX - 12 * s, mountY - 2 * s, 24 * s, 3.5 * s).fill({ color: 0xb08c46, alpha: 0.85 });
  for (const bx of [-9, 0, 9]) g.circle(baseX + bx * s, mountY + 6 * s, 1.5 * s).fill({ color: 0x8ea0a2 });

  // 2. Diagonal hydraulic actuator piston pushing the clamp jaw closed.
  const pisTopX = baseX + S * 10 * s;
  const pisTopY = mountY + 8 * s;
  const pisMidX = pisTopX + (elbowX - pisTopX) * 0.56;
  const pisMidY = pisTopY + (elbowY - pisTopY) * 0.56;
  // Gleaming chrome piston rod (extends visibly when locked!).
  g.moveTo(pisMidX, pisMidY).lineTo(elbowX + S * 5 * s, elbowY - 3 * s)
    .stroke({ color: 0xc8d8d6, width: 4.2 * s, cap: 'round' });
  // Heavy dark-iron cylinder barrel + brass gland collar.
  g.moveTo(pisTopX, pisTopY).lineTo(pisMidX, pisMidY)
    .stroke({ color: 0x162022, width: 9.5 * s, cap: 'round' });
  g.moveTo(pisTopX, pisTopY).lineTo(pisMidX, pisMidY)
    .stroke({ color: 0x45585c, width: 6.5 * s, cap: 'round' });
  g.circle(pisMidX, pisMidY, 4.4 * s).fill({ color: 0xb89347 }).stroke({ color: 0x221c10, width: 1.2 * s });

  // 3. Upper steel-and-brass structural strut (mount -> main elbow).
  g.poly([
    baseX - 8 * s, mountY + 10 * s,
    baseX + 8 * s, mountY + 10 * s,
    elbowX + 8 * s, elbowY,
    elbowX - 8 * s, elbowY,
  ]).fill({ color: 0x3b4d50 }).stroke({ color: 0x131c1e, width: 1.8 * s });
  g.moveTo(baseX, mountY + 12 * s).lineTo(elbowX, elbowY - 2 * s)
    .stroke({ color: 0x9e7d3a, width: 2.2 * s, alpha: 0.85 });

  // 4. Lower curved clamping jaw arm (elbow -> curved hull-gripping claw) + ribbed rubberized bumper pad.
  g.poly([
    elbowX - S * 6 * s, elbowY - 5 * s,
    elbowX + S * 8 * s, elbowY + 4 * s,
    jawTipX + S * 5 * s, jawTipY + 8 * s,
    jawTipX - S * 4 * s, jawTipY + 2 * s,
    jawTipX - S * 3 * s, jawTipY - 7 * s,
  ]).fill({ color: 0x7d653c }).stroke({ color: 0x161c1e, width: 1.9 * s });
  // Brushed brass edge bevel along jaw spine.
  g.moveTo(elbowX + S * 4 * s, elbowY + 3 * s).lineTo(jawTipX + S * 3 * s, jawTipY + 4 * s)
    .stroke({ color: 0xd4b268, width: 2 * s, alpha: 0.85, cap: 'round' });
  // Ribbed dark-rubber hull contact cushion pad gripping KS-1's flank.
  const padX = jawTipX - S * 3 * s;
  const padY = jawTipY - 1 * s;
  g.roundRect(padX - 5 * s, padY - 9 * s, 10 * s, 18 * s, 3 * s)
    .fill({ color: 0x1c2426 }).stroke({ color: 0x58686a, width: 1.3 * s });
  for (let r = -5; r <= 5; r += 5) {
    g.moveTo(padX - 3.5 * s, padY + r * s).lineTo(padX + 3.5 * s, padY + r * s)
      .stroke({ color: 0x3c4a4c, width: 1.3 * s });
  }

  // 5. Mechanical Ratchet Gear & Locking Pawl at the main elbow pivot!
  g.circle(elbowX, elbowY, 10.5 * s).fill({ color: 0x263234 }).stroke({ color: 0x10181a, width: 1.8 * s });
  // Toothed brass locking cog teeth around pivot hub.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + (locked ? 0.25 : 0);
    g.circle(elbowX + Math.cos(a) * 8.6 * s, elbowY + Math.sin(a) * 8.6 * s, 1.9 * s).fill({ color: 0xc29e4c });
  }
  g.circle(elbowX, elbowY, 6.2 * s).fill({ color: 0xb89347 }).stroke({ color: 0x2a2010, width: 1.2 * s });
  g.circle(elbowX, elbowY, 2.8 * s).fill({ color: 0x202a2c });
  // Spring-loaded locking pawl dog engaging the gear when locked.
  const pawlCol = locked ? 0x6ce89c : 0xffbe55;
  g.circle(elbowX + S * 2 * s, elbowY - 11 * s, 2.7 * s).fill({ color: pawlCol }).stroke({ color: 0x141e20, width: 1 * s });
  if (em) {
    em.circle(elbowX + S * 2 * s, elbowY - 11 * s, 2.6 * s).fill({ color: pawlCol, alpha: 0.92 });
  }
}

export function moonpoolOf(dock: Placed) {
  const r = pieceRect(dock);
  const x = r.x + r.w * 0.80;
  return { x, y: r.y + POOL_SURFACE_Y, mouth: r.y + POOL_MOUTH_Y, ladder: x + POOL_LADDER_X };
}
