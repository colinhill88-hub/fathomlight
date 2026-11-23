import { Sprite, type Graphics, type Texture } from 'pixi.js';
import { getCreatureArt } from '../art/creatureArt';
import type { Light } from '../fx/lighting';

type Point = { x: number; y: number };
interface Layers { view: Graphics; emissive: Graphics; glow: Graphics; light: Light }

/** Attach or reuse a single painted Sprite child on a predator's Graphics container. */
function paintedSprite(view: Graphics, tex: Texture | undefined): Sprite | null {
  let sp = view.children.find((c): c is Sprite => c instanceof Sprite && c.label === 'painted-predator') ?? null;
  if (!tex) {
    if (sp) sp.visible = false;
    return null;
  }
  if (!sp) {
    sp = new Sprite(tex);
    sp.label = 'painted-predator';
    sp.anchor.set(0.5, 0.5);
    view.addChild(sp);
  } else if (sp.texture !== tex) {
    sp.texture = tex;
  }
  sp.visible = true;
  return sp;
}

function origin(g: Graphics, x: number, y: number, ux: number, uy: number, side = 1): Graphics {
  g.clear();
  g.context.setTransform(ux, uy, -uy * side, ux * side, x, y);
  return g;
}

function reset(...layers: Graphics[]): void {
  for (const layer of layers) layer.context.resetTransform();
}

/** Broad-necked ambusher that packs its plated throat into the den on the warning. */
export function drawHoodedLurker(layer: Layers, denX: number, denY: number, head: Point, dir: number,
  time: number, warning: boolean, lunging: boolean, retreat: boolean, flow: number): void {
  const length = Math.hypot(head.x - denX, head.y - denY);
  const ux = length > 1 ? (head.x - denX) / length : dir;
  const uy = length > 1 ? (head.y - denY) / length : 0;
  const g = origin(layer.view, head.x, head.y, ux, uy, dir);
  const e = origin(layer.emissive, head.x, head.y, ux, uy, dir);
  const gl = origin(layer.glow, head.x, head.y, ux, uy, dir);
  const hood = warning ? 1.35 : lunging ? 0.78 : 1;
  const muzzle = warning ? 21 : lunging ? 39 : 31;
  const lower = lunging ? 31 : warning ? 15 : 5;
  const bend = (Math.sin(time * 2.7) * 10 + flow * 9) * (lunging ? 0.24 : 1);
  const painted = paintedSprite(layer.view, getCreatureArt().lurker);
  const count = Math.max(3, Math.min(11, Math.ceil(length / 22)));
  const neckFill = painted ? 0x262924 : 0x3d4850;
  const segA = painted ? 0x31342c : 0x556765;
  const segB = painted ? 0x282b25 : 0x596f6c;
  const segRim = painted ? 0x565a4e : 0x93a29a;
  g.moveTo(-length - 34, -5).bezierCurveTo(-length * 0.74, -14 + bend, -length * 0.42, -23 - bend, -16, -23)
    .quadraticCurveTo(7, -19, 8, 8).bezierCurveTo(-length * 0.35, 32 - bend, -length * 0.6, 9 + bend, -length - 34, 8)
    .closePath().fill(neckFill);
  for (let i = count - 1; i >= 0; i--) {
    const u = i / count;
    const x = -15 - u * length;
    const s = (1 - u * 0.64) * (warning ? 1.18 : 1);
    const y = Math.sin(u * 7 + time * 4) * bend * u * (1 - u) * 3;
    g.moveTo(x + 9, y - 21 * s).lineTo(x - 5, y - 29 * s).lineTo(x - 18, y - 8 * s)
      .lineTo(x - 14, y + 16 * s).lineTo(x + 5, y + 12 * s).closePath().fill(i % 2 ? segA : segB)
      .moveTo(x + 9, y - 19 * s).lineTo(x - 4, y - 25 * s).lineTo(x - 14, y - 7 * s)
      .stroke({ color: segRim, width: 2.0, alpha: painted ? 0.45 : 0.7 });
  }
  if (painted) {
    painted.position.set(head.x - ux * 18, head.y - uy * 18);
    painted.rotation = Math.atan2(uy, ux);
    painted.width = 104;
    painted.height = 48;
    painted.scale.y = Math.abs(painted.scale.y) * (dir < 0 ? -1 : 1);
  } else {
    g.moveTo(-29, 1).quadraticCurveTo(-34, -29 * hood, -4, -32 * hood).lineTo(15, -21)
      .lineTo(muzzle, -11).lineTo(muzzle + 5, -4).quadraticCurveTo(13, 1, -4, 9).closePath().fill(0x728782)
      .moveTo(-23, -8).quadraticCurveTo(-20, -26 * hood, 4, -24 * hood).lineTo(muzzle - 5, -12)
      .quadraticCurveTo(3, -17, -23, -8).fill(0xa6aa98)
      .moveTo(-21, 4).quadraticCurveTo(11, 3, muzzle + 2, lower - 3).quadraticCurveTo(18, 19 + lower, -10, 20)
      .closePath().fill(0x4e625e)
      .moveTo(-10, 4).lineTo(muzzle + 2, -5).lineTo(muzzle + 2, lower - 4).quadraticCurveTo(12, 6 + lower, -10, 4)
      .fill(0x1e2228);
    for (let i = 0; i < 5; i++) {
      const u = (i + 1) / 6;
      const x = 1 + muzzle * u;
      const y = 3 - u * 8;
      g.poly([x - 2, y, x + 4, y - 1, x + 2, y + 3 + lower * 0.28]).fill(0xc5b7a2);
    }
  }
  const flare = warning ? 1 : lunging ? 0.7 : 0.45 + 0.15 * Math.sin(time * 2);
  const bx = 18 + Math.sin(time * 2.2) * 8 + flow * 7;
  const by = -42 - (warning ? 13 : 0) + (retreat ? 10 : 0);
  g.moveTo(-2, -23).quadraticCurveTo(0, by - 6, bx, by).stroke({ color: 0x98937b, width: 2.7, cap: 'round' });
  e.circle(bx, by, 4.1).fill(0xffd890).circle(14, -15, 2.8).fill({ color: 0xffcc6e, alpha: warning || lunging ? 1 : 0.58 })
    .circle(6, -19, 1.6).fill({ color: 0xffcc6e, alpha: 0.68 });
  gl.circle(bx, by, 10 + 10 * flare).fill({ color: 0xffa040, alpha: 0.5 + 0.5 * flare });
  const l = layer.light;
  l.x = head.x + bx * ux - by * uy * dir;
  l.y = head.y + bx * uy + by * ux * dir;
  l.intensity = 0.4 + 0.9 * flare;
  reset(g, e, gl);
}

