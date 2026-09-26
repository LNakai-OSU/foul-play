/**
 * The interrogation: a cross-examination. Each suspect stands behind four statements: where they were at the shot, who was with
 * them, that they never went near the scene, and that they had no reason to do it. Read them (LEFT / RIGHT), PRESS one for more,
 * PRESENT a clue on it. Only a real contradiction lands an OBJECTION; a miss costs nerve and says why it is not one. The same
 * screen runs the killer's final showdown.
 */
import { Scene } from '../engine';
import type { Game } from '../engine';
import { askAlibi, askMotive, askNight, askRelations, charById, crossExamine, evidenceById, greeting, isCracked, meet, showdownBreak, tagOf, testimony, tickClock } from '../logic';
import type { Cleared, Line, Statement, StmtKind } from '../logic';
import { drawPortrait, drawPortraitBack } from '../art/portraits';
import { drawTile } from '../art/index';
import { ENVS, specFor } from '../env';
import { K, cell } from '../tiles';
import { drawLighting } from '../render';
import type { LightSource } from '../render';
import { VIEW_H, VIEW_W } from '../types';
import type { Look, MapDef } from '../types';
import { bar, box, cursor, ellipse, nameLines, text, textButtonRight, textCenter, textRight } from '../ui';
import { wrapText } from '../text';
import { normPlace } from '../../../shared/ops';
import { DETECTIVE_LOOK, MAX_COMPOSURE } from '../world';
import { announceCleared, announceClue } from './announce';
import { BOX, PickScene, drawChoice, say } from './dialogue';
import { NotebookScene } from './notebook';
import { Transition } from './misc';

export type BattleMode = 'interview' | 'showdown';
export type BattleResult = 'left' | 'won' | 'failed';

const TOPICS = [
  { label: 'ALIBI', key: 'alibi' },
  { label: 'THE NIGHT', key: 'night' },
  { label: 'MOTIVE', key: 'motive' },
  { label: "WHO'S WHO", key: 'rel' },
  { label: 'BACK', key: 'back' },
] as const;

const KIND_LABEL: Record<StmtKind, string> = { where: 'WHERE', with: 'WITH WHOM', why: 'WHY', scene: 'THE SCENE' };
const TEXT_COLS = 37;

type Fx = { kind: 'objection' | 'hold'; t: number } | null;
type Mood = 'calm' | 'rattled' | 'cracked';

/** Pure mood calculation, factored out of `BattleScene.mood()` so it can be unit-tested directly (a `BattleScene`
 * needs a real canvas/`Game` to construct, which a plain vitest `node` environment can't provide) -- per round 5's
 * own honest gap ("a small unit test directly asserting mood()'s transition... beyond the scripted Playwright check
 * the Creator ran once"). Behaviour is unchanged: composure floors the everyday mood; a `flustered` near-miss tell
 * floors a would-be-`calm` mood at `rattled` for one interview, but never *downgrades* an already-worse mood. */
export function moodFor(mode: BattleMode, shown: number, maxHp: number, crackedCount: number, flustered: boolean): Mood {
  if (mode === 'showdown') return crackedCount >= 2 ? 'cracked' : crackedCount === 1 ? 'rattled' : 'calm';
  const f = shown / maxHp;
  const base = f <= 0.25 ? 'cracked' : f <= 0.65 ? 'rattled' : 'calm';
  return flustered && base === 'calm' ? 'rattled' : base;
}

export class BattleScene extends Scene {
  opaque = true;
  phase: 'open' | 'menu' | 'ask' | 'testimony' | 'stmt' | 'busy' | 'anim' = 'open';
  private t = 0;
  private cur = 0;
  private askCur = 0;
  stmtCur = 0;
  private shown: number;
  private target: number;
  private shake = 0;
  private freeze = 0;
  private fx: Fx = null;
  private animT = 0;
  private afterAnim: (() => void) | null = null;
  private nerve: number;
  private readonly maxNerve: number;
  private hp: number;
  private readonly maxHp: number;
  private readonly look: Look;
  private readonly name: string;
  statements: Statement[] = [];
  private cracked = new Set<number>();
  /** True once something new was learned (so the caller can re-check the story). */
  learned = false;
  /** They slipped away from a near miss just before this: rattled for this one interview, even at full composure -- the
   * payoff a player's eye actually catches, per round 4's creative direction. Consumed once, in `enter()`. */
  private flustered = false;

