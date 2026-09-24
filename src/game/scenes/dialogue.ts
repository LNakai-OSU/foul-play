/** The bottom text box with typewriter text, a speaker tag and optional choices, plus a generic list picker. */
import { Scene } from '../engine';
import type { Game } from '../engine';
import type { Line } from '../logic';
import { paginate, wrapText } from '../text';
import { VIEW_H, VIEW_W } from '../types';
import { box, cursor, moreArrow, shortName, text, truncate } from '../ui';
import { drawItemIcon } from '../sprites';
import { drawPortraitHead } from '../art/portraits';
import { DETECTIVE_LOOK } from '../world';
import { hashSeed } from '../../../shared/generator/rng';
import type { Look } from '../types';
import type { Mood } from '../art/portraits';

/** A name that fits the tag: long names keep their first and last word. */
function tagName(n: string): string {
  if (n.length <= 22) return n;
  const parts = n.split(' ');
  return `${parts[0]} ${parts[parts.length - 1]}`.slice(0, 26);
}

/** The face that goes with a speaker's name tag: suspects, the inspector, or the player. */
export function lookForName(g: Game, who: string): Look | null {
  if (who === g.state.player) return DETECTIVE_LOOK;
  for (const m of Object.values(g.world.maps)) for (const n of m.npcs) if (n.name === who && n.kind !== 'body') return n.look;
  for (const m of Object.values(g.world.maps)) for (const e of m.extras) if (e.name === who) return e.look;
  return null;
}

/** The charId behind a speaker's name, for state that is tracked per-character rather than per-portrait. */
function charIdForName(g: Game, who: string): string | null {
  for (const m of Object.values(g.world.maps)) for (const n of m.npcs) if (n.name === who && n.kind !== 'body') return n.charId;
  return null;
}

export const COLS = 35;
export const ROWS = 3;
export const BOX = { x: 4, y: 138, w: VIEW_W - 8, h: VIEW_H - 142 };

interface Page {
  who: string | null;
  text: string;
}

function toPages(lines: (Line | string)[] | string): Page[] {
  const list = typeof lines === 'string' ? [lines] : lines;
  const pages: Page[] = [];
  for (const l of list) {
    const line = typeof l === 'string' ? { who: null, text: l } : l;
    for (const p of paginate(line.text, COLS, ROWS)) pages.push({ who: line.who, text: p });
  }
  return pages;
}

export interface Choice {
  options: string[];
  onPick: (i: number) => void;
  /** Index picked when B is pressed. */
  cancel?: number;
}

export class DialogueScene extends Scene {
  private page = 0;
  private shown = 0;
  private cur = 0;
  private choosing = false;
  private pages: Page[];
  /** The speaker (by name) whose near-miss flustered flag this scene claimed, if any: rattled for this whole scene, once. */
  private flusterWho: string | null = null;

  constructor(
    lines: (Line | string)[] | string,
    private done?: () => void,
    private choice?: Choice,
  ) {
    super();
    this.pages = toPages(lines);
    if (!this.pages.length) this.pages = [{ who: null, text: '...' }];
  }

  enter(g: Game): void {
    const seen = new Set<string>();
    for (const p of this.pages) {
      if (!p.who || seen.has(p.who)) continue;
      seen.add(p.who);
      const id = charIdForName(g, p.who);
      if (!id) continue;
      const key = `flustered:${id}`;
      const i = g.state.seen.indexOf(key);
      if (i >= 0) {
        g.state.seen.splice(i, 1);
        this.flusterWho = p.who;
        break;
      }
    }
  }

  private get cur_(): Page {
    return this.pages[this.page] as Page;
  }

  update(g: Game): void {
    const inp = g.input;
    if (this.choosing && this.choice) {
      if (inp.pressed.has('up')) this.cur = (this.cur + this.choice.options.length - 1) % this.choice.options.length;
      if (inp.pressed.has('down')) this.cur = (this.cur + 1) % this.choice.options.length;
      if (inp.pressed.has('up') || inp.pressed.has('down')) g.audio.sfx('select');
      if (inp.confirm()) {
        g.audio.sfx('select');
        g.pop();
        this.choice.onPick(this.cur);
      } else if (inp.cancel() && this.choice.cancel !== undefined) {
        g.audio.sfx('back');
        g.pop();
        this.choice.onPick(this.choice.cancel);
      }
      return;
    }
    const len = this.cur_.text.length;
    if (this.shown < len) {
      const fast = inp.held.has('a') || inp.run;
      const before = this.shown;
      this.shown = Math.min(len, this.shown + (fast ? 3 : g.tick % 2 === 0 ? 1 : 0));
      if (this.shown !== before && g.tick % 3 === 0) g.audio.voice(hashSeed(this.cur_.who ?? 'narrator'));
      if (inp.confirm() || inp.cancel()) this.shown = len;
      return;
    }
    if (inp.confirm() || inp.cancel()) {
      if (this.page < this.pages.length - 1) {
        this.page++;
        this.shown = 0;
        return;
      }
      if (this.choice) {
        this.choosing = true;
        // Round 11: a choice box (drawn top-right, above this scene's own bottom text box -- see
        // drawChoice()) can grow wide/tall enough to land on the same pixels as OverworldScene's own
        // floating interaction prompt (it is not confined to the rows TopBand manages: round 10's own
        // note on this exact field). Round 10 left DialogueScene's `coversTopBand` at the default
        // `false` because *ordinary* dialogue (just the bottom box) never reaches that territory --
        // still true, and left unchanged here. Only once an actual choice box is up does this scene's
        // own drawing intrude on it, so the flag turns on at exactly that moment, not for the whole
        // scene's lifetime, and never turns back off (the scene is popped, not reused, once a choice
        // is made).
        this.coversTopBand = true;
        this.cur = 0;
        return;
      }
      g.pop();
      this.done?.();
    }
  }