/** A head-heavy angler with folding ballast fins and a pendulum lure. */
export function drawSailJaw(layer: Layers, x: number, y: number, face: number, t: number, jaw: number,
  speed: number, brightness: number, flow: number): Point {
  const g = origin(layer.view, x, y, face, 0, face);
  const e = origin(layer.emissive, x, y, face, 0, face);
  const gl = origin(layer.glow, x, y, face, 0, face);
  const effort = Math.min(1, speed / 145);
  const wave = Math.sin(t * (2.3 + effort * 2.8)) * (7 + 20 * effort) + flow * 15;
  const painted = paintedSprite(layer.view, getCreatureArt().angler);
  const tail = painted ? -86 + 6 * effort : -127 + 13 * effort;
  if (painted) {
    // Tucked dark tail fin flowing directly out of the painted angler's rear tail base.
    g.moveTo(-64, -10).quadraticCurveTo(-78, -8, tail + 8, wave * 0.45)
      .quadraticCurveTo(-80, 10, -64, 12).fill(0x232624);
    g.moveTo(tail + 12, wave * 0.45).quadraticCurveTo(tail - 4, wave * 0.6 - 16, tail - 16, wave * 0.7 - 24 + effort * 6)
      .lineTo(tail - 11, wave * 0.55).lineTo(tail - 18, wave * 0.7 + 22 - effort * 6)
      .quadraticCurveTo(tail - 2, wave * 0.6 + 14, tail + 12, wave * 0.45).fill({ color: 0x2c302e, alpha: 0.92 });
    // Generated angler artwork faces left, so invert scale.x to match `face`.
    painted.position.set(x + face * 4, y - 8);
    painted.rotation = Math.sin(t * 2) * 0.04;
    painted.width = 160;
    painted.height = 98;
    painted.scale.x = Math.abs(painted.scale.x) * (face >= 0 ? -1 : 1);
    painted.scale.y = Math.abs(painted.scale.y) * (1 + jaw * 0.08);
  } else {
    const mantle = g.moveTo(-36, -17).quadraticCurveTo(-72, -14, tail + 18, wave)
      .quadraticCurveTo(-80, 13, -37, 26).fill(0x46585f);
    mantle.moveTo(tail + 23, wave).quadraticCurveTo(tail + 5, wave - 18, tail - 9, wave - 33 + effort * 8)
      .lineTo(tail - 6, wave - 5).lineTo(tail - 13, wave + 30 - effort * 8)
      .quadraticCurveTo(tail + 12, wave + 17, tail + 23, wave).fill(0x688180);
    g.moveTo(-53, -8).quadraticCurveTo(-59, -37, -17, -55).quadraticCurveTo(22, -68, 54, -36)
      .lineTo(64, -19).lineTo(62, -7).quadraticCurveTo(39, 0, 16, 29).quadraticCurveTo(-30, 48, -53, -8).fill(0x51616b);
    g.moveTo(-47, -17).quadraticCurveTo(-37, -50, -5, -55).quadraticCurveTo(25, -61, 52, -30)
      .quadraticCurveTo(13, -43, -13, -25).lineTo(-34, 10).fill(0x849490);
    g.moveTo(-34, -28).quadraticCurveTo(-43, -54, -20, -85 + effort * 23).quadraticCurveTo(-8, -75, 8, -54)
      .quadraticCurveTo(-10, -56, -34, -28).fill(0x6c7d81)
      .moveTo(-33, -34).quadraticCurveTo(-23, -52, -20, -77 + effort * 23)
      .stroke({ color: 0xa0a58f, width: 3, alpha: 0.76 });
    const fan = 21 + Math.sin(t * 3 - 0.7) * (6 + effort * 9) - effort * 10;
    g.moveTo(-17, 6).quadraticCurveTo(-40, fan + 12, -66, fan + 15)
      .quadraticCurveTo(-41, fan + 26, -10, 16).fill(0x637a79)
      .moveTo(-18, 9).quadraticCurveTo(-44, fan + 15, -61, fan + 16).stroke({ color: 0xb4ad97, width: 2.6 });
    const open = jaw * 50;
    g.moveTo(18, 11).quadraticCurveTo(42, -12, 64, -16).lineTo(69, 5 + open)
      .quadraticCurveTo(44, 29 + open, 10, 25).fill(0x758886)
      .moveTo(22, 9).quadraticCurveTo(50, -13, 64, -14).lineTo(67, 2 + open)
      .quadraticCurveTo(44, 17 + open, 22, 9).fill(0x1c222b);
    for (let i = 0; i < 6; i++) {
      const u = i / 5;
      const tx = 28 + u * 35;
      const ty = 5 - u * 20;
      g.poly([tx - 2, ty, tx + 3.5, ty - 1.5, tx + 2.5, ty + 7 + u * open * 0.22]).fill(0xd6cbad);
      g.poly([tx - 2, ty + 10 + u * open, tx + 3, ty + 10 + u * open, tx + 0.5, ty + 5 + u * open]).fill(0xbda98f);
    }
    g.ellipse(37, -27, 8, 5.4).fill(0x2d3b46).circle(39.5, -27, 3.3).fill(0x534e40);
  }
  e.circle(40, -28, 1.9).fill({ color: 0xffda93, alpha: 0.5 + jaw * 0.5 });
  const lx = 74 - effort * 16 + Math.sin(t * 1.48) * 13 + flow * 16;
  const ly = -67 + Math.cos(t * 1.15) * 9 + effort * 12;
  g.moveTo(18, -52).quadraticCurveTo(34, -106 + effort * 17, lx, ly).stroke({ color: 0xb2a88d, width: 2.7, cap: 'round' });
  e.ellipse(lx, ly, 5.8, 4.1).fill({ color: 0xffdc91, alpha: 0.4 + 0.6 * brightness });
  gl.circle(lx, ly, 25).fill({ color: 0xffa040, alpha: 0.7 * brightness });
  layer.light.x = x + face * lx;
  layer.light.y = y + ly;
  layer.light.radius = 170;
  layer.light.intensity = 1.1 * brightness;
  reset(g, e, gl);
  return { x: x + face * (tail - 10), y: y + wave };
}

