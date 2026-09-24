/** Exterior building painters. A building is four rows: roof top, roof eave, wall (windows) and wall (door). Its style and colour live in the tile variant. */
import { K, colourOf, styleOf } from '../tiles';
import type { BStyle } from '../tiles';
import { at, bricks, dither, disc, noise, planks, px, rect, ring, shade, speckle } from './draw';
import type { Ctx } from './draw';
import { cap as wallCap, face as wallFace } from './interior';
import type { TilePaint } from './ground';
import type { Skin } from './skins';

type BPaint = (c: Ctx, col: number, f: number, S: Skin) => void;
interface BDef {
  top: BPaint;
  bot: BPaint;
  wall: BPaint;
  win: BPaint;
  door: BPaint;
}

const ROOF = ['#c9503f', '#3f72c4', '#5fa04e', '#8e5cad', '#c99342', '#4a8f9a', '#c0322c'];
const PLASTER = ['#eadfc4', '#c97a5b', '#b9b9c2'];

// ---- shared pieces -------------------------------------------------------------------------------

const tiles = (c: Ctx, base: string, y0: number, y1: number, off = 0, dark = 'rgba(0,0,0,0.22)', lite = 'rgba(255,255,255,0.18)'): void => {
  rect(c, 0, y0, 16, y1 - y0, base);
  for (let y = y0 + 3; y < y1; y += 4) {
    rect(c, 0, y, 16, 1, dark);
    for (let x = (((y - y0 - 3) / 4) + off) % 2 ? 0 : 4; x < 16; x += 8) rect(c, x, y - 3, 1, 3, dark);
    rect(c, 1, y - 3, 6, 1, lite);
  }
};
const eaveShadow = (c: Ctx): void => {
  rect(c, 0, 12, 16, 2, 'rgba(0,0,0,0.3)');
  rect(c, 0, 14, 16, 2, 'rgba(0,0,0,0.5)');
};
const stripes = (c: Ctx, a: string, b: string, x0: number, y0: number, w: number, h: number, sw = 4): void => {
  for (let x = 0; x < w; x += sw) rect(c, x0 + x, y0, Math.min(sw, w - x), h, (x / sw) % 2 ? b : a);
};

// ---- plaster (cottage / village) ---------------------------------------------------------------

const plasterWall: BPaint = (c, col) => {
  rect(c, 0, 0, 16, 16, at(PLASTER, col));
  if (col % 3 === 1) {
    for (let y = 0; y < 16; y += 4) {
      rect(c, 0, y + 3, 16, 1, '#a55a40');
      for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) rect(c, x, y, 1, 4, '#a55a40');
    }
  } else if (col % 3 === 2) {
    for (let y = 0; y < 16; y += 8) {
      rect(c, 0, y + 7, 16, 1, '#8e8e99');
      for (let x = (y / 8) % 2 ? 0 : 5; x < 16; x += 10) rect(c, x, y, 1, 8, '#8e8e99');
    }
  } else {
    speckle(c, col, '#ddd0b2', 6);
    rect(c, 0, 12, 16, 4, '#d8ccb0');
    rect(c, 0, 15, 16, 1, '#c0b494');
  }
};
const PLASTER_DEF: BDef = {
  top: (c, col) => {
    const r = at(ROOF, col);
    rect(c, 0, 0, 16, 16, r);
    rect(c, 0, 0, 16, 2, 'rgba(255,255,255,0.28)');
    for (let y = 3; y < 16; y += 4) {
      rect(c, 0, y, 16, 1, 'rgba(0,0,0,0.22)');
      for (let x = ((y - 3) / 4) % 2 ? 0 : 4; x < 16; x += 8) rect(c, x, y - 3, 1, 3, 'rgba(0,0,0,0.16)');
    }
  },
  bot: (c, col) => {
    const r = at(ROOF, col);
    rect(c, 0, 0, 16, 16, r);
    for (let y = 3; y < 12; y += 4) {
      rect(c, 0, y, 16, 1, 'rgba(0,0,0,0.22)');
      for (let x = ((y - 3) / 4) % 2 ? 0 : 4; x < 16; x += 8) rect(c, x, y - 3, 1, 3, 'rgba(0,0,0,0.16)');
    }
    eaveShadow(c);
  },
  wall: plasterWall,
  win: (c, col) => {
    plasterWall(c, col, 0, {} as Skin);
    rect(c, 2, 2, 12, 10, '#5a4030');
    rect(c, 3, 3, 10, 8, '#9bd0ee');
    rect(c, 7, 3, 2, 8, '#5a4030');
    rect(c, 3, 6, 10, 1, '#5a4030');
    rect(c, 4, 4, 2, 2, '#d6efff');
    rect(c, 1, 12, 14, 2, '#7a5a3a');
  },
  door: (c, col, _f, S) => {
    plasterWall(c, col, 0, S);
    rect(c, 2, 0, 12, 16, '#4a3020');
    rect(c, 3, 1, 10, 15, S.door[0] ?? '#8a5730');
    for (const [x, y] of [[4, 2], [9, 2], [4, 9], [9, 9]] as const) rect(c, x, y, 3, 6, 'rgba(255,255,255,0.14)');
    rect(c, 10, 8, 2, 2, '#f0d060');
  },
};

// ---- brick (city street, alley, club) ----------------------------------------------------------

