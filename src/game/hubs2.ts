/** Bespoke overworlds: ships on water, a train at its platform, and the three indoor halls (opera house, restaurant, gallery). */
import type { Rng } from '../../shared/generator/rng';
import { Grid } from './grid';
import type { Region } from './grid';
import { K, cell, styleVar } from './tiles';
import { P, meta, sky } from './hubs';
import type { HubDoor, HubResult, Place } from './hubs';
import { WT } from './art/interior';
import type { Dir } from './types';

// ---------------------------------------------------------------------------------------------------
// ships

export function boatHub(kind: 'riverboat' | 'liner', places: Place[], rng: Rng): HubResult {
  const n = places.length;
  const deckRows = n > 5 ? 2 : 1;
  const perRow = Math.ceil(n / deckRows);
  const river = kind === 'riverboat';
  const M = 3;
  const SL = river ? 3 : 2;
  const BL = river ? 7 : 10; // the liner gets a long, raked clipper bow instead of the paddle steamer's blunt one
  const CW = perRow * 5;
  const xs = M;
  const cx0 = xs + SL + 1;
  const cx1 = cx0 + CW - 1;
  const xBowStart = cx1 + 2;
  const xe = xBowStart + BL;
  const W = xe + 1 + M;
  const yt = M + 1;
  const HH = 2 + 6 * deckRows;
  const yb = yt + HH - 1;
  const H = yb + 1 + M + 1;
  const spawnY = yt + 5 + 6 * (deckRows - 1);
  const spawn = { x: cx0 + (CW >> 1), y: spawnY };
  const g = new Grid(W, H, spawn, cell(K.WATER));
  const ymid = (yt + yb) / 2;
  const deck = new Set<string>();
  const addDeck = (x: number, y: number) => deck.add(`${x},${y}`);
  for (let x = xs; x <= xBowStart; x++) for (let y = yt; y <= yb; y++) addDeck(x, y);
  for (let k = 1; k <= BL; k++) {
    const half = Math.round((HH / 2) * Math.sqrt(1 - (k / (BL + 1)) ** 2));
    for (let y = Math.ceil(ymid - half + 0.5); y <= Math.floor(ymid + half - 0.5); y++) addDeck(xBowStart + k, y);
  }
  const isDeck = (x: number, y: number) => deck.has(`${x},${y}`);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (isDeck(x, y)) {
        g.gset(x, y, cell(river ? K.BOARDS : K.DECK, rng.int(0, 3)));
      } else {
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => isDeck(x + (dx as number), y + (dy as number)));
        g.gset(x, y, cell(K.WATER, near ? 1 : rng.int(0, 3) === 1 ? 2 : 0));
        g.oset(x, y, cell(K.BLOCK));
      }
    }
  // rails around the hull
  for (const [x, y] of deck) void [x, y];
  for (const key of deck) {
    const [xk, yk] = key.split(',').map(Number) as [number, number];
    const edge = ![[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => isDeck(xk + (dx as number), yk + (dy as number)));
    if (!edge) continue;
    const bottom = !isDeck(xk, yk + 1) && yk > ymid;
    const top = !isDeck(xk, yk - 1) && yk < ymid;
    if (xk === xs) g.oset(xk, yk, P('rail', 1));
    else if (top || bottom) g.oset(xk, yk, P('rail', 0));
    else g.oset(xk, yk, P('rail', 2));
  }
  // paddle wheel or stern flag
  if (river) {
    for (let y = yt + 1; y < yb; y++) {
      g.oset(xs, y, P('paddle', 1));
      g.oset(xs + 1, y, P('paddle', 2));
      g.oset(xs + 2, y, P('rail', 1));
    }
  } else {
    g.oset(xs + 1, yt + 1, P('mast'));
    g.oset(xs + 1, yb - 1, P('capstan'));
  }
  // cabins
  const doors: Record<string, HubDoor> = {};
  places.forEach((p, i) => {
    const r = Math.floor(i / perRow);
    const c = i % perRow;
    const y0 = yt + 1 + r * 6;
    const x0 = cx0 + c * 5;
    const d = g.building(x0, y0, 5, 'cabin', (i + (river ? 0 : 2)) % 2, 2, 1, 2);
    doors[p.key] = { x: d.x, y: d.y, sx: d.x, sy: d.y + 1, dir: 'down' };
    g.reserve(d.x - 1, d.y + 1, 3, 1);
  });
  // unused cabin slots become plain deckhouse
  for (let i = n; i < perRow * deckRows; i++) {
    const r = Math.floor(i / perRow);
    const c = i % perRow;
    g.building(cx0 + c * 5, yt + 1 + r * 6, 5, 'cabin', i % 2, -1, 1, 2);
  }
  // funnels rise out of the roof of the first deckhouse row: the liner gets three tall banded funnels marching down her spine,
  // the paddle steamer just two squat ones either side of her wheelhouse -- a silhouette you can tell apart at a glance
  const stacks = river
    ? [1, Math.max(2, perRow - 2)]
    : perRow <= 2
      ? [0, Math.max(1, perRow - 1)]
      : perRow === 3
        ? [0, 1, 2]
        : [0, Math.floor((perRow - 1) / 2), perRow - 1];
  for (const s of new Set(stacks)) {
    const x = cx0 + s * 5 + 2;
    g.oset(x, yt + 1, P('stack_t', river ? 1 : 0));
    g.oset(x, yt + 2, P('stack_b', river ? 1 : 0));
    if (!river) g.oset(x, yt + 3, P('stack_b', 0)); // an extra tile of height: a grander, taller funnel than the riverboat's
  }
  // the spare strip along each deck: lifeboats, chairs, coils, lamps
  const region: Region = { x0: xs + 1, y0: yt + 1, x1: xBowStart + 3, y1: yb - 1 };
  for (let r = 0; r < deckRows; r++) {
    const y = yt + 6 + r * 6;
    g.reserve(xs, y - 1, W, 1);
    if (r === deckRows - 1 || !river) {
      for (let x = cx0 + 1; x + 1 <= cx1 - 1; x += 6) {
        g.oset(x, y, P('lifeboat', 0));
        g.oset(x + 1, y, P('lifeboat', 1));
      }
    } else for (let x = cx0 + 1; x <= cx1 - 1; x += 4) g.oset(x, y, P(river ? 'cotton_bale' : 'deckchair', x % 3));
    g.oset(cx0 - 1, y, P('lamppost'));
    g.oset(cx1 + 1, y, P('lamppost'));
  }
  // bow: mast, capstan, coils
  const bx = xBowStart + 3;
  g.oset(bx, Math.round(ymid) - 1, P('mast'));
  if (!river) g.oset(bx - 2, Math.round(ymid), P('capstan'));
  g.oset(bx - 1, Math.round(ymid) + 2, P('rope_coil'));
  g.oset(bx - 1, Math.round(ymid) - 3, P('life_ring'));
  g.reserve(spawn.x - 3, spawn.y, 7, 1);
  if (!river) {
    // a swimming pool on the sun deck, tiled all round, and a radio mast at the stern
    const px0 = cx1 + 3;
    const py0 = Math.round(ymid) - 1;
    for (let y = py0 - 1; y <= py0 + 2; y++) for (let x = px0 - 1; x <= px0 + 3; x++) if (isDeck(x, y) && g.overKind(x, y) === K.NONE) g.gset(x, y, cell(K.TILE, 0));
    for (let y = py0; y < py0 + 2; y++) for (let x = px0; x < px0 + 3; x++) {
      g.gset(x, y, cell(K.WATER, 2));
      g.oset(x, y, cell(K.BLOCK));
    }
    g.oset(xs + 1, Math.round(ymid), P('antenna'));
    g.scatter([P('lounger', 0), P('lounger', 1), P('palm'), P('lounger', 2), P('deckchair', 1)], 9, region, () => rng.next());
  } else g.scatter([P('barrel_pyramid'), P('rope_coil'), P('bollard'), P('cotton_bale'), P('crate'), P('barrel')], 9, region, () => rng.next());
  const map = g.asMap('hub', river ? 'Main deck' : 'Sun deck', meta(kind, 'hub', 0));
  return { map, doors, spawn, inspector: { x: spawn.x + 2, y: spawn.y + 1 } };
}

