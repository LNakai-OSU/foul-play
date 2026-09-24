/** Tiny pixel-drawing toolkit shared by every painter: rectangles, dither, ramps and string sprites. */
export type Ctx = CanvasRenderingContext2D;

export const OUT = '#1f1d2b';

export const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string): void => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};
export const px = (c: Ctx, x: number, y: number, col: string): void => {
  c.fillStyle = col;
  c.fillRect(x, y, 1, 1);
};
export const disc = (c: Ctx, cx: number, cy: number, r: number, col: string): void => {
  c.fillStyle = col;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.4) c.fillRect(cx + x, cy + y, 1, 1);
};
export const ring = (c: Ctx, cx: number, cy: number, r: number, col: string): void => {
  c.fillStyle = col;
  for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
    const d = x * x + y * y;
    if (d <= r * r + r * 0.4 && d > (r - 1) * (r - 1) + (r - 1) * 0.4) c.fillRect(cx + x, cy + y, 1, 1);
  }
};
export const noise = (x: number, y: number, s: number): number => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export const at = <T>(a: readonly T[], i: number): T => a[((i % a.length) + a.length) % a.length] as T;

/** Sprinkle `n` single pixels of `col` inside a box. */
export function speckle(c: Ctx, seed: number, col: string, n: number, x0 = 0, y0 = 0, w = 16, h = 16): void {
  c.fillStyle = col;
  for (let i = 0; i < n; i++) c.fillRect(x0 + Math.floor(noise(i, seed, 71) * w), y0 + Math.floor(noise(i, seed, 72) * h), 1, 1);
}
/** Checkerboard dither over a box (the classic two-colour blend). */
export function dither(c: Ctx, x: number, y: number, w: number, h: number, col: string, phase = 0): void {
  c.fillStyle = col;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((i + j + phase) % 2 === 0) c.fillRect(x + i, y + j, 1, 1);
}

export function hexToRgb(h: string): [number, number, number] {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
export function mixHex(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const m = (i: number) => Math.round((pa[i] as number) + ((pb[i] as number) - (pa[i] as number)) * t);
  return `rgb(${m(0)},${m(1)},${m(2)})`;
}
const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
export function shade(h: string, k: number): string {
  const [r, g, b] = hexToRgb(h);
  return k >= 0 ? `#${toHex(r + (255 - r) * k)}${toHex(g + (255 - g) * k)}${toHex(b + (255 - b) * k)}` : `#${toHex(r * (1 + k))}${toHex(g * (1 + k))}${toHex(b * (1 + k))}`;
}

/** Draw a string sprite. Each character indexes `pal`; '.' and ' ' are transparent. */
export function sprite(c: Ctx, rows: readonly string[], pal: Record<string, string>, ox = 0, oy = 0): void {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y] as string;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x] as string;
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (col) {
        c.fillStyle = col;
        c.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }
}

/** Horizontal or vertical plank texture with staggered seams. */
export function planks(c: Ctx, x: number, y: number, w: number, h: number, cols: readonly [string, string, string], v: number, horiz = true, plank = 4): void {
  rect(c, x, y, w, h, cols[0]);
  if (horiz) {
    for (let j = 0; j < h; j += plank) {
      rect(c, x, y + j + plank - 1, w, 1, cols[2]);
      const sx = ((j / plank) * 5 + v * 3) % Math.max(4, w);
      rect(c, x + sx, y + j, 1, plank - 1, cols[1]);
      if ((j / plank + v) % 3 === 0) rect(c, x + ((sx + 7) % w), y + j + 1, 3, 1, cols[1]);
    }
  } else {
    for (let i = 0; i < w; i += plank) {
      rect(c, x + i + plank - 1, y, 1, h, cols[2]);
      rect(c, x + i, y + (((i / plank) * 5 + v * 3) % Math.max(4, h)), plank - 1, 1, cols[1]);
    }
  }
}

export function bricks(c: Ctx, x: number, y: number, w: number, h: number, brick: string, mortar: string, hi: string, v = 0): void {
  rect(c, x, y, w, h, brick);
  for (let j = 0; j < h; j += 4) {
    rect(c, x, y + j + 3, w, 1, mortar);
    for (let i = (j / 4) % 2 ? 0 : 4; i < w; i += 8) rect(c, x + i, y + j, 1, 3, mortar);
    if (noise(j, v, 5) > 0.5) rect(c, x + Math.floor(noise(j, v, 6) * (w - 3)), y + j, 3, 1, hi);
  }
}

/** Frame-safe pulse in [0,1): `f` is the animation frame counter. */
export const pulse = (f: number, n: number): number => (f % n) / n;
