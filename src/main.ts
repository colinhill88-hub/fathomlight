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
import { clearSave, loadSave, MATERIALS, maxOxygen, SaveData, TANK_BONUS, writeSave } from './game/state';
import { Scanner } from './game/scanner';
import { Hud } from './ui/hud';
import { DiveWatch } from './ui/watch';

declare const __BUILD_ID__: string;

/** How many world units fit in the screen's height. Fixed, so every device frames the scene the same. */
const VIEW_H = 640;

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
      pickups.view,
      ...schools.map((s) => s.view),
      ...fish.map((f) => f.view),
      diver.view,
      bubbles.view,
      scenery.over,
    );
    frontCam.addChild(scenery.front);
    emissiveCam.addChild(scenery.emissive, pickups.emissive, ...fish.map((f) => f.lure), diver.lens);
    glowCam.addChild(scenery.glow, pickups.glow, ...fish.map((f) => f.halo), diver.lensGlow);
  }
  populate();

  app.stage.addChild(water.view, backdrop.view, lighting.view, emissiveCam, glowSprite, snow.view, overlayCam);

  const input = new Input(host);
  const hud = new Hud(() => save);
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

    input.update();
    const s = input.state;
    const inControl = blackout === 0;
    diver.update(dt, inControl ? s.moveX : 0, inControl ? s.moveY : 0, inControl && s.boost, inControl && s.lamp);

    // The cave in the east cliff is too dark to go further in.
    if (diver.x > CAVE_GATE_X && diver.y > caveTop(CAVE_GATE_X) - 30) {
      diver.x = CAVE_GATE_X;
      if (diver.vx > 0) diver.vx = 0;
    }
    const inCave = inCaveTunnel(diver.x, diver.y) && diver.x > CAVE.x0 + 120;
    hud.setBanner(
      inCave
        ? 'Pitch black ahead. The shoulder lamp barely dents this darkness. A proper dive light would open the way (built later in the Workshop).'
        : '',
    );

    // ---- Oxygen ----
    const atSurface = diver.y <= SURFACE_Y;
    const maxO2 = maxOxygen(save);
    save.playSeconds += dt;
    if (blackout === 0) {
      if (atSurface) {
        save.oxygen = Math.min(maxO2, save.oxygen + (maxO2 / 3) * dt);
        diveTime = 0;
        lowWarned = false;
      } else {
        save.oxygen = Math.max(0, save.oxygen - dt * (diver.boosting ? 1.8 : 1));
        diveTime += dt;
      }
      const frac = save.oxygen / maxO2;
      if (frac < 0.25 && !lowWarned && !atSurface) {
        lowWarned = true;
        hud.toast('Oxygen low: head for the surface', 'warn');
      }
      hud.setLowOxygen(atSurface ? 0 : Math.max(0, (0.25 - frac) / 0.25) * (0.75 + 0.25 * Math.sin(time * 5)));
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
        diver.x = SPAWN.x;
        diver.y = SPAWN.y;
        diver.vx = diver.vy = 0;
        camCX = diver.x;
        camCY = diver.y;
        save.oxygen = maxO2;
        diveTime = 0;
        lowWarned = false;
        hud.setLowOxygen(0);
        blackoutMsg = save.dropped
          ? 'You blacked out. The crew pulled you back to the Kestrel buoy. Your sample bag is on the seabed where you fell; its amber light is blinking.'
          : 'You blacked out. The crew pulled you back to the Kestrel buoy.';
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
    const now = Date.now();
    for (const ev of pickups.update(dt, time, diver.x, diver.y, save, now)) {
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

    for (const f of fish) f.update(dt, time, diver.x, diver.y);
    const [bx, by] = diver.bubblePoint();
    bubbles.update(dt, bx, by, diver.vx, diver.vy, diver.boosting);

    if (Math.hypot(s.moveX, s.moveY) > 0.2 && hintTimer === 0) hintTimer = 0.001;
    if (hintTimer > 0) {
      hintTimer += dt;
      if (hintTimer > 2.5) hintEl.classList.add('gone');
    }

    const viewW = cssW / zoom;
    const viewH = VIEW_H;
    const lookX = diver.x + diver.vx * 0.35 + (diver.vx >= 0 ? 60 : -60);
    const lookY = diver.y + diver.vy * 0.25 + 30;
    const k = 1 - Math.exp(-3.2 * dt);
    const prevX = camCX;
    const prevY = camCY;
    camCX += (lookX - camCX) * k;
    camCY += (lookY - camCY) * k;
    // Keep the camera inside the world (a little sky is allowed at the top).
    camCX = viewW >= WORLD_W ? WORLD_W / 2 : Math.max(viewW / 2, Math.min(WORLD_W - viewW / 2, camCX));
    camCY = Math.max(viewH / 2 - 70, Math.min(WORLD_H - viewH / 2, camCY));
    const camX = camCX - viewW / 2;
    const camY = camCY - viewH / 2;
    scenery.update(time, diver.x, diver.y, diver.vx, camX, camX + viewW);
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

    const lights: Light[] = [lampLight, ...scenery.lights, ...pickups.lights, ...fish.map((f) => f.light)];
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
    const depthM = Math.max(0, diver.y - SURFACE_Y + 6) / WU_PER_METRE;
    watch.draw(performance.now(), save.oxygen, maxO2, atSurface ? 0 : depthM, diveTime, atSurface);
    if (pickups.bagPos) {
      const p = pickups.bagPos;
      hud.setBagMarker((p.x - camX) * zoom, (p.y - camY) * zoom, Math.hypot(p.x - diver.x, p.y - diver.y) / WU_PER_METRE);
    } else hud.setBagMarker(null, 0, 0);

    saveTimer += dt;
    if (saveTimer > 5) persist();
    ui.tick(ticker.deltaMS);
  });

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