// ---------------------------------------------------------------------------------------------------
// the train at its platform

export function trainHub(places: Place[], rng: Rng): HubResult {
  const n = places.length;
  const trains = n > 5 ? 2 : 1;
  const perRow = Math.ceil(n / trains);
  const locoLen = 7;
  const W = 3 + locoLen + perRow * 5 + 3;
  const PITCH = 10;
  const y0s = [4, 4 + PITCH];
  const H = 4 + trains * PITCH + 3;
  const spawn = { x: 3 + locoLen + ((perRow * 5) >> 1), y: H - 3 };
  const g = new Grid(W, H, spawn, cell(K.BALLAST, 0));
  sky(g, 3);
  for (let x = 0; x < W; x++) {
    g.oset(x, 3, x % 4 === 1 ? P('telegraph') : x % 4 === 3 ? P('pine') : P('drift', 0));
  }
  const doors: Record<string, HubDoor> = {};
  const seg = [0, 3, 1, 2, 4, 5, 6];
  for (let t = 0; t < trains; t++) {
    const y0 = y0s[t] as number;
    g.gfill(1, y0 + 4, W - 2, 1, cell(K.PLATFORM, 0));
    g.gfill(1, y0 + 5, W - 2, 2, cell(K.PLATFORM, 1));
    g.gfill(1, y0 + 7, W - 2, 2, cell(K.BALLAST, 1));
    g.gfill(1, y0 + 9, W - 2, 1, cell(K.BALLAST, 0));
    if (t === 0) {
      for (let c = 0; c < locoLen; c++) {
        const v = styleVar('loco', seg[c] as number);
        const x = 3 + c;
        g.oset(x, y0, cell(K.ROOF_TOP, v));
        g.oset(x, y0 + 1, cell(K.ROOF_BOT, v));
        g.oset(x, y0 + 2, cell(K.WINDOW_B, v));
        g.oset(x, y0 + 3, cell(seg[c] === 4 ? K.DOOR_B : K.WALL_B, v));
      }
    } else {
      // the station house where the second train's engine would be
      const d = g.building(3, y0, locoLen, 'timber', 1, 3, 1, 2);
      g.oset(d.x, d.y, cell(K.WALL_B, styleVar('timber', 1)));
      g.oset(d.x + 2, y0 + 3, P('bench'));
    }
  }
  // cars, and the engine cab as a door on the locomotive
  const cabPlace = places.findIndex((p) => /engine|cab/.test(p.key));
  const rest = places.map((p, i) => ({ p, i })).filter((o) => o.i !== cabPlace);
  if (cabPlace >= 0) {
    const y0 = y0s[0] as number;
    const x = 3 + seg.indexOf(4);
    const key = (places[cabPlace] as Place).key;
    doors[key] = { x, y: y0 + 3, sx: x, sy: y0 + 4, dir: 'down' };
  }
  rest.forEach(({ p }, k) => {
    const t = Math.floor(k / perRow);
    const c = k % perRow;
    const y0 = y0s[Math.min(t, trains - 1)] as number;
    const x0 = 3 + locoLen + c * 5;
    const d = g.building(x0, y0, 5, 'car', (k + t) % 4, 2, 1, 2);
    doors[p.key] = { x: d.x, y: d.y, sx: d.x, sy: d.y + 1, dir: 'down' };
  });
  // fill unused car slots
  const used = rest.length;
  for (let k = used; k < perRow * trains; k++) {
    const t = Math.floor(k / perRow);
    const c = k % perRow;
    g.building(3 + locoLen + c * 5, y0s[t] as number, 5, 'car', k % 4, -1, 1, 2);
  }
  for (const d of Object.values(doors)) g.reserve(d.x - 1, d.y + 1, 3, 2);
  g.reserve(spawn.x - 3, spawn.y - 3, 7, 5);
  // platform furniture and the world beyond the fence
  for (let t = 0; t < trains; t++) {
    const y0 = y0s[t] as number;
    for (let x = 6; x < W - 4; x += 8) if (g.overKind(x, y0 + 6) === K.NONE && !g.reserved.has(`${x},${y0 + 6}`)) g.oset(x, y0 + 6, P('lamppost'));
    for (let x = 9; x < W - 4; x += 11) if (g.overKind(x, y0 + 5) === K.NONE && !g.reserved.has(`${x},${y0 + 5}`)) g.oset(x, y0 + 5, P(x % 2 ? 'trunk' : 'hat_box', x % 3));
    g.oset(W - 3, y0 + 5, P('signal'));
  }
  for (let y = 4; y < H; y++) {
    g.oset(0, y, P('pine'));
    g.oset(W - 1, y, P('pine'));
  }
  for (let x = 0; x < W; x++) g.oset(x, H - 1, P(rng.pick(['pine', 'drift'])));
  const region: Region = { x0: 1, y0: 5, x1: W - 2, y1: H - 2 };
  g.scatter([P('coal_pile'), P('crate'), P('barrel'), P('trunk'), P('bench')], 10, region, () => rng.next());
  const map = g.asMap('hub', 'Platform', meta('train', 'hub', 0));
  return { map, doors, spawn, inspector: { x: spawn.x + 2, y: spawn.y - 2 } };
}

