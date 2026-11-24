import type { Graphics } from 'pixi.js';
import { DRONE, KEEPER, TICK } from '../game/combat';
import type { Foe } from '../game/foes';

/**
 * Phase 19: the hull keeper's machines, drawn in code each frame (original
 * designs, wreck colours: rust, charcoal, chrome, brass; their eyes and
 * telegraphs in red and hot gold, never the Choir's colours).
 *
 *  - lit: the body (lit by the lamps), emissive: eyes, torches and the
 *    keeper's core (they glow in the dark), glow: soft bloom behind those.
 *
 * Every attack's tell is drawn to be read at a glance: the tick crouches,
 * shakes and its eye flares; the drone's torch builds gold and its sighting
 * line goes solid and blinks when it locks; the keeper raises its hammer
 * arm (slam) or rears back venting steam (charge), and its core blazes
 * when it is open to rivets.
 */

const RUST = 0x6e3e26;
const RUST_DARK = 0x46281a;
const PLATE = 0x4a4642;
const CHAR = 0x26292a;
const CHROME = 0x8e979c;
const BRASS = 0xa8822e;
const RED = 0xff3a22;
const HOT = 0xffc23a;

export function drawFoe(f: Foe, g: Graphics, e: Graphics, gl: Graphics, time: number): void {
  if (f.kind === 'tick' || f.kind === 'spider') drawTick(f, g, e, gl, time);
  else if (f.kind === 'drone') drawDrone(f, g, e, gl, time);
  else drawKeeper(f, g, e, gl, time);
}

/**
 * Emissive & telegraph-only overlay for painted foe sprites (eyes, drone
 * laser sight & torch charge, keeper vulnerable core & warning flares).
 */
