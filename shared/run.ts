/**
 * Game-master run state: a pure state machine. Time is always injected (`now`,
 * epoch ms) so the logic is deterministic and unit-testable, and the whole
 * state is plain JSON so it can be persisted across page refreshes.
 */
import { z } from 'zod';
import type { Beat, Case } from './models';

export interface TimerState {
  durationMs: number;
  /** Epoch ms at which the countdown hits zero while running; null while paused. */
  endsAt: number | null;
  /** Remaining ms while paused (authoritative only when endsAt is null). */
  remainingMs: number;
}

export interface RunState {
  caseId: string;
  status: 'idle' | 'running' | 'finished';
  /** Index of the current beat (-1 before the run starts). */
  index: number;
  /** Evidence ids that have been revealed to players, in reveal order. */
  revealed: string[];
  /** Beat ids whose player-action has been confirmed. */
  confirmed: string[];
  timer: TimerState | null;
  startedAt: number | null;
  finishedAt: number | null;
  /** Timestamps at which each beat was entered (beat id -> epoch ms). */
  entered: Record<string, number>;
  /** Epoch ms of the last local change; the newest revision wins when syncing with the server. */
  rev: number;
}

/** Structural validation for run state received by the server (bounded sizes). */
export const RunStateSchema = z.object({
  caseId: z.string().min(1).max(80),
  status: z.enum(['idle', 'running', 'finished']),
  index: z.number().int().min(-1).max(1000),
  revealed: z.array(z.string().max(80)).max(1000),
  confirmed: z.array(z.string().max(80)).max(1000),
  timer: z
    .object({ durationMs: z.number().min(0).max(1e9), endsAt: z.number().nullable(), remainingMs: z.number().min(0).max(1e9) })
    .nullable(),
  startedAt: z.number().nullable(),
  finishedAt: z.number().nullable(),
  entered: z.record(z.string().max(80), z.number()),
  rev: z.number(),
});

export function initRun(caseId: string): RunState {
  return {
    caseId,
    status: 'idle',
    index: -1,
    revealed: [],
    confirmed: [],
    timer: null,
    startedAt: null,
    finishedAt: null,
    entered: {},
    rev: 0,
  };
}

function timerFor(b: Beat, now: number): TimerState | null {
  if (b.trigger !== 'timer' || b.timerSeconds <= 0) return null;
  const durationMs = b.timerSeconds * 1000;
  return { durationMs, endsAt: now + durationMs, remainingMs: durationMs };
}

function enter(s: RunState, c: Case, index: number, now: number): RunState {
  const beat = c.beats[index];
  if (!beat) return s;
  return { ...s, index, timer: timerFor(beat, now), entered: { ...s.entered, [beat.id]: now } };
}

export function startRun(c: Case, now: number): RunState {
  if (c.beats.length === 0) return initRun(c.id);
  const s: RunState = { ...initRun(c.id), status: 'running', startedAt: now };
  return enter(s, c, 0, now);
}

export function currentBeat(s: RunState, c: Case): Beat | null {
  return s.status === 'running' ? (c.beats[s.index] ?? null) : null;
}

/** Existing clues of the current beat that have not been revealed yet. */
export function pendingClues(s: RunState, c: Case): string[] {
  const b = currentBeat(s, c);
  if (!b) return [];
  const known = new Set(c.evidence.map((e) => e.id));
  return b.evidenceIds.filter((id) => known.has(id) && !s.revealed.includes(id));
}

/** Clues from beats we have already left that were never revealed. */
export function missedClues(s: RunState, c: Case): string[] {
  const known = new Set(c.evidence.map((e) => e.id));
  const out: string[] = [];
  const upTo = s.status === 'finished' ? c.beats.length : s.index;
  for (let i = 0; i < upTo; i++) {
    for (const id of c.beats[i]?.evidenceIds ?? []) {
      if (known.has(id) && !s.revealed.includes(id) && !out.includes(id)) out.push(id);
    }
  }
  return out;
}

export function revealNext(s: RunState, c: Case): RunState {
  const next = pendingClues(s, c)[0];
  if (!next) return s;
  return { ...s, revealed: [...s.revealed, next] };
}

export function revealClue(s: RunState, id: string): RunState {
  return s.revealed.includes(id) ? s : { ...s, revealed: [...s.revealed, id] };
}

