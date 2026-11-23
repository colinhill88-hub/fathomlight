import { Container, Graphics, Sprite } from 'pixi.js';
import { materialFill, type WorldArt } from '../art/worldArt';
import { getPropArt } from '../art/propArt';
import { mulberry32, WORLD_SEED } from '../rng';
import { ellBottom, ellTop, groundY, SANCTUM, sanctumShapes, shapesField } from './terrain';
import { dab, traceField, type PointLight } from './scenery';
import { drawNacreVault } from './nacreVault';

/**
 * Milestone 11: the art of the sanctum, under the trench floor. Awe, not
 * fear: the Choir's colours (cyan, violet, magenta, used nowhere else in the
 * game) take over from the trench's warm pinpricks.
 *
 *  - The door: a raised disc of pale stone set into the floor's far east end,
 *    cut with rings of grooves that leak a faint light (easy to spot from the
 *    floor). Sung open, its petals slide back into the rock.
 *  - The caverns: the shaft, the antechamber, the great hall and the deep
 *    pool, lined with nacre-pale stone and glowing veins and crystals.
 *  - The song-locks: tall lenses of light across the narrows.
 *  - The great hall's ring-and-ribbon forms, and slow Choir motes drifting
 *    through the water like ribbons of light.
 *  - The heart: a shell of pale stone on the pool's floor with a glowing arch.
 *  - The Choir gates (after contact): a ring of light in the antechamber and
 *    its twin on the Kestrel shelf.
 *
 * Owned by Scenery, which adds these layers to its own and forwards update().
 */

const CYAN = 0x5ff0ff;
const VIOLET = 0xa27cff;
const MAGENTA = 0xff5ad8;
const CHOIR = [CYAN, VIOLET, MAGENTA];
const NACRE = 0xb8c0d8;

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  c: number;
  trail: number[];
}

export class SanctumScenery {
  readonly view = new Container();
  readonly emissive = new Container();
  readonly glow = new Container();
  readonly lights: PointLight[] = [];
  readonly scanPoints = {
    sdoor: [] as { x: number; y: number }[],
    shall: [] as { x: number; y: number }[],
    slock: [] as { x: number; y: number }[],
    sheart: [] as { x: number; y: number }[],
  };
  private slices: { obj: Container; x0: number; x1: number; y0: number; y1: number }[] = [];
  private doorShut = new Graphics();
  private doorOpen = new Graphics();
  private doorGlow = new Graphics();
  private locks: { lens: Graphics; halo: Graphics; light: PointLight; open: boolean }[] = [];
  private pulses: { g: Graphics; phase: number; base: number }[] = [];
  private motes: Mote[] = [];
  private moteG = new Graphics();
  private ringsG = new Graphics();
  private gates: { core: Graphics; halo: Graphics; light: PointLight; x: number; y: number }[] = [];
  private gateOn = false;
  private doorLight: PointLight;
  private rand: () => number;

