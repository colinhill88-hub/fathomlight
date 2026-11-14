import { Application, Container } from 'pixi.js';
import { loadChoice, pixelRatioFor, Preset, PresetChoice, resolveChoice, saveChoice } from './presets';
import { Water } from './scene/water';
import { Backdrop } from './scene/backdrop';
import { MarineSnow } from './scene/particles';
import { initSettingsUI } from './ui';

declare const __BUILD_ID__: string;

async function boot(): Promise<void> {
  const host = document.getElementById('game')!;
  let choice: PresetChoice = loadChoice();
  let preset: Preset = resolveChoice(choice);

  const app = new Application();
  await app.init({
    // WebGL 2 runs everywhere we care about and is what our custom shaders are written for.
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

  const world = new Container();
  const water = new Water();
  const backdrop = new Backdrop();
  const snow = new MarineSnow();
  world.addChild(water.view, backdrop.view, snow.view);
  app.stage.addChild(world);

  let cssW = window.innerWidth;
  let cssH = window.innerHeight;

  function rebuild(): void {
    cssW = window.innerWidth;
    cssH = window.innerHeight;
    app.renderer.resize(cssW, cssH, pixelRatioFor(preset, cssW, cssH));
    app.ticker.maxFPS = preset.maxFps;
    backdrop.build(preset.parallaxLayers, cssW, cssH);
    snow.build(app.renderer, preset.particleDensity, cssW, cssH);
    ui.refresh();
  }

  const ui = initSettingsUI({
    getChoice: () => choice,
    getPreset: () => preset,
    getPixelSize: () => [app.canvas.width, app.canvas.height],
    getRendererName: () => (app.renderer.type === 1 ? 'WebGL' : 'WebGPU'),
    buildId: __BUILD_ID__,
    setChoice: (c) => {
      choice = c;
      saveChoice(c);
      preset = resolveChoice(c);
      rebuild();
    },
  });

  // Resize when the window changes or the phone rotates. Wait a moment,
  // because iOS reports the new size slightly after the rotation event.
  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(rebuild, 120);
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  rebuild();

  // The view drifts slowly sideways so the parallax layers are visible.
  // In milestone 1 the camera will follow the diver instead.
  let time = 0;
  let scroll = 0;
  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS / 1000, 0.1);
    time += dt;
    const drift = dt * 14;
    scroll += drift;
    water.update(time, scroll / cssW, app.canvas.width, app.canvas.height);
    backdrop.update(scroll);
    snow.update(dt, time, drift);
    ui.tick(ticker.deltaMS);
  });

  // Stop drawing while the app is in the background, to save battery.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) app.ticker.stop();
    else app.ticker.start();
  });
}

boot().catch((err) => {
  console.error(err);
  const box = document.getElementById('boot-error')!;
  box.hidden = false;
  box.textContent =
    'Fathomlight could not start its graphics. ' + 'Please send this message to Colin: ' + String(err?.message ?? err);
});
