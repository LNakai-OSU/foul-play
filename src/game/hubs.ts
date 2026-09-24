/** Overworld builders. Every setting gets its own hub: a village green, a snowbound base, a paddle steamer, a train on its siding... Pure and deterministic. */
import type { Rng } from '../../shared/generator/rng';
import { ENVS } from './env';
import { Grid } from './grid';
import type { Region } from './grid';
import { K, cell, styleVar } from './tiles';
import type { BStyle } from './tiles';
import { propCell } from './art/registry';
import type { EnvId } from './art/skins';
import './art/index';
import type { Dir, MapDef } from './types';

export interface Place {
  key: string;
  label: string;
  scene: boolean;
}

/** Where a place's door is, and where the detective stands when stepping out of it. */
export interface HubDoor {
  x: number;
  y: number;
  sx: number;
  sy: number;
  dir: Dir;
}

export interface HubResult {
  map: MapDef;
  doors: Record<string, HubDoor>;
  spawn: { x: number; y: number };
  /** free cells around the spawn for the inspector */
  inspector: { x: number; y: number };
}

export const P = (name: string, sub = 0): number => propCell(name, sub);
/** "table:1" fixes the sub-variant, "art_frame:r6" randomises 0-5, plain names randomise 0-2. */
export function propRef(token: string, rng: Rng): number {
  const [name, tail] = token.split(':') as [string, string | undefined];
  if (tail === undefined) return P(name, rng.int(0, 2));
  if (tail.startsWith('r')) return P(name, rng.int(0, Number(tail.slice(1)) - 1));
  return P(name, Number(tail));
}

export const sky = (g: Grid, rows: number, x0 = 0, x1 = g.w - 1): void => {
  for (let x = x0; x <= x1; x++) for (let y = 0; y < rows; y++) g.oset(x, y, cell(K.SKY, Math.min(2, y + (rows === 2 ? 1 : 0)) | ((x % 8) << 2)));
};

export function meta(env: EnvId, theme: string, dark: number, outdoor = true): Parameters<Grid['asMap']>[2] {
  const e = ENVS[env];
  return { env, theme, wt: 0, dark: Math.min(0.9, e.dusk + dark), ambient: e.ambient, outdoor };
}

const cobbleCell = (v = 0) => cell(K.COBBLE, v);

// ---------------------------------------------------------------------------------------------------
// generic town of buildings in rows (fete, lodge, station, studio, club, plain town)

interface Look {
  style: BStyle;
  colour: number;
  w: number;
  floors?: number;
}

interface TownCfg {
  env: EnvId;
  base: (x: number, y: number, rng: Rng) => number;
  road: (x: number, y: number, rng: Rng) => number;
  plaza: number;
  look: (p: Place, i: number, rng: Rng) => Look;
  skyRows: number;
  border: string[];
  scenery: string[];
  count: number;
  /** extra decoration once buildings and roads are in */
  after?: (g: Grid, ctx: TownCtx, rng: Rng) => void;
  dark?: number;
  /** extra columns on the left for a slope, a quay or a sea edge */
  margin?: number;
  /** force the number of building columns (a narrow alley, a wide midway) */
  cols?: number;
}

export interface TownCtx {
  /** left margin in tiles */
  ox: number;
  cols: number;
  rows: number;
  top: number;
  bx: number[];
  by: number[];
  doors: Record<string, HubDoor>;
  spawn: { x: number; y: number };
  region: Region;
}

const PITCH_X = 9;
const PITCH_Y = 9;

