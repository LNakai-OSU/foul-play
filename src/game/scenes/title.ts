/** Title screen, save slot choice, and name entry. */
import { Scene, clearSave, loadSave } from '../engine';
import type { Game } from '../engine';
import { newState } from '../logic';
import { drawChar } from '../sprites';
import { collectLights, drawAmbient, drawLighting, drawMapTiles } from '../render';
import { ENVS } from '../env';
import type { MapDef } from '../types';
import { VIEW_H, VIEW_W } from '../types';
import { box, cursor, text, textButtonCenter, textCenter, truncate } from '../ui';
import { DETECTIVE_LOOK } from '../world';
import { wrapText } from '../text';
import { ask, say } from './dialogue';
import { EndingScene } from './ending';
import { Transition } from './misc';
import { OverworldScene } from './overworld';

export class TitleScene extends Scene {
  opaque = true;
  private phase: 'press' | 'menu' = 'press';
  private cur = 0;

  constructor(_g: Game) {
    super();
  }

  enter(g: Game): void {
    g.audio.play('title');
    g.audio.ambience(ENVS[g.world.env].sound, false);
  }

  private items(g: Game): { label: string; act: () => void }[] {
    const save = loadSave(g.world);
    const out: { label: string; act: () => void }[] = [];
    if (save) {
      out.push({
        label: save.done ? 'VIEW ENDING' : 'CONTINUE',
        act: () => {
          g.setState(save);
          if (save.done) {
            g.push(new EndingScene(save.done));
            return;
          }
          this.begin(g);
        },
      });
    }
    out.push({
      label: 'NEW GAME',
      act: () => {
        const go = () => {
          clearSave(g.world.c.id);
          g.push(new NameScene());
        };
        if (save && !save.done) ask(g, 'Start over? Your saved progress on this case will be erased.', ['YES', 'NO'], (i) => i === 0 && go(), 1);
        else go();
      },
    });
    out.push({ label: 'BACK TO LIBRARY', act: () => g.quit() });
    return out;
  }

  private begin(g: Game): void {
    g.push(new Transition('out', 'fade', () => g.reset(new OverworldScene()), 18));
  }

  update(g: Game): void {
    const inp = g.input;
    if (this.phase === 'press') {
      if (inp.confirm() || inp.pressed.has('a')) {
        g.audio.sfx('select');
        this.phase = 'menu';
      }
      return;
    }
    const items = this.items(g);
    if (inp.pressed.has('up')) this.cur = (this.cur + items.length - 1) % items.length;
    if (inp.pressed.has('down')) this.cur = (this.cur + 1) % items.length;
    if (inp.pressed.has('up') || inp.pressed.has('down')) g.audio.sfx('select');
    if (inp.confirm()) {
      g.audio.sfx('select');
      (items[this.cur] as { act: () => void }).act();
    }
  }

