import { describe, expect, it } from 'vitest';
import { checkCase, countIssues, issuesByStep, type RuleId } from '../shared/checker';
import { beatOfEvidence, blankCase, blankCharacter } from '../shared/ops';
import type { Case } from '../shared/models';
import { goodCase, innocentsOf, killerOf } from './helpers';

const rules = (c: Case): RuleId[] => checkCase(c).map((i) => i.rule);
const has = (c: Case, r: RuleId) => rules(c).includes(r);

describe('consistency checker', () => {
  it('passes a freshly generated case with no errors or warnings', () => {
    const issues = checkCase(goodCase()).filter((i) => i.severity !== 'info');
    expect(issues).toEqual([]);
  });

  it('gives every issue a severity, message, hint and click-through target', () => {
    const c = blankCase();
    const issues = checkCase(c);
    expect(issues.length).toBeGreaterThan(0);
    for (const i of issues) {
      expect(['error', 'warning', 'info']).toContain(i.severity);
      expect(i.message.length).toBeGreaterThan(5);
      expect(i.hint.length).toBeGreaterThan(3);
      expect(i.target.step).toBeTruthy();
    }
  });

  it('sorts errors before warnings before info', () => {
    const c = goodCase();
    c.title = '';
    c.characters.forEach((ch) => (ch.secrets = []));
    killerOf(c).isKiller = false;
    const order = checkCase(c).map((i) => i.severity);
    const rank = { error: 0, warning: 1, info: 2 } as const;
    expect([...order].sort((a, b) => rank[a] - rank[b])).toEqual(order);
  });

  describe('killer rules', () => {
    it('no killer -> error', () => {
      const c = goodCase();
      killerOf(c).isKiller = false;
      expect(checkCase(c).find((i) => i.rule === 'no-killer')?.severity).toBe('error');
    });
    it('multiple killers -> error', () => {
      const c = goodCase();
      innocentsOf(c)[0]!.isKiller = true;
      expect(checkCase(c).find((i) => i.rule === 'multiple-killers')?.severity).toBe('error');
    });
    it('killer without motive -> error', () => {
      const c = goodCase();
      const k = killerOf(c);
      c.motives = c.motives.filter((m) => m.characterId !== k.id);
      expect(checkCase(c).find((i) => i.rule === 'killer-no-motive')?.severity).toBe('error');
    });
    it('killer with only weak motive -> info', () => {
      const c = goodCase();
      const k = killerOf(c);
      c.motives.filter((m) => m.characterId === k.id).forEach((m) => (m.strength = 'weak'));
      expect(checkCase(c).find((i) => i.rule === 'killer-weak-motive')?.severity).toBe('info');
    });
    it('killer motive without any linked clue -> warning', () => {
      const c = goodCase();
      const k = killerOf(c);
      c.motives.filter((m) => m.characterId === k.id).forEach((m) => (m.evidenceIds = []));
      expect(checkCase(c).find((i) => i.rule === 'killer-motive-unsupported')?.severity).toBe('warning');
    });
    it('no true evidence pointing at the killer -> error', () => {
      const c = goodCase();
      const k = killerOf(c);
      c.evidence.forEach((e) => (e.implicatedIds = e.implicatedIds.filter((i) => i !== k.id)));
      expect(checkCase(c).find((i) => i.rule === 'no-true-evidence-on-killer')?.severity).toBe('error');
    });
    it('killer evidence only as red herring does not count', () => {
      const c = goodCase();
      const k = killerOf(c);
      c.evidence.filter((e) => e.implicatedIds.includes(k.id)).forEach((e) => (e.veracity = 'red-herring'));
      expect(has(c, 'no-true-evidence-on-killer')).toBe(true);
    });
    it('all killer evidence unscheduled -> error', () => {
      const c = goodCase();
      const k = killerOf(c);
      const ids = new Set(c.evidence.filter((e) => e.veracity === 'true' && e.implicatedIds.includes(k.id)).map((e) => e.id));
      c.beats.forEach((b) => (b.evidenceIds = b.evidenceIds.filter((i) => !ids.has(i))));
      expect(checkCase(c).find((i) => i.rule === 'killer-evidence-unscheduled')?.severity).toBe('error');
    });
    it('only one clue on the killer -> info', () => {
      const c = goodCase();
      const k = killerOf(c);
      const mine = c.evidence.filter((e) => e.veracity === 'true' && e.implicatedIds.includes(k.id));
      mine.slice(1).forEach((e) => (e.implicatedIds = []));
      expect(has(c, 'thin-killer-evidence')).toBe(true);
    });
  });

  describe('character rules', () => {
    it('character without an alibi -> warning that targets the alibi field', () => {
      const c = goodCase();
      const ch = innocentsOf(c)[0]!;
      ch.alibi = '  ';
      const issue = checkCase(c).find((i) => i.rule === 'no-alibi');
      expect(issue?.severity).toBe('warning');
      expect(issue?.target).toEqual({ step: 'characters', entityId: ch.id, field: 'alibi' });
    });
    it('nameless and duplicate names', () => {
      const c = goodCase();
      c.characters[0]!.name = '';
      expect(has(c, 'character-no-name')).toBe(true);
      const d = goodCase();
      d.characters[1]!.name = d.characters[0]!.name.toUpperCase();
      expect(has(d, 'duplicate-character-name')).toBe(true);
    });
    it('missing bio / secret role / secrets', () => {
      const c = goodCase();
      const ch = innocentsOf(c)[0]!;
      ch.publicBio = '';
      ch.secretRole = '';
      ch.secrets = [];
      expect(has(c, 'no-bio')).toBe(true);
      expect(has(c, 'no-secret-role')).toBe(true);
      expect(has(c, 'no-secrets')).toBe(true);
    });
    it('relationship to a missing character -> error, to self -> warning', () => {
      const c = goodCase();
      c.characters[0]!.relationships[0]!.targetId = 'ghost';
      expect(checkCase(c).find((i) => i.rule === 'relationship-missing-target')?.severity).toBe('error');
      const d = goodCase();
      d.characters[0]!.relationships[0]!.targetId = d.characters[0]!.id;
      expect(has(d, 'relationship-self')).toBe(true);
    });
    it('innocent without a motive -> info', () => {
      const c = goodCase();
      const ch = innocentsOf(c)[0]!;
      c.motives = c.motives.filter((m) => m.characterId !== ch.id);
      expect(checkCase(c).find((i) => i.rule === 'non-killer-no-motive')?.severity).toBe('info');
    });
    it('only the killer having a strong motive -> info', () => {
      const c = goodCase();
      c.motives.filter((m) => m.characterId !== killerOf(c).id).forEach((m) => (m.strength = 'weak'));
      expect(has(c, 'only-killer-strong-motive')).toBe(true);
    });
  });

  describe('player count vs character count', () => {
    it('fewer characters than the minimum players -> error', () => {
      const c = goodCase(11, 6, 6);
      c.playerMin = 9;
      c.playerMax = 10;
      expect(checkCase(c).find((i) => i.rule === 'character-count-mismatch')?.severity).toBe('error');
    });
    it('more characters than the maximum players -> warning', () => {
      const c = goodCase(11, 6, 6);
      c.playerMin = 3;
      c.playerMax = 4;
      expect(checkCase(c).find((i) => i.rule === 'character-count-mismatch')?.severity).toBe('warning');
    });
    it('too few characters and an inverted range are errors', () => {
      const c = blankCase();
      c.characters = [blankCharacter()];
      expect(has(c, 'too-few-characters')).toBe(true);
      const d = goodCase();
      d.playerMin = 9;
      d.playerMax = 4;
      expect(has(d, 'player-range-invalid')).toBe(true);
    });
  });

  describe('references', () => {
    it('evidence implicating a nonexistent character -> error', () => {
      const c = goodCase();
      c.evidence[0]!.implicatedIds.push('nobody');
      expect(checkCase(c).find((i) => i.rule === 'evidence-missing-character')?.severity).toBe('error');
    });
    it('motive linked to nonexistent evidence -> error', () => {
      const c = goodCase();
      c.motives[0]!.evidenceIds.push('ev_gone');
      expect(checkCase(c).find((i) => i.rule === 'motive-missing-evidence')?.severity).toBe('error');
    });
    it('motive owned by a nonexistent character -> error', () => {
      const c = goodCase();
      c.motives[0]!.characterId = 'ghost';
      expect(has(c, 'motive-missing-character')).toBe(true);
    });
    it('timeline referencing a clue that does not exist -> error', () => {
      const c = goodCase();
      c.beats[1]!.evidenceIds.push('ev_gone');
      const issue = checkCase(c).find((i) => i.rule === 'beat-missing-evidence');
      expect(issue?.severity).toBe('error');
      expect(issue?.target.step).toBe('timeline');
      expect(issue?.target.entityId).toBe(c.beats[1]!.id);
    });
  });

  describe('timeline rules', () => {
    it('clue never scheduled in any beat -> warning', () => {
      const c = goodCase();
      const ev = c.evidence.find((e) => e.veracity === 'true' && e.implicatedIds.length === 0)!;
      c.beats.forEach((b) => (b.evidenceIds = b.evidenceIds.filter((i) => i !== ev.id)));
      expect(checkCase(c).find((i) => i.rule === 'evidence-unscheduled')?.severity).toBe('warning');
    });
    it('clue scheduled twice -> warning', () => {
      const c = goodCase();
      const ev = c.evidence[0]!;
      const other = c.beats.find((b) => !b.evidenceIds.includes(ev.id))!;
      other.evidenceIds.push(ev.id);
      expect(has(c, 'evidence-multiple-beats')).toBe(true);
    });
    it('empty timeline -> error', () => {
      const c = goodCase();
      c.beats = [];
      expect(has(c, 'timeline-empty')).toBe(true);
    });
    it('orphaned beat -> warning', () => {
      const c = goodCase();
      c.beats.push({ id: 'b_orphan', title: 'Nothing happens', description: '', timeLabel: '', round: 9, trigger: 'manual', timerSeconds: 0, actionPrompt: '', evidenceIds: [], gmNotes: '' });
      expect(checkCase(c).find((i) => i.rule === 'beat-orphaned')?.severity).toBe('warning');
    });
    it('timer beat without duration and action beat without prompt', () => {
      const c = goodCase();
      const timer = c.beats.find((b) => b.trigger === 'timer')!;
      timer.timerSeconds = 0;
      const action = c.beats.find((b) => b.trigger === 'player-action')!;
      action.actionPrompt = '';
      expect(has(c, 'beat-timer-missing')).toBe(true);
      expect(has(c, 'beat-action-missing')).toBe(true);
    });
    it('rounds going backwards -> warning', () => {
      const c = goodCase();
      c.beats[c.beats.length - 1]!.round = 0;
      expect(has(c, 'round-order')).toBe(true);
    });
    it('untitled beat -> warning', () => {
      const c = goodCase();
      c.beats[0]!.title = '';
      expect(has(c, 'beat-no-title')).toBe(true);
    });
  });

  describe('red herrings', () => {
    const rhCase = () => {
      const c = goodCase();
      const rh = c.redHerrings[0]!;
      const revealBeat = beatOfEvidence(c, rh.evidenceId)!;
      return { c, rh, revealBeat };
    };

    it('red herring never debunked -> warning', () => {
      const { c, rh } = rhCase();
      rh.debunkBeatId = null;
      rh.debunkEvidenceId = null;
      expect(checkCase(c).find((i) => i.rule === 'herring-never-debunked')?.severity).toBe('warning');
    });
    it('red herring debunked before it is revealed -> error', () => {
      const { c, rh, revealBeat } = rhCase();
      const idx = c.beats.indexOf(revealBeat);
      rh.debunkBeatId = c.beats[Math.max(0, idx - 1)]!.id;
      const issue = checkCase(c).find((i) => i.rule === 'herring-debunked-before-revealed');
      expect(issue?.severity).toBe('error');
      expect(issue?.target).toMatchObject({ step: 'red-herrings', entityId: rh.id });
    });
    it('debunked in the very same beat -> warning', () => {
      const { c, rh, revealBeat } = rhCase();
      rh.debunkBeatId = revealBeat.id;
      expect(checkCase(c).find((i) => i.rule === 'herring-debunked-same-beat')?.severity).toBe('warning');
    });
    it('debunking clue revealed before the herring -> error', () => {
      const { c, rh, revealBeat } = rhCase();
      const first = c.beats[0]!;
      const idx = c.beats.indexOf(revealBeat);
      expect(idx).toBeGreaterThan(0);
      c.beats.forEach((b) => (b.evidenceIds = b.evidenceIds.filter((i) => i !== rh.debunkEvidenceId)));
      first.evidenceIds.push(rh.debunkEvidenceId!);
      expect(has(c, 'herring-debunk-clue-early')).toBe(true);
    });
    it('debunk beat / clue that do not exist -> error', () => {
      const { c, rh } = rhCase();
      rh.debunkBeatId = 'beat_gone';
      rh.debunkEvidenceId = 'ev_gone';
      expect(has(c, 'herring-debunk-beat-missing')).toBe(true);
      expect(has(c, 'herring-debunk-evidence-missing')).toBe(true);
    });
    it('red herring pointing at a deleted clue -> error', () => {
      const { c, rh } = rhCase();
      rh.evidenceId = 'ev_gone';
      expect(checkCase(c).find((i) => i.rule === 'herring-missing-evidence')?.severity).toBe('error');
    });
    it('red-herring clue with no details / details on a true clue -> warning', () => {
      const { c, rh } = rhCase();
      c.redHerrings = c.redHerrings.filter((r) => r.id !== rh.id);
      expect(has(c, 'herring-record-missing')).toBe(true);
      const d = goodCase();
      d.evidence.find((e) => e.id === d.redHerrings[0]!.evidenceId)!.veracity = 'true';
      expect(has(d, 'herring-orphan-record')).toBe(true);
    });
    it('herring that only implicates the killer, has no explanation or is never revealed', () => {
      const { c, rh } = rhCase();
      const ev = c.evidence.find((e) => e.id === rh.evidenceId)!;
      ev.implicatedIds = [killerOf(c).id];
      rh.whyPlausible = '';
      expect(has(c, 'herring-implicates-only-killer')).toBe(true);
      expect(has(c, 'herring-no-plausibility')).toBe(true);
      c.beats.forEach((b) => (b.evidenceIds = b.evidenceIds.filter((i) => i !== ev.id)));
      expect(has(c, 'herring-unrevealed')).toBe(true);
    });
    it('debunk clue that is itself a red herring -> warning', () => {
      const { c, rh } = rhCase();
      c.evidence.find((e) => e.id === rh.debunkEvidenceId)!.veracity = 'red-herring';
      expect(has(c, 'herring-debunk-evidence-not-true')).toBe(true);
    });
  });

  describe('case-level rules', () => {
    it('missing title, setting, victim and victim details', () => {
      const c = goodCase();
      c.title = '';
      c.setting.name = '';
      c.victim.causeOfDeath = '';
      expect(has(c, 'title-missing')).toBe(true);
      expect(has(c, 'setting-missing')).toBe(true);
      expect(has(c, 'victim-details-missing')).toBe(true);
      c.victim.name = '';
      expect(has(c, 'victim-missing')).toBe(true);
    });
    it('extras suggestions are info-level', () => {
      const c = goodCase();
      c.extras.props = [];
      c.extras.miniGames = [];
      const found = checkCase(c).filter((i) => i.rule === 'no-props' || i.rule === 'no-minigames');
      expect(found).toHaveLength(2);
      expect(found.every((i) => i.severity === 'info')).toBe(true);
    });
  });

  describe('alibi timeline', () => {
    const grouped = () => {
      const c = goodCase(11, 8, 8);
      // an exact two-person pair (not a larger group), so moving one person's room creates exactly one conflict
      const a = c.characters.find((x) => x.alibiWithIds.length === 1 && (c.characters.find((y) => y.id === x.alibiWithIds[0]) as Case['characters'][number]).alibiWithIds.length === 1)!;
      const b = c.characters.find((x) => x.id === a.alibiWithIds[0])!;
      return { c, a, b };
    };
    it('a companion that does not reciprocate -> warning aimed at the companion', () => {
      const { c, a, b } = grouped();
      b.alibiWithIds = b.alibiWithIds.filter((i) => i !== a.id);
      const issue = checkCase(c).find((i) => i.rule === 'alibi-not-reciprocal');
      expect(issue?.severity).toBe('warning');
      expect(issue?.target).toEqual({ step: 'characters', entityId: b.id, field: 'alibiWithIds' });
    });
    it('companions who disagree on the room -> place conflict', () => {
      const { c, b } = grouped();
      b.alibiPlace = 'the moon';
      expect(has(c, 'alibi-place-conflict')).toBe(true);
    });
    it('a two-way place conflict is reported exactly once', () => {
      const { c, a, b } = grouped();
      expect(a.alibiWithIds).toContain(b.id);
      expect(b.alibiWithIds).toContain(a.id);
      b.alibiPlace = 'the moon';
      const conflicts = checkCase(c).filter((i) => i.rule === 'alibi-place-conflict');
      expect(conflicts).toHaveLength(1);
    });
    it('a one-way place conflict is reported exactly once', () => {
      const { c, a, b } = grouped();
      b.alibiWithIds = b.alibiWithIds.filter((i) => i !== a.id);
      b.alibiPlace = 'the moon';
      const conflicts = checkCase(c).filter((i) => i.rule === 'alibi-place-conflict');
      expect(conflicts).toHaveLength(1);
    });
    it('two unconnected characters claiming the same room -> place conflict', () => {
      const c = goodCase();
      const [x, y] = [innocentsOf(c)[0]!, killerOf(c)];
      x.alibiWithIds = [];
      y.alibiPlace = ` The ${x.alibiPlace.replace(/^the /i, '').toUpperCase()}`;
      expect(has(c, 'alibi-place-conflict')).toBe(true);
    });
    it('a companion who does not exist -> error', () => {
      const c = goodCase();
      c.characters[0]!.alibiWithIds = ['ghost'];
      expect(checkCase(c).find((i) => i.rule === 'alibi-companion-missing')?.severity).toBe('error');
    });
    it("an alibi at the scene of the crime -> info", () => {
      const c = goodCase();
      c.characters[0]!.alibiPlace = c.victim.placeOfDeath;
      expect(checkCase(c).find((i) => i.rule === 'alibi-at-scene')?.severity).toBe('info');
    });
    it('characters without structured alibi data are not flagged', () => {
      const c = goodCase();
      c.characters.forEach((x) => { x.alibiPlace = ''; x.alibiWithIds = []; });
      expect(rules(c).filter((r) => r.startsWith('alibi-'))).toEqual([]);
    });
  });

  describe('solvability', () => {
    it('warns when the killer is implicated far more than anyone else', () => {
      const c = goodCase();
      const k = killerOf(c);
      for (const e of c.evidence) e.implicatedIds = e.implicatedIds.filter((i) => i === k.id);
      for (let i = 0; i < 4; i++) c.evidence.push({ ...c.evidence[0]!, id: `x${i}`, veracity: 'true', implicatedIds: [k.id] });
      expect(checkCase(c).find((i) => i.rule === 'killer-too-obvious')?.severity).toBe('warning');
    });
    it('suggests not naming the killer alone in a clue', () => {
      const c = goodCase();
      const k = killerOf(c);
      c.evidence[0]!.veracity = 'true';
      c.evidence[0]!.description = `${k.name} did it.`;
      expect(checkCase(c).find((i) => i.rule === 'clue-names-killer')?.severity).toBe('info');
      c.evidence[0]!.description = `${k.name} and ${innocentsOf(c)[0]!.name} were seen arguing.`;
      expect(has(c, 'clue-names-killer')).toBe(false);
    });
  });

  it('counts issues overall and per wizard step', () => {
    const c = goodCase();
    killerOf(c).isKiller = false;
    c.beats = [];
    const issues = checkCase(c);
    const counts = countIssues(issues);
    expect(counts.error).toBeGreaterThanOrEqual(2);
    const byStep = issuesByStep(issues);
    expect(byStep.characters.error).toBeGreaterThanOrEqual(1);
    expect(byStep.timeline.error).toBeGreaterThanOrEqual(1);
  });

  it('issue ids are unique so they are safe React keys', () => {
    const c = goodCase();
    c.characters.forEach((ch) => (ch.alibi = ''));
    c.evidence.forEach((e) => (e.description = ''));
    const ids = checkCase(c).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('issue ids stay unique over many generated and deliberately broken cases', () => {
    const breakers: Array<(c: Case, n: number) => void> = [
      (c) => c.characters.forEach((ch) => (ch.alibi = '')),
      (c, n) => { c.characters[n % c.characters.length]!.alibiPlace = 'the moon'; },
      (c, n) => c.characters.forEach((ch, i) => { if (i % 2 === n % 2) ch.alibiPlace = `room ${i}`; }),
      (c) => c.characters.forEach((ch) => { ch.alibiWithIds = [...ch.alibiWithIds, ...ch.alibiWithIds, 'ghost', ch.id]; }),
      (c, n) => { const ch = c.characters[n % c.characters.length]!; ch.alibiWithIds = c.characters.filter((o) => o.id !== ch.id).map((o) => o.id); },
      (c) => c.characters.forEach((ch) => { ch.alibiWithIds = []; ch.alibiPlace = c.characters[0]!.alibiPlace; }),
      (c) => c.characters.forEach((ch) => { ch.relationships = [...ch.relationships, ...ch.relationships, { id: 'dup', targetId: 'nobody', label: 'x', visibility: 'private' }, { id: 'dup', targetId: ch.id, label: 'y', visibility: 'public' }]; }),
      (c) => c.evidence.forEach((e) => { e.implicatedIds = [...e.implicatedIds, 'ghost', 'ghost']; }),
      (c) => c.motives.forEach((m) => { m.evidenceIds = [...m.evidenceIds, 'ghost', 'ghost']; }),
      (c) => c.beats.forEach((b) => { b.evidenceIds = [...b.evidenceIds, 'ghost', 'ghost']; }),
      (c) => { c.characters.push(structuredClone(c.characters[0]!)); },
      (c) => { c.evidence.push(structuredClone(c.evidence[0]!)); c.beats.push(structuredClone(c.beats[0]!)); },
      (c) => { c.characters.forEach((ch) => (ch.isKiller = true)); },
      (c) => { c.beats = []; c.motives = []; },
    ];
    let checked = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const base = goodCase(seed, 4 + (seed % 5), 8 + (seed % 5));
      for (let n = 0; n < breakers.length; n++) {
        const c = structuredClone(base);
        breakers[n]!(c, seed);
        if (n % 3 === 0) breakers[(n + seed) % breakers.length]!(c, seed);
        const ids = checkCase(c).map((i) => i.id);
        expect(new Set(ids).size, `seed ${seed} breaker ${n}`).toBe(ids.length);
        checked++;
      }
      const ids = checkCase(base).map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(checked).toBeGreaterThan(500);
  });
});