const BRICKS = ['#a4523c', '#7a4a3a', '#b8956a', '#6a4a52'];
const brickWall: BPaint = (c, col) => {
  const b = at(BRICKS, col);
  bricks(c, 0, 0, 16, 16, b, shade(b, -0.5), shade(b, 0.25), col);
  rect(c, 0, 15, 16, 1, 'rgba(0,0,0,0.3)');
};
const BRICK_DEF: BDef = {
  top: (c, col) => {
    rect(c, 0, 0, 16, 16, '#3c3c48');
    speckle(c, col, '#565664', 16);
    speckle(c, col + 3, '#2a2a34', 10);
    rect(c, 0, 0, 16, 2, '#9c9caa');
    rect(c, 13, 5, 2, 2, '#26262e');
  },
  bot: (c, col) => {
    const b = at(BRICKS, col);
    rect(c, 0, 0, 16, 3, '#b4b4c0');
    rect(c, 0, 3, 16, 1, '#6c6c7a');
    bricks(c, 0, 4, 16, 8, b, shade(b, -0.5), shade(b, 0.25), col);
    rect(c, 0, 12, 16, 4, 'rgba(0,0,0,0.42)');
  },
  wall: brickWall,
  win: (c, col, f, S) => {
    brickWall(c, col, f, S);
    rect(c, 2, 1, 12, 2, '#a8a8b6');
    rect(c, 3, 3, 10, 9, '#2a2a34');
    rect(c, 4, 4, 8, 7, '#f0cf7c');
    rect(c, 7, 4, 2, 7, '#2a2a34');
    rect(c, 4, 7, 8, 1, '#2a2a34');
    rect(c, 5, 5, 2, 1, '#fff2c4');
    rect(c, 2, 12, 12, 2, '#a8a8b6');
  },
  door: (c, col, f, S) => {
    brickWall(c, col, f, S);
    rect(c, 2, 0, 12, 16, '#a8a8b6');
    rect(c, 3, 1, 10, 15, '#2c2c36');
    rect(c, 4, 2, 8, 13, S.door[0] ?? '#5a5e66');
    rect(c, 4, 2, 8, 1, 'rgba(255,255,255,0.15)');
    rect(c, 5, 5, 6, 4, '#1a1a22');
    rect(c, 5, 5, 6, 1, '#7a7a8a');
    rect(c, 10, 10, 2, 2, '#e8c860');
  },
};

// ---- stone (manor) ------------------------------------------------------------------------------

const stoneWall: BPaint = (c, col) => {
  rect(c, 0, 0, 16, 16, '#cfc7b2');
  for (let y = 0; y < 16; y += 5) {
    rect(c, 0, y + 4, 16, 1, '#a39b86');
    for (let x = ((y / 5) % 2 ? 0 : 6) + 1; x < 16; x += 11) rect(c, x, y, 1, 5, '#a39b86');
  }
  rect(c, 1, 1, 5, 1, '#ebe4d2');
  rect(c, 8, 6, 5, 1, '#ebe4d2');
  // ivy creeping up from the ground
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(noise(i, col, 21) * 16);
    const y = 16 - Math.floor(noise(i, col, 22) * 8) - 1;
    px(c, x, y, i % 2 ? '#3f7a3c' : '#2f6030');
    px(c, x + 1, y - 1, '#5fa04e');
  }
};
const STONE_DEF: BDef = {
  top: (c) => {
    tiles(c, '#4a5468', 0, 16, 0, 'rgba(0,0,0,0.3)', 'rgba(255,255,255,0.14)');
    rect(c, 0, 0, 16, 2, '#7a86a0');
  },
  bot: (c) => {
    tiles(c, '#434d60', 0, 12, 1, 'rgba(0,0,0,0.3)', 'rgba(255,255,255,0.12)');
    rect(c, 0, 12, 16, 2, '#d8d0bc');
    rect(c, 0, 14, 16, 2, 'rgba(60,50,40,0.6)');
    for (let x = 1; x < 16; x += 4) rect(c, x, 12, 2, 2, '#b8b09a');
  },
  wall: stoneWall,
  win: (c, col, f, S) => {
    stoneWall(c, col, f, S);
    rect(c, 3, 0, 10, 14, '#a39b86');
    rect(c, 4, 1, 8, 12, '#3a3448');
    rect(c, 5, 2, 6, 10, '#ffd98a');
    rect(c, 5, 6, 6, 1, '#7a5a3a');
    rect(c, 7, 2, 2, 10, '#7a5a3a');
    rect(c, 5, 2, 2, 3, '#fff0c0');
    rect(c, 2, 13, 12, 2, '#e4dcc8');
  },
  door: (c, col, f, S) => {
    stoneWall(c, col, f, S);
    rect(c, 1, 0, 14, 16, '#e4dcc8');
    rect(c, 2, 1, 12, 15, '#a39b86');
    rect(c, 3, 2, 10, 14, '#3a2818');
    rect(c, 4, 3, 8, 13, '#6a4529');
    rect(c, 7, 3, 2, 13, '#3a2818');
    for (const y of [5, 9, 13]) {
      px(c, 5, y, '#d6b458');
      px(c, 10, y, '#d6b458');
    }
    rect(c, 9, 9, 2, 2, '#e8c860');
  },
};

// ---- log cabin (lodge) --------------------------------------------------------------------------

