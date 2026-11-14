import { Preset, PresetChoice, detectPreset } from './presets';

interface SettingsDeps {
  getChoice(): PresetChoice;
  getPreset(): Preset;
  getPixelSize(): [number, number];
  getRendererName(): string;
  setChoice(c: PresetChoice): void;
  buildId: string;
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

  btn.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    btn.setAttribute('aria-expanded', String(!panel.hidden));
    refresh();
  });

  for (const b of presetButtons) {
    b.addEventListener('click', () => deps.setChoice(b.dataset.preset as PresetChoice));
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
  }

  // Frame-rate meter, averaged over half a second so the number is readable.
  let frames = 0;
  let elapsed = 0;
  function tick(deltaMS: number): void {
    frames++;
    elapsed += deltaMS;
    if (elapsed >= 500) {
      if (!panel.hidden) statFps.textContent = `${Math.round((frames * 1000) / elapsed)} fps`;
      frames = 0;
      elapsed = 0;
    }
  }

  return { refresh, tick };
}
