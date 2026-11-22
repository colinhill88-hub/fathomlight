import { Application, BlurFilter, Container, Rectangle } from 'pixi.js';
import { Critter } from '../actors/critters';
import type { SpeciesId } from '../game/state';
import type { Traits } from '../game/traits';

/*
 * Phase 20: portraits of creatures for the collection book, creature cards and
 * the hatching reveal. They are the real creature rigs (src/actors/critters.ts),
 * the same ones that swim in the tanks, drawn once into a small picture by a
 * little renderer of their own (like the Field kit's Kestrel), then cached.
 *
 * Pictures are made a few at a time so opening the book never stalls a frame.
 * Use `snapImg(...)` for an <img> tag; it fills itself in when its picture is ready.
 */

const W = 160;
const H = 120;

let starting: Promise<Application | null> | null = null;
const cache = new Map<string, string>();
const queue: { key: string; species: SpeciesId; stage: 'young' | 'grown' | 'egg'; traits: Traits }[] = [];
let pumping = false;

function start(): Promise<Application | null> {
  if (starting) return starting;
  starting = (async () => {
    try {
      const a = new Application();
      await a.init({ preference: 'webgl', backgroundAlpha: 0, antialias: true, width: W, height: H, resolution: 2, autoStart: false });
      return a;
    } catch (err) {
      console.warn('Creature portraits unavailable', err);
      return null;
    }
  })();
  return starting;
}

export function snapKey(species: SpeciesId, t: Traits, stage: 'young' | 'grown' | 'egg' = 'grown'): string {
  return `${species}:${t.colour}:${t.pattern}:${t.radiant ? 1 : 0}:${stage}`;
}

/** The picture's address if it is ready (a data URL), else null (and it is queued). */
export function snapUrl(species: SpeciesId, t: Traits, stage: 'young' | 'grown' | 'egg' = 'grown'): string | null {
  const key = snapKey(species, t, stage);
  const hit = cache.get(key);
  if (hit) return hit;
  if (!queue.some((q) => q.key === key)) queue.push({ key, species, stage, traits: { colour: t.colour, pattern: t.pattern, radiant: t.radiant } });
  void pump();
  return null;
}

/** An <img> for a creature: filled in now if its picture is cached, or as soon as it is drawn. */
export function snapImg(species: SpeciesId, t: Traits, cls = '', stage: 'young' | 'grown' | 'egg' = 'grown', alt = ''): string {
  const url = snapUrl(species, t, stage);
  const key = snapKey(species, t, stage);
  return `<img class="snap ${cls}" data-snap="${key}" alt="${alt.replace(/"/g, '')}" ${url ? `src="${url}"` : 'src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" data-wait="1"'} draggable="false">`;
}

async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  const a = await start();
  while (queue.length && a) {
    const job = queue.shift()!;
    try {
      cache.set(job.key, draw(a, job.species, job.stage, job.traits));
    } catch (err) {
      console.warn('Creature portrait failed', err);
      cache.set(job.key, 'data:image/gif;base64,R0lGODlhAQABAAAAACw=');
    }
    for (const img of document.querySelectorAll<HTMLImageElement>(`img[data-snap="${job.key}"]`)) {
      img.src = cache.get(job.key)!;
      img.removeAttribute('data-wait');
    }
    // A few per frame.
    if (queue.length % 3 === 0) await new Promise((r) => requestAnimationFrame(() => r(null)));
  }
  pumping = false;
}

function draw(a: Application, species: SpeciesId, stage: 'young' | 'grown' | 'egg', t: Traits): string {
  const critter = new Critter(species, stage, 7, { colour: t.colour, pattern: t.pattern, radiant: t.radiant, gen: 2 }, true);
  const host = new Container();
  // The glow layer is soft halos meant for the game's bloom pass: blur it here instead.
  critter.glow.blendMode = 'add';
  critter.glow.alpha = t.radiant ? 0.9 : 0.45;
  critter.glow.filters = [new BlurFilter({ strength: 10, quality: 3 })];
  host.addChild(critter.glow, critter.view, critter.emissive);
  // A calm side-on pose, facing right, needs fully met.
  critter.face = 1;
  for (let i = 0; i < 8; i++) critter.update(1 / 30, 1.2 + i / 30, 0, 0, 12, 0, { vigour: 1, sick: 0, size: 1 });
  const b = critter.view.getBounds();
  const s = Math.min((W * 0.78) / Math.max(1, b.width), (H * 0.74) / Math.max(1, b.height));
  host.scale.set(s);
  host.position.set(W / 2 - (b.x + b.width / 2) * s, H / 2 - (b.y + b.height / 2) * s);
  a.stage.removeChildren();
  a.stage.addChild(host);
  a.renderer.render(a.stage);
  const canvas = a.renderer.extract.canvas({ target: a.stage, frame: new Rectangle(0, 0, W, H), resolution: 2 }) as HTMLCanvasElement;
  const url = canvas.toDataURL('image/png');
  a.stage.removeChildren();
  host.destroy({ children: true });
  return url;
}
