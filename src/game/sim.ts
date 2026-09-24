/**
 * The living venue: every suspect keeps a schedule on the night's clock and actually walks between rooms. Most only stretch their
 * legs (a short errand to the hub and back); the killer slips out to the scene of the crime now and then, so a patient detective
 * can catch them off the alibi they swore to. Schedules are pure functions of the case and the clock (deterministic); the walkers
 * animate only where the detective is looking and snap everywhere else, so nothing here can trap the player.
 */
import { Rng, hashSeed } from '../../shared/generator/rng';
import { blockedTerrain, findPath, reachable } from './grid';
import type { Dir, Look, MapDef, NpcDef, World } from './types';

export interface Spot {
  map: string;
  x: number;
  y: number;
}

export interface Stop extends Spot {
  /** clock minute (since the investigation began) from which this stop applies */
  from: number;
  why: 'home' | 'errand' | 'sneak';
}

const SPAN = 24 * 60;

/** Cells of the hub where people stretch their legs: away from doors, spread out, always reachable. */
function gatherSpots(w: World, rng: Rng): { x: number; y: number }[] {
  const hub = w.maps[w.hubId] as MapDef;
  const seen = reachable(hub, hub.entrance.x, hub.entrance.y);
  const nearDoor = (x: number, y: number) => hub.warps.some((wp) => Math.abs(wp.x - x) + Math.abs(wp.y - y) <= 2) || (Math.abs(hub.entrance.x - x) + Math.abs(hub.entrance.y - y) <= 3);
  const cells = [...seen]
    .map((k) => k.split(',').map(Number) as [number, number])
    .filter(([x, y]) => !blockedTerrain(hub, x, y) && !nearDoor(x, y) && !hub.npcs.some((n) => Math.abs(n.x - x) + Math.abs(n.y - y) <= 1) && !hub.extras.some((e) => e.x === x && e.y === y));
  const shuffled = rng.shuffle(cells);
  // spread them out: greedily take cells far from the ones already taken
  const out: { x: number; y: number }[] = [];
  for (const [x, y] of shuffled) {
    if (out.every((o) => Math.abs(o.x - x) + Math.abs(o.y - y) >= 4)) out.push({ x, y });
    if (out.length >= 10) break;
  }
  return out.length ? out : cells.slice(0, 4).map(([x, y]) => ({ x, y }));
}

/** Where the killer stands when caught in the scene: the free cell nearest the body. */
function sneakSpot(w: World): Spot | null {
  const room = w.maps[w.sceneMapId];
  if (!room) return null;
  const body = room.npcs.find((n) => n.kind === 'body');
  const seen = reachable(room, room.entrance.x, room.entrance.y);
  let best: { x: number; y: number; d: number } | null = null;
  // they linger by the door end of the room, where anyone walking in will see them: the free cell nearest the body within a few steps of the entrance
  const near = (x: number, y: number) => Math.abs(x - room.entrance.x) + Math.abs(y - room.entrance.y) <= 8;
  const anyNear = [...seen].some((k) => {
    const [x, y] = k.split(',').map(Number) as [number, number];
    return near(x, y) && !blockedTerrain(room, x, y) && !(room.entrance.x === x && room.entrance.y === y) && Math.abs(x - room.entrance.x) + Math.abs(y - room.entrance.y) > 1;
  });
  for (const k of seen) {
    const [x, y] = k.split(',').map(Number) as [number, number];
    if (blockedTerrain(room, x, y) || room.warps.some((wp) => wp.x === x && wp.y === y) || (room.entrance.x === x && room.entrance.y === y)) continue;
    if (anyNear && (!near(x, y) || Math.abs(x - room.entrance.x) + Math.abs(y - room.entrance.y) <= 1)) continue;
    const d = body ? Math.abs(body.x - x) + Math.abs(body.y - y) : Math.abs(room.entrance.x - x) + Math.abs(room.entrance.y - y) + 3;
    if (d < 1) continue;
    if (!best || d < best.d || (d === best.d && (x < best.x || y < best.y))) best = { x, y, d };
  }
  return best ? { map: room.id, x: best.x, y: best.y } : null;
}

export interface Plan {
  stops: Record<string, Stop[]>;
  /** the windows in which the killer is away from their room, in clock minutes */
  sneaks: { from: number; to: number }[];
}

