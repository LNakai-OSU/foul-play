/** Paints clue icons to a canvas at any integer scale, with a speech badge for things told rather than found. */
import { ICONS } from './icons-art';
import { rect, px } from './draw';

const cache = new Map<string, HTMLCanvasElement>();

/** A 16x16 canvas holding the icon (cached). */
export function iconCanvas(id: string, verbal = false): HTMLCanvasElement {
  const key = `${id}|${verbal ? 1 : 0}`;
  let cv = cache.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas');
  cv.width = cv.height = 16;
  const c = cv.getContext('2d') as CanvasRenderingContext2D;
  ICONS[id]?.draw(c);
  if (verbal) {
    // a little speech bubble in the corner
    rect(c, 8, 0, 8, 6, '#1f1d2b');
    rect(c, 9, 1, 6, 4, '#ffffff');
    rect(c, 9, 6, 2, 2, '#1f1d2b');
    px(c, 9, 5, '#ffffff');
    px(c, 10, 6, '#ffffff');
    px(c, 10, 3, '#4b8bd0');
    px(c, 12, 3, '#4b8bd0');
    px(c, 14, 3, '#4b8bd0');
  }
  cache.set(key, cv);
  return cv;
}

export function drawIcon(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, scale = 1, verbal = false): void {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(iconCanvas(id, verbal), Math.round(x), Math.round(y), 16 * scale, 16 * scale);
}
