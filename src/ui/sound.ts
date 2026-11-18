import { audio, AudioEngine, AudioSettings } from '../audio/engine';

/** Milestone 7b: the Sound part of the Settings panel, and M to mute on a keyboard. */
export function initSoundUI(): { refresh(): void } {
  const rows = Array.from(document.querySelectorAll<HTMLInputElement>('#sound-rows input[data-vol]'));
  const mute = document.getElementById('mute-btn') as HTMLButtonElement;
  const silent = document.getElementById('silent-btn') as HTMLButtonElement;
  const note = document.getElementById('sound-note')!;
  silent.hidden = !AudioEngine.hasSilentSwitchChoice;

  for (const r of rows) {
    const key = r.dataset.vol as keyof Pick<AudioSettings, 'master' | 'music' | 'ambience' | 'effects'>;
    r.addEventListener('input', () => {
      audio.setSettings({ [key]: Number(r.value) / 100 });
      refresh();
    });
    // Keep slider drags from reaching the swim controls underneath.
    r.addEventListener('pointerdown', (e) => e.stopPropagation());
  }
  mute.addEventListener('click', () => {
    audio.setSettings({ muted: !audio.settings.muted });
    refresh();
  });
  const speaker = document.getElementById('speaker-btn') as HTMLButtonElement;
  speaker.addEventListener('click', () => {
    audio.setSettings({ speaker: audio.settings.speaker === 'phone' ? 'full' : 'phone' });
    refresh();
  });
  silent.addEventListener('click', () => {
    audio.setSettings({ ignoreSilent: !audio.settings.ignoreSilent });
    refresh();
  });
  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.key.toLowerCase() !== 'm' || (e.target as HTMLElement)?.tagName === 'INPUT') return;
    audio.setSettings({ muted: !audio.settings.muted });
    refresh();
  });

  function refresh(): void {
    const s = audio.settings;
    for (const r of rows) {
      const v = Math.round(s[r.dataset.vol as 'master'] * 100);
      r.value = String(v);
      (r.nextElementSibling as HTMLOutputElement).textContent = String(v);
    }
    mute.setAttribute('aria-pressed', String(s.muted));
    speaker.setAttribute('aria-pressed', String(s.speaker === 'phone'));
    speaker.textContent = s.speaker === 'phone' ? 'Mix: phone speaker (tap for headphones)' : 'Mix: headphones and speakers (tap for phone)';
    mute.textContent = s.muted ? 'Sound muted (tap to unmute)' : 'Mute';
    silent.setAttribute('aria-pressed', String(s.ignoreSilent));
    silent.textContent = s.ignoreSilent ? 'Plays with the silent switch on' : 'Silent switch mutes the game';
    note.textContent = !audio.ctx
      ? 'Sound starts with your first tap or key press.'
      : audio.running
        ? s.ignoreSilent || !AudioEngine.hasSilentSwitchChoice
          ? ''
          : 'No sound? The ring/silent switch mutes the game: switch it off, or tap the button above.'
        : `Sound is paused (${audio.ctx.state}): tap anywhere to resume.`;
  }
  refresh();
  return { refresh };
}
