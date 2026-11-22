import { FillGradient, type Graphics } from 'pixi.js';
import { mulberry32 } from '../rng';

/**
 * Phase 19: the Corvina's engine room, drawn once behind the tiles. A dark
 * bay of rust and charcoal: two great engines asleep along the back wall,
 * the propeller shaft running under them, pipes and gauges overhead, and
 * the hull keeper's nest of scrap and cable at the far end, where its red
 * console still glows. Base-kit and wreck colours only (charcoal, rust,
 * brass, red lamps): never the Choir's cyan, violet or magenta.
 */

const bayWall = new FillGradient({
  type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
  colorStops: [{ offset: 0, color: 0x1a1c1d }, { offset: 0.35, color: 0x2e2a27 },
    { offset: 0.72, color: 0x3a312a }, { offset: 1, color: 0x221d1a }],
});

const engineBody = new FillGradient({
  type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
  colorStops: [{ offset: 0, color: 0x4a4c4a }, { offset: 0.4, color: 0x3a3c3b }, { offset: 1, color: 0x232524 }],
});

export function drawEngineRoom(g: Graphics, e: Graphics, gl: Graphics, T: number, PW: number, PH: number, map: string[]): void {
  const rand = mulberry32(0x19e9);
  const R = (a: number, b: number) => a + rand() * (b - a);
  const floor = 11 * T;
  g.rect(0, 0, PW, PH).fill(0x141617);
  g.rect(T, T, PW - 2 * T, floor - T).fill(bayWall);
  // Riveted hull plates on the back wall, stained with rust runs.
  for (let y = T; y < floor; y += 80)
    for (let x = T; x < PW - T; x += 120) {
      g.rect(x + 2, y + 2, 116, 76).stroke({ color: 0x151718, width: 2, alpha: 0.55 });
      for (let k = 8; k < 116; k += 18) g.circle(x + k, y + 6, 1.3).fill({ color: 0x4a4440, alpha: 0.7 });
      if (rand() < 0.45) {
        const rx = x + R(10, 100);
        g.moveTo(rx, y + 8).lineTo(rx + R(-4, 4), y + R(40, 78)).stroke({ color: 0x7a3e22, width: R(2, 5), alpha: R(0.18, 0.4) });
      }
    }
  // Hull ribs curving up from the floor.
  for (let x = 6 * T; x < PW - 2 * T; x += 9 * T) {
    g.moveTo(x, floor).quadraticCurveTo(x - 30, floor - 200, x + 10, T).lineTo(x + 34, T).quadraticCurveTo(x - 4, floor - 200, x + 26, floor).closePath()
      .fill({ color: 0x1d1f20, alpha: 0.9 });
    g.moveTo(x + 6, floor - 4).quadraticCurveTo(x - 22, floor - 200, x + 16, T + 4).stroke({ color: 0x5a4a3c, width: 2, alpha: 0.5 });
  }
  // The propeller shaft: a long dark tube near the floor with bearing blocks.
  const shaftY = floor - 46;
  g.roundRect(T, shaftY - 9, PW - 2 * T, 18, 9).fill({ color: 0x2a2c2c });
  g.rect(T, shaftY - 7, PW - 2 * T, 3).fill({ color: 0x6a6c68, alpha: 0.5 });
  for (let x = 4 * T; x < PW - 2 * T; x += 7 * T) {
    g.roundRect(x - 16, shaftY - 16, 32, 46, 3).fill({ color: 0x343634 });
    g.rect(x - 16, shaftY - 16, 32, 5).fill({ color: 0xa8822e, alpha: 0.6 });
  }
  // Two great engines asleep along the back wall, in the first two rooms.
  for (const [x0, w] of [[7 * T, 9 * T], [24 * T, 13 * T]]) {
    const top = floor - 210;
    g.roundRect(x0, top, w, 170, 10).fill(engineBody);
    g.roundRect(x0, top, w, 170, 10).stroke({ color: 0x151718, width: 3 });
    // Cylinder heads with rocker covers along the top.
    const n = Math.round(w / 52);
    for (let i = 0; i < n; i++) {
      const cx = x0 + 18 + i * ((w - 36) / Math.max(1, n - 1));
      g.roundRect(cx - 20, top - 34, 40, 38, 6).fill({ color: 0x3e403e });
      g.roundRect(cx - 16, top - 30, 32, 8, 3).fill({ color: 0x6a3e2a, alpha: 0.8 });
      g.circle(cx, top - 10, 5).fill({ color: 0x2a2c2c }).circle(cx, top - 10, 2).fill({ color: 0xa8822e });
      // Exhaust pipe up to the overhead manifold.
      g.rect(cx - 4, T + 60, 8, top - 34 - (T + 60)).fill({ color: 0x2c2b29 });
    }
    g.rect(x0, T + 52, w, 14).fill({ color: 0x343230 });
    g.rect(x0, T + 52, w, 3).fill({ color: 0x8a6a40, alpha: 0.5 });
    // Rust bloom, and the hull keeper's scrapes along the casing.
    g.poly([x0 + w * 0.2, top + 40, x0 + w * 0.55, top + 60, x0 + w * 0.4, top + 120, x0 + w * 0.15, top + 100]).fill({ color: 0x6a3a26, alpha: 0.35 });
    for (let k = 0; k < 6; k++) {
      const sx = x0 + R(20, w - 40);
      const sy = top + R(30, 150);
      g.moveTo(sx, sy).lineTo(sx + R(14, 40), sy + R(-4, 4)).stroke({ color: 0x9a948a, width: 1, alpha: 0.45 });
    }
    // A stencilled number and a dead gauge.
    g.circle(x0 + w - 40, top + 50, 14).fill({ color: 0xd8d0b8, alpha: 0.75 }).circle(x0 + w - 40, top + 50, 14).stroke({ color: 0x2a2c2c, width: 3 });
    g.moveTo(x0 + w - 40, top + 50).lineTo(x0 + w - 48, top + 42).stroke({ color: 0xa8402e, width: 2 });
  }
  // Pipes along the ceiling, with brass valves and drips of old oil.
  for (const [py, col] of [[T + 18, 0x3a3836], [T + 34, 0x4a4038]] as const) {
    g.rect(T, py, PW - 2 * T, 9).fill({ color: col });
    g.rect(T, py, PW - 2 * T, 2).fill({ color: 0x7a6a58, alpha: 0.5 });
    for (let x = 3 * T; x < PW - 2 * T; x += R(5, 9) * T) {
      g.roundRect(x - 6, py - 4, 12, 17, 2).fill({ color: 0x2a2826 });
      g.circle(x, py - 7, 5).stroke({ color: 0xa8822e, width: 2 });
    }
  }
  // The keeper's nest at the far end: heaps of scrap and cable, and its console.
  const nestX = 44 * T;
  for (let i = 0; i < 9; i++) {
    const hx = nestX + R(0, 17 * T);
    const hw = R(40, 110);
    const hh = R(18, 50);
    g.moveTo(hx - hw / 2, floor).quadraticCurveTo(hx - hw * 0.2, floor - hh, hx, floor - hh * 0.9).quadraticCurveTo(hx + hw * 0.3, floor - hh, hx + hw / 2, floor).closePath()
      .fill({ color: rand() < 0.5 ? 0x3a2a22 : 0x2e2c2a, alpha: 0.95 });
    for (let k = 0; k < 4; k++) g.rect(hx + R(-hw / 3, hw / 3), floor - R(4, hh * 0.8), R(6, 16), R(2, 5)).fill({ color: rand() < 0.5 ? 0x6a3a26 : 0x6a6c68, alpha: 0.8 });
  }
  for (let i = 0; i < 6; i++) {
    const cx = nestX + i * 3 * T;
    g.moveTo(cx, T + 40).bezierCurveTo(cx + 40, T + 200, cx + 90, T + 160, cx + 120, floor - 60).stroke({ color: 0x1c1c1c, width: 4, alpha: 0.8 });
  }
  const conX = 57 * T;
  const conY = floor - 190;
  g.roundRect(conX - 46, conY, 92, 120, 6).fill({ color: 0x2c2e2e });
  g.roundRect(conX - 46, conY, 92, 120, 6).stroke({ color: 0x151718, width: 3 });
  g.roundRect(conX - 34, conY + 14, 68, 40, 4).fill({ color: 0x120a08 });
  e.roundRect(conX - 30, conY + 18, 60, 32, 3).fill({ color: 0x8a1c10, alpha: 0.55 });
  e.circle(conX, conY + 34, 8).fill({ color: 0xff4a2a, alpha: 0.85 });
  gl.circle(conX, conY + 34, 34).fill({ color: 0xc8301c, alpha: 0.35 });
  for (let k = 0; k < 4; k++) e.circle(conX - 24 + k * 16, conY + 72, 3).fill({ color: k === 2 ? 0xd8492e : 0x8a6a2a, alpha: 0.8 });
  g.rect(conX - 40, conY + 90, 80, 6).fill({ color: 0xa8822e, alpha: 0.7 });
  // Safe lamps (K): a caged work lamp on the wall. Its light comes on as Kestrel passes (drawn by the fight).
  map.forEach((row, ty) => {
    [...row].forEach((c, tx) => {
      if (c !== 'K') return;
      const x = tx * T + T / 2;
      const y = ty * T - 2 * T;
      g.rect(x - 2, y + 18, 4, 3 * T - 18).fill({ color: 0x2a2c2c });
      g.roundRect(x - 11, y - 4, 22, 26, 5).fill({ color: 0x3a3c3b });
      g.roundRect(x - 11, y - 4, 22, 26, 5).stroke({ color: 0xa8822e, width: 2 });
      for (const k of [-5, 0, 5]) g.moveTo(x + k, y - 2).lineTo(x + k, y + 20).stroke({ color: 0x1c1e1e, width: 1.4 });
    });
  });
  // Warning stencil on the first bulkhead.
  g.rect(19 * T + 4, 3 * T + 8, T - 8, 26).fill({ color: 0xa8402e, alpha: 0.6 });
}

