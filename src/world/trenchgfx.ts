import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { getPropArt } from '../art/propArt';
import { materialFill, type WorldArt } from '../art/worldArt';
import type { WaterMotion } from '../scene/waterMotion';
import { BottomAnimal, type BottomKind } from '../actors/bottomLife';
import { drawListeningStation } from './fulmarArt';
import { mulberry32, WORLD_SEED } from '../rng';
import {
  CLEFT,
  CLEFT_FINDS,
  FULMAR,
  FULMAR_HATCH,
  fulmarTop,
  groundY,
  shapesField,
  TR_BUOY,
  TR_PROBE,
  TR_VENTS,
  TRENCH,
  TRENCH_Y,
  WORLD_H,
  WORLD_W,
  WORLD_X0,
} from './terrain';
import { dab, rustStreaks, traceField, type PointLight } from './scenery';

/**
 * Milestone 10: the art of the trench, drawn with code like everything else.
 *
 *  - Rock walls and three ledges stepping down from the shelf's rim, with
 *    grey sediment on the flats and pale deep-water life: sea lilies, glass
 *    sponges, tube worms, and warm pinprick bioluminescence that grows with
 *    depth (warm only: cyan, violet and magenta belong to the Choir).
 *  - The rim's toppled relay buoy and the crushed deep probe on ledge A.
 *  - The vent field: mineral chimneys with glowing cracks and shimmering
 *    plumes of scalding water; the cleft under ledge B, sealed by a chimney.
 *  - The drowned Fulmar deep station on the floor: a long riveted module, a
 *    crushed listening dome, a tilted side module and a dead antenna mast.
 *
 * Owned by Scenery, which adds these layers to its own and forwards update().
 */

const gy = (x: number) => groundY(Math.max(WORLD_X0, Math.min(WORLD_W, x)));

export class TrenchScenery {
  readonly view = new Container();
  readonly emissive = new Container();
  readonly glow = new Container();
  readonly lights: PointLight[] = [];
  readonly scanPoints = {
    trench: [] as { x: number; y: number }[],
    sigbuoy: [] as { x: number; y: number }[],
    probe: [] as { x: number; y: number }[],
    vents: [] as { x: number; y: number }[],
    chimney: [] as { x: number; y: number }[],
    fulmar: [] as { x: number; y: number }[],
  };
  private slices: { obj: Container; x0: number; x1: number }[] = [];
  private plumes = new Graphics();
  private ventGlow: { core: Graphics; halo: Graphics; light: PointLight; phase: number }[] = [];
  private plug = new Graphics();
  private plugGlow = new Graphics();
  private cleftOpen = new Graphics();
  private stationLamp: { core: Graphics; halo: Graphics; light: PointLight } | null = null;
  private probeBeacon: { body: Graphics; core: Graphics; halo: Graphics; ring: Graphics; light: PointLight; taken: boolean; x: number; y: number } | null = null;
  private buoyBeacon: { core: Graphics; halo: Graphics; ring: Graphics; light: PointLight; taken: boolean; x: number; y: number } | null = null;
  private hatchShut = new Graphics();
  private hatchOpen = new Graphics();
  private specks: { g: Graphics; x0: number; x1: number }[] = [];
  private rand: () => number;
  private readonly plumeFlow = { x: 0, y: 0, silt: 0, energy: 0 };
  private readonly animals: BottomAnimal[] = [];

