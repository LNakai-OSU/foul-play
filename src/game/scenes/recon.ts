/**
 * The reconstruction: once the killer is broken, the Inspector replays the night in the setting itself. A sepia ghost of the
 * culprit leaves the room where they swore they were, crosses the map and slips into the scene of the crime, and each clue
 * you found pops up where it mattered. Uses the real map renderer, so a boat deck, a snowfield or an opera house replays differently.
 */
import { Scene } from '../engine';
import type { Game } from '../engine';
import { drawIcon } from '../art/icons-draw';
import { blockedAt } from '../grid';
import { collectLights, drawAmbient, drawLighting, drawMapTiles } from '../render';
import { drawChar } from '../sprites';
import { DIR_VEC, TILE, VIEW_H, VIEW_W } from '../types';
import type { Dir, MapDef } from '../types';
import { box, text, textCenter, truncate } from '../ui';
import { charById, evidenceById, killerOf } from '../logic';
import { deriveSolution } from '../../../shared/solution';
import { say } from './dialogue';
import { Transition } from './misc';

type P = { x: number; y: number };

function findPath(m: MapDef, from: P, to: P): P[] {
  const key = (p: P) => `${p.x},${p.y}`;
  const prev = new Map<string, P | null>([[key(from), null]]);
  const q: P[] = [from];
  while (q.length) {
    const cur = q.shift() as P;
    if (cur.x === to.x && cur.y === to.y) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = { x: cur.x + dx, y: cur.y + dy };
      if (prev.has(key(n)) || (blockedAt(m, n.x, n.y) && !(n.x === to.x && n.y === to.y))) continue;
      prev.set(key(n), cur);
      q.push(n);
    }
  }
  if (!prev.has(key(to))) return [];
  const path: P[] = [];
  for (let c: P | null | undefined = to; c; c = prev.get(key(c))) path.unshift(c);
  return path;
}

export class ReconstructionScene extends Scene {
  opaque = true;
  private t = 0;
  private path: P[] = [];
  private idx = 0;
  private step = 0;
  private stage = 0;
  private waiting = false;
  private pop: { id: string; verbal: boolean; t: number } | null = null;
  private trail: { x: number; y: number; t: number }[] = [];
  private beats: { at: number; lines: { who: string | null; text: string }[]; ev?: string }[] = [];
  private dir: Dir = 'down';
  private done = false;

  constructor(private then: () => void) {
    super();
  }