// ---------------------------------------------------------------------------------------------------
// indoor halls: the theatre auditorium, the restaurant floor, the gallery concourse

interface Slot {
  x: number;
  y: number;
  step: { x: number; y: number };
  dir: Dir;
}

function wallSlots(W: number, H: number, top: number[], sides: number[]): Slot[] {
  const s: Slot[] = [];
  for (const x of top) s.push({ x, y: 1, step: { x, y: 2 }, dir: 'down' });
  for (const y of sides) {
    s.push({ x: 0, y, step: { x: 1, y }, dir: 'right' });
    s.push({ x: W - 1, y, step: { x: W - 2, y }, dir: 'left' });
  }
  void H;
  return s;
}

function hall(
  env: 'theatre' | 'restaurant' | 'gallery',
  places: Place[],
  _rng: Rng,
  cfg: { W: number; H: number; wt: number; floor: (x: number, y: number) => number; slots: Slot[]; build: (g: Grid, mid: number) => void; back: (x: number) => number; theme: string },
): HubResult {
  const { W, H } = cfg;
  const spawn = { x: W >> 1, y: H - 3 };
  const g = new Grid(W, H, spawn, cell(K.WOOD));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g.gset(x, y, cfg.floor(x, y));
  for (let x = 0; x < W; x++) {
    g.oset(x, 0, cell(K.WALL, cfg.wt));
    g.oset(x, 1, cfg.back(x));
    g.oset(x, H - 1, cell(K.WALL, cfg.wt));
  }
  for (let y = 0; y < H; y++) {
    g.oset(0, y, cell(K.WALL, cfg.wt));
    g.oset(W - 1, y, cell(K.WALL, cfg.wt));
  }
  cfg.build(g, W >> 1);
  const doors: Record<string, HubDoor> = {};
  const slots = cfg.slots.slice();
  // fill slots in an order that spreads the doors around
  const ordered = slots.map((s, i) => ({ s, k: ((i * 7) % slots.length) + i * 0.001 })).sort((a, b) => a.k - b.k).map((o) => o.s);
  places.forEach((p, i) => {
    const s = ordered[i % ordered.length] as Slot;
    g.oset(s.x, s.y, cell(K.DOOR_B, styleVar('deco', cfg.wt & 15)));
    g.oset(s.x, s.y, cell(K.DOOR_B, styleVar('deco', cfg.wt & 15) | 0));
    doors[p.key] = { x: s.x, y: s.y, sx: s.step.x, sy: s.step.y, dir: s.dir };
    g.reserve(s.step.x, s.step.y, 1, 1);
  });
  g.reserve(spawn.x - 2, spawn.y - 1, 5, 2);
  const region: Region = { x0: 1, y0: 2, x1: W - 2, y1: H - 2 };
  void region;
  const map = g.asMap('hub', cfg.theme, { ...meta(env, 'hub', 0, false), wt: cfg.wt });
  return { map, doors, spawn, inspector: { x: spawn.x + 2, y: spawn.y - 1 } };
}

