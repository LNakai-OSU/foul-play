/** Interior walls, wall caps, windows with a live view of the setting outside, and the horizon backdrop for hubs. */
import { K } from '../tiles';
import { dither, disc, noise, px, rect, shade, speckle } from './draw';
import type { Ctx } from './draw';
import type { TilePaint } from './ground';
import type { Skin } from './skins';

/** Wall types (low nibble of the variant; the high bits are a tone). */
export const WT = { paper: 0, tent: 1, brick: 2, steel: 3, log: 4, white: 5, panel: 6, stone: 7, gilt: 8, tile: 9, cold: 10, tin: 11 } as const;

const TENT_PAIRS: [string, string][] = [['#d8483c', '#f4efe2'], ['#3f79bd', '#f4efe2'], ['#4aa056', '#f4efe2'], ['#e4b638', '#f4efe2']];

export function cap(c: Ctx, type: number, tone: number, S: Skin): void {
  const [fill, edge] = S.cap;
  switch (type) {
    case WT.tent: {
      const [a, b] = TENT_PAIRS[tone % 4] as [string, string];
      for (let x = 0; x < 16; x += 4) rect(c, x, 0, 4, 16, (x / 4) % 2 ? shade(b, -0.3) : shade(a, -0.3));
      dither(c, 0, 6, 16, 10, 'rgba(0,0,0,0.25)', 0);
      break;
    }
    case WT.white:
      rect(c, 0, 0, 16, 16, '#cfcdc8');
      rect(c, 0, 0, 16, 2, '#f4f3ef');
      rect(c, 0, 14, 16, 2, '#9a9893');
      break;
    case WT.steel:
    case WT.cold:
    case WT.tin:
      rect(c, 0, 0, 16, 16, fill);
      rect(c, 0, 0, 16, 2, edge);
      for (const [x, y] of [[2, 4], [13, 4], [2, 11], [13, 11]] as const) px(c, x, y, edge);
      rect(c, 0, 8, 16, 1, edge);
      break;
    case WT.log:
      rect(c, 0, 0, 16, 16, '#3a2210');
      for (let y = 0; y < 16; y += 4) {
        rect(c, 0, y, 16, 1, '#5a3517');
        rect(c, 0, y + 3, 16, 1, '#26160a');
      }
      break;
    case WT.brick:
      rect(c, 0, 0, 16, 16, '#4a2a26');
      for (let y = 0; y < 16; y += 4) {
        rect(c, 0, y + 3, 16, 1, '#2c1a18');
        for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) rect(c, x, y, 1, 3, '#2c1a18');
      }
      break;
    case WT.gilt:
      rect(c, 0, 0, 16, 16, fill);
      rect(c, 0, 0, 16, 1, S.accent);
      rect(c, 0, 4, 16, 1, edge);
      rect(c, 0, 15, 16, 1, S.accent);
      break;
    default:
      rect(c, 0, 0, 16, 16, fill);
      for (let y = 0; y < 16; y += 4) rect(c, 0, y + 3, 16, 1, shade(fill, -0.3));
      for (let y = 0; y < 16; y += 8) rect(c, 5, y, 1, 4, shade(fill, -0.3));
      rect(c, 0, 0, 16, 1, edge);
  }
}