export function townHub(places: Place[], rng: Rng, cfg: TownCfg): HubResult {
  const n = places.length;
  const cols = cfg.cols ? Math.min(cfg.cols, n) : n <= 2 ? n : n <= 4 ? 2 : n <= 6 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const top = cfg.skyRows ? cfg.skyRows + 1 : 1;
  const ox = cfg.margin ?? 0;
  const w = cols * PITCH_X + 3 + ox;
  const h = top + 2 + (rows - 1) * PITCH_Y + 7 + 6;
  const spawn = { x: ox + ((w - ox) >> 1), y: h - 3 };
  const g = new Grid(w, h, spawn, cell(K.GRASS));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g.gset(x, y, cfg.base(x, y, rng));
  // paths: a road along each row's doorsteps, verticals between columns, a plaza at the bottom
  const doors: Record<string, HubDoor> = {};
  const bx: number[] = [];
  const by: number[] = [];
  for (let r = 0; r < rows; r++) {
    const y0 = top + 2 + r * PITCH_Y;
    by.push(y0);
    for (let x = 2 + ox; x < w - 2; x++) for (let dy = 4; dy <= 6; dy++) g.gset(x, y0 + dy, cfg.road(x, y0 + dy, rng));
  }
  for (let c = 0; c < cols - 1; c++) {
    const x = 2 + ox + c * PITCH_X + 8;
    for (let y = top + 2; y < h - 4; y++) g.gset(x, y, cfg.road(x, y, rng));
  }
  for (let y = h - 6; y < h - 1; y++) for (let x = spawn.x - 3; x <= spawn.x + 3; x++) g.gset(x, y, cfg.road(x, y, rng));
  for (let y = h - 5; y < h - 1; y++) for (let x = spawn.x - 2; x <= spawn.x + 2; x++) g.gset(x, y, cell(cfg.plaza, 0));
  if (cfg.skyRows) sky(g, cfg.skyRows);
  // border
  const bord = (x: number, y: number) => g.oset(x, y, propRef(rng.pick(cfg.border), rng));
  for (let x = 0; x < w; x++) {
    if (cfg.skyRows) bord(x, cfg.skyRows);
    else bord(x, 0);
    bord(x, h - 1);
  }
  for (let y = cfg.skyRows ? cfg.skyRows : 0; y < h; y++) {
    bord(0, y);
    bord(w - 1, y);
  }
  // buildings
  const order = places.map((p, i) => ({ p, i }));
  order.forEach(({ p, i }) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const look = cfg.look(p, i, rng);
    const x0 = 2 + ox + c * PITCH_X + 1 + ((7 - look.w) >> 1);
    const y0 = by[r] as number;
    bx.push(x0);
    const door = g.building(x0, y0, look.w, look.style, look.colour, look.w >> 1, look.floors ?? 1, 2);
    doors[p.key] = { x: door.x, y: door.y, sx: door.x, sy: door.y + 1, dir: 'down' };
    g.reserve(door.x - 1, door.y, 3, 3);
  });
  // spawn and inspector clearings
  g.reserve(spawn.x - 3, spawn.y - 3, 7, 5);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g.reserved.has(`${x},${y}`) === false && y > top && y < h - 1) void 0;
  const region: Region = { x0: 1, y0: top + 1, x1: w - 2, y1: h - 2 };
  const ctx: TownCtx = { ox, cols, rows, top, bx, by, doors, spawn, region };
  // scatter scenery, keeping roads mostly clear
  let placed = 0;
  let tries = 0;
  const want = Math.floor((w * h) / cfg.count);
  const scene = cfg.scenery;
  while (placed < want && tries++ < 900) {
    const x = rng.int(1, w - 2);
    const y = rng.int(top + 1, h - 2);
    const gk = g.ground[g.idx(x, y)] as number;
    if ((gk & 255) !== K.GRASS && (gk & 255) !== K.SNOW && (gk & 255) !== K.LAWN && rng.chance(0.9)) continue;
    if (!g.canPlace(x, y, region)) continue;
    g.oset(x, y, propRef(rng.pick(scene), rng));
    placed++;
  }
  cfg.after?.(g, ctx, rng);
  const map = g.asMap('hub', 'Town', meta(cfg.env, 'hub', cfg.dark ?? 0));
  return { map, doors, spawn, inspector: { x: spawn.x + 2, y: spawn.y - 2 } };
}

const noiseVar = (rng: Rng, n: number) => rng.int(0, n - 1);

// ---- village fete ---------------------------------------------------------------------------------