  constructor(detail: number, art?: WorldArt, livingBases = false) {
    this.rand = mulberry32(WORLD_SEED ^ 0x5a17c);
    const R = (a: number, b: number) => a + this.rand() * (b - a);
    const shapes = sanctumShapes() as Parameters<typeof shapesField>[0];
    const gy = (x: number) => groundY(x);
    const field = (x: number, y: number) => Math.max(shapesField(shapes, x, y), gy(x) + 2 - y);

    // ---- The caverns' open water, chunk by chunk, lined with pale stone ----
    const X0 = 29000;
    const X1 = 32500;
    const CH = 700;
    for (let x0 = X0; x0 < X1; x0 += CH) {
      const x1 = x0 + CH;
      const g = new Graphics();
      // A pale rim of stone round the water, then the water itself (deep indigo, fading darker in the middle).
      traceField(g, (x, y) => field(x, y) - 14, x0, x1, 7300, 9500, 6, 0x6a6e8a, 0.85);
      traceField(g, (x, y) => field(x, y) - 6, x0, x1, 7300, 9500, 6, 0x2e3050, 1);
      traceField(g, field, x0, x1, 7300, 9500, 6, 0x0f0e24, 1);
      traceField(g, (x, y) => field(x, y) + 60, x0, x1, 7300, 9500, 10, 0x0a0a1c, 0.6);
      const nacre = art?.materials.nacre;
      const relief = art?.plates.sanctum;
      if (nacre) traceField(g, (x, y) => field(x, y) + 2, x0, x1, 7300, 9500, 10,
        materialFill(nacre, 0x0f0e24, 0.53, 1700, 1090));
      if (relief) traceField(g, (x, y) => field(x, y) + 5, x0, x1, 7300, 9500, 10,
        materialFill(relief, 0x0f0e24, 0.46, 2650, 1360, 29440, 7520));
      // Nacre streaks on the stone close to the water.
      const n = Math.round(260 * detail);
      for (let i = 0; i < n; i++) {
        const x = R(x0, x1);
        const y = R(7400, 9450);
        const f = field(x, y);
        if (f < 0 || f > 40) continue;
        dab(g, x, y, R(6, 18), R(3, 8), this.rand() < 0.5 ? NACRE : 0x8a8eb0, R(0.15, 0.35));
      }
      this.view.addChild(g);
      this.slices.push({ obj: g, x0: x0 - 100, x1: x1 + 100, y0: 7200, y1: 9600 });
      // Glowing veins and crystals in the walls (unlit, slowly pulsing).
      const e = new Graphics();
      for (let i = 0; i < n * 0.6; i++) {
        let x = R(x0, x1);
        let y = R(7400, 9450);
        const f = field(x, y);
        if (f < 2 || f > 26) continue;
        const c = CHOIR[Math.floor(this.rand() * 3)];
        if (this.rand() < 0.45) {
          // A short branching vein.
          e.moveTo(x, y);
          for (let k = 0; k < 4; k++) {
            x += R(-14, 14);
            y += R(-14, 14);
            e.lineTo(x, y);
          }
          e.stroke({ color: c, width: R(0.8, 1.8), alpha: 0.75 });
        } else {
          // A crystal: a thin bright lozenge.
          const a = R(0, Math.PI);
          const l = R(4, 11);
          e.poly([x + Math.cos(a) * l, y + Math.sin(a) * l, x - Math.sin(a) * 2, y + Math.cos(a) * 2, x - Math.cos(a) * l, y - Math.sin(a) * l, x + Math.sin(a) * 2, y - Math.cos(a) * 2]).fill({ color: c, alpha: 0.85 });
        }
      }
      this.emissive.addChild(e);
      this.pulses.push({ g: e, phase: x0 * 0.001, base: 0.75 });
      this.slices.push({ obj: e, x0: x0 - 100, x1: x1 + 100, y0: 7200, y1: 9600 });
    }

    const sponges = art?.life[6];
    if (sponges) {
      for (const [room, offset] of [[SANCTUM.ante, 0.60], [SANCTUM.hall, -0.64], [SANCTUM.hall, 0.66], [SANCTUM.pool, -0.57]] as const) {
        const x = room.x + room.rx * offset;
        const y = ellBottom(room, x);
        const colony = new Sprite({ texture: sponges, alpha: 0.65, label: 'paintedNacreColony' });
        colony.anchor.set(0.5, 0.9);
        colony.position.set(x, y);
        colony.width = colony.height = 110;
        this.view.addChild(colony);
        this.slices.push({ obj: colony, x0: x - 140, x1: x + 140, y0: y - 140, y1: y + 40 });
      }
    }

    // ---- The door in the floor ----
    {
      const d = SANCTUM.door;
      const x = d.x;
      const y = d.y;
      const s = this.doorShut;
      // A raised disc of pale stone, seen edge-on: a low dome with grooves.
      s.ellipse(x, y + 6, d.r + 10, 22).fill({ color: 0x55586c });
      s.ellipse(x, y - 4, d.r, 26).fill({ color: 0x9a9eb4 });
      s.ellipse(x, y - 8, d.r - 10, 18).fill({ color: 0xb4b8cc });
      for (const k of [0.82, 0.6, 0.38]) s.ellipse(x, y - 8, (d.r - 10) * k, 18 * k).stroke({ color: 0x5a5e78, width: 1.4 });
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        s.moveTo(x + Math.cos(ang) * (d.r - 10) * 0.38, y - 8 + Math.sin(ang) * 18 * 0.38).lineTo(x + Math.cos(ang) * (d.r - 10), y - 8 + Math.sin(ang) * 18).stroke({ color: 0x5a5e78, width: 1 });
      }
      // The grooves leak light: a beacon you can see from across the floor.
      const dg = this.doorGlow;
      for (const k of [0.82, 0.6, 0.38]) dg.ellipse(x, y - 8, (d.r - 10) * k, 18 * k).stroke({ color: CYAN, width: 1.2, alpha: 0.8 });
      dg.circle(x, y - 8, 4).fill({ color: 0xe8fbff });
      const halo = new Graphics().ellipse(x, y - 14, d.r * 1.3, 40).fill({ color: CYAN, alpha: 0.4 });
      this.glow.addChild(halo);
      this.pulses.push({ g: halo, phase: 0.3, base: 0.8 });
      // Open: the petals drawn back into the rock, the shaft's rim lit.
      const o = this.doorOpen;
      for (const sx of [-1, 1]) o.poly([x + sx * (d.r - 4), y - 2, x + sx * (d.r + 24), y - 10, x + sx * (d.r + 30), y + 6, x + sx * (d.r - 4), y + 10]).fill({ color: 0x9a9eb4 });
      o.ellipse(x, y + 4, d.r - 6, 10).fill({ color: 0x0f0e24 });
      this.view.addChild(s, o);
      this.emissive.addChild(dg);
      this.doorLight = { x, y: y - 40, radius: 420, intensity: 0.7, color: [0.4, 0.9, 1] };
      this.lights.push(this.doorLight);
      this.scanPoints.sdoor.push({ x, y: y - 30 });
    }

