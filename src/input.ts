/**
 * Controls. Every device feeds the same simple state:
 *   move  - a direction with strength 0..1 (from stick, keys, mouse or gamepad)
 *   boost - true for the one frame a boost was asked for
 *   lamp  - true for the one frame the lamp was toggled
 *   scan  - true while the scan control is held down
 *   scanTap - true for the one frame the scan control was pressed (quick ID of known things)
 *   collect - true while the collect control is held down
 *
 * Touch: drag anywhere on the left half of the screen for a floating stick;
 *        the round buttons on the right are Boost, Lamp, Scan (tap or hold)
 *        and Collect (hold; it appears only next to a material).
 * Keyboard: WASD or arrow keys to swim, Shift or Space to boost, L or F for the lamp,
 *           E or Q to scan (tap or hold), hold C or R to collect.
 * Mouse: hold the left button to swim towards the pointer, right-click to boost.
 * Gamepad: left stick to swim, A to boost, Y for the lamp, B to scan, hold X to collect.
 */

export interface InputState {
  moveX: number;
  moveY: number;
  boost: boolean;
  lamp: boolean;
  scan: boolean;
  scanTap: boolean;
  collect: boolean;
  /** Which kind of control was used last, so on-screen hints can match it. */
  lastDevice: 'touch' | 'keyboard' | 'mouse' | 'gamepad';
}

const STICK_RADIUS = 56;
const DEADZONE = 0.15;

export class Input {
  readonly state: InputState = { moveX: 0, moveY: 0, boost: false, lamp: false, scan: false, scanTap: false, collect: false, lastDevice: 'keyboard' };

  private keys = new Set<string>();
  private boostQueued = false;
  private lampQueued = false;
  private scanButton = false;
  private scanTapQueued = false;
  private collectButton = false;

  // Touch stick.
  private stickId: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private stickVec = { x: 0, y: 0 };
  private stickBase: HTMLElement;
  private stickKnob: HTMLElement;

  // Mouse steering.
  private mouseDown = false;
  private mouse = { x: 0, y: 0 };

  // Gamepad buttons from the last frame, to detect presses.
  private padPrev: boolean[] = [];

  /** Where the diver is on screen (CSS px), so the mouse can steer towards it. */
  diverScreen = { x: 0, y: 0 };