  draw(g: Game, ctx: CanvasRenderingContext2D): void {
    const p = this.cur_;
    box(ctx, BOX.x, BOX.y, BOX.w, BOX.h);
    if (p.who) {
      const who = tagName(shortName(p.who));
      const look = lookForName(g, p.who);
      const pw = look ? 22 : 0;
      const mood: Mood = p.who === this.flusterWho ? 'rattled' : 'calm';
      box(ctx, BOX.x + 8, BOX.y - 16, who.length * 8 + 14 + pw, 20, '#fff7d8');
      if (look) drawPortraitHead(ctx, BOX.x + 11, BOX.y - 15, look, mood, 18);
      text(ctx, who, BOX.x + 15 + pw, BOX.y - 6);
    }
    const lines = p.text.slice(0, this.shown).split('\n');
    lines.forEach((l, i) => text(ctx, l, BOX.x + 12, BOX.y + 10 + i * 12));
    if (this.shown >= p.text.length && !this.choosing) moreArrow(ctx, BOX.x + BOX.w - 18, BOX.y + BOX.h - 12, g.tick);
    if (this.choosing && this.choice) drawChoice(ctx, this.choice.options, this.cur, BOX.x + BOX.w, BOX.y - 2);
  }
}

/** A small option box whose bottom-right corner is at (rx, by). */
export function drawChoice(ctx: CanvasRenderingContext2D, options: string[], cur: number, rx: number, by: number): void {
  const w = Math.max(...options.map((o) => o.length)) * 8 + 34;
  const h = options.length * 14 + 12;
  const x = rx - w;
  const y = by - h;
  box(ctx, x, y, w, h);
  options.forEach((o, i) => {
    text(ctx, o, x + 22, y + 9 + i * 14);
    if (i === cur) cursor(ctx, x + 11, y + 9 + i * 14);
  });
}

// ---------------------------------------------------------------------------------------------
// helpers

export function say(g: Game, lines: (Line | string)[] | string, done?: () => void): void {
  g.push(new DialogueScene(lines, done));
}

/** Show lines, then a choice box. `onPick` receives the chosen index. */
export function ask(g: Game, lines: (Line | string)[] | string, options: string[], onPick: (i: number) => void, cancel?: number): void {
  g.push(new DialogueScene(lines, undefined, { options, onPick, cancel }));
}

// ---------------------------------------------------------------------------------------------
// list picker

export interface PickItem {
  label: string;
  sub?: string;
  disabled?: boolean;
  /** a clue icon shown before the label */
  icon?: { id: string; verbal: boolean };
}

/** A scrolling list in a box. Calls onPick(index) or onCancel(). Pops itself first. */
export class PickScene extends Scene {
  // Default (and several call sites' custom) rects sit at the very top of the screen, the same rows
  // OverworldScene's TopBand manages -- see the flag's doc comment on Scene (engine.ts) and round 9's
  // critic report (creator-notes.md, "Round 10").
  coversTopBand = true;
  private cur = 0;
  private top = 0;
  private subPage = 0;
  private subFor = -1;

  constructor(
    private title: string,
    private items: PickItem[],
    private onPick: (i: number) => void,
    private onCancel: () => void = () => {},
    private rect = { x: 6, y: 6, w: 212, rows: 8 },
    startAt = 0,
  ) {
    super();
    this.cur = Math.max(0, Math.min(items.length - 1, startAt));
    this.top = Math.max(0, this.cur - this.rect.rows + 1);
  }

