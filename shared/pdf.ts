/**
 * PDF generation (jsPDF, runs in the browser AND in Node for tests).
 * Renders ONLY from the already spoiler-filtered packets produced by
 * shared/export.ts, never from the raw Case.
 */
import { jsPDF } from 'jspdf';
import { sheetSections, type CharacterSheet, type ClueCard, type GmPacket, type PlayerPacket } from './export';

const PAGE = { w: 612, h: 792, margin: 54 };
const INK: [number, number, number] = [28, 24, 22];
const MUTED: [number, number, number] = [110, 100, 92];
const ACCENT: [number, number, number] = [138, 92, 20];

/** jsPDF's built-in fonts are Latin-1: fold everything else to something printable. */
export function pdfSafe(input: string): string {
  return input
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•●]/g, '*')
    .replace(/ /g, ' ')
    .replace(/[^\n\t\x20-\x7E¡-ÿ]/g, '?');
}

class Page {
  y = PAGE.margin;
  constructor(readonly doc: jsPDF) {}

  get width() {
    return PAGE.w - PAGE.margin * 2;
  }

  newPage() {
    this.doc.addPage();
    this.y = PAGE.margin;
  }

  ensure(height: number) {
    if (this.y + height > PAGE.h - PAGE.margin) this.newPage();
  }

  space(pts: number) {
    this.y += pts;
  }

  rule(color: [number, number, number] = MUTED) {
    this.doc.setDrawColor(...color).setLineWidth(0.6).line(PAGE.margin, this.y, PAGE.w - PAGE.margin, this.y);
    this.y += 8;
  }

  text(
    raw: string,
    o: { size?: number; font?: 'times' | 'helvetica' | 'courier'; style?: 'normal' | 'bold' | 'italic'; color?: [number, number, number]; indent?: number; gap?: number; align?: 'left' | 'center' } = {},
  ) {
    const size = o.size ?? 11;
    const indent = o.indent ?? 0;
    const doc = this.doc;
    doc.setFont(o.font ?? 'times', o.style ?? 'normal').setFontSize(size);
    doc.setTextColor(...(o.color ?? INK));
    const lines = doc.splitTextToSize(pdfSafe(raw), this.width - indent) as string[];
    const lh = size * 1.32;
    for (const line of lines) {
      this.ensure(lh);
      const x = o.align === 'center' ? PAGE.w / 2 : PAGE.margin + indent;
      doc.text(line, x, this.y + size, o.align === 'center' ? { align: 'center' } : undefined);
      this.y += lh;
    }
    this.y += o.gap ?? 4;
  }

  heading(raw: string) {
    this.ensure(30);
    this.space(4);
    this.text(raw.toUpperCase(), { font: 'helvetica', style: 'bold', size: 7.5, color: ACCENT, gap: 1 });
  }

  bullets(items: string[], size = 10.5) {
    for (const item of items) {
      const doc = this.doc;
      doc.setFont('times', 'normal').setFontSize(size);
      const lines = doc.splitTextToSize(pdfSafe(item), this.width - 16) as string[];
      const lh = size * 1.32;
      lines.forEach((line, i) => {
        this.ensure(lh);
        doc.setTextColor(...INK);
        if (i === 0) doc.text('*', PAGE.margin + 4, this.y + size);
        doc.text(line, PAGE.margin + 16, this.y + size);
        this.y += lh;
      });
      this.y += 1;
    }
    this.y += 1;
  }
}

function newDoc(title: string): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: false });
  doc.setProperties({ title: pdfSafe(title), creator: 'Foul Play', subject: 'Murder mystery party kit' });
  return doc;
}

function drawSheet(p: Page, packet: PlayerPacket, sheet: CharacterSheet) {
  p.text(`${packet.title}  |  ${packet.setting.name}  |  ${packet.playerRange}`.toUpperCase(), { font: 'helvetica', size: 7, color: MUTED, gap: 6 });
  p.text('CHARACTER SHEET - FOR YOUR EYES ONLY', { font: 'helvetica', style: 'bold', size: 7.5, color: ACCENT, gap: 1 });
  p.text(sheet.name || 'Unnamed character', { style: 'bold', size: 26, gap: 0 });
  p.rule(ACCENT);

  for (const section of sheetSections(sheet)) {
    p.heading(section.heading);
    if (section.text) p.text(section.text, { size: 10.5, gap: 2 });
    if (section.items) p.bullets(section.items, 10.5);
  }
  p.space(6);
  p.text('The guest list, the scene of the crime and the house rules are on the shared table card.', { font: 'helvetica', size: 7.5, color: MUTED, gap: 0 });
}

