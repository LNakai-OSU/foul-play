/** Snapshots of the real game screens for the gallery: each is a live Game stepped to a moment and rendered once. */
import { Game } from './engine';
import { newState } from './logic';
import { VIEW_H, VIEW_W } from './types';
import type { World } from './types';
import { BattleScene } from './scenes/battle';
import { NightScene } from './scenes/night';
import { ClueCardScene } from './scenes/card';
import { EndingScene } from './scenes/ending';
import { NotebookScene } from './scenes/notebook';
import { OverworldScene } from './scenes/overworld';
import { ReconstructionScene } from './scenes/recon';
import { TitleScene } from './scenes/title';
import { RitualScene } from './scenes/ritual';
import { RITUALS } from './rituals';
import { TimeCardScene } from './scenes/misc';

type Any = Record<string, unknown>;

function shoot(host: HTMLElement, caption: string, w: World, setup: (g: Game) => void, frames = 30): void {
  const src = document.createElement('canvas');
  const g = new Game(src, w, newState(w, 'SAM'), () => {});
  g.state.briefed = true;
  for (const e of w.c.evidence.slice(0, 9)) g.state.found.push(e.id);
  for (const c of w.c.characters) g.state.met.push(c.id);
  g.state.chapter = Math.min(2, w.chapters.length - 1);
  try {
    setup(g);
    g.step(frames);
    g.render();
  } catch {
    /* a screen that cannot be staged is simply left out */
    return;
  }
  const out = document.createElement('canvas');
  out.width = VIEW_W;
  out.height = VIEW_H;
  (out.getContext('2d') as CanvasRenderingContext2D).drawImage(src, 0, 0);
  const fig = document.createElement('figure');
  fig.append(out);
  const cap = document.createElement('figcaption');
  cap.textContent = caption;
  fig.append(cap);
  host.append(fig);
}

export function renderScreens(host: HTMLElement, w: World): void {
  host.textContent = '';
  const hub = w.maps[w.hubId]!;
  const suspect = w.c.characters[0]!.id;
  const clue = w.c.evidence[0]!.id;
  shoot(host, 'Title: the case\'s own overworld under its evening light', w, (g) => g.push(new TitleScene(g)), 120);
  shoot(host, 'Overworld: walking the setting, with SPACE prompts', w, (g) => {
    g.state.map = hub.id;
    g.state.x = hub.entrance.x;
    g.state.y = hub.entrance.y - 1;
    g.push(new OverworldScene());
  }, 60);
  shoot(host, 'Found a clue: the item-get card with its own icon', w, (g) => {
    g.push(new OverworldScene());
    g.push(new ClueCardScene(clue, () => {}, 'found'));
  }, 50);
  shoot(host, 'Interrogation: the interview menu', w, (g) => {
    g.push(new BattleScene(g, suspect, 'interview', () => {}));
  }, 60);
  shoot(host, 'Cross-examination: one full statement at a time (LEFT / RIGHT), PRESS or PRESENT', w, (g) => {
    const b = new BattleScene(g, suspect, 'interview', () => {});
    g.push(b);
    (b as unknown as Any).phase = 'testimony';
    ((b as unknown as Any).cracked as Set<number>).add(1);
    (b as unknown as Any).stmtCur = 0;
  }, 40);
  shoot(host, 'OBJECTION! The right clue on the right statement', w, (g) => {
    const b = new BattleScene(g, suspect, 'interview', () => {});
    g.push(b);
    g.step(40);
    (b as unknown as { startFx: (g: Game, k: string) => void }).startFx(g, 'objection');
    (b as unknown as Any).phase = 'anim';
    (b as unknown as Any).target = 3;
  }, 3);
  shoot(host, 'Notebook: clues with their icons', w, (g) => g.push(new NotebookScene('clues')), 10);
  shoot(host, 'Notebook: suspect files', w, (g) => g.push(new NotebookScene('suspects')), 10);
  shoot(host, 'THE NIGHT: place everyone at the shot; the table objects only to what you hold', w, (g) => {
    g.state.found = w.c.evidence.map((e) => e.id);
    for (const c of w.c.characters) g.state.night[c.id] = w.claims[c.id]?.room ?? w.sceneMapId;
    g.push(new NightScene('browse'));
  }, 20);
  shoot(host, 'Time card: the story moves on', w, (g) => g.push(new TimeCardScene(w.chapters[1]?.time ?? '9:40 PM', w.chapters[1]?.title ?? 'The lights go out', () => {})), 60);
  shoot(host, 'Reconstruction: a sepia ghost replays the night in the setting itself', w, (g) => {
    g.state.found = w.c.evidence.map((e) => e.id);
    g.push(new ReconstructionScene(() => {}));
  }, 130);
  shoot(host, 'Ending card', w, (g) => {
    const e = new EndingScene('won');
    g.push(e);
    // skip the story pages and show the rank card itself
    g.scenes.length = 0;
    g.scenes.push(e);
    (e as unknown as Any).phase = 'card';
  }, 40);
  for (const [env, def] of Object.entries(RITUALS)) {
    shoot(host, `Signature interaction (${env}): ${def.title}`, w, (g) => {
      const r = new RitualScene(def, `gallery|${env}`, () => {});
      g.push(r);
      (r as unknown as Any).phase = 'play';
      (r as unknown as Any).t = 40;
    }, 6);
  }
}