    // ---- The song-locks: tall lenses of light across the narrows ----
    for (const l of SANCTUM.locks) {
      const frame = new Graphics();
      // A ring of pale stone set into the rock round each lock.
      frame.ellipse(l.x, l.y, 30, l.r + 14).stroke({ color: 0x9a9eb4, width: 8 });
      frame.ellipse(l.x, l.y, 30, l.r + 14).stroke({ color: 0x5a5e78, width: 1.4 });
      this.view.addChild(frame);
      const lens = new Graphics();
      lens.ellipse(l.x, l.y, 18, l.r).fill({ color: VIOLET, alpha: 0.55 });
      lens.ellipse(l.x, l.y, 8, l.r * 0.9).fill({ color: 0xe8dcff, alpha: 0.7 });
      for (let k = -3; k <= 3; k++) lens.ellipse(l.x, l.y + (k * l.r) / 4, 14, 3).fill({ color: MAGENTA, alpha: 0.5 });
      const halo = new Graphics().ellipse(l.x, l.y, 60, l.r + 30).fill({ color: VIOLET, alpha: 0.5 });
      this.emissive.addChild(lens);
      this.glow.addChild(halo);
      const light: PointLight = { x: l.x, y: l.y, radius: 520, intensity: 0.9, color: [0.65, 0.5, 1] };
      this.lights.push(light);
      this.locks.push({ lens, halo, light, open: false });
      this.scanPoints.slock.push({ x: l.x, y: l.y });
    }