/**
 * The engine room door in the Corvina's hold: a heavy bulkhead door in the
 * back wall, welded shut with a crude seam, a wheel, and a stencil.
 */
export function drawEngineDoor(g: Graphics, e: Graphics, x: number, y: number, T: number): void {
  const cx = x + T / 2;
  const top = y - T - 20;
  const bottom = y + T;
  g.roundRect(cx - 34, top - 6, 68, bottom - top + 6, 12).fill({ color: 0x2a2c2c });
  g.roundRect(cx - 28, top, 56, bottom - top, 10).fill({ color: 0x4a4440 });
  g.roundRect(cx - 28, top, 56, bottom - top, 10).stroke({ color: 0x151718, width: 3 });
  for (let k = 0; k < 6; k++) g.circle(cx - 22 + k * 8.8, top + 6, 1.4).fill({ color: 0x8a8478 });
  // Rust runs and the welded seam down the edge.
  g.rect(cx - 18, top + 14, 4, 50).fill({ color: 0x7a3e22, alpha: 0.45 });
  g.rect(cx + 10, top + 30, 3, 40).fill({ color: 0x7a3e22, alpha: 0.35 });
  for (let k = 0; k < 9; k++) g.circle(cx + 26, top + 10 + k * 10, 3).fill({ color: 0x6a5a48 });
  // The wheel.
  g.circle(cx, top + 46, 14).stroke({ color: 0xa8822e, width: 3 });
  for (let a = 0; a < 4; a++) g.moveTo(cx, top + 46).lineTo(cx + Math.cos(a * Math.PI / 2 + 0.3) * 14, top + 46 + Math.sin(a * Math.PI / 2 + 0.3) * 14).stroke({ color: 0xa8822e, width: 2 });
  // Stencil plate and a dim red lamp above.
  g.rect(cx - 22, top + 72, 44, 10).fill({ color: 0xd8d0b8, alpha: 0.7 });
  for (let k = 0; k < 5; k++) g.rect(cx - 18 + k * 8, top + 74, 5, 6).fill({ color: 0x2a2c2c });
  g.circle(cx, top - 14, 4).fill({ color: 0x3a3c3b });
  e.circle(cx, top - 14, 2.4).fill({ color: 0xd8492e, alpha: 0.9 });
}
