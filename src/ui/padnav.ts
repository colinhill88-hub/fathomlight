/**
 * Milestone 12: one gamepad focus system for every panel and menu.
 *
 * While a panel is on screen, the gamepad drives it like a TV remote:
 *  - d-pad or left stick moves a highlight to the nearest button in that direction;
 *  - A presses the highlighted button;
 *  - B closes the panel (its ✕ or Close button), like Escape;
 *  - LB / RB step through the panel's tabs;
 *  - the right stick scrolls a long panel.
 * The panels themselves don't change: this finds their buttons in the page.
 *
 * Build mode keeps its own gamepad controls (see src/ui/build.ts), and the
 * contact pads answer to A, B, X and Y directly (src/ui/contact.ts).
 */

/** Panels, most on top first. The first one on screen gets the pad. */
const ROOTS = [
  '#title-screen',
  '#save-code',
  '#pause-menu',
  '#read-panel',
  '#contact',
  '#zone-map',
  '#settings-panel',
  '#log-panel',
  '#rates-panel',
  '#station-panel',
  '#dock-panel',
  '#care-panel',
];

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [data-act]:not([disabled]), a[href]';
const DEADZONE = 0.5;
const REPEAT_FIRST = 0.38;
const REPEAT_NEXT = 0.12;

function shown(el: Element): boolean {
  const h = el as HTMLElement;
  if (!h.isConnected || h.hidden) return false;
  if (h.getClientRects().length === 0) return false;
  const cs = getComputedStyle(h);
  return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
}

export class PadNav {
  private prev: boolean[] = [];
  private focus: HTMLElement | null = null;
  private root: HTMLElement | null = null;
  private held = '';
  private holdT = 0;
  /** Seconds since the pad was last used (the highlight shows only while the pad is in use). */
  private idle = 99;

  /** True while a panel holds the pad (the game's own pad controls should stand down). */
  get active(): boolean {
    return !!this.root;
  }

