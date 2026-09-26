/** The detective's notebook: case file, collected clues (with their icons), suspect files and the door to the evidence board. */
import { Scene } from '../engine';
import type { Game } from '../engine';
import { charById, clockLabel, evidenceById, MOTIVE_LABEL, nameOf, mapLabel, progress, tagOf, testimony } from '../logic';
import { drawIcon } from '../art/icons-draw';
import { firstPerson, wrapText } from '../text';
import { VIEW_H, VIEW_W } from '../types';
import { bar, cursor, text, textButton } from '../ui';
import { drawPortraitHead, drawPortraitScaled } from '../art/portraits';
import { NightScene } from './night';

export type NotebookTab = 'case' | 'clues' | 'suspects' | 'night';
const TABS: NotebookTab[] = ['case', 'clues', 'suspects', 'night'];
const PAPER = '#efe3c6';
const INK = '#3a2e22';
const LIST_W = 132;
const DETAIL_X = LIST_W + 10;
const DETAIL_COLS = Math.floor((VIEW_W - DETAIL_X - 8) / 8);
const LIST_TOP = 20;
const LIST_BOTTOM = 152;

/** Row heights: a name may take up to three lines, and nothing is cut off. */
function rowLines(label: string): string[] {
  return wrapText(label, 11).slice(0, 4);
}
const rowHeight = (label: string): number => Math.max(20, rowLines(label).length * 9 + 4);

interface Page {
  head: string;
  lines: string[];
}

export class NotebookScene extends Scene {
  opaque = true;
  private tab: NotebookTab;
  private cur = 0;
  private top = 0;
  private page = 0;
  private t = 0;

  constructor(tab: NotebookTab = 'clues', private onClose?: () => void) {
    super();
    this.tab = tab;
  }

  private list(g: Game): { label: string; struck?: boolean; dim?: boolean; icon?: { id: string; verbal: boolean }; look?: import('../types').Look }[] {
    const w = g.world;
    const s = g.state;
    if (this.tab === 'clues') return s.found.map((id) => ({ label: evidenceById(w, id)?.title || 'Clue', struck: s.cleared.includes(id), icon: w.icons[id] }));
    if (this.tab === 'suspects') {
      const looks = new Map(Object.values(w.maps).flatMap((m) => m.npcs).filter((n) => n.charId).map((n) => [n.charId as string, n.look] as const));
      return w.c.characters.map((c) => ({ label: s.met.includes(c.id) ? c.name : '???', dim: !s.met.includes(c.id), look: s.met.includes(c.id) ? looks.get(c.id) : undefined }));
    }
    return [];
  }

  /** Split any page that is too long for the detail pane into several. */
  private pages(g: Game): Page[] {
    const out: Page[] = [];
    for (const pg of this.rawPages(g)) {
      const per = this.tab === 'clues' ? 9 : 12;
      for (let i = 0; i < Math.max(1, pg.lines.length); i += per) out.push({ head: i === 0 ? pg.head : `${pg.head} (cont.)`, lines: pg.lines.slice(i, i + per) });
    }
    return out;
  }

