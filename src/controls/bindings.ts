/**
 * Phase 13: the one place that says which key, mouse button or gamepad
 * button performs each action. `Input`, build mode, the panels' shortcut keys
 * and the on-screen control helper all read from here, so the labels the
 * helper shows can never drift from what the keys actually do.
 *
 * Keys are `KeyboardEvent.key` values, lower-cased (' ' is Space). Gamepad
 * buttons use the standard mapping indices. Players cannot remap yet, but the
 * overrides below are already stored per device (`fathomlight.bindings`), so a
 * remapping screen only has to call `setKeys` / `setPad` and every consumer,
 * including the helper, updates on the next frame.
 */

export type Action =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'boost'
  | 'jump'
  | 'sprint'
  | 'lamp'
  | 'scan'
  | 'collect'
  | 'board'
  | 'flare'
  | 'dart'
  | 'haul'
  // Phase 15: release the creature in the jar; open the Field kit.
  | 'release'
  | 'kit'
  // Phase 17b: clamp the mag-boots on and off (walk the seabed).
  | 'boots'
  // Phase 19: fire the Rivet driver (on foot, in infested wrecks). Bracing is Down, held.
  | 'shoot'
  | 'build'
  | 'tend'
  | 'dock'
  | 'lab'
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomReset'
  | 'mute'
  | 'menu'
  // Build mode (only read while the build view is open).
  | 'buildPlace'
  | 'buildRotate'
  | 'buildFit'
  | 'buildBelt'
  | 'buildPipe'
  | 'buildUpgrade'
  | 'buildRates'
  | 'buildZoomIn'
  | 'buildZoomOut'
  // Panels.
  | 'feed'
  | 'clean'
  | 'repair'
  // Phase 21: the Habitat console's hand-feed and "care for all".
  | 'handFeed'
  | 'careAll';

export interface Binding {
  keys: string[];
  /** Standard-mapping gamepad buttons. */
  pad: number[];
  /** Mouse affordances, for display (the pointer code lives in Input / build mode). */
  mouse?: 'left' | 'right' | 'wheel';
}

const DEFAULTS: Record<Action, Binding> = {
  // Pads move with the left stick (axes 0 and 1), not the d-pad.
  up: { keys: ['w', 'arrowup'], pad: [] },
  down: { keys: ['s', 'arrowdown'], pad: [] },
  left: { keys: ['a', 'arrowleft'], pad: [] },
  right: { keys: ['d', 'arrowright'], pad: [] },
  boost: { keys: ['shift', ' '], pad: [0], mouse: 'right' },
  jump: { keys: [' '], pad: [0] },
  sprint: { keys: ['shift'], pad: [4, 10] },
  lamp: { keys: ['l', 'f'], pad: [3] },
  scan: { keys: ['e', 'q'], pad: [1] },
  collect: { keys: ['c', 'r'], pad: [2] },
  board: { keys: ['v'], pad: [5] },
  flare: { keys: ['z'], pad: [6] },
  dart: { keys: ['x'], pad: [7] },
  haul: { keys: ['h'], pad: [13] },
  release: { keys: ['j'], pad: [14] },
  kit: { keys: ['i'], pad: [8] },
  // N (free on the keyboard), the d-pad's up (free on the pad), the Boots button on touch.
  boots: { keys: ['n'], pad: [12] },
  // Phase 19: the stun dart's own keys (X, RT). The dart only works swimming and the Rivet driver only
  // on foot, so the two never compete. Plus the Shoot button on touch once the driver is built.
  shoot: { keys: ['x'], pad: [7] },
  build: { keys: ['b'], pad: [] },
  tend: { keys: ['t'], pad: [] },
  dock: { keys: ['g'], pad: [] },
  lab: { keys: ['k'], pad: [] },
  zoomIn: { keys: ['=', '+'], pad: [], mouse: 'wheel' },
  zoomOut: { keys: ['-', '_'], pad: [], mouse: 'wheel' },
  zoomReset: { keys: ['0'], pad: [] },
  mute: { keys: ['m'], pad: [] },
  menu: { keys: ['escape'], pad: [9] },
  buildPlace: { keys: ['enter', ' '], pad: [], mouse: 'left' },
  buildRotate: { keys: ['r'], pad: [] },
  buildFit: { keys: ['f'], pad: [] },
  buildBelt: { keys: ['c'], pad: [] },
  buildPipe: { keys: ['p'], pad: [] },
  buildUpgrade: { keys: ['u'], pad: [] },
  buildRates: { keys: ['o'], pad: [] },
  buildZoomIn: { keys: ['=', '+', 'e'], pad: [], mouse: 'wheel' },
  buildZoomOut: { keys: ['-', 'q'], pad: [], mouse: 'wheel' },
  feed: { keys: ['f'], pad: [] },
  clean: { keys: ['c'], pad: [] },
  repair: { keys: ['r'], pad: [] },
  handFeed: { keys: ['h'], pad: [] },
  careAll: { keys: ['y'], pad: [] },
};

const STORE = 'fathomlight.bindings';
let overrides: Partial<Record<Action, Partial<Binding>>> = {};
try {
  const raw = localStorage.getItem(STORE);
  if (raw) overrides = JSON.parse(raw) ?? {};
} catch {
  /* storage blocked or corrupt: defaults */
}
let version = 0;
const listeners = new Set<() => void>();

export function binding(a: Action): Binding {
  const o = overrides[a];
  const d = DEFAULTS[a];
  return o ? { keys: o.keys ?? d.keys, pad: o.pad ?? d.pad, mouse: d.mouse } : d;
}
export const keysFor = (a: Action): string[] => binding(a).keys;
export const padFor = (a: Action): number[] => binding(a).pad;
/** Does this (lower-cased) key perform the action? */
export const isKey = (a: Action, key: string): boolean => binding(a).keys.includes(key);
/** Bumps whenever a binding changes, so cached labels can refresh. */
export const bindingsVersion = (): number => version;

function store(): void {
  version++;
  try {
    localStorage.setItem(STORE, JSON.stringify(overrides));
  } catch {
    /* storage blocked */
  }
  for (const f of listeners) f();
}
/** For a future remapping screen. */
export function setKeys(a: Action, keys: string[]): void {
  overrides[a] = { ...overrides[a], keys: keys.map((k) => k.toLowerCase()) };
  store();
}
export function setPad(a: Action, pad: number[]): void {
  overrides[a] = { ...overrides[a], pad };
  store();
}
export function resetBindings(): void {
  overrides = {};
  store();
}
export function onBindingsChanged(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

// ---- Display names ----

const KEY_NAMES: Record<string, string> = {
  ' ': 'Space',
  shift: 'Shift',
  control: 'Ctrl',
  alt: 'Alt',
  enter: 'Enter',
  escape: 'Esc',
  tab: 'Tab',
  backspace: '⌫',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
};
export function keyName(k: string): string {
  return KEY_NAMES[k] ?? (k.length === 1 ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1));
}

/** Standard mapping, labelled the common way (face buttons by position letter). */
const PAD_NAMES: Record<number, string> = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  4: 'LB',
  5: 'RB',
  6: 'LT',
  7: 'RT',
  8: 'View',
  9: 'Menu',
  10: 'LS',
  11: 'RS',
  12: 'D↑',
  13: 'D↓',
  14: 'D←',
  15: 'D→',
};
export const padName = (i: number): string => PAD_NAMES[i] ?? `B${i}`;