  constructor(
    g: Game,
    private charId: string,
    private mode: BattleMode,
    private onEnd: (r: BattleResult, learned: boolean) => void,
  ) {
    super();
    const npc = Object.values(g.world.maps)
      .flatMap((m) => m.npcs)
      .find((n) => n.charId === charId);
    this.look = npc?.look as Look;
    this.name = charById(g.world, charId)?.name ?? 'Suspect';
    this.maxHp = mode === 'showdown' ? Math.max(1, g.world.showdownHp) : MAX_COMPOSURE;
    this.hp = mode === 'showdown' ? this.maxHp : (g.state.composure[charId] ?? MAX_COMPOSURE);
    this.shown = this.hp;
    this.target = this.hp;
    this.maxNerve = mode === 'showdown' ? 4 : 3;
    this.nerve = this.maxNerve;
    this.statements = testimony(g.world, charId);
    // statements already broken in earlier interviews stay broken
    if (mode === 'interview') this.statements.forEach((st, i) => isCracked(g.state, charId, st.kind) && this.cracked.add(i));
  }

  enter(g: Game): void {
    g.audio.play('battle');
    meet(g.state, this.charId);
    tickClock(g.world, g.state, this.mode === 'interview' ? 4 : 1);
    if (this.mode === 'interview') {
      const key = `flustered:${this.charId}`;
      const i = g.state.seen.indexOf(key);
      if (i >= 0) {
        g.state.seen.splice(i, 1);
        this.flustered = true;
      }
    }
  }

  private get options(): string[] {
    return this.mode === 'showdown' ? ['TESTIMONY', 'BOOK'] : ['TALK', 'TESTIMONY', 'BOOK', 'LEAVE'];
  }

  private mood(): Mood {
    return moodFor(this.mode, this.shown, this.maxHp, this.cracked.size, this.flustered);
  }

  private intro(g: Game): void {
    this.phase = 'busy';
    const tutorial = !(g.state.asked._ ??= []).includes('xexam') && this.mode === 'interview';
    const lines: Line[] =
      this.mode === 'showdown'
        ? [{ who: null, text: `${this.name} stands cornered. Break the alibi and the "I was never there". Only what really contradicts them will stick.` }, { who: null, text: `You have ${this.maxNerve} chances. Objects wander; where people were at the shot does not.` }]
        : [{ who: null, text: `${this.name} wants to talk!` }, greeting(g.world, g.state, this.charId)];
    if (tutorial) {
      (g.state.asked._ as string[]).push('xexam');
      lines.push({ who: null, text: 'Choose TESTIMONY. Read each statement (LEFT / RIGHT) and PRESS it for more. PRESENT a clue only if it truly contradicts what was said: a wrong guess costs nerve.' });
    }
    say(g, lines, () => {
      this.phase = 'menu';
    });
  }

  /** Effects keep running when a dialogue sits on top of the battle: the OBJECTION banner must clear on its own. */
  background(): void {
    if (this.fx) {
      this.fx.t++;
      if (this.fx.t > 46) this.fx = null;
    }
    if (this.shake > 0) this.shake--;
    if (this.freeze > 0) this.freeze--;
    if (this.shown > this.target) this.shown = Math.max(this.target, this.shown - 0.12);
    else if (this.shown < this.target) this.shown = Math.min(this.target, this.shown + 0.12);
    this.t++;
  }

