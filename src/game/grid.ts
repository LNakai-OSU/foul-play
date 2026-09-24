/** A mutable tile grid with connectivity-safe placement, used by the hub and room builders. Pure: no DOM. */
import { K, cell, isSolidKind, kindOf, styleVar } from './tiles';
import type { BStyle } from './tiles';
import type { Ambient, ExtraDef, ItemDef, Light, MapDef, NpcDef } from './types';
import type { EnvId } from './art/skins';

export function blockedAt(m: MapDef, x: number, y: number, foundIds?: readonly string[]): boolean {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
  if (isSolidKind(kindOf(m.over[y * m.w + x] as number))) return true;
  if (m.npcs.some((n) => n.x === x && n.y === y)) return true;
  if (m.items.some((i) => i.x === x && i.y === y && !(foundIds && foundIds.includes(i.evidenceId)))) return true;
  return false;
}

/** Solid tiles and clue items only (people are not obstacles): what a walking schedule plans around. */
export function blockedTerrain(m: MapDef, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
  if (isSolidKind(kindOf(m.over[y * m.w + x] as number))) return true;
  return m.items.some((i) => i.x === x && i.y === y);
}

const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

/** Shortest walk on foot from `from` to `to` (both included), or [] when there is none. */
export function findPath(m: MapDef, from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number }[] {
  const key = (x: number, y: number) => `${x},${y}`;
  const prev = new Map<string, { x: number; y: number } | null>([[key(from.x, from.y), null]]);
  const q: { x: number; y: number }[] = [from];
  for (let i = 0; i < q.length; i++) {
    const cur = q[i] as { x: number; y: number };
    if (cur.x === to.x && cur.y === to.y) break;
    for (const [dx, dy] of DIRS4) {
      const n = { x: cur.x + dx, y: cur.y + dy };
      if (prev.has(key(n.x, n.y))) continue;
      if (blockedTerrain(m, n.x, n.y) && !(n.x === to.x && n.y === to.y)) continue;
      prev.set(key(n.x, n.y), cur);
      q.push(n);
    }
  }
  if (!prev.has(key(to.x, to.y))) return [];
  const path: { x: number; y: number }[] = [];
  for (let c: { x: number; y: number } | null | undefined = to; c; c = prev.get(key(c.x, c.y))) path.unshift(c);
  return path;
}

