import { audio } from '../audio/engine';
import { stingFanfare, stingMinor, stingNotable, stingRiser, stingSettle, stingSlam, StingFlavour } from '../audio/stings';

/*
 * Reward moments (Phase 14). Fathomlight's payoffs used to arrive as a line of
 * text and a small chime. This module gives them weight, in three tiers:
 *
 *   minor    A material pickup. The inventory chip flares, a few sparks jump
 *            off it, and a bright "ting" climbs a step while pickups keep
 *            coming, so a good haul sounds like a run up a scale.
 *
 *   notable  A find or a milestone (an echo whorl, a blueprint decoded, a base
 *            piece finished, a creature grown). An emblem smashes down under
 *            the messages with a shockwave and sparks, a ribbon names it, and
 *            a short slam-and-answer sting plays. Play carries on.
 *
 *   major    A new ability or upgrade (gear built, an air tank, a suit, a KS-1
 *            module, a signal fragment). The world drops into slow motion and
 *            the screen darkens. The emblem lifts off Kestrel, rising on light
 *            rays while sparks spiral in and a riser swells (anticipation),
 *            then SLAMS into the centre of the screen: a flash, a shake, two
 *            shockwaves, a burst of flares and a deep hull-thud, followed by a
 *            short rising fanfare over a held chord (payoff). The card names
 *            the item and what it opens. Any tap or key closes it after a
 *            moment, or it settles away by itself.
 *
 * Everything is drawn here: the emblems are inline SVG in the game's hardware
 * palette (Choir rewards in its cyan, violet and magenta), the rays, sparks
 * and rings go on one 2D canvas that only animates while something is showing.
 * Animation runs on real time, so the slow motion does not slow the card.
 * `prefers-reduced-motion` drops the shake and the slow motion.
 */

export type RewardIcon =
  | 'gear'
  | 'light'
  | 'suit'
  | 'blueprint'
  | 'module'
  | 'tank'
  | 'whorl'
  | 'fragment'
  | 'creature'
  | 'egg'
  | 'piece'
  | 'drone'
  | 'data'
  | 'thruster'
  | 'jar'
  | 'cutter'
  | 'boots'
  | 'sonar'
  | 'rivet';

export interface RewardSpec {
  tier: 'notable' | 'major';
  icon: RewardIcon;
  /** A short label on the ribbon, e.g. "New gear". */
  ribbon: string;
  title: string;
  /** A stencil code shown beside the title, e.g. "DL-1". */
  code?: string;
  /** One line on what it does or opens. */
  line?: string;
  flavour?: StingFlavour;
}

const G = '#c9a24a'; // hardware gold
const CH = '#2c3236'; // charcoal hull
const CR = '#c9d3d8'; // chrome
const LIME = '#c6f56a'; // lime glass
const RED = '#d8492e';