export function drawFoeFx(f: Foe, e: Graphics, gl: Graphics, time: number): void {
  const s = f.face;
  if (f.kind === 'tick' || f.kind === 'spider') {
    if (f.dead) return;
    const tell = f.state === 'tell' ? Math.min(1, f.t / TICK.tell) : 0;
    const flipped = f.state === 'flipped';
    const ex = f.x + (f.kind === 'spider' ? 18 : 15) * s;
    const ey = f.y - (flipped ? 8 : f.kind === 'spider' ? 18 : 14);
    const col = f.kind === 'spider' ? HOT : RED;
    const hot = flipped ? 0.25 : 0.65 + tell * 0.35 + (f.state === 'lunge' ? 0.35 : 0);
    e.circle(ex, ey, 2.4 + tell * 1.6).fill({ color: col, alpha: Math.min(1, hot) });
    if (f.kind === 'spider') e.circle(ex - 4 * s, ey - 3, 1.6 + tell).fill({ color: RED, alpha: Math.min(1, hot) });
    if (tell > 0 || f.state === 'lunge') gl.circle(ex, ey, 11 + tell * 14).fill({ color: col, alpha: 0.35 + 0.3 * tell });
    return;
  }
  if (f.kind === 'drone') {
    if (f.dead) return;
    const x = f.x;
    const y = f.y;
    const charge = f.state === 'aim' ? Math.min(1, f.t / (DRONE.track + DRONE.lock)) : 0;
    const locked = f.state === 'aim' && f.t >= DRONE.track;
    const cool = f.state === 'cool';
    if (f.state === 'aim') {
      const a = Math.atan2(f.aimY - y, f.aimX - x);
      const len = Math.hypot(f.aimX - x, f.aimY - y) + 40;
      const blink = locked ? (Math.sin(time * 40) > 0 ? 1 : 0.35) : 0.5;
      if (locked) e.moveTo(x, y + 10).lineTo(x + Math.cos(a) * len, y + 10 + Math.sin(a) * len).stroke({ color: RED, width: 1.8, alpha: 0.9 * blink });
      else
        for (let k = 0; k < len; k += 16) {
          const k2 = Math.min(len, k + 8);
          e.moveTo(x + Math.cos(a) * k, y + 10 + Math.sin(a) * k).lineTo(x + Math.cos(a) * k2, y + 10 + Math.sin(a) * k2).stroke({ color: RED, width: 1.2, alpha: 0.55 * blink });
        }
      e.circle(f.aimX, f.aimY, locked ? 5 : 3).stroke({ color: RED, width: 1.4, alpha: 0.85 * blink });
    }
    if (cool) {
      e.circle(x - 4 * s, y - 2, 6).fill({ color: HOT, alpha: 0.65 + 0.25 * Math.sin(time * 14) });
      gl.circle(x - 4 * s, y - 2, 16).fill({ color: 0xff8a2a, alpha: 0.42 });
    }
    if (charge > 0) {
      const tx = x + 16 * s;
      const ty = y + 16;
      e.circle(tx, ty, 2 + charge * 4).fill({ color: HOT, alpha: 0.6 + 0.4 * charge });
      gl.circle(tx, ty, 8 + charge * 20).fill({ color: 0xffa83a, alpha: 0.25 + 0.35 * charge });
    }
    e.circle(x + 15 * s, y - 2, 3.2).fill({ color: RED, alpha: locked ? 1 : 0.78 });
    gl.circle(x + 15 * s, y - 2, 9).fill({ color: RED, alpha: locked ? 0.55 : 0.24 });
    return;
  }
  // Hull Keeper emissive core + visor warning flare.
  if (f.dead) return;
  const open = f.state === 'stuck' || f.state === 'stagger';
  const warn = f.state === 'windSlam' || f.state === 'windCharge' || f.state === 'charge';
  const coreX = f.x + 2 * s;
  const coreY = f.y - 68;
  const pulse = 0.5 + 0.5 * Math.sin(time * (open ? 12 : 3));
  e.circle(coreX, coreY, open ? 13 : 7).fill({ color: open ? HOT : 0xff7a22, alpha: open ? 0.85 + 0.15 * pulse : 0.4 });
  if (open) {
    gl.circle(coreX, coreY, 40 + pulse * 12).fill({ color: 0xff9a2a, alpha: 0.5 });
    e.circle(coreX, coreY, 18 + pulse * 3).stroke({ color: HOT, width: 2.2, alpha: 0.78 });
  }
  const eyeX = f.x + 6 * s;
  const eyeY = f.y - 102;
  e.rect(eyeX - 7, eyeY - 2, 14, 3.6).fill({ color: RED, alpha: warn ? 1 : 0.75 });
  if (warn) gl.ellipse(eyeX, eyeY, 26, 12).fill({ color: RED, alpha: 0.45 + 0.3 * Math.sin(time * 30) });
  if (f.flash > 0) e.circle(coreX, coreY, 22).fill({ color: 0xffffff, alpha: f.flash * 0.65 });
}