  private rawPages(g: Game): Page[] {
    const w = g.world;
    const s = g.state;
    const c = w.c;
    const wrap = (t: string, cols = DETAIL_COLS) => wrapText(t, cols);
    if (this.tab === 'case') {
      const p = progress(w, s);
      const ch = w.chapters[s.chapter];
      return [
        { head: c.title || 'THE CASE', lines: [...wrap(`${c.setting.name}${c.setting.era ? ` (${c.setting.era})` : ''}`), '', ...wrap(c.setting.description)] },
        {
          head: 'THE VICTIM',
          lines: [...wrap(c.victim.name), '', ...wrap(c.victim.description), '', ...wrap(`Cause: ${c.victim.causeOfDeath || 'unknown'}`), ...wrap(`Time: ${c.victim.timeOfDeath || 'unknown'}`), ...wrap(`Place: ${c.victim.placeOfDeath || 'unknown'}`)],
        },
        {
          head: 'PROGRESS',
          lines: [`Clues: ${p.found}/${p.total}`, `Suspects met: ${s.met.length}/${c.characters.length}`, `Motives known: ${s.motiveKnown.length}`, `Red herrings cleared: ${s.cleared.length}`, `Wrong accusations: ${s.strikes}/3`, `Clock: ${clockLabel(w, s)}`, '', ...wrap(ch ? `Now: ${ch.time ? ch.time + ' - ' : ''}${ch.title}` : '')],
        },
        {
          head: 'HOW TO THINK',
          lines: [...wrap('The killer is the only one whose story about the shot is false.'), '', ...wrap('Objects wander. Motives are not places. Only where people WERE at a moment can contradict where someone swears they were.'), '', ...wrap('One mark that fits several people is nobody\'s fingerprint. Tie two together, and rule the rest out.')],
        },
      ];
    }
    if (this.tab === 'night') {
      const placed = Object.keys(s.night).length;
      return [{ head: 'THE NIGHT', lines: [...wrap('Rebuild where everyone was when the shot rang out. The table only objects when it contradicts a headcount you hold.'), '', ...wrap(`${placed} of ${c.characters.length} guests placed.`), '', ...wrap('Press the yellow button to open the table.')] }];
    }
    if (this.tab === 'clues') {
      const id = s.found[this.cur];
      const e = id ? evidenceById(w, id) : undefined;
      if (!e) return [{ head: 'NO CLUES YET', lines: wrap('Search the area for evidence, and ask suspects about the night.') }];
      const where = w.itemMap[e.id] ? `Found in ${mapLabel(w, w.itemMap[e.id] as string)}.` : w.tipGiver[e.id] ? `Told by ${nameOf(w, w.tipGiver[e.id] as string)}.` : '';
      const rh = w.c.redHerrings.find((r) => r.evidenceId === e.id);
      const cleared = s.cleared.includes(e.id);
      const tag = tagOf(w, e.id);
      const body = [...wrap(e.description), '', ...wrap(where), ...(tag ? ['', ...wrap(tag)] : [])];
      const pages: Page[] = [{ head: e.title || 'Clue', lines: body }];
      if (cleared && rh) pages.push({ head: 'DISPROVEN!', lines: wrap(rh.debunkNote || 'This turned out to mean nothing.') });
      return pages;
    }
    // suspects
    const ch = w.c.characters[this.cur];
    if (!ch) return [{ head: 'NO SUSPECTS', lines: [] }];
    if (!s.met.includes(ch.id)) return [{ head: '???', lines: wrap('You have not met this person yet. Explore.') }];
    const file: Page = { head: ch.name, lines: wrap(ch.publicBio) };
    const said: string[] = [];
    if ((s.asked[ch.id] ?? []).includes('alibi')) said.push('ALIBI:', ...wrap(firstPerson(ch.alibi)), '');
    if (s.motiveKnown.includes(ch.id)) said.push('MOTIVE:', ...wrap(w.c.motives.filter((m) => m.characterId === ch.id).map((m) => `${MOTIVE_LABEL[m.category]}. ${m.description}`).join(' ')), '');
    if ((s.secretsKnown[ch.id] ?? 0) > 0) said.push('SECRET:', ...wrap(firstPerson(ch.secrets.find((x) => x.trim()) ?? '')), '');
    if ((s.asked[ch.id] ?? []).includes('rel')) {
      const rel = ch.relationships.filter((r) => r.visibility === 'public' && charById(w, r.targetId));
      if (rel.length) said.push('KNOWS:', ...rel.flatMap((r) => wrap(`${r.label} ${nameOf(w, r.targetId)}`)), '');
    }
    const pages: Page[] = [file];
    if (said.length) pages.push({ head: 'WHAT THEY SAID', lines: said });
    const sworn = testimony(w, ch.id);
    if (sworn.length) pages.push({ head: 'THEIR STORY', lines: sworn.flatMap((st, i) => [...wrap(`${i + 1}. ${st.text}`), '']) });
    return pages;
  }