  update(g: Game): void {
    const inp = g.input;
    this.t++;
    if (this.freeze > 0) {
      this.freeze--;
      return;
    }
    if (this.shake > 0) this.shake--;
    if (this.fx) {
      this.fx.t++;
      if (this.fx.t > 46) this.fx = null;
    }
    if (this.shown > this.target) this.shown = Math.max(this.target, this.shown - 0.12);
    else if (this.shown < this.target) this.shown = Math.min(this.target, this.shown + 0.12);

    if (this.phase === 'open') {
      if (this.t === 1) g.audio.sfx('battle');
      if (this.t > 34) this.intro(g);
      return;
    }
    if (this.phase === 'anim') {
      this.animT++;
      if (this.animT > 40 && Math.abs(this.shown - this.target) < 0.01) {
        this.phase = 'busy';
        const f = this.afterAnim;
        this.afterAnim = null;
        f?.();
      }
      return;
    }
    if (this.phase === 'ask') {
      if (inp.pressed.has('up')) this.askCur = (this.askCur + TOPICS.length - 1) % TOPICS.length;
      if (inp.pressed.has('down')) this.askCur = (this.askCur + 1) % TOPICS.length;
      if (inp.pressed.has('up') || inp.pressed.has('down')) g.audio.sfx('select');
      if (inp.cancel()) {
        g.audio.sfx('back');
        this.phase = 'menu';
      } else if (inp.confirm()) {
        g.audio.sfx('select');
        this.ask(g, (TOPICS[this.askCur] as (typeof TOPICS)[number]).key);
      }
      return;
    }
    if (this.phase === 'testimony') {
      const n = this.statements.length;
      const prev = inp.pressed.has('up') || inp.pressed.has('left');
      const next = inp.pressed.has('down') || inp.pressed.has('right');
      if (prev) this.stmtCur = (this.stmtCur + n - 1) % n;
      if (next) this.stmtCur = (this.stmtCur + 1) % n;
      if (prev || next) g.audio.sfx('select');
      if (inp.cancel()) {
        g.audio.sfx('back');
        this.phase = 'menu';
      } else if (inp.confirm()) {
        g.audio.sfx('select');
        this.phase = 'busy';
        g.push(new StmtMenu(this));
      }
      return;
    }
    if (this.phase !== 'menu') return;
    const n = this.options.length;
    if (n === 4) {
      if (inp.pressed.has('left') || inp.pressed.has('right')) this.cur ^= 1;
      if (inp.pressed.has('up') || inp.pressed.has('down')) this.cur ^= 2;
    } else if (inp.pressed.has('up') || inp.pressed.has('down')) this.cur = (this.cur + 1) % n;
    if (['up', 'down', 'left', 'right'].some((d) => inp.pressed.has(d as 'up'))) g.audio.sfx('select');
    if (inp.confirm()) {
      g.audio.sfx('select');
      this.act(g, this.options[this.cur] as string);
    }
  }

  /** Called by the statement submenu. */
  chooseStatementAction(g: Game, i: number): void {
    if (i === 0) this.press(g);
    else if (i === 1) this.openPresent(g);
    else this.phase = 'testimony';
  }

  private act(g: Game, label: string): void {
    if (label === 'TALK') {
      this.phase = 'ask';
      this.askCur = 0;
    } else if (label === 'TESTIMONY') {
      this.phase = 'testimony';
      this.stmtCur = 0;
    } else if (label === 'BOOK') g.push(new NotebookScene('clues'));
    else if (label === 'LEAVE') {
      this.phase = 'busy';
      say(g, [{ who: null, text: `${g.state.player} left the interview.` }], () => this.leave(g, 'left'));
    }
  }

  private toMenu(): void {
    this.phase = 'menu';
  }

  private toTestimony(): void {
    this.phase = 'testimony';
  }

  private ask(g: Game, key: (typeof TOPICS)[number]['key']): void {
    if (key === 'back') {
      this.phase = 'menu';
      return;
    }
    this.phase = 'busy';
    const w = g.world;
    const s = g.state;
    if (key === 'alibi') say(g, askAlibi(w, s, this.charId), () => this.toMenu());
    else if (key === 'motive') say(g, askMotive(w, s, this.charId), () => this.toMenu());
    else if (key === 'rel') say(g, askRelations(w, s, this.charId), () => this.toMenu());
    else {
      const r = askNight(w, s, this.charId);
      say(g, r.lines, () => this.chain(g, r.found, r.cleared));
    }
  }