/** A rust tick: a domed shell of riveted hull plate on six scrap-rod legs, one red sensor eye. */
function drawTick(f: Foe, g: Graphics, e: Graphics, gl: Graphics, time: number): void {
  if (f.dead) return;
  const s = f.face;
  const tell = f.state === 'tell' ? Math.min(1, f.t / TICK.tell) : 0;
  const flipped = f.state === 'flipped';
  const jitter = tell > 0 ? Math.sin(time * 70) * 1.6 * tell : 0;
  const x = f.x + jitter;
  const lift = flipped ? 0 : f.state === 'lunge' ? 4 : 8 - tell * 5;
  const by = f.y - lift;
  const X = (dx: number) => x + dx * s;
  const legPh = time * (Math.abs(f.vx) > 20 ? 18 : 3);
  if (!flipped) {
    // Legs: three a side, scuttling.
    for (let i = 0; i < 3; i++) {
      const hx = -8 + i * 8;
      const sw = Math.sin(legPh + i * 2.1) * 5;
      const kx = hx + 4 + sw;
      g.moveTo(X(hx), by - 6).lineTo(X(kx), by - 12 + tell * 4).lineTo(X(kx + 5 - tell * 3), f.y).stroke({ color: 0x2a2624, width: 2.2, cap: 'round' });
    }
  }
  // The shell: domed (upside down when flipped).
  const dir = flipped ? 1 : -1;
  const lean = f.state === 'lunge' ? -0.25 : tell * 0.18;
  const top = by - 6 + dir * 18;
  g.moveTo(X(-TICK.halfW), by - 6).quadraticCurveTo(X(-6 + lean * 20), top + (flipped ? 0 : lean * 10), X(TICK.halfW - 2), by - 8).lineTo(X(TICK.halfW - 4), by - 3).lineTo(X(-TICK.halfW + 2), by - 3).closePath()
    .fill({ color: RUST });
  g.moveTo(X(-TICK.halfW + 3), by - 8).quadraticCurveTo(X(-6), top + 4 * -dir, X(TICK.halfW - 6), by - 10).stroke({ color: 0x9a6a48, width: 1.5, alpha: 0.7 });
  // Plate seams and rivets.
  g.moveTo(X(-2), by - 6).lineTo(X(-4), top + 3 * -dir).stroke({ color: RUST_DARK, width: 1.2 });
  for (const rx of [-10, -2, 6]) g.circle(X(rx), by - 7 + dir * 5, 1).fill({ color: 0xc8a888 });
  // Bolt mandibles at the front.
  g.moveTo(X(TICK.halfW - 4), by - 5).lineTo(X(TICK.halfW + 4 + tell * 2), by - 2 - Math.sin(time * 9) * 1.2).stroke({ color: CHROME, width: 2 });
  if (flipped) {
    // On its back, legs kicking at the air.
    for (let i = 0; i < 3; i++) {
      const hx = -8 + i * 8;
      const sw = Math.sin(time * 22 + i * 1.7) * 5;
      g.moveTo(X(hx), by - 6).lineTo(X(hx + sw), by - 20).lineTo(X(hx + sw * 1.5 + 3), by - 26).stroke({ color: 0x2a2624, width: 2, cap: 'round' });
    }
  }
  // The eye: a dull red, flaring through the tell.
  const ex = X(TICK.halfW - 7);
  const ey = by - 9 + (flipped ? 2 : 0);
  const hot = flipped ? 0.25 : 0.55 + tell * 0.45 + (f.state === 'lunge' ? 0.45 : 0);
  e.circle(ex, ey, 2.4 + tell * 1.6).fill({ color: RED, alpha: Math.min(1, hot) });
  if (tell > 0 || f.state === 'lunge') gl.circle(ex, ey, 10 + tell * 14).fill({ color: RED, alpha: 0.35 + 0.3 * tell });
  if (f.flash > 0) g.moveTo(X(-TICK.halfW), by - 6).quadraticCurveTo(X(-6), top, X(TICK.halfW - 2), by - 8).closePath().fill({ color: 0xffe0b0, alpha: f.flash * 0.7 });
}

