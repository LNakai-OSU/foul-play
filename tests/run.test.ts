import { describe, expect, it } from 'vitest';
import {
  advance,
  canAdvance,
  confirmAction,
  currentBeat,
  formatClock,
  goBack,
  initRun,
  missedClues,
  pauseTimer,
  pendingClues,
  reconcileRun,
  restartTimer,
  resumeTimer,
  revealClue,
  revealNext,
  startRun,
  timerIsRunning,
  timerRemainingMs,
} from '../shared/run';
import { blankCase } from '../shared/ops';
import { goodCase } from './helpers';

const T0 = 1_000_000;

describe('GM run state machine', () => {
  it('cannot start an empty timeline', () => {
    expect(startRun(blankCase(), T0).status).toBe('idle');
  });

  it('starts on beat 0 and can advance through every beat to finished', () => {
    const c = goodCase();
    let s = startRun(c, T0);
    expect(s.status).toBe('running');
    expect(s.index).toBe(0);
    let steps = 0;
    while (s.status === 'running') {
      if (currentBeat(s, c)!.trigger === 'player-action') s = confirmAction(s, c);
      s = advance(s, c, T0 + steps * 1000);
      if (++steps > 100) throw new Error('did not terminate');
    }
    expect(s.status).toBe('finished');
    expect(steps).toBe(c.beats.length);
    expect(s.finishedAt).not.toBeNull();
  });

  it('reveals clues one at a time in beat order, then reports none pending', () => {
    const c = goodCase();
    let s = startRun(c, T0);
    s = advance(s, c, T0); // 'The body is found' has a clue
    const beat = currentBeat(s, c)!;
    expect(beat.evidenceIds.length).toBeGreaterThan(0);
    const before = pendingClues(s, c).length;
    s = revealNext(s, c);
    expect(s.revealed).toEqual([beat.evidenceIds[0]]);
    expect(pendingClues(s, c).length).toBe(before - 1);
    while (pendingClues(s, c).length) s = revealNext(s, c);
    expect(revealNext(s, c)).toBe(s);
  });

  it('a player-action beat blocks advancing until the action is confirmed', () => {
    const c = goodCase();
    let s = startRun(c, T0);
    const idx = c.beats.findIndex((b) => b.trigger === 'player-action');
    while (s.index < idx) s = advance(s, c, T0);
    expect(canAdvance(s, c).ok).toBe(false);
    expect(advance(s, c, T0).index).toBe(idx);
    s = confirmAction(s, c);
    expect(canAdvance(s, c).ok).toBe(true);
    expect(advance(s, c, T0).index).toBe(idx + 1);
  });

  it('timer beats start a countdown that can pause, resume and restart', () => {
    const c = goodCase();
    let s = startRun(c, T0);
    const idx = c.beats.findIndex((b) => b.trigger === 'timer');
    while (s.index < idx) {
      if (currentBeat(s, c)!.trigger === 'player-action') s = confirmAction(s, c);
      s = advance(s, c, T0);
    }
    const ms = currentBeat(s, c)!.timerSeconds * 1000;
    expect(timerRemainingMs(s, T0)).toBe(ms);
    expect(timerRemainingMs(s, T0 + 60_000)).toBe(ms - 60_000);
    expect(timerRemainingMs(s, T0 + ms + 5000)).toBe(0);
    s = pauseTimer(s, T0 + 60_000);
    expect(timerIsRunning(s)).toBe(false);
    expect(timerRemainingMs(s, T0 + 600_000)).toBe(ms - 60_000);
    s = resumeTimer(s, T0 + 600_000);
    expect(timerIsRunning(s)).toBe(true);
    expect(timerRemainingMs(s, T0 + 610_000)).toBe(ms - 70_000);
    s = restartTimer(s, c, T0 + 700_000);
    expect(timerRemainingMs(s, T0 + 700_000)).toBe(ms);
  });

  it('manual beats have no timer', () => {
    const c = goodCase();
    const s = startRun(c, T0);
    expect(currentBeat(s, c)!.trigger).toBe('manual');
    expect(timerRemainingMs(s, T0)).toBeNull();
  });

  it('tracks clues skipped in earlier beats so they can still be revealed', () => {
    const c = goodCase();
    let s = startRun(c, T0);
    s = advance(s, c, T0);
    const skipped = currentBeat(s, c)!.evidenceIds[0]!;
    s = advance(s, c, T0);
    expect(missedClues(s, c)).toContain(skipped);
    s = revealClue(s, skipped);
    expect(missedClues(s, c)).not.toContain(skipped);
  });

  it('can step back, including out of the finished state', () => {
    const c = goodCase();
    let s = startRun(c, T0);
    s = advance(s, c, T0);
    expect(goBack(s, c, T0).index).toBe(0);
    expect(goBack(goBack(s, c, T0), c, T0).index).toBe(0);
    const done = { ...s, status: 'finished' as const, index: c.beats.length - 1 };
    expect(goBack(done, c, T0).status).toBe('running');
  });

  it('survives JSON round-trips (refresh) and repairs stale state', () => {
    const c = goodCase();
    let s = startRun(c, T0);
    s = advance(s, c, T0);
    s = revealNext(s, c);
    const restored = reconcileRun(JSON.parse(JSON.stringify(s)), c);
    expect(restored).toEqual(s);
    // a clue was deleted and beats shrank since the run began
    const edited = { ...c, evidence: c.evidence.filter((e) => e.id !== s.revealed[0]), beats: c.beats.slice(0, 1) };
    const fixed = reconcileRun(JSON.parse(JSON.stringify(s)), edited);
    expect(fixed.revealed).toEqual([]);
    expect(fixed.index).toBe(0);
  });

  it('rejects garbage and other cases\' state', () => {
    const c = goodCase();
    expect(reconcileRun(null, c)).toEqual(initRun(c.id));
    expect(reconcileRun('nope', c)).toEqual(initRun(c.id));
    expect(reconcileRun({ caseId: 'other', status: 'running', index: 3 }, c)).toEqual(initRun(c.id));
    expect(reconcileRun({ caseId: c.id, status: 'weird' }, c)).toEqual(initRun(c.id));
  });

  it('keeps its revision through a JSON round-trip and starts at zero', () => {
    const c = goodCase();
    expect(initRun(c.id).rev).toBe(0);
    const s = { ...startRun(c, T0), rev: 12345 };
    expect(reconcileRun(JSON.parse(JSON.stringify(s)), c).rev).toBe(12345);
  });

  it('formats countdown clocks', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(61_000)).toBe('1:01');
    expect(formatClock(600_000)).toBe('10:00');
    expect(formatClock(59_001)).toBe('1:00');
  });
});
