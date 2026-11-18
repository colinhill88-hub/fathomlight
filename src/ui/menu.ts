import { describeSave, exportSaveCode, hasBackup, importSave, readSaveCode, restoreBackup, SaveData } from '../game/state';

/**
 * Milestone 12: the menus.
 *
 *  - The title screen, on every start: Continue (or Begin the dive), New game,
 *    Move a save, Settings.
 *  - The pause menu, from the menu button (top right), Escape, or Start on a
 *    gamepad: Resume, Settings, Scanner log, Move a save, Title screen.
 *  - Move a save: the save as a code to copy, share (AirDrop on an iPhone) or
 *    save as a file, and a box to paste or open a code from another device.
 *
 * The world stands still while the title or the pause menu is up.
 */

export interface MenuDeps {
  getSave(): SaveData;
  /** Was a save loaded at start (Continue), or is this a fresh game? */
  hadSave: boolean;
  persist(): void;
  resetProgress(): void;
  openSettings(): void;
  openLog(): void;
  buildId: string;
  /** Called when the world should stop or start. */
  onPause(paused: boolean): void;
  /** Is any game panel open (so Escape closes that first)? */
  panelOpen(): boolean;
}

function el(html: string): HTMLDivElement {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild as HTMLDivElement;
}

export class Menus {
  private title: HTMLDivElement | null = null;
  private pause: HTMLDivElement | null = null;
  private code: HTMLDivElement | null = null;
  private padPrev = false;
  private wasPaused = false;
  /** Was a game panel open last frame? (Escape that just closed one shouldn't also pause.) */
  private panelWas = false;

