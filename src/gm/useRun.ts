import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import type { Case } from '../../shared/models';
import * as R from '../../shared/run';

const key = (caseId: string) => `foulplay:run:${caseId}`;

function load(doc: Case): R.RunState {
  try {
    const raw = localStorage.getItem(key(doc.id));
    return R.reconcileRun(raw ? (JSON.parse(raw) as unknown) : null, doc);
  } catch {
    return R.initRun(doc.id);
  }
}

/** Current time, re-rendered every `ms` while `active`. */
export function useNow(active: boolean, ms = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [active, ms]);
  return now;
}

/** Soft chime for "time is up". Best effort: audio may be blocked. */
export function chime(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.28, 0.56].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 660 + i * 110;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.3);
    });
    window.setTimeout(() => void ctx.close(), 1500);
  } catch {
    /* ignore */
  }
}

/**
 * Persistent GM run state for a case.
 *
 * The state is saved in localStorage immediately (so a refresh is always safe,
 * even offline) and mirrored to the server per case, so a second device opening
 * the GM view picks up the live run. Timers are stored as absolute end times.
 * The newest `rev` (last local change) wins in either direction.
 */
export function useRun(doc: Case) {
  const [raw, setRaw] = useState<R.RunState>(() => load(doc));
  const lastId = useRef(doc.id);
  const pushPending = useRef(false);
  const rawRef = useRef(raw);
  rawRef.current = raw;

  useEffect(() => {
    if (lastId.current !== doc.id) {
      lastId.current = doc.id;
      setRaw(load(doc));
    }
  }, [doc]);
  const run = useMemo(() => R.reconcileRun(raw, doc), [raw, doc]);

  useEffect(() => {
    try {
      localStorage.setItem(key(doc.id), JSON.stringify(run));
    } catch {
      /* private mode etc.: the run still works for this session */
    }
  }, [run, doc.id]);

  // push local changes to the server (debounced); failures are silent, localStorage still has the state
  useEffect(() => {
    if (!pushPending.current) return;
    const t = window.setTimeout(() => {
      pushPending.current = false;
      void api.putRun(doc.id, rawRef.current).catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(t);
  }, [raw, doc.id]);

  // pull: once on mount, then every few seconds, adopting anything newer than what we have
  useEffect(() => {
    let stopped = false;
    const pull = () => {
      if (pushPending.current) return;
      api
        .getRun(doc.id)
        .then(({ run: remote }) => {
          if (stopped || !remote || pushPending.current) return;
          const healed = R.reconcileRun(remote, doc);
          if (healed.rev > rawRef.current.rev) setRaw(healed);
        })
        .catch(() => undefined);
    };
    pull();
    const t = window.setInterval(pull, 4000);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, [doc]);

  const apply = useCallback(
    (fn: (s: R.RunState) => R.RunState) => {
      pushPending.current = true;
      setRaw((prev) => {
        const next = fn(R.reconcileRun(prev, doc));
        return { ...next, rev: Math.max(Date.now(), prev.rev + 1) };
      });
    },
    [doc],
  );

  const actions = useMemo(
    () => ({
      start: () => apply(() => R.startRun(doc, Date.now())),
      revealNext: () => apply((s) => R.revealNext(s, doc)),
      revealClue: (id: string) => apply((s) => R.revealClue(s, id)),
      confirm: () => apply((s) => R.confirmAction(s, doc)),
      advance: () => apply((s) => R.advance(s, doc, Date.now())),
      back: () => apply((s) => R.goBack(s, doc, Date.now())),
      pause: () => apply((s) => R.pauseTimer(s, Date.now())),
      resume: () => apply((s) => R.resumeTimer(s, Date.now())),
      restartTimer: () => apply((s) => R.restartTimer(s, doc, Date.now())),
      reset: () => apply(() => R.initRun(doc.id)),
    }),
    [apply, doc],
  );

  return { run, actions };
}
