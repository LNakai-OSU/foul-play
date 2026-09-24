/**
 * Export data shaping. PURE functions that turn a Case into the exact,
 * spoiler-safe data that gets printed / turned into PDFs.
 *
 * The player packet is built by WHITELISTING fields, never by deleting
 * sensitive ones, so a newly added model field cannot leak by accident.
 *   - A character sheet contains only that character's own information. The
 *     shared table card lists every guest's name + public bio (public anyway).
 *   - Every sheet has an identical shape/section list, so the killer's sheet is
 *     structurally indistinguishable from an innocent's.
 *   - Clue handouts carry the clue text and a neutral kind label only: no
 *     titles, veracity, red-herring flags, implicated characters or solution.
 */
import type { Case } from './models';
import { deriveSolution, type SolutionKey } from './solution';
import { beatLabel, characterName, evidenceLabel } from './ops';

export interface SheetRelationship {
  with: string;
  label: string;
}

export interface CharacterSheet {
  characterId: string;
  name: string;
  secretRole: string;
  publicBio: string;
  privateBackstory: string;
  /** This character's own motives (descriptions only). */
  motives: string[];
  /** This character's own relationships (public and private ones). */
  relationships: SheetRelationship[];
  alibi: string;
  secrets: string[];
  costume: string;
  accent: string;
}

export interface ClueCard {
  number: number;
  kindLabel: string;
  text: string;
}

export interface PlayerPacket {
  title: string;
  setting: { name: string; era: string; description: string };
  victim: { name: string; description: string; causeOfDeath: string; timeOfDeath: string; placeOfDeath: string };
  playerRange: string;
  houseRules: string[];
  dressCode: string[];
  /** Everybody at the party: name + public bio ONLY. Printed once on the shared table card. */
  guestList: { name: string; publicBio: string }[];
  sheets: CharacterSheet[];
  handouts: ClueCard[];
}

/** Rules printed on every sheet, identical for everyone. */
export const HOUSE_RULES: readonly string[] = [
  'Stay in character from the moment the game begins.',
  'Share your public bio freely. Guard your secrets: reveal them only when it helps you or when a clue forces your hand.',
  'You may keep secrets and dodge questions, but do not invent clues or tamper with evidence cards.',
  'When the Game Master calls the final round, write down who you think did it, how, and why.',
];

export function buildPlayerPacket(c: Case): PlayerPacket {
  const sheets: CharacterSheet[] = c.characters.map((ch) => ({
    characterId: ch.id,
    name: ch.name,
    secretRole: ch.secretRole,
    publicBio: ch.publicBio,
    privateBackstory: ch.privateBackstory,
    motives: c.motives.filter((m) => m.characterId === ch.id && m.description.trim()).map((m) => m.description),
    relationships: ch.relationships
      .filter((r) => r.targetId !== ch.id && c.characters.some((x) => x.id === r.targetId))
      .map((r) => ({ with: characterName(c, r.targetId), label: r.label })),
    alibi: ch.alibi,
    secrets: [...ch.secrets],
    costume: ch.costume,
    accent: ch.accent,
  }));

  // Cards are numbered in the order they enter play (scheduled first, then any leftovers).
  const scheduled: string[] = [];
  for (const b of c.beats) for (const id of b.evidenceIds) if (!scheduled.includes(id)) scheduled.push(id);
  const orderedIds = [...scheduled, ...c.evidence.map((e) => e.id).filter((id) => !scheduled.includes(id))];
  const evById = new Map(c.evidence.map((e) => [e.id, e]));
  const handouts: ClueCard[] = [];
  for (const id of orderedIds) {
    const e = evById.get(id);
    if (!e || !e.description.trim()) continue;
    handouts.push({
      number: handouts.length + 1,
      kindLabel: e.kind === 'verbal' ? 'Statement' : 'Physical evidence',
      text: e.description,
    });
  }

  return {
    title: c.title,
    setting: { ...c.setting },
    victim: { ...c.victim },
    playerRange: c.playerMin === c.playerMax ? `${c.playerMin} players` : `${c.playerMin}–${c.playerMax} players`,
    houseRules: [...HOUSE_RULES],
    dressCode: c.extras.generalCostumes.filter((s) => s.trim()),
    guestList: c.characters.map((o) => ({ name: o.name, publicBio: o.publicBio })),
    sheets,
    handouts,
  };
}

