import type { SaveData } from '../game/state';
import { FRAGMENTS } from '../game/signals';
import { SCAN_ENTRIES } from '../game/scanner';
import { BUOY_X, CORVINA, FULMAR, groundY, inSanctum, isSolid, SANCTUM, SLED_X, SITE_MOUTH, TR_BUOY, TRENCH_Y, WORLD_H, WORLD_SPAN, WORLD_W, WORLD_X0, CLEFT } from '../world/terrain';

/**
 * Milestone 11: the Signal array's other job (DESIGN.md: "maps zones and
 * decodes alien signals"; Colin's choice: a map at the array's console). A
 * side view of the five zones, filled in as you swim through them (the save's
 * mapSeen, one character per MAP_COL units of the world). Sites you have
 * scanned or found are marked, and each decoded fragment draws more of the
 * Choir's way down to the sanctum. Decoded fragments can be read from here.
 */

export const MAP_COL = 250;
export function mapColumns(): number {
  return Math.ceil(WORLD_SPAN / MAP_COL);
}
/** Mark the columns around x as seen. Returns true if anything new was seen. */
export function markSeen(save: SaveData, x: number, reach = 2): boolean {
  const n = mapColumns();
  if (save.mapSeen.length < n) save.mapSeen = save.mapSeen.padEnd(n, '0');
  const c = Math.floor((x - WORLD_X0) / MAP_COL);
  let changed = false;
  const arr = save.mapSeen.split('');
  for (let k = c - reach; k <= c + reach; k++) {
    if (k < 0 || k >= n || arr[k] === '1') continue;
    arr[k] = '1';
    changed = true;
  }
  if (changed) save.mapSeen = arr.join('');
  return changed;
}

const ZONES = [
  { name: 'Sunlit shallows', x0: WORLD_X0, x1: 8600 },
  { name: 'Kelp forest and caves', x0: 8600, x1: 19300 },
  { name: 'Wreck shelf', x0: 19300, x1: 26800 },
  { name: 'The trench', x0: 26800, x1: WORLD_W },
];
/** The Choir's way, one leg per decoded fragment: rim, ledges, vent field, the floor, the door. */
const WAY: { x: number; y: number }[][] = [
  [
    { x: TR_BUOY.x, y: 1600 },
    { x: 28400, y: 2600 },
  ],
  [
    { x: 28400, y: 2600 },
    { x: 29700, y: 3900 },
  ],
  [
    { x: 29700, y: 3900 },
    { x: 30600, y: 6200 },
    { x: 31600, y: 7200 },
  ],
  [
    { x: 31600, y: 7200 },
    { x: SANCTUM.door.x, y: SANCTUM.door.y - 20 },
  ],
];

export class ZoneMap {
  private el: HTMLDivElement | null = null;
  get open(): boolean {
    return !!this.el;
  }

