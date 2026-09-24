import { describe, expect, it } from 'vitest';
import { checkCase } from '../shared/checker';
import {
  addRedHerring,
  beatOfEvidence,
  duplicateCharacter,
  estimateRuntimeMinutes,
  moveItem,
  removeBeat,
  removeCharacter,
  removeEvidence,
  removeRedHerring,
  scheduleEvidence,
  setAlibiCompanions,
  setBeatEvidence,
  setEvidenceVeracity,
} from '../shared/ops';
import { goodCase, innocentsOf, killerOf } from './helpers';

describe('case operations', () => {
  it('moveItem reorders immutably', () => {
    const a = [1, 2, 3, 4];
    expect(moveItem(a, 0, 2)).toEqual([2, 3, 1, 4]);
    expect(moveItem(a, 3, 0)).toEqual([4, 1, 2, 3]);
    expect(moveItem(a, 1, 1)).toEqual(a);
    expect(a).toEqual([1, 2, 3, 4]);
  });

  it('deleting a character cascades to motives, relationships and clue implications', () => {
    const c = goodCase();
    const victim = innocentsOf(c)[0]!;
    const next = removeCharacter(c, victim.id);
    expect(next.characters.find((x) => x.id === victim.id)).toBeUndefined();
    expect(next.motives.some((m) => m.characterId === victim.id)).toBe(false);
    expect(next.characters.some((ch) => ch.relationships.some((r) => r.targetId === victim.id))).toBe(false);
    expect(next.evidence.some((e) => e.implicatedIds.includes(victim.id))).toBe(false);
    expect(checkCase(next).filter((i) => i.severity === 'error' && /exist/.test(i.message))).toEqual([]);
    expect(c.characters.length).toBe(next.characters.length + 1); // original untouched
  });

  it('deleting a character removes them from other characters\' alibi companions', () => {
    const c = goodCase(11, 8, 8);
    const a = c.characters.find((x) => x.alibiWithIds.length > 0)!;
    const gone = a.alibiWithIds[0]!;
    const next = removeCharacter(c, gone);
    expect(next.characters.some((x) => x.alibiWithIds.includes(gone))).toBe(false);
  });

  it('duplicating a character never copies the killer flag', () => {
    const c = goodCase();
    const next = duplicateCharacter(c, killerOf(c).id);
    expect(next.characters).toHaveLength(c.characters.length + 1);
    expect(next.characters.filter((x) => x.isKiller)).toHaveLength(1);
  });

  it('deleting evidence cleans motives, beats and red-herring records', () => {
    const c = goodCase();
    const rh = c.redHerrings[0]!;
    const next = removeEvidence(c, rh.evidenceId);
    expect(next.redHerrings.some((r) => r.id === rh.id)).toBe(false);
    expect(next.beats.some((b) => b.evidenceIds.includes(rh.evidenceId))).toBe(false);
    const debunk = rh.debunkEvidenceId!;
    const c2 = removeEvidence(c, debunk);
    expect(c2.redHerrings.find((r) => r.id === rh.id)!.debunkEvidenceId).toBeNull();
    const motiveClue = c.motives.find((m) => m.evidenceIds.length)!.evidenceIds[0]!;
    expect(removeEvidence(c, motiveClue).motives.some((m) => m.evidenceIds.includes(motiveClue))).toBe(false);
  });

  it('scheduling keeps a clue in at most one beat', () => {
    const c = goodCase();
    const ev = c.evidence[0]!;
    const target = c.beats.find((b) => !b.evidenceIds.includes(ev.id))!;
    const next = scheduleEvidence(c, ev.id, target.id);
    expect(next.beats.filter((b) => b.evidenceIds.includes(ev.id))).toHaveLength(1);
    expect(beatOfEvidence(next, ev.id)!.id).toBe(target.id);
    expect(beatOfEvidence(scheduleEvidence(next, ev.id, null), ev.id)).toBeNull();
    const stolen = setBeatEvidence(next, c.beats[0]!.id, [ev.id]);
    expect(stolen.beats.filter((b) => b.evidenceIds.includes(ev.id))).toHaveLength(1);
    expect(stolen.beats[0]!.evidenceIds).toEqual([ev.id]);
  });

  it('veracity toggling keeps the red-herring record in sync', () => {
    const c = goodCase();
    const ev = c.evidence.find((e) => e.veracity === 'true')!;
    const asHerring = setEvidenceVeracity(c, ev.id, 'red-herring');
    expect(asHerring.redHerrings.some((r) => r.evidenceId === ev.id)).toBe(true);
    const back = setEvidenceVeracity(asHerring, ev.id, 'true');
    expect(back.redHerrings.some((r) => r.evidenceId === ev.id)).toBe(false);
    expect(setEvidenceVeracity(asHerring, ev.id, 'red-herring').redHerrings).toHaveLength(asHerring.redHerrings.length);
  });

  it('adds and removes red herrings', () => {
    const c = goodCase();
    const { case: withNew, evidenceId, herringId } = addRedHerring(c);
    expect(withNew.evidence.find((e) => e.id === evidenceId)!.veracity).toBe('red-herring');
    expect(removeRedHerring(withNew, herringId, true).evidence.some((e) => e.id === evidenceId)).toBe(false);
    const kept = removeRedHerring(withNew, herringId, false);
    expect(kept.evidence.find((e) => e.id === evidenceId)!.veracity).toBe('true');
    expect(kept.redHerrings.some((r) => r.id === herringId)).toBe(false);
  });

  it('deleting a beat clears debunk references to it', () => {
    const c = goodCase();
    const rh = c.redHerrings[0]!;
    const next = removeBeat(c, rh.debunkBeatId!);
    expect(next.redHerrings.find((r) => r.id === rh.id)!.debunkBeatId).toBeNull();
    expect(next.beats).toHaveLength(c.beats.length - 1);
  });

  it('alibi companions stay mutual when edited', () => {
    const c = goodCase(11, 8, 8);
    const [a, b, x] = c.characters.filter((ch) => ch.alibiWithIds.length === 0 || true) as [typeof c.characters[0], typeof c.characters[0], typeof c.characters[0]];
    const linked = setAlibiCompanions(c, a.id, [b.id, x.id]);
    const get = (id: string) => linked.characters.find((ch) => ch.id === id)!;
    expect(get(b.id).alibiWithIds).toContain(a.id);
    expect(get(x.id).alibiWithIds).toContain(a.id);
    const unlinked = setAlibiCompanions(linked, a.id, [b.id]);
    expect(unlinked.characters.find((ch) => ch.id === x.id)!.alibiWithIds).not.toContain(a.id);
    expect(unlinked.characters.find((ch) => ch.id === b.id)!.alibiWithIds).toContain(a.id);
    expect(unlinked.characters.find((ch) => ch.id === a.id)!.alibiWithIds).toEqual([b.id]);
  });

  it('estimates a sensible runtime', () => {
    const c = goodCase();
    const est = estimateRuntimeMinutes(c);
    expect(est).toBeGreaterThanOrEqual(30);
    expect(est % 5).toBe(0);
  });
});
