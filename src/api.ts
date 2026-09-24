import type { Case, CaseSummary, Tone } from '../shared/models';
import type { GenerateOptions } from '../shared/generator/generate';
import type { RunState } from '../shared/run';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: init?.body ? { 'content-type': 'application/json', ...init.headers } : init?.headers,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is `npm run dev` still running?');
  }
  if (res.status === 204) return undefined as T;
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const b = (body ?? {}) as { error?: string; details?: string[] };
    throw new ApiError(res.status, b.error ?? `Request failed (${res.status})`, b.details);
  }
  return body as T;
}

export const api = {
  list: () => request<CaseSummary[]>('/api/cases'),
  get: (id: string) => request<Case>(`/api/cases/${encodeURIComponent(id)}`),
  create: (body: { title?: string; tone?: Tone; generate?: boolean | GenerateOptions }) =>
    request<Case>('/api/cases', { method: 'POST', body: JSON.stringify(body) }),
  save: (c: Case, keepalive = false) =>
    request<Case>(`/api/cases/${encodeURIComponent(c.id)}`, { method: 'PUT', body: JSON.stringify(c), keepalive }),
  remove: (id: string) => request<void>(`/api/cases/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  duplicate: (id: string) => request<Case>(`/api/cases/${encodeURIComponent(id)}/duplicate`, { method: 'POST' }),
  import: (data: unknown) => request<Case>('/api/cases/import', { method: 'POST', body: JSON.stringify(data) }),
  getRun: (id: string) => request<{ run: RunState | null }>(`/api/cases/${encodeURIComponent(id)}/run`),
  putRun: (id: string, run: RunState) =>
    request<{ run: RunState }>(`/api/cases/${encodeURIComponent(id)}/run`, { method: 'PUT', body: JSON.stringify(run) }),
  settings: () => request<{ id: string; label: string; era: string }[]>('/api/settings'),
};

export function downloadBlob(filename: string, data: BlobPart, type: string): void {
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
