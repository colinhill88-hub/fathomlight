import { GEAR } from '../game/gear';
import { MODULES } from '../game/sub';
import type { GearId, SubModule } from '../game/state';
import type { RewardIcon, RewardSpec } from './reward';

/*
 * Phase 14: what each reward moment shows. Kept apart from main.ts so the
 * wording and icons sit in one place. Lines are short on purpose: the full
 * explanation still arrives as the usual notice once the card has closed.
 */

const GEAR_CARD: Partial<Record<GearId, { icon: RewardIcon; ribbon?: string; line: string }>> = {
  light: { icon: 'light', line: 'The dark cave in the east cliff is open to you.' },
  cutter: { icon: 'cutter', line: 'Burns through kelp walls and welded hatches.' },
  tow: { icon: 'gear', line: 'Reel across currents. Swing across gaps.' },
  welder: { icon: 'drone', ribbon: 'Drone upgrade', line: 'KD-1 welds about twice as fast.' },
  relay: { icon: 'tank', line: 'Plant air wherever you dive.' },
  sonar: { icon: 'sonar', line: 'Reveals hidden hollows and sends lurkers home.' },
  psuit: { icon: 'suit', ribbon: 'Suit upgrade', line: 'Safe to 60 m. The trench’s upper ledges are in reach.' },
  psuit2: { icon: 'suit', ribbon: 'Suit upgrade', line: 'Safe to 110 m. The trench floor and the drowned station.' },
  resonator: { icon: 'fragment', ribbon: 'Choir relic', line: 'It sings the Choir’s song. The doors below will answer.' },
  satchel: { icon: 'jar', line: 'Carry two young creatures at once.' },
  flare: { icon: 'light', line: 'Fire a flare to light dark water ahead.' },
  visor: { icon: 'suit', ribbon: 'Suit upgrade', line: 'Materials and young creatures show through rock.' },
  dash: { icon: 'thruster', ribbon: 'New ability', line: 'Double-tap Boost to dash.' },
  boots: { icon: 'boots', ribbon: 'New ability', line: 'Brace on the seabed against any current.' },
  dart: { icon: 'gear', line: 'Stun a predator and turn it away.' },
  cowl: { icon: 'suit', ribbon: 'Suit upgrade', line: 'Vent heat scalds a fifth as much.' },
};

const firstSentence = (s: string) => (s.match(/^[^.!?]*[.!?]/)?.[0] ?? s).trim();

export function gearReward(id: GearId): RewardSpec {
  const g = GEAR[id];
  const c = GEAR_CARD[id];
  return {
    tier: 'major',
    icon: c?.icon ?? 'gear',
    ribbon: c?.ribbon ?? 'New gear',
    title: g.name,
    code: g.code,
    line: c?.line ?? firstSentence(g.job),
    flavour: id === 'resonator' ? 'choir' : 'kestrel',
  };
}

export function moduleReward(m: SubModule): RewardSpec {
  const d = MODULES[m];
  return { tier: 'major', icon: 'module', ribbon: 'KS-1 upgrade', title: d.name, code: d.code, line: firstSentence(d.job) };
}

export function researchReward(name: string, line: string): RewardSpec {
  return { tier: 'notable', icon: 'blueprint', ribbon: 'Blueprint decoded', title: name.replace(/ blueprint$/i, ''), line };
}

export const tankReward = (bonus: number): RewardSpec => ({
  tier: 'major',
  icon: 'tank',
  ribbon: 'Air tank upgrade',
  title: 'Extra air',
  line: `Dive time +${bonus} s.`,
});

export function kitReward(what: string): RewardSpec {
  switch (what) {
    case 'jar':
      return { tier: 'major', icon: 'jar', ribbon: 'New gear', title: 'Specimen jar', line: 'Ease eggs and young creatures in, and raise them at the base.', flavour: 'life' };
    case 'carrier':
      return { tier: 'major', icon: 'drone', ribbon: 'Drone upgrade', title: 'Cargo cradle', line: 'KD-1 can fly your dive bag home.' };
    case 'thruster':
      return { tier: 'major', icon: 'thruster', ribbon: 'New ability', title: 'Hip thruster', code: 'TH-1', line: 'Boost fires a short burst through the water.' };
    default:
      return { tier: 'major', icon: 'thruster', ribbon: 'Thruster upgrade', title: 'Twin-nozzle head', code: 'TH-2', line: 'A faster boost that carries further.' };
  }
}

/** A notable find or a way opened. */
export const notable = (icon: RewardIcon, ribbon: string, title: string, line = '', flavour: RewardSpec['flavour'] = 'kestrel'): RewardSpec => ({
  tier: 'notable',
  icon,
  ribbon,
  title,
  line,
  flavour,
});

/** A major payoff that isn't gear: a solved puzzle, a companion, a vessel. */
export const major = (icon: RewardIcon, ribbon: string, title: string, line = '', flavour: RewardSpec['flavour'] = 'kestrel', code?: string): RewardSpec => ({
  tier: 'major',
  icon,
  ribbon,
  title,
  line,
  flavour,
  code,
});