const logWall: BPaint = (c, col, _f, S) => {
  const [a, b, d] = S.wood;
  rect(c, 0, 0, 16, 16, b);
  for (let y = 0; y < 16; y += 4) {
    rect(c, 0, y, 16, 1, a);
    rect(c, 0, y + 1, 16, 2, b);
    rect(c, 0, y + 3, 16, 1, d);
    if (noise(y, col, 31) > 0.4) rect(c, Math.floor(noise(y, col, 32) * 12), y + 1, 3, 1, shade(b, -0.18));
  }
  rect(c, 0, 0, 1, 16, d);
  rect(c, 15, 0, 1, 16, d);
};
const LOG_DEF: BDef = {
  top: (c, col, f, S) => {
    rect(c, 0, 0, 16, 16, S.snow[0]);
    dither(c, 0, 5 + (col % 3), 16, 3, S.snow[1], 0);
    dither(c, 0, 11, 16, 3, S.snow[2], 1);
    speckle(c, col, '#ffffff', 5);
    if (f % 4 === 0) px(c, 3 + col, 3, '#ffffff');
  },
  bot: (c, col, _f, S) => {
    rect(c, 0, 0, 16, 12, S.snow[0]);
    dither(c, 0, 4, 16, 3, S.snow[1], col);
    rect(c, 0, 9, 16, 3, S.snow[1]);
    rect(c, 0, 12, 16, 2, '#5e3a1e');
    rect(c, 0, 14, 16, 2, 'rgba(0,0,0,0.5)');
    // icicles
    for (let x = 1; x < 16; x += 3) {
      const l = 2 + Math.floor(noise(x, col, 41) * 3);
      rect(c, x, 12, 1, l, '#dff2fb');
      px(c, x, 12 + l - 1, '#a7d6ee');
    }
  },
  wall: logWall,
  win: (c, col, f, S) => {
    logWall(c, col, f, S);
    rect(c, 2, 2, 12, 10, '#3a2210');
    rect(c, 3, 3, 10, 8, '#ffb85a');
    rect(c, 3, 3, 10, 3, '#ffd98a');
    rect(c, 7, 3, 2, 8, '#3a2210');
    rect(c, 1, 2, 2, 10, '#2f5a3a');
    rect(c, 13, 2, 2, 10, '#2f5a3a');
    rect(c, 1, 12, 14, 2, '#5a3517');
  },
  door: (c, col, f, S) => {
    logWall(c, col, f, S);
    rect(c, 2, 0, 12, 16, '#3a2210');
    planks(c, 3, 1, 10, 15, ['#946030', '#764a22', '#4a2c12'], col, false, 3);
    rect(c, 3, 4, 10, 1, '#2a1a0c');
    rect(c, 3, 11, 10, 1, '#2a1a0c');
    rect(c, 10, 8, 2, 2, '#e8c860');
  },
};

// ---- module (polar station) ---------------------------------------------------------------------

const MODCOL = ['#e8772e', '#3f7fbf', '#d84a3c', '#4aa56a'];
const modWall: BPaint = (c, col) => {
  rect(c, 0, 0, 16, 16, '#c9d3da');
  rect(c, 0, 0, 16, 2, '#e4ecf0');
  rect(c, 0, 5, 16, 3, at(MODCOL, col));
  rect(c, 0, 5, 16, 1, shade(at(MODCOL, col), 0.25));
  rect(c, 0, 8, 16, 1, shade(at(MODCOL, col), -0.4));
  rect(c, 7, 0, 1, 16, '#a4b0ba');
  for (const [x, y] of [[1, 1], [14, 1], [1, 13], [14, 13]] as const) px(c, x, y, '#7c8894');
  rect(c, 0, 15, 16, 1, '#8894a0');
  rect(c, 0, 12, 16, 3, '#b4c0c8');
};
const MOD_DEF: BDef = {
  top: (c, col, f, S) => {
    rect(c, 0, 0, 16, 16, '#dfe7ec');
    rect(c, 0, 0, 16, 3, S.snow[0]);
    dither(c, 0, 3, 16, 2, S.snow[1], col);
    rect(c, 7, 0, 1, 16, '#b4c0c8');
    rect(c, 0, 8, 16, 1, '#b4c0c8');
    rect(c, 3, 10, 4, 3, '#8a98a4');
    px(c, 4, 11, '#c8d2da');
    if (col % 2 === 0) {
      rect(c, 10, 9, 3, 4, '#5a6672');
      px(c, 11, 10, (f >> 3) % 2 ? '#ff5a4a' : '#7a2a2a');
    }
  },
  bot: (c, col) => {
    rect(c, 0, 0, 16, 16, '#cbd5dc');
    rect(c, 0, 0, 16, 2, '#e8eff3');
    rect(c, 7, 0, 1, 12, '#a4b0ba');
    rect(c, 0, 8, 16, 2, at(MODCOL, col));
    rect(c, 0, 12, 16, 2, '#7c8894');
    for (let x = 0; x < 16; x += 4) rect(c, x, 12, 2, 2, '#e8c440');
    rect(c, 0, 14, 16, 2, 'rgba(0,0,0,0.45)');
  },
  wall: modWall,
  win: (c, col, f, S) => {
    modWall(c, col, f, S);
    disc(c, 8, 8, 5, '#6a7884');
    disc(c, 8, 8, 4, '#2a3844');
    disc(c, 8, 8, 3, '#bfe8ff');
    rect(c, 6, 6, 2, 1, '#f0fbff');
    ring(c, 8, 8, 5, '#e4ecf0');
  },
  door: (c, col, f, S) => {
    modWall(c, col, f, S);
    rect(c, 1, 0, 14, 16, '#e8c440');
    for (let y = 0; y < 16; y += 4) rect(c, 1, y, 14, 2, '#2a2a30');
    rect(c, 3, 1, 10, 15, '#5a6672');
    rect(c, 4, 2, 8, 14, '#8a98a4');
    disc(c, 8, 6, 2, '#bfe8ff');
    ring(c, 8, 6, 2, '#3a4652');
    rect(c, 5, 10, 6, 1, '#3a4652');
    rect(c, 7, 9, 2, 3, '#c9d3da');
  },
};

// ---- tent (village fete) ------------------------------------------------------------------------