/** A weld drone: a round armoured hull under two rotor pods, a torch beneath, vents that open to cool. */
function drawDrone(f: Foe, g: Graphics, e: Graphics, gl: Graphics, time: number): void {
  if (f.dead) return;
  const s = f.face;
  const reel = f.state === 'reel';
  const x = f.x + (reel ? Math.sin(time * 40) * 2 : 0);
  const y = f.y;
  const X = (dx: number) => x + dx * s;
  const charge = f.state === 'aim' ? Math.min(1, f.t / (DRONE.track + DRONE.lock)) : 0;
  const locked = f.state === 'aim' && f.t >= DRONE.track;
  const cool = f.state === 'cool';
  // The sighting line (in the emissive layer, so it reads in the dark).
  if (f.state === 'aim') {
    const a = Math.atan2(f.aimY - y, f.aimX - x);
    const len = Math.hypot(f.aimX - x, f.aimY - y) + 40;
    const blink = locked ? (Math.sin(time * 40) > 0 ? 1 : 0.35) : 0.5;
    if (locked) e.moveTo(x, y + 10).lineTo(x + Math.cos(a) * len, y + 10 + Math.sin(a) * len).stroke({ color: RED, width: 1.8, alpha: 0.9 * blink });
    else
      for (let k = 0; k < len; k += 16) {
        const k2 = Math.min(len, k + 8);
        e.moveTo(x + Math.cos(a) * k, y + 10 + Math.sin(a) * k).lineTo(x + Math.cos(a) * k2, y + 10 + Math.sin(a) * k2).stroke({ color: RED, width: 1.2, alpha: 0.55 * blink });
      }
    e.circle(f.aimX, f.aimY, locked ? 5 : 3).stroke({ color: RED, width: 1.4, alpha: 0.85 * blink });
  }
  // Rotor pods with spinning blades (a blur).
  for (const px of [-13, 13]) {
    g.rect(X(px) - 2, y - 20, 4, 8).fill({ color: CHAR });
    const w = 14 * Math.abs(Math.cos(time * 30 + px));
    g.ellipse(X(px), y - 22, w + 3, 2).fill({ color: 0x8a8e90, alpha: 0.55 });
  }
  // The hull.
  g.circle(x, y, DRONE.halfW).fill({ color: PLATE });
  g.circle(x, y, DRONE.halfW).stroke({ color: CHAR, width: 2 });
  g.moveTo(X(-DRONE.halfW + 3), y - 4).quadraticCurveTo(x, y - DRONE.halfW - 2, X(DRONE.halfW - 3), y - 4).stroke({ color: CHROME, width: 2, alpha: 0.6 });
  g.ellipse(X(-4), y + 6, 12, 5).fill({ color: RUST, alpha: 0.6 });
  // Side vents: shut slats, or open and glowing while it cools (the opening).
  for (const k of [-1, 1]) {
    const vx = x + k * (DRONE.halfW - 4);
    if (cool) {
      g.rect(vx - 4, y - 8, 8, 16).fill({ color: 0x120c08 });
      e.rect(vx - 3, y - 6, 6, 12).fill({ color: HOT, alpha: 0.6 + 0.3 * Math.sin(time * 14) });
      gl.circle(vx, y, 14).fill({ color: 0xff8a2a, alpha: 0.4 });
    } else for (let i = 0; i < 3; i++) g.rect(vx - 4, y - 7 + i * 5, 8, 2.4).fill({ color: CHAR });
  }
  // The torch underneath, pointing where it aims (or down), and the eye.
  const ta = f.state === 'aim' ? Math.atan2(f.aimY - y, f.aimX - x) : Math.PI / 2;
  const tx = x + Math.cos(ta) * 22;
  const ty = y + Math.sin(ta) * 22;
  g.moveTo(x + Math.cos(ta) * 12, y + Math.sin(ta) * 12).lineTo(tx, ty).stroke({ color: CHROME, width: 5, cap: 'round' });
  g.circle(tx, ty, 3).fill({ color: BRASS });
  if (charge > 0) {
    e.circle(tx, ty, 2 + charge * 4).fill({ color: HOT, alpha: 0.6 + 0.4 * charge });
    gl.circle(tx, ty, 8 + charge * 20).fill({ color: 0xffa83a, alpha: 0.25 + 0.35 * charge });
  }
  e.circle(X(9), y - 3, 3).fill({ color: RED, alpha: locked ? 1 : 0.75 });
  gl.circle(X(9), y - 3, 8).fill({ color: RED, alpha: locked ? 0.5 : 0.2 });
  if (cool) for (let i = 0; i < 3; i++) g.circle(x + Math.sin(time * 3 + i) * 10, y - 26 - ((time * 40 + i * 12) % 30), 4 + i).fill({ color: 0xc8c8c0, alpha: 0.18 });
  if (f.flash > 0) g.circle(x, y, DRONE.halfW).fill({ color: 0xffe0b0, alpha: f.flash * 0.7 });
  if (f.ping > 0) g.circle(x, y, DRONE.halfW + 2).stroke({ color: 0xffffff, width: 1.5, alpha: f.ping * 0.6 });
}

/**
 * The hull keeper: a hunched loader of rusted plate on two piston legs, a
 * curved scoop-shield on its front arm, a hammer arm behind, a slit of red
 * eye, and a furnace core in its chest that only shows when the shield drops.
 */