/** Emblems, 64×64, drawn in the base-kit palette. */
const ICONS: Record<RewardIcon, string> = {
  light: `<path d="M14 26h22l8-6v24l-8-6H14z" fill="${CH}" stroke="${CR}" stroke-width="2"/><rect x="10" y="24" width="6" height="16" rx="2" fill="${G}"/><ellipse cx="44" cy="32" rx="4" ry="12" fill="#fff6cf"/><path d="M46 20l16-8v40l-16-8z" fill="#fff2b0" opacity=".35"/><circle cx="22" cy="32" r="2" fill="${RED}"/>`,
  suit: `<path d="M12 44c0-16 9-28 20-28s20 12 20 28z" fill="${LIME}" opacity=".85"/><path d="M32 8c6 3 9 8 9 14-4-4-6-5-9-6z" fill="${LIME}"/><path d="M18 40c2-10 7-17 14-19" stroke="#f4ffd8" stroke-width="3" fill="none" opacity=".8"/><rect x="8" y="44" width="48" height="10" rx="4" fill="${CR}"/><circle cx="32" cy="49" r="3" fill="${RED}"/><path d="M14 49h10M40 49h10" stroke="${G}" stroke-width="1.5"/>`,
  tank: `<rect x="20" y="16" width="24" height="40" rx="11" fill="${CR}"/><rect x="20" y="28" width="24" height="6" fill="${G}"/><rect x="27" y="8" width="10" height="9" rx="2" fill="${CH}"/><circle cx="32" cy="8" r="4" fill="${RED}"/><path d="M25 22v28" stroke="#fff" stroke-width="2.5" opacity=".55"/><text x="32" y="48" font-size="7" text-anchor="middle" fill="${CH}" font-family="monospace" font-weight="700">O2</text>`,
  thruster: `<rect x="10" y="22" width="22" height="20" rx="5" fill="${CH}" stroke="${CR}" stroke-width="2"/><path d="M32 24l10-4v24l-10-4z" fill="${CR}"/><path d="M42 22c10 2 14 6 16 10-2 4-6 8-16 10z" fill="${LIME}" opacity=".85"/><path d="M42 27c6 1 8 3 9 5-1 2-3 4-9 5z" fill="#f6ffe0"/><rect x="14" y="27" width="12" height="3" fill="${G}"/>`,
  jar: `<rect x="18" y="14" width="28" height="8" rx="2" fill="${CR}"/><path d="M16 22h32v28a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6z" fill="#9fe0d0" opacity=".35" stroke="${CR}" stroke-width="2"/><path d="M24 40c4-6 12-6 16 0-4 5-12 5-16 0z" fill="#ffd27a"/><path d="M40 40l5-4v8z" fill="#ffd27a"/><circle cx="28" cy="39" r="1.4" fill="${CH}"/><circle cx="32" cy="40" r="10" fill="#ffe08a" opacity=".25"/>`,
  blueprint: `<rect x="10" y="14" width="40" height="36" rx="2" fill="#163a48" stroke="${CR}" stroke-width="2"/><circle cx="50" cy="32" r="6" fill="#1d4a5c" stroke="${CR}" stroke-width="2"/><g stroke="#9fe6ff" stroke-width="1.3" fill="none" opacity=".9"><path d="M16 42c4-14 12-20 24-20"/><circle cx="26" cy="32" r="6"/><path d="M16 20h14M16 24h9M34 40h10M34 44h6"/></g>`,
  data: `<rect x="14" y="12" width="36" height="42" rx="3" fill="${CH}" stroke="${CR}" stroke-width="2"/><rect x="20" y="18" width="24" height="14" fill="#1b2a30"/><path d="M22 28l5-5 4 3 5-6 6 6" stroke="${LIME}" stroke-width="1.6" fill="none"/><g fill="${G}"><rect x="20" y="44" width="3" height="10"/><rect x="26" y="44" width="3" height="10"/><rect x="32" y="44" width="3" height="10"/><rect x="38" y="44" width="3" height="10"/></g><circle cx="44" cy="38" r="2" fill="${RED}"/>`,
  module: `<path d="M6 38c0-8 10-14 24-14h14c8 0 14 6 14 14s-6 12-14 12H20C12 50 6 46 6 38z" fill="${CH}" stroke="${CR}" stroke-width="2"/><path d="M38 24c0-7 4-12 9-12s9 5 9 12z" fill="${LIME}" opacity=".85"/><rect x="14" y="34" width="16" height="6" rx="2" fill="${G}"/><circle cx="56" cy="44" r="2.5" fill="${RED}"/><path d="M6 38H2M8 46l-4 4" stroke="${CR}" stroke-width="2"/>`,
  piece: `<path d="M8 44c0-14 11-26 24-26s24 12 24 26z" fill="${CH}" stroke="${CR}" stroke-width="2"/><path d="M18 40c0-9 6-15 14-15s14 6 14 15z" fill="${LIME}" opacity=".75"/><rect x="6" y="44" width="52" height="6" fill="${CR}"/><path d="M14 50l-4 8M50 50l4 8M32 50v8" stroke="${CR}" stroke-width="3"/><circle cx="32" cy="16" r="2.5" fill="${RED}"/><path d="M10 47h44" stroke="${G}" stroke-width="1.5"/>`,
  drone: `<ellipse cx="32" cy="34" rx="18" ry="14" fill="${CH}" stroke="${CR}" stroke-width="2"/><circle cx="38" cy="32" r="6" fill="${LIME}"/><circle cx="39" cy="31" r="2.4" fill="#f6ffe0"/><path d="M14 30H6M50 30h8M14 38l-6 4M50 38l6 4" stroke="${CR}" stroke-width="3" stroke-linecap="round"/><rect x="22" y="44" width="12" height="4" rx="1" fill="${G}"/><circle cx="24" cy="26" r="2" fill="${RED}"/>`,
  creature: `<path d="M8 34c8-12 26-16 38-4l10-8v24l-10-8c-12 12-30 8-38-4z" fill="#d9a35a"/><path d="M14 34c8-6 20-8 30-2" stroke="#ffe7a8" stroke-width="2" fill="none" opacity=".8"/><circle cx="16" cy="32" r="2" fill="#20160c"/><g fill="#fff3b0"><circle cx="26" cy="38" r="2"/><circle cx="33" cy="36" r="1.6"/><circle cx="39" cy="38" r="1.4"/></g><circle cx="32" cy="34" r="20" fill="#ffd27a" opacity=".16"/>`,
  egg: `<g fill="#f3d58e" stroke="#c9a24a" stroke-width="1.5"><ellipse cx="24" cy="38" rx="10" ry="12"/><ellipse cx="40" cy="36" rx="9" ry="11"/><ellipse cx="32" cy="24" rx="8" ry="10"/></g><g fill="#fff6d0"><circle cx="26" cy="36" r="3"/><circle cx="41" cy="34" r="2.5"/><circle cx="33" cy="22" r="2.2"/></g><circle cx="32" cy="32" r="22" fill="#ffe08a" opacity=".15"/>`,
  whorl: `<circle cx="32" cy="32" r="22" fill="#2a1840" opacity=".7"/><path d="M32 32m0-3a3 3 0 1 1-3 3c0-5 4-9 9-9a11 11 0 0 1 11 11c0 9-7 15-15 15a19 19 0 0 1-19-19c0-12 10-21 21-21" fill="none" stroke="url(#chg)" stroke-width="4" stroke-linecap="round"/>`,
  fragment: `<ellipse cx="32" cy="30" rx="20" ry="9" fill="none" stroke="#6ff3ff" stroke-width="3.5"/><ellipse cx="32" cy="30" rx="11" ry="20" fill="none" stroke="#b07cff" stroke-width="3" opacity=".9"/><path d="M14 46c8-6 14 6 22 0s12-4 16 2" fill="none" stroke="#ff6ad5" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="30" r="4" fill="#e9fdff"/>`,
  gear: `<circle cx="32" cy="32" r="18" fill="${CH}" stroke="${CR}" stroke-width="3"/><circle cx="32" cy="32" r="12" fill="#1b2328"/><path d="M32 22v10l7 5" stroke="${LIME}" stroke-width="3" stroke-linecap="round" fill="none"/><g fill="${G}"><rect x="30" y="8" width="4" height="7"/><rect x="30" y="49" width="4" height="7"/><rect x="8" y="30" width="7" height="4"/><rect x="49" y="30" width="7" height="4"/></g><circle cx="32" cy="32" r="2.5" fill="${RED}"/>`,
  cutter: `<rect x="8" y="28" width="26" height="10" rx="3" fill="${CH}" stroke="${CR}" stroke-width="2"/><path d="M34 29l8-3v14l-8-3z" fill="${CR}"/><path d="M42 26c12 2 16 5 18 7-2 2-6 5-18 7z" fill="#ffd06a"/><path d="M42 29c7 1 9 3 10 4-1 1-3 3-10 4z" fill="#fff8e0"/><rect x="14" y="38" width="8" height="12" rx="2" fill="${G}"/>`,
  boots: `<path d="M18 10h16v26l14 6c4 2 6 5 6 8v4H14V14z" fill="${CH}" stroke="${CR}" stroke-width="2"/><rect x="12" y="52" width="44" height="6" rx="2" fill="${CR}"/><path d="M16 55h40" stroke="${LIME}" stroke-width="2"/><rect x="20" y="22" width="12" height="4" fill="${G}"/><circle cx="26" cy="16" r="2" fill="${RED}"/>`,
  // Phase 19: the Rivet driver: a forearm housing, its drum, the barrel and a lime-flashed rivet in flight.
  rivet: `<rect x="8" y="26" width="30" height="14" rx="4" fill="${CH}" stroke="${CR}" stroke-width="2"/><rect x="38" y="29" width="10" height="8" fill="${CR}"/><rect x="46" y="27.5" width="3" height="11" fill="${G}"/><circle cx="20" cy="22" r="6" fill="${CH}" stroke="${G}" stroke-width="2"/><rect x="12" y="38" width="4" height="10" fill="${RED}"/><rect x="28" y="38" width="4" height="10" fill="${RED}"/><path d="M52 33h8" stroke="${LIME}" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="33" r="2.4" fill="${G}"/><circle cx="31" cy="22" r="1.8" fill="${LIME}"/>`,
  sonar: `<g fill="none" stroke-linecap="round"><path d="M22 20a16 16 0 0 1 0 24" stroke="${LIME}" stroke-width="3"/><path d="M30 12a26 26 0 0 1 0 40" stroke="${LIME}" stroke-width="3" opacity=".7"/><path d="M38 6a36 36 0 0 1 0 52" stroke="${LIME}" stroke-width="3" opacity=".4"/></g><rect x="6" y="24" width="14" height="16" rx="3" fill="${CH}" stroke="${CR}" stroke-width="2"/><circle cx="13" cy="32" r="3" fill="${RED}"/>`,
};

