/**
 * THE NIGHT: reconstruct where everyone was when the shot rang out. The detective places each guest in a room; the table only
 * complains when it contradicts a headcount the detective HOLDS (the staff counted heads at the shot), and it never says who is
 * lying. A finished, consistent table that puts exactly one person alone with the body is the accusation.
 */
import { Scene } from '../engine';
import type { Game } from '../engine';
import { canAccuse, checkNight, clockAt, placeAsSworn, placeToken, roomWord } from '../logic';
import { heldOcc } from '../facts';
import { drawBust, drawToken } from '../sprites';
import { VIEW_H, VIEW_W } from '../types';
import type { Look } from '../types';
import { box, cursor, nameLines, text, textRight } from '../ui';
import { wrapText } from '../text';
import { SecondTruthScene } from './second-truth';

const BG = '#1b1930';
const PANEL = '#2b2846';
const BRASS = '#d8b860';
const LIGHT = '#efe6cc';

type Row = { kind: 'guest'; id: string } | { kind: 'fill' } | { kind: 'clear' };

export class NightScene extends Scene {
  opaque = true;
  private t = 0;
  private cur = 0;
  private top = 0;
  private roomCur = 0;
  private roomTop = 0;
  private focus: 'guests' | 'rooms' = 'guests';
  private lifted: string | null = null;
  private caption = '';
  private looks = new Map<string, Look>();
  private shake = 0;

  constructor(
    private mode: 'browse' | 'accuse' = 'browse',
    private onAccuse?: (charId: string) => void,
  ) {
    super();
  }

  enter(g: Game): void {
    for (const m of Object.values(g.world.maps)) for (const n of m.npcs) if (n.charId) this.looks.set(n.charId, n.look);
    this.caption = this.mode === 'accuse' ? 'Place everyone, then press ENTER on the one who was alone with the body. The yellow button picks someone up.' : 'Where was everyone when the shot rang out? The yellow button picks someone up, then a room.';
    g.state.seen.includes('night-open') || g.state.seen.push('night-open');
  }

  private rows(g: Game): Row[] {
    const r: Row[] = g.world.c.characters.map((c) => ({ kind: 'guest' as const, id: c.id }));
    r.push({ kind: 'fill' }, { kind: 'clear' });
    return r;
  }

  private rooms(g: Game): string[] {
    const w = g.world;
    const others = Object.values(w.maps).filter((m) => m.id !== w.hubId && m.id !== w.sceneMapId).map((m) => m.id);
    return [w.sceneMapId, ...others];
  }

  update(g: Game): void {
    const inp = g.input;
    this.t++;
    if (this.shake > 0) this.shake--;
    const rows = this.rows(g);
    const rooms = this.rooms(g);
    if (this.focus === 'guests') {
      if (inp.pressed.has('up')) this.cur = (this.cur + rows.length - 1) % rows.length;
      if (inp.pressed.has('down')) this.cur = (this.cur + 1) % rows.length;
      if (inp.pressed.has('up') || inp.pressed.has('down')) g.audio.sfx('select');
      if (this.cur < this.top) this.top = this.cur;
      if (this.cur >= this.top + this.visibleGuests()) this.top = this.cur - this.visibleGuests() + 1;
      if (inp.cancel()) {
        g.audio.sfx('back');
        g.pop();
        return;
      }
      if (inp.pressed.has('a')) this.activate(g, rows[this.cur] as Row);
      else if (inp.pressed.has('start')) this.accuse(g, rows[this.cur] as Row);
      return;
    }
    // choosing a room for the lifted guest
    if (inp.pressed.has('up')) this.roomCur = (this.roomCur + rooms.length - 1) % rooms.length;
    if (inp.pressed.has('down')) this.roomCur = (this.roomCur + 1) % rooms.length;
    if (inp.pressed.has('up') || inp.pressed.has('down')) g.audio.sfx('select');
    if (this.roomCur < this.roomTop) this.roomTop = this.roomCur;
    if (this.roomCur >= this.roomTop + this.visibleRooms()) this.roomTop = this.roomCur - this.visibleRooms() + 1;
    if (inp.cancel()) {
      g.audio.sfx('back');
      this.lifted = null;
      this.focus = 'guests';
      this.caption = 'Put them down again. Pick someone else.';
      return;
    }
    if (inp.pressed.has('a') && this.lifted) {
      const id = this.lifted;
      const room = rooms[this.roomCur] as string;
      const { check, slip, reveal } = placeToken(g.world, g.state, id, room);
      const name = g.world.c.characters.find((c) => c.id === id)?.name ?? 'They';
      const mine = check.issues.find((i) => i.ids.includes(id));
      if (mine) {
        g.audio.sfx(slip ? 'snap' : 'hold');
        this.shake = 14;
        this.caption = mine.text;
      } else {
        g.audio.sfx('link');
        this.caption = check.complete ? 'The table holds together. Who was alone with the body? ENTER names them.' : `${name.split(' ')[0]} goes to ${roomWord(g.world, room)}.`;
      }
      this.lifted = null;
      this.focus = 'guests';
      g.save();
      // the first time a placement proves a witness right by identity, not just headcount: a one-time cinematic beat
      if (reveal && !g.state.seen.includes('second-truth')) {
        g.state.seen.push('second-truth');
        g.save();
        g.push(new SecondTruthScene(reveal.room, reveal.trueIds, reveal.wrongIds, reveal.witness, () => {}));
      }
    }
  }