  enter(g: Game): void {
    const w = g.world;
    const hub = w.maps[w.hubId] as MapDef;
    const killer = killerOf(w);
    g.audio.play('none');
    g.audio.sfx('reveal');
    if (!killer) {
      this.done = true;
      return;
    }
    const sol = deriveSolution(w.c);
    const claimMap = w.charMap[killer.id];
    const sceneWarp = hub.warps.find((x) => x.to === w.sceneMapId);
    const claimWarp = hub.warps.find((x) => x.to === claimMap) ?? hub.warps.find((x) => x.to !== w.sceneMapId);
    const step = (wp: { x: number; y: number } | undefined): P | null => {
      if (!wp) return null;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) if (!blockedAt(hub, wp.x + dx, wp.y + dy)) return { x: wp.x + dx, y: wp.y + dy };
      return null;
    };
    const a = step(claimWarp);
    const b = step(sceneWarp);
    if (a && b) this.path = findPath(hub, a, b);
    if (this.path.length < 2) {
      this.done = true;
      return;
    }
    if (claimWarp) this.path.unshift({ x: claimWarp.x, y: claimWarp.y });
    if (sceneWarp) this.path.push({ x: sceneWarp.x, y: sceneWarp.y });
    // the best clues against them, in the order they matter
    const kroom = w.claims[killer.id]?.room;
    const score = (id: string): number => {
      const f = w.facts[id];
      if (f?.kind === 'occ' && (f.obs ?? []).some((o) => o.room === kroom && o.max === 0)) return 2;
      if (f?.kind === 'trait' && (f.who ?? []).includes(killer.id)) return 1;
      return 0;
    };
    const key = g.state.found
      .map((id) => evidenceById(w, id))
      .filter((e): e is NonNullable<typeof e> => !!e && score(e.id) > 0)
      .sort((p, z) => score(z.id) - score(p.id))
      .slice(0, 3);
    const name = killer.name;
    const room = (w.maps[claimMap ?? '']?.name ?? 'a quiet room').replace(/^the /i, 'the ');
    const scene = (w.maps[w.sceneMapId]?.name ?? 'the scene').replace(/^the /i, 'the ');
    const inspector = w.inspectorName;
    const n = this.path.length;
    this.beats.push({ at: 0, lines: [{ who: inspector, text: `Let us replay the night. ${name} swore they never left ${room}.` }] });
    key.forEach((e, i) => this.beats.push({ at: Math.max(2, Math.floor(((i + 1) * n) / (key.length + 2))), ev: e.id, lines: [{ who: inspector, text: `But look at this. ${e.title}: ${e.description}` }] }));
    this.beats.push({
      at: n - 1,
      lines: [
        { who: inspector, text: `${name} crossed ${w.c.setting.name || 'the grounds'} unseen and slipped into ${scene}${w.c.victim.timeOfDeath ? ` around ${w.c.victim.timeOfDeath}` : ''}.` },
        { who: inspector, text: `${sol.method ? sol.method + '. ' : ''}${sol.motives[0]?.description ?? ''}`.trim() },
      ],
    });
    this.dir = 'down';
  }

  update(g: Game): void {
    this.t++;
    if (this.pop) this.pop.t++;
    for (const p of this.trail) p.t++;
    this.trail = this.trail.filter((p) => p.t < 80);
    if (this.done) {
      if (this.t > 2) this.finish(g);
      return;
    }
    if (this.waiting) return;
    if (this.t < 50) return;
    // narration beats fire as the ghost reaches them
    const beat = this.beats[this.stage];
    if (beat && this.idx >= beat.at) {
      this.stage++;
      this.waiting = true;
      if (beat.ev) {
        const e = evidenceById(g.world, beat.ev);
        const icon = g.world.icons[beat.ev];
        if (e && icon) this.pop = { id: icon.id, verbal: icon.verbal, t: 0 };
        g.audio.sfx('hold');
      }
      say(g, beat.lines, () => {
        this.waiting = false;
        this.pop = null;
      });
      return;
    }
    if (this.idx >= this.path.length - 1) {
      if (this.step === 0) this.step = 1;
      if (this.t % 2 === 0) this.step++;
      if (this.step > 26) this.finish(g);
      return;
    }
    this.step++;
    if (this.step >= 9) {
      this.step = 0;
      const cur = this.path[this.idx] as P;
      this.trail.push({ x: cur.x, y: cur.y, t: 0 });
      this.idx++;
      const nxt = this.path[this.idx] as P;
      const dx = nxt.x - cur.x;
      const dy = nxt.y - cur.y;
      this.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy < 0 ? 'up' : 'down';
      if (this.idx % 2 === 0) g.audio.sfx('tick');
    }
  }

  private finishing = false;

  private finish(g: Game): void {
    if (this.finishing) return;
    this.finishing = true;
    g.push(new Transition('out', 'fade', () => {
      g.pop();
      g.push(new Transition('in', 'fade', () => this.then(), 14));
    }, 22));
  }

  draw(g: Game, ctx: CanvasRenderingContext2D): void {
    const w = g.world;
    const map = w.maps[w.hubId] as MapDef;
    const cur = this.path[Math.min(this.idx, this.path.length - 1)] ?? { x: map.entrance.x, y: map.entrance.y };
    const nxt = this.path[Math.min(this.idx + 1, this.path.length - 1)] ?? cur;
    const f = this.step / 9;
    const gx = (cur.x + (nxt.x - cur.x) * (this.idx >= this.path.length - 1 ? 0 : f)) * TILE;
    const gy = (cur.y + (nxt.y - cur.y) * (this.idx >= this.path.length - 1 ? 0 : f)) * TILE;
    const mw = map.w * TILE;
    const mh = map.h * TILE;
    const cam = (p: number, span: number, view: number) => Math.round(span <= view ? -(view - span) / 2 : Math.max(0, Math.min(span - view, p + 8 - view / 2)));
    const cx = cam(gx, mw, VIEW_W);
    const cy = cam(gy, mh, VIEW_H);
    const view = { cx, cy, w: VIEW_W, h: VIEW_H };
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const look = w.maps[w.hubId] && [...Object.values(w.maps).flatMap((m) => m.npcs)].find((n) => n.charId === w.killerId)?.look;
    drawMapTiles(ctx, map, view, g.tick, (ty) => {
      if (look && Math.floor((gy + 8) / TILE) === ty && !this.done) {
        ctx.save();
        const fade = Math.min(1, this.t / 40);
        ctx.globalAlpha = (0.55 + 0.15 * Math.sin(g.tick / 5)) * fade;
        drawChar(ctx, Math.round(gx - cx), Math.round(gy - cy), look, this.dir, this.step > 0 ? (Math.floor(this.step / 3) % 2 ? 1 : 2) : 0);
        ctx.restore();
      }
    });
    // footprints
    for (const p of this.trail) {
      ctx.fillStyle = `rgba(255,236,190,${0.6 - p.t / 140})`;
      ctx.fillRect(p.x * TILE - cx + 6, p.y * TILE - cy + 10, 2, 2);
      ctx.fillRect(p.x * TILE - cx + 9, p.y * TILE - cy + 12, 2, 2);
    }
    const lights = collectLights(map, view, g.tick, { x: gx + 8, y: gy + 8 });
    drawLighting(ctx, map, view, g.tick, map.dark * 0.45 + 0.08, w.c.tone, lights);
    // sepia grade, grain and vignette: an old film reel
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#e8cc9c';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalCompositeOperation = 'source-over';
    drawAmbient(ctx, 'dust', view, g.tick, true);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = 'rgba(255,240,210,0.16)';
      ctx.fillRect((i * 97 + g.tick * 31) % VIEW_W, (i * 53 + g.tick * 17) % VIEW_H, 1, 1);
    }
    if (g.tick % 47 < 2) {
      ctx.fillStyle = 'rgba(255,240,210,0.25)';
      ctx.fillRect((g.tick * 13) % VIEW_W, 0, 1, VIEW_H);
    }
    const grad = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 60, VIEW_W / 2, VIEW_H / 2, 200);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(20,10,0,0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // letterbox
    const bar = Math.min(18, this.t / 2);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, bar);
    ctx.fillRect(0, VIEW_H - bar, VIEW_W, bar);
    text(ctx, 'RECONSTRUCTION', 8, 5, '#f0e0b8', null);
    if (Math.floor(g.tick / 24) % 2 === 0) {
      ctx.fillStyle = '#d02828';
      ctx.fillRect(VIEW_W - 44, 6, 6, 6);
      text(ctx, 'REC', VIEW_W - 34, 5, '#f0e0b8', null);
    }
    if (this.pop) {
      const k = Math.min(1, this.pop.t / 8);
      const px = Math.max(30, Math.min(VIEW_W - 30, gx - cx + 8));
      const py = Math.max(60, Math.min(VIEW_H - 50, gy - cy - 30));
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(k, k);
      box(ctx, -26, -26, 52, 52, '#3a2f52', '#1f1d2b', '#e8c840');
      ctx.scale(2, 2);
      drawIcon(ctx, this.pop.id, -8, -8, 1, this.pop.verbal);
      ctx.restore();
    }
    if (this.done) textCenter(ctx, truncate(charById(w, w.killerId ?? '')?.name ?? '', 28), VIEW_W / 2, VIEW_H / 2, '#f0e0b8', null);
    void DIR_VEC;
  }
}