  private chain(g: Game, found: string[], cleared: Cleared[]): void {
    const id = found[0];
    if (id) {
      this.learned = true;
      announceClue(g, id, false, () => announceCleared(g, cleared, () => this.toMenu()));
    } else announceCleared(g, cleared, () => this.toMenu());
  }

  /** Press the highlighted statement: they say more. It points to other people, never to the answer. */
  private press(g: Game): void {
    const i = this.stmtCur;
    const st = this.statements[i] as Statement;
    const lines: Line[] = [{ who: this.name, text: st.text }, ...st.press.map((t) => ({ who: this.name, text: t }))];
    if (this.cracked.has(i)) lines.push({ who: null, text: 'That statement is already in pieces.' });
    this.phase = 'busy';
    say(g, lines, () => this.toTestimony());
    g.state.asked[this.charId] = [...(g.state.asked[this.charId] ?? []).filter((x) => x !== `press${i}`), `press${i}`];
  }

  private openPresent(g: Game): void {
    const found = g.state.found;
    if (!found.length) {
      this.phase = 'busy';
      say(g, ['You have no clues to present yet. Explore first!'], () => this.toTestimony());
      return;
    }
    const st = this.statements[this.stmtCur] as Statement;
    const items = found.map((id) => {
      const e = evidenceById(g.world, id);
      const tag = tagOf(g.world, id);
      return { label: e?.title || 'Clue', sub: `${tag ? tag + ' ' : ''}${e?.description ?? ''}`, icon: g.world.icons[id] };
    });
    this.phase = 'busy';
    g.push(
      new PickScene(
        `PRESENT: ${KIND_LABEL[st.kind]}`,
        items,
        (i) => {
          const first = found[i] as string;
          // "I was never there" needs two marks tied together
          if (st.kind === 'scene' && found.length > 1) this.openSecond(g, first);
          else this.presentClues(g, [first]);
        },
        () => this.toTestimony(),
        { x: 6, y: 4, w: 224, rows: 6 },
      ),
    );
  }

  /** Combine: the same statement, a second clue tied to the first ("that mark AND this one"). */
  private openSecond(g: Game, first: string): void {
    const found = g.state.found.filter((id) => id !== first);
    const items = [{ label: '(THIS ONE ALONE)', sub: 'Present just this one.', icon: undefined }, ...found.map((id) => ({ label: evidenceById(g.world, id)?.title || 'Clue', sub: `${tagOf(g.world, id)} ${evidenceById(g.world, id)?.description ?? ''}`.trim(), icon: g.world.icons[id] }))];
    g.push(
      new PickScene(
        'AND TIE IT TO...',
        items,
        (i) => this.presentClues(g, i === 0 ? [first] : [first, found[i - 1] as string]),
        () => this.toTestimony(),
        { x: 6, y: 4, w: 224, rows: 6 },
      ),
    );
  }

  private titles(g: Game, ids: string[]): string {
    return ids.map((id) => `"${evidenceById(g.world, id)?.title ?? 'a clue'}"`).join(' and ');
  }