// --------------------------------------------------- sheet layout (shared by HTML + PDF)

export interface SheetSection {
  heading: string;
  /** Either a paragraph or a list of lines. */
  text?: string;
  items?: string[];
}

/**
 * The ordered sections of a character sheet. Both the on-screen/print HTML and
 * the PDF render from this, so every sheet has EXACTLY the same sections in the
 * same order regardless of who the character is: nothing is added or omitted
 * for the killer. Empty content shows a neutral placeholder.
 */
export function sheetSections(s: CharacterSheet): SheetSection[] {
  const or = (v: string, fallback: string) => (v.trim() ? v : fallback);
  return [
    { heading: 'Who you are (public)', text: or(s.publicBio, 'Nothing has been written yet.') },
    { heading: 'Your secret role', text: or(s.secretRole, 'None.') },
    { heading: 'Your private backstory', text: or(s.privateBackstory, 'Nothing has been written yet.') },
    { heading: 'What people might suspect about you', items: s.motives.length ? s.motives : ['Nothing that anyone knows of, yet.'] },
    {
      heading: 'Your relationships',
      items: s.relationships.length ? s.relationships.map((r) => `${capitalizeFirst(r.label.trim() || 'Connected to')} ${r.with}`) : ['None to speak of.'],
    },
    { heading: 'Your alibi', text: or(s.alibi, 'You have none. Improvise.') },
    { heading: 'Your secrets', items: s.secrets.filter((x) => x.trim()).length ? s.secrets.filter((x) => x.trim()) : ['None.'] },
    {
      heading: 'Costume and voice',
      items: [`Costume: ${or(s.costume, 'your choice')}`, `Accent or manner: ${or(s.accent, 'your choice')}`],
    },
  ];
}

function capitalizeFirst(t: string): string {
  return t ? t[0]!.toUpperCase() + t.slice(1) : t;
}

// ---------------------------------------------------------------- GM packet

export interface GmPacket {
  title: string;
  setting: PlayerPacket['setting'];
  victim: PlayerPacket['victim'];
  runtimeMinutes: number;
  difficulty: number;
  props: string[];
  miniGames: { title: string; description: string }[];
  timeline: {
    number: number;
    title: string;
    timeLabel: string;
    round: number;
    trigger: string;
    timerSeconds: number;
    actionPrompt: string;
    description: string;
    gmNotes: string;
    clues: { title: string; text: string }[];
  }[];
  cast: { name: string; secretRole: string; alibi: string; secrets: string[]; isKiller: boolean }[];
  solution: SolutionKey;
}

export function buildGmPacket(c: Case): GmPacket {
  const evById = new Map(c.evidence.map((e) => [e.id, e]));
  return {
    title: c.title,
    setting: { ...c.setting },
    victim: { ...c.victim },
    runtimeMinutes: c.extras.runtimeMinutes,
    difficulty: c.extras.difficulty,
    props: [...c.extras.props],
    miniGames: c.extras.miniGames.map((g) => ({ title: g.title, description: g.description })),
    timeline: c.beats.map((b, i) => ({
      number: i + 1,
      title: beatLabel(b),
      timeLabel: b.timeLabel,
      round: b.round,
      trigger: b.trigger,
      timerSeconds: b.timerSeconds,
      actionPrompt: b.actionPrompt,
      description: b.description,
      gmNotes: b.gmNotes,
      clues: b.evidenceIds
        .map((id) => evById.get(id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
        .map((e) => ({ title: evidenceLabel(e), text: e.description })),
    })),
    cast: c.characters.map((ch) => ({
      name: characterName(c, ch.id),
      secretRole: ch.secretRole,
      alibi: ch.alibi,
      secrets: [...ch.secrets],
      isKiller: ch.isKiller,
    })),
    solution: deriveSolution(c),
  };
}