function drawKeeper(f: Foe, g: Graphics, e: Graphics, gl: Graphics, time: number): void {
  const s = f.face;
  const dead = f.dead;
  const windS = f.state === 'windSlam' ? Math.min(1, f.t / KEEPER.windSlam) : 0;
  const windC = f.state === 'windCharge' ? Math.min(1, f.t / KEEPER.windCharge) : 0;
  const open = f.state === 'stuck' || f.state === 'stagger';
  const charging = f.state === 'charge';
  const slam = f.state === 'slam';
  const sink = dead ? Math.min(1, f.deadT * 1.5) * 26 : 0;
  const shake = (windC > 0 ? Math.sin(time * 60) * 1.4 * windC : 0) + (f.state === 'stagger' ? Math.sin(time * 30) * 2 : 0);
  const x = f.x + shake;
  const y = f.y;
  const X = (dx: number) => x + dx * s;
  const lean = (charging ? 0.2 : 0) - windC * 0.22 + (open ? 0.12 : 0) + (dead ? 0.3 : 0);
  const hip = y - 34 + sink * 0.4;
  const walkPh = Math.abs(f.vx) > 5 ? time * 8 : 0;
  // Legs: thick pistons and broad feet.
  for (const k of [-1, 1]) {
    const lx = k * 18;
    const step = Math.sin(walkPh + (k > 0 ? 0 : Math.PI)) * 6;
    g.roundRect(X(lx + step) - 8, hip, 16, y - hip - 8, 4).fill({ color: CHAR });
    g.rect(X(lx + step) - 3, hip + 4, 6, y - hip - 14).fill({ color: CHROME, alpha: 0.7 });
    g.roundRect(X(lx + step) - 14, y - 10, 28, 10, 3).fill({ color: PLATE });
  }
  // The body: a heavy hunched box, leaning.
  const bodyTop = hip - 78 + sink;
  const tilt = (dx: number, dy: number) => [X(dx + (hip - dy) * -lean * 0.5), dy] as const;
  const p1 = tilt(-36, hip);
  const p2 = tilt(30, hip);
  const p3 = tilt(36, bodyTop + 14);
  const p4 = tilt(14, bodyTop);
  const p5 = tilt(-30, bodyTop + 6);
  g.poly([p1[0], p1[1], p2[0], p2[1], p3[0], p3[1], p4[0], p4[1], p5[0], p5[1]]).fill({ color: dead ? 0x2e2a28 : RUST });
  g.poly([p1[0], p1[1], p2[0], p2[1], p3[0], p3[1], p4[0], p4[1], p5[0], p5[1]]).stroke({ color: RUST_DARK, width: 3 });
  // Riveted plate lines.
  for (let k = 0; k < 3; k++) {
    const a = tilt(-30, hip - 18 - k * 20);
    const b = tilt(30, hip - 18 - k * 20);
    g.moveTo(a[0], a[1]).lineTo(b[0], b[1]).stroke({ color: RUST_DARK, width: 1.5, alpha: 0.8 });
    for (let r = -24; r <= 24; r += 12) {
      const c = tilt(r, hip - 18 - k * 20);
      g.circle(c[0], c[1] - 3, 1.2).fill({ color: 0xc8a888, alpha: 0.7 });
    }
  }
  // The core in the chest (a furnace grille): dull behind the shield, blazing when open.
  const core = tilt(8, hip - 44);
  g.circle(core[0], core[1], 13).fill({ color: 0x1a1210 });
  if (!dead) {
    const pulse = 0.5 + 0.5 * Math.sin(time * (open ? 12 : 3));
    e.circle(core[0], core[1], open ? 11 : 6).fill({ color: open ? HOT : 0xa83a1a, alpha: open ? 0.8 + 0.2 * pulse : 0.35 });
    if (open) {
      gl.circle(core[0], core[1], 34 + pulse * 10).fill({ color: 0xff9a2a, alpha: 0.45 });
      e.circle(core[0], core[1], 16 + pulse * 3).stroke({ color: HOT, width: 2, alpha: 0.7 });
    }
  }
  for (let k = -1; k <= 1; k++) g.moveTo(core[0] - 9, core[1] + k * 5).lineTo(core[0] + 9, core[1] + k * 5).stroke({ color: 0x2a2624, width: 1.6 });
  // The hammer arm behind: raised through the slam's wind-up, down after.
  const sh = tilt(-18, bodyTop + 20);
  const armA = slam ? 1.2 : dead ? 1.4 : -0.3 - windS * 2.1 + (open ? 0.9 : 0);
  const elx = sh[0] + Math.cos(armA - Math.PI / 2) * 34 * s;
  const ely = sh[1] - Math.sin(-(armA - Math.PI / 2)) * 34;
  g.moveTo(sh[0], sh[1]).lineTo(elx, ely).stroke({ color: CHAR, width: 10, cap: 'round' });
  g.roundRect(elx - 13, ely - 11, 26, 22, 4).fill({ color: PLATE });
  g.roundRect(elx - 13, ely - 11, 26, 6, 3).fill({ color: BRASS, alpha: 0.6 });
  // The scoop-shield on the front arm: up in front of the core, drooping when it is open.
  const sp = tilt(30, hip - 46);
  const drop = open ? 34 : dead ? 40 : 0;
  const shx = sp[0] + 6 * s;
  const shy = sp[1] + drop;
  g.moveTo(shx, shy - 46).quadraticCurveTo(shx + 22 * s, shy, shx, shy + 46).lineTo(shx - 8 * s, shy + 40).quadraticCurveTo(shx + 10 * s, shy, shx - 8 * s, shy - 40).closePath()
    .fill({ color: 0x5a5450 });
  g.moveTo(shx + 3 * s, shy - 40).quadraticCurveTo(shx + 20 * s, shy, shx + 3 * s, shy + 40).stroke({ color: CHROME, width: 2.2, alpha: 0.6 });
  for (let k = -2; k <= 2; k++) g.circle(shx + (8 - Math.abs(k) * 1.5) * s, shy + k * 16, 1.6).fill({ color: 0xd8c8a8 });
  g.moveTo(shx, shy - 46).quadraticCurveTo(shx + 22 * s, shy, shx, shy + 46).stroke({ color: RUST, width: 3, alpha: 0.5 });
  // The eye slit and its warning lamp.
  const eye = tilt(20, bodyTop + 14);
  if (!dead) {
    const warn = windS > 0 || windC > 0 || charging;
    e.rect(eye[0] - 9, eye[1] - 2, 18, 4).fill({ color: RED, alpha: warn ? 1 : 0.7 });
    if (warn) gl.ellipse(eye[0], eye[1], 26, 12).fill({ color: RED, alpha: 0.4 + 0.3 * Math.sin(time * 30) });
    const lamp = tilt(-6, bodyTop + 2);
    const on = warn ? Math.sin(time * (windS > 0 ? 24 : 16)) > 0 : false;
    g.circle(lamp[0], lamp[1] - 4, 4).fill({ color: 0x3a3c3b });
    e.circle(lamp[0], lamp[1] - 4, 3).fill({ color: on ? RED : 0x5a1a10, alpha: on ? 1 : 0.6 });
    if (on) gl.circle(lamp[0], lamp[1] - 4, 18).fill({ color: RED, alpha: 0.4 });
  }
  // Steam from the back while it rears to charge, and while charging.
  if (windC > 0 || charging) {
    const bx = X(-34);
    for (let i = 0; i < 6; i++) {
      const k = ((time * 3 + i / 6) % 1);
      g.circle(bx - s * k * 40, hip - 40 - k * 30, 6 + k * 12).fill({ color: 0xd8d8d0, alpha: 0.28 * (1 - k) });
    }
  }
  if (dead) for (let i = 0; i < 4; i++) {
    const k = ((time * 0.5 + i / 4) % 1);
    g.circle(x + Math.sin(i * 2 + time) * 10, bodyTop - k * 80, 8 + k * 14).fill({ color: 0x2a2826, alpha: 0.35 * (1 - k) });
  }
  if (f.flash > 0) e.circle(core[0], core[1], 20).fill({ color: 0xffffff, alpha: f.flash * 0.6 });
  if (f.ping > 0) g.moveTo(shx, shy - 46).quadraticCurveTo(shx + 22 * s, shy, shx, shy + 46).stroke({ color: 0xffffff, width: 3, alpha: f.ping * 0.7 });
}