  constructor(detail: number, art?: WorldArt, living = false, livingBases = false) {
    this.rand = mulberry32(WORLD_SEED ^ 0x7e3c);
    const R = (a: number, b: number) => a + this.rand() * (b - a);
    const rock = new Container();
    const decorL = new Container();
    this.view.addChild(rock, this.cleftOpen, decorL);

    // ---- Rock: chunks of wall and ledge, painted most densely near the open water ----
    const CH = 700;
    for (let x0 = TRENCH.x0 - 100; x0 < WORLD_W + 60; x0 += CH) {
      const x1 = Math.min(WORLD_W + 60, x0 + CH);
      const g = new Graphics();
      const pts: number[] = [];
      for (let x = x0 - 2; x <= x1 + 2; x += 8) pts.push(x, gy(x));
      pts.push(x1 + 2, WORLD_H + 300, x0 - 2, WORLD_H + 300);
      g.poly(pts).fill({ color: 0x39474b });
      const basalt = art?.materials.basalt;
      if (basalt) g.poly(pts).fill(materialFill(basalt, 0x39474b, 0.84, 1600, 1200));
      // Dabs near the surface of the rock (cliff faces too: a point is "near" if a column beside it is open lower down).
      const top = (x: number) => Math.min(gy(x), gy(x - 140), gy(x + 140));
      const n = Math.round(((x1 - x0) / 700) * 1100 * detail);
      for (let i = 0; i < n; i++) {
        const x = R(x0, x1);
        const t = top(x);
        const y = t + Math.pow(this.rand(), 1.4) * 320;
        if (y < gy(x) + 3) continue;
        const c = y - gy(x) < 40 && this.rand() < 0.4 ? 0x66787a : this.rand() < 0.5 ? 0x26333a : 0x435357;
        dab(g, x, y, R(8, 32), R(5, 18), c, R(0.2, 0.42));
      }
      // Cracks down the cliff faces.
      for (let i = 0; i < n / 30; i++) {
        let x = R(x0, x1);
        let y = top(x) + R(10, 200);
        if (y < gy(x)) continue;
        g.moveTo(x, y);
        for (let k = 0; k < 5; k++) {
          x += R(-9, 9);
          y += R(8, 22);
          g.lineTo(x, y);
        }
        g.stroke({ color: 0x1c262a, alpha: 0.45, width: R(0.8, 1.8) });
      }
      // Grey sediment on the flats, and a pale rim along the edge.
      for (let x = x0; x < x1; x += 6) {
        const y = gy(x);
        const flat = Math.abs(gy(x + 6) - y) < 4;
        if (flat) g.rect(x, y, 6.5, R(3, 8)).fill({ color: 0x6a6a60, alpha: 0.7 });
      }
      rock.addChild(g);
      this.slices.push({ obj: g, x0: x0 - 60, x1: x1 + 60 });
    }

    // Low colonies stay away from the moving vent plumes and the Fulmar hatch.
    for (const [i, x] of [27570, 28090, 28490, 29080, 29520, 30070, 30830, 31100, 32210].entries()) {
      const texture = art?.life[4 + i % 2];
      if (!texture || Math.abs(gy(x - 26) - gy(x + 26)) > 35 || TR_VENTS.some((vent) => Math.abs(x - vent.x) < 135)) continue;
      const life = new Sprite({ texture, label: 'paintedTrenchColony', alpha: 0.76 });
      life.anchor.set(0.5, 0.91);
      life.position.set(x, gy(x));
      life.width = life.height = 95 + (i % 3) * 16;
      decorL.addChild(life);
      this.slices.push({ obj: life, x0: x - 120, x1: x + 120 });
    }

    // ---- Decor per chunk ----
    const decor: Graphics[] = [];
    const DC = 1000;
    for (let x0 = TRENCH.x0 - 100; x0 < WORLD_W; x0 += DC) {
      const d = new Graphics();
      decorL.addChild(d);
      decor.push(d);
      this.slices.push({ obj: d, x0: x0 - 200, x1: x0 + DC + 200 });
    }
    const dg = (x: number) => decor[Math.max(0, Math.min(decor.length - 1, Math.floor((x - (TRENCH.x0 - 100)) / DC)))];
    const flatAt = (x: number) => Math.abs(gy(x + 10) - gy(x - 10)) < 14;
    const scratch = living ? new Graphics() : undefined;
    const addAnimal = (kind: BottomKind, x: number, y: number, size: number) => {
      if (!living) return;
      const animal = new BottomAnimal(kind, x, y, size, x * 0.02);
      this.animals.push(animal);
      decorL.addChild(animal.view);
    };
    // Sea lilies, glass sponges and tube worms on the ledges and the floor.
    for (let i = 0; i < Math.round(110 * detail); i++) {
      const x = R(TRENCH.x0, 32500);
      if (!flatAt(x) || (x > FULMAR.x0 - 40 && x < FULMAR.x1 + 40)) continue;
      const y = gy(x) + 3;
      const g = scratch?.clear() ?? dg(x);
      const k = this.rand();
      if (k < 0.35) {
        // A sea lily: a long stalk with a crown of feathery arms.
        const h = R(30, 70);
        const lean = R(-10, 10);
        addAnimal('lily', x, y, h);
        g.moveTo(x, y).quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x + lean, y - h).stroke({ color: 0x8a8070, width: 1.4 });
        for (let a = 0; a < 7; a++) {
          const ang = -Math.PI / 2 + (a - 3) * 0.38;
          g.moveTo(x + lean, y - h).quadraticCurveTo(x + lean + Math.cos(ang) * 10, y - h + Math.sin(ang) * 14, x + lean + Math.cos(ang) * 16, y - h + Math.sin(ang) * 6 + 6).stroke({ color: 0xc8b8a0, width: 1, alpha: 0.8 });
        }
      } else if (k < 0.6) {
        // A glass sponge: a pale lattice vase.
        const h = R(20, 46);
        addAnimal('sponge', x, y, h);
        const w = h * 0.38;
        g.moveTo(x - w * 0.5, y).quadraticCurveTo(x - w, y - h * 0.6, x - w * 0.7, y - h).lineTo(x + w * 0.7, y - h).quadraticCurveTo(x + w, y - h * 0.6, x + w * 0.5, y).closePath().fill({ color: 0xc8c4b0, alpha: 0.35 });
        for (let r = 1; r < 5; r++) g.moveTo(x - w * 0.7, y - (h * r) / 5).lineTo(x + w * 0.7, y - (h * r) / 5).stroke({ color: 0xe8e0c8, width: 0.6, alpha: 0.5 });
        for (let c = -2; c <= 2; c++) g.moveTo(x + c * w * 0.2, y).lineTo(x + c * w * 0.3, y - h).stroke({ color: 0xe8e0c8, width: 0.6, alpha: 0.4 });
      } else if (k < 0.85) {
        addAnimal('worm', x, y, 23);
        for (let t = 0; t < 5; t++) {
          const tx = x + R(-12, 12);
          const th = R(8, 22);
          g.moveTo(tx, y).lineTo(tx + R(-3, 3), y - th).stroke({ color: 0xd8d0c0, width: 2.4, cap: 'round' });
          g.circle(tx, y - th, 2.2).fill({ color: 0xb04a3a, alpha: 0.9 });
        }
      } else {
        // A pale bone or a rock with a brittle star.
        const w = R(10, 22);
        g.ellipse(x, y - 4, w, R(4, 7)).fill({ color: 0x4e5a5c });
        addAnimal('star', x, y, w);
        for (let a = 0; a < 5; a++) {
          const ang = (a / 5) * Math.PI * 2 + R(0, 1);
          g.moveTo(x, y - 9).quadraticCurveTo(x + Math.cos(ang) * 8, y - 9 + Math.sin(ang) * 3, x + Math.cos(ang) * 15, y - 9 + Math.sin(ang) * 5).stroke({ color: 0xc8805a, width: 1.4 });
        }
      }
    }
    scratch?.destroy();
    // Pinpricks of warm living light, more of them the deeper it goes.
    for (let x0 = TRENCH.x0; x0 < 32500; x0 += 900) {
      const e = new Graphics();
      for (let i = 0; i < 40; i++) {
        const x = x0 + R(0, 900);
        const deep = Math.min(1, Math.max(0, (gy(x) - 1700) / 5000));
        if (this.rand() > 0.25 + deep * 0.75) continue;
        const y = gy(x) - R(2, 18);
        const c = this.rand() < 0.6 ? 0xf0e890 : this.rand() < 0.5 ? 0xffc070 : 0xb8f0a0;
        e.circle(x, y, R(0.8, 1.8)).fill({ color: c, alpha: R(0.5, 0.95) });
      }
      this.emissive.addChild(e);
      this.specks.push({ g: e, x0: x0 - 100, x1: x0 + 1000 });
    }
    this.scanPoints.trench.push({ x: 27420, y: 2100 }, { x: 28600, y: 2900 }, { x: 31000, y: 5500 });

