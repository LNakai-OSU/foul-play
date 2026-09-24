/**
 * Setting signature interactions: one small scene, eight distinct control schemes (see `Mech` in ../rituals.ts) shared across
 * thirteen settings so that no two neighbouring settings play identically even when they share a mechanic. Always optional
 * (X gives up, nothing is lost), keyboard-only, 15-40 seconds. Winning earns a headcount clue.
 */
import { Scene } from '../engine';
import type { Game } from '../engine';
import type { RitualDef } from '../rituals';
import { VIEW_H, VIEW_W } from '../types';
import { box, text, textCenter } from '../ui';
import { wrapText } from '../text';
import { hashSeed } from '../../../shared/generator/rng';

const rect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

const AREA = { x: 24, y: 40, w: 272, h: 100 };
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

interface ScanItem {
  x: number;
  y: number;
  real: boolean;
  got: boolean;
  tried: boolean;
}

/** Needed hits per mechanic: a hold or a lock is one deliberate act, a chain is three short ones, everything else is three. */
function needFor(mech: string): number {
  if (mech === 'scrub' || mech === 'reverse') return 1;
  if (mech === 'hold') return 2;
  return 3;
}

export class RitualScene extends Scene {
  opaque = true;
  private t = 0;
  private phase: 'intro' | 'play' | 'win' = 'intro';
  private hits = 0;
  private misses = 0;
  private flash = 0;
  private shake = 0;
  private note = '';
  private hintOn = false;
  private need: number;
  // rhythm / chain
  private period = 84;
  private chainPeriods: number[] = [60, 90, 72];
  private chainWidths: number[] = [0.05, 0.1, 0.065];
  private chainStep = 0;
  // scrub / reverse / hold: a shared 0..1 value and target
  private value = 0.5;
  private target: number;
  private baseTarget = 0.5;
  private driftPhase = 0;
  private held = 0;
  private lockT = 0;
  // hold
  private holding = false;
  private holdStart = 0;
  private holdVal = 0;
  // reveal / track
  private cx = AREA.x + AREA.w / 2;
  private cy = AREA.y + AREA.h / 2;
  private vx = 0;
  private vy = 0;
  private marks: { x: number; y: number; got: boolean }[] = [];
  // scan
  private scanIdx = 0;
  private scanItems: ScanItem[] = [];

  constructor(
    private def: RitualDef,
    seedKey: string,
    private done: (won: boolean) => void,
  ) {
    super();
    this.need = needFor(def.mech);
    const h = hashSeed(seedKey);
    this.target = 0.18 + ((h % 1000) / 1000) * 0.64;
    this.baseTarget = this.target;
    this.driftPhase = h % 628;
    if (def.skin === 'film') this.target = Math.round(this.target * 12) / 12;
    if (def.skin === 'window') this.target = Math.round(this.target * 13) / 13;
    this.value = this.target > 0.5 ? 0.15 : 0.85;
    for (let i = 0; i < 3; i++) {
      const k = hashSeed(`${seedKey}|${i}`);
      this.marks.push({ x: AREA.x + 24 + (k % (AREA.w - 48)), y: AREA.y + 16 + ((k >> 9) % (AREA.h - 32)), got: false });
    }
    this.period = 78 + (h % 20);
    // chain: three windows of deliberately different lengths, so the pattern itself changes hit to hit
    const base = [46, 96, 66];
    for (let i = 0; i < 3; i++) {
      this.chainPeriods[i] = (base[i] as number) + (hashSeed(`${seedKey}|cp|${i}`) % 14);
      this.chainWidths[i] = [0.05, 0.11, 0.075][i] as number;
    }
    // scan: five discrete candidates, three real and two decoys, fixed positions the player must navigate between
    if (def.mech === 'scan') {
      const pos = [0, 1, 2, 3, 4].map((i) => ({
        x: AREA.x + 30 + (hashSeed(`${seedKey}|sx|${i}`) % (AREA.w - 60)),
        y: AREA.y + 18 + (hashSeed(`${seedKey}|sy|${i}`) % (AREA.h - 36)),
      }));
      const pool = [0, 1, 2, 3, 4];
      const realIdx = new Set<number>();
      for (let i = 0; i < 3; i++) {
        const k = hashSeed(`${seedKey}|real|${i}`) % pool.length;
        realIdx.add(pool[k] as number);
        pool.splice(k, 1);
      }
      this.scanItems = pos.map((p, i) => ({ ...p, real: realIdx.has(i), got: false, tried: false }));
    }
  }