  update(g: Game): void {
    const n = this.items.length;
    const inp = g.input;
    if (n && inp.pressed.has('up')) this.cur = (this.cur + n - 1) % n;
    if (n && inp.pressed.has('down')) this.cur = (this.cur + 1) % n;
    if (inp.pressed.has('up') || inp.pressed.has('down')) g.audio.sfx('select');
    // long descriptions: LEFT / RIGHT turn the page
    const sub = (this.items[this.cur] as PickItem | undefined)?.sub;
    if (sub) {
      const pages = paginate(sub, COLS, ROWS).length;
      if (this.subFor !== this.cur) {
        this.subFor = this.cur;
        this.subPage = 0;
      }
      if (inp.pressed.has('right') && pages > 1) {
        this.subPage = (this.subPage + 1) % pages;
        g.audio.sfx('select');
      }
      if (inp.pressed.has('left') && pages > 1) {
        this.subPage = (this.subPage + pages - 1) % pages;
        g.audio.sfx('select');
      }
    }
    if (this.cur < this.top) this.top = this.cur;
    if (this.cur >= this.top + this.visRows()) this.top = this.cur - this.visRows() + 1;
    if (this.cur === 0 && inp.pressed.has('down') && n <= this.visRows()) this.top = 0;
    if (inp.confirm() && n && !(this.items[this.cur] as PickItem).disabled) {
      g.audio.sfx('select');
      g.pop();
      this.onPick(this.cur);
    } else if (inp.cancel()) {
      g.audio.sfx('back');
      g.pop();
      this.onCancel();
    }
  }

  /** Names that need two lines get taller rows (and fewer of them): a label is never cut off. */
  private labelCols(): number {
    const icons = this.items.some((it) => it.icon);
    return Math.floor((this.rect.w - 34 - (icons ? 18 : 0)) / 8);
  }
  private wraps(): boolean {
    const cols = this.labelCols();
    return this.items.some((it) => wrapText(it.label, cols).length > 1);
  }
  private visRows(): number {
    return this.wraps() ? Math.min(this.rect.rows, 4) : this.rect.rows;
  }

  draw(g: Game, ctx: CanvasRenderingContext2D): void {
    const { x, y, w } = this.rect;
    const rows = Math.max(1, Math.min(this.visRows(), this.items.length));
    const icons = this.items.some((it) => it.icon);
    const rh = this.wraps() ? 23 : icons ? 17 : 14;
    const h = rows * rh + 26;
    box(ctx, x, y, w, h);
    text(ctx, truncate(this.title, Math.floor((w - 20) / 8)), x + 12, y + 8, '#5a4a9a');
    const ix = icons ? 18 : 0;
    const cols = Math.floor((w - 34 - ix) / 8);
    for (let r = 0; r < rows; r++) {
      const i = this.top + r;
      const it = this.items[i];
      if (!it) break;
      const yy = y + 22 + r * rh;
      if (it.icon) {
        ctx.save();
        ctx.globalAlpha = it.disabled ? 0.4 : 1;
        drawItemIcon(ctx, it.icon.id, x + 20, yy - 4, it.icon.verbal);
        ctx.restore();
      }
      const lab = wrapText(it.label, cols).slice(0, 2);
      lab.forEach((l, k) => text(ctx, l, x + 22 + ix, yy + (icons ? 1 : 0) + k * 9 - (lab.length > 1 ? 3 : 0), it.disabled ? '#9a9aa8' : '#2a2a34'));
      if (i === this.cur) cursor(ctx, x + 11, yy + (icons ? 1 : 0));
    }
    if (this.top > 0) text(ctx, '^', x + w - 16, y + 20, '#c02828', null);
    if (this.top + rows < this.items.length) text(ctx, 'v', x + w - 16, y + h - 14, '#c02828', null);
    void truncate;
    if (this.cur < this.items.length && this.items[this.cur]?.icon && this.rect.rows > 0) {
      // the highlighted clue, large, beside the list
      const it = this.items[this.cur] as PickItem;
      const bx = x + w + 4;
      if (bx + 44 < VIEW_W) {
        box(ctx, bx, y, 44, 44, '#3a2f52', '#1f1d2b', '#6a5a9a');
        ctx.save();
        ctx.translate(bx + 22, y + 22 + Math.round(Math.sin(g.tick / 12)));
        ctx.scale(2, 2);
        drawItemIcon(ctx, (it.icon as { id: string }).id, -8, -8, (it.icon as { verbal: boolean }).verbal);
        ctx.restore();
      }
    }
    const sub = (this.items[this.cur] as PickItem | undefined)?.sub;
    if (sub) {
      box(ctx, BOX.x, BOX.y, BOX.w, BOX.h);
      const pages = paginate(sub, COLS, ROWS);
      const page = this.subFor === this.cur ? Math.min(this.subPage, pages.length - 1) : 0;
      (pages[page] as string).split('\n').forEach((l, i) => text(ctx, l, BOX.x + 12, BOX.y + 10 + i * 12));
      if (pages.length > 1) text(ctx, `< > ${page + 1}/${pages.length}`, BOX.x + BOX.w - 82, BOX.y + 1, '#c02828', null);
    }
  }
}