const TENTS: [string, string][] = [['#d8483c', '#f4efe2'], ['#3f79bd', '#f4efe2'], ['#4aa056', '#f4efe2'], ['#e4b638', '#f4efe2'], ['#8a56a8', '#f4efe2']];
const tentWall: BPaint = (c, col) => {
  const [a, b] = at(TENTS, col);
  stripes(c, a, b, 0, 0, 16, 16, 4);
  rect(c, 0, 0, 16, 1, 'rgba(255,255,255,0.22)');
  dither(c, 0, 12, 16, 4, 'rgba(0,0,0,0.12)', 0);
  rect(c, 0, 15, 16, 1, 'rgba(0,0,0,0.3)');
};
const TENT_DEF: BDef = {
  top: (c, col) => {
    const [a, b] = at(TENTS, col);
    stripes(c, a, b, 0, 0, 16, 16, 4);
    rect(c, 0, 0, 16, 3, 'rgba(255,255,255,0.3)');
    dither(c, 0, 8, 16, 8, 'rgba(0,0,0,0.12)', 0);
    px(c, 7, 0, '#e8c440');
    px(c, 8, 0, '#e8c440');
  },
  bot: (c, col) => {
    const [a, b] = at(TENTS, col);
    stripes(c, a, b, 0, 0, 16, 10, 4);
    dither(c, 0, 4, 16, 6, 'rgba(0,0,0,0.14)', 0);
    // scalloped valance
    for (let x = 0; x < 16; x += 4) {
      const cc = (x / 4) % 2 ? b : a;
      rect(c, x, 10, 4, 3, cc);
      rect(c, x + 1, 13, 2, 1, cc);
    }
    rect(c, 0, 14, 16, 2, 'rgba(0,0,0,0.35)');
  },
  wall: tentWall,
  win: (c, col, f, S) => {
    tentWall(c, col, f, S);
    rect(c, 3, 3, 10, 7, '#3a3a42');
    rect(c, 4, 4, 8, 5, '#bfe0ee');
    rect(c, 4, 4, 3, 1, '#f4fbff');
    rect(c, 3, 10, 10, 1, '#f4efe2');
  },
  door: (c, col, f, S) => {
    tentWall(c, col, f, S);
    // open flap: dark interior between two tied-back curtains
    rect(c, 3, 0, 10, 16, '#2c2430');
    rect(c, 4, 1, 8, 15, '#463a46');
    rect(c, 0, 0, 4, 16, at(TENTS, col)[0]);
    rect(c, 12, 0, 4, 16, at(TENTS, col)[1]);
    rect(c, 3, 0, 1, 16, 'rgba(0,0,0,0.4)');
    rect(c, 12, 0, 1, 16, 'rgba(0,0,0,0.4)');
    rect(c, 0, 7, 3, 1, '#c8a040');
    rect(c, 13, 7, 3, 1, '#c8a040');
  },
};

// ---- hangar (soundstage) ------------------------------------------------------------------------

const hangWall: BPaint = (c, col) => {
  rect(c, 0, 0, 16, 16, '#aaa696');
  for (let x = 0; x < 16; x += 4) {
    rect(c, x, 0, 1, 16, '#c4c0b0');
    rect(c, x + 2, 0, 1, 16, '#84806f');
  }
  rect(c, 0, 0, 16, 1, '#d0ccbc');
  rect(c, 0, 15, 16, 1, '#6c6858');
  speckle(c, col, '#8a8676', 4);
};
const HANG_DEF: BDef = {
  top: (c) => {
    rect(c, 0, 0, 16, 16, '#8c8a80');
    for (let x = 0; x < 16; x += 8) {
      rect(c, x, 0, 1, 16, '#6c6a60');
      rect(c, x + 1, 0, 3, 16, '#a4a296');
    }
    rect(c, 0, 8, 16, 1, '#6c6a60');
    for (let x = 0; x < 16; x += 4) px(c, x + 2, 8, '#c0beb2');
    speckle(c, 2, '#767468', 6);
  },
  bot: (c) => {
    rect(c, 0, 0, 16, 16, '#9a9888');
    rect(c, 0, 0, 16, 2, '#c8c6b6');
    for (let x = 0; x < 16; x += 8) rect(c, x, 2, 1, 10, '#6c6a60');
    rect(c, 0, 11, 16, 1, '#6c6a60');
    rect(c, 0, 12, 16, 2, '#5e5c52');
    rect(c, 0, 14, 16, 2, 'rgba(0,0,0,0.5)');
  },
  wall: hangWall,
  win: (c, col, f, S) => {
    hangWall(c, col, f, S);
    rect(c, 2, 3, 12, 5, '#3a3a44');
    rect(c, 3, 4, 10, 3, '#f4d67c');
    rect(c, 3, 4, 10, 1, '#fff0b8');
    rect(c, 2, 8, 12, 1, '#6c6858');
  },
  door: (c, col, f, S) => {
    hangWall(c, col, f, S);
    rect(c, 0, 0, 16, 16, '#3c3c46');
    rect(c, 1, 1, 14, 15, '#5a5a66');
    rect(c, 7, 1, 2, 15, '#2c2c34');
    for (const y of [4, 8, 12]) {
      rect(c, 1, y, 6, 1, '#767684');
      rect(c, 9, y, 6, 1, '#767684');
    }
    // number plate and the red ON AIR bulb
    rect(c, 4, 2, 8, 5, '#1f1d2b');
    rect(c, 5, 3, 6, 3, '#f0e8c8');
    const digits = [[0, 0, 0, 1, 1, 1], [1, 0, 1, 1, 0, 1]];
    void digits;
    px(c, 6, 4, '#1f1d2b');
    px(c, 7, 3, '#1f1d2b');
    px(c, 8, 4, '#1f1d2b');
    px(c, 9, 5, '#1f1d2b');
    disc(c, 8, 9, 1, (f >> 4) % 2 ? '#ff3a30' : '#a02220');
  },
};

// ---- false front (studio backlot) ---------------------------------------------------------------