/** The shared table card: scene, public guest list, dress code and house rules. */
function drawTableCard(p: Page, packet: PlayerPacket) {
  p.text(`${packet.title}  |  ${packet.setting.name}  |  ${packet.playerRange}`.toUpperCase(), { font: 'helvetica', size: 7, color: MUTED, gap: 6 });
  p.text('TABLE CARD - SHARED, EVERYONE MAY READ IT', { font: 'helvetica', style: 'bold', size: 7.5, color: ACCENT, gap: 1 });
  p.text(packet.title || 'Untitled mystery', { style: 'bold', size: 24, gap: 0 });
  p.rule(ACCENT);
  if (packet.setting.description) p.text(packet.setting.description, { style: 'italic', size: 10.5, gap: 2 });
  p.heading('The victim');
  const v = packet.victim;
  p.text(`${v.name}. ${v.description}`.trim(), { size: 10.5, gap: 2 });
  const facts = [v.causeOfDeath && `Found: ${v.causeOfDeath}`, v.placeOfDeath && `Place: ${v.placeOfDeath}`, v.timeOfDeath && `Time: ${v.timeOfDeath}`].filter(Boolean) as string[];
  if (facts.length) p.text(facts.join('   |   '), { size: 9.5, color: MUTED, gap: 2 });
  p.heading('The guests (public knowledge)');
  for (const g of packet.guestList) p.text(`${g.name}: ${g.publicBio}`, { size: 9.5, gap: 3 });
  if (packet.dressCode.length) {
    p.heading('Dress code');
    p.bullets(packet.dressCode, 9.5);
  }
  p.heading('House rules');
  p.bullets(packet.houseRules, 9.5);
}

/** The shared table card first, then one sheet per character (or just one character's sheet). */
export function buildSheetsPdf(packet: PlayerPacket, characterId?: string, opts: { tableCard?: boolean } = {}): jsPDF {
  const doc = newDoc(`${packet.title} - character sheets`);
  const sheets = characterId ? packet.sheets.filter((s) => s.characterId === characterId) : packet.sheets;
  const withCard = opts.tableCard ?? !characterId;
  let first = true;
  const nextPage = () => {
    if (!first) doc.addPage();
    first = false;
  };
  if (withCard) {
    nextPage();
    drawTableCard(new Page(doc), packet);
  }
  for (const sheet of sheets) {
    nextPage();
    drawSheet(new Page(doc), packet, sheet);
  }
  if (first) new Page(doc).text('No characters yet.', { size: 14 });
  return doc;
}

/** Clue handouts: cut-apart cards, 2 x 4 per page, dashed cut lines. */
export function buildHandoutsPdf(packet: PlayerPacket): jsPDF {
  const doc = newDoc(`${packet.title} - clue handouts`);
  const cols = 2;
  const rows = 4;
  const m = 36;
  const cw = (PAGE.w - m * 2) / cols;
  const ch = (PAGE.h - m * 2) / rows;
  const cards: ClueCard[] = packet.handouts;
  if (cards.length === 0) new Page(doc).text('No clues yet.', { size: 14 });
  cards.forEach((card, i) => {
    const slot = i % (cols * rows);
    if (i > 0 && slot === 0) doc.addPage();
    const x = m + (slot % cols) * cw;
    const y = m + Math.floor(slot / cols) * ch;
    doc.setDrawColor(...MUTED).setLineWidth(0.7).setLineDashPattern([5, 4], 0).rect(x, y, cw, ch);
    doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...ACCENT);
    doc.text(pdfSafe(`CLUE ${card.number}  |  ${card.kindLabel.toUpperCase()}`), x + 16, y + 26);
    doc.setDrawColor(...ACCENT).setLineWidth(0.5).line(x + 16, y + 34, x + cw - 16, y + 34);
    doc.setFont('times', 'normal').setFontSize(12.5).setTextColor(...INK);
    const lines = (doc.splitTextToSize(pdfSafe(card.text), cw - 32) as string[]).slice(0, 8);
    doc.text(lines, x + 16, y + 56, { lineHeightFactor: 1.35 });
    doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(...MUTED);
    doc.text(pdfSafe(packet.title.toUpperCase()), x + 16, y + ch - 12);
  });
  return doc;
}

