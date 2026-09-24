/** Walking around: tile movement, collision, doors, wandering extras, lighting and weather, and talking to whatever is in front of you. */
import { Scene } from '../engine';
import type { Game } from '../engine';
import { drawBody, drawBubble, drawChar, drawDetective, drawItem } from '../sprites';
import { collectLights, drawAmbient, drawLighting, drawMapTiles } from '../render';
import { propMeta } from '../art/index';
import { ENVS } from '../env';
import { K, FLAVOR, kindOf } from '../tiles';
import { DIR_VEC, OPPOSITE, TILE, VIEW_H, VIEW_W } from '../types';
import type { Dir, ExtraDef, MapDef, NpcDef } from '../types';
import { box, text } from '../ui';
import { DETECTIVE_LOOK } from '../world';
import { blockedTerrain } from '../grid';
import { Rng, hashSeed } from '../../../shared/generator/rng';
import { say, BOX as DIALOGUE_BOX } from './dialogue';
import { talkTo, pickUpClue, beginInterview, witnessTalk, runRitual } from './flow';
import { RITUALS } from '../rituals';
import { MenuScene } from './menus';
import { Transition } from './misc';
import { clockLabel, goalText, nightState, progress, tickClock } from '../logic';
import { wrapText } from '../text';
import { announceClue } from './announce';
import { TopBand } from '../topband';

const TINT: Record<string, string | null> = { comedic: null, serious: '#e4dff0', noir: '#a5b0dc' };
const DIRS: Dir[] = ['down', 'left', 'right', 'up'];

interface Wanderer {
  def: ExtraDef;
  /** where they hang about (moves to the scene door once the body is found) */
  home: { x: number; y: number };
  x: number;
  y: number;
  dir: Dir;
  /** frames left in the current step, and its direction */
  t: number;
  wait: number;
}

type Target = { kind: 'npc' | 'item' | 'prop' | 'door' | 'extra' | 'sign'; verb: string; x: number; y: number } | null;

export class OverworldScene extends Scene {
  opaque = true;
  private moveT = 0;
  private moveFrames = 9;
  private moveDir: Dir = 'down';
  private side = false;
  private turnDelay = 0;
  private lastMap = '';
  private bannerT = 0;
  private bumpCool = 0;
  /** Were we close enough to the killer's sneak to have caught them, last frame? Used for the near-miss tell. */
  private sawSneakHere = false;
  /** Near-miss payoff: counts down from the moment the killer slips away uncaught, driving a cold flash, a shake and a
   * bespoke banner (never the generic toast: see round 4's critic report on why a shared toast made it forgettable). */
  private missFx = 0;
  private alert: { npc: NpcDef; t: number } | null = null;
  private dirs = new Map<string, Dir>();
  private timers = new Map<string, number>();
  private rng = new Rng(12345);
  private wanderers: Wanderer[] = [];
  private prompt = 0;
  private toast = '';
  private toastT = 0;
  private clockFrames = 0;
  private crowded = false;

  enter(g: Game): void {
    this.syncMap(g);
  }

  resume(g: Game): void {
    g.audio.play(this.music(g));
    g.audio.ambience(ENVS[g.world.env].sound, this.inside(g));
  }

  private music(g: Game): 'town' | 'room' {
    return g.state.map === g.world.hubId ? 'town' : 'room';
  }

  private inside(g: Game): boolean {
    const m = this.map(g);
    return !m.outdoor;
  }

  private syncMap(g: Game): void {
    if (this.lastMap === g.state.map) return;
    this.lastMap = g.state.map;
    this.bannerT = 120;
    // A toast left over from the room just departed must not survive into the new room: it would be
    // about a suspect/door that no longer means anything here. The shared TopBand layout (see
    // topband.ts and draw() below) would still keep it from ever overlapping the fresh banner
    // pixel-for-pixel, but a stale message is a correctness bug regardless of layout, so it's
    // cleared here alongside the banner reset.
    this.toast = '';
    this.toastT = 0;
    this.dirs.clear();
    g.audio.play(this.music(g));
    g.audio.ambience(ENVS[g.world.env].sound, this.inside(g));
    const m = this.map(g);
    this.wanderers = m.extras.map((e) => ({ def: e, home: { x: e.x, y: e.y }, x: e.x, y: e.y, dir: 'down' as Dir, t: 0, wait: 30 + this.rng.int(0, 120) }));
    this.crowded = false;
    this.notice(g, m);
  }

  /**
   * The single way to show a flavour toast. Round 9: positioning is no longer this method's job at
   * all -- rounds 7/8 had it defer the message via `pendingToast` while the room banner was up, to
   * avoid the two drawing on the same pixels. That is no longer necessary: the shared `TopBand`
   * layout in draw() gives the banner and the toast their own non-overlapping rows every frame
   * automatically, so a toast can show immediately, even with the banner up, with no risk of
   * collision and no risk of the round-7-disclosed "queued message silently dropped if the player
   * leaves within ~2s" trade-off. Every call site in this file that wants to show a toast MUST go
   * through this method -- there is no other way to set `toast`/`toastT` directly.
   */
  private setToast(msg: string, life = 200): void {
    this.toast = msg;
    this.toastT = life;
  }