  draw(g: Game, ctx: CanvasRenderingContext2D): void {
    const tone = g.world.c.tone;
    const map = g.world.maps[g.world.hubId] as MapDef;
    // the case's own overworld, slowly panning, under its evening light
    const span = Math.max(1, map.w * 16 - VIEW_W);
    const u = (g.tick * 0.18) % (span * 2);
    const cx = Math.round(u < span ? u : span * 2 - u);
    const cy = Math.max(0, Math.min(map.h * 16 - VIEW_H, Math.round(map.h * 8 - VIEW_H / 2 + Math.sin(g.tick / 400) * 20)));
    const view = { cx, cy, w: VIEW_W, h: VIEW_H };
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawMapTiles(ctx, map, view, g.tick);
    drawLighting(ctx, map, view, g.tick, Math.max(map.dark, 0.3) + 0.12, tone, collectLights(map, view, g.tick, null));
    let amb = map.ambient;
    if (tone === 'noir' && map.outdoor && (amb === 'none' || amb === 'fireflies' || amb === 'petals' || amb === 'dust')) amb = 'rain';
    drawAmbient(ctx, amb, view, g.tick, map.outdoor);
    // letterbox and a vignette
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, VIEW_W, 14);
    ctx.fillRect(0, VIEW_H - 14, VIEW_W, 14);
    ctx.fillStyle = 'rgba(8,8,20,0.3)';
    ctx.fillRect(0, 14, VIEW_W, VIEW_H - 28);
    // logo
    ctx.save();
    ctx.translate(VIEW_W / 2, 24);
    ctx.scale(3, 3);
    textCenter(ctx, 'FOUL PLAY', 0, 0, '#f0d878', '#4a2a12');
    ctx.restore();
    textCenter(ctx, 'DETECTIVE EDITION', VIEW_W / 2, 56, '#f8f0d8', '#241a12');
    wrapText(g.world.c.title || 'A Murder Mystery', 34).slice(0, 2).forEach((l, i) => textCenter(ctx, l, VIEW_W / 2, 74 + i * 11, '#d8d8ec', '#181828'));
    wrapText((g.world.c.setting.name || ENVS[g.world.env].label).toUpperCase(), 36).slice(0, 1).forEach((l) => textCenter(ctx, l, VIEW_W / 2, VIEW_H - 11, '#b8b8d0', null));
    if (this.phase === 'press') {
      if (Math.floor(g.tick / 30) % 2 === 0) textButtonCenter(ctx, 'PRESS SPACE', VIEW_W / 2, 122, '#ffffff', '#181828');
      return;
    }
    const items = this.items(g);
    const w = 150;
    box(ctx, (VIEW_W - w) / 2, 112, w, items.length * 14 + 14);
    items.forEach((it, i) => {
      text(ctx, truncate(it.label, 16), (VIEW_W - w) / 2 + 22, 121 + i * 14);
      if (i === this.cur) cursor(ctx, (VIEW_W - w) / 2 + 11, 121 + i * 14);
    });
  }
}

/** Type a name with the keyboard (or a prompt on touch devices). */
export class NameScene extends Scene {
  opaque = true;
  private name = '';

  exit(g: Game): void {
    g.input.textMode = false;
  }

  enter(g: Game): void {
    g.input.textMode = true;
    if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
      const v = window.prompt('What is your name, Detective?', 'SAM');
      this.name = (v ?? 'SAM').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 8).trim();
      this.confirm(g);
    }
  }

  private confirm(g: Game): void {
    const name = this.name.trim() || 'SAM';
    g.setState(newState(g.world, name));
    g.audio.sfx('item');
    g.pop();
    g.push(
      new Transition(
        'out',
        'fade',
        () => {
          g.reset(new OverworldScene());
          say(g, [`A rainy night. ${name} the detective steps into ${g.world.c.setting.name || 'town'}.`, `${g.world.inspectorName} is waiting nearby. Walk with the ARROW KEYS or WASD, talk and confirm with the yellow button, and open the menu with ENTER.`]);
        },
        18,
      ),
    );
  }

  update(g: Game): void {
    const inp = g.input;
    for (const ch of inp.typed) if (this.name.length < 8 && /[A-Za-z0-9 ]/.test(ch)) this.name += ch.toUpperCase();
    if (inp.pressed.has('b') && this.name.length) {
      this.name = this.name.slice(0, -1);
      g.audio.sfx('back');
    }
    if (inp.pressed.has('start') || inp.pressed.has('a')) this.confirm(g);
  }

  draw(g: Game, ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#20284a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    box(ctx, 40, 30, VIEW_W - 80, 96);
    textCenter(ctx, 'YOUR NAME, DETECTIVE?', VIEW_W / 2, 42);
    drawChar(ctx, VIEW_W / 2 - 40, 58, DETECTIVE_LOOK, 'down', 0, 3);
    const shown = this.name.padEnd(8, '_');
    for (let i = 0; i < 8; i++) text(ctx, shown[i] as string, VIEW_W / 2 - 32 + i * 10 - 4 + 4, 112, '#2a2a34');
    textCenter(ctx, 'TYPE, THEN ENTER (OR MENU)', VIEW_W / 2, 150, '#c8c8e0', null);
    void g;
  }
}