export function feteHub(places: Place[], rng: Rng): HubResult {
  let tentColour = 0;
  return townHub(places, rng, {
    env: 'fete',
    cols: 4,
    base: (_x, y, rng2) => (rng2.chance(0.1) ? cell(K.FLOWERS, noiseVar(rng2, 3)) : cell(K.LAWN, y % 2)),
    road: (_x, _y, rng2) => cell(K.DIRT, noiseVar(rng2, 2)),
    plaza: K.DIRT,
    skyRows: 2,
    border: ['tree', 'hedge', 'tree', 'bush:1'],
    scenery: ['tree', 'hay_bale', 'bench', 'rose_bush', 'bush', 'flag_pole', 'hay_bale'],
    count: 26,
    look: (p, i) => {
      if (/tent|marquee|stall|tombola/.test(p.key)) return { style: 'tent', colour: tentColour++ % 4, w: 5 };
      if (/cricket|pavilion|hall/.test(p.key)) return { style: 'timber', colour: i % 2, w: 7 };
      if (/garden|vicarage/.test(p.key)) return { style: 'plaster', colour: 0, w: 5 };
      return { style: 'tent', colour: tentColour++ % 4, w: 5 };
    },
    after: (g, c) => {
      // the maypole on the green, bunting strung along the roads
      const mx = c.spawn.x;
      const my = c.by[0]! + 8;
      if (c.rows > 1) g.oset(mx, my, P('maypole'));
      for (let r = 0; r < c.rows; r++) for (let x = 3; x < g.w - 3; x += 1) if (g.overKind(x, (c.by[r] as number) + 4) === K.NONE) g.oset(x, (c.by[r] as number) + 4, P('bunting', 0));
    },
  });
}

// ---- alpine lodge ---------------------------------------------------------------------------------

export function lodgeHub(places: Place[], rng: Rng): HubResult {
  return townHub(places, rng, {
    env: 'lodge',
    margin: 8,
    base: (x, y, rng2) => cell(K.SNOW, noiseVar(rng2, 4) + ((x * 3 + y) % 2) * 4),
    road: (_x, _y, rng2) => cell(K.SNOWPATH, noiseVar(rng2, 3)),
    plaza: K.SNOWPATH,
    skyRows: 2,
    border: ['pine', 'pine', 'drift'],
    scenery: ['pine', 'drift', 'pine', 'log_stack', 'lamppost', 'sled', 'marker'],
    count: 30,
    look: (p, i) => ({ style: 'log', colour: i % 3, w: /great|hall|lodge|trophy/.test(p.key) || i % 3 === 0 ? 7 : 5, floors: /great|hall/.test(p.key) ? 2 : 1 }),
    after: (g, c) => {
      // the ski slope down the whole left flank, with a chairlift: pylons up the hill and a lift shack at the bottom
      const sx0 = 1;
      const sx1 = c.ox - 1;
      for (let y = c.top; y < g.h - 2; y++)
        for (let x = sx0; x <= sx1; x++) {
          g.gset(x, y, cell(K.SNOW, 8 + (((x + (y >> 1)) % 4 < 2) ? 0 : 3)));
          if (g.overKind(x, y) === K.PROP) g.oset(x, y, 0);
        }
      for (let y = c.top + 1; y < g.h - 6; y += 5) {
        g.oset(sx1 - 1, y, P('antenna'));
        g.oset(sx0 + 1, y + 2, P('marker'));
      }
      g.reserve(sx0, c.top, c.ox, g.h - c.top);
      const lx = sx1 - 2;
      const ly = g.h - 7;
      g.building(lx - 1, ly, 3, 'cabin', 1, 1, 1, 2);
      // a hot tub on its own boarded deck by the first chalet, loungers and all
      const hx = c.bx[0]! + 6;
      const hy = c.by[0]! + 5;
      for (let y = hy - 1; y <= hy + 1; y++) for (let x = hx - 1; x <= hx + 1; x++) if (x > 0 && x < g.w - 1) g.gset(x, y, cell(K.BOARDS, (x + y) % 3));
      if (g.canPlace(hx, hy, c.region)) g.oset(hx, hy, P('hot_tub'));
      if (g.canPlace(hx + 2, hy, c.region)) g.oset(hx + 2, hy, P('lounger', 1));
    },
  });
}

// ---- polar station --------------------------------------------------------------------------------

