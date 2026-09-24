import { describe, expect, it } from 'vitest';
import { buildGmPacket, buildPlayerPacket, HOUSE_RULES } from '../shared/export';
import { generateCase } from '../shared/generator/generate';
import { TONES, type Case } from '../shared/models';
import { deriveSolution } from '../shared/solution';
import { goodCase, killerOf } from './helpers';

/** Decorate every private field with a unique, greppable sentinel. */
function sentinelCase(): Case {
  const c = goodCase(31, 7, 7);
  c.characters.forEach((ch, i) => {
    ch.name = `Person${i}`;
    ch.publicBio = `PUBLICBIO_${i}`;
    ch.secretRole = `SECRETROLE_${i}`;
    ch.privateBackstory = `BACKSTORY_${i}`;
    ch.alibi = `ALIBI_${i}`;
    ch.secrets = [`SECRETA_${i}`, `SECRETB_${i}`];
    ch.costume = `COSTUME_${i}`;
    ch.accent = `ACCENT_${i}`;
    ch.relationships.forEach((r, j) => (r.label = `RELLABEL_${i}_${j}`));
  });
  c.motives.forEach((m) => {
    const i = c.characters.findIndex((x) => x.id === m.characterId);
    m.description = `MOTIVE_${i}_${m.id}`;
  });
  c.evidence.forEach((e, i) => {
    e.title = `CLUETITLE_${i}`;
    e.description = `CLUETEXT_${i}`;
  });
  c.redHerrings.forEach((r, i) => {
    r.whyPlausible = `WHYPLAUSIBLE_${i}`;
    r.debunkNote = `DEBUNKNOTE_${i}`;
  });
  c.beats.forEach((b, i) => {
    b.gmNotes = `GMNOTES_${i}`;
    b.description = `BEATDESC_${i}`;
  });
  return c;
}

