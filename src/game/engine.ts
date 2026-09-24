/** Game loop, input, scene stack and saving. Scenes live in ./scenes; this file knows nothing about them. */
import { VIEW_H, VIEW_W } from './types';
import type { GameState, World } from './types';
import { sanitize } from './logic';
import { spawnPoint } from './world';
import { audio } from './audio';
import { setupText } from './ui';
import { Sim } from './sim';

export type Btn = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start';
export const DIR_BTNS: Btn[] = ['up', 'down', 'left', 'right'];

export class Input {
  held = new Set<Btn>();
  pressed = new Set<Btn>();
  typed: string[] = [];
  run = false;
  /** While true, printable keys are typed text rather than buttons (name entry). */
  textMode = false;

  press(b: Btn, repeat = false): void {
    if (repeat && !DIR_BTNS.includes(b)) return;
    if (!this.held.has(b) || repeat) this.pressed.add(b);
    this.held.add(b);
  }
  release(b: Btn): void {
    this.held.delete(b);
  }
  /** Confirm: A or Enter. */
  confirm(): boolean {
    return this.pressed.has('a') || this.pressed.has('start');
  }
  cancel(): boolean {
    return this.pressed.has('b');
  }
  endFrame(): void {
    this.pressed.clear();
    this.typed = [];
  }
}

export abstract class Scene {
  /** An opaque scene hides everything beneath it. */
  opaque = false;
  /**
   * True for a non-opaque scene whose own box can land in the same rows `OverworldScene`'s `TopBand`
   * manages (the room banner, flavour toast, near-miss banner -- see topband.ts). Round 9 closed every
   * collision INSIDE the overworld scene's own draw(), but a scene pushed on top of it (e.g. the pause
   * `MenuScene`) is drawn afterward, every frame, regardless: `OverworldScene.draw()` still runs
   * underneath it (see `Game.render()`), so its transient boxes would render in full and then be
   * partially painted over mid-word by whatever is on top. Rather than hide anything, or freeze
   * anything, `OverworldScene` simply checks this flag on `g.top` and skips *drawing* (not reserving
   * space for -- `band.floor` stays identical either way) its own transient boxes for that one frame.
   * Their countdown timers are already frozen while a scene sits on top of `OverworldScene` (its
   * `update()` only runs when it is the top scene, and it defines no `background()` hook), so nothing
   * is lost: the banner/toast/near-miss banner simply resume, unclipped, at the exact time they had
   * left showing, the instant the covering scene is popped. Set this on any scene whose own box can
   * occupy that same top-of-screen area.
   */
  coversTopBand = false;
  enter(_g: Game): void {}
  exit(_g: Game): void {}
  /** Called when the scene above this one is popped. */
  resume(_g: Game): void {}
  /** Called every frame on scenes that are NOT on top (a dialogue over a battle): timers for effects that must finish regardless. */
  background?(_g: Game): void;
  abstract update(g: Game): void;
  abstract draw(g: Game, ctx: CanvasRenderingContext2D): void;
}

const SAVE_KEY = (caseId: string) => `foulplay:game:${caseId}`;

export function loadSave(world: World): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY(world.c.id));
    if (!raw) return null;
    const s = JSON.parse(raw) as Omit<GameState, 'v'> & { v: number };
    if ((s.v !== 1 && s.v !== 2 && s.v !== 3) || s.caseId !== world.c.id) return null;
    // v1/v2 saves predate THE NIGHT table and the clock: their pinned strings are dropped, the progress is kept
    const fixed = sanitize(world, { ...s, v: 3 } as GameState);
    if (s.v < 3) {
      // the world was redrawn since this save: keep the progress, start from the entrance
      const sp = spawnPoint(world);
      Object.assign(fixed, { map: sp.map, x: sp.x, y: sp.y, dir: sp.dir });
    }
    return fixed;
  } catch {
    return null;
  }
}

export function clearSave(caseId: string): void {
  try {
    localStorage.removeItem(SAVE_KEY(caseId));
  } catch {
    /* ignore */
  }
}