export function confirmAction(s: RunState, c: Case): RunState {
  const b = currentBeat(s, c);
  if (!b || s.confirmed.includes(b.id)) return s;
  return { ...s, confirmed: [...s.confirmed, b.id] };
}

export type AdvanceCheck = { ok: true } | { ok: false; reason: string };

export function canAdvance(s: RunState, c: Case): AdvanceCheck {
  const b = currentBeat(s, c);
  if (!b) return { ok: false, reason: 'The run is not in progress.' };
  if (b.trigger === 'player-action' && !s.confirmed.includes(b.id)) {
    return { ok: false, reason: 'Waiting for the players — confirm the action to continue.' };
  }
  return { ok: true };
}

export function advance(s: RunState, c: Case, now: number): RunState {
  if (!canAdvance(s, c).ok) return s;
  if (s.index >= c.beats.length - 1) {
    return { ...s, status: 'finished', timer: null, finishedAt: now };
  }
  return enter(s, c, s.index + 1, now);
}

export function goBack(s: RunState, c: Case, now: number): RunState {
  if (s.status === 'finished') return enter({ ...s, status: 'running', finishedAt: null }, c, c.beats.length - 1, now);
  if (s.status !== 'running' || s.index <= 0) return s;
  return enter(s, c, s.index - 1, now);
}

export function timerRemainingMs(s: RunState, now: number): number | null {
  const t = s.timer;
  if (!t) return null;
  if (t.endsAt === null) return Math.max(0, t.remainingMs);
  return Math.max(0, t.endsAt - now);
}

export function pauseTimer(s: RunState, now: number): RunState {
  const t = s.timer;
  if (!t || t.endsAt === null) return s;
  return { ...s, timer: { ...t, endsAt: null, remainingMs: Math.max(0, t.endsAt - now) } };
}

export function resumeTimer(s: RunState, now: number): RunState {
  const t = s.timer;
  if (!t || t.endsAt !== null) return s;
  return { ...s, timer: { ...t, endsAt: now + t.remainingMs } };
}

export function restartTimer(s: RunState, c: Case, now: number): RunState {
  const b = currentBeat(s, c);
  if (!b) return s;
  return { ...s, timer: timerFor(b, now) };
}

export function timerIsRunning(s: RunState): boolean {
  return s.timer !== null && s.timer.endsAt !== null;
}

/**
 * Make a state loaded from storage safe for the current version of the case
 * (beats/clues may have been edited or deleted since the run started).
 */
export function reconcileRun(raw: unknown, c: Case): RunState {
  const fresh = initRun(c.id);
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Partial<RunState>;
  if (r.caseId !== c.id || (r.status !== 'idle' && r.status !== 'running' && r.status !== 'finished')) return fresh;
  const evIds = new Set(c.evidence.map((e) => e.id));
  const beatIds = new Set(c.beats.map((b) => b.id));
  const index = typeof r.index === 'number' ? Math.min(Math.max(-1, Math.floor(r.index)), c.beats.length - 1) : -1;
  const status = r.status === 'running' && index < 0 ? 'idle' : r.status;
  const t = r.timer;
  const timer: TimerState | null =
    t && typeof t.durationMs === 'number' && typeof t.remainingMs === 'number' && (t.endsAt === null || typeof t.endsAt === 'number')
      ? { durationMs: t.durationMs, endsAt: t.endsAt, remainingMs: t.remainingMs }
      : null;
  return {
    caseId: c.id,
    status,
    index,
    revealed: Array.isArray(r.revealed) ? r.revealed.filter((id): id is string => typeof id === 'string' && evIds.has(id)) : [],
    confirmed: Array.isArray(r.confirmed) ? r.confirmed.filter((id): id is string => typeof id === 'string' && beatIds.has(id)) : [],
    timer: status === 'running' ? timer : null,
    startedAt: typeof r.startedAt === 'number' ? r.startedAt : null,
    finishedAt: typeof r.finishedAt === 'number' ? r.finishedAt : null,
    entered: r.entered && typeof r.entered === 'object' ? (r.entered as Record<string, number>) : {},
    rev: typeof r.rev === 'number' ? r.rev : 0,
  };
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