export function theatreHub(places: Place[], rng: Rng): HubResult {
  const W = 25;
  const H = 27;
  const mid = W >> 1;
  const wt = WT.gilt;
  const sides = [3, 6, 11, 14, 17, 20, 23];
  return hall('theatre', places, rng, {
    W,
    H,
    wt,
    theme: 'Opera house',
    floor: (x, y) => (y >= 2 && y <= 5 ? cell(K.STAGE, (x * 7 + y * 3) % 17 === 0 ? 1 : 0) : y <= 7 ? cell(K.WOOD, 2) : Math.abs(x - mid) <= 1 || x <= 2 || x >= W - 3 || y === 9 || y >= H - 5 ? cell(K.CARPET, 0) : cell(K.WOOD, (x + y) % 3)),
    back: (x) => (x === 0 || x === W - 1 ? cell(K.WALL, wt) : P('curtain', x % 5 === 2 ? 1 : 0)),
    slots: wallSlots(W, H, [], sides),
    build: (g) => {
      // the stage: flats, a throne, footlights
      g.oset(3, 2, P('flat', 0));
      g.oset(W - 4, 2, P('flat', 1));
      g.oset(mid, 2, P('throne'));
      for (const x of [5, 9, W - 10, W - 6]) g.oset(x, 5, P('spotlight'));
      g.oset(mid - 3, 3, P('skull'));
      // the pit: stands, a cello, a bass, a drum kit
      g.oset(6, 6, P('music_stand'));
      g.oset(9, 6, P('cello'));
      g.oset(12, 6, P('double_bass'));
      g.oset(15, 6, P('music_stand'));
      g.oset(18, 6, P('drum_kit'));
      g.oset(7, 7, P('chair'));
      g.oset(10, 7, P('music_stand'));
      g.oset(16, 7, P('chair'));
      for (let x = 1; x < W - 1; x++) if (x !== 2 && x !== W - 3) g.oset(x, 8, P('pit_rail'));
      // the stalls: rows of red velvet seats either side of the aisle
      for (let y = 11; y <= 19; y += 2) {
        for (let x = 4; x <= mid - 3; x++) g.oset(x, y, P('seats', (x + y) % 9 === 0 ? 1 : 0));
        for (let x = mid + 3; x <= W - 5; x++) g.oset(x, y, P('seats', (x * y) % 11 === 0 ? 1 : 0));
      }
      // boxes along the side walls between the doors
      for (const y of [4, 5, 8, 9, 12, 13, 15, 16, 18, 19, 21, 22]) {
        if (!sides.includes(y)) {
          g.oset(0, y, P('box_front'));
          g.oset(W - 1, y, P('box_front'));
        }
      }
      for (let y = H - 5; y < H - 1; y++) if (y % 2 === 0) for (const x of [3, W - 4]) g.oset(x, y, P('column'));
      g.oset(6, H - 3, P('plant'));
      g.oset(W - 7, H - 3, P('plant'));
      g.oset(4, H - 3, P('coat_rack', 0));
      g.oset(W - 5, H - 3, P('coat_rack', 1));
      g.lights.push({ x: mid, y: 14, r: 90, color: '#ffd28a', flicker: 0.05 }, { x: mid, y: 21, r: 80, color: '#ffd28a', flicker: 0.05 }, { x: mid, y: 4, r: 70, color: '#ffe8f0', flicker: 0.04 });
    },
  });
}