    // ---- The rim: a toppled relay buoy ----
    {
      const g = dg(TR_BUOY.x);
      const x = TR_BUOY.x;
      const y = gy(x);
      g.roundRect(x - 70, y - 44, 140, 40, 18).fill({ color: 0x7a3a2a });
      g.roundRect(x - 70, y - 44, 140, 10, 8).fill({ color: 0xffffff, alpha: 0.08 });
      for (const bx of [x - 40, x, x + 40]) g.rect(bx - 4, y - 44, 8, 40).fill({ color: 0xd8d0b8, alpha: 0.55 });
      g.moveTo(x + 66, y - 28).lineTo(x + 170, y - 60).stroke({ color: 0x4a4440, width: 5 });
      g.circle(x + 172, y - 61, 8).fill({ color: 0x3a3432 });
      g.ellipse(x - 76, y - 24, 8, 16).fill({ color: 0x4a4440 });
      rustStreaks(g, x - 60, x + 60, y - 34, 8, 14);
      for (let c = 0; c < 10; c++) g.ellipse(x - 90 - c * 8, y - 4 + Math.sin(c) * 2, 4, 2.6).stroke({ color: 0x5a4a3e, width: 1.6 });
      const t = new Text({ text: 'FULMAR RELAY 4', style: { fontFamily: 'monospace', fontSize: 11, fill: 0xd8d0b8, fontWeight: 'bold', letterSpacing: 2 } });
      t.alpha = 0.5;
      t.anchor.set(0.5);
      t.position.set(x, y - 22);
      this.view.addChild(t);
      this.slices.push({ obj: t, x0: x - 600, x1: x + 600 });
      // Pulsing amber recorder beacon on FULMAR RELAY 4 so its pattern spool is easy to spot in the dark.
      const bx = x + 38;
      const by = y - 48;
      const bCore = new Graphics().circle(bx, by, 5).fill({ color: 0xffe494 }).circle(bx, by, 2.5).fill({ color: 0xffffff });
      const bHalo = new Graphics().circle(bx, by, 26).fill({ color: 0xffb848, alpha: 0.48 });
      const bRing = new Graphics();
      this.emissive.addChild(bCore, bRing);
      this.glow.addChild(bHalo);
      const bLight: PointLight = { x: bx, y: by, radius: 240, intensity: 0.85, color: [1, 0.78, 0.35] };
      this.lights.push(bLight);
      this.buoyBeacon = { core: bCore, halo: bHalo, ring: bRing, light: bLight, taken: false, x: bx, y: by };
      this.scanPoints.sigbuoy.push({ x, y: y - 40 });
    }

