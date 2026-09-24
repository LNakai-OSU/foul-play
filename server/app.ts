import express, { type ErrorRequestHandler, type Express, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import { generateCase, listSettings } from '../shared/generator/generate';
import { blankCase } from '../shared/ops';
import { parseCase, parseImport, TONES, type Case } from '../shared/models';
import { RunStateSchema } from '../shared/run';
import type { CaseStore } from './store';

const ID_RE = /^[\w-]{1,80}$/;

const GenerateSchema = z.object({
  seed: z.number().int().optional(),
  tone: z.enum(TONES).optional(),
  playerMin: z.number().int().min(3).max(14).optional(),
  playerMax: z.number().int().min(3).max(14).optional(),
  settingId: z.string().max(40).optional(),
});

const CreateSchema = z.object({
  title: z.string().max(200).optional(),
  tone: z.enum(TONES).optional(),
  generate: z.union([z.boolean(), GenerateSchema]).optional(),
});

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: string[],
  ) {
    super(message);
  }
}

const newCaseId = () => `case_${randomUUID().replace(/-/g, '').slice(0, 14)}`;

function sendError(res: Response, status: number, message: string, details?: string[]) {
  res.status(status).json({ error: message, ...(details ? { details } : {}) });
}

export function createApp(store: CaseStore, opts: { staticDir?: string } = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));

  const idParam = (req: Request): string => {
    const id = String(req.params.id ?? '');
    if (!ID_RE.test(id)) throw new HttpError(400, 'Invalid case id');
    return id;
  };
  const load = (req: Request): Case => {
    const c = store.get(idParam(req));
    if (!c) throw new HttpError(404, 'Case not found');
    return c;
  };
  const wrap =
    (fn: (req: Request, res: Response) => Promise<void> | void) =>
    (req: Request, res: Response, next: (e?: unknown) => void) => {
      Promise.resolve()
        .then(() => fn(req, res))
        .catch(next);
    };

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, cases: store.list().length, load: store.report });
  });

  app.get('/api/settings', (_req, res) => {
    res.json(listSettings());
  });

  app.get('/api/cases', (_req, res) => {
    res.json(store.list());
  });

  app.post(
    '/api/cases',
    wrap(async (req, res) => {
      const parsed = CreateSchema.safeParse(req.body ?? {});
      if (!parsed.success) throw new HttpError(400, 'Invalid request', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
      const { title, tone, generate } = parsed.data;
      const id = newCaseId();
      let c: Case;
      if (generate) {
        const opts = generate === true ? {} : generate;
        if (opts.playerMin && opts.playerMax && opts.playerMin > opts.playerMax) throw new HttpError(400, 'playerMin must not exceed playerMax');
        c = generateCase({ tone, ...opts }, { id, createdAt: new Date().toISOString() });
        if (title?.trim()) c.title = title.trim();
      } else {
        c = { ...blankCase(title?.trim() || 'Untitled mystery'), id };
        if (tone) c.tone = tone;
      }
      await store.put(c);
      res.status(201).json(c);
    }),
  );

  app.post(
    '/api/cases/import',
    wrap(async (req, res) => {
      const parsed = parseImport(req.body, newCaseId());
      if (!parsed.ok) throw new HttpError(400, 'This is not a valid case file', parsed.errors);
      const c: Case = parsed.value;
      await store.put(c);
      res.status(201).json(c);
    }),
  );

  app.get('/api/cases/:id', wrap((req, res) => void res.json(load(req))));

  app.put(
    '/api/cases/:id',
    wrap(async (req, res) => {
      const existing = load(req);
      const parsed = parseCase(req.body);
      if (!parsed.ok) throw new HttpError(400, 'Invalid case', parsed.errors);
      if (parsed.value.id !== existing.id) throw new HttpError(400, 'Case id in body does not match URL');
      const c: Case = { ...parsed.value, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
      await store.put(c);
      res.json(c);
    }),
  );

  app.delete(
    '/api/cases/:id',
    wrap(async (req, res) => {
      const id = idParam(req);
      if (!(await store.remove(id))) throw new HttpError(404, 'Case not found');
      res.status(204).end();
    }),
  );

  app.post(
    '/api/cases/:id/duplicate',
    wrap(async (req, res) => {
      const src = load(req);
      const now = new Date().toISOString();
      const copy: Case = structuredClone({ ...src, id: newCaseId(), title: `${src.title || 'Untitled mystery'} (copy)`, createdAt: now, updatedAt: now });
      await store.put(copy);
      res.status(201).json(copy);
    }),
  );

  app.get('/api/cases/:id/export', wrap((req, res) => {
    const c = load(req);
    const safe = (c.title || 'mystery').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'mystery';
    res.setHeader('Content-Disposition', `attachment; filename="${safe}.mystery.json"`);
    res.json(c);
  }));

  // Game-master run state, kept per case so a second device can pick up a live run.
  app.get('/api/cases/:id/run', wrap((req, res) => {
    const c = load(req);
    res.json({ run: store.getRun(c.id) ?? null });
  }));

  app.put(
    '/api/cases/:id/run',
    wrap(async (req, res) => {
      const c = load(req);
      const parsed = RunStateSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'Invalid run state', parsed.error.issues.slice(0, 6).map((i) => `${i.path.join('.')}: ${i.message}`));
      if (parsed.data.caseId !== c.id) throw new HttpError(400, 'Run state does not belong to this case');
      res.json({ run: await store.putRun(c.id, parsed.data) });
    }),
  );

  app.use('/api', (_req, res) => sendError(res, 404, 'Not found'));

  // Production: serve the built client
  const staticDir = opts.staticDir;
  if (staticDir && existsSync(path.join(staticDir, 'index.html'))) {
    app.use(express.static(staticDir));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  const onError: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
    if (err instanceof HttpError) return sendError(res, err.status, err.message, err.details);
    const e = err as { type?: string; status?: number };
    if (e?.type === 'entity.parse.failed') return sendError(res, 400, 'Request body is not valid JSON');
    if (e?.type === 'entity.too.large') return sendError(res, 413, 'Request body is too large');
    console.error('[server] unhandled error:', err);
    sendError(res, 500, 'Internal server error');
  };
  app.use(onError);
  return app;
}
