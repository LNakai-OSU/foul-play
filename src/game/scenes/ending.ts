/** The final reveal and rank card. */
import { Scene } from '../engine';
import type { Game } from '../engine';
import { clearSave } from '../engine';
import { clockLabel, computeRank, killerOf, progress } from '../logic';
import type { Line } from '../logic';
import { deriveSolution } from '../../../shared/solution';
import { VIEW_H, VIEW_W } from '../types';
import { box, cursor, text, textCenter } from '../ui';
import { say } from './dialogue';

const RANK_COLOR: Record<string, string> = { S: '#f0c030', A: '#58c868', B: '#58a8e8', C: '#c8c8d0', D: '#c86868' };

export class EndingScene extends Scene {
  opaque = true;
  private t = 0;
  private phase: 'story' | 'card' = 'story';
  private cur = 0;
  private rank = 'D';
  private sparks: { x: number; y: number; vx: number; vy: number; c: string; life: number }[] = [];

  constructor(private kind: 'won' | 'lost') {
    super();
  }

  enter(g: Game): void {
    g.audio.play('none');
    g.audio.sfx(this.kind === 'won' ? 'win' : 'lose');
    const r = computeRank(g.world, g.state);
    this.rank = this.kind === 'won' ? r.rank : 'D';
    g.state.rank = this.rank;
    g.state.done = this.kind;
    g.save();
    const w = g.world;
    const sol = deriveSolution(w.c);
    const killer = killerOf(w);
    const name = killer?.name ?? sol.killerName ?? 'The culprit';
    const inspector = w.inspectorName;
    const lines: Line[] = [];
    if (this.kind === 'won') {
      lines.push({ who: name, text: 'It was me. I never thought anybody would piece it together...' });
    } else {
      lines.push({ who: null, text: `The case went cold. The real killer, ${name}, slipped away into the night.` });
    }
    lines.push({ who: null, text: `The killer: ${name}. ${sol.method ? `${sol.method}.` : ''}`.trim() });
    const motive = sol.motives.find((m) => m.strength === 'strong') ?? sol.motives[0];
    if (motive) lines.push({ who: null, text: motive.description });
    const key = sol.keyEvidence.slice(0, 3).map((e) => e.title).filter(Boolean);
    if (key.length) lines.push({ who: null, text: `What gave it away: ${key.join('; ')}.` });
    lines.push(this.kind === 'won' ? { who: inspector, text: `Excellent work, ${g.state.player}. Case closed!` } : { who: inspector, text: `Better luck on the next case, ${g.state.player}.` });
    say(g, lines, () => {
      this.phase = 'card';
      this.t = 0;
    });
  }

  update(g: Game): void {
    this.t++;
    if (this.kind === 'won' && this.phase === 'card' && this.t % 3 === 0 && this.sparks.length < 90) {
      const x = 40 + Math.random() * (VIEW_W - 80);
      const cols = ['#f0c030', '#e8584c', '#58c8e8', '#78e068', '#f8f8f8'];
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        this.sparks.push({ x, y: 40 + Math.random() * 30, vx: Math.cos(a) * 0.9, vy: Math.sin(a) * 0.9 - 0.4, c: cols[Math.floor(Math.random() * cols.length)] as string, life: 40 + Math.random() * 20 });
      }
    }
    for (const p of this.sparks) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03;
      p.life--;
    }
    this.sparks = this.sparks.filter((p) => p.life > 0);
    if (this.phase !== 'card') return;
    const inp = g.input;
    if (inp.pressed.has('up') || inp.pressed.has('down')) {
      this.cur ^= 1;
      g.audio.sfx('select');
    }
    if (inp.confirm() && this.t > 20) {
      g.audio.sfx('select');
      if (this.cur === 0) {
        clearSave(g.world.c.id);
        g.restart();
      } else g.quit();
    }
  }

  draw(g: Game, ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.kind === 'won' ? '#20284a' : '#1c1c26';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect((i * 67) % VIEW_W, (i * 41) % 110, 1, 1);
    }
    if (this.phase !== 'card') return;
    for (const p of this.sparks) {
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    }
    ctx.save();
    ctx.translate(VIEW_W / 2, 14);
    ctx.scale(2, 2);
    textCenter(ctx, this.kind === 'won' ? 'CASE CLOSED' : 'CASE COLD', 0, 0, this.kind === 'won' ? '#f0e0a8' : '#c8c8d0', '#3a3a58');
    ctx.restore();
    ctx.save();
    ctx.translate(VIEW_W / 2 - 24, 42);
    ctx.scale(6, 6);
    text(ctx, this.rank, 0, 0, RANK_COLOR[this.rank] ?? '#fff', '#242430');
    ctx.restore();
    textCenter(ctx, 'RANK', VIEW_W / 2 + 4, 92, '#a8a8c8', null);
    const w = g.world;
    const s = g.state;
    const rows: [string, string][] = [
      ['CLUES', `${progress(w, s).found}/${progress(w, s).total}`],
      ['WRONG ACCUSATIONS', `${s.strikes}`],
      ['SLIPS (WRONG PRESENTS)', `${s.misses}`],
      ['HINTS USED', `${s.hintsUsed}`],
      ['CLOCK', clockLabel(w, s)],
    ];
    box(ctx, 14, 102, VIEW_W - 28, 58, '#f8f8f0');
    rows.forEach(([a, b], i) => {
      text(ctx, a, 24, 108 + i * 10, '#3a3a48', null);
      text(ctx, b, VIEW_W - 24 - b.length * 8, 108 + i * 10, '#3a3a48', null);
    });
    ['PLAY AGAIN', 'BACK TO LIBRARY'].forEach((o, i) => {
      text(ctx, o, VIEW_W / 2 - 52, 165 + i * 11, '#f0f0f8', null);
      if (i === this.cur) cursor(ctx, VIEW_W / 2 - 64, 165 + i * 11, '#f0c030');
    });
  }
}
