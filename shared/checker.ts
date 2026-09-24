/**
 * Consistency checker. Pure function: Case -> Issue[].
 *
 * Severity guide:
 *   error   - the game cannot work / is logically broken (no killer, dangling references, …)
 *   warning - the game will run but something is missing or confusing
 *   info    - a suggestion to make the party better
 */
import type { Case, Evidence, StepId } from './models';
import { beatLabel, characterName, evidenceLabel, normPlace, plural } from './ops';

export type Severity = 'error' | 'warning' | 'info';

export type RuleId =
  | 'title-missing'
  | 'setting-missing'
  | 'victim-missing'
  | 'victim-details-missing'
  | 'player-range-invalid'
  | 'too-few-characters'
  | 'character-count-mismatch'
  | 'no-killer'
  | 'multiple-killers'
  | 'killer-no-motive'
  | 'killer-weak-motive'
  | 'killer-motive-unsupported'
  | 'only-killer-strong-motive'
  | 'character-no-name'
  | 'duplicate-character-name'
  | 'no-alibi'
  | 'alibi-companion-missing'
  | 'alibi-not-reciprocal'
  | 'alibi-place-conflict'
  | 'alibi-at-scene'
  | 'killer-too-obvious'
  | 'clue-names-killer'
  | 'no-bio'
  | 'no-secret-role'
  | 'no-secrets'
  | 'non-killer-no-motive'
  | 'relationship-missing-target'
  | 'relationship-self'
  | 'motive-missing-character'
  | 'motive-missing-evidence'
  | 'motive-no-description'
  | 'evidence-no-description'
  | 'evidence-missing-character'
  | 'evidence-unscheduled'
  | 'evidence-multiple-beats'
  | 'no-true-evidence-on-killer'
  | 'killer-evidence-unscheduled'
  | 'thin-killer-evidence'
  | 'herring-record-missing'
  | 'herring-orphan-record'
  | 'herring-missing-evidence'
  | 'herring-implicates-only-killer'
  | 'herring-no-plausibility'
  | 'herring-never-debunked'
  | 'herring-debunk-beat-missing'
  | 'herring-debunk-evidence-missing'
  | 'herring-debunk-evidence-not-true'
  | 'herring-debunked-before-revealed'
  | 'herring-debunked-same-beat'
  | 'herring-debunk-clue-early'
  | 'herring-unrevealed'
  | 'timeline-empty'
  | 'beat-missing-evidence'
  | 'beat-no-title'
  | 'beat-orphaned'
  | 'beat-timer-missing'
  | 'beat-action-missing'
  | 'round-order'
  | 'no-props'
  | 'no-minigames';

export interface IssueTarget {
  step: StepId;
  /** Entity id to scroll to/expand ('case' for case-level fields). */
  entityId?: string;
  /** Field name to focus, matching the `f-<entityId>-<field>` element ids. */
  field?: string;
}

export interface Issue {
  /** Stable id (rule + subject) — safe as a React key. */
  id: string;
  rule: RuleId;
  severity: Severity;
  message: string;
  /** Short "how to fix it" hint. */
  hint: string;
  target: IssueTarget;
}

export interface IssueCounts {
  error: number;
  warning: number;
  info: number;
}

export function countIssues(issues: readonly Issue[]): IssueCounts {
  const out: IssueCounts = { error: 0, warning: 0, info: 0 };
  for (const i of issues) out[i.severity]++;
  return out;
}

export function issuesByStep(issues: readonly Issue[]): Record<StepId, IssueCounts> {
  const blank = (): IssueCounts => ({ error: 0, warning: 0, info: 0 });
  const out: Record<StepId, IssueCounts> = {
    setting: blank(),
    victim: blank(),
    characters: blank(),
    motives: blank(),
    evidence: blank(),
    'red-herrings': blank(),
    timeline: blank(),
    polish: blank(),
  };
  for (const i of issues) out[i.target.step][i.severity]++;
  return out;
}

const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

