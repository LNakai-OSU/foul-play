/**
 * Pure, immutable operations on a Case. Every function returns a NEW case and
 * keeps references tidy (deleting a character also removes their motives,
 * relationships and clue implications, and so on). The checker still catches
 * dangling references that arrive through imports or hand-edited JSON.
 */
import type { Beat, Case, Character, Evidence, Motive, RedHerring } from './models';

let counter = 0;
export function newId(prefix: string): string {
  counter = (counter + 1) % 46656;
  const rand = Math.floor(Math.random() * 46656 ** 2)
    .toString(36)
    .padStart(8, '0');
  return `${prefix}_${rand}${counter.toString(36)}`;
}

export function moveItem<T>(arr: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= arr.length) return [...arr];
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, item as T);
  return next;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function blankCase(title = 'Untitled mystery'): Case {
  const now = nowIso();
  return {
    id: newId('case'),
    schemaVersion: 1,
    title,
    setting: { name: '', era: '', description: '' },
    tone: 'noir',
    playerMin: 6,
    playerMax: 8,
    victim: { name: '', description: '', causeOfDeath: '', timeOfDeath: '', placeOfDeath: '' },
    characters: [],
    motives: [],
    evidence: [],
    redHerrings: [],
    beats: [],
    extras: { props: [], generalCostumes: [], miniGames: [], difficulty: 3, runtimeMinutes: 90 },
    seed: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function blankCharacter(): Character {
  return {
    id: newId('char'),
    name: '',
    secretRole: '',
    publicBio: '',
    privateBackstory: '',
    relationships: [],
    alibi: '',
    alibiPlace: '',
    alibiWithIds: [],
    secrets: [],
    isKiller: false,
    costume: '',
    accent: '',
  };
}

export function blankMotive(characterId: string): Motive {
  return {
    id: newId('mot'),
    characterId,
    strength: 'weak',
    category: 'money',
    description: '',
    evidenceIds: [],
  };
}

export function blankEvidence(): Evidence {
  return {
    id: newId('ev'),
    title: '',
    description: '',
    kind: 'physical',
    veracity: 'true',
    implicatedIds: [],
  };
}

export function blankBeat(round = 1): Beat {
  return {
    id: newId('beat'),
    title: '',
    description: '',
    timeLabel: '',
    round,
    trigger: 'manual',
    timerSeconds: 0,
    actionPrompt: '',
    evidenceIds: [],
    gmNotes: '',
  };
}

export function blankRedHerring(evidenceId: string): RedHerring {
  return {
    id: newId('rh'),
    evidenceId,
    whyPlausible: '',
    debunkBeatId: null,
    debunkEvidenceId: null,
    debunkNote: '',
  };
}

// ---------------------------------------------------------------- characters

export function removeCharacter(c: Case, charId: string): Case {
  const removedMotiveIds = new Set(c.motives.filter((m) => m.characterId === charId).map((m) => m.id));
  return {
    ...c,
    characters: c.characters
      .filter((ch) => ch.id !== charId)
      .map((ch) => ({
        ...ch,
        relationships: ch.relationships.filter((r) => r.targetId !== charId),
        alibiWithIds: ch.alibiWithIds.filter((i) => i !== charId),
      })),
    motives: c.motives.filter((m) => !removedMotiveIds.has(m.id)),
    evidence: c.evidence.map((e) =>
      e.implicatedIds.includes(charId) ? { ...e, implicatedIds: e.implicatedIds.filter((i) => i !== charId) } : e,
    ),
  };
}

export function duplicateCharacter(c: Case, charId: string): Case {
  const idx = c.characters.findIndex((ch) => ch.id === charId);
  if (idx < 0) return c;
  const src = c.characters[idx] as Character;
  const copy: Character = {
    ...src,
    id: newId('char'),
    name: src.name ? `${src.name} (copy)` : '',
    isKiller: false,
    alibiWithIds: [],
    relationships: src.relationships.map((r) => ({ ...r, id: newId('rel') })),
    secrets: [...src.secrets],
  };
  const characters = [...c.characters];
  characters.splice(idx + 1, 0, copy);
  return { ...c, characters };
}

// ------------------------------------------------------------------- motives

export function removeMotive(c: Case, motiveId: string): Case {
  return { ...c, motives: c.motives.filter((m) => m.id !== motiveId) };
}

// ------------------------------------------------------------------ evidence

export function removeEvidence(c: Case, evId: string): Case {
  const herringIds = new Set(c.redHerrings.filter((r) => r.evidenceId === evId).map((r) => r.id));
  return {
    ...c,
    evidence: c.evidence.filter((e) => e.id !== evId),
    motives: c.motives.map((m) =>
      m.evidenceIds.includes(evId) ? { ...m, evidenceIds: m.evidenceIds.filter((i) => i !== evId) } : m,
    ),
    beats: c.beats.map((b) =>
      b.evidenceIds.includes(evId) ? { ...b, evidenceIds: b.evidenceIds.filter((i) => i !== evId) } : b,
    ),
    redHerrings: c.redHerrings
      .filter((r) => !herringIds.has(r.id))
      .map((r) => (r.debunkEvidenceId === evId ? { ...r, debunkEvidenceId: null } : r)),
  };
}

/** Beat that currently reveals this evidence (first match), or null. */
export function beatOfEvidence(c: Case, evId: string): Beat | null {
  return c.beats.find((b) => b.evidenceIds.includes(evId)) ?? null;
}

/** Move evidence into a beat (or unschedule with null). An evidence item lives in at most one beat. */
export function scheduleEvidence(c: Case, evId: string, beatId: string | null): Case {
  return {
    ...c,
    beats: c.beats.map((b) => {
      const without = b.evidenceIds.filter((i) => i !== evId);
      if (b.id === beatId) return { ...b, evidenceIds: [...without, evId] };
      return without.length === b.evidenceIds.length ? b : { ...b, evidenceIds: without };
    }),
  };
}

/** Replace a beat's evidence list, stealing the items from any other beat. */
export function setBeatEvidence(c: Case, beatId: string, evidenceIds: string[]): Case {
  const claimed = new Set(evidenceIds);
  return {
    ...c,
    beats: c.beats.map((b) => {
      if (b.id === beatId) return { ...b, evidenceIds: [...evidenceIds] };
      const kept = b.evidenceIds.filter((i) => !claimed.has(i));
      return kept.length === b.evidenceIds.length ? b : { ...b, evidenceIds: kept };
    }),
  };
}

/**
 * Change an evidence item's veracity, keeping the red-herring record in sync:
 * marking evidence as a red herring creates a record; marking it true removes it.
 */
export function setEvidenceVeracity(c: Case, evId: string, veracity: Evidence['veracity']): Case {
  const evidence = c.evidence.map((e) => (e.id === evId ? { ...e, veracity } : e));
  const has = c.redHerrings.some((r) => r.evidenceId === evId);
  let redHerrings = c.redHerrings;
  if (veracity === 'red-herring' && !has) redHerrings = [...redHerrings, blankRedHerring(evId)];
  if (veracity === 'true' && has) redHerrings = redHerrings.filter((r) => r.evidenceId !== evId);
  return { ...c, evidence, redHerrings };
}

/** Create a brand-new red herring: an evidence item plus its record. */
export function addRedHerring(c: Case): { case: Case; evidenceId: string; herringId: string } {
  const ev: Evidence = { ...blankEvidence(), veracity: 'red-herring' };
  const rh = blankRedHerring(ev.id);
  return {
    case: { ...c, evidence: [...c.evidence, ev], redHerrings: [...c.redHerrings, rh] },
    evidenceId: ev.id,
    herringId: rh.id,
  };
}

export function removeRedHerring(c: Case, herringId: string, alsoEvidence: boolean): Case {
  const rh = c.redHerrings.find((r) => r.id === herringId);
  if (!rh) return c;
  if (alsoEvidence) return removeEvidence(c, rh.evidenceId);
  return {
    ...c,
    redHerrings: c.redHerrings.filter((r) => r.id !== herringId),
    evidence: c.evidence.map((e) => (e.id === rh.evidenceId ? { ...e, veracity: 'true' as const } : e)),
  };
}

// --------------------------------------------------------------------- beats

export function removeBeat(c: Case, beatId: string): Case {
  return {
    ...c,
    beats: c.beats.filter((b) => b.id !== beatId),
    redHerrings: c.redHerrings.map((r) => (r.debunkBeatId === beatId ? { ...r, debunkBeatId: null } : r)),
  };
}

// ------------------------------------------------------------------- helpers

export function characterName(c: Case, charId: string): string {
  const ch = c.characters.find((x) => x.id === charId);
  return ch ? ch.name.trim() || 'Unnamed character' : 'Unknown character';
}

export function evidenceLabel(e: Evidence | undefined): string {
  if (!e) return 'Missing clue';
  return e.title.trim() || e.description.trim().slice(0, 40) || 'Untitled clue';
}

export function beatLabel(b: Beat | undefined): string {
  if (!b) return 'Missing beat';
  return b.title.trim() || 'Untitled beat';
}

/** Total seconds of timer beats + a rough allowance for the rest, in minutes. */
export function estimateRuntimeMinutes(c: Case): number {
  const minutes = c.beats.reduce((sum, b) => {
    if (b.trigger === 'timer' && b.timerSeconds > 0) return sum + b.timerSeconds / 60;
    return sum + (b.trigger === 'player-action' ? 6 : 3);
  }, 0);
  return Math.max(15, Math.round(minutes / 5) * 5);
}

export function plural(n: number, singular: string, pluralForm?: string): string {
  return `${n} ${n === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

/** Normalise a place name for comparison ("The Library" == "library"). */
export function normPlace(p: string): string {
  return p
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .trim()
    .replace(/^(the|a|an) /, '')
    .replace(/\s+/g, ' ');
}

/**
 * Set a character's alibi companions and keep the links mutual: anyone added
 * also lists this character, and anyone removed stops listing them. Companions
 * inherit the alibi place if they have none.
 */
export function setAlibiCompanions(c: Case, charId: string, ids: string[]): Case {
  const me = c.characters.find((x) => x.id === charId);
  if (!me) return c;
  const wanted = new Set(ids.filter((i) => i !== charId));
  return {
    ...c,
    characters: c.characters.map((ch) => {
      if (ch.id === charId) return { ...ch, alibiWithIds: [...wanted] };
      const has = ch.alibiWithIds.includes(charId);
      const want = wanted.has(ch.id);
      if (want && !has) return { ...ch, alibiWithIds: [...ch.alibiWithIds, charId], alibiPlace: ch.alibiPlace || me.alibiPlace };
      if (!want && has && me.alibiWithIds.includes(ch.id)) return { ...ch, alibiWithIds: ch.alibiWithIds.filter((i) => i !== charId) };
      return ch;
    }),
  };
}