  /** The current cycle length: rhythm uses one fixed period, chain switches period per step. */
  private curPeriod(): number {
    return this.def.mech === 'chain' ? (this.chainPeriods[this.chainStep] as number) : this.period;
  }
  private curWidth(): number {
    const base = this.def.mech === 'chain' ? (this.chainWidths[this.chainStep] as number) : 0.07;
    return base + Math.min(0.14, this.misses * 0.03);
  }
  /** rhythm/chain: 0..1 through the current loop, and whether the window is open (widens after misses so nobody is stuck) */
  private phaseNow(): number {
    return (this.t % this.curPeriod()) / this.curPeriod();
  }
  private windowOpen(): boolean {
    return Math.abs(this.phaseNow() - 0.5) < this.curWidth();
  }
  private strength(): number {
    return Math.max(0, 1 - Math.abs(this.value - this.target) / 0.22);
  }

  private win(g: Game): void {
    this.phase = 'win';
    this.t = 0;
    g.audio.sfx('item');
    this.note = this.def.win;
  }

  update(g: Game): void {
    const inp = g.input;
    this.t++;
    if (this.flash > 0) this.flash--;
    if (this.shake > 0) this.shake--;
    if (this.phase === 'intro') {
      if (this.t > 20 && inp.confirm()) {
        g.audio.sfx('select');
        this.phase = 'play';
        this.t = 0;
      } else if (inp.cancel()) this.leave(g, false);
      return;
    }
    if (this.phase === 'win') {
      if (this.t > 30 && inp.confirm()) this.leave(g, true);
      return;
    }
    if (inp.cancel()) {
      this.leave(g, false);
      return;
    }
    if (inp.pressed.has('start')) this.hintOn = !this.hintOn;
    const m = this.def.mech;
    if (m === 'rhythm' || m === 'chain') {
      if (inp.confirm()) {
        if (this.windowOpen()) {
          this.hits++;
          this.flash = 10;
          g.audio.sfx('link');
          this.t += Math.floor(this.curPeriod() * 0.3);
          if (m === 'chain') this.chainStep = Math.min(2, this.chainStep + 1);
          this.note = this.hits < this.need ? 'Got one.' : '';
          if (this.hits >= this.need) this.win(g);
        } else {
          this.misses++;
          this.shake = 10;
          g.audio.sfx('hold');
          this.note = this.misses >= 4 ? 'Wider window now. Take your time.' : 'Too early or too late.';
        }
      }
    } else if (m === 'scrub') {
      const l = inp.held.has('left');
      const r = inp.held.has('right');
      this.held = l || r ? Math.min(3, this.held + 0.12) : 0;
      const speed = (0.004 + this.held * 0.004) * (this.misses >= 4 ? 0.6 : 1);
      if (l) this.value = Math.max(0, this.value - speed);
      if (r) this.value = Math.min(1, this.value + speed);
      if (inp.confirm()) {
        if (this.strength() > (this.misses >= 4 ? 0.7 : 0.86)) {
          this.hits = 1;
          this.flash = 10;
          this.win(g);
        } else {
          this.misses++;
          this.shake = 10;
          g.audio.sfx('hold');
          this.note = this.strength() > 0.5 ? 'Close. A little more.' : 'Not yet. Keep turning.';
        }
      }
    } else if (m === 'reverse') {
      // the target itself drifts; you have to chase it and hold steady on it rather than close in on a fixed point once
      const driftAmp = 0.24;
      this.target = clamp01(this.baseTarget + Math.sin((this.t + this.driftPhase) / 210) * driftAmp);
      const l = inp.held.has('left');
      const r = inp.held.has('right');
      this.held = l || r ? Math.min(3, this.held + 0.12) : 0;
      const speed = 0.005 + this.held * 0.005;
      if (l) this.value = Math.max(0, this.value - speed);
      if (r) this.value = Math.min(1, this.value + speed);
      const onTarget = this.strength() > (this.misses >= 4 ? 0.62 : 0.78);
      if (onTarget && inp.held.has('a')) {
        this.lockT++;
        this.note = this.lockT > 6 ? 'Holding... steady...' : 'On it. Hold SPACE.';
        if (this.lockT > 20) {
          this.hits = 1;
          this.flash = 10;
          this.win(g);
        }
      } else {
        if (this.lockT > 3 && !onTarget) {
          this.misses++;
          this.shake = 6;
          g.audio.sfx('hold');
          this.note = 'Lost it. Chase it down again.';
          this.lockT = 0;
        } else if (!inp.held.has('a')) this.lockT = 0;
      }
    } else if (m === 'hold') {
      const per = this.period;
      if (inp.held.has('a')) {
        if (!this.holding) {
          this.holding = true;
          this.holdStart = this.t;
        }
        const el = (this.t - this.holdStart) % per;
        this.holdVal = el < per / 2 ? el / (per / 2) : 2 - el / (per / 2);
        this.note = 'Holding...';
      } else if (this.holding) {
        this.holding = false;
        const tol = 0.14 + Math.min(0.1, this.misses * 0.025);
        if (Math.abs(this.holdVal - this.target) < tol) {
          this.hits++;
          this.flash = 10;
          g.audio.sfx('link');
          this.note = this.hits < this.need ? 'There. Again.' : '';
          if (this.hits >= this.need) this.win(g);
        } else {
          this.misses++;
          this.shake = 10;
          g.audio.sfx('hold');
          this.note = 'Not level. Try again.';
        }
        this.holdVal = 0;
      } else this.note = '';
    } else if (m === 'scan') {
      const n = this.scanItems.length;
      if (inp.pressed.has('left')) {
        this.scanIdx = (this.scanIdx + n - 1) % n;
        g.audio.sfx('select');
      }
      if (inp.pressed.has('right')) {
        this.scanIdx = (this.scanIdx + 1) % n;
        g.audio.sfx('select');
      }
      if (inp.confirm()) {
        const it = this.scanItems[this.scanIdx] as ScanItem;
        it.tried = true;
        if (it.real && !it.got) {
          it.got = true;
          this.hits++;
          this.flash = 10;
          g.audio.sfx('link');
          this.note = this.hits < this.need ? 'That one is real.' : '';
          if (this.hits >= this.need) this.win(g);
        } else if (it.real) {
          this.note = 'Already logged that one.';
        } else {
          this.misses++;
          this.shake = 8;
          g.audio.sfx('bump');
          this.note = 'Just a smudge. Not a print.';
        }
      }
    } else {
      // reveal / track: free lamp movement; reveal accepts marks in any order, track only the next one in line
      const ax = (inp.held.has('right') ? 1 : 0) - (inp.held.has('left') ? 1 : 0);
      const ay = (inp.held.has('down') ? 1 : 0) - (inp.held.has('up') ? 1 : 0);
      this.vx = this.vx * 0.8 + ax * 0.5;
      this.vy = this.vy * 0.8 + ay * 0.5;
      this.cx = Math.max(AREA.x + 4, Math.min(AREA.x + AREA.w - 4, this.cx + this.vx));
      this.cy = Math.max(AREA.y + 4, Math.min(AREA.y + AREA.h - 4, this.cy + this.vy));
      const reach = this.misses >= 4 ? 18 : 11;
      if (inp.confirm()) {
        if (m === 'track') {
          const next = this.marks[this.hits];
          if (next && !next.got && Math.hypot(next.x - this.cx, next.y - this.cy) < reach) {
            next.got = true;
            this.hits++;
            this.flash = 10;
            g.audio.sfx('link');
            this.note = this.hits < 3 ? 'That way.' : '';
            if (this.hits >= 3) this.win(g);
          } else {
            this.misses++;
            g.audio.sfx('bump');
            this.note = this.marks.some((k) => !k.got && Math.hypot(k.x - this.cx, k.y - this.cy) < reach) ? 'Follow the trail in order.' : 'Nothing there.';
          }
        } else {
          const mk = this.marks.find((k) => !k.got && Math.hypot(k.x - this.cx, k.y - this.cy) < reach);
          if (mk) {
            mk.got = true;
            this.hits++;
            this.flash = 10;
            g.audio.sfx('link');
            this.note = this.hits < 3 ? 'There!' : '';
            if (this.hits >= 3) this.win(g);
          } else {
            this.misses++;
            g.audio.sfx('bump');
            this.note = 'Nothing there.';
          }
        }
      }
    }
  }

