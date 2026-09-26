/**
 * "TWO STORIES, ONE ROOM": the first time the detective's own placement on THE NIGHT table proves that a witness who named
 * exactly who was really in a room was right, and one of the room's claimants was not really there. A one-time, bespoke
 * cinematic beat (never a toast) that dramatises the game's most inventive deduction idea -- a headcount that lies by
 * identity, not by count -- the moment a player first untangles one. Fires from `NightScene` via `placeToken`'s `reveal`.
 * Pure flourish: it never says who the killer is, only that the table just told the two stories apart.
 */
import { Scene } from '../engine';
import type { Game } from '../engine';
import { drawChar } from '../sprites';
import { SKINS } from '../art/skins';
import { mapLabel, roomWord } from '../logic';
import { VIEW_H, VIEW_W } from '../types';
import type { Look, World } from '../types';
import type { EnvId } from '../art/skins';
import type { Tone } from '../../../shared/models';
import { box, text, textButtonCenter, textCenter, textRight } from '../ui';
import { wrapText } from '../text';
import { hashSeed } from '../../../shared/generator/rng';

const TITLES: Record<Tone, string[]> = {
  comedic: ['TWO STORIES, ONE ROOM', 'THE HEADCOUNT FIBBED', 'SAME ROOM, DIFFERENT LIES'],
  serious: ['TWO STORIES, ONE ROOM', 'THE NAME THE COUNT CAUGHT', 'ONE OF THEM WAS NEVER THERE'],
  noir: ['THE ROOM ONLY REMEMBERED ONE NAME', "TWO STORIES DON'T FIT ONE ROOM", 'SOMEONE ELSE WAS LYING TO YOU TOO'],
};

