/** Builds one furnished room from a room spec: walls, floors, back-wall props, furniture. Pure and deterministic. */
import type { Rng } from '../../shared/generator/rng';
import { specFor, ENVS } from './env';
import type { RoomSpec } from './env';
import { Grid } from './grid';
import type { Region } from './grid';
import { P, propRef } from './hubs';
import type { Place } from './hubs';
import { K, cell, styleVar } from './tiles';
import type { EnvId } from './art/skins';
import type { MapDef } from './types';

export interface RoomResult {
  map: MapDef;
  grid: Grid;
  region: Region;
  spec: RoomSpec;
}

const backCell = (token: string, wt: number, rng: Rng): number => {
  if (token === 'WINDOW') return cell(K.WINDOW_W, wt);
  if (token === 'NONE') return cell(K.WALL_FACE, wt);
  return propRef(token, rng);
};

export function buildRoom(place: Place, rng: Rng, id: string, env: EnvId): RoomResult {
  const spec = specFor(env, place.key);
  const [w, h] = spec.size;
  const mid = w >> 1;
  const entrance = { x: mid, y: h - 2 };
  const out = spec.outdoor;
  const ev = ENVS[env];
  const g = new Grid(w, h, entrance, cell(spec.floor));
  const variants = spec.floorVar ?? (spec.floor === K.WOOD || spec.floor === K.DECK ? [0, 1, 2] : spec.floor === K.CARPET ? [0, 0, 1] : [0, 1, 2, 3]);
  const tone = rng.pick(variants);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g.gset(x, y, cell(spec.floor, spec.floor === K.WOOD || spec.floor === K.CARPET || spec.floor === K.STAGE ? tone : rng.pick(variants)));
  let region: Region;

  if (!out) {
    g.ofill(0, 0, w, 1, cell(K.WALL, spec.wt));
    for (let x = 1; x < w - 1; x++) g.oset(x, 1, cell(K.WALL_FACE, spec.wt));
    g.oset(0, 1, cell(K.WALL, spec.wt));
    g.oset(w - 1, 1, cell(K.WALL, spec.wt));
    for (let x = 0; x < w; x++) if (x !== entrance.x) g.oset(x, h - 1, cell(K.WALL, spec.wt));
    for (let y = 2; y < h - 1; y++) {
      g.oset(0, y, cell(K.WALL, spec.wt));
      g.oset(w - 1, y, cell(K.WALL, spec.wt));
    }
    // back wall
    let fireplaces = 0;
    let anyWindow = false;
    for (let x = 1; x < w - 1; x++) {
      if (!rng.chance(0.85) && spec.back.length > 2) continue;
      const tok = rng.pick(spec.back);
      if (tok === 'fireplace' && fireplaces++ > 0) continue;
      if (tok === 'WINDOW') anyWindow = true;
      g.oset(x, 1, backCell(tok, spec.wt, rng));
    }
    void anyWindow;
    if (spec.back.includes('WINDOW') && ![...Array(w).keys()].some((x) => (g.over[g.idx(x, 1)] as number & 255) === K.WINDOW_W)) g.oset(2, 1, cell(K.WINDOW_W, spec.wt));
    if (spec.runner) {
      const rw = Math.min(w <= 10 ? 4 : 6, w - 5);
      for (let y = (h >> 1) - 1; y <= (h >> 1) + 1; y++) for (let x = (w - rw) >> 1; x < ((w - rw) >> 1) + rw; x++) g.gset(x, y, cell(spec.runner[0], spec.runner[1]));
      // a runner all the way to the door
      if (spec.floor === K.CARPET || spec.runner[0] === K.CARPET) for (let y = 2; y < h - 1; y++) g.gset(mid, y, cell(spec.runner[0], spec.runner[1]));
    }
    g.gset(entrance.x, h - 1, cell(K.MAT, 0));
    region = { x0: 1, y0: 2, x1: w - 2, y1: h - 2 };
  } else {
    const border = (i: number, x: number, y: number) => g.oset(x, y, propRef(out.border[i % out.border.length] as string, rng));
    switch (out.top) {
      case 'water': {
        // promenade: sea beyond the rail, deckhouse wall behind you
        for (let x = 0; x < w; x++) {
          g.gset(x, 0, cell(K.WATER, x % 3 === 0 ? 2 : 0));
          g.gset(x, 1, cell(K.WATER, 1));
          g.oset(x, 0, cell(K.BLOCK));
          g.oset(x, 1, cell(K.BLOCK));
          g.oset(x, 2, P('rail', 0));
        }
        for (let y = 2; y < h - 1; y++) {
          g.oset(0, y, P('rail', 1));
          g.oset(w - 1, y, P('rail', 2));
        }
        const v = styleVar('cabin', env === 'liner' ? 0 : 1);
        for (let x = 0; x < w; x++) if (x !== entrance.x) g.oset(x, h - 1, cell(K.WALL_B, v));
        region = { x0: 1, y0: 3, x1: w - 2, y1: h - 2 };
        break;
      }
      case 'sky': {
        for (let x = 0; x < w; x++) {
          g.oset(x, 0, cell(K.SKY, 1 | ((x % 8) << 2)));
          g.oset(x, 1, cell(K.SKY, 2 | ((x % 8) << 2)));
          if (out.border.includes('rail')) g.oset(x, 2, P('rail', 0));
          else if (x !== entrance.x) border(x, x, 2);
          if (x !== entrance.x) g.oset(x, h - 1, propRef(out.border[x % out.border.length] as string, rng));
        }
        for (let y = 2; y < h - 1; y++) {
          g.oset(0, y, out.border.includes('rail') ? P('rail', 1) : propRef(out.border[y % out.border.length] as string, rng));
          g.oset(w - 1, y, out.border.includes('rail') ? P('rail', 2) : propRef(out.border[(y + 1) % out.border.length] as string, rng));
        }
        region = { x0: 1, y0: 3, x1: w - 2, y1: h - 2 };
        break;
      }
      case 'facade': {
        const style = env === 'studio' ? 'facade' : env === 'restaurant' ? 'glass' : 'brick';
        for (let x = 0; x < w; x++) {
          const v = styleVar(style, (x >> 2) % 4);
          g.oset(x, 0, cell(K.ROOF_BOT, v));
          g.oset(x, 1, cell(x % 4 === 2 ? K.WINDOW_B : K.WALL_B, v));
          if (x !== entrance.x) border(x, x, h - 1);
        }
        for (let y = 2; y < h - 1; y++) {
          border(y, 0, y);
          border(y + 1, w - 1, y);
        }
        region = { x0: 1, y0: 2, x1: w - 2, y1: h - 2 };
        break;
      }
      default: {
        // hedged garden
        for (let x = 0; x < w; x++) {
          border(x, x, 0);
          if (x !== entrance.x) border(x + 1, x, h - 1);
        }
        for (let y = 1; y < h - 1; y++) {
          border(y, 0, y);
          border(y + 1, w - 1, y);
        }
        region = { x0: 1, y0: 1, x1: w - 2, y1: h - 2 };
      }
    }
    // paths through the garden
    if (out.top === 'hedge') {
      for (let y = 1; y < h; y++) g.gset(mid, y, cell(K.PATH));
      for (let x = 1; x < w - 1; x++) g.gset(x, h >> 1, cell(K.PATH));
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (g.ground[g.idx(x, y)] === cell(K.LAWN) && rng.chance(0.1)) g.gset(x, y, cell(K.FLOWERS, rng.int(0, 2)));
    }
    g.gset(entrance.x, h - 1, out.top === 'water' ? cell(K.MAT) : cell(K.PATH));
  }
  for (const dx of [-1, 0, 1]) for (const dy of [0, -1]) g.reserve(entrance.x + dx, entrance.y + dy);

  // furniture: hug the walls first
  const cells: [number, number][] = [];
  for (let y = region.y0; y <= region.y1; y++) for (let x = region.x0; x <= region.x1; x++) cells.push([x, y]);
  const near = (x: number, y: number) => x === region.x0 || x === region.x1 || y === region.y0 || y === region.y1;
  const order = cells
    .map((cl) => ({ cl, k: (near(cl[0], cl[1]) ? 0.6 : 0) + rng.next() }))
    .sort((a, b) => b.k - a.k)
    .map((o) => o.cl);
  const want = Math.round((cells.length * (spec.density ?? (out ? 11 : 9)) * 1.9) / 100);
  let placed = 0;
  for (const [x, y] of order) {
    if (placed >= want) break;
    if (!g.canPlace(x, y, region)) continue;
    g.oset(x, y, propRef(rng.pick(spec.deco), rng));
    placed++;
  }
  const map = g.asMap(id, place.label, {
    env,
    theme: spec.id,
    wt: spec.wt,
    dark: Math.min(0.9, ev.dusk * (ev.indoor || !out ? 0.35 : 0.8) + (spec.dark ?? 0)),
    ambient: spec.ambient ?? (out ? ev.ambient : 'none'),
    outdoor: !!out,
  });
  return { map, grid: g, region, spec };
}