    // ---- The great hall: rings and ribbons of pale stone, lit from within ----
    {
      const g = new Graphics();
      const e = new Graphics();
      const h = SANCTUM.hall;
      if (livingBases) {
        for (const [offset, width, height, lean] of [[-510, 300, 392, 0.09], [30, 614, 702, -0.045], [487, 275, 434, -0.1]]) {
          const x = h.x + offset;
          const floor = ellBottom(h, x) - 12;
          drawNacreVault(g, x, floor, width, height, lean);
          drawNacreVault(g, x + width * 0.04, floor, width * 0.82, height * 0.89, lean);
        }
      }
      const rings = [
        { x: h.x - 420, y: h.y - 20, r: 150, t: 0.35 },
        { x: h.x - 20, y: h.y - 110, r: 230, t: 0.25 },
        { x: h.x + 380, y: h.y + 60, r: 130, t: 0.4 },
      ];
      for (const [i, r] of rings.entries()) {
        // Seen a little from the side: tall ellipses, thick pale stone with a lit inner line.
        g.ellipse(r.x, r.y, r.r * r.t, r.r).stroke({ color: 0x8a8eaa, width: livingBases ? 9 : 16 });
        g.ellipse(r.x, r.y, r.r * r.t, r.r).stroke({ color: 0xc8cce0, width: livingBases ? 2 : 4, alpha: 0.6 });
        e.ellipse(r.x, r.y, r.r * r.t - 6, r.r - 6).stroke({ color: CHOIR[i], width: 1.6, alpha: livingBases ? 0.58 : 0.9 });
        // A stem down to the hall's floor.
        const fy = ellBottom(h, r.x);
        g.moveTo(r.x, r.y + r.r).lineTo(r.x - 6, fy).lineTo(r.x + 6, fy).closePath().fill({ color: 0x6a6e8a });
        const light: PointLight = { x: r.x, y: r.y, radius: 700, intensity: livingBases ? 0.56 : 0.75, color: i === 0 ? [0.4, 0.9, 1] : i === 1 ? [0.65, 0.5, 1] : [1, 0.4, 0.85] };
        this.lights.push(light);
      }
      // Ribbons: long sinuous bands of stone hanging from the roof.
      for (let k = 0; k < 6; k++) {
        const x = h.x - h.rx * 0.8 + (k / 5) * h.rx * 1.6 + R(-40, 40);
        const top = ellTop(h, x) - 4;
        const len = R(140, 300);
        const sway = R(-60, 60);
        const pts: number[] = [];
        for (let t = 0; t <= 1.0001; t += 0.1) pts.push(x + Math.sin(t * 3.4 + k) * 16 + sway * t * t, top + len * t);
        for (let t = 1; t >= -0.0001; t -= 0.1) pts.push(x + Math.sin(t * 3.4 + k) * 16 + sway * t * t + 10 * (1 - t) + 3, top + len * t);
        g.poly(pts).fill({ color: 0x7a7e9c });
        e.moveTo(pts[0] + 5, pts[1]);
        for (let i = 2; i < pts.length / 2; i += 2) e.lineTo(pts[i] + 5, pts[i + 1]);
        e.stroke({ color: CHOIR[k % 3], width: 1, alpha: 0.7 });
      }
      this.view.addChild(g);
      this.emissive.addChild(e);
      this.pulses.push({ g: e, phase: 1.1, base: 0.85 });
      this.scanPoints.shall.push({ x: h.x, y: h.y }, { x: h.x - 500, y: h.y + 150 });
    }

    // ---- The heart: a shell of pale stone on the pool's floor, with a glowing arch ----
    {
      const p = SANCTUM.pool;
      const g = new Graphics();
      const e = new Graphics();
      const hx = SANCTUM.heart.x;
      const fy = SANCTUM.heart.y + 4;
      // The shell: a spiral dome rising off the pool floor.
      if (livingBases) {
        drawNacreVault(g, hx + 8, fy, 438, 249, 0.085);
        drawNacreVault(g, hx - 6, fy, 340, 208, 0.04);
        drawNacreVault(g, hx, fy, 240, 169);
        drawNacreVault(g, hx, fy, 139, 127);
      } else {
        g.moveTo(hx - 230, fy).quadraticCurveTo(hx - 220, fy - 250, hx, fy - 260).quadraticCurveTo(hx + 210, fy - 240, hx + 240, fy).closePath().fill({ color: 0x8a8eaa });
        for (let k = 1; k < 6; k++) g.moveTo(hx - 230 + k * 12, fy).quadraticCurveTo(hx - 200 + k * 30, fy - 250 + k * 30, hx + k * 30, fy - 260 + k * 40).stroke({ color: 0xc8cce0, width: 2, alpha: 0.5 });
      }
      // The arch, glowing.
      g.moveTo(hx - 48, fy).lineTo(hx - 48, fy - 80).quadraticCurveTo(hx, fy - 130, hx + 48, fy - 80).lineTo(hx + 48, fy).closePath().fill({ color: 0x14102c });
      e.moveTo(hx - 48, fy).lineTo(hx - 48, fy - 80).quadraticCurveTo(hx, fy - 130, hx + 48, fy - 80).lineTo(hx + 48, fy).stroke({ color: CYAN, width: 2.4 });
      e.moveTo(hx - 34, fy).lineTo(hx - 34, fy - 76).quadraticCurveTo(hx, fy - 112, hx + 34, fy - 76).lineTo(hx + 34, fy).closePath().fill({ color: VIOLET, alpha: 0.35 });
      const halo = new Graphics().ellipse(hx, fy - 70, 120, 110).fill({ color: VIOLET, alpha: 0.5 });
      this.view.addChild(g);
      this.emissive.addChild(e);
      this.glow.addChild(halo);
      this.pulses.push({ g: halo, phase: 2.2, base: 0.8 });
      this.lights.push({ x: hx, y: fy - 90, radius: 800, intensity: 1.0, color: [0.65, 0.55, 1] });
      this.lights.push({ x: p.x + 280, y: p.y - 40, radius: 700, intensity: 0.6, color: [0.4, 0.9, 1] });
      this.scanPoints.sheart.push({ x: hx, y: fy - 120 });
    }
    // The antechamber's own soft light.
    this.lights.push({ x: SANCTUM.ante.x - 120, y: SANCTUM.ante.y, radius: 600, intensity: 0.6, color: [0.45, 0.85, 1] });