  private presentClues(g: Game, ids: string[]): void {
    const w = g.world;
    const i = this.stmtCur;
    const st = this.statements[i] as Statement;
    const intro: Line = { who: null, text: `${g.state.player} presents ${this.titles(g, ids)} on ${KIND_LABEL[st.kind]}!` };
    tickClock(w, g.state, 1);
    if (this.mode === 'showdown') return this.showdownClue(g, ids, intro);
    const cr = crossExamine(w, g.state, this.charId, i, ids);
    if (cr.kind === 'objection') {
      const res = cr.res;
      const lines: Line[] = [{ who: null, text: cr.why }, { who: this.name, text: res.react }];
      if (res.motiveRevealed) {
        const m = w.c.motives.find((x) => x.characterId === this.charId);
        if (m) lines.push({ who: null, text: `A motive came to light! ${m.description}` });
      }
      if (res.broke) {
        lines.push({ who: null, text: `${this.name}'s composure broke!` });
        if (res.secret) lines.push({ who: this.name, text: `All right, all right! ${res.secret}` });
      }
      say(g, [intro], () => {
        this.cracked.add(i);
        this.target = res.after;
        this.startFx(g, 'objection');
        this.phase = 'anim';
        this.animT = 0;
        this.afterAnim = () => {
          if (res.broke) g.audio.sfx('break');
          say(g, lines, () => this.toTestimony());
        };
      });
      return;
    }
    let after: Line[];
    if (cr.kind === 'hold') {
      this.nerve--;
      after = [{ who: this.name, text: 'Ha! That does not contradict what I said.' }, { who: null, text: cr.why }];
    } else if (cr.kind === 'herring') {
      after = [{ who: null, text: 'It looked like something.' }, { who: this.name, text: cr.res.react }];
    } else {
      after = [{ who: null, text: cr.why }];
    }
    say(g, [intro], () => {
      if (cr.kind === 'hold') this.startFx(g, 'hold');
      this.phase = 'anim';
      this.animT = cr.kind === 'hold' ? 20 : 34;
      this.afterAnim = () => {
        if (this.nerve <= 0) return this.outOfNerve(g, after);
        say(g, this.nerve === 1 && cr.kind === 'hold' ? [...after, { who: null, text: 'Careful. One more slip and they will stop talking.' }] : after, () => this.toTestimony());
      };
    });
  }

  private startFx(g: Game, kind: 'objection' | 'hold'): void {
    this.fx = { kind, t: 0 };
    if (kind === 'objection') {
      g.audio.sfx('objection');
      this.shake = 30;
      this.freeze = 7;
    } else {
      g.audio.sfx('hold');
      this.shake = 10;
    }
  }

  private outOfNerve(g: Game, first: Line[] = []): void {
    if (this.mode === 'showdown') {
      say(g, [...first, { who: null, text: `${this.name} recovers. You are out of chances, and it does not stick...` }], () => this.leave(g, 'failed'));
      return;
    }
    say(g, [...first, { who: this.name, text: 'That is enough. This interview is over, Detective.' }, { who: null, text: 'They will talk again once you have something better.' }], () => this.leave(g, 'left'));
  }

  private showdownClue(g: Game, ids: string[], intro: Line): void {
    const i = this.stmtCur;
    if (this.cracked.has(i)) {
      say(g, ['That one is already in pieces.'], () => this.toTestimony());
      return;
    }
    const r = showdownBreak(g.world, g.state, i, ids);
    const right = r.ok && r.dmg > 0;
    if (!right) {
      this.nerve--;
      g.state.misses += 1;
    }
    const lines: Line[] = right
      ? [{ who: null, text: r.why }, { who: this.name, text: r.kind === 'where' ? 'No... that is impossible. How could you know that?!' : 'Th-that means nothing! ...Does it?' }]
      : r.ok
        ? [{ who: null, text: 'It stings, but it is not what brings them down.' }, { who: this.name, text: 'A motive is not a crime, Detective.' }]
        : [{ who: this.name, text: 'That does not contradict what I said. Try again, Detective.' }, { who: null, text: r.why }];
    if (right) {
      this.cracked.add(i);
      this.hp = Math.max(0, this.hp - r.dmg);
    }
    const finish = () => {
      if (this.hp <= 0) {
        g.audio.sfx('break');
        say(g, [{ who: null, text: `${this.name}'s composure shatters!` }], () => this.leave(g, 'won'));
      } else if (this.nerve <= 0) this.outOfNerve(g);
      else say(g, [{ who: null, text: `${this.nerve} ${this.nerve === 1 ? 'chance' : 'chances'} left.` }], () => this.toTestimony());
    };
    say(g, [intro], () => {
      this.startFx(g, right ? 'objection' : 'hold');
      this.target = this.hp;
      this.phase = 'anim';
      this.animT = 0;
      this.afterAnim = () => say(g, lines, finish);
    });
  }

  private leave(g: Game, result: BattleResult): void {
    g.push(
      new Transition('out', 'fade', () => {
        g.pop();
        g.push(new Transition('in', 'fade', () => this.onEnd(result, this.learned), 14));
      }),
    );
  }

