/** Derives the hidden "solution key" (GM eyes only) from a case. Pure. */
import type { Case } from './models';
import { beatLabel, characterName, evidenceLabel } from './ops';

export interface SolutionKey {
  killerId: string | null;
  killerName: string | null;
  method: string;
  motives: { category: string; strength: string; description: string; supportingClues: string[] }[];
  keyEvidence: { id: string; title: string; description: string; revealedIn: string | null }[];
  herrings: {
    id: string;
    title: string;
    misleads: string[];
    whyPlausible: string;
    revealedIn: string | null;
    debunkedIn: string | null;
    debunkedBy: string | null;
    note: string;
  }[];
}

export function deriveSolution(c: Case): SolutionKey {
  const killers = c.characters.filter((x) => x.isKiller);
  const killer = killers[0] ?? null;
  const beatFor = (evId: string) => c.beats.find((b) => b.evidenceIds.includes(evId));
  const evById = new Map(c.evidence.map((e) => [e.id, e]));
  const beatById = new Map(c.beats.map((b) => [b.id, b]));

  const motives = killer
    ? c.motives
        .filter((m) => m.characterId === killer.id)
        .map((m) => ({
          category: m.category,
          strength: m.strength,
          description: m.description,
          supportingClues: m.evidenceIds.map((id) => evidenceLabel(evById.get(id))),
        }))
    : [];

  const keyEvidence = killer
    ? c.evidence
        .filter((e) => e.veracity === 'true' && e.implicatedIds.includes(killer.id))
        .map((e) => {
          const b = beatFor(e.id);
          return { id: e.id, title: evidenceLabel(e), description: e.description, revealedIn: b ? beatLabel(b) : null };
        })
    : [];

  const herrings = c.redHerrings.map((rh) => {
    const ev = evById.get(rh.evidenceId);
    const revealBeat = ev ? beatFor(ev.id) : undefined;
    const debunkBeat = rh.debunkBeatId ? beatById.get(rh.debunkBeatId) : undefined;
    const debunkEv = rh.debunkEvidenceId ? evById.get(rh.debunkEvidenceId) : undefined;
    return {
      id: rh.id,
      title: evidenceLabel(ev),
      misleads: (ev?.implicatedIds ?? []).map((id) => characterName(c, id)),
      whyPlausible: rh.whyPlausible,
      revealedIn: revealBeat ? beatLabel(revealBeat) : null,
      debunkedIn: debunkBeat ? beatLabel(debunkBeat) : null,
      debunkedBy: debunkEv ? evidenceLabel(debunkEv) : null,
      note: rh.debunkNote,
    };
  });

  return {
    killerId: killer?.id ?? null,
    killerName: killer ? characterName(c, killer.id) : null,
    method: [c.victim.causeOfDeath, c.victim.placeOfDeath && `in ${c.victim.placeOfDeath}`, c.victim.timeOfDeath && `at ${c.victim.timeOfDeath}`]
      .filter(Boolean)
      .join(' '),
    motives,
    keyEvidence,
    herrings,
  };
}
