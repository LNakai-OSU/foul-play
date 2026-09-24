/**
 * JSON-file persistence for cases. No native dependencies.
 *
 *  - Writes are atomic (temp file + rename) and serialised through a promise
 *    chain so concurrent requests can never interleave or corrupt the file.
 *  - A missing file/directory is created on first start.
 *  - A corrupt file is moved aside (cases.corrupt-<timestamp>.json) and the
 *    store starts empty instead of crashing; individually invalid cases are
 *    dropped and counted.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseCase, summarize, type Case, type CaseSummary } from '../shared/models';
import { RunStateSchema, type RunState } from '../shared/run';

interface FileShape {
  version: 1;
  cases: Case[];
}

export interface StoreLoadReport {
  loaded: number;
  skipped: number;
  corruptFile: string | null;
}

export class CaseStore {
  private cases = new Map<string, Case>();
  private runs = new Map<string, RunState>();
  private chain: Promise<void> = Promise.resolve();
  readonly file: string;
  readonly runFile: string;
  report: StoreLoadReport = { loaded: 0, skipped: 0, corruptFile: null };

  constructor(dataDir: string) {
    this.file = path.join(dataDir, 'cases.json');
    this.runFile = path.join(dataDir, 'runs.json');
  }

  async init(): Promise<StoreLoadReport> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    let raw: string | null = null;
    try {
      raw = await fs.readFile(this.file, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
    const report: StoreLoadReport = { loaded: 0, skipped: 0, corruptFile: null };
    if (raw !== null && raw.trim() !== '') {
      try {
        const parsed: unknown = JSON.parse(raw);
        const list = Array.isArray((parsed as FileShape | null)?.cases) ? (parsed as FileShape).cases : null;
        if (!list) throw new Error('missing "cases" array');
        for (const item of list) {
          const r = parseCase(item);
          if (r.ok) {
            this.cases.set(r.value.id, r.value);
            report.loaded++;
          } else report.skipped++;
        }
      } catch (err) {
        const aside = `${this.file.replace(/\.json$/, '')}.corrupt-${Date.now()}.json`;
        await fs.rename(this.file, aside).catch(() => undefined);
        report.corruptFile = aside;
        this.cases.clear();
        console.warn(`[store] ${path.basename(this.file)} was unreadable (${(err as Error).message}); moved to ${path.basename(aside)}`);
      }
    }
    await this.loadRuns();
    this.report = report;
    return report;
  }

  /** GM run state is best-effort: an unreadable runs file is simply ignored. */
  private async loadRuns(): Promise<void> {
    try {
      const parsed: unknown = JSON.parse(await fs.readFile(this.runFile, 'utf8'));
      const list = (parsed as { runs?: unknown } | null)?.runs;
      if (!Array.isArray(list)) return;
      for (const item of list) {
        const r = RunStateSchema.safeParse(item);
        if (r.success && this.cases.has(r.data.caseId)) this.runs.set(r.data.caseId, r.data);
      }
    } catch {
      /* missing or corrupt: start with no runs */
    }
  }

  getRun(id: string): RunState | undefined {
    return this.runs.get(id);
  }

  /** Stores the run unless a newer revision is already saved. Returns whatever is stored afterwards. */
  async putRun(id: string, run: RunState): Promise<RunState> {
    const current = this.runs.get(id);
    if (current && current.rev > run.rev) return current;
    this.runs.set(id, run);
    await this.persistRuns();
    return run;
  }

  list(): CaseSummary[] {
    return [...this.cases.values()].map(summarize).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  get(id: string): Case | undefined {
    return this.cases.get(id);
  }

  async put(c: Case): Promise<Case> {
    this.cases.set(c.id, c);
    await this.persist();
    return c;
  }

  async remove(id: string): Promise<boolean> {
    const existed = this.cases.delete(id);
    if (existed) {
      await this.persist();
      if (this.runs.delete(id)) await this.persistRuns();
    }
    return existed;
  }

  private persistRuns(): Promise<void> {
    const run = async () => {
      const tmp = `${this.runFile}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify({ version: 1, runs: [...this.runs.values()] }), 'utf8');
      await fs.rename(tmp, this.runFile);
    };
    const next = this.chain.then(run, run);
    this.chain = next.catch(() => undefined);
    return next;
  }

  private persist(): Promise<void> {
    const run = async () => {
      const body: FileShape = { version: 1, cases: [...this.cases.values()] };
      const tmp = `${this.file}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(body, null, 2), 'utf8');
      await fs.rename(tmp, this.file);
    };
    const next = this.chain.then(run, run);
    this.chain = next.catch(() => undefined);
    return next;
  }
}

