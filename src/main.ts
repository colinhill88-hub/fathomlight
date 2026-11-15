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
import { bakeSkyVisibility, groundY, WORLD_H, WORLD_W, WU_PER_METRE } from './world/terrain';

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
 */
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

  let scenery = new Scenery(renderer, preset.detail);
  const diver = new Diver();
  diver.x = 380;
  diver.y = 300;
  const bubbles = new Bubbles(renderer);
  const grotto = { x0: 2560, x1: 3250, y0: 760, y1: 1000 };
  const fish = [0, 0, 1].map((look) => new Glowfin(look, grotto));
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
    litCam.addChild(scenery.view, ...fish.map((f) => f.view), diver.view, bubbles.view);
    frontCam.addChild(scenery.front);
    emissiveCam.addChild(scenery.emissive, ...fish.map((f) => f.lure), diver.lens);
    glowCam.addChild(scenery.glow, ...fish.map((f) => f.halo), diver.lensGlow);
  }
  populate();

  app.stage.addChild(water.view, backdrop.view, lighting.view, emissiveCam, glowSprite, snow.view);

  const input = new Input(host);
  const depthEl = document.getElementById('depth')!;
  const hintEl = document.getElementById('hint')!;
  let hintTimer = 0;

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
    buildId: __BUILD_ID__,
    setChoice: (c) => {
      choice = c;
      saveChoice(c);
      preset = resolveChoice(c);
      rebuild();
    },
  });

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
    diver.update(dt, s.moveX, s.moveY, s.boost, s.lamp);
    for (const f of fish) f.update(dt, time, diver.x, diver.y);
    scenery.update(time, diver.x, diver.y, diver.vx);
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

    for (const c of [litCam, emissiveCam, glowCam]) {
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

    const lights: Light[] = [lampLight, ...scenery.lights, ...fish.map((f) => f.light)];
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
    depthEl.textContent = `${(Math.max(0, diver.y) / WU_PER_METRE).toFixed(1)} m`;
    ui.tick(ticker.deltaMS);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) app.ticker.stop();
    else app.ticker.start();
  });

  // For automated checks: lets a test drive the diver without real touches.
  (window as unknown as { __fathom: unknown }).__fathom = {
    diver,
    app,
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