    // ---- Ledge A: the crushed deep probe (FULMAR DP-2) + glowing Stress Recorder canister ----
    {
      const g = dg(TR_PROBE.x);
      const x = TR_PROBE.x;
      const y = gy(x);
      const probeTex = getPropArt().landmarks.probe;
      if (probeTex) {
        const spr = new Sprite(probeTex);
        spr.anchor.set(0.5, 0.94);
        const sc = 215 / Math.max(1, probeTex.width);
        spr.scale.set(sc);
        spr.position.set(x, y + 10);
        this.view.addChild(spr);
        this.slices.push({ obj: spr, x0: x - 600, x1: x + 600 });
      } else {
        // Heavy riveted steel roll-cage frame & bumper skids resting in silt.
        g.roundRect(x - 102, y - 10, 204, 14, 5).fill({ color: 0x262a2c }).stroke({ color: 0x121618, width: 2 });
        g.moveTo(x - 90, y - 4).lineTo(x - 72, y - 122).lineTo(x + 76, y - 112).lineTo(x + 94, y - 4)
          .stroke({ color: 0x181c1e, width: 10, join: 'round' });
        g.moveTo(x - 90, y - 4).lineTo(x - 72, y - 122).lineTo(x + 76, y - 112).lineTo(x + 94, y - 4)
          .stroke({ color: 0x4c4842, width: 6, join: 'round' });
        g.moveTo(x - 82, y - 62).lineTo(x + 86, y - 56).stroke({ color: 0x3a3632, width: 5 });
        // Corner gusset plates & bolts.
        for (const [gx, gy2] of [[x - 72, y - 120], [x + 74, y - 110]] as const) {
          g.circle(gx, gy2, 6).fill({ color: 0x5c554c }).stroke({ color: 0x1a1e20, width: 1.5 });
          g.circle(gx, gy2, 2).fill({ color: 0x8f8472 });
        }
        // Crushed bathysphere pressure hull (smooth curved weathered-ochre sphere buckled inward on the right).
        const hullPts: number[] = [];
        for (let i = 0; i <= 22; i++) {
          const a = -Math.PI * 0.15 + (i / 22) * Math.PI * 1.48;
          hullPts.push(x - 4 + Math.cos(a) * 54, y - 66 + Math.sin(a) * 52);
        }
        // Dramatic pressure-implosion crease on the right flank.
        hullPts.push(x + 28, y - 92, x + 16, y - 72, x + 44, y - 58, x + 36, y - 34);
        g.poly(hullPts).fill({ color: 0xa4853b }).stroke({ color: 0x1a1c1a, width: 2.4 });
        // Upper-left specular dome highlight & lower-right deep buckle shadow.
        g.ellipse(x - 18, y - 92, 26, 14).fill({ color: 0xd4b668, alpha: 0.34 });
        g.poly([x + 28, y - 92, x + 16, y - 72, x + 44, y - 58, x + 28, y - 28, x + 2, y - 54]).fill({ color: 0x524222, alpha: 0.72 });
        // Riveted brass equatorial belt & seam rivets.
        g.moveTo(x - 56, y - 66).quadraticCurveTo(x - 10, y - 54, x + 22, y - 68)
          .stroke({ color: 0x6a5426, width: 6, cap: 'round' });
        g.moveTo(x - 56, y - 66).quadraticCurveTo(x - 10, y - 54, x + 22, y - 68)
          .stroke({ color: 0xc29e4c, width: 2.2, cap: 'round' });
        for (let r = -46; r <= 14; r += 12) g.circle(x + r, y - 62, 1.3).fill({ color: 0x262014 });
        // Thick riveted brass circular viewport with dark cracked glass & specular glint.
        g.circle(x - 18, y - 70, 22).fill({ color: 0x7a6232 }).stroke({ color: 0x1e1a12, width: 2 });
        g.circle(x - 18, y - 70, 17).fill({ color: 0x0b1216 }).stroke({ color: 0xb89648, width: 1.6 });
        g.arc(x - 18, y - 70, 13, -2.5, -1.2).stroke({ color: 0x9cd2d8, width: 2.2, alpha: 0.35, cap: 'round' });
        // Spiderweb pressure cracks across the dark glass.
        g.moveTo(x - 24, y - 78).lineTo(x - 15, y - 68).lineTo(x - 6, y - 73)
          .moveTo(x - 15, y - 68).lineTo(x - 19, y - 56).moveTo(x - 15, y - 68).lineTo(x - 9, y - 60)
          .stroke({ color: 0xa0d8dc, width: 0.9, alpha: 0.42 });
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          g.circle(x - 18 + Math.cos(a) * 19.5, y - 70 + Math.sin(a) * 19.5, 1.3).fill({ color: 0x2b2416 });
        }
        // Dangling torn cable & barnacle/rust weathering.
        g.moveTo(x + 42, y - 56).bezierCurveTo(x + 62, y - 40, x + 56, y - 16, x + 76, y - 6)
          .stroke({ color: 0x222628, width: 2.6, cap: 'round' });
        rustStreaks(g, x - 48, x + 36, y - 92, 12, 24);
      }
      const t = new Text({ text: 'FULMAR DP-2', style: { fontFamily: 'monospace', fontSize: 11, fill: 0xe6d6a8, fontWeight: 'bold', letterSpacing: 2 } });
      t.alpha = 0.8;
      t.anchor.set(0.5);
      t.position.set(x - 6, y - 26);
      t.rotation = -0.1;
      this.view.addChild(t);
      this.slices.push({ obj: t, x0: x - 600, x1: x + 600 });

