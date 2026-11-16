import { Application, BlurFilter, Container, RenderTexture, Sprite, Texture } from 'pixi.js';
import { loadChoice, pixelRatioFor, Preset, PresetChoice, resolveChoice, saveChoice } from './presets';
import { Water } from './scene/water';
import { Backdrop } from './scene/backdrop';
import { MarineSnow } from './scene/particles';
import { initSettingsUI } from './ui';
import { Input } from './input';
import { Diver } from './actors/diver';
import { Glowfin } from './actors/glowfin';
import { Bubbles } from './fx/bubbles';
import { Light, Lighting } from './fx/lighting';
import { Scenery } from './world/scenery';
import { bagRestingPlace, Pickups } from './world/pickups';
import { School } from './actors/school';
import {
  bakeSkyVisibility,
  CAVE,
  CAVE_GATE_X,
  caveTop,
  GROTTO,
  groundY,
  inCaveTunnel,
  isSolid,
  SPAWN,
  WORLD_H,
  WORLD_SPAN,
  WORLD_W,
  WORLD_X0,
  WU_PER_METRE,
} from './world/terrain';
import {
  bagHasRoom,
  bagLimits,
  bagLoad,
  bagWeight,
  clearSave,
  diverLimits,
  DRONE_REPAIR_COST,
  droneWeldRate,
  loadSave,
  MATERIAL_ORDER as MATERIALS_LIST,
  MATERIALS,
  maxOxygen,
  SaveData,
  TANK_BONUS,
  writeSave,
} from './game/state';
import { Drone } from './actors/drone';
import { Scanner } from './game/scanner';
import { SurfaceFx } from './fx/surface';
import { Hud } from './ui/hud';
import { DiveWatch } from './ui/watch';
import { BaseLayout, berthOf, GRID_BASE, GRID_X0, GRID_X1, isDone, pieceCode, PIECES, pieceRect, Placed } from './game/base';
import { Sub } from './actors/sub';
import { airClock, DENT_PER_SPEED, DENT_SPEED, docks, holdKg, SUB_AIR, SUB_BUILD_TIME, subDock } from './game/sub';
import { DockMode } from './ui/dock';
import { BaseView, BuildOverlay, storageCapacity } from './world/basegfx';
import { BuildMode } from './ui/build';
import { Wildlife } from './world/wildlife';
import { TankLife } from './world/tanklife';
import { CareMode } from './ui/care';
import { creaturesIn, newCreature, SPECIES, tankNumber, tickCare, TANK_CAPACITY } from './game/creatures';
import { RatesPanel } from './ui/rates';
import { Factory, FEEDER_MASH_CAP, HOPPER_CAP, machineData, PRESS_COPPER_CAP, PRESS_PLATE_CAP, PRESS_SCRAP_CAP, whorlMult } from './game/factory';
import { LinesView } from './world/linegfx';

declare const __BUILD_ID__: string;

/** How many world units fit in the screen's height. Fixed, so every device frames the scene the same. */
const VIEW_H = 640;
/** The camera zooms in on a creature tank while tending it. */
const VIEW_H_CARE = 235;
/** Milestone 6: driving the sub shows more water; the dock panel frames the dock. */
const VIEW_H_SUB = 820;
const VIEW_H_DOCK = 470;

/*
 * How a frame is drawn (back to front):
 *  1. Water: a shader paints the open water, surface and light shafts.
 *  2. Backdrop: distant rock ridges with parallax and depth fog.
 *  3. Lit layer: sand, rock, plants, fish and the diver are drawn flat into an
 *     off-screen picture, then the lighting shader lights it onto the screen.
 *  4. Emissive: things that shine (lamp lens, lures, anemones) drawn unlit.
 *  5. Glow: soft copies of the shining things, drawn small, blurred and added.
 *  6. Marine snow in front of everything.
 *  7. Scanner brackets and beam, on top (unlit, world space).
 *
 * Game rules for milestone 2 (oxygen, blackout, pickups, scanning, saving)
 * are in the frame loop below; the pieces live in src/game and src/world.
 * Milestone 3 adds the base: rules in src/game/base.ts, drawing in
 * src/world/basegfx.ts and build mode in src/ui/build.ts. Base pieces are
 * drawn in the lit layer behind the diver; dome glass is drawn in front.
 */

