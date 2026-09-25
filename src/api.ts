import { blankCase } from '../shared/ops';
import { generateCase, listSettings, type GenerateOptions } from '../shared/generator/generate';
import { parseCase, parseImport, summarize, type Case, type CaseSummary, type Tone } from '../shared/models';
import { RunStateSchema, type RunState } from '../shared/run';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
  }
}

/**
 * All persistence is on-device (localStorage): the app ships with no backend,
 * so a case library never needs a network connection or a running server.
 * The one thing this trades away versus the old server-backed store: a live
 * GM run can no longer be picked up from a second device (see `useRun`, which
 * already treats server sync as best-effort and falls back to this).
 */
const CASES_KEY = 'foulplay:cases';
const runKey = (id: string) => `foulplay:run:${id}`;

interface FileShape {
  version: 1;
  cases: Case[];
}

const newCaseId = () => `case_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;

function readCases(): Map<string, Case> {
  const map = new Map<string, Case>();
  try {
    const raw = localStorage.getItem(CASES_KEY);
    if (!raw) return map;
    const parsed: unknown = JSON.parse(raw);
    const list = Array.isArray((parsed as FileShape | null)?.cases) ? (parsed as FileShape).cases : [];
    for (const item of list) {
      const r = parseCase(item);
      if (r.ok) map.set(r.value.id, r.value);
    }
  } catch {
    /* corrupt or missing: start empty rather than crash */
  }
  return map;
}

function writeCases(map: Map<string, Case>): void {
  const body: FileShape = { version: 1, cases: [...map.values()] };
  localStorage.setItem(CASES_KEY, JSON.stringify(body));
}

export const api = {
  list: async (): Promise<CaseSummary[]> =>
    [...readCases().values()].map(summarize).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),

  get: async (id: string): Promise<Case> => {
    const c = readCases().get(id);
    if (!c) throw new ApiError(404, 'Case not found');
    return c;
  },

  create: async (body: { title?: string; tone?: Tone; generate?: boolean | GenerateOptions }): Promise<Case> => {
    const id = newCaseId();
    let c: Case;
    if (body.generate) {
      const opts = body.generate === true ? {} : body.generate;
      if (opts.playerMin && opts.playerMax && opts.playerMin > opts.playerMax) {
        throw new ApiError(400, 'playerMin must not exceed playerMax');
      }
      c = generateCase({ tone: body.tone, ...opts }, { id, createdAt: new Date().toISOString() });
      if (body.title?.trim()) c.title = body.title.trim();
    } else {
      c = { ...blankCase(body.title?.trim() || 'Untitled mystery'), id };
      if (body.tone) c.tone = body.tone;
    }
    const cases = readCases();
    cases.set(c.id, c);
    writeCases(cases);
    return c;
  },

  save: async (c: Case, _keepalive = false): Promise<Case> => {
    const cases = readCases();
    const existing = cases.get(c.id);
    if (!existing) throw new ApiError(404, 'Case not found');
    const parsed = parseCase(c);
    if (!parsed.ok) throw new ApiError(400, 'Invalid case', parsed.errors);
    if (parsed.value.id !== existing.id) throw new ApiError(400, 'Case id in body does not match URL');
    const next: Case = { ...parsed.value, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
    cases.set(next.id, next);
    writeCases(cases);
    return next;
  },

  remove: async (id: string): Promise<void> => {
    const cases = readCases();
    if (!cases.delete(id)) throw new ApiError(404, 'Case not found');
    writeCases(cases);
    localStorage.removeItem(runKey(id));
  },

  duplicate: async (id: string): Promise<Case> => {
    const cases = readCases();
    const src = cases.get(id);
    if (!src) throw new ApiError(404, 'Case not found');
    const now = new Date().toISOString();
    const copy: Case = structuredClone({
      ...src,
      id: newCaseId(),
      title: `${src.title || 'Untitled mystery'} (copy)`,
      createdAt: now,
      updatedAt: now,
    });
    cases.set(copy.id, copy);
    writeCases(cases);
    return copy;
  },

  import: async (data: unknown): Promise<Case> => {
    const parsed = parseImport(data, newCaseId());
    if (!parsed.ok) throw new ApiError(400, 'This is not a valid case file', parsed.errors);
    const cases = readCases();
    cases.set(parsed.value.id, parsed.value);
    writeCases(cases);
    return parsed.value;
  },

  getRun: async (id: string): Promise<{ run: RunState | null }> => {
    try {
      const raw = localStorage.getItem(runKey(id));
      if (!raw) return { run: null };
      const parsed = RunStateSchema.safeParse(JSON.parse(raw));
      return { run: parsed.success ? parsed.data : null };
    } catch {
      return { run: null };
    }
  },

  putRun: async (id: string, run: RunState): Promise<{ run: RunState }> => {
    localStorage.setItem(runKey(id), JSON.stringify(run));
    return { run };
  },

  settings: async (): Promise<{ id: string; label: string; era: string }[]> => listSettings(),
};

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

/**
 * A blob-URL `<a download>` click has no download manager to land in inside a
 * Capacitor WKWebView, so on native we write the file to cache and hand it to
 * the OS share sheet (Save to Files, AirDrop, Print, …) instead.
 */
export async function downloadBlob(filename: string, data: BlobPart, type: string): Promise<void> {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const base64 = await blobToBase64(new Blob([data], { type }));
    const { uri } = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
    try {
      await Share.share({ url: uri, dialogTitle: filename });
    } catch {
      /* user dismissed the share sheet: the file was still written successfully */
    }
    return;
  }
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.details.length ? `${e.message}: ${e.details[0]}` : e.message;
  return e instanceof Error ? e.message : 'Something went wrong';
}