/** Everyone's day, as a list of stops. Pure. */
export function buildPlan(w: World): Plan {
  const rng = new Rng(hashSeed(`plan|${w.c.id}|${w.c.seed ?? 0}`));
  const spots = gatherSpots(w, rng);
  const sneak = sneakSpot(w);
  const stops: Record<string, Stop[]> = {};
  const sneaks: { from: number; to: number }[] = [];
  let si = 0;
  for (const ch of w.c.characters) {
    const homeMap = w.charMap[ch.id];
    const def = homeMap ? w.maps[homeMap]?.npcs.find((n) => n.charId === ch.id) : undefined;
    if (!homeMap || !def) continue;
    const home: Spot = { map: homeMap, x: def.x, y: def.y };
    const list: Stop[] = [{ ...home, from: 0, why: 'home' }];
    const isKiller = ch.id === w.killerId;
    const r = new Rng(hashSeed(`walk|${w.c.id}|${ch.id}`));
    if (isKiller && sneak) {
      // the killer keeps going back to the scene, and comes home again
      for (let k = 0; k < 6; k++) {
        const from = 22 + k * 41 + r.int(0, 6);
        const dur = 13 + r.int(0, 3);
        list.push({ ...sneak, from, why: 'sneak' }, { ...home, from: from + dur, why: 'home' });
        sneaks.push({ from, to: from + dur });
      }
    } else if (spots.length) {
      const spot = spots[si++ % spots.length] as { x: number; y: number };
      let t = 1 + r.int(0, 8);
      while (t < SPAN) {
        const dur = 7 + r.int(0, 8);
        list.push({ map: w.hubId, x: spot.x, y: spot.y, from: t, why: 'errand' }, { ...home, from: t + dur, why: 'home' });
        t += dur + 22 + r.int(0, 36);
      }
    }
    stops[ch.id] = list.sort((a, z) => a.from - z.from);
  }
  return { stops, sneaks };
}

export function stopAt(list: Stop[], tmin: number): Stop {
  let cur = list[0] as Stop;
  for (const s of list) if (s.from <= tmin) cur = s;
  return cur;
}

/** The earliest sneak window that has not fully finished yet -- under way right now (`from <= tmin < to`) or
 *  still ahead. Pure: only reads the plan's own window list and the clock. Returns null once every window for
 *  the night is behind the clock (or there were never any, e.g. a hand-built case with no killer/claimed room). */
export function nextSneakWindow(sneaks: { from: number; to: number }[], tmin: number): { from: number; to: number } | null {
  let best: { from: number; to: number } | null = null;
  for (const w of sneaks) {
    if (w.to <= tmin) continue;
    if (!best || w.from < best.from) best = w;
  }
  return best;
}

// ---------------------------------------------------------------------------------------------
// walkers: the runtime side (DOM-free, but time-driven)

interface Leg {
  map: string;
  path: { x: number; y: number }[];
  /** on finishing the path, step through a door to this spot */
  warp?: Spot & { dir: Dir };
}

export interface Walker {
  id: string;
  def: NpcDef;
  look: Look;
  map: string;
  x: number;
  y: number;
  dir: Dir;
  legs: Leg[];
  /** frames left in the current tile step (0 = standing) and where it started */
  t: number;
  fromX: number;
  fromY: number;
  wait: number;
  /** how many times in a row they found the next tile taken (two people head-on in a corridor let each other through) */
  stuck: number;
  why: Stop['why'];
}

const STEP_FRAMES = 11;

export class Sim {
  readonly plan: Plan;
  readonly walkers = new Map<string, Walker>();
  private targetKey = new Map<string, string>();

  constructor(private w: World, tmin: number) {
    this.plan = buildPlan(w);
    for (const [id, list] of Object.entries(this.plan.stops)) {
      const st = stopAt(list, tmin);
      const def = w.maps[w.charMap[id] as string]?.npcs.find((n) => n.charId === id) as NpcDef;
      this.walkers.set(id, { id, def, look: def.look, map: st.map, x: st.x, y: st.y, dir: def.dir, legs: [], t: 0, fromX: st.x, fromY: st.y, wait: 0, stuck: 0, why: st.why });
      this.targetKey.set(id, `${st.map},${st.x},${st.y}`);
    }
  }

  inMap(mapId: string): Walker[] {
    return [...this.walkers.values()].filter((wk) => wk.map === mapId);
  }

  at(mapId: string, x: number, y: number): Walker | undefined {
    for (const wk of this.walkers.values()) if (wk.map === mapId && wk.x === x && wk.y === y) return wk;
    return undefined;
  }