/** The diver breathes when their helmet is at the surface. */
const SURFACE_Y = 40;
async function boot(): Promise<void> {
  const host = document.getElementById('game')!;
  let choice: PresetChoice = loadChoice();
  let preset: Preset = resolveChoice(choice);

  const app = new Application();
  await app.init({
    preference: 'webgl',
    antialias: true,
    background: '#0b2a33',
    resolution: pixelRatioFor(preset, window.innerWidth, window.innerHeight),
    autoDensity: true,
    width: window.innerWidth,
    height: window.innerHeight,
    powerPreference: 'high-performance',
  });
  host.appendChild(app.canvas);
  const renderer = app.renderer;

  // Baked daylight/shadow map for the whole world (soft shadows under rock).
  const mask = Texture.from(bakeSkyVisibility(8, 3));
  mask.source.style.addressMode = 'clamp-to-edge';
  mask.source.style.scaleMode = 'linear';

  // Off-screen pictures for the lit layer and the glow layer.
  const litRT = RenderTexture.create({ width: 4, height: 4, antialias: true });
  const glowRT = RenderTexture.create({ width: 4, height: 4 });

  const water = new Water(mask);
  const backdrop = new Backdrop();
  const lighting = new Lighting(litRT, mask);
  const snow = new MarineSnow();

  const glowSprite = new Sprite(glowRT);
  glowSprite.blendMode = 'add';
  const blur = new BlurFilter({ strength: 10, quality: preset.glowQuality });
  glowSprite.filters = [blur];

  // World layers (each moved by the camera every frame).
  const litRoot = new Container();
  const litCam = new Container();
  const frontCam = new Container();
  litRoot.addChild(litCam, frontCam);
  const emissiveCam = new Container();
  const glowCam = new Container();
  const overlayCam = new Container();

  // Progress from the last visit (or a fresh start at the Kestrel buoy).
  const loaded = loadSave(SPAWN.x, SPAWN.y);
  const save: SaveData = loaded.data;

  let scenery = new Scenery(renderer, preset.detail);
  const pickups = new Pickups();
  const diver = new Diver();
  diver.x = save.x;
  diver.y = save.y;
  diver.lampOn = save.lampOn;
  const bubbles = new Bubbles(renderer);
  // The build drone: stuck in the sled wreck until repaired (milestone 3 follow-up).
  const drone = new Drone(save.drone === 'active');
  // The submersible KS-1 (milestone 6), once one has been started at a Moon pool dock.
  const sub = new Sub();
  const subBubbles = new Bubbles(renderer);
  if (save.sub) {
    sub.x = save.sub.x;
    sub.y = save.sub.y;
    sub.face = save.sub.face || 1;
    sub.setModules(save.sub.modules);
    if (save.sub.aboard) {
      diver.x = sub.x;
      diver.y = sub.y - 10;
    }
  }
  const fish = [0, 0, 1].map((look) => new Glowfin(look, GROTTO));
  // Milestone 4: wild creatures to collect, and life inside the creature tanks.
  const wildlife = new Wildlife();
  const tankLife = new TankLife();
  const schools = [
    new School(22, { x0: 1850, x1: 3500, y0: 200, y1: 380 }),
    new School(16, { x0: 6950, x1: 8250, y0: 300, y1: 450 }),
  ];
  const scanner = new Scanner([
    { id: 'silverbar', points: () => schools.map((s) => ({ x: s.cx, y: s.cy })) },
    { id: 'glowfin', points: () => fish.map((f) => ({ x: f.light.x - 20, y: f.light.y + 18 })) },
    { id: 'anemone', points: () => scenery.scanPoints.anemone },
    { id: 'kelp', points: () => scenery.scanPoints.kelp },
    { id: 'coral', points: () => scenery.scanPoints.coral },
    { id: 'fan', points: () => scenery.scanPoints.fan },
    { id: 'grass', points: () => scenery.scanPoints.grass },
    { id: 'buoy', points: () => scenery.scanPoints.buoy },
    { id: 'anchor', points: () => scenery.scanPoints.anchor },
    { id: 'sled', points: () => scenery.scanPoints.sled },
    { id: 'drone', points: () => [drone.scanPoint()] },
    { id: 'beacon', points: () => scenery.scanPoints.beacon },
    { id: 'cave', points: () => scenery.scanPoints.cave },
  ]);
  overlayCam.addChild(scanner.overlay);
  scanner.candidates.push(
    { id: 'puffcap', points: () => wildlife.scanPoints('puffcap') },
    { id: 'ray', points: () => wildlife.scanPoints('ray') },
    { id: 'whorl', points: () => pickups.whorlPoints() },
    { id: 'basin', points: () => [{ x: -2200, y: groundY(-2200) - 60 }, { x: 150, y: 1200 }] },
  );
  const surfaceFx = new SurfaceFx();

  // The base at the Kestrel site.
  const layout = new BaseLayout(save.pieces);
  save.pieces = layout.pieces;
  drone.teleport(diver.x, diver.y, layout);
  const baseView = new BaseView();
  baseView.sync(layout);
  tankLife.sync(save, layout);
  const buildOverlay = new BuildOverlay();
  overlayCam.addChild(buildOverlay.view);
  // Milestone 5: conveyors, feed pipes and the machines they join.
  const factory = new Factory();
  /** How many more items fit in the base's storage pods. */
  const storageRoom = () => storageCapacity(layout) - MATERIALS_LIST.reduce((a, k) => a + save.stored[k], 0);
  const linesView = new LinesView();
  linesView.sync(save, layout);
  const readings = {
    whorls: (id: number) => save.fitted[String(id)] ?? 0,
    feeder: (id: number) => {
      const m = machineData(save, id);
      return { hopper: Math.min(1, m.fibre / HOPPER_CAP), mash: Math.min(1, m.mash / FEEDER_MASH_CAP), run: factory.feederState.get(id) === 'running' };
    },
    press: (id: number) => {
      const m = machineData(save, id);
      return {
        scrap: Math.min(1, (m.scrap ?? 0) / PRESS_SCRAP_CAP),
        copper: Math.min(1, (m.copper ?? 0) / PRESS_COPPER_CAP),
        plates: Math.min(PRESS_PLATE_CAP, m.plate ?? 0),
        progress: m.press,
        since: factory.stroke.get(id) ?? 99,
        run: factory.pressState.get(id) === 'running',
      };
    },
  };
  /** Seconds left on the quick ID (name tags over things already scanned). */
  let idTimer = 0;
  const lampLight: Light = {
    x: 0,
    y: 0,
    radius: 560,
    intensity: 1.5,
    color: [1.0, 0.92, 0.78],
    coneCos: 0.86,
    coneSoft: 0.14,
    haze: 0.32,
  };

  function populate(): void {
    litCam.removeChildren();
    frontCam.removeChildren();
    emissiveCam.removeChildren();
    glowCam.removeChildren();
    litCam.addChild(
      scenery.view,
      baseView.view,
      tankLife.view,
      linesView.view,
      pickups.view,
      wildlife.view,
      ...schools.map((s) => s.view),
      ...fish.map((f) => f.view),
      sub.view,
      subBubbles.view,
      drone.view,
      diver.view,
      bubbles.view,
      baseView.front,
      scenery.over,
    );
    frontCam.addChild(scenery.front);
    emissiveCam.addChild(scenery.emissive, baseView.emissive, tankLife.emissive, pickups.emissive, wildlife.emissive, sub.emissive, drone.emissive, ...fish.map((f) => f.lure), diver.lens, surfaceFx.view);
    glowCam.addChild(scenery.glow, baseView.glow, tankLife.glow, pickups.glow, wildlife.glow, sub.glow, drone.glow, ...fish.map((f) => f.halo), diver.lensGlow);
  }
  populate();

  app.stage.addChild(water.view, backdrop.view, lighting.view, emissiveCam, glowSprite, snow.view, overlayCam);

  const input = new Input(host);
  const hud = new Hud(() => save);

  // Camera state, shared with build mode (which turns screen taps into world positions).
  let camX = 0;
  let camY = 0;
  let viewH = VIEW_H;
  const rates = new RatesPanel(() => ({ save, layout, factory, capacity: storageCapacity(layout) }));
  const build = new BuildMode(host, {
    showRates: () => rates.toggle(),
    save,
    layout,
    toWorld: (sx, sy) => ({ x: camX + sx / zoom, y: camY + sy / zoom }),
    changed: (fresh) => {
      baseView.sync(layout, fresh);
      tankLife.sync(save, layout);
      linesView.sync(save, layout);
      persist();
    },
    toast: (t, k) => hud.toast(t, k),
    refreshInventory: () => hud.refreshInventory(),
    capacity: () => storageCapacity(layout),
    droneReady: () => save.drone === 'active',
    welding: () => drone.welding,
    factory,
    lineAt: (x, y, reach) => linesView.lineAt(x, y, reach),
    lineRoute: (id) => linesView.route(id),
    linesChanged: () => {
      linesView.sync(save, layout);
      persist();
    },
  });

  const care = new CareMode({
    save,
    layout,
    toast: (t, k) => hud.toast(t, k),
    refreshInventory: () => hud.refreshInventory(),
    persist: () => persist(),
    fedFx: (id) => tankLife.feed(id),
    scrubFx: (id) => tankLife.scrub(id),
    changed: () => tankLife.sync(save, layout),
    released: (c) => wildlife.release(c.species, c.stage, save),
    highlight: (id) => (tankLife.highlight = id),
  });
  /** Give materials back: into storage while there is room, the rest carried. */
  function refund(cost: Partial<Record<keyof typeof save.bag, number>>): void {
    for (const k of MATERIALS_LIST) {
      const n = cost[k] ?? 0;
      const into = Math.max(0, Math.min(n, storageRoom()));
      save.stored[k] += into;
      save.bag[k] += n - into;
    }
  }
  const dockUI = new DockMode({
    save,
    layout,
    toast: (t, k) => hud.toast(t, k),
    refreshInventory: () => hud.refreshInventory(),
    persist: () => persist(),
    droneReady: () => save.drone === 'active',
    weldingSub: () => drone.weldingSub,
    subChanged: () => {
      if (save.sub) {
        sub.setModules(save.sub.modules);
        if (save.sub.stage === 'frame') {
          sub.x = save.sub.x;
          sub.y = save.sub.y;
          sub.vx = sub.vy = 0;
        }
      }
    },
    refund,
    subDistance: () => {
      const d = dockUI.dockId !== null ? layout.pieces.find((p) => p.id === dockUI.dockId) : null;
      if (!d) return 0;
      const b = berthOf(d);
      return Math.hypot(sub.x - b.x, sub.y - b.y) / WU_PER_METRE;
    },
  });
  /** A finished Moon pool dock the diver (or the sub) is at. */
  function dockAround(x: number, y: number): Placed | null {
    for (const p of layout.pieces) {
      if (p.kind !== 'dock' || !isDone(p)) continue;
      const r = pieceRect(p);
      if (x > r.x - 50 && x < r.x + r.w + 50 && y > r.y - 50 && y < r.y + r.h + 60) return p;
    }
    return null;
  }
  /** Is the diver next to the parked sub (close enough to climb in)? */
  let nearSub = false;
  let wasNearSub = false;
  /** After undocking, the sub must leave the berth before it can dock again. */
  let redockArmed = true;
  let dentToastAt = -99;
  let shake = 0;
  let subAirWarn = 0;
  let unloadClock = 0;
  let subWashClock = 0;
  let grabTipShown = false;

  /** Climb out of the sub. What the diver cannot carry stays in the cargo bay. */
  function leaveSub(quiet: boolean): void {
    const S = save.sub;
    if (!S || !S.aboard) return;
    S.aboard = false;
    const lim = diverLimits();
    let moved = 0;
    for (const k of [...MATERIALS_LIST].sort((a, b) => MATERIALS[b].kg - MATERIALS[a].kg)) {
      while (save.bag[k] > 0 && bagWeight(save.bag) > lim.max + 1e-6) {
        save.bag[k]--;
        S.hold[k] = (S.hold[k] ?? 0) + 1;
        moved++;
      }
    }
    // Out through the hatch: above the hull, or below if rock is in the way.
    const dp = sub.domePoint();
    let x = dp.x;
    let y = sub.y - 92;
    if (isSolid(x, y) || y < 30) {
      y = sub.y + 80;
      if (isSolid(x, y)) {
        x = sub.x - sub.face * 160;
        y = sub.y;
      }
    }
    diver.x = x;
    diver.y = Math.max(30, y);
    diver.vx = sub.vx * 0.5;
    diver.vy = -30;
    diver.surfaced = false;
    camCX = diver.x;
    hud.refreshInventory();
    if (!quiet) hud.toast(`Climbed out of KS-1${moved ? ` · ${moved} item${moved > 1 ? 's' : ''} left in the cargo bay` : ''}`, moved ? 'big' : 'item');
  }

  /** Climb into the sub. The cargo bay's hold joins what the diver carries. */
  function boardSub(quiet: boolean): void {
    const S = save.sub;
    if (!S || S.aboard || S.stage !== 'built') return;
    if (S.hull <= 0) {
      if (!quiet) hud.toast('The hull is breached. Repair it at the Moon pool dock (tap Dock) before taking it out.', 'warn');
      return;
    }
    S.aboard = true;
    for (const k of MATERIALS_LIST) {
      save.bag[k] += S.hold[k] ?? 0;
    }
    S.hold = {};
    diver.vx = diver.vy = 0;
    diver.surfaced = false;
    hud.refreshInventory();
    if (quiet) return;
    if (!save.tips.includes('sub')) {
      save.tips.push('sub');
      hud.toast(
        input.state.lastDevice === 'touch'
          ? 'Aboard KS-1: steer with the stick, Boost fires the thrusters, Lamp switches the lights. You breathe the sub\'s air. Exit climbs out. Mind the rock: hard knocks dent the hull.'
          : 'Aboard KS-1: WASD steers, Shift fires the thrusters, L switches the lights, V climbs out. You breathe the sub\'s air. Mind the rock: hard knocks dent the hull.',
        'big',
      );
    } else hud.toast(`Aboard KS-1 · hull ${Math.round(S.hull * 100)}% · air ${airClock(S.air)}`);
    persist();
  }

  /** The hull gave out: bail out here, and the crew winches the sub home to its dock. */
  function breach(): void {
    const S = save.sub;
    if (!S) return;
    leaveSub(true);
    S.hull = 0;
    const home = subDock(save, layout) ?? docks(layout)[0] ?? null;
    if (home) {
      const b = berthOf(home);
      sub.x = b.x;
      sub.y = b.y;
      sub.vx = sub.vy = 0;
      S.docked = true;
      S.dock = home.id;
      redockArmed = false;
    }
    hud.toast(
      home
        ? `Hull breached! You bail out, and the crew winches KS-1 home to ${pieceCode(layout, home)}. Repair it there with hull plating.`
        : 'Hull breached! You bail out. KS-1 sits where it is until a Moon pool dock can repair it.',
      'warn',
    );
    persist();
  }

  /** Where the sub is held still: its dock's berth while a frame or berthed. */
  function subHold(): { x: number; y: number } | null {
    const S = save.sub;
    if (!S || !(S.stage === 'frame' || S.docked)) return null;
    const d = layout.pieces.find((p) => p.id === S.dock && p.kind === 'dock');
    if (d) return berthOf(d);
    S.docked = false;
    return null;
  }

  /** The finished creature tank the diver is next to, if any. */
  function tankAround(x: number, y: number): Placed | null {
    for (const p of layout.pieces) {
      if (p.kind !== 'tank' || !isDone(p)) continue;
      const r = pieceRect(p);
      if (x > r.x - 50 && x < r.x + r.w + 50 && y > r.y - 60 && y < r.y + r.h + 40) return p;
    }
    return null;
  }
  let nearTank: number | null = null;
  let lastViewW = 1000;
  /** Text for the jar chip. */
  function jarText(): string | null {
    const j = save.jar;
    if (!j) return null;
    const sp = SPECIES[j.species];
    return j.stage === 'egg' ? `Jar: ${sp.eggName}` : j.stage === 'young' ? `Jar: ${sp.youngName}` : `Jar: ${sp.name.toLowerCase()}`;
  }

  /** Can the drone repair be paid for (carried first, then stored)? Lists what is missing. */
  function repairMissing(): string[] {
    return MATERIALS_LIST.filter((k) => save.bag[k] + save.stored[k] < (DRONE_REPAIR_COST[k] ?? 0)).map((k) => {
      const n = (DRONE_REPAIR_COST[k] ?? 0) - save.bag[k] - save.stored[k];
      return `${n} ${(n === 1 ? MATERIALS[k].name : MATERIALS[k].plural).toLowerCase()}`;
    });
  }
  /** 0 light, 1 heavy (past the rated load), 2 full. For the one-off messages. */
  let loadState = 0;
  let fullWarnAt = -99;

  /** A powered dome habitat the diver is inside, or the first unpowered one. */
  function domeAround(x: number, y: number): Placed | null {
    for (const p of layout.pieces) {
      if (p.kind !== 'dome') continue;
      const r = pieceRect(p);
      const cx = r.x + r.w / 2;
      const drumTop = r.y + r.h - 100;
      const inDrum = y >= drumTop && y < r.y + r.h - 14 && x > r.x + 12 && x < r.x + r.w - 12;
      const inGlass = y < drumTop && ((x - cx) / 96) ** 2 + ((y - drumTop) / 112) ** 2 < 1;
      if (inDrum || inGlass) return p;
    }
    return null;
  }
  /**
   * Where to wake up after a blackout: inside a powered dome, or aboard the
   * sub if it has air and a sound hull (milestone 6: a mobile safe point),
   * whichever is nearer; else at the buoy.
   */
  function respawnPoint(fromX: number, fromY: number): { x: number; y: number; dome: boolean; sub: boolean } {
    let best: { x: number; y: number; dome: boolean; sub: boolean; d: number } | null = null;
    const domes = layout.pieces.filter((p) => p.kind === 'dome' && layout.powered.has(p.id));
    if (domes.length) {
      const r = pieceRect(domes[0]);
      const x = r.x + r.w / 2;
      const y = r.y + r.h - 150;
      best = { x, y, dome: true, sub: false, d: Math.hypot(x - fromX, y - fromY) };
    }
    const S = save.sub;
    if (S && S.stage === 'built' && S.hull > 0 && S.air > 20) {
      const d = Math.hypot(sub.x - fromX, sub.y - fromY);
      if (!best || d < best.d) best = { x: sub.x, y: sub.y - 10, dome: false, sub: true, d };
    }
    return best ?? { ...SPAWN, dome: false, sub: false };
  }
  let insideDome: number | null = null;
  let nearStorage = false;
  const watch = new DiveWatch(document.getElementById('watch') as HTMLCanvasElement);
  const hintEl = document.getElementById('hint')!;
  let hintTimer = 0;

  // ---- Saving ----
  let saveTimer = 0;
  function persist(): void {
    if (blackout > 0) return; // save once the diver is back at the buoy
    save.x = diver.x;
    save.y = diver.y;
    save.lampOn = diver.lampOn;
    if (save.sub) {
      save.sub.x = sub.x;
      save.sub.y = sub.y;
      save.sub.face = sub.face;
    }
    writeSave(save);
    saveTimer = 0;
  }

  // ---- Oxygen and blacking out ----
  let diveTime = 0;
  let lowWarned = false;
  /** 0 = normal play. Counts up while blacking out, through the respawn and the fade back in. */
  let blackout = 0;
  let respawned = false;
  let blackoutMsg = '';
  const BLACK_IN = 1.4;
  const BLACK_HOLD = 2.6;
  const BLACK_OUT = 1.2;

  // One-time test gift for Colin (after milestone 6): 30 scrap for the base,
  // while scrap has no creature source yet. It goes into storage as room allows.
  if (loaded.loaded && !save.tips.includes('gift-scrap-30')) {
    save.tips.push('gift-scrap-30');
    save.gift = (save.gift ?? 0) + 30;
  }
  let giftClock = 1;
  let giftAnnounced = false;
  function deliverGift(dt: number): void {
    if (!save.gift) return;
    giftClock -= dt;
    if (giftClock > 0) return;
    giftClock = 1;
    const n = Math.min(save.gift, Math.max(0, storageRoom()));
    if (n > 0) {
      save.gift -= n;
      save.stored.scrap += n;
      hud.refreshInventory();
      hud.toast(
        `Supply drop: ${n} scrap metal into base storage${save.gift ? ` (${save.gift} more as storage frees up)` : ''}`,
        giftAnnounced ? 'item' : 'big',
      );
      giftAnnounced = true;
      persist();
    } else if (!giftAnnounced && layout.countDone('storage')) {
      giftAnnounced = true;
      hud.toast(`Supply drop of ${save.gift} scrap is waiting: it moves into storage as soon as there is room`, 'big');
    }
  }

  if (!loaded.loaded) {
    setTimeout(() => hud.toast('Explore the shallows: scan new things and gather materials for the base', 'big'), 1500);
  } else if (save.oxygen <= 0) {
    save.oxygen = maxOxygen(save);
  }

  let cssW = window.innerWidth;
  let cssH = window.innerHeight;
  let zoom = 1;
  let builtDetail = preset.detail;

  function rebuild(): void {
    cssW = window.innerWidth;
    cssH = window.innerHeight;
    const res = pixelRatioFor(preset, cssW, cssH);
    renderer.resize(cssW, cssH, res);
    app.ticker.maxFPS = preset.maxFps;
    zoom = cssH / VIEW_H;
    litRT.resize(cssW, cssH, res);
    glowRT.resize(cssW, cssH, res * preset.glowResolution);
    blur.quality = preset.glowQuality;
    blur.resolution = res * preset.glowResolution;
    blur.strength = 9 * zoom;
    backdrop.build(preset.parallaxLayers);
    snow.build(renderer, preset.particleDensity, cssW, cssH);
    if (builtDetail !== preset.detail) {
      scenery.view.destroy({ children: true });
      scenery = new Scenery(renderer, preset.detail);
      builtDetail = preset.detail;
      populate();
    }
    ui.refresh();
  }

  const ui = initSettingsUI({
    getChoice: () => choice,
    getPreset: () => preset,
    getPixelSize: () => [app.canvas.width, app.canvas.height],
    getRendererName: () => (renderer.type === 1 ? 'WebGL' : 'WebGPU'),
    getSavedAt: () => save.savedAt,
    resetProgress: () => {
      clearSave();
      resetting = true;
      location.reload();
    },
    buildId: __BUILD_ID__,
    setChoice: (c) => {
      choice = c;
      saveChoice(c);
      preset = resolveChoice(c);
      rebuild();
    },
  });

  let resetting = false;
  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(rebuild, 120);
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  rebuild();

  // Camera: follows the diver smoothly, looking a little ahead of where they swim.
  let camCX = diver.x + 120;
  let camCY = diver.y + 40;
  let time = 0;

  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS / 1000, 0.05);
    time += dt;

    // Build mode: only at the Kestrel site, and not while blacking out.
    const atSite = diver.x > GRID_X0 - 260 && diver.x < GRID_X1 + 260 && diver.y < GRID_BASE + 120;
    build.setAvailable(atSite && blackout === 0 && !care.active && !dockUI.active);
    const aboardNow = !!save.sub?.aboard;
    build.pollPad(dt);
    if (!build.active && rates.open) rates.close();
    rates.update(dt);
    const tankHere = blackout === 0 && !build.active && !dockUI.active && !diver.surfaced && !aboardNow ? tankAround(diver.x, diver.y) : null;
    care.setAvailable(tankHere?.id ?? (care.active ? care.tankId : null));
    care.update(dt);
    // Milestone 6: the Dock button at a finished Moon pool dock (or berthed in one).
    const dockHere =
      blackout === 0 && !build.active && !care.active
        ? aboardNow && save.sub?.docked
          ? (layout.pieces.find((p) => p.id === save.sub!.dock && isDone(p)) ?? null)
          : dockAround(diver.x, diver.y)
        : null;
    dockUI.setAvailable(dockHere?.id ?? (dockUI.active ? dockUI.dockId : null));
    dockUI.update(dt);
    if (dockHere && !save.tips.includes('dock') && blackout === 0) {
      save.tips.push('dock');
      hud.toast(
        `Moon pool dock: tap Dock${input.state.lastDevice === 'touch' ? '' : ' (G)'} to build the submersible here, and later to repair and refit it`,
        'big',
      );
    }
    input.suspended = build.active || care.active || dockUI.active;
    if (atSite && !save.tips.includes('build') && blackout === 0) {
      save.tips.push('build');
      hud.toast(
        input.state.lastDevice === 'touch'
          ? 'Kestrel site: tap Build (top right) to lay out the base'
          : 'Kestrel site: press B (or Build, top right) to lay out the base',
        'big',
      );
    }

    input.update();
    const s = input.state;
    const inControl = blackout === 0 && !build.active && !care.active && !dockUI.active;

    // ---- The submersible (milestone 6) ----
    const S = save.sub;
    if (S && inControl && s.board) {
      if (S.aboard) leaveSub(false);
      else if (nearSub) boardSub(false);
    }
    const aboard = !!S && S.aboard;
    // Undock: push the stick while berthed, and the clamps let go.
    if (S && aboard && S.docked && inControl && Math.hypot(s.moveX, s.moveY) > 0.5 && S.hull > 0) {
      S.docked = false;
      redockArmed = false;
      sub.vy = 120;
      hud.toast('Clamps released');
    }
    let impact = 0;
    if (S) {
      const piloted = aboard && inControl;
      impact = sub.update(dt, {
        moveX: piloted ? s.moveX : 0,
        moveY: piloted ? s.moveY : 0,
        boost: piloted && s.boost,
        piloted,
        hold: subHold(),
      });
      if (aboard) {
        if (piloted && s.lamp) S.lights = !S.lights;
        // The cave in the east cliff is too dark, and too tight for the sub.
        if (sub.face > 0 && sub.bowX() > CAVE_GATE_X - 40 && sub.y > caveTop(CAVE_GATE_X) - 80) {
          sub.x -= sub.bowX() - (CAVE_GATE_X - 40);
          sub.vx = Math.min(0, sub.vx);
        }
        diver.x = sub.x;
        diver.y = sub.y - 10;
        diver.vx = sub.vx;
        diver.vy = sub.vy;
        diver.surfaced = false;
        diver.splash = 0;
        diver.exhale = false;
      }
      // Docking: come slowly into a powered or unpowered dock's berth and the clamps take it.
      if (aboard && !S.docked && S.stage === 'built') {
        let near = Infinity;
        for (const d of docks(layout)) {
          const b = berthOf(d);
          const dist = Math.hypot(sub.x - b.x, sub.y - b.y);
          near = Math.min(near, dist);
          if (redockArmed && dist < 95 && Math.hypot(sub.vx, sub.vy) < 240) {
            S.docked = true;
            S.dock = d.id;
            unloadClock = 0.3;
            const on = layout.powered.has(d.id);
            hud.toast(
              on ? `Docked in ${pieceCode(layout, d)}: air refilling, cargo going to storage. Tap Dock to repair or refit.` : `Docked in ${pieceCode(layout, d)}, but the dock has no power: no air or unloading.`,
              on ? 'big' : 'warn',
            );
            persist();
          }
        }
        if (near > 190) redockArmed = true;
      }
      // Dents: hard knocks against rock.
      if (aboard && S.stage === 'built' && !S.docked && impact > DENT_SPEED) {
        const dmg = (impact - DENT_SPEED) * DENT_PER_SPEED;
        S.hull = Math.max(0, S.hull - dmg);
        shake = Math.min(1, shake + 0.2 + dmg * 4);
        const hx = sub.x + Math.sign(sub.vx || sub.face) * 90;
        subBubbles.puff(hx, sub.y + 10, 0, -40, 6 + Math.round(dmg * 30));
        if (S.hull <= 0) breach();
        else if (time - dentToastAt > 1.4) {
          dentToastAt = time;
          hud.toast(`Hull dented: ${Math.round(S.hull * 100)}%${S.hull < 0.35 ? '. Get it to the Moon pool dock for repairs!' : ''}`, 'warn');
        }
      }
      // Air: refills berthed in a powered dock or at the surface; used while aboard underwater.
      if (S.stage === 'built') {
        const dockOn = S.docked && layout.powered.has(S.dock);
        if (dockOn) S.air = Math.min(SUB_AIR, S.air + (SUB_AIR / 20) * dt);
        else if (sub.surfaced) S.air = Math.min(SUB_AIR, S.air + (SUB_AIR / 30) * dt);
        else if (S.aboard && inControl && blackout === 0) S.air = Math.max(0, S.air - dt * (sub.thrust > 0 ? 1.3 : 1));
        if (S.air > 120) subAirWarn = 0;
        if (S.aboard && S.air < 60 && subAirWarn === 0) {
          subAirWarn = 1;
          hud.toast("KS-1 air low: about a minute left. Surface, dock, or head for the dome.", 'warn');
        }
        if (S.aboard && S.air <= 0 && subAirWarn === 1) {
          subAirWarn = 2;
          hud.toast("KS-1's air reserve is empty: you are breathing from your own tank now.", 'warn');
        }
      }
      // Berthed in a powered dock: everything aboard goes into storage.
      unloadClock -= dt;
      if (S.docked && layout.powered.has(S.dock) && unloadClock <= 0 && S.stage === 'built') {
        unloadClock = 0.5;
        let room = Math.max(0, storageRoom());
        let moved = 0;
        for (const k of MATERIALS_LIST) {
          const fromHold = Math.min(room, S.hold[k] ?? 0);
          if (fromHold) {
            S.hold[k] = (S.hold[k] ?? 0) - fromHold;
            if (!S.hold[k]) delete S.hold[k];
            save.stored[k] += fromHold;
            room -= fromHold;
            moved += fromHold;
          }
          if (S.aboard) {
            const n = Math.min(room, save.bag[k]);
            save.bag[k] -= n;
            save.stored[k] += n;
            room -= n;
            moved += n;
          }
        }
        if (moved) {
          hud.toast(`KS-1 unloaded ${moved} item${moved > 1 ? 's' : ''} into storage`, 'big');
          hud.refreshInventory();
          persist();
        }
      }
      // Propeller wash.
      subWashClock -= dt;
      const sp = Math.hypot(sub.vx, sub.vy);
      if (S.stage === 'built' && sp > 40 && subWashClock <= 0 && sub.y > 70) {
        subWashClock = sub.thrust > 0 ? 0.05 : 0.14;
        const w = sub.washPoint();
        subBubbles.puff(w.x, w.y, -sub.face * 60, 0, sub.thrust > 0 ? 2 : 1);
      }
    }
    subBubbles.update(dt, sub.x, 0, 0, 0, false);
    nearSub = !!S && S.stage === 'built' && !S.aboard && blackout === 0 && Math.hypot(diver.x - sub.x, diver.y - (sub.y - 10)) < 170;
    hud.setBoard(inControl ? (aboard ? 'Exit' : nearSub ? (S!.hull > 0 ? 'Board' : 'Breached') : null) : null);
    if (nearSub && !wasNearSub && input.state.lastDevice !== 'touch' && !save.tips.includes('subkey')) {
      save.tips.push('subkey');
      hud.toast('KS-1: press V to climb in (RB on a gamepad)', 'big');
    }
    wasNearSub = nearSub;
    diver.view.visible = !aboard;
    diver.lens.visible = diver.lensGlow.visible = !aboard;

    // The dive bag's weight slows the diver (no sinking through a dome's floor).
    diver.load = bagLoad(save);
    diver.noSink = insideDome !== null;
    if (!aboard) diver.update(dt, inControl ? s.moveX : 0, inControl ? s.moveY : 0, inControl && s.boost, inControl && s.lamp);

    // Breaking the surface: a splash, then breath vapour with each breath out.
    const [hx, hy] = diver.helmetPoint();
    if (diver.splash > 0) surfaceFx.splash(hx, diver.splash, time);
    if (diver.exhale && hy < 0) surfaceFx.breath(hx + (hx > diver.x ? 10 : -10), hy - 4, hx > diver.x ? 1 : -1);

    // The cave in the east cliff is too dark to go further in.
    if (diver.x > CAVE_GATE_X && diver.y > caveTop(CAVE_GATE_X) - 30) {
      diver.x = CAVE_GATE_X;
      if (diver.vx > 0) diver.vx = 0;
    }
    const inCave = inCaveTunnel(diver.x, diver.y) && diver.x > CAVE.x0 + 120;
    const domeHere = blackout === 0 && !build.active && !aboard ? domeAround(diver.x, diver.y) : null;
    hud.setBanner(
      inCave
        ? 'Pitch black ahead. The shoulder lamp barely dents this darkness. A proper dive light would open the way (built later in the Workshop).'
        : domeHere && !isDone(domeHere)
          ? 'This habitat is still a frame. The build drone has to finish welding it before there is air inside.'
          : domeHere && !layout.powered.has(domeHere.id)
            ? 'This habitat has no power. Join it to a current turbine (directly or through corridors) to get air here.'
            : '',
    );

    // ---- Oxygen ----
    const atSurface = aboard ? sub.surfaced : diver.surfaced;
    // Aboard the sub with air in its reserve: the diver breathes the sub's air.
    const subAir = aboard && !!S && S.air > 0;
    const maxO2 = maxOxygen(save);
    save.playSeconds += dt;
    // Inside a dome habitat with power: station air, like breathing at the surface.
    const dome = blackout === 0 && !aboard ? domeAround(diver.x, diver.y) : null;
    const domeAir = !!dome && layout.powered.has(dome.id);
    if ((dome?.id ?? null) !== insideDome) {
      insideDome = dome?.id ?? null;
      if (dome && domeAir) {
        hud.toast('Dome habitat: breathing station air · progress saved', 'big');
        persist();
      }
    }
    if ((build.active || care.active || dockUI.active) && blackout === 0) {
      // Planning the base, or tending a tank, pauses the air clock.
    } else if (blackout === 0) {
      if (atSurface || domeAir || subAir) {
        // Air comes in from the first breath after breaking the surface.
        if (domeAir || subAir || aboard || diver.surfaceTime > 0.4) save.oxygen = Math.min(maxO2, save.oxygen + (maxO2 / 3) * dt);
        diveTime = 0;
        lowWarned = false;
      } else {
        // Hard work uses air faster: boosting, and prying materials loose.
        // A heavy dive bag makes the diver breathe harder too.
        const work = diver.boosting ? 1.8 : pickups.working || drone.repairProgress > 0 ? 1.3 : 1;
        save.oxygen = Math.max(0, save.oxygen - dt * work * (1 + 0.2 * Math.min(1.6, diver.load)));
        diveTime += dt;
      }
      const frac = save.oxygen / maxO2;
      if (frac < 0.25 && !lowWarned && !atSurface && !domeAir && !subAir) {
        lowWarned = true;
        const sAir = save.sub && save.sub.stage === 'built' && save.sub.air > 20 && save.sub.hull > 0 && !aboard;
        hud.toast(
          layout.powered.size && layout.count('dome')
            ? `Oxygen low: head for the surface${sAir ? ', the sub' : ''} or the dome`
            : `Oxygen low: head for the surface${sAir ? ' or the sub' : ''}`,
          'warn',
        );
      }
      hud.setLowOxygen(atSurface || domeAir || subAir ? 0 : Math.max(0, (0.25 - frac) / 0.25) * (0.75 + 0.25 * Math.sin(time * 5)));
      if (save.oxygen <= 0) {
        // Blacking out aboard: the crew pull the diver out of the sub first.
        if (aboard) leaveSub(true);
        blackout = 0.0001;
        respawned = false;
      }
    }
    if (blackout > 0) {
      blackout += dt;
      let dark = 0;
      if (blackout < BLACK_IN) dark = blackout / BLACK_IN;
      else if (blackout < BLACK_IN + BLACK_HOLD) dark = 1;
      else dark = Math.max(0, 1 - (blackout - BLACK_IN - BLACK_HOLD) / BLACK_OUT);
      if (blackout >= BLACK_IN && !respawned) {
        // Drop everything carried in a bag on the seabed, and wake up at the Kestrel buoy.
        respawned = true;
        const carried = Object.values(save.bag).reduce((a, b) => a + b, 0);
        if (carried > 0) {
          const place = bagRestingPlace(diver.x, diver.y);
          const items: Partial<Record<keyof typeof save.bag, number>> = { ...(save.dropped?.items ?? {}) };
          for (const [k, v] of Object.entries(save.bag) as [keyof typeof save.bag, number][]) {
            if (v > 0) items[k] = (items[k] ?? 0) + v;
            save.bag[k] = 0;
          }
          save.dropped = { x: place.x, y: place.y, items };
          hud.refreshInventory();
        }
        // The specimen jar: a creature taken from a tank goes back to it; a wild one swims home.
        let jarMsg = '';
        if (save.jar) {
          const j = save.jar;
          if (j.keep && layout.pieces.some((p) => p.id === j.keep!.tank)) {
            save.creatures.push(j.keep);
            jarMsg = ` The crew put the ${SPECIES[j.species].name.toLowerCase()} from your jar back in its tank.`;
          } else {
            wildlife.release(j.species, j.stage, save);
            jarMsg = ` The specimen jar came open; the ${SPECIES[j.species].name.toLowerCase()} swam home.`;
          }
          save.jar = null;
          tankLife.sync(save, layout);
        }
        const home = respawnPoint(diver.x, diver.y);
        diver.x = home.x;
        diver.y = home.y;
        if (home.sub) boardSub(true);
        drone.teleport(home.x, home.y, layout);
        diver.vx = diver.vy = 0;
        diver.surfaced = false;
        camCX = diver.x;
        camCY = diver.y;
        save.oxygen = maxO2;
        diveTime = 0;
        lowWarned = false;
        hud.setLowOxygen(0);
        const where = home.sub ? 'the sub, KS-1' : home.dome ? 'the dome habitat' : 'the Kestrel buoy';
        blackoutMsg = save.dropped
          ? `You blacked out. The crew pulled you back to ${where}. Your sample bag is on the seabed where you fell; its amber light is blinking.${jarMsg}`
          : `You blacked out. The crew pulled you back to ${where}.${jarMsg}`;
        blackout = BLACK_IN + 0.0001;
        writeSave(Object.assign(save, { x: diver.x, y: diver.y }));
      }
      hud.setBlackout(dark, respawned ? blackoutMsg : '');
      if (blackout >= BLACK_IN + BLACK_HOLD + BLACK_OUT) {
        blackout = 0;
        hud.setBlackout(0, '');
      }
    }

    // ---- Pickups ----
    const speed = Math.hypot(diver.vx, diver.vy);
    // Aboard the sub, the grabber arm collects (if fitted) at its claw.
    const grab = aboard && !!S && S.modules.includes('grabber');
    const reachPt = aboard ? (grab ? sub.clawPoint() : { x: sub.x, y: sub.y }) : { x: diver.x, y: diver.y };
    const collectHeld = inControl && s.collect && !diver.surfaced && (!aboard || grab);
    // The stranded drone takes the Collect button when the diver is next to it.
    const atDrone = drone.inReach && !diver.surfaced && blackout === 0 && !aboard;
    // Wild creatures: the specimen jar takes the Collect button when one is in reach.
    const wt = wildlife.target;
    const wtKnown = !!wt && save.scans.includes(SPECIES[wt.species].scan);
    const wildOk = !!wt && wtKnown && !save.jar && !diver.surfaced && !atDrone;
    for (const ev of wildlife.update(dt, time, reachPt.x, reachPt.y, Math.hypot(diver.vx, diver.vy), aboard ? sub.thrust > 0 : diver.boosting, save, collectHeld && wildOk, camX - 200, camX + lastViewW + 200)) {
      save.jar = { species: ev.species, stage: ev.stage };
      drone.cheer();
      const sp = SPECIES[ev.species];
      const name = ev.stage === 'egg' ? sp.eggName : sp.youngName;
      const hasTank = layout.pieces.some((p) => p.kind === 'tank');
      hud.toast(
        `${name.replace(/^./, (m) => m.toUpperCase())} in the specimen jar! ${
          hasTank ? 'Swim to a creature tank at the base to put it in.' : 'Build a creature tank at the Kestrel site to keep it.'
        }`,
        'big',
      );
      persist();
    }
    const wildTarget = wildlife.target && !atDrone && !diver.surfaced ? wildlife.target : null;
    if (wildTarget && collectHeld && !wildOk && time - fullWarnAt > 4) {
      fullWarnAt = time;
      hud.toast(
        !save.scans.includes(SPECIES[wildTarget.species].scan)
          ? `Scan the ${SPECIES[wildTarget.species].name.toLowerCase()} first, to learn how to keep it`
          : 'The specimen jar is full. Put its creature in a tank first.',
        'warn',
      );
    }
    const prevT = pickups.target;
    const bagFull = !!prevT && !bagHasRoom(save, prevT.kind);
    if (bagFull && collectHeld && !atDrone && time - fullWarnAt > 4) {
      fullWarnAt = time;
      hud.toast(`Dive bag full (${bagLimits(save).max} kg). Unload at a storage pod to carry more.`, 'warn');
    }
    for (const ev of pickups.update(dt, time, reachPt.x, reachPt.y, save, collectHeld && !atDrone && !bagFull && !wildTarget, speed)) {
      if (ev.type === 'material') {
        save.bag[ev.kind]++;
        drone.cheer();
        hud.refreshInventory(ev.kind);
        hud.toast(`+1 ${MATERIALS[ev.kind].name}`);
      } else if (ev.type === 'tank') {
        save.oxygen = maxOxygen(save);
        hud.toast(`Air tank upgrade! Dive time +${TANK_BONUS} s`, 'big');
        drone.cheer();
      } else if (ev.type === 'whorl') {
        drone.cheer();
        hud.toast(
          `Echo whorl found (${save.whorls.length})! In build mode, select a creature tank or an auto feeder and fit it: ×2 output with one, ×3 with two, but it uses its inputs that much faster too.`,
          'big',
        );
        if (!save.scans.includes('whorl')) {
          save.scans.push('whorl');
          hud.scanAnnounce('whorl');
        }
      } else {
        let n = 0;
        for (const [k, v] of Object.entries(ev.items) as [keyof typeof save.bag, number][]) {
          save.bag[k] += v;
          n += v;
        }
        hud.refreshInventory();
        hud.toast(`Sample bag recovered (${n} item${n === 1 ? '' : 's'})`, 'big');
      }
      persist();
    }
    const pt = pickups.target;
    const missing = atDrone ? repairMissing() : [];
    const repairing = atDrone && collectHeld && !missing.length && speed < 70;
    const workAt =
      wildlife.working && wildTarget ? { x: wildTarget.x, y: wildTarget.y } : pickups.working && pt ? { x: pt.x, y: pt.y } : repairing ? drone.scanPoint() : null;
    diver.working = aboard ? null : workAt;
    const subReach = aboard ? workAt : null;
    if (aboard && !grab && (pt || wildTarget) && !grabTipShown && blackout === 0) {
      grabTipShown = true;
      hud.toast('To collect from the sub, fit a grabber arm at the Moon pool dock. Or climb out (Exit) and swim.', 'big');
    }
    if (aboard && !grab) hud.setCollect(null, 0);
    else if (atDrone) {
      hud.setCollect(missing.length ? `Repair drone: need ${missing.join(', ')}` : 'Repair build drone', drone.repairProgress);
      if (collectHeld && missing.length && time - fullWarnAt > 4) {
        fullWarnAt = time;
        hud.toast(`To repair the drone you need ${missing.join(' and ')} more`, 'warn');
      }
    } else if (wildTarget) {
      const sp = SPECIES[wildTarget.species];
      hud.setCollect(
        !save.scans.includes(sp.scan)
          ? `Unknown creature: scan it first`
          : save.jar
            ? 'Specimen jar full'
            : wildTarget.stage === 'egg'
              ? `Ease ${sp.eggName} into jar`
              : `Coax ${sp.youngName} into jar`,
        wildlife.progress,
      );
    } else if (pt && !diver.surfaced) {
      const fits = bagHasRoom(save, pt.kind);
      hud.setCollect(fits ? Pickups.actionLabel(pt.kind) : 'Dive bag full: unload at a storage pod', pickups.progress);
    } else hud.setCollect(null, 0);

    // ---- Dive bag weight messages ----
    const lim = bagLimits(save);
    const kg = bagWeight(save.bag);
    const ls = kg >= lim.max - 0.01 ? 2 : kg > lim.rated + 0.01 ? 1 : 0;
    if (ls > loadState && blackout === 0) {
      if (ls === 1) {
        if (!save.tips.includes('heavy')) {
          save.tips.push('heavy');
          hud.toast(`Dive bag heavy (over ${lim.rated} kg): you swim slower, sink when still and use more air. The watch shows the weight.`, 'big');
        } else hud.toast('Dive bag heavy', 'warn');
      } else hud.toast(`Dive bag full (${lim.max} kg)`, 'warn');
    }
    loadState = ls;

    // ---- The build drone ----
    const subFrame = save.sub && save.sub.stage === 'frame' ? save.sub : null;
    const subJob = subFrame
      ? {
          rect: { x: sub.x - 130, y: sub.y - 80, w: 260, h: 130 },
          get progress() {
            return subFrame.progress ?? 0;
          },
          set progress(v: number) {
            subFrame.progress = v;
          },
          buildTime: SUB_BUILD_TIME,
        }
      : null;
    for (const ev of drone.update(dt, time, {
      diverX: diver.x,
      diverY: diver.y,
      diverFace: aboard ? sub.face : diver.facing,
      diverSpeed: speed,
      repairing,
      layout,
      rate: droneWeldRate(save),
      extra: subJob,
      gap: aboard ? { x: 165, y: 86 } : undefined,
    })) {
      if (ev.type === 'subDone' && save.sub) {
        save.sub.stage = 'built';
        delete save.sub.progress;
        save.sub.docked = true;
        drone.cheer();
        hud.toast(
          `Submersible KS-1 is finished! Swim up to it and tap Board${input.state.lastDevice === 'touch' ? '' : ' (V)'}. Fit modules from the Dock panel.`,
          'big',
        );
        persist();
        continue;
      }
      if (ev.type === 'repaired') {
        for (const k of MATERIALS_LIST) {
          let need = DRONE_REPAIR_COST[k] ?? 0;
          const fromBag = Math.min(need, save.bag[k]);
          save.bag[k] -= fromBag;
          need -= fromBag;
          save.stored[k] -= need;
        }
        save.drone = 'active';
        hud.refreshInventory();
        hud.toast('Build drone KD-1 repaired! It follows you now, and welds whatever you build at the Kestrel site.', 'big');
        persist();
      } else if (ev.type === 'finished') {
        layout.set(layout.pieces);
        baseView.sync(layout);
        const p = ev.piece;
        const powered = layout.powered.has(p.id);
        hud.toast(
          `Finished: ${PIECES[p.kind].name}${p.kind !== 'turbine' && !powered ? ' (no power yet: join it to a current turbine)' : ''}`,
          'big',
        );
        if (build.active) build.refresh();
        persist();
      }
    }
    if (build.active && (drone.welding || build.selected || build.selectedLine !== null) && Math.floor(time * 2) !== Math.floor((time - dt) * 2)) build.refresh();

    // ---- Creature tanks: swim up with a creature in the jar to put it in ----
    const tankNow = tankHere?.id ?? null;
    if (tankNow !== null && tankNow !== nearTank && save.jar && !aboard) {
      const n = creaturesIn(save, tankNow).length;
      if (n >= TANK_CAPACITY) hud.toast(`Tank ${tankNumber(layout, tankNow)} is full (${TANK_CAPACITY} creatures). Build another creature tank.`, 'warn');
      else {
        const j = save.jar;
        if (j.keep) {
          j.keep.tank = tankNow;
          save.creatures.push(j.keep);
        } else newCreature(save, j.species, j.stage === 'egg' ? 'egg' : 'young', tankNow);
        save.jar = null;
        tankLife.sync(save, layout);
        drone.cheer();
        const sp = SPECIES[j.species];
        hud.toast(
          `${j.stage === 'egg' ? `The ${sp.eggName} is` : `The ${sp.name.toLowerCase()} is`} in tank ${tankNumber(layout, tankNow)}. Tap Tend to look after it.`,
          'big',
        );
        if (!save.tips.includes('care')) {
          save.tips.push('care');
          setTimeout(
            () => hud.toast('Creatures need food (kelp flakes), comfort (the right plant and company) and clean water (a filter pump). Happy ones grow and make materials.', 'big'),
            2500,
          );
        }
        persist();
      }
    }
    // Milestone 5 part 2: take what is waiting in the tank's output tray.
    if (tankNow !== null && tankNow !== nearTank && !build.active && blackout === 0) {
      const td = save.tankData[String(tankNow)];
      if (td?.out) {
        let took = 0;
        const what: string[] = [];
        for (const k of MATERIALS_LIST) {
          let n = 0;
          while ((td.out[k] ?? 0) > 0 && bagHasRoom(save, k)) {
            td.out[k]!--;
            save.bag[k]++;
            n++;
          }
          if (!td.out[k]) delete td.out[k];
          if (n) what.push(`${n} ${MATERIALS[k].name.toLowerCase()}`);
          took += n;
        }
        if (took) {
          hud.toast(`Took ${what.join(' and ')} from tank ${tankNumber(layout, tankNow)}'s output tray`, 'item');
          hud.refreshInventory();
          persist();
        } else if (MATERIALS_LIST.some((k) => td.out![k])) hud.toast('Dive bag full: the output tray stays where it is', 'warn');
      }
    }
    nearTank = tankNow;
    hud.setJar(jarText());

    deliverGift(dt);

    // ---- Factory (milestone 5): conveyors, the auto feeder and feed pipes ----
    factory.tick(save, layout, dt, storageRoom);

    // ---- Creature care: needs run on play time ----
    for (const ev of tickCare(save, layout, dt)) {
      const name = SPECIES[ev.c.species].name;
      const where = `tank ${tankNumber(layout, ev.c.tank)}`;
      if (ev.type === 'hatched') hud.toast(`The ${name.toLowerCase()} eggs hatched in ${where}! The fry need feeding.`, 'big');
      else if (ev.type === 'grown') hud.toast(`The ${name.toLowerCase()} in ${where} is fully grown, and glows brighter`, 'big');
      else if (ev.type === 'sick') hud.toast(`The ${name.toLowerCase()} in ${where} is sick (${ev.why}). Tend it soon.`, 'warn');
      else if (ev.type === 'better') hud.toast(`The ${name.toLowerCase()} in ${where} is feeling better`);
      else if (ev.type === 'dormant')
        hud.toast(`The ${name.toLowerCase()} in ${where} went dormant. Its remains are kept in storage until a Revival pool is found.`, 'warn');
      else if (ev.type === 'made') {
        const belt = save.lines.some((l) => l.kind === 'belt' && l.from === ev.c.tank);
        hud.toast(`+1 ${MATERIALS[ev.kind].name} from the ${name.toLowerCase()} (${belt ? 'on the conveyor' : `in ${where}'s output tray`})`);
        if (!belt && !save.tips.includes('tray')) {
          save.tips.push('tray');
          setTimeout(
            () =>
              hud.toast(
                "What creatures make now waits in their tank's output tray (4 items). Swim up to the tank to take it, or run a conveyor from the tank to a storage pod or a machine.",
                'big',
              ),
            2400,
          );
        }
      }
      if (ev.type !== 'made' && ev.type !== 'better') tankLife.sync(save, layout);
      persist();
    }

    // ---- Storage: swim up to a powered pod to unload everything carried ----
    let byPod = false;
    let podPowered = false;
    let podFrame = false;
    for (const p of layout.pieces) {
      if (p.kind !== 'storage') continue;
      const r = pieceRect(p);
      if (diver.x > r.x - 30 && diver.x < r.x + r.w + 30 && diver.y > r.y - 30 && diver.y < r.y + r.h + 30) {
        byPod = true;
        podPowered ||= layout.powered.has(p.id);
        podFrame ||= !isDone(p);
      }
    }
    if (byPod && !nearStorage && blackout === 0 && !build.active && !dockUI.active) {
      const carried = MATERIALS_LIST.reduce((a, k) => a + save.bag[k], 0);
      if (!podPowered) {
        if (carried)
          hud.toast(podFrame ? 'This storage pod is still a frame: the drone has to finish it first' : 'This storage pod has no power: join it to a current turbine', 'warn');
      } else if (carried) {
        let room = Math.max(0, storageCapacity(layout) - MATERIALS_LIST.reduce((a, k) => a + save.stored[k], 0));
        let moved = 0;
        for (const k of MATERIALS_LIST) {
          const n = Math.min(room, save.bag[k]);
          save.bag[k] -= n;
          save.stored[k] += n;
          room -= n;
          moved += n;
        }
        if (moved) hud.toast(`Stored ${moved} item${moved === 1 ? '' : 's'} in the base${MATERIALS_LIST.some((k) => save.bag[k]) ? ' (storage is full)' : ''}`, 'big');
        else hud.toast('Storage is full: build another storage pod', 'warn');
        hud.refreshInventory();
        persist();
      }
    }
    nearStorage = byPod;

    // ---- Scanner ----
    const done = new Set(save.scans);
    const lpose = aboard ? sub.domePoint() : diver.lampPose();
    const scanned = scanner.update(dt, diver.x, diver.y, inControl && s.scan, done, lpose.x, lpose.y, inControl);
    if (scanned) {
      save.scans.push(scanned);
      drone.cheer();
      hud.scanAnnounce(scanned);
      persist();
    }
    hud.setScanTarget(scanner.target?.id ?? null, scanner.progress);
    // A tap of Scan names everything nearby that is already in the log, for a few seconds.
    if (inControl && s.scanTap && save.scans.length) {
      idTimer = 6;
      scanner.pulseIdentify(diver.x, diver.y);
    }
    idTimer = Math.max(0, idTimer - dt);

    for (const f of fish) f.update(dt, time, diver.x, diver.y);
    const [bx, by] = diver.bubblePoint();
    bubbles.update(dt, bx, aboard ? 0 : by, diver.vx, diver.vy, diver.boosting);

    if (Math.hypot(s.moveX, s.moveY) > 0.2 && hintTimer === 0) hintTimer = 0.001;
    if (hintTimer > 0) {
      hintTimer += dt;
      if (hintTimer > 2.5) hintEl.classList.add('gone');
    }

    // Zoom out while building (the build camera is steered by pan and pinch).
    const wantH = build.active ? build.cam.h : care.active ? VIEW_H_CARE : dockUI.active ? VIEW_H_DOCK : aboard ? VIEW_H_SUB : VIEW_H;
    viewH += (wantH - viewH) * (1 - Math.exp(-(build.active ? 10 : 4) * dt));
    zoom = cssH / viewH;
    const viewW = cssW / zoom;
    lastViewW = viewW;
    let lookX = diver.x + diver.vx * 0.35 + (diver.vx >= 0 ? 60 : -60);
    let lookY = diver.y + diver.vy * 0.25 + 30;
    if (aboard) {
      lookX = sub.x + sub.vx * 0.45 + sub.face * 130;
      lookY = sub.y + sub.vy * 0.25 + 20;
    }
    if (build.active) {
      lookX = build.cam.x;
      lookY = build.cam.y;
    } else if (dockUI.active && dockUI.dockId !== null) {
      const d = layout.pieces.find((p) => p.id === dockUI.dockId);
      if (d) {
        const r = pieceRect(d);
        const panelW = Math.min(380, cssW * 0.46) + 24;
        lookX = r.x + r.w / 2 + panelW / zoom / 2;
        lookY = r.y + r.h / 2 + 10;
      }
    } else if (care.active && care.tankId !== null) {
      // The tank sits in the left part of the screen, beside the care panel.
      const t = layout.pieces.find((p) => p.id === care.tankId);
      if (t) {
        const r = pieceRect(t);
        const panelW = Math.min(360, cssW * 0.44) + 24;
        lookX = r.x + r.w / 2 + panelW / zoom / 2;
        lookY = r.y + r.h / 2 + 10;
      }
    }
    const k = 1 - Math.exp(-(build.active ? 10 : 3.2) * dt);
    const prevX = camCX;
    const prevY = camCY;
    camCX += (lookX - camCX) * k;
    camCY += (lookY - camCY) * k;
    if (!build.active) {
      // Keep the camera inside the world (a little sky is allowed at the top, enough to see a splash).
      camCX = viewW >= WORLD_SPAN ? WORLD_X0 + WORLD_SPAN / 2 : Math.max(WORLD_X0 + viewW / 2, Math.min(WORLD_W - viewW / 2, camCX));
      camCY = Math.max(viewH / 2 - (care.active ? 0 : 110), Math.min(WORLD_H - viewH / 2, camCY));
    }
    // A jolt when the sub hits rock.
    shake = Math.max(0, shake - dt * 2.5);
    const jx = shake > 0 ? Math.sin(time * 61) * shake * 9 : 0;
    const jy = shake > 0 ? Math.cos(time * 53) * shake * 7 : 0;
    camX = camCX - viewW / 2 + jx;
    camY = camCY - viewH / 2 + jy;
    scenery.update(time, diver.x, diver.y, diver.vx, camX, camX + viewW);
    const storedNow = MATERIALS_LIST.reduce((a, k) => a + save.stored[k], 0);
    const cap = storageCapacity(layout);
    baseView.update(dt, time, layout, cap ? storedNow / cap : 0, camX, camX + viewW, drone.welding?.id ?? null, readings);
    linesView.update(dt, factory, camX, camX + viewW);
    buildOverlay.view.visible = build.active;
    if (build.active) {
      const gs = build.ghostState();
      buildOverlay.update(
        time,
        layout,
        build.ghost && gs ? { ...build.ghost, ok: gs.ok } : null,
        build.link ? null : build.selected,
        build.linkPreview(),
        build.selectedLine !== null ? linesView.route(build.selectedLine) : null,
      );
    }
    for (const sc of schools) sc.update(dt, time, diver.x, diver.y, camX, camX + viewW);
    tankLife.update(dt, time, save, camX, camX + viewW);
    // While tending a tank, the diver and drone fade so they don't hide it.
    const fade = care.active ? 0.12 : dockUI.active ? 0.3 : 1;
    diver.view.alpha += (fade - diver.view.alpha) * Math.min(1, dt * 6);
    drone.view.alpha = drone.emissive.alpha = drone.glow.alpha = diver.view.alpha;

    for (const c of [litCam, emissiveCam, glowCam, overlayCam]) {
      c.scale.set(zoom);
      c.position.set(-camX * zoom, -camY * zoom);
    }
    // Foreground plants are "closer" to us, so they are bigger and move faster.
    const fz = zoom * 1.25;
    frontCam.scale.set(fz);
    frontCam.position.set(cssW / 2 - camCX * 1.3 * fz + WORLD_W * 0.15 * fz, cssH / 2 - camCY * fz + 40 * zoom);
    // Far out in build mode the near kelp would fill the screen: fade it away.
    frontCam.alpha = Math.max(0, Math.min(1, (1300 - viewH) / 400));

    // The sub: visible once started; its frame, dents, lights and grabber.
    sub.view.visible = sub.emissive.visible = sub.glow.visible = !!save.sub;
    if (save.sub) {
      sub.draw(dt, {
        frame: save.sub.stage === 'frame' ? (save.sub.progress ?? 0) : null,
        hull: save.sub.hull,
        lightsOn: save.sub.lights,
        piloted: aboard && blackout === 0,
        reach: subReach,
        welding: drone.weldingSub,
      });
      const sb = save.sub;
      if (aboard) {
        const hold = sb.modules.includes('cargo') ? `<br>cargo <b>${kg.toFixed(0)}/${lim.max}</b> kg` : '';
        hud.setSubChip(
          `KS-1${sb.docked ? ' · berthed' : ''}<br>hull <b>${Math.round(sb.hull * 100)}%</b><br>air <b>${airClock(sb.air)}</b>${hold}`,
          sb.hull < 0.35 || sb.air < 60,
        );
      } else hud.setSubChip(sb.stage === 'built' && holdKg(sb) > 0 ? `KS-1 cargo bay<br><b>${holdKg(sb).toFixed(0)} kg</b> waiting` : null);
      const dSub = Math.hypot(sub.x - diver.x, sub.y - diver.y);
      if (sb.stage === 'built' && !aboard && dSub > 700 && blackout === 0) hud.setSubMarker((sub.x - camX) * zoom, (sub.y - camY) * zoom, dSub / WU_PER_METRE);
      else hud.setSubMarker(null, 0, 0);
    } else hud.setSubChip(null);

    // Shoulder lamp.
    const lp = diver.lampPose();
    lampLight.x = lp.x;
    lampLight.y = lp.y;
    lampLight.dirX = lp.dirX;
    lampLight.dirY = lp.dirY;
    lampLight.intensity = aboard ? 0 : 1.5 * diver.lamp * diver.view.alpha;
    diver.lens.position.set(lp.x, lp.y);
    diver.lens.alpha = (0.25 + 0.75 * diver.lamp) * diver.view.alpha;
    diver.lensGlow.position.set(lp.x, lp.y);
    diver.lensGlow.alpha = diver.lamp * diver.view.alpha;

    const lights: Light[] = [...(save.sub ? sub.lights : []), lampLight, ...drone.lights, ...scenery.lights, ...baseView.lights, ...pickups.lights, ...wildlife.lights, ...fish.map((f) => f.light)];
    const floor = groundY(Math.max(WORLD_X0, Math.min(WORLD_W, diver.x)));
    const height = floor - diver.y;
    lighting.update({
      time,
      camX,
      camY,
      viewW,
      viewH,
      cssW,
      cssH,
      lights,
      maxLights: preset.maxLights,
      chromatic: preset.chromaticCaustics,
      shadow:
        preset.softShadows && height < 420
          ? [diver.x, floor + 6, 70 + height * 0.25, 0.55 * Math.exp(-height / 220)]
          : null,
    });
    water.update(time, camX, camY, viewW, viewH, app.canvas.width, app.canvas.height);
    backdrop.update(camCX, camCY, zoom, cssW, cssH);
    snow.update(dt, time, (camCX - prevX) * zoom, (camCY - prevY) * zoom, Math.max(0.25, 1 - camCY / 1400));

    renderer.render({ container: litRoot, target: litRT, clear: true, clearColor: [0, 0, 0, 0] });
    renderer.render({ container: glowCam, target: glowRT, clear: true, clearColor: [0, 0, 0, 0] });

    input.diverScreen = aboard ? { x: (sub.x - camX) * zoom, y: (sub.y - camY) * zoom } : { x: (diver.x - camX) * zoom, y: (diver.y - camY) * zoom };
    surfaceFx.update(dt, time, camX, camX + viewW, camY, diver.surfaced ? { x: hx } : null);
    updateTags(camX, camY, viewW);

    const depthM = Math.max(0, diver.y - SURFACE_Y + 6) / WU_PER_METRE;
    if (domeAir || subAir) diveTime = 0;
    watch.draw(performance.now(), save.oxygen, maxO2, atSurface ? 0 : depthM, diveTime, atSurface, { kg, ...lim });
    if (pickups.bagPos) {
      const p = pickups.bagPos;
      hud.setBagMarker((p.x - camX) * zoom, (p.y - camY) * zoom, Math.hypot(p.x - diver.x, p.y - diver.y) / WU_PER_METRE);
    } else hud.setBagMarker(null, 0, 0);

    saveTimer += dt;
    if (saveTimer > 5) persist();
    ui.tick(ticker.deltaMS);
  });

  /** Place the quick ID name tags over known things in view. */
  function updateTags(camX: number, camY: number, viewW: number): void {
    if (idTimer <= 0) {
      hud.setTags([], 0);
      return;
    }
    const done = new Set(save.scans);
    const found: { id: string; x: number; y: number; d: number }[] = [];
    for (const c of scanner.candidates) {
      if (!done.has(c.id)) continue;
      const pts = c
        .points()
        .filter((p) => p.x > camX && p.x < camX + viewW && p.y > camY && p.y < camY + viewH)
        .map((p) => ({ id: c.id, x: p.x, y: p.y, d: Math.hypot(p.x - diver.x, p.y - diver.y) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      found.push(...pts);
    }
    found.sort((a, b) => a.d - b.d);
    const tags: { id: string; sx: number; sy: number; detail: boolean; below: boolean }[] = [];
    for (const f of found) {
      const sx = (f.x - camX) * zoom;
      const sy = (f.y - camY) * zoom - 18;
      // Skip tags behind the touch buttons, or on top of one already placed.
      if (document.body.classList.contains('touch') && sx > cssW - 200 && sy > cssH - 300) continue;
      if (tags.some((t) => Math.abs(t.sx - sx) < 110 && Math.abs(t.sy - sy) < 26)) continue;
      const detail = tags.length === 0 && f.d < 240;
      // Keep tags on screen, and never cover the diver: a tag that would sits under its thing instead.
      const cx = Math.max(80, Math.min(cssW - 80, sx));
      const dsx = (diver.x - camX) * zoom;
      const dsy = (diver.y - camY) * zoom;
      const tall = detail ? 90 : 34;
      const below = Math.abs(dsx - cx) < 140 && dsy < sy + 10 && dsy > sy - tall - 30;
      tags.push({ id: f.id, sx: cx, sy: below ? sy + 40 : sy, detail, below });
      if (tags.length >= 8) break;
    }
    hud.setTags(tags, Math.min(1, idTimer / 0.8));
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (!resetting) persist();
      app.ticker.stop();
    } else app.ticker.start();
  });
  window.addEventListener('pagehide', () => {
    if (!resetting) persist();
  });

  // For automated checks: lets a test drive the diver without real touches.
  (window as unknown as { __fathom: unknown }).__fathom = {
    diver,
    app,
    save,
    scanner,
    pickups,
    layout,
    build,
    drone,
    wildlife,
    tankLife,
    care,
    tickCare: (sec: number) => tickCare(save, layout, sec),
    factory,
    linesView,
    rates,
    whorlMult: (id: number) => whorlMult(save, id),
    tickFactory: (sec: number) => {
      for (let t = 0; t < sec; t += 0.5) {
        factory.tick(save, layout, 0.5, storageRoom);
        tickCare(save, layout, 0.5);
      }
    },
    sub,
    dockUI,
    snap: () => {
      camCX = diver.x;
      camCY = diver.y;
    },
  };
}

boot().catch((err) => {
  console.error(err);
  const box = document.getElementById('boot-error')!;
  box.hidden = false;
  box.textContent =
    'Fathomlight could not start its graphics. ' + 'Please send this message to Colin: ' + String(err?.message ?? err);
});
