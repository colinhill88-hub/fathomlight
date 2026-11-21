import { binding, bindingsVersion, keyName, padName, type Action } from '../controls/bindings';

/**
 * Phase 13: the contextual control helper, a short row of keycaps along the
 * bottom edge that shows what the player can do right now, with the keys the
 * game will actually respond to (read from src/controls/bindings.ts).
 *
 * main.ts builds a `HelperContext` every frame from the state it already
 * computes (the Collect / Scan / Board offers the HUD shows, which panels can
 * open here, what gear is owned) and the helper decides what to show:
 *
 *  - Contextual (default): the movement set appears when the situation changes
 *    (entering the sub, stepping into the base, grabbing a ladder) and whenever
 *    the player pauses, then fades while they play. Actions the world offers
 *    (a tank to put a creature in, a seam to drill) always show and pulse once
 *    when they appear.
 *  - Always: every relevant row, dimming a little during uninterrupted play.
 *  - Hidden: nothing.
 *
 * Touch play has its own on-screen buttons, so the helper stays out of the way there.
 */

export type HelperPref = 'contextual' | 'always' | 'hidden';
export type HelperMode = 'swim' | 'sub' | 'foot' | 'climb' | 'swing' | 'build' | 'boots' | 'none';
export type Device = 'touch' | 'keyboard' | 'mouse' | 'gamepad';

export interface HelperContext {
  mode: HelperMode;
  device: Device;
  /** What Collect does here (the HUD's Collect label), and whether it is a tap rather than a hold. */
  collect: { label: string; tap: boolean } | null;
  /** An unscanned thing in reach (its category, e.g. "creature"). */
  scan: string | null;
  /** Board / Exit offer for KS-1. */
  board: string | null;
  /** Panels that can open where the player stands. */
  build: boolean;
  tend: boolean;
  dock: boolean;
  lab: boolean;
  /** Owned tools. */
  flare: boolean;
  dart: boolean;
  haul: boolean;
  /** Phase 15: what the jar holds, offered for release (e.g. "glowfin fry"). */
  release?: string | null;
  sonar: boolean;
  /** KS-1 floodlights fitted (aboard), otherwise the diver's lamp. */
  lights: boolean;
  /** Mag-boots on, close to the seabed. (Phase 17b: no longer offered; the Boots toggle replaced hold-to-brace.) */
  brace: boolean;
  /**
   * Phase 17b: the mag-boots toggle. 'offer' when they are owned and the seabed
   * or a current is close (clamping on is offered as a world action), 'own' when
   * owned (a standing row while swimming), null otherwise. While clamped the mode is 'boots'.
   */
  boots?: 'offer' | 'own' | null;
  /** On foot: a ladder within reach. */
  ladder: boolean;
  /** Zoom works here (open water or the base on foot). */
  zoom: boolean;
  /** The player is giving movement input. */
  moving: boolean;
}

export interface HelperRow {
  id: string;
  /** Actions whose bindings form the keycap; 'move' draws the direction cluster. */
  keys: (Action | 'move' | 'moveX' | 'moveY')[];
  label: string;
  hold?: boolean;
  /** Offered by the world right now (vs. the standing movement set). */
  context?: boolean;
}