  /** Is the killer away from the room they swore to, and where is that? */
  away(charId: string): boolean {
    const wk = this.walkers.get(charId);
    return !!wk && wk.map !== this.w.charMap[charId];
  }

  private route(from: Spot, to: Spot): Leg[] {
    const w = this.w;
    const legs: Leg[] = [];
    let cur: Spot = { ...from };
    const map = (id: string) => w.maps[id] as MapDef;
    if (cur.map !== to.map) {
      if (cur.map !== w.hubId) {
        const exit = map(cur.map).warps.find((wp) => wp.to === w.hubId);
        if (exit) {
          legs.push({ map: cur.map, path: findPath(map(cur.map), cur, exit), warp: { map: w.hubId, x: exit.tx, y: exit.ty, dir: exit.dir } });
          cur = { map: w.hubId, x: exit.tx, y: exit.ty };
        }
      }
      if (to.map !== w.hubId) {
        const door = map(w.hubId).warps.find((wp) => wp.to === to.map);
        if (door) {
          legs.push({ map: w.hubId, path: findPath(map(w.hubId), cur, door), warp: { map: to.map, x: door.tx, y: door.ty, dir: door.dir } });
          cur = { map: to.map, x: door.tx, y: door.ty };
        }
      }
    }
    legs.push({ map: to.map, path: findPath(map(to.map), cur, to) });
    return legs;
  }

  /** Aim every walker at where the clock says they should be. */
  private retarget(tmin: number): void {
    for (const [id, list] of Object.entries(this.plan.stops)) {
      const wk = this.walkers.get(id) as Walker;
      const st = stopAt(list, tmin);
      const key = `${st.map},${st.x},${st.y}`;
      if (this.targetKey.get(id) === key) continue;
      this.targetKey.set(id, key);
      wk.why = st.why;
      wk.wait = 0;
      // finish the tile they are stepping onto, then plan from there
      wk.legs = this.route({ map: wk.map, x: wk.x, y: wk.y }, st);
    }
  }

  /** Advance the walkers by one frame. Only the map the detective is in is animated; the rest of the venue simply catches up. */
  update(tmin: number, viewMap: string, player?: { x: number; y: number }): void {
    this.retarget(tmin);
    for (const wk of this.walkers.values()) {
      if (wk.t > 0) {
        wk.t--;
        continue;
      }
      // legs in maps nobody is watching happen instantly
      for (let guard = 0; guard < 8 && wk.legs.length; guard++) {
        const leg = wk.legs[0] as Leg;
        if (leg.map === viewMap && wk.map === viewMap && leg.path.length > 1) break;
        if (leg.map !== wk.map) {
          wk.legs.shift();
          continue;
        }
        const end = leg.path[leg.path.length - 1];
        if (end) {
          wk.x = end.x;
          wk.y = end.y;
        }
        wk.legs.shift();
        if (leg.warp) {
          wk.map = leg.warp.map;
          wk.x = leg.warp.x;
          wk.y = leg.warp.y;
          wk.dir = leg.warp.dir;
        }
      }
      const leg = wk.legs[0];
      if (!leg) continue;
      if (wk.wait > 0) {
        wk.wait--;
        continue;
      }
      // in view: walk it one tile at a time
      const at = leg.path.findIndex((p) => p.x === wk.x && p.y === wk.y);
      const next = leg.path[at + 1];
      if (at < 0 || !next) {
        // arrived at the end of a viewed leg
        wk.legs.shift();
        if (leg.warp) {
          wk.map = leg.warp.map;
          wk.x = leg.warp.x;
          wk.y = leg.warp.y;
          wk.dir = leg.warp.dir;
        }
        continue;
      }
      // let people pass each other, and never walk into the detective
      const onPlayer = !!player && wk.map === viewMap && player.x === next.x && player.y === next.y;
      if (onPlayer || (this.at(wk.map, next.x, next.y) && wk.stuck < 3)) {
        wk.wait = 10;
        wk.stuck++;
        continue;
      }
      wk.stuck = 0;
      wk.fromX = wk.x;
      wk.fromY = wk.y;
      wk.dir = next.x > wk.x ? 'right' : next.x < wk.x ? 'left' : next.y > wk.y ? 'down' : 'up';
      wk.x = next.x;
      wk.y = next.y;
      wk.t = STEP_FRAMES;
    }
  }
}