  private visibleGuests(): number {
    return 5;
  }
  private visibleRooms(): number {
    return 5;
  }

  private activate(g: Game, row: Row): void {
    const w = g.world;
    if (row.kind === 'fill') {
      const n = placeAsSworn(w, g.state);
      g.audio.sfx(n ? 'link' : 'back');
      this.caption = n ? `${n} placed where they SWORE they were. Now see which of those stories the headcounts allow.` : 'Everyone you have met is already on the table.';
      g.save();
      return;
    }
    if (row.kind === 'clear') {
      g.state.night = {};
      g.audio.sfx('back');
      this.caption = 'The table is clear.';
      g.save();
      return;
    }
    this.lifted = row.id;
    this.focus = 'rooms';
    g.audio.sfx('select');
    const cur = g.state.night[row.id];
    const rooms = this.rooms(g);
    this.roomCur = Math.max(0, cur ? rooms.indexOf(cur) : 0);
    this.roomTop = Math.max(0, Math.min(this.roomCur, rooms.length - this.visibleRooms()));
    this.caption = `Where was ${(w.c.characters.find((c) => c.id === row.id)?.name ?? 'they').split(' ')[0]} when the shot rang out?`;
  }

  private accuse(g: Game, row: Row): void {
    if (row.kind !== 'guest') return;
    if (this.mode !== 'accuse') {
      this.caption = `Only ${g.world.inspectorName} can make an arrest. Take your table to them.`;
      g.audio.sfx('bump');
      return;
    }
    const res = canAccuse(g.world, g.state, row.id);
    if (!res.ok) {
      this.caption = res.why;
      g.audio.sfx('bump');
      this.shake = 10;
      return;
    }
    g.audio.sfx('select');
    g.pop();
    this.onAccuse?.(row.id);
  }

  // ---- drawing ----------------------------------------------------------------------------------

