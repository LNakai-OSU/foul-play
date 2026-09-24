/** Ground painters: every walkable surface. Each takes (ctx, variant, animation frame, skin) and fills a 16x16 tile. */
import { K } from '../tiles';
import { at, bricks, dither, mixHex, noise, planks, px, rect, shade, speckle } from './draw';
import type { Ctx } from './draw';
import type { Skin } from './skins';

export type TilePaint = (c: Ctx, v: number, f: number, S: Skin) => void;

const grassBase = (S: Skin): [string, string, string] => (S.id === 'manor' || S.id === 'theatre' ? ['#4d8c46', '#3f7a3c', '#6fae5a'] : S.id === 'fete' ? ['#6cc056', '#58aa46', '#8fdc70'] : ['#63b552', '#4c9e42', '#7fd066']);

export const GROUND: Record<number, TilePaint> = {
  [K.GRASS]: (c, v, _f, S) => {
    const [a, b, hi] = grassBase(S);
    rect(c, 0, 0, 16, 16, a);
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(noise(i, v, 1) * 14) + 1;
      const y = Math.floor(noise(i, v, 2) * 13) + 2;
      rect(c, x, y, 1, 2, b);
      px(c, x + 1, y - 1, hi);
    }
    dither(c, (v * 5) % 9, (v * 3) % 9, 5, 2, b, v);
  },
  [K.FLOWERS]: (c, v, f, S) => {
    GROUND[K.GRASS]!(c, v, f, S);
    const cols = ['#fbfbf6', '#f6d63e', '#ef6d8c', '#a87fe0'];
    for (let i = 0; i < 4; i++) {
      const x = Math.floor(noise(i, v, 5) * 11) + 2;
      const y = Math.floor(noise(i, v, 6) * 11) + 2;
      const col = at(cols, i + v);
      rect(c, x, y - 1, 1, 3, col);
      rect(c, x - 1, y, 3, 1, col);
      px(c, x, y, '#f0a020');
    }
  },
  [K.PATH]: (c, v, _f, S) => {
    if (S.id === 'manor' || S.id === 'gallery' || S.id === 'theatre') {
      rect(c, 0, 0, 16, 16, '#d6cdbc');
      speckle(c, v, '#b9ae98', 16);
      speckle(c, v + 9, '#f0eadc', 10);
      return;
    }
    rect(c, 0, 0, 16, 16, S.id === 'lodge' || S.id === 'station' ? '#c9c2b0' : '#dcc590');
    for (let i = 0; i < 12; i++) rect(c, Math.floor(noise(i, v, 3) * 15), Math.floor(noise(i, v, 4) * 15), 1, 1, i % 2 ? '#c2a870' : '#ecdcae');
    dither(c, 0, 14, 16, 2, '#c9b077', v);
  },
  [K.COBBLE]: (c, v, _f, S) => {
    const dark = S.id === 'club' || S.id === 'restaurant';
    const base = dark ? '#5a5a66' : '#bdb5ad';
    const line = dark ? '#3a3a46' : '#8f8780';
    rect(c, 0, 0, 16, 16, base);
    for (let y = 0; y < 16; y += 4) {
      rect(c, 0, y + 3, 16, 1, line);
      for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) rect(c, x, y, 1, 4, line);
    }
    rect(c, 1 + v, 1, 2, 1, dark ? '#767684' : '#d8d2cc');
    rect(c, 9, 5 + v, 2, 1, dark ? '#767684' : '#d8d2cc');
  },
  [K.WOOD]: (c, v, _f, S) => {
    if (v >= 3) {
      // parquet: alternating basket-weave squares
      rect(c, 0, 0, 16, 16, S.floor[0]);
      for (let by = 0; by < 2; by++) for (let bx = 0; bx < 2; bx++) {
        const horiz = (bx + by) % 2 === 0;
        planks(c, bx * 8, by * 8, 8, 8, S.floor, v, horiz, 2);
        rect(c, bx * 8, by * 8, 8, 1, S.floor[2]);
        rect(c, bx * 8, by * 8, 1, 8, S.floor[2]);
      }
      return;
    }
    planks(c, 0, 0, 16, 16, S.floor, v, true, 4);
    if (v % 3 === 1) dither(c, 0, 0, 16, 2, S.floor[1], 0);
  },
  [K.CHECKER]: (c, _v, _f, S) => {
    const dark = ['restaurant', 'manor', 'liner', 'club', 'theatre', 'train'].includes(S.id);
    const [a, b] = dark ? (S.id === 'club' ? ['#d8d0c0', '#1c1c24'] : ['#ece6da', '#2a2a30']) : ['#eeede6', '#a3b3b1'];
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) rect(c, x * 8, y * 8, 8, 8, (x + y) % 2 ? (b as string) : (a as string));
    rect(c, 0, 0, 16, 1, 'rgba(255,255,255,0.18)');
    rect(c, 0, 8, 8, 1, 'rgba(255,255,255,0.12)');
  },
  [K.STONE]: (c, v, _f, S) => {
    const base = S.id === 'station' ? '#6b7783' : '#7e7e88';
    rect(c, 0, 0, 16, 16, base);
    for (let y = 0; y < 16; y += 8) {
      rect(c, 0, y + 7, 16, 1, '#5c5c66');
      rect(c, (y / 8) % 2 ? 4 : 11, y, 1, 8, '#5c5c66');
    }
    rect(c, 2 + v, 2, 3, 1, '#9aa2a8');
    rect(c, 10, 10, 3, 1, '#9aa2a8');
    speckle(c, v, '#6a6a74', 5);
  },
  [K.RUG]: (c, v, _f, S) => {
    const pals: [string, string][] = [[S.cloth[0], S.accent], [S.cloth[2], '#e8dcc0'], ['#3f6a52', '#e8d8a0'], ['#6a4a7a', '#f0c0e0'], ['#8a5a2c', '#f0e0a8']];
    const [base, edge] = pals[v % 5] as [string, string];
    const dim = shade(base, -0.3);
    rect(c, 0, 0, 16, 16, base);
    const soft = mixHex(base, edge, 0.4);
    for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < 16; x += 4) {
      px(c, x + 1, y + 1, soft);
      px(c, x, y + 1, dim);
      px(c, x + 2, y + 1, dim);
      px(c, x + 1, y + 2, dim);
    }
    rect(c, 0, 0, 16, 1, 'rgba(0,0,0,0.16)');
  },
  [K.MAT]: (c, v, f, S) => {
    GROUND[K.WOOD]!(c, v, f, S);
    rect(c, 1, 3, 14, 10, '#7a2c2c');
    rect(c, 1, 3, 14, 1, '#d8b060');
    rect(c, 1, 12, 14, 1, '#d8b060');
    rect(c, 5, 6, 6, 4, '#a04040');
  },
  [K.DECK]: (c, v, _f, S) => {
    // fore-and-aft planks with black caulk between them and staggered butt joints
    const cols = S.floor;
    rect(c, 0, 0, 16, 16, cols[0]);
    for (let i = 0; i < 16; i += 4) {
      rect(c, i + 3, 0, 1, 16, '#3a2c20');
      rect(c, i + 1, 0, 1, 16, cols[1]);
      const y = Math.floor(noise(i, v, 8) * 14) + 1;
      rect(c, i, y, 3, 1, cols[2]);
    }
    speckle(c, v, cols[2], 3);
    if (S.id === 'riverboat') dither(c, 0, 0, 16, 16, 'rgba(255,255,255,0.10)', v);
  },
  [K.WATER]: (c, v, f, S) => {
    const [deep, mid, lite, foam] = S.water;
    rect(c, 0, 0, 16, 16, mid);
    const river = S.id === 'riverboat';
    for (let r = 0; r < 4; r++) {
      const y = r * 4 + ((f + r) % 4);
      const off = Math.floor(noise(r, v, 3) * 6);
      rect(c, (off + f * (river ? 1 : 2)) % 12, y, 6, 1, deep);
      rect(c, (off + 8 + f * (river ? 1 : 2)) % 12, (y + 2) % 16, 4, 1, lite);
    }
    if (!river) {
      for (let i = 0; i < 2; i++) px(c, (Math.floor(noise(i, v, 9) * 14) + f * 3) % 16, (i * 7 + f * 2 + v) % 16, foam);
    } else {
      px(c, (v * 5 + f * 2) % 16, (v * 3 + 6) % 16, '#8a6a42');
      dither(c, 0, 0, 16, 16, 'rgba(90,70,40,0.16)', v);
    }
    if (v === 1) {
      for (let x = 0; x < 16; x++) if ((x + f) % 3 !== 0) px(c, x, 0, foam);
      rect(c, 0, 1, 16, 1, lite);
    }
  },
  [K.SNOW]: (c, v, f, S) => {
    const [a, b, d] = S.snow;
    rect(c, 0, 0, 16, 16, a);
    dither(c, (v * 3) % 8, (v * 5) % 9, 8, 3, b, v);
    dither(c, 8, 9 + (v % 3), 7, 2, b, v + 1);
    for (let i = 0; i < 3; i++) px(c, Math.floor(noise(i, v, 4) * 15), Math.floor(noise(i, v, 5) * 15), d);
    const sx = Math.floor(noise(v, 1, 7) * 14);
    const sy = Math.floor(noise(v, 2, 7) * 14);
    if ((f + v) % 4 === 0) {
      px(c, sx, sy, '#ffffff');
      px(c, sx + 1, sy, 'rgba(255,255,255,0.6)');
    }
  },
  [K.SNOWPATH]: (c, v, _f, S) => {
    const [a, b, d] = S.snow;
    rect(c, 0, 0, 16, 16, b);
    dither(c, 0, 0, 16, 16, a, v);
    for (let y = 2; y < 16; y += 7) {
      rect(c, 2 + (v % 3), y, 3, 4, d);
      rect(c, 9 - (v % 2), y + 3, 3, 4, d);
    }
    rect(c, 0, 0, 16, 1, a);
  },
  [K.ICE]: (c, v, f) => {
    rect(c, 0, 0, 16, 16, '#bfe0f2');
    dither(c, 0, 0, 16, 16, '#a4d0ea', v);
    rect(c, 3, 3 + (v % 4), 6, 1, '#f4fbff');
    rect(c, 8 + (v % 3), 4 + (v % 4), 1, 6, '#7fb6d8');
    rect(c, 5, 10, 5, 1, '#7fb6d8');
    if (f % 4 === 0) px(c, 12, 3, '#ffffff');
  },
  [K.METAL]: (c, v, _f, S) => {
    const [a, b, d] = S.metal;
    const plate = S.id === 'station' || S.id === 'restaurant';
    rect(c, 0, 0, 16, 16, plate ? S.floor[0] : d);
    if (plate) {
      rect(c, 0, 7, 16, 1, S.floor[2]);
      rect(c, 7, 0, 1, 16, S.floor[2]);
      for (const [x, y] of [[1, 1], [14, 1], [1, 14], [14, 14], [6, 6], [9, 9]] as const) px(c, x, y, S.floor[2]);
      rect(c, 0, 0, 16, 1, 'rgba(255,255,255,0.16)');
      speckle(c, v, S.floor[1], 6);
    } else {
      for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 0 : 2; x < 16; x += 4) {
        rect(c, x, y + 1, 3, 1, b);
        rect(c, x + 1, y + 2, 1, 1, a);
      }
    }
  },
  [K.MARBLE]: (c, v, _f, S) => {
    const [a, b, d] = S.floor;
    rect(c, 0, 0, 16, 16, a);
    rect(c, 0, 15, 16, 1, d);
    rect(c, 15, 0, 1, 16, d);
    rect(c, 0, 0, 16, 1, 'rgba(255,255,255,0.35)');
    dither(c, (v * 4) % 10, 3 + (v % 5), 6, 1, b, v);
    rect(c, 3 + v, 8, 4, 1, b);
    rect(c, 8, 4 + (v % 4), 1, 3, b);
    speckle(c, v, b, 4);
  },
  [K.ASPHALT]: (c, v) => {
    rect(c, 0, 0, 16, 16, '#4a4a54');
    speckle(c, v, '#5e5e6a', 14);
    speckle(c, v + 4, '#38383f', 10);
    if (v === 1) {
      rect(c, 0, 7, 7, 2, '#e8d68c');
      rect(c, 10, 7, 6, 2, '#e8d68c');
    }
    if (v === 2) rect(c, 0, 1, 16, 1, '#c9c9d0');
  },
  [K.WET]: (c, v, f) => {
    rect(c, 0, 0, 16, 16, '#3c4054');
    speckle(c, v, '#4a5068', 12);
    for (let i = 0; i < 3; i++) {
      const y = 2 + i * 5 + ((v + i) % 2);
      rect(c, 1 + ((i * 5 + v * 3) % 8), y, 6, 1, '#7280a8');
      rect(c, 3 + ((i * 3 + v) % 7), y + 1, 3, 1, '#566088');
    }
    if ((f + v) % 6 === 0) px(c, 4 + v, 9, '#aab6dc');
  },
  [K.PLATFORM]: (c, v) => {
    rect(c, 0, 0, 16, 16, '#b7b3a8');
    speckle(c, v, '#9d998e', 10);
    speckle(c, v + 3, '#cfcbc0', 6);
    if (v === 0) {
      rect(c, 0, 0, 16, 3, '#e8c440');
      rect(c, 0, 3, 16, 1, '#8a7a30');
    }
    rect(c, 0, 15, 16, 1, '#8f8b80');
  },
  [K.BALLAST]: (c, v) => {
    rect(c, 0, 0, 16, 16, '#7a7670');
    speckle(c, v, '#5e5a56', 22);
    speckle(c, v + 5, '#9a968e', 14);
    if (v === 1) {
      for (let x = 1; x < 16; x += 6) rect(c, x, 0, 3, 16, '#4a3626');
      rect(c, 0, 3, 16, 2, '#3a3a44');
      rect(c, 0, 3, 16, 1, '#a4a8b4');
      rect(c, 0, 11, 16, 2, '#3a3a44');
      rect(c, 0, 11, 16, 1, '#a4a8b4');
    }
  },
  [K.STAGE]: (c, v, _f, S) => {
    planks(c, 0, 0, 16, 16, S.id === 'theatre' ? ['#6a4630', '#523420', '#2a1a10'] : ['#7a6a58', '#5e5040', '#302820'], v, true, 5);
    if (v === 1) {
      rect(c, 7, 6, 2, 3, '#d8d4c4');
      rect(c, 6, 7, 4, 1, '#d8d4c4');
    }
    if (v === 2) rect(c, 3, 11, 5, 1, '#f0d060');
  },
  [K.CARPET]: (c, v, _f, S) => {
    // a woven field with a small repeating lozenge, not a striped runner: rooms tile it across the floor
    const base = [S.cloth[0], S.cloth[2], '#23303c', shade(S.cloth[0], -0.25)][v % 4] as string;
    rect(c, 0, 0, 16, 16, base);
    const lo = shade(base, -0.22);
    const hi = mixHex(base, S.accent, 0.45);
    for (const [ox, oy] of [[0, 0], [8, 8]] as const) {
      px(c, ox + 3, oy + 1, hi);
      px(c, ox + 2, oy + 2, hi);
      px(c, ox + 4, oy + 2, hi);
      px(c, ox + 3, oy + 3, hi);
      px(c, ox + 3, oy + 2, lo);
    }
    for (let i = 0; i < 6; i++) px(c, Math.floor(noise(i, v, 41) * 16), Math.floor(noise(i, v, 42) * 16), lo);
    rect(c, 0, 15, 16, 1, lo);
  },
  [K.TILE]: (c, v, _f, S) => {
    const a = S.id === 'restaurant' || S.id === 'station' ? '#d8dee2' : '#eeede6';
    rect(c, 0, 0, 16, 16, a);
    rect(c, 0, 7, 16, 1, '#a9b3b8');
    rect(c, 7, 0, 1, 16, '#a9b3b8');
    rect(c, 0, 0, 7, 1, '#ffffff');
    rect(c, 8, 8, 7, 1, '#ffffff');
    speckle(c, v, '#cdd4d8', 4);
  },
  [K.DIRT]: (c, v) => {
    rect(c, 0, 0, 16, 16, '#a88458');
    speckle(c, v, '#8c6c44', 14);
    speckle(c, v + 2, '#c4a070', 10);
    dither(c, 0, 12, 16, 3, '#96724a', v);
  },
  [K.LAWN]: (c, v, _f, S) => {
    const [a, b] = grassBase(S);
    rect(c, 0, 0, 16, 16, a);
    rect(c, 0, v % 2 ? 0 : 8, 16, 8, b);
    speckle(c, v, '#8fdc70', 6);
  },
  [K.DARK]: (c, v) => {
    rect(c, 0, 0, 16, 16, '#3c3a44');
    speckle(c, v, '#2c2a34', 16);
    speckle(c, v + 5, '#4c4a56', 8);
    rect(c, 0, 7, 16, 1, '#2c2a34');
    rect(c, v % 2 ? 4 : 10, 0, 1, 8, '#2c2a34');
    rect(c, v % 2 ? 11 : 5, 8, 1, 8, '#2c2a34');
  },
  [K.BOARDS]: (c, v) => {
    planks(c, 0, 0, 16, 16, ['#8c7250', '#6e5638', '#463622'], v, false, 5);
    speckle(c, v, '#54402a', 4);
  },
};

/** Brick floor for alleys and cellars. */
export function brickFloor(c: Ctx, v: number): void {
  bricks(c, 0, 0, 16, 16, '#7a4a3a', '#3a2620', '#94604c', v);
}