const FACADES: { wall: string; trim: string; sign: string }[] = [
  { wall: '#a8623c', trim: '#f0dcb0', sign: '#f4e4b0' },
  { wall: '#8a5a52', trim: '#d8c8b4', sign: '#3a3a44' },
  { wall: '#e0b8b0', trim: '#fff6ea', sign: '#5a8a70' },
  { wall: '#7c8a9a', trim: '#e8ecf0', sign: '#c8a040' },
];
const facWall: BPaint = (c, col) => {
  const F = at(FACADES, col);
  rect(c, 0, 0, 16, 16, F.wall);
  for (let x = 0; x < 16; x += 4) rect(c, x + 3, 0, 1, 16, shade(F.wall, -0.28));
  for (let i = 0; i < 3; i++) rect(c, Math.floor(noise(i, col, 51) * 12), Math.floor(noise(i, col, 52) * 14), 3, 2, shade(F.wall, 0.22));
  rect(c, 0, 0, 16, 1, 'rgba(255,255,255,0.15)');
};
const FAC_DEF: BDef = {
  top: (c, col) => {
    const F = at(FACADES, col);
    rect(c, 0, 0, 16, 16, F.wall);
    rect(c, 0, 0, 16, 2, F.trim);
    rect(c, 1, 3, 14, 10, F.sign);
    rect(c, 1, 3, 14, 1, 'rgba(255,255,255,0.4)');
    rect(c, 1, 12, 14, 1, 'rgba(0,0,0,0.3)');
    for (let i = 0; i < 4; i++) rect(c, 3 + i * 3, 6 + ((i * 2 + col) % 3), 2, 2, col % 2 ? '#f4e4b0' : '#5a3a26');
  },
  bot: (c, col) => {
    const F = at(FACADES, col);
    facWall(c, col, 0, {} as Skin);
    rect(c, 0, 0, 16, 3, F.trim);
    rect(c, 0, 3, 16, 1, shade(F.wall, -0.4));
    for (let x = 1; x < 16; x += 4) rect(c, x, 4, 2, 2, F.trim);
    rect(c, 0, 12, 16, 2, 'rgba(0,0,0,0.3)');
    rect(c, 0, 14, 16, 2, 'rgba(0,0,0,0.5)');
  },
  wall: facWall,
  win: (c, col, f, S) => {
    const F = at(FACADES, col);
    facWall(c, col, f, S);
    rect(c, 2, 1, 12, 12, F.trim);
    rect(c, 3, 2, 10, 10, '#4a5a70');
    rect(c, 3, 2, 10, 10, '#6f8ab0');
    for (let i = 0; i < 4; i++) rect(c, 4 + i * 2, 3 + i * 2, 2, 1, 'rgba(255,255,255,0.5)');
    rect(c, 7, 2, 2, 10, F.trim);
    rect(c, 2, 12, 12, 2, shade(F.trim, -0.2));
  },
  door: (c, col, f, S) => {
    const F = at(FACADES, col);
    facWall(c, col, f, S);
    if (col % 2 === 0) {
      // saloon batwing doors
      rect(c, 1, 2, 14, 14, '#2a2018');
      rect(c, 2, 5, 6, 9, '#8a5a30');
      rect(c, 8, 5, 6, 9, '#7c4e28');
      rect(c, 2, 5, 6, 1, '#b07c48');
      rect(c, 8, 5, 6, 1, '#a06e3c');
      rect(c, 8, 5, 1, 9, '#2a2018');
    } else {
      rect(c, 1, 0, 14, 16, F.trim);
      rect(c, 3, 1, 10, 15, '#2c2c36');
      rect(c, 4, 2, 8, 14, S.door[0] ?? '#8c2c2c');
      rect(c, 5, 4, 6, 4, 'rgba(255,255,255,0.18)');
      rect(c, 10, 9, 2, 2, '#e8c860');
    }
  },
};

// ---- railway car / locomotive -------------------------------------------------------------------

const CARCOL = ['#3a5a4a', '#6a2a34', '#2c3e5a', '#5a4630'];
const carWall: BPaint = (c, col) => {
  const b = at(CARCOL, col);
  rect(c, 0, 0, 16, 16, b);
  rect(c, 0, 0, 16, 1, shade(b, 0.3));
  rect(c, 0, 12, 16, 1, '#d6b458');
  rect(c, 0, 13, 16, 3, shade(b, -0.35));
  rect(c, 0, 3, 16, 1, '#d6b458');
  for (let x = 2; x < 16; x += 6) px(c, x, 14, shade(b, 0.3));
};
const CAR_DEF: BDef = {
  top: (c, col) => {
    rect(c, 0, 0, 16, 16, '#d6d0c2');
    rect(c, 0, 0, 16, 2, '#f0ece2');
    rect(c, 0, 7, 16, 2, '#b4ae9e');
    rect(c, 0, 8, 16, 1, '#8e8878');
    if (col % 2 === 0) {
      disc(c, 4, 12, 2, '#6c6a60');
      disc(c, 4, 12, 1, '#a09c90');
      disc(c, 12, 12, 2, '#6c6a60');
      disc(c, 12, 12, 1, '#a09c90');
    }
    dither(c, 0, 4, 16, 2, '#c4beb0', 0);
  },
  bot: (c, col) => {
    rect(c, 0, 0, 16, 10, '#c9c3b4');
    rect(c, 0, 0, 16, 2, '#e4dfd2');
    rect(c, 0, 9, 16, 1, '#8e8878');
    rect(c, 0, 10, 16, 2, '#d6b458');
    rect(c, 0, 12, 16, 4, shade(at(CARCOL, col), -0.4));
    rect(c, 0, 14, 16, 2, 'rgba(0,0,0,0.5)');
  },
  wall: carWall,
  win: (c, col, f, S) => {
    carWall(c, col, f, S);
    rect(c, 1, 2, 14, 10, '#d6b458');
    rect(c, 2, 3, 12, 8, '#ffd98a');
    rect(c, 2, 3, 12, 3, '#fff0c0');
    rect(c, 2, 3, 2, 8, '#8e2a36');
    rect(c, 12, 3, 2, 8, '#8e2a36');
    rect(c, 7, 3, 1, 8, '#a67a38');
    // a silhouette in the window
    if (col % 3 === 0) {
      disc(c, 9, 6, 1, '#3a2a2a');
      rect(c, 8, 7, 3, 4, '#3a2a2a');
    }
  },
  door: (c, col, f, S) => {
    carWall(c, col, f, S);
    rect(c, 3, 1, 10, 15, '#d6b458');
    rect(c, 4, 2, 8, 14, S.door[0] ?? '#5a3020');
    rect(c, 5, 3, 6, 4, '#ffd98a');
    rect(c, 5, 3, 6, 1, '#fff0c0');
    rect(c, 3, 1, 1, 15, '#f0d888');
    rect(c, 12, 1, 1, 15, '#a67a38');
    rect(c, 10, 9, 2, 2, '#f0d888');
    // brass steps
    rect(c, 4, 14, 8, 1, '#a67a38');
  },
};

