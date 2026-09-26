/** The "you got a clue" moment: an item-get card with the clue's own icon, rays, sparkles and its description. */
import { Scene } from '../engine';
import type { Game } from '../engine';
import { drawIcon } from '../art/icons-draw';
import { iconName } from '../icons';
import { evidenceById, nameOf } from '../logic';
import { wrapText } from '../text';
import { VIEW_H, VIEW_W } from '../types';
import { box, text, textButton, textCenter } from '../ui';
import { ENVS } from '../env';

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  c: string;
}

export class ClueCardScene extends Scene {
  // The card's own box (and its full-width dim) overlaps the top-of-screen rows OverworldScene's
  // TopBand manages -- see the flag's doc comment on Scene (engine.ts) and round 9's critic report
  // (creator-notes.md, "Round 10").
  coversTopBand = true;
  private t = 0;
  private shown = 0;
  private sparks: Spark[] = [];
  private pages: string[][] = [[]];
  private page = 0;
  private titleLines: string[] = [];
  private tagLines: string[] = [];

  constructor(
    private evId: string,
    private done: () => void,
    private how: 'found' | 'told',
  ) {
    super();
  }

  enter(g: Game): void {
    const e = evidenceById(g.world, this.evId);
    const all = wrapText(e?.description ?? '', 22);
    const perPage = 6;
    this.pages = [];
    for (let i = 0; i < Math.max(1, all.length); i += perPage) this.pages.push(all.slice(i, i + perPage));
    this.titleLines = wrapText((e?.title || 'Something').toUpperCase(), 22).slice(0, 3);
    const tag = this.how === 'told' ? `TOLD BY ${(nameOf(g.world, g.world.tipGiver[this.evId] ?? '') || 'someone').toUpperCase()}` : `FOUND: ${(g.world.maps[g.world.itemMap[this.evId] ?? '']?.name ?? 'here').toUpperCase()}`;
    this.tagLines = wrapText(tag, 22).slice(0, 2);
    const cols = ['#ffe27a', '#ffffff', '#ffb0c8', '#8ad8ff'];
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2;
      const sp = 0.6 + (i % 5) * 0.35;
      this.sparks.push({ x: 60, y: 76, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.3, life: 30 + (i % 7) * 5, c: cols[i % 4] as string });
    }
  }

  update(g: Game): void {
    this.t++;
    const total = (this.pages[this.page] as string[]).join('').length;
    if (this.shown < total) {
      this.shown += 2;
      if (this.t % 3 === 0) g.audio.sfx('blip');
    }
    for (const p of this.sparks) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.life--;
    }
    this.sparks = this.sparks.filter((p) => p.life > 0);
    if (this.t > 24 && g.input.confirm()) {
      if (this.shown < total) {
        this.shown = total;
        return;
      }
      g.audio.sfx('select');
      if (this.page < this.pages.length - 1) {
        this.page++;
        this.shown = 0;
        return;
      }
      g.pop();
      this.done();
    }
  }

  draw(g: Game, ctx: CanvasRenderingContext2D): void {
    const icon = g.world.icons[this.evId];
    const env = ENVS[g.world.env];
    // dim the world behind the card
    ctx.fillStyle = `rgba(6,6,16,${Math.min(0.72, this.t / 14)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const slide = Math.min(1, this.t / 10);
    const y0 = Math.round(14 + (1 - slide) * -60);
    box(ctx, 8, y0, VIEW_W - 16, 164, '#f6f0dc');
    // header ribbon
    ctx.fillStyle = '#b02828';
    ctx.fillRect(14, y0 + 6, VIEW_W - 28, 14);
    ctx.fillStyle = '#e04848';
    ctx.fillRect(14, y0 + 6, VIEW_W - 28, 2);
    const flash = Math.floor(this.t / 8) % 2 === 0;
    textCenter(ctx, this.how === 'told' ? 'NEW STATEMENT!' : 'NEW CLUE!', VIEW_W / 2, y0 + 9, flash ? '#fff7d8' : '#ffd0d0', '#5a1010');
    // icon stage with slowly turning rays
    const cx = 60;
    const cy = y0 + 66;
    ctx.save();
    ctx.beginPath();
    ctx.rect(16, y0 + 26, 88, 88);
    ctx.clip();
    ctx.fillStyle = '#3a2f52';
    ctx.fillRect(16, y0 + 26, 88, 88);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + this.t / 90;
      ctx.fillStyle = i % 2 ? 'rgba(255,240,180,0.18)' : 'rgba(255,240,180,0.07)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70);
      ctx.lineTo(cx + Math.cos(a + 0.26) * 70, cy + Math.sin(a + 0.26) * 70);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,236,150,0.22)';
    for (let r = 26; r > 8; r -= 6) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    const pop = Math.min(1, this.t / 12);
    const bob = Math.round(Math.sin(this.t / 12) * 2);
    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.scale(pop * 4, pop * 4);
    drawIcon(ctx, icon?.id ?? 'gen-paper:0', -8, -8, 1, icon?.verbal ?? false);
    ctx.restore();
    for (const p of this.sparks) {
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(p.x), Math.round(p.y + y0 - 14), p.life > 12 ? 2 : 1, p.life > 12 ? 2 : 1);
    }
    text(ctx, wrapText(iconName(icon?.id ?? '').toUpperCase(), 11)[0] as string, 20, y0 + 118, '#5a4a9a', null);
    // the words: title, where it came from, then the description, page by page
    let ty = y0 + 28;
    this.titleLines.forEach((l) => {
      text(ctx, l, 112, ty, '#7a2a2a', null);
      ty += 10;
    });
    this.tagLines.forEach((l) => {
      text(ctx, l, 112, ty, '#7e6a54', null);
      ty += 10;
    });
    ty += 4;
    let n = this.shown;
    (this.pages[this.page] as string[]).forEach((l, i) => {
      const part = l.slice(0, Math.max(0, n));
      n -= l.length;
      text(ctx, part, 112, ty + i * 11, '#2a2a34', null);
    });
    if (this.t > 24 && Math.floor(g.tick / 20) % 2 === 0) textButton(ctx, this.page < this.pages.length - 1 ? 'SPACE: MORE' : 'SPACE: OK', 208, y0 + 152, '#7a2a2a', null);
    if (this.pages.length > 1) text(ctx, `${this.page + 1}/${this.pages.length}`, 112, y0 + 152, '#9a8a78', null);
    void env;
  }
}