  private leave(g: Game, won: boolean): void {
    g.pop();
    this.done(won);
  }

  // ---- drawing ----------------------------------------------------------------------------------

  draw(g: Game, ctx: CanvasRenderingContext2D): void {
    const d = this.def;
    ctx.fillStyle = '#0d0c18';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const sh = this.shake > 0 ? (this.shake % 4 < 2 ? 2 : -2) : 0;
    ctx.save();
    ctx.translate(sh, 0);
    // frame
    rect(ctx, AREA.x - 4, AREA.y - 4, AREA.w + 8, AREA.h + 8, '#2a2438');
    rect(ctx, AREA.x - 2, AREA.y - 2, AREA.w + 4, AREA.h + 4, '#1a1626');
    ctx.save();
    ctx.beginPath();
    ctx.rect(AREA.x, AREA.y, AREA.w, AREA.h);
    ctx.clip();
    this.drawSkin(ctx, g.tick);
    ctx.restore();
    ctx.restore();
    // title and goal
    rect(ctx, 0, 0, VIEW_W, 20, '#181428');
    text(ctx, d.title, 8, 6, d.color, null);
    if (this.phase === 'intro') {
      box(ctx, 8, 146, VIEW_W - 16, 42);
      wrapText(d.intro, 36).slice(0, 3).forEach((l, i) => text(ctx, l, 16, 152 + i * 10));
      if (this.t > 20 && Math.floor(g.tick / 20) % 2 === 0) text(ctx, 'SPACE: BEGIN   X: SKIP', 148, 178, '#7a2a2a', null);
      return;
    }
    if (this.phase === 'win') {
      box(ctx, 8, 146, VIEW_W - 16, 42, '#f4ffe8');
      wrapText(this.note, 36).slice(0, 3).forEach((l, i) => text(ctx, l, 16, 152 + i * 10, '#2a4a2a'));
      if (this.t > 30 && Math.floor(g.tick / 20) % 2 === 0) text(ctx, 'SPACE: OK', 232, 178, '#2a6a2a', null);
      return;
    }
    // play: goal, progress pips, the last remark and the hint
    wrapText(this.hintOn ? this.hintText() : d.goal, 36).slice(0, 2).forEach((l, i) => text(ctx, l, 8, 146 + i * 10, '#e8e0c8', null));
    if (this.note) text(ctx, this.note, 8, 168, d.color, null);
    text(ctx, 'ENTER: HINT  X: GIVE UP', 8, 180, '#6a648a', null);
    for (let i = 0; i < this.need; i++) rect(ctx, VIEW_W - 12 - (this.need - i) * 12, 6, 9, 9, i < this.hits ? d.color : '#3a3450');
  }