// locomotive: colour index is the segment
const locoWall: BPaint = (c, col, f) => {
  rect(c, 0, 0, 16, 16, '#242430');
  if (col === 5 || col === 6) {
    // tender side
    rect(c, 0, 0, 16, 12, '#2c2c3a');
    rect(c, 0, 0, 16, 1, '#4a4a5c');
    rect(c, 2, 3, 12, 5, '#d6b458');
    rect(c, 3, 4, 10, 3, '#2c2c3a');
    px(c, 5, 5, '#d6b458');
    px(c, 8, 5, '#d6b458');
    disc(c, 4, 13, 2, '#6a2a2a');
    disc(c, 12, 13, 2, '#6a2a2a');
    return;
  }
  // wheels, driving rods and the pounding piston
  for (const wx of [4, 12]) {
    disc(c, wx, 11, 4, '#6a2a2a');
    disc(c, wx, 11, 3, '#8e3a34');
    disc(c, wx, 11, 1, '#d6b458');
    const a = ((f % 8) / 8) * Math.PI * 2;
    px(c, wx + Math.round(Math.cos(a) * 2), 11 + Math.round(Math.sin(a) * 2), '#d6d0c2');
  }
  rect(c, 3, 9 + (f % 2), 10, 1, '#b4b4c0');
  rect(c, 0, 2, 16, 5, '#2c2c3a');
  rect(c, 0, 2, 16, 1, '#4a4a5c');
  rect(c, 0, 6, 16, 1, '#d6b458');
};
const LOCO_DEF: BDef = {
  top: (c, col, f) => {
    rect(c, 0, 0, 16, 16, '#343444');
    rect(c, 0, 0, 16, 3, '#5a5a6c');
    rect(c, 0, 6, 16, 1, '#20202c');
    if (col === 3) {
      // chimney with a plume of smoke
      disc(c, 8, 8, 5, '#1c1c26');
      disc(c, 8, 8, 4, '#2c2c3a');
      disc(c, 8, 8, 2, '#0e0e14');
      const p = (f % 8);
      disc(c, 8 + Math.round(Math.sin(f / 3) * 2), 3 - (p >> 2), 3, 'rgba(230,230,240,0.7)');
    } else if (col === 2) {
      disc(c, 8, 8, 4, '#d6b458');
      disc(c, 8, 8, 3, '#f0d888');
      rect(c, 7, 4, 2, 2, '#a67a38');
    } else if (col === 4) {
      rect(c, 0, 0, 16, 16, '#3a2e30');
      rect(c, 1, 1, 14, 14, '#4a3c3e');
      rect(c, 0, 0, 16, 2, '#6a5a5c');
    } else if (col === 5 || col === 6) {
      rect(c, 0, 0, 16, 16, '#1c1c24');
      for (let i = 0; i < 14; i++) rect(c, Math.floor(noise(i, col, 61) * 15), Math.floor(noise(i, col, 62) * 15), 2, 2, i % 3 ? '#0c0c12' : '#3a3a48');
    } else {
      rect(c, 4, 6, 8, 4, '#4a4a5c');
    }
    if (col === 0) {
      disc(c, 8, 9, 3, '#f0e8b0');
      disc(c, 8, 9, 1, '#ffffff');
    }
  },
  bot: (c, col) => {
    rect(c, 0, 0, 16, 16, col === 4 ? '#3a2e30' : col === 5 || col === 6 ? '#242430' : '#2c2c3a');
    if (col !== 4 && col < 5) {
      rect(c, 0, 0, 16, 2, '#5a5a6c');
      rect(c, 2, 4, 2, 8, '#d6b458');
      rect(c, 12, 4, 2, 8, '#d6b458');
    }
    if (col === 4) rect(c, 3, 3, 10, 6, '#ffb060');
    rect(c, 0, 12, 16, 4, 'rgba(0,0,0,0.45)');
  },
  wall: locoWall,
  win: locoWall,
  door: (c, col, f, S) => {
    locoWall(c, col, f, S);
    if (col === 4) {
      rect(c, 2, 0, 12, 16, '#242430');
      rect(c, 3, 2, 10, 13, (f >> 3) % 2 ? '#ff8a30' : '#ff6a20');
      rect(c, 4, 4, 8, 6, '#ffd060');
      rect(c, 6, 5, 4, 3, '#fff2b0');
      rect(c, 2, 0, 12, 2, '#6a6a7c');
    }
  },
};

// ---- ship's deckhouse ---------------------------------------------------------------------------

