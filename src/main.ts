import { Application, BlurFilter, Container, RenderTexture, Sprite, Texture, UPDATE_PRIORITY } from 'pixi.js';
import { perf, PerfOverlay } from './dev/perf';
import { PostStack, ZoneWeights } from './fx/post';
import { Bench, BENCH, BENCH_SCENES, STILL, scenePos, seedBenchSave } from './dev/bench';
import { FxToggles, loadChoice, loadFx, pixelRatioFor, renderBoost, renderScale, RENDER_SCALE_MIN, Preset, PresetChoice, resolveChoice, saveChoice, saveFx } from './presets';
import { Water } from './scene/water';
import { isWaterAir, ventLensAt, WaterMotion } from './scene/waterMotion';
import { SurfaceMotion } from './fx/surfaceMotion';
import { WaterWake } from './fx/waterWake';
import { Backdrop } from './scene/backdrop';
import { MarineSnow, SnowLight } from './scene/particles';
import { ZoneBackdrop } from './scene/zonebackdrop';
import { loadShallowsArt, loadShallowsKelp, loadShallowsSeabed, ShallowsBackdrop } from './art/shallows';
import { loadPaintedDiver } from './art/paintedDiver';
import { loadPaintedSuit } from './art/paintedSuit';
import { loadForestMidground, loadForestOutcrop } from './art/forest';
import { loadWreckShelfMidground } from './art/wreckShelf';
import { loadWorldArt } from './art/worldArt';
import { initSettingsUI } from './ui';
import { Input } from './input';
import { Diver, type KitLook } from './actors/diver';
import { Glowfin } from './actors/glowfin';
import { Bubbles } from './fx/bubbles';
import { Light, Lighting } from './fx/lighting';
import { FRONT_REF, Scenery } from './world/scenery';
import { bagRestingPlace, Pickups } from './world/pickups';
import { School } from './actors/school';
import {
  bakeSkyVisibility,
  CAVE,
  CAVE_GATE_X,
  caveBottom,
  caveTop,
  boom,
  FOREST,
  RECORDER_X,
  GROTTO,
  groundY,
  inCaveTunnel,
  isSolid,
  AIR_POCKETS,
  BRACKETS,
  caveFloor,
  inShape,
  inKelpCaves,
  inLightless,
  LIGHTLESS_EDGE,
  KC,
  KC_FINDS,
  KELP_WALL,
  kelpWall,
  smooth,
  CORVINA,
  LURKER_DENS,
  RACE,
  race,
  raceAt,
  RINGS,
  ANCHORS,
  cv,
  CV_HATCH,
  hidden,
  HIDDEN,
  seam,
  SEAM,
  SALVAGE,
  SALVAGE_REGROW,
  WRECK_SHELF,
  WRECKS,
  SPAWN,
  START,
  WORLD_H,
  WORLD_SPAN,
  WORLD_W,
  WORLD_X0,
  WU_PER_METRE,
  CRUSH,
  crushRate,
  TRENCH,
  cleft,
  CLEFT,
  CLEFT_FINDS,
  FULMAR_HATCH,
  TR_BUOY,
  TR_PROBE,
  TR_VENTS,
  TR_LANTERNJAWS,
  TR_STALKERS,
  TR_SPIDERS,
  SANCTUM,
  sanctum,
  inSanctum,
} from './world/terrain';
import { DeepHunters } from './actors/deep';
import { FULMAR_MAP, FULMAR_OPTS } from './interior/fulmar';
import { FRAGMENTS, nextFragment, signalStatus, tickSignals } from './game/signals';
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
import { BaseLayout, berthOf, cellOpen, GRID_BASE, GRID_X0, GRID_X1, isDone, onSeabed, isStoreKind, isTankKind, pieceCode, PIECES, pieceRect, POWER_MAKE, TURBINE_LIMIT, Placed, shapeOf, SORT_BAY, STORAGE_PER_POD } from './game/base';
import { Sub } from './actors/sub';
import { airClock, DENT_PER_SPEED, DENT_SPEED, docks, holdKg, SUB_AIR, SUB_BUILD_TIME, SUB_COST, subDock } from './game/sub';
import { DockMode } from './ui/dock';
import { BaseView, BuildOverlay, storageCapacity } from './world/basegfx';
import { BuildMode } from './ui/build';
import { Wildlife } from './world/wildlife';
import { TankLife } from './world/tanklife';
import { Escort } from './actors/escort';
import { CareMode } from './ui/care';
import { creaturesIn, newCreature, payCost, PLANT_ORDER, PLANTS, SPECIES, SPECIES_ORDER, tankCapacity, tankNumber, tickCare, wildAllowed, WILD_CAP } from './game/creatures';
import { HatchPanel } from './ui/hatch';
import { traitText, wildTraits } from './game/traits';
import { RatesPanel } from './ui/rates';
import { Factory, FARM_TRAY, FEEDER_MASH_CAP, HOPPER_CAP, machineData, PRESS_COPPER_CAP, PRESS_PLATE_CAP, PRESS_SCRAP_CAP, whorlMult, whorlsFree } from './game/factory';
import { LinesView } from './world/linegfx';
import { StationMode } from './ui/station';
import { DIVE_LIGHT, GEAR, hasGear, jobOf, jobRunning, LAMP, OTHER_BLUEPRINTS, PIECE_BLUEPRINTS, RESEARCH, tickStations } from './game/gear';
import type { BlueprintId } from './game/state';
import { audio } from './audio/engine';
import { SoundDirector, WorkKind, zoneMix } from './audio/director';
import { Lurkers } from './actors/lurker';
import { Interior, InteriorEvent } from './interior/interior';
import { CORVINA_MAP } from './interior/corvina';
import { BaseCtx, BaseHooks, baseSignature, buildBaseLevel } from './interior/baselevel';
import { SCAN_ENTRIES } from './game/scanner';
import { CHOIR_AT, ChoirForm, HEART_MAP, heartOptions } from './interior/sanctum';
import { Contact, type ContactWord } from './ui/contact';
import { markSeen, ZoneMap } from './ui/zonemap';
import { PadNav } from './ui/padnav';
import { Menus } from './ui/menu';
import { GearFx } from './world/gearfx';
import { PATTERNS } from './game/traits';
import { initSoundUI } from './ui/sound';

declare const __BUILD_ID__: string;