      // Highly visible glowing Stress Recorder canister & pulsing amber distress beacon!
      const rx = x + 48;
      const ry = y - 104;
      const pBody = new Graphics();
      pBody.roundRect(rx - 13, ry - 18, 26, 30, 5).fill({ color: 0x2e3638 }).stroke({ color: 0xd4a84e, width: 2.2 });
      pBody.rect(rx - 9, ry - 12, 18, 8).fill({ color: 0x10181a });
      pBody.moveTo(rx + 6, ry - 18).lineTo(rx + 6, ry - 32).stroke({ color: 0xc29e4c, width: 2.2, cap: 'round' });
      this.view.addChild(pBody);
      this.slices.push({ obj: pBody, x0: x - 600, x1: x + 600 });

      const pCore = new Graphics()
        .roundRect(rx - 7, ry - 10, 14, 4, 2).fill({ color: 0xffe488 })
        .circle(rx + 6, ry - 33, 5.5).fill({ color: 0xffd268 })
        .circle(rx + 6, ry - 33, 2.8).fill({ color: 0xffffff });
      const pHalo = new Graphics()
        .circle(rx + 6, ry - 33, 34).fill({ color: 0xffae3a, alpha: 0.55 })
        .circle(rx, ry - 6, 22).fill({ color: 0xffc858, alpha: 0.32 });
      const pRing = new Graphics();
      this.emissive.addChild(pCore, pRing);
      this.glow.addChild(pHalo);
      const pLight: PointLight = { x: rx + 4, y: ry - 26, radius: 300, intensity: 1.05, color: [1, 0.78, 0.34] };
      this.lights.push(pLight);
      this.probeBeacon = { body: pBody, core: pCore, halo: pHalo, ring: pRing, light: pLight, taken: false, x: rx + 6, y: ry - 33 };
      this.scanPoints.probe.push({ x, y: y - 70 });
    }

    // ---- The vent field: mineral chimneys, glowing cracks, scalding plumes ----
    for (const [i, v] of TR_VENTS.entries()) {
      const g = dg(v.x);
      const y = gy(v.x) + 4;
      const w = 22 + (v.h % 3) * 4;
      const pts: number[] = [];
      for (let k = 0; k <= 10; k++) {
        const f = k / 10;
        pts.push(v.x - w * (1 - f * 0.55) + Math.sin(k * 2.1 + i) * 4, y - v.h * f);
      }
      for (let k = 10; k >= 0; k--) {
        const f = k / 10;
        pts.push(v.x + w * (1 - f * 0.55) + Math.sin(k * 1.7 + i) * 4, y - v.h * f);
      }
      g.poly(pts).fill({ color: 0x2e2a28 });
      const mineral = art?.materials.silt;
      if (mineral) g.poly(pts).fill(materialFill(mineral, 0x2e2a28, 0.57, 165, 190));
      for (let k = 0; k < 7; k++) dab(g, v.x + R(-w * 0.6, w * 0.6), y - R(0, v.h), R(4, 10), R(4, 8), this.rand() < 0.5 ? 0x4a3e34 : 0x1e1a18, 0.6);
      // Little side spires.
      for (const s of [-1, 1]) g.poly([v.x + s * w * 0.8, y, v.x + s * w * 1.2, y - v.h * 0.35, v.x + s * w * 0.4, y - v.h * 0.2]).fill({ color: 0x3a322c });
      // Glowing cracks (warm orange), drawn unlit.
      const core = new Graphics();
      for (let k = 0; k < 4; k++) {
        let cx = v.x + R(-w * 0.5, w * 0.5);
        let cyy = y - R(10, v.h - 10);
        core.moveTo(cx, cyy);
        for (let s = 0; s < 3; s++) {
          cx += R(-5, 5);
          cyy += R(-14, -4);
          core.lineTo(cx, cyy);
        }
        core.stroke({ color: 0xffa040, width: 1.4 });
      }
      core.ellipse(v.x, y - v.h, w * 0.4, 4).fill({ color: 0xffc070 });
      const halo = new Graphics().ellipse(v.x, y - v.h * 0.6, w * 1.6, v.h * 0.5).fill({ color: 0xff8030, alpha: 0.35 }).ellipse(v.x, y - v.h - 6, w, 14).fill({ color: 0xffa050, alpha: 0.5 });
      this.emissive.addChild(core);
      this.glow.addChild(halo);
      const light: PointLight = { x: v.x, y: y - v.h - 10, radius: 260, intensity: 0.9, color: [1, 0.55, 0.25] };
      this.lights.push(light);
      this.ventGlow.push({ core, halo, light, phase: i * 1.7 });
      this.scanPoints.vents.push({ x: v.x, y: y - v.h - 20 });
    }
    this.view.addChild(this.plumes);

    // ---- The cleft: the tunnel and chamber, and the mineral chimney that seals it ----
    {
      const o = this.cleftOpen;
      const fn = (x: number, y: number) => Math.max(shapesField([CLEFT.tunnel, CLEFT.room], x, y), gy(x) + 2 - y);
      traceField(o, (x, y) => fn(x, y) - 10, 28740, 29520, 3900, 4190, 5, 0x2c3a3f, 0.7);
      traceField(o, fn, 28740, 29520, 3900, 4190, 5, 0x10181b, 1);
      const walls = art?.materials.basalt;
      if (walls) traceField(o, fn, 28740, 29520, 3900, 4190, 5, materialFill(walls, 0x10181b, 0.68, 930, 520));
      // A crashed cargo pod from the station in the chamber: the drawings and a pattern spool are in it.
      const r = CLEFT.room;
      const fy = r.y + r.ry - 14;
      o.roundRect(CLEFT_FINDS.plans.x - 40, fy - 34, 80, 34, 8).fill({ color: 0x8a7a40 });
      o.roundRect(CLEFT_FINDS.plans.x - 40, fy - 34, 80, 8, 6).fill({ color: 0xffffff, alpha: 0.1 });
      o.rect(CLEFT_FINDS.plans.x - 36, fy - 20, 72, 4).fill({ color: 0x7a3a2a });
      o.roundRect(CLEFT_FINDS.spool.x - 14, fy - 22, 28, 22, 4).fill({ color: 0x4a4e50 });
      o.circle(CLEFT_FINDS.spool.x, fy - 11, 8).stroke({ color: 0xc9a24a, width: 2 });
      rustStreaks(o, CLEFT_FINDS.plans.x - 30, CLEFT_FINDS.plans.x + 30, fy - 26, 5, 10);
      this.slices.push({ obj: o, x0: 28600, x1: 29700 });
      // The chimney: knobbly mineral, hot at its seams.
      const p = this.plug;
      const { x0, x1, y0, y1 } = CLEFT.plug;
      const cx = (x0 + x1) / 2;
      p.poly([x0 - 6, y1 + 4, x0 + 4, y0 + 30, cx - 8, y0 - 16, cx + 10, y0 - 6, x1 + 2, y0 + 26, x1 + 8, y1 + 4]).fill({ color: 0x302a26 });
      for (let k = 0; k < 14; k++) dab(p, R(x0, x1), R(y0, y1), R(6, 14), R(5, 10), this.rand() < 0.5 ? 0x4a3e34 : 0x221e1c, 0.65);
      const yTrail = y1 - 25;
      p.moveTo(x1 + 1, yTrail + 10).quadraticCurveTo(cx + 9, yTrail + 12, cx + 3, yTrail + 1)
        .quadraticCurveTo(cx - 2, yTrail - 6, cx - 12, yTrail - 5)
        .stroke({ color: 0x937d61, width: 5, alpha: 0.75 });
      p.moveTo(x1 - 1, yTrail - 4).quadraticCurveTo(cx + 13, yTrail - 3, cx + 6, yTrail - 12)
        .stroke({ color: 0xb49a75, width: 3, alpha: 0.62 });
      const pg = this.plugGlow;
      for (let k = 0; k < 5; k++) {
        let x = R(x0 + 8, x1 - 8);
        let y = R(y0 + 20, y1 - 10);
        pg.moveTo(x, y);
        for (let s = 0; s < 3; s++) {
          x += R(-6, 6);
          y += R(-16, -6);
          pg.lineTo(x, y);
        }
        pg.stroke({ color: 0xff9a40, width: 1.6 });
      }
      pg.ellipse(cx, y0 - 12, 10, 4).fill({ color: 0xffc070 });
      this.view.addChild(p);
      this.emissive.addChild(pg);
      this.scanPoints.chimney.push({ x: cx, y: y0 + 40 });
    }

    // ---- The Fulmar deep station on the floor ----
    {
      const g = dg(FULMAR.x0 + 300);
      const g2 = new Graphics();
      decorL.addChild(g2);
      this.slices.push({ obj: g2, x0: FULMAR.x0 - 600, x1: FULMAR.x1 + 600 });
      const f = TRENCH_Y.floor + 10;
      const pts: number[] = [];
      for (let x = FULMAR.x0; x <= FULMAR.x1; x += 6) pts.push(x, fulmarTop(x));
      pts.push(FULMAR.x1, f + 20, FULMAR.x0, f + 20);
      const hull = art?.materials.fulmar;
      if (livingBases) drawListeningStation(g2, pts, f, hull);
      else {
        g2.poly(pts).fill({ color: 0x4a4a46 });
        if (hull) g2.poly(pts).fill(materialFill(hull, 0x4a4a46, 0.73, 1050, 540));
        // Hull bands, rivets and portholes.
        for (let x = FULMAR.x0 + 50; x < FULMAR.x1 - 20; x += 90) {
          const t = fulmarTop(x);
          g2.rect(x, t + 4, 8, f - t - 4).fill({ color: 0x3a3a36 });
          for (let ry = t + 16; ry < f; ry += 20) g2.circle(x + 4, ry, 1.4).fill({ color: 0x2a2a26 });
        }
        for (let x = FULMAR.x0 + 110; x < FULMAR.mainX1 - 60; x += 120) {
          if (Math.abs(x - FULMAR.domeX) < 120) continue;
          const py = fulmarTop(x) + 90;
          g2.circle(x, py, 16).fill({ color: 0x6a665c });
          g2.circle(x, py, 11).fill({ color: 0x081014 });
        }
        // The listening dome: cracked glass over a dark frame.
        g2.ellipse(FULMAR.domeX, f - 250, 110, 12).fill({ color: 0x5a5650 });
        for (let k = -3; k <= 3; k++) g2.moveTo(FULMAR.domeX + k * 30, f - 250).lineTo(FULMAR.domeX + k * 22, fulmarTop(FULMAR.domeX + k * 22) + 2).stroke({ color: 0x3a3632, width: 3 });
        g2.moveTo(FULMAR.domeX - 40, f - 300).lineTo(FULMAR.domeX - 10, f - 280).lineTo(FULMAR.domeX + 20, f - 310).lineTo(FULMAR.domeX + 50, f - 286).stroke({ color: 0xa8c8c8, width: 1, alpha: 0.4 });
        // A red band and the station's name.
        g2.rect(FULMAR.x0 + 30, f - 140, FULMAR.mainX1 - FULMAR.x0 - 40, 10).fill({ color: 0x7a3a2a });
      }
      rustStreaks(g2, FULMAR.x0 + 40, FULMAR.x1 - 40, f - 200, 40, 50);
      const t = new Text({ text: 'FULMAR DEEP STATION', style: { fontFamily: 'monospace', fontSize: 22, fill: 0xd8d0b8, fontWeight: 'bold', letterSpacing: 5 } });
      t.alpha = 0.5;
      t.anchor.set(0.5);
      t.position.set(FULMAR.x0 + 380, f - 105);
      this.view.addChild(t);
      this.slices.push({ obj: t, x0: FULMAR.x0 - 600, x1: FULMAR.x1 + 600 });
      // The dead antenna mast, leaning, with its cross-arms.
      const mx = FULMAR.mainX1 - 70;
      const mt = fulmarTop(mx);
      if (!livingBases) g2.moveTo(mx, mt).lineTo(mx + 70, mt - 330).stroke({ color: 0x4a4440, width: 6 });
      for (let k = 1; !livingBases && k < 5; k++) {
        const ax = mx + 70 * (k / 5);
        const ay = mt - 330 * (k / 5);
        g2.moveTo(ax - 30, ay + 6).lineTo(ax + 30, ay - 6).stroke({ color: 0x4a4440, width: 3 });
      }
      // Cables slumped onto the floor.
      g.moveTo(FULMAR.x1 - 10, f - 40).bezierCurveTo(FULMAR.x1 + 60, f - 20, FULMAR.x1 + 100, f + 6, FULMAR.x1 + 220, gy(FULMAR.x1 + 220)).stroke({ color: 0x2a2826, width: 5 });
      g.moveTo(FULMAR.x0 + 10, f - 30).bezierCurveTo(FULMAR.x0 - 80, f - 10, FULMAR.x0 - 140, f + 4, FULMAR.x0 - 260, gy(FULMAR.x0 - 260)).stroke({ color: 0x2a2826, width: 4 });
      // The airlock hatch on top: a wheel on a raised collar.
      const hx = FULMAR_HATCH.x;
      const hy = FULMAR_HATCH.y;
      const hs = this.hatchShut;
      hs.roundRect(hx - 40, hy - 18, 80, 20, 4).fill({ color: 0x5a5650 });
      hs.circle(hx, hy - 24, 14).stroke({ color: 0xa8402e, width: 3 });
      hs.moveTo(hx - 14, hy - 24).lineTo(hx + 14, hy - 24).moveTo(hx, hy - 38).lineTo(hx, hy - 10).stroke({ color: 0xa8402e, width: 2 });
      const ho = this.hatchOpen;
      ho.roundRect(hx - 40, hy - 18, 80, 20, 4).fill({ color: 0x5a5650 });
      ho.roundRect(hx - 28, hy - 18, 56, 10, 3).fill({ color: 0x060a0c });
      ho.poly([hx + 28, hy - 18, hx + 40, hy - 56, hx + 50, hy - 54, hx + 40, hy - 16]).fill({ color: 0x5a5650 });
      ho.visible = false;
      this.view.addChild(hs, ho);
      // One amber emergency lamp still blinking by the hatch.
      const lx = hx - 60;
      const ly = hy - 12;
      g2.rect(lx - 4, ly, 8, 12).fill({ color: 0x3a3632 });
      const core = new Graphics().circle(lx, ly - 2, 4).fill({ color: 0xffb050 });
      const halo = new Graphics().circle(lx, ly - 2, 22).fill({ color: 0xff9030, alpha: 0.6 });
      this.emissive.addChild(core);
      this.glow.addChild(halo);
      const light: PointLight = { x: lx, y: ly - 4, radius: 300, intensity: 0.8, color: [1, 0.6, 0.3] };
      this.lights.push(light);
      this.stationLamp = { core, halo, light };
      this.scanPoints.fulmar.push({ x: FULMAR.x0 + 300, y: f - 220 }, { x: hx, y: hy - 60 });
    }
    this.setCleft(false);
  }

  setCleft(open: boolean): void {
    this.plug.visible = this.plugGlow.visible = !open;
  }
  setFulmar(open: boolean): void {
    this.hatchShut.visible = !open;
    this.hatchOpen.visible = open;
  }
  setProbeLogs(taken: boolean): void {
    if (!this.probeBeacon) return;
    this.probeBeacon.taken = taken;
    this.probeBeacon.body.visible = !taken;
    this.probeBeacon.core.visible = !taken;
    this.probeBeacon.halo.visible = !taken;
    this.probeBeacon.ring.visible = !taken;
    if (taken) this.probeBeacon.light.intensity = 0;
  }
  setBuoySpool(taken: boolean): void {
    if (!this.buoyBeacon) return;
    this.buoyBeacon.taken = taken;
    this.buoyBeacon.core.visible = !taken;
    this.buoyBeacon.halo.visible = !taken;
    this.buoyBeacon.ring.visible = !taken;
    if (taken) this.buoyBeacon.light.intensity = 0;
  }

  update(time: number, viewX0: number, viewX1: number, motion: WaterMotion | undefined, diverX: number, diverY: number): void {
    for (const s of this.slices) s.obj.visible = s.x1 > viewX0 && s.x0 < viewX1;
    for (const s of this.specks) s.g.visible = s.x1 > viewX0 && s.x0 < viewX1;
    for (const animal of this.animals) {
      animal.view.visible = animal.x > viewX0 - 100 && animal.x < viewX1 + 100 && Math.abs(animal.y - diverY) < 1000;
      if (!animal.view.visible) continue;
      const flow = motion ? motion.sample(animal.x, animal.y - 15, this.plumeFlow).x / 70 : 0;
      const passing = Math.max(0, 1 - Math.hypot(animal.x - diverX, animal.y - diverY) / 110);
      animal.update(time, flow, passing);
    }
    for (const v of this.ventGlow) {
      const p = 0.8 + 0.2 * Math.sin(time * 1.7 + v.phase) + 0.08 * Math.sin(time * 7.3 + v.phase * 3);
      v.core.alpha = 0.7 + 0.3 * p;
      v.halo.alpha = 0.7 * p;
      v.light.intensity = 0.9 * p;
    }
    if (this.stationLamp) {
      const t = time % 3;
      const on = t < 0.25 ? 1 : 0.15;
      this.stationLamp.core.alpha = on;
      this.stationLamp.halo.alpha = on;
      this.stationLamp.light.intensity = 0.9 * on;
    }
    if (this.probeBeacon && !this.probeBeacon.taken) {
      const pb = this.probeBeacon;
      const pulse = 0.55 + 0.45 * Math.sin(time * 4.2);
      const ping = (time * 0.72) % 1;
      pb.core.alpha = 0.75 + 0.25 * pulse;
      pb.halo.alpha = 0.55 + 0.45 * pulse;
      pb.light.intensity = 0.85 + 0.45 * pulse;
      pb.ring.clear().circle(pb.x, pb.y, 10 + ping * 44).stroke({ color: 0xffd268, width: 2.2 * (1 - ping * 0.5), alpha: (1 - ping) * 0.85 });
    }
    if (this.buoyBeacon && !this.buoyBeacon.taken) {
      const bb = this.buoyBeacon;
      const pulse = 0.5 + 0.5 * Math.sin(time * 3.6 + 1.1);
      const ping = ((time * 0.65) + 0.35) % 1;
      bb.core.alpha = 0.7 + 0.3 * pulse;
      bb.halo.alpha = 0.5 + 0.45 * pulse;
      bb.light.intensity = 0.75 + 0.35 * pulse;
      bb.ring.clear().circle(bb.x, bb.y, 8 + ping * 36).stroke({ color: 0xffd268, width: 1.8 * (1 - ping * 0.5), alpha: (1 - ping) * 0.75 });
    }
    // Shimmering plumes over the vents.
    const g = this.plumes.clear();
    if (viewX1 < TR_VENTS[0].x - 400 || viewX0 > TR_VENTS[TR_VENTS.length - 1].x + 400) return;
    for (const [i, v] of TR_VENTS.entries()) {
      const top = gy(v.x) + 4 - v.h;
      if (motion) {
        for (let k = 0; k < 16; k++) {
          const f = (time * (0.28 + (k % 3) * 0.03) + k / 16 + i * 0.13) % 1;
          const y = top - f * 380;
          const flow = motion.sample(v.x, y, this.plumeFlow);
          const x = v.x + Math.sin(time * 1.23 + k * 1.71 + f * 5) * (7 + f * 38) + flow.x * f * 0.48;
          const spread = 7 + f * 26;
          const alpha = Math.sin(Math.PI * f) * (1 - f * 0.65);
          g.moveTo(x - spread, y + 11).bezierCurveTo(x + spread * 0.72, y + 4, x + spread * 1.18, y - 17, x + flow.x * 0.21, y - 24)
            .stroke({ color: 0xc4a68a, width: 3.5 + spread * 0.31, alpha: 0.13 * alpha, cap: 'round' });
          g.circle(x, y - 5, 1.8 + (k % 4) * 0.55).fill({ color: 0xe5bd90, alpha: 0.35 * alpha });
        }
        continue;
      }
      for (let k = 0; k < 9; k++) {
        const f = ((time * 0.35 + k / 9 + i * 0.13) % 1);
        const y = top - f * 360;
        const sway = Math.sin(time * 1.3 + k * 1.9 + i) * (6 + f * 30);
        const r = 10 + f * 40;
        g.ellipse(v.x + sway, y, r, r * 0.6).fill({ color: 0x9a8a78, alpha: 0.13 * (1 - f) });
      }
    }
  }
}