  constructor(surface: HTMLElement) {
    this.stickBase = document.getElementById('stick-base')!;
    this.stickKnob = document.getElementById('stick-knob')!;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      this.keys.add(k);
      this.state.lastDevice = 'keyboard';
      if (k === 'shift' || k === ' ') this.boostQueued = true;
      if (k === 'l' || k === 'f') this.lampQueued = true;
      if (k === 'e' || k === 'q') this.scanTapQueued = true;
      if (k.startsWith('arrow') || k === ' ') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.scanButton = false;
      this.collectButton = false;
      this.mouseDown = false;
      this.releaseStick();
    });

    surface.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        this.state.lastDevice = 'touch';
        document.body.classList.add('touch');
        if (this.stickId === null && e.clientX < window.innerWidth * 0.55) {
          this.stickId = e.pointerId;
          // Keep the stick fully on screen even if the thumb lands at the very edge.
          const m = STICK_RADIUS + 12;
          this.stickOrigin = {
            x: Math.max(m, Math.min(window.innerWidth - m, e.clientX)),
            y: Math.max(m, Math.min(window.innerHeight - m, e.clientY)),
          };
          this.stickVec = { x: 0, y: 0 };
          this.stickBase.style.transform = `translate(${this.stickOrigin.x}px, ${this.stickOrigin.y}px)`;
          this.stickKnob.style.transform = `translate(${this.stickOrigin.x}px, ${this.stickOrigin.y}px)`;
          this.stickBase.classList.add('active');
          this.stickKnob.classList.add('active');
          surface.setPointerCapture(e.pointerId);
        }
      } else if (e.pointerType === 'mouse') {
        this.state.lastDevice = 'mouse';
        document.body.classList.remove('touch');
        if (e.button === 0) this.mouseDown = true;
        if (e.button === 2) this.boostQueued = true;
        this.mouse = { x: e.clientX, y: e.clientY };
      }
    });
    surface.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.stickId) {
        let dx = e.clientX - this.stickOrigin.x;
        let dy = e.clientY - this.stickOrigin.y;
        const len = Math.hypot(dx, dy);
        if (len > STICK_RADIUS) {
          dx *= STICK_RADIUS / len;
          dy *= STICK_RADIUS / len;
        }
        this.stickVec = { x: dx / STICK_RADIUS, y: dy / STICK_RADIUS };
        this.stickKnob.style.transform = `translate(${this.stickOrigin.x + dx}px, ${this.stickOrigin.y + dy}px)`;
      } else if (e.pointerType === 'mouse') {
        this.mouse = { x: e.clientX, y: e.clientY };
      }
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId === this.stickId) this.releaseStick();
      if (e.pointerType === 'mouse' && e.button === 0) this.mouseDown = false;
    };
    surface.addEventListener('pointerup', end);
    surface.addEventListener('pointercancel', end);
    surface.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch buttons. pointerdown (not click) so they respond instantly.
    const press = (id: string, fn: () => void) => {
      const el = document.getElementById(id)!;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.add('pressed');
        fn();
      });
      const up = () => el.classList.remove('pressed');
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
    };
    press('btn-boost', () => (this.boostQueued = true));
    press('btn-lamp', () => (this.lampQueued = true));
    // Scan is held, not tapped.
    const scanEl = document.getElementById('btn-scan')!;
    scanEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        scanEl.setPointerCapture(e.pointerId);
      } catch {
        /* capture is a nicety; the button works without it */
      }
      scanEl.classList.add('pressed');
      this.scanButton = true;
      this.scanTapQueued = true;
    });
    const scanUp = () => {
      scanEl.classList.remove('pressed');
      this.scanButton = false;
      this.collectButton = false;
    };
    scanEl.addEventListener('pointerup', scanUp);
    scanEl.addEventListener('pointercancel', scanUp);
    scanEl.addEventListener('lostpointercapture', scanUp);
    const colEl = document.getElementById('btn-collect')!;
    colEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        colEl.setPointerCapture(e.pointerId);
      } catch {
        /* capture is a nicety */
      }
      colEl.classList.add('pressed');
      this.collectButton = true;
    });
    const colUp = () => {
      colEl.classList.remove('pressed');
      this.collectButton = false;
    };
    colEl.addEventListener('pointerup', colUp);
    colEl.addEventListener('pointercancel', colUp);
    colEl.addEventListener('lostpointercapture', colUp);

    if (window.matchMedia?.('(pointer: coarse)').matches) {
      document.body.classList.add('touch');
      this.state.lastDevice = 'touch';
    }
  }

  private releaseStick(): void {
    this.stickId = null;
    this.stickVec = { x: 0, y: 0 };
    this.stickBase.classList.remove('active');
    this.stickKnob.classList.remove('active');
  }

  /** Call once per frame before reading `state`. */
  update(): void {
    let x = 0;
    let y = 0;
    const k = this.keys;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) y -= 1;
    if (k.has('s') || k.has('arrowdown')) y += 1;
    if (x || y) {
      const l = Math.hypot(x, y);
      x /= l;
      y /= l;
    }

    if (this.stickId !== null) {
      x = this.stickVec.x;
      y = this.stickVec.y;
    } else if (this.mouseDown) {
      const dx = this.mouse.x - this.diverScreen.x;
      const dy = this.mouse.y - this.diverScreen.y;
      const len = Math.hypot(dx, dy);
      const strength = Math.min(1, Math.max(0, (len - 20) / 160));
      if (len > 1) {
        x = (dx / len) * strength;
        y = (dy / len) * strength;
      }
    }

    let scan = this.scanButton || k.has('e') || k.has('q');
    let collect = this.collectButton || k.has('c') || k.has('r');

    // Gamepad (first connected pad).
    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad) continue;
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      const len = Math.hypot(ax, ay);
      if (len > DEADZONE) {
        const s = Math.min(1, (len - DEADZONE) / (1 - DEADZONE)) / len;
        x = ax * s;
        y = ay * s;
        this.state.lastDevice = 'gamepad';
      }
      const btn = (i: number) => !!pad.buttons[i]?.pressed;
      const pressed = (i: number) => btn(i) && !this.padPrev[i];
      if (pressed(0)) this.boostQueued = true;
      if (pressed(3)) this.lampQueued = true;
      if (btn(1)) scan = true;
      if (pressed(1)) this.scanTapQueued = true;
      if (btn(2)) collect = true;
      if (pressed(0) || pressed(2) || pressed(3)) this.state.lastDevice = 'gamepad';
      this.padPrev = pad.buttons.map((b) => b.pressed);
      break;
    }

    this.state.moveX = x;
    this.state.moveY = y;
    this.state.boost = this.boostQueued;
    this.state.lamp = this.lampQueued;
    this.state.scan = scan;
    this.state.scanTap = this.scanTapQueued;
    this.state.collect = collect;
    this.scanTapQueued = false;
    this.boostQueued = false;
    this.lampQueued = false;
  }
}