export function stationHub(places: Place[], rng: Rng): HubResult {
  return townHub(places, rng, {
    env: 'station',
    margin: 0,
    base: (x, y, rng2) => cell(K.SNOW, noiseVar(rng2, 4) + ((x + y) % 2) * 4),
    // the roads are sealed metal corridors linking the modules, with the snow drifting up against them
    road: (_x, _y, rng2) => cell(K.METAL, noiseVar(rng2, 2)),
    plaza: K.METAL,
    skyRows: 3,
    border: ['drift', 'drift', 'marker'],
    scenery: ['drum', 'crate_snow', 'marker', 'drift', 'flag_pole'],
    count: 44,
    dark: 0.1,
    look: (_p, i) => ({ style: 'module', colour: i % 4, w: i % 3 === 1 ? 7 : 5 }),
    after: (g, c, rng2) => {
      // the frozen sea along the bottom edge, a radome and a mast, a parked snowmobile
      for (let y = g.h - 6; y < g.h - 1; y++) {
        for (let x = 1; x < g.w - 1; x++) {
          if (Math.abs(x - c.spawn.x) <= 3) continue;
          g.gset(x, y, cell(K.ICE, (x * 5 + y * 3) % 4));
          if (g.overKind(x, y) === K.PROP) g.oset(x, y, 0);
        }
      }
      g.reserve(1, g.h - 6, g.w - 2, 5);
      const rx = c.spawn.x - 6;
      const ry = c.by[c.rows - 1]! + 8;
      if (g.canPlace(rx, ry, c.region) && g.canPlace(rx + 1, ry, c.region)) {
        g.oset(rx, ry, P('radome', 0));
        g.oset(rx + 1, ry, P('radome', 1));
      }
      const ax = c.spawn.x + 6;
      for (let k = 0; k < 3; k++) if (g.canPlace(ax, ry - k * 2, c.region)) g.oset(ax, ry - k * 2, P('antenna'));
      const sx = 3;
      if (g.canPlace(sx, ry, c.region) && g.canPlace(sx + 1, ry, c.region)) {
        g.oset(sx, ry, P('snowmobile', 0));
        g.oset(sx + 1, ry, P('snowmobile', 1));
      }
      void rng2;
    },
  });
}

// ---- movie studio backlot -------------------------------------------------------------------------

export function studioHub(places: Place[], rng: Rng): HubResult {
  let fac = 0;
  return townHub(places, rng, {
    env: 'studio',
    base: (_x, _y, rng2) => cell(K.ASPHALT, rng2.chance(0.05) ? 0 : 0),
    road: (_x, y, rng2) => (y % 3 === 1 ? cell(K.ASPHALT, 1) : cell(K.ASPHALT, noiseVar(rng2, 1) * 0)),
    plaza: K.PLATFORM,
    skyRows: 3,
    border: ['fence', 'fence', 'palm'],
    scenery: ['palm', 'lamppost', 'klieg', 'director_chair', 'trash_can', 'cable_coil', 'palm', 'light_stand'],
    count: 30,
    dark: 0,
    look: (p) => {
      if (/soundstage|stage|projection|prop|warehouse|sound/.test(p.key)) return { style: 'hangar', colour: 0, w: 7 };
      return { style: 'facade', colour: fac++ % 4, w: 5 };
    },
    after: (g, c) => {
      // the water tower and a camera dolly
      const x = g.w - 3;
      const y = c.top + 3;
      if (g.canPlace(x, y, c.region)) g.oset(x, y, P('water_tower'));
      // a camera dolly track down the middle of the main street, with the dolly parked on it and lights on stands
      const ty = c.by[0]! + 5;
      for (let x = 3; x < g.w - 3; x++) {
        g.gset(x, ty - 1, cell(K.BALLAST, x % 2));
        g.gset(x, ty + 1, cell(K.BALLAST, x % 2));
        if (g.overKind(x, ty - 1) === K.PROP) g.oset(x, ty - 1, 0);
        if (g.overKind(x, ty + 1) === K.PROP) g.oset(x, ty + 1, 0);
      }
      const cx = c.spawn.x - 4;
      if (g.canPlace(cx, ty, c.region)) g.oset(cx, ty, P('film_camera'));
      const cy = c.by[c.rows - 1]! + 8;
      if (g.canPlace(c.spawn.x + 4, cy, c.region)) g.oset(c.spawn.x + 4, cy, P('light_stand'));
    },
  });
}

// ---- jazz club street -----------------------------------------------------------------------------