describe('player packet: spoiler safety', () => {
  const c = sentinelCase();
  const packet = buildPlayerPacket(c);
  const killerIdx = c.characters.findIndex((x) => x.isKiller);

  it('builds one sheet per character', () => {
    expect(packet.sheets).toHaveLength(c.characters.length);
  });

  it("each sheet contains its owner's own info", () => {
    packet.sheets.forEach((s, i) => {
      const json = JSON.stringify(s);
      for (const own of [`BACKSTORY_${i}`, `ALIBI_${i}`, `SECRETA_${i}`, `SECRETB_${i}`, `SECRETROLE_${i}`, `COSTUME_${i}`, `ACCENT_${i}`, `PUBLICBIO_${i}`, `Person${i}`, `RELLABEL_${i}_0`]) {
        expect(json).toContain(own);
      }
      expect(json).toMatch(new RegExp(`MOTIVE_${i}_`));
    });
  });

  it("no sheet contains any other character's private information", () => {
    packet.sheets.forEach((s, i) => {
      const json = JSON.stringify(s);
      c.characters.forEach((_, j) => {
        if (j === i) return;
        for (const other of [`BACKSTORY_${j}`, `ALIBI_${j}`, `SECRETA_${j}`, `SECRETB_${j}`, `SECRETROLE_${j}`, `COSTUME_${j}`, `ACCENT_${j}`, `RELLABEL_${j}_`, `MOTIVE_${j}_`]) {
          expect(json, `sheet ${i} leaks ${other}`).not.toContain(other);
        }
      });
    });
  });

  it('the shared guest list shows only names and public bios', () => {
    expect(packet.guestList).toHaveLength(c.characters.length);
    for (const g of packet.guestList) expect(Object.keys(g).sort()).toEqual(['name', 'publicBio']);
    const json = JSON.stringify(packet.guestList);
    c.characters.forEach((_, i) => {
      for (const priv of [`BACKSTORY_${i}`, `ALIBI_${i}`, `SECRETA_${i}`, `SECRETROLE_${i}`, `COSTUME_${i}`, `RELLABEL_${i}_`, `MOTIVE_${i}_`]) expect(json).not.toContain(priv);
    });
    expect(packet.sheets.every((s) => !('roster' in s))).toBe(true);
  });

  it('no sheet carries killer status, red-herring flags, implicated lists, GM notes or the solution', () => {
    const forbidden = [/isKiller/i, /killer/i, /murderer/i, /red.?herring/i, /veracity/i, /implicat/i, /debunk/i, /whyPlausible/i, /gmNotes/i, /GMNOTES_/, /WHYPLAUSIBLE_/, /DEBUNKNOTE_/, /CLUETITLE_/, /solution/i];
    for (const s of packet.sheets) {
      const json = JSON.stringify(s);
      for (const f of forbidden) expect(json, `sheet ${s.name} matches ${f}`).not.toMatch(f);
    }
    // the killer's internal id never appears on anybody else's sheet
    packet.sheets.forEach((s, i) => {
      if (i !== killerIdx) expect(JSON.stringify(s)).not.toContain(c.characters[killerIdx]!.id);
    });
  });

  it("the killer's sheet is structurally indistinguishable from an innocent's", () => {
    const keys = packet.sheets.map((s) => Object.keys(s).join(','));
    expect(new Set(keys).size).toBe(1);
    // house rules are identical text for everybody, at packet level
    expect(packet.houseRules).toEqual([...HOUSE_RULES]);
  });

  it('clue handouts contain clue text and a neutral kind only', () => {
    expect(packet.handouts.length).toBe(c.evidence.length);
    for (const h of packet.handouts) {
      expect(Object.keys(h).sort()).toEqual(['kindLabel', 'number', 'text']);
      expect(h.text).toMatch(/^CLUETEXT_\d+$/);
      expect(['Physical evidence', 'Statement']).toContain(h.kindLabel);
    }
    const json = JSON.stringify(packet.handouts);
    for (const f of [/CLUETITLE_/, /red.?herring/i, /veracity/i, /implicat/i, /killer/i, /debunk/i, /GMNOTES/]) expect(json).not.toMatch(f);
  });

  it('numbers handouts in the order they enter play and skips blank clues', () => {
    const d = goodCase();
    d.evidence[0]!.description = '   ';
    const p = buildPlayerPacket(d);
    expect(p.handouts).toHaveLength(d.evidence.length - 1);
    expect(p.handouts.map((h) => h.number)).toEqual(p.handouts.map((_, i) => i + 1));
    const firstScheduled = d.beats.find((b) => b.evidenceIds.length)!.evidenceIds[0]!;
    expect(p.handouts[0]!.text).toBe(d.evidence.find((e) => e.id === firstScheduled)!.description);
  });

  it('holds for every generated scenario (all tones)', () => {
    for (const tone of TONES) {
      for (let seed = 1; seed <= 25; seed++) {
        const g = generateCase({ seed, tone, playerMin: 4, playerMax: 12 });
        const gp = buildPlayerPacket(g);
        const k = killerOf(g);
        gp.sheets.forEach((s) => {
          const json = JSON.stringify(s);
          const me = g.characters.find((x) => x.id === s.characterId)!;
          for (const other of g.characters) {
            if (other.id === me.id) continue;
            // (two characters can legitimately share a stock sentence, so only compare text that isn't also theirs)
            const mine = JSON.stringify(me);
            const leaks = (text: string) => text.length > 0 && !mine.includes(text) && json.includes(text);
            expect(leaks(other.privateBackstory)).toBe(false);
            expect(leaks(other.alibi)).toBe(false);
            for (const sec of other.secrets) expect(leaks(sec)).toBe(false);
          }
          if (!me.isKiller) {
            expect(json).not.toContain(k.privateBackstory);
            expect(json).not.toMatch(/who did it|is the one who did it/i);
          }
          expect(json).not.toMatch(/isKiller|red-herring|implicatedIds|debunk/);
        });
        for (const rh of g.redHerrings) {
          expect(JSON.stringify(gp.handouts)).not.toContain(rh.whyPlausible);
          expect(JSON.stringify(gp.handouts)).not.toContain(rh.debunkNote);
        }
        expect(JSON.stringify(gp)).not.toContain(g.beats.at(-1)!.gmNotes);
      }
    }
  });

  it('includes public setting and victim information', () => {
    expect(packet.victim.name).toBe(c.victim.name);
    expect(packet.setting.name).toBe(c.setting.name);
    expect(packet.playerRange).toBe('7 players');
  });

  it('drops relationships that point at deleted characters instead of leaking ids', () => {
    const d = goodCase();
    d.characters[0]!.relationships[0]!.targetId = 'ghost';
    const p = buildPlayerPacket(d);
    expect(p.sheets[0]!.relationships.every((r) => r.with !== 'Unknown character')).toBe(true);
  });
});

describe('GM packet', () => {
  it('contains the timeline with GM notes and the solution key', () => {
    const c = sentinelCase();
    const gm = buildGmPacket(c);
    expect(gm.timeline).toHaveLength(c.beats.length);
    expect(gm.timeline[0]!.gmNotes).toBe('GMNOTES_0');
    expect(gm.solution.killerName).toBe(killerOf(c).name);
    expect(gm.solution.herrings).toHaveLength(c.redHerrings.length);
    expect(gm.cast.find((x) => x.isKiller)?.name).toBe(killerOf(c).name);
  });
});

describe('solution key', () => {
  it('derives killer, motives, key evidence and debunk info', () => {
    const c = goodCase();
    const s = deriveSolution(c);
    expect(s.killerId).toBe(killerOf(c).id);
    expect(s.motives.length).toBeGreaterThan(0);
    expect(s.keyEvidence.length).toBeGreaterThanOrEqual(3);
    expect(s.herrings.every((h) => h.revealedIn && h.debunkedIn && h.debunkedBy && h.note)).toBe(true);
    expect(s.method).toContain(c.victim.timeOfDeath);
  });
  it('copes with a case that has no killer', () => {
    const c = goodCase();
    killerOf(c).isKiller = false;
    const s = deriveSolution(c);
    expect(s.killerId).toBeNull();
    expect(s.keyEvidence).toEqual([]);
  });
});
