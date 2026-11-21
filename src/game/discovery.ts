import { LODES } from './lodes';
import type { SaveData } from './state';
import { SPECIES } from './creatures';
import { jobRunning, RESEARCH, RESEARCH_ORDER, researchBlocker } from './gear';
import { bredWords, nextFragment, vocabulary } from './signals';

const sites = {
  crab: {
    name: 'The salvage strongbox',
    scan: 'crablock',
    observation: 'Paired scratches curl around a tiny, rusted keyhole.',
    evidence: 'The scratches look like the marks tinker crabs leave when they tease metal out of the kelp holdfasts.',
    resolved: 'Opened. The Revival pool drawings were inside.',
    mature: 'Its fine claws can now work a seized lock. Take it in the jar to the salvage strongbox on the wreck shelf.',
  },
  snail: {
    name: 'The sealed trench cleft',
    scan: 'chimney',
    observation: 'A young chimney seals the cleft. Pale grazing tracks cut through its crust.',
    evidence: 'The tracks match the feeding trails of the cinder snails around the vents.',
    resolved: 'Open. A Fulmar cargo pod inside held deep-suit drawings and a recorded signal.',
    mature: 'It can now graze through a chimney. Take it in the jar to the sealed cleft on the vent field.',
  },
} as const;

export type CreatureSite = keyof typeof sites;

export function creatureSiteOpen(save: SaveData, species: CreatureSite): boolean {
  return species === 'crab' ? save.lockerOpen : save.cleftOpen;
}

export function creatureSiteHint(save: SaveData, species: CreatureSite): string {
  const site = sites[species];
  const animal = SPECIES[species].name.toLowerCase();
  const plant = species === 'crab' ? 'bladder kelp' : 'lumen moss';
  const slots = [save.jar, save.jar2];
  if (slots.some(c => c?.species === species && c.stage === 'young'))
    return `This ${animal} is too young. House it in a tank with ${plant}, food and clean water until it grows.`;
  if (save.creatures.some(c => c.species === species && c.stage === 'grown'))
    return `Your grown ${animal} can help here. Take it into a jar from its tank and bring it back.`;
  if (save.tips.includes(`site:${species}:return`) ||
      (save.scans.includes(site.scan) && save.scans.includes(species)))
    return `Raise a ${animal} with ${plant} in a tank. Once grown, bring it here in the specimen jar.`;
  if (save.scans.includes(site.scan)) return site.evidence;
  return site.observation + ' Scan it for a closer look.';
}

export function creatureMilestone(save: SaveData, species: keyof typeof SPECIES): string {
  if (species === 'glowfin') return 'Its lantern can guide you through water where lamps fail. Carry it in the jar.';
  if (species === 'crab' || species === 'snail') {
    if (creatureSiteOpen(save, species)) return '';
    if (save.scans.includes(sites[species].scan) || save.tips.includes(`site:${species}:seen`)) return sites[species].mature;
    return species === 'crab' ? 'Watch how it probes the smallest seams with its claws.' : 'It now grazes through mineral crust and leaves vent ore behind.';
  }
  return '';
}

export function discoveryNotes(save: SaveData): string[] {
  const notes: string[] = [];
  for (const species of ['crab', 'snail'] as const) {
    const site = sites[species];
    if (creatureSiteOpen(save, species)) notes.push(`${site.name} · ${site.resolved}`);
    else if (save.tips.includes(`site:${species}:seen`) || save.scans.includes(site.scan))
      notes.push(`${site.name} · ${creatureSiteHint(save, species)}`);
  }
  if (save.vane) notes.push('Wreck Shelf · Flow vane raised. KS-1 can cross above the deep race. The lower anchors still mark a route for a diver.');
  else if (save.scans.includes('race')) notes.push('Wreck Shelf · Follow the anchor rings with a grapple to reach the flow-vane winch on the far side.');
  if (save.gear.includes('boots')) notes.push('Mag-boots · Press Boots (N, the d-pad\'s up, or the Boots button) to clamp them on: you drop to the seabed and walk it, and currents and vent lift can\'t move you. Jump hops. Walk off an edge and you sink slowly. Press Boots again to swim.');
  // Phase 13: the drill nose, from its first clue to its lasting job.
  const drillFitted = !!save.sub?.modules.includes('drill');
  const lodesSeen = save.scans.includes('lode');
  const cores = (save.lodeNotes ?? []).length;
  if (drillFitted) {
    const seam = save.seamOpen ? '' : ' The soft seam under the trench rim is still sealed.';
    notes.push(`Drill nose · Bow over a mineral lode and hold Collect: copper and quartz in the kelp forest and on the wreck shelf, vent ore in the trench. Lodes seal over after about ten minutes.${seam}${cores ? ` Core samples logged: ${cores} of ${LODES.length}.` : ''}`);
  } else if (save.scans.includes('seam') || lodesSeen) {
    const bp = save.blueprints.includes('drill') || save.scans.includes('probe');
    notes.push(`${lodesSeen ? 'Mineral lodes' : 'Soft seam'} · Too hard for hands or the cutter. ${bp ? 'The crushed probe\'s drawings point to a drill nose for KS-1 (Lab, then the Dock).' : 'A powered drill on the sub might bore it. The trench may hold the design.'}`);
  }
  const fragment = nextFragment(save);
  if (fragment) {
    const bred = fragment.bred ? ` · ${bredWords(save)}/${fragment.bred} distinct patterns bred at Kestrel` : '';
    notes.push(`Signal spool from ${fragment.where} · ${vocabulary(save)}/${fragment.need} distinct grown glow patterns${bred}. Read it at a powered Signal array.`);
  }
  return notes;
}

/** Research material the player physically recovered, ready to put on the bench. */
export function fieldResearch(save: SaveData) {
  return RESEARCH_ORDER.map(id => RESEARCH[id])
    .filter(r => r.finds.length && !researchBlocker(save, r) && !jobRunning(save, `research:${r.id}`));
}