/** A thin ghost kite. A travelling wave runs along its paired mantle membranes. */
export function drawRibbonStalker(layer: Layers, trail: Point[], t: number,
  striking: boolean, stalking: boolean, flow: number): void {
  const g = layer.view.clear();
  const e = layer.emissive.clear();
  const gl = layer.glow.clear();
  const painted = paintedSprite(layer.view, getCreatureArt().stalker);
  const step = striking ? 0.49 : 0.63;
  for (let i = trail.length - 2; i > 0; i--) {
    const a = trail[i];
    const b = trail[i - 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const u = i / (trail.length - 1);
    const wave = Math.sin(t * (striking ? 7.3 : 3.7) - i * step);
    const span = (6 + (painted ? 16 : 25) * Math.sin(u * Math.PI)) * (striking ? 0.48 : 1) * (0.78 + 0.25 * wave) + flow * 3;
    const back = trail[i + 1];
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    g.moveTo(b.x, b.y).quadraticCurveTo(cx + nx * span, cy + ny * span, a.x + nx * (span + 5), a.y + ny * (span + 5))
      .quadraticCurveTo(back.x + nx * span * 0.54, back.y + ny * span * 0.54, back.x, back.y)
      .fill({ color: painted ? (i % 2 ? 0x2e332d : 0x232724) : (i % 2 ? 0xc0c9b6 : 0x839d9b), alpha: painted ? 0.68 : 0.77 });
    g.moveTo(b.x, b.y).quadraticCurveTo(a.x - nx * (span * 0.67 + 4), a.y - ny * (span * 0.67 + 4), back.x, back.y)
      .fill({ color: painted ? 0x1e2220 : 0x6b8180, alpha: painted ? 0.68 : 0.76 });
    g.moveTo(b.x, b.y).lineTo(a.x, a.y).stroke({ color: painted ? 0x454a42 : 0xd1c9ae, width: 2 + (1 - u) * (painted ? 6 : 8), cap: 'round' });
    if (!painted && i % 3 === 0) g.moveTo(cx + nx * 4, cy + ny * 4).lineTo(a.x + nx * span * 0.75, a.y + ny * span * 0.75)
      .stroke({ color: 0xe1debf, width: 1.5, alpha: 0.58 });
  }
  const h = trail[0];
  const neck = trail[2];
  const span = Math.hypot(h.x - neck.x, h.y - neck.y) || 1;
  const ux = (h.x - neck.x) / span;
  const uy = (h.y - neck.y) / span;
  for (const layer of [g, e, gl]) layer.context.setTransform(ux, uy, -uy, ux, h.x, h.y);
  const gape = striking ? 19 : 3 + (stalking ? Math.sin(t * 2) * 1.5 : 0);
  if (painted) {
    painted.position.set(h.x - ux * 16, h.y - uy * 16);
    painted.rotation = Math.atan2(uy, ux);
    painted.width = 118;
    painted.height = 54;
    painted.scale.y = Math.abs(painted.scale.y) * (ux < 0 ? -1 : 1);
  } else {
    g.moveTo(-29, -9).lineTo(-21, -24).quadraticCurveTo(5, -21, 17, -10)
      .lineTo(39, -4).lineTo(34, 0).quadraticCurveTo(14, 4, -1, 12).lineTo(-30, 14).fill(0xb4bfb4)
      .moveTo(-21, -22).quadraticCurveTo(-3, -20, 19, -9).lineTo(37, -4)
      .quadraticCurveTo(8, -7, -13, 1).fill(0xe1ddc1)
      .moveTo(-7, 6).quadraticCurveTo(15, 3, 36, gape).lineTo(30, gape + 4)
      .quadraticCurveTo(4, 15, -10, 13).fill(0x788987)
      .moveTo(0, 7).lineTo(36, 0).lineTo(36, gape).quadraticCurveTo(15, 5 + gape * 0.3, 0, 7)
      .fill(0x253739);
  }
  e.ellipse(19, -6, 4.7, 1.5).fill(0xfff6da).circle(8, -9, 2).fill({ color: 0xece6c5, alpha: 0.83 });
  gl.ellipse(18, -6, 13, 8).fill({ color: 0xffecc7, alpha: stalking || striking ? 0.7 : 0.35 });
  reset(g, e, gl);
}

/** A low carapace with hooked blade shins, taking its contacts from the gait controller. */
export function drawTrestleStrider(layer: Layers, feet: Point[], offsets: number[], x: number, y: number,
  facing: number, reach: number, time: number, watching: boolean, diver: Point, flow: number): void {
  const g = layer.view.clear();
  const e = layer.emissive.clear();
  const gl = layer.glow.clear();
  const painted = paintedSprite(layer.view, getCreatureArt().spider);
  const bodyY = y + 7 + Math.sin(time * 1.4) * 3 + reach * 18;
  for (let i = 0; i < feet.length; i++) {
    const off = offsets[i];
    const foot = feet[i];
    const front = Math.sign(off) === facing && Math.abs(off) > 70;
    const fx = foot.x + (front ? (diver.x - foot.x) * reach * 0.8 : 0);
    const fy = foot.y + (front ? (diver.y - foot.y) * reach * 0.8 : 0);
    const hx = x + off * (painted ? 0.24 : 0.33);
    const hy = bodyY + Math.abs(off) * 0.04;
    const kx = hx * 0.32 + fx * 0.68 + off * 0.15;
    const ky = Math.min(hy, fy) - 15 - Math.abs(off) * 0.19 - (front ? reach * 27 : 0);
    const dark = i % 2 === 0;
    const thighCol = painted ? (dark ? 0x1d2022 : 0x2b2f30) : (dark ? 0x714c43 : 0xa57561);
    const shinCol = painted ? (dark ? 0x242829 : 0x363b3c) : (dark ? 0x8c5d4c : 0xc28d72);
    const rimCol = painted ? (dark ? 0x454a48 : 0x5d625e) : (dark ? 0xb38568 : 0xebbd97);
    g.moveTo(hx, hy + 4).quadraticCurveTo(hx + (kx - hx) * 0.4, ky - 13, kx, ky)
      .stroke({ color: thighCol, width: dark ? 6 : 8, cap: 'round' });
    g.moveTo(kx - 5, ky - 2).quadraticCurveTo(kx, ky - 14, kx + Math.sign(off) * 10, ky)
      .quadraticCurveTo(fx + Math.sign(off) * 10, fy - 24, fx, fy)
      .quadraticCurveTo(fx + Math.sign(off) * 3, fy - 14, kx - 5, ky - 2).fill(shinCol);
    g.moveTo(kx, ky - 4).quadraticCurveTo((kx + fx) * 0.5 + Math.sign(off) * 10, (ky + fy) * 0.5 - 6, fx, fy)
      .stroke({ color: rimCol, width: 1.8, alpha: painted ? 0.5 : 0.8 });
  }
  for (const layer of [g, e, gl]) layer.context.setTransform(facing, 0, 0, 1, x, bodyY);
  if (painted) {
    painted.position.set(x - facing * 2, bodyY - 10);
    painted.rotation = 0;
    painted.width = 132;
    painted.height = 72;
    painted.scale.x = Math.abs(painted.scale.x) * (facing >= 0 ? 1 : -1);
  } else {
    g.moveTo(-63, -4).lineTo(-50, -21).lineTo(-38, -31).lineTo(-21, -29).lineTo(-13, -37)
      .lineTo(10, -29).quadraticCurveTo(36, -24, 45, -6).lineTo(36, 12).lineTo(9, 22)
      .quadraticCurveTo(-25, 21, -63, -4).fill(0x805955)
      .moveTo(-58, -7).lineTo(-38, -28).lineTo(-27, -24).lineTo(-21, 12).quadraticCurveTo(-39, 11, -58, -7).fill(0xbc8268)
      .poly([-23, -25, -13, -34, 9, -26, 19, 8, -18, 16]).fill(0xb88870)
      .moveTo(9, -25).quadraticCurveTo(35, -24, 42, -6).lineTo(29, 10).lineTo(20, 9).fill(0xcc9c77)
      .moveTo(-46, -15).quadraticCurveTo(-8, -29, 26, -17).stroke({ color: 0xe7c199, width: 3.1, alpha: 0.65 });
    const hook = 43 + reach * 14;
    g.moveTo(29, 6).quadraticCurveTo(45, 6, hook + 10, 16).lineTo(hook + 2, 21 + reach * 7)
      .lineTo(37, 15).fill(0xb88e74)
      .moveTo(31, -3).quadraticCurveTo(43, -19 - reach * 10, hook + 8, -13 + flow * 6)
      .stroke({ color: 0x986d59, width: 3, cap: 'round' });
  }
  for (const [ex, ey] of [[29, -10], [36, -6], [29, -3]]) e.circle(ex, ey, watching ? 2.8 : 1.9).fill(0xffe1a6);
  gl.ellipse(32, -7, 13, 8).fill({ color: 0xffcb8c, alpha: watching ? 0.62 : 0.3 });
  layer.light.intensity = 0;
  reset(g, e, gl);
}