export function restaurantHub(places: Place[], rng: Rng): HubResult {
  const W = 29;
  const H = 21;
  const wt = WT.gilt | (1 << 4);
  const mid = W >> 1;
  // the bar occupies the bottom-right corner (the bottom wall never carries a door)
  const barX = W - 8;
  return hall('restaurant', places, rng, {
    W,
    H,
    wt,
    theme: 'Dining room',
    floor: (x, y) => {
      if (y >= 2 && y <= 3 && x >= 5 && x <= 8) return cell(K.CHECKER, (x + y) % 2); // the kitchen pass, tiled apart from the dining floor
      if (y >= H - 4 && x >= barX - 1 && x <= barX + 3) return cell(K.WOOD, 1 + (x % 2)); // the bar nook, darker boards
      return Math.abs(x - mid) <= 1 && y > 2 ? cell(K.CARPET, 0) : cell(K.WOOD, 3 + ((x >> 1) + (y >> 1)) % 1);
    },
    back: (x) => {
      if (x === 0 || x === W - 1) return cell(K.WALL, wt);
      if (x >= 5 && x <= 8) return x === 6 || x === 7 ? P('range') : P('pans_rack'); // the open kitchen pass window: a lit range glimpsed through it
      return x % 5 === 2 ? cell(K.WINDOW_W, wt) : x % 5 === 0 ? P('mirror') : cell(K.WALL_FACE, wt);
    },
    slots: wallSlots(W, H, [4, 9, 14, 19, 24], [5, 8, 11, 14]).filter((s) => s.y !== 1 || s.x % 5 !== 2),
    build: (g) => {
      // the pass counter, right under the kitchen window, where plates would wait for a waiter who never came
      for (let x = 5; x <= 8; x++) g.oset(x, 2, P('counter', x === 6 ? 1 : 0));
      g.reserve(4, 1, 6, 2);
      // the bar: bottle shelves against the back wall, the counter in front, two stools for regulars
      for (let i = 0; i < 3; i++) {
        g.oset(barX + i, H - 2, P('bottle_shelf'));
        g.oset(barX + i, H - 3, P('bar_counter'));
      }
      g.oset(barX - 1, H - 4, P('stool'));
      g.oset(barX + 1, H - 4, P('stool'));
      g.reserve(barX - 2, H - 4, 6, 3);
      // a host stand just inside the door, book open, ready for a party that never showed
      g.oset(mid - 7, H - 4, P('desk'));
      g.oset(mid - 7, H - 5, P('sign'));
      // rows of dressed tables, mostly square linen (real rectangular tables with chairs) with the occasional round
      // centrepiece table for variety -- never the flat glowing discs a demanding eye would call out
      let ti = 0;
      for (let ty = 5; ty <= H - 6; ty += 3) {
        for (let tx = 4; tx <= W - 6; tx += 5) {
          if (Math.abs(tx - mid) <= 2) continue;
          if (ti % 4 === 3) {
            // dine_table already carries its own meta.light (candle glow) -- pushing a second
            // hub light here would double-stack on the same tile and blow it out (round-3 bug).
            g.oset(tx, ty, P('dine_table', (tx + ty) % 2));
          } else {
            g.oset(tx, ty, P('table', ti % 2 === 0 ? 2 : 0));
            g.lights.push({ x: tx, y: ty, r: 26, color: '#ffc070', flicker: 0.22 });
          }
          g.oset(tx - 1, ty, P('chair', 0));
          g.oset(tx + 1, ty, P('chair', 1));
          ti++;
        }
      }
      g.oset(2, H - 3, P('plant'));
      g.oset(2, 3, P('coat_rack', 2));
      g.oset(2, 2, P('piano'));
      g.oset(mid - 2, 3, P('urn'));
      g.oset(mid + 2, 3, P('urn'));
      g.lights.push(
        { x: mid, y: 7, r: 80, color: '#ffd898', flicker: 0.04 },
        { x: mid, y: 14, r: 80, color: '#ffd898', flicker: 0.04 },
        { x: 6, y: 2, r: 34, color: '#ff9a4a', flicker: 0.3 },
        { x: barX + 1, y: H - 3, r: 30, color: '#ffc878', flicker: 0.1 },
      );
    },
  });
}