export function clubHub(places: Place[], rng: Rng): HubResult {
  return townHub(places, rng, {
    env: 'club',
    cols: 2,
    base: (x, y) => cell(K.WET, (x * 7 + y * 3) % 3),
    road: (x, y) => cell(K.WET, (x + y) % 3),
    plaza: K.WET,
    skyRows: 3,
    border: ['dumpster', 'trash_can', 'fire_escape'],
    scenery: ['lamppost', 'trash_can', 'vent_steam', 'dumpster', 'crate', 'barrel', 'lamppost'],
    count: 28,
    look: (_p, i) => ({ style: 'brick', colour: i % 4, w: 5 }),
    after: (g, c, rng2) => {
      // neon signs bolted to the brick, and a black sedan at the kerb
      for (const [k, d] of Object.entries(c.doors)) {
        void k;
        const nx = d.x + 1;
        const ny = d.y - 1;
        if (g.overKind(nx, ny) === K.WINDOW_B || g.overKind(nx, ny) === K.WALL_B) g.oset(nx, ny, P('neon', rng2.int(0, 3)));
      }
      const cx = 3;
      const cy = c.by[c.rows - 1]! + 8;
      if (g.canPlace(cx, cy, c.region) && g.canPlace(cx + 1, cy, c.region)) {
        g.oset(cx, cy, P('vintage_car', 0));
        g.oset(cx + 1, cy, P('vintage_car', 1));
      }
    },
  });
}

// ---- plain town (hand-built cases) ----------------------------------------------------------------

export function plainHub(places: Place[], rng: Rng): HubResult {
  return townHub(places, rng, {
    env: 'generic',
    base: (_x, _y, rng2) => (rng2.chance(0.09) ? cell(K.FLOWERS, noiseVar(rng2, 3)) : cell(K.GRASS, noiseVar(rng2, 3))),
    road: () => cell(K.PATH),
    plaza: K.COBBLE,
    skyRows: 0,
    border: ['tree'],
    scenery: ['tree', 'bush', 'bush', 'lamppost', 'bench', 'tree'],
    count: 22,
    look: (p, i, rng2) => ({ style: 'plaster', colour: p.scene ? 6 : rng2.int(0, 5) + 0 * i, w: 5 }),
  });
}

// ---- country house --------------------------------------------------------------------------------