/** GM packet: run-sheet, timeline with notes, cast list and solution key. */
export function buildGmPdf(gm: GmPacket): jsPDF {
  const doc = newDoc(`${gm.title} - game master packet`);
  const p = new Page(doc);
  p.text('GAME MASTER PACKET - CONTAINS SPOILERS', { font: 'helvetica', style: 'bold', size: 8, color: ACCENT, gap: 2 });
  p.text(gm.title || 'Untitled mystery', { style: 'bold', size: 26, gap: 2 });
  p.text(`${gm.setting.name}${gm.setting.era ? ` (${gm.setting.era})` : ''}  |  about ${gm.runtimeMinutes} min  |  difficulty ${gm.difficulty}/5`, { font: 'helvetica', size: 9, color: MUTED });
  p.rule(ACCENT);

  p.heading('Solution key');
  const s = gm.solution;
  p.text(`Killer: ${s.killerName ?? 'nobody marked!'}`, { style: 'bold', size: 15 });
  p.text(`Victim: ${gm.victim.name}. ${s.method}.`, { size: 11 });
  for (const m of s.motives) p.text(`Motive (${m.category}, ${m.strength}): ${m.description}`, { size: 11, indent: 10 });
  if (s.keyEvidence.length) {
    p.text('Key evidence:', { style: 'bold', size: 11, gap: 2 });
    p.bullets(s.keyEvidence.map((e) => `${e.title}${e.revealedIn ? ` (revealed: ${e.revealedIn})` : ''}: ${e.description}`), 10.5);
  }
  if (s.herrings.length) {
    p.text('Red herrings and how they are debunked:', { style: 'bold', size: 11, gap: 2 });
    p.bullets(
      s.herrings.map(
        (h) =>
          `${h.title}${h.misleads.length ? ` (points at ${h.misleads.join(', ')})` : ''}. Revealed: ${h.revealedIn ?? 'never'}. Debunked: ${h.debunkedIn ?? 'no beat'}${h.debunkedBy ? ` by "${h.debunkedBy}"` : ''}. ${h.note}`,
      ),
      10.5,
    );
  }

  p.heading('Timeline');
  for (const b of gm.timeline) {
    p.ensure(60);
    const trigger = b.trigger === 'timer' ? `timer ${Math.round(b.timerSeconds / 60)} min` : b.trigger === 'player-action' ? 'player action' : 'GM advances';
    p.text(`${b.number}. ${b.title}`, { style: 'bold', size: 12.5, gap: 1 });
    p.text(`Round ${b.round}${b.timeLabel ? `  |  ${b.timeLabel}` : ''}  |  ${trigger}`, { font: 'helvetica', size: 8, color: MUTED, gap: 3 });
    if (b.description) p.text(b.description, { size: 10.5, gap: 2 });
    if (b.actionPrompt) p.text(`Players must: ${b.actionPrompt}`, { style: 'italic', size: 10.5, gap: 2 });
    if (b.clues.length) p.bullets(b.clues.map((c) => `Reveal "${c.title}": ${c.text}`), 10.5);
    if (b.gmNotes) p.text(`GM notes: ${b.gmNotes}`, { style: 'italic', size: 10, color: MUTED, gap: 8 });
  }

  p.heading('Cast');
  for (const c of gm.cast) {
    p.ensure(50);
    p.text(`${c.name}${c.isKiller ? '  [KILLER]' : ''}${c.secretRole ? `  -  ${c.secretRole}` : ''}`, { style: 'bold', size: 11.5, gap: 1 });
    p.text(`Alibi: ${c.alibi || 'none'}`, { size: 10, gap: 1 });
    if (c.secrets.length) p.text(`Secrets: ${c.secrets.join(' / ')}`, { size: 10, gap: 6 });
  }

  if (gm.props.length || gm.miniGames.length) {
    p.heading('Props and challenges');
    if (gm.props.length) p.bullets(gm.props, 10.5);
    p.bullets(gm.miniGames.map((g) => `${g.title}: ${g.description}`), 10.5);
  }
  return doc;
}

export function pdfBytes(doc: jsPDF): Uint8Array {
  return new Uint8Array(doc.output('arraybuffer'));
}

export function slug(text: string, fallback = 'mystery'): string {
  return text.replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 50) || fallback;
}