/** The rows for a situation, most important first (pure: used by the helper and the tests). */
export function helperRows(c: HelperContext): HelperRow[] {
  const r: HelperRow[] = [];
  const pad = c.device === 'gamepad';
  const add = (row: HelperRow) => {
    // A gamepad can't show an action that has no button.
    if (pad && row.keys.every((k) => k !== 'move' && k !== 'moveX' && k !== 'moveY' && !binding(k).pad.length)) return;
    r.push(row);
  };
  // Things the world offers come first: they are why the player stopped here.
  if (c.collect) add({ id: 'collect:' + c.collect.label, keys: ['collect'], label: trimLabel(c.collect.label), hold: !c.collect.tap, context: true });
  if (c.board) add({ id: 'board:' + c.board, keys: ['board'], label: c.board === 'Board' ? 'Board KS-1' : c.board.startsWith('Exit') ? c.board.replace('Exit', 'Exit KS-1') : c.board, context: true });
  if (c.scan) add({ id: 'scan:' + c.scan, keys: ['scan'], label: `Scan the unknown ${c.scan}`, hold: true, context: true });
  if (c.tend) add({ id: 'tend', keys: ['tend'], label: 'Tend the tank', context: true });
  if (c.dock) add({ id: 'dock', keys: ['dock'], label: 'Dock panel', context: true });
  if (c.lab) add({ id: 'lab', keys: ['lab'], label: 'Open the station', context: true });
  if (c.build) add({ id: 'build', keys: ['build'], label: 'Build', context: true });
  if (c.boots === 'offer' && c.mode === 'swim') add({ id: 'boots', keys: ['boots'], label: 'Clamp mag-boots', context: true });

  switch (c.mode) {
    case 'swim':
      add({ id: 'move', keys: ['move'], label: 'Swim' });
      add({ id: 'boost', keys: ['boost'], label: 'Boost' });
      if (!c.scan) add({ id: 'scan', keys: ['scan'], label: c.sonar ? 'Scan · sonar pulse' : 'Scan', hold: false });
      add({ id: 'lamp', keys: ['lamp'], label: 'Lamp' });
      if (c.flare) add({ id: 'flare', keys: ['flare'], label: 'Flare' });
      if (c.dart) add({ id: 'dart', keys: ['dart'], label: 'Stun dart' });
      if (c.haul) add({ id: 'haul', keys: ['haul'], label: 'Send KD-1 home' });
      if (c.release) add({ id: 'release:' + c.release, keys: ['release'], label: `Release ${c.release}` });
      if (c.boots === 'own') add({ id: 'boots', keys: ['boots'], label: 'Mag-boots' });
      add({ id: 'kit', keys: ['kit'], label: 'Field kit' });
      break;
    case 'boots':
      // Phase 17b: walking the seabed in clamped mag-boots.
      add({ id: 'unclamp', keys: ['boots'], label: 'Let go (swim)', context: true });
      add({ id: 'walk', keys: ['moveX'], label: 'Walk' });
      add({ id: 'hop', keys: ['jump'], label: 'Hop' });
      if (!c.scan) add({ id: 'scan', keys: ['scan'], label: c.sonar ? 'Scan · sonar pulse' : 'Scan', hold: false });
      add({ id: 'lamp', keys: ['lamp'], label: 'Lamp' });
      if (c.flare) add({ id: 'flare', keys: ['flare'], label: 'Flare' });
      if (c.dart) add({ id: 'dart', keys: ['dart'], label: 'Stun dart' });
      if (c.release) add({ id: 'release:' + c.release, keys: ['release'], label: `Release ${c.release}` });
      add({ id: 'kit', keys: ['kit'], label: 'Field kit' });
      break;
    case 'sub':
      add({ id: 'move', keys: ['move'], label: 'Steer KS-1' });
      add({ id: 'boost', keys: ['boost'], label: 'Thrusters' });
      if (c.lights) add({ id: 'lamp', keys: ['lamp'], label: 'Floodlights' });
      if (!c.scan) add({ id: 'scan', keys: ['scan'], label: 'Scan' });
      if (c.haul) add({ id: 'haul', keys: ['haul'], label: 'Send KD-1 home' });
      break;
    case 'foot':
      add({ id: 'walk', keys: ['moveX'], label: 'Walk' });
      add({ id: 'jump', keys: ['jump'], label: 'Jump' });
      add({ id: 'sprint', keys: ['sprint'], label: 'Sprint', hold: true });
      if (c.ladder) add({ id: 'ladder', keys: ['moveY'], label: 'Climb', context: true });
      add({ id: 'lamp', keys: ['lamp'], label: 'Lamp' });
      break;
    case 'climb':
      add({ id: 'climb', keys: ['moveY'], label: 'Climb' });
      add({ id: 'off', keys: ['moveX'], label: 'Step off' });
      break;
    case 'swing':
      add({ id: 'pump', keys: ['moveX'], label: 'Swing' });
      add({ id: 'reel', keys: ['moveY'], label: 'Reel in / out' });
      add({ id: 'let', keys: ['jump'], label: 'Let go' });
      break;
    case 'build':
      add({ id: 'pan', keys: ['move'], label: 'Pan' });
      add({ id: 'bplace', keys: ['buildPlace'], label: 'Place' });
      add({ id: 'brot', keys: ['buildRotate'], label: 'Rotate' });
      add({ id: 'bzoom', keys: ['buildZoomOut', 'buildZoomIn'], label: 'Zoom' });
      add({ id: 'bfit', keys: ['buildFit'], label: 'Fit view' });
      add({ id: 'bexit', keys: ['build'], label: 'Done' });
      break;
    case 'none':
      break;
  }
  if (c.zoom && c.mode !== 'build' && !pad) add({ id: 'zoom', keys: ['zoomOut', 'zoomIn'], label: 'Zoom' });
  return r;
}

