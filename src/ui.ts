import { FxToggles, Preset, PresetChoice, detectPreset } from './presets';

interface SettingsDeps {
  getChoice(): PresetChoice;
  getPreset(): Preset;
  getPixelSize(): [number, number];
  getRendererName(): string;
  setChoice(c: PresetChoice): void;
  /** When the game was last saved (ms since 1970), 0 if never. */
  getSavedAt(): number;
  /** Wipe the save and start over. */
  resetProgress(): void;
  buildId: string;
  /** Graphics session G1: the effect toggles, and a note on what the device could not do. */
  getFx(): FxToggles;
  setFx(key: keyof FxToggles, on: boolean): void;
  fxNote(): string;
}

/** The gear button in the corner and its small Graphics panel. */
export function initSettingsUI(deps: SettingsDeps) {
  const btn = document.getElementById('settings-btn') as HTMLButtonElement;
  const panel = document.getElementById('settings-panel') as HTMLDivElement;
  const presetButtons = Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-preset]'));
  const statPreset = document.getElementById('stat-preset')!;
  const statFps = document.getElementById('stat-fps')!;
  const statRes = document.getElementById('stat-res')!;
  const statRenderer = document.getElementById('stat-renderer')!;
  const statBuild = document.getElementById('stat-build')!;
  statBuild.textContent = deps.buildId;
  const statSaved = document.getElementById('stat-saved')!;
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
  let resetArmed = 0;
  resetBtn.addEventListener('click', () => {
    // Two taps, so progress is never wiped by accident.
    if (Date.now() - resetArmed < 4000) {
      deps.resetProgress();
      return;
    }
    resetArmed = Date.now();
    resetBtn.textContent = 'Tap again to erase everything';
    resetBtn.classList.add('armed');
    setTimeout(() => {
      resetBtn.textContent = 'Start over';
      resetBtn.classList.remove('armed');
    }, 4000);
  });

  btn.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    btn.setAttribute('aria-expanded', String(!panel.hidden));
    refresh();
  });

  for (const b of presetButtons) {
    b.addEventListener('click', () => deps.setChoice(b.dataset.preset as PresetChoice));
  }
  const fxButtons = Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-fx]'));
  const fxNote = document.getElementById('fx-note')!;
  for (const b of fxButtons) {
    b.addEventListener('click', () => {
      const key = b.dataset.fx as keyof FxToggles;
      deps.setFx(key, !deps.getFx()[key]);
      refresh();
    });
  }

  function refresh(): void {
    const choice = deps.getChoice();
    for (const b of presetButtons) b.setAttribute('aria-checked', String(b.dataset.preset === choice));
    const autoLabel = detectPreset() === 'high' ? 'High' : 'Ultra';
    const autoBtn = presetButtons.find((b) => b.dataset.preset === 'auto');
    if (autoBtn) autoBtn.textContent = `Auto (${autoLabel})`;
    const p = deps.getPreset();
    statPreset.textContent = `${p.label}, up to ${p.maxFps} fps`;
    const [w, h] = deps.getPixelSize();
    statRes.textContent = `${w} × ${h}`;
    statRenderer.textContent = deps.getRendererName();
    const fx = deps.getFx();
    for (const b of fxButtons) b.setAttribute('aria-pressed', String(fx[b.dataset.fx as keyof FxToggles]));
    fxNote.textContent = deps.fxNote();
  }

  // Frame-rate meter, averaged over half a second so the number is readable.
  let frames = 0;
  let elapsed = 0;
  function tick(deltaMS: number): void {
    frames++;
    elapsed += deltaMS;
    if (elapsed >= 500) {
      if (!panel.hidden) {
        statFps.textContent = `${Math.round((frames * 1000) / elapsed)} fps`;
        const at = deps.getSavedAt();
        const ago = Math.round((Date.now() - at) / 1000);
        statSaved.textContent = at ? (ago < 2 ? 'just now' : ago < 120 ? `${ago} s ago` : `${Math.round(ago / 60)} min ago`) : 'not yet';
      }
      frames = 0;
      elapsed = 0;
    }
  }

  return { refresh, tick };
}
