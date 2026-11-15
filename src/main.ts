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
  WORLD_W,
  WU_PER_METRE,
} from './world/terrain';
import { clearSave, loadSave, MATERIAL_ORDER as MATERIALS_LIST, MATERIALS, maxOxygen, SaveData, TANK_BONUS, writeSave } from './game/state';
import { Scanner } from './game/scanner';
import { SurfaceFx } from './fx/surface';
import { Hud } from './ui/hud';
import { DiveWatch } from './ui/watch';
import { BaseLayout, GRID_BASE, GRID_X0, GRID_X1, pieceRect, Placed } from './game/base';
import { BaseView, BuildOverlay, storageCapacity } from './world/basegfx';
import { BuildMode } from './ui/build';

declare const __BUILD_ID__: string;

/** How many world units fit in the screen's height. Fixed, so every device frames the scene the same. */
const VIEW_H = 640;
/** The camera zooms out to this while building, so the whole Kestrel site fits. */
const VIEW_H_BUILD = 860;

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
  const fish = [0, 0, 1].map((look) => new Glowfin(look, GROTTO));
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
    { id: 'beacon', points: () => scenery.scanPoints.beacon },
    { id: 'cave', points: () => scenery.scanPoints.cave },
  ]);
  overlayCam.addChild(scanner.overlay);
  const surfaceFx = new SurfaceFx();

  // The base at the Kestrel site.
  const layout = new BaseLayout(save.pieces);
  save.pieces = layout.pieces;
  const baseView = new BaseView();
  baseView.sync(layout);
  const buildOverlay = new BuildOverlay();
  overlayCam.addChild(buildOverlay.view);
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
      pickups.view,
      ...schools.map((s) => s.view),
      ...fish.map((f) => f.view),
      diver.view,
      bubbles.view,
      baseView.front,
      scenery.over,
    );
    frontCam.addChild(scenery.front);
    emissiveCam.addChild(scenery.emissive, baseView.emissive, pickups.emissive, ...fish.map((f) => f.lure), diver.lens, surfaceFx.view);
    glowCam.addChild(scenery.glow, baseView.glow, pickups.glow, ...fish.map((f) => f.halo), diver.lensGlow);
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
      persist();
    },
    toast: (t, k) => hud.toast(t, k),
    refreshInventory: () => hud.refreshInventory(),
    capacity: () => storageCapacity(layout),
  });

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
    build.setAvailable(atSite && blackout === 0);
    build.pollPad(dt);
    input.suspended = build.active;
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
    const inControl = blackout === 0 && !build.active;
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
    if (build.active && blackout === 0) {
      // Planning the base pauses the air clock.
    } else if (blackout === 0) {
      if (atSurface || domeAir) {
        // Air comes in from the first breath after breaking the surface.
        if (domeAir || diver.surfaceTime > 0.4) save.oxygen = Math.min(maxO2, save.oxygen + (maxO2 / 3) * dt);
        diveTime = 0;
        lowWarned = false;
      } else {
        // Hard work uses air faster: boosting, and prying materials loose.
        save.oxygen = Math.max(0, save.oxygen - dt * (diver.boosting ? 1.8 : pickups.working ? 1.3 : 1));
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
        const home = respawnPoint();
        diver.x = home.x;
        diver.y = home.y;
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
          ? `You blacked out. The crew pulled you back to ${where}. Your sample bag is on the seabed where you fell; its amber light is blinking.`
          : `You blacked out. The crew pulled you back to ${where}.`;
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
    for (const ev of pickups.update(dt, time, diver.x, diver.y, save, inControl && s.collect && !diver.surfaced, speed)) {
      if (ev.type === 'material') {
        save.bag[ev.kind]++;
        hud.refreshInventory(ev.kind);
        hud.toast(`+1 ${MATERIALS[ev.kind].name}`);
      } else if (ev.type === 'tank') {
        save.oxygen = maxOxygen(save);
        hud.toast(`Air tank upgrade! Dive time +${TANK_BONUS} s`, 'big');
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
    diver.working = pickups.working && pt ? { x: pt.x, y: pt.y } : null;
    hud.setCollect(pt && !diver.surfaced ? Pickups.actionLabel(pt.kind) : null, pickups.progress);

    // ---- Storage: swim up to a powered pod to unload everything carried ----
    let byPod = false;
    let podPowered = false;
    for (const p of layout.pieces) {
      if (p.kind !== 'storage') continue;
      const r = pieceRect(p);
      if (diver.x > r.x - 30 && diver.x < r.x + r.w + 30 && diver.y > r.y - 30 && diver.y < r.y + r.h + 30) {
        byPod = true;
        podPowered ||= layout.powered.has(p.id);
      }
    }
    if (byPod && !nearStorage && blackout === 0 && !build.active) {
      const carried = MATERIALS_LIST.reduce((a, k) => a + save.bag[k], 0);
      if (!podPowered) {
        if (carried) hud.toast('This storage pod has no power: join it to a current turbine', 'warn');
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

    // Zoom out smoothly while building.
    viewH += ((build.active ? VIEW_H_BUILD : VIEW_H) - viewH) * (1 - Math.exp(-4 * dt));
    zoom = cssH / viewH;
    const viewW = cssW / zoom;
    let lookX = diver.x + diver.vx * 0.35 + (diver.vx >= 0 ? 60 : -60);
    let lookY = diver.y + diver.vy * 0.25 + 30;
    if (build.active) {
      // Frame the whole site if it fits, else follow the piece being placed.
      const siteW = GRID_X1 - GRID_X0 + 240;
      const focus = build.ghost ? pieceRect(build.ghost) : build.selected ? pieceRect(build.selected) : null;
      const mid = (GRID_X0 + GRID_X1) / 2;
      lookX = viewW >= siteW || !focus ? mid : Math.max(GRID_X0 - 120 + viewW / 2, Math.min(GRID_X1 + 120 - viewW / 2, focus.x + focus.w / 2));
      // Seabed at the site about three quarters down, above the piece bar.
      lookY = GRID_BASE + 40 - 0.25 * viewH;
    }
    const k = 1 - Math.exp(-3.2 * dt);
    const prevX = camCX;
    const prevY = camCY;
    camCX += (lookX - camCX) * k;
    camCY += (lookY - camCY) * k;
    // Keep the camera inside the world (a little sky is allowed at the top).
    camCX = viewW >= WORLD_W ? WORLD_W / 2 : Math.max(viewW / 2, Math.min(WORLD_W - viewW / 2, camCX));
    // A little sky is allowed at the top, enough to see a splash.
    camCY = Math.max(viewH / 2 - (build.active ? 260 : 110), Math.min(WORLD_H - viewH / 2, camCY));
    camX = camCX - viewW / 2;
    camY = camCY - viewH / 2;
    scenery.update(time, diver.x, diver.y, diver.vx, camX, camX + viewW);
    const storedNow = MATERIALS_LIST.reduce((a, k) => a + save.stored[k], 0);
    const cap = storageCapacity(layout);
    baseView.update(dt, time, layout, cap ? storedNow / cap : 0, camX, camX + viewW);
    buildOverlay.view.visible = build.active;
    if (build.active) {
      const gs = build.ghostState();
      buildOverlay.update(time, layout, build.ghost && gs ? { ...build.ghost, ok: gs.ok } : null, build.selected);
    }
    for (const sc of schools) sc.update(dt, time, diver.x, diver.y, camX, camX + viewW);

    for (const c of [litCam, emissiveCam, glowCam, overlayCam]) {
      c.scale.set(zoom);
      c.position.set(-camX * zoom, -camY * zoom);
    }
    // Foreground plants are "closer" to us, so they are bigger and move faster.
    const fz = zoom * 1.25;
    frontCam.scale.set(fz);
    frontCam.position.set(cssW / 2 - camCX * 1.3 * fz + WORLD_W * 0.15 * fz, cssH / 2 - camCY * fz + 40 * zoom);

    // Shoulder lamp.
    const lp = diver.lampPose();
    lampLight.x = lp.x;
    lampLight.y = lp.y;
    lampLight.dirX = lp.dirX;
    lampLight.dirY = lp.dirY;
    lampLight.intensity = 1.5 * diver.lamp;
    diver.lens.position.set(lp.x, lp.y);
    diver.lens.alpha = 0.25 + 0.75 * diver.lamp;
    diver.lensGlow.position.set(lp.x, lp.y);
    diver.lensGlow.alpha = diver.lamp;

    const lights: Light[] = [lampLight, ...scenery.lights, ...baseView.lights, ...pickups.lights, ...fish.map((f) => f.light)];
    const floor = groundY(Math.max(0, Math.min(WORLD_W, diver.x)));
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
    watch.draw(performance.now(), save.oxygen, maxO2, atSurface ? 0 : depthM, diveTime, atSurface);
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