const cabinWall: BPaint = (c, col, _f, S) => {
  const liner = S.id === 'liner';
  rect(c, 0, 0, 16, 16, liner ? '#f0eee6' : col % 2 ? '#efe6cc' : '#f4f1ea');
  for (let y = 2; y < 12; y += 3) rect(c, 0, y, 16, 1, liner ? '#dcdad0' : '#d8cfb4');
  rect(c, 0, 12, 16, 4, liner ? '#c23c3c' : '#7a3a2c');
  rect(c, 0, 12, 16, 1, liner ? '#e86a6a' : '#a4584a');
  rect(c, 0, 15, 16, 1, 'rgba(0,0,0,0.3)');
};
const CABIN_DEF: BDef = {
  top: (c, col, _f, S) => {
    const liner = S.id === 'liner';
    rect(c, 0, 0, 16, 16, liner ? '#d6d8dc' : '#efe8d2');
    rect(c, 0, 0, 16, 2, '#ffffff');
    // skylight
    if (col % 2 === 0) {
      rect(c, 3, 4, 10, 8, '#5a4a3a');
      rect(c, 4, 5, 8, 6, '#9fd0e0');
      rect(c, 4, 5, 8, 2, '#d8f0f8');
      rect(c, 7, 5, 2, 6, '#5a4a3a');
    } else {
      for (let x = 0; x < 16; x += 4) rect(c, x + 3, 0, 1, 16, '#b8b4a4');
      rect(c, 12, 10, 3, 3, '#5a5a66');
    }
  },
  bot: (c, col, _f, S) => {
    const liner = S.id === 'liner';
    rect(c, 0, 0, 16, 10, liner ? '#d6d8dc' : '#efe8d2');
    rect(c, 0, 0, 16, 2, '#ffffff');
    rect(c, 0, 10, 16, 3, liner ? '#2a3a5a' : '#8e2a36');
    if (!liner) {
      // wedding-cake gingerbread scallops
      for (let x = 0; x < 16; x += 4) {
        rect(c, x, 13, 4, 1, '#efe8d2');
        rect(c, x + 1, 14, 2, 1, '#efe8d2');
        px(c, x + 1, 13, '#d6b458');
      }
    }
    rect(c, 0, 14, 16, 2, 'rgba(0,0,0,0.45)');
    void col;
  },
  wall: cabinWall,
  win: (c, col, f, S) => {
    cabinWall(c, col, f, S);
    if (S.id === 'liner') {
      for (const px0 of [4, 12]) {
        disc(c, px0, 7, 3, '#c8a040');
        disc(c, px0, 7, 2, '#1c2c4a');
        disc(c, px0, 7, 1, '#8fb4dc');
        px(c, px0 - 1, 6, '#e8f4ff');
      }
    } else {
      rect(c, 3, 1, 10, 11, '#2f5a48');
      rect(c, 5, 2, 6, 9, '#ffd98a');
      rect(c, 5, 2, 6, 3, '#fff0c0');
      rect(c, 3, 1, 2, 11, '#3f7a60');
      rect(c, 11, 1, 2, 11, '#3f7a60');
      for (let y = 2; y < 12; y += 2) {
        px(c, 3, y, '#1f4030');
        px(c, 12, y, '#1f4030');
      }
    }
  },
  door: (c, col, f, S) => {
    cabinWall(c, col, f, S);
    rect(c, 3, 0, 10, 16, '#c9a24a');
    rect(c, 4, 1, 8, 15, S.id === 'liner' ? '#2a3a5a' : '#7a3a2c');
    for (let y = 3; y < 15; y += 2) rect(c, 5, y, 6, 1, 'rgba(0,0,0,0.25)');
    rect(c, 5, 3, 6, 1, 'rgba(255,255,255,0.25)');
    rect(c, 10, 8, 2, 2, '#f0d888');
  },
};

// ---- glass pavilion (gallery, restaurant) -------------------------------------------------------

const glassWall: BPaint = (c, col, f, S) => {
  rect(c, 0, 0, 16, 16, '#5a6a7a');
  rect(c, 1, 1, 14, 14, '#7ea6bc');
  for (let i = 0; i < 5; i++) rect(c, 2 + i * 3, 1 + i, 2, 1, 'rgba(255,255,255,0.32)');
  rect(c, 0, 7, 16, 1, '#3a4652');
  rect(c, 7, 0, 1, 16, '#3a4652');
  rect(c, 0, 0, 16, 1, '#c8d2da');
  // warm interior spill
  if (col % 2 === 0) dither(c, 1, 8, 14, 7, 'rgba(255,214,140,0.5)', f & 1);
  void S;
};
const GLASS_DEF: BDef = {
  top: (c) => {
    rect(c, 0, 0, 16, 16, '#4a5562');
    speckle(c, 5, '#5e6a78', 12);
    rect(c, 0, 0, 16, 2, '#c8d2da');
    rect(c, 2, 6, 12, 6, '#2a3440');
    rect(c, 3, 7, 10, 4, '#7ec8e8');
    rect(c, 3, 7, 10, 1, '#d8f4ff');
  },
  bot: (c) => {
    rect(c, 0, 0, 16, 16, '#aeb6be');
    rect(c, 0, 0, 16, 3, '#e4e8ec');
    rect(c, 0, 3, 16, 1, '#7a848e');
    rect(c, 0, 12, 16, 2, '#586470');
    rect(c, 0, 14, 16, 2, 'rgba(0,0,0,0.5)');
  },
  wall: glassWall,
  win: glassWall,
  door: (c, col, f, S) => {
    glassWall(c, col, f, S);
    rect(c, 1, 0, 14, 16, '#c8d2da');
    rect(c, 2, 1, 12, 15, '#3a4652');
    rect(c, 3, 2, 5, 14, '#a8dcf0');
    rect(c, 9, 2, 4, 14, '#98d0e8');
    rect(c, 3, 2, 2, 14, '#e4f8ff');
    rect(c, 7, 8, 1, 4, '#e8e8f0');
    rect(c, 9, 8, 1, 4, '#e8e8f0');
  },
};

// ---- half-timbered hall (cricket pavilion, church hall) -----------------------------------------

