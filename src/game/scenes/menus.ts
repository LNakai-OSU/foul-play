/** The start menu (Enter in the overworld). */
import { Scene } from '../engine';
import type { Game } from '../engine';
import { VIEW_W } from '../types';
import { box, cursor, text } from '../ui';
import { ask, say } from './dialogue';
import { NotebookScene } from './notebook';
import { NightScene } from './night';
import { clockLabel, goalText, tickClock } from '../logic';

export class MenuScene extends Scene {
  // Own box sits at (VIEW_W-w-4, 4), the same top-of-screen rows OverworldScene's TopBand manages
  // (round 9's critic report): tell it to skip drawing its transient banner/toast/near-miss boxes
  // while this menu is up, rather than let them render underneath and get cropped mid-word.
  coversTopBand = true;
  private cur = 0;

  private items(g: Game): string[] {
    return ['GOAL', 'NOTEBOOK', 'THE NIGHT', 'WAIT 10 MIN', 'SAVE', g.audio.muted ? 'SOUND: OFF' : 'SOUND: ON', 'QUIT', 'CLOSE'];
  }

  update(g: Game): void {
    const inp = g.input;
    const items = this.items(g);
    if (inp.pressed.has('up')) this.cur = (this.cur + items.length - 1) % items.length;
    if (inp.pressed.has('down')) this.cur = (this.cur + 1) % items.length;
    if (inp.pressed.has('up') || inp.pressed.has('down')) g.audio.sfx('select');
    if (inp.cancel() || inp.pressed.has('start')) {
      g.audio.sfx('back');
      g.pop();
      return;
    }
    if (!inp.pressed.has('a')) return;
    g.audio.sfx('select');
    switch (this.cur) {
      case 0:
        say(g, [`It is ${clockLabel(g.world, g.state)}.`, goalText(g.world, g.state)]);
        break;
      case 1:
        g.push(new NotebookScene('clues'));
        break;
      case 2:
        g.push(new NightScene('browse'));
        break;
      case 3:
        tickClock(g.world, g.state, 10);
        g.pop();
        say(g, [`You watch and wait. It is ${clockLabel(g.world, g.state)}.`]);
        break;
      case 4:
        g.save();
        say(g, [`${g.state.player}'s progress was saved.`]);
        break;
      case 5:
        g.audio.setMuted(!g.audio.muted);
        break;
      case 6:
        ask(
          g,
          'Leave the case? Your progress will be saved.',
          ['YES', 'NO'],
          (i) => {
            if (i === 0) {
              g.save();
              g.quit();
            }
          },
          1,
        );
        break;
      default:
        g.pop();
    }
  }

  draw(g: Game, ctx: CanvasRenderingContext2D): void {
    const items = this.items(g);
    const w = 136;
    const x = VIEW_W - w - 4;
    box(ctx, x, 4, w, items.length * 14 + 14);
    items.forEach((it, i) => {
      text(ctx, it, x + 20, 12 + i * 14);
      if (i === this.cur) cursor(ctx, x + 9, 12 + i * 14);
    });
  }
}