  constructor(private deps: MenuDeps) {
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || e.repeat) return;
      if (this.code) {
        this.closeCode();
        e.preventDefault();
      } else if (this.pause) {
        this.closePause();
        e.preventDefault();
      } else if (!this.title && !this.panelWas && !this.deps.panelOpen()) {
        this.openPause();
        e.preventDefault();
      }
    });
  }

  /** True while the world should stand still. */
  get paused(): boolean {
    return !!this.title || !!this.pause || !!this.code;
  }

  private sync(): void {
    const p = this.paused;
    if (p !== this.wasPaused) {
      this.wasPaused = p;
      this.deps.onPause(p);
      document.body.classList.toggle('menu-up', p);
    }
  }

  /** Start on a gamepad opens and closes the pause menu. Call every frame. */
  update(): void {
    const pad = (navigator.getGamepads?.() ?? []).find((q) => !!q);
    const start = !!pad?.buttons[9]?.pressed;
    if (start && !this.padPrev) {
      if (this.title) this.hideTitle();
      else if (this.code) this.closeCode();
      else if (this.pause) this.closePause();
      else if (!this.panelWas) this.openPause();
    }
    this.padPrev = start;
    this.panelWas = this.deps.panelOpen();
  }

  // ---- Title screen ----

  showTitle(): void {
    this.title?.remove();
    const has = this.deps.hadSave || (this.deps.getSave().savedAt ?? 0) > 0;
    const t = el(`<div id="title-screen" role="dialog" aria-label="Fathomlight">
      <div class="title-card">
        <h1>Fathomlight</h1>
        <p class="title-tag">Dive, build, raise the deep's creatures, and answer the light below.</p>
        <div class="title-buttons">
          <button type="button" data-t="go" class="primary">${has ? 'Continue' : 'Begin the dive'}</button>
          ${has ? '<button type="button" data-t="new">New game</button>' : ''}
          <button type="button" data-t="move">Move a save</button>
          <button type="button" data-t="settings">Settings</button>
        </div>
        ${has ? `<p class="title-save">${describeSave(this.deps.getSave())}</p>` : ''}
        <p class="title-foot">Touch, keyboard or gamepad · build ${this.deps.buildId}</p>
      </div>
    </div>`);
    let armed = 0;
    t.addEventListener('pointerdown', (e) => e.stopPropagation());
    t.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button');
      if (!b) return;
      const act = b.dataset.t;
      if (act === 'go') this.hideTitle();
      else if (act === 'new') {
        if (Date.now() - armed < 4000) {
          this.deps.resetProgress();
          return;
        }
        armed = Date.now();
        b.textContent = 'Tap again to erase this save and start over';
        b.classList.add('armed');
        setTimeout(() => {
          b.textContent = 'New game';
          b.classList.remove('armed');
        }, 4000);
      } else if (act === 'move') this.openCode();
      else if (act === 'settings') {
        this.hideTitle();
        this.deps.openSettings();
      }
    });
    document.body.appendChild(t);
    document.body.classList.add('title-up');
    this.title = t;
    this.sync();
  }

  hideTitle(): void {
    this.title?.remove();
    this.title = null;
    document.body.classList.remove('title-up');
    this.sync();
  }

  // ---- Pause menu ----

  openPause(): void {
    if (this.pause) return;
    this.deps.persist();
    const p = el(`<div id="pause-menu" role="dialog" aria-label="Paused">
      <div class="pause-card">
        <h2>Paused</h2>
        <button type="button" data-p="resume" class="primary">Resume</button>
        <button type="button" data-p="settings">Settings</button>
        <button type="button" data-p="log">Scanner log</button>
        <button type="button" data-p="move">Move a save</button>
        <button type="button" data-p="title">Title screen</button>
        <p class="pause-note">Saved just now. The game saves itself as you play.</p>
      </div>
    </div>`);
    p.addEventListener('pointerdown', (e) => e.stopPropagation());
    p.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button');
      if (!b && e.target === p) {
        this.closePause();
        return;
      }
      const act = b?.dataset.p;
      if (act === 'resume') this.closePause();
      else if (act === 'settings') {
        this.closePause();
        this.deps.openSettings();
      } else if (act === 'log') {
        this.closePause();
        this.deps.openLog();
      } else if (act === 'move') this.openCode();
      else if (act === 'title') {
        this.closePause();
        this.showTitle();
      }
    });
    document.body.appendChild(p);
    this.pause = p;
    this.sync();
  }

  closePause(): void {
    this.pause?.remove();
    this.pause = null;
    this.sync();
  }

  // ---- Move a save ----

  async openCode(): Promise<void> {
    if (this.code) return;
    this.deps.persist();
    const save = this.deps.getSave();
    const canShare = typeof navigator.share === 'function';
    const c = el(`<div id="save-code" role="dialog" aria-label="Move a save">
      <div class="code-card">
        <div class="head"><b>Move a save</b><button type="button" class="x" data-c="close" aria-label="Close">✕</button></div>
        <h3>From this device</h3>
        <p class="note">Copy this code, share it or save it as a file, then load it on your other device (phone, iPad or PC).</p>
        <textarea class="code-out" readonly rows="3" spellcheck="false">Making the code…</textarea>
        <p class="note small">${describeSave(save)}</p>
        <div class="row">
          <button type="button" data-c="copy">Copy code</button>
          ${canShare ? '<button type="button" data-c="share">Share…</button>' : ''}
          <button type="button" data-c="file">Save as file</button>
        </div>
        <h3>From another device</h3>
        <p class="note">Paste a code here, or open a save file. It replaces the progress on this device (this device's save is kept as a backup).</p>
        <textarea class="code-in" rows="3" spellcheck="false" placeholder="FATHOM1.…"></textarea>
        <div class="row">
          <button type="button" data-c="load">Load this code</button>
          <button type="button" data-c="open">Open a file…</button>
          ${hasBackup() ? '<button type="button" data-c="undo">Put the backup back</button>' : ''}
        </div>
        <p class="code-msg" aria-live="polite"></p>
        <input type="file" accept=".txt,.fathom,text/plain" hidden />
      </div>
    </div>`);
    const out = c.querySelector<HTMLTextAreaElement>('.code-out')!;
    const inp = c.querySelector<HTMLTextAreaElement>('.code-in')!;
    const msg = c.querySelector<HTMLParagraphElement>('.code-msg')!;
    const file = c.querySelector<HTMLInputElement>('input[type=file]')!;
    const say = (t: string, bad = false) => {
      msg.textContent = t;
      msg.classList.toggle('bad', bad);
    };
    let code = '';
    exportSaveCode(save)
      .then((k) => {
        code = k;
        out.value = k;
      })
      .catch(() => (out.value = 'Could not make a code on this device.'));
    let armed = 0;
    const tryLoad = async (text: string) => {
      try {
        const d = await readSaveCode(text);
        if (Date.now() - armed > 5000) {
          armed = Date.now();
          say(`${describeSave(d)}. Tap Load again to replace this device's progress with it.`);
          return;
        }
        if (!importSave(d)) return say('This device would not store the save (storage is blocked).', true);
        say('Loaded. Starting from the new save…');
        this.deps.onPause(true);
        setTimeout(() => location.reload(), 400);
      } catch (err) {
        armed = 0;
        say((err as Error).message, true);
      }
    };
    c.addEventListener('pointerdown', (e) => e.stopPropagation());
    c.addEventListener('keydown', (e) => e.stopPropagation());
    c.addEventListener('click', async (e) => {
      const b = (e.target as HTMLElement).closest('button');
      const act = b?.dataset.c;
      if (!act) return;
      if (act === 'close') this.closeCode();
      else if (act === 'copy') {
        if (!code) return;
        try {
          await navigator.clipboard.writeText(code);
          say('Copied. Paste it into Move a save on your other device.');
        } catch {
          out.select();
          say('Select the code above and copy it.');
        }
      } else if (act === 'share') {
        if (!code) return;
        try {
          const f = new File([code], 'fathomlight-save.txt', { type: 'text/plain' });
          if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: 'Fathomlight save' });
          else await navigator.share({ text: code, title: 'Fathomlight save' });
        } catch {
          /* cancelled */
        }
      } else if (act === 'file') {
        if (!code) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
        a.download = `fathomlight-save-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 1000);
        say('Saved as a file.');
      } else if (act === 'load') tryLoad(inp.value);
      else if (act === 'open') file.click();
      else if (act === 'undo') {
        if (restoreBackup()) {
          say('The backup is back. Restarting…');
          setTimeout(() => location.reload(), 400);
        }
      }
    });
    file.addEventListener('change', async () => {
      const f = file.files?.[0];
      if (!f) return;
      inp.value = (await f.text()).trim();
      armed = 0;
      tryLoad(inp.value);
    });
    document.body.appendChild(c);
    this.code = c;
    this.sync();
  }

  closeCode(): void {
    this.code?.remove();
    this.code = null;
    this.sync();
  }
}