export class Game {
  readonly ctx: CanvasRenderingContext2D;
  readonly input = new Input();
  readonly audio = audio;
  scenes: Scene[] = [];
  tick = 0;
  state: GameState;
  /** The living venue: suspects on their schedules. Rebuilt whenever the state is swapped. */
  sim: Sim;
  /** Set by the page: go back to the title screen with a fresh game. */
  restart: () => void = () => {};
  private raf = 0;
  private last = 0;
  private acc = 0;
  private running = false;

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly world: World,
    state: GameState,
    readonly quit: () => void,
  ) {
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    this.ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
    this.ctx.imageSmoothingEnabled = false;
    this.state = state;
    this.sim = new Sim(world, state.tmin);
    audio.setEnv(world.env);
  }

  get top(): Scene | undefined {
    return this.scenes[this.scenes.length - 1];
  }

  push(s: Scene): void {
    this.scenes.push(s);
    s.enter(this);
  }

  pop(): void {
    const s = this.scenes.pop();
    s?.exit(this);
    this.top?.resume(this);
  }

  /** Replace the entire stack with one scene. */
  reset(s: Scene): void {
    while (this.scenes.length) this.scenes.pop()?.exit(this);
    this.push(s);
  }

  setState(s: GameState): void {
    this.state = s;
    this.sim = new Sim(this.world, s.tmin);
  }

  save(): void {
    try {
      this.state.caseStamp = this.world.c.updatedAt;
      localStorage.setItem(SAVE_KEY(this.world.c.id), JSON.stringify(this.state));
    } catch {
      /* private mode or full: play on without saving */
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.acc += Math.min(100, now - this.last);
      this.last = now;
      let n = 0;
      while (this.acc >= 1000 / 60 && n++ < 6) {
        this.acc -= 1000 / 60;
        this.update();
      }
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    audio.stop();
  }

  /** Advance `n` frames without waiting (tests and the gallery). */
  step(n = 1): void {
    for (let i = 0; i < n; i++) this.update();
  }

  private update(): void {
    this.tick++;
    for (let i = 0; i < this.scenes.length - 1; i++) (this.scenes[i] as Scene).background?.(this);
    this.top?.update(this);
    this.input.endFrame();
  }

  render(): void {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    setupText(ctx);
    let from = 0;
    for (let i = this.scenes.length - 1; i >= 0; i--) {
      if ((this.scenes[i] as Scene).opaque) {
        from = i;
        break;
      }
    }
    if (!this.scenes.length) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    for (let i = from; i < this.scenes.length; i++) (this.scenes[i] as Scene).draw(this, ctx);
  }

  // -- keyboard ------------------------------------------------------------------------------

  private static readonly KEYS: Record<string, Btn> = {
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    KeyZ: 'a',
    Space: 'a',
    KeyE: 'a',
    KeyX: 'b',
    Backspace: 'b',
    Escape: 'b',
    Enter: 'start',
  };

  /** Wire keyboard events. Returns the cleanup function. */
  attachKeyboard(target: Window): () => void {
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (this.input.textMode && e.key.length === 1) {
        e.preventDefault();
        if (/[\w '.-]/.test(e.key)) this.input.typed.push(e.key);
        return;
      }
      if (e.code === 'KeyM' && !e.repeat) {
        audio.unlock();
        audio.setMuted(!audio.muted);
        return;
      }
      audio.unlock();
      if (e.key === 'Shift') this.input.run = true;
      const b = Game.KEYS[e.code];
      if (b) {
        e.preventDefault();
        this.input.press(b, e.repeat);
      } else if (e.key.length === 1 && /[\w '.-]/.test(e.key)) {
        this.input.typed.push(e.key);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') this.input.run = false;
      const b = Game.KEYS[e.code];
      if (b) this.input.release(b);
    };
    const blur = () => {
      this.input.held.clear();
      this.input.run = false;
    };
    target.addEventListener('keydown', down);
    target.addEventListener('keyup', up);
    target.addEventListener('blur', blur);
    return () => {
      target.removeEventListener('keydown', down);
      target.removeEventListener('keyup', up);
      target.removeEventListener('blur', blur);
    };
  }
}