  update(g: Game): void {
    const inp = g.input;
    this.t++;
    const n = this.list(g).length;
    const ti = TABS.indexOf(this.tab);
    if (inp.pressed.has('left')) this.setTab(TABS[(ti + TABS.length - 1) % TABS.length] as NotebookTab);
    if (inp.pressed.has('right')) this.setTab(TABS[(ti + 1) % TABS.length] as NotebookTab);
    if (inp.pressed.has('left') || inp.pressed.has('right')) g.audio.sfx('select');
    if (n) {
      if (inp.pressed.has('up')) {
        this.cur = (this.cur + n - 1) % n;
        this.page = 0;
        g.audio.sfx('select');
      }
      if (inp.pressed.has('down')) {
        this.cur = (this.cur + 1) % n;
        this.page = 0;
        g.audio.sfx('select');
      }
      if (this.cur < this.top) this.top = this.cur;
      const items = this.list(g);
      while (this.top < this.cur) {
        let y = LIST_TOP;
        let fits = false;
        for (let i = this.top; i < items.length; i++) {
          y += rowHeight((items[i] as { label: string }).label);
          if (i === this.cur) fits = y <= LIST_BOTTOM;
        }
        if (fits) break;
        this.top++;
      }
    } else if (this.tab === 'case' && (inp.pressed.has('up') || inp.pressed.has('down'))) {
      const pc = this.pages(g).length;
      this.page = (this.page + (inp.pressed.has('down') ? 1 : pc - 1)) % pc;
      g.audio.sfx('select');
    }
    if (inp.pressed.has('a') || inp.pressed.has('start')) {
      if (this.tab === 'night') {
        g.audio.sfx('select');
        g.push(new NightScene());
        return;
      }
      const pc = this.pages(g).length;
      this.page = (this.page + 1) % pc;
      g.audio.sfx('select');
    }
    if (inp.cancel()) {
      g.audio.sfx('back');
      g.pop();
      this.onClose?.();
    }
  }

  private setTab(t: NotebookTab): void {
    this.tab = t;
    this.cur = 0;
    this.top = 0;
    this.page = 0;
  }