  show(save: SaveData, you: { x: number; y: number } | null, onRead: (id: string) => void): void {
    this.close();
    const el = document.createElement('div');
    el.id = 'zone-map';
    el.setAttribute('role', 'dialog');
    const n = save.signals.decoded.length;
    const frags = FRAGMENTS.map((f, i) => {
      const done = save.signals.decoded.includes(f.id);
      const e = SCAN_ENTRIES.find((x) => x.id === f.id);
      return `<button type="button" class="zm-frag" data-id="${f.id}" ${done ? '' : 'disabled'}>${done && e ? e.name.replace(/^Signal fragment \d: /, `${i + 1} · `) : `${i + 1} · ${save.signals.found.includes(f.id) ? 'found, not decoded' : 'not found'}`}</button>`;
    }).join('');
    el.innerHTML = `<div class="zm-card">
      <div class="zm-head"><b>SA · Zone map</b><span>${n} of 4 fragments decoded</span><button type="button" class="x" aria-label="Close">✕</button></div>
      <canvas></canvas>
      <p class="zm-note">${
        n === 0
          ? 'Places you have swum through are mapped; the rest is dark. Decoded fragments will draw the Choir\'s way.'
          : n < 4
            ? 'The dotted line is the Choir\'s way, as far as the fragments decoded so far can draw it.'
            : save.sanctum.door
              ? 'The way leads through the door in the trench floor, into the sanctum below.'
              : 'The way ends at a door in the far east end of the trench floor.'
      }</p>
      <div class="zm-frags">${frags}</div>
    </div>`;
    const close = () => this.close();
    el.querySelector('.x')!.addEventListener('click', close);
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.target === el) close();
    });
    for (const b of el.querySelectorAll<HTMLButtonElement>('.zm-frag'))
      b.addEventListener('click', () => {
        this.close();
        onRead(b.dataset.id!);
      });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        window.removeEventListener('keydown', onKey);
      }
    };
    window.addEventListener('keydown', onKey);
    document.body.appendChild(el);
    this.el = el;
    this.draw(el.querySelector('canvas')!, save, you);
  }

  close(): void {
    this.el?.remove();
    this.el = null;
  }

  private draw(cv: HTMLCanvasElement, save: SaveData, you: { x: number; y: number } | null): void {
    const cssW = Math.min(860, window.innerWidth - 56);
    const cssH = Math.max(150, Math.min(window.innerHeight - 230, cssW * 0.36));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = `${cssW}px`;
    cv.style.height = `${cssH}px`;
    cv.width = Math.round(cssW * dpr);
    cv.height = Math.round(cssH * dpr);
    const g = cv.getContext('2d')!;
    g.scale(dpr, dpr);
    // x is linear; depth is on a square-root scale so the shallow zones are not squashed flat.
    const X = (x: number) => ((x - WORLD_X0) / WORLD_SPAN) * cssW;
    const Y = (y: number) => Math.sqrt(Math.max(0, y) / WORLD_H) * cssH;
    const seen = (x: number) => save.mapSeen[Math.floor((x - WORLD_X0) / MAP_COL)] === '1';
    // Water, darkening with depth.
    const grad = g.createLinearGradient(0, 0, 0, cssH);
    grad.addColorStop(0, '#2a6e7a');
    grad.addColorStop(0.35, '#123a48');
    grad.addColorStop(1, '#050d14');
    g.fillStyle = grad;
    g.fillRect(0, 0, cssW, cssH);
    // Rock: sampled cell by cell (caves, the cleft and the sanctum show as hollows once found).
    const cols = Math.round(cssW / 3);
    const rows = Math.round(cssH / 3);
    for (let i = 0; i < cols; i++) {
      const x = WORLD_X0 + ((i + 0.5) / cols) * WORLD_SPAN;
      const known = seen(x);
      for (let j = 0; j < rows; j++) {
        const t = (j + 0.5) / rows;
        const y = t * t * WORLD_H;
        let solid = y > groundY(x) - 2 && isSolid(x, y);
        if (!solid && inSanctum(x, y) && !save.sanctum.door) solid = true;
        if (!solid && y > groundY(x) && !inSanctum(x, y) && !known) solid = true;
        if (solid) {
          g.fillStyle = known ? '#3a4446' : '#1c2224';
          g.fillRect((i / cols) * cssW, Y(y - (WORLD_H / rows) * t * 2), cssW / cols + 0.6, cssH / rows + 3);
        } else if (inSanctum(x, y)) {
          g.fillStyle = 'rgba(162, 124, 255, 0.55)';
          g.fillRect((i / cols) * cssW, Y(y), cssW / cols + 0.6, cssH / rows + 1);
        }
      }
    }
    // The seabed's line, where seen.
    g.lineWidth = 1.4;
    g.strokeStyle = '#a8a088';
    g.beginPath();
    let pen = false;
    for (let i = 0; i <= cols; i++) {
      const x = WORLD_X0 + (i / cols) * WORLD_SPAN;
      if (!seen(x)) {
        pen = false;
        continue;
      }
      const px = X(x);
      const py = Y(groundY(x));
      if (!pen) g.moveTo(px, py);
      else g.lineTo(px, py);
      pen = true;
    }
    g.stroke();
    // Unseen water: dark fog.
    for (let i = 0; i < cols; i++) {
      const x = WORLD_X0 + ((i + 0.5) / cols) * WORLD_SPAN;
      if (seen(x)) continue;
      g.fillStyle = 'rgba(6, 10, 14, 0.82)';
      g.fillRect((i / cols) * cssW, 0, cssW / cols + 0.6, cssH);
    }
    // Zone names along the top, for zones you have reached.
    g.font = '600 11px -apple-system, system-ui, sans-serif';
    g.textAlign = 'center';
    for (const z of ZONES) {
      let any = false;
      for (let x = z.x0; x < z.x1; x += MAP_COL) if (seen(x)) any = true;
      g.fillStyle = any ? '#e4efec' : '#5a6a6c';
      g.fillText(any ? z.name : '?', X((z.x0 + z.x1) / 2), 14);
      g.strokeStyle = 'rgba(228, 239, 236, 0.18)';
      g.beginPath();
      g.moveTo(X(z.x0), 20);
      g.lineTo(X(z.x0), cssH);
      g.stroke();
    }
    if (save.sanctum.door) {
      g.fillStyle = '#d8c8ff';
      g.fillText('The sanctum', X(30800), Y(8250) + 4);
    }
    // Sites: the base, and what you have scanned or found.
    const has = (id: string) => save.scans.includes(id);
    const sites: { x: number; y: number; name: string; on: boolean; c: string }[] = [
      { x: BUOY_X, y: 300, name: 'Kestrel', on: true, c: '#c6f03a' },
      { x: SLED_X, y: groundY(SLED_X) - 30, name: 'Sled', on: has('sled'), c: '#ffd890' },
      { x: SITE_MOUTH.x, y: SITE_MOUTH.y, name: 'Kelp caves', on: seen(SITE_MOUTH.x + 600), c: '#ffd890' },
      { x: (CORVINA.x0 + CORVINA.x1) / 2, y: 1400, name: 'Corvina', on: has('corvina'), c: '#ffd890' },
      { x: TR_BUOY.x, y: TRENCH_Y.rim - 40, name: 'Relay buoy', on: has('sigbuoy') || save.signals.found.includes('sig1'), c: '#ffd890' },
      { x: CLEFT.x, y: CLEFT.y, name: 'Cleft', on: has('chimney') || save.cleftOpen, c: '#ffb070' },
      { x: (FULMAR.x0 + FULMAR.x1) / 2, y: TRENCH_Y.floor - 120, name: 'Fulmar', on: has('fulmar'), c: '#ffd890' },
      { x: SANCTUM.door.x, y: SANCTUM.door.y, name: 'The door', on: has('sdoor') || save.signals.decoded.length >= 4, c: '#5ff0ff' },
      { x: SANCTUM.heart.x, y: SANCTUM.heart.y - 60, name: 'The heart', on: has('sheart') && save.sanctum.door, c: '#ff5ad8' },
    ];
    g.font = '10px -apple-system, system-ui, sans-serif';
    g.textAlign = 'left';
    // Labels go above their marker, or below when that would overlap one already placed.
    const placed: { x0: number; x1: number; y: number }[] = [];
    const label = (text: string, px: number, py: number) => {
      const w = g.measureText(text).width;
      let ly = py - 5;
      const hit = (y: number) => placed.some((q) => px + 5 < q.x1 && px + 5 + w > q.x0 && Math.abs(q.y - y) < 11);
      if (hit(ly)) ly = py + 13;
      if (hit(ly)) ly = py + 25;
      let lx = px + 5;
      if (lx + w > cssW - 2) lx = px - 5 - w;
      g.fillText(text, lx, ly);
      placed.push({ x0: lx, x1: lx + w, y: ly });
    };
    for (const s of sites) {
      if (!s.on) continue;
      const px = X(s.x);
      const py = Y(s.y);
      g.fillStyle = s.c;
      g.beginPath();
      g.arc(px, py, 3.2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#e4efec';
      label(s.name, px, py);
    }
    // The Choir's way: one leg per decoded fragment, dotted, in the Choir's colours.
    const legs = save.signals.decoded.length;
    g.setLineDash([3, 4]);
    g.lineWidth = 2;
    const cc = ['#5ff0ff', '#a27cff', '#ff5ad8', '#5ff0ff'];
    for (let i = 0; i < Math.min(legs, WAY.length); i++) {
      g.strokeStyle = cc[i];
      g.beginPath();
      WAY[i].forEach((p, k) => (k ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y))));
      g.stroke();
    }
    g.setLineDash([]);
    if (legs >= 4) {
      g.strokeStyle = '#5ff0ff';
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(X(SANCTUM.door.x), Y(SANCTUM.door.y), 7, 0, Math.PI * 2);
      g.stroke();
    }
    // You.
    if (you) {
      const px = X(you.x);
      const py = Y(you.y);
      g.fillStyle = '#fff3d0';
      g.strokeStyle = '#1b2224';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(px, py - 7);
      g.lineTo(px + 5, py + 3);
      g.lineTo(px - 5, py + 3);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = '#fff3d0';
      label('You', px, py + 16);
    }
  }
}
