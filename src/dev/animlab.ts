import { Application, Container } from 'pixi.js';
import { Diver } from '../actors/diver';
import { groundY, isSolid } from '../world/terrain';
import { walkerLab } from './walkerlab';

/**
 * Animation lab: open animlab.html (on the play link, or with `npm run dev`).
 * The diver swims through a fixed script of inputs (floating, slow, fast,
 * boost, turns, climbs, dives, stops) without moving
 * across the screen, shown twice: at iPhone landscape gameplay scale on the
 * left and close up on the right.
 *
 * Keys: WASD / arrows swim yourself, Shift boosts, P (or a tap) pauses the script.
 * URL: ?seg=N starts at script segment N; ?manual turns the script off.
 * For automated screenshots: window.__lab.step(seconds) advances the clock
 * by fixed 1/60 s steps while ?frozen holds the real clock still.
 */

interface Seg {
  name: string;
  t: number;
  x: number;
  y: number;
  boost?: boolean;
}

export const SCRIPT: Seg[] = [
  { name: 'floating still', t: 5, x: 0, y: 0 },
  { name: 'slow swim', t: 4, x: 0.45, y: 0 },
  { name: 'fast swim', t: 4, x: 1, y: 0 },
  { name: 'boost', t: 2, x: 1, y: 0, boost: true },
  { name: 'back to cruising', t: 2.5, x: 1, y: 0 },
  { name: 'let go: glide and settle', t: 4, x: 0, y: 0 },
  { name: 'set off again', t: 2.5, x: 1, y: 0 },
  { name: 'turn around', t: 3, x: -1, y: 0 },
  { name: 'diagonal up', t: 3, x: -0.7, y: -0.7 },
  { name: 'straight up', t: 3, x: 0, y: -1 },
  { name: 'straight down', t: 3, x: 0, y: 1 },
  { name: 'turn while diving', t: 2.5, x: 0.6, y: 0.6 },
  { name: 'stop', t: 4, x: 0, y: 0 },
  { name: 'boost from still', t: 2.5, x: 0, y: 0, boost: true },
  { name: 'floating', t: 4, x: 0, y: 0 },
];

const params = new URLSearchParams(location.search);
const manual = params.has('manual');
const frozen = params.has('frozen');

async function main(): Promise<void> {
  const app = new Application();
  await app.init({ resizeTo: window, background: 0x0e3442, antialias: true, resolution: Math.min(2, devicePixelRatio), autoDensity: true });
  document.body.appendChild(app.canvas);
  // ?walker (or ?compare): the explorer on foot (character animation session B).
  if (params.has('walker') || params.has('compare')) return walkerLab(app, params);

  // Anchor in open water so collisions never touch the diver.
  const ax = 900;
  const ay = groundY(ax) - 260;
  if (isSolid(ax, ay)) console.warn('animlab: anchor is inside rock');

  const panes: { diver: Diver; cam: Container; zoom: () => number; cx: () => number }[] = [];
  const mk = (zoom: () => number, cx: () => number) => {
    const cam = new Container();
    const d = new Diver();
    // ?jar=glowfin (or glowfin-egg, crab-young...) hangs a filled specimen jar on the belt.
    const jq = params.get('jar');
    if (jq) d.jar = { species: jq.split('-')[0] as 'glowfin', stage: (jq.split('-')[1] ?? 'grown') as 'grown' };
    // ?kit=tanks,spear,jar,thruster,psuit (e.g. kit=0,0,0,0,0 for a new game, kit=4,1,1,2,1 for everything).
    const kq = params.get('kit');
    if (kq) {
      const [t, sp, j, th, ps] = kq.split(',').map(Number);
      d.kit = { tanks: t || 0, spear: !!sp, jar: !!j, thruster: (th === 2 ? 2 : th === 1 ? 1 : 0) as 0 | 1 | 2, psuit: (ps === 2 ? 2 : ps === 1 ? 1 : 0) as 0 | 1 | 2 };
    }
    d.x = ax;
    d.y = ay;
    d.lampOn = false;
    cam.addChild(d.view);
    app.stage.addChild(cam);
    panes.push({ diver: d, cam, zoom, cx });
  };
  // Gameplay scale: the game fits 640 world units to the screen height.
  mk(() => app.screen.height / 640, () => app.screen.width * 0.2);
  mk(() => (app.screen.height / 640) * 3, () => app.screen.width * 0.62);

  const keys = new Set<string>();
  let boostQ = false;
  let paused = false;
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!e.repeat && (k === 'shift' || k === ' ')) boostQ = true;
    if (!e.repeat && k === 'p') paused = !paused;
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  // On the phone: tap to pause and resume the script.
  window.addEventListener('pointerdown', () => (paused = !paused));

  const total = SCRIPT.reduce((a, s) => a + s.t, 0);
  let clock = 0;
  const seg0 = Number(params.get('seg') ?? 0);
  for (let i = 0; i < seg0 && i < SCRIPT.length; i++) clock += SCRIPT[i].t;
  let lastSeg = -1;
  const hud = document.getElementById('hud')!;
  let label = '';

  const tick = (dt: number) => {
    let mx = 0;
    let my = 0;
    let boost = false;
    if (!manual) {
      if (!paused) clock = (clock + dt) % total;
      let t = clock;
      let i = 0;
      while (t > SCRIPT[i].t) t -= SCRIPT[i++].t;
      const s = SCRIPT[i];
      mx = s.x;
      my = s.y;
      boost = !!s.boost && i !== lastSeg;
      lastSeg = i;
      label = `${i}: ${s.name}`;
    }
    const kx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    const ky = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
    if (kx || ky) {
      mx = kx;
      my = ky;
    }
    if (boostQ) boost = true;
    boostQ = false;
    for (const p of panes) {
      p.diver.update(dt, mx, my, boost, false);
      p.diver.takeBubbles();

      // Hold the diver in place (the motion is what matters here).
      p.diver.x = ax;
      p.diver.y = ay;
      p.diver.view.position.set(ax, ay);
      const z = p.zoom();
      p.cam.scale.set(z);
      p.cam.position.set(p.cx() - ax * z, app.screen.height * 0.52 - ay * z);
    }
    const d = panes[0].diver;
    hud.textContent = `${label}\nspeed ${Math.hypot(d.vx, d.vy).toFixed(0)}  facing ${d.facing}${d.boosting ? '  BOOST' : ''}`;
  };

  if (frozen) {
    app.ticker.stop();
    (window as unknown as { __lab: unknown }).__lab = {
      step(sec: number) {
        app.resize();
        const n = Math.round(sec * 60);
        for (let i = 0; i < n; i++) tick(1 / 60);
        app.render();
        return label;
      },
      /** CPU cost of the diver's update alone: ms per call, over n calls of the whole script. */
      bench(n: number) {
        const d = panes[0].diver;
        const t0 = performance.now();
        for (let i = 0; i < n; i++) {
          const s = SCRIPT[Math.floor(i / 120) % SCRIPT.length];
          d.update(1 / 60, s.x, s.y, !!s.boost && i % 120 === 0, false);
          d.x = ax;
          d.y = ay;
        }
        return (performance.now() - t0) / n;
      },
    };
    tick(0.0001);
    app.render();
  } else {
    app.ticker.add((t) => tick(Math.min(0.05, t.deltaMS / 1000)));
  }
}

void main();