  draw(g: Game, ctx: CanvasRenderingContext2D): void {
    const w = g.world;
    const s = g.state;
    const chk = checkNight(w, s);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // faint ruled floorplan grid
    ctx.fillStyle = 'rgba(216,184,96,0.06)';
    for (let x = 0; x < VIEW_W; x += 16) ctx.fillRect(x, 0, 1, VIEW_H);
    for (let y = 0; y < VIEW_H; y += 16) ctx.fillRect(0, y, VIEW_W, 1);
    // header
    ctx.fillStyle = '#100e20';
    ctx.fillRect(0, 0, VIEW_W, 15);
    ctx.fillStyle = BRASS;
    ctx.fillRect(0, 15, VIEW_W, 1);
    text(ctx, 'THE NIGHT', 6, 4, BRASS, null);
    textRight(ctx, `THE SHOT ${clockAt(w.night, 0)}`, VIEW_W - 6, 4, LIGHT, null);

    const rows = this.rows(g);
    const rooms = this.rooms(g);
    const sh = this.shake > 0 ? (this.shake % 4 < 2 ? 2 : -2) : 0;

    // ---- guests
    const gx = 4;
    for (let r = 0; r < this.visibleGuests(); r++) {
      const i = this.top + r;
      const row = rows[i];
      if (!row) break;
      const y = 19 + r * 21;
      const on = i === this.cur && this.focus === 'guests';
      ctx.fillStyle = on ? '#4a4374' : PANEL;
      ctx.fillRect(gx, y, 118, 19);
      if (on) {
        ctx.strokeStyle = BRASS;
        ctx.strokeRect(gx + 0.5, y + 0.5, 117, 18);
      }
      if (row.kind === 'fill' || row.kind === 'clear') {
        text(ctx, row.kind === 'fill' ? 'AT THEIR WORD' : 'CLEAR TABLE', gx + 12, y + 6, on ? '#ffffff' : LIGHT, null);
        if (on) cursor(ctx, gx + 3, y + 6, BRASS);
        continue;
      }
      const ch = w.c.characters.find((c) => c.id === row.id);
      const look = this.looks.get(row.id);
      const met = s.met.includes(row.id);
      if (look) drawBust(ctx, gx + 3, y + 3, look);
      const lines = nameLines(ch?.name ?? '?', 11);
      lines.forEach((l, k) => text(ctx, l, gx + 22, y + 2 + k * 8 + (lines.length === 1 ? 4 : 0), this.lifted === row.id ? '#ffe27a' : LIGHT, null));
      const room = s.night[row.id];
      const bad = room ? chk.issues.some((x) => x.ids.includes(row.id)) : false;
      if (room) {
        ctx.fillStyle = bad ? '#e04848' : '#58c078';
        ctx.fillRect(gx + 110, y + 5, 5, 5);
      } else if (!met) text(ctx, '?', gx + 108, y + 6, '#8a84b0', null);
      if (on) cursor(ctx, gx - 1, y + 6, BRASS);
    }
    if (this.top > 0) text(ctx, '^', 56, 16, BRASS, null);
    if (this.top + this.visibleGuests() < rows.length) text(ctx, 'v', 56, 121, BRASS, null);

    // ---- rooms
    const rx = 126;
    for (let r = 0; r < this.visibleRooms(); r++) {
      const i = this.roomTop + r;
      const id = rooms[i];
      if (!id) break;
      const y = 19 + r * 21 + sh;
      const here = w.c.characters.filter((c) => s.night[c.id] === id);
      const issue = chk.issues.find((x) => x.room === id);
      const on = this.focus === 'rooms' && i === this.roomCur;
      const isScene = id === w.sceneMapId;
      ctx.fillStyle = on ? '#4a4374' : isScene ? '#35223a' : PANEL;
      ctx.fillRect(rx, y, 190, 19);
      ctx.strokeStyle = issue ? (this.t % 30 < 20 ? '#ff5a5a' : '#a03030') : on ? BRASS : isScene ? '#a07070' : '#3d3960';
      ctx.strokeRect(rx + 0.5, y + 0.5, 189, 18);
      const nm = wrapText(isScene ? `${w.maps[id]?.name ?? 'The scene'}` : (w.maps[id]?.name ?? 'Room'), 14).slice(0, 2);
      nm.forEach((l, k) => text(ctx, l, rx + 8, y + 2 + k * 8 + (nm.length === 1 ? 4 : 0), isScene ? '#ffb0b0' : LIGHT, null));
      if (on) cursor(ctx, rx - 1, y + 6, BRASS);
      // the headcount you hold for this room
      const hc = heldOcc(w, s).find((h) => h.o.room === id && h.o.dt === 0);
      const old = heldOcc(w, s).find((h) => h.o.room === id && h.o.dt !== 0);
      if (hc || old || isScene) {
        ctx.fillStyle = isScene ? '#a03030' : '#22406a';
        ctx.fillRect(rx + 122, y + 4, 22, 11);
        text(ctx, isScene ? '1' : hc ? (hc.o.max === 0 ? '0' : String(hc.o.min)) : `${old?.o.max === 0 ? '0' : ''}~`, rx + 130, y + 6, '#ffffff', null);
      }
      // tokens
      here.slice(0, 5).forEach((c, k) => {
        const look = this.looks.get(c.id);
        if (look) drawToken(ctx, rx + 148 + k * 8, y + 5, look, this.lifted === c.id);
      });
      if (here.length > 5) text(ctx, `+${here.length - 5}`, rx + 176, y + 6, LIGHT, null);
    }
    if (this.roomTop > 0) text(ctx, '^', 220, 16, BRASS, null);
    if (this.roomTop + this.visibleRooms() < rooms.length) text(ctx, 'v', 220, 121, BRASS, null);

    // a lifted guest hovers over the room list
    if (this.lifted && this.focus === 'rooms') {
      const look = this.looks.get(this.lifted);
      const y = 19 + (this.roomCur - this.roomTop) * 21;
      if (look) drawToken(ctx, rx + 176 + Math.round(Math.sin(this.t / 6)), y + 4, look, true);
    }

    // ---- caption
    box(ctx, 2, 126, VIEW_W - 4, 64, '#f2ead0');
    const guest = this.focus === 'guests' ? rows[this.cur] : null;
    const roomHi = this.focus === 'rooms' ? rooms[this.roomCur] : null;
    let head = '';
    if (guest?.kind === 'guest') {
      const cl = w.claims[guest.id];
      head = s.met.includes(guest.id) && cl ? `SAYS: ${roomWord(w, cl.room).toUpperCase()}` : 'NOT MET YET';
    } else if (roomHi) {
      const hc = heldOcc(w, s).filter((h) => h.o.room === roomHi);
      head = hc.length ? hc.map((h) => `${h.o.max === 0 ? 'NOBODY' : h.o.min === h.o.max ? h.o.min : `${h.o.min}-${h.o.max}`}${h.o.dt === 0 ? ' AT THE SHOT' : ` AT ${clockAt(w.night, h.o.dt)}`}`).join(', ') : roomHi === w.sceneMapId ? 'ONE PERSON WAS ALONE WITH THE BODY' : 'NO HEADCOUNT YET';
    }
    const issue = chk.issues[0];
    const body = this.caption || (issue ? issue.text : '');
    wrapText(head, 37).slice(0, 2).forEach((l, i) => text(ctx, l, 8, 131 + i * 9, '#7a2a2a', null));
    const hy = head.length > 37 ? 149 : 141;
    wrapText(body, 37).slice(0, 4).forEach((l, i) => text(ctx, l, 8, hy + i * 10, '#2a2a34', null));
  }
}
