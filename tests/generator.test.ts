import { describe, expect, it } from 'vitest';
import { checkCase } from '../shared/checker';
import { generateCase, listSettings } from '../shared/generator/generate';
import { parseCase, TONES, type Case } from '../shared/models';
import { deriveSolution } from '../shared/solution';

const RANGES: [number, number][] = [
  [3, 3],
  [3, 5],
  [4, 6],
  [6, 8],
  [8, 10],
  [10, 14],
  [14, 14],
];

describe('generator: internal consistency', () => {
  it('produces ZERO checker errors or warnings across many seeds, tones, settings and player ranges', () => {
    let runs = 0;
    for (const tone of TONES) {
      for (const [playerMin, playerMax] of RANGES) {
        for (let seed = 1; seed <= 60; seed++) {
          const c = generateCase({ seed, tone, playerMin, playerMax });
          const bad = checkCase(c).filter((i) => i.severity !== 'info');
          if (bad.length) throw new Error(`seed=${seed} tone=${tone} ${playerMin}-${playerMax}: ${bad.map((b) => b.rule + ': ' + b.message).join(' | ')}`);
          runs++;
        }
      }
    }
    expect(runs).toBe(TONES.length * RANGES.length * 60);
  });

  it('is clean for every setting individually', () => {
    for (const s of listSettings()) {
      for (const tone of TONES) {
        for (let seed = 100; seed < 115; seed++) {
          const c = generateCase({ seed, tone, settingId: s.id, playerMin: 5, playerMax: 9 });
          expect(checkCase(c).filter((i) => i.severity !== 'info'), `${s.id}/${tone}/${seed}`).toEqual([]);
        }
      }
    }
  });

  it('always yields exactly one killer, with a strong motive and genuine clues', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const c = generateCase({ seed, tone: 'serious', playerMin: 5, playerMax: 9 });
      const killers = c.characters.filter((x) => x.isKiller);
      expect(killers).toHaveLength(1);
      const k = killers[0]!;
      expect(c.motives.some((m) => m.characterId === k.id && m.strength === 'strong')).toBe(true);
      expect(c.evidence.filter((e) => e.veracity === 'true' && e.implicatedIds.includes(k.id)).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('every red herring is debunked strictly after it is revealed', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const c = generateCase({ seed, tone: 'comedic', playerMin: 4, playerMax: 12 });
      expect(c.redHerrings.length).toBeGreaterThanOrEqual(2);
      for (const rh of c.redHerrings) {
        const reveal = c.beats.findIndex((b) => b.evidenceIds.includes(rh.evidenceId));
        const debunk = c.beats.findIndex((b) => b.id === rh.debunkBeatId);
        expect(reveal).toBeGreaterThanOrEqual(0);
        expect(debunk).toBeGreaterThan(reveal);
      }
    }
  });

  it('schedules every clue in exactly one beat', () => {
    const c = generateCase({ seed: 9, tone: 'noir', playerMin: 8, playerMax: 8 });
    for (const e of c.evidence) expect(c.beats.filter((b) => b.evidenceIds.includes(e.id))).toHaveLength(1);
  });

  it('leaves no unresolved {placeholders} or stray undefined in any text', () => {
    for (const tone of TONES) {
      for (let seed = 1; seed <= 120; seed++) {
        const json = JSON.stringify(generateCase({ seed, tone, playerMin: 3, playerMax: 14 }));
        expect(json).not.toMatch(/\{\w+\}/);
        expect(json).not.toMatch(/undefined|NaN|\[object/);
      }
    }
  });

  it('outputs data that the server-side schema accepts', () => {
    const c = generateCase({ seed: 5 });
    expect(parseCase(c).ok).toBe(true);
  });
});

describe('generator: respects options', () => {
  it('is deterministic per seed (aside from timestamps) and varies between seeds', () => {
    const strip = (c: Case) => JSON.stringify({ ...c, createdAt: '', updatedAt: '' });
    expect(strip(generateCase({ seed: 77, tone: 'noir' }))).toBe(strip(generateCase({ seed: 77, tone: 'noir' })));
    const titles = new Set<string>();
    const killerNames = new Set<string>();
    const settings = new Set<string>();
    const victims = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const c = generateCase({ seed, tone: 'noir' });
      titles.add(c.title);
      settings.add(c.setting.name);
      victims.add(c.victim.name);
      killerNames.add(c.characters.find((x) => x.isKiller)!.name);
    }
    expect(titles.size).toBeGreaterThan(30);
    expect(settings.size).toBeGreaterThanOrEqual(8);
    expect(victims.size).toBeGreaterThan(50);
    expect(killerNames.size).toBeGreaterThan(50);
  });

  it('generates a character count inside the requested player range', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const c = generateCase({ seed, playerMin: 5, playerMax: 9 });
      expect(c.characters.length).toBeGreaterThanOrEqual(5);
      expect(c.characters.length).toBeLessThanOrEqual(9);
      expect(c.playerMin).toBe(5);
      expect(c.playerMax).toBe(9);
    }
    expect(generateCase({ seed: 3, playerMin: 7, playerMax: 7 }).characters).toHaveLength(7);
  });

  it('clamps out-of-range player counts', () => {
    const c = generateCase({ seed: 3, playerMin: 1, playerMax: 99 });
    expect(c.playerMin).toBe(3);
    expect(c.playerMax).toBe(14);
  });

  it('honours the chosen setting', () => {
    for (const s of listSettings()) {
      const c = generateCase({ seed: 21, settingId: s.id });
      expect(c.setting.era).toBe(s.era);
    }
    const a = generateCase({ seed: 21, settingId: 'liner' });
    const b = generateCase({ seed: 21, settingId: 'lodge' });
    expect(a.setting.name).not.toBe(b.setting.name);
  });

  it('adapts wording to the tone', () => {
    const sample = (tone: 'comedic' | 'serious' | 'noir') => {
      const c = generateCase({ seed: 8, tone, settingId: 'manor', playerMin: 6, playerMax: 6 });
      return { c, beats: c.beats.map((b) => b.title).join('|'), desc: c.beats.map((b) => b.description).join('|') };
    };
    const comedic = sample('comedic');
    const serious = sample('serious');
    const noir = sample('noir');
    expect(new Set([comedic.beats, serious.beats, noir.beats]).size).toBe(3);
    expect(comedic.c.tone).toBe('comedic');
    expect(new Set([comedic.c.setting.description, serious.c.setting.description, noir.c.setting.description]).size).toBe(3);
    // comedic surnames are punny; serious ones are not
    expect(comedic.c.characters.some((ch) => /(?:snatch|worth|wick|bottom|patch|thorpe|snort|dink|whistle|brook|buck|grass|sticks|doodle|squeak|bag|tree|thumb|tumbledown|Muddlecombe|Ninnyhammer|Poppycock|Quackenbush|Zigzag|Gooseberry|Crabapple|Lollygag|Mudgeon|Sprocket|Hootenanny|Gadabout|Nettlebed|Toadflax|Blunderbuss|McMuffin)/i.test(ch.name))).toBe(true);
  });

  it('includes all three beat trigger types and a solution beat', () => {
    const c = generateCase({ seed: 12 });
    expect(new Set(c.beats.map((b) => b.trigger))).toEqual(new Set(['manual', 'timer', 'player-action']));
    expect(c.beats.at(-1)!.gmNotes).toContain(deriveSolution(c).killerName!);
  });

  it('fills entertainment extras', () => {
    const c = generateCase({ seed: 12, tone: 'comedic' });
    expect(c.extras.props.length).toBeGreaterThanOrEqual(6);
    expect(c.extras.miniGames.length).toBeGreaterThanOrEqual(2);
    expect(c.extras.difficulty).toBeGreaterThanOrEqual(1);
    expect(c.extras.runtimeMinutes).toBeGreaterThan(30);
    expect(c.characters.every((ch) => ch.costume && ch.accent)).toBe(true);
  });

  it('keeps identity when regenerating over an existing case', () => {
    const c = generateCase({ seed: 1 }, { id: 'case_keepme', createdAt: '2020-01-01T00:00:00.000Z' });
    expect(c.id).toBe('case_keepme');
    expect(c.createdAt).toBe('2020-01-01T00:00:00.000Z');
  });
});