/** Phase 15: the same emblems in the Field kit. */
export function emblemSvg(icon: RewardIcon): string {
  return svg(icon);
}

function svg(icon: RewardIcon): string {
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="chg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6ff3ff"/><stop offset=".5" stop-color="#b07cff"/><stop offset="1" stop-color="#ff6ad5"/></linearGradient></defs>${ICONS[icon]}</svg>`;
}

/** Palettes for the light and sparks: [core, mid, edge]. */
const PALETTE: Record<StingFlavour, [string, string, string]> = {
  kestrel: ['#fff6d6', '#ffd479', '#c6f56a'],
  life: ['#fff8dc', '#ffd27a', '#a8f07a'],
  choir: ['#e9fdff', '#6ff3ff', '#d07cff'],
};

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  /** 'spark' falls and fades; 'streak' draws a line along its motion; 'mote' homes in on a point. */
  kind: 'spark' | 'streak' | 'mote';
  tx?: number;
  ty?: number;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  speed: number;
  life: number;
  max: number;
  color: string;
  width: number;
}

interface Running {
  spec: RewardSpec;
  flavour: StingFlavour;
  start: number;
  el: HTMLDivElement;
  emblem: HTMLDivElement;
  from: { x: number; y: number };
  to: { x: number; y: number };
  slammed: boolean;
  closing: number | null;
  /** Real-time ms when the card may be dismissed by a tap or key. */
  dismissAt: number;
  closeAt: number;
}

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export class Rewards {
  /** Where Kestrel (or KS-1) is on screen, in CSS px; set by main.ts. */
  heroPos: () => { x: number; y: number } | null = () => null;
  private layer: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private vignette: HTMLDivElement;
  private flash: HTMLDivElement;
  private sparks: Spark[] = [];
  private rings: Ring[] = [];
  private queue: RewardSpec[] = [];
  private cur: Running | null = null;
  private raf = 0;
  private last = 0;
  private scale = 1;
  private shakeUntil = 0;
  private gameEl = document.getElementById('game');
  private combo = { n: 0, at: -1e9 };
  private afterClose: (() => void)[] = [];
  private rayAngle = 0;
  private gap = 0;

  constructor() {
    this.layer = document.createElement('div');
    this.layer.id = 'reward-layer';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'reward-fx';
    this.vignette = document.createElement('div');
    this.vignette.className = 'reward-vignette';
    this.flash = document.createElement('div');
    this.flash.className = 'reward-flash';
    this.layer.append(this.vignette, this.canvas, this.flash);
    document.body.appendChild(this.layer);
    this.g = this.canvas.getContext('2d')!;
    this.layer.addEventListener('pointerdown', (e) => {
      if (this.tryDismiss()) {
        e.stopPropagation();
        e.preventDefault();
      }
    });
    window.addEventListener('keydown', () => this.tryDismiss(), true);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  /** True while a major card holds the screen (the game defers its notices until it closes). */
  get holding(): boolean {
    return !!this.cur && this.cur.spec.tier === 'major';
  }

  /** The game's time scale: slow motion during a major reward's rise and slam. */
  timeScale(): number {
    return this.scale;
  }

  /** True while any card is showing or waiting. */
  get busy(): boolean {
    return !!this.cur || this.queue.length > 0;
  }

  /** Run something once every card has closed (or now, if none is showing): a reading panel after a find. */
  whenClear(fn: () => void): void {
    if (this.busy) this.afterClose.push(fn);
    else fn();
  }

  /** A material pickup: flare the inventory chip and climb the sparkle scale. */
  minor(chip: HTMLElement | null, flavour: StingFlavour = 'kestrel'): void {
    const now = performance.now();
    this.combo.n = now - this.combo.at < 2600 ? this.combo.n + 1 : 0;
    this.combo.at = now;
    stingMinor(this.combo.n);
    if (!chip) return;
    const r = chip.getBoundingClientRect();
    if (!r.width) return;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const pal = PALETTE[flavour];
    const n = 6 + Math.min(10, this.combo.n * 2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 140;
      this.sparks.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0, max: 0.35 + Math.random() * 0.35, size: 1.2 + Math.random() * 1.6, color: pal[i % 3], kind: 'spark' });
    }
    this.rings.push({ x: cx, y: cy, r: 6, speed: 90, life: 0, max: 0.35, color: pal[1], width: 2 });
    chip.classList.remove('reward-glint');
    void chip.offsetWidth;
    chip.classList.add('reward-glint');
    this.kick();
  }

  show(spec: RewardSpec): void {
    this.queue.push(spec);
    if (!this.cur) this.next();
  }

  // ---------------------------------------------------------------------------

  private resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(innerWidth * dpr);
    this.canvas.height = Math.round(innerHeight * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private kick(): void {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  private next(): void {
    const spec = this.queue.shift();
    if (!spec) return;
    const flavour = spec.flavour ?? 'kestrel';
    const el = document.createElement('div');
    el.className = `reward-card ${spec.tier} ${flavour}`;
    el.innerHTML = `<div class="reward-ribbon"></div><div class="reward-title"><span class="reward-name"></span><span class="reward-code"></span></div><div class="reward-line"></div>`;
    el.querySelector('.reward-ribbon')!.textContent = spec.ribbon;
    el.querySelector('.reward-name')!.textContent = spec.title;
    el.querySelector('.reward-code')!.textContent = spec.code ?? '';
    el.querySelector('.reward-line')!.textContent = spec.line ?? '';
    const emblem = document.createElement('div');
    emblem.className = `reward-emblem ${spec.tier} ${flavour}`;
    emblem.innerHTML = `<div class="reward-emblem-glow"></div><div class="reward-emblem-face">${svg(spec.icon)}<div class="reward-shine"></div></div>`;
    this.layer.append(el, emblem);
    const now = performance.now();
    const major = spec.tier === 'major';
    const to = { x: innerWidth / 2, y: major ? innerHeight * 0.4 : Math.min(innerHeight * 0.3, 210) };
    const hero = major ? this.heroPos() : null;
    const from = hero && hero.x > -50 && hero.x < innerWidth + 50 && hero.y > -50 && hero.y < innerHeight + 50 ? { x: hero.x, y: hero.y - 30 } : { x: to.x, y: major ? innerHeight * 0.75 : to.y };
    el.style.setProperty('--card-y', `${to.y}px`);
    this.cur = {
      spec,
      flavour,
      start: now,
      el,
      emblem,
      from,
      to,
      slammed: false,
      closing: null,
      dismissAt: now + (major ? 1700 : 600),
      closeAt: now + (major ? 5200 : 3000),
    };
    if (major) {
      this.vignette.classList.add('on');
      stingRiser(REDUCED ? 0.35 : 0.9, flavour);
      audio.duckForSting(5.5);
    }
    this.kick();
  }

  private tryDismiss(): boolean {
    const c = this.cur;
    if (!c || c.closing !== null || c.spec.tier !== 'major') return false;
    if (performance.now() < c.dismissAt) return c.slammed; // swallow taps once the card is up
    this.close();
    return true;
  }

  private close(): void {
    const c = this.cur;
    if (!c || c.closing !== null) return;
    c.closing = performance.now();
    c.el.classList.add('out');
    c.emblem.classList.add('out');
    this.vignette.classList.remove('on');
    this.layer.classList.remove('catch');
    if (c.spec.tier === 'major') stingSettle();
  }

  private slam(c: Running): void {
    c.slammed = true;
    const major = c.spec.tier === 'major';
    const pal = PALETTE[c.flavour];
    const { x, y } = c.to;
    c.el.classList.add('in');
    c.emblem.classList.add('slam');
    if (major) {
      stingSlam(c.flavour);
      stingFanfare(c.flavour);
      this.flash.classList.remove('go');
      void this.flash.offsetWidth;
      this.flash.classList.add('go');
      if (!REDUCED) this.shakeUntil = performance.now() + 320;
      this.layer.classList.add('catch');
    } else stingNotable(c.flavour);
    const n = major ? 56 : 22;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      const sp = (major ? 260 : 170) + Math.random() * (major ? 360 : 180);
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        max: 0.5 + Math.random() * (major ? 0.9 : 0.5),
        size: 1.4 + Math.random() * (major ? 2.6 : 1.8),
        color: pal[i % 3],
        kind: i % 3 === 0 ? 'streak' : 'spark',
      });
    }
    this.rings.push({ x, y, r: 30, speed: major ? 900 : 520, life: 0, max: major ? 0.7 : 0.5, color: pal[0], width: major ? 5 : 3 });
    if (major) this.rings.push({ x, y, r: 20, speed: 520, life: -0.08, max: 0.9, color: pal[2], width: 3 });
  }

  /** Tests only: pin the current card's clock to this many ms after it started (null = real time). */
  private pinned: number | null = null;
  pin(ms: number | null): void {
    this.pinned = ms;
    this.kick();
  }

  private frame(rafT: number): void {
    this.raf = 0;
    const t = this.pinned !== null && this.cur ? this.cur.start + this.pinned : rafT;
    // rAF stamps can trail performance.now() by a frame: never let time run backwards.
    const raw = Math.max(0, (t - this.last) / 1000);
    const dt = Math.min(0.05, raw);
    this.last = t;
    const g = this.g;
    g.clearRect(0, 0, innerWidth, innerHeight);
    const c = this.cur;
    let targetScale = 1;

    if (c) {
      const major = c.spec.tier === 'major';
      const age = (t - c.start) / 1000;
      const riseT = major ? (REDUCED ? 0.35 : 0.9) : 0.16;
      const pal = PALETTE[c.flavour];
      // Position and scale of the emblem.
      let ex = c.to.x;
      let ey = c.to.y;
      let es = 1;
      let eo = 1;
      if (!c.slammed) {
        const k = clamp01(age / riseT);
        if (major) {
          const e = easeInOut(k);
          ex = c.from.x + (c.to.x - c.from.x) * e;
          // An arc: up and over, like lifting something above your head.
          ey = c.from.y + (c.to.y - c.from.y) * e - Math.sin(k * Math.PI) * 40;
          es = 0.35 + 1.25 * e;
          eo = clamp01(age / 0.18);
          // Sparks spiral in towards the rising emblem.
          if (Math.random() < 0.9) {
            const a = Math.random() * Math.PI * 2;
            const d = 160 + Math.random() * 160;
            this.sparks.push({ x: ex + Math.cos(a) * d, y: ey + Math.sin(a) * d, vx: -Math.sin(a) * 120, vy: Math.cos(a) * 120, life: 0, max: 0.7, size: 1.2 + Math.random() * 1.5, color: pal[(Math.random() * 3) | 0], kind: 'mote', tx: ex, ty: ey });
          }
          if (!REDUCED) targetScale = 0.12;
        } else {
          // Notable: drop from large and faint to full size.
          es = 2.4 - 1.4 * k * k;
          eo = k;
        }
        if (k >= 1) this.slam(c);
      } else if (c.closing === null) {
        const since = age - riseT;
        // A springy settle after the slam: overshoot down, then back to rest.
        es = 1 + 0.5 * Math.exp(-since * 14) * Math.cos(since * 30) * (major ? 1 : 0.6);
        es = Math.max(0.8, es);
        // A gentle bob while it holds.
        ey += Math.sin(since * 2.2) * 3;
        // The world stays nearly still through the slam, then drifts on slowly while the card holds.
        if (major && !REDUCED) targetScale = 0.12 + 0.23 * clamp01((since - 0.6) / 1.0);
        if (t >= c.closeAt) this.close();
      }
      if (c.closing !== null) {
        const k = clamp01((t - c.closing) / 380);
        es = 1 - 0.4 * k;
        eo = 1 - k;
        ey -= k * 30;
        targetScale = 1;
        if (k >= 1) {
          c.el.remove();
          c.emblem.remove();
          this.cur = null;
          if (!this.queue.length) {
            const fns = this.afterClose;
            this.afterClose = [];
            for (const f of fns) f();
          }
          this.gap = 0.25;
        }
      }
      c.emblem.style.transform = `translate(${ex}px, ${ey}px) translate(-50%, -50%) scale(${es})`;
      c.emblem.style.opacity = String(eo);

      // Light rays behind the emblem (major), turning slowly.
      if (major && this.cur) {
        this.rayAngle += dt * 0.35;
        const strength = c.closing !== null ? 1 - clamp01((t - c.closing) / 380) : clamp01(age / riseT) * (c.slammed ? 1 : 0.6);
        this.rays(ex, ey, 70 + 260 * clamp01(age / riseT) * (c.slammed ? 1.15 : 1), strength, pal);
      }
    } else if (this.gap > 0) {
      this.gap -= dt;
      if (this.gap <= 0 && this.queue.length) this.next();
    } else if (this.queue.length) this.next();

    // Ease the game's time scale (fast into slow motion, gentler back out).
    const rate = targetScale < this.scale ? 12 : 3;
    this.scale += (targetScale - this.scale) * (1 - Math.exp(-rate * Math.min(0.25, raw)));
    if (Math.abs(this.scale - targetScale) < 0.01) this.scale = targetScale;

    // Shake the game view (not the card) for a moment after a major slam.
    if (this.gameEl) {
      if (t < this.shakeUntil) {
        const k = (this.shakeUntil - t) / 320;
        const m = 9 * k * k;
        this.gameEl.style.transform = `translate(${(Math.random() - 0.5) * m}px, ${(Math.random() - 0.5) * m}px)`;
      } else if (this.gameEl.style.transform) this.gameEl.style.transform = '';
    }

    this.drawFx(dt);
    if (this.cur || this.sparks.length || this.rings.length || this.queue.length || this.gap > 0 || this.scale !== 1 || t < this.shakeUntil) this.kick();
  }

  private rays(x: number, y: number, len: number, strength: number, pal: [string, string, string]): void {
    if (strength <= 0) return;
    const g = this.g;
    g.save();
    g.globalCompositeOperation = 'lighter';
    const halo = g.createRadialGradient(x, y, 0, x, y, len * 0.9);
    halo.addColorStop(0, this.alpha(pal[0], 0.55 * strength));
    halo.addColorStop(0.35, this.alpha(pal[1], 0.22 * strength));
    halo.addColorStop(1, this.alpha(pal[1], 0));
    g.fillStyle = halo;
    g.fillRect(x - len, y - len, len * 2, len * 2);
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = this.rayAngle * (i % 2 ? -1 : 1) + (i / n) * Math.PI * 2;
      const w = 0.07 + 0.04 * Math.sin(i * 1.7 + this.rayAngle * 3);
      const l = len * (0.75 + 0.35 * Math.sin(i * 2.3 + this.rayAngle * 2));
      const grad = g.createRadialGradient(x, y, 10, x, y, l);
      grad.addColorStop(0, this.alpha(i % 3 === 0 ? pal[2] : pal[1], 0.28 * strength));
      grad.addColorStop(1, this.alpha(pal[1], 0));
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(x, y);
      g.arc(x, y, l, a - w, a + w);
      g.closePath();
      g.fill();
    }
    g.restore();
  }

  private drawFx(dt: number): void {
    const g = this.g;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life += dt;
      if (r.life < 0) continue;
      if (r.life > r.max) {
        this.rings.splice(i, 1);
        continue;
      }
      const k = r.life / r.max;
      r.r += r.speed * dt * (1 - k * 0.6);
      g.strokeStyle = this.alpha(r.color, (1 - k) * 0.9);
      g.lineWidth = r.width * (1 - k * 0.7);
      g.beginPath();
      g.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      g.stroke();
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life += dt;
      if (s.life > s.max) {
        this.sparks.splice(i, 1);
        continue;
      }
      const k = s.life / s.max;
      if (s.kind === 'mote' && s.tx !== undefined && s.ty !== undefined) {
        // Pulled in, faster as it nears.
        const dx = s.tx - s.x;
        const dy = s.ty - s.y;
        s.vx += dx * 6 * dt;
        s.vy += dy * 6 * dt;
        s.vx *= 1 - 2.2 * dt;
        s.vy *= 1 - 2.2 * dt;
        if (dx * dx + dy * dy < 400) s.life = s.max;
      } else {
        s.vx *= 1 - 2.4 * dt;
        s.vy = s.vy * (1 - 2.4 * dt) + 120 * dt; // drift down a little, like sinking sparks
      }
      const px = s.x;
      const py = s.y;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const a = s.kind === 'mote' ? Math.min(1, k * 4) * (1 - k * 0.3) : 1 - k;
      if (s.kind === 'streak') {
        g.strokeStyle = this.alpha(s.color, a);
        g.lineWidth = s.size;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(px - s.vx * 0.04, py - s.vy * 0.04);
        g.lineTo(s.x, s.y);
        g.stroke();
      } else {
        g.fillStyle = this.alpha(s.color, a * 0.35);
        g.beginPath();
        g.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = this.alpha(s.color, a);
        g.beginPath();
        g.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.restore();
  }

  private alphaCache = new Map<string, [number, number, number]>();
  private alpha(hex: string, a: number): string {
    let c = this.alphaCache.get(hex);
    if (!c) {
      const n = parseInt(hex.slice(1), 16);
      c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      this.alphaCache.set(hex, c);
    }
    return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  }
}
