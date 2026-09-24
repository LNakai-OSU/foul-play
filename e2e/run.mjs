/**
 * Browser-level regression checks (NOT part of `npm test`; run with `npm run e2e`).
 *
 * Starts its own API + Vite dev server on spare ports with a throw-away data
 * directory, then drives real Chrome through playwright-core (no browser
 * download: set CHROME_PATH if Chrome is not at the macOS default).
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const API = 3181;
const WEB = 5181;
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const data = mkdtempSync(path.join(tmpdir(), 'foulplay-e2e-'));
const env = { ...process.env, PORT: String(API), DATA_DIR: data };
const procs = [
  spawn('npx', ['tsx', 'server/index.ts'], { cwd: root, env, stdio: 'ignore' }),
  spawn('npx', ['vite', '--port', String(WEB), '--strictPort'], { cwd: root, env, stdio: 'ignore' }),
];
const base = `http://localhost:${WEB}`;
let failures = 0;
const results = [];
const check = (name, ok, detail = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};

async function waitFor(url) {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`timed out waiting for ${url}`);
}
const post = async (p, body) => (await fetch(`${base}${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) })).json();

let browser;
try {
  await waitFor(`${base}/api/health`);
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && problems.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${r.url()}`));

  // ---- 1. library kebab menu: Delete must be clickable with a real mouse on a card that has cards below it
  const cases = [];
  for (let i = 0; i < 5; i++) cases.push(await post('/api/cases', { generate: { seed: 100 + i, tone: 'comedic' } }));
  await page.goto(base);
  await page.waitForSelector('.case-card');
  const before = await page.locator('.case-card').count();
  await page.locator('.case-card').first().locator('button[aria-haspopup=menu]').click();
  const del = page.getByRole('menuitem', { name: 'Delete' });
  const box = await del.boundingBox();
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('[role=menuitem]')?.textContent ?? document.elementFromPoint(x, y)?.className, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  check('library menu: Delete is the topmost element at its own position', hit === 'Delete', String(hit));
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForSelector('dialog[open]');
  check('library menu: real mouse click on Delete opens the delete dialog (not another case)', page.url().endsWith('/#/') || page.url() === `${base}/`, page.url());
  await page.click('dialog[open] >> text=Delete case');
  await page.waitForFunction((n) => document.querySelectorAll('.case-card').length === n, before - 1);
  check('library menu: case was deleted', (await page.locator('.case-card').count()) === before - 1);

  // ---- 2. Enter submits the rename dialog
  await page.locator('.case-card').first().locator('button[aria-haspopup=menu]').click();
  await page.getByRole('menuitem', { name: 'Rename' }).click();
  await page.fill('dialog[open] input', 'Renamed via Enter');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => [...document.querySelectorAll('.case-card__title')].some((e) => e.textContent === 'Renamed via Enter'));
  check('rename dialog: Enter submits', true);

  // ---- 3. checker click-through for the alibi timeline
  const target = (await (await fetch(`${base}/api/cases`)).json())[0];
  const full = await (await fetch(`${base}/api/cases/${target.id}`)).json();
  const a = full.characters.find((c) => c.alibiWithIds.length > 0);
  const b = full.characters.find((c) => c.id === a.alibiWithIds[0]);
  b.alibiWithIds = b.alibiWithIds.filter((i) => i !== a.id);
  await fetch(`${base}/api/cases/${target.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(full) });
  await page.goto(`${base}/#/case/${target.id}/setting`);
  await page.waitForSelector('.stepper');
  await page.locator('.topbar .btn').last().click();
  await page.waitForSelector('.drawer');
  await page.locator('.drawer .issue', { hasText: 'does not mention' }).first().click();
  await page.waitForTimeout(700);
  const focused = await page.evaluate(() => document.activeElement?.id);
  check('checker: alibi reciprocity issue links to the companions field', focused === `f-${b.id}-alibiWithIds`, String(focused));

  // ---- 4. timeline drag and drop with a real mouse
  await page.goto(`${base}/#/case/${target.id}/timeline`);
  await page.waitForSelector('.drag-handle');
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));
  const titles = () => page.$$eval('.entity__title', (els) => els.map((e) => e.textContent));
  const t0 = await titles();
  const h = await page.$$('.drag-handle');
  const b0 = await h[0].boundingBox();
  const b2 = await h[2].boundingBox();
  await page.mouse.move(b0.x + 16, b0.y + 16);
  await page.mouse.down();
  await page.mouse.move(b0.x + 16, b0.y + 46, { steps: 5 });
  await page.mouse.move(b2.x + 16, b2.y + 30, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const t1 = await titles();
  check('timeline: mouse drag-and-drop reorders beats', t1[0] !== t0[0] && t1.join() !== t0.join());

  // ---- 5. GM shortcuts and cross-device run persistence
  await page.goto(`${base}/#/case/${target.id}/gm`);
  await page.click('text=Start the evening');
  await page.waitForSelector('.gm-now');
  const beatTitle = () => page.locator('.gm-now__title').textContent();
  const first = await beatTitle();
  await page.click('.gm-now'); // focus the page body area, not a button
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  check('GM: plain ArrowRight never advances the beat', (await beatTitle()) === first);
  await page.keyboard.press('Shift+ArrowRight');
  await page.waitForTimeout(300);
  check('GM: Shift+ArrowRight advances', (await beatTitle()) !== first);
  await page.waitForTimeout(700);
  const server = await (await fetch(`${base}/api/cases/${target.id}/run`)).json();
  check('GM: run state is saved on the server', server.run?.status === 'running' && server.run.index === 1, JSON.stringify(server.run?.index));
  const second = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page2 = await second.newPage();
  await page2.goto(`${base}/#/case/${target.id}/gm`);
  await page2.waitForSelector('.gm-now', { timeout: 8000 });
  check('GM: a second browser (empty localStorage) picks up the live run', (await page2.locator('.gm-now__title').textContent()) === (await beatTitle()));
  await second.close();

  // ---- 6. print: one sheet per page, handouts 8 per page
  await page.goto(`${base}/#/case/${target.id}/export/sheets`);
  await page.waitForSelector('[data-testid=sheet]');
  const sheets = await page.locator('[data-testid=sheet]').count();
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ format: 'Letter', printBackground: true, preferCSSPageSize: true });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  check('print: table card + one page per sheet', pages <= sheets + 2, `${pages} pages for ${sheets} sheets`);
  await page.emulateMedia({ media: 'screen' });
  await page.goto(`${base}/#/case/${target.id}/export/handouts`);
  await page.waitForSelector('[data-testid=handout]');
  const cards = await page.locator('[data-testid=handout]').count();
  await page.emulateMedia({ media: 'print' });
  const pdf2 = await page.pdf({ format: 'Letter', printBackground: true, preferCSSPageSize: true });
  const pages2 = (pdf2.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  check('print: handouts are 8 cards per page', pages2 === Math.ceil(cards / 8), `${pages2} pages for ${cards} cards`);

  // ---- 6b. GM packet prints as one flowing document (no stranded last page)
  await page.goto(`${base}/#/case/${target.id}/export/gm`);
  await page.waitForSelector('[data-testid=gm-packet]');
  const pdf3 = await page.pdf({ format: 'Letter', printBackground: true, preferCSSPageSize: true });
  const pages3 = (pdf3.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  check('print: GM packet fits in 5 pages or fewer and ends with the scorecard', pages3 <= 5 && (await page.locator('[data-testid=scorecard]').count()) === 1, `${pages3} pages`);
  await page.emulateMedia({ media: 'screen' });

  // ---- 7. editing an alibi place: one conflict per pair, unique keys, zero console errors
  const problemsBefore = problems.length;
  const fresh = await post('/api/cases', { generate: { seed: 902, tone: 'noir', playerMin: 8, playerMax: 8 } });
  const freshFull = await (await fetch(`${base}/api/cases/${fresh.id}`)).json();
  const mover = freshFull.characters.find((c) => c.alibiWithIds.length >= 2) ?? freshFull.characters.find((c) => c.alibiWithIds.length >= 1);
  await page.goto(`${base}/#/case/${fresh.id}/characters?focus=${mover.id}&field=alibiPlace&n=e2e`);
  await page.waitForSelector(`#f-${mover.id}-alibiPlace`);
  await page.fill(`#f-${mover.id}-alibiPlace`, 'the moon');
  await page.waitForTimeout(900);
  await page.locator('.topbar .btn').last().click();
  await page.waitForSelector('.drawer');
  await page.waitForTimeout(300);
  const conflicts = await page.locator('.drawer .issue', { hasText: 'puts themselves with' }).allTextContents();
  const distinct = new Set(conflicts.map((t) => t.replace(/\s+/g, ' ').trim()));
  check('alibi place edit: exactly one conflict issue per conflicting pair', conflicts.length === mover.alibiWithIds.length && distinct.size === conflicts.length, `${conflicts.length} issues for ${mover.alibiWithIds.length} companions`);
  await page.keyboard.press('Escape');
  check('alibi place edit: no console errors or warnings (duplicate React keys etc.)', problems.length === problemsBefore, problems.slice(problemsBefore, problemsBefore + 2).join(' | '));

  // ---- 8. Ctrl+Z works while a switch has focus, and is left alone inside a text field
  const other = freshFull.characters.find((c) => !c.isKiller);
  await page.goto(`${base}/#/case/${fresh.id}/characters?focus=${other.id}&field=isKiller&n=sw`);
  await page.waitForSelector(`#f-${other.id}-isKiller`);
  await page.waitForTimeout(500);
  await page.focus(`#f-${other.id}-isKiller`);
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  const on = await page.isChecked(`#f-${other.id}-isKiller`);
  await page.focus(`#f-${other.id}-isKiller`);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(300);
  const off = !(await page.isChecked(`#f-${other.id}-isKiller`));
  check('undo: Ctrl+Z works while a switch is focused', on && off, `toggled=${on} undone=${off}`);

  // ---- 9. the detective game: real keys walk the detective; SPACE talks; the gallery renders every environment
  const problemsGame = problems.length;
  await page.goto(`${base}/#/case/${fresh.id}/play`);
  await page.waitForSelector('canvas.game-canvas', { state: 'visible', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  await page.keyboard.type('KAI');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game?.top?.constructor.name === 'DialogueScene', null, { timeout: 8000 });
  for (let i = 0; i < 12; i++) {
    if ((await page.evaluate(() => window.__game.top?.constructor.name)) !== 'DialogueScene') break;
    await page.keyboard.press('Space');
    await page.waitForTimeout(110);
  }
  await page.waitForFunction(() => window.__game?.top?.constructor.name === 'OverworldScene', null, { timeout: 8000 });
  const stepsBefore = await page.evaluate(() => window.__game.state.steps);
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(900);
  await page.keyboard.up('ArrowUp');
  const stepsAfter = await page.evaluate(() => window.__game.state.steps);
  check('game: arrow keys walk the detective', stepsAfter > stepsBefore + 2, `steps ${stepsBefore} -> ${stepsAfter}`);
  const keys = await page.locator('.game-keys').innerText();
  check('game: key legend says SPACE, not A', /space/i.test(keys) && !/\bA\b/.test(keys.replace(/Arrows|WASD/g, '')), keys.replace(/\s+/g, ' '));
  await page.goto(`${base}/#/game-gallery`);
  await page.waitForSelector('.gg-card', { timeout: 30000 });
  await page.waitForTimeout(1200);
  const envCards = await page.locator('.gg-card').count();
  const iconCount = await page.locator('.gg-icon').count();
  check('game gallery: 12 environments and 60+ clue icons', envCards === 12 && iconCount >= 60, `${envCards} environments, ${iconCount} icons`);
  const castWidths = await page.evaluate(() => [...document.querySelectorAll('canvas.gg-cast')].map((c) => Math.round(c.getBoundingClientRect().width)));
  check('game gallery: every cast and portrait canvas is really drawn (not 1px wide)', castWidths.length >= 14 && castWidths.every((w) => w > 60), `${castWidths.length} canvases, narrowest ${Math.min(...castWidths)}px`);
  const shots = await page.locator('.gg-screens figure').count();
  check('game gallery: real screens including the night table and the signature interactions', shots >= 24, `${shots} screens`);
  check('game gallery: no console errors or warnings', problems.length === problemsGame, problems.slice(problemsGame, problemsGame + 2).join(' | '));

  check('no console errors, warnings or failed requests', problems.length === 0, problems.slice(0, 3).join(' | '));
} catch (err) {
  console.error(err);
  failures++;
} finally {
  await browser?.close();
  for (const p of procs) p.kill('SIGTERM');
  spawn('pkill', ['-f', `vite --port ${WEB}`]);
  rmSync(data, { recursive: true, force: true });
  console.log(results.join('\n'));
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll browser checks passed');
  process.exit(failures ? 1 : 0);
}