export function galleryHub(places: Place[], rng: Rng): HubResult {
  const W = 31;
  const H = 23;
  const wt = WT.white;
  const mid = W >> 1;
  // two partition walls split the concourse into a left wing, a central sculpture court and a right wing
  const wallL = 9;
  const wallR = W - 10;
  const gateY0 = 11;
  const gateY1 = 14;
  return hall('gallery', places, rng, {
    W,
    H,
    wt,
    theme: 'Main concourse',
    floor: (x, y) => {
      if (x >= 2 && x <= 4 && y >= 15 && y <= 18) return cell(K.METAL, (x + y) % 2); // the vault niche's steel floor
      return Math.abs(x - mid) <= 1 && y > 2 ? cell(K.CARPET, 2) : cell(K.MARBLE, (x * 3 + y) % 4);
    },
    back: (x) => (x === 0 || x === W - 1 ? cell(K.WALL, wt) : x % 6 === 3 ? cell(K.WINDOW_W, wt) : x % 6 === 0 ? P('art_frame', x % 6 === 0 ? (x / 6) % 6 : 0) : cell(K.WALL_FACE, wt)),
    slots: wallSlots(W, H, [4, 10, 16, 22, 28], [5, 9, 13, 17]).filter((s) => s.y !== 1 || (s.x % 6 !== 3 && s.x % 6 !== 0)),
    build: (g) => {
      // the two partitions: a real wall between wings, with an archway crossing at the middle and pictures hung on the piers themselves
      for (const wx of [wallL, wallR]) {
        for (let y = 2; y <= H - 2; y++) {
          if (y >= gateY0 && y <= gateY1) continue;
          g.oset(wx, y, cell(K.WALL_FACE, wt));
        }
        g.oset(wx, 7, P('art_frame', wx % 6));
        g.oset(wx, H - 6, P('art_frame', (wx + 3) % 6));
      }
      // the vault: a real steel door recessed in the left wing, with the deposit boxes beside it
      g.oset(3, 16, P('vault_door'));
      g.oset(3, 18, P('deposit_boxes'));
      g.reserve(2, 15, 3, 4);
      // the sculpture court: statues (not bare plinths) ringed with velvet rope, on the carpet at the heart of the hall
      g.oset(mid - 2, 6, P('statue', 0));
      g.oset(mid + 2, 6, P('statue', 1));
      g.oset(mid, 5, P('statue', 2));
      g.oset(mid - 4, 8, P('statue', 1));
      g.oset(mid + 4, 8, P('statue', 0));
      for (let y = 8; y < H - 5; y += 3) {
        g.oset(mid - 2, y, P('rope_post'));
        g.oset(mid + 2, y, P('rope_post'));
      }
      g.oset(mid - 4, 9, P('rope_post'));
      g.oset(mid + 4, 9, P('rope_post'));
      // one wing each: hung art already lines the partitions and the back wall; dress the floor beneath it
      for (const [x, y] of [[5, 7], [W - 6, 7], [7, 12], [W - 8, 12], [5, 16], [W - 6, 16]] as const) g.oset(x, y, P('plinth', (x + y) % 4));
      g.oset(8, 14, P('gallery_bench'));
      g.oset(W - 9, 14, P('gallery_bench'));
      g.oset(12, 18, P('install_bricks'));
      g.oset(W - 13, 18, P('unmade_bed'));
      g.oset(3, H - 3, P('palm'));
      g.oset(W - 4, H - 3, P('palm'));
      const leftRegion: Region = { x0: 2, y0: 3, x1: wallL - 1, y1: H - 3 };
      const rightRegion: Region = { x0: wallR + 1, y0: 3, x1: W - 3, y1: H - 3 };
      g.scatter([P('plinth', 0), P('plinth', 2), P('gallery_bench'), P('glass_case')], 6, leftRegion, () => rng.next());
      g.scatter([P('plinth', 1), P('plinth', 3), P('gallery_bench'), P('easel', 0), P('glass_case')], 6, rightRegion, () => rng.next());
      for (const x of [6, 12, 18, 24]) g.lights.push({ x, y: 5, r: 46, color: '#fff4d0', flicker: 0.02 });
      for (const [x, y] of [[mid, 10], [mid, 16]] as const) g.lights.push({ x, y, r: 60, color: '#fff0d0', flicker: 0.02 });
      g.lights.push({ x: 3, y: 16, r: 26, color: '#8fb4dc', flicker: 0.1 });
    },
  });
}