export function manorHub(places: Place[], rng: Rng): HubResult {
  const n = places.length;
  const bays = Math.min(n, 6);
  const houseW = bays * 5;
  const baseW = Math.max(houseW + 10, 30);
  const gardenW = 13;
  const w = baseW + gardenW;
  const h = 30;
  const spawn = { x: baseW >> 1, y: h - 3 };
  const g = new Grid(w, h, spawn, cell(K.LAWN));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g.gset(x, y, rng.chance(0.06) ? cell(K.FLOWERS, rng.int(0, 2)) : cell(K.LAWN, y % 2));
  sky(g, 3);
  const doors: Record<string, HubDoor> = {};
  // the house
  const hx = (baseW - houseW) >> 1;
  const hy = 4;
  places.slice(0, bays).forEach((p, i) => {
    const d = g.building(hx + i * 5, hy, 5, 'stone', i, 2, 2, 2);
    doors[p.key] = { x: d.x, y: d.y, sx: d.x, sy: d.y + 1, dir: 'down' };
    g.reserve(d.x - 1, d.y, 3, 3);
  });
  // gravel apron, avenue and roundabout
  g.gfill(hx - 2, hy + 6, houseW + 4, 4, cell(K.PATH));
  g.gfill(spawn.x - 2, hy + 9, 5, h - hy - 10, cell(K.PATH));
  const cy = hy + 14;
  g.gfill(spawn.x - 5, cy - 3, 11, 7, cell(K.PATH));
  g.oset(spawn.x, cy, P('fountain'));
  for (const [dx, dy] of [[-3, -2], [3, -2], [-3, 2], [3, 2]] as const) g.oset(spawn.x + dx, cy + dy, P(dx < 0 ? 'urn' : 'topiary'));
  // hedges lining the avenue, lamps, trees
  for (let y = hy + 10; y < h - 3; y += 1) {
    if (Math.abs(y - cy) <= 4) continue;
    g.oset(spawn.x - 3, y, P('hedge'));
    g.oset(spawn.x + 3, y, P('hedge'));
  }
  for (let y = hy + 11; y < h - 4; y += 4) {
    if (Math.abs(y - cy) <= 4) continue;
    g.oset(spawn.x - 4, y, P('lamppost'));
    g.oset(spawn.x + 4, y, P('lamppost'));
  }
  for (let x = 0; x < w; x++) {
    g.oset(x, 3, cell(K.SKY, 2 | ((x % 8) << 2)));
    if (x < hx - 2 || x > hx + houseW + 1) g.oset(x, 4, P('tree'));
    g.oset(x, h - 1, x >= spawn.x - 1 && x <= spawn.x + 1 ? 0 : P(rng.pick(['hedge', 'tree'])));
  }
  for (let y = 4; y < h; y++) {
    g.oset(0, y, P('tree'));
    g.oset(w - 1, y, P('tree'));
  }
  // outbuildings for places beyond the house's six bays
  const extra = places.slice(bays);
  extra.forEach((p, i) => {
    const left = i % 2 === 0;
    const x0 = left ? 3 : baseW - 8;
    const y0 = hy + 12 + Math.floor(i / 2) * 7;
    const d = g.building(x0, y0, 5, 'timber', i % 2, 2, 1, 2);
    doors[p.key] = { x: d.x, y: d.y, sx: d.x, sy: d.y + 1, dir: 'down' };
    g.reserve(d.x - 1, d.y, 3, 2);
    g.gfill(x0, y0 + 4, 5, 2, cell(K.PATH));
    g.gfill(left ? x0 + 5 : x0 - 3, y0 + 4, 3, 1, cell(K.PATH));
    g.gfill(left ? x0 + 5 : x0 - 3, y0 + 4, 1, 1, cell(K.PATH));
  });
  // connect outbuilding paths to the avenue
  for (let i = 0; i < extra.length; i++) {
    const left = i % 2 === 0;
    const y = hy + 12 + Math.floor(i / 2) * 7 + 4;
    const x0 = left ? 3 : baseW - 8;
    const from = left ? x0 + 5 : spawn.x + 3;
    const to = left ? spawn.x - 3 : x0 - 1;
    for (let x = Math.min(from, to); x <= Math.max(from, to); x++) {
      g.gset(x, y, cell(K.PATH));
      if (g.overKind(x, y) === K.PROP) g.oset(x, y, 0);
    }
  }
  g.reserve(spawn.x - 3, spawn.y - 3, 7, 5);
  const region: Region = { x0: 1, y0: 5, x1: baseW - 2, y1: h - 2 };
  g.scatter([P('rose_bush'), P('topiary'), P('bush'), P('tree'), P('bench'), P('urn')], 34, region, () => rng.next());

  // a walled kitchen garden fills the new wing off the east lawn: a second, self-contained landmark to match the lodge and studio
  const gx0 = baseW + 1;
  const gx1 = w - 3;
  const gy0 = hy + 3;
  const gy1 = h - 5;
  const gapY = Math.floor((gy0 + gy1) / 2);
  for (let x = gx0; x <= gx1; x++) {
    g.oset(x, gy0, P('hedge'));
    g.oset(x, gy1, P('hedge'));
  }
  for (let y = gy0; y <= gy1; y++) {
    g.oset(gx1, y, P('hedge'));
    if (Math.abs(y - gapY) > 1) g.oset(gx0, y, P('hedge')); // a gap in the west hedge: the way in from the lawn
  }
  g.gfill(baseW - 2, gapY - 1, gx0 - baseW + 3, 3, cell(K.PATH));
  const gardenRegion: Region = { x0: gx0 + 1, y0: gy0 + 1, x1: gx1 - 1, y1: gy1 - 1 };
  g.building(gx0 + 2, gy0 + 1, 5, 'glass', 0, -1, 1, 2); // a small glasshouse, no door: seen, not entered
  g.reserve(gx0 + 1, gy0 + 1, 6, 3);
  if (g.canPlace(Math.round((gx0 + gx1) / 2), Math.round((gy0 + gy1) / 2), gardenRegion)) g.oset(Math.round((gx0 + gx1) / 2), Math.round((gy0 + gy1) / 2), P('sundial'));
  g.scatter([P('veg_crate', 0), P('veg_crate', 1), P('veg_crate', 2), P('rose_bush'), P('topiary'), P('wicker', 0), P('bench')], 12, gardenRegion, () => rng.next());
  const map = g.asMap('hub', 'Grounds', meta('manor', 'hub', 0));
  return { map, doors, spawn, inspector: { x: spawn.x + 2, y: spawn.y - 2 } };
}

export { cobbleCell, styleVar };