const join = (names: string[]): string => (names.length <= 1 ? (names[0] ?? 'someone') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

function lookById(g: Game, id: string): Look | null {
  for (const m of Object.values(g.world.maps)) for (const n of m.npcs) if (n.charId === id) return n.look;
  return null;
}

export interface SecondTruthCopy {
  title: string;
  line1: string;
  line2: string;
}

/** Pure, so the wrap-length of every line this can ever produce is checkable over the whole generated matrix. */
export function secondTruthCopy(w: Pick<World, 'maps' | 'c'>, room: string, trueIds: string[], wrongIds: string[], witness: string): SecondTruthCopy {
  const tone = w.c.tone as Tone;
  const arr = TITLES[tone];
  const title = arr[hashSeed(`second-truth|${w.c.id}`) % arr.length] as string;
  const charName = (id: string) => (w.c.characters.find((ch) => ch.id === id)?.name ?? 'Someone').split(' ')[0] as string;
  const trueNames = join(trueIds.map(charName));
  const wrongNames = join(wrongIds.map(charName));
  const roomName = roomWord(w, room);
  const line1 = `${witness} counted heads in ${roomName} at the shot: just ${trueNames}, and nobody else.`;
  const line2 = `${wrongNames} swore the very same room. Only one of you was telling the truth.`;
  return { title, line1, line2 };
}

export class SecondTruthScene extends Scene {
  opaque = true;
  private t = 0;
  private shake = 0;
  private trueLooks: Look[] = [];
  private wrongLooks: Look[] = [];
  private env: EnvId = 'generic';
  private title = '';
  private line1 = '';
  private line2 = '';

  constructor(
    private room: string,
    private trueIds: string[],
    private wrongIds: string[],
    private witness: string,
    private then: () => void,
  ) {
    super();
  }

  enter(g: Game): void {
    const w = g.world;
    this.trueLooks = this.trueIds.map((id) => lookById(g, id)).filter((l): l is Look => !!l);
    this.wrongLooks = this.wrongIds.map((id) => lookById(g, id)).filter((l): l is Look => !!l);
    this.env = w.maps[this.room]?.env ?? w.env;
    const copy = secondTruthCopy(w, this.room, this.trueIds, this.wrongIds, this.witness);
    this.title = copy.title;
    this.line1 = copy.line1;
    this.line2 = copy.line2;
    g.audio.play('none');
    g.audio.sfx('reveal');
  }

  update(g: Game): void {
    this.t++;
    if (this.shake > 0) this.shake--;
    if (this.t === 44) {
      this.shake = 16;
      g.audio.sfx('break');
    }
    if (this.t > 96 && g.input.confirm()) {
      g.audio.sfx('select');
      g.pop();
      this.then();
    }
  }

  private drawPanel(ctx: CanvasRenderingContext2D, x0: number, w: number, warm: boolean, looks: Look[], label: string, ghost: number): void {
    const skin = SKINS[this.env];
    const wash = warm ? '#5a3a1c' : '#16283c';
    ctx.fillStyle = wash;
    ctx.fillRect(x0, 0, w, VIEW_H);
    // a suggestion of the room: a back wall band and a floor band, tinted from the setting's own palette
    ctx.fillStyle = warm ? skin.wall[1] : skin.wall[2];
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x0, 28, w, 62);
    ctx.globalAlpha = 1;
    ctx.fillStyle = warm ? skin.floor[1] : skin.floor[2];
    ctx.fillRect(x0, 90, w, 26);
    textCenter(ctx, label, x0 + w / 2, 19, warm ? '#ffe0a8' : '#bfe6ff', '#000');
    // figures, evenly spaced, standing on the floor band -- the ghost (if any) takes a slot of its own, in the same row,
    // so the layout always divides the panel evenly instead of pushing anyone toward an edge
    const slots = Math.max(1, looks.length + (ghost > 0 ? 1 : 0));
    const gap = w / (slots + 1);
    const slotX = (i: number) => x0 + gap * (i + 1);
    looks.forEach((look, i) => {
      const cx = slotX(i);
      // ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(Math.round(cx - 14), 92, 28, 4);
      drawChar(ctx, Math.round(cx - 24), 30, look, 'down', 0, 3);
    });
    if (ghost > 0) {
      // the claimant who was never really here: an empty outline where they would have stood
      const cx = slotX(looks.length);
      ctx.save();
      ctx.globalAlpha = 0.22 + 0.08 * Math.sin(this.t / 8);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(cx - 24) + 3, 31, 42, 60);
      ctx.restore();
      textCenter(ctx, '?', Math.round(cx), 48, 'rgba(255,255,255,0.5)', null);
    }
  }

  draw(g: Game, ctx: CanvasRenderingContext2D): void {
    const w = g.world;
    ctx.fillStyle = '#05060c';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const mid = VIEW_W / 2;
    const grow = Math.max(0, Math.min(VIEW_H, (this.t - 10) * 9));
    const sh = this.shake > 0 ? (this.shake % 4 < 2 ? 2 : -2) : 0;
    ctx.save();
    ctx.translate(sh, 0);
    // left: as sworn (warm, both claimants together) -- right: as counted at the shot (cold, only the true occupant(s))
    this.drawPanel(ctx, 0, mid, true, [...this.wrongLooks, ...this.trueLooks], 'AS SWORN', 0);
    this.drawPanel(ctx, mid, VIEW_W - mid, false, this.trueLooks, 'AS COUNTED', this.wrongLooks.length);
    // the crack: a jagged seam growing top to bottom, splitting the two stories apart
    ctx.fillStyle = '#eef6ff';
    for (let y = 0; y < grow; y += 2) {
      const jag = Math.round(Math.sin(y / 9 + this.t / 5) * 5 + Math.sin(y / 3) * 2);
      ctx.fillRect(Math.round(mid + jag) - 1, y, 2, 2);
    }
    ctx.restore();
    // grain: a cold, static-y flicker (distinct from the reconstruction's warm sepia dust)
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = i % 3 === 0 ? 'rgba(180,220,255,0.14)' : 'rgba(255,255,255,0.08)';
      ctx.fillRect((i * 131 + g.tick * 23) % VIEW_W, (i * 67 + g.tick * 13) % VIEW_H, 1, 1);
    }
    const vign = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 40, VIEW_W / 2, VIEW_H / 2, 190);
    vign.addColorStop(0, 'rgba(0,0,0,0)');
    vign.addColorStop(1, 'rgba(0,0,10,0.55)');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // letterbox + title card
    ctx.fillStyle = '#05060c';
    ctx.fillRect(0, 0, VIEW_W, 15);
    ctx.fillRect(0, VIEW_H - 15, VIEW_W, 15);
    text(ctx, mapLabel(w, this.room).toUpperCase(), 6, 4, '#8fd0ff', null);
    if (Math.floor(g.tick / 20) % 2 === 0) {
      textRight(ctx, 'MISMATCH', VIEW_W - 12, 4, '#ffe27a', null);
      ctx.fillStyle = '#ffe27a';
      ctx.fillRect(VIEW_W - 10, 5, 5, 5);
    }
    // caption -- sized for the worst case across the whole generated corpus (long room/witness names can wrap either
    // line to 3 rows: tests/game-deduction.test.ts's "produces copy that fits" test keeps this honest)
    if (this.t > 20) {
      const a = Math.min(1, (this.t - 20) / 14);
      ctx.save();
      ctx.globalAlpha = a;
      box(ctx, 4, 92, VIEW_W - 8, 80, '#0f1626', '#8fd0ff', '#1c2c44');
      textCenter(ctx, this.title, VIEW_W / 2, 98, '#ffffff', '#000');
      wrapText(this.line1, 37)
        .slice(0, 3)
        .forEach((l, i) => text(ctx, l, 10, 111 + i * 9, '#dfeeff', null));
      wrapText(this.line2, 37)
        .slice(0, 3)
        .forEach((l, i) => text(ctx, l, 10, 138 + i * 9, '#8fd0ff', null));
      ctx.restore();
    }
    if (this.t > 96 && Math.floor(g.tick / 20) % 2 === 0) textButtonCenter(ctx, 'PRESS SPACE', VIEW_W / 2, VIEW_H - 11, '#eef6ff', null);
  }
}