export function face(c: Ctx, type: number, tone: number, S: Skin): void {
  const [base, shadeC, dado] = S.wall;
  switch (type) {
    case WT.tent: {
      const [a, b] = TENT_PAIRS[tone % 4] as [string, string];
      for (let x = 0; x < 16; x += 4) rect(c, x, 0, 4, 16, (x / 4) % 2 ? b : a);
      for (let x = 0; x < 16; x += 4) {
        rect(c, x, 0, 4, 3, (x / 4) % 2 ? a : b);
        rect(c, x + 1, 3, 2, 1, (x / 4) % 2 ? a : b);
      }
      dither(c, 0, 10, 16, 6, 'rgba(0,0,0,0.12)', 0);
      rect(c, 0, 15, 16, 1, 'rgba(0,0,0,0.3)');
      break;
    }
    case WT.brick:
      rect(c, 0, 0, 16, 16, '#8a4c3c');
      for (let y = 0; y < 10; y += 4) {
        rect(c, 0, y + 3, 16, 1, '#4a2a22');
        for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) rect(c, x, y, 1, 3, '#4a2a22');
      }
      rect(c, 0, 11, 16, 5, '#3a2c2c');
      rect(c, 0, 11, 16, 1, '#5a4646');
      break;
    case WT.steel:
      rect(c, 0, 0, 16, 16, base);
      rect(c, 0, 0, 16, 1, shade(base, 0.25));
      rect(c, 7, 0, 1, 16, shadeC);
      rect(c, 0, 8, 16, 1, shadeC);
      for (const [x, y] of [[1, 1], [14, 1], [1, 14], [14, 14], [5, 5], [10, 11]] as const) px(c, x, y, dado);
      rect(c, 0, 12, 16, 4, shadeC);
      rect(c, 0, 12, 16, 1, S.accent);
      break;
    case WT.log: {
      const [a, b, d] = S.wood;
      rect(c, 0, 0, 16, 16, b);
      for (let y = 0; y < 16; y += 4) {
        rect(c, 0, y, 16, 1, a);
        rect(c, 0, y + 3, 16, 1, d);
        if (noise(y, tone, 9) > 0.4) rect(c, Math.floor(noise(y, tone, 8) * 12), y + 1, 3, 1, shade(b, -0.18));
      }
      break;
    }
    case WT.white:
      rect(c, 0, 0, 16, 16, base);
      rect(c, 0, 0, 16, 1, '#ffffff');
      rect(c, 0, 12, 16, 4, shadeC);
      rect(c, 0, 12, 16, 1, '#ffffff');
      rect(c, 0, 15, 16, 1, dado);
      break;
    case WT.panel: {
      const [a, b, d] = S.wood;
      rect(c, 0, 0, 16, 16, b);
      for (let x = 0; x < 16; x += 8) {
        rect(c, x + 1, 1, 6, 10, a);
        rect(c, x + 2, 2, 4, 8, b);
        rect(c, x + 1, 1, 6, 1, shade(a, 0.3));
        rect(c, x + 1, 10, 6, 1, d);
      }
      rect(c, 0, 12, 16, 1, S.metal[0]);
      rect(c, 0, 13, 16, 3, d);
      break;
    }
    case WT.stone:
      rect(c, 0, 0, 16, 16, '#8a8a94');
      for (let y = 0; y < 16; y += 6) {
        rect(c, 0, y + 5, 16, 1, '#5c5c66');
        for (let x = ((y / 6) % 2 ? 0 : 5) + 1; x < 16; x += 10) rect(c, x, y, 1, 5, '#5c5c66');
      }
      rect(c, 2, 1, 4, 1, '#a8a8b4');
      speckle(c, tone, '#3f6a3a', 3, 0, 8, 16, 8);
      break;
    case WT.gilt:
      rect(c, 0, 0, 16, 16, base);
      for (let y = 0; y < 12; y += 6) for (let x = 0; x < 16; x += 8) {
        px(c, x + 3, y + 1, S.accent);
        px(c, x + 2, y + 2, S.accent);
        px(c, x + 4, y + 2, S.accent);
        px(c, x + 3, y + 3, S.accent);
        px(c, x + 3, y + 4, shadeC);
      }
      rect(c, 0, 11, 16, 5, dado);
      rect(c, 0, 11, 16, 1, S.accent);
      rect(c, 0, 15, 16, 1, 'rgba(0,0,0,0.4)');
      break;
    case WT.tile:
      rect(c, 0, 0, 16, 16, '#e8ecee');
      for (let y = 0; y < 12; y += 4) {
        rect(c, 0, y + 3, 16, 1, '#b4bec4');
        for (let x = (y / 4) % 2 ? 2 : 6; x < 16; x += 8) rect(c, x, y, 1, 3, '#b4bec4');
      }
      rect(c, 0, 12, 16, 4, '#8c98a2');
      rect(c, 0, 12, 16, 1, '#c8d2d8');
      break;
    case WT.cold:
      rect(c, 0, 0, 16, 16, '#cfe4ee');
      rect(c, 7, 0, 1, 16, '#9cbccc');
      rect(c, 0, 0, 16, 1, '#f0fafe');
      dither(c, 0, 8, 16, 8, 'rgba(255,255,255,0.4)', tone);
      for (const [x, y] of [[2, 3], [11, 6], [5, 12]] as const) {
        px(c, x, y, '#ffffff');
        px(c, x + 1, y + 1, '#ffffff');
      }
      rect(c, 0, 13, 16, 3, '#8aa8b8');
      break;
    case WT.tin:
      rect(c, 0, 0, 16, 16, '#7a5a48');
      for (let x = 0; x < 16; x += 4) {
        rect(c, x, 0, 1, 16, '#9a7a64');
        rect(c, x + 2, 0, 1, 16, '#5a4032');
      }
      speckle(c, tone, '#a8583c', 5);
      rect(c, 0, 13, 16, 3, '#3a2c24');
      break;
    default:
      // wallpaper with a wooden dado
      rect(c, 0, 0, 16, 16, tone % 2 ? shadeC : base);
      for (let x = 3; x < 16; x += 8) rect(c, x, 0, 1, 10, tone % 2 ? base : shadeC);
      speckle(c, tone, shadeC, 4, 0, 0, 16, 9);
      rect(c, 0, 10, 16, 6, dado);
      rect(c, 0, 10, 16, 1, shade(dado, 0.35));
      rect(c, 0, 15, 16, 1, shade(dado, -0.4));
      for (let x = 0; x < 16; x += 5) rect(c, x, 11, 1, 4, shade(dado, -0.2));
  }
}