    // ---- The Choir gates (shown after contact) ----
    const portalTex = getPropArt().base.portal;
    for (const at of [SANCTUM.gate, SANCTUM.homeGate]) {
      const home = at === SANCTUM.homeGate;
      const x = at.x;
      const y = home ? at.y - 108 : at.y;
      const frame = new Container();
      if (portalTex) {
        const spr = new Sprite(portalTex);
        spr.anchor.set(0.5, 0.98);
        const sc = 236 / Math.max(1, portalTex.height);
        spr.scale.set(sc);
        // Sit the stone pedestal firmly on the ocean floor (embedded slightly so sloped seabed shows no gap).
        spr.position.set(x, home ? at.y + 12 : at.y + 122);
        frame.addChild(spr);
      } else {
        const fg = new Graphics();
        fg.ellipse(x, y, 46, 100).stroke({ color: 0x9a9eb4, width: 10 });
        fg.ellipse(x, y, 46, 100).stroke({ color: 0x5a5e78, width: 1.4 });
        if (home) fg.moveTo(x - 20, y + 98).lineTo(x - 30, at.y + 4).lineTo(x + 30, at.y + 4).lineTo(x + 20, y + 98).closePath().fill({ color: 0x6a6e8a });
        frame.addChild(fg);
      }
      frame.visible = false;
      this.view.addChild(frame);
      const core = new Graphics();
      const halo = new Graphics().ellipse(x, y, 90, 150).fill({ color: CYAN, alpha: 0.5 });
      this.emissive.addChild(core);
      this.glow.addChild(halo);
      const light: PointLight = { x, y, radius: 600, intensity: 0, color: [0.5, 0.8, 1] };
      this.lights.push(light);
      this.gates.push({ core, halo, light, x, y: home && portalTex ? at.y - 114 : y });
      (core as Graphics & { frame?: Container }).frame = frame;
    }

