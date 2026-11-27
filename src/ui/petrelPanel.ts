import type { BaseLayout } from '../game/base';
import { missingKey, PART_SECONDS, PETREL_STAGES, petrelDone, petrelFraction, petrelStatus, speciesLabel } from '../game/petrel';
import { MATERIALS, type MaterialId, type SaveData } from '../game/state';

/**
 * Beyond Earth (Nov 27, 2026): the Petrel works' panel. Opened at the works'
 * console inside the base. It shows the five stages of the ship, what the
 * current one needs from the tanks and from storage, and what each stage
 * gives when it is fitted. The works runs by itself; nothing here costs a
 * thing, so the panel only reads.
 */

export interface PetrelPanelDeps {
  save(): SaveData;
  layout(): BaseLayout;
  code(): string;
}

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

export class PetrelPanel {
  open = false;
  private readonly el: HTMLDivElement;
  private timer = 0;

  constructor(private readonly deps: PetrelPanelDeps) {
    this.el = document.createElement('div');
    this.el.id = 'petrel-panel';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'Petrel works');
    this.el.hidden = true;
    document.body.appendChild(this.el);
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el || (e.target as HTMLElement).closest('[data-pw="close"]')) this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (!this.open || e.repeat) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });
  }

  show(): void {
    this.open = true;
    this.el.hidden = false;
    // The card is built once per opening (it animates in); the timer only refreshes what is inside it.
    this.el.innerHTML = '<div class="pw-card"></div>';
    this.render();
    // The works keeps running while the panel is open: refresh the numbers now and then.
    this.timer = window.setInterval(() => this.render(), 1000);
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.el.hidden = true;
    window.clearInterval(this.timer);
  }

  private render(): void {
    const save = this.deps.save();
    const layout = this.deps.layout();
    const st = petrelStatus(save, layout);
    const done = petrelDone(save);
    const pct = Math.round(petrelFraction(save) * 100);
    const rows = PETREL_STAGES.map((s, i) => {
      const state = i < done ? 'done' : i === done ? 'now' : 'later';
      const parts = i < done ? s.parts : i === done ? save.petrel?.parts ?? 0 : 0;
      const keys = s.keys
        .map((k) => {
          const need = k.count ?? 1;
          const ok = i < done || !missingKey(save, { ...s, keys: [k], choir: false });
          const words = `${need > 1 ? `${need} ` : ''}${speciesLabel(k.species)}${need > 1 ? 's' : ''}${k.patterns ? ` · ${k.patterns} patterns` : ''}`;
          return `<li class="${ok ? 'ok' : ''}">${ok ? '✓' : '○'} ${esc(words)}</li>`;
        })
        .concat(
          s.choir
            ? [`<li class="${i < done || save.creatures.some((c) => c.traits?.choir) ? 'ok' : ''}">${i < done || save.creatures.some((c) => c.traits?.choir) ? '✓' : '○'} a Choir-touched creature</li>`]
            : [],
        )
        .join('');
      const recipe = (Object.entries(s.recipe) as [MaterialId, number][])
        .map(([k, n]) => {
          const have = save.stored[k] ?? 0;
          const short = i === done && have < n;
          return `<span class="pw-mat${short ? ' short' : ''}">${n} ${esc((n > 1 ? MATERIALS[k].plural : MATERIALS[k].name).toLowerCase())}${i === done ? ` <em>(${have} stored)</em>` : ''}</span>`;
        })
        .join('');
      return `
        <li class="pw-stage ${state}">
          <div class="pw-stage-head">
            <span class="pw-n">${i + 1}</span>
            <strong>${esc(s.name)}</strong>
            <span class="pw-parts">${state === 'done' ? 'Fitted' : `${parts}/${s.parts} ${esc(s.part)}`}</span>
          </div>
          ${
            state === 'later'
              ? `<p class="pw-why">${esc(s.why)}</p>`
              : `
            <div class="pw-bar"><i style="width:${Math.round((parts / s.parts) * 100)}%"></i></div>
            <p class="pw-why">${esc(s.why)}</p>
            <div class="pw-cols">
              <div><span class="pw-label">Creatures it learns from</span><ul class="pw-keys">${keys}</ul></div>
              <div><span class="pw-label">Each part takes</span><div class="pw-recipe">${recipe}</div></div>
            </div>
            <p class="pw-reward"><span class="pw-label">When fitted</span> ${esc(s.reward)}</p>`
          }
        </li>`;
    }).join('');
    const stateLine =
      st.state === 'done'
        ? 'The Petrel is whole. She waits on the platform for her launch.'
        : st.state === 'running'
          ? `Working: ${esc(st.why)} About ${Math.ceil((1 - (save.petrel?.progress ?? 0)) * PART_SECONDS)} s to the next part.`
          : esc(st.why);
    const card = this.el.querySelector<HTMLDivElement>('.pw-card');
    if (!card) return;
    const scroll = card.querySelector('.pw-stages')?.scrollTop ?? 0;
    card.innerHTML = `
        <header class="pw-head">
          <div>
            <h2>Petrel works <span class="pw-code">${esc(this.deps.code())}</span></h2>
            <span class="pw-sub">Parts go up the hoist to the launch platform above the base.</span>
          </div>
          <div class="pw-ship"><span>${pct}%</span> of the ship</div>
          <button type="button" class="pw-close" data-pw="close" aria-label="Close">✕</button>
        </header>
        <div class="pw-status ${st.state}">${stateLine}</div>
        <ol class="pw-stages">${rows}</ol>`;
    const list = card.querySelector('.pw-stages');
    if (list) list.scrollTop = scroll;
  }
}