  /** Walking into a room whose owner has stepped out: say so, once in a while. Purely a nudge; nothing depends on it. */
  private notice(g: Game, m: MapDef): void {
    if (m.id === g.world.hubId) return;
    for (const [id, home] of Object.entries(g.world.charMap)) {
      if (home !== m.id) continue;
      const wk = g.sim.walkers.get(id);
      if (!wk || wk.map === m.id) continue;
      const key = `absent:${id}:${Math.floor(g.state.tmin / 25)}`;
      if (g.state.seen.includes(key)) continue;
      g.state.seen.push(key);
      const name = g.world.c.characters.find((c) => c.id === id)?.name ?? 'Somebody';
      // notice() is always called right after bannerT is (re)set to 120 in syncMap(), so the room-name
      // banner is always up at this exact instant -- draw()'s TopBand gives the toast its own row
      // below the banner regardless, so there is nothing special to do here any more.
      this.setToast(`${name.split(' ')[0]?.toUpperCase()} IS NOT HERE. THE CHAIR IS STILL WARM.`);
    }
  }

  /** After the body is found the crowd gathers at the scene door. */
  private gather(g: Game, map: MapDef): void {
    if (this.crowded || map.id !== g.world.hubId || !nightState(g.world, g.state).crowd) return;
    this.crowded = true;
    const door = map.warps.find((wp) => wp.to === g.world.sceneMapId);
    if (!door) return;
    const near: { x: number; y: number }[] = [];
    for (let r = 2; r <= 5 && near.length < this.wanderers.length * 2; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const x = door.tx + dx;
          const y = door.ty + dy;
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || blockedTerrain(map, x, y) || map.warps.some((wp) => wp.x === x && wp.y === y)) continue;
          if (Math.abs(x - g.state.x) + Math.abs(y - g.state.y) < 2) continue;
          near.push({ x, y });
        }
    this.wanderers.forEach((wk, i) => {
      const c = near[i * 2];
      if (c) wk.home = c;
    });
  }

  private map(g: Game): MapDef {
    return g.world.maps[g.state.map] as MapDef;
  }

  /** Whoever stands here: a suspect on their rounds (from the schedule), the inspector or the body. */
  private npcAt(g: Game, map: MapDef, x: number, y: number): NpcDef | undefined {
    const wk = g.sim.at(map.id, x, y);
    if (wk) return wk.def;
    return map.npcs.find((n) => n.kind !== 'suspect' && n.x === x && n.y === y);
  }

  private extraAt(x: number, y: number): Wanderer | undefined {
    return this.wanderers.find((w) => w.x === x && w.y === y);
  }

  update(g: Game): void {
    const s = g.state;
    const map = this.map(g);
    this.syncMap(g);
    if (this.bannerT > 0) this.bannerT--;
    if (this.bumpCool > 0) this.bumpCool--;
    if (this.toastT > 0) this.toastT--;
    if (this.missFx > 0) this.missFx--;
    // the night moves on while the detective walks around
    if (++this.clockFrames >= 150) {
      this.clockFrames = 0;
      tickClock(g.world, s, 1);
    }
    g.sim.update(s.tmin, s.map, { x: s.x, y: s.y });
    this.gather(g, map);
    this.idleNpcs(g, map);
    this.wander(g, map);
    this.nearMiss(g, map);
    if (this.catchKiller(g, map)) return;

    if (this.alert) {
      this.alert.t--;
      if (this.alert.t <= 0) {
        const npc = this.alert.npc;
        this.alert = null;
        beginInterview(g, npc);
      }
      return;
    }
    if (this.moveT > 0) {
      this.moveT--;
      if (this.moveT === 0) this.finishStep(g, map);
      return;
    }
    const inp = g.input;
    if (inp.pressed.has('start') || inp.pressed.has('b')) {
      g.audio.sfx('select');
      g.push(new MenuScene());
      return;
    }
    if (inp.pressed.has('a') && this.interact(g, map)) return;

    const held = [...inp.held].filter((b): b is Dir => b === 'up' || b === 'down' || b === 'left' || b === 'right');
    const dir = held[held.length - 1];
    if (!dir) {
      this.turnDelay = 0;
      return;
    }
    if (s.dir !== dir) {
      s.dir = dir;
      this.turnDelay = 5;
      return;
    }
    if (this.turnDelay > 0) {
      this.turnDelay--;
      return;
    }
    const v = DIR_VEC[dir];
    const nx = s.x + v.x;
    const ny = s.y + v.y;
    const ex = this.extraAt(nx, ny);
    if (ex) ex.wait = Math.max(ex.wait, 40);
    const policeLine = map.warps.some((wp) => wp.x === nx && wp.y === ny && wp.scene) && !s.briefed;
    if (policeLine) {
      // Routed through setToast() (round 8): this fires on an unbriefed player's very first move toward the scene
      // door, often while the hub's arrival room-name banner is still up -- draw()'s TopBand gives it its own row
      // below the banner, so it is never lost or overlapped (round 7/8's blocking issues).
      this.setToast(`POLICE LINE. REPORT TO ${g.world.inspectorName.toUpperCase()} FIRST.`, 150);
    }
    if (this.blocked(g, map, nx, ny) || ex || policeLine) {
      if (this.bumpCool === 0) {
        g.audio.sfx('bump');
        this.bumpCool = 18;
      }
      return;
    }
    s.x = nx;
    s.y = ny;
    s.steps++;
    this.moveDir = dir;
    this.moveFrames = inp.run ? 5 : 9;
    this.moveT = this.moveFrames;
    this.side = !this.side;
    if (s.steps % 2 === 0) g.audio.step(map.env, map.outdoor);
  }

  /** Terrain, clues not yet taken, the inspector and the body, and anyone walking about. */
  private blocked(g: Game, map: MapDef, x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= map.w || y >= map.h) return true;
    if (blockedTerrain(map, x, y) && !map.items.some((i) => i.x === x && i.y === y && g.state.found.includes(i.evidenceId))) return true;
    if (map.npcs.some((n) => n.kind !== 'suspect' && n.x === x && n.y === y)) return true;
    return !!g.sim.at(map.id, x, y);
  }

  /**
   * A readable consequence for the vigilant-but-slightly-late player: if the detective was ever close enough to the
   * killer's sneak to have caught them (the same range that flashes the alert bubble) and the killer then slips away
   * uncaught, say so once. Purely a tension beat; nothing depends on it, and it never fires after the real catch.
   */
  private nearMiss(g: Game, map: MapDef): void {
    const w = g.world;
    const s = g.state;
    if (!w.killerId || !w.caughtId || !s.briefed) return;
    const wk = g.sim.walkers.get(w.killerId);
    const spotted = !!wk && wk.why === 'sneak' && wk.map === w.sceneMapId && map.id === w.sceneMapId && Math.abs(wk.x - s.x) + Math.abs(wk.y - s.y) < 9;
    if (spotted) {
      this.sawSneakHere = true;
      return;
    }
    if (!this.sawSneakHere || map.id !== w.sceneMapId || s.found.includes(w.caughtId)) return;
    this.sawSneakHere = false;
    const key = `nearmiss:${Math.floor(s.tmin / 5)}`;
    if (s.seen.includes(key)) return;
    s.seen.push(key);
    this.missFx = 200;
    g.audio.sfx('slam');
    // the tell carries into the next conversation with them: their portrait runs rattled for that one scene, even though
    // composure has not dropped yet -- a payoff a player's eye actually catches, per round 4's creative direction.
    const flustered = `flustered:${w.killerId}`;
    if (!s.seen.includes(flustered)) s.seen.push(flustered);
  }

  /** The killer, sneaking about in the sealed scene, and the detective walks in on them. */
  private catchKiller(g: Game, map: MapDef): boolean {
    const w = g.world;
    const s = g.state;
    if (map.id !== w.sceneMapId || !w.killerId || !s.briefed) return false;
    const wk = g.sim.walkers.get(w.killerId);
    if (!wk || wk.map !== map.id || wk.why !== 'sneak' || wk.legs.length > 0 || wk.t > 0 || this.moveT > 0) return false;
    if (Math.abs(wk.x - s.x) + Math.abs(wk.y - s.y) > 12) return false;
    const id = w.caughtId;
    if (!id || s.found.includes(id)) return false;
    const kname = w.c.characters.find((c) => c.id === w.killerId)?.name ?? 'Someone';
    wk.dir = wk.x > s.x ? 'left' : wk.x < s.x ? 'right' : wk.y > s.y ? 'up' : 'down';
    g.audio.sfx('battle');
    s.seen.push('caught');
    say(
      g,
      [
        { who: null, text: `Somebody is in ${w.maps[w.sceneMapId]?.name ?? 'the scene'}. It is sealed. It is ${kname}!` },
        { who: kname, text: 'Detective! I... was only looking for the powder room. Gets so confusing in here.' },
        { who: null, text: `${kname} hurries out. You did not believe a word.` },
      ],
      () => {
        s.found.push(id);
        wk.legs = [];
        announceClue(g, id, true, () => g.save());
      },
    );
    return true;
  }

  private finishStep(g: Game, map: MapDef): void {
    const s = g.state;
    if (s.steps % 25 === 0) g.save();
    const warp = map.warps.find((w) => w.x === s.x && w.y === s.y);
    if (!warp) return;
    g.audio.sfx('door');
    g.push(
      new Transition(
        'out',
        'fade',
        () => {
          s.map = warp.to;
          s.x = warp.tx;
          s.y = warp.ty;
          s.dir = warp.dir;
          this.syncMap(g);
          g.save();
          g.push(new Transition('in', 'fade', undefined, 12));
        },
        12,
      ),
    );
  }

  /** What is in front of the detective, and what would SPACE do to it? */
  private target(g: Game, map: MapDef): Target {
    const s = g.state;
    const v = DIR_VEC[s.dir];
    const tx = s.x + v.x;
    const ty = s.y + v.y;
    const npc = this.npcAt(g, map, tx, ty);
    if (npc) return { kind: 'npc', verb: npc.kind === 'suspect' ? 'TALK' : npc.kind === 'inspector' ? 'REPORT' : 'EXAMINE', x: tx, y: ty };
    if (map.items.some((i) => i.x === tx && i.y === ty && !s.found.includes(i.evidenceId))) return { kind: 'item', verb: 'TAKE', x: tx, y: ty };
    if (this.extraAt(tx, ty)) return { kind: 'extra', verb: this.extraAt(tx, ty)?.def.witnessId ? 'ASK' : 'CHAT', x: tx, y: ty };
    const warp = map.warps.find((w) => w.x === tx && w.y === ty);
    if (warp) return { kind: 'door', verb: 'ENTER', x: tx, y: ty };
    const rit = g.world.ritual;
    if (rit && rit.map === map.id && rit.x === tx && rit.y === ty) return { kind: 'prop', verb: g.state.found.includes(rit.evId) ? 'LOOK' : RITUALS[g.world.env].verb, x: tx, y: ty };
    const over = map.over[ty * map.w + tx] as number | undefined;
    if (over && (kindOf(over) === K.PROP || FLAVOR[kindOf(over)])) return { kind: 'prop', verb: 'LOOK', x: tx, y: ty };
    return null;
  }

  private interact(g: Game, map: MapDef): boolean {
    const s = g.state;
    const v = DIR_VEC[s.dir];
    const tx = s.x + v.x;
    const ty = s.y + v.y;
    const npc = this.npcAt(g, map, tx, ty);
    if (npc) {
      if (npc.kind !== 'body') {
        this.dirs.set(npc.id, OPPOSITE[s.dir]);
        const wk = g.sim.walkers.get(npc.charId ?? '');
        if (wk) wk.dir = OPPOSITE[s.dir];
      }
      if (npc.kind === 'suspect') {
        g.audio.sfx('battle');
        this.alert = { npc, t: 34 };
      } else talkTo(g, npc);
      return true;
    }
    const item = map.items.find((i) => i.x === tx && i.y === ty && !s.found.includes(i.evidenceId));
    if (item) {
      pickUpClue(g, item.evidenceId);
      return true;
    }
    const ex = this.extraAt(tx, ty);
    if (ex) {
      ex.dir = OPPOSITE[s.dir];
      ex.wait = 120;
      const wit = ex.def.witnessId ? g.world.witnesses.find((x) => x.id === ex.def.witnessId) : undefined;
      if (wit) witnessTalk(g, wit);
      else say(g, [{ who: ex.def.name, text: ex.def.line }]);
      return true;
    }
    const rit = g.world.ritual;
    if (rit && rit.map === map.id && rit.x === tx && rit.y === ty) {
      runRitual(g);
      return true;
    }
    const over = map.over[ty * map.w + tx];
    if (over) {
      const kind = kindOf(over);
      if (kind === K.PROP) {
        const meta = propMeta(over);
        if (meta?.sfx) g.audio.prop(meta.sfx);
        const lines = meta?.flavor;
        if (lines && lines.length) {
          say(g, [new Rng(hashSeed(`${map.id}${tx},${ty}`)).pick(lines)]);
          return true;
        }
        return false;
      }
      const lines = FLAVOR[kind];
      if (lines && lines.length) {
        say(g, [new Rng(hashSeed(`${map.id}${tx},${ty}`)).pick(lines)]);
        return true;
      }
    }
    return false;
  }

  private idleNpcs(g: Game, map: MapDef): void {
    for (const wk of g.sim.inMap(map.id)) {
      if (this.alert?.npc === wk.def || wk.legs.length > 0 || wk.t > 0) continue;
      const t = (this.timers.get(wk.id) ?? 60 + this.rng.int(0, 200)) - 1;
      if (t <= 0) {
        wk.dir = this.rng.pick(DIRS);
        this.timers.set(wk.id, 90 + this.rng.int(0, 240));
      } else this.timers.set(wk.id, t);
    }
  }

  private wander(g: Game, map: MapDef): void {
    for (const w of this.wanderers) {
      if (w.t > 0) {
        w.t--;
        continue;
      }
      if (w.wait > 0) {
        w.wait--;
        continue;
      }
      const d = this.rng.pick(DIRS);
      const v = DIR_VEC[d];
      const nx = w.x + v.x;
      const ny = w.y + v.y;
      w.dir = d;
      w.wait = 20 + this.rng.int(0, 150);
      const s = g.state;
      if (this.blocked(g, map, nx, ny) || (nx === s.x && ny === s.y) || this.extraAt(nx, ny) || map.warps.some((wp) => wp.x === nx && wp.y === ny)) continue;
      // stay near home so crowds keep to their patch
      if (Math.abs(nx - w.home.x) + Math.abs(ny - w.home.y) > 6) continue;
      w.x = nx;
      w.y = ny;
      w.t = 12;
    }
  }

  draw(g: Game, ctx: CanvasRenderingContext2D): void {
    const s = g.state;
    const map = this.map(g);
    const env = ENVS[map.env];
    const v = DIR_VEC[this.moveDir];
    const f = this.moveFrames ? this.moveT / this.moveFrames : 0;
    const px = s.x * TILE - v.x * TILE * f;
    const py = s.y * TILE - v.y * TILE * f;
    const mw = map.w * TILE;
    const mh = map.h * TILE;
    const sway = env.sway ? Math.round(Math.sin(g.tick / 70) * env.sway) : 0;
    const cam = (p: number, span: number, view: number) => Math.round(span <= view ? -(view - span) / 2 : Math.max(0, Math.min(span - view, p + 8 - view / 2)));
    const missShake = this.missFx > 184 ? (this.missFx % 4 < 2 ? 2 : -2) : 0;
    const cx = cam(px, mw, VIEW_W) + (env.sway ? sway : 0) + missShake;
    const cy = cam(py, mh, VIEW_H) + (env.sway ? Math.round(Math.sin(g.tick / 53 + 1) * env.sway) : 0);
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const view = { cx, cy, w: VIEW_W, h: VIEW_H };
    const playerRow = Math.floor((py + 8) / TILE);
    const walking = this.moveT > 0;
    const walkers = g.sim.inMap(map.id);
    drawMapTiles(ctx, map, view, g.tick, (ty) => {
      for (const it of map.items) if (it.y === ty && !s.found.includes(it.evidenceId)) drawItem(ctx, it.x * TILE - cx, it.y * TILE - cy, g.world.icons[it.evidenceId] ?? { id: 'gen-paper:0', verbal: false }, g.tick);
      for (const n of map.npcs) {
        if (n.y !== ty || n.kind === 'suspect') continue;
        const nx = n.x * TILE - cx;
        const ny = n.y * TILE - cy;
        if (n.kind === 'body') drawBody(ctx, nx, ny, n.look);
        else drawChar(ctx, nx, ny, n.look, this.dirs.get(n.id) ?? n.dir, 0);
      }
      // suspects on their rounds: they walk between rooms on the night's clock
      for (const wk of walkers) {
        if (wk.y !== ty) continue;
        const f = wk.t / 11;
        const ox = (wk.fromX - wk.x) * f;
        const oy = (wk.fromY - wk.y) * f;
        const stepFrame = wk.t > 0 ? (Math.floor(wk.t / 3) % 2 ? 1 : 2) : 0;
        const nx = Math.round((wk.x + ox) * TILE - cx);
        const ny = Math.round((wk.y + oy) * TILE - cy);
        drawChar(ctx, nx, ny, wk.look, wk.dir, stepFrame);
        if (this.alert?.npc === wk.def) drawBubble(ctx, nx, ny);
        else if (wk.why === 'sneak' && wk.legs.length > 0 && wk.map === map.id && Math.abs(wk.x - s.x) + Math.abs(wk.y - s.y) < 9 && g.tick % 90 < 30) drawBubble(ctx, nx, ny);
      }
      for (const w of this.wanderers) {
        if (w.y !== ty) continue;
        const off = w.t / 12;
        drawChar(ctx, Math.round((w.x - DIR_VEC[w.dir].x * off) * TILE - cx), Math.round((w.y - DIR_VEC[w.dir].y * off) * TILE - cy), w.def.look, w.dir, w.t > 0 ? (Math.floor(w.t / 4) % 2 ? 1 : 2) : 0);
      }
      if (playerRow === ty) drawDetective(ctx, Math.round(px - cx), Math.round(py - cy), DETECTIVE_LOOK, s.dir, walking ? (this.side ? 1 : 2) : 0);
    });

    // lighting, weather, tone: the night deepens with the story, the storm builds, and the power fails halfway through
    const ns = nightState(g.world, s);
    const dark = Math.min(0.9, map.dark + ns.dark + (ns.blackout ? 0.3 : 0));
    const lit = dark > 0.22 || ns.blackout;
    let lights = collectLights(map, view, g.tick, lit ? { x: px + 8, y: py + 8 } : null);
    if (ns.blackout) {
      // the power is out: only weak emergency light and whatever burns, plus a flashlight cone where the detective faces
      lights = lights.map((l) => ({ ...l, r: Math.max(8, Math.round(l.r * 0.55)), strength: l.strength * 0.5 }));
      const fv = DIR_VEC[s.dir];
      for (let k = 1; k <= 4; k++) lights.push({ x: px + 8 - cx + fv.x * k * 12, y: py + 8 - cy + fv.y * k * 12, r: 12 + k * 5, color: '#e8f0ff', flicker: 0.03, strength: 0.9 - k * 0.1 });
    }
    drawLighting(ctx, map, view, g.tick, dark, g.world.c.tone, lights);
    const tint = TINT[g.world.c.tone];
    if (tint) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalCompositeOperation = 'source-over';
    }
    let amb = map.ambient;
    if ((g.world.c.tone === 'noir' || ns.storm > 0) && map.outdoor && (amb === 'none' || amb === 'fireflies' || amb === 'petals' || amb === 'dust')) amb = ns.storm > 0 && (g.world.env === 'station' || g.world.env === 'lodge') ? 'snow' : 'rain';
    drawAmbient(ctx, amb, view, g.tick, map.outdoor);
    if (map.outdoor && ns.storm >= 1 && (amb === 'rain' || amb === 'snow' || amb === 'blizzard' || amb === 'spray')) drawAmbient(ctx, amb, view, g.tick + 211, map.outdoor);
    if (map.outdoor && ns.storm >= 2) {
      // thunder: a rare hard flash
      const cyc = g.tick % 780;
      if (cyc < 5 || (cyc > 12 && cyc < 15)) {
        ctx.fillStyle = `rgba(230,236,255,${cyc < 5 ? 0.42 - cyc * 0.06 : 0.18})`;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
    }
    // the near-miss: a hard cold flash (the door slamming), then the room lingers a shade colder for a moment
    if (this.missFx > 0) {
      if (this.missFx > 188) {
        ctx.fillStyle = `rgba(200,228,255,${((this.missFx - 188) / 12) * 0.85})`;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(150,190,235,${Math.min(0.3, this.missFx / 200)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalCompositeOperation = 'source-over';
    }

    // --- Top-of-screen UI: ALL of it goes through one shared TopBand this frame (see topband.ts). ---
    // Round 9 replaces four rounds (5-8) of independently-clamped boxes (the banner clamped against
    // a guess about the HUD, the toast deferred against a guess about the banner, the near-miss
    // banner clamped against a guess about both, the interaction prompt never audited at all) with
    // one shared layout: the HUD reserves its row first (always present), then whichever of the
    // banner/toast/near-miss banner are active this frame each reserve the next free row, in that
    // order -- so two of them sharing a pixel is structurally impossible, not individually avoided.
    //
    // Round 12: the band is also given a CEILING -- `DIALOGUE_BOX.y`, `DialogueScene`'s own fixed box
    // position, minus a small gap -- so every element below (not just the interaction prompt) can ask
    // `band.fits(y, h)` before drawing and never paint into the region that box occupies at the bottom
    // of the screen. This closes a second, independent axis of the same "uncoordinated UI regions"
    // smell: a critic found the interaction prompt colliding with an ordinary dialogue box under an
    // unusually tall top-band stack; an audit for the same failure shape found the STACKING elements
    // (banner/toast/near-miss) are theoretically exposed too, since a long enough banner or toast text
    // (reachable only via a hand-built case's free-text fields, never the generator's own short,
    // fixed name pool -- see topband.ts) could push a later element's own box down far enough to reach
    // `DIALOGUE_BOX.y` with no interaction prompt involved at all.
    const DIALOGUE_GAP = 4;
    const band = new TopBand(4, 4, DIALOGUE_BOX.y - DIALOGUE_GAP);
    // Round 10: a scene pushed on top of OverworldScene (MenuScene, PickScene, ClueCardScene -- see
    // each one's `coversTopBand`) is drawn AFTER this draw() every frame regardless, because none of
    // them are opaque (Game.render() still draws OverworldScene underneath them). Round 9 made every
    // element below collision-proof against EACH OTHER, but never against a box belonging to a
    // different scene entirely -- so the room banner/toast/near-miss banner would render in full and
    // then get sliced by whatever such a scene draws on top of them (round 9's critic report: opening
    // the pause menu truncated an in-progress room-name banner mid-word). Rather than special-case
    // MenuScene, ask whoever is actually on top of the stack right now: if it says its own box can
    // land in this same area, skip *drawing* (not reserving space for -- `band.floor` stays identical
    // either way, so nothing downstream shifts) these three transient boxes for this one frame. Their
    // timers are already frozen while covered (OverworldScene.update() only runs when it is the top
    // scene), so they simply resume, unclipped, the moment the covering scene is popped -- nothing is
    // lost, nothing needs to be paused separately.
    const coveredByOverlay = g.top !== this && !!g.top?.coversTopBand;

    // HUD: clues on the left, the night's clock on the right. Always present, always reserves first.
    const hudY = band.reserve(17);
    const p = `CLUES ${progress(g.world, s).found}/${progress(g.world, s).total}`;
    box(ctx, 4, hudY, p.length * 8 + 14, 17);
    text(ctx, p, 11, hudY + 5);
    const clock = clockLabel(g.world, s);
    const cw = clock.length * 8 + 14;
    box(ctx, VIEW_W - cw - 4, hudY, cw, 17, ns.blackout ? '#3a2030' : '#fff7d8', ns.blackout ? '#1a0810' : undefined);
    text(ctx, clock, VIEW_W - cw + 3, hudY + 5, ns.blackout ? '#ff9a9a' : undefined);
    if (ns.blackout) text(ctx, 'POWER OUT', VIEW_W - 9 * 8 - 8, hudY + 20, '#ff9a9a', null);

    // The goal reminder lives at the BOTTOM of the screen, not the top band; unaffected by this system.
    if (this.bannerT > 0 && this.bannerT < 100 && s.map === g.world.hubId) {
      const goal = wrapText(`GOAL: ${goalText(g.world, s)}`, 36);
      const gw = Math.max(...goal.map((l) => l.length)) * 8 + 12;
      const gh = goal.length * 10 + 6;
      box(ctx, Math.round((VIEW_W - gw) / 2), VIEW_H - gh - 4, gw, gh, '#f0efe8');
      goal.forEach((l, i) => text(ctx, l, Math.round((VIEW_W - gw) / 2) + 6, VIEW_H - gh + 1 + i * 10, '#5a3a26'));
    }

    if (this.bannerT > 0) {
      // Room/setting name banner, shown on every map transition. Reserves the row right after the
      // HUD, whatever the HUD's or this banner's own size happens to be -- not a hardcoded y=30 that
      // has to be re-derived by hand every time either box changes (see creator-notes.md Round 9).
      // IMPORTANT: the reservation must cover the box's ENTIRE animated footprint, not just its
      // settled size -- the entrance/exit settle below moves the box up to `SETTLE` px lower than its
      // resting position, so reserving only the resting height would let that transient overshoot
      // spill into whatever is reserved next (the toast row). Reserving `bh2 + SETTLE` up front means
      // the animation can never leave the block that was actually claimed for it.
      const name = wrapText(s.map === g.world.hubId ? g.world.c.setting.name || map.name : map.name, 26);
      const bw2 = Math.max(...name.map((l) => l.length)) * 8 + 22;
      const bh2 = name.length * 9 + 8;
      const SETTLE = 8;
      const bannerY = band.reserve(bh2 + SETTLE);
      // Settles INTO its slot from just below, never from above: rounds 6-7 needed a hand-derived
      // clamp because the old animation slid down from off-screen THROUGH the HUD row on the way in
      // (and back through it on the way out). Approaching from below removes the failure mode
      // instead of merely guarding it -- the box's y is never less than `bannerY`, by construction.
      const slide = Math.min(1, Math.min(this.bannerT, 120 - this.bannerT) / 10);
      const y0 = Math.round(bannerY + (1 - slide) * SETTLE);
      // Skip only the pixels, not the reservation above: `band.floor` must stay exactly what it would
      // have been with the banner showing, so nothing else in the stack shifts when it is hidden.
      // `band.fits` (round 12) additionally guards against this box's own bottom edge ever reaching
      // `DIALOGUE_BOX.y` -- see the audit note above the `TopBand` construction.
      if (!coveredByOverlay && band.fits(y0, bh2)) {
        box(ctx, Math.round((VIEW_W - bw2) / 2), y0, bw2, bh2, '#fff7d8');
        name.forEach((l, i) => text(ctx, l, Math.round((VIEW_W - bw2) / 2) + 11, y0 + 5 + i * 9));
      }
    }

    if (this.toastT > 0 && this.toast) {
      // Flavour toast (the absent-occupant nudge and the POLICE LINE warning, both via setToast()).
      // Reserves the next free row after the HUD and, if up, the room banner -- so it now simply
      // gets its own row below the banner instead of being queued and possibly dropped until the
      // banner clears (rounds 7-8's `pendingToast` mechanism, removed this round): both can be
      // legible on screen at once, each in its own place, which is strictly better than a deferral
      // that could silently lose a message if the player moved on quickly.
      const lines = wrapText(this.toast, 34);
      const tw = Math.max(...lines.map((l) => l.length)) * 8 + 12;
      const th = lines.length * 10 + 6;
      const toastY = band.reserve(th);
      if (!coveredByOverlay && band.fits(toastY, th)) {
        box(ctx, Math.round((VIEW_W - tw) / 2), toastY, tw, th, '#3a2f52', '#1a1030', '#6a5a9a');
        lines.forEach((l, i) => text(ctx, l, Math.round((VIEW_W - tw) / 2) + 6, toastY + 4 + i * 10, '#ffe27a', null));
      }
    }

    // The near-miss banner: cold navy, an ajar-door glyph, its own shape/colour so it never reads as
    // just another toast. Reserves the next free row after everything above, so it always lands
    // below the HUD, the room banner and any toast up this exact frame, whatever their combined
    // height is -- not a hardcoded y=70 tuned once against today's other boxes' sizes. As with the
    // room banner, the reservation covers the full animated footprint (34 + SETTLE), not just the
    // settled 34px, so its own entrance settle can never spill into whatever comes after it either.
    if (this.missFx > 0) {
      const bw3 = 190;
      const bx3 = Math.round((VIEW_W - bw3) / 2);
      const SETTLE = 8;
      const nearMissY = band.reserve(34 + SETTLE);
      const elapsed = 200 - this.missFx;
      const settle = Math.min(1, elapsed / 10);
      const by = Math.round(nearMissY + (1 - settle) * SETTLE); // settles into its slot from just below, same discipline as the room banner
      if (!coveredByOverlay && band.fits(by, 34)) {
        box(ctx, bx3, by, bw3, 34, '#0f1a2c', '#7fc4ff', '#1c3350');
        // an ajar door: a dark doorway recess, a hinged slab flush to the left jamb leaving a visible dark gap on the
        // hinge-free side, a doorknob on the slab's free edge, and swing/motion dashes trailing off the open edge.
        const ox = bx3 + 9;
        const oy = by + 5;
        ctx.fillStyle = '#050b14'; // the dark opening behind the door
        ctx.fillRect(ox, oy, 14, 24);
        ctx.fillStyle = '#3a4a5e'; // door casing (lintel + jambs; open at the bottom, like the building doors elsewhere)
        ctx.fillRect(ox - 1, oy - 1, 16, 2);
        ctx.fillRect(ox - 1, oy - 1, 2, 26);
        ctx.fillRect(ox + 13, oy - 1, 2, 26);
        ctx.fillStyle = '#7fc4ff'; // the slab itself, hinged on the left jamb
        ctx.fillRect(ox + 1, oy + 1, 8, 22);
        ctx.fillStyle = '#4f8fc9'; // two recessed panels, so the slab reads as a door and not a flat card
        ctx.fillRect(ox + 2, oy + 3, 6, 8);
        ctx.fillRect(ox + 2, oy + 13, 6, 8);
        ctx.fillStyle = '#f0d060'; // doorknob on the free (open) edge
        ctx.fillRect(ox + 7, oy + 11, 2, 2);
        ctx.fillStyle = '#7fc4ff'; // swing/motion dashes arcing off the open edge into the gap
        ctx.fillRect(ox + 16, oy + 4, 5, 1);
        ctx.fillRect(ox + 18, oy + 10, 6, 1);
        ctx.fillRect(ox + 16, oy + 17, 5, 1);
        text(ctx, 'JUST MISSED', bx3 + 38, by + 8, '#ffffff', null);
        text(ctx, 'The door is still swinging.', bx3 + 38, by + 19, '#bfe6ff', null);
      }
    }

    // What SPACE would do: floats near whatever the player is facing, but its own top edge is
    // clamped to `band.floor` -- whatever the band above has already claimed THIS frame, whether
    // that's the HUD alone or the HUD plus any live combination of banner/toast/near-miss banner.
    // This is the one contextual element (it must stay near its target, not stack in the column),
    // but it is no longer floored at a hardcoded constant (the round-8 bug: `Math.max(2, ...)` sat
    // inside the HUD's own row) -- it asks the same shared authority everything else already uses.
    // Round 10: its box floats wherever the player is facing, so unlike the three above it is not
    // confined to the top rows -- it can land anywhere on screen, including squarely behind
    // `MenuScene`'s box (confirmed live: a target near the screen's right edge rendered "SPACE TAKE"
    // as "SPACE TA" once the menu opened over it). Skip only the pixels (`!coveredByOverlay`), same
    // discipline as the three transient boxes above: SPACE cannot act on the target while the menu is
    // up anyway (`OverworldScene.update()` only runs when it is the top scene), so hiding it is not a
    // loss of information, just the removal of a stale, now-cropped prompt.
    //
    // Round 12: `band.floor` is a MINIMUM clamp against the shared TOP-of-screen budget only. It had
    // no awareness that `DialogueScene`'s own text box occupies a second, independent, FIXED region at
    // the BOTTOM of the screen (`DIALOGUE_BOX.y`, imported directly since it is a compile-time constant,
    // not a dynamic reservation like the top band). Pressing SPACE on this exact target is what would
    // open that box (or an ordinary, non-choice DialogueScene may already be showing underneath, since
    // it deliberately does not set `coversTopBand` -- round 10's own correct call, made when the top
    // band could never get tall enough to reach that far down). An unusually tall top-band stack (HUD +
    // banner + toast + near-miss all live at once, each individually a common event) can push the
    // prompt's `band.floor`-clamped position low enough to collide with `DIALOGUE_BOX.y` -- a second,
    // independent axis of the exact same "uncoordinated UI regions" smell rounds 5-11 kept finding on
    // the top band alone. Fix: a second, MAXIMUM clamp, symmetric to the first (`band.maxTopFor(bh)`,
    // backed by the same `ceiling` the band was built with above), so the prompt's own bottom edge can
    // never reach the dialogue box's top edge. If the two clamps leave no room at all (the pathological
    // case: the top-band stack alone already reaches within one prompt-height of the dialogue box),
    // `band.fits` says so and the prompt is skipped entirely for that frame rather than drawn corrupted
    // -- exactly the same "hiding a stale hint is not a loss, a sliced one is a bug" discipline already
    // used for `coveredByOverlay` above, and just as safe here: the prompt is purely informational and
    // is recomputed fresh, uncropped, the moment the stack calms down by even one row.
    if (this.moveT === 0 && !this.alert) {
      const t = this.target(g, map);
      if (t) {
        this.prompt = Math.min(1, this.prompt + 0.15);
        const wp = t.kind === 'door' ? map.warps.find((w) => w.x === t.x && w.y === t.y) : undefined;
        const lines = t.kind === 'door' ? wrapText((wp?.label ?? t.verb).toUpperCase(), 22) : [`SPACE ${t.verb}`];
        const bw = Math.max(...lines.map((l) => l.length)) * 8 + 10;
        const bh = lines.length * 9 + 5;
        const tx = t.x * TILE - cx + 8;
        const ty = t.y * TILE - cy - 6;
        const bx = Math.max(2, Math.min(VIEW_W - bw - 2, Math.round(tx - bw / 2)));
        const naturalBy = Math.round(ty - bh + 2 - (1 - this.prompt) * 4 + Math.sin(g.tick / 10));
        const by = Math.max(band.floor, Math.min(band.maxTopFor(bh), naturalBy));
        if (!coveredByOverlay && band.fits(by, bh)) {
          box(ctx, bx, by, bw, bh, wp?.scene ? '#ffe0d8' : '#fff7d8');
          lines.forEach((l, i) => text(ctx, l, bx + 5, by + 3 + i * 9, t.kind === 'door' ? '#7a2a2a' : '#2a2a34'));
        }
      }
    } else {
      this.prompt = 0;
    }
  }
}