export function checkCase(c: Case): Issue[] {
  const issues: Issue[] = [];
  const usedIds = new Set<string>();
  const add = (
    rule: RuleId,
    severity: Severity,
    subject: string,
    message: string,
    hint: string,
    target: IssueTarget,
  ) => {
    // Issue ids double as React keys, so they must be unique across the whole
    // report. The same rule+subject with the same message is a duplicate (drop
    // it); with a different message it is a distinct problem (suffix the id).
    const base = `${rule}:${subject}`;
    let id = base;
    for (let n = 2; usedIds.has(id); n++) {
      if (issues.some((i) => i.id === id && i.message === message)) return;
      id = `${base}~${n}`;
    }
    usedIds.add(id);
    issues.push({ id, rule, severity, message, hint, target });
  };

  const charById = new Map(c.characters.map((x) => [x.id, x]));
  const evById = new Map(c.evidence.map((x) => [x.id, x]));
  const beatIndexById = new Map(c.beats.map((b, i) => [b.id, i]));
  const beatById = new Map(c.beats.map((b) => [b.id, b]));
  const herringByEvidence = new Map(c.redHerrings.map((r) => [r.evidenceId, r]));

  /** Index of the (first) beat that reveals an evidence item, or -1. */
  const revealIndex = (evId: string): number => c.beats.findIndex((b) => b.evidenceIds.includes(evId));

  // ------------------------------------------------------------- case-level
  if (!c.title.trim()) {
    add('title-missing', 'warning', 'case', 'The case has no title.', 'Give your mystery a memorable name.', {
      step: 'setting',
      entityId: 'setting',
      field: 'title',
    });
  }
  if (!c.setting.name.trim()) {
    add('setting-missing', 'warning', 'case', 'No setting has been described.', 'Name the venue so players can picture it.', {
      step: 'setting',
      entityId: 'setting',
      field: 'name',
    });
  }
  if (!c.victim.name.trim()) {
    add('victim-missing', 'error', 'victim', 'The victim has no name.', 'Every murder mystery needs a victim.', {
      step: 'victim',
      entityId: 'victim',
      field: 'name',
    });
  } else {
    const missing = (['causeOfDeath', 'timeOfDeath', 'placeOfDeath'] as const).filter((k) => !c.victim[k].trim());
    if (missing.length) {
      const first = missing[0] as 'causeOfDeath' | 'timeOfDeath' | 'placeOfDeath';
      add(
        'victim-details-missing',
        'warning',
        'victim',
        `The victim's ${missing.map((m) => (m === 'causeOfDeath' ? 'cause of death' : m === 'timeOfDeath' ? 'time of death' : 'place of death')).join(', ')} ${missing.length > 1 ? 'are' : 'is'} blank.`,
        'Players will ask — decide how, when and where.',
        { step: 'victim', entityId: 'victim', field: first },
      );
    }
  }
  if (c.playerMin > c.playerMax || c.playerMin < 2) {
    add(
      'player-range-invalid',
      'error',
      'players',
      c.playerMin > c.playerMax
        ? `Player range is inverted (${c.playerMin}–${c.playerMax}).`
        : `A murder mystery needs at least 2 players (minimum is ${c.playerMin}).`,
      'Fix the player count range.',
      { step: 'setting', entityId: 'setting', field: 'playerMin' },
    );
  }

  // ------------------------------------------------------------- characters
  const n = c.characters.length;
  if (n < 3) {
    add(
      'too-few-characters',
      'error',
      'characters',
      n === 0 ? 'There are no characters yet.' : `Only ${n} character${n === 1 ? '' : 's'} — a mystery needs at least 3 suspects.`,
      'Add more characters (or generate a starter cast).',
      { step: 'characters' },
    );
  }
  if (n >= 3 && c.playerMin <= c.playerMax) {
    if (n < c.playerMin) {
      add(
        'character-count-mismatch',
        'error',
        'below',
        `${n} characters but at least ${c.playerMin} players — someone would have nothing to play.`,
        `Add ${c.playerMin - n} more character${c.playerMin - n === 1 ? '' : 's'} or lower the minimum players.`,
        { step: 'characters' },
      );
    } else if (n > c.playerMax) {
      add(
        'character-count-mismatch',
        'warning',
        'above',
        `${n} characters but at most ${c.playerMax} players — some characters will go unplayed.`,
        'Remove a character or raise the maximum players.',
        { step: 'setting', entityId: 'setting', field: 'playerMax' },
      );
    }
  }

  const killers = c.characters.filter((x) => x.isKiller);
  if (n > 0 && killers.length === 0) {
    add('no-killer', 'error', 'case', 'Nobody is marked as the killer.', 'Mark exactly one character as the killer.', {
      step: 'characters',
    });
  }
  if (killers.length > 1) {
    add(
      'multiple-killers',
      'error',
      'case',
      `${killers.length} characters are marked as the killer (${killers.map((k) => characterName(c, k.id)).join(', ')}).`,
      'Only one character can be the killer.',
      { step: 'characters', entityId: (killers[1] as { id: string }).id, field: 'isKiller' },
    );
  }

  const nameCount = new Map<string, number>();
  for (const ch of c.characters) {
    const key = ch.name.trim().toLowerCase();
    if (key) nameCount.set(key, (nameCount.get(key) ?? 0) + 1);
  }

  for (const ch of c.characters) {
    const label = characterName(c, ch.id);
    const at = (field?: string): IssueTarget => ({ step: 'characters', entityId: ch.id, field });
    if (!ch.name.trim()) {
      add('character-no-name', 'error', ch.id, 'A character has no name.', 'Name every character.', at('name'));
    } else if ((nameCount.get(ch.name.trim().toLowerCase()) ?? 0) > 1) {
      add('duplicate-character-name', 'warning', ch.id, `Two characters are both called “${ch.name.trim()}”.`, 'Rename one so players can tell them apart.', at('name'));
    }
    if (!ch.alibi.trim()) {
      add('no-alibi', 'warning', ch.id, `${label} has no alibi.`, 'Everyone needs a story for where they were.', at('alibi'));
    }
    if (!ch.publicBio.trim()) {
      add('no-bio', 'warning', ch.id, `${label} has no public bio.`, 'Other players introduce themselves with this.', at('publicBio'));
    }
    if (!ch.secretRole.trim()) {
      add('no-secret-role', 'info', ch.id, `${label} has no secret role.`, 'A hidden identity or agenda adds spice.', at('secretRole'));
    }
    if (ch.secrets.length === 0) {
      add('no-secrets', 'info', ch.id, `${label} has no secrets.`, 'Secrets give players something to protect and to be suspected for.', at());
    }
    for (const r of ch.relationships) {
      if (r.targetId === ch.id) {
        add('relationship-self', 'warning', r.id, `${label} has a relationship with themselves.`, 'Point the relationship at somebody else.', at());
      } else if (!charById.has(r.targetId)) {
        add('relationship-missing-target', 'error', r.id, `${label} has a relationship with a character who does not exist.`, 'Choose an existing character or remove it.', at());
      }
    }
    if (!ch.isKiller && !c.motives.some((m) => m.characterId === ch.id) && killers.length > 0) {
      add('non-killer-no-motive', 'info', ch.id, `${label} has no motive — they are an obvious innocent.`, 'Give every suspect a reason (even a weak one).', { step: 'motives', entityId: ch.id });
    }
  }

  // ------------------------------------------------------------ alibi timeline
  // Alibis form a shared "who was where" timeline: companions must be mutual and
  // a room cannot hold two unconnected alibis.
  const linked = (a: (typeof c.characters)[number], b: (typeof c.characters)[number]) =>
    a.alibiWithIds.includes(b.id) || b.alibiWithIds.includes(a.id);
  const scene = normPlace(c.victim.placeOfDeath);
  for (const a of c.characters) {
    const aName = characterName(c, a.id);
    const seen = new Set<string>();
    for (const bid of a.alibiWithIds) {
      if (seen.has(bid)) continue;
      seen.add(bid);
      const b = charById.get(bid);
      if (!b || b.id === a.id) {
        add('alibi-companion-missing', 'error', `${a.id}:${bid}`, `${aName}'s alibi names a companion who does not exist.`, 'Remove the stale companion or pick a real character.', { step: 'characters', entityId: a.id, field: 'alibiWithIds' });
        continue;
      }
      const bName = characterName(c, b.id);
      if (!b.alibiWithIds.includes(a.id)) {
        add('alibi-not-reciprocal', 'warning', `${a.id}:${b.id}`, `${aName} says they were with ${bName}, but ${bName}'s alibi does not mention ${aName}.`, `Add ${aName} to ${bName}'s alibi companions (or remove ${bName} from ${aName}'s).`, { step: 'characters', entityId: b.id, field: 'alibiWithIds' });
      }
      // Report each unordered pair once: when both list each other, only the
      // character that sorts first speaks; otherwise the one who named the other does.
      const reports = !b.alibiWithIds.includes(a.id) || a.id < b.id;
      if (reports && a.alibiPlace.trim() && b.alibiPlace.trim() && normPlace(a.alibiPlace) !== normPlace(b.alibiPlace)) {
        add('alibi-place-conflict', 'warning', `pair:${[a.id, b.id].sort().join(':')}`, `${aName} puts themselves with ${bName} in “${a.alibiPlace.trim()}”, but ${bName} says they were in “${b.alibiPlace.trim()}”.`, 'Companions must agree on where they were.', { step: 'characters', entityId: b.id, field: 'alibiPlace' });
      }
    }
    if (a.alibiPlace.trim() && scene && normPlace(a.alibiPlace) === scene) {
      add('alibi-at-scene', 'info', a.id, `${aName}'s alibi places them at the scene of the crime (“${a.alibiPlace.trim()}”).`, 'Alibis normally put people somewhere else.', { step: 'characters', entityId: a.id, field: 'alibiPlace' });
    }
  }
  const byPlace = new Map<string, (typeof c.characters)[number][]>();
  for (const a of c.characters) {
    const key = normPlace(a.alibiPlace);
    if (key) byPlace.set(key, [...(byPlace.get(key) ?? []), a]);
  }
  for (const [, group] of byPlace) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i] as (typeof group)[number];
        const b = group[j] as (typeof group)[number];
        if (!linked(a, b)) {
          add('alibi-place-conflict', 'warning', `room:${[a.id, b.id].sort().join(':')}`, `${characterName(c, a.id)} and ${characterName(c, b.id)} both claim “${a.alibiPlace.trim()}” but do not vouch for each other.`, 'Link them as companions, or move one of them to another room.', { step: 'characters', entityId: b.id, field: 'alibiPlace' });
        }
      }
    }
  }

  // ---------------------------------------------------------------- killer
  const killer = killers.length === 1 ? (killers[0] as (typeof killers)[number]) : null;
  if (killer) {
    const kMotives = c.motives.filter((m) => m.characterId === killer.id);
    if (kMotives.length === 0) {
      add('killer-no-motive', 'error', killer.id, `The killer (${characterName(c, killer.id)}) has no motive.`, 'Give the killer a reason to kill.', { step: 'motives', entityId: killer.id });
    } else {
      if (!kMotives.some((m) => m.strength === 'strong')) {
        add('killer-weak-motive', 'info', killer.id, 'The killer has only weak motives.', 'Consider making at least one motive strong so the solution feels earned.', { step: 'motives', entityId: (kMotives[0] as { id: string }).id, field: 'strength' });
      }
      const supported = kMotives.some((m) => m.evidenceIds.some((e) => evById.has(e)));
      if (!supported) {
        add('killer-motive-unsupported', 'warning', killer.id, "No clue supports the killer's motive.", 'Link evidence to the killer’s motive so players can discover it.', { step: 'motives', entityId: (kMotives[0] as { id: string }).id, field: 'evidenceIds' });
      }
      const othersStrong = c.motives.some((m) => m.characterId !== killer.id && m.strength === 'strong');
      if (!othersStrong && n >= 3) {
        add('only-killer-strong-motive', 'info', killer.id, 'Only the killer has a strong motive — too easy to guess.', 'Give another suspect a strong motive as a decoy.', { step: 'motives' });
      }
    }
    const killerTrue = c.evidence.filter((e) => e.veracity === 'true' && e.implicatedIds.includes(killer.id));
    if (killerTrue.length === 0) {
      add('no-true-evidence-on-killer', 'error', killer.id, 'No genuine evidence points at the killer — the case is unsolvable.', 'Add true evidence that implicates the killer.', { step: 'evidence' });
    } else {
      if (killerTrue.every((e) => revealIndex(e.id) < 0)) {
        add('killer-evidence-unscheduled', 'error', killer.id, 'None of the evidence against the killer is scheduled in the timeline.', 'Schedule at least one incriminating clue in a beat.', { step: 'timeline' });
      }
      if (killerTrue.length < 2) {
        add('thin-killer-evidence', 'info', killer.id, 'Only one genuine clue points at the killer.', 'Two or three independent clues make a fairer puzzle.', { step: 'evidence', entityId: (killerTrue[0] as { id: string }).id });
      }
    }
  }

  if (killer && c.characters.length >= 3) {
    const weight = new Map<string, number>();
    for (const e of c.evidence) for (const id of new Set(e.implicatedIds)) weight.set(id, (weight.get(id) ?? 0) + 1);
    const killerWeight = weight.get(killer.id) ?? 0;
    const rival = c.characters.filter((x) => x.id !== killer.id).reduce((best, x) => (weight.get(x.id) ?? 0) > (weight.get(best.id) ?? 0) ? x : best, c.characters.find((x) => x.id !== killer.id) as (typeof c.characters)[number]);
    const rivalWeight = weight.get(rival.id) ?? 0;
    if (killerWeight >= 3 && killerWeight > 2 * Math.max(1, rivalWeight)) {
      add('killer-too-obvious', 'warning', killer.id, `The killer is implicated by ${plural(killerWeight, 'clue')} but the next suspect by only ${rivalWeight}: the mystery will be solved too quickly.`, 'Give innocent suspects clues, red herrings or shared traits so several people look guilty.', { step: 'evidence' });
    }
    const kName = killer.name.trim();
    if (kName.length > 2) {
      for (const e of c.evidence) {
        if (e.veracity !== 'true' || !e.description.includes(kName)) continue;
        const namesOther = c.characters.some((x) => x.id !== killer.id && x.name.trim().length > 2 && e.description.includes(x.name.trim()));
        if (!namesOther) {
          add('clue-names-killer', 'info', e.id, `Clue “${evidenceLabel(e)}” names the killer and nobody else, which may give the game away when it is handed out.`, 'Describe the evidence rather than naming the culprit, or mention other suspects too.', { step: 'evidence', entityId: e.id, field: 'description' });
        }
      }
    }
  }

  // ---------------------------------------------------------------- motives
  for (const m of c.motives) {
    const who = charById.get(m.characterId);
    const at = (field?: string): IssueTarget => ({ step: 'motives', entityId: m.id, field });
    if (!who) {
      add('motive-missing-character', 'error', m.id, 'A motive belongs to a character who does not exist.', 'Reassign or delete the motive.', at('characterId'));
    }
    if (!m.description.trim()) {
      add('motive-no-description', 'warning', m.id, `${who ? `${characterName(c, who.id)}'s` : 'A'} ${m.category} motive has no description.`, 'Describe why they would do it.', at('description'));
    }
    for (const eid of m.evidenceIds) {
      if (!evById.has(eid)) {
        add('motive-missing-evidence', 'error', `${m.id}:${eid}`, `${who ? `${characterName(c, who.id)}'s` : 'A'} ${m.category} motive links to evidence that does not exist.`, 'Remove the link or pick real evidence.', at('evidenceIds'));
      }
    }
  }

  // --------------------------------------------------------------- evidence
  for (const e of c.evidence) {
    const at = (field?: string): IssueTarget => ({ step: 'evidence', entityId: e.id, field });
    const label = evidenceLabel(e);
    if (!e.description.trim()) {
      add('evidence-no-description', 'warning', e.id, `Clue “${label}” has no description.`, 'The handout card needs text.', at('description'));
    }
    for (const cid of e.implicatedIds) {
      if (!charById.has(cid)) {
        add('evidence-missing-character', 'error', `${e.id}:${cid}`, `Clue “${label}” implicates a character who does not exist.`, 'Remove the stale implication.', at('implicatedIds'));
      }
    }
    const scheduledIn = c.beats.filter((b) => b.evidenceIds.includes(e.id));
    if (scheduledIn.length === 0) {
      add('evidence-unscheduled', 'warning', e.id, `Clue “${label}” is never revealed in any beat.`, 'Attach it to a timeline beat or delete it.', at('reveal'));
    } else if (scheduledIn.length > 1) {
      add('evidence-multiple-beats', 'warning', e.id, `Clue “${label}” is scheduled in ${scheduledIn.length} beats.`, 'Keep each clue in a single beat.', { step: 'timeline', entityId: (scheduledIn[1] as { id: string }).id });
    }
    const rh = herringByEvidence.get(e.id);
    if (e.veracity === 'red-herring' && !rh) {
      add('herring-record-missing', 'warning', e.id, `Clue “${label}” is a red herring but has no plausibility / debunk details.`, 'Fill in the red-herring card.', { step: 'red-herrings', entityId: e.id });
    }
    if (e.veracity === 'true' && rh) {
      add('herring-orphan-record', 'warning', rh.id, `Clue “${label}” has red-herring details but is marked true.`, 'Mark the clue as a red herring or delete the red-herring card.', { step: 'red-herrings', entityId: rh.id });
    }
  }

  // ------------------------------------------------------------ red herrings
  for (const rh of c.redHerrings) {
    const ev = evById.get(rh.evidenceId);
    const at = (field?: string): IssueTarget => ({ step: 'red-herrings', entityId: rh.id, field });
    if (!ev) {
      add('herring-missing-evidence', 'error', rh.id, 'A red herring points at a clue that does not exist.', 'Delete this red herring or restore the clue.', at());
      continue;
    }
    const label = evidenceLabel(ev);
    if (killer && ev.implicatedIds.length > 0 && ev.implicatedIds.every((i) => i === killer.id)) {
      add('herring-implicates-only-killer', 'warning', rh.id, `Red herring “${label}” only points at the killer — it will not mislead anyone.`, 'Aim it at an innocent suspect.', { step: 'evidence', entityId: ev.id, field: 'implicatedIds' });
    }
    if (!rh.whyPlausible.trim()) {
      add('herring-no-plausibility', 'info', rh.id, `Red herring “${label}” does not say why it is plausible.`, 'Explain why players will fall for it.', at('whyPlausible'));
    }
    const revealAt = revealIndex(ev.id);
    if (revealAt < 0) {
      add('herring-unrevealed', 'warning', rh.id, `Red herring “${label}” is never revealed to players.`, 'Schedule it in a beat so it can mislead.', { step: 'evidence', entityId: ev.id, field: 'reveal' });
    }
    const hasBeat = rh.debunkBeatId !== null && rh.debunkBeatId !== '';
    const hasEv = rh.debunkEvidenceId !== null && rh.debunkEvidenceId !== '';
    if (!hasBeat && !hasEv) {
      add('herring-never-debunked', 'warning', rh.id, `Red herring “${label}” is never debunked.`, 'Choose a beat and/or a clue that resolves it.', at('debunkBeatId'));
    }
    if (hasBeat && !beatById.has(rh.debunkBeatId as string)) {
      add('herring-debunk-beat-missing', 'error', rh.id, `Red herring “${label}” is debunked in a beat that does not exist.`, 'Pick an existing beat.', at('debunkBeatId'));
    }
    let debunkEv: Evidence | undefined;
    if (hasEv) {
      debunkEv = evById.get(rh.debunkEvidenceId as string);
      if (!debunkEv) {
        add('herring-debunk-evidence-missing', 'error', rh.id, `Red herring “${label}” is resolved by a clue that does not exist.`, 'Pick an existing clue.', at('debunkEvidenceId'));
      } else if (debunkEv.veracity !== 'true') {
        add('herring-debunk-evidence-not-true', 'warning', rh.id, `Red herring “${label}” is “resolved” by another red herring.`, 'Use a genuine clue to debunk it.', at('debunkEvidenceId'));
      }
    }
    if (revealAt >= 0 && hasBeat && beatById.has(rh.debunkBeatId as string)) {
      const debunkAt = beatIndexById.get(rh.debunkBeatId as string) as number;
      if (debunkAt < revealAt) {
        add('herring-debunked-before-revealed', 'error', rh.id, `Red herring “${label}” is debunked (${beatLabel(beatById.get(rh.debunkBeatId as string))}) before it is revealed (${beatLabel(c.beats[revealAt])}).`, 'Move the debunk to a later beat or reveal the herring earlier.', at('debunkBeatId'));
      } else if (debunkAt === revealAt) {
        add('herring-debunked-same-beat', 'warning', rh.id, `Red herring “${label}” is revealed and debunked in the same beat.`, 'Give players time to be fooled first.', at('debunkBeatId'));
      }
    }
    if (revealAt >= 0 && debunkEv) {
      const dAt = revealIndex(debunkEv.id);
      if (dAt >= 0 && dAt < revealAt) {
        add('herring-debunk-clue-early', 'error', rh.id, `The clue that debunks “${label}” is revealed before the red herring itself.`, 'Schedule the debunking clue after the herring.', at('debunkEvidenceId'));
      }
    }
  }

  // ---------------------------------------------------------------- timeline
  if (c.beats.length === 0) {
    add('timeline-empty', 'error', 'timeline', 'The timeline has no beats.', 'Add at least an arrival, a discovery and a reveal.', { step: 'timeline' });
  }
  let maxRound = -1;
  c.beats.forEach((b, i) => {
    const label = beatLabel(b);
    const at = (field?: string): IssueTarget => ({ step: 'timeline', entityId: b.id, field });
    if (!b.title.trim()) {
      add('beat-no-title', 'warning', b.id, `Beat ${i + 1} has no title.`, 'Titles keep the GM oriented.', at('title'));
    }
    for (const eid of b.evidenceIds) {
      if (!evById.has(eid)) {
        add('beat-missing-evidence', 'error', `${b.id}:${eid}`, `Beat “${label}” reveals a clue that does not exist.`, 'Remove the stale clue from the beat.', at('evidenceIds'));
      }
    }
    if (b.evidenceIds.length === 0 && !b.description.trim() && !b.gmNotes.trim()) {
      add('beat-orphaned', 'warning', b.id, `Beat “${label}” reveals nothing and has no description — it is an orphan.`, 'Add a clue or a description, or delete the beat.', at('description'));
    }
    if (b.trigger === 'timer' && b.timerSeconds <= 0) {
      add('beat-timer-missing', 'warning', b.id, `Beat “${label}” is timer-triggered but has no duration.`, 'Set a countdown length.', at('timerSeconds'));
    }
    if (b.trigger === 'player-action' && !b.actionPrompt.trim()) {
      add('beat-action-missing', 'warning', b.id, `Beat “${label}” waits on a player action but does not say which.`, 'Describe what players must do.', at('actionPrompt'));
    }
    if (b.round < maxRound) {
      add('round-order', 'warning', b.id, `Beat “${label}” is Round ${b.round} but follows a Round ${maxRound} beat.`, 'Reorder beats or fix the round number.', at('round'));
    }
    maxRound = Math.max(maxRound, b.round);
  });

  // ----------------------------------------------------------------- extras
  if (c.extras.props.length === 0) {
    add('no-props', 'info', 'extras', 'No props are listed.', 'List what the host needs to gather.', { step: 'polish', entityId: 'extras' });
  }
  if (c.extras.miniGames.length === 0) {
    add('no-minigames', 'info', 'extras', 'No mini-games or challenges are planned.', 'A challenge breaks up the interrogation rounds.', { step: 'polish', entityId: 'extras' });
  }

  return issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