// ---- the view through a window ---------------------------------------------------------------------

function view(c: Ctx, S: Skin, f: number, x: number, y: number, w: number, h: number): void {
  const horizon = y + Math.floor(h * 0.55);
  switch (S.view) {
    case 'sea':
    case 'river': {
      const river = S.view === 'river';
      for (let j = 0; j < horizon - y; j++) rect(c, x, y + j, w, 1, j < 2 ? S.sky[1] : S.sky[2]);
      rect(c, x, horizon, w, y + h - horizon, S.water[river ? 1 : 1]);
      for (let j = 0; j < 3; j++) rect(c, x + ((j * 3 + f * (river ? 1 : 2)) % (w - 2)), horizon + 1 + j, 3, 1, j % 2 ? S.water[2] : S.water[0]);
      if (river) rect(c, x, horizon - 1, w, 2, '#2f4a2c');
      else px(c, x + 5, horizon - 1, '#2a2a34');
      break;
    }
    case 'snow':
    case 'mountain': {
      rect(c, x, y, w, h, S.view === 'snow' ? '#dbe8f2' : '#26385a');
      if (S.view === 'mountain') {
        for (let i = 0; i < w; i++) rect(c, x + i, horizon - Math.round(Math.abs(Math.sin(i / 2.2)) * 3), 1, 8, '#c8d8e8');
        disc(c, x + w - 2, y + 2, 1, '#f4f0d0');
      }
      for (let i = 0; i < 5; i++) px(c, x + ((Math.floor(noise(i, 0, 3) * w) + f * 2) % w), y + ((i * 3 + f * 3) % h), '#ffffff');
      break;
    }
    case 'city': {
      rect(c, x, y, w, h, '#161c3c');
      for (let i = 0; i < w; i += 2) {
        const bh = 2 + Math.floor(noise(i, 1, 2) * (h - 3));
        rect(c, x + i, y + h - bh, 2, bh, '#0a0e22');
        if (noise(i, f >> 2, 5) > 0.45) px(c, x + i, y + h - bh + 1 + (i % 3), '#f0d060');
      }
      break;
    }
    case 'rail': {
      rect(c, x, y, w, horizon - y, '#c08a72');
      rect(c, x, horizon, w, y + h - horizon, '#28384a');
      const poleX = x + w - 1 - ((f * 2) % (w + 2));
      rect(c, poleX, y, 1, h, '#1c1c26');
      rect(c, poleX - 1, y + 1, 3, 1, '#1c1c26');
      for (let i = 0; i < w; i++) px(c, x + i, horizon - ((i + (f >> 1)) % 4 === 0 ? 1 : 0), '#1c2c30');
      break;
    }
    case 'garden': {
      rect(c, x, y, w, h, '#9ed6f2');
      rect(c, x, horizon, w, y + h - horizon, '#5aa84a');
      rect(c, x + 1, horizon - 1, 3, 2, '#3f8a3c');
      disc(c, x + w - 2, y + 2, 1, '#fff6c0');
      break;
    }
    case 'lot': {
      rect(c, x, y, w, h, '#7a3f6a');
      rect(c, x, horizon, w, y + h - horizon, '#28203c');
      const bx = x + ((f * 1) % w);
      for (let j = 0; j < h; j++) px(c, bx + (j >> 1), y + j, 'rgba(255,240,180,0.7)');
      break;
    }
    default: {
      rect(c, x, y, w, h, '#141a3a');
      for (let i = 0; i < 4; i++) px(c, x + Math.floor(noise(i, 2, 4) * w), y + Math.floor(noise(i, 3, 4) * h), (f + i) % 5 === 0 ? '#ffffff' : '#a8b4e0');
      disc(c, x + w - 2, y + 2, 1, '#f4f0d0');
    }
  }
}

function windowW(c: Ctx, type: number, tone: number, f: number, S: Skin): void {
  face(c, type, tone, S);
  const frame = S.id === 'station' ? '#d6dde2' : S.id === 'gallery' ? '#3a4652' : '#5a4030';
  rect(c, 2, 1, 12, 11, frame);
  view(c, S, f, 3, 2, 10, 9);
  if (S.id === 'liner' || S.id === 'station') {
    // round-cornered porthole look: mask the corners
    for (const [x, y] of [[3, 2], [12, 2], [3, 10], [12, 10]] as const) px(c, x, y, frame);
  }
  rect(c, 7, 2, 2, 9, frame);
  rect(c, 3, 6, 10, 1, frame);
  px(c, 4, 3, 'rgba(255,255,255,0.7)');
  rect(c, 1, 12, 14, 1, shade(frame, 0.25));
  if (S.id === 'train' || S.id === 'riverboat' || S.id === 'theatre' || S.id === 'manor') {
    // curtains pulled back
    rect(c, 2, 1, 2, 11, S.cloth[0]);
    rect(c, 12, 1, 2, 11, S.cloth[0]);
    rect(c, 2, 1, 1, 11, shade(S.cloth[0], -0.3));
    rect(c, 13, 1, 1, 11, shade(S.cloth[0], -0.3));
  }
}

