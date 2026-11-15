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
import { BaseLayout, GRID_BASE, GRID_X0, GRID_X1, isDone, PIECES, pieceRect, Placed } from './game/base';
import { BaseView, BuildOverlay, storageCapacity } from './world/basegfx';
import { BuildMode } from './ui/build';
import { Wildlife } from './world/wildlife';
import { TankLife } from './world/tanklife';
import { CareMode } from './ui/care';
import { creaturesIn, newCreature, SPECIES, tankNumber, tickCare, TANK_CAPACITY } from './game/creatures';
import { Factory, FEEDER_MASH_CAP, HOPPER_CAP, machineData, whorlMult } from './game/factory';
import { LinesView } from './world/linegfx';

declare const __BUILD_ID__: string;

/** How many world units fit in the screen's height. Fixed, so every device frames the scene the same. */
const VIEW_H = 640;
/** The camera zooms in on a creature tank while tending it. */
const VIEW_H_CARE = 235;

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
  const linesView = new LinesView();
  linesView.sync(save, layout);
  const readings = {
    whorls: (id: number) => save.fitted[String(id)] ?? 0,
    feeder: (id: number) => {
      const m = machineData(save, id);
      return { hopper: Math.min(1, m.fibre / HOPPER_CAP), mash: Math.min(1, m.mash / FEEDER_MASH_CAP), run: factory.feederState.get(id) === 'running' };
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
      drone.view,
      diver.view,
      bubbles.view,
      baseView.front,
      scenery.over,
    );
    frontCam.addChild(scenery.front);
    emissiveCam.addChild(scenery.emissive, baseView.emissive, tankLife.emissive, pickups.emissive, wildlife.emissive, drone.emissive, ...fish.map((f) => f.lure), diver.lens, surfaceFx.view);
    glowCam.addChild(scenery.glow, baseView.glow, tankLife.glow, pickups.glow, wildlife.glow, drone.glow, ...fish.map((f) => f.halo), diver.lensGlow);
  }
  populate();

  app.stage.addChild(water.view, backdrop.view, lighting.view, emissiveCam, glowSprite, snow.view, overlayCam);

  const input = new Input(host);
  const hud = new Hud(() => save);

  // Camera state, shared with build mode (which turns screen taps into world positions).
  let camX = 0;
  let camY = 0;
  let viewH = VIEW_H;
  const build = new BuildMode(host, {
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
  /** Where to wake up after a blackout: inside a powered dome if there is one, else at the buoy. */
  function respawnPoint(): { x: number; y: number; dome: boolean } {
    const domes = layout.pieces.filter((p) => p.kind === 'dome' && layout.powered.has(p.id));
    if (!domes.length) return { ...SPAWN, dome: false };
    const r = pieceRect(domes[0]);
    return { x: r.x + r.w / 2, y: r.y + r.h - 150, dome: true };
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
    build.setAvailable(atSite && blackout === 0 && !care.active);
    build.pollPad(dt);
    const tankHere = blackout === 0 && !build.active && !diver.surfaced ? tankAround(diver.x, diver.y) : null;
    care.setAvailable(tankHere?.id ?? (care.active ? care.tankId : null));
    care.update(dt);
    input.suspended = build.active || care.active;
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
    const inControl = blackout === 0 && !build.active && !care.active;
    // The dive bag's weight slows the diver (no sinking through a dome's floor).
    diver.load = bagLoad(save);
    diver.noSink = insideDome !== null;
    diver.update(dt, inControl ? s.moveX : 0, inControl ? s.moveY : 0, inControl && s.boost, inControl && s.lamp);

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
    const domeHere = blackout === 0 && !build.active ? domeAround(diver.x, diver.y) : null;
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
    const atSurface = diver.surfaced;
    const maxO2 = maxOxygen(save);
    save.playSeconds += dt;
    // Inside a dome habitat with power: station air, like breathing at the surface.
    const dome = blackout === 0 ? domeAround(diver.x, diver.y) : null;
    const domeAir = !!dome && layout.powered.has(dome.id);
    if ((dome?.id ?? null) !== insideDome) {
      insideDome = dome?.id ?? null;
      if (dome && domeAir) {
        hud.toast('Dome habitat: breathing station air · progress saved', 'big');
        persist();
      }
    }
    if ((build.active || care.active) && blackout === 0) {
      // Planning the base, or tending a tank, pauses the air clock.
    } else if (blackout === 0) {
      if (atSurface || domeAir) {
        // Air comes in from the first breath after breaking the surface.
        if (domeAir || diver.surfaceTime > 0.4) save.oxygen = Math.min(maxO2, save.oxygen + (maxO2 / 3) * dt);
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
      if (frac < 0.25 && !lowWarned && !atSurface && !domeAir) {
        lowWarned = true;
        hud.toast(layout.powered.size && layout.count('dome') ? 'Oxygen low: head for the surface or the dome' : 'Oxygen low: head for the surface', 'warn');
      }
      hud.setLowOxygen(atSurface || domeAir ? 0 : Math.max(0, (0.25 - frac) / 0.25) * (0.75 + 0.25 * Math.sin(time * 5)));
      if (save.oxygen <= 0) {
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
        const home = respawnPoint();
        diver.x = home.x;
        diver.y = home.y;
        drone.teleport(home.x, home.y, layout);
        diver.vx = diver.vy = 0;
        diver.surfaced = false;
        camCX = diver.x;
        camCY = diver.y;
        save.oxygen = maxO2;
        diveTime = 0;
        lowWarned = false;
        hud.setLowOxygen(0);
        const where = home.dome ? 'the dome habitat' : 'the Kestrel buoy';
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
    const collectHeld = inControl && s.collect && !diver.surfaced;
    // The stranded drone takes the Collect button when the diver is next to it.
    const atDrone = drone.inReach && !diver.surfaced && blackout === 0;
    // Wild creatures: the specimen jar takes the Collect button when one is in reach.
    const wt = wildlife.target;
    const wtKnown = !!wt && save.scans.includes(SPECIES[wt.species].scan);
    const wildOk = !!wt && wtKnown && !save.jar && !diver.surfaced && !atDrone;
    for (const ev of wildlife.update(dt, time, diver.x, diver.y, Math.hypot(diver.vx, diver.vy), diver.boosting, save, collectHeld && wildOk, camX - 200, camX + lastViewW + 200)) {
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
    for (const ev of pickups.update(dt, time, diver.x, diver.y, save, collectHeld && !atDrone && !bagFull && !wildTarget, speed)) {
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
    diver.working =
      wildlife.working && wildTarget ? { x: wildTarget.x, y: wildTarget.y } : pickups.working && pt ? { x: pt.x, y: pt.y } : repairing ? drone.scanPoint() : null;
    if (atDrone) {
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
    for (const ev of drone.update(dt, time, {
      diverX: diver.x,
      diverY: diver.y,
      diverFace: diver.facing,
      diverSpeed: speed,
      repairing,
      layout,
      rate: droneWeldRate(save),
    })) {
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
    if (tankNow !== null && tankNow !== nearTank && save.jar) {
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
    nearTank = tankNow;
    hud.setJar(jarText());

    // ---- Factory (milestone 5): conveyors, the auto feeder and feed pipes ----
    factory.tick(save, layout, dt);

    // ---- Creature care: needs run on play time ----
    for (const ev of tickCare(save, layout, dt, () => storageCapacity(layout) - MATERIALS_LIST.reduce((a, k) => a + save.stored[k], 0))) {
      const name = SPECIES[ev.c.species].name;
      const where = `tank ${tankNumber(layout, ev.c.tank)}`;
      if (ev.type === 'hatched') hud.toast(`The ${name.toLowerCase()} eggs hatched in ${where}! The fry need feeding.`, 'big');
      else if (ev.type === 'grown') hud.toast(`The ${name.toLowerCase()} in ${where} is fully grown, and glows brighter`, 'big');
      else if (ev.type === 'sick') hud.toast(`The ${name.toLowerCase()} in ${where} is sick (${ev.why}). Tend it soon.`, 'warn');
      else if (ev.type === 'better') hud.toast(`The ${name.toLowerCase()} in ${where} is feeling better`);
      else if (ev.type === 'dormant')
        hud.toast(`The ${name.toLowerCase()} in ${where} went dormant. Its remains are kept in storage until a Revival pool is found.`, 'warn');
      else if (ev.type === 'made') {
        hud.toast(`+1 ${MATERIALS[ev.kind].name} from the ${name.toLowerCase()} (stored)`);
        hud.refreshInventory(ev.kind);
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
    if (byPod && !nearStorage && blackout === 0 && !build.active) {
      const carried = MATERIALS_LIST.reduce((a, k) => a + save.bag[k], 0);
      if (!podPowered) {
        if (carried)
          hud.toast(podFrame ? 'This storage pod is still a frame: the drone has to finish it first' : 'This storage pod has no power: join it to a current turbine', 'warn');
      } else if (carried) {
        let room = storageCapacity(layout) - MATERIALS_LIST.reduce((a, k) => a + save.stored[k], 0);
        let moved = 0;
        for (const k of MATERIALS_LIST) {
          const n = Math.min(room, save.bag[k]);
          save.bag[k] -= n;
          save.stored[k] += n;
          room -= n;
          moved += n;
        }
        if (moved) hud.toast(`Stored ${moved} item${moved === 1 ? '' : 's'} in the base${save.bag.scrap + save.bag.copper + save.bag.quartz + save.bag.fibre ? ' (storage is full)' : ''}`, 'big');
        else hud.toast('Storage is full: build another storage pod', 'warn');
        hud.refreshInventory();
        persist();
      }
    }
    nearStorage = byPod;

    // ---- Scanner ----
    const done = new Set(save.scans);
    const lpose = diver.lampPose();
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
    bubbles.update(dt, bx, by, diver.vx, diver.vy, diver.boosting);

    if (Math.hypot(s.moveX, s.moveY) > 0.2 && hintTimer === 0) hintTimer = 0.001;
    if (hintTimer > 0) {
      hintTimer += dt;
      if (hintTimer > 2.5) hintEl.classList.add('gone');
    }

    // Zoom out while building (the build camera is steered by pan and pinch).
    const wantH = build.active ? build.cam.h : care.active ? VIEW_H_CARE : VIEW_H;
    viewH += (wantH - viewH) * (1 - Math.exp(-(build.active ? 10 : 4) * dt));
    zoom = cssH / viewH;
    const viewW = cssW / zoom;
    lastViewW = viewW;
    let lookX = diver.x + diver.vx * 0.35 + (diver.vx >= 0 ? 60 : -60);
    let lookY = diver.y + diver.vy * 0.25 + 30;
    if (build.active) {
      lookX = build.cam.x;
      lookY = build.cam.y;
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
    camX = camCX - viewW / 2;
    camY = camCY - viewH / 2;
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
    const fade = care.active ? 0.12 : 1;
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

    // Shoulder lamp.
    const lp = diver.lampPose();
    lampLight.x = lp.x;
    lampLight.y = lp.y;
    lampLight.dirX = lp.dirX;
    lampLight.dirY = lp.dirY;
    lampLight.intensity = 1.5 * diver.lamp * diver.view.alpha;
    diver.lens.position.set(lp.x, lp.y);
    diver.lens.alpha = (0.25 + 0.75 * diver.lamp) * diver.view.alpha;
    diver.lensGlow.position.set(lp.x, lp.y);
    diver.lensGlow.alpha = diver.lamp * diver.view.alpha;

    const lights: Light[] = [lampLight, ...drone.lights, ...scenery.lights, ...baseView.lights, ...pickups.lights, ...wildlife.lights, ...fish.map((f) => f.light)];
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

    input.diverScreen = { x: (diver.x - camX) * zoom, y: (diver.y - camY) * zoom };
    surfaceFx.update(dt, time, camX, camX + viewW, camY, diver.surfaced ? { x: hx } : null);
    updateTags(camX, camY, viewW);

    const depthM = Math.max(0, diver.y - SURFACE_Y + 6) / WU_PER_METRE;
    if (domeAir) diveTime = 0;
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
    tickCare: (sec: number) => tickCare(save, layout, sec, () => 99),
    factory,
    linesView,
    whorlMult: (id: number) => whorlMult(save, id),
    tickFactory: (sec: number) => {
      for (let t = 0; t < sec; t += 0.5) {
        factory.tick(save, layout, 0.5);
        tickCare(save, layout, 0.5, () => 99);
      }
    },
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