  private hintText(): string {
    switch (this.def.mech) {
      case 'rhythm':
        return 'Watch for the flash. Press SPACE while it is lit. Missing widens the window.';
      case 'chain':
        return 'Each of the three beats has its own length. Press SPACE right on each one.';
      case 'hold':
        return 'Hold SPACE down; the level rises then falls. Let go right at the mark.';
      case 'scrub':
        return 'The picture gets clearer as you close in. Lock it when it is crisp.';
      case 'reverse':
        return 'The target drifts. Chase it with LEFT / RIGHT, then hold SPACE on it.';
      case 'track':
        return 'Find the marks in order, first to last. The next one glows brightest.';
      case 'scan':
        return 'LEFT / RIGHT move between the spots. SPACE checks the one you are on.';
      default:
        return 'Sweep slowly. Marks glow when you are close. Stand on one and press SPACE.';
    }
  }

  private drawSkin(ctx: CanvasRenderingContext2D, tick: number): void {
    const d = this.def;
    const { x, y, w, h } = AREA;
    const ph = d.mech === 'hold' ? (this.holding ? this.holdVal : 0) : this.phaseNow();
    const open =
      this.phase === 'play' &&
      ((d.mech === 'rhythm' || d.mech === 'chain') && this.windowOpen()
        ? true
        : d.mech === 'hold'
          ? this.holding && Math.abs(this.holdVal - this.target) < 0.14 + Math.min(0.1, this.misses * 0.025)
          : false);
    const cxm = x + w / 2;
    const cym = y + h / 2;
    const glow = open ? 1 : 0;
    switch (d.skin) {
      case 'paddle':
      case 'porthole': {
        rect(ctx, x, y, w, h, d.skin === 'paddle' ? '#2a1c14' : '#0c1c2c');
        // water
        for (let i = 0; i < w; i += 4) rect(ctx, x + i, y + h - 18 + Math.round(Math.sin((i + tick * 1.5) / 9) * 3), 4, 18, d.skin === 'paddle' ? '#20405a' : '#183050');
        if (d.skin === 'paddle') {
          // the wheel, turning; the lamp flashes when a blade is at the top
          const a = ph * Math.PI * 2;
          ctx.strokeStyle = '#8a5a30';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x + 60, cym, 40, 0, Math.PI * 2);
          ctx.stroke();
          for (let k = 0; k < 8; k++) {
            const aa = a + (k * Math.PI) / 4;
            ctx.beginPath();
            ctx.moveTo(x + 60, cym);
            ctx.lineTo(x + 60 + Math.cos(aa) * 42, cym + Math.sin(aa) * 42);
            ctx.stroke();
          }
          ctx.lineWidth = 1;
        } else {
          // the liner's swell: a slow heave whose height marks the chain's current window
          for (let i = 0; i < 3; i++) {
            const on = this.phase === 'play' && d.mech === 'chain' && i === this.chainStep;
            rect(ctx, x + 8 + i * 10, y + h - 8 - (on ? 10 + Math.round(Math.sin(tick / 6) * 3) : 4), 6, on ? 14 : 4, on ? '#ffe090' : '#254a66');
          }
        }
        // the porthole, and what the flash shows
        ctx.fillStyle = '#c8a860';
        ctx.beginPath();
        ctx.arc(cxm + 46, cym, 46, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = glow ? '#ffe9a8' : '#08101a';
        ctx.beginPath();
        ctx.arc(cxm + 46, cym, 40, 0, Math.PI * 2);
        ctx.fill();
        if (glow) {
          for (let i = 0; i < 4; i++) {
            rect(ctx, cxm + 20 + i * 18, cym - 16, 12, 14, '#7a3a20');
            rect(ctx, cxm + 22 + i * 18, cym - 14, 8, 10, i % 2 ? '#ffd070' : '#fff0b0');
            rect(ctx, cxm + 23 + i * 18, cym + 2, 6, 10, '#301810');
          }
        } else text(ctx, this.phase === 'play' ? 'WAIT' : '', cxm + 26, cym - 4, '#3a5a7a', null);
        break;
      }
      case 'ropes': {
        rect(ctx, x, y, w, h, '#120e1a');
        for (let i = 0; i < 5; i++) {
          rect(ctx, x + 30 + i * 52, y, 2, h, '#8a7a5a');
          rect(ctx, x + 27 + i * 52, y + 6 + Math.round((Math.sin(ph * Math.PI * 2 + i) + 1) * 4), 8, 6, '#5a4a30');
        }
        // the batten: for the hold mechanic its height follows how long you have been hauling, not the clock
        const level = d.mech === 'hold' ? ph : (Math.sin(ph * Math.PI * 2 - Math.PI / 2) + 1) * 0.5;
        const by = y + 12 + level * (h - 36);
        rect(ctx, x + 8, by, w - 16, 8, glow ? '#ffd070' : '#7a6a4a');
        rect(ctx, x + 8, by + 8, w - 16, 2, '#2a2010');
        rect(ctx, x, cym - 1, w, 2, '#c04040');
        text(ctx, 'MARK', x + 4, cym - 12, '#c04040', null);
        if (d.mech === 'hold' && this.holding) text(ctx, `${Math.round(this.holdVal * 100)}%`, x + w - 34, y + 6, '#e8d8a0', null);
        if (glow) for (let i = 0; i < 5; i++) rect(ctx, x + 22 + i * 52, y + h - 26, 20, 18, '#ffe090');
        break;
      }
      case 'door':
      case 'hatch': {
        rect(ctx, x, y, w, h, d.skin === 'door' ? '#20121e' : '#282018');
        rect(ctx, cxm - 46, y + 8, 92, h - 8, d.skin === 'door' ? '#5a3020' : '#8a8a90');
        rect(ctx, cxm - 42, y + 12, 84, h - 16, d.skin === 'door' ? '#3a1c14' : '#6a6a72');
        rect(ctx, cxm - 44, y + h - 3, 88, 3, glow ? '#ffe8a0' : '#1a0c10');
        // the music / the clatter: bars that fall silent in the gap (or during a held lull)
        const quiet = d.mech === 'hold' ? this.holding && glow : glow;
        for (let i = 0; i < 24; i++) {
          const amp = quiet ? 1 + (i % 2) : 8 + Math.abs(Math.sin(tick / 4 + i)) * 26;
          rect(ctx, x + 6 + i * 4, y + h - amp - 4, 3, amp, quiet ? '#3a3450' : d.color);
          rect(ctx, x + w - 102 + i * 4, y + h - amp - 4, 3, amp, quiet ? '#3a3450' : d.color);
        }
        if (d.mech === 'chain' && this.phase === 'play') text(ctx, `REST ${this.chainStep + 1}/3`, cxm - 24, y + 14, '#ffe8a0', null);
        if (quiet) {
          text(ctx, d.skin === 'door' ? '...they said...' : '...two more...', cxm - 56, cym - 6, '#ffe8a0', null);
          for (let k = 0; k < 4; k++) rect(ctx, cxm - 30 + k * 16, cym + 8, 8, 12, '#ffd070');
        }
        break;
      }
      case 'radio': {
        rect(ctx, x, y, w, h, '#1a2028');
        rect(ctx, x + 20, y + 10, 232, 40, '#0a1418');
        const s = this.phase === 'play' ? this.strength() : 0.2;
        for (let i = 0; i < 180; i++) {
          const hh = hashSeed(`${tick >> 1}|${i}`);
          if ((hh % 100) / 100 > s) rect(ctx, x + 22 + (hh % 228), y + 12 + ((hh >> 8) % 36), 2, 1, '#8ab0c0');
        }
        if (s > 0.6) for (let i = 0; i < 4; i++) text(ctx, ['1145 PM  MESS 3', 'GALLEY  2', 'LAB 0', 'BUNK 2'][i] as string, x + 30, y + 14 + i * 9, `rgba(122,216,255,${(s - 0.5) * 2})`, null);
        // dial
        rect(ctx, x + 20, y + 66, 232, 8, '#0a0e14');
        for (let i = 0; i <= 20; i++) rect(ctx, x + 22 + i * 11.4, y + 62, 1, i % 5 ? 4 : 8, '#8a98a8');
        rect(ctx, x + 22 + this.value * 228, y + 58, 2, 24, '#ff5a5a');
        if (d.mech === 'reverse') {
          // the drifting signal itself, so there is something to chase
          rect(ctx, x + 22 + this.target * 228, y + 76, 2, 6, this.lockT > 6 ? '#8be86a' : '#ffe07a');
          if (this.lockT > 0) rect(ctx, x + 20, y + 84, (this.lockT / 20) * 232, 3, '#8be86a');
        }
        break;
      }
      case 'film': {
        rect(ctx, x, y, w, h, '#0e0c12');
        const fw = 64;
        for (let i = 0; i <= 12; i++) {
          const fx = cxm - fw / 2 + (i - this.value * 12) * (fw + 4);
          if (fx < x - fw || fx > x + w) continue;
          rect(ctx, fx, y + 16, fw, 64, '#22202a');
          rect(ctx, fx + 3, y + 19, fw - 6, 58, i === Math.round(this.target * 12) ? '#6a5a3a' : '#3a3644');
          for (let k = 0; k < 4; k++) rect(ctx, fx + 4 + k * 14, y + 22, 8, 6, '#0e0c12');
          if (i === Math.round(this.target * 12)) {
            for (let k = 0; k < 3; k++) rect(ctx, fx + 10 + k * 16, y + 40, 8, 18, '#ffe090');
            rect(ctx, fx + 8, y + 60, 48, 3, '#ffe090');
          }
        }
        rect(ctx, cxm - 34, y + 8, 68, 80, 'rgba(255,232,160,0.10)');
        ctx.strokeStyle = '#ffe090';
        ctx.strokeRect(cxm - 33.5, y + 12.5, 67, 71);
        break;
      }
      case 'window': {
        rect(ctx, x, y, w, h, '#101828');
        rect(ctx, x + 20, y + 8, w - 40, h - 16, '#86b8e8');
        for (let i = 0; i < 14; i++) {
          const wx = cxm + i * 130 - this.value * 1690;
          if (wx < x - 40 || wx > x + w + 40) continue;
          const kind = i === Math.round(this.target * 13) ? 'bridge' : ['tree', 'tower', 'house', 'tree'][i % 4];
          rect(ctx, wx - 20, y + h - 40, 60, 3, '#3a5a3a');
          if (kind === 'bridge') {
            rect(ctx, wx - 20, y + h - 46, 60, 5, '#5a5a6a');
            for (let k = 0; k < 4; k++) rect(ctx, wx - 16 + k * 14, y + h - 62, 3, 16, '#5a5a6a');
            rect(ctx, wx - 18, y + h - 62, 56, 3, '#5a5a6a');
          } else if (kind === 'tower') {
            rect(ctx, wx, y + h - 76, 8, 36, '#8a6a4a');
            rect(ctx, wx - 8, y + h - 84, 24, 10, '#7a5a3a');
          } else if (kind === 'house') {
            rect(ctx, wx - 4, y + h - 60, 20, 20, '#a86a50');
            rect(ctx, wx - 8, y + h - 66, 28, 6, '#5a3a30');
          } else {
            rect(ctx, wx + 2, y + h - 60, 4, 20, '#4a3020');
            rect(ctx, wx - 6, y + h - 74, 20, 16, '#2a6a3a');
          }
        }
        rect(ctx, cxm - 2, y + 8, 4, h - 16, 'rgba(255,208,112,0.45)');
        rect(ctx, x + 12, y, 12, h, '#3a2a20');
        rect(ctx, x + w - 24, y, 12, h, '#3a2a20');
        break;
      }
      default: {
        if (d.mech === 'scan') {
          // discrete candidates: a cursor jumps between fixed spots instead of a free-roaming lamp
          const bg = d.skin === 'uv' ? '#0a0614' : '#1a1420';
          rect(ctx, x, y, w, h, bg);
          if (d.skin === 'uv') for (let i = 0; i < 10; i++) rect(ctx, x + 8 + i * 27, y + 10, 20, h - 20, '#120a24');
          this.scanItems.forEach((it, i) => {
            const col = it.got ? '#58c078' : it.tried && !it.real ? '#7a3a3a' : '#d0a0ff';
            ctx.globalAlpha = it.tried && !it.real ? 0.4 : 1;
            ctx.beginPath();
            ctx.arc(it.x, it.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = col;
            ctx.fill();
            ctx.globalAlpha = 1;
            if (i === this.scanIdx && this.phase === 'play') {
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(it.x, it.y, 10, 0, Math.PI * 2);
              ctx.stroke();
              ctx.lineWidth = 1;
            }
            if (it.got) text(ctx, 'OK', it.x - 8, it.y - 18, '#58c078', null);
            else if (it.tried && !it.real) text(ctx, 'X', it.x - 3, it.y - 18, '#c04040', null);
          });
          break;
        }
        // reveal / track: uv / dust / snow
        const bg = d.skin === 'uv' ? '#0a0614' : d.skin === 'snow' ? '#dfe8f0' : '#3a2c1c';
        rect(ctx, x, y, w, h, bg);
        if (d.skin === 'uv') for (let i = 0; i < 10; i++) rect(ctx, x + 8 + i * 27, y + 10, 20, h - 20, '#120a24');
        if (d.skin === 'dust') {
          rect(ctx, x + 40, y + 20, w - 80, h - 40, '#7a5c38');
          rect(ctx, x + 44, y + 24, w - 88, h - 48, '#8a6a42');
        }
        this.marks.forEach((mk, i) => {
          const isTrack = d.mech === 'track';
          if (isTrack && i > this.hits) return; // the trail beyond the next print has not been found yet
          const dist = Math.hypot(mk.x - this.cx, mk.y - this.cy);
          const vis = mk.got ? 1 : Math.max(0, 1 - dist / 34);
          if (vis <= 0.05 && !(isTrack && i === this.hits)) return;
          const shown = Math.max(vis, isTrack && i === this.hits ? 0.55 : 0);
          ctx.globalAlpha = shown;
          if (d.skin === 'snow') {
            for (let k = 0; k < 3; k++) {
              rect(ctx, mk.x - 8 + k * 7, mk.y + (k % 2) * 4 - 3, 3, 6, '#6a7a8a');
              rect(ctx, mk.x - 8 + k * 7 + 1, mk.y + (k % 2) * 4 - 4, 1, 2, '#6a7a8a');
            }
          } else {
            const col = d.skin === 'uv' ? '#d0a0ff' : '#e8d8b0';
            for (let k = 0; k < 5; k++) rect(ctx, mk.x - 7 + k * 3, mk.y - 8 + (k === 0 || k === 4 ? 3 : k === 2 ? -2 : 0), 2, 8, col);
            rect(ctx, mk.x - 8, mk.y, 16, 9, col);
          }
          ctx.globalAlpha = 1;
          if (mk.got) rect(ctx, mk.x - 9, mk.y + 12, 18, 2, '#58c078');
          if (isTrack) text(ctx, `${i + 1}`, mk.x - 3, mk.y - 20, i === this.hits ? '#ffe090' : '#8a8a9a', null);
        });
        // the lamp / the lantern / the brush
        if (this.phase === 'play') {
          const r = 34;
          ctx.fillStyle = d.skin === 'uv' ? 'rgba(160,112,255,0.18)' : d.skin === 'snow' ? 'rgba(255,220,140,0.22)' : 'rgba(255,240,200,0.10)';
          ctx.beginPath();
          ctx.arc(this.cx, this.cy, r, 0, Math.PI * 2);
          ctx.fill();
          rect(ctx, this.cx - 4, this.cy - 1, 9, 3, d.skin === 'dust' ? '#c8a060' : d.color);
          rect(ctx, this.cx - 1, this.cy - 4, 3, 9, d.skin === 'dust' ? '#c8a060' : d.color);
        }
        break;
      }
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.03})`;
      ctx.fillRect(x, y, w, h);
    }
    void textCenter;
  }
}