/** How many world units fit in the screen's height. Fixed, so every device frames the scene the same. */
const VIEW_H = 640;
/** The camera zooms in on a creature tank while tending it. */
const VIEW_H_CARE = 235;
/** Milestone 6: driving the sub shows more water; the dock panel frames the dock. */
const VIEW_H_SUB = 820;
const VIEW_H_DOCK = 470;
/** Milestone 7: the Lab and Workshop panel frames the piece. */
const VIEW_H_STATION = 400;

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
  const urlq = new URLSearchParams(location.search);
  let choice: PresetChoice = loadChoice();
  let preset: Preset = resolveChoice(choice);

  const app = new Application();
  await app.init({
    preference: 'webgl',
    // G1: the screen is only ever a full-screen quad (the post pass) plus thin overlays, and the
    // world's edges are antialiased in the pictures it is drawn from, so canvas MSAA bought nothing.
    antialias: false,
    background: '#0b2a33',
    resolution: pixelRatioFor(preset, window.innerWidth, window.innerHeight),
    autoDensity: true,
    width: window.innerWidth,
    height: window.innerHeight,
    powerPreference: 'high-performance',
  });
  host.appendChild(app.canvas);
  const renderer = app.renderer;
  perf.attach((renderer as unknown as { gl: WebGL2RenderingContext }).gl);

  // Baked daylight/shadow map for the whole world (soft shadows under rock).
  const mask = Texture.from(bakeSkyVisibility(8, 3));
  mask.source.style.addressMode = 'clamp-to-edge';
  mask.source.style.scaleMode = 'linear';

  // Off-screen pictures for the lit layer and the glow layer.
  const litRT = RenderTexture.create({ width: 4, height: 4, antialias: true });
  const glowRT = RenderTexture.create({ width: 4, height: 4 });
  // Graphics session G1: the world is drawn into one picture (half-float where the device can), then
  // the post stack (bloom, tone mapping, grading, vignette, grain) turns it into the screen.
  const post = new PostStack(renderer, glowRT, litRT);
  /** Everything of the world that goes through the post stack. Not on the stage: it is drawn into `post.sceneRT`. */
  const hdrRoot = new Container();

  const motion = urlq.get('water') === 'original' ? undefined : new WaterMotion();
  const surfaceMotion = motion ? new SurfaceMotion() : undefined;
  const wake = motion ? new WaterWake(motion) : undefined;
  const cameraFlow = { x: 0, y: 0, silt: 0, energy: 0 };
  const water = new Water(mask, surfaceMotion);
  const backdrop = new Backdrop();
  // G3: a soft blur for the near foreground kelp (Ultra).
  const dofBlur = new BlurFilter({ strength: 2, quality: 2 });
  const lighting = new Lighting(litRT, mask, surfaceMotion);
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
  const loaded = loadSave(START.x, START.y);
  const save: SaveData = loaded.data;
  // Opened passages count from the very first frame, so a diver saved inside one isn't pushed out (after milestone 12).
  hidden.open = !!save.hiddenOpen;
  seam.open = !!save.seamOpen;
  if (BENCH) seedBenchSave(save);

  const visualMode = (flag: string, approved = 'painted') => (urlq.get(flag) ?? approved) === approved;
  const redesigned = urlq.get('character') !== 'original';
  const compact = redesigned && urlq.get('character') !== 'phase9';
  // art=procedural still switches the whole Shallows pilot back to procedural art.
  const useShallowsArt = visualMode('art', 'shallows');
  const [shallowsArt, shallowsSeabed, shallowsKelp, paintedFace, paintedSuit, forestMidground, forestOutcrop, shelfMidground, worldArt] = await Promise.all([
    useShallowsArt ? loadShallowsArt() : null,
    useShallowsArt && visualMode('terrain') ? loadShallowsSeabed() : null,
    useShallowsArt && visualMode('kelp') ? loadShallowsKelp() : null,
    !redesigned && visualMode('diver') ? loadPaintedDiver() : undefined,
    !redesigned && visualMode('suit') ? loadPaintedSuit() : undefined,
    visualMode('forest') ? loadForestMidground() : undefined,
    visualMode('forestTerrain') ? loadForestOutcrop() : undefined,
    visualMode('shelf') ? loadWreckShelfMidground() : undefined,
    visualMode('worldArt') ? loadWorldArt() : undefined,
  ]);
  const zoneBackdrop = new ZoneBackdrop(forestMidground, shelfMidground, worldArt);
  zoneBackdrop.build();
  const shallowsBackdrop = shallowsArt ? new ShallowsBackdrop(shallowsArt) : null;
  let scenery = new Scenery(renderer, preset.detail, shallowsArt?.reef, shallowsSeabed ?? undefined, shallowsKelp ?? undefined, forestOutcrop, worldArt);
  const pickups = new Pickups();
  const diver = new Diver(paintedFace, paintedSuit?.swimmer, visualMode('personality', 'surface'), redesigned, compact);
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
  // Milestone 8: wreck lurkers in their dens on the shelf.
  const lurkers = new Lurkers(LURKER_DENS);
  // Milestone 10: the trench's predators.
  const hunters = new DeepHunters(TR_LANTERNJAWS, TR_STALKERS, TR_SPIDERS);
  // After milestone 12: flares, darts, visor marks, the tractor beam and drill sparks.
  const gearFx = new GearFx();
  const tankLife = new TankLife();
  // Milestone 9: a grown glowfin from the jar swims beside the diver as a light.
  const escort = new Escort();
  let llSafe = { x: 0, y: 0 };
  const livingCreatures = urlq.get('creatures') !== 'original';
  const schools = [
    new School(22, { x0: 1850, x1: 3500, y0: 200, y1: 380 }, livingCreatures),
    new School(16, { x0: 6950, x1: 8250, y0: 300, y1: 450 }, livingCreatures),
    // Milestone 7: a wary shoal between the giant kelp.
    new School(18, { x0: 10400, x1: 14200, y0: 520, y1: 1050 }, livingCreatures),
  ];
  boom.open = save.boomOpen;
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
    // Milestone 7: the kelp forest.
    { id: 'boom', points: () => scenery.scanPoints.boom },
    { id: 'forest', points: () => scenery.scanPoints.forest },
    { id: 'gkelp', points: () => scenery.scanPoints.gkelp },
    { id: 'bladder', points: () => scenery.scanPoints.bladder },
    { id: 'lumen', points: () => scenery.scanPoints.lumen },
    { id: 'kcaves', points: () => scenery.scanPoints.kcaves },
    { id: 'airpocket', points: () => scenery.scanPoints.airpocket },
    { id: 'surge', points: () => scenery.scanPoints.surge },
    { id: 'blackwater', points: () => scenery.scanPoints.blackwater },
    { id: 'kwall', points: () => (kelpWall.cut ? [] : scenery.scanPoints.kwall) },
    // Milestone 8: the wreck shelf.
    { id: 'wshelf', points: () => scenery.scanPoints.wshelf },
    { id: 'race', points: () => scenery.scanPoints.race },
    { id: 'ring', points: () => scenery.scanPoints.ring },
    { id: 'wreck', points: () => scenery.scanPoints.wreck },
    { id: 'corvina', points: () => scenery.scanPoints.corvina },
    { id: 'vane', points: () => scenery.scanPoints.vane },
    { id: 'cvhook', points: () => scenery.scanPoints.cvhook },
    { id: 'hidden', points: () => (save.hiddenOpen ? [] : scenery.scanPoints.hidden) },
    { id: 'salvage', points: () => scenery.scanPoints.salvage },
    { id: 'lurker', points: () => lurkers.list.map((l) => l.head()) },
    { id: 'crab', points: () => wildlife.scanPoints('crab') },
    { id: 'shrimp', points: () => wildlife.scanPoints('shrimp') },
    // Milestone 10: the trench.
    { id: 'trench', points: () => scenery.trench.scanPoints.trench },
    { id: 'sigbuoy', points: () => scenery.trench.scanPoints.sigbuoy },
    { id: 'probe', points: () => scenery.trench.scanPoints.probe },
    { id: 'vents', points: () => scenery.trench.scanPoints.vents },
    { id: 'chimney', points: () => (save.cleftOpen ? [] : scenery.trench.scanPoints.chimney) },
    { id: 'fulmar', points: () => scenery.trench.scanPoints.fulmar },
    { id: 'snail', points: () => wildlife.scanPoints('snail') },
    { id: 'lanternjaw', points: () => hunters.points('lanternjaw') },
    { id: 'stalker', points: () => hunters.points('stalker') },
    { id: 'spider', points: () => hunters.points('spider') },
    // Milestone 11: the sanctum.
    { id: 'sdoor', points: () => scenery.sanctum.scanPoints.sdoor },
    { id: 'shall', points: () => (sanctum.door ? scenery.sanctum.scanPoints.shall : []) },
    { id: 'slock', points: () => scenery.sanctum.scanPoints.slock.filter((_, i) => !sanctum.locks[i]) },
    { id: 'sheart', points: () => scenery.sanctum.scanPoints.sheart },
  );
  const surfaceFx = new SurfaceFx(surfaceMotion);

  // The base at the Kestrel site.
  const layout = new BaseLayout(save.pieces);
  save.pieces = layout.pieces;
  drone.teleport(diver.x, diver.y, layout);
  const baseView = new BaseView();
  baseView.sync(layout);
  tankLife.sync(save, layout);
  const buildOverlay = new BuildOverlay();
  overlayCam.addChild(buildOverlay.view, gearFx.overlay);
  // Milestone 5: conveyors, feed pipes and the machines they join.
  const factory = new Factory();
  /** How many more items fit in the base's storage pods. */
  /**
   * Room left in the base's storage: for one material (its sorting-pod bay,
   * milestone 7 part 2, plus what is left of the shared storage pods), or in all.
   */
  const storageRoom = (k?: keyof typeof save.stored): number => {
    const bay = layout.countDone('sorter') * SORT_BAY;
    const pods = layout.countDone('storage') * STORAGE_PER_POD;
    let over = 0;
    for (const j of MATERIALS_LIST) over += Math.max(0, save.stored[j] - bay);
    const shared = Math.max(0, pods - over);
    if (k) return Math.max(0, bay - save.stored[k]) + shared;
    let free = shared;
    for (const j of MATERIALS_LIST) free += Math.max(0, bay - save.stored[j]);
    return free;
  };
  const linesView = new LinesView();
  linesView.sync(save, layout);
  const readings = {
    whorls: (id: number) => save.fitted[String(id)] ?? 0,
    feeder: (id: number) => {
      const m = machineData(save, id);
      return { hopper: Math.min(1, m.fibre / HOPPER_CAP), mash: Math.min(1, m.mash / FEEDER_MASH_CAP), run: factory.feederState.get(id) === 'running' };
    },
    station: (id: number) => {
      const p = layout.pieces.find((q) => q.id === id);
      return !!p && !!jobOf(save, p);
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
    shadow: true,
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
      escort.view,
      lurkers.view,
      hunters.view,
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
    emissiveCam.addChild(gearFx.emissive, scenery.emissive, baseView.emissive, tankLife.emissive, pickups.emissive, wildlife.emissive, escort.emissive, lurkers.emissive, hunters.emissive, sub.emissive, drone.emissive, ...fish.map((f) => f.lure), diver.lens, diver.resonDot, surfaceFx.view);
    if (wake) emissiveCam.addChildAt(wake.view, 0);
    glowCam.addChild(scenery.glow, baseView.glow, tankLife.glow, pickups.glow, wildlife.glow, escort.glow, lurkers.glow, hunters.glow, sub.glow, drone.glow, ...fish.map((f) => f.halo), diver.lensGlow, diver.resonGlow);
  }
  populate();

  const worldLayers = [water.view, backdrop.view, zoneBackdrop.view];
  if (shallowsBackdrop) worldLayers.push(shallowsBackdrop.view);
  worldLayers.push(lighting.view, emissiveCam, glowSprite, snow.view);
  hdrRoot.addChild(...worldLayers);
  // On the stage after the post pass, so the scanner, the build grid and the collect rings stay crisp.
  app.stage.addChild(post.view, overlayCam);
  // After milestone 8 part 2: dry interiors on foot, drawn over the (hidden) world.
  const interior = new Interior(renderer, paintedFace, paintedSuit?.walker, worldArt, redesigned, compact);
  hdrRoot.addChild(interior.view);
  worldLayers.push(overlayCam);
  /** Which interior you're on foot in, if any. */
  let inside: 'corvina' | 'base' | 'fulmar' | 'sanctum' | null = null;
  /** Milestone 11: the Choir in the sanctum's heart, and first contact (the ending). */
  const choir = new ChoirForm();
  const contact = new Contact(choir);
  /** Milestone 11: the Signal array's zone map (opened at its console). */
  const zoneMap = new ZoneMap();
  const padNav = new PadNav();
  let seenClock = 0;
  // Saves from before the zone map: map the zones already reached.
  if (!save.mapSeen) {
    const reached = (x0: number, x1: number) => {
      for (let x = x0; x < x1; x += 250) markSeen(save, x, 0);
    };
    reached(-5600, 9000);
    if (save.gear.includes('light')) reached(8600, 19300);
    if (save.scans.includes('wshelf') || save.gear.includes('tow')) reached(19300, 27000);
    if (save.scans.includes('trench')) reached(26800, 33000);
  }
  /** The walkable base: the dome you came in by, and the level built from the layout. */
  let baseDome: number | null = null;
  let baseHooks: BaseHooks | null = null;
  /** A console inside the base has opened its panel out in the world for a moment. */
  let peek: { kind: 'care' | 'station' | 'dock' | 'build'; id: number | null; select: number | null; x: number; y: number; face: number; opened: boolean } | null = null;
  /** Where a dome's airlock is from outside: the round hatch on the front of its drum. */
  function airlockOutside(p: Placed): { x: number; y: number } {
    const r = pieceRect(p);
    return { x: r.x + r.w / 2, y: r.y + r.h - 46 };
  }
  /** Outside the dome you went in by (or the first dome). */
  function baseOutside(): { x: number; y: number } {
    const p = layout.pieces.find((q) => q.id === baseDome) ?? layout.pieces.find((q) => q.kind === 'dome');
    return p ? airlockOutside(p) : { x: diver.x, y: diver.y };
  }

  const input = new Input(host);
  const hud = new Hud(() => save);
  // Milestone 7b: sound, all made by code. The first tap or key press starts it.
  audio.attachUnlock();
  const sound = new SoundDirector();
  {
    const toast = hud.toast.bind(hud);
    hud.toast = (text, kind = 'item') => {
      toast(text, kind);
      sound.toast(kind);
    };
  }
  const soundUI = initSoundUI();
  document.getElementById('settings-btn')!.addEventListener('click', () => soundUI.refresh());
  const settingsPanel = document.getElementById('settings-panel')!;
  const logPanel = document.getElementById('log-panel')!;

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
    droneAway: () => (drone.hauling ? Math.max(1, Math.ceil(drone.haulEta())) : null),
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
    // Milestone 9: tending happens indoors too, so effects go to both views of the tank.
    fedFx: (id) => {
      tankLife.feed(id);
      baseHooks?.tankLife.feed(id);
    },
    scrubFx: (id) => {
      tankLife.scrub(id);
      baseHooks?.tankLife.scrub(id);
    },
    changed: () => {
      tankLife.sync(save, layout);
      baseHooks?.syncTanks();
    },
    released: (c) => wildlife.release(c.species, c.stage, save),
    highlight: (id) => {
      tankLife.highlight = id;
      if (baseHooks) baseHooks.tankLife.highlight = id;
    },
  });
  // Milestone 9: the Hatchery's panel (it shares the care panel's frame).
  const hatchPanel = new HatchPanel({
    save,
    layout,
    toast: (t, k) => hud.toast(t, k),
    persist: () => persist(),
    changed: () => {
      tankLife.sync(save, layout);
      baseHooks?.syncTanks();
    },
  });
  /** Give materials back: into storage while there is room, the rest carried. */
  function refund(cost: Partial<Record<keyof typeof save.bag, number>>): void {
    for (const k of MATERIALS_LIST) {
      const n = cost[k] ?? 0;
      const into = Math.max(0, Math.min(n, storageRoom(k)));
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
    droneAway: () => (drone.hauling ? Math.max(1, Math.ceil(drone.haulEta())) : null),
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
  // Milestone 7: the Lab and Workshop panel.
  const station = new StationMode({
    save,
    layout,
    toast: (t, k) => hud.toast(t, k),
    refreshInventory: () => hud.refreshInventory(),
    persist: () => persist(),
    refund,
  });
  /** A finished Lab or Workshop the diver is beside. */
  function stationAround(x: number, y: number): Placed | null {
    for (const p of layout.pieces) {
      if ((p.kind !== 'lab' && p.kind !== 'workshop') || !isDone(p)) continue;
      const r = pieceRect(p);
      if (x > r.x - 50 && x < r.x + r.w + 50 && y > r.y - 60 && y < r.y + r.h + 40) return p;
    }
    return null;
  }
  /** Hold-to-do actions out in the world on the Collect button (milestone 7: the sled recorder, the boom winch). */
  let holdProgress = 0;
  let holdKey = '';
  /** 0..1: how far the boom gate has swung up. */
  let boomT = save.boomOpen ? 1 : 0;
  let prevDiverX = diver.x;
  // Milestone 8: the grapple line (Colin, after part 1: it replaced clipping on and hauling).
  // It fires at an anchor ring in range and reels the diver in, faster than the race.
  let grapple: { to: number; phase: 'fly' | 'reel'; t: number } | null = null;
  const GRAPPLE_RANGE = 460;
  const GRAPPLE_FLY = 0.18;
  const GRAPPLE_REEL = 580;
  let vaneT = save.vane ? 1 : 0;
  let sonarAt = -99;
  // After milestone 12: the dash, the drill and the tractor beam's clocks.
  let boostTapAt = -99;
  let dashAt = -99;
  let drillT = 0;
  let tractorAt = 0;
  let tractorBeam: { x0: number; y0: number; x1: number; y1: number } | null = null;
  let tractorBeamT = 0;
  let noFlareAt = -99;
  race.vane = save.vane;
  const lineClear = (ax: number, ay: number, bx: number, by: number) => {
    for (let k = 1; k < 12; k++) if (isSolid(ax + ((bx - ax) * k) / 12, ay + ((by - ay) * k) / 12)) return false;
    return true;
  };
  let suitCalm = 99;
  let blackoutCause: 'air' | 'suit' = 'air';
  scenery.setHatches(save.hatches);
  // After milestone 7 part 2 (Colin): the mouse wheel (or - and = keys) zooms the swimming view
  // in and out, like build mode. 1 = the normal view; bigger shows more. Saved on the device.
  const SWIM_ZOOM_MIN = 0.75;
  const SWIM_ZOOM_MAX = 2.2;
  let swimZoom = 1;
  try {
    const z = Number(localStorage.getItem('fathomlight.swimZoom'));
    if (z >= SWIM_ZOOM_MIN && z <= SWIM_ZOOM_MAX) swimZoom = z;
  } catch {
    /* storage blocked */
  }
  const setSwimZoom = (z: number) => {
    swimZoom = Math.max(SWIM_ZOOM_MIN, Math.min(SWIM_ZOOM_MAX, z));
    try {
      localStorage.setItem('fathomlight.swimZoom', swimZoom.toFixed(3));
    } catch {
      /* storage blocked */
    }
  };
  const swimViewFree = () => !build.active && !care.active && !dockUI.active && !station.active;
  host.addEventListener(
    'wheel',
    (e) => {
      if (!swimViewFree()) return;
      e.preventDefault();
      const d = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
      setSwimZoom(swimZoom * Math.exp(Math.max(-0.4, Math.min(0.4, d * 0.0012))));
    },
    { passive: false },
  );
  window.addEventListener('keydown', (e) => {
    if (!swimViewFree() || (e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (e.key === '-' || e.key === '_') setSwimZoom(swimZoom * 1.15);
    else if (e.key === '=' || e.key === '+') setSwimZoom(swimZoom / 1.15);
    else if (e.key === '0' && e.ctrlKey) setSwimZoom(1);
  });
  /** Climbing into the sub (after milestone 7b): seconds to swim to the hatch, then to sink through it. */
  let boarding: { t: number; x0: number; y0: number } | null = null;
  let boardFade = 1;
  const BOARD_SWIM = 0.6;
  const BOARD_IN = 0.45;
  /** How far from the claw the sub's grabber arm can take a material (a diver's hand reaches 72). */
  const GRAB_REACH = 150;
  // Milestone 7 part 2: the kelp caves.
  let kcTime = 0;
  kelpWall.cut = save.kelpCut;
  const SURGE_CYCLE = 7.5;
  const FIND_INFO: Record<keyof typeof KC_FINDS, { research: BlueprintId; label: string; toast: string; y: number }> = {
    relaylog: {
      research: 'relay',
      label: 'Take the KS RELAY 2 log',
      toast: 'KS RELAY 2 log taken! A Lab can decode it into the Air relay AR-1: fresh air, planted anywhere out in the world.',
      y: 0,
    },
    weldchip: {
      research: 'welder',
      label: 'Pull the KD WELD control chip',
      toast: 'KD WELD control chip taken! Decode it in a Lab for the DR-2 welder: the build drone welds twice as fast.',
      y: 0,
    },
    towcoil: {
      research: 'tow',
      label: "Take the rope store's spool tag",
      toast: 'Rope store notes taken! A Lab can decode the grapple line from them: it hooks anchor points and reels you in, faster than strong currents.',
      y: 0,
    },
    nurserylog: {
      research: 'hatch',
      label: 'Take the Kestrel nursery log',
      toast: 'The Kestrel nursery log! A Lab can decode it into the Hatchery HX-1: warm cradles that take the eggs a happy pair lays. The wild only spares two of each kind, so breeding is how a base grows.',
      y: 0,
    },
    cache: {
      research: 'cutter',
      label: 'Open the survey cache',
      toast: 'The survey cache! Its cartridge holds the cutter torch design. Decode it in a Lab, then build the torch in a Workshop.',
      y: 0,
    },
  };
  for (const k of Object.keys(KC_FINDS) as (keyof typeof KC_FINDS)[]) FIND_INFO[k].y = caveFloor(KC_FINDS[k].x, KC_FINDS[k].from) - 24;
  scenery.setRelays(save.relays);

  /*
   * The tighter, stepped trench (Colin, after milestone 9; the terraces of
   * milestone 6 before it): pieces an older save had built where the rock is
   * now come out, with everything refunded (into storage first).
   * Creatures in such a tank move to another tank with room, or swim home.
   * Runs on every load, but only ever finds anything once.
   */
  {
    const buried = layout.pieces.filter((p) => {
      const sh = shapeOf(p);
      for (let i = 0; i < sh.w; i++) for (let j = 0; j < sh.h; j++) if (!cellOpen(p.gx + i, p.gy + j)) return true;
      return false;
    });
    let moved = 0;
    let freed = 0;
    for (const p of buried) {
      if (isTankKind(p.kind)) {
        for (const c of save.creatures.filter((q) => q.tank === p.id)) {
          const home = layout.pieces.find(
            (t) => isTankKind(t.kind) && t.id !== p.id && !buried.includes(t) && creaturesIn(save, t.id).length < tankCapacity(layout, t.id),
          );
          if (home) {
            c.tank = home.id;
            moved++;
          } else {
            save.creatures = save.creatures.filter((q) => q !== c);
            wildlife.release(c.species, c.stage, save);
            freed++;
          }
        }
      }
      if (p.kind === 'dock' && save.sub && save.sub.dock === p.id) {
        if (save.sub.stage === 'frame') {
          refund(SUB_COST);
          save.sub = null;
        } else save.sub.docked = false;
      }
      build.removePiece(p);
    }
    if (buried.length) {
      baseView.sync(layout);
      tankLife.sync(save, layout);
      linesView.sync(save, layout);
      const names = buried.map((p) => PIECES[p.kind].name.toLowerCase());
      setTimeout(
        () =>
          hud.toast(
            `The Kestrel trench has been reshaped into rock terraces. ${buried.length} piece${buried.length > 1 ? 's' : ''} inside the new rock came out (${names.join(', ')}), and everything in them is back in storage.${
              moved ? ` ${moved} creature${moved > 1 ? 's' : ''} moved to another tank.` : ''
            }${freed ? ` ${freed} creature${freed > 1 ? 's' : ''} had no tank with room and swam home.` : ''}`,
            'big',
          ),
        2000,
      );
      hud.refreshInventory();
    }
    // Lift the diver and the sub out if they were saved where the rock is now.
    for (let k = 0; k < 60 && isSolid(diver.x, diver.y); k++) diver.y -= 12;
    for (let k = 0; k < 60 && (isSolid(sub.x, sub.y) || isSolid(sub.x, sub.y + 40)); k++) sub.y -= 12;
    // The old far basin is solid wall now: anyone still inside it goes back to the buoy.
    if (isSolid(diver.x, diver.y)) {
      diver.x = SPAWN.x;
      diver.y = SPAWN.y;
    }
    if (isSolid(sub.x, sub.y) || isSolid(sub.x, sub.y + 40)) {
      sub.x = SPAWN.x;
      sub.y = SPAWN.y + 60;
    }
    if (save.sub?.aboard) {
      diver.x = sub.x;
      diver.y = sub.y - 10;
    }
    // (Saved by the regular autosave a few seconds in: persist() isn't ready this early.)
  }

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

  /**
   * Base actions on the Collect button (Colin, after milestone 6): nothing
   * moves just by swimming past. Stop by a storage pod and tap Collect to
   * unload; stop by a tank and tap it to take what waits in the output tray.
   */
  /** Put the creature in the specimen jar into a tank (a tap of Collect at the tank). */
  function depositJar(tankId: number): void {
    const j = save.jar;
    if (!j) return;
    if (creaturesIn(save, tankId).length >= tankCapacity(layout, tankId)) {
      hud.toast(`Tank ${tankNumber(layout, tankId)} is full (${tankCapacity(layout, tankId)} creatures). Build another creature tank.`, 'warn');
      return;
    }
    if (j.keep) {
      j.keep.tank = tankId;
      save.creatures.push(j.keep);
    } else newCreature(save, j.species, j.stage === 'egg' ? 'egg' : 'young', tankId, j.traits);
    save.jar = null;
    tankLife.sync(save, layout);
    drone.cheer();
    const sp = SPECIES[j.species];
    hud.toast(`${j.stage === 'egg' ? `The ${sp.eggName} is` : `The ${sp.name.toLowerCase()} is`} in tank ${tankNumber(layout, tankId)}. Tap Tend to look after it.`, 'big');
    if (!save.tips.includes('care')) {
      save.tips.push('care');
      setTimeout(
        () => hud.toast('Creatures need food (kelp flakes), comfort (the right plant and company) and clean water (a filter pump). Happy ones grow and make materials.', 'big'),
        2500,
      );
    }
    persist();
  }
  function takeTray(tankId: number): void {
    const td = save.tankData[String(tankId)];
    if (!td?.out) return;
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
      hud.toast(`Took ${what.join(' and ')} from tank ${tankNumber(layout, tankId)}'s output tray`, 'item');
      hud.refreshInventory();
      persist();
    } else hud.toast('Dive bag full: the output tray stays where it is', 'warn');
  }
  /** The storage pods the diver (or the sub) is next to. */
  function podNear(): { by: boolean; powered: boolean; frame: boolean } {
    const out = { by: false, powered: false, frame: false };
    for (const p of layout.pieces) {
      if (!isStoreKind(p.kind)) continue;
      const r = pieceRect(p);
      if (diver.x > r.x - 40 && diver.x < r.x + r.w + 40 && diver.y > r.y - 40 && diver.y < r.y + r.h + 40) {
        out.by = true;
        out.powered ||= layout.powered.has(p.id);
        out.frame ||= !isDone(p);
      }
    }
    return out;
  }
  function unloadAtPod(pod: { powered: boolean; frame: boolean }): void {
    if (!pod.powered) {
      hud.toast(pod.frame ? 'This storage pod is still a frame: the drone has to finish it first' : 'This storage pod has no power: join it to a current turbine', 'warn');
      return;
    }
    let moved = 0;
    for (const k of MATERIALS_LIST) {
      const n = Math.min(storageRoom(k), save.bag[k]);
      save.bag[k] -= n;
      save.stored[k] += n;
      moved += n;
    }
    if (moved) hud.toast(`Stored ${moved} item${moved === 1 ? '' : 's'} in the base${MATERIALS_LIST.some((k) => save.bag[k]) ? ' (storage is full)' : ''}`, 'big');
    else hud.toast('Storage is full: build another storage pod', 'warn');
    hud.refreshInventory();
    persist();
  }
  let collectWas = false;

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
    // Fade in as they climb out of the hatch (the pilot rises out of the seat in Sub.draw).
    diver.view.alpha = 0;
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
    sound.breach();
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
  let lastViewW = 1000;
  /** What the diver's kit looks like: the gear found and built so far, carried on the body. */
  function kitLook(): KitLook {
    return {
      tanks: save.tanks.length,
      spear: hasGear(save, 'tow'),
      jar: save.kit.jar,
      thruster: save.kit.thruster,
      psuit: hasGear(save, 'psuit2') ? 2 : hasGear(save, 'psuit') ? 1 : 0,
      resonator: hasGear(save, 'resonator'),
      satchel: hasGear(save, 'satchel'),
      flare: hasGear(save, 'flare'),
      visor: hasGear(save, 'visor'),
      boots: hasGear(save, 'boots'),
      cowl: hasGear(save, 'cowl'),
      dash: hasGear(save, 'dash'),
    };
  }
  let noThrusterAt = -99;
  /** The SLED 2 recorder still lies out on the sand (not taken, decoded or being decoded). */
  function recorderOut(): boolean {
    return !save.finds.includes('recorder') && !save.blueprints.includes('light') && !hasGear(save, 'light') && !Object.values(save.jobs).some((j) => j.id === 'research:light');
  }
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
  function respawnPoint(fromX: number, fromY: number): { x: number; y: number; dome: boolean; sub: boolean; relay: boolean } {
    let best: { x: number; y: number; dome: boolean; sub: boolean; d: number } | null = null;
    const domes = layout.pieces.filter((p) => p.kind === 'dome' && layout.powered.has(p.id));
    if (domes.length) {
      const a = airlockOutside(domes[0]);
      const x = a.x;
      const y = a.y;
      best = { x, y, dome: true, sub: false, d: Math.hypot(x - fromX, y - fromY) };
    }
    const S = save.sub;
    if (S && S.stage === 'built' && S.hull > 0 && S.air > 20) {
      const d = Math.hypot(sub.x - fromX, sub.y - fromY);
      if (!best || d < best.d) best = { x: sub.x, y: sub.y - 10, dome: false, sub: true, d };
    }
    // Milestone 7 part 2: the nearest air relay.
    let relay = false;
    for (const r of save.relays) {
      const d = Math.hypot(r.x - fromX, r.y - fromY);
      if (!best || d < best.d) {
        best = { x: r.x + 40, y: r.y - 60, dome: false, sub: false, d };
        relay = true;
      }
    }
    return best ? { ...best, relay } : { ...SPAWN, dome: false, sub: false, relay: false };
  }
  let insideDome: number | null = null;
  // ---- Milestone 10: crush depth (Colin's numbers: Kestrel suit 30 m, PS-1 60 m, PS-2 110 m; KS-1 45 m, plated 120 m) ----
  const diverLimit = () => (hasGear(save, 'psuit2') ? CRUSH.ps2 : hasGear(save, 'psuit') ? CRUSH.ps1 : CRUSH.kestrel);
  const subLimit = () => (save.sub?.plating ? CRUSH.plated : CRUSH.sub);
  let crushClock = 0;
  /** Milestone 11: whether the Choir gates are drawn (after contact). */
  let gatesShown = false;
  let crushWarnDiver = false;
  let crushWarnSub = false;
  /** Is the diver (or the sub) past its crush depth right now? For the banner. */
  let crushing: 'diver' | 'sub' | null = null;
  const watch = new DiveWatch(document.getElementById('watch') as HTMLCanvasElement);
  const hintEl = document.getElementById('hint')!;
  let hintTimer = 0;

  // ---- Saving ----
  let saveTimer = 0;
  function persist(): void {
    if (blackout > 0) return; // save once the diver is back at the buoy
    const outAt = inside === 'base' || peek ? baseOutside() : null;
    save.x = outAt ? outAt.x : inside === 'corvina' ? CV_HATCH.x : inside === 'fulmar' ? FULMAR_HATCH.x : inside === 'sanctum' ? SANCTUM.heart.x : diver.x;
    save.y = outAt ? outAt.y : inside === 'corvina' ? CV_HATCH.y - 70 : inside === 'fulmar' ? FULMAR_HATCH.y - 70 : inside === 'sanctum' ? SANCTUM.heart.y - 70 : diver.y;
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

  if (!loaded.loaded && !BENCH) {
    setTimeout(() => hud.toast('Explore the shallows: scan new things and gather materials for the base', 'big'), 1500);
  } else if (save.oxygen <= 0) {
    save.oxygen = maxOxygen(save);
  }

  let cssW = window.innerWidth;
  let cssH = window.innerHeight;
  let zoom = 1;
  let builtDetail = preset.detail;

  /** Size the post stack's pictures and pick half-float or the 8-bit fallback (from the preset and the Settings toggles). */
  function applyPost(res = pixelRatioFor(preset, cssW, cssH)): void {
    post.resize(cssW, cssH, res, preset.hdr && fx.hdr, preset.bloomLevels, fx.bloom && preset.bloom > 0, preset.bloomScale, fx.edges ?? preset.hdrMsaa);
    // G2: the interiors' lighting follows the same settings (the helmet lamp and the nearest room lamps cast shadows).
    interior.look = {
      shadowLights: fx.shadows ? preset.lightShadows + 1 : 0,
      shadowSteps: Math.min(32, Math.round(preset.shadowSteps * 1.3)),
      relief: fx.relief ? preset.relief : 0,
    };
  }

  function rebuild(): void {
    cssW = window.innerWidth;
    cssH = window.innerHeight;
    const res = pixelRatioFor(preset, cssW, cssH);
    renderer.resize(cssW, cssH, res);
    app.ticker.maxFPS = preset.maxFps;
    zoom = cssH / VIEW_H;
    litRT.resize(cssW, cssH, res);
    applyPost(res);
    interior.resize(cssW, cssH, res);
    glowRT.resize(cssW, cssH, res * preset.glowResolution);
    blur.quality = preset.glowQuality;
    blur.resolution = res * preset.glowResolution;
    blur.strength = 9 * zoom;
    backdrop.build(preset.parallaxLayers);
    snow.build(renderer, preset.particleDensity, cssW, cssH, fx.litSnow ? preset.bokeh : 0);
    if (builtDetail !== preset.detail) {
      scenery.view.destroy({ children: true });
      scenery = new Scenery(renderer, preset.detail, shallowsArt?.reef, shallowsSeabed ?? undefined, shallowsKelp ?? undefined, forestOutcrop, worldArt);
      builtDetail = preset.detail;
      populate();
    }
    ui.refresh();
  }

  // ---- Milestone 12: adaptive resolution ----
  // Every 2 s of play, compare the average frame time with the preset's budget.
  // Too slow: step the render scale down by 0.1. Comfortably at the cap for 8 s
  // (and 30 s after the last step down): step it back up. Only the render
  // targets are resized, not the scene.
  const adapt = { ms: 0, n: 0, good: 0, sinceDown: 99 };
  function resizeTargets(): void {
    const res = pixelRatioFor(preset, cssW, cssH);
    renderer.resize(cssW, cssH, res);
    litRT.resize(cssW, cssH, res);
    applyPost(res);
    interior.resize(cssW, cssH, res);
    glowRT.resize(cssW, cssH, res * preset.glowResolution);
    blur.resolution = res * preset.glowResolution;
  }
  function adaptFrame(deltaMS: number): void {
    if (!fx.adaptive || document.hidden || bench.active) {
      if (!fx.adaptive && renderScale.v !== 1) {
        renderScale.v = 1;
        resizeTargets();
      }
      return;
    }
    if (deltaMS > 250) return; // a hitch (tab switch, a long load), not a slow scene
    adapt.ms += deltaMS;
    adapt.n++;
    if (adapt.ms < 2000) return;
    const avg = adapt.ms / adapt.n;
    adapt.ms = 0;
    adapt.n = 0;
    adapt.sinceDown += 2;
    const budget = 1000 / preset.maxFps;
    if (avg > budget * 1.18 && renderScale.v > RENDER_SCALE_MIN + 0.001) {
      renderScale.v = Math.max(RENDER_SCALE_MIN, Math.round((renderScale.v - 0.1) * 10) / 10);
      adapt.good = 0;
      adapt.sinceDown = 0;
      resizeTargets();
    } else if (avg <= budget * 1.04 && renderScale.v < 1) {
      adapt.good += 2;
      if (adapt.good >= 8 && adapt.sinceDown >= 30) {
        renderScale.v = Math.min(1, Math.round((renderScale.v + 0.1) * 10) / 10);
        adapt.good = 0;
        resizeTargets();
      }
    } else adapt.good = 0;
  }

  let fx: FxToggles = loadFx();
  renderBoost.v = fx.supersample ? preset.supersample : 1;
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
    onGear: () => menus.openPause(),
    getFx: () => fx,
    fxOn: (key) => (key === 'edges' ? (fx.edges ?? preset.hdrMsaa) : !!fx[key]),
    setFx: (key, on) => {
      fx = { ...fx, [key]: on };
      saveFx(fx);
      if (key === 'perf') perfOverlay.show(on);
      else if (key === 'supersample') {
        renderBoost.v = on ? preset.supersample : 1;
        rebuild();
      } else if (key === 'litSnow') snow.build(renderer, preset.particleDensity, cssW, cssH, on ? preset.bokeh : 0);
      else if (key === 'hdr' || key === 'bloom' || key === 'edges' || key === 'shadows' || key === 'relief') applyPost();
    },
    fxNote: () => (post.supportsHalfFloat ? (post.halfFloat ? 'HDR picture: half-float' : 'HDR picture: off (8-bit)') : 'This device cannot render to half-float, so the picture is 8-bit: tone mapping is off (nothing to roll off) and bloom starts lower.'),
    setChoice: (c) => {
      choice = c;
      saveChoice(c);
      preset = resolveChoice(c);
      renderBoost.v = fx.supersample ? preset.supersample : 1;
      rebuild();
    },
  });

  // ---- Milestone 12: the title screen, the pause menu and moving a save ----
  const menus = new Menus({
    getSave: () => save,
    hadSave: loaded.loaded,
    persist: () => persist(),
    resetProgress: () => {
      clearSave();
      resetting = true;
      location.reload();
    },
    openSettings: () => {
      ui.open();
      soundUI.refresh();
    },
    openLog: () => document.getElementById('log-btn')!.click(),
    buildId: __BUILD_ID__,
    onPause: (p) => audio.setPaused(p),
    panelOpen: () =>
      build.active || care.active || dockUI.active || station.active || hatchPanel.active || contact.active || zoneMap.open || hud.reading || rates.open || !settingsPanel.hidden || !logPanel.hidden,
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !logPanel.hidden) document.getElementById('log-btn')!.click();
  });
  if (!urlq.has('notitle') && !urlq.has('at') && !urlq.has('bench')) menus.showTitle();
  let pausedFrames = 0;

  let resetting = false;
  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(rebuild, 120);
    pausedFrames = -30;
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  rebuild();

  // Camera: follows the diver smoothly, looking a little ahead of where they swim.
  /** The benchmark's own zoom, on top of the player's (never saved). */
  let benchZoom = 1;
  let camCX = diver.x + 120;
  let camCY = diver.y + 40;
  let time = 0;

  // ---- KD-1's delivery run (Colin, after milestone 12) ----
  /** Items in KD-1's cargo cradle. */
  function cargoCount(): number {
    let n = 0;
    for (const k of MATERIALS_LIST) n += save.droneCargo?.[k] ?? 0;
    return n;
  }
  /** A point just above the powered storage pod nearest a spot, or null if there is none. */
  function haulPod(x: number, y: number): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let bd = Infinity;
    for (const p of layout.pieces) {
      if (!isStoreKind(p.kind) || !isDone(p) || !layout.powered.has(p.id)) continue;
      const r = pieceRect(p);
      const q = { x: r.x + r.w / 2, y: r.y - 34 };
      const d = Math.hypot(q.x - x, q.y - y);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
    return best;
  }
  /** H (d-pad down, or the Send button): KD-1 takes the dive bag's materials to base storage. */
  function sendHaul(): void {
    if (!save.kit.carrier) return;
    if (save.drone !== 'active') {
      hud.toast('KD-1 has to be repaired before it can carry anything (it lies in the survey sled wreck).', 'warn');
      return;
    }
    const can = drone.canHaul();
    if (can === 'away') {
      hud.toast(`KD-1 is already on a delivery: back in about ${Math.ceil(drone.haulEta())} s.`, 'warn');
      return;
    }
    if (can === 'busy') {
      hud.toast('KD-1 is welding a frame. Send it once the frame is finished.', 'warn');
      return;
    }
    if (can !== 'ok') return;
    const bagged = MATERIALS_LIST.reduce((t, k) => t + save.bag[k], 0);
    if (!bagged && !cargoCount()) {
      hud.toast('Your dive bag is empty: nothing for KD-1 to carry.', 'warn');
      return;
    }
    const pod = haulPod(drone.x, drone.y);
    if (!pod) {
      hud.toast('KD-1 needs a finished, powered storage pod at the base to deliver to.', 'warn');
      return;
    }
    const eta = drone.startHaul(pod);
    if (eta === null) {
      hud.toast("KD-1 can't find a way through the water back to the base from here.", 'warn');
      return;
    }
    // Into the cradle: everything in the bag (creatures in the jar stay with you).
    const cargo = (save.droneCargo ??= {});
    for (const k of MATERIALS_LIST) {
      if (!save.bag[k]) continue;
      cargo[k] = (cargo[k] ?? 0) + save.bag[k];
      save.bag[k] = 0;
    }
    const n = cargoCount();
    if (build.active) build.close();
    hud.refreshInventory();
    sound.find('bag');
    hud.toast(`KD-1 takes ${n} item${n === 1 ? '' : 's'} to base storage: back in about ${Math.ceil(eta)} s. No building until it's home.`, 'big');
    if (!save.tips.includes('haul')) {
      save.tips.push('haul');
      setTimeout(() => hud.toast('KD-1 flies the long way round, through open water: the further from the base you are, the longer the trip.', 'big'), 3200);
    }
    persist();
  }
  /** KD-1 is over the storage pod: unload what fits. */
  function haulDrop(): void {
    const cargo = save.droneCargo ?? {};
    let moved = 0;
    for (const k of MATERIALS_LIST) {
      const n = Math.min(storageRoom(k), cargo[k] ?? 0);
      if (!n) continue;
      cargo[k] = (cargo[k] ?? 0) - n;
      if (!cargo[k]) delete cargo[k];
      save.stored[k] += n;
      moved += n;
    }
    const left = cargoCount();
    if (moved) hud.toast(`KD-1 stored ${moved} item${moved === 1 ? '' : 's'} in the base${left ? `; storage is full, so it keeps ${left}` : ''}. Heading back.`, 'item');
    else if (left) hud.toast(`Base storage is full: KD-1 keeps ${left} item${left === 1 ? '' : 's'} in its cradle. Build another storage pod.`, 'warn');
    hud.refreshInventory();
    persist();
  }
  const haulBtn = document.getElementById('btn-haul') as HTMLButtonElement;
  // Benchmark runs only: a handle for headless checks of the delivery run.
  if (BENCH) (window as unknown as { __haul: unknown }).__haul = { drone, save, send: sendHaul, cargo: cargoCount };

  /**
   * The base's own clock: the build drone, Labs and Workshops, salvage cranes,
   * the factory lines and creature care. Runs outside, and inside the base on
   * foot (Colin: the base keeps working while you're in it).
   */
  function simBase(dt: number, at: { x: number; y: number; face: number; speed: number; repairing: boolean; aboard: boolean }): void {
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
    drone.cradle = !!save.kit.carrier;
    drone.loaded = cargoCount() > 0;
    for (const ev of drone.update(dt, time, {
      diverX: at.x,
      diverY: at.y,
      diverFace: at.face,
      diverSpeed: at.speed,
      repairing: at.repairing,
      layout,
      rate: droneWeldRate(save),
      extra: subJob,
      gap: at.aboard ? { x: 165, y: 86 } : undefined,
    })) {
      if (ev.type === 'haulDrop') {
        haulDrop();
        continue;
      }
      if (ev.type === 'haulHome') {
        const left = cargoCount();
        hud.toast(left ? `KD-1 is back, still holding ${left} item${left === 1 ? '' : 's'} (storage was full). You can build again.` : 'KD-1 is back. You can build again.', 'big');
        continue;
      }
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
        const net = layout.netFor(p.id);
        if (net && net.rate < 1 && !save.tips.includes('powershort')) {
          save.tips.push('powershort');
          hud.toast(`The base now draws ${net.draw} W but makes ${net.make} W: machines run at ${Math.round(net.rate * 100)}% speed. Add a power source (the build title shows the meter).`, 'warn');
        }
        hud.toast(
          `Finished: ${PIECES[p.kind].name}${!POWER_MAKE[p.kind] && !powered ? ' (no power yet: join it to a current turbine)' : ''}`,
          'big',
        );
        if (build.active) build.refresh();
        persist();
      }
    }
    if (build.active && (drone.welding || build.selected || build.selectedLine !== null) && Math.floor(time * 2) !== Math.floor((time - dt) * 2)) build.refresh();

    hud.setJar(jarText());

    // ---- Labs and Workshops (milestone 7) ----
    for (const ev of tickStations(save, layout, dt)) {
      drone.cheer();
      if (ev.type === 'decoded') {
        hud.toast(
          `${pieceCode(layout, ev.piece)} decoded the ${RESEARCH[ev.id].name.toLowerCase()}! ${
            PIECE_BLUEPRINTS[ev.id] ? 'Its build card is in build mode now.' : (OTHER_BLUEPRINTS[ev.id] ?? 'Build it in a Workshop.')
          }`,
          'big',
        );
        if (!layout.pieces.some((p) => p.kind === 'workshop'))
          setTimeout(() => hud.toast('A Workshop (build card 11) builds gear from blueprints. It takes hull plating from the plate press.', 'big'), 2600);
      } else {
        const g = GEAR[ev.id];
        hud.toast(
          ev.id === 'light'
            ? `${g.name} ${g.code} built and clipped to your suit! It replaces the shoulder lamp: much brighter and wider. The dark cave in the east cliff is open to you now.`
            : ev.id === 'psuit'
              ? `${g.name} ${g.code} built! You wear it from now on: rated to 60 m instead of 30. The trench's upper ledges are in reach.`
              : ev.id === 'psuit2'
                ? `${g.name} ${g.code} built! Rated to 110 m: the trench floor, and the drowned station, are in reach.`
                : ev.id === 'resonator'
                  ? `${g.name} ${g.code} built! Its hoop rides on your pack and its bracer on your arm, humming in colours nothing on the reef makes. The fourth fragment said: down and east, past the trench floor. Look for a door at the floor's far end.`
                  : `${g.name} ${g.code} built!`,
          'big',
        );
      }
      persist();
    }

    // ---- Milestone 10: the Signal array decodes pattern spools ----
    for (const ev of tickSignals(save, layout, dt)) {
      if (ev.type !== 'decoded') continue;
      drone.cheer();
      sound.find('whorl');
      const n = FRAGMENTS.findIndex((f) => f.id === ev.id) + 1;
      hud.toast(`The Signal array decoded fragment ${n}! Read it at the array's console, or in the scanner log.`, 'big');
      persist();
    }

    // ---- Salvage cranes (milestone 8 part 2): one piece a minute per crane, into storage ----
    {
      // Milestone 12: a crane on a network short of power works slower.
      const cranes = layout.pieces.filter((p) => p.kind === 'crane' && isDone(p) && layout.powered.has(p.id)).reduce((n, p) => n + layout.powerRate(p.id), 0);
      if (cranes && save.craneQueue > 0) {
        save.craneProgress = Math.min(1, save.craneProgress + (dt * cranes) / 60);
        // It waits, holding the piece, until storage has room for everything it makes.
        const roomFor = storageRoom('scrap') >= 4 && storageRoom('brass') >= 2 && storageRoom('plate') >= 1;
        if (save.craneProgress >= 1 && !roomFor && !save.tips.includes('cranefull')) {
          save.tips.push('cranefull');
          hud.toast('The salvage crane is waiting: storage needs room for 4 scrap, 2 brass and 1 plating.', 'warn');
        }
        if (save.craneProgress >= 1 && roomFor) {
          save.craneProgress = 0;
          save.craneQueue--;
          const out: [keyof typeof save.stored, number][] = [
            ['scrap', 4],
            ['brass', 2],
            ['plate', 1],
          ];
          let lost = 0;
          for (const [k, n] of out) {
            const into = Math.min(n, storageRoom(k));
            save.stored[k] += into;
            lost += n - into;
          }
          void lost;
          hud.toast('The salvage crane broke down a piece: +4 scrap, +2 brass, +1 hull plating', 'big');
          hud.refreshInventory();
          persist();
        }
      } else if (!save.craneQueue) save.craneProgress = 0;
    }
    // The salvage hanging from the sub's claw.
    {
      const sv = save.sub?.salvage ? SALVAGE.findIndex((x) => x.id === save.sub!.salvage) : -1;
      scenery.setCarried(sv >= 0 && save.sub ? sub.clawPoint() : null, sv);
    }

    // ---- Factory (milestone 5): conveyors, the auto feeder and feed pipes ----
    factory.tick(save, layout, dt, storageRoom);

    // ---- Creature care: needs run on play time ----
    for (const ev of tickCare(save, layout, dt)) {
      const name = SPECIES[ev.c.species].name;
      const where = ev.c.tank < 0 ? "the Hatchery" : `tank ${tankNumber(layout, ev.c.tank)}`;
      // Milestone 9: breeding.
      if (ev.type === 'laid') {
        const tp = layout.pieces.find((q) => q.id === ev.parents[0].tank);
        hud.toast(`A ${name.toLowerCase()} pair in ${tp ? pieceCode(layout, tp) : 'a tank'} laid an egg: it is in the Hatchery (${traitText(ev.c.species, ev.c.traits!)}).`, 'big');
        if (!save.tips.includes('laid')) {
          save.tips.push('laid');
          setTimeout(() => hud.toast('Eggs hatch in the Hatchery. Then stand at its console inside the base and choose a tank for each young one.', 'big'), 2600);
        }
        persist();
        continue;
      }
      if (ev.type === 'nursery-hatched') {
        hud.toast(`A ${name.toLowerCase()} hatched in the Hatchery: ${traitText(ev.c.species, ev.c.traits!)}. Choose a tank for it at the Hatchery console.`, 'big');
        if (!save.tips.includes('younghunger')) {
          save.tips.push('younghunger');
          setTimeout(() => hud.toast('Young in the Hatchery get hungry while they wait: run a feed pipe from an auto feeder into it, or feed them by hand at its console.', 'big'), 5000);
        }
        baseHooks?.syncTanks();
        persist();
        continue;
      }
      if (ev.type === 'hatched') hud.toast(`The ${name.toLowerCase()} eggs hatched in ${where}! The fry need feeding.`, 'big');
      else if (ev.type === 'grown') hud.toast(`The ${name.toLowerCase()} in ${where} is fully grown, and glows brighter`, 'big');
      else if (ev.type === 'sick') hud.toast(`The ${name.toLowerCase()} in ${where} is sick (${ev.why}). Tend it soon.`, 'warn');
      else if (ev.type === 'better') hud.toast(`The ${name.toLowerCase()} in ${where} is feeling better`);
      else if (ev.type === 'dormant')
        hud.toast(
          `The ${name.toLowerCase()} in ${where} went dormant. Its remains are kept in storage: ${
            layout.pieces.some((q) => q.kind === 'revive') ? 'a glowing bloom in the Revival pool can wake it' : 'a Revival pool could wake it, if one were found'
          }.`,
          'warn',
        );
      else if (ev.type === 'made') {
        const belt = save.lines.some((l) => l.kind === 'belt' && l.from === ev.c.tank);
        hud.toast(`+1 ${MATERIALS[ev.kind].name} from the ${name.toLowerCase()} (${belt ? 'on the conveyor' : `in ${where}'s output tray`})`);
        if (!belt && !save.tips.includes('tray')) {
          save.tips.push('tray');
          setTimeout(
            () =>
              hud.toast(
                "What creatures make now waits in their tank's output tray (4 items). Stop by the tank and tap Collect to take it, or run a conveyor from the tank to a storage pod or a machine.",
                'big',
              ),
            2400,
          );
        }
      }
      if (ev.type !== 'made' && ev.type !== 'better') {
        tankLife.sync(save, layout);
        baseHooks?.syncTanks();
      }
      persist();
    }


  }

  // ---- Measuring (graphics session G1): the performance overlay and the ?bench route ----
  const perfOverlay = new PerfOverlay();
  perfOverlay.show(fx.perf);
  const bench = new Bench({
    enter: (i) => {
      const sc = BENCH_SCENES[i];
      // Leave an interior left over from the last scene.
      if (interior.active && inside === 'base' && !sc.interior) exitBase(baseDome ?? -1);
      benchZoom = sc.zoom;
      if (sc.interior) {
        const dome = layout.pieces.find((q) => q.kind === 'dome');
        if (!dome) return;
        enterBase(dome.id);
        // Stand in the first press room (or any machine with a belt), where the ceiling lines run.
        const press = layout.pieces.find((q) => q.kind === 'press' && save.lines.some((l) => l.from === q.id || l.to === q.id)) ?? layout.pieces.find((q) => q.kind === 'press');
        const at = press && baseHooks ? baseHooks.dockSpawn(press.id) : null;
        if (at) interior.place(at.x, at.y, 1);
        // ?bench&scene=6&at=x,y stands in the base interior at that spot (tiles are 40 units), for screenshots.
        const atq = new URLSearchParams(location.search).get('at');
        if (atq) {
          const [ax, ay] = atq.split(',').map(Number);
          if (Number.isFinite(ax) && Number.isFinite(ay)) interior.place(ax, ay, 1);
        }
        interior.lampOn = true;
        return;
      }
      const p = scenePos(sc);
      diver.x = p.x;
      diver.y = p.y;
      diver.vx = diver.vy = 0;
      diver.surfaced = false;
      diver.lampOn = sc.lamp;
      camCX = p.x + 60;
      camCY = p.y + 30;
      viewH = VIEW_H * sc.zoom;
    },
    info: () => `${preset.label} preset · ${app.canvas.width}x${app.canvas.height} · ${renderer.type === 1 ? 'WebGL' : 'WebGPU'} · GPU ${perf.gpuName}${perf.software ? ' (SOFTWARE: frame times are relative only)' : ''} · timer queries ${perf.hasGpuTimer ? 'yes' : 'no'} · build ${__BUILD_ID__} · ${navigator.userAgent.slice(0, 90)}`,
    done: () => {
      if (interior.active && inside === 'base') exitBase(baseDome ?? -1);
      benchZoom = 1;
    },
  });
  if (BENCH) {
    perf.enable(true);
    perf.onFrame = (f) => bench.tick(f, performance.now());
    setTimeout(() => bench.start(performance.now()), 2500);
  }
  // Zone weights for the colour grade, eased so crossing a boundary never pops.
  const zoneNow: ZoneWeights = { shallows: 1, basin: 0, forest: 0, cave: 0, shelf: 0, trench: 0, sanctum: 0 };
  let zoneEased = false;
  function drawPost(deltaMS: number): void {
    const dt = Math.min(deltaMS / 1000, 0.1);
    const at = save.sub?.aboard ? sub : diver;
    const target = zoneMix(at.x, at.y);
    const k = zoneEased ? 1 - Math.exp(-2.5 * dt) : 1;
    zoneEased = true;
    for (const z of ['shallows', 'basin', 'forest', 'cave', 'shelf', 'trench', 'sanctum'] as const) zoneNow[z] += (target[z] - zoneNow[z]) * k;
    post.update({
      time,
      cssW,
      cssH,
      zone: interior.active ? null : zoneNow,
      // An 8-bit picture can't hold light brighter than white, so there is nothing for the shoulder to roll off
      // (it would only dim the highlights), and bloom has to start lower to catch anything at all.
      tone: fx.tone && post.halfFloat ? preset.toneMap : 0,
      grade: fx.grade ? preset.grade : 0,
      bloom: fx.bloom ? preset.bloom : 0,
      vignette: fx.vignette ? preset.vignette : 0,
      grain: fx.grain ? preset.grain : 0,
      bloomThreshold: post.halfFloat ? preset.bloomThreshold : preset.bloomThreshold - 0.18,
      bloomGlowFeed: preset.bloomGlowFeed,
      // G3: rays only near the surface (they fade out with depth) and only where the sun can reach.
      rays: fx.rays && !interior.active ? preset.godRays * Math.exp(-Math.max(0, camCY) / 650) : 0,
      raySteps: preset.godRaySteps,
      rayPhase: camCX * 0.0016,
    });
    perf.pass('scene', () => renderer.render({ container: hdrRoot, target: post.sceneRT, clear: true, clearColor: '#0b2a33' }));
    perf.pass('rays', () => post.renderRays());
    perf.pass('bloom', () => post.renderBloom());
    perf.pass('post', () => app.render());
  }
  // First thing each frame: start the clock, and pin the benchmark's diver in place.
  app.ticker.add(
    () => {
      perf.frameStart();
      const sc = bench.scene;
      if (!bench.active || !sc || sc.interior || interior.active) return;
      const p = scenePos(sc);
      const sway = STILL ? 0 : Math.sin(bench.elapsed(performance.now()) * 0.7) * sc.sway;
      diver.x = p.x + sway;
      diver.y = p.y;
      diver.vx = diver.vy = 0;
      diver.surfaced = false;
      // Hold the framing too, so a slow machine's easing camera cannot differ between runs.
      camCX = diver.x + 60;
      camCY = diver.y + 30;
      viewH = VIEW_H * sc.zoom;
      save.oxygen = maxOxygen(save);
      save.suit = 1;
      diver.lampOn = sc.lamp;
    },
    undefined,
    UPDATE_PRIORITY.HIGH,
  );
  // Last: Pixi's own draw of the stage is timed as a pass of its own.
  app.ticker.remove(app.render, app);
  app.ticker.add(
    (ticker) => {
      perf.markUpdate();
      perf.width = app.canvas.width;
      perf.height = app.canvas.height;
      // Paused: draw a few frames to settle, then stop drawing (saves the battery; the picture stays).
      if (pausedFrames > 3) return;
      if (pausedFrames === 0) adaptFrame(ticker.deltaMS);
      drawPost(ticker.elapsedMS);
      perf.frameEnd(ticker.elapsedMS);
      perfOverlay.tick(perf.last, performance.now());
    },
    undefined,
    UPDATE_PRIORITY.LOW,
  );

  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS / 1000, 0.05);
    time += dt;
    // Milestone 12: the gamepad drives whichever panel or menu is on screen.
    padNav.update(dt);
    menus.update();
    // The title screen and the pause menu hold the world still.
    if (menus.paused) {
      diver.cancelSurfaceReaction();
      pausedFrames++;
      return;
    }
    pausedFrames = 0;
    if (interior.active) {
      diver.cancelSurfaceReaction();
      interiorFrame(dt, ticker.deltaMS);
      return;
    }

    motion?.advance(time);
    surfaceMotion?.update(dt);
    const incomingVY = diver.vy;
    // Build mode: only at the Kestrel site, and not while blacking out.
    const atSite = diver.x > GRID_X0 - 260 && diver.x < GRID_X1 + 260 && diver.y < GRID_BASE + 120;
    build.setAvailable(atSite && blackout === 0 && !care.active && !dockUI.active && !station.active);
    const aboardNow = !!save.sub?.aboard;
    if (!padNav.active) build.pollPad(dt);
    build.tick(dt);
    if (!build.active && rates.open) rates.close();
    rates.update(dt);
    // The walkable base: tanks, Labs and Workshops are used from inside now. A console
    // inside opens their panel out here for a moment (peek), and closing it goes back in.
    if (peek && !peek.opened) {
      peek.opened = true;
      if (peek.kind === 'care' && peek.id !== null) {
        care.setAvailable(peek.id);
        care.open(peek.id);
      } else if (peek.kind === 'station' && peek.id !== null) {
        station.setAvailable(peek.id);
        station.open(peek.id);
      } else if (peek.kind === 'dock' && peek.id !== null) {
        dockUI.setAvailable(peek.id);
        dockUI.open(peek.id);
      } else {
        build.setAvailable(true);
        build.open();
        // Fitting whorls: the machine you stood at is already selected.
        const sel = peek.select !== null ? layout.pieces.find((q) => q.id === peek!.select) : null;
        if (sel) {
          build.selected = sel;
          build.refresh();
        }
      }
    } else if (peek && !build.active && !care.active && !dockUI.active && !station.active) {
      backInside();
      return;
    }
    void tankAround;
    void stationAround;
    const tankHere = null as Placed | null;
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
    // Milestone 7: the Lab / Workshop button beside a finished one.
    const stationHere =
      null as Placed | null;
    station.setAvailable(stationHere?.id ?? (station.active ? station.pieceId : null));
    station.update(dt);
    if (stationHere && !save.tips.includes('station-' + stationHere.kind) && blackout === 0) {
      save.tips.push('station-' + stationHere.kind);
      hud.toast(
        stationHere.kind === 'lab'
          ? `Lab: tap Lab${input.state.lastDevice === 'touch' ? '' : ' (K)'} to decode data finds and scans into blueprints`
          : `Workshop: tap Workshop${input.state.lastDevice === 'touch' ? '' : ' (K)'} to build gear from the blueprints the Lab decodes`,
        'big',
      );
    }
    if (dockHere && !save.tips.includes('dock') && blackout === 0) {
      save.tips.push('dock');
      hud.toast(
        `Moon pool dock: tap Dock${input.state.lastDevice === 'touch' ? '' : ' (G)'} to build the submersible here, and later to repair and refit it`,
        'big',
      );
    }
    input.suspended = build.active || care.active || dockUI.active || station.active || padNav.active;
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
    const inControl = blackout === 0 && !build.active && !care.active && !dockUI.active && !station.active && !boarding && !(grapple && grapple.phase === 'reel');
    if (redesigned) {
      diver.visualAction = grapple ? 'grapple' : !inControl || input.suspended || s.collect || s.board || s.flare || s.dart
        ? 'busy' : s.scan ? 'scan' : 'free';
      diver.visualTarget = s.scan ? scanner.target : wildlife.target ?? scanner.target;
      diver.visualCurrent = motion ? Math.max(-1, Math.min(1, motion.sample(diver.x, diver.y, cameraFlow, true).x * diver.facing / 65)) : 0;
    }

    // ---- The submersible (milestone 6) ----
    const S = save.sub;
    if (S && inControl && s.board) {
      if (S.aboard) {
        // Berthed in a finished dock inside a base with a dome: the moon pool leads up into the base.
        const dk = S.docked ? layout.pieces.find((p) => p.id === S.dock && p.kind === 'dock' && isDone(p)) : null;
        const dm = dk ? layout.pieces.find((p) => p.kind === 'dome' && isDone(p)) : null;
        if (dk && dm && layout.powered.has(dk.id)) {
          leaveSub(true);
          enterBase(dm.id, false, dk.id);
          return;
        }
        leaveSub(false);
      } else if (nearSub) {
        // After milestone 7b (Colin): the diver swims to the hatch on top of the dome and climbs in.
        if (S.hull > 0) {
          boarding = { t: 0, x0: diver.x, y0: diver.y };
          diver.vx = diver.vy = 0;
        } else boardSub(false);
      }
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
    // Milestone 8: the race carries the sub west too. Until the flow vane is raised it is
    // stronger than the sub's thrusters; after, the top is calm and the deep race only slows it.
    if (save.sub?.aboard && !save.sub.docked) {
      const sr = raceAt(sub.x, sub.y);
      if (sr > 0) {
        const nx = sub.x - RACE.speed * (save.vane ? 0.5 : 1.4) * sr * dt * (save.sub.modules.includes('ballast') ? 0.2 : 1);
        if (!isSolid(nx - 150, sub.y) && !isSolid(nx - 150, sub.y + 40)) sub.x = nx;
      }
    }
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
        // The cave through the east cliff is too tight for the sub, from
        // either end (milestone 7: it goes over the cliff-top shelf instead).
        const inBand = (x: number) => sub.y > caveTop(x) - 70 && sub.y < caveBottom(x) + 60;
        const WEST_STOP = CAVE.x0 + 70;
        const EAST_STOP = 9740;
        if (sub.x < 9150 && sub.bowX() > WEST_STOP && sub.face > 0 && inBand(WEST_STOP)) {
          sub.x -= sub.bowX() - WEST_STOP;
          sub.vx = Math.min(0, sub.vx);
        }
        if (sub.x > 9150 && sub.bowX() < EAST_STOP && sub.face < 0 && inBand(EAST_STOP)) {
          sub.x += EAST_STOP - sub.bowX();
          sub.vx = Math.max(0, sub.vx);
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
        sound.dent(dmg);
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
        else if (S.aboard && inControl && blackout === 0) S.air = Math.max(0, S.air - dt * (sub.thrust > 0 ? 1.3 : 1) * (S.modules.includes('habitat') ? 0.25 : 1));
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
        let moved = 0;
        for (const k of MATERIALS_LIST) {
          const fromHold = Math.min(storageRoom(k), S.hold[k] ?? 0);
          if (fromHold) {
            S.hold[k] = (S.hold[k] ?? 0) - fromHold;
            if (!S.hold[k]) delete S.hold[k];
            save.stored[k] += fromHold;
            moved += fromHold;
          }
          if (S.aboard) {
            const n = Math.min(storageRoom(k), save.bag[k]);
            save.bag[k] -= n;
            save.stored[k] += n;
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
    subBubbles.update(dt, sub.x, 0, 0, 0, 0);
    nearSub = !!S && S.stage === 'built' && !S.aboard && blackout === 0 && Math.hypot(diver.x - sub.x, diver.y - (sub.y - 10)) < 170;
    hud.setBoard(inControl ? (aboard ? 'Exit' : nearSub ? (S!.hull > 0 ? 'Board' : 'Breached') : null) : null);
    if (nearSub && !wasNearSub && input.state.lastDevice !== 'touch' && !save.tips.includes('subkey')) {
      save.tips.push('subkey');
      hud.toast('KS-1: press V to climb in (RB on a gamepad)', 'big');
    }
    wasNearSub = nearSub;
    diver.view.visible = !aboard && !peek;
    diver.lens.visible = diver.lensGlow.visible = !aboard && !peek;

    // ---- The kelp caves (milestone 7 part 2): the cold surge in the squeeze ----
    kcTime += dt;
    const cyc = kcTime % SURGE_CYCLE;
    const surge = smooth(cyc / 0.7) * (1 - smooth((cyc - 3.6) / 0.7));
    const inSqueeze = !aboard && inShape(KC.squeeze, diver.x, diver.y) && !KC.pockets.some((p) => inShape(p, diver.x, diver.y));
    diver.current.x = inSqueeze ? -560 * surge - 25 : 0;
    // Milestone 8: the race sweeps west across the shelf edge. Holding on at an anchor ring shelters you.
    const raceHere = aboard ? 0 : raceAt(diver.x, diver.y);
    const atRing = ANCHORS.findIndex((r) => Math.hypot(diver.x - r.x, diver.y - r.y) < 80);
    diver.current.x += -RACE.speed * raceHere * (atRing >= 0 ? 0.1 : 1) * (0.85 + 0.15 * Math.sin(time * 0.7));
    // After milestone 12: mag-boots grip the seabed, so on the bottom currents hardly push.
    if (!aboard && hasGear(save, 'boots') && (isSolid(diver.x, diver.y + 44) || isSolid(diver.x - 14, diver.y + 44) || isSolid(diver.x + 14, diver.y + 44))) diver.current.x *= 0.12;
    scenery.updateRace(time, camX, camX + lastViewW);
    diver.current.y = 0;
    // Milestone 10: scalding plumes over the vent chimneys lift and burn; so does the sealed chimney.
    let scald = 0;
    if (!aboard && diver.x > TR_VENTS[0].x - 80 && diver.x < TR_VENTS[TR_VENTS.length - 1].x + 80) {
      for (const v of TR_VENTS) {
        const top = groundY(v.x) + 4 - v.h;
        if (Math.abs(diver.x - v.x) < 46 + (top - diver.y) * 0.08 && diver.y < top + 20 && diver.y > top - 360) {
          scald = Math.max(scald, 1 - (top - diver.y) / 400);
          diver.current.y = -240;
          diver.current.x += (diver.x - v.x) * 2;
        }
      }
    }
    if (!aboard && !save.cleftOpen && Math.hypot(diver.x - CLEFT.x, diver.y - CLEFT.y) < 75) scald = Math.max(scald, 0.5);
    // Milestone 8 part 2: the Corvina's state, and the hidden passage and salvage.
    cv.hatch = save.corvina.hatch;
    cv.door = save.corvina.door;
    cv.power = save.corvina.breakers.every(Boolean);
    hidden.open = save.hiddenOpen;
    seam.open = !!save.seamOpen;
    scenery.setSeam(seam.open);
    scenery.setCorvina(save.corvina);
    scenery.setHidden(save.hiddenOpen);
    scenery.setLocker(save.lockerOpen);
    for (const sv of SALVAGE) if (sv.id in save.salvageTaken && save.playSeconds - save.salvageTaken[sv.id] > SALVAGE_REGROW && save.sub?.salvage !== sv.id) delete save.salvageTaken[sv.id];
    scenery.setSalvage(save.salvageTaken);
    // Milestone 11: the zone map fills in where you swim (or drive).
    seenClock -= dt;
    if (seenClock <= 0) {
      seenClock = 0.5;
      markSeen(save, aboard ? sub.x : diver.x);
    }
    // Milestone 10: the trench's state.
    cleft.open = save.cleftOpen;
    scenery.trench.setCleft(save.cleftOpen);
    scenery.trench.setFulmar(save.fulmar.open);
    // Milestone 11: the sanctum's doors and the Choir gates.
    if (sanctum.door !== save.sanctum.door) scenery.sanctum.setDoor(save.sanctum.door);
    if (sanctum.locks.some((l, i) => l !== save.sanctum.locks[i])) scenery.sanctum.setLocks(save.sanctum.locks);
    sanctum.door = save.sanctum.door;
    sanctum.locks = [...save.sanctum.locks];
    if (gatesShown !== save.sanctum.contact) {
      gatesShown = save.sanctum.contact;
      scenery.sanctum.setGates(gatesShown);
    }
    if (diver.x > 15800 && diver.x < 17200) scenery.updateKelpCaves(time, surge);
    scenery.setKelpCaves(save.brackets, save.kelpCut);
    kelpWall.cut = save.kelpCut;

    // The dive bag's weight slows the diver (no sinking through a dome's floor).
    diver.load = bagLoad(save);
    diver.jar = save.jar;
    diver.kit = kitLook();
    // Planning in build view (or reading a panel out here): the diver treads water where they are
    // instead of sinking with the bag's weight (Colin, after the terrain pass).
    diver.noSink = build.active || care.active || dockUI.active || station.active;
    if (aboard || boarding) diver.cancelSurfaceReaction();
    if (boarding) {
      // Climbing into the sub: swim to the hatch, then down through it.
      boarding.t += dt;
      const hatch = sub.hatchPoint();
      const a = smooth(boarding.t / BOARD_SWIM);
      const b = smooth((boarding.t - BOARD_SWIM) / BOARD_IN);
      diver.x = boarding.x0 + (hatch.x - boarding.x0) * a;
      diver.y = boarding.y0 + (hatch.y - boarding.y0) * a + b * 36;
      diver.vx = diver.vy = 0;
      diver.surfaced = false;
      boardFade = 1 - b;
      if (boarding.t >= BOARD_SWIM + BOARD_IN) {
        boarding = null;
        boardFade = 1;
        if (blackout === 0) boardSub(false);
      }
    } else if (grapple && !aboard) {
      // The grapple: the hook flies out to the ring, then the line reels the diver in.
      const r = ANCHORS[grapple.to];
      grapple.t += dt;
      if (grapple.phase === 'fly') {
        diver.update(dt, 0, 0, false, false);
        const k = Math.min(1, grapple.t / GRAPPLE_FLY);
        scenery.setTow({ x: diver.x, y: diver.y - 6 }, { x: diver.x + (r.x - diver.x) * k, y: diver.y - 6 + (r.y - diver.y + 6) * k });
        if (k >= 1) {
          grapple.phase = 'reel';
          sound.clip();
        }
      } else {
        const dx = r.x - diver.x;
        const dy = r.y + 16 - diver.y;
        const d = Math.hypot(dx, dy);
        const step = Math.min(d, GRAPPLE_REEL * dt);
        diver.vx = (dx / Math.max(1, d)) * GRAPPLE_REEL * 0.4;
        diver.vy = (dy / Math.max(1, d)) * GRAPPLE_REEL * 0.4;
        diver.x += (dx / Math.max(1, d)) * step;
        diver.y += (dy / Math.max(1, d)) * step;
        diver.surfaced = false;
        diver.pose(dt);
        scenery.setTow(r, { x: diver.x, y: diver.y - 6 });
        if (d < 40) {
          grapple = null;
          diver.vx = diver.vy = 0;
          scenery.setTow(null);
        }
      }
      if (grapple && (blackout > 0 || grapple.t > 3)) {
        grapple = null;
        scenery.setTow(null);
      }
    } else if (!aboard) {
      // The boost needs the hip thruster, found at the survey beacon (before milestone 11).
      if (inControl && s.boost && save.kit.thruster === 0 && time - noThrusterAt > 6) {
        noThrusterAt = time;
        hud.toast('No thruster to boost with yet. A Kestrel survey left a spare hip thruster somewhere near its beacon, at the drop-off.', 'warn');
      }
      const freeSwimming = inControl && !input.suspended && !peek && !s.boost && !s.board && !s.scan && !s.collect && !s.flare && !s.dart;
      diver.update(dt, inControl ? s.moveX : 0, inControl ? s.moveY : 0, inControl && s.boost && save.kit.thruster > 0, inControl && s.lamp, freeSwimming);
      // After milestone 12: the TH-3 dash head. A double tap of Boost dashes, every 3 s.
      if (inControl && s.boost && hasGear(save, 'dash')) {
        if (time - boostTapAt < 0.32 && time - dashAt > 3) {
          dashAt = time;
          const mx = Math.abs(s.moveX) > 0.2 || Math.abs(s.moveY) > 0.2 ? s.moveX : diver.facing;
          const my = Math.abs(s.moveX) > 0.2 || Math.abs(s.moveY) > 0.2 ? s.moveY : 0;
          const l = Math.hypot(mx, my) || 1;
          diver.vx += (mx / l) * 1150;
          diver.vy += (my / l) * 900;
          sound.dash();
          if (!save.tips.includes('dash')) {
            save.tips.push('dash');
            hud.toast('Dash! The TH-3 head throws you a short way at once. It needs 3 s to recover.');
          }
        }
        boostTapAt = time;
      }
    }

    // Breaking the surface: a splash, then breath vapour with each breath out.
    const [hx, hy] = diver.helmetPoint();
    if (diver.splash > 0) {
      if (surfaceMotion && !aboard) {
        const strength = Math.min(1.20, diver.splash * 0.67 + Math.max(Math.abs(incomingVY), Math.abs(diver.vy)) / 620 + Math.abs(diver.vx) / 1000);
        surfaceFx.splash(hx, strength, time, diver.vx, !diver.surfaced);
      } else surfaceFx.splash(hx, diver.splash, time);
    }
    if (diver.exhale && hy < 0) surfaceFx.breath(hx + (hx > diver.x ? 10 : -10), hy - 4, hx > diver.x ? 1 : -1);

    // The cave in the east cliff is too dark to go further in without the
    // dive light (milestone 7), switched on.
    const hasLight = hasGear(save, 'light');
    const lit = hasLight && diver.lampOn;
    if (!aboard && !lit && prevDiverX <= CAVE_GATE_X + 2 && diver.x > CAVE_GATE_X && diver.x < CAVE_GATE_X + 140 && diver.y > caveTop(CAVE_GATE_X) - 30 && diver.y < caveBottom(diver.x) + 30) {
      diver.x = CAVE_GATE_X;
      if (diver.vx > 0) diver.vx = 0;
    }
    prevDiverX = diver.x;
    // Black water: the diver won't swim further into the dark than the last lit bracket's glow reaches.
    const litN = save.brackets.filter(Boolean).length;
    let litMaxX = 17460;
    let nearLit = Infinity;
    BRACKETS.forEach((b, i) => {
      if (!save.brackets[i]) return;
      litMaxX = Math.max(litMaxX, b.x);
      nearLit = Math.min(nearLit, Math.abs(diver.x - b.x));
    });
    const inBlack =
      !aboard && (inShape(KC.dark, diver.x, diver.y) || inShape(KC.exit, diver.x, diver.y) || (diver.x > 17480 && inShape(KC.downPassage, diver.x, diver.y)));
    const blackLimit = litN >= BRACKETS.length ? Infinity : litMaxX + 330;
    const atBlackEdge = inBlack && diver.x > blackLimit - 50;
    // ---- Milestone 9: the lightless passage. Only a grown glowfin's light gets through it. ----
    escort.sync(save.jar, diver.x, diver.y);
    escort.update(dt, time, diver.x, diver.y, diver.facing, !aboard && blackout === 0);
    if (escort.active && !save.tips.includes('escort')) {
      save.tips.push('escort');
      hud.toast('The grown glowfin slips out of the jar and swims at your shoulder, lighting the water around you. Its light reaches where no lamp can.', 'big');
    }
    const inLL = !aboard && inLightless(diver.x, diver.y);
    const llLit = escort.reach > 60;
    const llDeep = inLL && Math.hypot(diver.x - LIGHTLESS_EDGE.x, diver.y - LIGHTLESS_EDGE.y) > 50;
    if (llDeep && !llLit && blackout === 0) {
      diver.x = llSafe.x;
      diver.y = llSafe.y;
      diver.vx *= -0.2;
      diver.vy *= -0.2;
    } else llSafe = { x: diver.x, y: diver.y };
    const atLightless = inLL && !llLit;
    if (inLL && blackout === 0 && !save.tips.includes('lightless')) {
      save.tips.push('lightless');
      hud.toast(
        llLit
          ? 'Lightless water: not even the dive light gets into it. But the glowfin\'s glow does. Stay close to it.'
          : 'Lightless water: your dive light dies a hand\'s width out, and the dark is total. Something that makes its own light might show the way. A grown glowfin, perhaps?',
        'big',
      );
    }
    scenery.setLightless(llLit ? 0.3 : 1);
    if (inBlack && diver.x > blackLimit) {
      diver.x = blackLimit;
      if (diver.vx > 0) diver.vx = 0;
    }
    // ---- The wreck shelf (milestone 8): lurkers ----
    const lk = lurkers.update(dt, diver.x, diver.y, diver.lampOn, !aboard && blackout === 0 && !boarding, camX, camX + lastViewW);
    if (lk.warn && !save.tips.includes('lurker')) {
      save.tips.push('lurker');
      hud.toast('Something stirs in the den ahead: a glowing lure, eyes catching your light. Back off, or wait for it to strike and pull back.', 'warn');
    }
    if (lk.warn) sound.lurkWarn(lk.warn.denX - diver.x);
    if (lk.bite) {
      save.suit = Math.max(0, save.suit - 0.3);
      suitCalm = 0;
      shake = Math.min(1, shake + 0.7);
      const L = Math.max(1, Math.hypot(diver.x - lk.bite.denX, diver.y - lk.bite.denY));
      diver.vx = ((diver.x - lk.bite.denX) / L) * 420;
      diver.vy = ((diver.y - lk.bite.denY) / L) * 420 - 80;
      sound.bite();
      hud.suitHit();
      hud.toast(
        save.suit > 0
          ? `Bitten! Suit integrity ${Math.round(save.suit * 100)}%. It seals itself slowly; a dome, the sub, a relay or the surface repair it fully.`
          : 'Bitten! Your suit gives way.',
        'warn',
      );
    }
    // ---- The trench (milestone 10): predators ----
    for (const ev of hunters.update(dt, { x: diver.x, y: diver.y, lampOn: diver.lampOn && diver.lamp > 0.3, speed: Math.hypot(diver.vx, diver.vy) }, !aboard && blackout === 0 && !boarding, camX, camX + lastViewW, camY, camY + viewH)) {
      if (ev.type === 'bite') {
        save.suit = Math.max(0, save.suit - ev.damage);
        suitCalm = 0;
        shake = Math.min(1, shake + 0.7);
        const L = Math.max(1, Math.hypot(diver.x - ev.x, diver.y - ev.y));
        diver.vx = ((diver.x - ev.x) / L) * 420;
        diver.vy = ((diver.y - ev.y) / L) * 420 - 60;
        sound.bite();
        hud.suitHit();
        const who = ev.kind === 'lanternjaw' ? 'A lanternjaw snaps at you' : ev.kind === 'stalker' ? 'The pale stalker strikes' : 'The strider\'s legs close on you';
        hud.toast(save.suit > 0 ? `${who}! Suit integrity ${Math.round(save.suit * 100)}%.` : `${who}! Your suit gives way.`, 'warn');
      } else if (ev.type === 'warn') {
        sound.lurkWarn(ev.x - diver.x);
        const tip = 'hunt-' + ev.kind;
        if (!save.tips.includes(tip)) {
          save.tips.push(tip);
          hud.toast(
            ev.kind === 'lanternjaw'
              ? 'An amber lure drifts closer: something big hangs behind it, drawn by your lamp. Switch the lamp off and back away, or pulse your sonar.'
              : ev.kind === 'stalker'
                ? 'The pale shape turns on you! It strikes when you stop or go dark. Keep moving with your lamp on, or pulse your sonar.'
                : 'Long legs pick across the ledge towards your lamp: a strider. Lamp off and it loses interest; a sonar pulse sends it off.',
            'warn',
          );
        }
      } else if (ev.type === 'follow' && !save.tips.includes('hunt-follow')) {
        save.tips.push('hunt-follow');
        hud.toast('Something pale is following you, just at the edge of your light.', 'warn');
      }
    }
    if (!aboard && diver.x > TRENCH.x0 + 200 && blackout === 0 && !save.tips.includes('trench')) {
      save.tips.push('trench');
      hud.toast('The trench. The shelf breaks off into the dark, ledge after ledge. Watch your depth: past your suit\'s crush depth the pressure crumples it.', 'big');
    }
    if (!aboard && Math.abs(diver.x - 29900) < 600 && diver.y > 3700 && blackout === 0 && !save.tips.includes('ventfield')) {
      save.tips.push('ventfield');
      hud.toast('The vent field: chimneys breathing scalding water. Keep out of the shimmering plumes. Little iron-shelled snails graze the crust.', 'big');
    }
    if (!aboard && diver.x > WRECK_SHELF.x0 && blackout === 0 && !save.tips.includes('wshelf')) {
      save.tips.push('wshelf');
      hud.toast('The wreck shelf. Twilight, cold, and old wrecks half sunk in silt. Something lives under the wreckage: watch for glowing lures.', 'big');
    }
    scenery.setHatches(save.hatches);
    const inKC = !aboard && inKelpCaves(diver.x, diver.y);
    if (inKC && blackout === 0 && !save.tips.includes('kcaves')) {
      save.tips.push('kcaves');
      hud.toast('The kelp caves. Cold water breathes out of the dark, and an earlier survey team left their gear in here. Air pockets in the roofs let you breathe.', 'big');
    }
    if (inBlack && blackout === 0 && !save.tips.includes('blackwater')) {
      save.tips.push('blackwater');
      hud.toast('Black water: silt so fine your light dies in it. Old lamp brackets cross the chamber. Set lumen moss from your bag on them (hold Collect) to light the way.', 'big');
    }
    const inCave = inCaveTunnel(diver.x, diver.y) && diver.x > CAVE.x0 + 120 && diver.x < CAVE_GATE_X + 40;
    // First time through to the kelp forest.
    if (!aboard && diver.x > FOREST.x0 - 150 && blackout === 0 && !save.tips.includes('forest')) {
      save.tips.push('forest');
      hud.toast('The kelp forest! Giant kelp from the floor to the surface, dim green light, and things watching your lamp. Scan what you find: the Lab will want it.', 'big');
      persist();
    }
    const domeHere = blackout === 0 && !build.active && !aboard ? domeAround(diver.x, diver.y) : null;
    hud.setBanner(
      crushing === 'diver'
        ? `Crush depth: your suit is rated to ${diverLimit()} m. ${hasGear(save, 'psuit') ? 'A stronger pressure suit would go deeper.' : 'A pressure suit would go deeper.'} Climb!`
        : crushing === 'sub'
          ? `Crush depth: KS-1 is rated to ${subLimit()} m. Climb before the hull gives way!`
          : inCave && !hasLight
        ? 'Pitch black ahead. The shoulder lamp barely dents this darkness. A proper dive light would open the way: decode the sled recorder in a Lab, then build the light in a Workshop.'
        : inCave && !lit
          ? 'Too dark to go on: switch your dive light on (Lamp).'
          : aboard && !save.vane && raceAt(sub.x, sub.y) > 0.3
            ? 'The race is too strong for KS-1, even on full thrusters. The old salvage crew must have had a way to calm it: look on the far side, on foot.'
          : raceHere > 0.3 && !grapple && !hasGear(save, 'tow')
            ? 'The race: a current too strong to swim against sweeps across the shelf edge, right up to the surface. Old anchor rings cross it: a grapple line could pull you from ring to ring.'
          : inSqueeze
            ? surge > 0.4
              ? 'Cold surge! Too strong to swim against: wait it out in a pocket in the roof.'
              : 'A lull: swim on to the next pocket before the surge comes back.'
            : atLightless
              ? 'Lightless water. Your dive light dies a hand\'s width out. A grown glowfin carried in your jar would light the way (take one out of a tank).'
            : atBlackEdge
              ? `Black water. Your light dies in the silt a few metres out. Set lumen moss on the brackets to light a way through (${litN} of ${BRACKETS.length} lit).`
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
    // The dome is closed now (the walkable base): its air is inside, through the airlock.
    const dome = null as Placed | null;
    const domeAir = false;
    // Milestone 7 part 2: trapped air in the kelp caves' roofs, and planted air relays.
    const pocketAir = blackout === 0 && !aboard && AIR_POCKETS.some((a) => inShape(a.shape, hx, hy) && hy < a.waterY);
    const relayAir = blackout === 0 && !aboard && save.relays.some((r) => Math.hypot(diver.x - r.x, diver.y - (r.y - 50)) < 140);
    // Milestone 8 part 2: inside a finished, powered recompression room.
    const recompHere = null as Placed | null;
    if (recompHere && !save.tips.includes('recomp')) {
      save.tips.push('recomp');
      hud.toast('Recompression room: the pressure eases, and the chamber mends your suit and refills your air.', 'big');
    }
    const freshAir = pocketAir || relayAir || !!recompHere;
    if (pocketAir && !save.tips.includes('pocket')) {
      save.tips.push('pocket');
      hud.toast('Air pocket: you can breathe here. Your tank refills.', 'big');
    }
    if ((dome?.id ?? null) !== insideDome) {
      insideDome = dome?.id ?? null;
      if (dome && domeAir) {
        hud.toast('Dome habitat: breathing station air · progress saved', 'big');
        persist();
      }
    }
    if ((build.active || care.active || dockUI.active || station.active) && blackout === 0) {
      // Planning the base, or tending a tank, pauses the air clock.
    } else if (blackout === 0) {
      if (atSurface || domeAir || subAir || freshAir) {
        // Air comes in from the first breath after breaking the surface.
        if (domeAir || subAir || freshAir || aboard || diver.surfaceTime > 0.4) save.oxygen = Math.min(maxO2, save.oxygen + (maxO2 / 3) * dt);
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
      if (frac < 0.25 && !lowWarned && !atSurface && !domeAir && !subAir && !freshAir) {
        lowWarned = true;
        const sAir = save.sub && save.sub.stage === 'built' && save.sub.air > 20 && save.sub.hull > 0 && !aboard;
        hud.toast(
          layout.powered.size && layout.count('dome')
            ? `Oxygen low: head for the surface${sAir ? ', the sub' : ''} or the dome`
            : `Oxygen low: head for the surface${sAir ? ' or the sub' : ''}`,
          'warn',
        );
      }
      hud.setLowOxygen(atSurface || domeAir || subAir || freshAir ? 0 : Math.max(0, (0.25 - frac) / 0.25) * (0.75 + 0.25 * Math.sin(time * 5)));
      // ---- Suit integrity (milestone 8) ----
      suitCalm += dt;
      if (recompHere) save.suit = Math.min(1, save.suit + dt * 0.6);
      else if (atSurface || domeAir || subAir || relayAir) save.suit = Math.min(1, save.suit + dt * 0.25);
      else if (suitCalm > 8) save.suit = Math.min(1, save.suit + dt * 0.012);
      if (scald > 0 && !aboard) {
        // After milestone 12: the heat-shield cowl turns most of the heat away.
        if (hasGear(save, 'cowl')) scald *= 0.2;
        save.suit = Math.max(0, save.suit - dt * 0.09 * scald);
        suitCalm = 0;
        if (!save.tips.includes('scald')) {
          save.tips.push('scald');
          hud.toast('Scalding water! The plume lifts you and blisters the suit. Get out of it.', 'warn');
        }
      }
      // ---- Milestone 10: crush depth. Past the rated depth the suit (or the sub's hull) gives way, faster the deeper. ----
      crushing = null;
      crushClock -= dt;
      if (!aboard) {
        const dM = Math.max(0, diver.y - SURFACE_Y + 6) / WU_PER_METRE;
        const lim = diverLimit();
        // Milestone 11: the Choir's water in the sanctum holds no weight.
        const cr = inSanctum(diver.x, diver.y) ? 0 : crushRate(dM, lim);
        if (cr > 0) {
          crushing = 'diver';
          save.suit = Math.max(0, save.suit - cr * dt);
          suitCalm = 0;
          if (crushClock <= 0) {
            crushClock = Math.max(0.3, 1.5 - cr * 10);
            sound.creak(cr * 8);
            hud.suitHit();
            shake = Math.min(1, shake + 0.12);
          }
          if (!crushWarnDiver) {
            crushWarnDiver = true;
            hud.toast(`Crush depth! Your suit is rated to ${lim} m. The pressure is crumpling it: go back up.`, 'warn');
          }
        } else if (dM < lim - 3) crushWarnDiver = false;
      } else if (S && S.stage === 'built' && !S.docked) {
        const sd = Math.max(0, sub.y - SURFACE_Y) / WU_PER_METRE;
        const sl = subLimit();
        const sc = crushRate(sd, sl);
        if (sc > 0) {
          crushing = 'sub';
          S.hull = Math.max(0, S.hull - sc * dt);
          if (crushClock <= 0) {
            crushClock = Math.max(0.3, 1.5 - sc * 10);
            sound.creak(sc * 8);
            shake = Math.min(1, shake + 0.15);
          }
          if (!crushWarnSub) {
            crushWarnSub = true;
            hud.toast(
              S.plating ? `Crush depth! Even plated, KS-1 is rated to ${sl} m.` : `Crush depth! KS-1's hull is rated to ${sl} m: the plates are buckling. Depth plating (fitted at the dock) would take it deeper.`,
              'warn',
            );
          }
          if (S.hull <= 0) breach();
        } else if (sd < sl - 3) crushWarnSub = false;
      }
      if (save.oxygen <= 0 || save.suit <= 0) {
        blackoutCause = save.suit <= 0 ? 'suit' : 'air';
        // Blacking out aboard: the crew pull the diver out of the sub first.
        if (aboard) leaveSub(true);
        blackout = 0.0001;
        diver.cancelSurfaceReaction();
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
          } else if (j.keep && layout.pieces.some((p) => p.kind === 'hatch' && isDone(p))) {
            // Milestone 9: one from the Hatchery or the Revival pool (no tank yet) goes back to the Hatchery.
            j.keep.tank = -1;
            save.nursery.push(j.keep);
            jarMsg = ` The crew put the ${SPECIES[j.species].name.toLowerCase()} from your jar in the Hatchery.`;
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
        const homeDome = home.dome ? layout.pieces.find((p) => p.kind === 'dome' && layout.powered.has(p.id)) : null;
        drone.teleport(home.x, home.y, layout);
        diver.vx = diver.vy = 0;
        diver.surfaced = false;
        camCX = diver.x;
        camCY = diver.y;
        save.oxygen = maxO2;
        diveTime = 0;
        lowWarned = false;
        hud.setLowOxygen(0);
        const where = home.sub ? 'the sub, KS-1' : home.dome ? 'the dome habitat' : home.relay ? 'the nearest air relay' : 'the Kestrel buoy';
        save.suit = 1;
        grapple = null;
        scenery.setTow(null);
        const why = blackoutCause === 'suit' ? 'Your suit gave way and you blacked out' : 'You blacked out';
        blackoutCause = 'air';
        blackoutMsg = save.dropped
          ? `${why}. The crew pulled you back to ${where}. Your sample bag is on the seabed where you fell; its amber light is blinking.${jarMsg}`
          : `${why}. The crew pulled you back to ${where}.${jarMsg}`;
        blackout = BLACK_IN + 0.0001;
        writeSave(Object.assign(save, { x: diver.x, y: diver.y }));
        // "You wake here after a blackout": inside the dome, by its airlock.
        if (homeDome) {
          hud.setBlackout(1, blackoutMsg);
          enterBase(homeDome.id, true);
          return;
        }
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
    const wildSpare = !!wt && wildAllowed(save, wt.species);
    // After milestone 12: the specimen satchel is a second slot.
    const jarFull = !!save.jar && (!hasGear(save, 'satchel') || !!save.jar2);
    const wildOk = !!wt && wtKnown && wildSpare && save.kit.jar && !jarFull && !diver.surfaced && !atDrone;
    for (const ev of wildlife.update(dt, time, reachPt.x, reachPt.y, Math.hypot(diver.vx, diver.vy), aboard ? sub.thrust > 0 : diver.boosting, save, collectHeld && wildOk, camX - 200, camX + lastViewW + 200)) {
      const caughtJar = { species: ev.species, stage: ev.stage, traits: wildlife.traitsOf(ev.id) };
      if (save.jar) save.jar2 = caughtJar;
      else save.jar = caughtJar;
      save.wildCaught[ev.species] = (save.wildCaught[ev.species] ?? 0) + 1;
      const left = WILD_CAP - (save.wildCaught[ev.species] ?? 0);
      if (left <= 0 && !save.tips.includes(`wildcap-${ev.species}`)) {
        save.tips.push(`wildcap-${ev.species}`);
        setTimeout(() => hud.toast(`That's the last ${SPECIES[ev.species].name.toLowerCase()} the wild will spare. For more, keep a pair happy and grown in one tank, with a Hatchery at the base: they breed.`, 'big'), 4500);
      }
      drone.cheer();
      const sp = SPECIES[ev.species];
      const name = ev.stage === 'egg' ? sp.eggName : sp.youngName;
      const hasTank = layout.pieces.some((p) => isTankKind(p.kind));
      hud.toast(
        `${name.replace(/^./, (m) => m.toUpperCase())} in the specimen jar! ${
          hasTank ? 'Take it into the base (through the dome airlock) and put it in a creature tank from inside.' : 'Build a creature tank at the Kestrel site to keep it.'
        }`,
        'big',
      );
      persist();
    }
    const wildTarget = wildlife.target && !atDrone && !diver.surfaced ? wildlife.target : null;
    // A creature the jar can't take (full, or not scanned yet) never hides a material in reach
    // (Colin, after the terrain pass: the grotto's nodules sat under the glowfin eggs).
    const wildBlocks = !!wildTarget && (wildOk || !pickups.target);
    if (wildTarget && wildBlocks && collectHeld && !wildOk && time - fullWarnAt > 4) {
      fullWarnAt = time;
      hud.toast(
        !save.kit.jar
          ? 'Nothing to carry it in. A Kestrel specimen jar was lost by the old anchor in the coral garden.'
          : !save.scans.includes(SPECIES[wildTarget.species].scan)
            ? `Scan the ${SPECIES[wildTarget.species].name.toLowerCase()} first, to learn how to keep it`
            : !wildAllowed(save, wildTarget.species)
              ? `The wild has spared you two ${SPECIES[wildTarget.species].name.toLowerCase()}s already. Breed more at a Hatchery: a happy grown pair in one tank lays eggs.`
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
    // The sub's grabber arm reaches further than a diver's hand (after milestone 7b: Colin found it hard to line up).
    for (const ev of pickups.update(dt, time, reachPt.x, reachPt.y, save, collectHeld && !atDrone && !bagFull && !wildBlocks, speed, grab ? GRAB_REACH : undefined)) {
      if (ev.type === 'material') {
        save.bag[ev.kind]++;
        sound.pickup(ev.kind);
        drone.cheer();
        hud.refreshInventory(ev.kind);
        hud.toast(`+1 ${MATERIALS[ev.kind].name}`);
      } else if (ev.type === 'tank') {
        save.oxygen = maxOxygen(save);
        sound.find('tank');
        hud.toast(`Air tank upgrade! Dive time +${TANK_BONUS} s`, 'big');
        drone.cheer();
      } else if (ev.type === 'kit') {
        sound.find('tank');
        drone.cheer();
        hud.refreshInventory();
        hud.toast(
          ev.what === 'jar'
            ? 'A specimen jar! It clips to your belt. Scan a creature to learn how to keep it, then hold Collect by an egg or a youngster to ease it in.'
            : ev.what === 'carrier'
              ? `A cargo cradle for KD-1! ${save.drone === 'active' ? 'It clips under the drone' : 'It will clip under KD-1 once the drone is repaired'}. ${input.state.lastDevice === 'touch' ? 'Tap Send' : input.state.lastDevice === 'gamepad' ? 'Press the d-pad down' : 'Press H'} and KD-1 carries your dive bag to base storage and comes back. The further out you are, the longer it takes, and nothing can be built while it's away.`
              : ev.what === 'thruster'
              ? 'A TH-1 hip thruster! It clips to your belt: Boost (Shift, Space or the Boost button) fires a short burst through the water.'
              : 'A TH-2 thruster head! Twin nozzles and a longer burn: your boost is faster and carries further.',
          'big',
        );
      } else if (ev.type === 'whorl') {
        sound.find('whorl');
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
        sound.find('bag');
        hud.toast(`Sample bag recovered (${n} item${n === 1 ? '' : 's'})`, 'big');
      }
      persist();
    }
    const pt = pickups.target;
    // Grabber auto-align: holding Collect with a material in range, the sub's
    // thrusters hover it so the claw sits right over the material.
    if (aboard && grab && collectHeld && pt && !wildTarget && Math.hypot(s.moveX, s.moveY) < 0.3 && S && !S.docked) {
      const claw = sub.clawPoint();
      const ex = pt.x - claw.x;
      const ey = pt.y - 6 - claw.y;
      const k = Math.min(1, dt * 3.5);
      const mx = Math.max(-160 * dt, Math.min(160 * dt, ex * k));
      const my = Math.max(-160 * dt, Math.min(160 * dt, ey * k));
      if (!isSolid(sub.x + mx, sub.y + my + 50)) {
        sub.x += mx;
        sub.y += my;
      }
      sub.vx *= 1 - Math.min(1, dt * 6);
      sub.vy *= 1 - Math.min(1, dt * 6);
    }
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
    // Base actions (unload at a pod, take a tank's tray) when nothing else wants Collect.
    const collectRaw = inControl && s.collect && !diver.surfaced;
    const collectTap = collectRaw && !collectWas;
    collectWas = collectRaw;
    const otherTarget = atDrone || !!wildTarget || (!!pt && (!aboard || grab));
    // Milestone 7: hold-to-do actions out in the world (the sled recorder, the boom winch).
    let holdAct: { key: string; label: string; seconds: number; done: () => void } | null = null;
    let infoAct = '';
    // The grapple's target: the best anchor ring in range with a clear line, ahead of the diver first.
    let grappleTarget = -1;
    if (!aboard && !grapple && blackout === 0 && inControl && hasGear(save, 'tow') && !diver.surfaced) {
      const dirX = Math.abs(s.moveX) > 0.2 ? Math.sign(s.moveX) : diver.facing;
      let best = Infinity;
      ANCHORS.forEach((r, i) => {
        const d = Math.hypot(r.x - diver.x, r.y - diver.y);
        if (d < 70 || d > GRAPPLE_RANGE || !lineClear(diver.x, diver.y, r.x, r.y)) return;
        const score = d + ((r.x - diver.x) * dirX > 0 ? 0 : 500);
        if (score < best) {
          best = score;
          grappleTarget = i;
        }
      });
    }
    scenery.setGrappleMark(grappleTarget >= 0 ? ANCHORS[grappleTarget] : null, time);
    scenery.setRecorder(recorderOut(), Math.abs(diver.x - RECORDER_X) < 260 && Math.abs(diver.y - groundY(RECORDER_X)) < 260, time);
    if (!otherTarget && blackout === 0 && inControl && !diver.surfaced && !aboard) {
      const rx = RECORDER_X;
      const ry = groundY(RECORDER_X) - 22;
      if (recorderOut() && Math.hypot(diver.x - rx, diver.y - ry) < 80)
        holdAct = {
          key: 'recorder',
          label: 'Unclip the SLED 2 recorder',
          seconds: 1.6,
          done: () => {
            save.finds.push('recorder');
            drone.cheer();
            hud.toast(
              `SLED 2 recorder unclipped! It weighs nothing. Take it to a Lab at the base (build card 10) to decode the dive light design.`,
              'big',
            );
          },
        };
      // Milestone 8: the grapple line fires at the marked anchor ring.
      if (grappleTarget >= 0) {
        const to = grappleTarget;
        holdAct = {
          key: 'grapple' + to,
          label: 'Fire the grapple',
          seconds: 0.1,
          done: () => {
            grapple = { to, phase: 'fly', t: 0 };
            sound.clip();
          },
        };
      } else if (!hasGear(save, 'tow') && RINGS.some((r) => Math.hypot(diver.x - r.x, diver.y - r.y) < 110))
        infoAct = 'Anchor ring: a grapple line (Workshop) could hook it';
      // Milestone 8 part 2: the Corvina.
      const near = (p: { x: number; y: number }, r = 100) => Math.hypot(diver.x - p.x, diver.y - p.y) < r;
      // The walkable base: in through a dome's airlock.
      for (const p of layout.pieces) {
        if (p.kind !== 'dome' || !near(airlockOutside(p), 95)) continue;
        if (!isDone(p)) infoAct = 'Dome habitat: still a frame. The drone has to finish it before the airlock works.';
        else
          holdAct = {
            key: 'enterbase' + p.id,
            label: 'Go in through the airlock',
            seconds: 0.6,
            done: () => enterBase(p.id),
          };
      }
      if (!save.corvina.hatch && near({ x: CV_HATCH.x, y: CV_HATCH.y - 30 }, 90)) {
        if (hasGear(save, 'cutter'))
          holdAct = {
            key: 'cvhatch',
            label: 'Cut the deck hatch open',
            seconds: 3,
            done: () => {
              save.corvina.hatch = true;
              drone.cheer();
              hud.toast("The hatch drops into the dark. A ladder leads down into the Corvina: hold Collect to climb in.", 'big');
            },
          };
        else infoAct = 'Deck hatch, welded shut: a cutter torch would open it';
      } else if (save.corvina.hatch && near({ x: CV_HATCH.x, y: CV_HATCH.y - 30 }, 90))
        holdAct = {
          key: 'cventer',
          label: 'Climb down into the Corvina',
          seconds: 0.8,
          done: () => enterCorvina(),
        };
      if (save.hiddenOpen && !save.hiddenLooted && near({ x: HIDDEN.room.x, y: HIDDEN.room.y + 20 }, 110))
        holdAct = {
          key: 'hiddenlocker',
          label: 'Open the old salvage locker',
          seconds: 2,
          done: () => {
            save.hiddenLooted = true;
            save.whorls.push('whorl-hidden');
            save.bag.brass += 3;
            hud.refreshInventory();
            sound.find('whorl');
            hud.toast(`Inside the locker: 3 brass fittings and an Echo whorl (${save.whorls.length}), glowing in colours nothing else on the reef does.`, 'big');
          },
        };
      // Milestone 9: the rusted strongbox in the hidden room. A grown tinker crab picks its lock.
      if (save.hiddenOpen && !save.lockerOpen && near({ x: Scenery.LOCKER.x, y: Scenery.LOCKER.y - 24 }, 80)) {
        if (save.jar?.species === 'crab' && save.jar.stage === 'grown')
          holdAct = {
            key: 'crablock',
            label: 'Let the tinker crab pick the lock',
            seconds: 2.6,
            done: () => {
              save.lockerOpen = true;
              if (!save.finds.includes('poolplans') && !save.blueprints.includes('revive')) save.finds.push('poolplans');
              scenery.setLocker(true);
              drone.cheer();
              sound.find('bag');
              hud.showReading(
                'Revival pool drawings',
                'The crab clambers onto the padlock, works its fine claws into the keyhole, and with a crunch of rust the shackle drops. Inside, wrapped in oilcloth: drawings for a warm, still pool where a dormant creature can be woken by the light of a glowing bloom.\n\nA Lab can decode them. Glowing blooms grow only where no lamp has ever shone.',
                'Taken: decode it in a Lab. The crab climbs back into the jar.',
              );
            },
          };
        else infoAct = 'A rusted strongbox. Its padlock is seized solid and far too small for the cutter: something with fine claws could pick it. A grown tinker crab, carried in your jar?';
      }
      // The flow vane's winch, on the far side of the race.
      const vw = Scenery.vaneWinchPoint();
      if (!save.vane && Math.hypot(diver.x - vw.x, diver.y - vw.y) < 110)
        holdAct = {
          key: 'vane',
          label: 'Wind the flow vane winch',
          seconds: 3,
          done: () => {
            save.vane = true;
            race.vane = true;
            drone.cheer();
            hud.toast('The flow vane groans up off the seabed and turns the race down along the shelf. The water at the top of the edge goes calm: KS-1 can cross over the top now.', 'big');
          },
        };
      // Sealed hatches on the small wrecks: the cutter torch opens them.
      for (const w of WRECKS) {
        const hy = groundY(w.hatchX) - 70;
        if (save.hatches.includes(w.id) || Math.hypot(diver.x - w.hatchX, diver.y - hy) > 110) continue;
        if (hasGear(save, 'cutter'))
          holdAct = {
            key: 'hatch-' + w.id,
            label: 'Cut the sealed hatch open',
            seconds: 3,
            done: () => {
              save.hatches.push(w.id);
              drone.cheer();
              if (w.id === 'trawler') {
                save.tanks.push('tank-trawler');
                save.oxygen = maxOxygen(save);
                sound.find('tank');
                hud.toast(`The hatch falls open. Inside the wheelhouse: a sealed emergency air cylinder. Air tank upgrade! Dive time +${TANK_BONUS} s`, 'big');
              } else {
                save.bag.plate += 3;
                save.bag.brass += 2;
                hud.refreshInventory();
                sound.find('bag');
                hud.toast('The hatch falls open onto a dry cargo locker: 3 hull plating and 2 brass fittings, still crated.', 'big');
              }
            },
          };
        else infoAct = 'Sealed hatch, rusted shut: a cutter torch would open it';
      }
      if (Math.hypot(diver.x - CORVINA.doorX, diver.y - (groundY(CORVINA.doorX) - 90)) < 140)
        infoAct = "The Corvina's bulkhead door: sealed from inside, and far too thick to cut. Its way in comes in the next update.";
      // Milestone 7 part 2: the finds in the kelp caves.
      for (const k of Object.keys(KC_FINDS) as (keyof typeof KC_FINDS)[]) {
        const f = FIND_INFO[k];
        const got = save.finds.includes(k) || save.blueprints.includes(f.research) || jobRunning(save, `research:${f.research}`);
        if (!got && Math.hypot(diver.x - KC_FINDS[k].x, diver.y - f.y) < 120)
          holdAct = {
            key: 'find-' + k,
            label: f.label,
            seconds: 1.8,
            done: () => {
              save.finds.push(k);
              drone.cheer();
              sound.find('bag');
              hud.toast(f.toast, 'big');
            },
          };
      }
      // The brackets in the black chamber.
      BRACKETS.forEach((b, i) => {
        if (save.brackets[i] || Math.hypot(diver.x - b.x, diver.y - (b.y - 20)) > 110) return;
        if (save.bag.moss > 0)
          holdAct = {
            key: 'bracket' + i,
            label: 'Set lumen moss on the bracket',
            seconds: 1.2,
            done: () => {
              save.bag.moss--;
              save.brackets[i] = true;
              hud.refreshInventory();
              const n = save.brackets.filter(Boolean).length;
              hud.toast(n >= BRACKETS.length ? 'All four brackets glow: the way through the black water is lit.' : `The moss glows on the bracket (${n} of ${BRACKETS.length} lit).`, 'big');
            },
          };
        else infoAct = 'Old lamp bracket: bring lumen moss in your bag';
      });
      // The kelp wall across the side passage off the hall.
      const kw = { x: (KELP_WALL.x0 + KELP_WALL.x1) / 2, y: (KELP_WALL.y0 + KELP_WALL.y1) / 2 };
      if (!save.kelpCut && Math.hypot(diver.x - kw.x, diver.y - kw.y) < 140) {
        if (hasGear(save, 'cutter'))
          holdAct = {
            key: 'kwall',
            label: 'Cut through the kelp wall',
            seconds: 3,
            done: () => {
              save.kelpCut = true;
              kelpWall.cut = true;
              drone.cheer();
              hud.toast('The cutter torch burns through the kelp wall. Something glints in the little chamber beyond.', 'big');
            },
          };
        else infoAct = 'Kelp wall: far too thick. A cutter torch would cut it.';
      }
      // ---- Milestone 10: the trench ----
      // The relay buoy on the rim: the first pattern spool.
      const takeSpool = (id: string, label: string, text: string) => ({
        key: 'spool-' + id,
        label,
        seconds: 1.6,
        done: () => {
          if (!save.signals.found.includes(id)) save.signals.found.push(id);
          drone.cheer();
          sound.find('bag');
          hud.toast(text, 'big');
        },
      });
      if (!save.signals.found.includes('sig1') && near({ x: TR_BUOY.x, y: groundY(TR_BUOY.x) - 40 }, 130))
        holdAct = takeSpool(
          'sig1',
          "Take the pattern spool from the buoy's recorder",
          'A pattern spool: hours of recorded light, rings and ribbons in colours nothing on the reef makes. A Signal array at the base could read it.',
        );
      // The crushed probe on ledge A: its hull stress logs (depth plating).
      const gotLogs = save.finds.includes('hulllogs') || save.blueprints.includes('plating') || jobRunning(save, 'research:plating');
      if (!gotLogs && near({ x: TR_PROBE.x, y: groundY(TR_PROBE.x) - 60 }, 130))
        holdAct = {
          key: 'hulllogs',
          label: "Pull the probe's stress recorder",
          seconds: 2,
          done: () => {
            save.finds.push('hulllogs');
            drone.cheer();
            sound.find('bag');
            hud.toast("The probe's stress recorder: where its hull buckled, and the stronger skin its makers drew next. A Lab can decode it into depth plating for KS-1.", 'big');
          },
        };
      // The sealed chimney across the cleft: a grown cinder snail grazes it away.
      if (!save.cleftOpen && near({ x: CLEFT.x + 40, y: CLEFT.y }, 120)) {
        if (save.jar?.species === 'snail' && save.jar.stage === 'grown')
          holdAct = {
            key: 'snailgraze',
            label: 'Let the cinder snail graze the chimney',
            seconds: 4,
            done: () => {
              save.cleftOpen = true;
              cleft.open = true;
              drone.cheer();
              sound.find('bag');
              hud.showReading(
                'The chimney gives way',
                'The snail creeps out of the jar onto the hot crust and starts to graze, its ember seams brightening. Scale by scale the young chimney thins, cracks, and slumps into gravel. Beyond it, a dark cleft runs back into the rock.\n\nThe snail climbs back into your jar, warm and pleased with itself.',
                'The cleft is open.',
              );
            },
          };
        else
          infoAct = save.scans.includes('chimney')
            ? 'A hot, brittle chimney seals the cleft. Cinder snails graze these: bring a grown one in your jar.'
            : 'A young chimney seals a cleft in the wall. Scan it.';
      }
      // In the cleft: a Fulmar cargo pod with the PS-2 drawings and a pattern spool.
      if (save.cleftOpen) {
        const fy = CLEFT.room.y + CLEFT.room.ry - 40;
        const gotPlans = save.finds.includes('ps2plans') || save.blueprints.includes('psuit2') || jobRunning(save, 'research:psuit2');
        if (!gotPlans && near({ x: CLEFT_FINDS.plans.x, y: fy }, 90))
          holdAct = {
            key: 'ps2plans',
            label: 'Take the drawings from the cargo pod',
            seconds: 1.8,
            done: () => {
              save.finds.push('ps2plans');
              drone.cheer();
              sound.find('bag');
              hud.showReading(
                'PS-2 suit drawings',
                "A Fulmar cargo pod, fallen from a supply run and wedged in the cleft. Inside, in a sealed tube: drawings for the station's own deep suit. Vent-ore rings, a forged collar, rated to 110 m.\n\nA Lab can decode them. With it you could reach the trench floor, and the station.",
                'Taken: decode it in a Lab.',
              );
            },
          };
        if (!save.signals.found.includes('sig2') && near({ x: CLEFT_FINDS.spool.x, y: fy }, 70))
          holdAct = takeSpool('sig2', 'Take the pattern spool from the pod', 'A second pattern spool, labelled in grease pencil: "FULMAR · ANSWER?" A Signal array could read it.');
      }
      // The Fulmar's airlock hatch, on top of the station.
      if (near({ x: FULMAR_HATCH.x, y: FULMAR_HATCH.y - 50 }, 100)) {
        if (!save.fulmar.open)
          holdAct = {
            key: 'fulmarhatch',
            label: 'Wind the airlock hatch open',
            seconds: 2.6,
            done: () => {
              save.fulmar.open = true;
              drone.cheer();
              hud.toast("The wheel grinds round and the hatch lifts. The airlock below is still sealed against the sea: the station's insides are dry. Hold Collect to climb in.", 'big');
            },
          };
        else holdAct = { key: 'fulmarenter', label: 'Climb down into the Fulmar', seconds: 0.8, done: () => enterFulmar() };
      }
      // ---- Milestone 11: the sanctum ----
      const hasReson = hasGear(save, 'resonator');
      const singAt = (key: string, label: string, done: () => void) => ({ key, label, seconds: 3, done });
      // The door in the trench floor: the resonator sings it open.
      if (!save.sanctum.door && near({ x: SANCTUM.door.x, y: SANCTUM.door.y - 50 }, 150)) {
        if (hasReson)
          holdAct = singAt('sing-door', 'Sing to the door with the resonator', () => {
            save.sanctum.door = true;
            drone.cheer();
            sound.find('bag');
            hud.showReading(
              'The door opens',
              "The hoop on your pack starts to hum, then to sing: a pattern of light, rings inside rings, cyan into violet. The grooves in the stone take it up, brighter and brighter, until the whole disc is ringing like a struck glass.\n\nThen it parts. Petals of stone fold back into the rock, and below them a shaft falls away into a soft light that is not your lamp.",
              'The way down is open. Inside, the water holds no weight: no crush depth.',
            );
          });
        else
          infoAct = save.scans.includes('sdoor')
            ? save.signals.decoded.length >= 4
              ? 'The door hears only its own song: build the alien resonator in a Workshop.'
              : "A door of pale stone. It doesn't open to touch. Decode the Choir's fragments: they speak of a door."
            : 'A disc of pale stone in the floor, leaking light. Scan it.';
      }
      // The song-locks across the narrows.
      SANCTUM.locks.forEach((l, i) => {
        if (save.sanctum.locks[i] || Math.abs(diver.x - l.x) > 150 || Math.abs(diver.y - l.y) > l.r + 60) return;
        if (hasReson)
          holdAct = singAt(`sing-lock${i}`, 'Sing to the song-lock', () => {
            save.sanctum.locks[i] = true;
            drone.cheer();
            sound.find('bag');
            hud.toast(i === 0 ? 'The lens of light shivers, sings back, and folds itself away into the stone. The great hall lies beyond.' : 'The second lock sings with you and parts. The way down to the deepest pool is open.', 'big');
          });
        else infoAct = 'A song-lock: it parts only for the resonator.';
      });
      // The heart's arch, on the deep pool's floor.
      if (near({ x: SANCTUM.heart.x, y: SANCTUM.heart.y - 60 }, 120))
        holdAct = { key: 'heartenter', label: 'Go in through the glowing arch', seconds: 1, done: () => enterHeart() };
      // The Choir gates (after contact): home, and back.
      if (save.sanctum.contact) {
        if (near({ x: SANCTUM.gate.x, y: SANCTUM.gate.y }, 120))
          holdAct = { key: 'gatehome', label: 'Step through the Choir gate (home)', seconds: 1.2, done: () => choirGate(true) };
        if (near({ x: SANCTUM.homeGate.x, y: SANCTUM.homeGate.y - 110 }, 130))
          holdAct = { key: 'gatesanctum', label: 'Step through the Choir gate (to the sanctum)', seconds: 1.2, done: () => choirGate(false) };
      }
      // Planting an air relay on open seabed, away from the base and the caves.
      if (save.relayKits > 0) {
        const gyHere = groundY(Math.max(WORLD_X0, Math.min(WORLD_W, diver.x)));
        const onFloor = gyHere - diver.y < 100 && gyHere - diver.y > 0 && gyHere > 200;
        const atBase = diver.x > GRID_X0 - 300 && diver.x < GRID_X1 + 300 && diver.y > 300;
        const spaced = save.relays.every((r) => Math.abs(r.x - diver.x) > 600);
        if (onFloor && !atBase && spaced && !inKelpCaves(diver.x, diver.y))
          holdAct = {
            key: 'relay',
            label: `Plant air relay AR-1 (${save.relayKits} carried)`,
            seconds: 2,
            done: () => {
              save.relays.push({ x: Math.round(diver.x), y: Math.round(gyHere) });
              save.relayKits--;
              scenery.setRelays(save.relays);
              hud.toast('Air relay planted. Its float rises to the surface and air hisses down the hose: swim to the mooring to breathe. You wake up at the nearest relay after a blackout.', 'big');
            },
          };
      }
      const wp = Scenery.winchPoint();
      if (!save.boomOpen && Math.hypot(diver.x - wp.x, diver.y - wp.y) < 110)
        holdAct = {
          key: 'winch',
          label: 'Wind the boom winch',
          seconds: 3,
          done: () => {
            save.boomOpen = true;
            boom.open = true;
            drone.cheer();
            hud.toast('The boom gate grinds up out of the water. The sub can now cross the shelf on top of the east cliff, into the kelp forest.', 'big');
          },
        };
    }
    // Milestone 8 part 2: heavy salvage, lifted by the sub's grabber and lowered onto a salvage crane.
    if (aboard && grab && S && S.stage === 'built' && blackout === 0 && inControl && !otherTarget) {
      const claw = sub.clawPoint();
      if (!S.salvage) {
        for (const sv of SALVAGE) {
          if (sv.id in save.salvageTaken || Math.hypot(claw.x - sv.x, claw.y - (groundY(sv.x) - 30)) > 170) continue;
          holdAct = {
            key: 'lift-' + sv.id,
            label: 'Lift the salvage',
            seconds: 2,
            done: () => {
              S.salvage = sv.id;
              save.salvageTaken[sv.id] = save.playSeconds;
              hud.toast(
                layout.pieces.some((p) => p.kind === 'crane')
                  ? 'Salvage hooked! Take it home and lower it onto the salvage crane.'
                  : 'Salvage hooked! A salvage crane at the base (decode it in a Lab) could break it down.',
                'big',
              );
            },
          };
        }
      } else {
        const crane = layout.pieces.find((p) => {
          if (p.kind !== 'crane' || !isDone(p)) return false;
          const r = pieceRect(p);
          return Math.hypot(sub.x - (r.x + r.w / 2), sub.y - (r.y + r.h / 2)) < 380;
        });
        if (crane) {
          if (layout.powered.has(crane.id))
            holdAct = {
              key: 'lower-salvage',
              label: 'Lower the salvage onto the crane',
              seconds: 1.5,
              done: () => {
                S.salvage = null;
                save.craneQueue++;
                hud.toast(`The crane takes the salvage (${save.craneQueue} waiting). It breaks each piece into 4 scrap, 2 brass and 1 hull plating.`, 'big');
              },
            };
          else infoAct = 'The salvage crane has no power';
        }
      }
    }
    if (!holdAct || holdAct.key !== holdKey) holdProgress = 0;
    holdKey = holdAct?.key ?? '';
    // The grapple fires on a fresh tap only (never from a Collect still held after
    // another action), and even while the race is sweeping you away.
    const isGrapple = !!holdAct && holdAct.key.startsWith('grapple');
    if (isGrapple && collectTap) {
      holdAct!.done();
      holdAct = null;
      holdKey = '';
    } else if (holdAct && !isGrapple && collectHeld && speed < 70) {
      holdProgress += dt / holdAct.seconds;
      if (holdProgress >= 1) {
        holdProgress = 0;
        holdAct.done();
        holdAct = null;
        holdKey = '';
        persist();
      }
    } else holdProgress = Math.max(0, holdProgress - dt * 0.5);
    // Milestone 11: the resonator sings while you hold Collect at a door, and the song spreads in rings.
    {
      const singing = !!holdAct && holdAct.key.startsWith('sing') && collectHeld ? 1 : 0;
      diver.singing += (singing - diver.singing) * Math.min(1, dt * 4);
      if (diver.singing > 0.02 && !aboard) scenery.sanctum.song = { ...diver.resonPoint(), k: Math.min(1, holdProgress * 1.2) };
      else scenery.sanctum.song = null;
    }
    boomT += ((save.boomOpen ? 1 : 0) - boomT) * Math.min(1, dt * 0.8);
    scenery.setBoom(boomT > 0.995 ? 1 : boomT);
    race.vane = save.vane;
    vaneT += ((save.vane ? 1 : 0) - vaneT) * Math.min(1, dt * 0.6);
    scenery.setVane(vaneT > 0.995 ? 1 : vaneT);
    let baseAct: { label: string; run: () => void } | null = null;
    if (!otherTarget && blackout === 0 && inControl && !diver.surfaced) {
      const trayN = tankHere ? MATERIALS_LIST.reduce((a, k) => a + (save.tankData[String(tankHere.id)]?.out?.[k] ?? 0), 0) : 0;
      const carried = MATERIALS_LIST.reduce((a, k) => a + save.bag[k], 0);
      const pod = carried && false ? podNear() : null;
      if (tankHere && save.jar) {
        const id = tankHere.id;
        const sp = SPECIES[save.jar.species];
        const full = creaturesIn(save, id).length >= tankCapacity(layout, id);
        const what = save.jar.stage === 'egg' ? sp.eggName : save.jar.stage === 'young' ? sp.youngName : sp.name.toLowerCase();
        baseAct = { label: full ? `Tank ${tankNumber(layout, id)} is full` : `Put ${what} in tank ${tankNumber(layout, id)}`, run: () => depositJar(id) };
      } else if (tankHere && trayN) {
        const id = tankHere.id;
        baseAct = { label: `Take ${trayN} from tank ${tankNumber(layout, id)}'s tray`, run: () => takeTray(id) };
      } else if (pod?.by) {
        baseAct = {
          label: pod.powered ? `Unload ${carried} item${carried === 1 ? '' : 's'} into storage` : pod.frame ? 'Storage pod: still a frame' : 'Storage pod: no power',
          run: () => unloadAtPod(pod),
        };
      }
    }
    if (baseAct && !save.tips.includes('baseact') && false) {
      save.tips.push('baseact');
      hud.toast(
        input.state.lastDevice === 'touch'
          ? 'Tap Collect to unload at a storage pod, take what waits in a tank\'s output tray, or put the creature in your jar into a tank. Swimming past no longer moves anything.'
          : 'Press C (X on a gamepad) to unload at a storage pod, take what waits in a tank\'s output tray, or put the creature in your jar into a tank. Swimming past no longer moves anything.',
        'big',
      );
    }
    if (baseAct && collectTap) baseAct.run();

    if (holdAct) hud.setCollect(holdAct.label, holdProgress);
    else if (infoAct && !baseAct) hud.setCollect(infoAct, 0);
    else if (baseAct) hud.setCollect(baseAct.label, 0, true);
    else if (aboard && !grab) hud.setCollect(null, 0);
    else if (atDrone) {
      hud.setCollect(missing.length ? `Repair drone: need ${missing.join(', ')}` : 'Repair build drone', drone.repairProgress);
      if (collectHeld && missing.length && time - fullWarnAt > 4) {
        fullWarnAt = time;
        hud.toast(`To repair the drone you need ${missing.join(' and ')} more`, 'warn');
      }
    } else if (wildTarget && wildBlocks) {
      const sp = SPECIES[wildTarget.species];
      hud.setCollect(
        !save.kit.jar
          ? 'No specimen jar yet'
          : !save.scans.includes(sp.scan)
          ? `Unknown creature: scan it first`
          : !wildAllowed(save, wildTarget.species)
            ? `Wild ${sp.name.toLowerCase()}: breed more at the base`
            : jarFull
            ? hasGear(save, 'satchel') ? 'Jar and satchel full' : 'Specimen jar full'
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

    simBase(dt, { x: diver.x, y: diver.y, face: aboard ? sub.face : diver.facing, speed, repairing, aboard });

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
      sound.ping();
      // Milestone 8 part 2: the sonar pulse (every 6 s).
      if (hasGear(save, 'sonar') && !aboard && time - sonarAt > 6) {
        sonarAt = time;
        sound.sonar();
        let scared = 0;
        for (const l of lurkers.list) if (Math.hypot(l.denX - diver.x, l.denY - diver.y) < 700 && l.scare()) scared++;
        if (scared) hud.toast(`The sonar pulse rolls out: ${scared === 1 ? 'a lurker shrinks' : `${scared} lurkers shrink`} back into ${scared === 1 ? 'its den' : 'their dens'}.`);
        const deepScared = hunters.scare(diver.x, diver.y, 800);
        if (deepScared) hud.toast(`The sonar pulse rolls out: ${deepScared === 1 ? 'the hunter' : `${deepScared} hunters`} turn away into the dark.`);
        if (!save.hiddenOpen && Math.hypot(diver.x - HIDDEN.x, diver.y - HIDDEN.y) < 700) {
          save.hiddenOpen = true;
          hidden.open = true;
          drone.cheer();
          hud.toast('The pulse comes back hollow: there is a chamber behind the silt slump at the foot of the shelf edge. The silt slides away.', 'big');
          persist();
        }
      }
    }
    idTimer = Math.max(0, idTimer - dt);

    // ---- After milestone 12: suit attachments and the sub's new modules ----
    gearFrame(dt, aboard, s, inControl);
    if (inControl && s.haul && !padNav.active) sendHaul();
    haulBtn.hidden = !save.kit.carrier;
    haulBtn.classList.toggle('away', drone.hauling);

    for (const f of fish) {
      const x = f.view.x;
      const y = f.view.y;
      f.update(dt, time, diver.x, diver.y);
      if (motion && dt > 0 && Math.floor(time * 4) !== Math.floor((time - dt) * 4) && Math.abs(f.view.x - camCX) < 800 && Math.abs(f.view.y - camCY) < 480) {
        const vx = (f.view.x - x) / dt;
        const vy = (f.view.y - y) / dt;
        if (Math.hypot(vx, vy) > 35) motion.disturb({ x: f.view.x, y: f.view.y, vx, vy, radius: 49, strength: 0.64 });
      }
    }
    const [bx, by] = diver.bubblePoint();
    bubbles.update(dt, bx, aboard ? 0 : by, diver.vx, diver.vy, diver.takeBubbles());

    if (Math.hypot(s.moveX, s.moveY) > 0.2 && hintTimer === 0) hintTimer = 0.001;
    if (hintTimer > 0) {
      hintTimer += dt;
      if (hintTimer > 2.5) hintEl.classList.add('gone');
    }

    // Zoom out while building (the build camera is steered by pan and pinch).
    const wantH = build.active
      ? build.cam.h
      : care.active
        ? VIEW_H_CARE
        : dockUI.active
          ? VIEW_H_DOCK
          : station.active
            ? VIEW_H_STATION
            : aboard
              ? VIEW_H_SUB * swimZoom
              : VIEW_H * swimZoom * benchZoom;
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
    } else if (station.active && station.pieceId !== null) {
      const p = layout.pieces.find((q) => q.id === station.pieceId);
      if (p) {
        const r = pieceRect(p);
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
    if (wake && motion) {
      const source = aboard ? sub : diver;
      const active = blackout === 0 && !peek && !isWaterAir(source.x, source.y) && (aboard ? !S?.docked : !diver.surfaced && !pocketAir);
      wake.track(dt, source.x, source.y, source.vx, source.vy, aboard ? 83 : 45, active, !aboard,
        redesigned && !aboard ? diver.strokeWake : undefined);
      wake.update(dt, time);
      const flow = motion.sample(camCX, camCY, cameraFlow);
      lighting.setWaterFlow(flow.x, flow.y);
      const plume = ventLensAt(camCX, camCY);
      if (plume) lighting.setWaterLocal(plume.x, plume.y - 114, 2.6, 185);
      else lighting.setWaterLocal(source.x - source.vx * 0.24, source.y - source.vy * 0.24, active ? Math.min(0.79, Math.hypot(source.vx, source.vy) / 370) : 0, 108);
    }
    scenery.update(time, diver.x, diver.y, diver.vx, camX, camX + viewW, motion, dt, diver.vy);
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
        build.portMarkers(),
        build.markScale(),
      );
    }
    for (const sc of schools) sc.update(dt, time, diver.x, diver.y, camX, camX + viewW, motion);
    tankLife.update(dt, time, save, camX, camX + viewW);
    // While tending a tank, the diver and drone fade so they don't hide it.
    const fade = (care.active ? 0.12 : dockUI.active || station.active ? 0.3 : 1) * (boarding ? boardFade : 1);
    diver.view.alpha += (fade - diver.view.alpha) * Math.min(1, dt * 6);
    drone.view.alpha = drone.emissive.alpha = drone.glow.alpha = diver.view.alpha;

    for (const c of [litCam, emissiveCam, glowCam, overlayCam]) {
      c.scale.set(zoom);
      c.position.set(-camX * zoom, -camY * zoom);
    }
    // Foreground plants are "closer" to us, so they are bigger and move faster.
    const fz = zoom * 1.25;
    frontCam.scale.set(fz);
    frontCam.position.set(cssW / 2 - camCX * 1.3 * fz + FRONT_REF * 0.15 * fz, cssH / 2 - camCY * fz + 40 * zoom);
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
        occupied: aboard,
        reach: subReach,
        welding: drone.weldingSub,
      });
      const sb = save.sub;
      if (aboard) {
        const hold = sb.modules.includes('cargo') ? `<br>cargo <b>${kg.toFixed(0)}/${lim.max}</b> kg` : '';
        const sd = Math.max(0, sub.y - SURFACE_Y) / WU_PER_METRE;
        const deep = sub.x > TRENCH.x0 - 900 || sd > subLimit() - 8 ? `<br>depth <b>${Math.round(sd)}/${subLimit()} m</b>` : '';
        hud.setSubChip(
          `KS-1${sb.docked ? ' · berthed' : ''}<br>hull <b>${Math.round(sb.hull * 100)}%</b><br>air <b>${airClock(sb.air)}</b>${hold}${deep}`,
          sb.hull < 0.35 || sb.air < 60 || sd > subLimit() - 3,
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
    // Milestone 7: the dive light DL-1 replaces the shoulder lamp: further, brighter and wider.
    const lampSpec = hasGear(save, 'light') ? DIVE_LIGHT : LAMP;
    // Black water swallows the light, except near a lit bracket.
    lampLight.radius = lampSpec.radius * (inBlack && nearLit > 260 ? 0.32 : 1) * (inLightless(diver.x, diver.y) && !aboard ? 0.15 : 1);
    lampLight.coneCos = lampSpec.coneCos;
    lampLight.intensity = aboard ? 0 : lampSpec.intensity * diver.lamp * diver.view.alpha;
    scenery.caveDark.alpha = hasGear(save, 'light') && diver.lamp > 0.5 && !aboard ? 0.15 : 1;
    wildlife.eyeShine(
      { x: lp.x, y: lp.y, dirX: lp.dirX, dirY: lp.dirY, radius: lampLight.radius, coneCos: lampLight.coneCos ?? 0.86, on: lampLight.intensity > 0.1 },
      fx.eyes ? preset.eyeShine : 0,
      time,
    );
    baseView.glassStreak = fx.glass ? preset.glassStreak : 0;
    diver.lens.position.set(lp.x, lp.y);
    diver.lens.alpha = (0.25 + 0.75 * diver.lamp) * diver.view.alpha;
    diver.lensGlow.position.set(lp.x, lp.y);
    diver.lensGlow.alpha = diver.lamp * diver.view.alpha;

    const lights: Light[] = [...(save.sub ? sub.lights : []), lampLight, ...gearFx.lights, ...drone.lights, ...scenery.lights, ...baseView.lights, ...pickups.lights, ...wildlife.lights, escort.light, ...lurkers.lights, ...hunters.lights, ...fish.map((f) => f.light)];
    // G2: soft contact shadows where things meet the seabed (the diver's, the sub's, the drone's and the base's feet).
    const contacts: [number, number, number, number][] = [];
    if (fx.contact && preset.contactShadows > 0) {
      const add = (x: number, y: number, r: number, strength: number) => {
        if (Math.abs(x - (camX + viewW / 2)) < viewW / 2 + r * 1.2 && strength > 0.02) contacts.push([x, y, r, strength]);
      };
      const under = (x: number, y: number, r: number, k: number, fall: number, reach: number) => {
        const f = groundY(Math.max(WORLD_X0, Math.min(WORLD_W, x)));
        const h = f - y;
        if (h < reach) add(x, f + 6, r + h * 0.25, k * Math.exp(-Math.max(0, h) / fall));
      };
      if (!aboard) under(diver.x, diver.y, 70, 0.55, 220, 420);
      if (save.sub) under(sub.x, sub.y, 120, 0.5, 260, 500);
      if (drone.view.alpha > 0.1) under(drone.x, drone.y, 34, 0.35, 160, 300);
      for (const p of layout.pieces) {
        if (!isDone(p) || !onSeabed(p.gx, p.gy)) continue;
        const r = pieceRect(p);
        const cx = r.x + r.w / 2;
        add(cx, groundY(Math.max(WORLD_X0, Math.min(WORLD_W, cx))) + 4, r.w * 0.55, preset.contactStrength * 0.8);
      }
      const mx = camX + viewW / 2;
      contacts.sort((a, b) => Math.abs(a[0] - mx) - Math.abs(b[0] - mx));
      contacts.length = Math.min(contacts.length, preset.contactShadows);
    }
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
      skipHiddenCaustics: preset.skipHiddenCaustics && fx.causticSkip,
      contacts,
      shadowLights: fx.shadows ? preset.lightShadows : 0,
      shadowSteps: preset.shadowSteps,
      relief: fx.relief ? preset.relief : 0,
      reliefWide: preset.reliefWide,
      grime: fx.grime ? preset.grime : 0,
      sheen: fx.sheen ? preset.sheen : 0,
    });
    water.update(time, camX, camY, viewW, viewH, app.canvas.width, app.canvas.height);
    backdrop.update(camCX, camCY, zoom, cssW, cssH);
    if (shallowsBackdrop) {
      backdrop.view.alpha = 1 - shallowsBackdrop.update(camCX, camCY, zoom, cssW, cssH);
    }
    zoneBackdrop.view.visible = fx.zones;
    zoneBackdrop.view.alpha = preset.zoneAlpha;
    if (fx.zones) zoneBackdrop.update(camCX, camCY, zoom, cssW, cssH);
    water.setShimmer(fx.shimmer ? preset.shimmer : 0);
    // Near foreground kelp goes soft (Ultra); nothing to blur once it has faded away.
    dofBlur.strength = preset.dof * zoom;
    frontCam.filters = fx.dof && preset.dof > 0 && frontCam.alpha > 0.03 ? [dofBlur] : null;
    // Marine snow catches the brightest lights.
    const snowLamps: SnowLight[] = fx.litSnow
      ? lights
          .filter((l) => l.intensity > 0.05)
          .sort((a, b) => b.intensity * b.radius - a.intensity * a.radius)
          .slice(0, 4)
          .map((l) => ({ x: (l.x - camX) * zoom, y: (l.y - camY) * zoom, r: l.radius * zoom, k: preset.snowLight * Math.min(1.2, l.intensity), dirX: l.dirX ?? 0, dirY: l.dirY ?? 0, cone: l.coneCos ?? -2 }))
      : [];
    snow.update(dt, time, (camCX - prevX) * zoom, (camCY - prevY) * zoom, Math.max(0.25, 1 - camCY / 1400), snowLamps, motion, camX, camY, zoom);

    perf.lights = lighting.lightCount;
    perf.pass('lit', () => renderer.render({ container: litRoot, target: litRT, clear: true, clearColor: [0, 0, 0, 0] }));
    perf.pass('glow', () => renderer.render({ container: glowCam, target: glowRT, clear: true, clearColor: [0, 0, 0, 0] }));

    input.diverScreen = aboard ? { x: (sub.x - camX) * zoom, y: (sub.y - camY) * zoom } : { x: (diver.x - camX) * zoom, y: (diver.y - camY) * zoom };
    surfaceFx.update(dt, time, camX, camX + viewW, camY, diver.surfaced ? { x: hx } : null);
    updateTags(camX, camY, viewW);

    const depthM = Math.max(0, diver.y - SURFACE_Y + 6) / WU_PER_METRE;
    if (domeAir || subAir) diveTime = 0;
    watch.draw(performance.now(), save.oxygen, maxO2, atSurface ? 0 : depthM, diveTime, atSurface, { kg, ...lim }, save.suit, aboard ? subLimit() : inSanctum(diver.x, diver.y) ? 999 : diverLimit());
    // The suit bar under the watch: once the wreck shelf has been reached, or whenever the suit is damaged.
    const suitShown = !aboard && (save.tips.includes('wshelf') || save.suit < 0.995);
    hud.setSuit(save.suit, suitShown);
    // Milestone 10: the crush-depth chip, near the trench or near the limit.
    {
      const lim = diverLimit();
      const held = inSanctum(diver.x, diver.y);
      hud.setDepthLimit(!aboard && blackout === 0 && !held && (diver.x > TRENCH.x0 - 900 || depthM > lim - 8) ? lim : null, depthM, suitShown ? 156 : 122);
    }
    if (pickups.bagPos) {
      const p = pickups.bagPos;
      hud.setBagMarker((p.x - camX) * zoom, (p.y - camY) * zoom, Math.hypot(p.x - diver.x, p.y - diver.y) / WU_PER_METRE);
    } else hud.setBagMarker(null, 0, 0);

    // ---- Sound (milestone 7b) ----
    {
      let work: WorkKind | null = null;
      if (holdAct && collectHeld && speed < 70)
        work = holdAct.key === 'snailgraze' ? 'creature' : holdAct.key === 'winch' || holdAct.key === 'relay' || holdAct.key === 'vane' || holdAct.key === 'fulmarhatch' ? 'winch' : holdAct.key === 'kwall' ? 'cutter' : holdAct.key.startsWith('bracket') ? 'moss' : 'recorder';
      else if (grapple?.phase === 'reel') work = 'winch';
      else if (repairing) work = 'repair';
      else if (wildlife.working && wildTarget) work = 'creature';
      else if (pickups.working && pt) work = pt.kind;
      const workX = workAt?.x ?? diver.x;
      let dark = 0;
      if (blackout > 0) dark = blackout < BLACK_IN ? blackout / BLACK_IN : blackout < BLACK_IN + BLACK_HOLD ? 1 : Math.max(0, 1 - (blackout - BLACK_IN - BLACK_HOLD) / BLACK_OUT);
      const presses: { id: number; x: number; y: number; stroke: number }[] = [];
      const feeders: { x: number; y: number }[] = [];
      for (const p of layout.pieces) {
        if (p.kind === 'press' && isDone(p)) {
          const r = pieceRect(p);
          presses.push({ id: p.id, x: r.x + r.w / 2, y: r.y + r.h / 2, stroke: factory.stroke.get(p.id) ?? 99 });
        } else if (p.kind === 'feeder' && factory.feederState.get(p.id) === 'running') {
          const r = pieceRect(p);
          feeders.push({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
        }
      }
      const freeAir = atSurface || domeAir || subAir || freshAir;
      const frac = save.oxygen / maxO2;
      sound.update({
        dt,
        x: aboard ? sub.x : diver.x,
        y: aboard ? sub.y : diver.y,
        depthM: atSurface ? 0 : depthM,
        surfaced: !aboard && diver.surfaced,
        aboard,
        inDome: domeAir,
        blackout: dark,
        panel: build.active ? 'build' : care.active ? 'care' : dockUI.active ? 'dock' : station.active ? 'station' : !settingsPanel.hidden ? 'settings' : !logPanel.hidden ? 'log' : '',
        speed,
        boosting: !aboard && diver.boosting,
        lampOn: diver.lampOn,
        lowAir: freeAir || blackout > 0 ? 0 : Math.max(0, (0.25 - frac) / 0.25),
        freeAir,
        work,
        workX,
        scanning: inControl && s.scan && scanner.target && scanner.progress > 0 ? scanner.progress : null,
        drone: { x: drone.x, y: drone.y, welding: !!(drone.welding || drone.weldingSub) },
        presses,
        feeders,
        sub: S ? { x: sub.x, y: sub.y, speed: Math.hypot(sub.vx, sub.vy), thrust: sub.thrust > 0, docked: S.docked, built: S.stage === 'built' } : null,
        splash: aboard ? 0 : diver.splash,
        exhale: !aboard && diver.exhale,
        surge,
        inAir: pocketAir,
        race: aboard ? raceAt(sub.x, sub.y) : raceAt(diver.x, diver.y),
        suit: save.suit,
      });
    }

    saveTimer += dt;
    if (saveTimer > 5) persist();
    ui.tick(ticker.deltaMS);
  });

  // ---- Dry interiors on foot (after milestone 8 part 2) ----
  /** Hide the world and its buttons while on foot. */
  function goOnFoot(): void {
    motion?.reset();
    wake?.reset();
    surfaceMotion?.reset();
    for (const l of worldLayers) l.visible = false;
    build.setAvailable(false);
    care.setAvailable(null);
    dockUI.setAvailable(null);
    station.setAvailable(null);
    hud.setCollect(null, 0);
    hud.setBanner('');
    hud.setTags([], 0);
    hud.setBagMarker(null, 0, 0);
    hud.setSubMarker(null, 0, 0);
    hud.setLowOxygen(0);
    document.body.classList.add('on-foot');
  }
  function backToWater(): void {
    for (const l of worldLayers) l.visible = true;
    document.body.classList.remove('on-foot');
  }
  function enterCorvina(): void {
    save.corvina.taken ??= [];
    interior.enter(CORVINA_MAP, { breakers: save.corvina.breakers, taken: save.corvina.taken });
    inside = 'corvina';
    goOnFoot();
    sound.hatchCue(true);
    if (!save.tips.includes('onfoot'))
      setTimeout(() => {
        save.tips.push('onfoot');
        hud.toast(
          input.state.lastDevice === 'touch'
            ? 'Inside the Corvina: dry, and dark. The stick walks, Boost jumps (hold for higher; down + Boost drops through a grating). When a ring is marked, tap Collect to fire the grapple and swing: the stick pumps the swing and climbs the line, Boost lets go and flies on.'
            : 'Inside the Corvina: dry, and dark. A/D walk, hold Shift to sprint, Space jumps (hold for higher; S + jump drops through a grating). When a ring is marked, tap C to fire the grapple and swing: A/D pump the swing, W/S climb the line, Space lets go and flies on.',
          'big',
        );
      }, 900);
    persist();
  }
  function exitCorvina(): void {
    interior.leave();
    inside = null;
    backToWater();
    diver.x = CV_HATCH.x;
    diver.y = CV_HATCH.y - 70;
    diver.vx = 0;
    diver.vy = -60;
    diver.surfaced = false;
    camCX = diver.x;
    camCY = diver.y;
    sound.hatchCue(false);
    persist();
  }

  // ---- Milestone 10: the Fulmar deep station, on foot ----
  function enterFulmar(): void {
    interior.enter(FULMAR_MAP, { breakers: save.fulmar.breakers, taken: save.fulmar.taken }, null, FULMAR_OPTS);
    inside = 'fulmar';
    goOnFoot();
    sound.hatchCue(true);
    if (!save.tips.includes('fulmarin'))
      setTimeout(() => {
        save.tips.push('fulmarin');
        hud.toast("Inside the Fulmar. Dry, cold, and dark: her power is off. Somewhere aboard there must be breakers. Listen to the hull creak.", 'big');
      }, 900);
    persist();
  }
  function exitFulmar(): void {
    interior.leave();
    inside = null;
    backToWater();
    diver.x = FULMAR_HATCH.x;
    diver.y = FULMAR_HATCH.y - 70;
    diver.vx = 0;
    diver.vy = -60;
    diver.surfaced = false;
    camCX = diver.x;
    camCY = diver.y;
    sound.hatchCue(false);
    persist();
  }

  // ---- Milestone 11: the heart of the sanctum, on foot, and first contact ----
  function enterHeart(): void {
    // Contact left unfinished (the game closed mid-song): the plinth waits again.
    if (!save.sanctum.contact) save.sanctum.taken = save.sanctum.taken.filter((t) => t !== '9');
    interior.enter(HEART_MAP, { breakers: [], taken: save.sanctum.taken }, null, heartOptions(choir));
    inside = 'sanctum';
    goOnFoot();
    sound.hatchCue(true);
    if (!save.tips.includes('heartin'))
      setTimeout(() => {
        save.tips.push('heartin');
        hud.toast(
          'Through the arch, the water simply stops: dry air, cool and faintly sweet, and pale stone lit from inside. A chasm of light runs across the hall, with rings of light above it. Somewhere below, something is waiting.',
          'big',
        );
      }, 900);
    persist();
  }
  function exitHeart(at: { x: number; y: number } = { x: SANCTUM.heart.x, y: SANCTUM.heart.y - 70 }): void {
    interior.leave();
    inside = null;
    backToWater();
    diver.x = at.x;
    diver.y = at.y;
    diver.vx = 0;
    diver.vy = -40;
    diver.surfaced = false;
    camCX = diver.x;
    camCY = diver.y;
    sound.hatchCue(false);
    persist();
  }
  /** The patterns your grown creatures show (the Choir's words), named for the answer pads. */
  function contactWords(): ContactWord[] {
    const seen = new Set<string>();
    const out: ContactWord[] = [];
    for (const c of save.creatures) {
      if (c.stage !== 'grown') continue;
      const p = c.traits?.pattern ?? 0;
      const key = `${c.species}:${p}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const sp = c.species.charAt(0).toUpperCase() + c.species.slice(1);
      out.push({ name: `${sp} · ${PATTERNS[c.species]?.[p] ?? 'glow'}` });
    }
    return out;
  }
  function startContact(): void {
    contact.start(contactWords(), () => {
      save.sanctum.contact = true;
      if (!save.scans.includes('contact')) save.scans.push('contact');
      if (!save.blueprints.includes('lantern')) save.blueprints.push('lantern');
      // The Choir carries you out to its gate in the antechamber.
      exitHeart({ x: SANCTUM.gate.x - 150, y: SANCTUM.gate.y + 20 });
      hud.showReading(
        "The Choir's gifts",
        "You come to yourself floating in the antechamber, the resonator still warm on your back. Where the water was empty, a ring of light now stands: a Choir gate. It carries you home to the Kestrel, and its twin by the buoy brings you back here.\n\nAnd in your mind, clear as a drawing, the shape of a Choir lantern: a seed of its light that powers the base anywhere on the site, no current needed. Its build card is in build mode now.\n\nThe game goes on. There is a whole ocean of creatures still to raise.",
        'First contact is in your scanner log.',
      );
      persist();
    });
  }
  /** Step through a Choir gate: home to the Kestrel buoy, or back to the sanctum. */
  function choirGate(home: boolean): void {
    if (save.sub?.aboard) return;
    const to = home ? { x: SANCTUM.homeGate.x + 160, y: SANCTUM.homeGate.y - 120 } : { x: SANCTUM.gate.x - 160, y: SANCTUM.gate.y };
    diver.x = to.x;
    diver.y = to.y;
    diver.vx = diver.vy = 0;
    diver.surfaced = false;
    camCX = diver.x;
    camCY = diver.y;
    shake = Math.min(1, shake + 0.3);
    sound.find('bag');
    hud.toast(home ? 'Light folds round you, and opens on the Kestrel shelf.' : 'Light folds round you, and opens in the sanctum\'s antechamber.', 'big');
    persist();
  }

  // ---- The walkable base (after the Corvina on foot) ----
  const baseCtx: BaseCtx = {
    save,
    layout,
    carried: () => MATERIALS_LIST.reduce((a, k) => a + save.bag[k], 0),
    storageText: () => {
      const n = MATERIALS_LIST.reduce((a, k) => a + save.stored[k], 0);
      return `Storage: ${n} of ${storageCapacity(layout)} · nothing carried`;
    },
    unload: (id) => unloadAtPod({ powered: layout.powered.has(id), frame: false }),
    jarLabel: (id) => {
      const j = save.jar;
      if (!j) return null;
      const sp = SPECIES[j.species];
      const what = j.stage === 'egg' ? sp.eggName : j.stage === 'young' ? sp.youngName : sp.name.toLowerCase();
      return creaturesIn(save, id).length >= tankCapacity(layout, id) ? `Tank ${tankNumber(layout, id)} is full` : `Put ${what} in tank ${tankNumber(layout, id)}`;
    },
    deposit: (id) => depositJar(id),
    trayCount: (id) => MATERIALS_LIST.reduce((a, k) => a + (save.tankData[String(id)]?.out?.[k] ?? 0), 0),
    takeTray: (id) => takeTray(id),
    lines: () => save.lines,
    flow: (id) => {
      const f = factory.flows.get(id);
      return f ? { rate: f.rate, item: f.item } : null;
    },
    subDocked: (id) => !!save.sub && save.sub.stage === 'built' && save.sub.docked && save.sub.dock === id,
    boardSub: () => {
      if (!save.sub || save.sub.hull <= 0) {
        hud.toast('The hull is breached. Repair it at the dock panel before taking it out.', 'warn');
        return;
      }
      interior.leave();
      inside = null;
      backToWater();
      boardSub(false);
      persist();
    },
    whorlsFitted: (id) => save.fitted[String(id)] ?? 0,
    whorlsFree: () => whorlsFree(save),
    fitWhorl: (id, step) => {
      const p = layout.pieces.find((q) => q.id === id);
      if (!p) return;
      build.fitWhorlOn(p, step);
      sound.clip();
      persist();
    },
    // Before milestone 11 (Colin): the lift car carries you, instead of a jump cut.
    lift: (x, y) => {
      interior.startRide(x, y);
      sound.clamps(true);
    },
    // Milestone 9 (Colin): tending stays indoors. The camera eases in on the tank
    // room's window and the care panel opens beside it.
    tend: (id) => {
      care.setAvailable(id);
      care.open(id);
    },
    // The Lab and Workshop panel opens indoors too (Colin, after the terrain pass):
    // the camera frames the room and the walker waits while it is open.
    station: (id) => {
      station.setAvailable(id);
      station.open(id);
    },
    dock: (id) => peekOut('dock', id),
    build: () => peekOut('build', null),
    exit: (id) => exitBase(id),
    recompress: () => {
      save.suit = 1;
      save.oxygen = maxOxygen(save);
      suitCalm = 99;
      sound.clamps(true);
      hud.toast('The chamber seals and the pressure eases: suit integrity 100%, air full.', 'big');
      persist();
    },
    status: (p) => {
      const code = pieceCode(layout, p);
      if (!layout.powered.has(p.id)) return `${code}: no power. Join it to a current turbine.`;
      const net = layout.netFor(p.id)!;
      const watts = `${net.draw} of ${net.make} W used${net.rate < 1 ? ` · short of power, machines at ${Math.round(net.rate * 100)}%` : ''}`;
      switch (p.kind) {
        case 'turbine':
          if (layout.idleTurbine(p)) return `${code}: idle. The Kestrel current only drives ${TURBINE_LIMIT} turbines`;
          return `${code}: turning in the reef current · 12 W · ${watts}`;
        case 'thermal':
          return `${code}: sealed core glowing · 40 W · ${watts}`;
        case 'lantern':
          return `${code}: the Choir's light · 100 W · ${watts}`;
        case 'feeder': {
          const f = readings.feeder(p.id);
          return `${code}: hopper ${Math.round(f.hopper * 100)}% · mash ${Math.round(f.mash * 100)}%${f.run ? ' · pressing' : ''}`;
        }
        case 'press': {
          const r = readings.press(p.id);
          return `${code}: ${r.run ? 'pressing' : 'waiting for scrap and copper'} · ${r.plates} plate${r.plates === 1 ? '' : 's'} on the rack`;
        }
        case 'filter':
          return `${code}: pumping clean water to the tanks joined to it`;
        case 'crane':
          return `${code}: ${save.craneQueue ? `${save.craneQueue} salvage waiting` : 'idle. Lower salvage onto it from the sub, outside.'}`;
        case 'recomp':
          return `${code}: pressure chamber ready`;
        case 'farm': {
          const m = machineData(save, p.id);
          const grow = m.grow ?? 'fibre';
          return `${code}: growing ${grow === 'fibre' ? 'kelp fibre' : grow === 'resin' ? 'bladder kelp for resin' : `${PLANTS[grow].name.toLowerCase()} cuttings`} · ${Math.round(Math.min(1, m.press) * 100)}%${
            grow === 'fibre' ? ` · tray ${m.fibre}/${FARM_TRAY}` : grow === 'resin' ? ` · tray ${m.resin ?? 0}/${FARM_TRAY}` : ` · ${save.cuttings[grow] ?? 0} ready`
          }`;
        }
        default:
          return `${code}: ${PIECES[p.kind].name}`;
      }
    },
    pressing: (id) => factory.pressState.get(id) === 'running',
    feederLevels: (id) => readings.feeder(id),
    stationBusy: (id) => readings.station(id),
    // ---- Milestone 9 ----
    hatchery: (id) => hatchPanel.open(id),
    nursery: () => save.nursery,
    farmCrop: (id) => {
      const m = machineData(save, id);
      const grow = m.grow ?? 'fibre';
      return {
        name: grow === 'fibre' ? 'kelp fibre' : grow === 'resin' ? 'resin' : `${PLANTS[grow].name.toLowerCase()} cuttings`,
        grow,
        progress: Math.min(1, m.press),
        tray: grow === 'resin' ? (m.resin ?? 0) : m.fibre,
        cap: FARM_TRAY,
      };
    },
    farmCycle: (id) => {
      const m = machineData(save, id);
      const opts: ('fibre' | 'resin' | (typeof PLANT_ORDER)[number])[] = [
        'fibre',
        ...(save.scans.includes(PLANTS.bladder.scan) ? (['resin'] as const) : []),
        ...PLANT_ORDER.filter((pl) => save.scans.includes(PLANTS[pl].scan)),
      ];
      const i = opts.indexOf(m.grow ?? 'fibre');
      m.grow = opts[(i + 1) % opts.length];
      m.press = 0;
      sound.clip();
      hud.toast(
        m.grow === 'fibre'
          ? 'The farm grows kelp fibre: into its tray, for a conveyor (to an auto feeder or storage), or take it by hand.'
          : m.grow === 'resin'
            ? 'The farm grows bladder kelp and taps its resin: one every 4 minutes into its tray, for a conveyor to storage. Grand tanks, Hatcheries and sorting pods are built from it.'
            : `The farm grows ${PLANTS[m.grow].name.toLowerCase()} cuttings (${save.cuttings[m.grow] ?? 0} ready). Planting it in a tank uses a cutting instead of materials.`,
      );
      persist();
    },
    farmTake: (id) => {
      const m = machineData(save, id);
      const resin = m.resin ?? 0;
      if (m.fibre <= 0 && resin <= 0) return;
      save.bag.fibre += m.fibre;
      save.bag.resin += resin;
      hud.toast(`+${[m.fibre ? `${m.fibre} kelp fibre` : '', resin ? `${resin} resin` : ''].filter(Boolean).join(' and ')} from the farm's tray`);
      m.fibre = 0;
      m.resin = 0;
      hud.refreshInventory();
      persist();
    },
    reviveLabel: () => {
      const sp = SPECIES_ORDER.find((k) => (save.dormant[k] ?? 0) > 0);
      if (!sp) return { ok: false, text: 'Revival pool: no dormant creatures in storage. Nothing needs waking.' };
      const n = SPECIES_ORDER.reduce((a, k) => a + (save.dormant[k] ?? 0), 0);
      if (save.bag.bloom + save.stored.bloom < 1)
        return { ok: false, text: `Revival pool: ${n} dormant · each waking needs a glowing bloom (they grow only where no lamp has ever shone)` };
      if (!save.kit.jar) return { ok: false, text: 'Revival pool: the woken creature needs a specimen jar to go into' };
      if (save.jar) return { ok: false, text: 'Revival pool: empty your specimen jar first (the woken creature goes into it)' };
      return { ok: true, text: `Wake a dormant ${SPECIES[sp].name.toLowerCase()} (1 glowing bloom)` };
    },
    revive: () => {
      const sp = SPECIES_ORDER.find((k) => (save.dormant[k] ?? 0) > 0);
      if (!sp || save.jar || !save.kit.jar || !payCost(save, { bloom: 1 })) return;
      save.dormant[sp] = (save.dormant[sp] ?? 0) - 1;
      const c = { id: save.nextCreatureId++, species: sp, tank: -1, stage: 'young' as const, growth: 0, fed: 0.7, comfort: 0.5, sickness: 0, make: 0, traits: wildTraits() };
      save.jar = { species: sp, stage: 'young', keep: c, traits: c.traits };
      sound.find('bag');
      hud.refreshInventory();
      hud.toast(`The bloom's light sinks into the still water, and a young ${SPECIES[sp].name.toLowerCase()} stirs. It is in your specimen jar: put it in a tank.`, 'big');
      persist();
    },
    // ---- Milestone 10: the Signal array ----
    // Milestone 11: the console opens the zone map, which also reads the decoded fragments.
    signalLabel: () => {
      const status = signalStatus(save, layout);
      return { ok: true, text: `Open the zone map · ${status.replace(/^Signal array: /, '')}` };
    },
    signalRead: () => {
      zoneMap.show(save, { x: baseOutside().x, y: baseOutside().y }, (id) => {
        const e = SCAN_ENTRIES.find((x) => x.id === id);
        if (e) hud.showReading(e.name, e.text, 'Kept in your scanner log.');
      });
    },
    signalProgress: () => (nextFragment(save) && save.signals.progress > 0 ? save.signals.progress : -1),
    storedFrac: () => {
      const cap = storageCapacity(layout);
      return cap ? Math.min(1, MATERIALS_LIST.reduce((a, k) => a + save.stored[k], 0) / cap) : 0;
    },
  };
  function enterBase(domeId: number, waking = false, viaDock: number | null = null): void {
    const level = buildBaseLevel(layout);
    if (!level) return;
    baseDome = domeId;
    baseHooks = new BaseHooks(level, baseCtx, domeId);
    interior.enter(level.map, { breakers: [], taken: [] }, baseHooks);
    const dsp = viaDock !== null ? baseHooks.dockSpawn(viaDock) : null;
    if (dsp) interior.place(dsp.x, dsp.y, -1);
    inside = 'base';
    goOnFoot();
    if (!waking) sound.hatchCue(true);
    if (!save.tips.includes('basefoot'))
      setTimeout(() => {
        save.tips.push('basefoot');
        hud.toast(
          input.state.lastDevice === 'touch'
            ? 'Inside the base: dry air, and everything is used from in here. Walk with the stick, push up or down at a ladder to climb, and hold Collect at a console, a storage rack or a tank window.'
            : 'Inside the base: dry air, and everything is used from in here. A/D walk (hold Shift to sprint), Space jumps, W/S climb ladders, and hold C at a console, a storage rack or a tank window.',
          'big',
        );
      }, 900);
    else if (!waking) hud.toast('Dome habitat: dry air · progress saved');
    persist();
  }
  function exitBase(domeId: number): void {
    interior.leave();
    inside = null;
    backToWater();
    const p = layout.pieces.find((q) => q.id === domeId);
    const a = p ? airlockOutside(p) : baseOutside();
    diver.x = a.x;
    diver.y = a.y + 10;
    diver.vx = 0;
    diver.vy = 30;
    diver.surfaced = false;
    camCX = diver.x;
    camCY = diver.y;
    sound.hatchCue(false);
    persist();
  }
  /** Open a panel out in the world (the console's view), then come back in where you stood. */
  function peekOut(kind: 'care' | 'station' | 'dock' | 'build', id: number | null, select: number | null = null): void {
    const w = interior.walker;
    peek = { kind, id, select, x: w.x, y: w.y, face: w.face, opened: false };
    interior.leave();
    inside = null;
    backToWater();
    const p = layout.pieces.find((q) => q.id === (id ?? select ?? baseDome));
    if (p) {
      const r = pieceRect(p);
      diver.x = r.x + r.w / 2;
      diver.y = r.y + r.h / 2;
    }
    diver.vx = diver.vy = 0;
    camCX = diver.x;
    camCY = diver.y;
  }
  function backInside(): void {
    const pk = peek!;
    peek = null;
    const level = buildBaseLevel(layout);
    if (!level) {
      // No dome left to stand in: back outside, by the base.
      const a = baseOutside();
      diver.x = a.x;
      diver.y = a.y;
      return;
    }
    if (!level.airlocks.some((a) => a.id === baseDome)) baseDome = level.airlocks[0].id;
    baseHooks = new BaseHooks(level, baseCtx, baseDome);
    interior.enter(level.map, { breakers: [], taken: [] }, baseHooks);
    if (interior.standable(pk.x, pk.y)) interior.place(pk.x, pk.y, pk.face);
    inside = 'base';
    goOnFoot();
    persist();
  }

  /** After milestone 12: everything the new suit attachments and sub modules do each frame. */
  function gearFrame(dt: number, aboard: boolean, s: typeof input.state, inControl: boolean): void {
    const S = save.sub;
    const mods = S && S.stage === 'built' ? S.modules : [];
    const live = inControl && blackout === 0;
    // The satchel's second slot moves into the jar once the jar is emptied.
    if (!save.jar && save.jar2) {
      save.jar = save.jar2;
      save.jar2 = null;
    }
    // Flare launcher (Z, LT, or the flare button).
    if (s.flare && live && !aboard) {
      if (!hasGear(save, 'flare')) {
        if (time - noFlareAt > 6) {
          noFlareAt = time;
          hud.toast('No flare launcher yet: a Lab can work one out from scans of the kelp caves and their black water.', 'warn');
        }
      } else if (save.bag.quartz < 1) hud.toast('Each flare takes 1 quartz, carried', 'warn');
      else {
        save.bag.quartz--;
        hud.refreshInventory();
        const lp = diver.lampPose();
        gearFx.fireFlare(lp.x, lp.y, diver.facing);
        sound.flare();
      }
    }
    // Stun dart (X, RT, or the dart button): the nearest predator ahead, sharing the sonar's cooldown.
    if (s.dart && live && !aboard && hasGear(save, 'dart')) {
      if (time - sonarAt < 6) hud.toast(`The harpoon is recharging (${Math.ceil(6 - (time - sonarAt))} s)`, 'warn');
      else {
        const lp = diver.lampPose();
        let best: { x: number; y: number; hit: () => boolean } | null = null;
        let bd = 700;
        const consider = (x: number, y: number, hit: () => boolean) => {
          const dx = x - diver.x;
          const d = Math.hypot(dx, y - diver.y);
          if (dx * diver.facing > -60 && d < bd) {
            bd = d;
            best = { x, y, hit };
          }
        };
        for (const l of lurkers.list) {
          const h = l.head();
          consider(h.x, h.y, () => l.scare());
        }
        for (const h of hunters.list) consider(h.x, h.y, () => h.scare());
        sonarAt = time;
        const b = best as { x: number; y: number; hit: () => boolean } | null;
        if (b) {
          gearFx.fireDart(lp.x, lp.y, b.x, b.y);
          const stunned = b.hit();
          sound.dart(true);
          hud.toast(stunned ? 'The dart strikes: the predator jerks away into the dark.' : 'The dart strikes, but it was already retreating.');
        } else {
          gearFx.fireDart(lp.x, lp.y, lp.x + diver.facing * 520, lp.y);
          sound.dart(false);
          sonarAt = time - 4.5; // a miss recharges quicker
        }
      }
    }
    // Marks: the Echo visor (materials and young, about 20 m) and the sonar dome (materials, about 25 m).
    const marks: { x: number; y: number; teal?: boolean; young?: boolean }[] = [];
    if (!aboard && hasGear(save, 'visor') && !interior.active) {
      for (const m of pickups.materials()) if (Math.hypot(m.x - diver.x, m.y - diver.y) < 1500) marks.push({ x: m.x, y: m.y });
      for (const w of wildlife.youngSpots()) if (Math.hypot(w.x - diver.x, w.y - diver.y) < 1500) marks.push({ x: w.x, y: w.y, young: true });
    }
    if (aboard && mods.includes('sdome')) {
      for (const m of pickups.materials()) if (Math.hypot(m.x - sub.x, m.y - sub.y) < 1900) marks.push({ x: m.x, y: m.y, teal: true });
    }
    // Tractor beam: drive slowly and it draws the nearest loose material in, one every 1.2 s.
    tractorBeamT = Math.max(0, tractorBeamT - dt);
    if (tractorBeamT <= 0) tractorBeam = null;
    if (aboard && mods.includes('tractor') && S && !S.docked && Math.hypot(sub.vx, sub.vy) < 260) {
      tractorAt -= dt;
      if (tractorAt <= 0) {
        tractorAt = 1.2;
        let best: { id: string; x: number; y: number } | null = null;
        let bd = 300;
        for (const m of pickups.materials()) {
          const d = Math.hypot(m.x - sub.x, m.y - sub.y);
          if (d < bd && bagHasRoom(save, m.kind)) {
            bd = d;
            best = m;
          }
        }
        const b = best as { id: string; x: number; y: number } | null;
        if (b) {
          const kind = pickups.tractorTake(b.id, save);
          if (kind) {
            save.bag[kind]++;
            hud.refreshInventory(kind);
            hud.toast(`+1 ${MATERIALS[kind].name} (tractor beam)`);
            sound.tractor();
            tractorBeam = { x0: sub.x + sub.face * 98, y0: sub.y + 24, x1: b.x, y1: b.y };
            tractorBeamT = 0.6;
          }
        }
      }
    }
    // The drill seam in the trench wall: KS-1's drill nose bores it (hold Collect with the bow at it).
    sub.drilling = false;
    if (!seam.open && S && aboard) {
      const near = Math.hypot(sub.bowX() - SEAM.x, sub.y - SEAM.y) < 230;
      if (near && !mods.includes('drill')) hud.setBanner('A soft rock seam: a drill nose on KS-1 could bore through it.');
      else if (near && live && s.collect) {
        drillT += dt;
        sub.drilling = true;
        gearFx.drillSparks(sub.bowX() + sub.face * 30, sub.y + 5);
        if (Math.random() < dt * 8) sound.drill();
        hud.setBanner(`Drilling the seam · ${Math.round(Math.min(1, drillT / 3) * 100)}%`);
        if (drillT >= 3) {
          seam.open = true;
          save.seamOpen = true;
          scenery.setSeam(true);
          drone.cheer();
          hud.setBanner('');
          hud.toast('The drill breaks through! Behind the seam, a sealed grotto: glowing blooms that never saw a lamp, vent ore, and an Echo whorl.', 'big');
          persist();
        }
      } else if (near) hud.setBanner('A soft rock seam: hold Collect to drill it.');
      else drillT = Math.max(0, drillT - dt);
    }
    gearFx.update(dt, time, marks, tractorBeam, zoom);
    if (S) sub.setLook(!!S.plating, !!save.sanctum.contact);
    flareBtn.hidden = !hasGear(save, 'flare') || aboard;
    dartBtn.hidden = !hasGear(save, 'dart') || aboard;
  }
  const flareBtn = document.getElementById('btn-flare') as HTMLButtonElement;
  const dartBtn = document.getElementById('btn-dart') as HTMLButtonElement;
  const FIND_NOTE = 'Kept in your scanner log.';
  function interiorFrame(dt: number, deltaMS: number): void {
    input.suspended = padNav.active;
    input.update();
    const s = input.state;
    const paused = hud.reading || zoneMap.open;
    // The interior reads her state straight from the save, so they never drift apart.
    if (inside === 'corvina') interior.syncState(save.corvina.breakers, save.corvina.taken ?? []);
    if (inside === 'fulmar') interior.syncState(save.fulmar.breakers, save.fulmar.taken);
    if (inside === 'sanctum') interior.syncState([], save.sanctum.taken);
    if (inside === 'base' && baseHooks && baseHooks.level.signature !== baseSignature(layout)) {
      // A piece finished or was taken down while you were inside: rebuild the rooms around you.
      const level = buildBaseLevel(layout);
      if (!level) {
        exitBase(baseDome ?? -1);
        return;
      }
      baseHooks = new BaseHooks(level, baseCtx, baseDome);
      interior.reload(level.map, baseHooks);
      if (!interior.standable(interior.walker.x, interior.walker.y)) interior.place(baseHooks.spawn.x, baseHooks.spawn.y, 1);
    }
    // The same dive bag as in the water, swinging at the hip.
    interior.walker.load = bagLoad(save);
    interior.walker.jar = save.jar;
    interior.walker.kit = kitLook();
    interior.canGrapple = hasGear(save, 'tow');
    // Tending a tank indoors: the walker waits at the window while the panel is open.
    // Milestone 9: the Hatchery's panel frames its cradles the same way.
    if (inside === 'base' && care.active && care.tankId !== null && baseHooks) {
      const f = baseHooks.tankFocus(care.tankId);
      interior.focus = f ? { ...f, panelPx: Math.min(360, cssW * 0.44) + 24 } : null;
    } else if (inside === 'base' && hatchPanel.active && hatchPanel.pieceId !== null && baseHooks) {
      const f = baseHooks.roomFocus(hatchPanel.pieceId);
      interior.focus = f ? { ...f, panelPx: Math.min(360, cssW * 0.44) + 24 } : null;
    } else if (inside === 'base' && station.active && station.pieceId !== null && baseHooks) {
      const f = baseHooks.roomFocus(station.pieceId);
      interior.focus = f ? { ...f, panelPx: Math.min(380, cssW * 0.46) + 24 } : null;
    } else if (inside === 'sanctum' && contact.active) {
      // First contact: the camera draws back to frame the Choir's chamber.
      interior.focus = { x: CHOIR_AT.x, y: CHOIR_AT.y + 60, h: 1000, panelPx: 0 };
    } else {
      interior.focus = null;
      if (care.available !== null && !care.active) care.setAvailable(null);
      if (station.available !== null && !station.active) station.setAvailable(null);
    }
    if (inside !== 'base' && hatchPanel.active) hatchPanel.close();
    if (inside !== 'base' && station.active) station.close();
    care.update(dt);
    hatchPanel.update(dt);
    station.update(dt);
    contact.update(dt);
    const frozen = care.active || hatchPanel.active || station.active || contact.active;
    // The resonator sings at the song-lock, and while you answer the Choir.
    {
      const want = Math.max(contact.singing, interior.label === 'Sing to the song-lock' && s.collect ? 1 : 0);
      interior.walker.singing += (want - interior.walker.singing) * Math.min(1, dt * 5);
    }
    const evs: InteriorEvent[] = interior.update(
      dt,
      frozen ? { moveX: 0, moveY: 0, jump: false, collect: false, lamp: false } : { moveX: s.moveX, moveY: s.moveY, jump: s.jumpHeld, sprint: s.sprint, collect: s.collect, lamp: s.lamp },
      paused,
    );
    const maxO2 = maxOxygen(save);
    if (!paused) {
      save.playSeconds += dt;
      // Old, dry air in a sealed ship: breathable. The suit slowly mends between knocks.
      save.oxygen = Math.min(maxO2, save.oxygen + (maxO2 / 3) * dt);
      suitCalm += dt;
      if (inside === 'base') save.suit = Math.min(1, save.suit + dt * 0.25);
      else if (suitCalm > 8) save.suit = Math.min(1, save.suit + dt * 0.012);
      if (inside === 'base') {
        const o = baseOutside();
        simBase(dt, { x: o.x, y: o.y, face: 1, speed: 0, repairing: false, aboard: false });
      }
    }
    // Waking up in the dome after a blackout: the screen fades back in here.
    if (blackout > 0) {
      blackout += dt;
      const dark = blackout < BLACK_IN + BLACK_HOLD ? 1 : Math.max(0, 1 - (blackout - BLACK_IN - BLACK_HOLD) / BLACK_OUT);
      hud.setBlackout(dark, blackoutMsg);
      if (blackout >= BLACK_IN + BLACK_HOLD + BLACK_OUT) {
        blackout = 0;
        hud.setBlackout(0, '');
      }
    }
    for (const e of evs) {
      if (e.type === 'exit') {
        if (inside === 'fulmar') exitFulmar();
        else if (inside === 'sanctum') exitHeart();
        else exitCorvina();
        return;
      } else if (e.type === 'find' && inside === 'sanctum') {
        if (e.id === '1') {
          sound.find('bag');
          hud.toast('The resonator sings, the lens of light sings back, and the song-lock folds itself away.', 'big');
        } else if (e.id === '9') startContact();
        persist();
      } else if (e.type === 'breaker' && inside === 'fulmar') {
        sound.clip();
        const left = save.fulmar.breakers.filter((b) => !b).length;
        hud.toast(
          e.power
            ? "With a groan the Fulmar's emergency power comes back: lamps along her decks, the lift, and the door to her array room."
            : `The breaker clunks over. ${left} more somewhere aboard.`,
          'big',
        );
        persist();
      } else if (e.type === 'find' && inside === 'fulmar') {
        sound.find('bag');
        if (e.id === '4') {
          if (!save.signals.found.includes('sig3')) save.signals.found.push('sig3');
          hud.toast('A pattern spool from the comms rack, labelled "NIGHT 3,104 · BELOW". A Signal array could read it.', 'big');
        } else if (e.id === '5') {
          if (!save.signals.found.includes('sig4')) save.signals.found.push('sig4');
          hud.toast('The last spool, still threaded in the array\'s reader: "LAST NIGHT · THE DOOR". A Signal array could read it.', 'big');
        } else if (e.id === '6') {
          if (!save.finds.includes('resonplans') && !save.blueprints.includes('resonator')) save.finds.push('resonplans');
          hud.showReading(
            'Resonator drawings',
            "Pinned over the array's reader: drawings for a ring of tuned crystal and vent ore, with the Choir's patterns written round it like music. The crew's last note: \"It sings their words back. The doors below answer to nothing else.\"\n\nA Lab can decode them.",
            'Taken: decode it in a Lab.',
          );
        } else if (e.id === '7') {
          if (!save.scans.includes('fulmarlog')) save.scans.push('fulmarlog');
          const entry = SCAN_ENTRIES.find((x) => x.id === 'fulmarlog')!;
          hud.showReading("The Fulmar's listening log", entry.text, FIND_NOTE);
        } else {
          save.bag.ore += 3;
          save.bag.brass += 2;
          save.bag.bloom += 1;
          hud.refreshInventory();
          hud.toast('A supply locker: 3 vent ore, 2 brass fittings, and a glowing bloom pressed in a jar.', 'big');
        }
        persist();
      } else if (e.type === 'breaker') {
        sound.clip();
        hud.toast(
          e.power
            ? "With a clunk and a hum the Corvina's emergency power comes back: lights along her decks, the lift, and the door to her survey lab."
            : 'The breaker clunks over. One more somewhere aboard brings her emergency power back.',
          'big',
        );
        persist();
      } else if (e.type === 'find') {
        sound.find('bag');
        if (e.id === '1') {
          if (!save.finds.includes('sonardata') && !save.blueprints.includes('sonar')) save.finds.push('sonardata');
          hud.showReading('Sonar test logs', "Pages of pulse tests from the Corvina's lab: echoes off rock, off silt, off something large that moved between pings.\n\nA Lab can decode these into the sonar pulse: it maps hollows hidden behind silt and rock, and sends hunters back into their dens.", 'Taken: decode it in a Lab.');
        } else if (e.id === '2') {
          if (!save.finds.includes('suitplans') && !save.blueprints.includes('psuit')) save.finds.push('suitplans');
          hud.showReading('Pressure suit drawings', 'A waterproof roll of drawings: a deep-water suit, brass-ringed and pressure-sealed, safe far below the Kestrel suit.\n\nA Lab can decode them. You will need it for the trench.', 'Taken: decode it in a Lab.');
        } else if (e.id === '3') {
          if (!save.scans.includes('cvlog')) save.scans.push('cvlog');
          const entry = SCAN_ENTRIES.find((x) => x.id === 'cvlog')!;
          hud.showReading("The Corvina's log", entry.text, FIND_NOTE);
        } else {
          save.bag.brass += 3;
          save.bag.plate += 2;
          hud.refreshInventory();
          hud.toast('A salvage crate: 3 brass fittings and 2 hull plating, still dry.', 'big');
        }
        persist();
      } else if (e.type === 'hurt') {
        save.suit = Math.max(0, save.suit - e.amount);
        suitCalm = 0;
        hud.suitHit();
        sound.hurt(e.why);
        if (e.why === 'bilge' && !save.tips.includes('bilge')) {
          save.tips.push('bilge');
          hud.toast('The bilge is deep, cold and full of wreckage: you haul yourself back out where you last stood. Your suit takes a knock.', 'warn');
        }
        if (save.suit <= 0) {
          // The suit gives way: back outside, and the usual blackout takes over.
          if (inside === 'fulmar') exitFulmar();
          else exitCorvina();
          return;
        }
      } else if (e.type === 'lift') sound.clamps(true);
      else if (e.type === 'grapple') sound.clip();
      else if (e.type === 'jump') sound.step(true);
      else if (e.type === 'land') sound.step(false, e.hard);
    }
    hud.setCollect(frozen ? null : interior.label, frozen ? 0 : interior.progress);
    hud.setBanner(frozen ? '' : interior.banner);
    watch.draw(performance.now(), save.oxygen, maxO2, 0, 0, true, { kg: bagWeight(save.bag), ...bagLimits(save) }, save.suit);
    hud.setSuit(save.suit, true);
    hud.setSubChip(null);
    hud.setBoard(null);
    hud.setJar(jarText());
    const soundAt = inside === 'base' ? baseOutside() : inside === 'sanctum' ? { x: SANCTUM.heart.x, y: SANCTUM.heart.y - 100 } : inside === 'fulmar' ? { x: FULMAR_HATCH.x, y: FULMAR_HATCH.y + 120 } : { x: CV_HATCH.x, y: CV_HATCH.y + 120 };
    sound.update({
      dt,
      x: soundAt.x,
      y: soundAt.y,
      depthM: 20,
      surfaced: false,
      aboard: false,
      inDome: true,
      blackout: 0,
      panel: paused ? 'read' : frozen ? 'care' : '',
      speed: Math.abs(interior.walker.vx),
      boosting: false,
      lampOn: interior.lampOn,
      lowAir: 0,
      freeAir: true,
      work: interior.progress > 0 ? 'winch' : null,
      workX: soundAt.x,
      scanning: null,
      drone: { x: 0, y: 0, welding: false },
      presses: [],
      feeders: [],
      sub: null,
      splash: 0,
      exhale: false,
      surge: 0,
      inAir: true,
      race: 0,
      suit: save.suit,
    });
    saveTimer += dt;
    if (saveTimer > 5) persist();
    ui.tick(deltaMS);
  }

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
    perf,
    adaptFrame: (ms: number) => adaptFrame(ms),
    renderScale,
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
    station,
    audio,
    sound,
    tickStations: (sec: number) => {
      for (let t = 0; t < sec; t += 0.5) tickStations(save, layout, 0.5);
    },
    debug: () => ({ grapple, holdKey, holdProgress, label: document.getElementById('collect-label')?.textContent }),
    interior,
    enterCorvina: () => enterCorvina(),
    enterFulmar: () => enterFulmar(),
    enterHeart: () => enterHeart(),
    contact,
    choirGate: (home: boolean) => choirGate(home),
    zoneMap: () => zoneMap.show(save, { x: diver.x, y: diver.y }, () => {}),
    hunters,
    enterBase: (id: number) => enterBase(id),
    baseHooks: () => baseHooks,
    where: () => ({ inside, peek }),
    hudReading: () => hud.reading,
    cam: () => ({ camX, camY, camCX, camCY, viewH, zoom }),
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
