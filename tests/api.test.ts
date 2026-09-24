import { mkdtempSync, rmSync, writeFileSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../server/app';
import { CaseStore } from '../server/store';
import type { Case, CaseSummary } from '../shared/models';
import { checkCase } from '../shared/checker';

let dir: string;
let server: Server;
let base: string;

async function boot(data: string): Promise<{ server: Server; base: string; store: CaseStore }> {
  const store = new CaseStore(data);
  await store.init();
  const app = createApp(store);
  const s = await new Promise<Server>((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });
  return { server: s, base: `http://127.0.0.1:${(s.address() as AddressInfo).port}`, store };
}

const json = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const put = (body: unknown): RequestInit => ({ method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'mm-api-'));
  const b = await boot(path.join(dir, 'nested', 'data')); // directory does not exist yet
  server = b.server;
  base = b.base;
});
afterAll(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('cases API', () => {
  it('starts empty and reports health', async () => {
    expect(await (await fetch(`${base}/api/cases`)).json()).toEqual([]);
    const h = await (await fetch(`${base}/api/health`)).json();
    expect(h.ok).toBe(true);
  });

  it('creates a blank case', async () => {
    const r = await fetch(`${base}/api/cases`, json({ title: '  My first  ', tone: 'comedic' }));
    expect(r.status).toBe(201);
    const c: Case = await r.json();
    expect(c.title).toBe('My first');
    expect(c.tone).toBe('comedic');
    expect(c.characters).toEqual([]);
    expect(c.id).toMatch(/^case_/);
  });

  it('creates a generated case that passes the checker', async () => {
    const r = await fetch(`${base}/api/cases`, json({ generate: { seed: 4, tone: 'serious', playerMin: 6, playerMax: 8, settingId: 'lodge' } }));
    expect(r.status).toBe(201);
    const c: Case = await r.json();
    expect(c.characters.length).toBeGreaterThanOrEqual(6);
    expect(checkCase(c).filter((i) => i.severity !== 'info')).toEqual([]);
    expect(c.tone).toBe('serious');
  });

  it('lists summaries newest-first', async () => {
    const list: CaseSummary[] = await (await fetch(`${base}/api/cases`)).json();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list[0]!.updatedAt >= list[1]!.updatedAt).toBe(true);
    expect(list[0]).toHaveProperty('characterCount');
  });

  it('reads, updates and persists a case', async () => {
    const created: Case = await (await fetch(`${base}/api/cases`, json({ title: 'Edit me' }))).json();
    const got: Case = await (await fetch(`${base}/api/cases/${created.id}`)).json();
    expect(got.title).toBe('Edit me');
    const edited = { ...got, title: 'Edited', victim: { ...got.victim, name: 'Lord Nobody' } };
    const r = await fetch(`${base}/api/cases/${created.id}`, put(edited));
    expect(r.status).toBe(200);
    const saved: Case = await r.json();
    expect(saved.title).toBe('Edited');
    expect(saved.updatedAt >= got.updatedAt).toBe(true);
    expect(saved.createdAt).toBe(got.createdAt);
    const again: Case = await (await fetch(`${base}/api/cases/${created.id}`)).json();
    expect(again.victim.name).toBe('Lord Nobody');
  });

  it('stores structurally valid cases even when references are broken (the checker reports those)', async () => {
    const created: Case = await (await fetch(`${base}/api/cases`, json({ generate: { seed: 2 } }))).json();
    created.beats[0]!.evidenceIds.push('ev_missing');
    const r = await fetch(`${base}/api/cases/${created.id}`, put(created));
    expect(r.status).toBe(200);
  });

  it('validates input: wrong types, oversize fields, mismatched ids', async () => {
    const created: Case = await (await fetch(`${base}/api/cases`, json({ title: 'x' }))).json();
    const bad1 = await fetch(`${base}/api/cases/${created.id}`, put({ ...created, tone: 'silly' }));
    expect(bad1.status).toBe(400);
    expect((await bad1.json()).details.length).toBeGreaterThan(0);
    expect((await fetch(`${base}/api/cases/${created.id}`, put({ ...created, title: 'x'.repeat(500) }))).status).toBe(400);
    expect((await fetch(`${base}/api/cases/${created.id}`, put({ ...created, characters: 'nope' }))).status).toBe(400);
    expect((await fetch(`${base}/api/cases/${created.id}`, put({ ...created, id: 'case_other' }))).status).toBe(400);
    expect((await fetch(`${base}/api/cases`, json({ tone: 'silly' }))).status).toBe(400);
    expect((await fetch(`${base}/api/cases`, json({ generate: { playerMin: 9, playerMax: 4 } }))).status).toBe(400);
  });

  it('handles malformed JSON, unknown ids and unknown routes', async () => {
    const r = await fetch(`${base}/api/cases`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{not json' });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/JSON/);
    expect((await fetch(`${base}/api/cases/case_nope`)).status).toBe(404);
    expect((await fetch(`${base}/api/cases/bad%20id!`)).status).toBe(400);
    expect((await fetch(`${base}/api/cases/case_nope`, { method: 'DELETE' })).status).toBe(404);
    expect((await fetch(`${base}/api/nothing`)).status).toBe(404);
  });

  it('rejects oversized bodies', async () => {
    const r = await fetch(`${base}/api/cases/import`, json({ title: 'x', pad: 'y'.repeat(3 * 1024 * 1024) }));
    expect(r.status).toBe(413);
  });

  it('duplicates a case under a new id', async () => {
    const src: Case = await (await fetch(`${base}/api/cases`, json({ generate: { seed: 6 } }))).json();
    const r = await fetch(`${base}/api/cases/${src.id}/duplicate`, { method: 'POST' });
    expect(r.status).toBe(201);
    const copy: Case = await r.json();
    expect(copy.id).not.toBe(src.id);
    expect(copy.title).toBe(`${src.title} (copy)`);
    expect(copy.characters).toEqual(src.characters);
  });

  it('exports and re-imports a case JSON file', async () => {
    const src: Case = await (await fetch(`${base}/api/cases`, json({ generate: { seed: 8 } }))).json();
    const ex = await fetch(`${base}/api/cases/${src.id}/export`);
    expect(ex.headers.get('content-disposition')).toMatch(/attachment; filename=".+\.mystery\.json"/);
    const file = await ex.json();
    const imp = await fetch(`${base}/api/cases/import`, json(file));
    expect(imp.status).toBe(201);
    const imported: Case = await imp.json();
    expect(imported.id).not.toBe(src.id);
    expect(imported.characters).toEqual(src.characters);
    expect(imported.title).toBe(src.title);
  });

  it('imports partial files by filling defaults and rejects nonsense', async () => {
    const ok = await fetch(`${base}/api/cases/import`, json({ title: 'Bare bones', characters: [{ id: 'c1', name: 'Solo' }] }));
    expect(ok.status).toBe(201);
    const c: Case = await ok.json();
    expect(c.characters[0]!.name).toBe('Solo');
    expect(c.beats).toEqual([]);
    expect((await fetch(`${base}/api/cases/import`, json([1, 2, 3]))).status).toBe(400);
    expect((await fetch(`${base}/api/cases/import`, json({ title: 5 }))).status).toBe(400);
    expect((await fetch(`${base}/api/cases/import`, json('hello'))).status).toBe(400);
  });

  it('deletes a case', async () => {
    const c: Case = await (await fetch(`${base}/api/cases`, json({ title: 'Doomed' }))).json();
    expect((await fetch(`${base}/api/cases/${c.id}`, { method: 'DELETE' })).status).toBe(204);
    expect((await fetch(`${base}/api/cases/${c.id}`)).status).toBe(404);
  });

  it('serialises concurrent writes without corrupting the file', async () => {
    const c: Case = await (await fetch(`${base}/api/cases`, json({ title: 'race' }))).json();
    await Promise.all(Array.from({ length: 25 }, (_, i) => fetch(`${base}/api/cases/${c.id}`, put({ ...c, title: `race ${i}` }))));
    const list: CaseSummary[] = await (await fetch(`${base}/api/cases`)).json();
    expect(list.length).toBeGreaterThan(3);
    const file = JSON.parse(readFileSync(path.join(dir, 'nested', 'data', 'cases.json'), 'utf8'));
    expect(file.cases.length).toBe(list.length);
  });

  it('stores GM run state per case, newest revision wins, and validates it', async () => {
    const c: Case = await (await fetch(`${base}/api/cases`, json({ generate: { seed: 3 } }))).json();
    expect((await (await fetch(`${base}/api/cases/${c.id}/run`)).json()).run).toBeNull();
    const run = { caseId: c.id, status: 'running', index: 2, revealed: [], confirmed: [], timer: null, startedAt: 5, finishedAt: null, entered: {}, rev: 100 };
    const saved = await (await fetch(`${base}/api/cases/${c.id}/run`, put(run))).json();
    expect(saved.run.index).toBe(2);
    // an older revision must not overwrite a newer one
    const stale = await (await fetch(`${base}/api/cases/${c.id}/run`, put({ ...run, index: 0, rev: 50 }))).json();
    expect(stale.run.index).toBe(2);
    const newer = await (await fetch(`${base}/api/cases/${c.id}/run`, put({ ...run, index: 4, rev: 200 }))).json();
    expect(newer.run.index).toBe(4);
    expect((await (await fetch(`${base}/api/cases/${c.id}/run`)).json()).run.index).toBe(4);
    expect((await fetch(`${base}/api/cases/${c.id}/run`, put({ ...run, status: 'weird' }))).status).toBe(400);
    expect((await fetch(`${base}/api/cases/${c.id}/run`, put({ ...run, caseId: 'case_other' }))).status).toBe(400);
    expect((await fetch(`${base}/api/cases/case_nope/run`)).status).toBe(404);
    // deleting the case forgets its run
    await fetch(`${base}/api/cases/${c.id}`, { method: 'DELETE' });
    expect((await fetch(`${base}/api/cases/${c.id}/run`)).status).toBe(404);
  });

  it('lists the generator settings', async () => {
    const s = await (await fetch(`${base}/api/settings`)).json();
    expect(s.length).toBeGreaterThanOrEqual(12);
  });
});

describe('persistence robustness', () => {
  it('survives a restart with data intact', async () => {
    const data = path.join(dir, 'restart');
    const a = await boot(data);
    const c: Case = await (await fetch(`${a.base}/api/cases`, json({ title: 'Persist me' }))).json();
    a.server.close();
    const b = await boot(data);
    const got: Case = await (await fetch(`${b.base}/api/cases/${c.id}`)).json();
    expect(got.title).toBe('Persist me');
    b.server.close();
  });

  it('keeps GM run state across a restart', async () => {
    const data = path.join(dir, 'runs');
    const a = await boot(data);
    const c: Case = await (await fetch(`${a.base}/api/cases`, json({ generate: { seed: 3 } }))).json();
    const run = { caseId: c.id, status: 'running', index: 3, revealed: [], confirmed: [], timer: null, startedAt: 1, finishedAt: null, entered: {}, rev: 9 };
    await fetch(`${a.base}/api/cases/${c.id}/run`, put(run));
    a.server.close();
    const b = await boot(data);
    expect((await (await fetch(`${b.base}/api/cases/${c.id}/run`)).json()).run.index).toBe(3);
    b.server.close();
  });

  it('recovers from a corrupt data file by moving it aside', async () => {
    const data = path.join(dir, 'corrupt');
    const b1 = await boot(data);
    b1.server.close();
    writeFileSync(path.join(data, 'cases.json'), '{"version":1,"cases":[ {oops');
    const b = await boot(data);
    expect(b.store.report.corruptFile).toBeTruthy();
    expect(await (await fetch(`${b.base}/api/cases`)).json()).toEqual([]);
    expect(readdirSync(data).some((f) => f.startsWith('cases.corrupt-'))).toBe(true);
    const r = await fetch(`${b.base}/api/cases`, json({ title: 'After the crash' }));
    expect(r.status).toBe(201);
    b.server.close();
  });

  it('skips individually invalid cases but keeps the good ones', async () => {
    const data = path.join(dir, 'partial');
    const b1 = await boot(data);
    const good: Case = await (await fetch(`${b1.base}/api/cases`, json({ title: 'Survivor' }))).json();
    b1.server.close();
    const file = path.join(data, 'cases.json');
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    parsed.cases.push({ id: 'bad', tone: 'nonsense' }, 42);
    writeFileSync(file, JSON.stringify(parsed));
    const b = await boot(data);
    expect(b.store.report).toMatchObject({ loaded: 1, skipped: 2 });
    expect((await (await fetch(`${b.base}/api/cases/${good.id}`)).json()).title).toBe('Survivor');
    b.server.close();
  });

  it('treats an empty or wrongly shaped file gracefully', async () => {
    const data = path.join(dir, 'empty');
    const b1 = await boot(data);
    b1.server.close();
    writeFileSync(path.join(data, 'cases.json'), '');
    const b = await boot(data);
    expect(await (await fetch(`${b.base}/api/cases`)).json()).toEqual([]);
    b.server.close();
    writeFileSync(path.join(data, 'cases.json'), '[1,2,3]');
    const b2 = await boot(data);
    expect(b2.store.report.corruptFile).toBeTruthy();
    b2.server.close();
  });

  it('leaves no temp files behind after writes', () => {
    const data = path.join(dir, 'nested', 'data');
    expect(existsSync(path.join(data, 'cases.json'))).toBe(true);
    expect(readdirSync(data).filter((f) => f.endsWith('.tmp'))).toEqual([]);
  });
});