const timberWall: BPaint = (c, col) => {
  const cream = col % 2 ? '#e8d8b0' : '#f0ead8';
  rect(c, 0, 0, 16, 16, cream);
  rect(c, 0, 0, 16, 2, '#4a3222');
  rect(c, 0, 14, 16, 2, '#4a3222');
  rect(c, 0, 0, 2, 16, '#4a3222');
  rect(c, 14, 0, 2, 16, '#4a3222');
  for (let i = 0; i < 8; i++) px(c, 2 + i, 12 - i, '#4a3222');
  speckle(c, col, '#d6c8a0', 5);
};
const TIMBER_DEF: BDef = {
  top: (c, col) => {
    tiles(c, at(['#c47a4a', '#a4603a', '#8a4a32'], col), 0, 16, 0, 'rgba(0,0,0,0.25)', 'rgba(255,255,255,0.16)');
    rect(c, 0, 0, 16, 2, 'rgba(255,255,255,0.25)');
  },
  bot: (c, col) => {
    tiles(c, at(['#b46e42', '#985836', '#7e4430'], col), 0, 12, 1, 'rgba(0,0,0,0.25)', 'rgba(255,255,255,0.14)');
    rect(c, 0, 12, 16, 2, '#4a3222');
    rect(c, 0, 14, 16, 2, 'rgba(0,0,0,0.5)');
  },
  wall: timberWall,
  win: (c, col, f, S) => {
    timberWall(c, col, f, S);
    rect(c, 3, 3, 10, 9, '#4a3222');
    rect(c, 4, 4, 8, 7, '#a8d4ee');
    rect(c, 7, 4, 2, 7, '#4a3222');
    rect(c, 4, 7, 8, 1, '#4a3222');
    rect(c, 5, 5, 1, 1, '#ffffff');
  },
  door: (c, col, f, S) => {
    timberWall(c, col, f, S);
    rect(c, 2, 1, 12, 15, '#4a3222');
    rect(c, 3, 3, 10, 13, '#6c8a5a');
    rect(c, 7, 3, 2, 13, '#4a3222');
    rect(c, 4, 4, 3, 4, 'rgba(255,255,255,0.2)');
    rect(c, 9, 4, 3, 4, 'rgba(255,255,255,0.2)');
    rect(c, 3, 1, 10, 2, '#e8d8a0');
  },
};

// ---- corrugated shed ----------------------------------------------------------------------------

const shedWall: BPaint = (c, col) => {
  const b = at(['#8a5a3c', '#6a7a86', '#7a5a48'], col);
  rect(c, 0, 0, 16, 16, b);
  for (let x = 0; x < 16; x += 4) {
    rect(c, x, 0, 1, 16, shade(b, 0.2));
    rect(c, x + 2, 0, 1, 16, shade(b, -0.25));
  }
  rect(c, 0, 0, 16, 1, shade(b, 0.3));
  speckle(c, col, '#b0684a', 5);
};
const SHED_DEF: BDef = {
  top: (c, col) => {
    const b = at(['#7a4a34', '#58646e', '#6a4a3a'], col);
    rect(c, 0, 0, 16, 16, b);
    for (let x = 0; x < 16; x += 4) {
      rect(c, x, 0, 1, 16, shade(b, 0.2));
      rect(c, x + 2, 0, 1, 16, shade(b, -0.3));
    }
    rect(c, 0, 0, 16, 2, 'rgba(255,255,255,0.25)');
  },
  bot: (c, col) => {
    SHED_DEF.top(c, col, 0, {} as Skin);
    rect(c, 0, 12, 16, 2, 'rgba(0,0,0,0.3)');
    rect(c, 0, 14, 16, 2, 'rgba(0,0,0,0.5)');
  },
  wall: shedWall,
  win: (c, col, f, S) => {
    shedWall(c, col, f, S);
    rect(c, 3, 3, 10, 7, '#2a2a30');
    rect(c, 4, 4, 8, 5, '#f4c060');
    for (let x = 5; x < 12; x += 2) rect(c, x, 4, 1, 5, '#2a2a30');
  },
  door: (c, col, f, S) => {
    shedWall(c, col, f, S);
    rect(c, 1, 0, 14, 16, '#3a3a44');
    for (let y = 0; y < 16; y += 3) rect(c, 2, y, 12, 1, '#5a5a66');
    rect(c, 2, 1, 12, 1, '#6a6a78');
    rect(c, 10, 8, 3, 2, '#c9a24a');
  },
};

// ---- interior doorway (halls and concourses: the colour is the wall type) ------------------------------

const DECO_DEF: BDef = {
  top: (c, col, _f, S) => wallCap(c, col, 0, S),
  bot: (c, col, _f, S) => wallCap(c, col, 0, S),
  wall: (c, col, _f, S) => wallFace(c, col, 0, S),
  win: (c, col, _f, S) => wallFace(c, col, 0, S),
  door: (c, col, _f, S) => {
    wallFace(c, col, 0, S);
    rect(c, 1, 0, 14, 16, S.accent);
    rect(c, 2, 1, 12, 15, shade(S.door[0], -0.45));
    rect(c, 3, 2, 10, 14, S.door[0]);
    rect(c, 4, 3, 3, 5, 'rgba(255,255,255,0.16)');
    rect(c, 9, 3, 3, 5, 'rgba(255,255,255,0.16)');
    rect(c, 4, 9, 3, 6, 'rgba(0,0,0,0.16)');
    rect(c, 9, 9, 3, 6, 'rgba(0,0,0,0.16)');
    rect(c, 7, 2, 2, 14, shade(S.door[0], -0.35));
    rect(c, 6, 8, 1, 2, S.accent);
    rect(c, 9, 8, 1, 2, S.accent);
    rect(c, 1, 0, 14, 1, shade(S.accent, 0.4));
  },
};

const DEFS: Record<BStyle, BDef> = {
  plaster: PLASTER_DEF,
  brick: BRICK_DEF,
  stone: STONE_DEF,
  log: LOG_DEF,
  module: MOD_DEF,
  tent: TENT_DEF,
  hangar: HANG_DEF,
  facade: FAC_DEF,
  car: CAR_DEF,
  cabin: CABIN_DEF,
  glass: GLASS_DEF,
  timber: TIMBER_DEF,
  deco: DECO_DEF,
  loco: LOCO_DEF,
  shed: SHED_DEF,
};

const of = (part: keyof BDef): TilePaint => (c, v, f, S) => DEFS[styleOf(v)][part](c, colourOf(v), f, S);

export const BUILDING: Record<number, TilePaint> = {
  [K.ROOF_TOP]: of('top'),
  [K.ROOF_BOT]: of('bot'),
  [K.WALL_B]: of('wall'),
  [K.WINDOW_B]: of('win'),
  [K.DOOR_B]: of('door'),
};
