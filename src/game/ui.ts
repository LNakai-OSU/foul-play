/** Retro UI drawing: text, boxes, cursors, bars. Everything is pixel-aligned on the 320x192 canvas. */
import { VIEW_H, VIEW_W } from './types';
import { wrapText } from './text';

type Ctx = CanvasRenderingContext2D;

export const FONT = '8px "Press Start 2P"';
export const INK = '#2a2a34';
export const INK_SOFT = '#b8b8c4';
export const PAPER = '#f8f8f4';

export function setupText(ctx: Ctx): void {
  ctx.font = FONT;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
}

export function text(ctx: Ctx, s: string, x: number, y: number, color = INK, shadow: string | null = INK_SOFT): void {
  setupText(ctx);
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillText(s, Math.round(x) + 1, Math.round(y) + 1);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, Math.round(x), Math.round(y));
}

export function textCenter(ctx: Ctx, s: string, cx: number, y: number, color = INK, shadow: string | null = INK_SOFT): void {
  text(ctx, s, cx - (s.length * 8) / 2, y, color, shadow);
}

export function textRight(ctx: Ctx, s: string, rx: number, y: number, color = INK, shadow: string | null = INK_SOFT): void {
  text(ctx, s, rx - s.length * 8, y, color, shadow);
}

/** "Dashiell \"Cricket\" Stanhope" -> "Dashiell Stanhope" for tight spaces. */
export function shortName(n: string): string {
  return n.replace(/["\u201c\u201d][^"\u201c\u201d]*["\u201c\u201d]/g, '').replace(/\s+/g, ' ').trim() || n;
}

export function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, Math.max(1, n - 1)) + '.';
}

/** A Pokémon-style window: notched corners, dark outline, light inner rule. */
export function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill = PAPER, border = '#3a3a48', rule = '#8a90b8'): void {
  ctx.fillStyle = border;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = rule;
  ctx.fillRect(x + 2, y + 1, w - 4, h - 2);
  ctx.fillRect(x + 1, y + 2, w - 2, h - 4);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 3, y + 2, w - 6, h - 4);
  ctx.fillRect(x + 2, y + 3, w - 4, h - 6);
}

/** Right-pointing selection triangle. */
export function cursor(ctx: Ctx, x: number, y: number, color = '#c02828'): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 7);
  ctx.fillRect(x + 1, y + 1, 1, 5);
  ctx.fillRect(x + 2, y + 2, 1, 3);
  ctx.fillRect(x + 3, y + 3, 1, 1);
}

/** Bouncing "more text" arrow. */
export function moreArrow(ctx: Ctx, x: number, y: number, tick: number): void {
  const bob = Math.floor(tick / 12) % 2;
  ctx.fillStyle = '#c02828';
  ctx.fillRect(x, y + bob, 7, 1);
  ctx.fillRect(x + 1, y + 1 + bob, 5, 1);
  ctx.fillRect(x + 2, y + 2 + bob, 3, 1);
  ctx.fillRect(x + 3, y + 3 + bob, 1, 1);
}

/** Composure bar in the style of an HP bar. `value` and `max` are in composure points. */
export function bar(ctx: Ctx, x: number, y: number, w: number, value: number, max: number): void {
  const frac = Math.max(0, Math.min(1, value / max));
  ctx.fillStyle = INK;
  ctx.fillRect(x, y, w, 6);
  ctx.fillStyle = '#e8e8e0';
  ctx.fillRect(x + 1, y + 1, w - 2, 4);
  const fw = Math.round((w - 2) * frac);
  ctx.fillStyle = frac > 0.5 ? '#48c058' : frac > 0.2 ? '#f0c030' : '#e04848';
  ctx.fillRect(x + 1, y + 1, fw, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + 1, y + 1, fw, 1);
}

export function fillScreen(ctx: Ctx, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry + 0.01)));
    ctx.fillRect(cx - half, cy + y, half * 2, 1);
  }
}

/** A person's name over at most two lines of `cols` characters. A long name loses its title ("Reverend Montgomery Marlowe" -> "Montgomery Marlowe") rather than a letter. */
export function nameLines(n: string, cols: number): string[] {
  const words = shortName(n).split(' ');
  for (let drop = 0; drop < words.length; drop++) {
    const lines = wrapText(words.slice(drop).join(' '), cols);
    if (lines.length <= 2) return lines;
  }
  return wrapText(words[words.length - 1] as string, cols).slice(0, 2);
}