const PREF_KEY = 'fathomlight.controlHelper';

export function loadHelperPref(): HelperPref {
  try {
    const v = localStorage.getItem(PREF_KEY);
    if (v === 'contextual' || v === 'always' || v === 'hidden') return v;
  } catch {
    /* storage blocked */
  }
  return 'contextual';
}

/** Short, consistent verbs for the Collect offers that read long in the HUD label. */
function trimLabel(s: string): string {
  return s.length > 46 ? s.slice(0, 44).replace(/\s+\S*$/, '') + '…' : s;
}

export class ControlHelper {
  readonly el: HTMLDivElement;
  private pref: HelperPref = loadHelperPref();
  private sig = '';
  private seen = new Map<string, number>();
  private time = 0;
  /** Seconds the standing (movement) set stays visible after the situation changed. */
  private coreUntil = 8;
  private lastMode: HelperMode = 'none';
  private lastDevice: Device = 'keyboard';
  private idle = 0;
  private busy = 0;
  private onPref = new Set<(p: HelperPref) => void>();

  /** Phase 15c: called when a new world offer appears on the bar. Nothing is hooked up since Colin turned the ping off. */
  onOffer: (() => void) | null = null;
  private pingAt = -99;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'ctl-helper';
    // Phase 15c: Colin chose the sonar look (style.css, "skin-sonar").
    this.el.classList.add('skin-sonar');
    this.el.setAttribute('aria-label', 'Controls');
    this.el.setAttribute('role', 'status');
    document.body.appendChild(this.el);
  }

  get preference(): HelperPref {
    return this.pref;
  }
  setPreference(p: HelperPref): void {
    this.pref = p;
    try {
      localStorage.setItem(PREF_KEY, p);
    } catch {
      /* storage blocked */
    }
    this.coreUntil = this.time + 8;
    this.sig = '';
    for (const f of this.onPref) f(p);
  }
  onPreference(f: (p: HelperPref) => void): void {
    this.onPref.add(f);
  }

  /** The rows for this situation, most important first. */
  rows(c: HelperContext): HelperRow[] {
    return helperRows(c);
  }

  update(dt: number, c: HelperContext): void {
    this.time += dt;
    const touch = c.device === 'touch';
    // While the helper is on, it carries the Collect / Scan prompts, so the old corner labels step aside.
    document.body.classList.toggle('ctl-helper-on', this.pref !== 'hidden' && !touch);
    if (this.pref === 'hidden' || touch || c.mode === 'none') {
      this.el.classList.remove('show');
      this.lastMode = c.mode;
      return;
    }
    // A new situation (or a new device) brings the standing set back for a while.
    if (c.mode !== this.lastMode || c.device !== this.lastDevice) this.coreUntil = this.time + 7;
    this.lastMode = c.mode;
    this.lastDevice = c.device;
    // So does pausing: standing still for a few seconds is when a player wonders what to do.
    this.idle = c.moving ? 0 : this.idle + dt;
    this.busy = c.moving ? this.busy + dt : Math.max(0, this.busy - dt * 3);
    if (this.idle > 4) this.coreUntil = Math.max(this.coreUntil, this.time + 1);

    const rows = this.rows(c);
    const showCore = this.pref === 'always' || this.time < this.coreUntil || c.mode === 'build';
    const shown = rows.filter((row) => row.context || showCore);
    // Uninterrupted play: in Always mode the row dims rather than vanishing.
    this.el.classList.toggle('quiet', this.pref === 'always' && this.busy > 10 && !shown.some((row) => row.context));
    this.el.classList.toggle('show', shown.length > 0);
    const sig = `${bindingsVersion()}|${c.device}|${shown.map((s) => s.id + (s.context ? '*' : '')).join(',')}`;
    if (sig === this.sig) return;
    this.sig = sig;
    for (const row of shown) if (!this.seen.has(row.id)) this.seen.set(row.id, this.time);
    // Forget offers that went away, so they pulse again when they come back.
    for (const id of [...this.seen.keys()]) if (!shown.some((s) => s.id === id)) this.seen.delete(id);
    // Phase 15c: a new offer pings softly (main.ts plays a tone in the music's key), at most every 1.5 s.
    const ping = shown.some((row) => row.context && this.time - (this.seen.get(row.id) ?? 0) < 0.2);
    if (ping && this.el.classList.contains('show') && this.time - this.pingAt > 1.5) {
      this.pingAt = this.time;
      this.onOffer?.();
    }
    this.el.innerHTML = shown
      .map((row) => {
        const fresh = row.context && this.time - (this.seen.get(row.id) ?? 0) < 0.2;
        return `<div class="ctl${row.context ? ' ctx' : ''}${fresh ? ' fresh' : ''}"><span class="caps">${this.caps(row, c.device)}${row.hold ? '<em>hold</em>' : ''}</span><span class="lbl">${escapeHtml(row.label)}</span></div>`;
      })
      .join('');
  }

  private caps(row: HelperRow, device: Device): string {
    const [a, b] = row.keys;
    // Zoom pairs: the wheel, then the two keys side by side (- =).
    if (b && (a === 'zoomOut' || a === 'buildZoomOut') && device !== 'gamepad') {
      const k0 = binding(a).keys[0];
      const k1 = binding(b as Action).keys[0];
      return `${mouseCap('wheel')}<i class="sep">/</i><kbd>${keyName(k0)}</kbd><kbd>${keyName(k1)}</kbd>`;
    }
    return row.keys
      .map((k) => this.cap(k, device))
      .filter(Boolean)
      .join('<i class="sep">/</i>');
  }

  /** One keycap (or a small cluster) for an action on the current device. */
  private cap(k: Action | 'move' | 'moveX' | 'moveY', device: Device): string {
    const pad = device === 'gamepad';
    if (k === 'move' || k === 'moveX' || k === 'moveY') {
      if (pad) return `<kbd class="pad stick">${k === 'moveX' ? 'LS ↔' : k === 'moveY' ? 'LS ↕' : 'LS'}</kbd>`;
      const first = (a: Action) => keyName(binding(a).keys[0] ?? '?');
      if (k === 'moveX') return `<kbd>${first('left')}</kbd><kbd>${first('right')}</kbd>`;
      if (k === 'moveY') return `<kbd>${first('up')}</kbd><kbd>${first('down')}</kbd>`;
      const cluster = `<span class="cluster"><kbd>${first('up')}</kbd><span><kbd>${first('left')}</kbd><kbd>${first('down')}</kbd><kbd>${first('right')}</kbd></span></span>`;
      return device === 'mouse' && k === 'move' ? `${cluster}<i class="sep">/</i>${mouseCap('left')}` : cluster;
    }
    const b = binding(k);
    if (pad) {
      const i = b.pad[0];
      if (i === undefined) return '';
      const face = i <= 3 ? ` face f${i}` : '';
      return `<kbd class="pad${face}">${padName(i)}</kbd>`;
    }
    if (b.mouse === 'wheel') return k === 'zoomIn' || k === 'buildZoomIn' ? '' : mouseCap('wheel');
    const key = b.keys[0];
    const wide = key && keyName(key).length > 1 ? ' wide' : '';
    const main = `<kbd class="key${wide}">${key ? keyName(key) : '?'}</kbd>`;
    return device === 'mouse' && b.mouse === 'right' ? `${main}<i class="sep">/</i>${mouseCap('right')}` : main;
  }
}

function mouseCap(which: 'left' | 'right' | 'wheel'): string {
  const fillL = which === 'left' ? 'currentColor' : 'none';
  const fillR = which === 'right' ? 'currentColor' : 'none';
  const wheel = which === 'wheel' ? '<rect x="10.6" y="5.5" width="2.8" height="5" rx="1.4" fill="currentColor"/>' : '';
  return `<kbd class="mouse" title="${which === 'wheel' ? 'Mouse wheel' : `${which} mouse button`}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="2.5" width="13" height="19" rx="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 2.5v7H5.6A6.5 6.5 0 0 1 12 2.5z" fill="${fillL}" opacity=".85"/><path d="M12 2.5v7h6.4A6.5 6.5 0 0 0 12 2.5z" fill="${fillR}" opacity=".85"/>${wheel}</svg></kbd>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
}
