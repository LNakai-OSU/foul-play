import { describe, expect, it } from 'vitest';
import { generateCase } from '../shared/generator/generate';
import { SETTINGS } from '../shared/generator/settings';
import type { Case, Tone } from '../shared/models';
import { firstPerson, paginate, wrapText } from '../src/game/text';
import { blockedAt, buildWorld, reachable } from '../src/game/world';
import {
  advanceChapter,
  askAlibi,
  askNight,
  chapterReady,
  collect,
  computeRank,
  judge,
  killerMotive,
  motiveChoices,
  newState,
  sanitize,
  unlockedEvidence,
  unplayableReason,
} from '../src/game/logic';
import { goodCase } from './helpers';
import type { MapDef } from '../src/game/types';
import { kindOf, isSolidKind } from '../src/game/tiles';

const TONES: Tone[] = ['comedic', 'serious', 'noir'];

function cases(perSetting = 2): Case[] {
  const out: Case[] = [];
  for (const s of SETTINGS) for (const tone of TONES) for (let i = 0; i < perSetting; i++) out.push(generateCase({ seed: 1000 + i * 37 + s.id.length, tone, settingId: s.id, playerMin: 4 + i * 4, playerMax: 6 + i * 6 }));
  return out;
}

describe('world builder', () => {
  const all = cases();

  it('every room, door, suspect and clue is reachable on foot', () => {
    for (const c of all) {
      const w = buildWorld(c);
      const hub = w.maps[w.hubId] as MapDef;
      const seen = reachable(hub, hub.entrance.x, hub.entrance.y);
      expect(hub.npcs.some((n) => n.kind === 'inspector')).toBe(true);
      for (const warp of hub.warps) {
        // some neighbour of the door is reachable on foot (doors can sit in any wall)
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${warp.x + dx!},${warp.y + dy!}`));
        expect(near, `${c.title}: doorstep of ${warp.to}`).toBe(true);
      }
      for (const map of Object.values(w.maps)) {
        if (map.id === w.hubId) continue;
        const ok = reachable(map, map.entrance.x, map.entrance.y);
        for (const n of map.npcs) {
          const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ok.has(`${n.x + dx!},${n.y + dy!}`));
          expect(near, `${c.title}: ${n.name} in ${map.name}`).toBe(true);
        }
        for (const it of map.items) {
          const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ok.has(`${it.x + dx!},${it.y + dy!}`));
          expect(near, `${c.title}: clue ${it.evidenceId} in ${map.name}`).toBe(true);
        }
        const warp = map.warps[0];
        expect(warp && ok.has(`${warp.x},${warp.y}`), `${c.title}: exit of ${map.name}`).toBe(true);
      }
    }
  });

  it('gives every clue exactly one home and every suspect a room', () => {
    for (const c of all) {
      const w = buildWorld(c);
      for (const e of w.c.evidence) {
        const item = Boolean(w.itemMap[e.id]);
        const tip = Boolean(w.tipGiver[e.id]);
        expect(item !== tip, `${c.title}: ${e.id} needs exactly one home`).toBe(true);
      }
      for (const ch of c.characters) expect(w.charMap[ch.id], `${c.title}: ${ch.name}`).toBeTruthy();
      const inChapters = w.chapters.flatMap((x) => x.evidenceIds);
      expect(new Set(inChapters).size).toBe(inChapters.length);
      expect(new Set(inChapters)).toEqual(new Set(w.c.evidence.filter((e) => !w.hidden.includes(e.id)).map((e) => e.id)));
    }
  });

  it('puts the body in the crime scene room and never a suspect there', () => {
    for (const c of all) {
      const w = buildWorld(c);
      const scene = w.maps[w.sceneMapId] as MapDef;
      expect(scene.npcs.some((n) => n.kind === 'body')).toBe(true);
      expect(scene.npcs.filter((n) => n.kind === 'suspect')).toHaveLength(0);
    }
  });

  it('is deterministic', () => {
    const c = goodCase(5, 6, 8);
    expect(JSON.stringify(buildWorld(c).maps)).toBe(JSON.stringify(buildWorld(structuredClone(c)).maps));
  });

  it('does not put solid things on door mats or entrances', () => {
    for (const c of all.slice(0, 20)) {
      const w = buildWorld(c);
      for (const map of Object.values(w.maps)) {
        expect(blockedAt(map, map.entrance.x, map.entrance.y), `${map.name} entrance`).toBe(false);
        for (const wp of map.warps) expect(isSolidKind(kindOf(map.over[wp.y * map.w + wp.x] as number)), `${map.name} warp tile`).toBe(false);
      }
    }
  });

  it('survives a hand-built case with no rooms, beats or evidence', () => {
    const c = goodCase(3, 5, 5);
    const bare: Case = { ...c, characters: [], evidence: [], beats: [], motives: [], redHerrings: [], victim: { ...c.victim, placeOfDeath: '' } };
    const w = buildWorld(bare);
    expect(Object.keys(w.maps).length).toBeGreaterThanOrEqual(5);
    expect(w.chapters).toHaveLength(1);
  });
});

describe('game rules', () => {
  it('is solvable: every clue can be collected, the killer can be broken in the showdown', () => {
    for (const c of cases(1)) {
      const w = buildWorld(c);
      const s = newState(w);
      // walk the whole story
      let guard = 0;
      while (guard++ < 50) {
        for (const id of unlockedEvidence(w, s)) collect(w, s, id);
        if (!advanceChapter(w, s)) break;
      }
      for (const id of unlockedEvidence(w, s)) collect(w, s, id);
      expect(s.found.length, `${c.title}: all clues collectable`).toBe(w.c.evidence.length - w.hidden.length);
      expect(judge(w, w.killerId as string, killerMotive(w))).toBe('correct');
      expect(computeRank(w, s).rank).toBe('S');
    }
  });

  it('chapters unlock only when enough is found', () => {
    const c = goodCase(11, 6, 6);
    const w = buildWorld(c);
    const s = newState(w);
    if (w.chapters.length < 2) return;
    const first = unlockedEvidence(w, s);
    if (first.length > 1) expect(chapterReady(w, s)).toBe(false);
    for (const id of first) collect(w, s, id);
    expect(chapterReady(w, s)).toBe(true);
    const ch = advanceChapter(w, s);
    expect(ch).toBeTruthy();
    expect(s.chapter).toBe(1);
  });

  it('unlocked clues only include already-fired chapters', () => {
    const w = buildWorld(goodCase(11, 6, 6));
    const s = newState(w);
    const later = w.chapters.slice(1).flatMap((x) => x.evidenceIds);
    for (const id of unlockedEvidence(w, s)) expect(later).not.toContain(id);
  });

  it('verbal clues arrive one at a time, and only once their chapter has started', () => {
    for (const c of cases(1)) {
      const w = buildWorld(c);
      const s = newState(w);
      for (const [charId, ids] of Object.entries(w.tips)) {
        const seen: string[] = [];
        for (let i = 0; i < ids.length + 2; i++) {
          const r = askNight(w, s, charId);
          seen.push(...r.found);
        }
        // whatever is unlocked has been told, nothing locked leaked
        for (const id of seen) expect(unlockedEvidence(w, s)).toContain(id);
      }
    }
  });

  it('a verbal clue that is locked when first asked is still told later', () => {
    let spanning = 0;
    // Regression: telling a later clue first used to skip an earlier locked one forever.
    for (const c of cases(1)) {
      const w = buildWorld(c);
      const s = newState(w);
      const askAll = () => Object.keys(w.tips).forEach((id) => Array.from({ length: 6 }).forEach(() => askNight(w, s, id)));
      askAll();
      s.chapter = w.chapters.length - 1;
      askAll();
      const verbal = c.evidence.filter((e) => w.tipGiver[e.id]).map((e) => e.id);
      expect(verbal.filter((id) => !s.found.includes(id)), `${c.title}: untold verbal clues`).toEqual([]);
      for (const ids of Object.values(w.tips)) {
        const chapters = new Set(ids.map((id) => w.chapters.findIndex((ch) => ch.evidenceIds.includes(id))));
        if (chapters.size > 1) spanning++;
      }
    }
    // the scenario the regression is about must actually occur in this matrix
    expect(spanning).toBeGreaterThan(0);
  });

  it('motive choices always contain the true motive exactly once', () => {
    for (const c of cases(1)) {
      const w = buildWorld(c);
      const ch = motiveChoices(w);
      expect(ch).toHaveLength(4);
      expect(new Set(ch).size).toBe(4);
      expect(ch).toContain(killerMotive(w));
    }
    const c = goodCase(9, 6, 6);
    const w = buildWorld(c);
    expect(judge(w, c.characters.find((x) => !x.isKiller)!.id, killerMotive(w))).toBe('wrong-suspect');
    const wrong = motiveChoices(w).find((m) => m !== killerMotive(w))!;
    expect(judge(w, w.killerId as string, wrong)).toBe('wrong-motive');
  });

  it('ranks by strikes and evidence', () => {
    const w = buildWorld(goodCase(11, 6, 6));
    const s = newState(w);
    expect(computeRank(w, s).rank).toBe('A'); // nothing found, no strikes
    s.strikes = 3;
    expect(computeRank(w, s).rank).toBe('C');
    s.strikes = 0;
    for (const e of w.c.evidence) if (!w.hidden.includes(e.id)) s.found.push(e.id);
    expect(computeRank(w, s).rank).toBe('S');
    s.misses = 4;
    expect(computeRank(w, s).rank).toBe('A');
    s.hintsUsed = 4;
    expect(computeRank(w, s).rank).toBe('B');
  });

  it('repairs a stale save when the case has changed', () => {
    const w = buildWorld(goodCase(11, 6, 6));
    const s = newState(w);
    s.found.push('ev_gone');
    s.map = 'room:nowhere';
    s.chapter = 99;
    const fixed = sanitize(w, s);
    expect(fixed.found).not.toContain('ev_gone');
    expect(fixed.map).toBe(w.hubId);
    expect(fixed.chapter).toBe(w.chapters.length - 1);
  });
});

describe('playability', () => {
  it('says what a half-built case is missing', () => {
    const c = goodCase(11, 6, 6);
    expect(unplayableReason(c)).toBeNull();
    expect(unplayableReason({ ...c, characters: c.characters.slice(0, 1) })).toMatch(/two characters/);
    expect(unplayableReason({ ...c, characters: c.characters.map((x) => ({ ...x, isKiller: false })) })).toMatch(/killer/);
    expect(unplayableReason({ ...c, evidence: [] })).toMatch(/evidence/);
  });
});

describe('speech text', () => {
  it('wraps and paginates without losing words', () => {
    const t = 'The quick brown fox jumps over the lazy dog and keeps on running through the manor grounds until midnight.';
    const lines = wrapText(t, 20);
    expect(lines.every((l) => l.length <= 20)).toBe(true);
    expect(lines.join(' ')).toBe(t);
    expect(paginate(t, 20, 2).length).toBe(Math.ceil(lines.length / 2));
    expect(wrapText('Supercalifragilisticexpialidocious', 10).every((l) => l.length <= 10)).toBe(true);
  });

  it('turns second-person alibis into first person', () => {
    expect(firstPerson('From 8:55 PM, you and Gwendolyn Godfrey were in the commissary, rehearsing a toast.')).toBe('From 8:55 PM, Gwendolyn Godfrey and I were in the commissary, rehearsing a toast.');
    expect(firstPerson('You insist you took a walk and were sitting alone. Nobody saw you there.')).toBe('I insist I took a walk and was sitting alone. Nobody saw me there.');
    expect(firstPerson('You spent your evening on your own.')).toBe('I spent my evening on my own.');
  });

  it('leaves no second-person pronouns in any generated alibi or secret', () => {
    const bad: string[] = [];
    for (const c of cases(2)) {
      const w = buildWorld(c);
      const s = newState(w);
      for (const ch of c.characters) {
        for (const line of [...askAlibi(w, s, ch.id).map((l) => l.text), ...ch.secrets.map(firstPerson)]) {
          if (/\byou(r|rs|rself)?\b/i.test(line) || /(^|[.!?]\s)I (were|is)\b/.test(line) || /\band were\b/.test(line)) bad.push(line);
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});