  /** The panel on screen that should take the pad, if any. */
  private findRoot(): HTMLElement | null {
    for (const sel of ROOTS) {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el && shown(el)) return el;
    }
    return null;
  }

  private items(root: HTMLElement): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((e) => !e.classList.contains('contact-pad') && shown(e));
  }

  private setFocus(el: HTMLElement | null): void {
    if (this.focus === el) return;
    this.focus?.classList.remove('pad-focus');
    this.focus = el;
    if (el) {
      el.classList.add('pad-focus');
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.focus({ preventScroll: true });
    }
  }

  /** Move to the nearest item in a direction. */
  private move(dx: number, dy: number, items: HTMLElement[]): void {
    if (!this.focus || !items.includes(this.focus)) {
      this.setFocus(items[0] ?? null);
      return;
    }
    const a = this.focus.getBoundingClientRect();
    const ax = a.left + a.width / 2;
    const ay = a.top + a.height / 2;
    let best: HTMLElement | null = null;
    let bestScore = Infinity;
    for (const el of items) {
      if (el === this.focus) continue;
      const b = el.getBoundingClientRect();
      const vx = b.left + b.width / 2 - ax;
      const vy = b.top + b.height / 2 - ay;
      const along = vx * dx + vy * dy;
      if (along <= 4) continue;
      const across = Math.abs(vx * dy - vy * dx);
      const score = along + across * 2.2;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    // Nothing further that way: wrap round in reading order for up/down.
    if (!best && dy !== 0) {
      const i = items.indexOf(this.focus);
      best = items[(i + (dy > 0 ? 1 : -1) + items.length) % items.length];
    }
    if (best) this.setFocus(best);
  }

  private close(root: HTMLElement): void {
    if (root.id === 'log-panel') {
      document.getElementById('log-btn')?.click();
      return;
    }
    const x = root.querySelector<HTMLElement>('[data-act="close"], .x, .close, [aria-label="Close"], [data-close]');
    if (x && shown(x)) {
      x.click();
      return;
    }
    // Panels with a lone Close or Back button.
    const btn = this.items(root).find((b) => /^(close|back|done|cancel|resume)$/i.test(b.textContent?.trim() ?? ''));
    if (btn) {
      btn.click();
      return;
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }

  private tab(root: HTMLElement, step: number): void {
    const tabs = [...root.querySelectorAll<HTMLElement>('.tabs button, .tabs .tab, [role="tab"], .tab')].filter(shown);
    if (tabs.length < 2) return;
    let i = tabs.findIndex((t) => t.classList.contains('on') || t.getAttribute('aria-selected') === 'true');
    if (i < 0) i = 0;
    const next = tabs[(i + step + tabs.length) % tabs.length];
    next.click();
    // The panel may redraw: put the highlight on the new tab.
    requestAnimationFrame(() => {
      const again = [...root.querySelectorAll<HTMLElement>('.tabs button, .tabs .tab, [role="tab"], .tab')].filter(shown);
      this.setFocus(again.find((t) => t.classList.contains('on')) ?? again[(i + step + again.length) % again.length] ?? null);
    });
  }

  /** Call once a frame. */
  update(dt: number): void {
    const root = this.findRoot();
    if (root !== this.root) {
      this.root = root;
      this.setFocus(null);
      this.held = '';
    }
    const pad = (navigator.getGamepads?.() ?? []).find((p) => !!p);
    if (!pad) {
      this.prev = [];
      return;
    }
    const btn = (i: number) => !!pad.buttons[i]?.pressed;
    const pressed = (i: number) => btn(i) && !this.prev[i];
    const any = pad.buttons.some((b) => b.pressed) || pad.axes.some((a) => Math.abs(a) > DEADZONE);
    this.idle = any ? 0 : this.idle + dt;
    document.body.classList.toggle('pad-in-use', this.idle < 20);
    if (root) {
      const items = this.items(root);
      // The highlight survives redraws by matching the same action on the new button.
      if (this.focus && !this.focus.isConnected) {
        const act = this.focus.dataset.act;
        const id = this.focus.dataset.id;
        const same = items.find((e) => e.dataset.act === act && e.dataset.id === id && !!act);
        this.focus = null;
        if (same) this.setFocus(same);
      }
      // The first touch of the pad only shows the highlight; it doesn't move it.
      let fresh = false;
      if (!this.focus && any && items.length) {
        this.setFocus(items[0]);
        fresh = true;
      }
      // Direction: d-pad (12–15) or the left stick, with key-repeat.
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      const dir = btn(12) || ay < -DEADZONE ? 'u' : btn(13) || ay > DEADZONE ? 'd' : btn(14) || ax < -DEADZONE ? 'l' : btn(15) || ax > DEADZONE ? 'r' : '';
      if (dir && dir !== this.held) {
        this.held = dir;
        this.holdT = REPEAT_FIRST;
        if (!fresh) this.step(dir, items);
      } else if (dir) {
        this.holdT -= dt;
        if (this.holdT <= 0) {
          this.holdT = REPEAT_NEXT;
          this.step(dir, items);
        }
      } else this.held = '';
      if (pressed(0) && this.focus && !fresh) {
        const f = this.focus;
        if (f instanceof HTMLInputElement && f.type === 'range') {
          /* A on a slider does nothing; left/right moves it. */
        } else f.click();
      }
      if (pressed(1)) this.close(root);
      if (pressed(4)) this.tab(root, -1);
      if (pressed(5)) this.tab(root, 1);
      // Right stick scrolls the panel (or its scrolling part).
      const ry = pad.axes[3] ?? 0;
      if (Math.abs(ry) > 0.2) {
        const scroller = this.scroller(root);
        scroller.scrollTop += ry * dt * 900;
      }
    }
    this.prev = pad.buttons.map((b) => b.pressed);
  }

  private step(dir: string, items: HTMLElement[]): void {
    const f = this.focus;
    // Sliders take left and right.
    if (f instanceof HTMLInputElement && f.type === 'range' && (dir === 'l' || dir === 'r')) {
      const stepV = Number(f.step) || (Number(f.max) - Number(f.min)) / 20;
      f.value = String(Math.min(Number(f.max), Math.max(Number(f.min), Number(f.value) + (dir === 'r' ? stepV : -stepV))));
      f.dispatchEvent(new Event('input', { bubbles: true }));
      f.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    const [dx, dy] = dir === 'u' ? [0, -1] : dir === 'd' ? [0, 1] : dir === 'l' ? [-1, 0] : [1, 0];
    this.move(dx, dy, items);
  }

  private scroller(root: HTMLElement): HTMLElement {
    if (root.scrollHeight > root.clientHeight + 4) return root;
    for (const el of root.querySelectorAll<HTMLElement>('*')) {
      const cs = getComputedStyle(el);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 4) return el;
    }
    return root;
  }
}
