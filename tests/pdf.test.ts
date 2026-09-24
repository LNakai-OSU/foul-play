import { describe, expect, it } from 'vitest';
import { buildGmPacket, buildPlayerPacket, sheetSections } from '../shared/export';
import { buildGmPdf, buildHandoutsPdf, buildSheetsPdf, pdfBytes, pdfSafe } from '../shared/pdf';
import { goodCase, killerOf } from './helpers';

const asText = (doc: ReturnType<typeof buildSheetsPdf>) => doc.output();

describe('PDF export', () => {
  const c = goodCase(31, 6, 6);
  c.characters.forEach((ch, i) => {
    ch.secrets = [`ZZSECRET${i}Q`];
    ch.privateBackstory = `ZZBACKSTORY${i}Q`;
    ch.alibi = `ZZALIBI${i}Q`;
  });
  const packet = buildPlayerPacket(c);

  it('produces valid PDF files', () => {
    for (const doc of [buildSheetsPdf(packet), buildHandoutsPdf(packet), buildGmPdf(buildGmPacket(c))]) {
      const bytes = pdfBytes(doc);
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
      expect(bytes.length).toBeGreaterThan(1500);
    }
  });

  it('gives every character at least one page and starts each on a new page', () => {
    expect(buildSheetsPdf(packet).getNumberOfPages()).toBeGreaterThanOrEqual(packet.sheets.length);
    expect(buildSheetsPdf(packet, packet.sheets[0]!.characterId).getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("a single character's PDF contains only their own secrets", () => {
    packet.sheets.forEach((s, i) => {
      const text = asText(buildSheetsPdf(packet, s.characterId));
      expect(text).toContain(`ZZSECRET${i}Q`);
      expect(text).toContain(`ZZBACKSTORY${i}Q`);
      packet.sheets.forEach((_, j) => {
        if (j === i) return;
        expect(text).not.toContain(`ZZSECRET${j}Q`);
        expect(text).not.toContain(`ZZBACKSTORY${j}Q`);
        expect(text).not.toContain(`ZZALIBI${j}Q`);
      });
      expect(text).not.toMatch(/killer|red herring|solution/i);
    });
  });

  it('the handout PDF contains clue text but no spoiler vocabulary or titles', () => {
    const text = asText(buildHandoutsPdf(packet));
    expect(text).toContain(packet.handouts[0]!.text.slice(0, 20).replace(/[()\\]/g, ''));
    expect(text).not.toMatch(/killer|red herring|red-herring|debunk|implicat/i);
    for (const rh of c.redHerrings) expect(text).not.toContain(rh.debunkNote.slice(0, 30));
  });

  it('the GM PDF names the killer', () => {
    const text = asText(buildGmPdf(buildGmPacket(c)));
    expect(text).toContain(killerOf(c).name.split(' ')[0]!);
    expect(text).toMatch(/SOLUTION KEY/i);
  });

  it('paginates 8 handout cards per page', () => {
    const many = { ...packet, handouts: Array.from({ length: 17 }, (_, i) => ({ number: i + 1, kindLabel: 'Physical evidence', text: `Card ${i + 1}` })) };
    expect(buildHandoutsPdf(many).getNumberOfPages()).toBe(3);
  });

  it('copes with unusual characters and empty cases', () => {
    expect(pdfSafe('“Curly” — dash … ✓ émigré')).toBe('"Curly" - dash ... ? émigré');
    const p2 = buildPlayerPacket({ ...c, characters: [], evidence: [], beats: [], motives: [], redHerrings: [] });
    expect(() => buildSheetsPdf(p2)).not.toThrow();
    expect(() => buildHandoutsPdf(p2)).not.toThrow();
  });

  it('sheet sections are identical for every character (nothing extra for the killer)', () => {
    const headings = packet.sheets.map((s) => sheetSections(s).map((x) => x.heading).join('|'));
    expect(new Set(headings).size).toBe(1);
  });
});
