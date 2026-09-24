/** Screen transitions and the story "time card". */
import { Scene } from '../engine';
import type { Game } from '../engine';
import { wrapText } from '../text';
import { VIEW_H, VIEW_W } from '../types';
import { text, textCenter } from '../ui';

export type WipeStyle = 'fade' | 'bars';

/** Closes ('out') or opens ('in') the screen, then pops itself and calls `done`. */
export class Transition extends Scene {
  private t = 0;

  constructor(
    private dir: 'out' | 'in',
    private style: WipeStyle = 'fade',
    private done?: () => void,
    private frames = 16,
  ) {
    super();
  }

  update(g: Game): void {
    this.t++;
    if (this.t >= this.frames) {
      g.pop();
      this.done?.();
    }
  }

  draw(_g: Game, ctx: CanvasRenderingContext2D): void {
    const p = Math.min(1, this.t / this.frames);
    const cover = this.dir === 'out' ? p : 1 - p;
    if (this.style === 'fade') {
      ctx.fillStyle = `rgba(0,0,0,${cover})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      return;
    }
    // horizontal bars closing from both sides, with an initial flash
    if (this.dir === 'out' && this.t < 8 && Math.floor(this.t / 2) % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    ctx.fillStyle = '#000';
    const bars = 12;
    const bh = VIEW_H / bars;
    for (let i = 0; i < bars; i++) {
      const w = VIEW_W * cover;
      if (i % 2 === 0) ctx.fillRect(0, i * bh, w, bh);
      else ctx.fillRect(VIEW_W - w, i * bh, w, bh);
    }
  }
}

/** "9:40 PM. The lights go out!" style story card. */
export class TimeCardScene extends Scene {
  opaque = true;
  private t = 0;

  constructor(
    private time: string,
    private title: string,
    private done: () => void,
  ) {
    super();
  }

  update(g: Game): void {
    this.t++;
    if (this.t > 30 && g.input.confirm()) {
      g.audio.sfx('select');
      g.pop();
      this.done();
    }
  }

  draw(g: Game, ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#0c0c14';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const a = Math.min(1, this.t / 20);
    ctx.globalAlpha = a;
    // clock face
    ctx.fillStyle = '#c8b070';
    for (let y = -14; y <= 14; y++) for (let x = -14; x <= 14; x++) if (x * x + y * y <= 196 && x * x + y * y >= 144) ctx.fillRect(VIEW_W / 2 + x, 46 + y, 1, 1);
    const ang = (this.t / 40) % (Math.PI * 2);
    for (let r = 0; r < 12; r++) ctx.fillRect(VIEW_W / 2 + Math.round(Math.sin(ang) * r), 46 - Math.round(Math.cos(ang) * r), 1, 1);
    for (let r = 0; r < 8; r++) ctx.fillRect(VIEW_W / 2 + Math.round(Math.sin(ang / 12) * r), 46 - Math.round(Math.cos(ang / 12) * r), 1, 1);
    if (this.time) {
      ctx.save();
      ctx.translate(VIEW_W / 2, 78);
      ctx.scale(2, 2);
      textCenter(ctx, this.time.toUpperCase().slice(0, 14), 0, 0, '#f0e0a8', '#5a3a26');
      ctx.restore();
    }
    wrapText(this.title, 32).slice(0, 4).forEach((l, i) => textCenter(ctx, l, VIEW_W / 2, 104 + i * 12, '#e8e8f0', '#40405a'));
    if (this.t > 30 && Math.floor(g.tick / 20) % 2 === 0) text(ctx, 'PRESS SPACE', VIEW_W / 2 - 44, VIEW_H - 22, '#8a8aa8', null);
    ctx.globalAlpha = 1;
  }
}
