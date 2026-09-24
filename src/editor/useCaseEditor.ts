import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, errorMessage } from '../api';
import { checkCase, type Issue } from '../../shared/checker';
import type { Case } from '../../shared/models';

export type SaveState = 'saved' | 'saving' | 'dirty' | 'error';

const HISTORY_LIMIT = 100;
const COALESCE_MS = 1200;
const SAVE_DEBOUNCE_MS = 500;

export interface CaseEditor {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  notFound: boolean;
  doc: Case | null;
  issues: Issue[];
  saveState: SaveState;
  canUndo: boolean;
  canRedo: boolean;
  /** Apply a change. Same `key` within ~1s coalesces into one undo step (typing). */
  update: (fn: (c: Case) => Case, key?: string) => void;
  undo: () => void;
  redo: () => void;
  retry: () => void;
  saveNow: () => Promise<void>;
}

/**
 * Loads a case and owns its editing session: undo/redo history, debounced
 * autosave with ordered writes, retry on failure, and flush-on-leave.
 */
export function useCaseEditor(caseId: string): CaseEditor {
  const [status, setStatus] = useState<CaseEditor['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [doc, setDoc] = useState<Case | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [hist, setHist] = useState({ undo: 0, redo: 0 });

  const docRef = useRef<Case | null>(null);
  const past = useRef<Case[]>([]);
  const future = useRef<Case[]>([]);
  const lastEdit = useRef({ key: '', at: 0 });
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const chain = useRef<Promise<void>>(Promise.resolve());

  const syncHist = () => setHist({ undo: past.current.length, redo: future.current.length });

  const flush = useCallback((): Promise<void> => {
    window.clearTimeout(timer.current);
    if (!dirty.current || !docRef.current) return chain.current;
    dirty.current = false;
    const snapshot = docRef.current;
    setSaveState('saving');
    chain.current = chain.current
      .then(() => api.save(snapshot))
      .then(() => {
        setSaveState(dirty.current ? 'dirty' : 'saved');
      })
      .catch((e: unknown) => {
        dirty.current = true;
        setSaveState('error');
        setError(errorMessage(e));
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => void flush(), 5000);
      });
    return chain.current;
  }, []);

  const scheduleSave = useCallback(() => {
    dirty.current = true;
    setSaveState('dirty');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
  }, [flush]);

  // load
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    setNotFound(false);
    setDoc(null);
    docRef.current = null;
    past.current = [];
    future.current = [];
    dirty.current = false;
    setSaveState('saved');
    syncHist();
    api
      .get(caseId)
      .then((c) => {
        if (cancelled) return;
        docRef.current = c;
        setDoc(c);
        setStatus('ready');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setStatus('error');
        setNotFound(e instanceof ApiError && e.status === 404);
        setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timer.current);
      if (dirty.current && docRef.current) {
        void api.save(docRef.current, true).catch(() => undefined);
        dirty.current = false;
      }
    };
  }, [caseId]);

  // flush when the tab is hidden or closed
  useEffect(() => {
    const onLeave = () => {
      if (dirty.current && docRef.current) {
        void api.save(docRef.current, true).catch(() => undefined);
        dirty.current = false;
      }
    };
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, []);

  const commit = useCallback(
    (next: Case, key?: string) => {
      const cur = docRef.current;
      if (!cur || next === cur) return;
      const now = Date.now();
      const coalesce = Boolean(key) && lastEdit.current.key === key && now - lastEdit.current.at < COALESCE_MS && past.current.length > 0;
      if (!coalesce) {
        past.current.push(cur);
        if (past.current.length > HISTORY_LIMIT) past.current.shift();
      }
      future.current = [];
      lastEdit.current = { key: key ?? '', at: now };
      docRef.current = next;
      setDoc(next);
      syncHist();
      scheduleSave();
    },
    [scheduleSave],
  );

  const update = useCallback((fn: (c: Case) => Case, key?: string) => {
    const cur = docRef.current;
    if (cur) commit(fn(cur), key);
  }, [commit]);

  const undo = useCallback(() => {
    const cur = docRef.current;
    const prev = past.current.pop();
    if (!cur || !prev) return;
    future.current.push(cur);
    lastEdit.current = { key: '', at: 0 };
    docRef.current = prev;
    setDoc(prev);
    syncHist();
    scheduleSave();
  }, [scheduleSave]);

  const redo = useCallback(() => {
    const cur = docRef.current;
    const nxt = future.current.pop();
    if (!cur || !nxt) return;
    past.current.push(cur);
    lastEdit.current = { key: '', at: 0 };
    docRef.current = nxt;
    setDoc(nxt);
    syncHist();
    scheduleSave();
  }, [scheduleSave]);

  const retry = useCallback(() => {
    dirty.current = true;
    void flush();
  }, [flush]);

  const issues = useMemo(() => (doc ? checkCase(doc) : []), [doc]);

  return { status, error, notFound, doc, issues, saveState, canUndo: hist.undo > 0, canRedo: hist.redo > 0, update, undo, redo, retry, saveNow: flush };
}
