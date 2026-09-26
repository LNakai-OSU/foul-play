/** Screen transitions. */
import { Scene } from '../engine';
import type { Game } from '../engine';
import { VIEW_H, VIEW_W } from '../types';

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