/** Cells reachable on foot from (sx, sy). Warp tiles count as walkable. */
export function reachable(m: MapDef, sx: number, sy: number, foundIds?: readonly string[]): Set<string> {
  const seen = new Set<string>([`${sx},${sy}`]);
  const q: [number, number][] = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift() as [number, number];
    for (const [dx, dy] of DIRS4) {
      const nx = x + dx;
      const ny = y + dy;
      const k = `${nx},${ny}`;
      if (seen.has(k) || blockedAt(m, nx, ny, foundIds)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}

export interface Region {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export class Grid {
  ground: number[];
  over: number[];
  npcs: NpcDef[] = [];
  items: ItemDef[] = [];
  extras: ExtraDef[] = [];
  lights: Light[] = [];
  reserved = new Set<string>();
  constructor(
    readonly w: number,
    readonly h: number,
    public entrance: { x: number; y: number },
    groundCell: number,
  ) {
    this.ground = new Array<number>(w * h).fill(groundCell);
    this.over = new Array<number>(w * h).fill(0);
  }
  idx(x: number, y: number): number {
    return y * this.w + x;
  }
  inb(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  gset(x: number, y: number, c: number): void {
    if (this.inb(x, y)) this.ground[this.idx(x, y)] = c;
  }
  oset(x: number, y: number, c: number): void {
    if (this.inb(x, y)) this.over[this.idx(x, y)] = c;
  }
  gfill(x: number, y: number, w: number, h: number, c: number | ((x: number, y: number) => number)): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.gset(x + i, y + j, typeof c === 'function' ? c(x + i, y + j) : c);
  }
  ofill(x: number, y: number, w: number, h: number, c: number | ((x: number, y: number) => number)): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.oset(x + i, y + j, typeof c === 'function' ? c(x + i, y + j) : c);
  }
  reserve(x: number, y: number, w = 1, h = 1): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.reserved.add(`${x + i},${y + j}`);
  }
  overKind(x: number, y: number): number {
    return this.inb(x, y) ? kindOf(this.over[this.idx(x, y)] as number) : K.BLOCK;
  }
  isSolid(x: number, y: number): boolean {
    return !this.inb(x, y) || isSolidKind(this.overKind(x, y));
  }

  /**
   * A building: roof top, roof eave, then `floors` rows of windows and a ground row with a door at column `door`.
   * Returns the door cell.
   */
  building(x0: number, y0: number, w: number, style: BStyle, colour: number, door: number, floors = 1, winEvery = 2): { x: number; y: number } {
    const v = styleVar(style, colour);
    for (let dx = 0; dx < w; dx++) {
      this.oset(x0 + dx, y0, cell(K.ROOF_TOP, v));
      this.oset(x0 + dx, y0 + 1, cell(K.ROOF_BOT, v));
      for (let f = 0; f < floors; f++) this.oset(x0 + dx, y0 + 2 + f, cell(dx % winEvery === 1 ? K.WINDOW_B : K.WALL_B, v));
      const gy = y0 + 2 + floors;
      this.oset(x0 + dx, gy, cell(dx === door ? K.DOOR_B : dx % winEvery === 1 && w > 3 ? K.WINDOW_B : K.WALL_B, v));
    }
    return { x: x0 + door, y: y0 + 2 + floors };
  }

  asMap(id: string, name: string, meta: { env: EnvId; theme: string; wt: number; dark: number; ambient: Ambient; outdoor: boolean }): MapDef {
    return {
      id,
      name,
      env: meta.env,
      theme: meta.theme,
      wt: meta.wt,
      dark: meta.dark,
      ambient: meta.ambient,
      w: this.w,
      h: this.h,
      ground: this.ground,
      over: this.over,
      warps: [],
      npcs: this.npcs,
      extras: this.extras,
      lights: this.lights,
      items: this.items,
      signs: {},
      outdoor: meta.outdoor,
      entrance: this.entrance,
    };
  }
  probe(): MapDef {
    return this.asMap('probe', 'probe', { env: 'generic', theme: 'probe', wt: 0, dark: 0, ambient: 'none', outdoor: false });
  }
  /**
   * Would everything reachable from the entrance, and every NPC / clue (which need a reachable neighbour to be talked to),
   * stay reachable if (x,y) became solid? `occupant` = the new thing is an NPC/clue that also needs access.
   */
  stillConnected(x: number, y: number, occupant: boolean): boolean {
    const m = this.probe();
    const bfs = (skip: boolean): Set<string> => {
      const seen = new Set<string>([`${this.entrance.x},${this.entrance.y}`]);
      const q: [number, number][] = [[this.entrance.x, this.entrance.y]];
      while (q.length) {
        const [cx, cy] = q.shift() as [number, number];
        for (const [dx, dy] of DIRS4) {
          const nx = cx + dx;
          const ny = cy + dy;
          const k = `${nx},${ny}`;
          if (seen.has(k) || blockedAt(m, nx, ny) || (skip && nx === x && ny === y)) continue;
          seen.add(k);
          q.push([nx, ny]);
        }
      }
      return seen;
    };
    const base = bfs(false);
    const after = bfs(true);
    if (after.size !== base.size - (base.has(`${x},${y}`) ? 1 : 0)) return false;
    const needs = [...this.npcs, ...this.items].map((o) => ({ x: o.x, y: o.y }));
    if (occupant) needs.push({ x, y });
    return needs.every((o) => DIRS4.some(([dx, dy]) => after.has(`${o.x + dx},${o.y + dy}`)));
  }
  canPlace(x: number, y: number, region: Region, occupant = false): boolean {
    if (x < region.x0 || x > region.x1 || y < region.y0 || y > region.y1) return false;
    if (this.reserved.has(`${x},${y}`)) return false;
    // a door or entrance mat is walkable (so movement/reachability treat it as open ground), but that does not make
    // it free real estate: a scattered crate or a placed clue must never silently entomb a door underneath it.
    const overKind = this.overKind(x, y);
    if (overKind === K.DOOR_B || overKind === K.MAT) return false;
    if (blockedAt(this.probe(), x, y)) return false;
    return this.stillConnected(x, y, occupant);
  }
  /** Put `c` in the object layer at up to `count` random free cells (never disconnecting the map). */
  scatter(cells: number[], count: number, region: Region, rnd: () => number, tries = 400): number {
    let placed = 0;
    let t = 0;
    while (placed < count && t++ < tries) {
      const x = region.x0 + Math.floor(rnd() * (region.x1 - region.x0 + 1));
      const y = region.y0 + Math.floor(rnd() * (region.y1 - region.y0 + 1));
      if (!this.canPlace(x, y, region)) continue;
      this.oset(x, y, cells[Math.floor(rnd() * cells.length)] as number);
      placed++;
    }
    return placed;
  }
}