  draw(g: Game, ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // ruled lines
    ctx.fillStyle = 'rgba(70,110,170,0.13)';
    for (let y = 30; y < VIEW_H; y += 12) ctx.fillRect(0, y, VIEW_W, 1);
    ctx.fillStyle = 'rgba(200,60,60,0.35)';
    ctx.fillRect(LIST_W + 4, 16, 1, VIEW_H - 16);
    // tabs
    ctx.fillStyle = '#5a3a26';
    ctx.fillRect(0, 0, VIEW_W, 16);
    TABS.forEach((t, i) => {
      const x = 4 + i * 66;
      const active = t === this.tab;
      ctx.fillStyle = active ? PAPER : '#7e5a3c';
      ctx.fillRect(x, 3, 62, 13);
      text(ctx, t.toUpperCase(), x + 31 - (t.length * 8) / 2, 6, active ? INK : '#e8d8b8', null);
    });
    const p = progress(g.world, g.state);
    text(ctx, `${p.found}/${p.total}`, VIEW_W - 6 - `${p.found}/${p.total}`.length * 8, 5, '#f0e0b8', null);

    const list = this.list(g);
    if (this.tab === 'clues' || this.tab === 'suspects') {
      let y = LIST_TOP;
      let shown = 0;
      for (let i = this.top; i < list.length; i++) {
        const it = list[i] as (typeof list)[number];
        const h = rowHeight(it.label);
        if (y + h > LIST_BOTTOM + 4) break;
        shown++;
        if (i === this.cur) {
          ctx.fillStyle = 'rgba(200,60,60,0.10)';
          ctx.fillRect(2, y - 2, LIST_W - 2, h);
        }
        if (it.icon) {
          ctx.save();
          ctx.globalAlpha = it.struck ? 0.5 : 1;
          drawIcon(ctx, it.icon.id, 12, y + Math.round((h - 20) / 2), 1, it.icon.verbal);
          ctx.restore();
        }
        if (it.look) drawPortraitHead(ctx, 10, y + Math.round((h - 18) / 2), it.look, 'calm', 18);
        const lines = rowLines(it.label);
        lines.forEach((l, k) => {
          const ly = y + Math.round((h - 4 - lines.length * 9) / 2) + k * 9 + 1;
          text(ctx, l, 32, ly, it.dim ? '#a09480' : INK, null);
          if (it.struck) {
            ctx.fillStyle = '#b02828';
            ctx.fillRect(32, ly + 3, l.length * 8, 2);
          }
        });
        if (i === this.cur) cursor(ctx, 4, y + Math.round(h / 2) - 5);
        y += h;
      }
      if (this.top + shown < list.length) text(ctx, 'v', LIST_W - 10, LIST_BOTTOM + 6, '#b02828', null);
      if (!list.length) text(ctx, 'EMPTY', 14, 22, '#a09480', null);
      if (this.top > 0) text(ctx, '^', LIST_W - 10, 17, '#b02828', null);
      if (this.tab === 'suspects') {
        const ch = g.world.c.characters[this.cur];
        if (ch && g.state.met.includes(ch.id)) {
          text(ctx, 'COMPOSURE', 8, VIEW_H - 30, INK, null);
          bar(ctx, 8, VIEW_H - 18, LIST_W - 16, g.state.composure[ch.id] ?? 10, 10);
        }
      }
    } else {
      text(ctx, this.tab === 'night' ? 'THE NIGHT' : 'CASE FILE', 12, 22, INK, null);
      wrapText(g.world.c.title || 'Untitled mystery', 14).slice(0, 8).forEach((l, i) => text(ctx, l, 12, 40 + i * 12, '#5a3a26', null));
    }

    const pages = this.pages(g);
    const pg = pages[Math.min(this.page, pages.length - 1)] as Page;
    // a big picture of the clue, or the suspect's own face, beside its name
    const id = this.tab === 'clues' ? g.state.found[this.cur] : undefined;
    const icon = id ? g.world.icons[id] : undefined;
    const suspectLook = this.tab === 'suspects' ? list[this.cur]?.look : undefined;
    const headCols = icon || suspectLook ? DETAIL_COLS - 5 : DETAIL_COLS;
    const head = wrapText(pg.head, headCols).slice(0, 3);
    head.forEach((l, k) => text(ctx, l, DETAIL_X, 22 + k * 10, '#7a2a2a', null));
    if (icon) {
      ctx.save();
      ctx.fillStyle = '#3a2f52';
      ctx.fillRect(VIEW_W - 42, 18, 36, 36);
      ctx.strokeStyle = '#1f1d2b';
      ctx.strokeRect(VIEW_W - 42.5, 17.5, 37, 37);
      ctx.translate(VIEW_W - 24, 36 + Math.round(Math.sin(this.t / 14)));
      ctx.scale(2, 2);
      drawIcon(ctx, icon.id, -8, -8, 1, icon.verbal);
      ctx.restore();
    } else if (suspectLook) {
      ctx.fillStyle = '#3a2f52';
      ctx.fillRect(VIEW_W - 42, 18, 36, 44);
      ctx.strokeStyle = '#1f1d2b';
      ctx.strokeRect(VIEW_W - 42.5, 17.5, 37, 45);
      drawPortraitScaled(ctx, VIEW_W - 41, 19, suspectLook, 'calm', 34, 42);
    }
    const lineStart = icon ? Math.max(60, 26 + head.length * 10) : suspectLook ? Math.max(68, 26 + head.length * 10) : 26 + head.length * 10;
    pg.lines.forEach((l, i) => text(ctx, l, DETAIL_X, lineStart + i * 11, INK, null));
    if (pages.length > 1) textButton(ctx, `SPACE: NEXT ${Math.min(this.page, pages.length - 1) + 1}/${pages.length}`, VIEW_W - 8 - 15 * 8, VIEW_H - 12, '#7a2a2a', null);
    text(ctx, '<> TAB  X: CLOSE', 8, VIEW_H - 11, '#7e6a54', null);
  }
}