  // ---- drawing ----------------------------------------------------------------------------------

  /** The suspect's own room, lit by a single hard bulb: the interrogation happens where they stand. */
  private backdrop(g: Game, ctx: CanvasRenderingContext2D): void {
    const env = g.world.env;
    const mapId = g.world.charMap[this.charId];
    const theme = mapId ? g.world.maps[mapId]?.name : undefined;
    const spec = (theme ? specFor(env, normPlace(theme)) : null) ?? ENVS[env].fallback;
    const wall = spec.outdoor ? 0 : spec.wt;
    for (let ty = 0; ty < 12; ty++)
      for (let tx = 0; tx < 20; tx++) {
        const floor = ty >= 6;
        if (floor) drawTile(ctx, cell(spec.outdoor ? K.PATH : spec.floor, 0), tx * 16, ty * 16, g.tick, env, wall);
        else if (ty === 0) drawTile(ctx, cell(K.WALL, wall), tx * 16, ty * 16, g.tick, env, wall);
        else drawTile(ctx, (tx === 3 || tx === 16 || (tx === 9 && ty < 4)) && ty <= 3 && ty >= 1 && !spec.outdoor ? cell(K.WINDOW_W, wall) : cell(K.WALL_FACE, wall), tx * 16, ty * 16, g.tick, env, wall);
      }
  }

