import { Application, BlurFilter, Container, Graphics } from 'pixi.js';
import { Critter } from '../actors/critters';
import { SPECIES, SPECIES_ORDER } from '../game/creatures';
import type { SpeciesId } from '../game/state';
import { SHAPES, type Traits } from '../game/traits';

/**
 * Phase 22: the creature zoo (zoo.html, on the play link or with `npm run dev`).
 * Every species in a row, swimming on the spot in each of its forms: ordinary, tiny,
 * giant, both new shapes, an heirloom, Choir-touched and radiant. The same rigs as the
 * game's tanks. URL: ?sp=glowfin,ray shows only those; ?young shows the young;
 * ?colour=N picks the colour; ?frozen holds the clock (window.__zoo.step(s) for screenshots).
 */
const q = new URLSearchParams(location.search);
const species = (q.get('sp')?.split(',') as SpeciesId[] | undefined)?.filter((s) => s in SPECIES) ?? SPECIES_ORDER;
const stage = q.has('young') ? 'young' : 'grown';
const colour = Number(q.get('colour') ?? 0);
const FORMS: { label: (sp: SpeciesId) => string; t: Partial<Traits> }[] = [
  { label: () => 'ordinary', t: {} },
  { label: () => 'tiny', t: { size: 'tiny' } },
  { label: () => 'giant', t: { size: 'giant' } },
  { label: (sp) => SHAPES[sp][1], t: { shape: 1 } },
  { label: (sp) => SHAPES[sp][2], t: { shape: 2 } },
  { label: () => 'heirloom', t: { heirloom: true } },
  { label: () => 'Choir-touched', t: { choir: true } },
  { label: () => 'radiant', t: { radiant: true } },
];

const app = new Application();
await app.init({ background: 0x0a2730, antialias: true, resizeTo: window, resolution: Math.min(2, devicePixelRatio) });
document.body.prepend(app.canvas);
const water = new Graphics();
const world = new Container();
const glow = new Container();
glow.filters = [new BlurFilter({ strength: 8, quality: 3 })];
glow.blendMode = 'add';
const lit = new Container();
const em = new Container();
app.stage.addChild(water, world);
world.addChild(glow, lit, em);
const labels = document.getElementById('labels')!;
const cells: { c: Critter; x: number; y: number; ph: number }[] = [];
let time = 0;

function layout(): void {
  for (const k of cells) k.c.destroy();
  cells.length = 0;
  labels.innerHTML = '';
  const W = window.innerWidth;
  const H = window.innerHeight;
  water.clear().rect(0, 0, W, H).fill({ color: 0x0c303a });
  for (let i = 0; i < 6; i++) water.rect(0, (H * i) / 6, W, H / 6).fill({ color: 0x1a5a66, alpha: 0.05 * (6 - i) });
  const left = 90;
  const cw = (W - left - 10) / FORMS.length;
  const rh = (H - 30) / species.length;
  const scale = Math.min(cw / 110, rh / 80);
  species.forEach((sp, r) => {
    const y = 26 + rh * (r + 0.55);
    const row = document.createElement('span');
    row.className = 'row';
    row.style.left = '6px';
    row.style.top = `${y - 8}px`;
    row.textContent = SPECIES[sp].name;
    labels.appendChild(row);
    FORMS.forEach((f, i) => {
      const x = left + cw * (i + 0.5);
      const c = new Critter(sp, stage, 7 + i, { colour, pattern: 1, gen: 3, ...f.t }, true);
      glow.addChild(c.glow);
      lit.addChild(c.view);
      em.addChild(c.emissive);
      cells.push({ c, x, y, ph: i * 0.7 + r });
      if (r === 0 || true) {
        const l = document.createElement('span');
        l.style.left = `${x}px`;
        l.style.top = `${y + rh * 0.3}px`;
        l.textContent = f.label(sp);
        labels.appendChild(l);
      }
    });
  });
  world.scale.set(1);
  zoom = scale;
}
let zoom = 1;
function frame(dt: number): void {
  time += dt;
  for (const k of cells) {
    const vx = 18 + Math.sin(time * 0.5 + k.ph) * 10;
    k.c.update(dt, time, k.x, k.y, vx, Math.sin(time * 0.8 + k.ph) * 6, { vigour: 1, sick: 0, size: zoom });
  }
}
layout();
window.addEventListener('resize', layout);
const frozen = q.has('frozen');
if (!frozen) app.ticker.add((t) => frame(Math.min(0.05, t.deltaMS / 1000)));
else frame(1 / 60);
(window as unknown as { __zoo: unknown }).__zoo = { step: (s: number) => { for (let i = 0; i < s * 60; i++) frame(1 / 60); app.render(); } };