// ---- sky backdrop for hubs -----------------------------------------------------------------------

function sky(c: Ctx, v: number, f: number, S: Skin): void {
  const row = v & 3;
  const seed = v >> 2;
  const [top, mid, low] = S.sky;
  rect(c, 0, 0, 16, 16, row === 0 ? top : row === 1 ? mid : low);
  if (row === 1) dither(c, 0, 0, 16, 6, top, seed);
  if (row === 2) dither(c, 0, 0, 16, 6, mid, seed);
  const night = ['station', 'lodge', 'gallery', 'club', 'restaurant', 'manor', 'theatre', 'liner', 'train', 'riverboat', 'generic'].includes(S.id);
  if (night && row < 2) for (let i = 0; i < 4; i++) px(c, Math.floor(noise(i, seed, 11) * 15), Math.floor(noise(i, seed, 12) * 15), (f + i + seed) % 5 === 0 ? '#ffffff' : '#b4c0e8');
  if (S.id === 'station' || S.id === 'lodge') {
    // aurora curtain
    if (row < 2) for (let x = 0; x < 16; x++) {
      const a = Math.sin((x + seed * 5 + f * 0.6) / 3) * 3 + 6 + row * -2;
      rect(c, x, Math.round(a), 1, 4, x % 2 ? 'rgba(90,240,160,0.55)' : 'rgba(120,230,255,0.45)');
      rect(c, x, Math.round(a) + 4, 1, 2, 'rgba(90,240,160,0.2)');
    }
    if (row === 2) {
      // snowy peaks
      for (let x = 0; x < 16; x++) {
        const h = 3 + Math.round(Math.abs(Math.sin((x + seed * 7) / 3.1)) * 8);
        rect(c, x, 16 - h, 1, h, '#0e1a34');
        rect(c, x, 16 - h, 1, 2, '#8aa8c8');
      }
    }
  } else if (['gallery', 'club', 'restaurant', 'generic'].includes(S.id) && row === 2) {
    for (let x = 0; x < 16; x += 3) {
      const h = 4 + Math.floor(noise(x, seed, 13) * 10);
      rect(c, x, 16 - h, 3, h, '#0a0e22');
      for (let y = 16 - h + 2; y < 15; y += 3) if (noise(x, y + (f >> 3), seed) > 0.5) px(c, x + 1, y, '#f0d060');
    }
  } else if (S.id === 'studio') {
    if (row === 2) {
      for (let x = 0; x < 16; x++) rect(c, x, 16 - (4 + Math.round(Math.sin((x + seed * 4) / 4) * 3)), 1, 12, '#3a2a48');
      if (seed % 3 === 0) for (let i = 0; i < 6; i++) rect(c, 3 + i * 2, 6, 1, 2, '#f4e8d0');
    }
    // searchlight beam
    if (row < 2) for (let j = 0; j < 16; j++) px(c, ((f >> 1) + seed * 3 + j) % 16, j, 'rgba(255,240,190,0.35)');
  } else if (['fete', 'manor', 'train'].includes(S.id) && row === 2) {
    for (let x = 0; x < 16; x++) rect(c, x, 16 - (4 + Math.round(Math.sin((x + seed * 6) / 3.4) * 3)), 1, 12, S.id === 'fete' ? '#5aa050' : '#28402f');
    if (S.id === 'fete' && seed % 4 === 0) {
      rect(c, 7, 2, 2, 8, '#a89a80');
      rect(c, 6, 5, 4, 5, '#c8bea6');
    }
  } else if (row < 2 && (S.id === 'fete')) {
    if (noise(seed, 1, 5) > 0.5) {
      rect(c, 3 + (f >> 4) % 4, 5, 8, 2, '#ffffff');
      rect(c, 5 + (f >> 4) % 4, 4, 4, 1, '#ffffff');
    }
  }
}

export const INTERIOR: Record<number, TilePaint> = {
  [K.WALL]: (c, v, _f, S) => cap(c, v & 15, v >> 4, S),
  [K.WALL_FACE]: (c, v, _f, S) => face(c, v & 15, v >> 4, S),
  [K.WINDOW_W]: (c, v, f, S) => windowW(c, v & 15, v >> 4, f, S),
  [K.SKY]: (c, v, f, S) => sky(c, v, f, S),
};