    // ---- Choir motes: slow ribbons of light drifting in the hall and the pool ----
    for (let i = 0; i < Math.round(16 * Math.max(0.5, detail)); i++) {
      const inPool = i % 3 === 2;
      const e = inPool ? SANCTUM.pool : SANCTUM.hall;
      const x = e.x + R(-e.rx * 0.7, e.rx * 0.7);
      const y = e.y + R(-e.ry * 0.6, e.ry * 0.6);
      this.motes.push({ x, y, vx: R(-30, 30), vy: R(-14, 14), phase: R(0, 6), c: CHOIR[i % 3], trail: [] });
    }
    this.emissive.addChild(this.moteG, this.ringsG);
    this.setDoor(false);
    this.setLocks([false, false]);
    this.setGates(false);
  }

  setDoor(open: boolean): void {
    this.doorShut.visible = this.doorGlow.visible = !open;
    this.doorOpen.visible = open;
    this.doorLight.intensity = open ? 0.35 : 0.7;
  }
  setLocks(open: boolean[]): void {
    this.locks.forEach((l, i) => {
      l.open = !!open[i];
      l.lens.visible = l.halo.visible = !l.open;
      l.light.intensity = l.open ? 0.35 : 0.9;
    });
  }
  setGates(on: boolean): void {
    this.gateOn = on;
    for (const g of this.gates) {
      g.core.visible = g.halo.visible = on;
      (g.core as Graphics & { frame?: Container }).frame!.visible = on;
      g.light.intensity = on ? 0.9 : 0;
    }
  }

  /** Rings of song spreading from a point (the resonator singing at a door); k 0..1 how far into the song. */
  song: { x: number; y: number; k: number } | null = null;

  private lastTime = -1;
  update(time: number, viewX0: number, viewX1: number, viewY0: number, viewY1: number): void {
    const dt = this.lastTime < 0 ? 0 : Math.min(0.1, Math.max(0, time - this.lastTime));
    this.lastTime = time;
    for (const s of this.slices) s.obj.visible = s.x1 > viewX0 && s.x0 < viewX1 && s.y1 > viewY0 && s.y0 < viewY1;
    const near = viewX1 > 28900 && viewX0 < 32600 && viewY1 > 7200;
    for (const p of this.pulses) p.g.alpha = p.base * (0.75 + 0.25 * Math.sin(time * 0.9 + p.phase));
    for (const [i, l] of this.locks.entries()) {
      if (l.open) continue;
      const s = 0.8 + 0.2 * Math.sin(time * 2.1 + i);
      l.lens.alpha = s;
      l.halo.alpha = 0.6 * s;
    }
    // The gates: a slow swirl of light inside the ring.
    for (const g of this.gates) {
      if (!this.gateOn) continue;
      const c = g.core.clear();
      for (let k = 0; k < 3; k++) {
        const a = time * (0.8 + k * 0.3) + k * 2.1;
        c.ellipse(g.x, g.y, 34 - k * 8, 88 - k * 18).stroke({ color: CHOIR[k], width: 2, alpha: 0.8 });
        c.circle(g.x + Math.cos(a) * (30 - k * 8), g.y + Math.sin(a) * (80 - k * 18), 3).fill({ color: 0xf4fbff });
      }
      g.halo.alpha = 0.6 + 0.2 * Math.sin(time * 1.4);
    }
    // Motes.
    const m = this.moteG.clear();
    if (near) {
      for (const mo of this.motes) {
        mo.phase += dt;
        mo.vx += Math.sin(mo.phase * 0.7) * 8 * dt;
        mo.vy += Math.cos(mo.phase * 0.9) * 6 * dt;
        mo.vx = Math.max(-40, Math.min(40, mo.vx));
        mo.vy = Math.max(-20, Math.min(20, mo.vy));
        const nx = mo.x + mo.vx * dt;
        const ny = mo.y + mo.vy * dt;
        const shapes = sanctumShapes() as Parameters<typeof shapesField>[0];
        if (shapesField(shapes, nx, ny) > -40) {
          mo.vx = -mo.vx;
          mo.vy = -mo.vy;
        } else {
          mo.x = nx;
          mo.y = ny;
        }
        mo.trail.push(mo.x, mo.y);
        if (mo.trail.length > 28) mo.trail.splice(0, 2);
        if (mo.x < viewX0 - 100 || mo.x > viewX1 + 100) continue;
        const t = mo.trail;
        // A ribbon: the trail, waving, thinning towards its tail.
        for (let k = 2; k < t.length; k += 2) {
          const f = k / t.length;
          const w = Math.sin(time * 3 + k * 0.4 + mo.phase) * 5 * f;
          m.moveTo(t[k - 2], t[k - 1] + w).lineTo(t[k], t[k + 1] + w).stroke({ color: mo.c, width: 0.6 + f * 2.4, alpha: 0.2 + f * 0.6 });
        }
        m.circle(mo.x, mo.y, 2.4).fill({ color: 0xf4fbff, alpha: 0.9 });
      }
    }
    // The resonator's song: rings spreading out.
    const r = this.ringsG.clear();
    if (this.song) {
      const { x, y, k } = this.song;
      for (let i = 0; i < 4; i++) {
        const f = (time * 0.9 + i / 4) % 1;
        r.circle(x, y, 20 + f * 260 * (0.4 + k * 0.6)).stroke({ color: CHOIR[i % 3], width: 2.2 * (1 - f), alpha: (1 - f) * (0.4 + 0.5 * k) });
      }
    }
  }
}