  draw(g: Game, ctx: CanvasRenderingContext2D): void {
    const w = g.world;
    ctx.save();
    const sh = this.shake > 0 ? (this.shake % 4 < 2 ? 3 : -3) * Math.min(1, this.shake / 12) : 0;
    ctx.translate(sh, this.shake > 0 && this.shake % 3 === 0 ? 1 : 0);
    this.backdrop(g, ctx);
    ctx.restore();
    // a hard bulb over the suspect, the rest of the room falls into shadow
    const lights: LightSource[] = [
      { x: 244, y: 50, r: 100, color: '#ffe6b0', flicker: 0.05, strength: 1 },
      { x: 60, y: 110, r: 50, color: '#ffe6b0', flicker: 0, strength: 0.6 },
    ];
    const fake = { env: w.env, dark: 0.5 } as unknown as MapDef;
    drawLighting(ctx, fake, { cx: 0, cy: 0, w: VIEW_W, h: VIEW_H }, g.tick, 0.66, w.c.tone, lights);
    const slide = Math.max(0, 1 - this.t / 30);
    const ease = slide * slide;
    ellipse(ctx, 246 + Math.round(ease * 160), 92, 46, 7, 'rgba(0,0,0,0.35)');
    ellipse(ctx, 42 - Math.round(ease * 160), 136, 40, 6, 'rgba(0,0,0,0.3)');
    const flash = this.fx && this.fx.kind === 'objection' && this.fx.t % 6 < 3 && this.fx.t < 24;
    const bob = Math.round(Math.sin(this.t / 22) * 1);
    const jx = this.fx?.kind === 'objection' && this.fx.t < 26 ? (this.fx.t % 4 < 2 ? 4 : -4) : 0;
    if (this.look) {
      drawPortrait(ctx, 214 + Math.round(ease * 160) + jx, 8 + bob, this.look, this.mood(), this.t, flash ? 1 : 0);
      if (this.shown / this.maxHp < 0.5 && this.t % 40 < 20) {
        ctx.fillStyle = '#8ad8ff';
        ctx.fillRect(292, 24 + (this.t % 20), 2, 3);
        ctx.fillRect(216, 30 + (this.t % 20), 2, 3);
      }
    }
    drawPortraitBack(ctx, 6 - Math.round(ease * 160), 44, DETECTIVE_LOOK, this.t);

    // opponent panel
    // the whole name, on as many lines as it takes (up to three)
    const nl = wrapText(this.name.replace(/["\u201c\u201d][^"\u201c\u201d]*["\u201c\u201d]/g, '').replace(/\s+/g, ' ').trim().toUpperCase(), 17).slice(0, 3);
    const by = 13 + nl.length * 9 + (nl.length === 1 ? 4 : 1);
    box(ctx, 8, 8, 160, by + 25 - 8);
    nl.forEach((l, k) => text(ctx, l, 18, 13 + k * 9 + (nl.length === 1 ? 4 : 0)));
    text(ctx, this.mode === 'showdown' ? 'NERVE' : 'COMP', 18, by, '#c02828', null);
    bar(ctx, 58, by + 1, 100, this.shown, this.maxHp);
    text(ctx, `${this.cracked.size}/${this.statements.length} BROKEN`, 18, by + 11, '#7a7a88', null);
    // player panel
    box(ctx, 168, 96, 148, 30);
    text(ctx, nameLines(g.state.player, 16)[0] as string, 178, 101);
    text(ctx, this.mode === 'showdown' ? 'CHANCES' : 'NERVE', 178, 113, '#5a4a9a', null);
    for (let i = 0; i < this.maxNerve; i++) heart(ctx, 246 + i * 12, 112, i < this.nerve);

    if (this.phase === 'menu' || this.phase === 'ask' || this.phase === 'anim') {
      box(ctx, BOX.x, BOX.y, BOX.w, BOX.h);
      const prompt = this.phase === 'anim' ? '...' : this.mode === 'showdown' ? 'Take their story apart!' : `What will ${nameLines(g.state.player, 10)[0]} do?`;
      wrapText(prompt, 18).slice(0, 2).forEach((l, k) => text(ctx, l, BOX.x + 12, BOX.y + 12 + k * 14));
      if (this.phase !== 'anim') {
        box(ctx, 168, BOX.y, 148, BOX.h, '#fff8e0');
        const opts = this.options;
        opts.forEach((o, i) => {
          const two = opts.length === 4;
          const x = two ? 180 + (i % 2) * 52 : 190;
          const y = BOX.y + 12 + (two ? Math.floor(i / 2) * 18 : i * 16);
          text(ctx, o, x, y, o === 'TESTIMONY' ? '#a02020' : undefined);
          if (i === this.cur && this.phase === 'menu') cursor(ctx, x - 10, y);
        });
      }
      if (this.phase === 'ask') {
        const asked = g.state.asked[this.charId] ?? [];
        drawChoice(ctx, TOPICS.map((tp) => (asked.includes(tp.key) ? tp.label + '*' : tp.label)), this.askCur, VIEW_W - 4, BOX.y - 2);
      }
    }
    if (this.phase === 'testimony') this.drawTestimony(g, ctx);
    // opening reveal
    if (this.phase === 'open') {
      ctx.fillStyle = '#000';
      const cover = Math.max(0, 1 - this.t / 24);
      const bars = 12;
      for (let i = 0; i < bars; i++) {
        const wd = VIEW_W * cover;
        if (i % 2 === 0) ctx.fillRect(0, (i * VIEW_H) / bars, wd, VIEW_H / bars);
        else ctx.fillRect(VIEW_W - wd, (i * VIEW_H) / bars, wd, VIEW_H / bars);
      }
    }
    this.drawFx(ctx);
  }

  /** One statement at a time, in full: LEFT / RIGHT turn the pages, the yellow button opens the options. */
  private drawTestimony(g: Game, ctx: CanvasRenderingContext2D): void {
    void g;
    const st = this.statements[this.stmtCur] as Statement;
    const broken = this.cracked.has(this.stmtCur);
    box(ctx, 4, 100, VIEW_W - 8, 90, '#f8f3e4');
    // page tabs
    this.statements.forEach((s2, i) => {
      const on = i === this.stmtCur;
      const x = 12 + i * 22;
      ctx.fillStyle = this.cracked.has(i) ? '#a02828' : on ? '#3a3a58' : '#b8b0c8';
      ctx.fillRect(x, 104, 19, 11);
      text(ctx, String(i + 1), x + 6, 106, '#ffffff', null);
      void s2;
    });
    text(ctx, KIND_LABEL[st.kind], 104, 106, broken ? '#a02828' : '#7a6aa8', null);
    if (broken) textRight(ctx, 'BROKEN', VIEW_W - 12, 106, '#c02828', null);
    else textButtonRight(ctx, 'SPACE:OPTIONS', VIEW_W - 12, 106, '#9a8a78', null);
    const lines = wrapText(st.text, TEXT_COLS);
    lines.forEach((l, k) => {
      const y = 121 + k * 10;
      text(ctx, l, 12, y, broken ? '#a09080' : '#2a2a34', null);
      if (broken) {
        ctx.fillStyle = '#c02828';
        ctx.fillRect(12, y + 4, 8 * l.length, 1);
      }
    });
  }

  private drawFx(ctx: CanvasRenderingContext2D): void {
    const fx = this.fx;
    if (!fx) return;
    if (fx.kind === 'objection') {
      if (fx.t < 4) {
        ctx.fillStyle = `rgba(255,255,255,${0.9 - fx.t * 0.2})`;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      const pop = Math.min(1, (fx.t + 1) / 5);
      const alpha = fx.t > 34 ? Math.max(0, 1 - (fx.t - 34) / 12) : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      // speed lines
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 18; i++) {
        const y = (i * 37 + fx.t * 13) % VIEW_H;
        ctx.fillRect(((i * 53) % 90) * (i % 2 ? 1 : 3), y, 60 + (i % 5) * 20, 1);
      }
      ctx.translate(VIEW_W / 2, 40);
      ctx.scale(3 * (0.6 + 0.4 * pop), 3 * (0.6 + 0.4 * pop));
      ctx.fillStyle = '#5a0a0a';
      ctx.fillRect(-42, -8, 84, 16);
      ctx.fillStyle = '#e02828';
      ctx.fillRect(-41, -7, 82, 14);
      textCenter(ctx, 'OBJECTION!', 0, -3, '#ffffff', '#5a0a0a');
      ctx.restore();
    } else {
      const alpha = fx.t > 22 ? Math.max(0, 1 - (fx.t - 22) / 14) : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(VIEW_W / 2, 40);
      ctx.scale(2.4, 2.4);
      ctx.fillStyle = '#0a2a5a';
      ctx.fillRect(-34, -8, 68, 16);
      ctx.fillStyle = '#3f79bd';
      ctx.fillRect(-33, -7, 66, 14);
      textCenter(ctx, 'HOLD IT!', 0, -3, '#ffffff', '#0a2a5a');
      ctx.restore();
    }
  }
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean): void {
  ctx.fillStyle = on ? '#d8283c' : '#8a8a98';
  ctx.fillRect(x + 1, y, 2, 1);
  ctx.fillRect(x + 4, y, 2, 1);
  ctx.fillRect(x, y + 1, 7, 2);
  ctx.fillRect(x + 1, y + 3, 5, 1);
  ctx.fillRect(x + 2, y + 4, 3, 1);
  ctx.fillRect(x + 3, y + 5, 1, 1);
  if (on) {
    ctx.fillStyle = '#ff8a90';
    ctx.fillRect(x + 1, y + 1, 1, 1);
  }
}

/** The PRESS / PRESENT / BACK box for the highlighted statement. */
class StmtMenu extends Scene {
  private cur = 0;
  constructor(private b: BattleScene) {
    super();
  }
  update(g: Game): void {
    const inp = g.input;
    if (inp.pressed.has('up')) this.cur = (this.cur + 2) % 3;
    if (inp.pressed.has('down')) this.cur = (this.cur + 1) % 3;
    if (inp.pressed.has('up') || inp.pressed.has('down')) g.audio.sfx('select');
    if (inp.cancel()) {
      g.audio.sfx('back');
      g.pop();
      this.b.chooseStatementAction(g, 2);
    } else if (inp.confirm()) {
      g.audio.sfx('select');
      g.pop();
      this.b.chooseStatementAction(g, this.cur);
    }
  }
  draw(g: Game, ctx: CanvasRenderingContext2D): void {
    drawChoice(ctx, ['PRESS', 'PRESENT', 'BACK'], this.cur, VIEW_W - 6, 98);
    void g;
  }
}
